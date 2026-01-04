/**
 * Types for x402 protocol support
 */

import type { PayOSEnvironment } from '../../types';

/**
 * x402 Client configuration
 */
export interface X402ClientConfig {
  /**
   * PayOS API key
   */
  apiKey: string;

  /**
   * Environment (sandbox, testnet, production)
   */
  environment: PayOSEnvironment;

  /**
   * EVM private key (required for testnet/production)
   */
  evmPrivateKey?: string;

  /**
   * Custom facilitator URL (overrides environment default)
   */
  facilitatorUrl?: string;

  /**
   * Maximum auto-pay amount per request (default: $1)
   */
  maxAutoPayAmount?: string;

  /**
   * Maximum daily spend limit (default: $100)
   */
  maxDailySpend?: string;

  /**
   * Callback fired before payment is sent
   */
  onPayment?: (payment: X402PaymentInfo) => void | Promise<void>;

  /**
   * Callback fired after settlement is confirmed
   */
  onSettlement?: (settlement: X402SettlementInfo) => void | Promise<void>;

  /**
   * Trigger LATAM rail settlement after x402 payment
   */
  settleToRail?: 'pix' | 'spei' | 'none';
}

/**
 * x402 payment information
 */
export interface X402PaymentInfo {
  amount: string;
  currency: string;
  from: string;
  to: string;
  scheme: string;
  network: string;
  timestamp: string;
}

/**
 * x402 settlement information
 */
export interface X402SettlementInfo {
  transactionHash: string;
  amount: string;
  currency: string;
  timestamp: string;
  railSettlementId?: string;
}

/**
 * Client status
 */
export interface X402ClientStatus {
  environment: PayOSEnvironment;
  dailySpent: string;
  dailyLimit: string;
  walletAddress?: string;
}

/**
 * 402 response from server
 */
export interface X402Response {
  statusCode: 402;
  accepts: Array<{
    scheme: string;
    network: string;
    token: string;
    amount: string;
    facilitator: string;
    [key: string]: unknown;
  }>;
}

