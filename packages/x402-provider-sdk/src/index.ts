/**
 * @payos/x402-provider-sdk
 * 
 * Provider SDK for monetizing APIs with x402 - HTTP 402 Payment Required.
 * Framework-agnostic middleware for Express, Hono, Fastify, and more.
 * 
 * Usage:
 * ```typescript
 * import { X402Provider, createX402Middleware } from '@payos/x402-provider-sdk';
 * 
 * const provider = new X402Provider({
 *   apiUrl: 'https://api.payos.com',
 *   auth: 'your-api-key',
 *   accountId: 'your-account-id'
 * });
 * 
 * // Use as middleware
 * app.use('/protected', provider.middleware());
 * ```
 * 
 * Spec: https://www.x402.org/x402-whitepaper.pdf
 */

// ============================================
// Types
// ============================================

export interface X402ProviderConfig {
  /** PayOS API URL (e.g., https://api.payos.com) */
  apiUrl: string;
  
  /** Authentication token (JWT or API key) */
  auth: string;
  
  /** Provider account ID */
  accountId: string;
  
  /** Optional: Custom fetch implementation */
  fetcher?: typeof fetch;
  
  /** Optional: Enable debug logging */
  debug?: boolean;
}

export interface X402EndpointConfig {
  /** Endpoint name (e.g., "Compliance Check API") */
  name: string;
  
  /** Base price per call */
  basePrice: number;
  
  /** Currency (USDC or EURC) */
  currency?: 'USDC' | 'EURC';
  
  /** Optional: Description */
  description?: string;
  
  /** Optional: Volume discounts */
  volumeDiscounts?: Array<{
    threshold: number;
    priceMultiplier: number;
  }>;
  
  /** Optional: Webhook URL for payment notifications */
  webhookUrl?: string;
  
  /** Optional: Network (default: base-mainnet) */
  network?: string;
}

export interface X402MiddlewareOptions {
  /** Skip payment check (for testing) */
  skipPaymentCheck?: boolean;
  
  /** Custom payment verifier */
  verifyPayment?: (request: any) => Promise<boolean>;
  
  /** Custom 402 response handler */
  on402?: (endpoint: X402Endpoint) => any;
  
  /** Callback for successful payment verification */
  onPaymentVerified?: (payment: X402Payment) => void | Promise<void>;
}

export interface X402Endpoint {
  id: string;
  tenantId: string;
  accountId: string;
  name: string;
  path: string;
  method: string;
  description?: string;
  basePrice: number;
  currency: string;
  volumeDiscounts?: any[];
  paymentAddress: string;
  assetAddress?: string;
  network: string;
  totalCalls: number;
  totalRevenue: number;
  status: string;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface X402Payment {
  verified: boolean;
  transferId: string;
  requestId: string;
  amount: number;
  currency: string;
  from: string;
  to: string;
  endpointId: string;
  timestamp: string;
  status: string;
}

// ============================================
// X402 Provider
// ============================================

export class X402Provider {
  private config: Required<X402ProviderConfig>;
  private registeredEndpoints: Map<string, X402Endpoint> = new Map();
  
  constructor(config: X402ProviderConfig) {
    this.config = {
      ...config,
      fetcher: config.fetcher || fetch,
      debug: config.debug || false
    };
  }
  
  /**
   * Register an endpoint with PayOS
   */
  async registerEndpoint(
    path: string,
    method: string,
    config: X402EndpointConfig
  ): Promise<X402Endpoint> {
    this.log(`Registering endpoint: ${method} ${path}`);
    
    const response = await this.config.fetcher(
      `${this.config.apiUrl}/v1/x402/endpoints`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.auth}`
        },
        body: JSON.stringify({
          accountId: this.config.accountId,
          name: config.name,
          path,
          method: method.toUpperCase(),
          description: config.description,
          basePrice: config.basePrice,
          currency: config.currency || 'USDC',
          volumeDiscounts: config.volumeDiscounts,
          webhookUrl: config.webhookUrl,
          network: config.network || 'base-mainnet'
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to register endpoint: ${error.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    const endpoint = result.data;
    
    // Cache endpoint
    const key = `${method.toUpperCase()}:${path}`;
    this.registeredEndpoints.set(key, endpoint);
    
    this.log(`Endpoint registered successfully: ${endpoint.id}`);
    return endpoint;
  }
  
  /**
   * Get registered endpoint
   */
  async getEndpoint(path: string, method: string): Promise<X402Endpoint | null> {
    const key = `${method.toUpperCase()}:${path}`;
    
    // Check cache first
    if (this.registeredEndpoints.has(key)) {
      return this.registeredEndpoints.get(key)!;
    }
    
    // Fetch from API
    this.log(`Fetching endpoint from API: ${key}`);
    
    const response = await this.config.fetcher(
      `${this.config.apiUrl}/v1/x402/endpoints`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.auth}`
        }
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    const endpoints = result.data || [];
    
    // Find matching endpoint
    const endpoint = endpoints.find((ep: X402Endpoint) =>
      ep.path === path && ep.method === method.toUpperCase()
    );
    
    if (endpoint) {
      this.registeredEndpoints.set(key, endpoint);
      return endpoint;
    }
    
    return null;
  }
  
  /**
   * Verify payment
   */
  async verifyPayment(requestId: string, transferId: string): Promise<X402Payment | null> {
    this.log(`Verifying payment: ${transferId}`);
    
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
    
    if (!response.ok) {
      this.log('Payment verification failed');
      return null;
    }
    
    const result = await response.json();
    
    if (!result.verified) {
      this.log('Payment not verified');
      return null;
    }
    
    this.log('Payment verified successfully');
    return result.data;
  }
  
