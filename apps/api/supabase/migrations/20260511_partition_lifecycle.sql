-- =============================================================================
-- Partition Lifecycle Management
--
-- Problem: api_request_counts and operation_events only have partitions through
-- 2026-04-30. Today is 2026-05-11. All inserts from the in-memory flushers in
-- apps/api/src/services/ops/{request-counter,track-op}.ts have been silently
-- failing for 11 days with "no partition of relation found".
--
-- Fix:
--   1. Catch-up partitions for May, June, July 2026.
--   2. DEFAULT partition on each parent as a safety net for future gaps.
--   3. Idempotent SQL helpers to create/prune monthly partitions going forward.
--   4. pg_cron schedules:
--        - day-25 of every month: create next month's partition
--        - day-1 of every month:  prune partitions older than retention window
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Catch-up partitions (idempotent)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_request_counts_2026_05 PARTITION OF api_request_counts
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS api_request_counts_2026_06 PARTITION OF api_request_counts
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS api_request_counts_2026_07 PARTITION OF api_request_counts
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS operation_events_2026_05 PARTITION OF operation_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS operation_events_2026_06 PARTITION OF operation_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS operation_events_2026_07 PARTITION OF operation_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Match the RLS-on-child-partition pattern established in 20260312_operations_observability.sql.
ALTER TABLE api_request_counts_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_counts_2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_counts_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_events_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_events_2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_events_2026_07 ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. DEFAULT partitions — safety net so future gaps never silently drop writes.
--    If a row lands here, the partition-runway health check will flag it.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_request_counts_default PARTITION OF api_request_counts DEFAULT;
CREATE TABLE IF NOT EXISTS operation_events_default PARTITION OF operation_events DEFAULT;

ALTER TABLE api_request_counts_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_events_default ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Helper: idempotent monthly partition creation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ops_create_monthly_partition(parent_table text, month_start date)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  child_name  text;
  range_start date := date_trunc('month', month_start)::date;
  range_end   date := (date_trunc('month', month_start) + interval '1 month')::date;
BEGIN
  IF parent_table NOT IN ('api_request_counts', 'operation_events') THEN
    RAISE EXCEPTION 'ops_create_monthly_partition: unsupported parent table %', parent_table;
  END IF;

  child_name := format('%s_%s', parent_table, to_char(range_start, 'YYYY_MM'));

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
    child_name, parent_table, range_start, range_end
  );

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', child_name);

  RETURN child_name;
END;
$$;

COMMENT ON FUNCTION ops_create_monthly_partition(text, date) IS
  'Idempotently create a monthly partition for api_request_counts or operation_events.';

-- -----------------------------------------------------------------------------
-- 4. Helper: prune partitions older than retention window
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ops_prune_monthly_partitions(parent_table text, keep_months int)
RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  rec        record;
  cutoff     date := (date_trunc('month', now()) - make_interval(months => keep_months))::date;
  prefix_len int;
  month_part text;
  child_date date;
BEGIN
  IF parent_table NOT IN ('api_request_counts', 'operation_events') THEN
    RAISE EXCEPTION 'ops_prune_monthly_partitions: unsupported parent table %', parent_table;
  END IF;

  prefix_len := length(parent_table) + 2;  -- +2 for the '_' and 'YYYY_MM' start

  FOR rec IN
    SELECT child.relname AS child_name
    FROM pg_inherits i
    JOIN pg_class parent ON parent.oid = i.inhparent
    JOIN pg_class child  ON child.oid  = i.inhrelid
    WHERE parent.relname = parent_table
      AND child.relname  ~ ('^' || parent_table || '_\d{4}_\d{2}$')
  LOOP
    month_part := substring(rec.child_name FROM length(parent_table) + 2);
    BEGIN
      child_date := to_date(month_part, 'YYYY_MM');
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    IF child_date < cutoff THEN
      EXECUTE format('DROP TABLE IF EXISTS public.%I', rec.child_name);
      RETURN NEXT rec.child_name;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION ops_prune_monthly_partitions(text, int) IS
  'Drop monthly partitions older than keep_months. Returns the names of dropped partitions.';

-- -----------------------------------------------------------------------------
-- 5. Scheduler — pg_cron
--    Skipped in this migration: pg_cron requires CREATE EXTENSION which may need
--    Supabase dashboard enablement. Apply 20260511_partition_scheduler.sql once
--    pg_cron is provisioned.
-- -----------------------------------------------------------------------------

COMMIT;
