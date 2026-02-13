/**
 * Funding Types
 * Epic 41: On-Ramp Integrations & Funding Sources
 *
 * Core type definitions for funding sources, transactions, and providers.
 */

// ============================================
// Enums
// ============================================

export type FundingSourceType =
  | 'card'
  | 'bank_account_us'
  | 'bank_account_eu'
  | 'bank_account_latam'
  | 'crypto_wallet';

export type FundingSourceStatus =
  | 'pending'
  | 'verifying'
  | 'active'
  | 'failed'
  | 'suspended'
  | 'removed';

export type FundingTransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type FundingProvider =
  | 'stripe'
  | 'plaid'
  | 'belvo'
  | 'moonpay'
  | 'transak'
  | 'circle';

// ============================================
// Database Records
// ============================================

export interface FundingSource {
  id: string;
  tenant_id: string;
  account_id: string;
  type: FundingSourceType;
  provider: FundingProvider;
  status: FundingSourceStatus;
  verified_at: string | null;
  display_name: string | null;
  last_four: string | null;
  brand: string | null;
  provider_id: string;
  provider_metadata: Record<string, unknown>;
  supported_currencies: string[];
  daily_limit_cents: number | null;
  monthly_limit_cents: number | null;
  per_transaction_limit_cents: number | null;
  daily_used_cents: number;
  monthly_used_cents: number;
  daily_reset_at: string;
  monthly_reset_at: string;
  last_used_at: string | null;
  total_funded_cents: number;
  funding_count: number;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
}

export interface FundingTransaction {
  id: string;
  tenant_id: string;
  funding_source_id: string;
  account_id: string;
  amount_cents: number;
  currency: string;
  converted_amount_cents: number | null;
  exchange_rate: number | null;
  conversion_currency: string;
  status: FundingTransactionStatus;
  failure_reason: string | null;
  provider: string;
  provider_transaction_id: string | null;
  provider_metadata: Record<string, unknown>;
  provider_fee_cents: number;
  platform_fee_cents: number;
  conversion_fee_cents: number;
  total_fee_cents: number;
  idempotency_key: string | null;
  initiated_at: string;
  processing_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundingFeeConfig {
  id: string;
  tenant_id: string | null;
  provider: string;
  source_type: FundingSourceType;
  currency: string;
  percentage_fee: number;
  fixed_fee_cents: number;
  min_fee_cents: number;
  max_fee_cents: number | null;
  platform_percentage_fee: number;
  platform_fixed_fee_cents: number;
  fee_waiver_active: boolean;
  fee_waiver_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateFundingSourceParams {
  account_id: string;
  type: FundingSourceType;
  provider: FundingProvider;
  /** Provider-specific setup token/data */
  setup_token?: string;
  /** For Plaid public_token exchange */
  public_token?: string;
  /** For Belvo link_id */
  link_id?: string;
  /** For direct wallet addresses */
  wallet_address?: string;
  /** For crypto wallet: blockchain network */
  network?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyFundingSourceParams {
  source_id: string;
  /** For micro-deposit verification */
  amounts?: number[];
  /** For Plaid re-auth */
  public_token?: string;
}

export interface InitiateFundingParams {
  source_id: string;
  amount_cents: number;
  currency: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}

export interface FundingQuote {
  source_id: string;
  amount_cents: number;
  currency: string;
  converted_amount_cents: number;
  conversion_currency: string;
  exchange_rate: number;
  fees: FeeBreakdown;
  net_amount_cents: number;
  estimated_completion: string;
  expires_at: string;
}

export interface FeeBreakdown {
  provider_fee_cents: number;
  platform_fee_cents: number;
  conversion_fee_cents: number;
  total_fee_cents: number;
}

// ============================================
// Provider Types
// ============================================

export interface ProviderSourceResult {
  provider_id: string;
  status: FundingSourceStatus;
  display_name?: string;
  last_four?: string;
  brand?: string;
  supported_currencies?: string[];
  provider_metadata?: Record<string, unknown>;
  /** If client-side confirmation is needed */
  client_secret?: string;
  /** If widget URL is needed */
  widget_url?: string;
}

export interface ProviderVerificationResult {
  verified: boolean;
  status: FundingSourceStatus;
  failure_reason?: string;
  provider_metadata?: Record<string, unknown>;
}

export interface ProviderFundingResult {
  provider_transaction_id: string;
  status: FundingTransactionStatus;
  provider_fee_cents: number;
  estimated_completion?: string;
  provider_metadata?: Record<string, unknown>;
  /** If client-side action is needed (3DS, redirect) */
  client_secret?: string;
  redirect_url?: string;
}

export interface ProviderFundingStatus {
  provider_transaction_id: string;
  status: FundingTransactionStatus;
  failure_reason?: string;
  completed_at?: string;
  provider_metadata?: Record<string, unknown>;
}

export interface ProviderWebhookEvent {
  event_type: string;
  provider_id: string;
  provider_transaction_id?: string;
  status?: FundingTransactionStatus;
  source_status?: FundingSourceStatus;
  metadata?: Record<string, unknown>;
}

// ============================================
// Widget Types
// ============================================

export interface WidgetParams {
  account_id: string;
  amount_cents?: number;
  currency?: string;
  redirect_url?: string;
  metadata?: Record<string, unknown>;
}

export interface WidgetResult {
  widget_url: string;
  session_id: string;
  expires_at: string;
}
