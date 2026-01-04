# Epic 29: Workflow Engine ⚙️

**Status:** Pending
**Phase:** AI-Native Foundation
**Priority:** P0 (core), P1 (advanced steps), P2 (agentic composition)
**Total Points:** 52 (was 42, +10 for agentic composition)
**Stories:** 0/13 Complete
**Dependencies:** None
**Enables:** Approvals, Batch Processing, Compliance Flows, Agentic Composition

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

The Workflow Engine provides composable, multi-step processes configured per-partner. Instead of hard-coding "approval workflows for procurement," we build a generic system that handles approvals, batch processing, conditional logic, and multi-stage operations.

**NEW (v1.15):** Agentic Composition support enables AI agents to orchestrate workflows, advancing multi-step processes and chaining PayOS capabilities with external services.

---

## Design Principles

1. **Workflows are configured, not coded** — Partners define via API/dashboard
2. **Steps are composable** — Mix approvals, waits, conditions, actions
3. **Actors can be humans or agents** — Same workflow, different executors
4. **State is inspectable** — "Where is this workflow? Who's blocking?"
5. **Agent-drivable** — AI agents can initiate and advance workflows ⭐ NEW

---

## Step Types

| Step Type | Purpose | Example Use |
|-----------|---------|-------------|
| `approval` | Require human/agent sign-off | Manager approval for >$1K |
| `condition` | Branch based on expression | If amount > $10K → CFO review |
| `action` | Execute PayOS operation | Run the transfer |
| `wait` | Pause until condition/time | Wait for rate lock window |
| `notification` | Send webhook/email | Notify requester |
| `external` | Call external API ⭐ NEW | Fetch data from ERP |

---

## Example: Procurement Approval Workflow

```json
{
  "name": "Procurement Approval",
  "trigger_type": "on_transfer",
  "trigger_config": {
    "conditions": [{ "field": "metadata.type", "op": "eq", "value": "procurement" }]
  },
  "steps": [
    {
      "type": "condition",
      "name": "Check Amount Tier",
      "config": {
        "expression": "trigger.amount <= 1000",
        "if_true": "skip_to:3",
        "if_false": "continue"
      }
    },
    {
      "type": "approval",
      "name": "CFO Approval",
      "config": {
        "approvers": { "type": "role", "value": "cfo" },
        "timeout_hours": 48
      }
    },
    {
      "type": "approval",
      "name": "Manager Approval",
      "config": {
        "approvers": { "type": "role", "value": "finance_manager" },
        "timeout_hours": 24
      }
    },
    {
      "type": "action",
      "name": "Execute Payment",
      "config": {
        "action": "execute_transfer",
        "params": { "transfer_id": "{{trigger.id}}" }
      }
    }
  ]
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/workflows/templates` | POST | Create workflow template |
| `/v1/workflows/templates` | GET | List templates |
| `/v1/workflows/templates/{id}` | GET/PUT/DELETE | Manage template |
| `/v1/workflows/instances` | POST | Manually trigger workflow |
| `/v1/workflows/instances` | GET | List instances |
| `/v1/workflows/instances/{id}` | GET | Get instance status |
| `/v1/workflows/instances/{id}/steps/{n}/approve` | POST | Approve step |
| `/v1/workflows/instances/{id}/steps/{n}/reject` | POST | Reject step |
| `/v1/workflows/pending` | GET | My pending approvals |
| `/v1/workflows/instances/{id}/advance` | POST | Agent advances workflow ⭐ NEW |
| `/v1/workflows/instances/{id}/steps/{n}/complete-external` | POST | Complete external step ⭐ NEW |

---

## Stories

### Core Workflow Engine (P0)

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 29.1 | 5 | P0 | Workflow data model and template CRUD |
| 29.2 | 5 | P0 | Workflow instance creation and state machine |
| 29.3 | 5 | P0 | Approval step execution |
| 29.4 | 3 | P0 | Condition step with expression evaluation |

### Advanced Steps (P1)

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 29.5 | 5 | P1 | Action step integration with transfers/simulations |
| 29.6 | 3 | P1 | Notification step (webhook delivery) |
| 29.7 | 3 | P1 | Wait step with scheduling |
| 29.8 | 2 | P1 | Timeout handling and escalation |
| 29.9 | 3 | P1 | Pending workflows API |

### Dashboard & Analytics (P2)

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 29.10 | 5 | P2 | Dashboard workflow builder UI |
| 29.11 | 3 | P2 | Workflow analytics and reporting |

### Agentic Composition (P2) ⭐ NEW

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 29.12 | 5 | P2 | Agent-driven workflow execution |
| 29.13 | 5 | P2 | External step type for API composition |

**Total Points:** 52 (42 original + 10 new)

---

### Story 29.12: Agent-Driven Workflow Execution (5 pts, P2) ⭐ NEW

