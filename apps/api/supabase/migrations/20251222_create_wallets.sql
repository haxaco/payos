-- ============================================
-- Migration: Create Wallets Table (Generic - Any Account)
-- Purpose: Enable any account to have wallets with optional spending policies
-- Note: NOT agent-specific - any account type can have wallets
-- Spec: https://www.x402.org/x402-whitepaper.pdf
-- ============================================

-- Create wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Owner (any account type: person, business, or agent)
  owner_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Optional: If this wallet is managed by an agent
  managed_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Balance (Stablecoins only per x402 spec)
  balance DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'USDC' CHECK (currency IN ('USDC', 'EURC')),
  
  -- Wallet Identity (for x402 payments)
  wallet_address TEXT,  -- On-chain address (Phase 2) or internal ID (Phase 1)
  network TEXT DEFAULT 'base-mainnet',
  
  -- Spending Policy (optional - enforced on x402 payments if set)
  spending_policy JSONB DEFAULT NULL,
  -- spending_policy structure:
  -- {
  --   "daily_limit": 100.00,
  --   "daily_spent": 24.75,
  --   "daily_reset_at": "2025-12-22T00:00:00Z",
  --   "monthly_limit": 2000.00,
  --   "monthly_spent": 245.50,
  --   "monthly_reset_at": "2026-01-01T00:00:00Z",
  --   "approved_vendors": ["api.acme.com", "api.beta.com"],
  --   "approved_categories": ["compliance", "fx_intelligence"],
  --   "requires_approval_above": 50.00,
  --   "auto_fund": {
  --     "enabled": true,
  --     "threshold": 100.00,
  --     "amount": 500.00,
  --     "source_account_id": "uuid"
  --   }
  -- }
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'depleted')),
  
  -- Metadata
  name TEXT,    -- Optional friendly name (e.g., "Compliance Bot Wallet")
  purpose TEXT, -- Optional description of wallet use
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE wallets IS 'Wallets for any account type (person, business, agent) with optional spending policies';
COMMENT ON COLUMN wallets.owner_account_id IS 'Account that owns this wallet (any type)';
COMMENT ON COLUMN wallets.managed_by_agent_id IS 'Optional: Agent that manages/controls this wallet';
COMMENT ON COLUMN wallets.balance IS 'Current wallet balance (stablecoins only)';
COMMENT ON COLUMN wallets.currency IS 'Wallet currency - stablecoins only (USDC, EURC) per x402 spec';
COMMENT ON COLUMN wallets.wallet_address IS 'On-chain wallet address (Phase 2) or internal identifier (Phase 1)';
COMMENT ON COLUMN wallets.spending_policy IS 'Optional spending limits and controls for x402 payments';
COMMENT ON COLUMN wallets.status IS 'active: normal operation, frozen: payments disabled, depleted: balance too low';

-- Create indexes
CREATE INDEX idx_wallets_tenant ON wallets(tenant_id);
CREATE INDEX idx_wallets_owner ON wallets(owner_account_id);
CREATE INDEX idx_wallets_agent ON wallets(managed_by_agent_id) WHERE managed_by_agent_id IS NOT NULL;
CREATE INDEX idx_wallets_status ON wallets(status);
CREATE INDEX idx_wallets_created ON wallets(created_at DESC);
CREATE INDEX idx_wallets_balance ON wallets(balance DESC) WHERE balance > 0;

-- Create partial index for wallets with spending policies
CREATE INDEX idx_wallets_with_policy ON wallets(owner_account_id) WHERE spending_policy IS NOT NULL;

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can view their own wallets" ON wallets
  FOR SELECT
  USING (tenant_id = (SELECT public.get_user_tenant_id()));

CREATE POLICY "Tenants can create wallets" ON wallets
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_user_tenant_id()));

CREATE POLICY "Tenants can update their own wallets" ON wallets
  FOR UPDATE
  USING (tenant_id = (SELECT public.get_user_tenant_id()));

CREATE POLICY "Tenants can delete their own wallets" ON wallets
  FOR DELETE
  USING (tenant_id = (SELECT public.get_user_tenant_id()));

-- Trigger for updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON wallets TO authenticated;

-- Helper function to check if wallet has sufficient balance
CREATE OR REPLACE FUNCTION check_wallet_balance(
  p_wallet_id UUID,
  p_required_amount DECIMAL(15,4)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance DECIMAL(15,4);
BEGIN
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE id = p_wallet_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  RETURN v_balance >= p_required_amount;
END;
$$;

COMMENT ON FUNCTION check_wallet_balance IS 'Check if wallet has sufficient balance for a transaction';

-- Helper function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_wallet_id UUID,
  p_amount DECIMAL(15,4),
  p_operation TEXT -- 'credit' or 'debit'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_balance DECIMAL(15,4);
BEGIN
  -- Validate operation
  IF p_operation NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Invalid operation. Must be credit or debit';
  END IF;
  
  -- Update balance
  UPDATE public.wallets
  SET 
    balance = CASE 
      WHEN p_operation = 'credit' THEN balance + p_amount
      WHEN p_operation = 'debit' THEN balance - p_amount
    END,
    updated_at = now()
  WHERE id = p_wallet_id
  RETURNING balance INTO v_new_balance;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Check for negative balance (should not happen due to checks, but safety)
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Transaction would result in negative balance';
  END IF;
END;
$$;

COMMENT ON FUNCTION update_wallet_balance IS 'Credit or debit a wallet balance (with safety checks)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ wallets table created successfully';
  RAISE NOTICE '✅ RLS policies enabled for tenant isolation';
  RAISE NOTICE '✅ Stablecoin-only currency constraint active';
  RAISE NOTICE '✅ Generic wallets (any account type)';
  RAISE NOTICE '✅ Optional spending policy support';
  RAISE NOTICE '✅ Helper functions created for balance management';
END $$;

