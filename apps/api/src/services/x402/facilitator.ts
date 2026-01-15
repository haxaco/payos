/**
 * x402 Facilitator Service
 * Story 40.8: x402.org Facilitator Integration
 * 
 * Provides a unified interface to:
 * - x402.org public testnet facilitator (sandbox mode)
 * - Coinbase production facilitator (production mode)
 * - Local mock facilitator (mock mode)
 * 
 * Spec: https://www.x402.org/
 */

import { getEnvironment, getServiceConfig, SERVICE_URLS } from '../../config/environment.js';
import { getChainConfig, getCurrentChain } from '../../config/blockchain.js';

// ============================================
// Types
// ============================================

export interface X402PaymentPayload {
  scheme: 'exact-evm';
  network: string;          // e.g., "eip155:84532" for Base Sepolia
  amount: string;           // Amount in smallest unit (e.g., "1000000" for 1 USDC)
  token: string;            // Token contract address
  from: string;             // Payer address
  to: string;               // Payee address
  signature?: string;       // Payment authorization signature
  deadline?: number;        // Payment expiration timestamp
  nonce?: string;           // Unique payment nonce
}

export interface VerifyResponse {
  valid: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface SettleResponse {
  transactionHash: string;
  settled: boolean;
  timestamp: string;
  blockNumber?: number;
  gasUsed?: string;
}

export interface SupportedScheme {
  scheme: string;
  networks: string[];
}

export interface SupportedResponse {
  schemes: SupportedScheme[];
}

export interface FacilitatorConfig {
  url: string;
  name: string;
  environment: string;
}

// ============================================
// Facilitator URLs
// ============================================

const FACILITATOR_URLS = {
  mock: 'http://localhost:4000/v1/x402/facilitator',
  sandbox: 'https://x402.org/facilitator',
  production: 'https://facilitator.coinbase.com',
};

// ============================================
// x402 Facilitator Client
// ============================================

export class X402FacilitatorClient {
  private baseUrl: string;
  private timeout: number;
  private environment: string;

  constructor(config?: { baseUrl?: string; timeout?: number }) {
    const env = getEnvironment();
    this.environment = env;
    
    // Use config URL, env var, or default based on environment
    this.baseUrl = config?.baseUrl 
      || process.env.X402_FACILITATOR_URL 
      || FACILITATOR_URLS[env];
    
    this.timeout = config?.timeout || 30000;
  }

  // ============================================
  // HTTP Client
  // ============================================

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[x402] ${method} ${url}`);

    try {
      const response = await fetch(url, options);
      const text = await response.text();

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        console.error(`[x402] Error ${response.status}:`, data);
        throw new X402FacilitatorError(
          `x402 Facilitator error: ${response.status}`,
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof X402FacilitatorError) {
        throw error;
      }
      
      // Network error - maybe facilitator is down
      console.warn(`[x402] Facilitator unavailable: ${error}`);
      throw new X402FacilitatorError(
        'x402 Facilitator unavailable',
        503,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  // ============================================
  // API Methods
  // ============================================

  /**
   * Verify a payment payload
   * Checks signature, balance, and payment validity
   */
  async verify(payment: X402PaymentPayload): Promise<VerifyResponse> {
    return this.request<VerifyResponse>('POST', '/verify', { payment });
  }

  /**
   * Settle a payment on-chain
   * Executes the transfer and returns transaction hash
   */
  async settle(payment: X402PaymentPayload): Promise<SettleResponse> {
    return this.request<SettleResponse>('POST', '/settle', { payment });
  }

  /**
   * Get supported schemes and networks
   */
  async getSupported(): Promise<SupportedResponse> {
    return this.request<SupportedResponse>('GET', '/supported');
  }

  /**
   * Health check - verify facilitator is reachable
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    url: string;
    environment: string;
    schemes?: SupportedScheme[];
    error?: string;
  }> {
    try {
      const supported = await this.getSupported();
      return {
        healthy: true,
        url: this.baseUrl,
        environment: this.environment,
        schemes: supported.schemes,
      };
    } catch (error) {
      return {
        healthy: false,
        url: this.baseUrl,
        environment: this.environment,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get facilitator configuration
   */
  getConfig(): FacilitatorConfig {
    const env = getEnvironment();
    const names: Record<string, string> = {
      mock: 'PayOS Local Mock',
      sandbox: 'x402.org Testnet',
      production: 'Coinbase Facilitator',
    };
    
    return {
      url: this.baseUrl,
      name: names[env] || 'Unknown',
      environment: env,
    };
  }
}

// ============================================
// Error Class
// ============================================

export class X402FacilitatorError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'X402FacilitatorError';
  }
}

// ============================================
// Factory
// ============================================

let defaultClient: X402FacilitatorClient | null = null;

/**
 * Get the default x402 facilitator client
 */
export function getX402FacilitatorClient(): X402FacilitatorClient {
  if (!defaultClient) {
    defaultClient = new X402FacilitatorClient();
  }
  return defaultClient;
}

/**
 * Create an x402 facilitator client with custom config
 */
export function createX402FacilitatorClient(config?: {
  baseUrl?: string;
  timeout?: number;
}): X402FacilitatorClient {
  return new X402FacilitatorClient(config);
}

/**
 * Reset the default client (for testing)
 */
export function resetX402FacilitatorClient(): void {
  defaultClient = null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the network string for current chain
 * e.g., "eip155:84532" for Base Sepolia
 */
export function getCurrentNetwork(): string {
  const config = getChainConfig();
  return `eip155:${config.chainId}`;
}

/**
 * Create a payment payload for the current network
 */
export function createPaymentPayload(params: {
  amount: string;
  from: string;
  to: string;
  signature?: string;
  deadline?: number;
  nonce?: string;
}): X402PaymentPayload {
  const chainConfig = getChainConfig();
  
  return {
    scheme: 'exact-evm',
    network: `eip155:${chainConfig.chainId}`,
    amount: params.amount,
    token: chainConfig.contracts.usdc,
    from: params.from,
    to: params.to,
    signature: params.signature,
    deadline: params.deadline,
    nonce: params.nonce,
  };
}

/**
 * Convert human-readable USDC amount to base units
 * USDC has 6 decimals
 */
export function toUsdcUnits(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return String(Math.round(value * 1e6));
}

/**
 * Convert USDC base units to human-readable amount
 */
export function fromUsdcUnits(units: string | bigint): string {
  const value = typeof units === 'string' ? BigInt(units) : units;
  return (Number(value) / 1e6).toFixed(6);
}



