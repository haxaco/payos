-- UCP Settlements Schema
-- Story 55.4: UCP Settlement data persistence
-- Mirrors the StoredSettlement interface in services/ucp/settlement.ts

-- =============================================================================
-- UCP Settlements Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS ucp_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Settlement status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'deferred')),

  -- Token and references
  token TEXT,
  mandate_id TEXT,
  transfer_id UUID,

  -- Corridor
  corridor TEXT NOT NULL DEFAULT 'auto'
    CHECK (corridor IN ('pix', 'spei', 'auto')),

  -- Source amount
  source_amount NUMERIC NOT NULL,
  source_currency TEXT NOT NULL DEFAULT 'USDC',

  -- Destination amount
  destination_amount NUMERIC NOT NULL DEFAULT 0,
  destination_currency TEXT NOT NULL DEFAULT 'BRL',

  -- FX
  fx_rate NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,

  -- Recipient info (Pix or SPEI recipient object)
  recipient JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  estimated_completion TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Rules engine integration (Epic 50.3)
  deferred_to_rules BOOLEAN DEFAULT false,
  settlement_rule_id UUID,

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_ucp_settlements_tenant ON ucp_settlements(tenant_id);
CREATE INDEX idx_ucp_settlements_status ON ucp_settlements(status);
CREATE INDEX idx_ucp_settlements_corridor ON ucp_settlements(corridor);
CREATE INDEX idx_ucp_settlements_created ON ucp_settlements(created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE ucp_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own settlements"
  ON ucp_settlements FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create settlements"
  ON ucp_settlements FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own settlements"
  ON ucp_settlements FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_ucp_settlement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ucp_settlement_updated_at
  BEFORE UPDATE ON ucp_settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_ucp_settlement_updated_at();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE ucp_settlements IS 'UCP settlements for cross-border payment execution via Pix/SPEI corridors';
COMMENT ON COLUMN ucp_settlements.status IS 'Settlement state: pending, processing, completed, failed, deferred';
COMMENT ON COLUMN ucp_settlements.corridor IS 'Settlement corridor: pix (Brazil), spei (Mexico), auto (rules-determined)';
COMMENT ON COLUMN ucp_settlements.deferred_to_rules IS 'Whether settlement execution is managed by the rules engine (Epic 50.3)';
COMMENT ON COLUMN ucp_settlements.settlement_rule_id IS 'Which settlement rule handles this (Epic 50.3)';
