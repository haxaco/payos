import { createHash, randomBytes, timingSafeEqual } from 'crypto';

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

