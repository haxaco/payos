/**
 * Simulation Engine API Routes
 * 
 * Epic 28: Enables dry-run execution of any PayOS action before committing.
 * Critical for AI agents that need to preview actions before making decisions.
 * 
 * Endpoints:
 * - POST /v1/simulate - Create a simulation
 * - GET /v1/simulate/:id - Get simulation details
 * - POST /v1/simulate/:id/execute - Execute a validated simulation
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types.js';
import { ErrorCode } from '@payos/types';
import { createClient } from '../db/client.js';
import { getExchangeRate } from '@payos/utils';
import { createLimitService } from '../services/limits.js';

// Create supabase client
const supabase = createClient();

const app = new Hono<AppContext>();

// =============================================================================
// Types
// =============================================================================

export interface SimulationWarning {
  code: string;
  message: string;
  field?: string;
  threshold?: string;
  current?: string;
}

export interface SimulationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface TransferPreview {
  source: {
    account_id: string;
    account_name?: string;
    amount: string;
    currency: string;
    balance_before: string;
    balance_after: string;
  };
  destination: {
    account_id: string;
    account_name?: string;
    amount: string;
    currency: string;
  };
  fx?: {
    rate: string;
    spread: string;
    rate_locked: boolean;
    rate_expires_at?: string;
  };
  fees: {
    platform_fee: string;
    fx_fee: string;
    rail_fee: string;
    total: string;
    currency: string;
  };
  timing: {
    estimated_duration_seconds: number;
    estimated_arrival: string;
    rail: string;
  };
}

export interface RefundPreview {
  refund: {
    original_transfer_id: string;
    refund_amount: string;
    refund_currency: string;
    refund_type: 'full' | 'partial';
    reason?: string;
  };
  impact: {
    source_account: {
      id: string;
      name: string;
      balance_before: string;
      balance_after: string;
    };
    destination_account: {
      id: string;
      name: string;
      balance_before: string;
      balance_after: string;
    };
  };
  original_transfer: {
    amount: string;
    currency: string;
    already_refunded: string;
    remaining_refundable: string;
    transfer_date: string;
  };
  eligibility: {
    can_refund: boolean;
    window_expires?: string;
    reasons: string[];
  };
  timing: {
    estimated_duration_seconds: number;
    estimated_completion: string;
  };
}

export interface StreamPreview {
  stream: {
    rate_per_second: string;
    currency: string;
    duration_seconds: number;
    total_cost: string;
    cost_per_day: string;
    cost_per_month: string;
  };
  source: {
    account_id: string;
    account_name: string;
    balance_before: string;
    balance_after_immediate: string;
  };
  destination: {
    account_id: string;
    account_name: string;
  };
  projections: {
    one_day: { cost: string; balance_after: string; elapsed_seconds: number };
    seven_days: { cost: string; balance_after: string; elapsed_seconds: number };
    thirty_days: { cost: string; balance_after: string; elapsed_seconds: number };
    full_duration?: { cost: string; balance_after: string; elapsed_seconds: number };
  };
  runway: {
    current_balance: string;
    estimated_runway_days: number;
    estimated_runway_seconds: number;
    depletion_date: string;
    will_complete: boolean;
  };
  timing: {
    start_time: string;
    end_time: string;
    duration_days: number;
  };
}

export interface SimulationResult {
  simulation_id: string;
  status: 'pending' | 'completed' | 'failed' | 'executed' | 'expired';
  can_execute: boolean;
  preview: TransferPreview | null;
  warnings: SimulationWarning[];
  errors: SimulationError[];
  expires_at: string;
  execute_url: string;
}

export interface BatchSimulationItem {
  index: number;
  simulation_id?: string;
  status: 'pending' | 'completed' | 'failed';
  can_execute: boolean;
  preview: TransferPreview | null;
  warnings: SimulationWarning[];
  errors: SimulationError[];
}

export interface BatchSimulationResult {
  batch_id: string;
  total_count: number;
  successful: number;
  failed: number;
  can_execute_all: boolean;
  totals: {
    amount: Record<string, string>;
    fees: Record<string, string>;
  };
  simulations: BatchSimulationItem[];
  summary: {
    by_currency: Record<string, { count: number; total: string }>;
    by_rail: Record<string, { count: number; total: string }>;
  };
  expires_at: string;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const TransferPayloadSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format'),
  currency: z.string().default('USDC'),
  destination_currency: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const RefundPayloadSchema = z.object({
  transfer_id: z.string().uuid('Invalid transfer ID format'),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').optional(),
  reason: z.enum([
    'customer_request',
    'duplicate_payment',
    'fraud',
    'error',
    'other',
  ]).optional(),
  notes: z.string().max(500).optional(),
});

const StreamPayloadSchema = z.object({
  from_account_id: z.string().uuid('Invalid from_account_id format'),
  to_account_id: z.string().uuid('Invalid to_account_id format'),
  rate_per_second: z.string().regex(/^\d+(\.\d{1,18})?$/, 'Invalid rate format'),
  currency: z.string().default('USDC'),
  duration_seconds: z.number().positive('Duration must be positive').optional(),
  start_time: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
});

const SimulateRequestSchema = z.object({
  action: z.enum(['transfer', 'refund', 'stream']),
  payload: z.union([TransferPayloadSchema, RefundPayloadSchema, StreamPayloadSchema]),
});

const BatchSimulateRequestSchema = z.object({
  simulations: z.array(SimulateRequestSchema).min(1).max(1000),
  stop_on_first_error: z.boolean().optional().default(false),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate fees for a transfer
 * Based on the fee structure from quotes.ts
 */
interface FeeBreakdown {
  type: string;
  amount: number;
  description: string;
}

function calculateTransferFees(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  corridor?: string
): { total: number; breakdown: FeeBreakdown[] } {
  const breakdown: FeeBreakdown[] = [];
  
  // Platform fee (0.5%)
  const platformFee = amount * 0.005;
  breakdown.push({
    type: 'platform_fee',
    amount: Math.round(platformFee * 100) / 100,
    description: 'Platform fee (0.5%)',
  });
  
  // Cross-border fee if different currencies
  if (fromCurrency !== toCurrency) {
    const crossBorderFee = amount * 0.002; // 0.2%
    breakdown.push({
      type: 'cross_border_fee',
      amount: Math.round(crossBorderFee * 100) / 100,
      description: 'Cross-border fee (0.2%)',
    });
  }
  
  // Corridor-specific fees
  if (corridor === 'USD_BRL' || toCurrency === 'BRL') {
    const corridorFee = 1.50; // Flat fee for Brazil
    breakdown.push({
      type: 'corridor_fee',
      amount: corridorFee,
      description: 'Brazil corridor fee',
    });
  }
  
  const total = breakdown.reduce((sum, fee) => sum + fee.amount, 0);
  
  return {
    total: Math.round(total * 100) / 100,
    breakdown,
  };
}

/**
 * Determine payment rail and timing based on currencies
 */
function determineRailAndTiming(fromCurrency: string, toCurrency: string): {
  rail: string;
  estimatedDuration: number;
  description: string;
} {
  // Same currency or USD/USDC conversion
  if (fromCurrency === toCurrency || 
      (fromCurrency === 'USD' && toCurrency === 'USDC') ||
      (fromCurrency === 'USDC' && toCurrency === 'USD')) {
    return {
      rail: 'internal',
      estimatedDuration: 5,
      description: 'Internal transfer (instant)',
    };
  }

  // BRL - Use PIX
  if (toCurrency === 'BRL') {
    return {
      rail: 'pix',
      estimatedDuration: 120, // 2 minutes for realistic PIX
      description: 'PIX (Brazilian instant payments)',
    };
  }

  // MXN - Use SPEI
  if (toCurrency === 'MXN') {
    return {
      rail: 'spei',
      estimatedDuration: 180, // 3 minutes
      description: 'SPEI (Mexican instant transfers)',
    };
  }

  // ARS - Use Argentine rails
  if (toCurrency === 'ARS') {
    return {
      rail: 'cvu',
      estimatedDuration: 300, // 5 minutes
      description: 'CVU/Alias (Argentine transfers)',
    };
  }

  // COP - Use Colombian rails
  if (toCurrency === 'COP') {
    return {
      rail: 'pse',
      estimatedDuration: 600, // 10 minutes
      description: 'PSE (Colombian payments)',
    };
  }

  // Default to wire transfer
  return {
    rail: 'wire',
    estimatedDuration: 86400, // 24 hours
    description: 'International wire transfer',
  };
}

