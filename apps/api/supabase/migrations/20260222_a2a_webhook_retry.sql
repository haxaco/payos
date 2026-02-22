-- Story 58.5 + 58.6: Webhook delivery tracking columns on a2a_tasks
-- Tracks webhook dispatch state inline (one webhook target per task).

ALTER TABLE a2a_tasks
  ADD COLUMN IF NOT EXISTS webhook_status TEXT
    CHECK (webhook_status IN ('pending', 'delivered', 'failed', 'dlq')),
  ADD COLUMN IF NOT EXISTS webhook_delivery_id UUID,
  ADD COLUMN IF NOT EXISTS webhook_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webhook_next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_last_response_code INTEGER,
  ADD COLUMN IF NOT EXISTS webhook_last_response_body TEXT,
  ADD COLUMN IF NOT EXISTS webhook_last_response_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS webhook_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_dlq_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_dlq_reason TEXT;

-- Index for retry polling: find failed tasks ready for retry
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_webhook_retry
  ON a2a_tasks (webhook_next_retry_at)
  WHERE webhook_status = 'failed' AND webhook_attempts < 5;

-- Index for DLQ listing by tenant
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_webhook_dlq
  ON a2a_tasks (tenant_id, webhook_dlq_at)
  WHERE webhook_status = 'dlq';
