/**
 * Webhook Processor Worker
 * 
 * Background worker that processes pending and failed webhook deliveries.
 * Runs continuously with configurable intervals.
 * 
 * Usage:
 *   node dist/workers/webhook-processor.js
 * 
 * @module workers/webhook-processor
 */

import { webhookService } from '../services/webhooks.js';

// ============================================
// Configuration
// ============================================

const PENDING_INTERVAL_MS = 5000;  // Process pending every 5 seconds
const RETRY_INTERVAL_MS = 30000;   // Process retries every 30 seconds
const BATCH_SIZE = 100;             // Process up to 100 deliveries per batch

// ============================================
// Worker
// ============================================

class WebhookProcessor {
  private isRunning = false;
  private pendingTimer?: NodeJS.Timeout;
  private retryTimer?: NodeJS.Timeout;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[WebhookProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[WebhookProcessor] Starting webhook processor worker');
    console.log(`[WebhookProcessor] Pending interval: ${PENDING_INTERVAL_MS}ms`);
    console.log(`[WebhookProcessor] Retry interval: ${RETRY_INTERVAL_MS}ms`);
    console.log(`[WebhookProcessor] Batch size: ${BATCH_SIZE}`);

    // Process pending deliveries
    this.processPendingLoop();

    // Process retries
    this.processRetryLoop();

    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  private async processPendingLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await webhookService.processPendingDeliveries(BATCH_SIZE);
    } catch (error) {
      console.error('[WebhookProcessor] Error processing pending deliveries:', error);
    }

    // Schedule next run
    this.pendingTimer = setTimeout(
      () => this.processPendingLoop(),
      PENDING_INTERVAL_MS
    );
  }

  private async processRetryLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await webhookService.processRetries(BATCH_SIZE);
    } catch (error) {
      console.error('[WebhookProcessor] Error processing retries:', error);
    }

    // Schedule next run
    this.retryTimer = setTimeout(
      () => this.processRetryLoop(),
      RETRY_INTERVAL_MS
    );
  }

  stop(): void {
    console.log('[WebhookProcessor] Stopping webhook processor worker');
    this.isRunning = false;

    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    process.exit(0);
  }
}

// ============================================
// Main
// ============================================

const processor = new WebhookProcessor();
processor.start().catch((error) => {
  console.error('[WebhookProcessor] Fatal error:', error);
  process.exit(1);
});

