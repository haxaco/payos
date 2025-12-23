/**
 * @payos/x402-provider-sdk
 * 
 * Provider SDK for monetizing APIs with x402 - HTTP 402 Payment Required.
 * Framework-agnostic middleware for Express, Hono, Fastify, and more.
 * 
 * Simple Usage:
 * ```typescript
 * import { X402Provider } from '@payos/x402-provider-sdk';
 * 
 * const x402 = new X402Provider({
 *   apiKey: 'pk_live_xxxxx'  // That's it!
 * });
 * 
 * // Register endpoint
 * await x402.register('/api/data', { name: 'Data API', price: 0.001 });
 * 
 * // Protect route
 * app.get('/api/data', x402.protect(), (req, res) => {
 *   res.json({ data: 'premium content' });
 * });
 * ```
 * 
 * Spec: https://www.x402.org/x402-whitepaper.pdf
 */

// ============================================
// Types
// ============================================

export interface X402ProviderConfig {
  /** API key for authentication (required) */
  apiKey: string;
  
  /** Optional: PayOS API URL (default: https://api.payos.ai) */
  apiUrl?: string;
  
  /** Optional: Account ID (default: derived from API key) */
  accountId?: string;
  
  /** Optional: Custom fetch implementation */
  fetcher?: typeof fetch;
  
  /** Optional: Enable debug logging */
  debug?: boolean;
}

export interface X402EndpointConfig {
  /** Endpoint name (required) */
  name: string;
  
  /** Price per call (required) */
  price: number;
  
  /** Optional: Currency (default: USDC) */
  currency?: 'USDC' | 'EURC';
  
  /** Optional: Description */
  description?: string;
  
  /** Optional: Volume discounts */
  volumeDiscounts?: Array<{
    threshold: number;
    discount: number;  // Percentage off (0.1 = 10% off)
  }>;
  
  /** Optional: Webhook URL for payment notifications */
  webhookUrl?: string;
  
  /** Optional: Network (default: base-mainnet) */
  network?: string;
}

export interface X402ProtectOptions {
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

export interface X402Analytics {
  totalRevenue: number;
  netRevenue: number;
  totalCalls: number;
  uniquePayers: number;
  averageTransaction: number;
  topEndpoints: Array<{
    id: string;
    name: string;
    revenue: number;
    calls: number;
  }>;
}

// ============================================
// X402 Provider
// ============================================

export class X402Provider {
  private config: {
    apiKey: string;
    apiUrl: string;
    accountId?: string;
    fetcher: typeof fetch;
    debug: boolean;
  };
  
  private resolvedAccountId?: string;
  private registeredEndpoints: Map<string, X402Endpoint> = new Map();
  
  constructor(config: X402ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('X402Provider requires an apiKey');
    }
    