  /**
   * Create middleware for your framework
   * 
   * This returns a function that can be used with Express, Hono, Fastify, etc.
   */
  middleware(options: X402MiddlewareOptions = {}) {
    return async (req: any, res: any, next?: Function) => {
      try {
        const path = req.path || req.url;
        const method = req.method;
        
        this.log(`Middleware: ${method} ${path}`);
        
        // Skip payment check if option set (for testing)
        if (options.skipPaymentCheck) {
          this.log('Skipping payment check');
          return next ? next() : undefined;
        }
        
        // Get endpoint
        const endpoint = await this.getEndpoint(path, method);
        
        if (!endpoint) {
          this.log('No x402 endpoint registered for this path');
          return next ? next() : undefined;
        }
        
        // Check for payment proof in headers
        const paymentId = req.headers?.['x-payment-id'] || req.header?.('X-Payment-ID');
        const paymentProof = req.headers?.['x-payment-proof'] || req.header?.('X-Payment-Proof');
        
        if (!paymentId || !paymentProof) {
          this.log('No payment proof found, returning 402');
          return this.return402(res, endpoint, options);
        }
        
        // Verify payment
        let payment: X402Payment | null = null;
        
        if (options.verifyPayment) {
          // Custom verifier
          const verified = await options.verifyPayment(req);
          if (!verified) {
            this.log('Custom payment verification failed');
            return this.return402(res, endpoint, options);
          }
        } else {
          // Default verifier
          const requestId = paymentProof.split(':')[2]; // Extract from proof signature
          payment = await this.verifyPayment(requestId, paymentId);
          
          if (!payment) {
            this.log('Payment verification failed');
            return this.return402(res, endpoint, options);
          }
        }
        
        // Payment verified - allow request to proceed
        this.log('Payment verified, proceeding with request');
        
        if (options.onPaymentVerified && payment) {
          await options.onPaymentVerified(payment);
        }
        
        // Attach payment info to request
        req.x402Payment = payment;
        
        return next ? next() : undefined;
        
      } catch (error) {
        console.error('[X402Provider] Middleware error:', error);
        
        // On error, allow request through (fail open)
        if (next) {
          return next();
        }
      }
    };
  }
  
  /**
   * Return 402 Payment Required response
   */
  private return402(res: any, endpoint: X402Endpoint, options: X402MiddlewareOptions) {
    // Custom handler
    if (options.on402) {
      return options.on402(endpoint);
    }
    
    // Set x402 headers
    const headers = {
      'X-Payment-Required': 'true',
      'X-Payment-Amount': endpoint.basePrice.toString(),
      'X-Payment-Currency': endpoint.currency,
      'X-Payment-Address': endpoint.paymentAddress,
      'X-Endpoint-ID': endpoint.id,
      'X-Payment-Network': endpoint.network
    };
    
    if (endpoint.assetAddress) {
      headers['X-Asset-Address'] = endpoint.assetAddress;
    }
    
    // Handle different response types
    if (typeof res.status === 'function') {
      // Express-style
      res.status(402);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.json({
        error: 'Payment Required',
        message: `This endpoint requires payment of ${endpoint.basePrice} ${endpoint.currency}`,
        paymentDetails: {
          amount: endpoint.basePrice,
          currency: endpoint.currency,
          paymentAddress: endpoint.paymentAddress,
          endpointId: endpoint.id,
          network: endpoint.network
        }
      });
    } else if (typeof res.json === 'function') {
      // Hono-style
      Object.entries(headers).forEach(([key, value]) => {
        res.header(key, value);
      });
      return res.json({
        error: 'Payment Required',
        message: `This endpoint requires payment of ${endpoint.basePrice} ${endpoint.currency}`,
        paymentDetails: {
          amount: endpoint.basePrice,
          currency: endpoint.currency,
          paymentAddress: endpoint.paymentAddress,
          endpointId: endpoint.id,
          network: endpoint.network
        }
      }, 402);
    }
    
    // Generic response
    return {
      status: 402,
      headers,
      body: {
        error: 'Payment Required',
        message: `This endpoint requires payment of ${endpoint.basePrice} ${endpoint.currency}`,
        paymentDetails: {
          amount: endpoint.basePrice,
          currency: endpoint.currency,
          paymentAddress: endpoint.paymentAddress,
          endpointId: endpoint.id,
          network: endpoint.network
        }
      }
    };
  }
  
  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<X402ProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Clear endpoint cache
   */
  clearCache(): void {
    this.registeredEndpoints.clear();
  }
  
  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[X402Provider] ${message}`, data || '');
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create x402 middleware (convenience function)
 */
export function createX402Middleware(
  config: X402ProviderConfig,
  options?: X402MiddlewareOptions
) {
  const provider = new X402Provider(config);
  return provider.middleware(options);
}

/**
 * Create 402 response (for manual handling)
 */
export function create402Response(endpoint: X402Endpoint) {
  return {
    status: 402,
    headers: {
      'X-Payment-Required': 'true',
      'X-Payment-Amount': endpoint.basePrice.toString(),
      'X-Payment-Currency': endpoint.currency,
      'X-Payment-Address': endpoint.paymentAddress,
      'X-Endpoint-ID': endpoint.id,
      'X-Payment-Network': endpoint.network,
      ...(endpoint.assetAddress && { 'X-Asset-Address': endpoint.assetAddress })
    },
    body: {
      error: 'Payment Required',
      message: `This endpoint requires payment of ${endpoint.basePrice} ${endpoint.currency}`,
      paymentDetails: {
        amount: endpoint.basePrice,
        currency: endpoint.currency,
        paymentAddress: endpoint.paymentAddress,
        endpointId: endpoint.id,
        network: endpoint.network
      }
    }
  };
}

// ============================================
// Exports
// ============================================

export default X402Provider;

