/**
 * Mock Rail Adapter - Epic 27, Story 27.3
 * 
 * Base class for sandbox/mock rail implementations.
 * Simulates external rail behavior for testing and development.
 */

import {
  RailAdapter,
  RailId,
  RailTransaction,
  RailBalance,
  SubmitSettlementRequest,
  SubmitSettlementResponse,
  GetTransactionRequest,
  GetTransactionsRequest,
  GetTransactionsResponse,
  SettlementStatus,
} from './types.js';

export interface MockAdapterConfig {
  railId: RailId;
  name: string;
  /** Average processing time in ms (for simulation) */
  avgProcessingTimeMs: number;
  /** Failure rate (0-1) for simulating failures */
  failureRate: number;
  /** Fee percentage */
  feePercentage: number;
  /** Fixed fee amount */
  fixedFee: number;
  /** Supported currencies */
  supportedCurrencies: string[];
  /** Simulate discrepancies for testing reconciliation */
  simulateDiscrepancies: boolean;
  /** Discrepancy rate (0-1) when simulateDiscrepancies is true */
  discrepancyRate: number;
}

// In-memory storage for mock transactions
const mockTransactionStore = new Map<string, RailTransaction>();
const mockBalanceStore = new Map<string, RailBalance>();

export class MockRailAdapter implements RailAdapter {
  readonly railId: RailId;
  readonly name: string;
  readonly isSandbox = true;
  
  private config: MockAdapterConfig;
  
