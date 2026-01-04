--
-- ACP (Agentic Commerce Protocol) Foundation
-- Stripe/OpenAI's checkout protocol for agentic commerce
--
-- Features:
-- - Checkout sessions with cart items
-- - Merchant integration
-- - Shared payment tokens
-- - Multi-item purchases
--

-- ============================================
-- ACP Checkouts Table
-- ============================================

CREATE TABLE acp_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Checkout identification
  checkout_id TEXT NOT NULL,  -- External checkout ID (e.g., from Stripe/OpenAI)
  session_id TEXT,            -- Session ID for tracking
  
  -- Agent & customer info
  agent_id TEXT NOT NULL,     -- Agent identifier (e.g., shopping assistant)
  agent_name TEXT,            -- Human-readable agent name
  customer_id TEXT,           -- Customer identifier
  customer_email TEXT,        -- Customer email
  
  -- Payment account
  account_id UUID NOT NULL REFERENCES accounts(id),  -- PayOS account for settlement
  
  -- Merchant info
  merchant_id TEXT NOT NULL,  -- Merchant identifier
  merchant_name TEXT,         -- Merchant display name
  merchant_url TEXT,          -- Merchant website
  
  -- Amounts
  subtotal DECIMAL(20, 8) NOT NULL,
  tax_amount DECIMAL(20, 8) DEFAULT 0,
  shipping_amount DECIMAL(20, 8) DEFAULT 0,
  discount_amount DECIMAL(20, 8) DEFAULT 0,
  total_amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'completed', 'cancelled', 'expired', 'failed'
  
  -- Payment
  shared_payment_token TEXT,  -- Stripe/OpenAI shared payment token
  payment_method TEXT,        -- Payment method type (e.g., 'card', 'crypto', 'link')
  transfer_id UUID REFERENCES transfers(id),  -- Link to completed transfer
  
  -- Metadata
  checkout_data JSONB,        -- Protocol-specific checkout data
  shipping_address JSONB,     -- Shipping address
  metadata JSONB,             -- Additional metadata
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE (tenant_id, checkout_id)
);

-- Indexes
CREATE INDEX idx_acp_checkouts_tenant ON acp_checkouts(tenant_id);
CREATE INDEX idx_acp_checkouts_status ON acp_checkouts(status);
CREATE INDEX idx_acp_checkouts_agent ON acp_checkouts(agent_id);
CREATE INDEX idx_acp_checkouts_merchant ON acp_checkouts(merchant_id);
CREATE INDEX idx_acp_checkouts_customer ON acp_checkouts(customer_id);
CREATE INDEX idx_acp_checkouts_created ON acp_checkouts(created_at DESC);

-- Comments
COMMENT ON TABLE acp_checkouts IS 'ACP (Agentic Commerce Protocol) checkout sessions';
COMMENT ON COLUMN acp_checkouts.checkout_id IS 'External checkout ID from Stripe/OpenAI ACP';
COMMENT ON COLUMN acp_checkouts.agent_id IS 'Shopping assistant or agent identifier';
COMMENT ON COLUMN acp_checkouts.shared_payment_token IS 'Stripe/OpenAI shared payment token for authorization';

-- ============================================
-- ACP Checkout Items Table
-- ============================================

CREATE TABLE acp_checkout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  checkout_id UUID NOT NULL REFERENCES acp_checkouts(id) ON DELETE CASCADE,
  
  -- Item info
  item_id TEXT,               -- External item/SKU ID
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Pricing
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(20, 8) NOT NULL,
  total_price DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
  
  -- Metadata
  item_data JSONB,            -- Additional item data (attributes, variants, etc.)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (total_price >= 0)
);

-- Indexes
CREATE INDEX idx_acp_checkout_items_checkout ON acp_checkout_items(checkout_id);
CREATE INDEX idx_acp_checkout_items_tenant ON acp_checkout_items(tenant_id);

-- Comments
COMMENT ON TABLE acp_checkout_items IS 'Line items for ACP checkout sessions';
COMMENT ON COLUMN acp_checkout_items.item_id IS 'External product/SKU identifier';

-- ============================================
-- Row-Level Security (RLS)
-- ============================================

ALTER TABLE acp_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY acp_checkouts_tenant_isolation ON acp_checkouts
  FOR ALL 
  USING (tenant_id = (SELECT auth.jwt()->>'tenant_id')::uuid);

ALTER TABLE acp_checkout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY acp_checkout_items_tenant_isolation ON acp_checkout_items
  FOR ALL 
  USING (tenant_id = (SELECT auth.jwt()->>'tenant_id')::uuid);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check if checkout is valid for completion
CREATE OR REPLACE FUNCTION check_acp_checkout_valid(
  p_checkout_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_checkout RECORD;
BEGIN
  SELECT status, expires_at INTO v_checkout
  FROM acp_checkouts
  WHERE id = p_checkout_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check status
  IF v_checkout.status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  -- Check expiration
  IF v_checkout.expires_at IS NOT NULL AND v_checkout.expires_at < NOW() THEN
    -- Auto-expire checkout
    UPDATE acp_checkouts
    SET status = 'expired', updated_at = NOW()
    WHERE id = p_checkout_id;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate checkout totals
CREATE OR REPLACE FUNCTION calculate_acp_checkout_totals(
  p_checkout_id UUID
)
RETURNS TABLE(
  subtotal DECIMAL(20, 8),
  item_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(total_price), 0)::DECIMAL(20, 8),
    COALESCE(SUM(quantity), 0)::INT
  FROM acp_checkout_items
  WHERE checkout_id = p_checkout_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_acp_checkout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_acp_checkout_updated_at
  BEFORE UPDATE ON acp_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_acp_checkout_updated_at();

-- ============================================
-- Sample Data (Development Only)
-- ============================================

-- Note: Sample data insertion would go here for development
-- Commented out for production migrations


