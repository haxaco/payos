-- Agent auto-refill policy columns
--
-- Adds per-agent configuration for the auto-refill worker
-- (apps/api/src/workers/agent-auto-refill.ts). When enabled, the worker
-- tops up the agent's EVM EOA from the tenant's Circle master wallet
-- whenever on-chain balance falls below the configured threshold,
-- subject to a daily cap.
--
-- Defaults are OFF to avoid changing behavior for existing agents.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS auto_refill_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_refill_threshold      NUMERIC,       -- in USDC whole units, e.g. 0.20
  ADD COLUMN IF NOT EXISTS auto_refill_target         NUMERIC,       -- top back up to this, e.g. 1.00
  ADD COLUMN IF NOT EXISTS auto_refill_daily_cap      NUMERIC,       -- max $ auto-refilled per UTC day, e.g. 5.00
  ADD COLUMN IF NOT EXISTS auto_refill_daily_spent    NUMERIC NOT NULL DEFAULT 0,  -- resets daily
  ADD COLUMN IF NOT EXISTS auto_refill_daily_reset_at TIMESTAMPTZ,   -- tracks daily reset boundary
  ADD COLUMN IF NOT EXISTS auto_refill_last_at        TIMESTAMPTZ,   -- last successful refill
  ADD COLUMN IF NOT EXISTS auto_refill_last_status    TEXT,          -- 'ok' | 'master_underfunded' | 'circle_error' | 'capped' | 'skipped_pending'
  ADD COLUMN IF NOT EXISTS auto_refill_last_error     TEXT;          -- short error summary, null on success

-- Index the workers's primary filter so scans don't slow down as tenant
-- agent count grows
CREATE INDEX IF NOT EXISTS idx_agents_auto_refill_enabled
  ON agents (tenant_id, auto_refill_enabled)
  WHERE auto_refill_enabled = TRUE;
