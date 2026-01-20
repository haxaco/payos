-- Settlement Rules Schema
-- Epic 50, Story 50.1: Settlement Trigger Rules Schema
-- Enables configurable settlement triggers (schedule, threshold, manual, immediate)
-- @see docs/prd/epics/epic-50-settlement-decoupling.md

-- =============================================================================
-- Settlement Rules Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS settlement_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Optional wallet scope (null = applies to all tenant wallets)
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,

  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger type determines how settlement is initiated
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN (
      'schedule',   -- Time-based (cron expression)
      'threshold',  -- Balance threshold exceeded
      'manual',     -- User-initiated withdrawal
      'immediate'   -- Auto-trigger on specific transfer types
    )),

  -- Trigger configuration (structure depends on trigger_type)
  -- schedule:  { "cron": "0 17 * * *" } (5pm daily)
  -- threshold: { "amount": 10000, "currency": "USD" }
  -- manual:    {} (no config needed)
  -- immediate: { "transfer_types": ["payout", "withdrawal"] }
  trigger_config JSONB NOT NULL DEFAULT '{}',

  -- Settlement rail selection
  settlement_rail TEXT NOT NULL DEFAULT 'auto'
    CHECK (settlement_rail IN (
      'auto',    -- System selects best rail
      'ach',     -- US bank transfer
      'pix',     -- Brazil instant payment
      'spei',    -- Mexico bank transfer
      'wire',    -- International wire
      'usdc'     -- On-chain USDC
    )),

  -- Settlement priority
  settlement_priority TEXT NOT NULL DEFAULT 'standard'
    CHECK (settlement_priority IN (
      'standard',   -- Normal processing (lower cost)
      'expedited'   -- Faster processing (higher cost)
    )),

  -- Minimum amount to accumulate before settling (optional)
  -- Prevents many small settlements
  minimum_amount INTEGER,  -- In smallest currency unit (cents)
  minimum_currency TEXT DEFAULT 'USD',

  -- Maximum settlement amount per execution (optional)
  -- For risk management
  maximum_amount INTEGER,
  maximum_currency TEXT DEFAULT 'USD',

  -- Rule status
  enabled BOOLEAN DEFAULT true,

  -- Priority for rule evaluation (lower = higher priority)
  priority INTEGER DEFAULT 100,

  -- Rule metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, name)
);

-- =============================================================================
-- Settlement Rule Executions (Audit Trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS settlement_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES settlement_rules(id) ON DELETE CASCADE,

  -- Execution status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',     -- Queued for execution
      'executing',   -- Settlement in progress
      'completed',   -- Settlement successful
      'failed',      -- Settlement failed
      'skipped'      -- Skipped (e.g., below minimum)
    )),

  -- Trigger context
  trigger_reason TEXT NOT NULL,  -- 'schedule', 'threshold_exceeded', 'manual_request', 'immediate'
  trigger_context JSONB DEFAULT '{}',  -- e.g., { "balance": 12000, "threshold": 10000 }

  -- Settlement details
  amount INTEGER,  -- Amount settled (in smallest unit)
  currency TEXT,
  settlement_rail TEXT,
  settlement_id UUID,  -- Reference to actual settlement

  -- Error information (when status = 'failed')
  error_message TEXT,
  error_code TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Settlement rules indexes
CREATE INDEX idx_settlement_rules_tenant ON settlement_rules(tenant_id);
CREATE INDEX idx_settlement_rules_trigger_type ON settlement_rules(trigger_type);
CREATE INDEX idx_settlement_rules_tenant_enabled ON settlement_rules(tenant_id, enabled);
CREATE INDEX idx_settlement_rules_wallet ON settlement_rules(wallet_id)
  WHERE wallet_id IS NOT NULL;
CREATE INDEX idx_settlement_rules_priority ON settlement_rules(tenant_id, priority)
  WHERE enabled = true;

-- Rule executions indexes
CREATE INDEX idx_settlement_rule_executions_rule ON settlement_rule_executions(rule_id);
CREATE INDEX idx_settlement_rule_executions_tenant ON settlement_rule_executions(tenant_id);
CREATE INDEX idx_settlement_rule_executions_status ON settlement_rule_executions(status)
  WHERE status IN ('pending', 'executing');
