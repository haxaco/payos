import type { SupabaseClient } from '@supabase/supabase-js';
import { InsufficientBalanceError } from '../middleware/error.js';

// ============================================================================
// DERIVED ACCOUNT BALANCE (wallets are the source of truth)
// ----------------------------------------------------------------------------
// PRODUCT DECISION: An account's headline balance is a DERIVED value equal to
// the SUM of its wallets' balances — NOT the stored accounts.balance_* columns.
//
// Why: accounts.balance_total drifted from SUM(wallets.balance) because funding
// a wallet never updated the account counter (two sources of truth). Wallets
// are now authoritative for what the API REPORTS.
//
// The stored accounts.balance_total / balance_available / balance_in_streams /
// balance_buffer columns are LEGACY/ADVISORY. They are still written by the
// credit_account/debit_account/stream-hold RPCs (internal ledger + stream
// accounting) and are intentionally left in place — they simply stop being the
// read source for the account's headline total. We keep in_streams + buffer
// from those stored columns as a stream overlay (they are not represented in
// wallets) and recompute available from the derived total:
//
//   total      = SUM(wallets.balance)            [for the account's currency]
//   available  = max(0, total - in_streams - buffer)
//   in_streams = accounts.balance_in_streams      [stored stream overlay]
//   buffer     = accounts.balance_buffer          [stored stream overlay]
//
// Scoping: wallet rows are summed with tenant_id + owner_account_id +
// environment matching the account (CLAUDE.md RLS rule). wallets.environment
// exists as of migration 20260322_environment_scoping_phase3.sql (default
// 'test').
// ============================================================================

export interface DerivedAccountBalance {
  /** Headline balance: sum of wallets in the account's own currency, OR the
   *  grand total across all wallets when that currency bucket is empty (the
   *  platform is stablecoin-centric — see pickDerivedTotal for the peg
   *  rationale). Codebase money shape: a JS number. */
  total: number;
  /** Per-currency breakdown: { USDC: 1234.5, EURC: 10 }. */
  byCurrency: Record<string, number>;
  /** Sum across ALL the account's wallets regardless of currency. */
  grandTotal: number;
}

/**
 * Derive a single account's balance from its wallets.
 *
 * Sums wallets.balance where owner_account_id = account.id AND tenant_id =
 * account.tenant_id AND environment = account.environment. Groups by
 * wallets.currency; the primary `total` is resolved via pickDerivedTotal so
 * single (detail) and batched (list) paths agree — currency-aware when that
 * bucket has funds, else the grand total so stablecoin wallets in other
 * currencies are never hidden (see pickDerivedTotal for the peg rationale).
 *
 * Read-only. Does NOT touch any write path / RPC.
 */
export async function deriveAccountBalance(
  supabase: SupabaseClient,
  account: { id: string; tenant_id: string; environment?: string | null; currency?: string | null }
): Promise<DerivedAccountBalance> {
  const env = account.environment || 'test';
  const { data, error } = await supabase
    .from('wallets')
    .select('balance, currency')
    .eq('owner_account_id', account.id)
    .eq('tenant_id', account.tenant_id)
    .eq('environment', env);

  if (error) {
    // Fail safe: do not crash a read because of a wallet-sum error. Return
    // zeros so callers fall back gracefully (account still renders).
    console.error('deriveAccountBalance: wallet sum failed:', error);
    return { total: 0, byCurrency: {}, grandTotal: 0 };
  }

  const byCurrency: Record<string, number> = {};
  let grandTotal = 0;
  for (const w of data || []) {
    const cur = (w as any).currency || 'USDC';
    const bal = parseFloat((w as any).balance) || 0;
    byCurrency[cur] = (byCurrency[cur] || 0) + bal;
    grandTotal += bal;
  }

  const total = pickDerivedTotal({ byCurrency, grandTotal }, account.currency);

  return { total, byCurrency, grandTotal };
}

/**
 * Batched variant for list endpoints — sums wallets for many accounts in a
 * SINGLE query (grouped client-side by owner_account_id) to avoid N+1.
 *
 * Returns a map keyed by account id. Accounts with no wallets are absent from
 * the map; callers should treat a miss as zero.
 */