    this.config = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || 'http://localhost:3456',
      accountId: config.accountId,
      fetcher: config.fetcher || fetch,
      debug: config.debug || false
    };
  }
  
  /**
   * Resolve account ID from API key authentication
   */
  private async resolveAccountId(): Promise<string> {
    if (this.config.accountId) {
      return this.config.accountId;
    }
    
    if (this.resolvedAccountId) {
      return this.resolvedAccountId;
    }
    
    this.log('Resolving account from API key...');
    
    const response = await this.config.fetcher(`${this.config.apiUrl}/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to authenticate. Check your API key.');
    }
    
    const result = await response.json() as { accountId?: string };
    
    if (!result.accountId) {
      throw new Error('No account associated with this API key. Please provide accountId explicitly.');
    }
    
    this.resolvedAccountId = result.accountId;
    this.log(`Account resolved: ${this.resolvedAccountId}`);
    
    return this.resolvedAccountId;
  }
  
  /**
   * Register an endpoint with PayOS
   * 
   * @param path - The API path (e.g., '/api/weather/premium')
   * @param config - Endpoint configuration
   * @param method - HTTP method (default: GET)
   */
  async register(
    path: string,
    config: X402EndpointConfig,
    method: string = 'GET'
  ): Promise<X402Endpoint> {
    const accountId = await this.resolveAccountId();
    
    this.log(`Registering endpoint: ${method} ${path}`);
    
    // Convert discount format
    const volumeDiscounts = config.volumeDiscounts?.map(d => ({
      threshold: d.threshold,
      priceMultiplier: 1 - d.discount
    }));
    
    const response = await this.config.fetcher(
      `${this.config.apiUrl}/v1/x402/endpoints`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          accountId,
          name: config.name,
          path,
          method: method.toUpperCase(),
          description: config.description,
          basePrice: config.price,
          currency: config.currency || 'USDC',
          volumeDiscounts,
          webhookUrl: config.webhookUrl,
          network: config.network || 'base-mainnet'
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(`Failed to register endpoint: ${error.error || 'Unknown error'}`);
    }
    
    const result = await response.json() as { data: X402Endpoint };
    const endpoint = result.data;
    
    // Cache endpoint
    const key = `${method.toUpperCase()}:${path}`;
    this.registeredEndpoints.set(key, endpoint);
    
    this.log(`Endpoint registered: ${endpoint.id}`);
    return endpoint;
  }
  
  /**
   * Get endpoint by path and method
   */
  async getEndpoint(path: string, method: string = 'GET'): Promise<X402Endpoint | null> {
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
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json() as { data?: X402Endpoint[] };
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
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ requestId, transferId })
      }
    );
    
    if (!response.ok) {
      this.log('Payment verification failed');
      return null;
    }
    
    const result = await response.json() as { verified?: boolean; data?: X402Payment };
    
    if (!result.verified) {
      this.log('Payment not verified');
      return null;
    }
    
    this.log('Payment verified successfully');
    return result.data || null;
  }
  
  /**
   * Get analytics for your endpoints
   */
  async getAnalytics(period: string = '30d'): Promise<X402Analytics> {
    const response = await this.config.fetcher(
      `${this.config.apiUrl}/v1/x402/analytics/summary?period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    
    const result = await response.json() as { data: X402Analytics };
    return result.data;
  }
  
  /**
   * Express/Connect-style middleware
   * 
   * Usage:
   * ```typescript
   * app.get('/api/data', x402.protect(), (req, res) => { ... });
   * ```
   */
  protect(options: X402ProtectOptions = {}) {
    return async (req: any, res: any, next?: Function) => {
      try {
        const path = req.path || req.url?.split('?')[0];
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
          // Default verifier - extract request ID from proof
          const requestId = paymentProof.split(':')[2] || paymentProof;
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
        
        // On error, return 500 (don't fail open for security)
        if (res.status) {
          return res.status(500).json({ error: 'Payment verification error' });
        }
        
        throw error;
      }
    };
  }
  
  /**
   * Hono-style middleware
   * 
   * Usage:
   * ```typescript
   * app.get('/api/data', x402.honoMiddleware(), (c) => { ... });
   * ```
   */
  honoMiddleware(options: X402ProtectOptions = {}) {
    return async (c: any, next: Function) => {
      const path = c.req.path;
      const method = c.req.method;
      
      this.log(`Hono Middleware: ${method} ${path}`);
      
      if (options.skipPaymentCheck) {
        return next();
      }
      
      const endpoint = await this.getEndpoint(path, method);
      
      if (!endpoint) {
        return next();
      }
      
      const paymentId = c.req.header('X-Payment-ID');
      const paymentProof = c.req.header('X-Payment-Proof');
      
      if (!paymentId || !paymentProof) {
        return this.return402Hono(c, endpoint);
      }
      
      const requestId = paymentProof.split(':')[2] || paymentProof;
      const payment = await this.verifyPayment(requestId, paymentId);
      
      if (!payment) {
        return this.return402Hono(c, endpoint);
      }
      
      if (options.onPaymentVerified) {
        await options.onPaymentVerified(payment);
      }
      
      c.set('x402Payment', payment);
      return next();
    };
  }
  
  /**
   * Return 402 Payment Required response (Express-style)
   */
  private return402(res: any, endpoint: X402Endpoint, options: X402ProtectOptions) {
    if (options.on402) {
      return options.on402(endpoint);
    }
    
    const headers: Record<string, string> = {
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
    
    if (typeof res.status === 'function') {
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
    }
    
    return {
      status: 402,
      headers,
      body: {
        error: 'Payment Required',
        paymentDetails: {
          amount: endpoint.basePrice,
          currency: endpoint.currency,
          endpointId: endpoint.id
        }
      }
    };
  }
  
  /**
   * Return 402 Payment Required response (Hono-style)
   */
  private return402Hono(c: any, endpoint: X402Endpoint) {
    c.header('X-Payment-Required', 'true');
    c.header('X-Payment-Amount', endpoint.basePrice.toString());
    c.header('X-Payment-Currency', endpoint.currency);
    c.header('X-Payment-Address', endpoint.paymentAddress);
    c.header('X-Endpoint-ID', endpoint.id);
    c.header('X-Payment-Network', endpoint.network);
    
    if (endpoint.assetAddress) {
      c.header('X-Asset-Address', endpoint.assetAddress);
    }
    
    return c.json({
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
  
  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<X402ProviderConfig>): void {
    Object.assign(this.config, config);
    
    if (config.apiKey) {
      this.resolvedAccountId = undefined;
    }
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
