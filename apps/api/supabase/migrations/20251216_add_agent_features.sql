-- Migration: Add Agent Type, X-402 Support, and Stats Fields
-- Date: 2025-12-16
-- Purpose: Add missing agent features (type, X-402, transaction stats)

-- Add new columns to agents table
ALTER TABLE agents
  -- Agent type classification
  ADD COLUMN type TEXT DEFAULT 'custom' CHECK (type IN ('payment', 'treasury', 'compliance', 'custom')),
  
  -- X-402 protocol support
  ADD COLUMN x402_enabled BOOLEAN DEFAULT true,
  
  -- Transaction statistics (denormalized for performance)
  ADD COLUMN total_volume NUMERIC(20,8) DEFAULT 0,
  ADD COLUMN total_transactions INTEGER DEFAULT 0;

-- Create index for filtering by type
CREATE INDEX idx_agents_type ON agents(type) WHERE type IS NOT NULL;

-- Create index for X-402 enabled agents
CREATE INDEX idx_agents_x402_enabled ON agents(x402_enabled) WHERE x402_enabled = true;

-- Add comment
COMMENT ON COLUMN agents.type IS 'Agent classification: payment (handles payments), treasury (manages funds), compliance (monitors/enforces rules), custom (user-defined)';
COMMENT ON COLUMN agents.x402_enabled IS 'Whether agent supports X-402 protocol for autonomous machine payments';
COMMENT ON COLUMN agents.total_volume IS 'Total USD value of all transactions processed by this agent (denormalized)';
COMMENT ON COLUMN agents.total_transactions IS 'Total count of transactions processed by this agent (denormalized)';

-- Update existing agents to have default values
UPDATE agents 
SET 
  type = 'custom',
  x402_enabled = true,
  total_volume = 0,
  total_transactions = 0
WHERE type IS NULL;

