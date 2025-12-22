/**
 * @payos/x402-client-sdk
 * 
 * Client SDK for consuming x402-enabled APIs with automatic payment handling.
 * 
 * Usage:
 * ```typescript
 * const client = new X402Client({
 *   apiUrl: 'https://api.payos.com',
 *   walletId: 'your-wallet-id',
 *   auth: 'your-api-key'
 * });
 * 
 * const response = await client.fetch('https://api.example.com/protected-endpoint', {
 *   method: 'GET',
 *   autoRetry: true // Automatically handle 402 and retry with payment
 * });
 * ```
 * 
 * Spec: https://www.x402.org/x402-whitepaper.pdf
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export interface X402ClientConfig {
  /** PayOS API URL (e.g., https://api.payos.com) */
  apiUrl: string;
  
  /** Wallet ID to use for payments */
  walletId: string;
  
  /** Authentication token (JWT or API key) */
  auth: string;
  
  /** Optional: Custom fetch implementation */
  fetcher?: typeof fetch;
  
  /** Optional: Enable debug logging */
  debug?: boolean;
}

export interface X402FetchOptions extends RequestInit {
  /** Automatically retry request after payment (default: true) */
  autoRetry?: boolean;
  
  /** Maximum number of payment retries (default: 1) */
  maxRetries?: number;
  
  /** Callback for payment confirmations */
  onPayment?: (payment: X402Payment) => void | Promise<void>;
  
  /** Callback for errors */
  onError?: (error: X402Error) => void | Promise<void>;
}

export interface X402PaymentDetails {
  /** Endpoint ID from x402 response */
  endpointId: string;
  
  /** Amount to pay */
  amount: number;
  
  /** Currency (USDC, EURC) */
  currency: string;
  
  /** Payment address (from 402 response) */
  paymentAddress?: string;
  
  /** Asset address (ERC20 contract) */
  assetAddress?: string;
  
  /** Network (base-mainnet, etc.) */
  network?: string;
}

export interface X402Payment {
  /** Unique request ID (idempotency key) */
  requestId: string;
  
  /** Transfer ID from PayOS */
  transferId: string;
  
  /** Amount paid */
  amount: number;
  
  /** Currency */
  currency: string;
  
  /** Endpoint ID */
  endpointId: string;
  
  /** Wallet ID used */
  walletId: string;
  
  /** Payment proof */
  proof: {
    paymentId: string;
    signature: string;
  };
  
  /** New wallet balance after payment */
  newWalletBalance: number;
  
  /** Timestamp */
  timestamp: string;
}

export interface X402Error {
  code: string;
  message: string;
  details?: any;
}

// ============================================
// X402 Client
// ============================================

export class X402Client {
  private config: Required<X402ClientConfig>;
  
  constructor(config: X402ClientConfig) {
    this.config = {
      ...config,
      fetcher: config.fetcher || fetch,
      debug: config.debug || false
    };
  }
  
  /**
   * Fetch a URL with automatic x402 payment handling
   */
  async fetch(
    url: string,
    options: X402FetchOptions = {}
  ): Promise<Response> {
    const {
      autoRetry = true,
      maxRetries = 1,
      onPayment,
      onError,
      ...fetchOptions
    } = options;
    
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        this.log(`Fetching: ${url} (attempt ${retries + 1}/${maxRetries + 1})`);
        
        const response = await this.config.fetcher(url, fetchOptions);
        
        // If not 402, return response
        if (response.status !== 402) {
          this.log(`Response: ${response.status}`);
          return response;
        }
        
        // Handle 402 Payment Required
        this.log('402 Payment Required detected');
        
        if (!autoRetry) {
          this.log('Auto-retry disabled, returning 402 response');
          return response;
        }
        
        if (retries >= maxRetries) {
          this.log('Max retries reached, returning 402 response');
          return response;
        }
        
        // Parse 402 response
        const paymentDetails = await this.parse402Response(response);
        
        // Process payment
        this.log('Processing payment...');
        const payment = await this.pay(paymentDetails, url, fetchOptions.method as string || 'GET');
        
        if (onPayment) {
          await onPayment(payment);
        }
        
        this.log('Payment successful, retrying request...');
        
        // Retry original request with proof of payment
        const retryHeaders = new Headers(fetchOptions.headers);
        retryHeaders.set('X-Payment-ID', payment.transferId);
        retryHeaders.set('X-Payment-Proof', payment.proof.signature);
        
        retries++;
        fetchOptions.headers = retryHeaders;
        
      } catch (error) {
        const x402Error: X402Error = {
          code: 'PAYMENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        };
        
        if (onError) {
          await onError(x402Error);
        }
        
        throw error;
      }
    }
    
