# Epic 29: Workflow Engine ⚙️

**Status:** Pending
**Phase:** AI-Native Foundation
**Priority:** P0 (core), P1 (advanced steps)
**Total Points:** 42
**Stories:** 0/11 Complete
**Dependencies:** None
**Enables:** Approvals, Batch Processing, Compliance Flows

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

The Workflow Engine provides composable, multi-step processes configured per-partner. Instead of hard-coding "approval workflows for procurement," we build a generic system that handles approvals, batch processing, conditional logic, and multi-stage operations.

---

## Design Principles

1. **Workflows are configured, not coded** — Partners define via API/dashboard
2. **Steps are composable** — Mix approvals, waits, conditions, actions
3. **Actors can be humans or agents** — Same workflow, different executors
4. **State is inspectable** — "Where is this workflow? Who's blocking?"

---

## Step Types

| Step Type | Purpose | Example Use |
|-----------|---------|-------------|
| `approval` | Require human/agent sign-off | Manager approval for >$1K |
| `condition` | Branch based on expression | If amount > $10K → CFO review |
| `action` | Execute PayOS operation | Run the transfer |
| `wait` | Pause until condition/time | Wait for rate lock window |
| `notification` | Send webhook/email | Notify requester |

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

---

## Stories

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 29.1 | 5 | P0 | Workflow data model and template CRUD |
| 29.2 | 5 | P0 | Workflow instance creation and state machine |
| 29.3 | 5 | P0 | Approval step execution |
| 29.4 | 3 | P0 | Condition step with expression evaluation |
| 29.5 | 5 | P1 | Action step integration with transfers/simulations |
| 29.6 | 3 | P1 | Notification step (webhook delivery) |
| 29.7 | 3 | P1 | Wait step with scheduling |
| 29.8 | 2 | P1 | Timeout handling and escalation |
| 29.9 | 3 | P1 | Pending workflows API |
| 29.10 | 5 | P2 | Dashboard workflow builder UI |
| 29.11 | 3 | P2 | Workflow analytics and reporting |
| **Total** | **42** | | **0/11 Complete** |

---

## Data Model

See full schema in `/Users/haxaco/Dev/PayOS/docs/prd/PayOS_PRD_v1.15.md` lines 12909-12962

```sql
CREATE TABLE workflow_templates (...)
CREATE TABLE workflow_instances (...)
CREATE TABLE workflow_step_executions (...)
```

---

## Technical Deliverables

### API Routes
- `apps/api/src/routes/workflows.ts`

### Services
- `apps/api/src/services/workflow-engine.ts` - State machine and execution
- `apps/api/src/workers/workflow-processor.ts` - Background processing

### Database Migrations
- `20XX_create_workflow_engine.sql`

### UI Components
- `apps/web/src/app/dashboard/workflows/` - Workflow management UI
- `apps/web/src/components/workflow-builder/` - Visual workflow builder

---

## Success Criteria

- ✅ Support all 5 step types (approval, condition, action, wait, notification)
- ✅ Workflow templates configurable via API
- ✅ Visual workflow builder in dashboard
- ✅ 99%+ uptime for workflow processor
- ✅ < 1s latency for step execution
- ✅ Complete audit trail of all workflow actions

---

## Related Documentation

- **Epic 28:** Simulation System (for action step integration)
- **Epic 30:** Structured Response System (for error handling)
