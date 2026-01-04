-- Migration: AP2 (Google Agent Payment Protocol) Foundation
-- Epic 17, Story 17.1 (AP2)
-- Enables mandate-based agent authorization payments

-- ============================================
-- 1. AP2 Mandates Table
-- ============================================

CREATE TABLE IF NOT EXISTS ap2_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Mandate identification
  mandate_id VARCHAR(255) NOT NULL UNIQUE,
  mandate_type VARCHAR(50) NOT NULL CHECK (mandate_type IN ('intent', 'cart', 'payment')),
  
  -- Agent information
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255),
  
  -- Authorization details
  authorized_amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  
  -- Usage tracking
  used_amount DECIMAL(20, 8) DEFAULT 0,
  remaining_amount DECIMAL(20, 8) GENERATED ALWAYS AS (authorized_amount - used_amount) STORED,
  execution_count INT DEFAULT 0,
  
  -- Mandate data
  mandate_data JSONB DEFAULT '{}',
  
  -- A2A session (agent-to-agent)
  a2a_session_id VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_ap2_mandates_tenant ON ap2_mandates(tenant_id);
CREATE INDEX idx_ap2_mandates_account ON ap2_mandates(account_id);
CREATE INDEX idx_ap2_mandates_mandate_id ON ap2_mandates(mandate_id);
CREATE INDEX idx_ap2_mandates_agent ON ap2_mandates(agent_id);
CREATE INDEX idx_ap2_mandates_status ON ap2_mandates(tenant_id, status);
CREATE INDEX idx_ap2_mandates_expires ON ap2_mandates(expires_at) WHERE status = 'active';

-- RLS
ALTER TABLE ap2_mandates ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap2_mandates_tenant_policy ON ap2_mandates
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('app.tenant_id', true)::uuid,
      (SELECT (auth.jwt()->>'tenant_id')::uuid)
    )
  );

COMMENT ON TABLE ap2_mandates IS 
  'AP2 (Google Agent Payment Protocol) mandates for agent-authorized payments';

-- ============================================
-- 2. AP2 Mandate Executions Table
-- ============================================

CREATE TABLE IF NOT EXISTS ap2_mandate_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mandate_id UUID NOT NULL REFERENCES ap2_mandates(id) ON DELETE CASCADE,
  transfer_id UUID REFERENCES transfers(id),
  
  -- Execution details
  execution_index INT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  
  -- Authorization proof
  authorization_proof TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  
  -- Error tracking
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_ap2_executions_mandate ON ap2_mandate_executions(mandate_id);
CREATE INDEX idx_ap2_executions_transfer ON ap2_mandate_executions(transfer_id);
CREATE INDEX idx_ap2_executions_status ON ap2_mandate_executions(status);

-- RLS
ALTER TABLE ap2_mandate_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ap2_executions_tenant_policy ON ap2_mandate_executions
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('app.tenant_id', true)::uuid,
      (SELECT (auth.jwt()->>'tenant_id')::uuid)
    )
  );

COMMENT ON TABLE ap2_mandate_executions IS 
  'Execution history for AP2 mandates';

-- ============================================
-- 3. Helper Functions
-- ============================================

-- Function to update mandate usage
CREATE OR REPLACE FUNCTION update_ap2_mandate_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update mandate used_amount and execution_count
  UPDATE ap2_mandates
  SET 
    used_amount = used_amount + NEW.amount,
    execution_count = execution_count + 1,
    updated_at = NOW(),
    -- Mark as completed if fully used
    status = CASE 
      WHEN (used_amount + NEW.amount) >= authorized_amount THEN 'completed'
      ELSE status
    END,
    completed_at = CASE 
      WHEN (used_amount + NEW.amount) >= authorized_amount THEN NOW()
      ELSE completed_at
    END
  WHERE id = NEW.mandate_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update mandate on execution completion
CREATE TRIGGER ap2_execution_completed
  AFTER INSERT ON ap2_mandate_executions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_ap2_mandate_usage();

-- Function to check mandate validity
CREATE OR REPLACE FUNCTION check_ap2_mandate_valid(
  p_mandate_id UUID,
  p_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_mandate RECORD;
BEGIN
  SELECT * INTO v_mandate
  FROM ap2_mandates
  WHERE id = p_mandate_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check status
  IF v_mandate.status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Check expiration
  IF v_mandate.expires_at IS NOT NULL AND v_mandate.expires_at < NOW() THEN
    -- Auto-expire
    UPDATE ap2_mandates SET status = 'expired' WHERE id = p_mandate_id;
    RETURN FALSE;
  END IF;
  
  -- Check remaining amount
  IF (v_mandate.authorized_amount - v_mandate.used_amount) < p_amount THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_ap2_mandate_valid IS 
  'Validates if an AP2 mandate can be used for a given amount';

-- ============================================
-- 4. Update updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_ap2_mandates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ap2_mandates_updated_at
  BEFORE UPDATE ON ap2_mandates
  FOR EACH ROW
  EXECUTE FUNCTION update_ap2_mandates_updated_at();

