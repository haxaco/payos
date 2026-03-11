/**
 * Epic 65, Story 65.3: Layer 1 — Request Counter
 *
 * Buffers API request counts in-memory and upserts to api_request_counts
 * every 10 seconds. Path normalization replaces UUIDs with :id.
 */

import { createClient } from '../../db/client.js';
import type { RequestCountRow } from './operation-types.js';

// =============================================================================
// Buffer
// =============================================================================

const FLUSH_INTERVAL_MS = 10_000;

// Key format: {tenantId}:{minuteBucket}:{method}:{pathTemplate}:{statusCode}:{actorType}
const counterBuffer = new Map<string, RequestCountRow>();
let flushTimer: ReturnType<typeof setInterval> | null = null;

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Numeric IDs
const NUMERIC_ID_REGEX = /\/\d+(?=\/|$)/g;

/**
 * Normalize a URL path by replacing UUIDs and numeric IDs with :id.
 */
export function normalizePath(path: string): string {
  return path
    .replace(UUID_REGEX, ':id')
    .replace(NUMERIC_ID_REGEX, '/:id');
}

/**
 * Truncate a Date to the minute boundary (ISO 8601).
 */
function getMinuteBucket(date: Date): string {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d.toISOString();
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Record a single API request. Non-blocking.
 */
export function recordRequest(
  tenantId: string,
  method: string,
  path: string,
  statusCode: number,
  actorType: string,
  durationMs: number,
): void {
  const minuteBucket = getMinuteBucket(new Date());
  const pathTemplate = normalizePath(path);

  const key = `${tenantId}:${minuteBucket}:${method}:${pathTemplate}:${statusCode}:${actorType}`;

  const existing = counterBuffer.get(key);
  if (existing) {
    existing.count += 1;
    existing.totalDurationMs += durationMs;
  } else {
    counterBuffer.set(key, {
      tenantId,
      minuteBucket,
      method,
      pathTemplate,
      statusCode,
      actorType,
      count: 1,
      totalDurationMs: durationMs,
    });
  }
}

/**
 * Flush the counter buffer to Postgres via upsert.
 */
export async function flushRequestCounters(): Promise<number> {
  if (counterBuffer.size === 0) return 0;

  // Snapshot and clear
  const entries = Array.from(counterBuffer.values());
  counterBuffer.clear();

  try {
    const supabase = createClient();

    const rows = entries.map((e) => ({
      tenant_id: e.tenantId,
      minute_bucket: e.minuteBucket,
      method: e.method,
      path_template: e.pathTemplate,
      status_code: e.statusCode,
      actor_type: e.actorType,
      count: e.count,
      total_duration_ms: e.totalDurationMs,
    }));

    // Upsert with conflict resolution on the unique constraint
    const { error } = await (supabase.from('api_request_counts') as any)
      .upsert(rows, {
        onConflict: 'tenant_id,minute_bucket,method,path_template,status_code,actor_type',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`[ops] Failed to flush ${entries.length} request counters:`, error.message);
      // Re-add to buffer for retry
      for (const entry of entries) {
        const key = `${entry.tenantId}:${entry.minuteBucket}:${entry.method}:${entry.pathTemplate}:${entry.statusCode}:${entry.actorType}`;
        const existing = counterBuffer.get(key);
        if (existing) {
          existing.count += entry.count;
          existing.totalDurationMs += entry.totalDurationMs;
        } else {
          counterBuffer.set(key, entry);
        }
      }
      return 0;
    }

    return entries.length;
  } catch (error: any) {
    console.error('[ops] Request counter flush error:', error.message);
    return 0;
  }
}

// =============================================================================
// Lifecycle
// =============================================================================

export function startRequestCounter(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushRequestCounters().catch((err) => {
      console.error('[ops] Request counter periodic flush failed:', err.message);
    });
  }, FLUSH_INTERVAL_MS);

  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref();
  }

  console.log('[ops] Request counter started (10s flush interval)');
}

export async function stopRequestCounter(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  if (counterBuffer.size > 0) {
    console.log(`[ops] Draining ${counterBuffer.size} request counter entries...`);
    await flushRequestCounters();
  }

  console.log('[ops] Request counter stopped');
}

export function getRequestCounterBufferSize(): number {
  return counterBuffer.size;
}
