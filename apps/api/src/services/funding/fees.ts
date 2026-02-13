/**
 * Funding Fee Service
 * Epic 41, Story 41.21: Funding Fee Structure
 *
 * Transparent fee calculation for funding operations.
 * Supports provider-specific fee schedules, tenant overrides,
 * and fee waivers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FundingFeeConfig,
  FundingSourceType,
  FundingProvider,
  FeeBreakdown,
} from './types.js';

// ============================================
// Default Fee Table (fallback if no DB config)
// ============================================

const DEFAULT_FEES: Record<string, { percentage: number; fixed: number; max?: number }> = {
  'stripe:card:USD': { percentage: 2.9, fixed: 30 },
  'stripe:card:EUR': { percentage: 2.9, fixed: 30 },
  'stripe:bank_account_us:USD': { percentage: 0.8, fixed: 0, max: 500 },
  'stripe:bank_account_eu:EUR': { percentage: 0, fixed: 35 },
  'plaid:bank_account_us:USD': { percentage: 0.8, fixed: 0, max: 500 },
  'belvo:bank_account_latam:BRL': { percentage: 1.0, fixed: 0 },
  'belvo:bank_account_latam:MXN': { percentage: 0.5, fixed: 0 },
  'moonpay:card:USD': { percentage: 4.5, fixed: 0 },
  'moonpay:crypto_wallet:USD': { percentage: 1.0, fixed: 0 },
  'transak:card:USD': { percentage: 5.0, fixed: 0 },
  'circle:crypto_wallet:USDC': { percentage: 0, fixed: 1 },
};

// ============================================
// Fee Service
// ============================================

export class FundingFeeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Calculate fees for a funding transaction
   */
  async calculateFees(
    tenantId: string,
    provider: FundingProvider,
    sourceType: FundingSourceType,
    amountCents: number,
    currency: string
  ): Promise<FeeBreakdown> {
    const config = await this.getFeeConfig(tenantId, provider, sourceType, currency);

    if (!config) {
      // Fall back to defaults
      return this.calculateFromDefaults(provider, sourceType, amountCents, currency);
    }

    return this.calculateFromConfig(config, amountCents);
  }

  /**
   * Get fee estimate with breakdown for display
   */
  async estimateFees(
    tenantId: string,
    provider: FundingProvider,
    sourceType: FundingSourceType,
    amountCents: number,
    currency: string
  ): Promise<{
    fees: FeeBreakdown;
    net_amount_cents: number;
    fee_rate_display: string;
    waiver_active: boolean;
  }> {
    const fees = await this.calculateFees(tenantId, provider, sourceType, amountCents, currency);
    const config = await this.getFeeConfig(tenantId, provider, sourceType, currency);

    const isWaived = config?.fee_waiver_active && (
      !config.fee_waiver_expires_at || new Date(config.fee_waiver_expires_at) > new Date()
    );

    let feeRateDisplay = '';
    if (config) {
      if (config.percentage_fee > 0 && config.fixed_fee_cents > 0) {
        feeRateDisplay = `${config.percentage_fee}% + $${(config.fixed_fee_cents / 100).toFixed(2)}`;
      } else if (config.percentage_fee > 0) {
        feeRateDisplay = `${config.percentage_fee}%`;
      } else if (config.fixed_fee_cents > 0) {
        feeRateDisplay = `$${(config.fixed_fee_cents / 100).toFixed(2)} flat`;
      } else {
        feeRateDisplay = 'No fee';
      }
      if (config.max_fee_cents) {
        feeRateDisplay += ` (max $${(config.max_fee_cents / 100).toFixed(2)})`;
      }
    }

    return {
      fees,
      net_amount_cents: amountCents - fees.total_fee_cents,
      fee_rate_display: isWaived ? 'Waived' : feeRateDisplay,
      waiver_active: !!isWaived,
    };
  }

  /**
   * Get the applicable fee configuration
   */
  async getFeeConfig(
    tenantId: string,
    provider: string,
    sourceType: FundingSourceType,
    currency: string
  ): Promise<FundingFeeConfig | null> {
    // Look for tenant-specific config first, then global
    const { data: configs } = await this.supabase
      .from('funding_fee_configs')
      .select('*')
      .eq('provider', provider)
      .eq('source_type', sourceType)
      .eq('currency', currency)
      .eq('is_active', true)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('tenant_id', { ascending: false, nullsFirst: false });

    return configs?.[0] || null;
  }

  /**
   * Update fee configuration for a tenant
   */
  async updateFeeConfig(
    tenantId: string,
    provider: string,
    sourceType: FundingSourceType,
    currency: string,
    updates: Partial<Pick<
      FundingFeeConfig,
      'percentage_fee' | 'fixed_fee_cents' | 'min_fee_cents' | 'max_fee_cents' |
      'platform_percentage_fee' | 'platform_fixed_fee_cents' |
      'fee_waiver_active' | 'fee_waiver_expires_at' | 'is_active'
    >>
  ): Promise<FundingFeeConfig> {
    const { data, error } = await this.supabase
      .from('funding_fee_configs')
      .upsert({
        tenant_id: tenantId,
        provider,
        source_type: sourceType,
        currency,
        ...updates,
      }, {
        onConflict: 'tenant_id,provider,source_type,currency',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to update fee config: ${error.message}`);
    return data;
  }

  /**
   * List all fee configs for a tenant (including globals)
   */
  async listFeeConfigs(tenantId: string): Promise<FundingFeeConfig[]> {
    const { data, error } = await this.supabase
      .from('funding_fee_configs')
      .select('*')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .eq('is_active', true)
      .order('provider')
      .order('source_type');

    if (error) throw new Error(`Failed to list fee configs: ${error.message}`);
    return data || [];
  }

  // ============================================
  // Private Helpers
  // ============================================

  private calculateFromConfig(config: FundingFeeConfig, amountCents: number): FeeBreakdown {
    // Check fee waiver
    if (config.fee_waiver_active) {
      if (!config.fee_waiver_expires_at || new Date(config.fee_waiver_expires_at) > new Date()) {
        return { provider_fee_cents: 0, platform_fee_cents: 0, conversion_fee_cents: 0, total_fee_cents: 0 };
      }
    }

    // Provider fee
    let providerFee = Math.round(amountCents * (config.percentage_fee / 100)) + config.fixed_fee_cents;
    if (config.min_fee_cents) providerFee = Math.max(providerFee, config.min_fee_cents);
    if (config.max_fee_cents) providerFee = Math.min(providerFee, config.max_fee_cents);

    // Platform fee
    const platformFee = Math.round(amountCents * (config.platform_percentage_fee / 100)) + config.platform_fixed_fee_cents;

    return {
      provider_fee_cents: providerFee,
      platform_fee_cents: platformFee,
      conversion_fee_cents: 0,
      total_fee_cents: providerFee + platformFee,
    };
  }

  private calculateFromDefaults(
    provider: string,
    sourceType: FundingSourceType,
    amountCents: number,
    currency: string
  ): FeeBreakdown {
    const key = `${provider}:${sourceType}:${currency}`;
    const defaults = DEFAULT_FEES[key];

    if (!defaults) {
      return { provider_fee_cents: 0, platform_fee_cents: 0, conversion_fee_cents: 0, total_fee_cents: 0 };
    }

    let fee = Math.round(amountCents * (defaults.percentage / 100)) + defaults.fixed;
    if (defaults.max) fee = Math.min(fee, defaults.max);

    return {
      provider_fee_cents: fee,
      platform_fee_cents: 0,
      conversion_fee_cents: 0,
      total_fee_cents: fee,
    };
  }
}

// ============================================
// Factory
// ============================================

export function createFundingFeeService(supabase: SupabaseClient): FundingFeeService {
  return new FundingFeeService(supabase);
}
