/**
 * Story 40.28: Environment Configuration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need to test the module with different env vars
// So we'll use dynamic imports and reset modules between tests

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to get fresh config
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Detection', () => {
    it('should default to mock environment', async () => {
      delete process.env.PAYOS_ENVIRONMENT;
      
      const { getEnvironment } = await import('./environment.js');
      expect(getEnvironment()).toBe('mock');
    });

    it('should respect PAYOS_ENVIRONMENT=sandbox', async () => {
      process.env.PAYOS_ENVIRONMENT = 'sandbox';
      
      const { getEnvironment } = await import('./environment.js');
      expect(getEnvironment()).toBe('sandbox');
    });

    it('should throw on invalid environment', async () => {
      process.env.PAYOS_ENVIRONMENT = 'invalid';
      
      await expect(import('./environment.js')).rejects.toThrow(
        'Invalid PAYOS_ENVIRONMENT: invalid'
      );
    });
  });

  describe('Production Safety', () => {
    it('should reject production in non-production NODE_ENV', async () => {
      process.env.PAYOS_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'development';
      
      await expect(import('./environment.js')).rejects.toThrow(
        'Cannot use production environment outside of NODE_ENV=production'
      );
    });

    it('should allow production in production NODE_ENV', async () => {
      process.env.PAYOS_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';
      
      const { getEnvironment } = await import('./environment.js');
      expect(getEnvironment()).toBe('production');
    });

    it('should allow production with ALLOW_PRODUCTION_IN_DEV=true', async () => {
      process.env.PAYOS_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_PRODUCTION_IN_DEV = 'true';
      
      const { getEnvironment } = await import('./environment.js');
      expect(getEnvironment()).toBe('production');
    });
  });

  describe('Service Configuration', () => {
    it('should return default service URL for environment', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      
      const { getServiceUrl } = await import('./environment.js');
      expect(getServiceUrl('circle')).toBe('http://localhost:4000/mock/circle');
    });

    it('should return sandbox URL for sandbox environment', async () => {
      process.env.PAYOS_ENVIRONMENT = 'sandbox';
      
      const { getServiceUrl } = await import('./environment.js');
      expect(getServiceUrl('circle')).toBe('https://api-sandbox.circle.com');
    });

    it('should allow per-service environment override', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      process.env.PAYOS_CIRCLE_ENV = 'sandbox';
      
      const { getServiceConfig } = await import('./environment.js');
      const config = getServiceConfig('circle');
      
      expect(config.environment).toBe('sandbox');
      expect(config.apiUrl).toBe('https://api-sandbox.circle.com');
    });

    it('should allow custom service URL', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      process.env.PAYOS_CIRCLE_URL = 'https://custom.circle.com';
      
      const { getServiceConfig } = await import('./environment.js');
      const config = getServiceConfig('circle');
      
      expect(config.apiUrl).toBe('https://custom.circle.com');
    });

    it('should allow disabling services', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      process.env.PAYOS_COMPLIANCE_ENABLED = 'false';
      
      const { isServiceEnabled } = await import('./environment.js');
      expect(isServiceEnabled('compliance')).toBe(false);
    });
  });

  describe('Feature Flags', () => {
    it('should have default feature flags for mock', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      
      const { getFeatures } = await import('./environment.js');
      const features = getFeatures();
      
      expect(features.circlePayouts).toBe(true);
      expect(features.walletScreening).toBe(false);
    });

    it('should have different defaults for sandbox', async () => {
      process.env.PAYOS_ENVIRONMENT = 'sandbox';
      
      const { getFeatures } = await import('./environment.js');
      const features = getFeatures();
      
      expect(features.circlePayouts).toBe(true);
      expect(features.walletScreening).toBe(true);
    });

    it('should allow feature flag overrides', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      process.env.PAYOS_FEATURE_WALLET_SCREENING = 'true';
      
      const { isFeatureEnabled } = await import('./environment.js');
      expect(isFeatureEnabled('walletScreening')).toBe(true);
    });

    it('should disable features with false', async () => {
      process.env.PAYOS_ENVIRONMENT = 'sandbox';
      process.env.PAYOS_FEATURE_WALLET_SCREENING = 'false';
      
      const { isFeatureEnabled } = await import('./environment.js');
      expect(isFeatureEnabled('walletScreening')).toBe(false);
    });
  });

  describe('Environment Helpers', () => {
    it('should correctly identify mock mode', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      
      const { isMock, isSandbox, isProduction } = await import('./environment.js');
      
      expect(isMock()).toBe(true);
      expect(isSandbox()).toBe(false);
      expect(isProduction()).toBe(false);
    });

    it('should correctly identify sandbox mode', async () => {
      process.env.PAYOS_ENVIRONMENT = 'sandbox';
      
      const { isMock, isSandbox, isProduction } = await import('./environment.js');
      
      expect(isMock()).toBe(false);
      expect(isSandbox()).toBe(true);
      expect(isProduction()).toBe(false);
    });

    it('should correctly identify production mode', async () => {
      process.env.PAYOS_ENVIRONMENT = 'production';
      process.env.NODE_ENV = 'production';
      
      const { isMock, isSandbox, isProduction } = await import('./environment.js');
      
      expect(isMock()).toBe(false);
      expect(isSandbox()).toBe(false);
      expect(isProduction()).toBe(true);
    });
  });

  describe('Operation Validation', () => {
    it('should validate required features for operation', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      process.env.PAYOS_FEATURE_CIRCLE_PAYOUTS = 'false';
      
      const { environmentManager } = await import('./environment.js');
      
      expect(() => {
        environmentManager.validateForOperation('createPixPayout', ['circlePayouts']);
      }).toThrow("Feature 'circlePayouts' is disabled");
    });

    it('should pass validation when features are enabled', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      
      const { environmentManager } = await import('./environment.js');
      
      expect(() => {
        environmentManager.validateForOperation('createPixPayout', ['circlePayouts']);
      }).not.toThrow();
    });
  });

  describe('Service URLs', () => {
    it('should have correct x402 URLs', async () => {
      const { SERVICE_URLS } = await import('./environment.js');
      
      expect(SERVICE_URLS.x402.mock).toBe('http://localhost:4000/v1/x402/facilitator');
      expect(SERVICE_URLS.x402.sandbox).toBe('https://x402.org/facilitator');
      expect(SERVICE_URLS.x402.production).toBe('https://facilitator.coinbase.com');
    });

    it('should have correct blockchain URLs', async () => {
      const { SERVICE_URLS } = await import('./environment.js');
      
      expect(SERVICE_URLS.blockchain.mock).toBe('http://localhost:8545');
      expect(SERVICE_URLS.blockchain.sandbox).toBe('https://sepolia.base.org');
      expect(SERVICE_URLS.blockchain.production).toBe('https://mainnet.base.org');
    });

    it('should have correct Coinbase CDP URLs', async () => {
      const { SERVICE_URLS } = await import('./environment.js');
      
      expect(SERVICE_URLS.coinbase.mock).toBe('http://localhost:4000/mock/coinbase');
      expect(SERVICE_URLS.coinbase.sandbox).toBe('https://api.developer.coinbase.com');
      expect(SERVICE_URLS.coinbase.production).toBe('https://api.developer.coinbase.com');
    });

    it('should have correct Circle URLs', async () => {
      const { SERVICE_URLS } = await import('./environment.js');
      
      expect(SERVICE_URLS.circle.mock).toBe('http://localhost:4000/mock/circle');
      expect(SERVICE_URLS.circle.sandbox).toBe('https://api-sandbox.circle.com');
      expect(SERVICE_URLS.circle.production).toBe('https://api.circle.com');
    });
  });

  describe('Startup Logging', () => {
    it('should log startup info without throwing', async () => {
      process.env.PAYOS_ENVIRONMENT = 'mock';
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { environmentManager } = await import('./environment.js');
      
      expect(() => {
        environmentManager.logStartupInfo();
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});

