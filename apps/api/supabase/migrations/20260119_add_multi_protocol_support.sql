-- Migration: Add Multi-Protocol Support to Agents
-- Date: 2026-01-19
-- Purpose: Add protocol enablement columns for AP2, ACP, and UCP protocols

-- Add new protocol columns to agents table
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS ap2_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS acp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ucp_enabled BOOLEAN DEFAULT false;

-- Create indexes for protocol-enabled agents
CREATE INDEX IF NOT EXISTS idx_agents_ap2_enabled ON agents(ap2_enabled) WHERE ap2_enabled = true;
CREATE INDEX IF NOT EXISTS idx_agents_acp_enabled ON agents(acp_enabled) WHERE acp_enabled = true;
CREATE INDEX IF NOT EXISTS idx_agents_ucp_enabled ON agents(ucp_enabled) WHERE ucp_enabled = true;

-- Add comments
COMMENT ON COLUMN agents.ap2_enabled IS 'Whether agent supports AP2 (Google Agent Payment Protocol) for mandate-based payments';
COMMENT ON COLUMN agents.acp_enabled IS 'Whether agent supports ACP (Stripe/OpenAI Agentic Commerce Protocol) for checkout flows';
COMMENT ON COLUMN agents.ucp_enabled IS 'Whether agent supports UCP (Universal Commerce Protocol by Google+Shopify) for settlement operations';

-- Enable UCP for existing agents that have x402 enabled (they're likely advanced agents)
UPDATE agents
SET
  ucp_enabled = true
WHERE x402_enabled = true;