  constructor(config: MockAdapterConfig) {
    this.railId = config.railId;
    this.name = config.name;
    this.config = config;
    
    // Initialize mock balance
    for (const currency of config.supportedCurrencies) {
      const key = `${config.railId}:${currency}`;
      if (!mockBalanceStore.has(key)) {
        mockBalanceStore.set(key, {
          rail: config.railId,
          currency,
          available: 1000000, // $1M mock balance
          pending: 0,
          reserved: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  }
  
  async submitSettlement(request: SubmitSettlementRequest): Promise<SubmitSettlementResponse> {
    // Simulate network delay
    await this.simulateDelay(100, 500);
    
    // Check for simulated failure
    if (Math.random() < this.config.failureRate) {
      return {
        success: false,
        status: 'failed',
        errorCode: 'MOCK_FAILURE',
        errorMessage: 'Simulated failure for testing',
      };
    }
    
    // Generate mock external ID
    const externalId = `${this.railId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate fee
    const fee = (request.amount * this.config.feePercentage / 100) + this.config.fixedFee;
    
    // Determine if we should simulate a discrepancy
    const simulateAmountDiscrepancy = 
      this.config.simulateDiscrepancies && 
      Math.random() < this.config.discrepancyRate;
    
    // Create mock transaction
    const transaction: RailTransaction = {
      externalId,
      transferId: request.transferId,
      rail: this.railId,
      status: 'pending',
      amount: simulateAmountDiscrepancy 
        ? request.amount * (0.99 + Math.random() * 0.02) // ±1% discrepancy
        : request.amount,
      currency: request.currency,
      destinationAmount: request.destinationCurrency 
        ? request.amount * (request.destinationCurrency === 'BRL' ? 5.0 : request.destinationCurrency === 'MXN' ? 17.5 : 1)
        : undefined,
      destinationCurrency: request.destinationCurrency,
      railFee: fee,
      submittedAt: new Date().toISOString(),
      metadata: {
        ...request.metadata,
        sandbox: true,
        simulatedDiscrepancy: simulateAmountDiscrepancy,
      },
    };
    
    mockTransactionStore.set(externalId, transaction);
    
    // Update pending balance
    const balanceKey = `${this.railId}:${request.currency}`;
    const balance = mockBalanceStore.get(balanceKey);
    if (balance) {
      balance.pending += request.amount;
      balance.lastUpdated = new Date().toISOString();
    }
    
    // Schedule async completion
    this.scheduleCompletion(externalId, request.amount, request.currency);
    
    return {
      success: true,
      externalId,
      status: 'pending',
      estimatedCompletionTime: new Date(
        Date.now() + this.config.avgProcessingTimeMs
      ).toISOString(),
    };
  }
  
  async getTransaction(request: GetTransactionRequest): Promise<RailTransaction | null> {
    await this.simulateDelay(50, 150);
    
    if (request.externalId) {
      return mockTransactionStore.get(request.externalId) || null;
    }
    
    if (request.transferId) {
      for (const tx of mockTransactionStore.values()) {
        if (tx.transferId === request.transferId && tx.rail === this.railId) {
          return tx;
        }
      }
    }
    
    return null;
  }
  
  async getTransactions(request: GetTransactionsRequest): Promise<GetTransactionsResponse> {
    await this.simulateDelay(100, 300);
    
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    
    const transactions: RailTransaction[] = [];
    
    for (const tx of mockTransactionStore.values()) {
      if (tx.rail !== this.railId) continue;
      
      const txDate = new Date(tx.submittedAt);
      if (txDate >= startDate && txDate <= endDate) {
        if (!request.status || tx.status === request.status) {
          transactions.push(tx);
        }
      }
    }
    
    // Sort by submittedAt descending
    transactions.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    
    const limit = request.limit || 100;
    const startIndex = request.cursor ? parseInt(request.cursor, 10) : 0;
    const slice = transactions.slice(startIndex, startIndex + limit);
    
    return {
      transactions: slice,
      hasMore: startIndex + limit < transactions.length,
      nextCursor: startIndex + limit < transactions.length 
        ? String(startIndex + limit) 
        : undefined,
    };
  }
  
  async getBalance(currency: string): Promise<RailBalance> {
    await this.simulateDelay(50, 100);
    
    const key = `${this.railId}:${currency}`;
    const balance = mockBalanceStore.get(key);
    
    if (!balance) {
      return {
        rail: this.railId,
        currency,
        available: 0,
        pending: 0,
        reserved: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    return { ...balance };
  }
  
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    await this.simulateDelay(20, 50);
    
    // Occasionally simulate unhealthy state
    if (Math.random() < 0.01) { // 1% chance
      return {
        healthy: false,
        message: 'Simulated maintenance window',
      };
    }
    
    return {
      healthy: true,
      message: `${this.name} sandbox adapter is healthy`,
    };
  }
  
  async cancelSettlement(externalId: string): Promise<{ success: boolean; message?: string }> {
    await this.simulateDelay(100, 200);
    
    const tx = mockTransactionStore.get(externalId);
    if (!tx) {
      return { success: false, message: 'Transaction not found' };
    }
    
    if (tx.status !== 'pending') {
      return { success: false, message: `Cannot cancel transaction in ${tx.status} status` };
    }
    
    tx.status = 'failed';
    tx.errorMessage = 'Cancelled by user';
    
    return { success: true, message: 'Settlement cancelled' };
  }
  
  // ============================================
  // Private Helper Methods
  // ============================================
  
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  private scheduleCompletion(externalId: string, amount: number, currency: string): void {
    // Simulate async settlement completion
    const completionDelay = this.config.avgProcessingTimeMs * (0.5 + Math.random());
    
    setTimeout(() => {
      const tx = mockTransactionStore.get(externalId);
      if (!tx || tx.status !== 'pending') return;
      
      // Small chance of failure after pending
      if (Math.random() < this.config.failureRate * 0.5) {
        tx.status = 'failed';
        tx.errorMessage = 'Settlement failed after processing';
      } else {
        tx.status = 'completed';
        tx.confirmedAt = new Date().toISOString();
        tx.completedAt = new Date().toISOString();
        
        // Update balances
        const balanceKey = `${this.railId}:${currency}`;
        const balance = mockBalanceStore.get(balanceKey);
        if (balance) {
          balance.pending -= amount;
          balance.available -= amount;
          balance.lastUpdated = new Date().toISOString();
        }
      }
    }, completionDelay);
  }
}

// ============================================
// Pre-configured Mock Adapters
// ============================================

export function createCircleMockAdapter(): MockRailAdapter {
  return new MockRailAdapter({
    railId: 'circle_usdc',
    name: 'Circle USDC (Sandbox)',
    avgProcessingTimeMs: 30000, // 30 seconds
    failureRate: 0.02, // 2% failure rate
    feePercentage: 1.0,
    fixedFee: 0.10,
    supportedCurrencies: ['USDC', 'USD'],
    simulateDiscrepancies: true,
    discrepancyRate: 0.05, // 5% discrepancy rate for testing
  });
}

export function createBaseMockAdapter(): MockRailAdapter {
  return new MockRailAdapter({
    railId: 'base_chain',
    name: 'Base L2 (Sandbox)',
    avgProcessingTimeMs: 60000, // 1 minute
    failureRate: 0.01, // 1% failure rate
    feePercentage: 0.5,
    fixedFee: 0.05,
    supportedCurrencies: ['USDC', 'ETH'],
    simulateDiscrepancies: true,
    discrepancyRate: 0.03,
  });
}

export function createPixMockAdapter(): MockRailAdapter {
  return new MockRailAdapter({
    railId: 'pix',
    name: 'Pix (Sandbox)',
    avgProcessingTimeMs: 10000, // 10 seconds (Pix is fast)
    failureRate: 0.03,
    feePercentage: 0.7,
    fixedFee: 0,
    supportedCurrencies: ['BRL'],
    simulateDiscrepancies: true,
    discrepancyRate: 0.02,
  });
}

export function createSpeiMockAdapter(): MockRailAdapter {
  return new MockRailAdapter({
    railId: 'spei',
    name: 'SPEI (Sandbox)',
    avgProcessingTimeMs: 300000, // 5 minutes
    failureRate: 0.04,
    feePercentage: 0.8,
    fixedFee: 1.50,
    supportedCurrencies: ['MXN'],
    simulateDiscrepancies: true,
    discrepancyRate: 0.04,
  });
}

export function createWireMockAdapter(): MockRailAdapter {
  return new MockRailAdapter({
    railId: 'wire',
    name: 'Wire Transfer (Sandbox)',
    avgProcessingTimeMs: 86400000, // 1 day
    failureRate: 0.05,
    feePercentage: 1.5,
    fixedFee: 25,
    supportedCurrencies: ['USD', 'EUR', 'BRL', 'MXN'],
    simulateDiscrepancies: true,
    discrepancyRate: 0.08,
  });
}

// ============================================
// Internal Rail Adapter
// ============================================

export function createInternalMockAdapter(): MockRailAdapter {
  return new MockRailAdapter({
    railId: 'internal',
    name: 'Internal Ledger (Sandbox)',
    avgProcessingTimeMs: 100, // Nearly instant
    failureRate: 0.001, // 0.1% failure rate
    feePercentage: 0,
    fixedFee: 0,
    supportedCurrencies: ['USD', 'USDC', 'BRL', 'MXN', 'EUR'],
    simulateDiscrepancies: false,
    discrepancyRate: 0,
  });
}

// ============================================
// Adapter Registry
// ============================================

const adapterRegistry = new Map<string, RailAdapter>();

/**
 * Normalize rail ID to canonical form
 * Handles both hyphen (database) and underscore (code) formats
 */
function normalizeRailId(railId: string): RailId {
  const normalized = railId.toLowerCase();
  
  // Map various formats to canonical IDs
  switch (normalized) {
    case 'circle_usdc':
    case 'circle-usdc':
      return 'circle_usdc';
    case 'base_chain':
    case 'base-chain':
    case 'base-usdc':
      return 'base_chain';
    case 'pix':
      return 'pix';
    case 'spei':
      return 'spei';
    case 'wire':
      return 'wire';
    case 'internal':
      return 'internal';
    default:
      // Return as-is and let getAdapter handle the error
      return normalized as RailId;
  }
}

export function getAdapter(railId: RailId | string): RailAdapter {
  const normalizedId = normalizeRailId(railId);
  
  if (!adapterRegistry.has(normalizedId)) {
    // Auto-initialize mock adapters in sandbox mode
    switch (normalizedId) {
      case 'circle_usdc':
        adapterRegistry.set(normalizedId, createCircleMockAdapter());
        break;
      case 'base_chain':
        adapterRegistry.set(normalizedId, createBaseMockAdapter());
        break;
      case 'pix':
        adapterRegistry.set(normalizedId, createPixMockAdapter());
        break;
      case 'spei':
        adapterRegistry.set(normalizedId, createSpeiMockAdapter());
        break;
      case 'wire':
        adapterRegistry.set(normalizedId, createWireMockAdapter());
        break;
      case 'internal':
        adapterRegistry.set(normalizedId, createInternalMockAdapter());
        break;
      default:
        throw new Error(`Unknown rail: ${railId}`);
    }
  }
  
  return adapterRegistry.get(normalizedId)!;
}

export function registerAdapter(railId: RailId, adapter: RailAdapter): void {
  const normalizedId = normalizeRailId(railId);
  adapterRegistry.set(normalizedId, adapter);
}

export function getAllAdapters(): RailAdapter[] {
  // Ensure all mock adapters are initialized
  const railIds: RailId[] = ['circle_usdc', 'base_chain', 'pix', 'spei', 'wire', 'internal'];
  for (const railId of railIds) {
    getAdapter(railId);
  }
  return Array.from(adapterRegistry.values());
}

// Export mock transaction store for testing/debugging
export function getMockTransactions(): RailTransaction[] {
  return Array.from(mockTransactionStore.values());
}

export function clearMockTransactions(): void {
  mockTransactionStore.clear();
}

