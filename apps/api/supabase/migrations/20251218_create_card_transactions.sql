-- Migration: Create Card Transactions Table
-- Epic: 0, Story: 0.4
-- Date: 2025-12-18
-- Purpose: Track card transaction history separately from transfers

-- ============================================
-- Create card_transactions table
-- ============================================

CREATE TABLE card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Transaction details
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'purchase',           -- Card purchase
    'refund',             -- Refund to card
    'auth_hold',          -- Authorization hold
    'auth_release',       -- Authorization release
    'decline',            -- Declined transaction
    'reversal'            -- Transaction reversal
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending',
    'completed',
    'failed',
    'reversed'
  )),
  
  -- Amounts
  amount NUMERIC(20,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  
  -- Merchant information
  merchant_name VARCHAR(255),
  merchant_category VARCHAR(100),
  merchant_country VARCHAR(3),
  merchant_id VARCHAR(255),
  
  -- Card details (snapshot at transaction time)
  card_last_four VARCHAR(4),
  
  -- Transaction metadata
  authorization_code VARCHAR(50),
  decline_reason VARCHAR(255),
  decline_code VARCHAR(50),
  
  -- External references
  external_transaction_id VARCHAR(255),
  external_network_id VARCHAR(255), -- e.g., Visa transaction ID
  
  -- Dispute tracking
  is_disputed BOOLEAN DEFAULT false,
  disputed_at TIMESTAMPTZ,
  dispute_id UUID REFERENCES disputes(id),
  
  -- Timestamps
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional data
  metadata JSONB DEFAULT '{}'::JSONB
);

-- ============================================
-- Create indexes for performance
-- ============================================

-- Index for lookups by payment method (most common query)
CREATE INDEX idx_card_transactions_payment_method 
  ON card_transactions(tenant_id, payment_method_id, transaction_time DESC);

-- Index for lookups by account
CREATE INDEX idx_card_transactions_account 
  ON card_transactions(tenant_id, account_id, transaction_time DESC);

-- Index for merchant lookups
CREATE INDEX idx_card_transactions_merchant 
  ON card_transactions(tenant_id, merchant_name);

-- Index for disputed transactions
CREATE INDEX idx_card_transactions_disputed 
  ON card_transactions(tenant_id, is_disputed) 
  WHERE is_disputed = true;

-- Index for external ID lookups
CREATE INDEX idx_card_transactions_external 
  ON card_transactions(external_transaction_id);

-- Index for time-based queries
CREATE INDEX idx_card_transactions_time 
  ON card_transactions(tenant_id, transaction_time DESC);

-- Index for type filtering
CREATE INDEX idx_card_transactions_type 
  ON card_transactions(tenant_id, type, status);

-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- SELECT Policy: Tenants can only view their own card transactions
CREATE POLICY "Tenants can view their own card transactions" ON card_transactions
  FOR SELECT 
  USING (tenant_id = public.get_user_tenant_id());

-- INSERT Policy: Tenants can only create card transactions for their own data
CREATE POLICY "Tenants can insert their own card transactions" ON card_transactions
  FOR INSERT 
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- UPDATE Policy: Tenants can only update their own card transactions
CREATE POLICY "Tenants can update their own card transactions" ON card_transactions
  FOR UPDATE 
  USING (tenant_id = public.get_user_tenant_id());

-- DELETE Policy: Tenants can only delete their own card transactions
CREATE POLICY "Tenants can delete their own card transactions" ON card_transactions
  FOR DELETE 
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- Create trigger for updated_at
-- ============================================

CREATE TRIGGER update_card_transactions_updated_at
  BEFORE UPDATE ON card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Add column comments
-- ============================================

