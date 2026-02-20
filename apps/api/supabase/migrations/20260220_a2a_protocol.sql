-- Migration: Google A2A (Agent-to-Agent) Protocol Foundation
-- Epic 57: Google A2A Protocol Integration
-- Enables inter-agent communication, task lifecycle, and paid-service workflows

-- ============================================
-- 1. A2A Tasks Table
-- ============================================

CREATE TABLE IF NOT EXISTS a2a_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- A2A context (groups related tasks/turns)
  context_id VARCHAR(255),

  -- Task state (A2A spec v0.3)
  state VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (state IN ('submitted', 'working', 'input-required', 'completed', 'failed', 'canceled', 'rejected')),
  status_message TEXT,

  -- Metadata (free-form, includes payment info etc.)
  metadata JSONB DEFAULT '{}',

  -- Direction: inbound (other agent → this agent) or outbound (this agent → other)
  direction VARCHAR(10) DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound')),

  -- Remote agent info (for outbound tasks or tracking inbound callers)
  remote_agent_url VARCHAR(1024),
  remote_task_id VARCHAR(255),

  -- A2A session linkage
  a2a_session_id VARCHAR(255),

  -- Payment linkage
  mandate_id UUID REFERENCES ap2_mandates(id),
  transfer_id UUID REFERENCES transfers(id),

  -- Client agent info (who sent the task for inbound)
  client_agent_id VARCHAR(255),
  client_agent_url VARCHAR(1024),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_a2a_tasks_tenant ON a2a_tasks(tenant_id);
CREATE INDEX idx_a2a_tasks_agent ON a2a_tasks(tenant_id, agent_id);
CREATE INDEX idx_a2a_tasks_state ON a2a_tasks(tenant_id, state);
CREATE INDEX idx_a2a_tasks_context ON a2a_tasks(context_id) WHERE context_id IS NOT NULL;
CREATE INDEX idx_a2a_tasks_direction ON a2a_tasks(tenant_id, direction);

-- RLS
ALTER TABLE a2a_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY a2a_tasks_tenant_policy ON a2a_tasks
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('app.tenant_id', true)::uuid,
      (SELECT (auth.jwt()->>'tenant_id')::uuid)
    )
  );

COMMENT ON TABLE a2a_tasks IS
  'Google A2A protocol tasks for inter-agent communication';

-- ============================================
-- 2. A2A Messages Table
-- ============================================

CREATE TABLE IF NOT EXISTS a2a_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES a2a_tasks(id) ON DELETE CASCADE,

  -- Message role
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'agent')),

  -- Message parts (array of {kind, text?, data?, uri?, mimeType?})
  parts JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_a2a_messages_task ON a2a_messages(task_id);
CREATE INDEX idx_a2a_messages_tenant ON a2a_messages(tenant_id);

-- RLS
ALTER TABLE a2a_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY a2a_messages_tenant_policy ON a2a_messages
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('app.tenant_id', true)::uuid,
      (SELECT (auth.jwt()->>'tenant_id')::uuid)
    )
  );

COMMENT ON TABLE a2a_messages IS
  'Messages within A2A tasks (user prompts and agent responses)';

-- ============================================
-- 3. A2A Artifacts Table
-- ============================================

CREATE TABLE IF NOT EXISTS a2a_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES a2a_tasks(id) ON DELETE CASCADE,

  -- Artifact metadata
  label VARCHAR(255),
  mime_type VARCHAR(255) NOT NULL DEFAULT 'text/plain',

  -- Artifact parts (same format as message parts)
  parts JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_a2a_artifacts_task ON a2a_artifacts(task_id);
CREATE INDEX idx_a2a_artifacts_tenant ON a2a_artifacts(tenant_id);

-- RLS
ALTER TABLE a2a_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY a2a_artifacts_tenant_policy ON a2a_artifacts
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('app.tenant_id', true)::uuid,
      (SELECT (auth.jwt()->>'tenant_id')::uuid)
    )
  );

COMMENT ON TABLE a2a_artifacts IS
  'Output artifacts from A2A tasks (files, data, results)';

-- ============================================
-- 4. Auto-update timestamp trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_a2a_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER a2a_tasks_updated_at
  BEFORE UPDATE ON a2a_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_a2a_tasks_updated_at();
