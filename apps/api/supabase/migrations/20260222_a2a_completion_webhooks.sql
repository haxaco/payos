-- Story 58.16: Completion webhooks — notify callers when tasks reach terminal state
-- These columns track the *completion* callback (caller-provided URL to receive results),
-- separate from the existing webhook_* columns which track *dispatch* webhooks (pushing
-- tasks to external agents for processing).

ALTER TABLE a2a_tasks
  ADD COLUMN IF NOT EXISTS callback_url VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS callback_secret VARCHAR(255),
  ADD COLUMN IF NOT EXISTS callback_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS callback_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS callback_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS callback_last_response_code INTEGER,
  ADD COLUMN IF NOT EXISTS callback_next_retry_at TIMESTAMPTZ;
