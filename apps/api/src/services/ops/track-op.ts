/**
 * Epic 65, Story 65.4: Layer 2 — trackOp()
 *
 * Buffers operation events in memory and batch-inserts to operation_events
 * every 5 seconds. CloudEvents 1.0 compliant envelope.
 */

import { randomUUID } from 'crypto';
import { createClient } from '../../db/client.js';
import {
  type TrackOpInput,
  type OperationEvent,
  getCategoryFromOpType,
  getProtocolFromOpType,
} from './operation-types.js';

// =============================================================================
// Buffer
// =============================================================================

const MAX_BUFFER_SIZE = 10_000;
const FLUSH_INTERVAL_MS = 5_000;

let buffer: OperationEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

// =============================================================================
// Public API
// =============================================================================

/**
 * Record an operation event. Non-blocking — events are buffered and flushed periodically.
 */
export function trackOp(input: TrackOpInput): void {
  const category = getCategoryFromOpType(input.operation);
  const protocol = getProtocolFromOpType(input.operation);

  const event: OperationEvent = {
    id: randomUUID(),
    specversion: '1.0',
    type: `sly.${category}.${input.operation.split('.')[1]}`,
    source: 'sly-api',
    subject: input.subject,
    time: new Date().toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    actorType: input.actorType || 'system',
    actorId: input.actorId || 'system',
    category,
    operation: input.operation,
    amountUsd: input.amountUsd,
    currency: input.currency,
    protocol,
    success: input.success ?? true,
    durationMs: input.durationMs,
    externalCostUsd: input.externalCostUsd,
    data: input.data,
  };

  buffer.push(event);

  // Prevent unbounded memory growth
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer = buffer.slice(-MAX_BUFFER_SIZE);
  }
}

/**
 * Flush the buffer to Postgres. Called automatically by the timer
 * and on graceful shutdown.
 */
export async function flushOpBuffer(): Promise<number> {
  if (buffer.length === 0) return 0;

  const batch = buffer.splice(0, buffer.length);

  try {
    const supabase = createClient();

    const rows = batch.map((e) => ({
      id: e.id,
      tenant_id: e.tenantId,
      correlation_id: e.correlationId ?? null,
      specversion: e.specversion,
      type: e.type,
      source: e.source,
      subject: e.subject,
      time: e.time,
      actor_type: e.actorType,
      actor_id: e.actorId,
      category: e.category,
      operation: e.operation,
      amount_usd: e.amountUsd ?? null,
      currency: e.currency ?? null,
      protocol: e.protocol ?? null,
      success: e.success,
      duration_ms: e.durationMs ?? null,
      external_cost_usd: e.externalCostUsd ?? null,
      data: e.data ?? {},
    }));

    // Batch insert (Supabase handles up to ~1000 rows per insert efficiently)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await (supabase.from('operation_events') as any).insert(chunk);
      if (error) {
        console.error(`[ops] Failed to flush ${chunk.length} operation events:`, error.message);
        // Re-add failed events to buffer for retry (up to max)
        const failedEvents = batch.slice(i, i + CHUNK_SIZE);
        if (buffer.length + failedEvents.length <= MAX_BUFFER_SIZE) {
          buffer.unshift(...failedEvents);
        }
      }
    }

    return batch.length;
  } catch (error: any) {
    console.error('[ops] Flush error:', error.message);
    // Re-add events for retry (up to max)
    if (buffer.length + batch.length <= MAX_BUFFER_SIZE) {
      buffer.unshift(...batch);
    }
    return 0;
  }
}

// =============================================================================
// Lifecycle
// =============================================================================

/**
 * Start the periodic flush timer. Call from index.ts on startup.
 */
export function startOpTracker(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushOpBuffer().catch((err) => {
      console.error('[ops] Periodic flush failed:', err.message);
    });
  }, FLUSH_INTERVAL_MS);

  // Unref so the timer doesn't prevent process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref();
  }

  console.log('[ops] Operation tracker started (5s flush interval)');
}

/**
 * Stop the flush timer and drain remaining events. Call on graceful shutdown.
 */
export async function stopOpTracker(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  if (buffer.length > 0) {
    console.log(`[ops] Draining ${buffer.length} buffered events...`);
    await flushOpBuffer();
  }

  console.log('[ops] Operation tracker stopped');
}

/**
 * Get current buffer size (for health checks / debugging).
 */
export function getOpBufferSize(): number {
  return buffer.length;
}
