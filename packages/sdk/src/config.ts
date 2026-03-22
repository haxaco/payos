import type { PayOSEnvironment, EnvironmentConfig } from './types';

/**
 * Environment-specific configuration
 */
export const ENVIRONMENT_CONFIGS: Record<PayOSEnvironment, EnvironmentConfig> = {
  sandbox: {
    apiUrl: 'https://sandbox.getsly.ai',
    facilitatorUrl: 'https://facilitator.x402.org', // x402.org Base Sepolia
  },
  testnet: {
    apiUrl: 'https://sandbox.getsly.ai',
    facilitatorUrl: 'https://facilitator.x402.org', // x402.org Base Sepolia
  },
  production: {
    apiUrl: 'https://api.getsly.ai',
    facilitatorUrl: 'https://facilitator.coinbase.com', // Coinbase CDP Base mainnet
  },
};

/**
 * Infer environment from API key prefix
 * - pk_test_* or pk_sandbox_* → sandbox
 * - pk_live_* → production
 */
export function inferEnvironmentFromKey(apiKey: string): PayOSEnvironment | undefined {
  if (apiKey.startsWith('pk_test_') || apiKey.startsWith('pk_sandbox_')) {
    return 'sandbox';
  }
  if (apiKey.startsWith('pk_live_')) {
    return 'production';
  }
  return undefined;
}

/**
 * Get configuration for an environment
 */
export function getEnvironmentConfig(environment: PayOSEnvironment): EnvironmentConfig {
  return ENVIRONMENT_CONFIGS[environment];
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(
  environment: PayOSEnvironment,
  evmPrivateKey?: string
): void {
  if (environment !== 'sandbox' && !evmPrivateKey) {
    throw new Error(
      `EVM private key is required for ${environment} environment. ` +
      'Use sandbox mode for local development without blockchain.'
    );
  }
}