COMMENT ON TABLE card_transactions IS 'Tracks all card transaction activity including purchases, refunds, and declines';
COMMENT ON COLUMN card_transactions.type IS 'Transaction type: purchase, refund, auth_hold, auth_release, decline, reversal';
COMMENT ON COLUMN card_transactions.status IS 'Transaction status: pending, completed, failed, reversed';
COMMENT ON COLUMN card_transactions.merchant_name IS 'Name of merchant where transaction occurred';
COMMENT ON COLUMN card_transactions.merchant_category IS 'Merchant category code (MCC) or category name';
COMMENT ON COLUMN card_transactions.authorization_code IS 'Authorization code from card network';
COMMENT ON COLUMN card_transactions.decline_reason IS 'Human-readable reason for decline';
COMMENT ON COLUMN card_transactions.decline_code IS 'Machine-readable decline code';
COMMENT ON COLUMN card_transactions.is_disputed IS 'Whether transaction is under dispute';
COMMENT ON COLUMN card_transactions.external_transaction_id IS 'External PSP or card network transaction ID';
COMMENT ON COLUMN card_transactions.transaction_time IS 'Time when transaction occurred (may differ from created_at for delayed reporting)';

-- ============================================
-- Create function to get card activity
-- ============================================

CREATE OR REPLACE FUNCTION get_card_activity(
  p_payment_method_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  type VARCHAR(50),
  status VARCHAR(20),
  amount NUMERIC,
  currency VARCHAR(10),
  merchant_name VARCHAR(255),
  merchant_category VARCHAR(100),
  transaction_time TIMESTAMPTZ,
  is_disputed BOOLEAN,
  card_last_four VARCHAR(4)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.type,
    ct.status,
    ct.amount,
    ct.currency,
    ct.merchant_name,
    ct.merchant_category,
    ct.transaction_time,
    ct.is_disputed,
    ct.card_last_four
  FROM card_transactions ct
  WHERE ct.payment_method_id = p_payment_method_id
  ORDER BY ct.transaction_time DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_card_activity IS 'Returns recent card transaction activity for a payment method';

-- ============================================
-- Create function to get card spending summary
-- ============================================

CREATE OR REPLACE FUNCTION get_card_spending_summary(
  p_payment_method_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS TABLE (
  total_spent NUMERIC,
  transaction_count BIGINT,
  avg_transaction NUMERIC,
  largest_transaction NUMERIC,
  most_frequent_merchant VARCHAR(255),
  merchant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN ct.type = 'purchase' THEN ct.amount ELSE 0 END), 0) as total_spent,
    COUNT(CASE WHEN ct.type = 'purchase' THEN 1 END) as transaction_count,
    COALESCE(AVG(CASE WHEN ct.type = 'purchase' THEN ct.amount END), 0) as avg_transaction,
    COALESCE(MAX(CASE WHEN ct.type = 'purchase' THEN ct.amount END), 0) as largest_transaction,
    (
      SELECT merchant_name 
      FROM card_transactions 
      WHERE payment_method_id = p_payment_method_id 
        AND type = 'purchase'
        AND transaction_time >= NOW() - (p_days || ' days')::INTERVAL
      GROUP BY merchant_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_frequent_merchant,
    COUNT(DISTINCT ct.merchant_name) as merchant_count
  FROM card_transactions ct
  WHERE ct.payment_method_id = p_payment_method_id
    AND ct.transaction_time >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION get_card_spending_summary IS 'Returns spending summary statistics for a payment method';

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  -- Check that table was created
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'card_transactions') THEN
    RAISE EXCEPTION 'card_transactions table was not created';
  END IF;
  
  -- Check RLS is enabled
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'card_transactions') THEN
    RAISE EXCEPTION 'RLS not enabled on card_transactions table';
  END IF;
  
  RAISE NOTICE '✅ Successfully created card_transactions table';
  RAISE NOTICE '✅ Enabled RLS on card_transactions table';
  RAISE NOTICE '✅ Created get_card_activity() function';
  RAISE NOTICE '✅ Created get_card_spending_summary() function';
  RAISE NOTICE '💳 Card transaction tracking is now available';
END $$;


