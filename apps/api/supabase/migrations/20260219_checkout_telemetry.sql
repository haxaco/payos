-- Story 56.22: Checkout Telemetry
-- Global demand intelligence table — no tenant_id, no PII.

CREATE TABLE IF NOT EXISTS checkout_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol TEXT NOT NULL CHECK (protocol IN ('ucp','acp','ap2','x402')),
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  merchant_id TEXT,
  merchant_domain TEXT,
  merchant_name TEXT,
  failure_reason TEXT,
  failure_code TEXT,
  error_details JSONB,
  agent_id TEXT,
  agent_name TEXT,
  kya_tier INTEGER,
  amount NUMERIC,
  currency TEXT,
  protocol_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ct_protocol ON checkout_telemetry(protocol);
CREATE INDEX idx_ct_merchant_domain ON checkout_telemetry(merchant_domain);
CREATE INDEX idx_ct_success ON checkout_telemetry(success);
CREATE INDEX idx_ct_created_at ON checkout_telemetry(created_at DESC);
CREATE INDEX idx_ct_demand_query ON checkout_telemetry(merchant_domain, success, created_at DESC);

-- RLS
ALTER TABLE checkout_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_checkout_telemetry" ON checkout_telemetry
  FOR ALL USING (true) WITH CHECK (true);
