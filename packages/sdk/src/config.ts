import type { PayOSEnvironment, EnvironmentConfig } from './types';

/**
 * Environment-specific configuration
 */
export const ENVIRONMENT_CONFIGS: Record<PayOSEnvironment, EnvironmentConfig> = {
  sandbox: {
    apiUrl: 'http://localhost:4000',
    facilitatorUrl: 'http://localhost:4000/v1/x402/facilitator',
  },
  testnet: {
    apiUrl: 'https://api.sandbox.payos.ai',
    facilitatorUrl: 'https://facilitator.x402.org', // x402.org Base Sepolia
  },
  production: {
    apiUrl: 'https://api.payos.ai',
    facilitatorUrl: 'https://facilitator.coinbase.com', // Coinbase CDP Base mainnet
  },
};

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

