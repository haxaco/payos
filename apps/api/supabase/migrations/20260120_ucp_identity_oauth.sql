-- UCP Identity/OAuth Schema
-- Phase 4: Identity Linking (OAuth 2.0) for UCP Full Integration
-- @see https://ucp.dev/specification/identity/

-- =============================================================================
-- UCP OAuth Clients Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS ucp_oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- OAuth client identifiers
  client_id TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT, -- NULL for public clients

  -- Client metadata
  name TEXT NOT NULL,
  logo_url TEXT,

  -- OAuth configuration
  redirect_uris TEXT[] NOT NULL,
  allowed_scopes TEXT[] NOT NULL DEFAULT '{}',
  client_type TEXT NOT NULL DEFAULT 'public'
    CHECK (client_type IN ('public', 'confidential')),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- UCP Authorization Codes Table (short-lived, can be cleaned up periodically)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ucp_authorization_codes (
  code TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES ucp_oauth_clients(client_id) ON DELETE CASCADE,

  -- Authorization details
  buyer_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  state TEXT NOT NULL,

  -- PKCE support
  code_challenge TEXT,
  code_challenge_method TEXT CHECK (code_challenge_method IN ('S256', 'plain')),

  -- Status
  used BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- UCP Linked Accounts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS ucp_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Platform/client info
  platform_id TEXT NOT NULL REFERENCES ucp_oauth_clients(client_id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,

  -- Buyer info
  buyer_id TEXT NOT NULL,
  buyer_email TEXT,

  -- Granted permissions
  scopes TEXT[] NOT NULL,

  -- Tokens (hashed for security)
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,

  -- Token expiration
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- OAuth clients indexes
CREATE INDEX idx_ucp_oauth_clients_tenant ON ucp_oauth_clients(tenant_id);
CREATE INDEX idx_ucp_oauth_clients_active ON ucp_oauth_clients(tenant_id, is_active) WHERE is_active = true;

-- Authorization codes indexes (short-lived, cleanup eligible)
CREATE INDEX idx_ucp_auth_codes_client ON ucp_authorization_codes(client_id);
CREATE INDEX idx_ucp_auth_codes_expires ON ucp_authorization_codes(expires_at);
-- Index for cleanup queries (used codes are candidates for deletion)
CREATE INDEX idx_ucp_auth_codes_cleanup ON ucp_authorization_codes(used, expires_at);

-- Linked accounts indexes
CREATE INDEX idx_ucp_linked_accounts_tenant ON ucp_linked_accounts(tenant_id);
CREATE INDEX idx_ucp_linked_accounts_platform ON ucp_linked_accounts(platform_id);
CREATE INDEX idx_ucp_linked_accounts_buyer ON ucp_linked_accounts(tenant_id, buyer_id);
CREATE INDEX idx_ucp_linked_accounts_access_token ON ucp_linked_accounts(access_token_hash) WHERE is_active = true;
CREATE INDEX idx_ucp_linked_accounts_refresh_token ON ucp_linked_accounts(refresh_token_hash) WHERE is_active = true;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE ucp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ucp_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ucp_linked_accounts ENABLE ROW LEVEL SECURITY;

-- OAuth clients policies
CREATE POLICY "Tenants can view their own OAuth clients"
  ON ucp_oauth_clients FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create OAuth clients"
  ON ucp_oauth_clients FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own OAuth clients"
  ON ucp_oauth_clients FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Authorization codes policies
CREATE POLICY "Tenants can view their own authorization codes"
  ON ucp_authorization_codes FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create authorization codes"
  ON ucp_authorization_codes FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own authorization codes"
  ON ucp_authorization_codes FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Linked accounts policies
CREATE POLICY "Tenants can view their own linked accounts"
  ON ucp_linked_accounts FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can create linked accounts"
  ON ucp_linked_accounts FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "Tenants can update their own linked accounts"
  ON ucp_linked_accounts FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_ucp_oauth_client_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ucp_oauth_client_updated_at
  BEFORE UPDATE ON ucp_oauth_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_ucp_oauth_client_updated_at();

CREATE OR REPLACE FUNCTION update_ucp_linked_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ucp_linked_account_updated_at
  BEFORE UPDATE ON ucp_linked_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_ucp_linked_account_updated_at();

-- =============================================================================
-- Cleanup function for expired authorization codes
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_ucp_auth_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ucp_authorization_codes
  WHERE used = true OR expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE ucp_oauth_clients IS 'OAuth 2.0 clients (platforms/agents) for UCP identity linking';
COMMENT ON TABLE ucp_authorization_codes IS 'Short-lived OAuth authorization codes';
COMMENT ON TABLE ucp_linked_accounts IS 'Linked accounts between buyers and platforms via OAuth';

COMMENT ON COLUMN ucp_oauth_clients.client_id IS 'Public OAuth client identifier (ucp_client_xxx)';
COMMENT ON COLUMN ucp_oauth_clients.client_secret_hash IS 'Hashed client secret (NULL for public clients)';
COMMENT ON COLUMN ucp_oauth_clients.client_type IS 'public (SPAs/mobile) or confidential (server-side)';
COMMENT ON COLUMN ucp_oauth_clients.allowed_scopes IS 'Scopes this client can request';

COMMENT ON COLUMN ucp_linked_accounts.access_token_hash IS 'SHA-256 hash of the access token';
COMMENT ON COLUMN ucp_linked_accounts.refresh_token_hash IS 'SHA-256 hash of the refresh token';
COMMENT ON COLUMN ucp_linked_accounts.scopes IS 'Granted OAuth scopes for this link';
