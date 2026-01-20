-- Connected Accounts Schema (Payment Handlers)
-- Epic 48, Story 48.1: Connected Accounts Database Schema
-- Enables merchants to connect their own payment processor accounts
-- @see docs/prd/epics/epic-48-connected-accounts.md

-- =============================================================================
-- Connected Accounts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Handler identification
  handler_type TEXT NOT NULL
    CHECK (handler_type IN ('stripe', 'paypal', 'payos_native', 'circle')),
  handler_name TEXT NOT NULL,  -- Display name set by merchant

  -- Encrypted credentials (AES-256-GCM encrypted JSON)
  -- Structure varies by handler:
  -- Stripe: { "api_key": "sk_...", "webhook_secret": "whsec_..." }
  -- PayPal: { "client_id": "...", "client_secret": "..." }
  -- PayOS Native: { "pix_key": "...", "clabe": "..." }
  -- Circle: { "api_key": "...", "entity_id": "..." }
  credentials_encrypted TEXT NOT NULL,

  -- Key version for credential rotation support
  credentials_key_id TEXT NOT NULL DEFAULT 'v1',

  -- Connection status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',      -- Credentials added but not verified
      'active',       -- Credentials verified and working
      'inactive',     -- Manually disabled by merchant
      'error'         -- Credentials invalid or handler error
    )),

  -- Last verification timestamp
  last_verified_at TIMESTAMPTZ,

  -- Error information (when status = 'error')
  error_message TEXT,
  error_code TEXT,

  -- Handler-specific metadata
  -- e.g., { "account_id": "acct_xxx", "business_name": "Acme Inc" }
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, handler_type, handler_name)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_connected_accounts_tenant ON connected_accounts(tenant_id);
CREATE INDEX idx_connected_accounts_handler_type ON connected_accounts(handler_type);
CREATE INDEX idx_connected_accounts_tenant_status ON connected_accounts(tenant_id, status);
CREATE INDEX idx_connected_accounts_tenant_handler ON connected_accounts(tenant_id, handler_type);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own connected accounts
CREATE POLICY "Tenants can view their own connected accounts"
  ON connected_accounts FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Tenants can create connected accounts
CREATE POLICY "Tenants can create connected accounts"
  ON connected_accounts FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Tenants can update their own connected accounts
CREATE POLICY "Tenants can update their own connected accounts"
  ON connected_accounts FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Tenants can delete their own connected accounts
CREATE POLICY "Tenants can delete their own connected accounts"
  ON connected_accounts FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update updated_at on changes
CREATE OR REPLACE FUNCTION update_connected_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_connected_accounts_updated_at();

-- =============================================================================
-- Audit Log Table (for credential access tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS connected_accounts_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,

  -- Action type
  action TEXT NOT NULL
    CHECK (action IN (
      'created',           -- Account connected
      'credentials_read',  -- Credentials decrypted for use
      'credentials_updated', -- Credentials rotated
      'verified',          -- Credentials verified working
      'verification_failed', -- Verification failed
      'disabled',          -- Manually disabled
      'enabled',           -- Re-enabled
      'deleted'            -- Account disconnected
    )),

  -- Who performed the action
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('user', 'api_key', 'system', 'agent')),
  actor_id TEXT,  -- user_id, api_key_id, 'system', or agent_id

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_connected_accounts_audit_account ON connected_accounts_audit(connected_account_id);
CREATE INDEX idx_connected_accounts_audit_tenant ON connected_accounts_audit(tenant_id);
CREATE INDEX idx_connected_accounts_audit_created ON connected_accounts_audit(created_at DESC);

-- RLS for audit table
ALTER TABLE connected_accounts_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own audit logs"
  ON connected_accounts_audit FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "System can insert audit logs"
  ON connected_accounts_audit FOR INSERT
  WITH CHECK (true);  -- Audit inserts handled by service role

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE connected_accounts IS 'Payment handler connections for multi-processor support (Epic 48)';
COMMENT ON COLUMN connected_accounts.handler_type IS 'Type of payment handler: stripe, paypal, payos_native, circle';
COMMENT ON COLUMN connected_accounts.credentials_encrypted IS 'AES-256-GCM encrypted credentials JSON';
COMMENT ON COLUMN connected_accounts.credentials_key_id IS 'Encryption key version for rotation support';
COMMENT ON COLUMN connected_accounts.status IS 'Connection status: pending, active, inactive, error';

COMMENT ON TABLE connected_accounts_audit IS 'Audit log for connected account credential access';
COMMENT ON COLUMN connected_accounts_audit.action IS 'Type of action performed on the connected account';
COMMENT ON COLUMN connected_accounts_audit.actor_type IS 'Who performed the action: user, api_key, system, agent';
