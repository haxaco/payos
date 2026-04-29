-- A2A Task Idempotency
--
-- Adds an idempotency_key column to a2a_tasks so that duplicate message/send
-- requests (same JSON-RPC id from the same caller) return the existing task
-- instead of creating a new one and charging twice.
--
-- The key is scoped per (tenant_id, agent_id, idempotency_key) so different
-- callers can safely reuse the same JSON-RPC id value without collision.

ALTER TABLE a2a_tasks
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS a2a_tasks_idempotency_uniq
  ON a2a_tasks (tenant_id, agent_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN a2a_tasks.idempotency_key IS
  'Deduplication key derived from caller_agent_id + JSON-RPC request id. '
  'When present, prevents duplicate tasks from being created for retried '
  'message/send requests. Scoped per (tenant_id, agent_id).';
