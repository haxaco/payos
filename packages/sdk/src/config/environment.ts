/**
 * Story 40.28: SDK Environment Configuration
 * 
 * Extends the core SDK config with Epic 40 sandbox integration support.
 * Provides per-service environment overrides and feature flags for SDK consumers.
 */

// Re-export core types
export type { PayOSEnvironment, EnvironmentConfig } from '../types';
export { ENVIRONMENT_CONFIGS, getEnvironmentConfig, validateEnvironment } from '../config';

// ============================================
// Extended Types for Epic 40
// ============================================

/**
 * Extended environment with mock mode (aligns with API)
 * - mock: All services mocked locally (no external calls)
 * - sandbox: Alias for testnet (external sandbox APIs)
 * - testnet: Base Sepolia + x402.org + Circle sandbox
 * - production: Base mainnet + Coinbase CDP + Circle production
 */
export type ExtendedEnvironment = 'mock' | 'sandbox' | 'testnet' | 'production';

/**
 * Service names that can be configured
 */
export type SDKServiceName = 
  | 'api'           // PayOS API
  | 'facilitator'   // x402 facilitator
  | 'blockchain';   // EVM RPC

/**
 * Service-specific configuration for SDK
 */
export interface SDKServiceConfig {
  url: string;
  environment: ExtendedEnvironment;
}

/**
 * Feature flags that can be enabled/disabled in SDK
 */
export interface SDKFeatureFlags {
  // x402 features
  autoPayments: boolean;       // Auto-pay 402 responses
  spendingLimits: boolean;     // Enforce spending limits
  
  // Protocol features  
  ap2Support: boolean;         // AP2 mandate support
  acpSupport: boolean;         // ACP checkout support
  
  // AI features
  langchainTools: boolean;     // LangChain tool generation
  vercelTools: boolean;        // Vercel AI SDK tools
  
  // Sandbox features
  sandboxFacilitator: boolean; // Use built-in sandbox facilitator
}

/**
 * Extended SDK configuration with Epic 40 support
 */
export interface ExtendedSDKConfig {
  // Base config
  apiKey: string;
  environment: ExtendedEnvironment;
  evmPrivateKey?: string;
  
  // Custom URLs (optional overrides)
  apiUrl?: string;
  facilitatorUrl?: string;
  rpcUrl?: string;
  
  // Feature flags (optional)
  features?: Partial<SDKFeatureFlags>;
}

// ============================================
// Environment URL Mappings
// ============================================

export const SDK_SERVICE_URLS: Record<SDKServiceName, Record<ExtendedEnvironment, string>> = {
  api: {
    mock: 'http://localhost:4000',
    sandbox: 'https://api.sandbox.payos.ai',
    testnet: 'https://api.sandbox.payos.ai',
    production: 'https://api.payos.ai',
  },
  facilitator: {
    mock: 'http://localhost:4000/v1/x402/facilitator',
    sandbox: 'https://x402.org/facilitator',
    testnet: 'https://x402.org/facilitator',
    production: 'https://facilitator.coinbase.com',
  },
  blockchain: {
    mock: 'http://localhost:8545',
    sandbox: 'https://sepolia.base.org',
    testnet: 'https://sepolia.base.org',
    production: 'https://mainnet.base.org',
  },
};

// ============================================
// Default Feature Flags
// ============================================

