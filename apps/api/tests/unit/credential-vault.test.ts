/**
 * Credential Vault Service Tests
 * Epic 48, Story 48.3: Tests for encryption/decryption
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptCredentials,
  decryptCredentials,
  serializeEncrypted,
  deserializeEncrypted,
  encryptAndSerialize,
  deserializeAndDecrypt,
  validateCredentialStructure,
  maskCredentials,
  generateEncryptionKey,
} from '../../src/services/credential-vault/index.js';

describe('Credential Vault Service', () => {
  describe('encryption/decryption', () => {
    it('should encrypt and decrypt credentials correctly', () => {
      const credentials = {
        api_key: 'sk_test_123456789',
        webhook_secret: 'whsec_abc123',
      };

      const encrypted = encryptCredentials(credentials);

      // Verify encrypted structure
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.keyId).toBe('v1');

      // Ciphertext should not contain original data
      expect(encrypted.ciphertext).not.toContain('sk_test');
      expect(encrypted.ciphertext).not.toContain('whsec');

      // Decrypt and verify
      const decrypted = decryptCredentials(encrypted);
      expect(decrypted).toEqual(credentials);
    });

    it('should produce different ciphertext for same input (unique IV)', () => {
      const credentials = { api_key: 'sk_test_123' };

      const encrypted1 = encryptCredentials(credentials);
      const encrypted2 = encryptCredentials(credentials);

      // IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // Ciphertexts should be different
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

      // But both should decrypt to same value
      expect(decryptCredentials(encrypted1)).toEqual(credentials);
      expect(decryptCredentials(encrypted2)).toEqual(credentials);
    });

    it('should handle complex nested credentials', () => {
      const credentials = {
        api_key: 'sk_test_123',
        settings: {
          sandbox: true,
          region: 'us-west-2',
        },
        scopes: ['read', 'write', 'admin'],
      };

      const encrypted = encryptCredentials(credentials);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted).toEqual(credentials);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize encrypted credentials', () => {
      const credentials = { api_key: 'sk_test_123' };
      const encrypted = encryptCredentials(credentials);

      const serialized = serializeEncrypted(encrypted);
      expect(typeof serialized).toBe('string');

      const deserialized = deserializeEncrypted(serialized);
      expect(deserialized).toEqual(encrypted);
    });

    it('should work with combined encrypt+serialize and deserialize+decrypt', () => {
      const credentials = {
        api_key: 'sk_live_abcdefghijklmnop',
        client_secret: 'cs_secret_123456',
      };

      const serialized = encryptAndSerialize(credentials);
      expect(typeof serialized).toBe('string');

      const decrypted = deserializeAndDecrypt(serialized);
      expect(decrypted).toEqual(credentials);
    });
  });

  describe('validateCredentialStructure', () => {
    it('should validate Stripe credentials', () => {
      // Valid Stripe credentials
      const valid = validateCredentialStructure('stripe', {
        api_key: 'sk_test_123456789',
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);

      // Missing api_key
      const missingKey = validateCredentialStructure('stripe', {});
      expect(missingKey.valid).toBe(false);
      expect(missingKey.errors).toContain('Stripe credentials require api_key (string)');

      // Invalid prefix
      const invalidPrefix = validateCredentialStructure('stripe', {
        api_key: 'pk_test_123', // Public key, not secret key
      });
      expect(invalidPrefix.valid).toBe(false);
      expect(invalidPrefix.errors).toContain('Stripe API key must start with sk_');
    });

    it('should validate PayPal credentials', () => {
      // Valid PayPal credentials
      const valid = validateCredentialStructure('paypal', {
        client_id: 'AaBbCcDd123',
        client_secret: 'EeFfGgHh456',
      });
      expect(valid.valid).toBe(true);

      // Missing client_secret
      const missing = validateCredentialStructure('paypal', {
        client_id: 'AaBbCcDd123',
      });
      expect(missing.valid).toBe(false);
      expect(missing.errors).toContain('PayPal credentials require client_secret (string)');
    });

    it('should validate Circle credentials', () => {
      const valid = validateCredentialStructure('circle', {
        api_key: 'CIRCLE_API_KEY_123',
      });
      expect(valid.valid).toBe(true);
    });

    it('should validate PayOS Native credentials', () => {
      // With Pix key
      const withPix = validateCredentialStructure('payos_native', {
        pix_key: '12345678901',
      });
      expect(withPix.valid).toBe(true);

      // With CLABE
      const withClabe = validateCredentialStructure('payos_native', {
        clabe: '012345678901234567',
      });
      expect(withClabe.valid).toBe(true);

      // Missing both
      const missing = validateCredentialStructure('payos_native', {});
      expect(missing.valid).toBe(false);
      expect(missing.errors).toContain('PayOS Native credentials require either pix_key or clabe');
    });

    it('should reject unknown handler types', () => {
      const result = validateCredentialStructure('unknown_handler', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown handler type: unknown_handler');
    });
  });

  describe('maskCredentials', () => {
    it('should mask long credential values', () => {
      const credentials = {
        api_key: 'sk_test_51Slyhsabcdefghijklmnop',
        short: 'abc',
        number: 12345,
      };

      const masked = maskCredentials(credentials);

      // Long values should be partially visible
      expect(masked.api_key).toBe('sk_test...mnop');

      // Short values should be fully hidden
      expect(masked.short).toBe('***');

      // Non-strings should be hidden
      expect(masked.number).toBe('[hidden]');
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid 32-byte hex key', () => {
      const key = generateEncryptionKey();

      // Should be 64 hex characters (32 bytes)
      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);

      // Each generated key should be unique
      const key2 = generateEncryptionKey();
      expect(key).not.toBe(key2);
    });
  });
});
