-- ============================================
-- Story 56.21: Agent Behavior Observatory
-- Track AI agent activity in the wild
-- ============================================

CREATE TABLE IF NOT EXISTS agent_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  merchant_scan_id UUID REFERENCES merchant_scans(id) ON DELETE SET NULL,
  observation_type TEXT NOT NULL
    CHECK (observation_type IN (
      'ai_search_result', 'product_recommendation', 'protocol_announcement',
      'agent_marketplace', 'news_mention', 'manual'
    )),
  source TEXT NOT NULL
    CHECK (source IN (
      'perplexity', 'chatgpt', 'google_ai', 'bing_copilot',
      'mcp_registry', 'press', 'social', 'manual', 'scan_drift'
    )),
  query TEXT,
  evidence TEXT NOT NULL,
  evidence_url TEXT,
  metadata JSONB DEFAULT '{}',
  confidence TEXT NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ao_domain ON agent_observations(domain);
CREATE INDEX idx_ao_type ON agent_observations(observation_type);
CREATE INDEX idx_ao_source ON agent_observations(source);
CREATE INDEX idx_ao_observed ON agent_observations(observed_at DESC);
CREATE INDEX idx_ao_scan ON agent_observations(merchant_scan_id);

-- RLS
ALTER TABLE agent_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_agent_observations" ON agent_observations
  FOR ALL USING (true) WITH CHECK (true);
