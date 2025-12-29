# Epic 31: Context API 🔍

**Status:** Pending
**Phase:** AI-Native Foundation
**Priority:** P0
**Total Points:** 16
**Stories:** 0/5 Complete
**Dependencies:** None
**Enables:** CS agents, Accounting systems, Operations tools

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

The Context API provides "tell me everything about X" queries. Instead of calling 5 endpoints and assembling data, one call returns actionable context.

---

## Endpoints

### GET /v1/context/account/{account_id}

Returns complete account context:
- Account details and status
- All balances by currency
- Recent activity summary
- Payment methods
- Pending items (transfers, refunds, disputes, workflows)
- Compliance status and flags
- Limits and usage
- Refundable transfers
- Available actions

### GET /v1/context/transfer/{transfer_id}

Returns complete transfer context:
- Transfer details and status
- Source and destination accounts
- Settlement details (rail, FX, fees)
- Timeline of events
- Refund eligibility
- Related entities (quote, workflow, simulation, refunds, disputes)

### GET /v1/context/agent/{agent_id}

Returns complete agent context:
- Agent details and KYA status
- Wallet balances and limits
- Spending policy
- Recent transactions
- Available actions

### GET /v1/context/batch/{batch_id}

Returns complete batch context:
- Batch summary and status
- Simulation results
- Approval status
- Individual item statuses
- Failure details

---

## Stories

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 31.1 | 5 | P0 | Account context endpoint |
| 31.2 | 3 | P0 | Transfer context endpoint |
| 31.3 | 3 | P1 | Agent context endpoint |
| 31.4 | 3 | P1 | Batch context endpoint |
| 31.5 | 2 | P2 | Context caching layer |
| **Total** | **16** | | **0/5 Complete** |

---

## Example Response

```json
GET /v1/context/account/acc_123

{
  "account": {
    "id": "acc_123",
    "name": "Acme Corp",
    "status": "active",
    "kyb_tier": 2
  },
  "balances": [
    { "currency": "USD", "available": "50000.00", "pending": "5000.00" },
    { "currency": "BRL", "available": "125000.00", "pending": "0.00" }
  ],
  "recent_activity": {
    "last_30_days": {
      "total_transfers": 47,
      "total_volume_usd": "125000.00",
      "avg_transfer_usd": "2659.57"
    }
  },
  "payment_methods": [...],
  "pending_items": {
    "transfers": 3,
    "refunds": 0,
    "disputes": 1,
    "workflows": 2
  },
  "compliance": {
    "status": "compliant",
    "flags": [],
    "next_review": "2025-06-15"
  },
  "limits": {
    "daily_limit_usd": "100000.00",
    "daily_used_usd": "45000.00",
    "single_transfer_limit_usd": "50000.00"
  },
  "available_actions": [
    "initiate_transfer",
    "create_agent",
    "add_payment_method"
  ]
}
```

---

## Technical Deliverables

### API Routes
- `apps/api/src/routes/context.ts`

### Services
- `apps/api/src/services/context-builder.ts` - Aggregates data from multiple sources

### Caching
- `apps/api/src/services/context-cache.ts` - Optional caching layer (Story 31.5)

---

## Success Criteria

- ✅ All context endpoints return comprehensive data in single call
- ✅ Response time < 500ms for all context queries
- ✅ Includes all relevant related entities
- ✅ Available actions based on current state
- ✅ TypeScript types for all context responses

---

## Related Documentation

- **Epic 30:** Structured Response System (uses same format)
- **Epic 32:** Tool Discovery (advertises context endpoints)
