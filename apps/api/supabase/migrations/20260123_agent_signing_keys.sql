-- Agent Signing Keys Migration
-- Epic 53: Agent-Side Card Payments
-- Enables AI agents to sign payment requests for Visa VIC and Mastercard Agent Pay

-- ============================================
-- Agent Signing Keys Table
-- ============================================

-- Agent signing keys for RFC 9421 HTTP Message Signatures
CREATE TABLE IF NOT EXISTS agent_signing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Key identification
  key_id TEXT NOT NULL UNIQUE,            -- "payos_agent_abc123"
  algorithm TEXT NOT NULL DEFAULT 'ed25519' CHECK (algorithm IN ('ed25519', 'rsa-sha256')),

  -- Key material (private key encrypted via credential-vault)
  private_key_encrypted TEXT NOT NULL,    -- AES-256-GCM encrypted
  public_key TEXT NOT NULL,               -- Base64 encoded public key

  -- Status and registration
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  registered_networks TEXT[] DEFAULT '{}', -- ['visa', 'mastercard'] once registered

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Usage tracking
  use_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Ensure one key per agent
  UNIQUE(agent_id)
);

-- Indexes for agent_signing_keys
CREATE INDEX idx_agent_signing_keys_tenant ON agent_signing_keys(tenant_id);
CREATE INDEX idx_agent_signing_keys_agent ON agent_signing_keys(agent_id);
CREATE INDEX idx_agent_signing_keys_key_id ON agent_signing_keys(key_id);
CREATE INDEX idx_agent_signing_keys_status ON agent_signing_keys(status);

-- ============================================
-- Agent Signing Requests Audit Log
-- ============================================

-- Log of all signing requests for auditing and compliance
CREATE TABLE IF NOT EXISTS agent_signing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  signing_key_id UUID NOT NULL REFERENCES agent_signing_keys(id) ON DELETE CASCADE,

  -- Request details
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_host TEXT,

  -- Signature details
  signature_input TEXT NOT NULL,
  signature TEXT NOT NULL,
  content_digest TEXT,

  -- Payment info (if applicable)
  amount DECIMAL(15,2),
  currency TEXT,
  merchant_name TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'signed' CHECK (status IN ('signed', 'rejected')),
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for agent_signing_requests
CREATE INDEX idx_agent_signing_requests_tenant ON agent_signing_requests(tenant_id, created_at DESC);
CREATE INDEX idx_agent_signing_requests_agent ON agent_signing_requests(agent_id);
CREATE INDEX idx_agent_signing_requests_key ON agent_signing_requests(signing_key_id);
CREATE INDEX idx_agent_signing_requests_status ON agent_signing_requests(status);
CREATE INDEX idx_agent_signing_requests_created ON agent_signing_requests(created_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE agent_signing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signing_requests ENABLE ROW LEVEL SECURITY;

-- agent_signing_keys: Tenant isolation
CREATE POLICY "agent_signing_keys_tenant_isolation" ON agent_signing_keys
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- agent_signing_requests: Tenant isolation
CREATE POLICY "agent_signing_requests_tenant_isolation" ON agent_signing_requests
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- ============================================
-- Functions
-- ============================================

-- Function to update signing key usage stats
CREATE OR REPLACE FUNCTION update_signing_key_usage(
  p_key_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agent_signing_keys
  SET
    use_count = use_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_key_id;
END;
$$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE agent_signing_keys IS 'Signing keys for agents to produce RFC 9421 HTTP Message Signatures for card network payments';
COMMENT ON COLUMN agent_signing_keys.key_id IS 'Public key identifier used in Signature-Input header (e.g., payos_agent_abc123)';
COMMENT ON COLUMN agent_signing_keys.private_key_encrypted IS 'AES-256-GCM encrypted private key via credential-vault';
COMMENT ON COLUMN agent_signing_keys.registered_networks IS 'Card networks where this key''s public key has been registered';

COMMENT ON TABLE agent_signing_requests IS 'Audit log of all agent signing requests for compliance and debugging';
COMMENT ON COLUMN agent_signing_requests.signature_input IS 'The Signature-Input header value produced';
COMMENT ON COLUMN agent_signing_requests.signature IS 'The Signature header value produced';
COMMENT ON COLUMN agent_signing_requests.expires_at IS 'When the signature expires (typically 5 minutes from creation)';
