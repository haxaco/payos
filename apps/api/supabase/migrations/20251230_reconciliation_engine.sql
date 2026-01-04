-- ============================================
-- Epic 27: Story 27.3 - Reconciliation Engine
-- ============================================
-- Track settlement reconciliation between PayOS ledger
-- and external rails (Circle, Pix, SPEI, etc.)

-- ============================================
-- Settlement Records Table
-- ============================================
-- Track all settlements sent to external rails
CREATE TABLE IF NOT EXISTS settlement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  
  -- Rail information
  rail TEXT NOT NULL, -- circle_usdc, pix, spei, base_chain, wire
  external_id TEXT, -- ID from external rail
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, reversed
  
  -- Amount tracking
  expected_amount DECIMAL(20, 8) NOT NULL,
  actual_amount DECIMAL(20, 8),
  currency TEXT NOT NULL DEFAULT 'USDC',
  destination_amount DECIMAL(20, 8),
  destination_currency TEXT,
  fx_rate DECIMAL(20, 8),
  rail_fee DECIMAL(20, 8),
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  -- Reconciliation
  reconciled_at TIMESTAMPTZ,
  reconciliation_status TEXT, -- matched, discrepancy, pending
  
  -- Raw data from rail
  rail_response JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint on external_id per rail
  UNIQUE(rail, external_id)
);

-- ============================================
-- Reconciliation Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system-wide
  
  -- Report scope
  rail TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, manual, triggered
  
  -- Status
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  
  -- Summary statistics
  total_transactions INT DEFAULT 0,
  matched_transactions INT DEFAULT 0,
  discrepancy_count INT DEFAULT 0,
  
  -- Amount summary
  total_expected_amount DECIMAL(20, 8) DEFAULT 0,
  total_actual_amount DECIMAL(20, 8) DEFAULT 0,
  amount_difference DECIMAL(20, 8) DEFAULT 0,
  currency TEXT DEFAULT 'USDC',
  
  -- Breakdown by type
  discrepancies_by_type JSONB DEFAULT '{}',
  discrepancies_by_severity JSONB DEFAULT '{}',
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  
  -- Error info
  error_message TEXT,
  
  -- Results
  results JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Reconciliation Discrepancies Table
-- ============================================
CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reconciliation_reports(id) ON DELETE CASCADE,
  
  -- Related records
  settlement_record_id UUID REFERENCES settlement_records(id) ON DELETE SET NULL,
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  external_id TEXT,
  rail TEXT NOT NULL,
  
  -- Discrepancy details
  type TEXT NOT NULL, -- missing_in_ledger, missing_in_rail, amount_mismatch, status_mismatch, duplicate, timing_discrepancy
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  
  -- Expected vs Actual
  expected_amount DECIMAL(20, 8),
  actual_amount DECIMAL(20, 8),
  expected_status TEXT,
  actual_status TEXT,
  
  -- Description
  description TEXT NOT NULL,
  
  -- Resolution tracking
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, resolved, ignored
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT, -- user ID or 'system'
  resolution TEXT, -- How it was resolved
  resolution_notes TEXT,
  
  -- Auto-resolution attempt
  auto_resolution_attempted BOOLEAN DEFAULT FALSE,
  auto_resolution_result TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Reconciliation Config Table
-- ============================================
CREATE TABLE IF NOT EXISTS reconciliation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for global config
  rail TEXT, -- NULL for all rails
  
  -- Schedule
  enabled BOOLEAN DEFAULT TRUE,
  schedule_cron TEXT DEFAULT '0 */6 * * *', -- Every 6 hours
  
  -- Thresholds
  amount_tolerance_percent DECIMAL(5, 2) DEFAULT 0.01, -- 0.01% tolerance
  amount_tolerance_fixed DECIMAL(20, 8) DEFAULT 0.01, -- $0.01 fixed tolerance
  timing_tolerance_minutes INT DEFAULT 60, -- 1 hour timing tolerance
  
  -- Alerts
  alert_on_discrepancy BOOLEAN DEFAULT TRUE,
  alert_webhook_url TEXT,
  alert_email TEXT,
  alert_severity_threshold TEXT DEFAULT 'medium', -- Only alert above this level
  
  -- Auto-resolution
  auto_resolve_enabled BOOLEAN DEFAULT FALSE,
  auto_resolve_max_amount DECIMAL(20, 8) DEFAULT 1.00, -- Max $1 for auto-resolve
  
  -- Retention
  report_retention_days INT DEFAULT 90,
  discrepancy_retention_days INT DEFAULT 365,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, rail)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_settlement_records_tenant ON settlement_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlement_records_transfer ON settlement_records(transfer_id);
CREATE INDEX IF NOT EXISTS idx_settlement_records_rail_status ON settlement_records(rail, status);
CREATE INDEX IF NOT EXISTS idx_settlement_records_external ON settlement_records(rail, external_id);
CREATE INDEX IF NOT EXISTS idx_settlement_records_reconciled ON settlement_records(reconciliation_status, reconciled_at);
CREATE INDEX IF NOT EXISTS idx_settlement_records_submitted ON settlement_records(submitted_at);

CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_tenant ON reconciliation_reports(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_rail ON reconciliation_reports(rail, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_status ON reconciliation_reports(status);

CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_tenant ON reconciliation_discrepancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_report ON reconciliation_discrepancies(report_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_status ON reconciliation_discrepancies(status, severity);
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies_rail ON reconciliation_discrepancies(rail, detected_at);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE settlement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_config ENABLE ROW LEVEL SECURITY;

-- Settlement Records policies
CREATE POLICY settlement_records_tenant_select ON settlement_records
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
    OR auth.role() = 'service_role'
  );

CREATE POLICY settlement_records_service_all ON settlement_records
  FOR ALL USING (auth.role() = 'service_role');

-- Reconciliation Reports policies (view own + system reports)
CREATE POLICY reconciliation_reports_tenant_select ON reconciliation_reports
  FOR SELECT USING (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
    OR auth.role() = 'service_role'
  );

CREATE POLICY reconciliation_reports_service_all ON reconciliation_reports
  FOR ALL USING (auth.role() = 'service_role');

-- Discrepancies policies
CREATE POLICY reconciliation_discrepancies_tenant_select ON reconciliation_discrepancies
  FOR SELECT USING (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
    OR auth.role() = 'service_role'
  );

CREATE POLICY reconciliation_discrepancies_service_all ON reconciliation_discrepancies
  FOR ALL USING (auth.role() = 'service_role');

-- Config policies
CREATE POLICY reconciliation_config_tenant_select ON reconciliation_config
  FOR SELECT USING (
    tenant_id IS NULL 
    OR tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
    OR auth.role() = 'service_role'
  );

CREATE POLICY reconciliation_config_service_all ON reconciliation_config
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE TRIGGER update_settlement_records_updated_at
  BEFORE UPDATE ON settlement_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_reports_updated_at
  BEFORE UPDATE ON reconciliation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_discrepancies_updated_at
  BEFORE UPDATE ON reconciliation_discrepancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_config_updated_at
  BEFORE UPDATE ON reconciliation_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Default Config
-- ============================================
INSERT INTO reconciliation_config (tenant_id, rail, enabled, schedule_cron)
VALUES (NULL, NULL, true, '0 */6 * * *')
ON CONFLICT DO NOTHING;

