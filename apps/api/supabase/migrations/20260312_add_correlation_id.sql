-- Add correlation_id column to operation_events for request-level event grouping
ALTER TABLE operation_events ADD COLUMN IF NOT EXISTS correlation_id TEXT;

-- Partial index for efficient correlation lookups (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_operation_events_correlation
  ON operation_events (tenant_id, correlation_id)
  WHERE correlation_id IS NOT NULL;
