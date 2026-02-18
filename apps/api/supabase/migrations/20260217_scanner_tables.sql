-- ============================================
-- Epic 56: Agentic Commerce Demand Scanner
-- Migration: Scanner tables + Demand intelligence
-- ============================================

-- 1. Merchant scan targets
CREATE TABLE IF NOT EXISTS merchant_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Target identification
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  merchant_name TEXT,
  merchant_category TEXT,
  country_code TEXT,
  region TEXT,

  -- Overall scores (0-100)
  readiness_score INTEGER NOT NULL DEFAULT 0,
  protocol_score INTEGER NOT NULL DEFAULT 0,
  data_score INTEGER NOT NULL DEFAULT 0,
  accessibility_score INTEGER NOT NULL DEFAULT 0,
  checkout_score INTEGER NOT NULL DEFAULT 0,

  -- Scan metadata
  scan_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'scanning', 'completed', 'failed', 'stale')),
  last_scanned_at TIMESTAMPTZ,
  scan_duration_ms INTEGER,
  scan_version TEXT NOT NULL DEFAULT '1.0',
  error_message TEXT,

  -- Deduplication
  UNIQUE(tenant_id, domain),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE merchant_scans IS 'Merchant scan targets and composite readiness scores';

-- 2. Protocol detection results (one row per protocol per scan)
CREATE TABLE IF NOT EXISTS scan_protocol_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_scan_id UUID NOT NULL REFERENCES merchant_scans(id) ON DELETE CASCADE,

  protocol TEXT NOT NULL
    CHECK (protocol IN ('ucp', 'acp', 'ap2', 'x402', 'mcp', 'nlweb', 'visa_vic', 'mastercard_agentpay')),

  detected BOOLEAN NOT NULL DEFAULT false,
  detection_method TEXT,
  endpoint_url TEXT,
  capabilities JSONB DEFAULT '{}',
  response_time_ms INTEGER,
  is_functional BOOLEAN,
  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scan_protocol_results IS 'Per-protocol detection results for each merchant scan';

-- 3. Structured data detection
CREATE TABLE IF NOT EXISTS scan_structured_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_scan_id UUID NOT NULL REFERENCES merchant_scans(id) ON DELETE CASCADE,

  has_schema_product BOOLEAN NOT NULL DEFAULT false,
  has_schema_offer BOOLEAN NOT NULL DEFAULT false,
  has_schema_organization BOOLEAN NOT NULL DEFAULT false,
  has_json_ld BOOLEAN NOT NULL DEFAULT false,
  has_open_graph BOOLEAN NOT NULL DEFAULT false,
  has_microdata BOOLEAN NOT NULL DEFAULT false,

  product_count INTEGER DEFAULT 0,
  products_with_price INTEGER DEFAULT 0,
  products_with_availability INTEGER DEFAULT 0,
  products_with_sku INTEGER DEFAULT 0,
  products_with_image INTEGER DEFAULT 0,

  data_quality_score INTEGER NOT NULL DEFAULT 0,
  sample_products JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scan_structured_data IS 'Structured data (Schema.org, JSON-LD, OG) detection per scan';

-- 4. Accessibility & checkout analysis
CREATE TABLE IF NOT EXISTS scan_accessibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_scan_id UUID NOT NULL REFERENCES merchant_scans(id) ON DELETE CASCADE,

  robots_txt_exists BOOLEAN NOT NULL DEFAULT false,
  robots_blocks_gptbot BOOLEAN DEFAULT false,
  robots_blocks_claudebot BOOLEAN DEFAULT false,
  robots_blocks_googlebot BOOLEAN DEFAULT false,
  robots_blocks_all_bots BOOLEAN DEFAULT false,
  robots_allows_agents BOOLEAN DEFAULT false,
  robots_raw TEXT,

  requires_javascript BOOLEAN DEFAULT false,
  has_captcha BOOLEAN DEFAULT false,
  requires_account BOOLEAN DEFAULT false,
  guest_checkout_available BOOLEAN DEFAULT false,
  checkout_steps_count INTEGER,

  payment_processors JSONB DEFAULT '[]',
  supports_digital_wallets BOOLEAN DEFAULT false,
  supports_crypto BOOLEAN DEFAULT false,
  supports_pix BOOLEAN DEFAULT false,
  supports_spei BOOLEAN DEFAULT false,

  ecommerce_platform TEXT,
  platform_version TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scan_accessibility IS 'Agent accessibility and checkout friction analysis per scan';