export async function deriveAccountBalances(
  supabase: SupabaseClient,
  accountIds: string[],
  tenantId: string,
  environment: string
): Promise<Map<string, { byCurrency: Record<string, number>; grandTotal: number }>> {
  const result = new Map<string, { byCurrency: Record<string, number>; grandTotal: number }>();
  if (accountIds.length === 0) return result;

  const { data, error } = await supabase
    .from('wallets')
    .select('owner_account_id, balance, currency')
    .in('owner_account_id', accountIds)
    .eq('tenant_id', tenantId)
    .eq('environment', environment);

  if (error) {
    console.error('deriveAccountBalances: batched wallet sum failed:', error);
    return result;
  }

  for (const w of data || []) {
    const accId = (w as any).owner_account_id as string;
    if (!accId) continue;
    const cur = (w as any).currency || 'USDC';
    const bal = parseFloat((w as any).balance) || 0;
    let entry = result.get(accId);
    if (!entry) {
      entry = { byCurrency: {}, grandTotal: 0 };
      result.set(accId, entry);
    }
    entry.byCurrency[cur] = (entry.byCurrency[cur] || 0) + bal;
    entry.grandTotal += bal;
  }

  return result;
}

/**
 * Resolve the primary derived total for an account given its currency and a
 * batched per-currency map entry (or absence → zero).
 *
 * STABLECOIN-PEG RATIONALE — DO NOT "fix" this back to strict currency matching:
 * This platform is stablecoin-centric. Accounts are routinely created with
 * currency='USD' (a fiat denomination label) while their actual wallets hold
 * USDC / EURC — the wallets table CHECK constraint only permits stablecoins, so
 * a USD wallet can never exist. Strict matching (byCurrency['USD']) therefore
 * returns 0 for a fully-funded account, HIDING real money and producing a worse,
 * more-confusing display than the stored-column drift this derivation replaced.
 *
 * USDC and EURC are both ~$1-pegged stablecoins, so summing them as a single
 * headline number is the correct "sum of its wallets" figure the product
 * decision asked for. Fallback order for the single headline `total`:
 *   1. Account currency bucket has funds   → use that currency-specific sum.
 *   2. Bucket empty but other wallets exist → fall back to grandTotal (sum of
 *                                             all the account's wallets), NOT 0.
 *   3. No wallets at all (or all zero)      → 0.
 * The per-currency `byCurrency` breakdown is always preserved untouched so
 * callers can still render a currency split; only this headline fallback changes.
 */
export function pickDerivedTotal(
  entry: { byCurrency: Record<string, number>; grandTotal: number } | undefined,
  accountCurrency: string | null | undefined
): number {
  if (!entry) return 0;
  if (!accountCurrency) return entry.grandTotal;
  const bucket = entry.byCurrency[accountCurrency];
  // Currency-aware when that bucket actually has funds; otherwise fall back to
  // the grand total so funded wallets in other stablecoins are never hidden.
  if (bucket && bucket > 0) return bucket;
  return entry.grandTotal;
}

export interface AccountBalance {
  total: number;
  available: number;
  inStreams: {
    total: number;
    buffer: number;
    streaming: number;
  };
  currency: 'USDC';
}

export interface BalanceOperation {
  accountId: string;
  amount: number;
  referenceType: string;
  referenceId: string;
  description: string;
}

