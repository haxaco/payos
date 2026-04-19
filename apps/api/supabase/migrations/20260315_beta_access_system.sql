-- ============================================
-- Beta Access System (Closed Beta Onboarding)
-- ============================================
-- Tables: beta_access_codes, beta_applications, beta_funnel_events
-- Tenant columns: beta_access_code_id, onboarded_via, max_team_members, max_agents

-- Invite codes (single-use for approved applicants, multi-use for partners)
CREATE TABLE IF NOT EXISTS beta_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  code_type TEXT NOT NULL DEFAULT 'single_use' CHECK (code_type IN ('single_use', 'multi_use')),
  max_uses INT DEFAULT 1,
  current_uses INT NOT NULL DEFAULT 0,
  created_by TEXT,
  partner_name TEXT,
  target_actor_type TEXT NOT NULL DEFAULT 'both' CHECK (target_actor_type IN ('human', 'agent', 'both')),
  granted_max_team_members INT DEFAULT 5,
  granted_max_agents INT DEFAULT 10,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Waitlist / application queue
CREATE TABLE IF NOT EXISTS beta_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  agent_name TEXT,
  applicant_type TEXT NOT NULL DEFAULT 'human' CHECK (applicant_type IN ('human', 'agent')),
  organization_name TEXT,
  use_case TEXT,
  referral_source TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  access_code_id UUID REFERENCES beta_access_codes(id),
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Funnel analytics
CREATE TABLE IF NOT EXISTS beta_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id UUID REFERENCES beta_access_codes(id),
  application_id UUID REFERENCES beta_applications(id),
  tenant_id UUID,
  agent_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'application_submitted', 'application_approved', 'application_rejected',
    'code_redeemed', 'signup_completed', 'tenant_provisioned',
    'first_api_call', 'first_transaction'
  )),
  actor_type TEXT CHECK (actor_type IN ('human', 'agent')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_beta_access_codes_code ON beta_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_beta_access_codes_status ON beta_access_codes(status);
CREATE INDEX IF NOT EXISTS idx_beta_access_codes_partner ON beta_access_codes(partner_name) WHERE partner_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beta_applications_status ON beta_applications(status);
CREATE INDEX IF NOT EXISTS idx_beta_applications_email ON beta_applications(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beta_funnel_events_type ON beta_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_beta_funnel_events_tenant ON beta_funnel_events(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beta_funnel_events_code ON beta_funnel_events(access_code_id) WHERE access_code_id IS NOT NULL;

-- Link tenants to the code they used + enforce beta resource limits
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS beta_access_code_id UUID REFERENCES beta_access_codes(id),
  ADD COLUMN IF NOT EXISTS onboarded_via TEXT DEFAULT 'direct_signup',
  ADD COLUMN IF NOT EXISTS max_team_members INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_agents INT DEFAULT 10;

-- Comments
COMMENT ON TABLE beta_access_codes IS 'Invite codes for closed beta access (single-use or multi-use for partners)';
COMMENT ON TABLE beta_applications IS 'Beta waitlist applications from prospective users and agents';
COMMENT ON TABLE beta_funnel_events IS 'Funnel analytics tracking from application to first transaction';
COMMENT ON COLUMN tenants.beta_access_code_id IS 'The invite code used to create this tenant';
COMMENT ON COLUMN tenants.onboarded_via IS 'How this tenant was onboarded (direct_signup, beta_code, partner_code)';
COMMENT ON COLUMN tenants.max_team_members IS 'Maximum team members allowed for this tenant';
COMMENT ON COLUMN tenants.max_agents IS 'Maximum agents allowed for this tenant';

-- ============================================================================
-- RLS — admin-only tables. Platform staff operate on these through the
-- service role (see /admin/beta/* routes). Lock everyone else out.
-- ============================================================================

ALTER TABLE beta_access_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_beta_access_codes"  ON beta_access_codes;
DROP POLICY IF EXISTS "service_role_beta_applications"  ON beta_applications;
DROP POLICY IF EXISTS "service_role_beta_funnel_events" ON beta_funnel_events;

CREATE POLICY "service_role_beta_access_codes"
  ON beta_access_codes  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_beta_applications"
  ON beta_applications  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_beta_funnel_events"
  ON beta_funnel_events FOR ALL TO service_role USING (true) WITH CHECK (true);
