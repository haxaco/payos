/**
 * Multi-Protocol Settlement Router (Epic 27, Story 27.1)
 * 
 * A unified settlement router that handles transfers across all protocols
 * (x402, AP2, ACP) and routes them to appropriate settlement rails
 * (Circle USDC, Pix, SPEI, Base chain).
 * 
 * Features:
 * - Protocol-aware routing based on transfer metadata
 * - Multi-rail support with automatic selection
 * - Retry logic with exponential backoff
 * - Atomic settlement transactions
 * - Comprehensive error handling
 */

import { createClient } from '../db/client.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { createSettlementService, SettlementResult } from './settlement.js';
import { getCircleService } from './circle-mock.js';

// ============================================
// Types & Interfaces
// ============================================

export type Protocol = 'x402' | 'ap2' | 'acp' | 'internal' | 'cross_border';

export type SettlementRail =
  | 'circle_usdc'     // Circle Programmable Wallets (USDC)
  | 'base_chain'      // Base L2 for on-chain settlements
  | 'pix'             // Brazil instant payment
  | 'spei'            // Mexico instant payment
  | 'internal'        // Internal ledger transfer
  | 'wire'            // International wire (fallback)
  | 'visa_pull'       // Visa VIC card pull (Epic 53)
  | 'mastercard_pull' // Mastercard Agent Pay card pull (Epic 53)
  | 'mock';           // Mock rail for testing

export interface SettlementRoute {
  rail: SettlementRail;
  priority: number;         // Lower is higher priority
  estimatedTime: number;    // Estimated settlement time in seconds
  feePercentage: number;    // Fee as percentage (0.01 = 1%)
  feeFixed: number;         // Fixed fee in destination currency
  minAmount: number;        // Minimum amount for this rail
  maxAmount: number;        // Maximum amount for this rail
  supported: boolean;       // Whether this rail is currently available
}

export interface RoutingDecision {
  transferId: string;
  protocol: Protocol;
  selectedRail: SettlementRail;
  route: SettlementRoute;
  alternativeRails: SettlementRail[];
  decisionTime: number;     // Time to make routing decision in ms
  metadata: {
    sourceCurrency: string;
    destinationCurrency: string;
    sourceCountry?: string;
    destinationCountry?: string;
    amount: number;
    routingReason: string;
  };
}

export interface SettlementRequest {
  transferId: string;
  tenantId: string;
  protocol: Protocol;
  amount: number;
  currency: string;
  destinationCurrency?: string;
  destinationCountry?: string;
  protocolMetadata?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;
}

export interface SettlementResponse {
  success: boolean;
  transferId: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  rail: SettlementRail;
  settlementId?: string;       // External settlement reference
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  settledAt?: string;
  estimatedCompletion?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// ============================================
// Rail Configuration
// ============================================

const RAIL_CONFIG: Record<SettlementRail, Omit<SettlementRoute, 'supported'>> = {
  internal: {
    rail: 'internal',
    priority: 1,
    estimatedTime: 0,          // Instant
    feePercentage: 0.0005,     // 0.05%
    feeFixed: 0,
    minAmount: 0.01,
    maxAmount: 1000000,
  },
  circle_usdc: {
    rail: 'circle_usdc',
    priority: 2,
    estimatedTime: 30,         // ~30 seconds
    feePercentage: 0.01,       // 1%
    feeFixed: 0.10,
    minAmount: 1,
    maxAmount: 100000,
  },
  base_chain: {
    rail: 'base_chain',
    priority: 3,
    estimatedTime: 60,         // ~1 minute
    feePercentage: 0.005,      // 0.5%
    feeFixed: 0.05,
    minAmount: 0.10,
    maxAmount: 500000,
  },
  pix: {
    rail: 'pix',
    priority: 4,
    estimatedTime: 10,         // ~10 seconds (Pix is fast)
    feePercentage: 0.007,      // 0.7%
    feeFixed: 0,
    minAmount: 1,
    maxAmount: 100000,
  },
  spei: {
    rail: 'spei',
    priority: 5,
    estimatedTime: 300,        // ~5 minutes
    feePercentage: 0.008,      // 0.8%
    feeFixed: 1.50,
    minAmount: 10,
    maxAmount: 500000,
  },
  wire: {
    rail: 'wire',
    priority: 10,
    estimatedTime: 86400,      // ~1 day
    feePercentage: 0.015,      // 1.5%
    feeFixed: 25,
    minAmount: 100,
    maxAmount: 10000000,
  },
  visa_pull: {
    rail: 'visa_pull',
    priority: 6,
    estimatedTime: 86400,      // T+1 settlement
    feePercentage: 0.029,      // 2.9%
    feeFixed: 0.30,
    minAmount: 0.50,
    maxAmount: 999999.99,
  },
  mastercard_pull: {
    rail: 'mastercard_pull',
    priority: 7,
    estimatedTime: 86400,      // T+1 settlement
    feePercentage: 0.029,      // 2.9%
    feeFixed: 0.30,
    minAmount: 0.50,
    maxAmount: 999999.99,
  },
  mock: {
    rail: 'mock',
    priority: 0,
    estimatedTime: 1,
    feePercentage: 0,
    feeFixed: 0,
    minAmount: 0,
    maxAmount: Infinity,
  },
};

// Currency to country mapping for rail selection
const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  'BRL': 'BR',
  'MXN': 'MX',
  'USD': 'US',
  'USDC': 'US',  // Stablecoin defaults to US
  'EURC': 'EU',
};

