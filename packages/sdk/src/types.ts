/**
 * Core type definitions for the Sly SDK
 */

/**
 * SDK environment configuration
 */
export type SlyEnvironment = 'sandbox' | 'testnet' | 'production';

// Backward compatibility alias
export type PayOSEnvironment = SlyEnvironment;

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  apiUrl: string;
  facilitatorUrl?: string;
}

/**
 * Sly SDK configuration options
 */
export interface SlyConfig {
  /**
   * Sly API key
   */
  apiKey: string;

  /**
   * Environment to connect to
   * - sandbox: Local development with mock blockchain
   * - testnet: Base Sepolia testnet with x402.org
   * - production: Base mainnet with Coinbase CDP
   */
  environment: SlyEnvironment;

  /**
   * EVM private key (required for testnet/production x402)
   * Not needed for sandbox mode
   */
  evmPrivateKey?: string;

  /**
   * Custom API URL (overrides environment default)
   */
  apiUrl?: string;

  /**
   * Custom facilitator URL for x402 (overrides environment default)
   */
  facilitatorUrl?: string;
}

// Backward compatibility alias
export type PayOSConfig = SlyConfig;

/**
 * Payment protocol types supported by PayOS
 */
export type PaymentProtocol = 'x402' | 'ap2' | 'acp' | 'direct';

/**
 * Settlement rail types
 */
export type SettlementRail = 'pix' | 'spei' | 'wire' | 'usdc';

/**
 * Supported currencies
 */
export type Currency = 'USD' | 'BRL' | 'MXN' | 'USDC';

/**
 * Settlement quote request
 */
export interface SettlementQuoteRequest {
  fromCurrency: Currency;
  toCurrency: Currency;
  amount: string;
  rail?: SettlementRail;
}

/**
 * Settlement quote response
 */
export interface SettlementQuote {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  toAmount: string;
  fxRate: string;
  fees: {
    platformFee: string;
    fxFee: string;
    railFee: string;
    total: string;
  };
  rail: SettlementRail;
  expiresAt: string;
  estimatedSettlementSeconds: number;
}

/**
 * Settlement creation request
 */
export interface CreateSettlementRequest {
  quoteId: string;
  destinationAccountId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Settlement status
 */
export type SettlementStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Settlement response
 */
export interface Settlement {
  id: string;
  quoteId: string;
  status: SettlementStatus;
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  rail: SettlementRail;
  destinationAccountId: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Compliance check request
 */
export interface ComplianceCheckRequest {
  recipientAccountId: string;
  amount: string;
  currency: Currency;
}

/**
 * Compliance check response
 */
export interface ComplianceCheckResponse {
  approved: boolean;
  flags: string[];
  requiredActions: string[];
  message?: string;
}

/**
 * API capability definition
 */
export interface Capability {
  name: string;
  description: string;
  category: string;
  endpoint: string;
  parameters: Record<string, unknown>;
  returns: Record<string, unknown>;
  errors: string[];
  supportsSimulation: boolean;
  supportsIdempotency: boolean;
}

/**
 * Capabilities response
 */
export interface CapabilitiesResponse {
  apiVersion: string;
  capabilities: Capability[];
  limits: {
    rateLimit: string;
    maxTransfer: string;
  };
  supportedCurrencies: Currency[];
  supportedRails: SettlementRail[];
  webhookEvents: string[];
}

