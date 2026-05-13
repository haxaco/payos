-- =============================================================================
-- Partition Scheduler (pg_cron)
--
-- This migration:
--   0. Provisions pg_cron extension (no-op if already enabled).
--   1. Schedules monthly creation of the next-month partition (day 25, 03:00 UTC)
--   2. Schedules monthly pruning of partitions beyond their retention window
--      (day 1, 04:00 UTC)
--
-- Retention windows (rationale in plan):
--   - api_request_counts: 6 months
--   - operation_events:   3 months (usage_summary_hourly materialized view
--                                    covers long-range analytics)
-- =============================================================================

-- pg_cron must be created outside a transaction in some setups. The extension
-- creates its own catalog tables; subsequent statements depend on them.
CREATE EXTENSION IF NOT EXISTS pg_cron;

BEGIN;

-- Unschedule any prior runs so this migration is idempotent.
DO $$
DECLARE
  job_id bigint;
BEGIN
  FOR job_id IN SELECT jobid FROM cron.job WHERE jobname IN (
    'ops_partition_create_api_request_counts',
    'ops_partition_create_operation_events',
    'ops_partition_prune_api_request_counts',
    'ops_partition_prune_operation_events'
  ) LOOP
    PERFORM cron.unschedule(job_id);
  END LOOP;
END $$;

-- Create next month's partition on day 25 (10 days of slack before month rollover).
SELECT cron.schedule(
  'ops_partition_create_api_request_counts',
  '0 3 25 * *',
  $$SELECT ops_create_monthly_partition('api_request_counts', (date_trunc('month', now()) + interval '1 month')::date);$$
);

SELECT cron.schedule(
  'ops_partition_create_operation_events',
  '0 3 25 * *',
  $$SELECT ops_create_monthly_partition('operation_events', (date_trunc('month', now()) + interval '1 month')::date);$$
);

-- Prune old partitions on day 1 of each month.
SELECT cron.schedule(
  'ops_partition_prune_api_request_counts',
  '0 4 1 * *',
  $$SELECT ops_prune_monthly_partitions('api_request_counts', 6);$$
);

SELECT cron.schedule(
  'ops_partition_prune_operation_events',
  '0 4 1 * *',
  $$SELECT ops_prune_monthly_partitions('operation_events', 3);$$
);

COMMIT;