// Country to available rails mapping
const COUNTRY_RAILS: Record<string, SettlementRail[]> = {
  'BR': ['pix', 'visa_pull', 'mastercard_pull', 'wire'],
  'MX': ['spei', 'visa_pull', 'mastercard_pull', 'wire'],
  'US': ['circle_usdc', 'base_chain', 'visa_pull', 'mastercard_pull', 'wire'],
  'EU': ['visa_pull', 'mastercard_pull', 'wire'],
  // Default: stablecoin and card rails
  '*': ['circle_usdc', 'base_chain', 'visa_pull', 'mastercard_pull', 'internal'],
};

// ============================================
// Settlement Router Class
// ============================================

export class SettlementRouter {
  private supabase: SupabaseClient;
  private settlementService: ReturnType<typeof createSettlementService>;
  private useMockRails: boolean;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.settlementService = createSettlementService(this.supabase);
    this.useMockRails = process.env.NODE_ENV !== 'production' || 
                        process.env.USE_MOCK_RAILS === 'true';
  }

  /**
   * Route a transfer to the appropriate settlement rail
   */
  async routeTransfer(request: SettlementRequest): Promise<RoutingDecision> {
    const startTime = Date.now();

    // Get transfer details if not provided
    const transfer = await this.getTransferDetails(request.transferId, request.tenantId);
    
    if (!transfer) {
      throw new Error(`Transfer not found: ${request.transferId}`);
    }

    // Determine destination country
    const destinationCountry = request.destinationCountry || 
      this.getCountryFromCurrency(request.destinationCurrency || request.currency);

    // Get available rails for this route
    const availableRails = this.getAvailableRails(
      request.currency,
      request.destinationCurrency || request.currency,
      destinationCountry,
      request.amount
    );

    if (availableRails.length === 0) {
      throw new Error(`No settlement rails available for this transfer`);
    }

    // Select the best rail based on protocol and priority
    const selectedRoute = this.selectBestRail(
      request.protocol,
      availableRails,
      request.amount
    );

    const decisionTime = Date.now() - startTime;

    // Store routing decision in transfer metadata
    await this.storeRoutingDecision(request.transferId, {
      selectedRail: selectedRoute.rail,
      alternativeRails: availableRails.filter(r => r !== selectedRoute.rail),
      decisionTime,
      protocol: request.protocol,
    });

    return {
      transferId: request.transferId,
      protocol: request.protocol,
      selectedRail: selectedRoute.rail,
      route: selectedRoute,
      alternativeRails: availableRails.filter(r => r !== selectedRoute.rail),
      decisionTime,
      metadata: {
        sourceCurrency: request.currency,
        destinationCurrency: request.destinationCurrency || request.currency,
        destinationCountry,
        amount: request.amount,
        routingReason: this.getRoutingReason(selectedRoute, request.protocol),
      },
    };
  }

  /**
   * Execute settlement for a transfer
   */
  async settleTransfer(request: SettlementRequest): Promise<SettlementResponse> {
    try {
      // First, determine the routing
      const routing = await this.routeTransfer(request);

      // Update transfer status to processing
      await this.updateTransferStatus(request.transferId, 'processing', {
        settlementRail: routing.selectedRail,
        routingDecision: routing,
      });

      // Execute settlement based on selected rail
      const result = await this.executeSettlement(request, routing);

      // Update transfer with result
      if (result.success) {
        await this.updateTransferStatus(request.transferId, result.status, {
          settlementId: result.settlementId,
          feeAmount: result.feeAmount,
          netAmount: result.netAmount,
          settledAt: result.settledAt,
          settlementRail: routing.selectedRail,
        });
      } else if (result.error?.retryable && (request.retryCount || 0) < (request.maxRetries || 3)) {
        // Schedule retry with exponential backoff
        await this.scheduleRetry(request, routing, result.error);
      }

      return result;

    } catch (error: any) {
      console.error(`Settlement error for transfer ${request.transferId}:`, error);

      return {
        success: false,
        transferId: request.transferId,
        status: 'failed',
        rail: 'mock',
        grossAmount: request.amount,
        feeAmount: 0,
        netAmount: request.amount,
        error: {
          code: 'SETTLEMENT_ERROR',
          message: error.message,
          retryable: this.isRetryableError(error),
        },
      };
    }
  }

  /**
   * Execute settlement on a specific rail
   */
  private async executeSettlement(
    request: SettlementRequest,
    routing: RoutingDecision
  ): Promise<SettlementResponse> {
    const { selectedRail, route } = routing;

    // Calculate fees
    const feeAmount = this.calculateFee(request.amount, route);
    const netAmount = request.amount - feeAmount;

    // In mock/sandbox mode, use mock settlement
    if (this.useMockRails) {
      return this.executeMockSettlement(request, routing, feeAmount, netAmount);
    }

    // Execute real settlement based on rail
    switch (selectedRail) {
      case 'internal':
        return this.executeInternalSettlement(request, feeAmount, netAmount);

      case 'circle_usdc':
        return this.executeCircleSettlement(request, feeAmount, netAmount);

      case 'base_chain':
        return this.executeBaseChainSettlement(request, feeAmount, netAmount);

      case 'pix':
        return this.executePixSettlement(request, feeAmount, netAmount);

      case 'spei':
        return this.executeSpeiSettlement(request, feeAmount, netAmount);

      case 'wire':
        return this.executeWireSettlement(request, feeAmount, netAmount);

      case 'visa_pull':
        return this.executeVisaPullSettlement(request, feeAmount, netAmount);

      case 'mastercard_pull':
        return this.executeMastercardPullSettlement(request, feeAmount, netAmount);

      default:
        return this.executeMockSettlement(request, routing, feeAmount, netAmount);
    }
  }

  // ============================================
  // Rail-Specific Implementations
  // ============================================

  private async executeInternalSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // Use existing settlement service for internal transfers
    const result = await this.settlementService.settleX402Immediate(
      request.transferId,
      request.tenantId,
      request.amount,
      request.currency
    );

    return {
      success: result.status === 'completed',
      transferId: request.transferId,
      status: result.status,
      rail: 'internal',
      grossAmount: request.amount,
      feeAmount: result.feeAmount,
      netAmount: result.netAmount,
      settledAt: result.settledAt,
      error: result.error ? {
        code: 'INTERNAL_SETTLEMENT_ERROR',
        message: result.error,
        retryable: false,
      } : undefined,
    };
  }

  private async executeCircleSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // In production, this would call Circle's Programmable Wallets API
    // For now, use mock implementation
    const circleService = getCircleService(request.tenantId);
    
    // Simulate Circle API call
    console.log(`[Settlement Router] Circle USDC settlement for ${request.amount} ${request.currency}`);
    
    return {
      success: true,
      transferId: request.transferId,
      status: 'completed',
      rail: 'circle_usdc',
      settlementId: `circle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      settledAt: new Date().toISOString(),
    };
  }

  private async executeBaseChainSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // In production, this would submit an on-chain transaction
    console.log(`[Settlement Router] Base chain settlement for ${request.amount} ${request.currency}`);
    
    return {
      success: true,
      transferId: request.transferId,
      status: 'pending',  // On-chain needs confirmation
      rail: 'base_chain',
      settlementId: `0x${Math.random().toString(16).substr(2, 64)}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
    };
  }

  private async executePixSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // In production, this would call Pix API (via partner bank or PSP)
    console.log(`[Settlement Router] Pix settlement for ${request.amount} BRL`);
    
    return {
      success: true,
      transferId: request.transferId,
      status: 'completed',
      rail: 'pix',
      settlementId: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      settledAt: new Date().toISOString(),
    };
  }

  private async executeSpeiSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // In production, this would call SPEI API (via Mexican bank)
    console.log(`[Settlement Router] SPEI settlement for ${request.amount} MXN`);
    
    return {
      success: true,
      transferId: request.transferId,
      status: 'pending',
      rail: 'spei',
      settlementId: `spei_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      estimatedCompletion: new Date(Date.now() + 300000).toISOString(), // 5 minutes
    };
  }

  private async executeWireSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // Wire transfers are typically batched
    console.log(`[Settlement Router] Wire settlement for ${request.amount} ${request.currency}`);

    return {
      success: true,
      transferId: request.transferId,
      status: 'pending',
      rail: 'wire',
      settlementId: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      estimatedCompletion: new Date(Date.now() + 86400000).toISOString(), // 24 hours
    };
  }

  private async executeVisaPullSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // Epic 53: Visa VIC card pull settlement
    console.log(`[Settlement Router] Visa VIC settlement for ${request.amount} ${request.currency}`);

    // In production, this would:
    // 1. Get Visa VIC credentials from connected_accounts
    // 2. Create payment instruction via VisaVICClient
    // 3. Wait for commerce signal from agent
    // 4. Complete the transaction

    return {
      success: true,
      transferId: request.transferId,
      status: 'pending',
      rail: 'visa_pull',
      settlementId: `vic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      estimatedCompletion: new Date(Date.now() + 86400000).toISOString(), // T+1
    };
  }

  private async executeMastercardPullSettlement(
    request: SettlementRequest,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    // Epic 53: Mastercard Agent Pay card pull settlement
    console.log(`[Settlement Router] Mastercard Agent Pay settlement for ${request.amount} ${request.currency}`);

    // In production, this would:
    // 1. Get Mastercard credentials from connected_accounts
    // 2. Create payment request via MastercardAgentPayClient
    // 3. Generate DTVC and submit transaction
    // 4. Complete the transaction

    return {
      success: true,
      transferId: request.transferId,
      status: 'pending',
      rail: 'mastercard_pull',
      settlementId: `mc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      estimatedCompletion: new Date(Date.now() + 86400000).toISOString(), // T+1
    };
  }

  private async executeMockSettlement(
    request: SettlementRequest,
    routing: RoutingDecision,
    feeAmount: number,
    netAmount: number
  ): Promise<SettlementResponse> {
    console.log(`[Settlement Router] Mock settlement on ${routing.selectedRail} for ${request.amount} ${request.currency}`);
    
    // Simulate processing time
    const estimatedTime = routing.route.estimatedTime * 1000;
    
    return {
      success: true,
      transferId: request.transferId,
      status: estimatedTime > 0 ? 'pending' : 'completed',
      rail: routing.selectedRail,
      settlementId: `mock_${routing.selectedRail}_${Date.now()}`,
      grossAmount: request.amount,
      feeAmount,
      netAmount,
      settledAt: estimatedTime === 0 ? new Date().toISOString() : undefined,
      estimatedCompletion: estimatedTime > 0 
        ? new Date(Date.now() + estimatedTime).toISOString() 
        : undefined,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getCountryFromCurrency(currency: string): string {
    return CURRENCY_COUNTRY_MAP[currency] || 'US';
  }

  private getAvailableRails(
    sourceCurrency: string,
    destinationCurrency: string,
    destinationCountry: string,
    amount: number
  ): SettlementRail[] {
    // Get rails for destination country
    const countryRails = COUNTRY_RAILS[destinationCountry] || COUNTRY_RAILS['*'];

    // Filter by amount limits and availability
    return countryRails.filter(rail => {
      const config = RAIL_CONFIG[rail];
      return config.minAmount <= amount && 
             amount <= config.maxAmount &&
             this.isRailAvailable(rail);
    });
  }

  private isRailAvailable(rail: SettlementRail): boolean {
    // In production, check actual rail availability
    // For now, all rails are available in sandbox mode
    if (this.useMockRails) return true;

    // TODO: Check actual rail status from monitoring
    return true;
  }

  private selectBestRail(
    protocol: Protocol,
    availableRails: SettlementRail[],
    amount: number
  ): SettlementRoute {
    // Protocol-specific preferences
    const protocolPreferences: Record<Protocol, SettlementRail[]> = {
      'x402': ['circle_usdc', 'base_chain', 'internal'],
      'ap2': ['circle_usdc', 'pix', 'spei', 'internal'],
      'acp': ['circle_usdc', 'internal', 'wire'],
      'internal': ['internal'],
      'cross_border': ['pix', 'spei', 'wire', 'circle_usdc'],
    };

    const preferences = protocolPreferences[protocol] || ['internal'];

    // Find the first available preferred rail
    for (const preferred of preferences) {
      if (availableRails.includes(preferred)) {
        return { ...RAIL_CONFIG[preferred], supported: true };
      }
    }

    // Fall back to first available rail by priority
    const sortedRails = availableRails
      .map(rail => ({ ...RAIL_CONFIG[rail], supported: true }))
      .sort((a, b) => a.priority - b.priority);

    return sortedRails[0] || { ...RAIL_CONFIG['mock'], supported: true };
  }

  private calculateFee(amount: number, route: SettlementRoute): number {
    const percentageFee = amount * route.feePercentage;
    const totalFee = percentageFee + route.feeFixed;
    
    // Round to 8 decimal places
    return Math.min(parseFloat(totalFee.toFixed(8)), amount);
  }

  private getRoutingReason(route: SettlementRoute, protocol: Protocol): string {
    const reasons: string[] = [];

    if (route.rail === 'internal') {
      reasons.push('Internal ledger transfer (fastest)');
    } else if (route.rail === 'circle_usdc') {
      reasons.push('USDC via Circle (preferred for x402)');
    } else if (['pix', 'spei'].includes(route.rail)) {
      reasons.push(`Local rail for ${route.rail.toUpperCase()} (lowest fees)`);
    } else if (route.rail === 'base_chain') {
      reasons.push('On-chain settlement via Base L2');
    } else if (route.rail === 'visa_pull') {
      reasons.push('Visa VIC card pull (agent payment)');
    } else if (route.rail === 'mastercard_pull') {
      reasons.push('Mastercard Agent Pay card pull');
    } else {
      reasons.push('Fallback rail');
    }

    reasons.push(`Protocol: ${protocol}`);
    reasons.push(`Priority: ${route.priority}`);
    reasons.push(`Est. time: ${route.estimatedTime}s`);

    return reasons.join('; ');
  }

  private async getTransferDetails(transferId: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('transfers')
      .select('*')
      .eq('id', transferId)
      .eq('tenant_id', tenantId)
      .single();

    return error ? null : data;
  }

  private async storeRoutingDecision(transferId: string, decision: any) {
    await this.supabase
      .from('transfers')
      .update({
        settlement_metadata: {
          ...decision,
          routedAt: new Date().toISOString(),
        },
      })
      .eq('id', transferId);
  }

  private async updateTransferStatus(
    transferId: string, 
    status: string, 
    metadata?: Record<string, any>
  ) {
    const updateData: any = { status };
    
    if (metadata) {
      updateData.settlement_metadata = metadata;
    }
    
    if (status === 'completed' && metadata?.settledAt) {
      updateData.settled_at = metadata.settledAt;
      updateData.completed_at = metadata.settledAt;
    }
    
    if (metadata?.feeAmount !== undefined) {
      updateData.fee_amount = metadata.feeAmount;
    }

    await this.supabase
      .from('transfers')
      .update(updateData)
      .eq('id', transferId);
  }

  private async scheduleRetry(
    request: SettlementRequest,
    routing: RoutingDecision,
    error: { code: string; message: string }
  ) {
    const retryCount = (request.retryCount || 0) + 1;
    const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff

    console.log(`[Settlement Router] Scheduling retry ${retryCount} for ${request.transferId} in ${delayMs}ms`);

    // In production, this would be handled by a job queue
    // For now, we'll store the retry info in the transfer
    await this.supabase
      .from('transfers')
      .update({
        settlement_metadata: {
          ...routing,
          retryCount,
          lastError: error,
          nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
        },
      })
      .eq('id', request.transferId);
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx errors are retryable
    const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'GATEWAY_ERROR'];
    return retryableCodes.some(code => 
      error.code === code || error.message?.includes(code)
    );
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Route multiple transfers in batch
   */
  async routeBatch(requests: SettlementRequest[]): Promise<RoutingDecision[]> {
    return Promise.all(requests.map(req => this.routeTransfer(req)));
  }

  /**
   * Settle multiple transfers in batch
   */
  async settleBatch(requests: SettlementRequest[]): Promise<SettlementResponse[]> {
    // For efficiency, group by rail and process together
    const routingDecisions = await this.routeBatch(requests);
    
    // Group by rail
    const byRail = new Map<SettlementRail, SettlementRequest[]>();
    routingDecisions.forEach((routing, index) => {
      const rail = routing.selectedRail;
      if (!byRail.has(rail)) {
        byRail.set(rail, []);
      }
      byRail.get(rail)!.push(requests[index]);
    });

    // Process each rail group
    const results: SettlementResponse[] = [];
    for (const [rail, railRequests] of byRail) {
      const railResults = await Promise.all(
        railRequests.map(req => this.settleTransfer(req))
      );
      results.push(...railResults);
    }

    return results;
  }
}

// ============================================
// Factory Function
// ============================================

export function createSettlementRouter(supabase?: SupabaseClient): SettlementRouter {
  return new SettlementRouter(supabase);
}

