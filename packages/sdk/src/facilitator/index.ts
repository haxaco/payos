/**
 * Sandbox facilitator for x402 protocol
 * 
 * Provides a mock blockchain facilitator that implements the x402
 * facilitator interface but skips actual blockchain verification.
 * 
 * This enables local development and testing without:
 * - Gas fees
 * - Real USDC
 * - Network delays
 */

export * from './types';
export * from './sandbox-facilitator';
export * from './express';

