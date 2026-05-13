-- =============================================================================
-- Index Diet + transfers Autovacuum Tuning
--
-- Drops indexes with confirmed 0 scans in pg_stat_user_indexes (snapshot taken
-- 2026-05-11). Every drop uses CONCURRENTLY so no table lock is held. Partial
-- and partition-parent indexes are intentionally omitted from this pass — they
-- showed low-but-nonzero usage tied to active code paths in usage.ts and a few
-- dashboard endpoints.
--
-- Total expected size reclaim: ~17 MB across hot tables, plus reduced write
-- amplification on every insert into the parent tables.
--
-- NOTE: CREATE/DROP INDEX CONCURRENTLY cannot run inside a transaction block.
--       Apply this file in non-transactional mode (the Supabase apply_migration
--       tool runs each statement individually).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- audit_log: 2 indexes, ~5.7 MB
-- -----------------------------------------------------------------------------
DROP INDEX CONCURRENTLY IF EXISTS public.idx_audit_actor;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_audit_entity;

-- -----------------------------------------------------------------------------
-- a2a_audit_events: 2 indexes, ~2.4 MB
-- (kept: idx_a2a_audit_events_tenant_env, idx_a2a_audit_tenant_task, idx_a2a_audit_tenant_type)
-- -----------------------------------------------------------------------------
DROP INDEX CONCURRENTLY IF EXISTS public.idx_a2a_audit_created;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_a2a_audit_tenant_agent;

-- -----------------------------------------------------------------------------
-- security_events: 3 indexes, ~2.8 MB
-- (kept: idx_security_events_tenant, idx_security_events_user)
-- -----------------------------------------------------------------------------
DROP INDEX CONCURRENTLY IF EXISTS public.idx_security_events_ip;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_security_events_severity;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_security_events_type;

-- -----------------------------------------------------------------------------
-- treasury_balance_history: 2 indexes, ~5.5 MB
-- (pkey retained — required)
-- -----------------------------------------------------------------------------
DROP INDEX CONCURRENTLY IF EXISTS public.idx_treasury_balance_history_account;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_treasury_balance_history_snapshot;

-- -----------------------------------------------------------------------------
-- transfers: 5 indexes, ~1.1 MB (small absolute size but write-amplification matters)
-- -----------------------------------------------------------------------------
DROP INDEX CONCURRENTLY IF EXISTS public.idx_transfers_settled_at;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_transfers_settlement_metadata;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_transfers_settlement_network;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_transfers_unsettled;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_transfers_x402_vendor;

-- -----------------------------------------------------------------------------
-- transfers: autovacuum tuning
--
-- Current state: 36,790 live / 6,802 dead rows = 18.49% dead. Last autovacuum
-- 2026-04-06 (35 days ago) — default scale_factor (0.2) is too lax for this
-- update churn volume.
-- -----------------------------------------------------------------------------
ALTER TABLE public.transfers SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_limit = 2000
);

-- One-time catch-up vacuum to flush the existing dead-tuple backlog.
-- This is run separately (not in this migration) to keep the migration short
-- and avoid long locks during application:
--     VACUUM (ANALYZE, VERBOSE) public.transfers;
