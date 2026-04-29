-- Agent Key-Pair Authentication & Persistent Connection
-- Epic 72: Ed25519 challenge-response auth, session tokens, persistent SSE, liveness tracking

-- ============================================
-- 1. Agent Auth Keys (Ed25519 public keys)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_auth_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Key identification
  key_id TEXT NOT NULL UNIQUE,               -- "auth_<first8>_<hex>"
  algorithm TEXT NOT NULL DEFAULT 'ed25519' CHECK (algorithm IN ('ed25519')),

  -- Key material
  public_key TEXT NOT NULL,                  -- Base64-encoded Ed25519 public key (32 bytes)
  public_key_hash TEXT NOT NULL,             -- SHA-256 hash for indexed lookup

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotated', 'revoked')),

  -- Metadata
  label TEXT,                                -- Optional human-readable label
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Partial unique: one active key per agent
CREATE UNIQUE INDEX idx_agent_auth_keys_active
  ON agent_auth_keys (agent_id) WHERE status = 'active';

CREATE INDEX idx_agent_auth_keys_tenant ON agent_auth_keys(tenant_id);
CREATE INDEX idx_agent_auth_keys_agent ON agent_auth_keys(agent_id);
CREATE INDEX idx_agent_auth_keys_pubhash ON agent_auth_keys(public_key_hash) WHERE status = 'active';

-- ============================================
-- 2. Agent Challenges (short-lived nonces)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Challenge data
  nonce TEXT NOT NULL,                       -- "challenge_<first8>_<32bytes_base64url>"
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,           -- NOW() + 60s

  -- Tracking
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for atomic consume: WHERE consumed = false
CREATE INDEX idx_agent_challenges_lookup
  ON agent_challenges (agent_id, nonce) WHERE consumed = FALSE;

-- Index for cleanup worker: expired challenges
CREATE INDEX idx_agent_challenges_expiry
  ON agent_challenges (expires_at) WHERE consumed = FALSE;

-- ============================================
-- 3. Agent Sessions (sess_* tokens)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  auth_key_id UUID NOT NULL REFERENCES agent_auth_keys(id) ON DELETE CASCADE,

  -- Session token (store hash only, never plaintext)
  session_token_hash TEXT NOT NULL,
  session_token_prefix TEXT NOT NULL,        -- First 12 chars for display

  -- Lifecycle
  expires_at TIMESTAMPTZ NOT NULL,           -- NOW() + 1 hour
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  -- Tracking
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Failure tracking for lockout
  consecutive_failures INT NOT NULL DEFAULT 0
);

-- Index for token validation (hot path)
CREATE INDEX idx_agent_sessions_token
  ON agent_sessions (session_token_hash) WHERE revoked_at IS NULL;

-- Index for per-agent session management
CREATE INDEX idx_agent_sessions_agent
  ON agent_sessions (agent_id, created_at DESC);

-- Index for cleanup worker
CREATE INDEX idx_agent_sessions_expiry
  ON agent_sessions (expires_at) WHERE revoked_at IS NULL;

-- ============================================
-- 4. Agent Connections (liveness tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS agent_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,

  -- Connection state
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tracking
  ip_address TEXT,
  user_agent TEXT,

  -- Event counters
  events_sent INT NOT NULL DEFAULT 0,
  events_buffered INT NOT NULL DEFAULT 0
);

-- Active connections for a tenant/agent
CREATE INDEX idx_agent_connections_active
  ON agent_connections (tenant_id, agent_id) WHERE disconnected_at IS NULL;

-- Cleanup: stale connections
CREATE INDEX idx_agent_connections_heartbeat
  ON agent_connections (last_heartbeat_at) WHERE disconnected_at IS NULL;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE agent_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_connections ENABLE ROW LEVEL SECURITY;

-- agent_auth_keys: tenant isolation
CREATE POLICY "agent_auth_keys_tenant_isolation" ON agent_auth_keys
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- agent_challenges: tenant isolation
CREATE POLICY "agent_challenges_tenant_isolation" ON agent_challenges
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- agent_sessions: tenant isolation
CREATE POLICY "agent_sessions_tenant_isolation" ON agent_sessions
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- agent_connections: tenant isolation
CREATE POLICY "agent_connections_tenant_isolation" ON agent_connections
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'tenant_id',
      current_setting('app.current_tenant_id', true)
    )::uuid
  );

-- ============================================
-- Lockout tracking function
-- ============================================

-- Atomic challenge consume (prevents race conditions)
CREATE OR REPLACE FUNCTION consume_agent_challenge(
  p_agent_id UUID,
  p_nonce TEXT
) RETURNS agent_challenges AS $$
DECLARE
  result agent_challenges;
BEGIN
  UPDATE agent_challenges
  SET consumed = TRUE
  WHERE agent_id = p_agent_id
    AND nonce = p_nonce
    AND consumed = FALSE
    AND expires_at > NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE agent_auth_keys IS 'Ed25519 public keys for agent challenge-response authentication (Epic 72)';
COMMENT ON TABLE agent_challenges IS 'Short-lived nonces for Ed25519 challenge-response handshake (60s TTL)';
COMMENT ON TABLE agent_sessions IS 'Authenticated session tokens (sess_*) issued after successful challenge-response (1hr TTL)';
COMMENT ON TABLE agent_connections IS 'Persistent SSE connection liveness tracking for agents';
COMMENT ON COLUMN agent_auth_keys.public_key IS 'Base64-encoded Ed25519 public key (32 bytes)';
COMMENT ON COLUMN agent_sessions.session_token_hash IS 'SHA-256 hash of sess_* token — plaintext never stored';