export const DEFAULT_SDK_FEATURES: Record<ExtendedEnvironment, SDKFeatureFlags> = {
  mock: {
    autoPayments: true,
    spendingLimits: true,
    ap2Support: true,
    acpSupport: true,
    langchainTools: true,
    vercelTools: true,
    sandboxFacilitator: true,  // Use mock facilitator
  },
  sandbox: {
    autoPayments: true,
    spendingLimits: true,
    ap2Support: true,
    acpSupport: true,
    langchainTools: true,
    vercelTools: true,
    sandboxFacilitator: false,  // Use real x402.org
  },
  testnet: {
    autoPayments: true,
    spendingLimits: true,
    ap2Support: true,
    acpSupport: true,
    langchainTools: true,
    vercelTools: true,
    sandboxFacilitator: false,  // Use real x402.org
  },
  production: {
    autoPayments: true,
    spendingLimits: true,
    ap2Support: true,
    acpSupport: true,
    langchainTools: true,
    vercelTools: true,
    sandboxFacilitator: false,  // Use real Coinbase facilitator
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize environment name
 * Maps 'mock' to internal handling, 'sandbox' to 'testnet' for backwards compatibility
 */
export function normalizeEnvironment(env: ExtendedEnvironment): 'sandbox' | 'testnet' | 'production' {
  if (env === 'mock' || env === 'sandbox') {
    return 'sandbox';  // Both mock and sandbox map to SDK's sandbox mode
  }
  return env;
}

/**
 * Check if environment requires EVM private key
 */
export function requiresEvmKey(env: ExtendedEnvironment): boolean {
  return env === 'testnet' || env === 'production';
}

/**
 * Get service URL for extended environment
 */
export function getExtendedServiceUrl(service: SDKServiceName, env: ExtendedEnvironment): string {
  return SDK_SERVICE_URLS[service][env];
}

/**
 * Get feature flags for environment with optional overrides
 */
export function getSDKFeatures(
  env: ExtendedEnvironment,
  overrides?: Partial<SDKFeatureFlags>
): SDKFeatureFlags {
  return {
    ...DEFAULT_SDK_FEATURES[env],
    ...overrides,
  };
}

/**
 * Validate extended SDK configuration
 */
export function validateExtendedConfig(config: ExtendedSDKConfig): void {
  // Validate API key
  if (!config.apiKey) {
    throw new Error('API key is required');
  }

  // Validate environment
  if (!['mock', 'sandbox', 'testnet', 'production'].includes(config.environment)) {
    throw new Error(`Invalid environment: ${config.environment}. Must be mock, sandbox, testnet, or production.`);
  }

  // Validate EVM key for non-mock environments
  if (requiresEvmKey(config.environment) && !config.evmPrivateKey) {
    throw new Error(
      `EVM private key is required for ${config.environment} environment. ` +
      'Use mock or sandbox mode for local development without blockchain.'
    );
  }

  // Validate production safety (warn only)
  if (config.environment === 'production' && process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️  WARNING: Using production environment outside of NODE_ENV=production. ' +
      'Make sure this is intentional.'
    );
  }
}

/**
 * Create full configuration from partial input
 */
export function createExtendedConfig(
  partial: ExtendedSDKConfig
): Required<Omit<ExtendedSDKConfig, 'evmPrivateKey'>> & { evmPrivateKey?: string } {
  validateExtendedConfig(partial);

  const env = partial.environment;
  const features = getSDKFeatures(env, partial.features);

  return {
    apiKey: partial.apiKey,
    environment: env,
    evmPrivateKey: partial.evmPrivateKey,
    apiUrl: partial.apiUrl || getExtendedServiceUrl('api', env),
    facilitatorUrl: partial.facilitatorUrl || getExtendedServiceUrl('facilitator', env),
    rpcUrl: partial.rpcUrl || getExtendedServiceUrl('blockchain', env),
    features,
  };
}

/**
 * Get environment hint message for debugging
 */
export function getEnvironmentHint(env: ExtendedEnvironment): string {
  switch (env) {
    case 'mock':
      return '🧪 Mock mode: All external services are simulated locally.';
    case 'sandbox':
    case 'testnet':
      return '🔬 Sandbox/Testnet mode: Using Base Sepolia + x402.org + Circle sandbox.';
    case 'production':
      return '🚀 Production mode: Using Base mainnet + Coinbase CDP + Circle production.';
    default:
      return `Unknown environment: ${env}`;
  }
}



