/**
 * UCP Signing Service
 *
 * Implements EC P-256 (ES256) signing for UCP webhook signatures
 * using detached JWTs per RFC 7797.
 *
 * @see https://ucp.dev/specification/overview/#signing-keys
 * @see RFC 7797 - JSON Web Signature (JWS) Unencoded Payload Option
 */

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  KeyObject,
  createHash,
} from 'crypto';

// =============================================================================
// Types
// =============================================================================

/**
 * JWK (JSON Web Key) format for public key
 * @see https://datatracker.ietf.org/doc/html/rfc7517
 */
export interface UCPSigningKey {
  kid: string; // Key ID
  kty: 'EC'; // Key Type (Elliptic Curve)
  crv: 'P-256'; // Curve
  x: string; // X coordinate (base64url)
  y: string; // Y coordinate (base64url)
  use: 'sig'; // Key use (signature)
  alg: 'ES256'; // Algorithm
}

/**
 * Private key storage (internal use only)
 */
interface UCPPrivateKey {
  kid: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
  jwk: UCPSigningKey;
  createdAt: Date;
}

/**
 * Detached JWT header per RFC 7797
 */
interface DetachedJWTHeader {
  alg: 'ES256';
  kid: string;
  b64: false; // Unencoded payload
  crit: ['b64']; // Critical header
}

// =============================================================================
// Key Storage (In-memory for PoC, use secrets manager in production)
// =============================================================================

let signingKey: UCPPrivateKey | null = null;
const keyRotationHistory: UCPSigningKey[] = [];

// =============================================================================
// Key Management
// =============================================================================

/**
 * Initialize or load the UCP signing key
 *
 * In production, this should load from environment variables or a secrets manager.
 * For PoC, we generate a new key on startup if none exists.
 */
export function initializeSigningKey(
  options: {
    privateKeyPem?: string;
    publicKeyPem?: string;
    kid?: string;
  } = {}
): UCPSigningKey {
  // If key already initialized, return the public JWK
  if (signingKey) {
    return signingKey.jwk;
  }

  let privateKey: KeyObject;
  let publicKey: KeyObject;
  let kid: string;

  if (options.privateKeyPem && options.publicKeyPem) {
    // Load from provided PEM strings
    privateKey = createPrivateKey(options.privateKeyPem);
    publicKey = createPublicKey(options.publicKeyPem);
    kid = options.kid || generateKeyId(publicKey);
  } else if (process.env.UCP_SIGNING_PRIVATE_KEY) {
    // Load from environment variable
    const privateKeyPem = process.env.UCP_SIGNING_PRIVATE_KEY.replace(
      /\\n/g,
      '\n'
    );
    privateKey = createPrivateKey(privateKeyPem);
    publicKey = createPublicKey(privateKey);
    kid = process.env.UCP_SIGNING_KEY_ID || generateKeyId(publicKey);
  } else {
    // Generate new key pair for development/PoC
    console.log('[UCP Signing] Generating new EC P-256 key pair...');
    const keyPair = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // P-256
    });
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;
    kid = generateKeyId(publicKey);

    // Log the private key in development so it can be saved
    if (process.env.NODE_ENV === 'development') {
      console.log('[UCP Signing] Generated private key (save for production):');
      console.log(
        privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
      );
    }
  }

  // Extract JWK components from public key
  const jwkPublic = publicKey.export({ format: 'jwk' }) as {
    x: string;
    y: string;
  };

  const jwk: UCPSigningKey = {
    kid,
    kty: 'EC',
    crv: 'P-256',
    x: jwkPublic.x,
    y: jwkPublic.y,
    use: 'sig',
    alg: 'ES256',
  };

  signingKey = {
    kid,
    privateKey,
    publicKey,
    jwk,
    createdAt: new Date(),
  };

  console.log(`[UCP Signing] Initialized signing key: ${kid}`);
  return jwk;
}

/**
 * Generate a key ID from public key (hash of DER encoding)
 */
function generateKeyId(publicKey: KeyObject): string {
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const hash = createHash('sha256').update(der).digest('hex');
  return `ucp-key-${hash.slice(0, 16)}`;
}

/**
 * Get the current public signing key in JWK format
 */
export function getSigningKey(): UCPSigningKey {
  if (!signingKey) {
    return initializeSigningKey();
  }
  return signingKey.jwk;
}

/**
 * Get all signing keys (current + rotated for verification)
 */
export function getAllSigningKeys(): UCPSigningKey[] {
  const keys: UCPSigningKey[] = [];
  if (signingKey) {
    keys.push(signingKey.jwk);
  }
  keys.push(...keyRotationHistory);
  return keys;
}

