/**
 * Generic batched-insert buffer for fire-and-forget log/event tables.
 *
 * Cloned from track-op.ts so multiple insert-heavy tables (audit_log,
 * a2a_audit_events, security_events) can share the same flush mechanics
 * without dragging operation_events' specific schema along.
 *
 * USAGE
 *   const buf = createEventBuffer<MyRow>({ table: 'my_table' });
 *   buf.start();
 *   buf.push(row);
 *   // on shutdown:
 *   await buf.stop();
 *
 * SAFETY
 *   Only safe for tables that are NEVER read in the same request as the write
 *   (a 2–5s flush delay is fine for forensic/compliance logs, not for state).
 *   Verified at adoption time:
 *     - audit_log:         no SELECTs in routes
 *     - a2a_audit_events:  fire-and-forget from task-event-bus
 *     - security_events:   no SELECTs in routes
 *   `a2a_messages` is INTENTIONALLY NOT batched — task lifecycle reads it
 *   back synchronously via getTask().
 */

import { createClient } from '../../db/client.js';

export interface EventBuffer<T> {
  push(row: T): void;
  flush(): Promise<number>;
  start(): void;
  stop(): Promise<void>;
  getSize(): number;
}

export interface EventBufferOptions {
  table: string;
  flushIntervalMs?: number;
  maxBufferSize?: number;
  chunkSize?: number;
}

export function createEventBuffer<T>(
  opts: EventBufferOptions,
): EventBuffer<T> {
  const flushIntervalMs = opts.flushIntervalMs ?? 5_000;
  const maxBufferSize = opts.maxBufferSize ?? 10_000;
  const chunkSize = opts.chunkSize ?? 500;

  let buffer: T[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let flushing = false;

  // PostgreSQL integrity-constraint-violation error codes (class 23).
  // These will not succeed on retry, so we drop the chunk instead of
  // recycling it back into the buffer (which would create a retry loop).
  function isPermanentError(err: { code?: string } | null | undefined): boolean {
    return !!err?.code && err.code.startsWith('23');
  }

  async function flush(): Promise<number> {
    if (buffer.length === 0 || flushing) return 0;
    flushing = true;
    const batch = buffer.splice(0, buffer.length);

    try {
      const supabase = createClient();
      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        const { error } = await ((supabase as any).from(opts.table) as any).insert(chunk);
        if (!error) continue;

        // Permanent constraint violation: log + drop the chunk. Without this,
        // a single malformed row poisons every subsequent flush forever.
        if (isPermanentError(error)) {
          console.error(
            `[event-buffer:${opts.table}] dropping ${chunk.length} rows on permanent error (${error.code}):`,
            error.message,
          );
          continue;
        }

        // Transient error (network, timeout, deadlock) — re-buffer for retry.
        console.error(
          `[event-buffer:${opts.table}] flush failed for ${chunk.length} rows, will retry:`,
          error.message,
        );
        if (buffer.length + chunk.length <= maxBufferSize) {
          buffer.unshift(...chunk);
        }
      }
      return batch.length;
    } catch (err: any) {
      console.error(`[event-buffer:${opts.table}] flush error:`, err.message);
      if (buffer.length + batch.length <= maxBufferSize) {
        buffer.unshift(...batch);
      }
      return 0;
    } finally {
      flushing = false;
    }
  }

  return {
    push(row) {
      buffer.push(row);
      if (buffer.length > maxBufferSize) {
        buffer = buffer.slice(-maxBufferSize);
      }
    },
    flush,
    start() {
      if (flushTimer) return;
      flushTimer = setInterval(() => {
        flush().catch(() => {});
      }, flushIntervalMs);
      if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
        flushTimer.unref();
      }
      console.log(`[event-buffer:${opts.table}] started (${flushIntervalMs}ms flush)`);
    },
    async stop() {
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
      if (buffer.length > 0) {
        console.log(`[event-buffer:${opts.table}] draining ${buffer.length} rows...`);
        await flush();
      }
    },
    getSize() {
      return buffer.length;
    },
  };
}
