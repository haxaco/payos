/**
 * Types for the Sandbox Facilitator
 */

/**
 * x402 payment payload structure
 */
export interface X402Payment {
  scheme: string;
  network: string;
  amount: string;
  token: string;
  from: string;
  to: string;
  nonce?: string;
  deadline?: number;
  signature?: string;
  [key: string]: unknown;
}

/**
 * Facilitator verification request
 */
export interface VerifyRequest {
  payment: X402Payment;
}

/**
 * Facilitator verification response
 */
export interface VerifyResponse {
  valid: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * Facilitator settlement request
 */
export interface SettleRequest {
  payment: X402Payment;
}

/**
 * Facilitator settlement response
 */
export interface SettleResponse {
  transactionHash: string;
  settled: boolean;
  timestamp: string;
}

/**
 * Supported schemes response
 */
export interface SupportedResponse {
  schemes: Array<{
    scheme: string;
    networks: string[];
  }>;
}

/**
 * Sandbox facilitator configuration
 */
export interface SandboxFacilitatorConfig {
  /**
   * PayOS API URL for recording payments
   */
  apiUrl: string;

  /**
   * PayOS API key for authentication
   */
  apiKey: string;

  /**
   * Simulate settlement delay in milliseconds (default: 0)
   */
  settlementDelayMs?: number;

  /**
   * Percentage of payments to randomly fail (0-100, default: 0)
   */
  failureRate?: number;

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;

  /**
   * Supported schemes (default: exact-evm)
   */
  supportedSchemes?: Array<{
    scheme: string;
    networks: string[];
  }>;
}

