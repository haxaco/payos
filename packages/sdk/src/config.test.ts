import { describe, it, expect } from 'vitest';
import { getEnvironmentConfig, validateEnvironment } from './config';

describe('config', () => {
  describe('getEnvironmentConfig', () => {
    it('should return sandbox config', () => {
      const config = getEnvironmentConfig('sandbox');
      expect(config.apiUrl).toBe('http://localhost:4000');
      expect(config.facilitatorUrl).toBe('http://localhost:4000/v1/x402/facilitator');
    });

    it('should return testnet config', () => {
      const config = getEnvironmentConfig('testnet');
      expect(config.apiUrl).toBe('https://api.sandbox.payos.ai');
      expect(config.facilitatorUrl).toBe('https://facilitator.x402.org');
    });

    it('should return production config', () => {
      const config = getEnvironmentConfig('production');
      expect(config.apiUrl).toBe('https://api.payos.ai');
      expect(config.facilitatorUrl).toBe('https://facilitator.coinbase.com');
    });
  });

  describe('validateEnvironment', () => {
    it('should pass for sandbox without EVM key', () => {
      expect(() => validateEnvironment('sandbox')).not.toThrow();
    });

    it('should fail for testnet without EVM key', () => {
      expect(() => validateEnvironment('testnet')).toThrow(/EVM private key is required/);
    });

    it('should fail for production without EVM key', () => {
      expect(() => validateEnvironment('production')).toThrow(/EVM private key is required/);
    });

    it('should pass for testnet with EVM key', () => {
      expect(() => validateEnvironment('testnet', '0xabc')).not.toThrow();
    });

    it('should pass for production with EVM key', () => {
      expect(() => validateEnvironment('production', '0xabc')).not.toThrow();
    });
  });
});

