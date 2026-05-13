-- =============================================================================
-- Retention Policies for Non-Partitioned Log/Event Tables
--
-- Adds batched-delete prune functions + nightly pg_cron schedules for tables
-- that grow unbounded today:
--   audit_log               → keep 90 days
--   security_events         → keep 30 days
--   a2a_audit_events        → keep 60 days
--   a2a_messages            → keep 60 days  (well beyond any active task)
--   treasury_balance_history→ keep 180 days
--   treasury_alerts         → keep 90 days of *resolved/acknowledged* alerts
--                              (open alerts are never auto-pruned)
--
-- All prune functions delete in 5,000-row batches to avoid long locks.
-- =============================================================================

BEGIN;

-- Generic batch-delete prune for log-style tables keyed by a timestamptz column
CREATE OR REPLACE FUNCTION prune_old_rows(
  target_table text,
  ts_column text,
  keep_days int,
  batch_size int DEFAULT 5000
)
RETURNS bigint
LANGUAGE plpgsql
AS $func$
DECLARE
  total_deleted bigint := 0;
  batch_deleted int;
  cutoff timestamptz := now() - make_interval(days => keep_days);
BEGIN
  IF target_table NOT IN (
    'audit_log','security_events','a2a_audit_events','a2a_messages','treasury_balance_history'
  ) THEN
    RAISE EXCEPTION 'prune_old_rows: unsupported target_table %', target_table;
  END IF;

  IF ts_column NOT IN ('created_at','snapshot_at') THEN
    RAISE EXCEPTION 'prune_old_rows: unsupported ts_column %', ts_column;
  END IF;

  LOOP
    EXECUTE format(
      'WITH victims AS (SELECT id FROM public.%I WHERE %I < %L LIMIT %s)
       DELETE FROM public.%I WHERE id IN (SELECT id FROM victims)',
      target_table, ts_column, cutoff, batch_size, target_table
    );
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    total_deleted := total_deleted + batch_deleted;
    EXIT WHEN batch_deleted = 0;
  END LOOP;

  RETURN total_deleted;
END;
$func$;

COMMENT ON FUNCTION prune_old_rows(text, text, int, int) IS
  'Delete rows older than keep_days from supported log tables, in batches.';

-- treasury_alerts: only prune alerts that are no longer open
CREATE OR REPLACE FUNCTION prune_resolved_treasury_alerts(keep_days int DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
AS $func$
DECLARE
  total_deleted bigint := 0;
  batch_deleted int;
  cutoff timestamptz := now() - make_interval(days => keep_days);
BEGIN
  LOOP
    WITH victims AS (
      SELECT id FROM public.treasury_alerts
      WHERE status IN ('resolved','acknowledged','closed','dismissed')
        AND COALESCE(resolved_at, acknowledged_at, created_at) < cutoff
      LIMIT 5000
    )
    DELETE FROM public.treasury_alerts WHERE id IN (SELECT id FROM victims);
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    total_deleted := total_deleted + batch_deleted;
    EXIT WHEN batch_deleted = 0;
  END LOOP;

  RETURN total_deleted;
END;
$func$;

COMMENT ON FUNCTION prune_resolved_treasury_alerts(int) IS
  'Delete treasury_alerts that are resolved/acknowledged/closed/dismissed and older than keep_days. Open alerts are never auto-pruned.';

-- Schedule prune jobs via pg_cron. All run nightly, staggered between 02:00–02:25
-- UTC so they don't all wake up simultaneously.

-- Idempotently unschedule prior runs.
DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname IN (
    'prune_audit_log',
    'prune_security_events',
    'prune_a2a_audit_events',
    'prune_a2a_messages',
    'prune_treasury_balance_history',
    'prune_resolved_treasury_alerts'
  ) LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

SELECT cron.schedule('prune_audit_log',                '0 2 * * *',
  $cron$SELECT prune_old_rows('audit_log', 'created_at', 90);$cron$);

SELECT cron.schedule('prune_security_events',          '5 2 * * *',
  $cron$SELECT prune_old_rows('security_events', 'created_at', 30);$cron$);

SELECT cron.schedule('prune_a2a_audit_events',         '10 2 * * *',
  $cron$SELECT prune_old_rows('a2a_audit_events', 'created_at', 60);$cron$);

SELECT cron.schedule('prune_a2a_messages',             '15 2 * * *',
  $cron$SELECT prune_old_rows('a2a_messages', 'created_at', 60);$cron$);

SELECT cron.schedule('prune_treasury_balance_history', '20 2 * * *',
  $cron$SELECT prune_old_rows('treasury_balance_history', 'snapshot_at', 180);$cron$);

SELECT cron.schedule('prune_resolved_treasury_alerts', '25 2 * * *',
  $cron$SELECT prune_resolved_treasury_alerts(90);$cron$);

COMMIT;