**Priority:** P2  
**Points:** 5  
**Dependencies:** Story 29.2 (Workflow Instance), Story 29.3 (Approval Step)

#### Background

From Obsidian research on x42 Scan "composer mode":
> Agents chain APIs together to accomplish complex tasks. PayOS workflows should be drivable by agents, not just humans.

#### Description

Allow AI agents to initiate and advance workflows, enabling agentic composition of PayOS capabilities.

#### Features

**1. Agent Workflow Trigger:**
```typescript
// Agent can trigger workflow
POST /v1/workflows/instances
Authorization: Bearer agent_token_...
{
  "template_id": "wf_procurement_approval",
  "trigger_data": {
    "transfer_id": "txn_123",
    "amount": 5000,
    "vendor": "Brazilian Supplier Ltd"
  },
  "agent_context": {
    "agent_id": "agent_456",
    "intent": "Process vendor payment",
    "conversation_id": "conv_789"
  }
}
```

**2. Agent Approval:**
```typescript
// Agent can approve steps (if authorized)
POST /v1/workflows/instances/{id}/steps/{n}/approve
Authorization: Bearer agent_token_...
{
  "decision": "approved",
  "reasoning": "Amount within agent spending limit, vendor pre-approved",
  "agent_signature": "..." // Optional cryptographic proof
}
```

**3. Agent Step Advancement:**
```typescript
// Agent can check and advance workflows
POST /v1/workflows/instances/{id}/advance
Authorization: Bearer agent_token_...
{
  "action": "proceed_if_ready"
}
```

**4. Agent Approval Policies:**
```json
{
  "agent_id": "agent_456",
  "workflow_permissions": {
    "can_initiate": ["procurement_approval", "expense_report"],
    "can_approve": {
      "procurement_approval": {
        "max_amount": 1000,
        "step_names": ["Manager Approval"]
      }
    }
  }
}
```

#### API Endpoints

```
POST /v1/workflows/instances - Create (enhanced for agent context)
POST /v1/workflows/instances/{id}/advance - Agent advances to next available step
GET /v1/workflows/instances/{id}/agent-actions - List actions agent can take
POST /v1/agents/{id}/workflow-permissions - Configure agent workflow permissions
```

#### Database Schema Extension

```sql
-- Track agent interactions with workflows
ALTER TABLE workflow_instances ADD COLUMN initiated_by_agent_id UUID REFERENCES agents(id);
ALTER TABLE workflow_instances ADD COLUMN agent_context JSONB;

ALTER TABLE workflow_step_executions ADD COLUMN approved_by_agent_id UUID REFERENCES agents(id);
ALTER TABLE workflow_step_executions ADD COLUMN agent_reasoning TEXT;

-- Agent workflow permissions
CREATE TABLE agent_workflow_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  template_id UUID NOT NULL REFERENCES workflow_templates(id),
  can_initiate BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  approval_conditions JSONB,  -- max_amount, step_names, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Acceptance Criteria

- [ ] Agents can trigger workflows with agent_context
- [ ] Agents can approve steps within their permission limits
- [ ] Agent actions recorded with reasoning
- [ ] Agent workflow permissions configurable per agent
- [ ] API returns available actions for agent
- [ ] Audit trail distinguishes human vs agent approvals

---

### Story 29.13: External Step Type for API Composition (5 pts, P2) ⭐ NEW

**Priority:** P2  
**Points:** 5  
**Dependencies:** Story 29.2 (Workflow Instance), Story 29.6 (Notification Step)

#### Background

From Obsidian research on agentic composition:
> x42 Scan "composer mode" lets agents chain APIs. Workflows should support calling external services as part of multi-step processes.

#### Description

Add `external` step type that calls external APIs as part of workflow execution, enabling PayOS workflows to integrate with ERPs, CRMs, and other systems.

#### Features

**1. External Step Configuration:**
```json
{
  "type": "external",
  "name": "Fetch PO from ERP",
  "config": {
    "url": "https://erp.example.com/api/purchase-orders/{{trigger.po_number}}",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer {{secrets.erp_api_key}}"
    },
    "timeout_seconds": 30,
    "retry_config": {
      "max_retries": 3,
      "backoff_ms": 1000
    },
    "success_condition": "response.status == 200",
    "extract_fields": {
      "po_amount": "response.body.total_amount",
      "po_status": "response.body.status"
    }
  }
}
```

**2. Webhook-Based Completion:**
```json
{
  "type": "external",
  "name": "Submit to Compliance System",
  "config": {
    "mode": "async",  // Don't wait for response
    "url": "https://compliance.example.com/api/reviews",
    "method": "POST",
    "body": {
      "transfer_id": "{{trigger.id}}",
      "callback_url": "{{payos.webhook_url}}/workflows/{{instance.id}}/steps/2/complete"
    },
    "completion_timeout_hours": 24
  }
}
```

**3. Completion via Webhook:**
```typescript
// External system calls back to complete step
POST /v1/workflows/instances/{id}/steps/{n}/complete-external
{
  "status": "completed",
  "result": {
    "compliance_status": "approved",
    "risk_score": 0.12
  },
  "signature": "hmac_sha256_..."  // Verify callback authenticity
}
```

**4. Error Handling:**
```json
{
  "type": "external",
  "config": {
    "on_failure": "retry",  // or "skip", "fail_workflow", "human_review"
    "failure_notification": {
      "type": "webhook",
      "url": "{{tenant.webhook_url}}"
    }
  }
}
```

#### API Endpoints

```
POST /v1/workflows/instances/{id}/steps/{n}/complete-external - External system completes step
GET /v1/workflows/instances/{id}/steps/{n}/callback-url - Get callback URL for external step
POST /v1/workflows/templates/{id}/secrets - Configure template secrets
```

#### Database Schema Extension

```sql
-- Store external step results
ALTER TABLE workflow_step_executions ADD COLUMN external_request JSONB;
ALTER TABLE workflow_step_executions ADD COLUMN external_response JSONB;
ALTER TABLE workflow_step_executions ADD COLUMN callback_token TEXT;  -- For webhook verification