/**
 * Check if there are any rail delays or maintenance windows
 */
function checkRailStatus(rail: string, toCurrency: string): SimulationWarning | null {
  // Check for weekends/holidays for certain rails
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  // SPEI has maintenance windows
  if (rail === 'spei' && (hour < 6 || hour > 22)) {
    return {
      code: 'DESTINATION_RAIL_MAINTENANCE',
      message: 'SPEI has reduced availability during off-hours (10pm-6am)',
      field: 'destination_currency',
    };
  }

  // Wire transfers don't process on weekends
  if (rail === 'wire' && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return {
      code: 'DESTINATION_RAIL_WEEKEND',
      message: 'Wire transfers may be delayed on weekends',
      field: 'destination_currency',
    };
  }

  return null;
}

/**
 * Get today's transfer volume for an account
 */
async function getTodayTransferVolume(accountId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: transfers } = await supabase
    .from('transfers')
    .select('amount')
    .eq('from_account_id', accountId)
    .gte('created_at', today.toISOString());

  if (!transfers) return 0;

  return transfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
}

/**
 * Get this month's transfer volume for an account
 */
async function getMonthlyTransferVolume(accountId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: transfers } = await supabase
    .from('transfers')
    .select('amount')
    .eq('from_account_id', accountId)
    .gte('created_at', monthStart.toISOString());

  if (!transfers) return 0;

  return transfers.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
}

/**
 * Get account limits based on verification tier
 * Tier 0: $1,000 daily / $5,000 monthly / $500 per tx
 * Tier 1: $10,000 daily / $50,000 monthly / $5,000 per tx
 * Tier 2: $50,000 daily / $250,000 monthly / $25,000 per tx
 * Tier 3+: $100,000 daily / $1,000,000 monthly / $100,000 per tx
 */
function getAccountLimits(verificationTier: number): {
  perTransaction: number;
  daily: number;
  monthly: number;
} {
  switch (verificationTier) {
    case 0:
      return {
        perTransaction: 500,
        daily: 1000,
        monthly: 5000,
      };
    case 1:
      return {
        perTransaction: 5000,
        daily: 10000,
        monthly: 50000,
      };
    case 2:
      return {
        perTransaction: 25000,
        daily: 50000,
        monthly: 250000,
      };
    case 3:
    default:
      return {
        perTransaction: 100000,
        daily: 100000,
        monthly: 1000000,
      };
  }
}

/**
 * Simulate a transfer with full FX rate lookup, fee calculation, and validation
 * Story 28.2: Enhanced with proper rate lookup, limits checking, and sophisticated warnings
 */
