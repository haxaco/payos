-- Workflow Engine Schema
-- Epic 29: Composable, multi-step workflow processes
-- Stories 29.1-29.13: Complete workflow engine with all step types
-- Supports: approval, condition, action, wait, notification, external steps
-- Includes: agent workflow permissions, template secrets, agentic composition

-- =============================================================================
-- Custom Types
-- =============================================================================

DO $$
BEGIN
  -- Workflow template trigger types
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_trigger_type') THEN
    CREATE TYPE workflow_trigger_type AS ENUM (
      'manual',        -- Triggered by API call
      'on_transfer',   -- Triggered by transfer events
      'on_event'       -- Triggered by generic events
    );
  END IF;

  -- Workflow instance status
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_instance_status') THEN
    CREATE TYPE workflow_instance_status AS ENUM (
      'pending',       -- Created but not started
      'running',       -- Currently executing steps
      'paused',        -- Paused (waiting for approval/external)
      'completed',     -- All steps finished successfully
      'failed',        -- A step failed
      'cancelled',     -- Cancelled by user/agent
      'timed_out'      -- Overall workflow timeout exceeded
    );
  END IF;

  -- Workflow step status
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_step_status') THEN
    CREATE TYPE workflow_step_status AS ENUM (
      'pending',            -- Not yet started
      'running',            -- Currently executing
      'waiting_approval',   -- Waiting for human/agent approval
      'waiting_external',   -- Waiting for external callback
      'waiting_schedule',   -- Waiting for scheduled time
      'approved',           -- Approved (for approval steps)
      'rejected',           -- Rejected (for approval steps)
      'completed',          -- Step completed successfully
      'failed',             -- Step failed
      'skipped',            -- Step skipped (condition evaluated false)
      'timed_out'           -- Step timed out
    );
  END IF;

  -- Workflow step types
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_step_type') THEN
    CREATE TYPE workflow_step_type AS ENUM (
      'approval',      -- Require human/agent sign-off
      'condition',     -- Branch based on expression
      'action',        -- Execute PayOS operation
      'wait',          -- Pause until condition/time
      'notification',  -- Send webhook/email
      'external'       -- Call external API
    );
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- =============================================================================
-- Workflow Templates Table (Story 29.1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template definition
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'on_transfer', 'on_event')),
  trigger_config JSONB DEFAULT '{}',
  -- Example trigger_config for on_transfer:
  -- {
  --   "conditions": [
  --     { "field": "metadata.type", "op": "eq", "value": "procurement" },
  --     { "field": "amount", "op": "gt", "value": 1000 }
  --   ]
  -- }

  -- Steps definition (array of step objects)
  steps JSONB NOT NULL DEFAULT '[]',
  -- Example steps:
  -- [
  --   {
  --     "type": "condition",
  --     "name": "Check Amount Tier",
  --     "config": { "expression": "trigger.amount <= 1000", "if_true": "skip_to:3", "if_false": "continue" }
  --   },
  --   {
  --     "type": "approval",
  --     "name": "Manager Approval",
  --     "config": { "approvers": { "type": "role", "value": "finance_manager" }, "timeout_hours": 24 }
  --   },
  --   {
  --     "type": "action",
  --     "name": "Execute Payment",
  --     "config": { "action": "execute_transfer", "params": { "transfer_id": "{{trigger.id}}" } }
  --   }
  -- ]

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  timeout_hours INTEGER DEFAULT 168, -- 7 days default

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique name per tenant
  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tenant ON workflow_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_trigger ON workflow_templates(tenant_id, trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(tenant_id, is_active);

-- =============================================================================
-- Workflow Instances Table (Story 29.2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template reference
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  template_version INTEGER NOT NULL DEFAULT 1,

  -- State machine
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'timed_out')),
  current_step_index INTEGER NOT NULL DEFAULT 0,

  -- Data
  trigger_data JSONB DEFAULT '{}',
  -- Accumulated context from step outputs (available to subsequent steps)
  context JSONB DEFAULT '{}',

  -- Initiator tracking
  initiated_by TEXT,           -- user_id, agent_id, or 'system'
  initiated_by_type TEXT       -- 'user', 'agent', 'system', 'api_key'
    CHECK (initiated_by_type IN ('user', 'agent', 'system', 'api_key')),

  -- Agent composition fields (Story 29.12)
  initiated_by_agent_id UUID REFERENCES agents(id),
  agent_context JSONB,
  -- Example agent_context:
  -- {
  --   "agent_id": "agent_456",
  --   "intent": "Process vendor payment",
  --   "conversation_id": "conv_789"
  -- }

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ,      -- When this instance should be timed out
  error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_instances_tenant ON workflow_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_agent ON workflow_instances(initiated_by_agent_id) WHERE initiated_by_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_instances_timeout ON workflow_instances(timeout_at) WHERE status IN ('running', 'paused');

