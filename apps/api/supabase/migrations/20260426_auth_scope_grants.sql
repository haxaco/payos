-- Epic 82, Story 82.1 — Scoped capability tokens.
--
-- Internal counterpart to vault_credential_grants (Epic 78). Where
-- vault grants give an agent permission to use an EXTERNAL secret
-- (Anthropic key, OpenAI key, etc.), scope grants give an agent
-- elevated permissions to act ACROSS the tenant — read sibling agent
-- balances, mutate sibling agent policies, move funds between agents,
-- etc. Default agent-token auth is single-agent-scope; this table
-- represents the audited exceptions.
--
-- See docs/prd/epics/epic-82-scoped-capability-tokens.md for the full
-- design (lifecycle, tier semantics, bypass UX, kill-switch cascade).

CREATE TABLE IF NOT EXISTS auth_scope_grants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- The session this grant is anchored to, when issued from a sess_*
  -- token via the agent's request flow. NULL when issued directly by
  -- a tenant owner via the dashboard (a "standing grant" that survives
  -- session expiry until expires_at or revoke).
  parent_session_id   UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,

  -- Scope tier — see Epic 82 spec. `agent` is the implicit default;
  -- only the elevated tiers go in this table.
  scope               TEXT NOT NULL CHECK (scope IN ('tenant_read', 'tenant_write', 'treasury')),

  -- Whether the grant is consumed on first use (per-intent) or persists
  -- until expires_at (standing grant — bypass-permissions UX).
  lifecycle           TEXT NOT NULL CHECK (lifecycle IN ('one_shot', 'standing')),

  -- Lifecycle state. consumed = one_shot used; revoked = manual or
  -- kill-switch cascade; expired = past expires_at.
  status              TEXT NOT NULL CHECK (status IN ('active', 'consumed', 'revoked', 'expired')),

  -- Short rationale shown to the user at decision time. Always present —
  -- no anonymous grants. Surfaces in /dashboard/security/scopes.
  purpose             TEXT NOT NULL,

  -- Structured intent: tool name, target ids, args (redacted of PII).
  -- For per-intent grants this is the specific call that triggered the
  -- request. For standing grants it's the rationale category.
  -- Encrypted at rest under the credential-vault key when the row
  -- contains user prompts (see Epic 84a for tenant-held KEK plan).
  intent_payload      JSONB,

  -- Always set — this enforces "every elevation has a human approver."
  -- For Epic 83's MCP-elicit / dashboard / push approval flows, this
  -- is whoever clicked the approve button.
  granted_by_user_id  UUID NOT NULL,

  granted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at         TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL,
  last_used_at        TIMESTAMPTZ,
  use_count           INTEGER NOT NULL DEFAULT 0,

  -- Sanity: standing grants need durations capped per tier. Hard
  -- ceilings enforced at write time by the service layer; this CHECK
  -- catches any bypass via raw SQL.
  CONSTRAINT scope_expires_in_future CHECK (expires_at > granted_at),
  CONSTRAINT treasury_never_standing CHECK (
    NOT (scope = 'treasury' AND lifecycle = 'standing')
  )
);

-- Hot path: auth middleware looks up active grants for an agent on
-- every authenticated request. Partial index on the active subset
-- so the lookup stays cheap even as the audit history grows.
CREATE INDEX IF NOT EXISTS idx_scope_grants_active_by_agent
  ON auth_scope_grants (tenant_id, agent_id, scope)
  WHERE status = 'active';

-- Session-anchored lookup for one_shot grants — when a sess_* token
-- presents, we find any pending one_shots issued under that session.
CREATE INDEX IF NOT EXISTS idx_scope_grants_active_by_session
  ON auth_scope_grants (parent_session_id, status)
  WHERE parent_session_id IS NOT NULL AND status = 'active';

-- Expiration sweep — daily worker selects grants whose expires_at has
-- passed and flips them to status='expired'.
CREATE INDEX IF NOT EXISTS idx_scope_grants_expiration
  ON auth_scope_grants (expires_at)
  WHERE status = 'active';

-- ============================================
-- AUDIT TABLE — every grant lifecycle event + every use.
-- ============================================
CREATE TABLE IF NOT EXISTS auth_scope_audit (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Nullable because a request that's denied never produces a grant
  -- row, but should still leave an audit trail.
  grant_id            UUID REFERENCES auth_scope_grants(id) ON DELETE SET NULL,
  agent_id            UUID,
  scope               TEXT,

  action              TEXT NOT NULL CHECK (action IN (
    'scope_requested',   -- agent submitted a request_scope call
    'scope_granted',     -- user approved → grant row inserted
    'scope_denied',      -- user denied
    'scope_used',        -- a request consumed the grant (per-call audit)
    'scope_expired',     -- expiration sweep flipped status
    'scope_revoked',     -- manual revoke OR kill-switch cascade
    'scope_heartbeat'    -- daily heartbeat for active standing grants
                         -- (catches "I forgot I approved this" cases)
  )),

  -- Who triggered the event. For 'scope_requested' it's the agent; for
  -- 'scope_granted/denied' it's the user; for 'scope_used' it's the
  -- agent again; for 'scope_expired' it's 'system'.
  actor_type          TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system', 'api_key')),
  actor_id            UUID,

  -- Per-event context: { mcp_tool, route, request_id, decision_channel }
  -- Decision channel records which Epic 83 channel (mcp_elicit /
  -- dashboard / push) carried the approval, for telemetry on which
  -- channels are being used.
  request_summary     JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scope_audit_tenant_time
  ON auth_scope_audit (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scope_audit_agent_time
  ON auth_scope_audit (agent_id, created_at DESC)
  WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scope_audit_grant
  ON auth_scope_audit (grant_id)
  WHERE grant_id IS NOT NULL;

-- ============================================
-- RLS — tenant-scoped reads, service-role bypass for the API.
-- ============================================
ALTER TABLE auth_scope_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_scope_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_scope_grants_tenant_read"
  ON auth_scope_grants
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "auth_scope_audit_tenant_read"
  ON auth_scope_audit
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE auth_scope_grants IS
  'Epic 82. Per-agent capability grants: an audited record of every '
  'time an agent operates outside its default single-agent scope. '
  'Issued by users (tenant owners) via dashboard or by the per-intent '
  'request_scope flow (Epic 83). Auth middleware reads the active set '
  'on every request to populate ctx.elevatedScope.';

COMMENT ON TABLE auth_scope_audit IS
  'Epic 82. Append-only audit of scope grant lifecycle + usage. '
  'Surface in /dashboard/security/scopes; feeds Epic 84 ops view.';
