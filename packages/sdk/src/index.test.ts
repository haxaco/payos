import { describe, it, expect } from 'vitest';
import { PayOS } from './index';
import type { PayOSConfig } from './types';

describe('@payos/sdk', () => {
  describe('PayOS class', () => {
    it('should instantiate with sandbox config', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'sandbox',
      };

      const payos = new PayOS(config);
      expect(payos).toBeInstanceOf(PayOS);
    });

    it('should throw error when testnet lacks EVM key', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'testnet',
        // Missing evmPrivateKey
      };

      expect(() => new PayOS(config)).toThrow(/EVM private key is required/);
    });

    it('should throw error when production lacks EVM key', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'production',
        // Missing evmPrivateKey
      };

      expect(() => new PayOS(config)).toThrow(/EVM private key is required/);
    });

    it('should accept EVM key for testnet', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'testnet',
        evmPrivateKey: '0x1234567890abcdef',
      };

      const payos = new PayOS(config);
      expect(payos).toBeInstanceOf(PayOS);
    });

    it('should accept custom API URL', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'sandbox',
        apiUrl: 'https://custom.api.url',
      };

      const payos = new PayOS(config);
      expect(payos).toBeInstanceOf(PayOS);
    });
  });
});