export class BalanceService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get current balance for an account
   */
  async getBalance(accountId: string): Promise<AccountBalance> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('tenant_id, environment, currency, balance_total, balance_available, balance_in_streams, balance_buffer')
      .eq('id', accountId)
      .single();

    if (error || !data) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Wallets are the source of truth — the headline total is the SUM of this
    // account's wallets, NOT the (legacy/advisory) stored balance_total column.
    // in_streams / buffer remain the stored stream-overlay values (not held in
    // wallets); available is recomputed from the derived total minus the
    // overlay. See the DERIVED ACCOUNT BALANCE note at the top of this file.
    const derived = await deriveAccountBalance(this.supabase, {
      id: accountId,
      tenant_id: data.tenant_id,
      environment: data.environment,
      currency: data.currency,
    });

    const inStreamsTotal = parseFloat(data.balance_in_streams) || 0;
    const buffer = parseFloat(data.balance_buffer) || 0;
    const total = derived.total;
    const available = Math.max(0, total - inStreamsTotal - buffer);

    return {
      total,
      available,
      inStreams: {
        total: inStreamsTotal,
        buffer,
        streaming: inStreamsTotal - buffer,
      },
      currency: 'USDC',
    };
  }

  /**
   * Credit account (add funds)
   * Used for: deposits, incoming transfers, stream withdrawals
   */
  async credit(operation: BalanceOperation): Promise<void> {
    const { error } = await this.supabase.rpc('credit_account', {
      p_account_id: operation.accountId,
      p_amount: operation.amount,
      p_reference_type: operation.referenceType,
      p_reference_id: operation.referenceId,
      p_description: operation.description,
    });

    if (error) {
      console.error('Credit operation failed:', error);
      throw new Error(`Failed to credit account: ${error.message}`);
    }
  }

  /**
   * Debit account (remove funds)
   * Used for: withdrawals, outgoing transfers
   */
  async debit(operation: BalanceOperation): Promise<void> {
    // First check balance
    const balance = await this.getBalance(operation.accountId);
    if (balance.available < operation.amount) {
      throw new InsufficientBalanceError(balance.available, operation.amount);
    }

    const { error } = await this.supabase.rpc('debit_account', {
      p_account_id: operation.accountId,
      p_amount: operation.amount,
      p_reference_type: operation.referenceType,
      p_reference_id: operation.referenceId,
      p_description: operation.description,
    });

    if (error) {
      console.error('Debit operation failed:', error);
      if (error.message.includes('Insufficient balance')) {
        const balance = await this.getBalance(operation.accountId);
        throw new InsufficientBalanceError(balance.available, operation.amount);
      }
      throw new Error(`Failed to debit account: ${error.message}`);
    }
  }

  /**
   * Hold funds for a stream
   * Moves funds from available to in_streams
   */
  async holdForStream(
    accountId: string,
    streamId: string,
    amount: number,
    bufferAmount: number
  ): Promise<void> {
    // Check available balance
    const balance = await this.getBalance(accountId);
    if (balance.available < amount) {
      throw new InsufficientBalanceError(balance.available, amount);
    }

    const { error } = await this.supabase.rpc('hold_for_stream', {
      p_account_id: accountId,
      p_stream_id: streamId,
      p_amount: amount,
      p_buffer: bufferAmount,
    });

    if (error) {
      console.error('Hold for stream failed:', error);
      if (error.message.includes('Insufficient balance')) {
        throw new InsufficientBalanceError(balance.available, amount);
      }
      throw new Error(`Failed to hold funds for stream: ${error.message}`);
    }
  }

  /**
   * Release funds from a stream (on cancel/complete)
   */
  async releaseFromStream(
    accountId: string,
    streamId: string,
    streamedAmount: number,
    returnBuffer: number
  ): Promise<void> {
    const { error } = await this.supabase.rpc('release_from_stream', {
      p_account_id: accountId,
      p_stream_id: streamId,
      p_streamed_amount: streamedAmount,
      p_return_buffer: returnBuffer,
    });

    if (error) {
      console.error('Release from stream failed:', error);
      throw new Error(`Failed to release funds from stream: ${error.message}`);
    }
  }

  /**
   * Transfer between two accounts (atomic)
   * Used for: internal transfers
   */
  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description: string
  ): Promise<void> {
    // Check sender balance first
    const senderBalance = await this.getBalance(fromAccountId);
    if (senderBalance.available < amount) {
      throw new InsufficientBalanceError(senderBalance.available, amount);
    }

    // Perform atomic transfer using a transaction
    // Debit sender
    await this.debit({
      accountId: fromAccountId,
      amount,
      referenceType,
      referenceId,
      description: `Transfer out: ${description}`,
    });

    // Credit receiver
    await this.credit({
      accountId: toAccountId,
      amount,
      referenceType,
      referenceId,
      description: `Transfer in: ${description}`,
    });
  }

  /**
   * Get ledger history for an account
   */
  async getLedgerHistory(
    accountId: string,
    options: { limit?: number; offset?: number; referenceType?: string } = {}
  ): Promise<any[]> {
    const { limit = 50, offset = 0, referenceType } = options;

    let query = this.supabase
      .from('ledger_entries')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (referenceType) {
      query = query.eq('reference_type', referenceType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ledger history:', error);
      throw new Error('Failed to fetch ledger history');
    }

    return data || [];
  }

  /**
   * Add funds to account (top-up/deposit)
   * For demo/mock purposes - in production this would come from Circle
   */
  async addFunds(
    accountId: string,
    amount: number,
    source: string = 'deposit'
  ): Promise<void> {
    await this.credit({
      accountId,
      amount,
      referenceType: source,
      referenceId: `deposit_${Date.now()}`,
      description: `Funds added via ${source}`,
    });
  }
}

/**
 * Create a balance service instance
 */
export function createBalanceService(supabase: SupabaseClient): BalanceService {
  return new BalanceService(supabase);
}

