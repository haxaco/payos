-- ============================================
-- Migration: Agent Payment Approvals
-- Story 18.R2: Approval Workflow Infrastructure
-- Purpose: Create approval queue for high-value agent payments
-- ============================================

-- Create enum for approval status
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'executed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for protocol types
DO $$ BEGIN
  CREATE TYPE payment_protocol AS ENUM ('x402', 'ap2', 'acp', 'ucp');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create agent_payment_approvals table
CREATE TABLE IF NOT EXISTS agent_payment_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  
  -- Agent reference (optional - wallet may not be agent-managed)
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Payment details (frozen at request time)
  protocol VARCHAR(20) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
  
  -- Recipient information (protocol-specific)
  recipient JSONB,
  -- For x402: { endpoint_id, endpoint_path, vendor }
  -- For AP2: { mandate_id, merchant }
  -- For ACP: { checkout_id, merchant_id, merchant_name }
  -- For UCP: { corridor, settlement_id }
  
  -- Full context for execution after approval
  payment_context JSONB NOT NULL,
  -- Contains all data needed to execute the payment after approval
  
  -- Status management
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Decision tracking
  decided_by UUID REFERENCES user_profiles(id),
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,
  
  -- Execution tracking
  executed_transfer_id UUID REFERENCES transfers(id),
  executed_at TIMESTAMPTZ,
  execution_error TEXT,
  
  -- Audit
  requested_by_type VARCHAR(20), -- 'user', 'agent', 'api_key'
  requested_by_id VARCHAR(255),
  requested_by_name VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE agent_payment_approvals IS 'Approval queue for agent payments exceeding spending thresholds';
COMMENT ON COLUMN agent_payment_approvals.protocol IS 'Protocol that triggered this approval: x402, ap2, acp, or ucp';
COMMENT ON COLUMN agent_payment_approvals.payment_context IS 'Full context needed to execute payment after approval';
COMMENT ON COLUMN agent_payment_approvals.expires_at IS 'Approval request expires after 24 hours by default';
COMMENT ON COLUMN agent_payment_approvals.executed_transfer_id IS 'Reference to the transfer created after approval';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON agent_payment_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_wallet ON agent_payment_approvals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_approvals_agent ON agent_payment_approvals(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approvals_status ON agent_payment_approvals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_pending ON agent_payment_approvals(tenant_id, status, created_at) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approvals_expires ON agent_payment_approvals(expires_at) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_approvals_created ON agent_payment_approvals(created_at DESC);

-- Enable RLS
ALTER TABLE agent_payment_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "approvals_tenant_select" ON agent_payment_approvals
  FOR SELECT
  USING (tenant_id = (SELECT public.get_user_tenant_id()));

CREATE POLICY "approvals_tenant_insert" ON agent_payment_approvals
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_user_tenant_id()));

CREATE POLICY "approvals_tenant_update" ON agent_payment_approvals
  FOR UPDATE
  USING (tenant_id = (SELECT public.get_user_tenant_id()));

-- Service role policies for background jobs
CREATE POLICY "approvals_service_all" ON agent_payment_approvals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_approvals_updated_at
  BEFORE UPDATE ON agent_payment_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON agent_payment_approvals TO authenticated;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to mark expired approvals
CREATE OR REPLACE FUNCTION expire_pending_approvals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.agent_payment_approvals
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

COMMENT ON FUNCTION expire_pending_approvals IS 'Mark all pending approvals past their expiration as expired';

-- Function to get pending approval count for a wallet
CREATE OR REPLACE FUNCTION get_pending_approval_count(p_wallet_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM public.agent_payment_approvals
  WHERE wallet_id = p_wallet_id
    AND status = 'pending'
    AND expires_at > NOW();
  
  RETURN pending_count;
END;
$$;

COMMENT ON FUNCTION get_pending_approval_count IS 'Get count of pending approvals for a wallet';

-- Function to get total pending amount for a wallet
CREATE OR REPLACE FUNCTION get_pending_approval_amount(p_wallet_id UUID)
RETURNS DECIMAL(20,8)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pending_amount DECIMAL(20,8);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO pending_amount
  FROM public.agent_payment_approvals
  WHERE wallet_id = p_wallet_id
    AND status = 'pending'
    AND expires_at > NOW();
  
  RETURN pending_amount;
END;
$$;

COMMENT ON FUNCTION get_pending_approval_amount IS 'Get total amount in pending approvals for a wallet';

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ agent_payment_approvals table created';
  RAISE NOTICE '✅ RLS policies enabled for tenant isolation';
  RAISE NOTICE '✅ Indexes created for efficient querying';
  RAISE NOTICE '✅ Helper functions created for approval management';
END $$;
