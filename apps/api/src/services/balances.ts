import type { SupabaseClient } from '@supabase/supabase-js';
import { InsufficientBalanceError } from '../middleware/error.js';

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
      .select('balance_total, balance_available, balance_in_streams, balance_buffer')
      .eq('id', accountId)
      .single();

    if (error || !data) {
      throw new Error(`Account not found: ${accountId}`);
    }

    return {
      total: parseFloat(data.balance_total) || 0,
      available: parseFloat(data.balance_available) || 0,
      inStreams: {
        total: parseFloat(data.balance_in_streams) || 0,
        buffer: parseFloat(data.balance_buffer) || 0,
        streaming: (parseFloat(data.balance_in_streams) || 0) - (parseFloat(data.balance_buffer) || 0),
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

