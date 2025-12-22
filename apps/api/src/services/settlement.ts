/**
 * Settlement Service
 * 
 * Handles fee calculation and settlement for various transaction types.
 * Supports immediate settlement (x402), batch settlement, and on-demand settlement.
 */

import { createClient } from '../db/client.js';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SettlementConfig {
  tenantId: string;
  x402FeeType: 'percentage' | 'fixed' | 'hybrid';
  x402FeePercentage: number;
  x402FeeFixed: number;
  x402FeeCurrency: string;
  autoSettlementEnabled: boolean;
  settlementSchedule: 'immediate' | 'daily' | 'weekly';
}

export interface FeeCalculation {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  feeType: string;
  breakdown?: {
    percentageFee?: number;
    fixedFee?: number;
  };
}

export interface SettlementResult {
  transferId: string;
  status: 'completed' | 'pending' | 'failed';
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  settlementMethod: 'immediate' | 'batch' | 'on_demand';
  settledAt?: string;
  error?: string;
}

export class SettlementService {
  private supabase: SupabaseClient;
  
  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Get settlement configuration for a tenant
   */
  async getConfig(tenantId: string): Promise<SettlementConfig | null> {
    const { data, error } = await this.supabase
      .from('settlement_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !data) {
      console.warn(`No settlement config for tenant ${tenantId}, using defaults`);
      return null;
    }
    
    return {
      tenantId: data.tenant_id,
      x402FeeType: data.x402_fee_type,
      x402FeePercentage: parseFloat(data.x402_fee_percentage),
      x402FeeFixed: parseFloat(data.x402_fee_fixed),
      x402FeeCurrency: data.x402_fee_currency,
      autoSettlementEnabled: data.auto_settlement_enabled,
      settlementSchedule: data.settlement_schedule,
    };
  }

  /**
   * Update settlement configuration for a tenant
   */
  async updateConfig(tenantId: string, updates: Partial<SettlementConfig>): Promise<SettlementConfig> {
    const updateData: any = {};
    
    if (updates.x402FeeType) updateData.x402_fee_type = updates.x402FeeType;
    if (updates.x402FeePercentage !== undefined) updateData.x402_fee_percentage = updates.x402FeePercentage;
    if (updates.x402FeeFixed !== undefined) updateData.x402_fee_fixed = updates.x402FeeFixed;
    if (updates.x402FeeCurrency) updateData.x402_fee_currency = updates.x402FeeCurrency;
    if (updates.autoSettlementEnabled !== undefined) updateData.auto_settlement_enabled = updates.autoSettlementEnabled;
    if (updates.settlementSchedule) updateData.settlement_schedule = updates.settlementSchedule;
    
    const { data, error } = await this.supabase
      .from('settlement_config')
      .upsert({
        tenant_id: tenantId,
        ...updateData,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update settlement config: ${error.message}`);
    }
    
    return {
      tenantId: data.tenant_id,
      x402FeeType: data.x402_fee_type,
      x402FeePercentage: parseFloat(data.x402_fee_percentage),
      x402FeeFixed: parseFloat(data.x402_fee_fixed),
      x402FeeCurrency: data.x402_fee_currency,
      autoSettlementEnabled: data.auto_settlement_enabled,
      settlementSchedule: data.settlement_schedule,
    };
  }

  /**
   * Calculate fee for an x402 transaction
   */
  async calculateX402Fee(
    tenantId: string, 
    grossAmount: number,
    currency: string = 'USDC'
  ): Promise<FeeCalculation> {
    // Get tenant's fee configuration
    const config = await this.getConfig(tenantId);
    
    // Use defaults if no config found
    const feeType = config?.x402FeeType || 'percentage';
    const feePercentage = config?.x402FeePercentage || 0.029; // 2.9%
    const feeFixed = config?.x402FeeFixed || 0;
    
    let feeAmount = 0;
    const breakdown: any = {};
    
    switch (feeType) {
      case 'percentage':
        feeAmount = grossAmount * feePercentage;
        breakdown.percentageFee = feeAmount;
        break;
      
      case 'fixed':
        feeAmount = feeFixed;
        breakdown.fixedFee = feeAmount;
        break;
      
      case 'hybrid':
        const percentagePart = grossAmount * feePercentage;
        feeAmount = percentagePart + feeFixed;
        breakdown.percentageFee = percentagePart;
        breakdown.fixedFee = feeFixed;
        break;
      
      default:
        feeAmount = 0;
    }
    
    // Ensure fee doesn't exceed gross amount
    if (feeAmount > grossAmount) {
      feeAmount = grossAmount;
    }
    
    // Round to 8 decimal places (standard for crypto)
    feeAmount = parseFloat(feeAmount.toFixed(8));
    const netAmount = parseFloat((grossAmount - feeAmount).toFixed(8));
    
    return {
      grossAmount,
      feeAmount,
      netAmount,
      currency,
      feeType,
      breakdown,
    };
  }

  /**
   * Execute immediate settlement for x402 transaction
   * This is the primary settlement method for x402 (wallet-to-wallet)
   */
  async settleX402Immediate(
    transferId: string,
    tenantId: string,
    grossAmount: number,
    currency: string
  ): Promise<SettlementResult> {
    try {
      // Calculate fee
      const feeCalc = await this.calculateX402Fee(tenantId, grossAmount, currency);
      
      // Update transfer with fee and settlement info
      const { data, error } = await this.supabase
        .from('transfers')
        .update({
          fee_amount: feeCalc.feeAmount,
          status: 'completed',
          settled_at: new Date().toISOString(),
          settlement_metadata: {
            method: 'immediate',
            feeType: feeCalc.feeType,
            feeBreakdown: feeCalc.breakdown,
            settledAt: new Date().toISOString(),
          },
        })
        .eq('id', transferId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to settle transfer: ${error.message}`);
      }
      
      return {
        transferId,
        status: 'completed',
        grossAmount,
        feeAmount: feeCalc.feeAmount,
        netAmount: feeCalc.netAmount,
        settlementMethod: 'immediate',
        settledAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Settlement error:', error);
      
      // Mark transfer as failed
      await this.supabase
        .from('transfers')
        .update({
          status: 'failed',
          failure_reason: error.message,
        })
        .eq('id', transferId);
      
      return {
        transferId,
        status: 'failed',
        grossAmount,
        feeAmount: 0,
        netAmount: 0,
        settlementMethod: 'immediate',
        error: error.message,
      };
    }
  }

