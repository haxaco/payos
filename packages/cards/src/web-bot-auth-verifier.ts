/**
 * Web Bot Auth Verifier (RFC 9421)
 * Epic 53, Story 53.2: Unified verification for Visa TAP and Mastercard Agent Pay
 *
 * Both Visa Intelligent Commerce and Mastercard Agent Pay use HTTP Message Signatures
 * (RFC 9421) for authenticating AI agent requests. This module provides a unified
 * verification layer that works with both networks.
 *
 * References:
 * - RFC 9421: HTTP Message Signatures
 * - Visa TAP (Token Authentication Protocol)
 * - Mastercard Agent Pay Authentication
 */

import * as ed25519 from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import type {
  CardNetwork,
  WebBotAuthParams,
  SignatureComponents,
  VerificationResult,
  NetworkPublicKey,
} from './types.js';

// Configure ed25519 to use sha512 for RFC 8032 compliance
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

// ============================================
// Constants
// ============================================

/** Visa TAP key directory URL */
const VISA_TAP_KEY_DIRECTORY = 'https://developer.visa.com/.well-known/tap-keys';

/** Mastercard Agent key directory URL */
const MC_AGENT_KEY_DIRECTORY = 'https://developer.mastercard.com/.well-known/agent-keys';

/** Maximum age for signatures (5 minutes) */
const MAX_SIGNATURE_AGE_SECONDS = 300;

/** Key cache TTL (1 hour) */
const KEY_CACHE_TTL_MS = 3600000;

// ============================================
// Key Cache
// ============================================

interface CachedKey {
  key: NetworkPublicKey;
  cachedAt: number;
}

const keyCache = new Map<string, CachedKey>();

function getCacheKey(network: CardNetwork, keyId: string): string {
  return `${network}:${keyId}`;
}

function getCachedKey(network: CardNetwork, keyId: string): NetworkPublicKey | null {
  const cacheKey = getCacheKey(network, keyId);
  const cached = keyCache.get(cacheKey);

  if (!cached) return null;

  // Check TTL
  if (Date.now() - cached.cachedAt > KEY_CACHE_TTL_MS) {
    keyCache.delete(cacheKey);
    return null;
  }

  return cached.key;
}

function setCachedKey(key: NetworkPublicKey): void {
  const cacheKey = getCacheKey(key.network, key.keyId);
  keyCache.set(cacheKey, {
    key,
    cachedAt: Date.now(),
  });
}

// ============================================
// Signature Parsing
// ============================================

/**
 * Parse the Signature-Input header into components
 * Format: sig1=("@method" "@path" "content-digest" ...);keyid="xxx";alg="ed25519";created=123;expires=456
 */
