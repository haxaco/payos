-- Fix ON CONFLICT against partitioned scanner_usage_events.
-- The partition-level UNIQUE constraints from 20260422_scanner_usage.sql
-- satisfy per-partition uniqueness but can't back an ON CONFLICT targeting
-- the parent table. Replace them with a parent-level constraint.

ALTER TABLE scanner_usage_events_2026_04
  DROP CONSTRAINT IF EXISTS scanner_usage_events_2026_04_unique;
ALTER TABLE scanner_usage_events_2026_05
  DROP CONSTRAINT IF EXISTS scanner_usage_events_2026_05_unique;
ALTER TABLE scanner_usage_events_2026_06
  DROP CONSTRAINT IF EXISTS scanner_usage_events_2026_06_unique;

ALTER TABLE scanner_usage_events
  ADD CONSTRAINT scanner_usage_events_unique
  UNIQUE (tenant_id, scanner_key_id, minute_bucket, method, path_template, status_code, actor_type);
