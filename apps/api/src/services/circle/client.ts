/**
 * Circle API Client
 * Story 40.1, 40.2: Circle Sandbox Integration
 * 
 * Real Circle API client for Programmable Wallets.
 * Supports both sandbox and production environments.
 * 
 * Docs: https://developers.circle.com/w3s/docs
 */

import { randomUUID } from 'crypto';
import {
  CircleClientConfig,
  CircleWallet,
  CircleWalletSet,
  CircleBlockchain,
  WalletBalanceResponse,
  CircleTransaction,
  CreateWalletSetRequest,
  CreateWalletsRequest,
  GetWalletsRequest,
  TransferTokensRequest,
  CircleApiResponse,
  CircleApiError,
  TokenBalance,
} from './types.js';

// ============================================
// Configuration
// ============================================

const CIRCLE_SANDBOX_URL = 'https://api-sandbox.circle.com';
const CIRCLE_PRODUCTION_URL = 'https://api.circle.com';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// ============================================
// Circle API Client
// ============================================

export class CircleClient {
  private apiKey: string;
  private entitySecret?: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: CircleClientConfig) {
    if (!config.apiKey) {
      throw new Error('Circle API key is required');
    }

    this.apiKey = config.apiKey;
    this.entitySecret = config.entitySecret;
    this.baseUrl = config.baseUrl || CIRCLE_SANDBOX_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[Circle] ${method} ${path}`);

    const response = await fetch(url, options);
    const text = await response.text();

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      const error = data as CircleApiError;
      console.error(`[Circle] Error ${response.status}:`, error);
      throw new CircleApiClientError(
        error.message || `Circle API error: ${response.status}`,
        response.status,
        error
      );
    }

    return data as T;
  }

  // ============================================
  // Wallet Set Operations
  // ============================================

  /**
   * Create a new wallet set
   */
  async createWalletSet(name?: string): Promise<CircleWalletSet> {
    const request: CreateWalletSetRequest = {
      idempotencyKey: randomUUID(),
      name: name || 'PayOS Wallets',
      custodyType: 'DEVELOPER',
    };

    const response = await this.request<CircleApiResponse<{ walletSet: CircleWalletSet }>>(
      'POST',
      '/v1/w3s/developer/walletSets',
      request
    );

    console.log(`[Circle] Created wallet set: ${response.data.walletSet.id}`);
    return response.data.walletSet;
  }

  /**
   * Get a wallet set by ID
   */
  async getWalletSet(walletSetId: string): Promise<CircleWalletSet> {
    const response = await this.request<CircleApiResponse<{ walletSet: CircleWalletSet }>>(
      'GET',
      `/v1/w3s/walletSets/${walletSetId}`
    );
    return response.data.walletSet;
  }

  /**
   * List all wallet sets
   */
  async listWalletSets(): Promise<CircleWalletSet[]> {
    const response = await this.request<CircleApiResponse<{ walletSets: CircleWalletSet[] }>>(
      'GET',
      '/v1/w3s/walletSets'
    );
    return response.data.walletSets;
  }

  // ============================================
  // Wallet Operations
  // ============================================

  /**
   * Create wallets in a wallet set
   */
  async createWallets(
    walletSetId: string,
    blockchains: CircleBlockchain[],
    count: number = 1,
    metadata?: { name?: string; refId?: string }
  ): Promise<CircleWallet[]> {
    const request: CreateWalletsRequest = {
      idempotencyKey: randomUUID(),
      walletSetId,
      blockchains,
      count,
      metadata: metadata ? [metadata] : undefined,
    };

    const response = await this.request<CircleApiResponse<{ wallets: CircleWallet[] }>>(
      'POST',
      '/v1/w3s/developer/wallets',
      request
    );

    console.log(`[Circle] Created ${response.data.wallets.length} wallet(s)`);
    return response.data.wallets;
  }

  /**
   * Create a single wallet on a specific blockchain
   */
  async createWallet(
    walletSetId: string,
    blockchain: CircleBlockchain,
    name?: string,
    refId?: string
  ): Promise<CircleWallet> {
    const wallets = await this.createWallets(
      walletSetId,
      [blockchain],
      1,
      { name, refId }
    );
    return wallets[0];
  }

  /**
   * Get a wallet by ID
   */
  async getWallet(walletId: string): Promise<CircleWallet> {
    const response = await this.request<CircleApiResponse<{ wallet: CircleWallet }>>(
      'GET',
      `/v1/w3s/wallets/${walletId}`
    );
    return response.data.wallet;
  }

  /**
   * List wallets with optional filters
   */
  async listWallets(params?: GetWalletsRequest): Promise<CircleWallet[]> {
    const searchParams = new URLSearchParams();
    if (params?.walletSetId) searchParams.set('walletSetId', params.walletSetId);
    if (params?.address) searchParams.set('address', params.address);
    if (params?.blockchain) searchParams.set('blockchain', params.blockchain);
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.pageAfter) searchParams.set('pageAfter', params.pageAfter);
    if (params?.pageBefore) searchParams.set('pageBefore', params.pageBefore);

    const query = searchParams.toString();
    const path = `/v1/w3s/wallets${query ? `?${query}` : ''}`;

    const response = await this.request<CircleApiResponse<{ wallets: CircleWallet[] }>>(
      'GET',
      path
    );
    return response.data.wallets;
  }

  /**
   * Update a wallet (name, refId, state)
   */
  async updateWallet(
    walletId: string,
    updates: { name?: string; refId?: string; state?: 'LIVE' | 'FROZEN' }
  ): Promise<CircleWallet> {
    const response = await this.request<CircleApiResponse<{ wallet: CircleWallet }>>(
      'PUT',
      `/v1/w3s/wallets/${walletId}`,
      updates
    );
    return response.data.wallet;
  }

  // ============================================
  // Balance Operations
  // ============================================

  /**
   * Get token balances for a wallet
   */
  async getWalletBalances(walletId: string): Promise<TokenBalance[]> {
    const response = await this.request<WalletBalanceResponse>(
      'GET',
      `/v1/w3s/wallets/${walletId}/balances`
    );
    return response.data.tokenBalances;
  }

  /**
   * Get USDC balance for a wallet (convenience method)
   */
  async getUsdcBalance(walletId: string): Promise<{ amount: string; formatted: number }> {
    const balances = await this.getWalletBalances(walletId);
    const usdcBalance = balances.find(b => b.token.symbol === 'USDC');
    
    if (!usdcBalance) {
      return { amount: '0', formatted: 0 };
    }

    const formatted = parseFloat(usdcBalance.amount) / Math.pow(10, usdcBalance.token.decimals);
    return { amount: usdcBalance.amount, formatted };
  }

  // ============================================
  // Transaction Operations
  // ============================================

  /**
   * Transfer tokens from a wallet
   */
  async transferTokens(
    walletId: string,
    tokenId: string,
    destinationAddress: string,
    amount: string,
    feeLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ): Promise<CircleTransaction> {
    const request: TransferTokensRequest = {
      idempotencyKey: randomUUID(),
      walletId,
      tokenId,
      destinationAddress,
      amounts: [amount],
      feeLevel,
    };

    const response = await this.request<CircleApiResponse<{ transaction: CircleTransaction }>>(
      'POST',
      '/v1/w3s/developer/transactions/transfer',
      request
    );

    console.log(`[Circle] Transfer initiated: ${response.data.transaction.id}`);
    return response.data.transaction;
  }

  /**
   * Get a transaction by ID
   */
  async getTransaction(transactionId: string): Promise<CircleTransaction> {
    const response = await this.request<CircleApiResponse<{ transaction: CircleTransaction }>>(
      'GET',
      `/v1/w3s/transactions/${transactionId}`
    );
    return response.data.transaction;
  }

  /**
   * List transactions for a wallet
   */
  async listTransactions(
    walletId: string,
    pageSize: number = 50
  ): Promise<CircleTransaction[]> {
    const response = await this.request<CircleApiResponse<{ transactions: CircleTransaction[] }>>(
      'GET',
      `/v1/w3s/transactions?walletIds=${walletId}&pageSize=${pageSize}`
    );
    return response.data.transactions;
  }

  // ============================================
  // Configuration / Health
  // ============================================

  /**
   * Get API configuration (validates API key)
   */
  async getConfiguration(): Promise<{ payments: { masterWalletId: string } }> {
    const response = await this.request<CircleApiResponse<{ payments: { masterWalletId: string } }>>(
      'GET',
      '/v1/configuration'
    );
    return response.data;
  }

  /**
   * Health check - validates API key is working
   */
  async healthCheck(): Promise<{ healthy: boolean; masterWalletId?: string; error?: string }> {
    try {
      const config = await this.getConfiguration();
      return {
        healthy: true,
        masterWalletId: config.payments.masterWalletId,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================
// Error Class
// ============================================

export class CircleApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError?: CircleApiError
  ) {
    super(message);
    this.name = 'CircleApiClientError';
  }
}

// ============================================
// Singleton Factory
// ============================================

let defaultClient: CircleClient | null = null;

/**
 * Get the default Circle client (uses environment variables)
 */
export function getCircleClient(): CircleClient {
  if (!defaultClient) {
    const apiKey = process.env.CIRCLE_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'CIRCLE_API_KEY environment variable is required. ' +
        'Get your API key from https://console.circle.com/'
      );
    }

    // Determine if we're in sandbox mode
    const isSandbox = apiKey.startsWith('SAND') || apiKey.startsWith('TEST');
    
    defaultClient = new CircleClient({
      apiKey,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      baseUrl: isSandbox ? CIRCLE_SANDBOX_URL : CIRCLE_PRODUCTION_URL,
    });
  }

  return defaultClient;
}

/**
 * Create a Circle client with custom configuration
 */
export function createCircleClient(config: CircleClientConfig): CircleClient {
  return new CircleClient(config);
}

// Re-export types
export * from './types.js';



