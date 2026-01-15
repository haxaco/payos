/**
 * Webhook Cleanup Worker
 * 
 * Story 27.5: Robust Webhook Delivery System
 * 
 * Background worker that:
 * - Cleans up old webhook delivery logs (>30 days)
 * - Purges old DLQ entries (>7 days)
 * - Reports cleanup statistics
 * 
 * Runs daily at off-peak hours.
 * 
 * @module workers/webhook-cleanup
 */

import { createClient } from '../db/client.js';
import { logAudit } from '../utils/helpers.js';

// ============================================
// Configuration
// ============================================

/** Retention period for webhook deliveries (30 days) */
const DELIVERY_RETENTION_DAYS = 30;

/** Retention period for DLQ entries (7 days) */
const DLQ_RETENTION_DAYS = 7;

/** Run interval (24 hours) */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Batch size for deletions */
const BATCH_SIZE = 1000;

// ============================================
// Worker Class
// ============================================

export class WebhookCleanupWorker {
  private isRunning = false;
  private cleanupTimer?: NodeJS.Timeout;
  private supabase = createClient();

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[WebhookCleanup] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[WebhookCleanup] Starting webhook cleanup worker');
    console.log(`[WebhookCleanup] Delivery retention: ${DELIVERY_RETENTION_DAYS} days`);
    console.log(`[WebhookCleanup] DLQ retention: ${DLQ_RETENTION_DAYS} days`);
    console.log(`[WebhookCleanup] Cleanup interval: ${CLEANUP_INTERVAL_MS / 1000 / 60 / 60}h`);

    // Run initial cleanup
    await this.runCleanup();

    // Schedule periodic cleanup
    this.scheduleNextCleanup();

    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  private scheduleNextCleanup(): void {
    if (!this.isRunning) return;

    this.cleanupTimer = setTimeout(async () => {
      await this.runCleanup();
      this.scheduleNextCleanup();
    }, CLEANUP_INTERVAL_MS);
  }

  async runCleanup(): Promise<{ deliveries: number; dlq: number }> {
    console.log('[WebhookCleanup] Starting cleanup run...');
    const startTime = Date.now();

    let deliveriesDeleted = 0;
    let dlqDeleted = 0;

    try {
      // 1. Clean up old delivered webhooks (>30 days)
      deliveriesDeleted = await this.cleanupOldDeliveries();

      // 2. Clean up old DLQ entries (>7 days)
      dlqDeleted = await this.cleanupOldDlq();

      // 3. Log results
      const duration = Date.now() - startTime;
      console.log(
        `[WebhookCleanup] Cleanup completed in ${duration}ms. ` +
        `Deliveries: ${deliveriesDeleted}, DLQ: ${dlqDeleted}`
      );

      // Log audit for cleanup
      await logAudit(this.supabase, {
        entity_type: 'webhook_cleanup',
        entity_id: null,
        action: 'cleanup',
        new_values: {
          deliveries_deleted: deliveriesDeleted,
          dlq_deleted: dlqDeleted,
          duration_ms: duration,
          retention_days: DELIVERY_RETENTION_DAYS,
          dlq_retention_days: DLQ_RETENTION_DAYS,
        },
      });
    } catch (error) {
      console.error('[WebhookCleanup] Cleanup error:', error);
    }

    return { deliveries: deliveriesDeleted, dlq: dlqDeleted };
  }

  /**
   * Delete webhook deliveries older than retention period
   * Only deletes 'delivered' status to preserve failed/DLQ for investigation
   */
  private async cleanupOldDeliveries(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('webhook_deliveries')
        .delete()
        .eq('status', 'delivered')
        .lt('delivered_at', cutoffDate)
        .select('id')
        .limit(BATCH_SIZE);

      if (error) {
        console.error('[WebhookCleanup] Delivery cleanup error:', error);
        break;
      }

      const deleted = data?.length || 0;
      totalDeleted += deleted;
      hasMore = deleted === BATCH_SIZE;

      if (deleted > 0) {
        console.log(`[WebhookCleanup] Deleted ${deleted} old deliveries (batch)`);
      }
    }

    return totalDeleted;
  }

  /**
   * Delete DLQ entries older than DLQ retention period
   */
  private async cleanupOldDlq(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - DLQ_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('webhook_deliveries')
        .delete()
        .eq('status', 'dlq')
        .lt('dlq_at', cutoffDate)
        .select('id')
        .limit(BATCH_SIZE);

      if (error) {
        console.error('[WebhookCleanup] DLQ cleanup error:', error);
        break;
      }

      const deleted = data?.length || 0;
      totalDeleted += deleted;
      hasMore = deleted === BATCH_SIZE;

      if (deleted > 0) {
        console.log(`[WebhookCleanup] Deleted ${deleted} old DLQ entries (batch)`);
      }
    }

    return totalDeleted;
  }

  stop(): void {
    console.log('[WebhookCleanup] Stopping webhook cleanup worker');
    this.isRunning = false;

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const webhookCleanupWorker = new WebhookCleanupWorker();

// ============================================
// Main (if run directly)
// ============================================

// Only run if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  webhookCleanupWorker.start().catch((error) => {
    console.error('[WebhookCleanup] Fatal error:', error);
    process.exit(1);
  });
}



