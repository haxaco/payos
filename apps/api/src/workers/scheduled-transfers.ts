import { createClient } from '../db/client.js';
import { createBalanceService } from '../services/balances.js';
import { logAudit } from '../utils/helpers.js';

/**
 * Background worker for executing scheduled transfers
 * Can run in mock mode for demos (immediate execution) or real mode (cron-based)
 */
export class ScheduledTransferWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private mockMode: boolean;

  constructor(mockMode: boolean = false) {
    this.mockMode = mockMode || process.env.MOCK_SCHEDULED_TRANSFERS === 'true';
  }

  /**
   * Start the worker
   */
  start(intervalMs: number = 60000): void {
    if (this.isRunning) {
      console.warn('Scheduled transfer worker is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting scheduled transfer worker (mock mode: ${this.mockMode})`);

    // In mock mode, run immediately and then every interval
    if (this.mockMode) {
      this.processScheduledTransfers().catch(console.error);
    }

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processScheduledTransfers().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Scheduled transfer worker stopped');
  }

  /**
   * Process all due scheduled transfers
   */
  async processScheduledTransfers(): Promise<void> {
    const supabase = createClient();
    const now = new Date().toISOString();

    // Find all active schedules that are due
    const { data: schedules, error } = await supabase
      .from('transfer_schedules')
      .select('*')
      .eq('status', 'active')
      .lte('next_execution', now)
      .limit(100); // Process in batches

    if (error) {
      console.error('Error fetching scheduled transfers:', error);
      return;
    }

    if (!schedules || schedules.length === 0) {
      return; // No schedules due
    }

    console.log(`Processing ${schedules.length} scheduled transfer(s)`);

    for (const schedule of schedules) {
      try {
        await this.executeSchedule(schedule, supabase);
      } catch (error: any) {
        console.error(`Error executing schedule ${schedule.id}:`, error);
        // Continue with other schedules
      }
    }
  }

  /**
   * Execute a single scheduled transfer
   */
  private async executeSchedule(schedule: any, supabase: any): Promise<void> {
    const balanceService = createBalanceService(supabase);

    // Check if schedule should end
    if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
      await supabase
        .from('transfer_schedules')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id);
      return;
    }

    // Check max occurrences
    if (schedule.max_occurrences && schedule.occurrences_completed >= schedule.max_occurrences) {
      await supabase
        .from('transfer_schedules')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id);
      return;
    }

    // Check balance
    const balance = await balanceService.getBalance(schedule.from_account_id);
    if (balance.available < parseFloat(schedule.amount)) {
      console.warn(`Insufficient balance for schedule ${schedule.id}`);
      
      // In mock mode, we can still proceed for demo purposes
      if (!this.mockMode) {
        // Schedule retry or mark as failed
        return;
      }
    }

    // Get destination account
    let toAccountId = schedule.to_account_id;
    if (!toAccountId && schedule.to_payment_method_id) {
      // In real implementation, resolve payment method to account
      // For now, skip if no to_account_id
      console.warn(`Payment method not yet supported for schedule ${schedule.id}`);
      return;
    }

    if (!toAccountId) {
      console.warn(`No destination account for schedule ${schedule.id}`);
      return;
    }

    // Create transfer
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        tenant_id: schedule.tenant_id,
        type: 'internal', // Scheduled transfers are internal
        status: 'completed',
        from_account_id: schedule.from_account_id,
        from_account_name: '', // Would need to join
        to_account_id: toAccountId,
        to_account_name: '', // Would need to join
        initiated_by_type: schedule.initiated_by_type || 'system',
        initiated_by_id: schedule.initiated_by_id || 'scheduled-worker',
        initiated_by_name: schedule.initiated_by_name || 'Scheduled Transfer',
        amount: schedule.amount,
        currency: schedule.currency,
        destination_amount: schedule.amount,
        destination_currency: schedule.currency,
        fx_rate: 1,
        fee_amount: 0,
        description: schedule.description || `Scheduled ${schedule.frequency} transfer`,
        schedule_id: schedule.id,
        scheduled_for: schedule.next_execution,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transferError) {
      console.error(`Error creating transfer for schedule ${schedule.id}:`, transferError);
      throw transferError;
    }

    // Execute balance transfer
    try {
      await balanceService.transfer(
        schedule.from_account_id,
        toAccountId,
        parseFloat(schedule.amount),
        'transfer',
        transfer.id,
        schedule.description || `Scheduled ${schedule.frequency} transfer`
      );
    } catch (error: any) {
      // Mark transfer as failed
      await supabase
        .from('transfers')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: error.message,
        })
        .eq('id', transfer.id);

      // Handle retry logic
      if (schedule.retry_enabled) {
        // In real implementation, schedule retry
        console.warn(`Transfer failed for schedule ${schedule.id}, retry logic not yet implemented`);
      }

      throw error;
    }

    // Calculate next execution
    const lastExecution = new Date();
    const startDate = new Date(schedule.start_date);
    const nextExecution = this.calculateNextExecution(
      schedule.frequency,
      schedule.interval_value,
      schedule.day_of_month,
      schedule.day_of_week,
      lastExecution,
      startDate
    );

    // Update schedule
    const occurrencesCompleted = (schedule.occurrences_completed || 0) + 1;
    const shouldComplete = 
      (schedule.max_occurrences && occurrencesCompleted >= schedule.max_occurrences) ||
      (schedule.end_date && new Date(schedule.end_date) < nextExecution);

    await supabase
      .from('transfer_schedules')
      .update({
        occurrences_completed: occurrencesCompleted,
        last_execution: lastExecution.toISOString(),
        next_execution: shouldComplete ? null : nextExecution.toISOString(),
        status: shouldComplete ? 'completed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id);

    // Audit log
    await logAudit(supabase, {
      tenantId: schedule.tenant_id,
      entityType: 'transfer_schedule',
      entityId: schedule.id,
      action: 'executed',
      actorType: 'system',
      actorId: 'scheduled-worker',
      actorName: 'Scheduled Transfer Worker',
      metadata: {
        transferId: transfer.id,
        occurrence: occurrencesCompleted,
      },
    });

    console.log(`Successfully executed schedule ${schedule.id}, transfer ${transfer.id}`);
  }

  /**
   * Calculate next execution time
   */
  private calculateNextExecution(
    frequency: string,
    intervalValue: number,
    dayOfMonth: number | undefined,
    dayOfWeek: number | undefined,
    lastExecution: Date,
    startDate: Date
  ): Date {
    const next = new Date(lastExecution);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + intervalValue);
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 * intervalValue));
        if (dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
          if (daysToAdd === 0) {
            next.setDate(next.getDate() + (7 * intervalValue));
          } else {
            next.setDate(next.getDate() + daysToAdd);
          }
        }
        break;
      case 'biweekly':
        next.setDate(next.getDate() + (14 * intervalValue));
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + intervalValue);
        if (dayOfMonth !== undefined) {
          next.setDate(dayOfMonth);
        }
        break;
      default:
        next.setDate(next.getDate() + intervalValue);
    }

    return next;
  }

  /**
   * Manually trigger execution (useful for demos)
   */
  async triggerExecution(scheduleId?: string): Promise<void> {
    const supabase = createClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('transfer_schedules')
      .select('*')
      .eq('status', 'active')
      .lte('next_execution', now);

    if (scheduleId) {
      query = query.eq('id', scheduleId);
    }

    const { data: schedules } = await query.limit(100);

    if (!schedules || schedules.length === 0) {
      console.log('No schedules to execute');
      return;
    }

    for (const schedule of schedules) {
      try {
        await this.executeSchedule(schedule, supabase);
      } catch (error: any) {
        console.error(`Error executing schedule ${schedule.id}:`, error);
      }
    }
  }
}

// Singleton instance
let workerInstance: ScheduledTransferWorker | null = null;

/**
 * Get or create the worker instance
 */
export function getScheduledTransferWorker(mockMode?: boolean): ScheduledTransferWorker {
  if (!workerInstance) {
    workerInstance = new ScheduledTransferWorker(mockMode);
  }
  return workerInstance;
}