    throw new Error('Failed to fetch after max retries');
  }
  
  /**
   * Parse 402 response to extract payment details
   * 
   * x402 spec defines these headers:
   * - X-Payment-Required: "true"
   * - X-Payment-Amount: "0.0001"
   * - X-Payment-Currency: "USDC"
   * - X-Payment-Address: "0x..."
   * - X-Endpoint-ID: "uuid"
   */
  private async parse402Response(response: Response): Promise<X402PaymentDetails> {
    const endpointId = response.headers.get('X-Endpoint-ID');
    const amount = parseFloat(response.headers.get('X-Payment-Amount') || '0');
    const currency = response.headers.get('X-Payment-Currency') || 'USDC';
    const paymentAddress = response.headers.get('X-Payment-Address') || undefined;
    const assetAddress = response.headers.get('X-Asset-Address') || undefined;
    const network = response.headers.get('X-Payment-Network') || 'base-mainnet';
    
    if (!endpointId || !amount) {
      throw new Error('Invalid 402 response: missing payment details');
    }
    
    return {
      endpointId,
      amount,
      currency,
      paymentAddress,
      assetAddress,
      network
    };
  }
  
  /**
   * Process payment via PayOS
   */
  private async pay(
    details: X402PaymentDetails,
    path: string,
    method: string
  ): Promise<X402Payment> {
    const requestId = uuidv4();
    const timestamp = Date.now();
    
    const paymentRequest = {
      endpointId: details.endpointId,
      requestId,
      amount: details.amount,
      currency: details.currency,
      walletId: this.config.walletId,
      method,
      path,
      timestamp,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'PayOS SDK',
        sdk: '@payos/x402-client-sdk@0.1.0'
      }
    };
    
    this.log('Payment request:', paymentRequest);
    
    const response = await this.config.fetcher(`${this.config.apiUrl}/v1/x402/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.auth}`
      },
      body: JSON.stringify(paymentRequest)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Payment failed: ${error.error || error.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Payment failed: ${result.error || 'Unknown error'}`);
    }
    
    return result.data;
  }
  
  /**
   * Get pricing quote for an endpoint
   */
  async getQuote(endpointId: string): Promise<{
    endpointId: string;
    name: string;
    path: string;
    method: string;
    basePrice: number;
    currentPrice: number;
    currency: string;
    volumeDiscounts: any[];
    totalCalls: number;
  }> {
    const response = await this.config.fetcher(
      `${this.config.apiUrl}/v1/x402/quote/${endpointId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch quote');
    }
    
    const result = await response.json();
    return result.data;
  }
  
  /**
   * Verify a payment
   */
  async verifyPayment(requestId: string, transferId: string): Promise<boolean> {
    const response = await this.config.fetcher(
      `${this.config.apiUrl}/v1/x402/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.auth}`
        },
        body: JSON.stringify({ requestId, transferId })
      }
    );
    
    const result = await response.json();
    return result.verified === true;
  }
  
  /**
   * Update client configuration
   */
  updateConfig(config: Partial<X402ClientConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[X402Client] ${message}`, data || '');
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a response is a 402 Payment Required
 */
export function is402Response(response: Response): boolean {
  return response.status === 402;
}

/**
 * Extract payment details from 402 response headers
 */
export function extract402Details(response: Response): X402PaymentDetails | null {
  if (!is402Response(response)) {
    return null;
  }
  
  const endpointId = response.headers.get('X-Endpoint-ID');
  const amount = parseFloat(response.headers.get('X-Payment-Amount') || '0');
  const currency = response.headers.get('X-Payment-Currency') || 'USDC';
  
  if (!endpointId || !amount) {
    return null;
  }
  
  return {
    endpointId,
    amount,
    currency,
    paymentAddress: response.headers.get('X-Payment-Address') || undefined,
    assetAddress: response.headers.get('X-Asset-Address') || undefined,
    network: response.headers.get('X-Payment-Network') || 'base-mainnet'
  };
}

// ============================================
// Exports
// ============================================

export default X402Client;

