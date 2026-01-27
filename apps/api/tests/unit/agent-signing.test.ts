/**
 * Agent Signing Tests
 * Epic 53: Agent-Side Card Payments
 *
 * Tests for WebBotAuthSigner and signing functionality
 */

import { describe, it, expect } from 'vitest';
import {
  WebBotAuthSigner,
  generateAgentKeyPair,
  signWebBotRequest,
  verifyWebBotAuth,
  parseSignatureInput,
} from '@sly/cards';

describe('Agent Signing (RFC 9421)', () => {
  describe('Key Pair Generation', () => {
    it('generates Ed25519 key pair', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(typeof keyPair.publicKey).toBe('string');
      expect(typeof keyPair.privateKey).toBe('string');

      // Ed25519 public key is 32 bytes = ~44 base64 chars
      expect(keyPair.publicKey.length).toBeGreaterThan(40);

      // Ed25519 private key is 32 bytes = ~44 base64 chars
      expect(keyPair.privateKey.length).toBeGreaterThan(40);
    });

    it('generates unique key pairs', async () => {
      const keyPair1 = await generateAgentKeyPair('ed25519');
      const keyPair2 = await generateAgentKeyPair('ed25519');

      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });

    it('generates RSA-SHA256 key pair', async () => {
      const keyPair = await generateAgentKeyPair('rsa-sha256');

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();

      // RSA keys are much larger
      expect(keyPair.publicKey.length).toBeGreaterThan(200);
      expect(keyPair.privateKey.length).toBeGreaterThan(1000);
    });
  });

  describe('WebBotAuthSigner', () => {
    it('creates valid signature for simple GET request', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');
      const signer = new WebBotAuthSigner({
        keyId: 'payos_agent_test123',
        privateKey: keyPair.privateKey,
        algorithm: 'ed25519',
      });

      const result = await signer.sign({
        method: 'GET',
        path: '/api/products',
        host: 'merchant.com',
      });

      // Check all required fields are present
      expect(result.signatureInput).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.headers).toBeDefined();
      expect(result.expiresAt).toBeDefined();

      // Signature-Input should contain the key ID and algorithm
      expect(result.signatureInput).toContain('payos_agent_test123');
      expect(result.signatureInput).toContain('ed25519');
      expect(result.signatureInput).toContain('@method');
      expect(result.signatureInput).toContain('@path');

      // Signature should be in RFC 9421 format: sig1=:BASE64:
      expect(result.signature).toMatch(/^sig1=:[A-Za-z0-9+/=]+:$/);

      // Headers should include signature-input and signature
      expect(result.headers['signature-input']).toBe(result.signatureInput);
      expect(result.headers['signature']).toBe(result.signature);

      // No content-digest for requests without body
      expect(result.contentDigest).toBeUndefined();
    });

    it('creates content-digest for POST request with body', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');
      const signer = new WebBotAuthSigner({
        keyId: 'payos_agent_test123',
        privateKey: keyPair.privateKey,
        algorithm: 'ed25519',
      });

      const body = JSON.stringify({ amount: 99.99, currency: 'USD' });

      const result = await signer.sign({
        method: 'POST',
        path: '/api/checkout',
        host: 'merchant.com',
        headers: {
          'content-type': 'application/json',
        },
        body,
      });

      // Should have content-digest
      expect(result.contentDigest).toBeDefined();
      expect(result.contentDigest).toMatch(/^sha-256=:[A-Za-z0-9+/=]+:$/);
      expect(result.headers['content-digest']).toBe(result.contentDigest);

      // Signature-Input should include content-digest and content-type
      expect(result.signatureInput).toContain('content-digest');
      expect(result.signatureInput).toContain('content-type');
    });

    it('produces different signatures for different requests', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');
      const signer = new WebBotAuthSigner({
        keyId: 'payos_agent_test123',
        privateKey: keyPair.privateKey,
        algorithm: 'ed25519',
      });

      const result1 = await signer.sign({
        method: 'GET',
        path: '/api/products',
        host: 'merchant.com',
      });

      const result2 = await signer.sign({
        method: 'GET',
        path: '/api/orders',
        host: 'merchant.com',
      });

      // Different requests should have different signatures
      expect(result1.signature).not.toBe(result2.signature);
    });

    it('signature expires as configured', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');
      const signer = new WebBotAuthSigner({
        keyId: 'payos_agent_test123',
        privateKey: keyPair.privateKey,
        algorithm: 'ed25519',
        expirationSeconds: 60, // 1 minute
      });

      const result = await signer.sign({
        method: 'GET',
        path: '/api/test',
      });

      const expiresAt = new Date(result.expiresAt);
      const now = new Date();

      // Should expire in approximately 60 seconds
      const diffMs = expiresAt.getTime() - now.getTime();
      expect(diffMs).toBeGreaterThan(55000); // at least 55 seconds
      expect(diffMs).toBeLessThan(65000); // at most 65 seconds
    });

    it('throws for invalid private key', () => {
      // Invalid base64 string
      expect(() => {
        new WebBotAuthSigner({
          keyId: 'test',
          privateKey: 'too-short',
          algorithm: 'ed25519',
        });
      }).toThrow(); // Throws during base64 decoding

      // Valid base64 but wrong length (16 bytes instead of 32)
      expect(() => {
        new WebBotAuthSigner({
          keyId: 'test',
          privateKey: 'MDEyMzQ1Njc4OTAxMjM0NQ==', // 16 bytes
          algorithm: 'ed25519',
        });
      }).toThrow('Ed25519 private key must be 32 bytes');
    });
  });

  describe('Sign -> Verify Roundtrip', () => {
    it('verifies Ed25519 signature correctly', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');
      const keyId = 'payos_agent_roundtrip';

      // Sign a request
      const signResult = await signWebBotRequest(
        {
          keyId,
          privateKey: keyPair.privateKey,
          algorithm: 'ed25519',
        },
        {
          method: 'POST',
          path: '/api/purchase',
          host: 'merchant.com',
          headers: {
            'content-type': 'application/json',
          },
          body: '{"amount":50.00}',
        }
      );

      // Verify the signature
      const verifyResult = await verifyWebBotAuth(
        {
          method: 'POST',
          path: '/api/purchase',
          headers: {
            host: 'merchant.com',
            'content-type': 'application/json',
            'content-digest': signResult.contentDigest!,
            'signature-input': signResult.signatureInput,
            signature: signResult.signature,
          },
          signatureInput: signResult.signatureInput,
          signature: signResult.signature,
        },
        {
          customPublicKey: keyPair.publicKey,
          skipTimestampValidation: true, // Skip for test
        }
      );

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.keyId).toBe(keyId);
    });

    it('rejects tampered request', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');
      const keyId = 'payos_agent_tampered';

      // Sign a request
      const signResult = await signWebBotRequest(
        {
          keyId,
          privateKey: keyPair.privateKey,
          algorithm: 'ed25519',
        },
        {
          method: 'POST',
          path: '/api/purchase',
          host: 'merchant.com',
          body: '{"amount":50.00}',
        }
      );

      // Try to verify with tampered path
      const verifyResult = await verifyWebBotAuth(
        {
          method: 'POST',
          path: '/api/refund', // Tampered!
          headers: {
            host: 'merchant.com',
            'content-digest': signResult.contentDigest!,
            'signature-input': signResult.signatureInput,
            signature: signResult.signature,
          },
          signatureInput: signResult.signatureInput,
          signature: signResult.signature,
        },
        {
          customPublicKey: keyPair.publicKey,
          skipTimestampValidation: true,
        }
      );

      expect(verifyResult.valid).toBe(false);
    });

    it('rejects wrong public key', async () => {
      const keyPair1 = await generateAgentKeyPair('ed25519');
      const keyPair2 = await generateAgentKeyPair('ed25519');
      const keyId = 'payos_agent_wrongkey';

      // Sign with key 1
      const signResult = await signWebBotRequest(
        {
          keyId,
          privateKey: keyPair1.privateKey,
          algorithm: 'ed25519',
        },
        {
          method: 'GET',
          path: '/api/test',
        }
      );

      // Try to verify with key 2's public key
      const verifyResult = await verifyWebBotAuth(
        {
          method: 'GET',
          path: '/api/test',
          headers: {
            'signature-input': signResult.signatureInput,
            signature: signResult.signature,
          },
          signatureInput: signResult.signatureInput,
          signature: signResult.signature,
        },
        {
          customPublicKey: keyPair2.publicKey, // Wrong key!
          skipTimestampValidation: true,
        }
      );

      expect(verifyResult.valid).toBe(false);
    });
  });

  describe('Signature Input Parsing', () => {
    it('parses valid signature input', () => {
      const input = 'sig1=("@method" "@path" "content-digest");keyid="payos_agent_abc";alg="ed25519";created=1700000000;expires=1700000300';

      const parsed = parseSignatureInput(input);

      expect(parsed.components).toEqual(['@method', '@path', 'content-digest']);
      expect(parsed.keyId).toBe('payos_agent_abc');
      expect(parsed.algorithm).toBe('ed25519');
      expect(parsed.created).toBe(1700000000);
      expect(parsed.expires).toBe(1700000300);
    });

    it('throws for invalid format', () => {
      expect(() => parseSignatureInput('invalid')).toThrow('Invalid Signature-Input format');
    });

    it('throws for missing keyid', () => {
      expect(() => parseSignatureInput('sig1=("@method");alg="ed25519"')).toThrow(
        'Missing keyid in Signature-Input'
      );
    });
  });

  describe('Convenience Function', () => {
    it('signWebBotRequest works correctly', async () => {
      const keyPair = await generateAgentKeyPair('ed25519');

      const result = await signWebBotRequest(
        {
          keyId: 'test_key',
          privateKey: keyPair.privateKey,
          algorithm: 'ed25519',
        },
        {
          method: 'GET',
          path: '/test',
        }
      );

      expect(result.signatureInput).toContain('test_key');
      expect(result.signature).toBeDefined();
    });
  });
});
