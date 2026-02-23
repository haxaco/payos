import { describe, it, expect } from 'vitest';
import { PayOS } from './index';
import type { PayOSConfig } from './types';

describe('@sly/sdk', () => {
  describe('PayOS class', () => {
    it('should instantiate with sandbox config', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'sandbox',
      };

      const payos = new PayOS(config);
      expect(payos).toBeInstanceOf(PayOS);
    });

    it('should instantiate with testnet config without EVM key', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'testnet',
      };

      const payos = new PayOS(config);
      expect(payos).toBeInstanceOf(PayOS);
    });

    it('should instantiate with production config without EVM key', () => {
      const config: PayOSConfig = {
        apiKey: 'test_key',
        environment: 'production',
      };

      const payos = new PayOS(config);
      expect(payos).toBeInstanceOf(PayOS);
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