/**
 * Rotate to a new signing key (keeps old key for verification)
 */
export function rotateSigningKey(): UCPSigningKey {
  if (signingKey) {
    // Keep old key in rotation history for verification of old signatures
    keyRotationHistory.unshift(signingKey.jwk);
    // Keep only last 3 keys in rotation
    if (keyRotationHistory.length > 3) {
      keyRotationHistory.pop();
    }
  }

  // Clear current key to force re-initialization
  signingKey = null;

  return initializeSigningKey();
}

// =============================================================================
// Detached JWT Signing (RFC 7797)
// =============================================================================

/**
 * Base64url encode (without padding)
 */
function base64urlEncode(data: Buffer | string): string {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  return buffer.toString('base64url');
}

/**
 * Base64url decode
 */
function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

/**
 * Create a detached JWT signature for a payload
 *
 * Per RFC 7797, detached JWTs have:
 * - Header with b64: false and crit: ["b64"]
 * - The payload is NOT included in the JWT
 * - Signature is computed over: base64url(header) + "." + payload
 *
 * @param payload - The raw payload string to sign (not base64 encoded)
 * @returns The detached JWT (header..signature, no payload)
 */
export function createDetachedJWT(payload: string): string {
  if (!signingKey) {
    initializeSigningKey();
  }
  if (!signingKey) {
    throw new Error('Signing key not initialized');
  }

  // Create header
  const header: DetachedJWTHeader = {
    alg: 'ES256',
    kid: signingKey.kid,
    b64: false,
    crit: ['b64'],
  };

  const headerEncoded = base64urlEncode(JSON.stringify(header));

  // Signing input per RFC 7797: base64url(header) + "." + payload
  // Note: payload is NOT base64 encoded in detached mode
  const signingInput = `${headerEncoded}.${payload}`;

  // Sign with ES256 (ECDSA P-256 with SHA-256)
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: signingKey.privateKey,
    dsaEncoding: 'ieee-p1363', // Raw R || S format for JWT
  });

  const signatureEncoded = base64urlEncode(signature);

  // Detached JWT format: header..signature (empty payload section)
  return `${headerEncoded}..${signatureEncoded}`;
}

/**
 * Verify a detached JWT signature
 *
 * @param jwt - The detached JWT (header..signature)
 * @param payload - The raw payload that was signed
 * @param signingKeys - Array of valid signing keys to check against
 * @returns true if signature is valid
 */
export function verifyDetachedJWT(
  jwt: string,
  payload: string,
  signingKeys?: UCPSigningKey[]
): boolean {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [headerEncoded, emptyPayload, signatureEncoded] = parts;

    // Detached JWT should have empty payload section
    if (emptyPayload !== '') {
      return false;
    }

    // Parse header
    const header = JSON.parse(base64urlDecode(headerEncoded).toString());

    // Verify header requirements
    if (header.alg !== 'ES256' || header.b64 !== false) {
      return false;
    }

    // Find matching key by kid
    const keys = signingKeys || getAllSigningKeys();
    const matchingKey = keys.find((k) => k.kid === header.kid);
    if (!matchingKey) {
      console.warn(
        `[UCP Signing] No matching key found for kid: ${header.kid}`
      );
      return false;
    }

    // Convert JWK to public key
    const publicKey = createPublicKey({
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: matchingKey.x,
        y: matchingKey.y,
      },
      format: 'jwk',
    });

    // Reconstruct signing input
    const signingInput = `${headerEncoded}.${payload}`;
    const signature = base64urlDecode(signatureEncoded);

    // Verify signature
    return verify(
      'sha256',
      Buffer.from(signingInput),
      {
        key: publicKey,
        dsaEncoding: 'ieee-p1363',
      },
      signature
    );
  } catch (error) {
    console.error('[UCP Signing] Verification error:', error);
    return false;
  }
}

// =============================================================================
// Webhook Signature Helpers
// =============================================================================

/**
 * Sign a webhook payload with detached JWT
 *
 * Returns the Request-Signature header value
 */
export function signWebhookPayload(payload: string): string {
  return createDetachedJWT(payload);
}

/**
 * Verify a webhook signature from Request-Signature header
 *
 * @param signature - The Request-Signature header value
 * @param payload - The raw webhook body
 * @param signingKeys - Array of valid signing keys (from merchant's /.well-known/ucp)
 */
export function verifyWebhookPayload(
  signature: string,
  payload: string,
  signingKeys: UCPSigningKey[]
): boolean {
  return verifyDetachedJWT(signature, payload, signingKeys);
}

// =============================================================================
// Exports for Testing
// =============================================================================

export function _resetSigningKey(): void {
  signingKey = null;
  keyRotationHistory.length = 0;
}
