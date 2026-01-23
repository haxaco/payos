/**
 * Web Bot Auth Signer (RFC 9421)
 * Epic 53: Agent-Side Card Payments
 *
 * Produces RFC 9421 HTTP Message Signatures for AI agents to authenticate
 * payment requests to merchants and card networks.
 *
 * This is the signing counterpart to WebBotAuthVerifier - agents use this
 * to sign requests, and merchants/networks use the verifier to validate them.
 *
 * References:
 * - RFC 9421: HTTP Message Signatures
 * - Visa TAP (Token Authentication Protocol)
 * - Mastercard Agent Pay Authentication
 */

import * as ed25519 from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

// Configure ed25519 to use sha512 for RFC 8032 compliance
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

// ============================================
// Types
// ============================================

export interface SigningKeyOptions {
  /** Unique key identifier (e.g., "payos_agent_abc123") */
  keyId: string;
  /** Private key for signing (base64 or raw bytes) */
  privateKey: Uint8Array | string;
  /** Signature algorithm */
  algorithm: 'ed25519' | 'rsa-sha256';
  /** Signature expiration in seconds (default: 300 = 5 minutes) */
  expirationSeconds?: number;
}

export interface SigningRequest {
  /** HTTP method */
  method: string;
  /** Request path (including query string if any) */
  path: string;
  /** Host header value (optional, used for @authority) */
  host?: string;
  /** Request headers (keys should be lowercase) */
  headers?: Record<string, string>;
  /** Request body (required if Content-Digest should be generated) */
  body?: string;
}

export interface SigningResult {
  /** The Signature-Input header value */
  signatureInput: string;
  /** The Signature header value */
  signature: string;
  /** The Content-Digest header value (if body was provided) */
  contentDigest?: string;
  /** All headers to add to the request */
  headers: Record<string, string>;
  /** When the signature expires */
  expiresAt: string;
}

export interface KeyPair {
  /** Base64 encoded public key */
  publicKey: string;
  /** Base64 encoded private key */
  privateKey: string;
}

// ============================================
// Constants
// ============================================

/** Default signature expiration (5 minutes) */
const DEFAULT_EXPIRATION_SECONDS = 300;

// ============================================
// Helper Functions
// ============================================

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
 * Convert Uint8Array to base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Create SHA-256 content digest
 */
function createContentDigest(body: string): string {
  const bytes = new TextEncoder().encode(body);
  const hash = sha256(bytes);
  return `sha-256=:${bytesToBase64(hash)}:`;
}

/**
 * Decode a private key from various formats
 */
function decodePrivateKey(privateKey: Uint8Array | string): Uint8Array {
  if (privateKey instanceof Uint8Array) {
    return privateKey;
  }

  // Try base64 first
  if (!privateKey.includes('-----BEGIN')) {
    return base64ToBytes(privateKey);
  }

  // PEM format - extract the base64 content
  const pemContent = privateKey
    .replace(/-----BEGIN.*?-----/, '')
    .replace(/-----END.*?-----/, '')
    .replace(/\s/g, '');

  return base64ToBytes(pemContent);
}

// ============================================
// WebBotAuthSigner Class
// ============================================

/**
 * Signs HTTP requests according to RFC 9421 for Web Bot Auth
 */
export class WebBotAuthSigner {
  private keyId: string;
  private privateKey: Uint8Array;
  private algorithm: 'ed25519' | 'rsa-sha256';
  private expirationSeconds: number;

  constructor(options: SigningKeyOptions) {
    this.keyId = options.keyId;
    this.privateKey = decodePrivateKey(options.privateKey);
    this.algorithm = options.algorithm;
    this.expirationSeconds = options.expirationSeconds ?? DEFAULT_EXPIRATION_SECONDS;

    // Validate key length for Ed25519
    if (this.algorithm === 'ed25519' && this.privateKey.length !== 32) {
      throw new Error(`Ed25519 private key must be 32 bytes, got ${this.privateKey.length}`);
    }
  }

  /**
   * Sign an HTTP request
   */
  async sign(request: SigningRequest): Promise<SigningResult> {
    const now = Math.floor(Date.now() / 1000);
    const expires = now + this.expirationSeconds;
    const expiresAt = new Date(expires * 1000).toISOString();

    // Prepare headers for signing
    const headers: Record<string, string> = {
      ...(request.headers || {}),
    };

    // Add Content-Digest if body is provided
    let contentDigest: string | undefined;
    if (request.body) {
      contentDigest = createContentDigest(request.body);
      headers['content-digest'] = contentDigest;
    }

    // Add host if provided
    if (request.host) {
      headers['host'] = request.host;
    }

    // Determine which components to sign
    const components = this.determineComponents(request, headers);

    // Build signature base
    const signatureBase = this.buildSignatureBase(request, headers, components, now, expires);

    // Sign the base string
    const signatureBytes = await this.signBytes(new TextEncoder().encode(signatureBase));
    const signatureValue = `sig1=:${bytesToBase64(signatureBytes)}:`;

    // Build Signature-Input header
    const signatureInput = this.buildSignatureInput(components, now, expires);

    // Collect all headers to add
    const resultHeaders: Record<string, string> = {
      'signature-input': signatureInput,
      'signature': signatureValue,
    };

    if (contentDigest) {
      resultHeaders['content-digest'] = contentDigest;
    }

    return {
      signatureInput,
      signature: signatureValue,
      contentDigest,
      headers: resultHeaders,
      expiresAt,
    };
  }