async function simulateTransfer(
  tenantId: string,
  payload: z.infer<typeof TransferPayloadSchema>
): Promise<{ preview: TransferPreview | null; warnings: SimulationWarning[]; errors: SimulationError[]; canExecute: boolean }> {
  const warnings: SimulationWarning[] = [];
  const errors: SimulationError[] = [];

  // Fetch source account with relationships
  const { data: sourceAccount, error: sourceError } = await supabase
    .from('accounts')
    .select(`
      id, 
      name, 
      balance_available, 
      balance_total, 
      currency, 
      verification_status,
      verification_tier,
      type
    `)
    .eq('id', payload.from_account_id)
    .eq('tenant_id', tenantId)
    .single();

  if (sourceError || !sourceAccount) {
    errors.push({
      code: 'SOURCE_ACCOUNT_NOT_FOUND',
      message: 'Source account not found',
      field: 'from_account_id',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Fetch destination account
  const { data: destAccount, error: destError } = await supabase
    .from('accounts')
    .select('id, name, currency, verification_status, type')
    .eq('id', payload.to_account_id)
    .eq('tenant_id', tenantId)
    .single();

  if (destError || !destAccount) {
    errors.push({
      code: 'DESTINATION_ACCOUNT_NOT_FOUND',
      message: 'Destination account not found',
      field: 'to_account_id',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Check verification status
  if (sourceAccount.verification_status === 'suspended') {
    errors.push({
      code: 'SOURCE_ACCOUNT_SUSPENDED',
      message: 'Source account is suspended. Contact support to resolve.',
      field: 'from_account_id',
    });
  }

  if (destAccount.verification_status === 'suspended') {
    errors.push({
      code: 'DESTINATION_ACCOUNT_SUSPENDED',
      message: 'Destination account is suspended',
      field: 'to_account_id',
    });
  }

  // Check for compliance flags on source account
  const { data: complianceFlags } = await supabase
    .from('compliance_flags')
    .select('*')
    .eq('account_id', payload.from_account_id)
    .eq('status', 'active')
    .limit(1);

  if (complianceFlags && complianceFlags.length > 0) {
    const flag = complianceFlags[0];
    if (flag.severity === 'high' || flag.severity === 'critical') {
      errors.push({
        code: 'COMPLIANCE_BLOCK',
        message: `Transfer blocked due to compliance review: ${flag.flag_type}`,
        field: 'from_account_id',
        details: {
          flag_id: flag.id,
          flag_type: flag.flag_type,
          severity: flag.severity,
        },
      });
    } else {
      warnings.push({
        code: 'COMPLIANCE_FLAG',
        message: `Source account has a compliance flag: ${flag.flag_type}`,
        field: 'from_account_id',
      });
    }
  }

  const amount = parseFloat(payload.amount);
  const availableBalance = parseFloat(sourceAccount.balance_available?.toString() || '0');

  // Check balance sufficiency
  if (amount > availableBalance) {
    const shortfall = (amount - availableBalance).toFixed(2);
    errors.push({
      code: 'INSUFFICIENT_BALANCE',
      message: `Insufficient balance. Shortfall: ${shortfall} ${payload.currency}`,
      field: 'amount',
      details: {
        required: payload.amount,
        available: availableBalance.toFixed(2),
        shortfall,
      },
    });
  }

  // Determine currencies
  const sourceCurrency = payload.currency;
  const destCurrency = payload.destination_currency || destAccount.currency || 'USDC';
  const isCrossCurrency = sourceCurrency !== destCurrency;

  // Calculate fees using the proper fee structure
  const corridor = isCrossCurrency ? `${sourceCurrency}_${destCurrency}` : undefined;
  const feeCalculation = calculateTransferFees(amount, sourceCurrency, destCurrency, corridor);
  
  // Get FX rate if cross-currency
  let fxRate = 1.0;
  let fxSpread = '0%';
  let fxFeeAmount = 0;

  if (isCrossCurrency) {
    // Use standardized currency codes for FX lookup
    const effectiveFromCurrency = sourceCurrency === 'USDC' ? 'USD' : sourceCurrency;
    const effectiveToCurrency = destCurrency === 'USDC' ? 'USD' : destCurrency;
    
    fxRate = getExchangeRate(effectiveFromCurrency, effectiveToCurrency);
    
    // Calculate spread (0.35% for emerging markets)
    const spreadRate = ['BRL', 'MXN', 'ARS', 'COP'].includes(destCurrency) ? 0.0035 : 0.002;
    fxSpread = `${(spreadRate * 100).toFixed(2)}%`;
    fxFeeAmount = amount * spreadRate;
  }

  // Calculate total fees
  const totalFees = feeCalculation.total + fxFeeAmount;
  const netAmount = amount - totalFees;
  const destinationAmount = netAmount * fxRate;

  // Check if amount would cause total + fees to exceed balance
  if (amount + totalFees > availableBalance && amount <= availableBalance) {
    warnings.push({
      code: 'FEES_WILL_OVERDRAW',
      message: `Transfer amount plus fees (${totalFees.toFixed(2)}) exceeds available balance`,
      threshold: availableBalance.toFixed(2),
      current: (amount + totalFees).toFixed(2),
    });
  }

  // Determine rail and timing
  const railInfo = determineRailAndTiming(sourceCurrency, destCurrency);

  // Check for rail delays
  const railWarning = checkRailStatus(railInfo.rail, destCurrency);
  if (railWarning) {
    warnings.push(railWarning);
  }

  // Calculate balance after transfer
  const balanceAfter = availableBalance - amount;

  // Add low balance warning
  if (balanceAfter < 100 && balanceAfter >= 0) {
    warnings.push({
      code: 'LOW_BALANCE_AFTER',
      message: 'Balance will be below $100 after this transfer',
      threshold: '100.00',
      current: balanceAfter.toFixed(2),
    });
  }

  // Check for large transfer warning
  if (amount > 10000) {
    warnings.push({
      code: 'LARGE_TRANSFER',
      message: 'This transfer is unusually large and may trigger compliance review',
      threshold: '10000.00',
      current: payload.amount,
    });
  }

  // Get account limits based on verification tier
  const accountLimits = getAccountLimits(sourceAccount.verification_tier || 0);

  // Check per-transaction limit
  if (amount > accountLimits.perTransaction) {
    errors.push({
      code: 'LIMIT_EXCEEDED',
      message: `Transfer amount exceeds per-transaction limit of ${accountLimits.perTransaction} for verification tier ${sourceAccount.verification_tier}`,
      field: 'amount',
      details: {
        limit_type: 'per_transaction',
        limit: accountLimits.perTransaction.toString(),
        requested: amount.toString(),
        verification_tier: sourceAccount.verification_tier,
      },
    });
  }

  // Check daily velocity
  const todayVolume = await getTodayTransferVolume(payload.from_account_id);
  
  if (todayVolume + amount > accountLimits.daily * 0.8) {
    warnings.push({
      code: 'APPROACHING_DAILY_LIMIT',
      message: `Transfer will use ${Math.round(((todayVolume + amount) / accountLimits.daily) * 100)}% of daily limit`,
      threshold: accountLimits.daily.toString(),
      current: (todayVolume + amount).toFixed(2),
    });
  }

  if (todayVolume + amount > accountLimits.daily) {
    errors.push({
      code: 'LIMIT_EXCEEDED',
      message: `Transfer would exceed daily limit of ${accountLimits.daily}`,
      field: 'amount',
      details: {
        limit_type: 'daily',
        limit: accountLimits.daily.toString(),
        current_usage: todayVolume.toFixed(2),
        requested: amount.toString(),
        remaining: Math.max(0, accountLimits.daily - todayVolume).toFixed(2),
        verification_tier: sourceAccount.verification_tier,
      },
    });
  }

  // Check monthly velocity
  const monthlyVolume = await getMonthlyTransferVolume(payload.from_account_id);
  
  if (monthlyVolume + amount > accountLimits.monthly * 0.8) {
    warnings.push({
      code: 'APPROACHING_MONTHLY_LIMIT',
      message: `Transfer will use ${Math.round(((monthlyVolume + amount) / accountLimits.monthly) * 100)}% of monthly limit`,
      threshold: accountLimits.monthly.toString(),
      current: (monthlyVolume + amount).toFixed(2),
    });
  }

  if (monthlyVolume + amount > accountLimits.monthly) {
    errors.push({
      code: 'LIMIT_EXCEEDED',
      message: `Transfer would exceed monthly limit of ${accountLimits.monthly}`,
      field: 'amount',
      details: {
        limit_type: 'monthly',
        limit: accountLimits.monthly.toString(),
        current_usage: monthlyVolume.toFixed(2),
        requested: amount.toString(),
        remaining: Math.max(0, accountLimits.monthly - monthlyVolume).toFixed(2),
        verification_tier: sourceAccount.verification_tier,
      },
    });
  }

  // Suggest KYB upgrade if hitting limits
  if (sourceAccount.verification_tier < 2 && (
    amount > accountLimits.perTransaction * 0.8 ||
    todayVolume + amount > accountLimits.daily * 0.8 ||
    monthlyVolume + amount > accountLimits.monthly * 0.8
  )) {
    warnings.push({
      code: 'KYB_UPGRADE_RECOMMENDED',
      message: `Consider upgrading to verification tier ${sourceAccount.verification_tier + 1} for higher limits`,
      field: 'from_account_id',
    });
  }

  // Check for FX rate warnings (simplified - would compare to 24h average in production)
  if (isCrossCurrency) {
    // Simulate checking if rate is 2% worse than recent average
    const mockHistoricalRate = fxRate * 1.015; // Simulate slightly better historical rate
    if (fxRate < mockHistoricalRate * 0.98) {
      warnings.push({
        code: 'FX_RATE_WORSE_THAN_RECENT',
        message: `Current FX rate is ~${(((mockHistoricalRate - fxRate) / mockHistoricalRate) * 100).toFixed(1)}% worse than recent average`,
        field: 'destination_currency',
      });
    }
  }

  // Build preview object
  const preview: TransferPreview = {
    source: {
      account_id: sourceAccount.id,
      account_name: sourceAccount.name,
      amount: payload.amount,
      currency: sourceCurrency,
      balance_before: availableBalance.toFixed(2),
      balance_after: balanceAfter.toFixed(2),
    },
    destination: {
      account_id: destAccount.id,
      account_name: destAccount.name,
      amount: destinationAmount.toFixed(2),
      currency: destCurrency,
    },
    fx: isCrossCurrency ? {
      rate: fxRate.toFixed(4),
      spread: fxSpread,
      rate_locked: false,
      rate_expires_at: undefined,
    } : undefined,
    fees: {
      platform_fee: feeCalculation.breakdown.find(f => f.type === 'platform_fee')?.amount.toFixed(2) || '0.00',
      fx_fee: fxFeeAmount.toFixed(2),
      rail_fee: feeCalculation.breakdown.find(f => f.type === 'corridor_fee')?.amount.toFixed(2) || '0.00',
      total: totalFees.toFixed(2),
      currency: sourceCurrency,
    },
    timing: {
      estimated_duration_seconds: railInfo.estimatedDuration,
      estimated_arrival: new Date(Date.now() + railInfo.estimatedDuration * 1000).toISOString(),
      rail: railInfo.rail,
    },
  };

  return {
    preview,
    warnings,
    errors,
    canExecute: errors.length === 0,
  };
}

// =============================================================================
// Routes
// =============================================================================

/**
 * Simulate a refund
 * Story 28.5: Refund Simulation
 */
async function simulateRefund(
  tenantId: string,
  payload: z.infer<typeof RefundPayloadSchema>
): Promise<{ preview: RefundPreview | null; warnings: SimulationWarning[]; errors: SimulationError[]; canExecute: boolean }> {
  const warnings: SimulationWarning[] = [];
  const errors: SimulationError[] = [];

  // Fetch the original transfer
  const { data: originalTransfer, error: transferError } = await supabase
    .from('transfers')
    .select('*')
    .eq('id', payload.transfer_id)
    .eq('tenant_id', tenantId)
    .single();

  if (transferError || !originalTransfer) {
    errors.push({
      code: 'TRANSFER_NOT_FOUND',
      message: 'Original transfer not found',
      field: 'transfer_id',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Check transfer status
  const refundableStatuses = ['completed', 'processing'];
  if (!refundableStatuses.includes(originalTransfer.status)) {
    errors.push({
      code: 'TRANSFER_NOT_REFUNDABLE',
      message: `Transfer status '${originalTransfer.status}' is not refundable`,
      field: 'transfer_id',
      details: {
        current_status: originalTransfer.status,
        refundable_statuses: refundableStatuses,
      },
    });
  }

  // Calculate already refunded amount
  const { data: existingRefunds } = await supabase
    .from('refunds')
    .select('amount')
    .eq('original_transfer_id', payload.transfer_id)
    .eq('status', 'completed');

  const alreadyRefunded = existingRefunds?.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0) || 0;
  const originalAmount = parseFloat(originalTransfer.amount);
  const remainingRefundable = originalAmount - alreadyRefunded;

  // Determine refund amount
  const refundAmount = payload.amount ? parseFloat(payload.amount) : remainingRefundable;

  // Check if amount exceeds refundable
  if (refundAmount > remainingRefundable) {
    errors.push({
      code: 'REFUND_AMOUNT_EXCEEDS_AVAILABLE',
      message: `Refund amount exceeds remaining refundable amount`,
      field: 'amount',
      details: {
        requested: refundAmount.toFixed(2),
        available: remainingRefundable.toFixed(2),
        already_refunded: alreadyRefunded.toFixed(2),
        original_amount: originalAmount.toFixed(2),
      },
    });
  }

  // Check refund window (30 days)
  const transferDate = new Date(originalTransfer.created_at);
  const windowExpires = new Date(transferDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now > windowExpires) {
    errors.push({
      code: 'REFUND_WINDOW_EXPIRED',
      message: 'Refund window has expired (30 days)',
      field: 'transfer_id',
      details: {
        transfer_date: transferDate.toISOString(),
        window_expired: windowExpires.toISOString(),
      },
    });
  }

  // Fetch source and destination accounts
  const { data: sourceAccount } = await supabase
    .from('accounts')
    .select('id, name, balance_available, currency')
    .eq('id', originalTransfer.from_account_id)
    .single();

  const { data: destAccount } = await supabase
    .from('accounts')
    .select('id, name, balance_available, currency')
    .eq('id', originalTransfer.to_account_id)
    .single();

  if (!sourceAccount || !destAccount) {
    errors.push({
      code: 'ACCOUNT_NOT_FOUND',
      message: 'Source or destination account not found',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Check if destination has sufficient balance for refund
  const destBalance = parseFloat(destAccount.balance_available || '0');
  if (destBalance < refundAmount) {
    errors.push({
      code: 'DESTINATION_INSUFFICIENT_BALANCE',
      message: 'Destination account has insufficient balance for refund',
      details: {
        required: refundAmount.toFixed(2),
        available: destBalance.toFixed(2),
        shortfall: (refundAmount - destBalance).toFixed(2),
      },
    });
  }

  // Check if fully refunded
  if (alreadyRefunded >= originalAmount) {
    errors.push({
      code: 'TRANSFER_FULLY_REFUNDED',
      message: 'Transfer has already been fully refunded',
      details: {
        original_amount: originalAmount.toFixed(2),
        already_refunded: alreadyRefunded.toFixed(2),
      },
    });
  }

  // Warnings
  if (refundAmount > originalAmount * 0.5 && refundAmount < originalAmount) {
    warnings.push({
      code: 'LARGE_PARTIAL_REFUND',
      message: 'Refunding more than 50% of original amount',
      details: {
        refund_amount: refundAmount.toFixed(2),
        original_amount: originalAmount.toFixed(2),
        percentage: ((refundAmount / originalAmount) * 100).toFixed(1) + '%',
      },
    });
  }

  if (windowExpires.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
    warnings.push({
      code: 'REFUND_WINDOW_EXPIRING',
      message: 'Refund window expires in less than 7 days',
      details: {
        expires_at: windowExpires.toISOString(),
        days_remaining: Math.ceil((windowExpires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      },
    });
  }

  // Build preview
  const sourceBalanceBefore = parseFloat(sourceAccount.balance_available || '0');
  const sourceBalanceAfter = sourceBalanceBefore + refundAmount;
  const destBalanceBefore = destBalance;
  const destBalanceAfter = destBalanceBefore - refundAmount;

  const refundType = refundAmount >= originalAmount ? 'full' : 'partial';

  const preview: RefundPreview = {
    refund: {
      original_transfer_id: payload.transfer_id,
      refund_amount: refundAmount.toFixed(2),
      refund_currency: originalTransfer.currency,
      refund_type: refundType,
      reason: payload.reason,
    },
    impact: {
      source_account: {
        id: sourceAccount.id,
        name: sourceAccount.name,
        balance_before: sourceBalanceBefore.toFixed(2),
        balance_after: sourceBalanceAfter.toFixed(2),
      },
      destination_account: {
        id: destAccount.id,
        name: destAccount.name,
        balance_before: destBalanceBefore.toFixed(2),
        balance_after: destBalanceAfter.toFixed(2),
      },
    },
    original_transfer: {
      amount: originalAmount.toFixed(2),
      currency: originalTransfer.currency,
      already_refunded: alreadyRefunded.toFixed(2),
      remaining_refundable: remainingRefundable.toFixed(2),
      transfer_date: transferDate.toISOString(),
    },
    eligibility: {
      can_refund: errors.length === 0,
      window_expires: windowExpires.toISOString(),
      reasons: errors.map(e => e.message),
    },
    timing: {
      estimated_duration_seconds: 5, // Refunds are typically instant
      estimated_completion: new Date(Date.now() + 5000).toISOString(),
    },
  };

  return {
    preview,
    warnings,
    errors,
    canExecute: errors.length === 0,
  };
}

/**
 * Simulate a stream
 * Story 28.6: Stream Simulation with Cost Projection
 */
async function simulateStream(
  tenantId: string,
  payload: z.infer<typeof StreamPayloadSchema>
): Promise<{ preview: StreamPreview | null; warnings: SimulationWarning[]; errors: SimulationError[]; canExecute: boolean }> {
  const warnings: SimulationWarning[] = [];
  const errors: SimulationError[] = [];

  // Fetch source account
  const { data: sourceAccount, error: sourceError } = await supabase
    .from('accounts')
    .select('id, name, balance_available, currency, verification_status')
    .eq('id', payload.from_account_id)
    .eq('tenant_id', tenantId)
    .single();

  if (sourceError || !sourceAccount) {
    errors.push({
      code: 'SOURCE_ACCOUNT_NOT_FOUND',
      message: 'Source account not found',
      field: 'from_account_id',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Fetch destination account
  const { data: destAccount, error: destError } = await supabase
    .from('accounts')
    .select('id, name, verification_status')
    .eq('id', payload.to_account_id)
    .eq('tenant_id', tenantId)
    .single();

  if (destError || !destAccount) {
    errors.push({
      code: 'DESTINATION_ACCOUNT_NOT_FOUND',
      message: 'Destination account not found',
      field: 'to_account_id',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Check account statuses
  if (sourceAccount.verification_status === 'suspended') {
    errors.push({
      code: 'SOURCE_ACCOUNT_SUSPENDED',
      message: 'Source account is suspended',
      field: 'from_account_id',
    });
  }

  if (destAccount.verification_status === 'suspended') {
    errors.push({
      code: 'DESTINATION_ACCOUNT_SUSPENDED',
      message: 'Destination account is suspended',
      field: 'to_account_id',
    });
  }

  const ratePerSecond = parseFloat(payload.rate_per_second);
  const currentBalance = parseFloat(sourceAccount.balance_available || '0');
  const durationSeconds = payload.duration_seconds || 0;

  // Calculate costs
  const totalCost = durationSeconds > 0 ? ratePerSecond * durationSeconds : 0;
  const costPerDay = ratePerSecond * 86400; // 24 * 60 * 60
  const costPerMonth = ratePerSecond * 2592000; // 30 * 24 * 60 * 60

  // Validate that initial funding (total cost) doesn't exceed available balance
  if (durationSeconds > 0 && totalCost > currentBalance) {
    errors.push({
      code: 'INSUFFICIENT_BALANCE_FOR_FUNDING',
      message: `Initial funding amount ($${totalCost.toFixed(2)}) exceeds available balance ($${currentBalance.toFixed(2)})`,
      field: 'duration_seconds',
      details: {
        funding_required: totalCost.toFixed(2),
        available: currentBalance.toFixed(2),
        shortfall: (totalCost - currentBalance).toFixed(2),
      },
    });
  }

  // Validate that monthly flow rate isn't too high relative to balance
  if (costPerMonth > currentBalance && currentBalance > 0) {
    const affordableMonths = (currentBalance / costPerMonth).toFixed(2);
    warnings.push({
      code: 'FLOW_RATE_EXCEEDS_BALANCE',
      message: `Monthly flow rate ($${costPerMonth.toFixed(2)}) exceeds current balance ($${currentBalance.toFixed(2)}). Stream will only run for ${affordableMonths} months.`,
      details: {
        monthly_cost: costPerMonth.toFixed(2),
        current_balance: currentBalance.toFixed(2),
        affordable_months: affordableMonths,
      },
    });
  }

  // Calculate runway (how long until balance depleted)
  const runwaySeconds = ratePerSecond > 0 ? currentBalance / ratePerSecond : Infinity;
  const runwayDays = runwaySeconds / 86400;
  const depletionDate = new Date(Date.now() + runwaySeconds * 1000);

  // Check if stream will complete before balance depleted
  const willComplete = durationSeconds === 0 || totalCost <= currentBalance;

  // Projections at different time intervals
  const projections = {
    one_day: {
      cost: Math.min(costPerDay, totalCost).toFixed(2),
      balance_after: Math.max(0, currentBalance - Math.min(costPerDay, totalCost)).toFixed(2),
      elapsed_seconds: Math.min(86400, durationSeconds || 86400),
    },
    seven_days: {
      cost: Math.min(costPerDay * 7, totalCost).toFixed(2),
      balance_after: Math.max(0, currentBalance - Math.min(costPerDay * 7, totalCost)).toFixed(2),
      elapsed_seconds: Math.min(604800, durationSeconds || 604800),
    },
    thirty_days: {
      cost: Math.min(costPerMonth, totalCost).toFixed(2),
      balance_after: Math.max(0, currentBalance - Math.min(costPerMonth, totalCost)).toFixed(2),
      elapsed_seconds: Math.min(2592000, durationSeconds || 2592000),
    },
  };

  // Add full duration projection if specified
  if (durationSeconds > 0) {
    projections.full_duration = {
      cost: totalCost.toFixed(2),
      balance_after: Math.max(0, currentBalance - totalCost).toFixed(2),
      elapsed_seconds: durationSeconds,
    };
  }

  // Errors
  if (durationSeconds > 0 && totalCost > currentBalance) {
    errors.push({
      code: 'INSUFFICIENT_BALANCE_FOR_DURATION',
      message: 'Insufficient balance to complete full stream duration',
      details: {
        required: totalCost.toFixed(2),
        available: currentBalance.toFixed(2),
        shortfall: (totalCost - currentBalance).toFixed(2),
        will_run_for_seconds: runwaySeconds.toFixed(0),
        will_run_for_days: runwayDays.toFixed(2),
      },
    });
  }

  // Warnings
  if (runwayDays < 7 && runwayDays > 0) {
    warnings.push({
      code: 'LOW_RUNWAY',
      message: 'Stream will deplete balance in less than 7 days',
      details: {
        runway_days: runwayDays.toFixed(2),
        depletion_date: depletionDate.toISOString(),
      },
    });
  }

  if (costPerDay > currentBalance * 0.1) {
    warnings.push({
      code: 'HIGH_DAILY_COST',
      message: 'Daily cost exceeds 10% of current balance',
      details: {
        daily_cost: costPerDay.toFixed(2),
        current_balance: currentBalance.toFixed(2),
        percentage: ((costPerDay / currentBalance) * 100).toFixed(1) + '%',
      },
    });
  }

  if (ratePerSecond < 0.000001) {
    warnings.push({
      code: 'VERY_LOW_RATE',
      message: 'Stream rate is very low (< $0.000001/second)',
      details: {
        rate_per_second: ratePerSecond.toFixed(18),
        cost_per_day: costPerDay.toFixed(6),
      },
    });
  }

  const startTime = payload.start_time ? new Date(payload.start_time) : new Date();
  const endTime = durationSeconds > 0 
    ? new Date(startTime.getTime() + durationSeconds * 1000)
    : new Date(startTime.getTime() + runwaySeconds * 1000);

  const preview: StreamPreview = {
    stream: {
      rate_per_second: ratePerSecond.toFixed(18),
      currency: payload.currency,
      duration_seconds: durationSeconds,
      total_cost: totalCost.toFixed(2),
      cost_per_day: costPerDay.toFixed(2),
      cost_per_month: costPerMonth.toFixed(2),
    },
    source: {
      account_id: sourceAccount.id,
      account_name: sourceAccount.name,
      balance_before: currentBalance.toFixed(2),
      balance_after_immediate: currentBalance.toFixed(2), // No immediate deduction
    },
    destination: {
      account_id: destAccount.id,
      account_name: destAccount.name,
    },
    projections,
    runway: {
      current_balance: currentBalance.toFixed(2),
      estimated_runway_days: Math.min(runwayDays, 365 * 10), // Cap at 10 years for display
      estimated_runway_seconds: Math.min(runwaySeconds, 365 * 10 * 86400),
      depletion_date: depletionDate.toISOString(),
      will_complete: willComplete,
    },
    timing: {
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_days: durationSeconds > 0 ? durationSeconds / 86400 : runwayDays,
    },
  };

  return {
    preview,
    warnings,
    errors,
    canExecute: errors.length === 0,
  };
}

/**
 * POST /v1/simulate
 * Create a new simulation
 */
app.post('/', async (c) => {
  const ctx = c.get('ctx');
  const tenantId = ctx?.tenantId;
  if (!tenantId) {
    throw Object.assign(new Error('Authentication required'), { 
      code: ErrorCode.UNAUTHORIZED 
    });
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { 
      code: ErrorCode.INVALID_REQUEST_FORMAT 
    });
  }

  const validation = SimulateRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Object.assign(new Error('Invalid request payload'), { 
      code: ErrorCode.VALIDATION_FAILED,
      details: {
        validation_errors: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      }
    });
  }

  const { action, payload } = validation.data;

  // Run simulation based on action type
  let result: { preview: any; warnings: SimulationWarning[]; errors: SimulationError[]; canExecute: boolean };

  if (action === 'transfer') {
    result = await simulateTransfer(tenantId, payload as z.infer<typeof TransferPayloadSchema>);
  } else if (action === 'refund') {
    // Story 28.5: Refund Simulation
    result = await simulateRefund(tenantId, payload as z.infer<typeof RefundPayloadSchema>);
  } else if (action === 'stream') {
    // Story 28.6: Stream Simulation
    result = await simulateStream(tenantId, payload as z.infer<typeof StreamPayloadSchema>);
  } else {
    throw Object.assign(new Error(`Unknown action type: ${action}`), { 
      code: ErrorCode.INVALID_REQUEST_FORMAT
    });
  }

  // Store simulation in database
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const { data: simulation, error: insertError } = await supabase
    .from('simulations')
    .insert({
      tenant_id: tenantId,
      action_type: action,
      action_payload: payload,
      status: result.errors.length > 0 ? 'failed' : 'completed',
      can_execute: result.canExecute,
      preview: result.preview,
      warnings: result.warnings,
      errors: result.errors,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError || !simulation) {
    console.error('Failed to store simulation:', insertError);
    throw Object.assign(new Error('Failed to create simulation'), { 
      code: ErrorCode.INTERNAL_ERROR 
    });
  }

  const response: SimulationResult = {
    simulation_id: simulation.id,
    status: simulation.status,
    can_execute: simulation.can_execute,
    preview: simulation.preview,
    warnings: simulation.warnings as SimulationWarning[],
    errors: simulation.errors as SimulationError[],
    expires_at: simulation.expires_at,
    execute_url: `/v1/simulate/${simulation.id}/execute`,
  };

  return c.json(response, 201);
});

/**
 * GET /v1/simulate/:id
 * Get simulation details
 */
app.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const tenantId = ctx?.tenantId;
  if (!tenantId) {
    throw Object.assign(new Error('Authentication required'), { 
      code: ErrorCode.UNAUTHORIZED 
    });
  }

  const simulationId = c.req.param('id');

  const { data: simulation, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', simulationId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !simulation) {
    throw Object.assign(new Error('Simulation not found'), { 
      code: ErrorCode.SIMULATION_NOT_FOUND,
      details: { simulation_id: simulationId }
    });
  }

  // Check if expired
  const isExpired = new Date(simulation.expires_at) < new Date();
  if (isExpired && simulation.status !== 'executed' && simulation.status !== 'expired') {
    // Update status to expired
    await supabase
      .from('simulations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', simulationId);
    simulation.status = 'expired';
    simulation.can_execute = false;
  }

  const response: SimulationResult = {
    simulation_id: simulation.id,
    status: simulation.status,
    can_execute: simulation.can_execute && !isExpired,
    preview: simulation.preview,
    warnings: simulation.warnings as SimulationWarning[],
    errors: simulation.errors as SimulationError[],
    expires_at: simulation.expires_at,
    execute_url: `/v1/simulate/${simulation.id}/execute`,
  };

  return c.json(response);
});

/**
 * Calculate variance between simulated and actual execution
 * Story 28.4: Variance Tracking
 */
function calculateVariance(
  originalPreview: TransferPreview,
  currentPreview: TransferPreview,
  executionStartTime: number,
  executionEndTime: number
): Record<string, any> {
  const variance: Record<string, any> = {};

  // FX Rate variance
  if (originalPreview.fx && currentPreview.fx) {
    const originalRate = parseFloat(originalPreview.fx.rate);
    const currentRate = parseFloat(currentPreview.fx.rate);
    const rateChange = ((currentRate - originalRate) / originalRate) * 100;
    
    variance.fx_rate_change = rateChange >= 0 
      ? `+${rateChange.toFixed(2)}%` 
      : `${rateChange.toFixed(2)}%`;
    variance.fx_rate_original = originalRate.toFixed(4);
    variance.fx_rate_actual = currentRate.toFixed(4);
  } else {
    variance.fx_rate_change = '0%';
  }

  // Fee variance
  const originalFees = parseFloat(originalPreview.fees.total);
  const currentFees = parseFloat(currentPreview.fees.total);
  const feeChange = currentFees - originalFees;
  
  variance.fee_change = feeChange >= 0 
    ? `+${feeChange.toFixed(2)}` 
    : `${feeChange.toFixed(2)}`;
  variance.fee_original = originalFees.toFixed(2);
  variance.fee_actual = currentFees.toFixed(2);

  // Destination amount variance
  const originalDestAmount = parseFloat(originalPreview.destination.amount);
  const currentDestAmount = parseFloat(currentPreview.destination.amount);
  const destAmountChange = currentDestAmount - originalDestAmount;
  
  variance.destination_amount_change = destAmountChange >= 0
    ? `+${destAmountChange.toFixed(2)}`
    : `${destAmountChange.toFixed(2)}`;
  variance.destination_amount_original = originalDestAmount.toFixed(2);
  variance.destination_amount_actual = currentDestAmount.toFixed(2);

  // Timing variance (compare estimated to actual execution time)
  const estimatedDuration = originalPreview.timing.estimated_duration_seconds;
  const actualExecutionTime = (executionEndTime - executionStartTime) / 1000; // Convert to seconds
  const timingChange = actualExecutionTime - estimatedDuration;
  
  variance.timing_change = timingChange >= 0
    ? `+${timingChange.toFixed(1)}s`
    : `${timingChange.toFixed(1)}s`;
  variance.timing_estimated = `${estimatedDuration}s`;
  variance.timing_actual = `${actualExecutionTime.toFixed(1)}s`;

  // Overall variance assessment
  const hasSignificantVariance = 
    Math.abs(feeChange) > 1 || 
    (originalPreview.fx && Math.abs(parseFloat(variance.fx_rate_change)) > 0.5);
  
  variance.has_significant_variance = hasSignificantVariance;
  variance.variance_level = hasSignificantVariance ? 'medium' : 'low';

  return variance;
}

/**
 * POST /v1/simulate/:id/execute
 * Execute a validated simulation
 * Story 28.4: Enhanced with atomic execution and variance tracking
 */
app.post('/:id/execute', async (c) => {
  const ctx = c.get('ctx');
  const tenantId = ctx?.tenantId;
  if (!tenantId) {
    throw Object.assign(new Error('Authentication required'), { 
      code: ErrorCode.UNAUTHORIZED 
    });
  }

  const simulationId = c.req.param('id');

  // Get simulation with row-level lock to prevent race conditions
  const { data: simulation, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', simulationId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !simulation) {
    throw Object.assign(new Error('Simulation not found'), { 
      code: ErrorCode.SIMULATION_NOT_FOUND,
      details: { simulation_id: simulationId }
    });
  }

  // Check if already executed (idempotency)
  if (simulation.executed) {
    return c.json({
      simulation_id: simulation.id,
      status: 'executed',
      execution_result: {
        type: simulation.execution_result_type,
        id: simulation.execution_result_id,
      },
      variance: simulation.variance,
      message: 'Simulation was already executed',
    });
  }

  // Check if expired
  if (new Date(simulation.expires_at) < new Date()) {
    await supabase
      .from('simulations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', simulationId);

    throw Object.assign(new Error('Simulation has expired. Create a new simulation to proceed.'), { 
      code: ErrorCode.SIMULATION_EXPIRED,
      details: { 
        simulation_id: simulationId,
        expires_at: simulation.expires_at 
      }
    });
  }

  // Check if can execute
  if (!simulation.can_execute) {
    throw Object.assign(new Error('Simulation has errors and cannot be executed'), { 
      code: ErrorCode.SIMULATION_CANNOT_EXECUTE,
      details: { 
        simulation_id: simulationId,
        errors: simulation.errors 
      }
    });
  }

  // Story 28.4: Enhanced re-validation before execution
  const payload = simulation.action_payload as z.infer<typeof TransferPayloadSchema>;
  const originalPreview = simulation.preview as TransferPreview;
  const revalidation = await simulateTransfer(tenantId, payload);

  if (!revalidation.canExecute) {
    // Update simulation with new errors
    await supabase
      .from('simulations')
      .update({
        status: 'failed',
        can_execute: false,
        errors: revalidation.errors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', simulationId);

    throw Object.assign(new Error('Conditions have changed since simulation. Re-validate required.'), { 
      code: ErrorCode.SIMULATION_STALE,
      details: { 
        simulation_id: simulationId,
        errors: revalidation.errors,
        original_preview: originalPreview,
        current_preview: revalidation.preview,
      }
    });
  }

  // Check for significant variance in FX rate (>2% change)
  if (originalPreview.fx && revalidation.preview?.fx) {
    const originalRate = parseFloat(originalPreview.fx.rate);
    const currentRate = parseFloat(revalidation.preview.fx.rate);
    const rateChange = Math.abs((currentRate - originalRate) / originalRate);

    if (rateChange > 0.02) { // 2% threshold
      throw Object.assign(new Error('FX rate has changed significantly since simulation'), { 
        code: ErrorCode.SIMULATION_FX_VARIANCE_EXCEEDED,
        details: { 
          simulation_id: simulationId,
          original_rate: originalRate.toFixed(4),
          current_rate: currentRate.toFixed(4),
          change_percent: (rateChange * 100).toFixed(2) + '%',
          threshold: '2%',
        }
      });
    }
  }

  // Check for significant fee change (>$5 or >10%)
  const originalFees = parseFloat(originalPreview.fees.total);
  const currentFees = parseFloat(revalidation.preview?.fees.total || '0');
  const feeChange = Math.abs(currentFees - originalFees);
  const feeChangePercent = originalFees > 0 ? feeChange / originalFees : 0;

  if (feeChange > 5 || feeChangePercent > 0.10) {
    throw Object.assign(new Error('Fees have changed significantly since simulation'), { 
      code: ErrorCode.SIMULATION_FEE_VARIANCE_EXCEEDED,
      details: { 
        simulation_id: simulationId,
        original_fees: originalFees.toFixed(2),
        current_fees: currentFees.toFixed(2),
        change_amount: feeChange.toFixed(2),
        change_percent: (feeChangePercent * 100).toFixed(2) + '%',
      }
    });
  }

  // Story 28.4: Atomic execution with race condition prevention
  // First, atomically mark simulation as being executed
  const { data: lockResult, error: lockError } = await supabase
    .from('simulations')
    .update({
      status: 'executed',
      executed: true,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', simulationId)
    .eq('executed', false) // Only update if not already executed (atomic check)
    .select()
    .single();

  if (lockError || !lockResult) {
    // Another request already executed this simulation
    const { data: existingSim } = await supabase
      .from('simulations')
      .select('execution_result_id, execution_result_type, variance')
      .eq('id', simulationId)
      .single();

    if (existingSim?.execution_result_id) {
      return c.json({
        simulation_id: simulationId,
        status: 'executed',
        execution_result: {
          type: existingSim.execution_result_type || 'transfer',
          id: existingSim.execution_result_id,
          status: 'processing',
        },
        variance: existingSim.variance,
        message: 'Simulation was already executed',
      }, 200);
    }

    throw Object.assign(new Error('Failed to lock simulation for execution'), { 
      code: ErrorCode.INTERNAL_ERROR 
    });
  }

  // Execute the actual transfer
  const executionStartTime = Date.now();
  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .insert({
      tenant_id: tenantId,
      type: 'internal',
      status: 'processing',
      from_account_id: payload.from_account_id,
      to_account_id: payload.to_account_id,
      amount: payload.amount,
      currency: payload.currency,
      destination_currency: payload.destination_currency || payload.currency,
      description: payload.description,
      initiated_by_type: 'api_key',
      initiated_by_id: 'simulation',
      initiated_by_name: 'Simulation Engine',
      processing_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (transferError || !transfer) {
    console.error('Failed to create transfer from simulation:', transferError);
    
    // Rollback: Mark simulation as failed
    await supabase
      .from('simulations')
      .update({
        status: 'failed',
        executed: false,
        executed_at: null,
        errors: [{
          code: 'EXECUTION_FAILED',
          message: 'Failed to create transfer',
        }],
        updated_at: new Date().toISOString(),
      })
      .eq('id', simulationId);

    throw Object.assign(new Error('Failed to execute simulation'), { 
      code: ErrorCode.INTERNAL_ERROR 
    });
  }

  const executionEndTime = Date.now();

  // Story 28.4: Calculate actual variance
  const variance = calculateVariance(
    originalPreview,
    revalidation.preview!,
    executionStartTime,
    executionEndTime
  );

  // Update simulation with execution result and variance
  await supabase
    .from('simulations')
    .update({
      execution_result_id: transfer.id,
      execution_result_type: 'transfer',
      variance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', simulationId);

  return c.json({
    simulation_id: simulationId,
    status: 'executed',
    execution_result: {
      type: 'transfer',
      id: transfer.id,
      status: transfer.status,
    },
    variance,
    resource_url: `/v1/transfers/${transfer.id}`,
  }, 201);
});

/**
 * POST /v1/simulate/batch
 * Simulate multiple transfers in a single request
 * Story 28.3: Batch Simulation Endpoint
 */
app.post('/batch', async (c) => {
  const ctx = c.get('ctx');
  const tenantId = ctx?.tenantId;
  if (!tenantId) {
    throw Object.assign(new Error('Authentication required'), { 
      code: ErrorCode.UNAUTHORIZED 
    });
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { 
      code: ErrorCode.INVALID_REQUEST_FORMAT 
    });
  }

  const validation = BatchSimulateRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Object.assign(new Error('Invalid request payload'), { 
      code: ErrorCode.VALIDATION_FAILED,
      details: {
        validation_errors: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      }
    });
  }

  const { simulations: simulationRequests, stop_on_first_error } = validation.data;
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Track cumulative balance changes per account
  const accountBalanceChanges = new Map<string, number>();

  // Results
  const simulations: BatchSimulationItem[] = [];
  let successful = 0;
  let failed = 0;

  // Totals by currency
  const totalsByCurrency = new Map<string, number>();
  const feesByCurrency = new Map<string, number>();

  // Summary statistics
  const byCurrency = new Map<string, { count: number; total: number }>();
  const byRail = new Map<string, { count: number; total: number }>();

  // Optimization: Batch fetch all unique accounts first
  const uniqueAccountIds = new Set<string>();
  simulationRequests.forEach(req => {
    if (req.action === 'transfer') {
      const payload = req.payload as z.infer<typeof TransferPayloadSchema>;
      uniqueAccountIds.add(payload.from_account_id);
      uniqueAccountIds.add(payload.to_account_id);
    }
  });

  // Fetch all accounts in one query
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, balance_available, balance_total, currency, verification_status, verification_tier, type')
    .eq('tenant_id', tenantId)
    .in('id', Array.from(uniqueAccountIds));

  const accountMap = new Map(accounts?.map(a => [a.id, a]) || []);

  // Process each simulation
  for (let index = 0; index < simulationRequests.length; index++) {
    const request = simulationRequests[index];

    // Only transfer simulation implemented for now
    if (request.action !== 'transfer') {
      simulations.push({
        index,
        status: 'failed',
        can_execute: false,
        preview: null,
        warnings: [],
        errors: [{
          code: 'NOT_IMPLEMENTED',
          message: `Batch simulation for action '${request.action}' is not yet implemented`,
        }],
      });
      failed++;
      continue;
    }

    const payload = request.payload as z.infer<typeof TransferPayloadSchema>;

    // Get accounts from cache
    const sourceAccount = accountMap.get(payload.from_account_id);
    const destAccount = accountMap.get(payload.to_account_id);

    if (!sourceAccount) {
      simulations.push({
        index,
        status: 'failed',
        can_execute: false,
        preview: null,
        warnings: [],
        errors: [{
          code: 'SOURCE_ACCOUNT_NOT_FOUND',
          message: 'Source account not found',
          field: 'from_account_id',
        }],
      });
      failed++;
      continue;
    }

    if (!destAccount) {
      simulations.push({
        index,
        status: 'failed',
        can_execute: false,
        preview: null,
        warnings: [],
        errors: [{
          code: 'DESTINATION_ACCOUNT_NOT_FOUND',
          message: 'Destination account not found',
          field: 'to_account_id',
        }],
      });
      failed++;
      continue;
    }

    // Get current cumulative balance change for this account
    const currentBalanceChange = accountBalanceChanges.get(payload.from_account_id) || 0;

    // Adjust balance for cumulative changes
    const originalBalance = parseFloat(sourceAccount.balance_available?.toString() || '0');
    const adjustedBalance = originalBalance - currentBalanceChange;
    const adjustedAccount = { ...sourceAccount, balance_available: adjustedBalance.toString() };

    // Run simulation with adjusted balance
    const result = await simulateTransferInternal(tenantId, payload, adjustedAccount, destAccount);

    // Update cumulative balance if this transfer would succeed
    if (result.canExecute) {
      const amount = parseFloat(payload.amount);
      accountBalanceChanges.set(
        payload.from_account_id,
        currentBalanceChange + amount
      );

      successful++;

      // Update totals
      const currency = payload.currency;
      totalsByCurrency.set(currency, (totalsByCurrency.get(currency) || 0) + amount);

      if (result.preview) {
        const fees = parseFloat(result.preview.fees.total);
        feesByCurrency.set(currency, (feesByCurrency.get(currency) || 0) + fees);

        // Update summary by currency
        const currSummary = byCurrency.get(currency) || { count: 0, total: 0 };
        currSummary.count++;
        currSummary.total += amount;
        byCurrency.set(currency, currSummary);

        // Update summary by rail
        const rail = result.preview.timing.rail;
        const railSummary = byRail.get(rail) || { count: 0, total: 0 };
        railSummary.count++;
        railSummary.total += amount;
        byRail.set(rail, railSummary);
      }
    } else {
      failed++;

      // Stop on first error if requested
      if (stop_on_first_error) {
        simulations.push({
          index,
          status: 'failed',
          can_execute: false,
          preview: result.preview,
          warnings: result.warnings,
          errors: result.errors,
        });

        // Add remaining simulations as skipped
        for (let i = index + 1; i < simulationRequests.length; i++) {
          simulations.push({
            index: i,
            status: 'failed',
            can_execute: false,
            preview: null,
            warnings: [],
            errors: [{
              code: 'BATCH_STOPPED',
              message: 'Batch processing stopped due to earlier error',
            }],
          });
          failed++;
        }
        break;
      }
    }

    simulations.push({
      index,
      status: result.canExecute ? 'completed' : 'failed',
      can_execute: result.canExecute,
      preview: result.preview,
      warnings: result.warnings,
      errors: result.errors,
    });
  }

  // Build response
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const response: BatchSimulationResult = {
    batch_id: batchId,
    total_count: simulationRequests.length,
    successful,
    failed,
    can_execute_all: failed === 0,
    totals: {
      amount: Object.fromEntries(
        Array.from(totalsByCurrency.entries()).map(([k, v]) => [k, v.toFixed(2)])
      ),
      fees: Object.fromEntries(
        Array.from(feesByCurrency.entries()).map(([k, v]) => [k, v.toFixed(2)])
      ),
    },
    simulations,
    summary: {
      by_currency: Object.fromEntries(
        Array.from(byCurrency.entries()).map(([k, v]) => [
          k,
          { count: v.count, total: v.total.toFixed(2) },
        ])
      ),
      by_rail: Object.fromEntries(
        Array.from(byRail.entries()).map(([k, v]) => [
          k,
          { count: v.count, total: v.total.toFixed(2) },
        ])
      ),
    },
    expires_at: expiresAt.toISOString(),
  };

  return c.json(response, 201);
});

/**
 * Internal simulation function that accepts pre-fetched accounts
 * Optimized for batch processing - skips expensive checks
 */
async function simulateTransferInternal(
  tenantId: string,
  payload: z.infer<typeof TransferPayloadSchema>,
  sourceAccount: any,
  destAccount?: any
): Promise<{ preview: TransferPreview | null; warnings: SimulationWarning[]; errors: SimulationError[]; canExecute: boolean }> {
  const warnings: SimulationWarning[] = [];
  const errors: SimulationError[] = [];

  // Fetch destination account if not provided
  if (!destAccount) {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, currency, verification_status, type')
      .eq('id', payload.to_account_id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      errors.push({
        code: 'DESTINATION_ACCOUNT_NOT_FOUND',
        message: 'Destination account not found',
        field: 'to_account_id',
      });
      return { preview: null, warnings, errors, canExecute: false };
    }
    destAccount = data;
  }

  // Check verification status
  if (sourceAccount.verification_status === 'suspended') {
    errors.push({
      code: 'SOURCE_ACCOUNT_SUSPENDED',
      message: 'Source account is suspended',
      field: 'from_account_id',
    });
  }

  if (destAccount.verification_status === 'suspended') {
    errors.push({
      code: 'DESTINATION_ACCOUNT_SUSPENDED',
      message: 'Destination account is suspended',
      field: 'to_account_id',
    });
  }

  const amount = parseFloat(payload.amount);
  const availableBalance = parseFloat(sourceAccount.balance_available?.toString() || '0');

  // Check balance sufficiency
  if (amount > availableBalance) {
    const shortfall = (amount - availableBalance).toFixed(2);
    errors.push({
      code: 'INSUFFICIENT_BALANCE',
      message: `Insufficient balance. Shortfall: ${shortfall} ${payload.currency}`,
      field: 'amount',
      details: {
        required: payload.amount,
        available: availableBalance.toFixed(2),
        shortfall,
      },
    });
  }

  // Simplified preview for batch (skip some expensive checks)
  const sourceCurrency = payload.currency;
  const destCurrency = payload.destination_currency || destAccount.currency || 'USDC';
  const isCrossCurrency = sourceCurrency !== destCurrency;

  // Calculate fees
  const platformFee = amount * 0.005;
  const crossBorderFee = isCrossCurrency ? amount * 0.002 : 0;
  const corridorFee = destCurrency === 'BRL' ? 1.50 : 0;
  const fxFee = isCrossCurrency ? amount * 0.0035 : 0;
  const totalFees = platformFee + crossBorderFee + corridorFee + fxFee;

  // Get FX rate if needed
  let fxRate = 1.0;
  if (isCrossCurrency) {
    const effectiveFrom = sourceCurrency === 'USDC' ? 'USD' : sourceCurrency;
    const effectiveTo = destCurrency === 'USDC' ? 'USD' : destCurrency;
    fxRate = getExchangeRate(effectiveFrom, effectiveTo);
  }

  const netAmount = amount - totalFees;
  const destinationAmount = netAmount * fxRate;
  const balanceAfter = availableBalance - amount;

  // Determine rail
  let rail = 'internal';
  let duration = 5;
  if (destCurrency === 'BRL') {
    rail = 'pix';
    duration = 120;
  } else if (destCurrency === 'MXN') {
    rail = 'spei';
    duration = 180;
  }

  // Basic warnings
  if (balanceAfter < 100 && balanceAfter >= 0) {
    warnings.push({
      code: 'LOW_BALANCE_AFTER',
      message: 'Balance will be below $100 after this transfer',
      threshold: '100.00',
      current: balanceAfter.toFixed(2),
    });
  }

  const preview: TransferPreview = {
    source: {
      account_id: sourceAccount.id,
      account_name: sourceAccount.name,
      amount: payload.amount,
      currency: sourceCurrency,
      balance_before: availableBalance.toFixed(2),
      balance_after: balanceAfter.toFixed(2),
    },
    destination: {
      account_id: destAccount.id,
      account_name: destAccount.name,
      amount: destinationAmount.toFixed(2),
      currency: destCurrency,
    },
    fx: isCrossCurrency ? {
      rate: fxRate.toFixed(4),
      spread: '0.35%',
      rate_locked: false,
    } : undefined,
    fees: {
      platform_fee: platformFee.toFixed(2),
      fx_fee: fxFee.toFixed(2),
      rail_fee: corridorFee.toFixed(2),
      total: totalFees.toFixed(2),
      currency: sourceCurrency,
    },
    timing: {
      estimated_duration_seconds: duration,
      estimated_arrival: new Date(Date.now() + duration * 1000).toISOString(),
      rail,
    },
  };

  return {
    preview,
    warnings,
    errors,
    canExecute: errors.length === 0,
  };
}

export default app;