-- 5. Scan batches
CREATE TABLE IF NOT EXISTS scan_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  name TEXT NOT NULL,
  description TEXT,
  batch_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (batch_type IN ('manual', 'scheduled', 'report', 'prospect_list')),

  target_domains JSONB NOT NULL DEFAULT '[]',
  scan_config JSONB DEFAULT '{}',

  total_targets INTEGER NOT NULL DEFAULT 0,
  completed_targets INTEGER NOT NULL DEFAULT 0,
  failed_targets INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scan_batches IS 'Batch scan jobs tracking';

-- 6. Historical snapshots for trend tracking
CREATE TABLE IF NOT EXISTS scan_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  snapshot_date DATE NOT NULL,
  snapshot_period TEXT NOT NULL DEFAULT 'weekly'
    CHECK (snapshot_period IN ('daily', 'weekly', 'monthly', 'quarterly')),

  total_merchants_scanned INTEGER NOT NULL DEFAULT 0,

  ucp_adoption_rate NUMERIC(5,2) DEFAULT 0,
  acp_adoption_rate NUMERIC(5,2) DEFAULT 0,
  ap2_adoption_rate NUMERIC(5,2) DEFAULT 0,
  x402_adoption_rate NUMERIC(5,2) DEFAULT 0,
  mcp_adoption_rate NUMERIC(5,2) DEFAULT 0,
  any_protocol_adoption_rate NUMERIC(5,2) DEFAULT 0,

  schema_org_adoption_rate NUMERIC(5,2) DEFAULT 0,
  json_ld_adoption_rate NUMERIC(5,2) DEFAULT 0,

  agent_blocking_rate NUMERIC(5,2) DEFAULT 0,
  captcha_rate NUMERIC(5,2) DEFAULT 0,
  guest_checkout_rate NUMERIC(5,2) DEFAULT 0,

  avg_readiness_score NUMERIC(5,2) DEFAULT 0,
  avg_protocol_score NUMERIC(5,2) DEFAULT 0,
  avg_data_score NUMERIC(5,2) DEFAULT 0,

  scores_by_category JSONB DEFAULT '{}',
  scores_by_region JSONB DEFAULT '{}',
  scores_by_platform JSONB DEFAULT '{}',

  UNIQUE(snapshot_date, snapshot_period),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scan_snapshots IS 'Historical snapshots for protocol adoption trend tracking';

-- 7. Demand intelligence data points
CREATE TABLE IF NOT EXISTS demand_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  category TEXT,
  region TEXT,
  period TEXT,
  description TEXT,
  source_url TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),

  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE demand_intelligence IS 'Aggregated demand intelligence data points from public sources';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_merchant_scans_tenant ON merchant_scans(tenant_id);
CREATE INDEX idx_merchant_scans_domain ON merchant_scans(domain);
CREATE INDEX idx_merchant_scans_readiness ON merchant_scans(readiness_score DESC);
CREATE INDEX idx_merchant_scans_category ON merchant_scans(merchant_category);
CREATE INDEX idx_merchant_scans_region ON merchant_scans(region);
CREATE INDEX idx_merchant_scans_status ON merchant_scans(scan_status);
CREATE INDEX idx_scan_protocol_results_scan ON scan_protocol_results(merchant_scan_id);
CREATE INDEX idx_scan_protocol_results_protocol ON scan_protocol_results(protocol);
CREATE INDEX idx_scan_structured_data_scan ON scan_structured_data(merchant_scan_id);
CREATE INDEX idx_scan_accessibility_scan ON scan_accessibility(merchant_scan_id);
CREATE INDEX idx_scan_batches_tenant ON scan_batches(tenant_id);
CREATE INDEX idx_scan_batches_status ON scan_batches(status);
CREATE INDEX idx_scan_snapshots_date ON scan_snapshots(snapshot_date DESC);
CREATE INDEX idx_demand_intelligence_source ON demand_intelligence(source);
CREATE INDEX idx_demand_intelligence_metric ON demand_intelligence(metric);
CREATE INDEX idx_demand_intelligence_category ON demand_intelligence(category);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE merchant_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_protocol_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_structured_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_accessibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_intelligence ENABLE ROW LEVEL SECURITY;

-- Service role has full access (scanner uses service role key)
CREATE POLICY "service_role_merchant_scans" ON merchant_scans
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_scan_protocols" ON scan_protocol_results
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_scan_structured" ON scan_structured_data
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_scan_accessibility" ON scan_accessibility
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_scan_batches" ON scan_batches
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_scan_snapshots" ON scan_snapshots
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_demand_intelligence" ON demand_intelligence
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_merchant_scans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_merchant_scans_updated_at
  BEFORE UPDATE ON merchant_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_scans_updated_at();

CREATE OR REPLACE FUNCTION update_scan_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scan_batches_updated_at
  BEFORE UPDATE ON scan_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_scan_batches_updated_at();
