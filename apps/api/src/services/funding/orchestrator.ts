/**
 * Funding Orchestrator Service
 * Epic 41, Story 41.2: Funding Orchestrator Service
 *
 * Routes funding requests to the appropriate provider based on source type,
 * currency, and availability. Manages the full funding lifecycle.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { IFundingProvider } from './providers/interface.js';
import { isWidgetProvider } from './providers/interface.js';
import { createStripeCardProvider } from './providers/stripe-cards.js';
import { createStripeAchProvider } from './providers/stripe-ach.js';
import { createStripeSepaProvider } from './providers/stripe-sepa.js';
import { createPlaidProvider } from './providers/plaid.js';
import { createBelvoProvider } from './providers/belvo.js';
import { createMoonPayProvider } from './providers/moonpay.js';
import { createTransakProvider } from './providers/transak.js';
import { createCircleDirectProvider } from './providers/circle-direct.js';
import type {
  FundingSource,
  FundingTransaction,
  FundingSourceType,
  FundingSourceStatus,
  FundingTransactionStatus,
  FundingProvider as FundingProviderName,
  CreateFundingSourceParams,
  VerifyFundingSourceParams,
  InitiateFundingParams,
  WidgetParams,
  WidgetResult,
} from './types.js';

// ============================================
// Constants
// ============================================

const MAX_BATCH_SIZE = 50;

// ============================================
// Provider Registry
// ============================================

type ProviderKey = string; // `${provider}:${sourceType}`

function buildProviderRegistry(): Map<ProviderKey, IFundingProvider> {
  const registry = new Map<ProviderKey, IFundingProvider>();
  const providers: IFundingProvider[] = [
    createStripeCardProvider(),
    createStripeAchProvider(),
    createStripeSepaProvider(),
    createPlaidProvider(),
    createBelvoProvider(),
    createMoonPayProvider(),
    createTransakProvider(),
    createCircleDirectProvider(),
  ];

  for (const provider of providers) {
    for (const cap of provider.capabilities) {
      const key = `${provider.name}:${cap.sourceType}`;
      registry.set(key, provider);
    }
  }

  return registry;
}

// ============================================
// Orchestrator
// ============================================

export class FundingOrchestrator {
  private providers: Map<ProviderKey, IFundingProvider>;

  constructor(private supabase: SupabaseClient) {
    this.providers = buildProviderRegistry();
  }

  // ============================================
  // Provider Resolution
  // ============================================

  private getProvider(providerName: string, sourceType: FundingSourceType): IFundingProvider {
    const key = `${providerName}:${sourceType}`;
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(`No provider found for ${providerName}:${sourceType}`);
    }
    return provider;
  }

  /**
   * Find the best provider for a given source type and currency
   */
  findProvider(sourceType: FundingSourceType, currency: string): IFundingProvider | null {
    for (const [_key, provider] of this.providers) {
      for (const cap of provider.capabilities) {
        if (cap.sourceType === sourceType && cap.currencies.includes(currency)) {
          return provider;
        }
      }
    }
    return null;
  }

  /**
   * List all available providers with their capabilities
   */
  listProviders(): Array<{
    name: string;
    displayName: string;
    available: boolean;
    capabilities: Array<{
      sourceType: FundingSourceType;
      currencies: string[];
      settlementTime: string;
    }>;
  }> {
    const seen = new Set<string>();
    const result: any[] = [];

    for (const provider of this.providers.values()) {
      if (seen.has(provider.name + provider.displayName)) continue;
      seen.add(provider.name + provider.displayName);

      result.push({
        name: provider.name,
        displayName: provider.displayName,
        available: provider.isAvailable(),
        capabilities: provider.capabilities.map(cap => ({
          sourceType: cap.sourceType,
          currencies: cap.currencies,
          settlementTime: cap.settlementTime,
        })),
      });
    }

    return result;
  }

  // ============================================
  // Funding Source Management
  // ============================================

  /**
   * Create a new funding source
   */
  async createSource(
    tenantId: string,
    params: CreateFundingSourceParams
  ): Promise<FundingSource> {
    // Verify account exists and belongs to tenant
    const { data: account, error: accountError } = await this.supabase
      .from('accounts')
      .select('id, tenant_id')
      .eq('id', params.account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (accountError || !account) {
      throw new Error('Account not found');
    }

    // Get provider and create source
    const provider = this.getProvider(params.provider, params.type);
    const result = await provider.createSource(tenantId, params);

    // Store in database
    const { data: source, error } = await this.supabase
      .from('funding_sources')
      .insert({
        tenant_id: tenantId,
        account_id: params.account_id,
        type: params.type,
        provider: params.provider,
        status: result.status,
        display_name: result.display_name,
        last_four: result.last_four,
        brand: result.brand,
        provider_id: result.provider_id,
        provider_metadata: {
          ...result.provider_metadata,
          client_secret: result.client_secret,
          widget_url: result.widget_url,
        },
        supported_currencies: result.supported_currencies || ['USD'],
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create funding source: ${error.message}`);
    return source;
  }

  /**
   * Get a funding source by ID
   */
  async getSource(tenantId: string, sourceId: string): Promise<FundingSource> {
    const { data, error } = await this.supabase
      .from('funding_sources')
      .select('*')
      .eq('id', sourceId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) throw new Error('Funding source not found');
    return data;
  }

  /**
   * List funding sources for an account
   */
  async listSources(
    tenantId: string,
    filters: {
      account_id?: string;
      type?: FundingSourceType;
      provider?: FundingProviderName;
      status?: FundingSourceStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ data: FundingSource[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('funding_sources')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.account_id) query = query.eq('account_id', filters.account_id);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.provider) query = query.eq('provider', filters.provider);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to list funding sources: ${error.message}`);

    return { data: data || [], total: count || 0 };
  }

  /**
   * Verify a funding source
   */
  async verifySource(
    tenantId: string,
    params: VerifyFundingSourceParams
  ): Promise<FundingSource> {
    const source = await this.getSource(tenantId, params.source_id);
    const provider = this.getProvider(source.provider, source.type);

    const result = await provider.verifySource(tenantId, source, params);

    // Update source status
    const updates: Record<string, unknown> = { status: result.status };
    if (result.verified) {
      updates.verified_at = new Date().toISOString();
    }
    if (result.provider_metadata) {
      updates.provider_metadata = { ...source.provider_metadata, ...result.provider_metadata };
    }

    const { data, error } = await this.supabase
      .from('funding_sources')
      .update(updates)
      .eq('id', source.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update funding source: ${error.message}`);
    return data;
  }

  /**
   * Remove a funding source
   */
  async removeSource(tenantId: string, sourceId: string): Promise<void> {
    const source = await this.getSource(tenantId, sourceId);
    const provider = this.getProvider(source.provider, source.type);

    // Remove at provider
    await provider.removeSource(tenantId, source);

    // Mark as removed in database
    await this.supabase
      .from('funding_sources')
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
      })
      .eq('id', sourceId)
      .eq('tenant_id', tenantId);
  }

  // ============================================
  // Widget Sessions
  // ============================================

  /**
   * Create a widget session for providers that use embedded widgets
   */
  async createWidgetSession(
    tenantId: string,
    providerName: FundingProviderName,
    sourceType: FundingSourceType,
    params: WidgetParams
  ): Promise<WidgetResult> {
    const provider = this.getProvider(providerName, sourceType);

    if (!isWidgetProvider(provider)) {
      throw new Error(`Provider ${providerName} does not support widgets`);
    }

    return provider.createWidgetSession(tenantId, params);
  }

  // ============================================
  // Funding Transactions
  // ============================================

  /**
   * Initiate a funding transaction
   */
  async initiateFunding(
    tenantId: string,
    params: InitiateFundingParams
  ): Promise<FundingTransaction> {
    // Get and validate source
    const source = await this.getSource(tenantId, params.source_id);

    if (source.status !== 'active') {
      throw new Error(`Funding source is ${source.status}, must be active`);
    }

    // Check limits
    await this.checkLimits(source, params.amount_cents);

    // Check idempotency
    if (params.idempotency_key) {
      const { data: existing } = await this.supabase
        .from('funding_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('idempotency_key', params.idempotency_key)
        .single();

      if (existing) return existing;
    }

    // Get provider and initiate
    const provider = this.getProvider(source.provider, source.type);
    const result = await provider.initiateFunding(tenantId, source, params);

    // Calculate fees
    const fees = await this.calculateFees(tenantId, source, params.amount_cents, params.currency);

    // Create transaction record
    const { data: transaction, error } = await this.supabase
      .from('funding_transactions')
      .insert({
        tenant_id: tenantId,
        funding_source_id: source.id,
        account_id: source.account_id,
        amount_cents: params.amount_cents,
        currency: params.currency,
        status: result.status,
        provider: source.provider,
        provider_transaction_id: result.provider_transaction_id,
        provider_metadata: {
          ...result.provider_metadata,
          client_secret: result.client_secret,
          redirect_url: result.redirect_url,
        },
        provider_fee_cents: result.provider_fee_cents || fees.provider_fee_cents,
        platform_fee_cents: fees.platform_fee_cents,
        total_fee_cents: (result.provider_fee_cents || fees.provider_fee_cents) + fees.platform_fee_cents,
        idempotency_key: params.idempotency_key,
        processing_at: result.status === 'processing' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create funding transaction: ${error.message}`);

    // Update source usage
    await this.supabase
      .from('funding_sources')
      .update({
        daily_used_cents: source.daily_used_cents + params.amount_cents,
        monthly_used_cents: source.monthly_used_cents + params.amount_cents,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', source.id)
      .eq('tenant_id', tenantId);

    return transaction;
  }

  /**
   * Get a funding transaction by ID
   */
  async getTransaction(tenantId: string, transactionId: string): Promise<FundingTransaction> {
    const { data, error } = await this.supabase
      .from('funding_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) throw new Error('Funding transaction not found');
    return data;
  }

  /**
   * List funding transactions
   */
  async listTransactions(
    tenantId: string,
    filters: {
      source_id?: string;
      account_id?: string;
      status?: FundingTransactionStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ data: FundingTransaction[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('funding_transactions')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.source_id) query = query.eq('funding_source_id', filters.source_id);
    if (filters.account_id) query = query.eq('account_id', filters.account_id);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to list funding transactions: ${error.message}`);

    return { data: data || [], total: count || 0 };
  }

  /**
   * Update transaction status (from webhook or polling)
   */
  async updateTransactionStatus(
    tenantId: string,
    transactionId: string,
    status: FundingTransactionStatus,
    metadata?: {
      failure_reason?: string;
      provider_metadata?: Record<string, unknown>;
      converted_amount_cents?: number;
      exchange_rate?: number;
    }
  ): Promise<FundingTransaction> {
    const updates: Record<string, unknown> = { status };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'failed') {
      updates.failed_at = new Date().toISOString();
      if (metadata?.failure_reason) updates.failure_reason = metadata.failure_reason;
    }

    if (metadata?.provider_metadata) {
      const { data: existing } = await this.supabase
        .from('funding_transactions')
        .select('provider_metadata')
        .eq('id', transactionId)
        .eq('tenant_id', tenantId)
        .single();

      updates.provider_metadata = { ...(existing?.provider_metadata || {}), ...metadata.provider_metadata };
    }

    if (metadata?.converted_amount_cents !== undefined) {
      updates.converted_amount_cents = metadata.converted_amount_cents;
    }
    if (metadata?.exchange_rate !== undefined) {
      updates.exchange_rate = metadata.exchange_rate;
    }

    const { data, error } = await this.supabase
      .from('funding_transactions')
      .update(updates)
      .eq('id', transactionId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update transaction: ${error.message}`);

    // If completed, update funding source stats
    if (status === 'completed' && data) {
      await this.supabase
        .from('funding_sources')
        .update({
          total_funded_cents: data.amount_cents, // Will be incremented via DB
          funding_count: 1, // Will be incremented
        })
        .eq('id', data.funding_source_id)
        .eq('tenant_id', tenantId);
    }

    return data;
  }

  // ============================================
  // Limit Checking
  // ============================================

  private async checkLimits(source: FundingSource, amountCents: number): Promise<void> {
    // Reset counters if needed
    const now = new Date();
    const dailyReset = new Date(source.daily_reset_at);
    const monthlyReset = new Date(source.monthly_reset_at);

    let dailyUsed = source.daily_used_cents;
    let monthlyUsed = source.monthly_used_cents;

    if (now.getTime() - dailyReset.getTime() > 24 * 60 * 60 * 1000) {
      dailyUsed = 0;
    }
    if (now.getTime() - monthlyReset.getTime() > 30 * 24 * 60 * 60 * 1000) {
      monthlyUsed = 0;
    }

    // Check per-transaction limit
    if (source.per_transaction_limit_cents && amountCents > source.per_transaction_limit_cents) {
      throw new Error(
        `Amount $${(amountCents / 100).toFixed(2)} exceeds per-transaction limit of $${(source.per_transaction_limit_cents / 100).toFixed(2)}`
      );
    }

    // Check daily limit
    if (source.daily_limit_cents && (dailyUsed + amountCents) > source.daily_limit_cents) {
      throw new Error(
        `Amount would exceed daily limit of $${(source.daily_limit_cents / 100).toFixed(2)}. Used today: $${(dailyUsed / 100).toFixed(2)}`
      );
    }

    // Check monthly limit
    if (source.monthly_limit_cents && (monthlyUsed + amountCents) > source.monthly_limit_cents) {
      throw new Error(
        `Amount would exceed monthly limit of $${(source.monthly_limit_cents / 100).toFixed(2)}. Used this month: $${(monthlyUsed / 100).toFixed(2)}`
      );
    }
  }

  // ============================================
  // Fee Calculation
  // ============================================

  private async calculateFees(
    tenantId: string,
    source: FundingSource,
    amountCents: number,
    currency: string
  ): Promise<{ provider_fee_cents: number; platform_fee_cents: number; total_fee_cents: number }> {
    // Look for tenant-specific fee config first, then global
    const { data: configs } = await this.supabase
      .from('funding_fee_configs')
      .select('*')
      .eq('provider', source.provider)
      .eq('source_type', source.type)
      .eq('currency', currency)
      .eq('is_active', true)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('tenant_id', { ascending: false, nullsFirst: false }); // Tenant-specific first

    const config = configs?.[0];
    if (!config) {
      return { provider_fee_cents: 0, platform_fee_cents: 0, total_fee_cents: 0 };
    }

    // Check fee waiver
    if (config.fee_waiver_active) {
      if (!config.fee_waiver_expires_at || new Date(config.fee_waiver_expires_at) > new Date()) {
        return { provider_fee_cents: 0, platform_fee_cents: 0, total_fee_cents: 0 };
      }
    }

    // Calculate provider fee
    let providerFee = Math.round(amountCents * (config.percentage_fee / 100)) + config.fixed_fee_cents;
    if (config.min_fee_cents) providerFee = Math.max(providerFee, config.min_fee_cents);
    if (config.max_fee_cents) providerFee = Math.min(providerFee, config.max_fee_cents);

    // Calculate platform fee
    const platformFee = Math.round(amountCents * (config.platform_percentage_fee / 100)) + config.platform_fixed_fee_cents;

    return {
      provider_fee_cents: providerFee,
      platform_fee_cents: platformFee,
      total_fee_cents: providerFee + platformFee,
    };
  }

  /**
   * Estimate fees for a potential funding (public method for quotes)
   */
  async estimateFees(
    tenantId: string,
    sourceId: string,
    amountCents: number,
    currency: string
  ): Promise<{
    provider_fee_cents: number;
    platform_fee_cents: number;
    total_fee_cents: number;
    net_amount_cents: number;
  }> {
    const source = await this.getSource(tenantId, sourceId);
    const fees = await this.calculateFees(tenantId, source, amountCents, currency);

    return {
      ...fees,
      net_amount_cents: amountCents - fees.total_fee_cents,
    };
  }

  // ============================================
  // Webhook Processing
  // ============================================

  /**
   * Process an incoming provider webhook
   */
  async processWebhook(
    providerName: FundingProviderName,
    sourceType: FundingSourceType,
    payload: unknown,
    signature: string,
    headers?: Record<string, string>
  ): Promise<{ processed: boolean; event_type: string }> {
    const provider = this.getProvider(providerName, sourceType);
    const event = await provider.parseWebhook(payload, signature, headers);

    // Update transaction status if applicable
    if (event.provider_transaction_id && event.status) {
      const { data: transaction } = await this.supabase
        .from('funding_transactions')
        .select('id, tenant_id')
        .eq('provider_transaction_id', event.provider_transaction_id)
        .single();

      if (transaction) {
        await this.updateTransactionStatus(transaction.tenant_id, transaction.id, event.status, {
          provider_metadata: event.metadata,
        });
      }
    }

    // Update source status if applicable
    if (event.provider_id && event.source_status) {
      await this.supabase
        .from('funding_sources')
        .update({ status: event.source_status })
        .eq('provider_id', event.provider_id);
    }

    return { processed: true, event_type: event.event_type };
  }
}

// ============================================
// Factory
// ============================================

export function createFundingOrchestrator(supabase: SupabaseClient): FundingOrchestrator {
  return new FundingOrchestrator(supabase);
}