-- Template secrets (encrypted)
CREATE TABLE workflow_template_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id),
  secret_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, secret_name)
);
```

#### Acceptance Criteria

- [ ] External step type executes HTTP requests
- [ ] Supports both sync and async (webhook) modes
- [ ] Secrets securely stored and injected
- [ ] Retry logic works with backoff
- [ ] Webhook completion verifies signature
- [ ] Extracted fields available to subsequent steps
- [ ] Timeout handling for async steps

---

## Updated Story Summary

| Story | Points | Priority | Status | Category |
|-------|--------|----------|--------|----------|
| 29.1 | 5 | P0 | Pending | Core |
| 29.2 | 5 | P0 | Pending | Core |
| 29.3 | 5 | P0 | Pending | Core |
| 29.4 | 3 | P0 | Pending | Core |
| 29.5 | 5 | P1 | Pending | Advanced |
| 29.6 | 3 | P1 | Pending | Advanced |
| 29.7 | 3 | P1 | Pending | Advanced |
| 29.8 | 2 | P1 | Pending | Advanced |
| 29.9 | 3 | P1 | Pending | Advanced |
| 29.10 | 5 | P2 | Pending | Dashboard |
| 29.11 | 3 | P2 | Pending | Analytics |
| 29.12 | 5 | P2 | ⭐ NEW | Agentic |
| 29.13 | 5 | P2 | ⭐ NEW | Agentic |
| **Total** | **52** | | **0/13 Complete** | |

---

## Data Model

See full schema in `/Users/haxaco/Dev/PayOS/docs/prd/PayOS_PRD_v1.15.md` lines 12909-12962

```sql
CREATE TABLE workflow_templates (...)
CREATE TABLE workflow_instances (...)
CREATE TABLE workflow_step_executions (...)
-- NEW
CREATE TABLE agent_workflow_permissions (...)
CREATE TABLE workflow_template_secrets (...)
```

---

## Technical Deliverables

### API Routes
- `apps/api/src/routes/workflows.ts`
- `apps/api/src/routes/workflow-external.ts` ⭐ NEW

### Services
- `apps/api/src/services/workflow-engine.ts` - State machine and execution
- `apps/api/src/services/workflow-external.ts` ⭐ NEW - External step execution
- `apps/api/src/workers/workflow-processor.ts` - Background processing

### Database Migrations
- `20XX_create_workflow_engine.sql`
- `20XX_add_agent_workflow_support.sql` ⭐ NEW
- `20XX_add_external_step_support.sql` ⭐ NEW

### UI Components
- `apps/web/src/app/dashboard/workflows/` - Workflow management UI
- `apps/web/src/components/workflow-builder/` - Visual workflow builder

---

## Success Criteria

- ✅ Support all 6 step types (approval, condition, action, wait, notification, external)
- ✅ Workflow templates configurable via API
- ✅ Visual workflow builder in dashboard
- ✅ 99%+ uptime for workflow processor
- ✅ < 1s latency for step execution
- ✅ Complete audit trail of all workflow actions
- ✅ Agents can initiate and advance workflows ⭐ NEW
- ✅ External APIs callable as workflow steps ⭐ NEW

---

## Related Documentation

- **Epic 28:** Simulation System (for action step integration)
- **Epic 30:** Structured Response System (for error handling)
- **Epic 36:** SDK (for agent workflow integration)
- **Research:** [Obsidian - Agentic Composition](../investigations/agentic-composition.md)