  /**
   * Get settlement status for a transfer
   */
  async getSettlementStatus(transferId: string): Promise<{
    transferId: string;
    status: string;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    currency: string;
    settledAt?: string;
    settlementMethod?: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('transfers')
      .select('id, amount, fee_amount, currency, status, settled_at, settlement_metadata')
      .eq('id', transferId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    const feeAmount = parseFloat(data.fee_amount || '0');
    const grossAmount = parseFloat(data.amount);
    const netAmount = grossAmount - feeAmount;
    
    return {
      transferId: data.id,
      status: data.status,
      grossAmount,
      feeAmount,
      netAmount,
      currency: data.currency,
      settledAt: data.settled_at,
      settlementMethod: data.settlement_metadata?.method,
    };
  }

  /**
   * Batch settlement - for future implementation
   * Used for transactions that settle via external rails (ACH, wire, etc.)
   */
  async settleBatch(transferIds: string[]): Promise<SettlementResult[]> {
    // TODO: Implement batch settlement logic
    // This would be used for non-immediate settlements
    throw new Error('Batch settlement not yet implemented');
  }

  /**
   * On-demand settlement - for future implementation
   * Provider can trigger settlement manually when ready
   */
  async settleOnDemand(transferId: string): Promise<SettlementResult> {
    // TODO: Implement on-demand settlement logic
    throw new Error('On-demand settlement not yet implemented');
  }

  /**
   * Get settlement analytics for a tenant
   */
  async getSettlementAnalytics(tenantId: string, options: {
    startDate?: string;
    endDate?: string;
    type?: string;
  } = {}) {
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = options.endDate || new Date().toISOString();
    
    let query = this.supabase
      .from('transfers')
      .select('amount, fee_amount, currency, status, type, settled_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (options.type) {
      query = query.eq('type', options.type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch settlement analytics: ${error.message}`);
    }
    
    // Calculate totals
    const settled = data?.filter(t => t.status === 'completed' && t.settled_at) || [];
    const totalGross = settled.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalFees = settled.reduce((sum, t) => sum + parseFloat(t.fee_amount || '0'), 0);
    const totalNet = totalGross - totalFees;
    
    return {
      period: {
        startDate,
        endDate,
      },
      totals: {
        grossRevenue: parseFloat(totalGross.toFixed(8)),
        totalFees: parseFloat(totalFees.toFixed(8)),
        netRevenue: parseFloat(totalNet.toFixed(8)),
        transactionCount: settled.length,
      },
      averages: {
        transactionSize: settled.length > 0 ? parseFloat((totalGross / settled.length).toFixed(8)) : 0,
        feePerTransaction: settled.length > 0 ? parseFloat((totalFees / settled.length).toFixed(8)) : 0,
      },
    };
  }
}

/**
 * Factory function to create a settlement service instance
 */
export function createSettlementService(supabase?: SupabaseClient): SettlementService {
  return new SettlementService(supabase);
}

