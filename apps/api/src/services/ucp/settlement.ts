/**
 * UCP Settlement Service
 *
 * Handles settlement execution for UCP checkouts.
 *
 * @see Story 43.5: Handler Credential Flow
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UCPSettlement,
  UCPRecipient,
  UCPSettleRequest,
  UCPMandateSettleRequest,
} from './types.js';
import { validateToken, markTokenUsed, getToken } from './tokens.js';
import { getCorridors } from './profile.js';

// =============================================================================
// Settlement Storage (In-memory for PoC)
// =============================================================================

interface StoredSettlement {
  id: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  token: string;
  mandateId?: string; // AP2 mandate reference (Story 43.6)
  transferId?: string;
  amount: {
    source: number;
    sourceCurrency: string;
    destination: number;
    destinationCurrency: string;
    fxRate: number;
    fees: number;
  };
  recipient: UCPRecipient;
  corridor: 'pix' | 'spei';
  estimatedCompletion?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settlementStore = new Map<string, StoredSettlement>();

// =============================================================================
// Settlement Operations
// =============================================================================

/**
 * Map stored settlement to API response
 */
function mapSettlement(stored: StoredSettlement): UCPSettlement {
  return {
    id: stored.id,
    status: stored.status,
    token: stored.token,
    transfer_id: stored.transferId,
    amount: {
      source: stored.amount.source,
      source_currency: stored.amount.sourceCurrency,
      destination: stored.amount.destination,
      destination_currency: stored.amount.destinationCurrency,
      fx_rate: stored.amount.fxRate,
      fees: stored.amount.fees,
    },
    recipient: stored.recipient,
    corridor: stored.corridor,
    estimated_completion: stored.estimatedCompletion?.toISOString(),
    completed_at: stored.completedAt?.toISOString(),
    failed_at: stored.failedAt?.toISOString(),
    failure_reason: stored.failureReason,
    created_at: stored.createdAt.toISOString(),
    updated_at: stored.updatedAt.toISOString(),
  };
}

/**
 * Execute settlement with a token
 */
export async function executeSettlement(
  tenantId: string,
  request: UCPSettleRequest,
  supabase: SupabaseClient
): Promise<UCPSettlement> {
  const { token, idempotency_key } = request;

  // Validate token
  const validation = validateToken(token, tenantId);
  if (!validation.valid || !validation.stored) {
    throw new Error(validation.error || 'Invalid token');
  }

  const tokenData = validation.stored;

  // Check idempotency - if we already have a settlement for this token, return it
  const existingSettlement = Array.from(settlementStore.values()).find(
    (s) => s.token === token && s.tenantId === tenantId
  );
  if (existingSettlement) {
    return mapSettlement(existingSettlement);
  }

  // Mark token as used
  markTokenUsed(token);

  // Calculate estimated completion
  const corridors = getCorridors();
  const corridor = corridors.find(
    (c) => c.rail === tokenData.corridor && c.source_currency === tokenData.currency
  );
  const estimatedMinutes = tokenData.corridor === 'pix' ? 1 : 30;
  const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000);

  // Create settlement record
  const now = new Date();
  const stored: StoredSettlement = {
    id: tokenData.settlementId,
    tenantId,
    status: 'pending',
    token,
    amount: {
      source: tokenData.amount,
      sourceCurrency: tokenData.currency,
      destination: tokenData.quote.toAmount,
      destinationCurrency: tokenData.quote.toCurrency,
      fxRate: tokenData.quote.fxRate,
      fees: tokenData.quote.fees,
    },
    recipient: tokenData.recipient,
    corridor: tokenData.corridor,
    estimatedCompletion,
    createdAt: now,
    updatedAt: now,
  };
  settlementStore.set(stored.id, stored);

  // In production, this would:
  // 1. Create a transfer in the transfers table
  // 2. Initiate the actual payout via Circle or other PSP
  // 3. Update status based on webhooks
  //
  // For PoC, we'll simulate by updating status after a delay
  simulateSettlementExecution(stored.id, supabase);

  return mapSettlement(stored);
}

/**
 * Simulate settlement execution (for PoC)
 */
async function simulateSettlementExecution(
  settlementId: string,
  supabase: SupabaseClient
): Promise<void> {
  const stored = settlementStore.get(settlementId);
  if (!stored) return;

  // Move to processing after 1 second
  setTimeout(() => {
    const s = settlementStore.get(settlementId);
    if (s) {
      s.status = 'processing';
      s.updatedAt = new Date();
      settlementStore.set(settlementId, s);
    }
  }, 1000);

  // Complete after 5 seconds (simulating Pix instant settlement)
  setTimeout(() => {
    const s = settlementStore.get(settlementId);
    if (s) {
      s.status = 'completed';
      s.completedAt = new Date();
      s.updatedAt = new Date();
      // Generate a mock transfer ID
      s.transferId = randomUUID();
      settlementStore.set(settlementId, s);

      // In production, would send webhook here
      console.log(`[UCP] Settlement ${settlementId} completed`);
    }
  }, 5000);
}

/**
 * Get settlement by ID
 */
