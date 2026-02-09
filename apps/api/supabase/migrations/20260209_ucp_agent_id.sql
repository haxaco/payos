-- Add agent_id as first-class field to UCP checkouts and orders
-- Previously agent_id was buried in the metadata JSONB blob with no index or query support.

ALTER TABLE ucp_checkout_sessions ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE ucp_orders ADD COLUMN IF NOT EXISTS agent_id TEXT;

-- Partial indexes: most rows won't have an agent_id so partial index is more efficient
CREATE INDEX IF NOT EXISTS idx_ucp_checkout_agent ON ucp_checkout_sessions(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ucp_orders_agent ON ucp_orders(agent_id) WHERE agent_id IS NOT NULL;

-- Backfill from metadata for existing rows
UPDATE ucp_checkout_sessions SET agent_id = metadata->>'agent_id' WHERE metadata->>'agent_id' IS NOT NULL AND agent_id IS NULL;
UPDATE ucp_orders SET agent_id = metadata->>'agent_id' WHERE metadata->>'agent_id' IS NOT NULL AND agent_id IS NULL;
