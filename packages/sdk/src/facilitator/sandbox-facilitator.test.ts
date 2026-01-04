import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxFacilitator } from './sandbox-facilitator';
import type { X402Payment } from './types';

describe('SandboxFacilitator', () => {
  let facilitator: SandboxFacilitator;

  beforeEach(() => {
    facilitator = new SandboxFacilitator({
      apiUrl: 'http://localhost:4000',
      apiKey: 'test_key',
      debug: false,
    });
  });

  describe('verify', () => {
    it('should accept valid payment payload', async () => {
      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result = await facilitator.verify({ payment });
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject payment missing required fields', async () => {
      const payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        // Missing amount, token, from, to
      } as X402Payment;

      const result = await facilitator.verify({ payment });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing required field');
    });

    it('should reject unsupported scheme', async () => {
      const payment: X402Payment = {
        scheme: 'unsupported-scheme',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result = await facilitator.verify({ payment });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unsupported scheme');
    });

    it('should reject unsupported network', async () => {
      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:1', // Ethereum mainnet - not supported
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result = await facilitator.verify({ payment });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unsupported network');
    });

    it('should reject invalid amount', async () => {
      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: 'invalid',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result = await facilitator.verify({ payment });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid amount');
    });

    it('should reject zero amount', async () => {
      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result = await facilitator.verify({ payment });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid amount');
    });

    it('should accept Base Sepolia network', async () => {
      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:84532', // Base Sepolia
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result = await facilitator.verify({ payment });
      expect(result.valid).toBe(true);
    });
  });

  describe('settle', () => {
    it('should settle valid payment and return tx hash', async () => {
      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result = await facilitator.settle({ payment });
      expect(result.settled).toBe(true);
      expect(result.transactionHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.timestamp).toBeDefined();
    });

    it('should throw error for invalid payment', async () => {
      const payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        // Missing required fields
      } as X402Payment;

      await expect(facilitator.settle({ payment })).rejects.toThrow(
        'Payment verification failed'
      );
    });

    it('should generate unique transaction hashes', async () => {
      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const result1 = await facilitator.settle({ payment });
      const result2 = await facilitator.settle({ payment });

      expect(result1.transactionHash).not.toBe(result2.transactionHash);
    });

    it('should respect settlement delay', async () => {
      const delayedFacilitator = new SandboxFacilitator({
        apiUrl: 'http://localhost:4000',
        apiKey: 'test_key',
        settlementDelayMs: 100,
      });

      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      const start = Date.now();
      await delayedFacilitator.settle({ payment });
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should simulate failures based on failure rate', async () => {
      const failingFacilitator = new SandboxFacilitator({
        apiUrl: 'http://localhost:4000',
        apiKey: 'test_key',
        failureRate: 100, // Always fail
      });

      const payment: X402Payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      await expect(failingFacilitator.settle({ payment })).rejects.toThrow(
        'Simulated settlement failure'
      );
    });
  });

  describe('supported', () => {
    it('should return supported schemes and networks', async () => {
      const result = await facilitator.supported();

      expect(result.schemes).toHaveLength(1);
      expect(result.schemes[0].scheme).toBe('exact-evm');
      expect(result.schemes[0].networks).toContain('eip155:8453');
      expect(result.schemes[0].networks).toContain('eip155:84532');
    });

    it('should support custom schemes', async () => {
      const customFacilitator = new SandboxFacilitator({
        apiUrl: 'http://localhost:4000',
        apiKey: 'test_key',
        supportedSchemes: [
          {
            scheme: 'custom-scheme',
            networks: ['custom-network-1', 'custom-network-2'],
          },
        ],
      });

      const result = await customFacilitator.supported();

      expect(result.schemes).toHaveLength(1);
      expect(result.schemes[0].scheme).toBe('custom-scheme');
      expect(result.schemes[0].networks).toEqual([
        'custom-network-1',
        'custom-network-2',
      ]);
    });
  });

  describe('configuration', () => {
    it('should use default configuration values', () => {
      const defaultFacilitator = new SandboxFacilitator({
        apiUrl: 'http://localhost:4000',
        apiKey: 'test_key',
      });

      expect(defaultFacilitator).toBeInstanceOf(SandboxFacilitator);
    });

    it('should accept custom configuration', () => {
      const customFacilitator = new SandboxFacilitator({
        apiUrl: 'http://localhost:4000',
        apiKey: 'test_key',
        settlementDelayMs: 500,
        failureRate: 10,
        debug: true,
      });

      expect(customFacilitator).toBeInstanceOf(SandboxFacilitator);
    });
  });
});