export async function getSettlement(
  settlementId: string,
  tenantId: string
): Promise<UCPSettlement | null> {
  const stored = settlementStore.get(settlementId);
  if (!stored || stored.tenantId !== tenantId) {
    return null;
  }
  return mapSettlement(stored);
}

/**
 * List settlements for a tenant
 */
export async function listSettlements(
  tenantId: string,
  options: {
    status?: string;
    corridor?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: UCPSettlement[]; total: number }> {
  const { status, corridor, limit = 20, offset = 0 } = options;

  let settlements = Array.from(settlementStore.values()).filter(
    (s) => s.tenantId === tenantId
  );

  if (status) {
    settlements = settlements.filter((s) => s.status === status);
  }
  if (corridor) {
    settlements = settlements.filter((s) => s.corridor === corridor);
  }

  // Sort by created date descending
  settlements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = settlements.length;
  const paged = settlements.slice(offset, offset + limit);

  return {
    data: paged.map(mapSettlement),
    total,
  };
}

/**
 * Execute settlement with AP2 mandate
 *
 * @see Story 43.6: AP2 Mandate Support in Handler
 */
export async function executeSettlementWithMandate(
  tenantId: string,
  request: UCPMandateSettleRequest,
  supabase: SupabaseClient
): Promise<UCPSettlement> {
  const {
    mandate_token,
    amount,
    currency,
    corridor,
    recipient,
    idempotency_key,
  } = request;

  // Import AP2 mandate service dynamically to avoid circular dependencies
  const { getAP2MandateService } = await import('../ap2/mandate-service.js');
  const mandateService = getAP2MandateService();

  // Extract mandate ID from token (format: mandate_{uuid})
  const mandateId = mandate_token.startsWith('mandate_')
    ? mandate_token
    : `mandate_${mandate_token}`;

  // Verify mandate exists and is valid
  const mandate = await mandateService.getMandate(mandateId);
  if (!mandate) {
    throw new Error('Mandate not found');
  }

  // Validate mandate
  const validation = mandateService.validateMandate(mandate);
  if (!validation.valid) {
    throw new Error(`Mandate invalid: ${validation.reason}`);
  }

  // Validate amount against mandate limits
  if (mandate.max_amount && amount > mandate.max_amount) {
    throw new Error(
      `Amount ${amount} exceeds mandate limit ${mandate.max_amount}`
    );
  }

  // Validate currency
  if (mandate.currency && mandate.currency !== currency) {
    throw new Error(
      `Currency ${currency} does not match mandate currency ${mandate.currency}`
    );
  }

  // Get FX quote for the settlement
  const quote = getQuoteForCorridor(amount, currency, corridor);

  // Create settlement
  const now = new Date();
  const estimatedMinutes = corridor === 'pix' ? 1 : 30;
  const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000);

  const stored: StoredSettlement = {
    id: randomUUID(),
    tenantId,
    status: 'pending',
    token: mandate_token, // Store mandate token as reference
    mandateId: mandateId, // Link to AP2 mandate
    amount: {
      source: amount,
      sourceCurrency: currency,
      destination: quote.toAmount,
      destinationCurrency: quote.toCurrency,
      fxRate: quote.fxRate,
      fees: quote.fees,
    },
    recipient,
    corridor,
    estimatedCompletion,
    createdAt: now,
    updatedAt: now,
  };
  settlementStore.set(stored.id, stored);

  // Request payment from mandate
  const paymentResponse = await mandateService.requestPayment({
    id: `pay_${randomUUID()}`,
    mandate_id: mandateId,
    amount,
    currency,
    description: `UCP Settlement to ${corridor.toUpperCase()}`,
    metadata: {
      settlement_id: stored.id,
      corridor,
      recipient_name: recipient.name,
    },
  });

  if (paymentResponse.status === 'rejected') {
    stored.status = 'failed';
    stored.failedAt = now;
    stored.failureReason = paymentResponse.error_message || 'Mandate payment rejected';
    settlementStore.set(stored.id, stored);

    return mapSettlement(stored);
  }

  // Simulate settlement execution (same as token-based)
  simulateSettlementExecution(stored.id, supabase);

  return mapSettlement(stored);
}

/**
 * Get FX quote for corridor (helper for mandate settlements)
 */
function getQuoteForCorridor(
  amount: number,
  currency: string,
  corridor: 'pix' | 'spei'
): {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  fxRate: number;
  fees: number;
} {
  // Mock FX rates (same as token service)
  const rates: Record<string, number> = {
    'USD-BRL': 5.95,
    'USDC-BRL': 5.95,
    'USD-MXN': 17.25,
    'USDC-MXN': 17.25,
  };

  const destCurrency = corridor === 'pix' ? 'BRL' : 'MXN';
  const rateKey = `${currency}-${destCurrency}`;
  const fxRate = rates[rateKey] || 1;

  const feePercent = 0.01;
  const fees = amount * feePercent;
  const netAmount = amount - fees;

  return {
    fromAmount: amount,
    fromCurrency: currency,
    toAmount: Number((netAmount * fxRate).toFixed(2)),
    toCurrency: destCurrency,
    fxRate,
    fees: Number(fees.toFixed(2)),
  };
}

/**
 * Clear settlement store (for testing)
 */
export function clearSettlementStore(): void {
  settlementStore.clear();
}
