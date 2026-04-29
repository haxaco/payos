-- Cross-tenant opt-in flag for agents.
-- When false, other tenants cannot create tasks targeting this agent.
-- Default true for existing marketplace agents (backward compatible).
ALTER TABLE agents ADD COLUMN IF NOT EXISTS allow_cross_tenant BOOLEAN DEFAULT true;

COMMENT ON COLUMN agents.allow_cross_tenant IS
  'When true, agents from other tenants can send tasks to this agent via A2A. '
  'When false, only same-tenant agents can create tasks. Default true for marketplace compatibility.';
