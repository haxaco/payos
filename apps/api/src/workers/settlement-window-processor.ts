/**
 * Settlement Window Processor Worker
 * 
 * Story 27.4: Settlement Windows & Cut-off Times
 * 
 * Background worker that:
 * - Processes queued transfers at scheduled settlement windows
 * - Handles batch settlement execution
 * - Respects holiday calendar
 * - Logs execution results
 * 
 * @module workers/settlement-window-processor
 */

import { createClient } from '../db/client.js';
import { settlementWindowsService } from '../services/settlement-windows.js';
import { logAudit } from '../utils/helpers.js';

// ============================================
// Configuration
// ============================================

/** Check interval (every 5 minutes) */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** Maximum transfers per batch */
const MAX_BATCH_SIZE = 100;

/** Rails to process */
const SUPPORTED_RAILS = ['pix', 'spei', 'wire', 'circle_usdc', 'base_chain'];

// ============================================
// Worker Class
// ============================================

export class SettlementWindowProcessor {
  private isRunning = false;
  private checkTimer?: NodeJS.Timeout;
  private supabase = createClient();

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[SettlementWindowProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[SettlementWindowProcessor] Starting settlement window processor');
    console.log(`[SettlementWindowProcessor] Check interval: ${CHECK_INTERVAL_MS / 1000}s`);
    console.log(`[SettlementWindowProcessor] Supported rails: ${SUPPORTED_RAILS.join(', ')}`);

    // Run initial check
    await this.processAllWindows();

    // Schedule periodic checks
    this.scheduleNextCheck();

    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  private scheduleNextCheck(): void {
    if (!this.isRunning) return;

    this.checkTimer = setTimeout(async () => {
      await this.processAllWindows();
      this.scheduleNextCheck();
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Process all settlement windows across all tenants
   */
  async processAllWindows(): Promise<void> {
    console.log('[SettlementWindowProcessor] Checking settlement windows...');

    try {
      // Get all distinct tenants with queued transfers
      const { data: tenants, error: tenantError } = await this.supabase
        .from('settlement_queue')
        .select('tenant_id')
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString());

      if (tenantError) {
        console.error('[SettlementWindowProcessor] Error fetching tenants:', tenantError);
        return;
      }

      const uniqueTenants = [...new Set(tenants?.map(t => t.tenant_id) || [])];

      if (uniqueTenants.length === 0) {
        console.log('[SettlementWindowProcessor] No queued transfers ready for settlement');
        return;
      }

      console.log(`[SettlementWindowProcessor] Processing ${uniqueTenants.length} tenant(s)`);

      // Process each tenant
      for (const tenantId of uniqueTenants) {
        await this.processTenantWindows(tenantId);
      }
    } catch (error) {
      console.error('[SettlementWindowProcessor] Error processing windows:', error);
    }
  }

  /**
   * Process settlement windows for a single tenant
   */
  private async processTenantWindows(tenantId: string): Promise<void> {
    for (const rail of SUPPORTED_RAILS) {
      await this.processRailWindow(tenantId, rail);
    }
  }

  /**
   * Process a specific rail's settlement window
   */
  private async processRailWindow(tenantId: string, rail: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if window is open
      const isOpen = await settlementWindowsService.isWindowOpen(tenantId, rail);
      
      if (!isOpen) {
        // Window is closed, skip processing
        return;
      }

      // Get queued transfers for this rail
      const { data: queuedTransfers, error: queueError } = await this.supabase
        .from('settlement_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('rail', rail)
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false }) // Urgent first
        .order('queued_at', { ascending: true })
        .limit(MAX_BATCH_SIZE);

      if (queueError) {
        console.error(`[SettlementWindowProcessor] Error fetching queue for ${rail}:`, queueError);
        return;
      }

      if (!queuedTransfers || queuedTransfers.length === 0) {
        return; // Nothing to process
      }

      console.log(`[SettlementWindowProcessor] Processing ${queuedTransfers.length} transfers for ${rail} (tenant: ${tenantId})`);

      // Mark transfers as processing
      const queueIds = queuedTransfers.map(t => t.id);
      await this.supabase
        .from('settlement_queue')
        .update({ status: 'processing' })
        .in('id', queueIds);

      // Process transfers
      const results = await this.settleTransfers(tenantId, rail, queuedTransfers);

      // Log execution
      const totalAmount = queuedTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const currency = queuedTransfers[0]?.currency || 'USD';

      await settlementWindowsService.logExecution({
        tenantId,
        rail,
        scheduledAt: new Date().toISOString(),
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        status: results.failedCount > 0 ? 'completed' : 'completed',
        transferCount: queuedTransfers.length,
        totalAmount,
        currency,
        successCount: results.successCount,
        failedCount: results.failedCount,
        errorMessage: results.errors.length > 0 ? results.errors.join('; ') : undefined,
      });

      const duration = Date.now() - startTime;
      console.log(
        `[SettlementWindowProcessor] Completed ${rail} settlement: ` +
        `${results.successCount}/${queuedTransfers.length} succeeded in ${duration}ms`
      );
    } catch (error: any) {
      console.error(`[SettlementWindowProcessor] Error processing ${rail}:`, error);
      
      // Log failed execution
      await settlementWindowsService.logExecution({
        tenantId,
        rail,
        scheduledAt: new Date().toISOString(),
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        status: 'failed',
        transferCount: 0,
        totalAmount: 0,
        successCount: 0,
        failedCount: 0,
        errorMessage: error.message,
      });
    }
  }

  /**
   * Settle a batch of transfers
   */
  private async settleTransfers(
    tenantId: string,
    rail: string,
    queuedTransfers: any[]
  ): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const queueItem of queuedTransfers) {
      try {
        // In sandbox mode, simulate settlement
        // In production, this would call the actual rail API
        const success = await this.simulateSettlement(queueItem);

        if (success) {
          // Mark as settled
          await this.supabase
            .from('settlement_queue')
            .update({
              status: 'settled',
              processed_at: new Date().toISOString(),
            })
            .eq('id', queueItem.id);

          // Update transfer status
          await this.supabase
            .from('transfers')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', queueItem.transfer_id);

          successCount++;
        } else {
          throw new Error('Settlement failed');
        }
      } catch (error: any) {
        failedCount++;
        errors.push(`Transfer ${queueItem.transfer_id}: ${error.message}`);

        // Mark as failed
        await this.supabase
          .from('settlement_queue')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: error.message,
          })
          .eq('id', queueItem.id);
      }
    }

    // Log audit for batch
    await logAudit(this.supabase, {
      entity_type: 'settlement_batch',
      entity_id: null,
      action: 'process',
      new_values: {
        tenant_id: tenantId,
        rail,
        total_count: queuedTransfers.length,
        success_count: successCount,
        failed_count: failedCount,
      },
    });

    return { successCount, failedCount, errors };
  }

  /**
   * Simulate settlement (sandbox mode)
   * In production, this would call actual rail APIs
   */
  private async simulateSettlement(queueItem: any): Promise<boolean> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // 95% success rate in sandbox
    return Math.random() > 0.05;
  }

  stop(): void {
    console.log('[SettlementWindowProcessor] Stopping settlement window processor');
    this.isRunning = false;

    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const settlementWindowProcessor = new SettlementWindowProcessor();

// ============================================
// Main (if run directly)
// ============================================

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  settlementWindowProcessor.start().catch((error) => {
    console.error('[SettlementWindowProcessor] Fatal error:', error);
    process.exit(1);
  });
}



