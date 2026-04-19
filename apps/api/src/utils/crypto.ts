import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// Configure ed25519 to use sha512 for RFC 8032 compliance
ed25519.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed25519.etc.concatBytes(...m));

/**
 * Generate a secure random API key
 * Format: pk_test_<32 random chars> or pk_live_<32 random chars>
 */
export function generateApiKey(environment: 'test' | 'live' = 'test'): string {
  const randomPart = randomBytes(24).toString('base64url'); // 32 chars
  return `pk_${environment}_${randomPart}`;
}

/**
 * Generate a secure random agent token
 * Format: agent_<32 random chars>
 */
export function generateAgentToken(): string {
  const randomPart = randomBytes(24).toString('base64url');
  return `agent_${randomPart}`;
}

/**
 * Hash an API key using SHA-256
 * This is a one-way hash - the original key cannot be recovered
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Extract the prefix from an API key for indexed lookup
 * Returns first 12 characters (e.g., "pk_test_abc1")
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

/**
 * Verify an API key against its hash using constant-time comparison
 * This prevents timing attacks
 */
export function verifyApiKey(providedKey: string, storedHash: string): boolean {
  const providedHash = hashApiKey(providedKey);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(providedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    
    if (providedBuffer.length !== storedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Mask an API key for display (e.g., in logs or UI)
 * Shows only prefix and last 4 characters
 */
export function maskApiKey(key: string): string {
  if (key.length < 16) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

/**
 * Generate a key rotation token (for secure key rotation flow)
 */
export function generateRotationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a secure random portal token
 * Format: portal_<32 random chars>
 * Used for customer-facing usage API access (Epic 65)
 */
export function generatePortalToken(): string {
  const randomPart = randomBytes(24).toString('base64url');
  return `portal_${randomPart}`;
}

// ============================================
// Epic 72: Ed25519 Key-Pair Authentication
// ============================================

/**
 * Generate a challenge nonce for Ed25519 challenge-response auth.
 * Format: challenge_<first8 of agentId>_<32 bytes base64url>
 */
export function generateChallengeNonce(agentId: string): string {
  const prefix = agentId.replace(/-/g, '').slice(0, 8);
  const noncePart = randomBytes(32).toString('base64url');
  return `challenge_${prefix}_${noncePart}`;
}

/**
 * Generate a session token issued after successful challenge-response.
 * Format: sess_<32 bytes base64url>
 */
export function generateSessionToken(): string {
  const randomPart = randomBytes(32).toString('base64url');
  return `sess_${randomPart}`;
}

/**
 * Generate an Ed25519 key pair for agent authentication.
 * Returns { privateKey, publicKey } as base64-encoded strings.
 * The private key is returned ONCE and must be saved by the caller.
 */
export function generateEd25519KeyPair(): { privateKey: string; publicKey: string } {
  const privateKeyBytes = ed25519.utils.randomPrivateKey();
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return {
    privateKey: Buffer.from(privateKeyBytes).toString('base64'),
    publicKey: Buffer.from(publicKeyBytes).toString('base64'),
  };
}

/**
 * Generate a key ID for an agent auth key.
 * Format: auth_<first8 of agentId>_<8 random hex chars>
 */
export function generateAuthKeyId(agentId: string): string {
  const prefix = agentId.replace(/-/g, '').slice(0, 8);
  const suffix = randomBytes(4).toString('hex');
  return `auth_${prefix}_${suffix}`;
}

/**
 * Verify an Ed25519 signature against a message and public key.
 * Uses constant-time comparison internally (via @noble/ed25519).
 */
export async function verifyEd25519Signature(
  message: string | Uint8Array,
  signature: string | Uint8Array,
  publicKey: string | Uint8Array,
): Promise<boolean> {
  try {
    const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const sigBytes = typeof signature === 'string' ? Buffer.from(signature, 'base64') : signature;
    const pubBytes = typeof publicKey === 'string' ? Buffer.from(publicKey, 'base64') : publicKey;

    if (sigBytes.length !== 64 || pubBytes.length !== 32) {
      return false;
    }

    return await ed25519.verifyAsync(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

/**
 * Sign a message with an Ed25519 private key.
 * Used by the key provisioning endpoint to let agents verify the key works.
 */
export async function signEd25519(
  message: string | Uint8Array,
  privateKey: string | Uint8Array,
): Promise<string> {
  const msgBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const keyBytes = typeof privateKey === 'string' ? Buffer.from(privateKey, 'base64') : privateKey;
  const sig = await ed25519.signAsync(msgBytes, keyBytes);
  return Buffer.from(sig).toString('base64');
}

