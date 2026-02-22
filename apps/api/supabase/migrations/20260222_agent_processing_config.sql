-- Story 58.1: Agent Processing Configuration
-- Adds processing mode + config to agents, processor tracking to a2a_tasks

-- 1. Agent processing configuration
ALTER TABLE agents
  ADD COLUMN processing_mode TEXT DEFAULT 'manual'
    CHECK (processing_mode IN ('managed', 'webhook', 'manual')),
  ADD COLUMN processing_config JSONB DEFAULT '{}';

COMMENT ON COLUMN agents.processing_mode IS
  'How A2A tasks are processed: managed (LLM), webhook (external callback), manual (human queue)';
COMMENT ON COLUMN agents.processing_config IS
  'Mode-specific config: managed={model,systemPrompt,maxTokens,temperature}, webhook={callbackUrl,callbackSecret,timeoutMs}';

-- 2. Task processor tracking columns
ALTER TABLE a2a_tasks
  ADD COLUMN processor_id TEXT,
  ADD COLUMN processing_started_at TIMESTAMPTZ,
  ADD COLUMN processing_completed_at TIMESTAMPTZ,
  ADD COLUMN processing_duration_ms INTEGER,
  ADD COLUMN error_details JSONB,
  ADD COLUMN retry_count INTEGER DEFAULT 0,
  ADD COLUMN max_retries INTEGER DEFAULT 3;

-- 3. Index for worker task claiming (FOR UPDATE SKIP LOCKED)
CREATE INDEX idx_a2a_tasks_claimable
  ON a2a_tasks (state, created_at)
  WHERE state = 'submitted' AND processor_id IS NULL;
