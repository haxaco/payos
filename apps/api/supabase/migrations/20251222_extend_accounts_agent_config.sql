-- ============================================
-- Migration: Extend Accounts Table for Agent Support
-- Purpose: Add agent account type and agent_config for x402 settings
-- ============================================

-- Add 'agent' to account_type enum (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'agent'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type')
  ) THEN
    ALTER TYPE account_type ADD VALUE 'agent';
    RAISE NOTICE '✅ Added agent to account_type enum';
  ELSE
    RAISE NOTICE '⚠️  agent already exists in account_type enum';
  END IF;
END $$;

-- Add agent_config column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN accounts.agent_config IS 'Configuration for agent-type accounts including x402 settings and parent account reference';

-- agent_config structure:
-- {
--   "parent_account_id": "uuid",           -- Account that owns/controls this agent
--   "purpose": "Automate compliance checks", -- Description of agent purpose
--   "x402_enabled": true,                  -- Whether agent can make x402 payments
--   "default_wallet_id": "uuid",           -- Default wallet for x402 payments
--   "capabilities": ["api_calls", "payments"], -- Agent capabilities
--   "model": "gpt-4",                      -- AI model (if applicable)
--   "version": "1.0.0"                     -- Agent version
-- }

-- Create index for agent lookups by parent
CREATE INDEX IF NOT EXISTS idx_accounts_agent_parent 
  ON accounts((agent_config->>'parent_account_id'))
  WHERE type = 'agent' AND agent_config IS NOT NULL;

-- Create index for x402-enabled agents
CREATE INDEX IF NOT EXISTS idx_accounts_agent_x402_enabled 
  ON accounts((agent_config->>'x402_enabled'))
  WHERE type = 'agent' AND (agent_config->>'x402_enabled')::boolean = true;

-- Helper function to create agent account
CREATE OR REPLACE FUNCTION create_agent_account(
  p_tenant_id UUID,
  p_parent_account_id UUID,
  p_name TEXT,
  p_purpose TEXT DEFAULT NULL,
  p_x402_enabled BOOLEAN DEFAULT true,
  p_default_wallet_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  -- Validate parent account exists
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_parent_account_id
    AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Parent account not found';
  END IF;
  
  -- Create agent account
  INSERT INTO public.accounts (
    tenant_id,
    type,
    name,
    agent_config,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    'agent',
    p_name,
    jsonb_build_object(
      'parent_account_id', p_parent_account_id,
      'purpose', p_purpose,
      'x402_enabled', p_x402_enabled,
      'default_wallet_id', p_default_wallet_id,
      'capabilities', jsonb_build_array('api_calls', 'payments'),
      'version', '1.0.0'
    ),
    now(),
    now()
  ) RETURNING id INTO v_agent_id;
  
  RAISE NOTICE '✅ Created agent account: %', v_agent_id;
  RETURN v_agent_id;
END;
$$;

COMMENT ON FUNCTION create_agent_account IS 'Create an agent account with proper configuration';

-- Helper function to get agents by parent account
CREATE OR REPLACE FUNCTION get_agents_by_parent(
  p_parent_account_id UUID
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  purpose TEXT,
  x402_enabled BOOLEAN,
  default_wallet_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.tenant_id,
    a.name,
    a.agent_config->>'purpose' as purpose,
    (a.agent_config->>'x402_enabled')::boolean as x402_enabled,
    (a.agent_config->>'default_wallet_id')::uuid as default_wallet_id,
    a.created_at
  FROM public.accounts a
  WHERE a.type = 'agent'
    AND a.agent_config->>'parent_account_id' = p_parent_account_id::text
  ORDER BY a.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_agents_by_parent IS 'Get all agent accounts owned by a parent account';

-- Helper function to check if agent has x402 access
CREATE OR REPLACE FUNCTION agent_has_x402_access(
  p_agent_account_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_x402_enabled BOOLEAN;
BEGIN
  SELECT (agent_config->>'x402_enabled')::boolean
  INTO v_x402_enabled
  FROM public.accounts
  WHERE id = p_agent_account_id
    AND type = 'agent';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent account not found';
  END IF;
  
  RETURN COALESCE(v_x402_enabled, false);
END;
$$;

COMMENT ON FUNCTION agent_has_x402_access IS 'Check if an agent has x402 payment capabilities enabled';

-- Constraint: Agent accounts must have agent_config
ALTER TABLE accounts ADD CONSTRAINT check_agent_has_config
  CHECK (
    type != 'agent' OR (type = 'agent' AND agent_config IS NOT NULL)
  );

-- Constraint: Non-agent accounts should not have agent_config
ALTER TABLE accounts ADD CONSTRAINT check_non_agent_no_config
  CHECK (
    type = 'agent' OR (type != 'agent' AND agent_config IS NULL)
  );

-- Verification
DO $$
DECLARE
  v_has_agent_type BOOLEAN;
  v_has_config_column BOOLEAN;
BEGIN
  -- Check if agent type exists
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'agent'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type')
  ) INTO v_has_agent_type;
  
  -- Check if agent_config column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts'
    AND column_name = 'agent_config'
  ) INTO v_has_config_column;
  
  IF v_has_agent_type AND v_has_config_column THEN
    RAISE NOTICE '✅ accounts table extended for agent support';
    RAISE NOTICE '✅ agent type added to account_type enum';
    RAISE NOTICE '✅ agent_config column added';
    RAISE NOTICE '✅ Indexes created for agent queries';
    RAISE NOTICE '✅ Constraints added for agent_config validation';
    RAISE NOTICE '✅ Helper functions created';
  ELSE
    RAISE WARNING '⚠️  Migration incomplete. Check logs.';
  END IF;
END $$;

