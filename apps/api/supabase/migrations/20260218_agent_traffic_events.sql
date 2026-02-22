-- Story 56.24: Agent Traffic Monitor
-- Global table for tracking AI agent visits to merchant sites.
-- No tenant_id, no PII. Same pattern as checkout_telemetry.

CREATE TABLE IF NOT EXISTS agent_traffic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  agent_type TEXT NOT NULL,
  detection_method TEXT NOT NULL,
  referrer TEXT,
  user_agent_raw TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ate_site_id ON agent_traffic_events(site_id);
CREATE INDEX idx_ate_domain ON agent_traffic_events(domain);
CREATE INDEX idx_ate_agent_type ON agent_traffic_events(agent_type);
CREATE INDEX idx_ate_created_at ON agent_traffic_events(created_at DESC);
CREATE INDEX idx_ate_domain_date ON agent_traffic_events(domain, created_at DESC);

-- RLS
ALTER TABLE agent_traffic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_agent_traffic_events" ON agent_traffic_events
  FOR ALL USING (true) WITH CHECK (true);
