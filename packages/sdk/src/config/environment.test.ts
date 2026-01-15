/**
 * Story 40.28: SDK Environment Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeEnvironment,
  requiresEvmKey,
  getExtendedServiceUrl,
  getSDKFeatures,
  validateExtendedConfig,
  createExtendedConfig,
  getEnvironmentHint,
  SDK_SERVICE_URLS,
  DEFAULT_SDK_FEATURES,
} from './environment';

describe('SDK Environment Configuration', () => {
  describe('normalizeEnvironment', () => {
    it('should map mock to sandbox', () => {
      expect(normalizeEnvironment('mock')).toBe('sandbox');
    });

    it('should map sandbox to sandbox', () => {
      expect(normalizeEnvironment('sandbox')).toBe('sandbox');
    });

    it('should preserve testnet', () => {
      expect(normalizeEnvironment('testnet')).toBe('testnet');
    });

    it('should preserve production', () => {
      expect(normalizeEnvironment('production')).toBe('production');
    });
  });

  describe('requiresEvmKey', () => {
    it('should not require EVM key for mock', () => {
      expect(requiresEvmKey('mock')).toBe(false);
    });

    it('should not require EVM key for sandbox', () => {
      expect(requiresEvmKey('sandbox')).toBe(false);
    });

    it('should require EVM key for testnet', () => {
      expect(requiresEvmKey('testnet')).toBe(true);
    });

    it('should require EVM key for production', () => {
      expect(requiresEvmKey('production')).toBe(true);
    });
  });

  describe('getExtendedServiceUrl', () => {
    it('should return correct API URLs', () => {
      expect(getExtendedServiceUrl('api', 'mock')).toBe('http://localhost:4000');
      expect(getExtendedServiceUrl('api', 'sandbox')).toBe('https://api.sandbox.payos.ai');
      expect(getExtendedServiceUrl('api', 'production')).toBe('https://api.payos.ai');
    });

    it('should return correct facilitator URLs', () => {
      expect(getExtendedServiceUrl('facilitator', 'mock')).toBe('http://localhost:4000/v1/x402/facilitator');
      expect(getExtendedServiceUrl('facilitator', 'sandbox')).toBe('https://x402.org/facilitator');
      expect(getExtendedServiceUrl('facilitator', 'production')).toBe('https://facilitator.coinbase.com');
    });

    it('should return correct blockchain URLs', () => {
      expect(getExtendedServiceUrl('blockchain', 'mock')).toBe('http://localhost:8545');
      expect(getExtendedServiceUrl('blockchain', 'sandbox')).toBe('https://sepolia.base.org');
      expect(getExtendedServiceUrl('blockchain', 'production')).toBe('https://mainnet.base.org');
    });
  });

  describe('getSDKFeatures', () => {
    it('should return default features for environment', () => {
      const mockFeatures = getSDKFeatures('mock');
      expect(mockFeatures.sandboxFacilitator).toBe(true);
      expect(mockFeatures.autoPayments).toBe(true);
    });

    it('should apply overrides', () => {
      const features = getSDKFeatures('mock', { sandboxFacilitator: false });
      expect(features.sandboxFacilitator).toBe(false);
      expect(features.autoPayments).toBe(true);
    });

    it('should not use sandbox facilitator in sandbox mode', () => {
      const features = getSDKFeatures('sandbox');
      expect(features.sandboxFacilitator).toBe(false);
    });
  });

  describe('validateExtendedConfig', () => {
    it('should throw on missing API key', () => {
      expect(() => {
        validateExtendedConfig({
          apiKey: '',
          environment: 'mock',
        });
      }).toThrow('API key is required');
    });

    it('should throw on invalid environment', () => {
      expect(() => {
        validateExtendedConfig({
          apiKey: 'test-key',
          environment: 'invalid' as any,
        });
      }).toThrow('Invalid environment: invalid');
    });

    it('should throw on missing EVM key for testnet', () => {
      expect(() => {
        validateExtendedConfig({
          apiKey: 'test-key',
          environment: 'testnet',
        });
      }).toThrow('EVM private key is required');
    });

    it('should pass with valid mock config', () => {
      expect(() => {
        validateExtendedConfig({
          apiKey: 'test-key',
          environment: 'mock',
        });
      }).not.toThrow();
    });

    it('should pass with valid testnet config with EVM key', () => {
      expect(() => {
        validateExtendedConfig({
          apiKey: 'test-key',
          environment: 'testnet',
          evmPrivateKey: '0x1234567890abcdef',
        });
      }).not.toThrow();
    });
  });

  describe('createExtendedConfig', () => {
    it('should create full config from partial', () => {
      const config = createExtendedConfig({
        apiKey: 'test-key',
        environment: 'mock',
      });

      expect(config.apiKey).toBe('test-key');
      expect(config.environment).toBe('mock');
      expect(config.apiUrl).toBe('http://localhost:4000');
      expect(config.facilitatorUrl).toBe('http://localhost:4000/v1/x402/facilitator');
      expect(config.rpcUrl).toBe('http://localhost:8545');
      expect(config.features.sandboxFacilitator).toBe(true);
    });

    it('should allow URL overrides', () => {
      const config = createExtendedConfig({
        apiKey: 'test-key',
        environment: 'mock',
        apiUrl: 'https://custom.api.com',
      });

      expect(config.apiUrl).toBe('https://custom.api.com');
    });

    it('should merge feature overrides', () => {
      const config = createExtendedConfig({
        apiKey: 'test-key',
        environment: 'mock',
        features: { sandboxFacilitator: false },
      });

      expect(config.features.sandboxFacilitator).toBe(false);
      expect(config.features.autoPayments).toBe(true);
    });
  });

  describe('getEnvironmentHint', () => {
    it('should return mock hint', () => {
      const hint = getEnvironmentHint('mock');
      expect(hint).toContain('Mock mode');
    });

    it('should return sandbox hint', () => {
      const hint = getEnvironmentHint('sandbox');
      expect(hint).toContain('Sandbox');
    });

    it('should return testnet hint', () => {
      const hint = getEnvironmentHint('testnet');
      expect(hint).toContain('Testnet');
    });

    it('should return production hint', () => {
      const hint = getEnvironmentHint('production');
      expect(hint).toContain('Production');
    });
  });

  describe('SDK_SERVICE_URLS', () => {
    it('should have all services', () => {
      expect(SDK_SERVICE_URLS).toHaveProperty('api');
      expect(SDK_SERVICE_URLS).toHaveProperty('facilitator');
      expect(SDK_SERVICE_URLS).toHaveProperty('blockchain');
    });

    it('should have all environments for each service', () => {
      for (const service of Object.keys(SDK_SERVICE_URLS)) {
        expect(SDK_SERVICE_URLS[service as keyof typeof SDK_SERVICE_URLS]).toHaveProperty('mock');
        expect(SDK_SERVICE_URLS[service as keyof typeof SDK_SERVICE_URLS]).toHaveProperty('sandbox');
        expect(SDK_SERVICE_URLS[service as keyof typeof SDK_SERVICE_URLS]).toHaveProperty('testnet');
        expect(SDK_SERVICE_URLS[service as keyof typeof SDK_SERVICE_URLS]).toHaveProperty('production');
      }
    });
  });

  describe('DEFAULT_SDK_FEATURES', () => {
    it('should have all environments', () => {
      expect(DEFAULT_SDK_FEATURES).toHaveProperty('mock');
      expect(DEFAULT_SDK_FEATURES).toHaveProperty('sandbox');
      expect(DEFAULT_SDK_FEATURES).toHaveProperty('testnet');
      expect(DEFAULT_SDK_FEATURES).toHaveProperty('production');
    });

    it('should enable sandbox facilitator only in mock', () => {
      expect(DEFAULT_SDK_FEATURES.mock.sandboxFacilitator).toBe(true);
      expect(DEFAULT_SDK_FEATURES.sandbox.sandboxFacilitator).toBe(false);
      expect(DEFAULT_SDK_FEATURES.testnet.sandboxFacilitator).toBe(false);
      expect(DEFAULT_SDK_FEATURES.production.sandboxFacilitator).toBe(false);
    });
  });
});