  /**
   * Determine which components to include in the signature
   */
  private determineComponents(
    request: SigningRequest,
    headers: Record<string, string>
  ): string[] {
    const components: string[] = ['@method', '@path'];

    // Add @authority if host is available
    if (request.host || headers['host']) {
      components.push('@authority');
    }

    // Add content-digest if body is provided
    if (request.body) {
      components.push('content-digest');
    }

    // Add content-type if present
    if (headers['content-type']) {
      components.push('content-type');
    }

    return components;
  }

  /**
   * Build the signature base string according to RFC 9421 Section 2.5
   */
  private buildSignatureBase(
    request: SigningRequest,
    headers: Record<string, string>,
    components: string[],
    created: number,
    expires: number
  ): string {
    const lines: string[] = [];

    for (const component of components) {
      let value: string;

      if (component.startsWith('@')) {
        // Derived component
        switch (component) {
          case '@method':
            value = request.method.toUpperCase();
            break;
          case '@path':
            value = request.path;
            break;
          case '@authority':
            value = request.host || headers['host'] || '';
            break;
          case '@target-uri':
            value = request.path;
            break;
          case '@request-target':
            value = `${request.method.toLowerCase()} ${request.path}`;
            break;
          default:
            throw new Error(`Unknown derived component: ${component}`);
        }
      } else {
        // Header field
        const headerName = component.toLowerCase();
        value = headers[headerName] || '';
      }

      lines.push(`"${component}": ${value}`);
    }

    // Add signature parameters line
    const sigParams = [
      `("${components.join('" "')}")`,
      `keyid="${this.keyId}"`,
      `alg="${this.algorithm}"`,
      `created=${created}`,
      `expires=${expires}`,
    ];

    lines.push(`"@signature-params": ${sigParams.join(';')}`);

    return lines.join('\n');
  }

  /**
   * Build the Signature-Input header value
   */
  private buildSignatureInput(
    components: string[],
    created: number,
    expires: number
  ): string {
    const sigParams = [
      `("${components.join('" "')}")`,
      `keyid="${this.keyId}"`,
      `alg="${this.algorithm}"`,
      `created=${created}`,
      `expires=${expires}`,
    ].join(';');

    return `sig1=${sigParams}`;
  }

  /**
   * Sign bytes using the configured algorithm
   */
  private async signBytes(data: Uint8Array): Promise<Uint8Array> {
    if (this.algorithm === 'ed25519') {
      return await ed25519.signAsync(data, this.privateKey);
    } else if (this.algorithm === 'rsa-sha256') {
      return await this.signRsaSha256(data);
    } else {
      throw new Error(`Unsupported algorithm: ${this.algorithm}`);
    }
  }

  /**
   * Sign with RSA-SHA256 using Web Crypto API
   */
  private async signRsaSha256(data: Uint8Array): Promise<Uint8Array> {
    // Create new ArrayBuffer copies to avoid SharedArrayBuffer issues with Web Crypto
    const keyBuffer = new ArrayBuffer(this.privateKey.byteLength);
    new Uint8Array(keyBuffer).set(this.privateKey);

    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Create new ArrayBuffer for data
    const dataBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(dataBuffer).set(data);

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, dataBuffer);

    return new Uint8Array(signature);
  }

  /**
   * Generate a new Ed25519 key pair
   */
  static async generateEd25519KeyPair(): Promise<KeyPair> {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKeyAsync(privateKey);

    return {
      publicKey: bytesToBase64(publicKey),
      privateKey: bytesToBase64(privateKey),
    };
  }

  /**
   * Generate a new RSA-SHA256 key pair
   */
  static async generateRsaKeyPair(): Promise<KeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );

    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
      publicKey: bytesToBase64(new Uint8Array(publicKeyBuffer)),
      privateKey: bytesToBase64(new Uint8Array(privateKeyBuffer)),
    };
  }

  /**
   * Generate a key pair for the specified algorithm
   */
  static async generateKeyPair(algorithm: 'ed25519' | 'rsa-sha256'): Promise<KeyPair> {
    if (algorithm === 'ed25519') {
      return WebBotAuthSigner.generateEd25519KeyPair();
    } else if (algorithm === 'rsa-sha256') {
      return WebBotAuthSigner.generateRsaKeyPair();
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Create a signer and sign a request in one call
 */
export async function signWebBotRequest(
  options: SigningKeyOptions,
  request: SigningRequest
): Promise<SigningResult> {
  const signer = new WebBotAuthSigner(options);
  return signer.sign(request);
}

/**
 * Generate a new key pair for agent signing
 */
export async function generateAgentKeyPair(
  algorithm: 'ed25519' | 'rsa-sha256' = 'ed25519'
): Promise<KeyPair> {
  return WebBotAuthSigner.generateKeyPair(algorithm);
}

export default WebBotAuthSigner;
