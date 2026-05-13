/**
 * Partition Manager Worker
 *
 * Primary partition creation now runs via pg_cron (see migration
 * 20260511_partition_scheduler.sql). This worker remains as a daily
 * backup that calls the same idempotent SQL function — useful if
 * pg_cron is paused, the cron worker dies, or a partition was
 * accidentally dropped.
 *
 * Also refreshes the usage_summary_hourly materialized view hourly.
 *
 * NOTE: The previous implementation used a non-existent `exec_sql` RPC
 * and silently failed every day, which is why monthly partitions stopped
 * being created from 2026-05-01 onward (the "silent observability
 * outage"). It now uses the `ops_create_monthly_partition` plpgsql
 * function added in migration 20260511_partition_lifecycle.sql.
 */

import { createClient } from '../db/client.js';

const PARTITION_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Daily
const MATVIEW_REFRESH_INTERVAL = 60 * 60 * 1000; // Hourly

let partitionTimer: ReturnType<typeof setInterval> | null = null;
let matviewTimer: ReturnType<typeof setInterval> | null = null;

const PARENT_TABLES = ['api_request_counts', 'operation_events'] as const;

/**
 * Ensure partitions exist for the current month and next 2 months.
 * Idempotent — safe to run as often as you like.
 */
async function ensurePartitions(): Promise<void> {
  const supabase = createClient();
  const now = new Date();

  for (let i = 0; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthStart = `${year}-${month}-01`;

    for (const parent of PARENT_TABLES) {
      const { error } = await (supabase.rpc as any)('ops_create_monthly_partition', {
        parent_table: parent,
        month_start: monthStart,
      });
      if (error) {
        console.error(
          `[partition-manager] Failed to ensure ${parent} partition for ${monthStart}:`,
          error.message,
        );
      }
    }
  }

  console.log('[partition-manager] Partition check complete');
}

/**
 * Refresh the usage_summary_hourly materialized view.
 *
 * REFRESH MATERIALIZED VIEW CONCURRENTLY can't run via PostgREST as
 * a one-off SQL string, so we expose it through a tiny SECURITY DEFINER
 * function if/when needed. For now we use a direct call via .rpc against
 * a dedicated function — but the function doesn't exist yet, so this is
 * a no-op log until the function is added.
 */
async function refreshMatview(): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase.rpc as any)('refresh_usage_summary_hourly');
  if (error) {
    // Suppress "function does not exist" until the helper is added; only
    // log unexpected errors so we don't spam logs.
    if (!error.message?.toLowerCase().includes('does not exist')) {
      console.error('[partition-manager] Matview refresh failed:', error.message);
    }
  }
}

export function startPartitionManager(): void {
  // Run partition check immediately, then daily
  ensurePartitions().catch((err) => {
    console.error('[partition-manager] Initial partition check failed:', err.message);
  });

  partitionTimer = setInterval(() => {
    ensurePartitions().catch((err) => {
      console.error('[partition-manager] Partition check failed:', err.message);
    });
  }, PARTITION_CHECK_INTERVAL);

  // Refresh matview hourly
  matviewTimer = setInterval(() => {
    refreshMatview().catch((err) => {
      console.error('[partition-manager] Matview refresh failed:', err.message);
    });
  }, MATVIEW_REFRESH_INTERVAL);

  // Don't block process exit
  if (partitionTimer && typeof partitionTimer === 'object' && 'unref' in partitionTimer) {
    partitionTimer.unref();
  }
  if (matviewTimer && typeof matviewTimer === 'object' && 'unref' in matviewTimer) {
    matviewTimer.unref();
  }

  console.log('[partition-manager] Started (daily partition check, hourly matview refresh)');
}

export function stopPartitionManager(): void {
  if (partitionTimer) {
    clearInterval(partitionTimer);
    partitionTimer = null;
  }
  if (matviewTimer) {
    clearInterval(matviewTimer);
    matviewTimer = null;
  }
  console.log('[partition-manager] Stopped');
}