export function parseSignatureInput(signatureInput: string): SignatureComponents {
  // Extract the label and parameters
  const match = signatureInput.match(/^(\w+)=\((.*?)\);(.*)$/);
  if (!match) {
    throw new Error('Invalid Signature-Input format');
  }

  const [, _label, componentStr, paramsStr] = match;

  // Parse components (quoted strings in parentheses)
  const components = componentStr
    .split(/\s+/)
    .map((c) => c.replace(/"/g, ''))
    .filter((c) => c.length > 0);

  // Parse parameters
  const params: Record<string, string> = {};
  const paramMatches = paramsStr.matchAll(/(\w+)=(?:"([^"]+)"|(\d+))/g);
  for (const pm of paramMatches) {
    params[pm[1]] = pm[2] || pm[3];
  }

  if (!params.keyid) {
    throw new Error('Missing keyid in Signature-Input');
  }

  return {
    components,
    keyId: params.keyid,
    algorithm: params.alg || 'ed25519',
    created: params.created ? parseInt(params.created, 10) : 0,
    expires: params.expires ? parseInt(params.expires, 10) : undefined,
    nonce: params.nonce,
    tag: params.tag,
  };
}

/**
 * Parse the Signature header to extract the raw signature bytes
 * Format: sig1=:BASE64_SIGNATURE:
 */
export function parseSignature(signature: string): Uint8Array {
  const match = signature.match(/^\w+=:([A-Za-z0-9+/=]+):$/);
  if (!match) {
    throw new Error('Invalid Signature format');
  }

  return base64ToBytes(match[1]);
}

// ============================================
// Signature Base Construction
// ============================================

/**
 * Build the signature base string according to RFC 9421 Section 2.5
 */
export function buildSignatureBase(
  params: WebBotAuthParams,
  components: SignatureComponents
): string {
  const lines: string[] = [];

  for (const component of components.components) {
    let value: string;

    if (component.startsWith('@')) {
      // Derived component
      switch (component) {
        case '@method':
          value = params.method.toUpperCase();
          break;
        case '@path':
          value = params.path;
          break;
        case '@authority':
          value = params.headers['host'] || '';
          break;
        case '@target-uri':
          value = params.path; // Simplified
          break;
        case '@request-target':
          value = `${params.method.toLowerCase()} ${params.path}`;
          break;
        default:
          throw new Error(`Unknown derived component: ${component}`);
      }
    } else {
      // Header field
      const headerName = component.toLowerCase();
      value = params.headers[headerName] || '';
    }

    lines.push(`"${component}": ${value}`);
  }

  // Add signature parameters
  const sigParams = [
    `("${components.components.join('" "')}")`,
    `keyid="${components.keyId}"`,
    `alg="${components.algorithm}"`,
    `created=${components.created}`,
  ];

  if (components.expires) {
    sigParams.push(`expires=${components.expires}`);
  }
  if (components.nonce) {
    sigParams.push(`nonce="${components.nonce}"`);
  }
  if (components.tag) {
    sigParams.push(`tag="${components.tag}"`);
  }

  lines.push(`"@signature-params": ${sigParams.join(';')}`);

  return lines.join('\n');
}

// ============================================
// Key Fetching
// ============================================

/**
 * Fetch public key from network directory
 */
export async function fetchPublicKey(
  network: CardNetwork,
  keyId: string,
  directoryUrl?: string
): Promise<NetworkPublicKey> {
  // Check cache first
  const cached = getCachedKey(network, keyId);
  if (cached) {
    return cached;
  }

  // Determine directory URL
  const baseUrl =
    directoryUrl ||
    (network === 'visa' ? VISA_TAP_KEY_DIRECTORY : MC_AGENT_KEY_DIRECTORY);

  const url = `${baseUrl}/${encodeURIComponent(keyId)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch key: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    const key: NetworkPublicKey = {
      keyId,
      network,
      publicKey: (data.publicKey || data.public_key) as string,
      algorithm: ((data.algorithm as string) || 'ed25519') as 'ed25519' | 'rsa-sha256' | 'ecdsa-p256',
      validFrom: data.validFrom ? new Date(data.validFrom as string) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil as string) : undefined,
      fetchedAt: new Date(),
    };

    // Cache the key
    setCachedKey(key);

    return key;
  } catch (error) {
    throw new Error(`Failed to fetch public key for ${network}:${keyId}: ${error}`);
  }
}

// ============================================
// Signature Verification
// ============================================

/**
 * Verify an Ed25519 signature
 */
export async function verifyEd25519Signature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  try {
    return await ed25519.verifyAsync(signature, message, publicKey);
  } catch {
    return false;
  }
}

/**
 * Verify an RSA-SHA256 signature (for compatibility with some implementations)
 */
export async function verifyRsaSha256Signature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKeyPem: string
): Promise<boolean> {
  try {
    // Use Web Crypto API for RSA verification
    const key = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(publicKeyPem),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signature as unknown as BufferSource,
      message as unknown as BufferSource
    );
  } catch {
    return false;
  }
}

// ============================================
// Main Verification Function
// ============================================

export interface VerifyOptions {
  /** Network to verify against (visa or mastercard) */
  network?: CardNetwork;
  /** Custom key directory URL */
  keyDirectoryUrl?: string;
  /** Skip timestamp validation (for testing) */
  skipTimestampValidation?: boolean;
  /** Custom public key (skip directory fetch) */
  customPublicKey?: string;
}

/**
 * Verify a Web Bot Auth signature from an HTTP request
 */
export async function verifyWebBotAuth(
  params: WebBotAuthParams,
  options: VerifyOptions = {}
): Promise<VerificationResult> {
  const verifiedAt = new Date().toISOString();

  try {
    // Parse signature input
    const components = parseSignatureInput(params.signatureInput);

    // Determine network from keyId pattern or explicit option
    const network = options.network || detectNetwork(components.keyId);

    // Validate timestamp
    if (!options.skipTimestampValidation) {
      const now = Math.floor(Date.now() / 1000);

      if (components.created > now + 60) {
        return {
          valid: false,
          network,
          keyId: components.keyId,
          error: 'Signature created in the future',
          verifiedAt,
        };
      }

      if (now - components.created > MAX_SIGNATURE_AGE_SECONDS) {
        return {
          valid: false,
          network,
          keyId: components.keyId,
          error: 'Signature has expired (too old)',
          verifiedAt,
        };
      }

      if (components.expires && now > components.expires) {
        return {
          valid: false,
          network,
          keyId: components.keyId,
          error: 'Signature has expired',
          verifiedAt,
        };
      }
    }

    // Get public key
    let publicKey: NetworkPublicKey;

    if (options.customPublicKey) {
      publicKey = {
        keyId: components.keyId,
        network,
        publicKey: options.customPublicKey,
        algorithm: components.algorithm as NetworkPublicKey['algorithm'],
        fetchedAt: new Date(),
      };
    } else {
      publicKey = await fetchPublicKey(network, components.keyId, options.keyDirectoryUrl);
    }

    // Check key validity
    if (publicKey.validUntil && new Date() > publicKey.validUntil) {
      return {
        valid: false,
        network,
        keyId: components.keyId,
        error: 'Public key has expired',
        verifiedAt,
      };
    }

    // Build signature base
    const signatureBase = buildSignatureBase(params, components);
    const signatureBaseBytes = new TextEncoder().encode(signatureBase);

    // Parse signature
    const signatureBytes = parseSignature(params.signature);

    // Verify based on algorithm
    let isValid: boolean;

    if (components.algorithm === 'ed25519') {
      const publicKeyBytes = decodePublicKey(publicKey.publicKey, 'ed25519');
      isValid = await verifyEd25519Signature(signatureBaseBytes, signatureBytes, publicKeyBytes);
    } else if (components.algorithm === 'rsa-sha256') {
      isValid = await verifyRsaSha256Signature(
        signatureBaseBytes,
        signatureBytes,
        publicKey.publicKey
      );
    } else {
      return {
        valid: false,
        network,
        keyId: components.keyId,
        error: `Unsupported algorithm: ${components.algorithm}`,
        verifiedAt,
      };
    }

    return {
      valid: isValid,
      network,
      keyId: components.keyId,
      agentProvider: extractAgentProvider(components.keyId),
      error: isValid ? undefined : 'Signature verification failed',
      verifiedAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      network: options.network || 'visa',
      keyId: 'unknown',
      error: errorMessage,
      verifiedAt,
    };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Detect network from key ID pattern
 * Visa keys typically start with "tap_" or "vic_"
 * Mastercard keys typically start with "mc_" or "agp_"
 */
function detectNetwork(keyId: string): CardNetwork {
  const lowerKeyId = keyId.toLowerCase();

  if (lowerKeyId.startsWith('tap_') || lowerKeyId.startsWith('vic_') || lowerKeyId.startsWith('visa_')) {
    return 'visa';
  }

  if (lowerKeyId.startsWith('mc_') || lowerKeyId.startsWith('agp_') || lowerKeyId.startsWith('mastercard_')) {
    return 'mastercard';
  }

  // Default to visa if no clear pattern
  return 'visa';
}

/**
 * Extract agent provider from key ID
 * Example: "tap_openai_abc123" -> "openai"
 */
function extractAgentProvider(keyId: string): string | undefined {
  const parts = keyId.split('_');
  if (parts.length >= 2) {
    // Skip the prefix (tap_, mc_, etc.)
    return parts[1];
  }
  return undefined;
}

/**
 * Decode a public key from various formats
 */
function decodePublicKey(publicKey: string, _algorithm: string): Uint8Array {
  // Try base64 first
  if (!publicKey.includes('-----BEGIN')) {
    return base64ToBytes(publicKey);
  }

  // PEM format - extract the base64 content
  const pemContent = publicKey
    .replace(/-----BEGIN.*?-----/, '')
    .replace(/-----END.*?-----/, '')
    .replace(/\s/g, '');

  return base64ToBytes(pemContent);
}

/**
 * Convert base64 to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  // Handle both standard and URL-safe base64
  const standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binaryString = atob(standardBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert PEM to ArrayBuffer for Web Crypto
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN.*?-----/, '')
    .replace(/-----END.*?-----/, '')
    .replace(/\s/g, '');

  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * Convert Uint8Array to base64
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Create a content digest (for Content-Digest header)
 */
export function createContentDigest(body: string | Uint8Array): string {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const hash = sha256(bytes);
  return `sha-256=:${bytesToBase64(hash)}:`;
}

// ============================================
// WebBotAuthVerifier Class
// ============================================

export class WebBotAuthVerifier {
  private options: VerifyOptions;

  constructor(options: VerifyOptions = {}) {
    this.options = options;
  }

  /**
   * Verify a request's Web Bot Auth signature
   */
  async verify(params: WebBotAuthParams): Promise<VerificationResult> {
    return verifyWebBotAuth(params, this.options);
  }

  /**
   * Verify a request from Express/Hono-like request object
   */
  async verifyRequest(request: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<VerificationResult> {
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
      }
    }

    const signatureInput = headers['signature-input'];
    const signature = headers['signature'];

    if (!signatureInput || !signature) {
      return {
        valid: false,
        network: this.options.network || 'visa',
        keyId: 'unknown',
        error: 'Missing Signature-Input or Signature header',
        verifiedAt: new Date().toISOString(),
      };
    }

    const url = new URL(request.url, 'http://localhost');

    return this.verify({
      method: request.method,
      path: url.pathname + url.search,
      headers,
      signatureInput,
      signature,
    });
  }

  /**
   * Clear the key cache
   */
  static clearCache(): void {
    keyCache.clear();
  }

  /**
   * Pre-fetch and cache a key
   */
  async prefetchKey(network: CardNetwork, keyId: string): Promise<void> {
    await fetchPublicKey(network, keyId, this.options.keyDirectoryUrl);
  }
}

export default WebBotAuthVerifier;
