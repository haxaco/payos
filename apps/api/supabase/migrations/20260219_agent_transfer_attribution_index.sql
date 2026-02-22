-- Agent transfer attribution index
-- Supports efficient lookups for GET /v1/agents/:id/transactions
-- which queries transfers by (tenant_id, initiated_by_type, initiated_by_id)

CREATE INDEX IF NOT EXISTS idx_transfers_initiated_by
ON transfers(tenant_id, initiated_by_type, initiated_by_id)
WHERE initiated_by_type IS NOT NULL;
