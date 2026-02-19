-- ============================================
-- Story 56.20: Agent Shopping Tests
-- Synthetic agent shopping test results
-- ============================================

CREATE TABLE IF NOT EXISTS agent_shopping_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_scan_id UUID NOT NULL REFERENCES merchant_scans(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'full_flow'
    CHECK (test_type IN ('browse','search','add_to_cart','checkout','full_flow')),
  status TEXT NOT NULL CHECK (status IN ('passed','failed','partial','blocked')),
  steps JSONB NOT NULL DEFAULT '[]',
  blockers JSONB NOT NULL DEFAULT '[]',
  total_steps INTEGER NOT NULL DEFAULT 5,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  failure_point JSONB,
  estimated_monthly_agent_visits INTEGER,
  estimated_lost_conversions INTEGER,
  estimated_lost_revenue_usd NUMERIC(12,2),
  recommendations JSONB DEFAULT '[]',
  duration_ms INTEGER,
  agent_model TEXT,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ast_scan ON agent_shopping_tests(merchant_scan_id);
CREATE INDEX idx_ast_domain ON agent_shopping_tests(domain);
CREATE INDEX idx_ast_tested ON agent_shopping_tests(tested_at DESC);