-- =============================================================================
-- Workflow Step Executions Table (Story 29.2-29.7, 29.13)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Instance reference
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,

  -- Step definition (copied from template at execution time)
  step_type TEXT NOT NULL
    CHECK (step_type IN ('approval', 'condition', 'action', 'wait', 'notification', 'external')),
  step_name TEXT,
  step_config JSONB DEFAULT '{}',

  -- Execution state
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'running', 'waiting_approval', 'waiting_external',
      'waiting_schedule', 'approved', 'rejected', 'completed',
      'failed', 'skipped', 'timed_out'
    )),

  -- I/O
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  error TEXT,

  -- Approval fields (Story 29.3)
  approved_by TEXT,
  approval_decision TEXT CHECK (approval_decision IN ('approved', 'rejected')),
  approval_reason TEXT,

  -- Agent approval fields (Story 29.12)
  approved_by_agent_id UUID REFERENCES agents(id),
  agent_reasoning TEXT,

  -- External step fields (Story 29.13)
  external_request JSONB,
  external_response JSONB,
  callback_token TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique step per instance
  UNIQUE(instance_id, step_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wf_step_exec_instance ON workflow_step_executions(instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_step_exec_tenant ON workflow_step_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wf_step_exec_status ON workflow_step_executions(status);
CREATE INDEX IF NOT EXISTS idx_wf_step_exec_waiting ON workflow_step_executions(instance_id, status)
  WHERE status IN ('waiting_approval', 'waiting_external', 'waiting_schedule');
CREATE INDEX IF NOT EXISTS idx_wf_step_exec_timeout ON workflow_step_executions(expires_at)
  WHERE status IN ('waiting_approval', 'waiting_external', 'waiting_schedule');

-- =============================================================================
-- Agent Workflow Permissions Table (Story 29.12)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_workflow_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,

  can_initiate BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  approval_conditions JSONB DEFAULT '{}',
  -- Example approval_conditions:
  -- {
  --   "max_amount": 1000,
  --   "step_names": ["Manager Approval"],
  --   "require_reasoning": true
  -- }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agent_id, template_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_wf_perms_agent ON agent_workflow_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_wf_perms_template ON agent_workflow_permissions(template_id);
CREATE INDEX IF NOT EXISTS idx_agent_wf_perms_tenant ON agent_workflow_permissions(tenant_id);

-- =============================================================================
-- Workflow Template Secrets Table (Story 29.13)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_template_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  secret_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(template_id, secret_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wf_template_secrets_template ON workflow_template_secrets(template_id);
CREATE INDEX IF NOT EXISTS idx_wf_template_secrets_tenant ON workflow_template_secrets(tenant_id);

-- =============================================================================
-- Updated At Triggers
-- =============================================================================

-- Auto-update updated_at on workflow_templates
CREATE OR REPLACE FUNCTION update_workflow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_templates_updated_at ON workflow_templates;
CREATE TRIGGER trg_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_workflow_templates_updated_at();

-- Auto-update updated_at on workflow_instances
CREATE OR REPLACE FUNCTION update_workflow_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_instances_updated_at ON workflow_instances;
CREATE TRIGGER trg_workflow_instances_updated_at
  BEFORE UPDATE ON workflow_instances
  FOR EACH ROW EXECUTE FUNCTION update_workflow_instances_updated_at();

-- Auto-update updated_at on workflow_step_executions
CREATE OR REPLACE FUNCTION update_workflow_step_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_step_executions_updated_at ON workflow_step_executions;
CREATE TRIGGER trg_workflow_step_executions_updated_at
  BEFORE UPDATE ON workflow_step_executions
  FOR EACH ROW EXECUTE FUNCTION update_workflow_step_executions_updated_at();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflow_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_secrets ENABLE ROW LEVEL SECURITY;

-- Workflow Templates RLS
CREATE POLICY "workflow_templates_tenant_isolation" ON workflow_templates
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Workflow Instances RLS
CREATE POLICY "workflow_instances_tenant_isolation" ON workflow_instances
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Workflow Step Executions RLS
CREATE POLICY "workflow_step_executions_tenant_isolation" ON workflow_step_executions
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Agent Workflow Permissions RLS
CREATE POLICY "agent_workflow_permissions_tenant_isolation" ON agent_workflow_permissions
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Workflow Template Secrets RLS
CREATE POLICY "workflow_template_secrets_tenant_isolation" ON workflow_template_secrets
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- Service Role Bypass (for API server using service role key)
-- =============================================================================

-- Grant full access to service_role for all workflow tables
GRANT ALL ON workflow_templates TO service_role;
GRANT ALL ON workflow_instances TO service_role;
GRANT ALL ON workflow_step_executions TO service_role;
GRANT ALL ON agent_workflow_permissions TO service_role;
GRANT ALL ON workflow_template_secrets TO service_role;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to expire timed-out workflow instances
CREATE OR REPLACE FUNCTION expire_workflow_instances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE workflow_instances
    SET status = 'timed_out',
        completed_at = NOW(),
        error = 'Workflow timed out'
    WHERE status IN ('running', 'paused')
      AND timeout_at IS NOT NULL
      AND timeout_at <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  RETURN expired_count;
END;
$$;

-- Function to expire timed-out workflow steps
CREATE OR REPLACE FUNCTION expire_workflow_steps()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE workflow_step_executions
    SET status = 'timed_out',
        completed_at = NOW(),
        error = 'Step timed out'
    WHERE status IN ('waiting_approval', 'waiting_external', 'waiting_schedule')
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
    RETURNING id, instance_id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  RETURN expired_count;
END;
$$;