CREATE INDEX idx_settlement_rule_executions_started ON settlement_rule_executions(started_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE settlement_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_rule_executions ENABLE ROW LEVEL SECURITY;

-- Settlement rules policies
CREATE POLICY "Tenants can view their own settlement rules"
  ON settlement_rules FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create settlement rules"
  ON settlement_rules FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own settlement rules"
  ON settlement_rules FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can delete their own settlement rules"
  ON settlement_rules FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Rule executions policies
CREATE POLICY "Tenants can view their own rule executions"
  ON settlement_rule_executions FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "System can insert rule executions"
  ON settlement_rule_executions FOR INSERT
  WITH CHECK (true);  -- Inserts handled by service role

CREATE POLICY "System can update rule executions"
  ON settlement_rule_executions FOR UPDATE
  USING (true)
  WITH CHECK (true);  -- Updates handled by service role

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update updated_at on settlement_rules changes
CREATE OR REPLACE FUNCTION update_settlement_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_settlement_rules_updated_at
  BEFORE UPDATE ON settlement_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_settlement_rules_updated_at();

-- =============================================================================
-- Default Rules Seed
-- Every tenant gets a "Manual Withdrawal" rule by default
-- =============================================================================

-- Function to create default rules for new tenants
CREATE OR REPLACE FUNCTION create_default_settlement_rules()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settlement_rules (
    tenant_id,
    name,
    description,
    trigger_type,
    trigger_config,
    settlement_rail,
    priority
  ) VALUES (
    NEW.id,
    'Manual Withdrawal',
    'Default rule allowing manual withdrawal requests',
    'manual',
    '{}',
    'auto',
    0  -- Highest priority
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default rules when tenant is created
CREATE TRIGGER trigger_tenant_default_settlement_rules
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_default_settlement_rules();

-- Seed default rules for existing tenants (if any)
INSERT INTO settlement_rules (tenant_id, name, description, trigger_type, trigger_config, settlement_rail, priority)
SELECT
  t.id,
  'Manual Withdrawal',
  'Default rule allowing manual withdrawal requests',
  'manual',
  '{}',
  'auto',
  0
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM settlement_rules sr
  WHERE sr.tenant_id = t.id AND sr.name = 'Manual Withdrawal'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to find applicable rules for a transfer
CREATE OR REPLACE FUNCTION find_applicable_settlement_rules(
  p_tenant_id UUID,
  p_wallet_id UUID DEFAULT NULL,
  p_transfer_type TEXT DEFAULT NULL
)
RETURNS SETOF settlement_rules AS $$
BEGIN
  RETURN QUERY
  SELECT sr.*
  FROM settlement_rules sr
  WHERE sr.tenant_id = p_tenant_id
    AND sr.enabled = true
    AND (
      sr.wallet_id IS NULL  -- Tenant-wide rules
      OR sr.wallet_id = p_wallet_id  -- Wallet-specific rules
    )
    AND (
      sr.trigger_type != 'immediate'  -- Non-immediate rules always apply
      OR (
        sr.trigger_type = 'immediate'
        AND p_transfer_type IS NOT NULL
        AND (sr.trigger_config->>'transfer_types')::jsonb ? p_transfer_type
      )
    )
  ORDER BY sr.priority ASC, sr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to evaluate threshold rules for a wallet
CREATE OR REPLACE FUNCTION check_threshold_rules(
  p_tenant_id UUID,
  p_wallet_id UUID,
  p_balance NUMERIC,
  p_currency TEXT
)
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  threshold_amount NUMERIC,
  settlement_rail TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id AS rule_id,
    sr.name AS rule_name,
    (sr.trigger_config->>'amount')::NUMERIC AS threshold_amount,
    sr.settlement_rail
  FROM settlement_rules sr
  WHERE sr.tenant_id = p_tenant_id
    AND sr.enabled = true
    AND sr.trigger_type = 'threshold'
    AND (sr.wallet_id IS NULL OR sr.wallet_id = p_wallet_id)
    AND (sr.trigger_config->>'currency') = p_currency
    AND p_balance >= (sr.trigger_config->>'amount')::NUMERIC
  ORDER BY sr.priority ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE settlement_rules IS 'Configurable settlement trigger rules (Epic 50)';
COMMENT ON COLUMN settlement_rules.trigger_type IS 'Type of trigger: schedule, threshold, manual, immediate';
COMMENT ON COLUMN settlement_rules.trigger_config IS 'Trigger-specific configuration (cron, amount, transfer_types)';
COMMENT ON COLUMN settlement_rules.settlement_rail IS 'Settlement rail: auto, ach, pix, spei, wire, usdc';
COMMENT ON COLUMN settlement_rules.priority IS 'Rule evaluation priority (lower = higher priority)';

COMMENT ON TABLE settlement_rule_executions IS 'Audit trail of settlement rule executions';
COMMENT ON COLUMN settlement_rule_executions.trigger_reason IS 'What triggered this execution';
COMMENT ON COLUMN settlement_rule_executions.trigger_context IS 'Context at time of trigger (balance, threshold, etc.)';

COMMENT ON FUNCTION find_applicable_settlement_rules IS 'Find settlement rules applicable to a tenant/wallet/transfer';
COMMENT ON FUNCTION check_threshold_rules IS 'Check if any threshold rules are triggered for a wallet balance';
