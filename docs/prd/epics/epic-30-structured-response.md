# Epic 30: Structured Response System 📋

**Status:** Pending
**Phase:** AI-Native Foundation
**Priority:** P0
**Total Points:** 26
**Stories:** 0/8 Complete
**Dependencies:** None
**Enables:** All agent integrations

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Transform all API responses to be machine-parseable with consistent structure, error codes, and suggested actions. This is foundational for AI agent integration.

---

## Response Structure

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance in source account",
    "details": {
      "required_amount": "5000.00",
      "available_amount": "3500.00",
      "shortfall": "1500.00",
      "currency": "USD"
    },
    "suggested_actions": [
      {
        "action": "top_up_account",
        "description": "Add funds to source account",
        "endpoint": "/v1/accounts/acc_123/deposits",
        "min_amount": "1500.00"
      }
    ],
    "retry": {
      "retryable": true,
      "after_action": "top_up_account"
    },
    "documentation_url": "https://docs.payos.com/errors/INSUFFICIENT_BALANCE"
  },
  "request_id": "req_xyz789",
  "timestamp": "2025-12-28T14:30:00Z"
}
```

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-12-28T14:30:00Z",
    "processing_time_ms": 145
  },
  "links": {
    "self": "/v1/transfers/txn_123",
    "account": "/v1/accounts/acc_456"
  },
  "next_actions": [
    {
      "action": "check_status",
      "description": "Poll for settlement status",
      "endpoint": "/v1/transfers/txn_123",
      "recommended_interval_seconds": 30
    }
  ]
}
```

---

## Error Code Taxonomy

| Category | Codes |
|----------|-------|
| Balance | `INSUFFICIENT_BALANCE`, `HOLD_EXCEEDS_BALANCE`, `CURRENCY_MISMATCH` |
| Validation | `INVALID_AMOUNT`, `INVALID_CURRENCY`, `INVALID_ACCOUNT_ID`, `INVALID_PIX_KEY`, `INVALID_CLABE` |
| Limits | `DAILY_LIMIT_EXCEEDED`, `SINGLE_TRANSFER_LIMIT_EXCEEDED`, `AGENT_SPENDING_LIMIT_EXCEEDED`, `VELOCITY_LIMIT_EXCEEDED` |
| Compliance | `COMPLIANCE_HOLD`, `SANCTIONS_MATCH`, `KYC_REQUIRED`, `KYB_REQUIRED` |
| Technical | `RATE_EXPIRED`, `IDEMPOTENCY_CONFLICT`, `CONCURRENT_MODIFICATION`, `SERVICE_UNAVAILABLE`, `RATE_LIMITED` |
| Workflow | `APPROVAL_REQUIRED`, `APPROVAL_PENDING`, `APPROVAL_REJECTED` |

---

## Stories

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| 30.1 | 3 | P0 | Define error code taxonomy and response schemas |
| 30.2 | 5 | P0 | Implement response wrapper middleware |
| 30.3 | 5 | P0 | Migrate transfer endpoints to structured responses |
| 30.4 | 3 | P0 | Migrate account endpoints to structured responses |
| 30.5 | 3 | P1 | Migrate refund/dispute endpoints |
| 30.6 | 2 | P1 | Migrate agent/wallet endpoints |
| 30.7 | 2 | P1 | Add suggested_actions to all error types |
| 30.8 | 3 | P2 | OpenAPI spec generation from response schemas |
| **Total** | **26** | | **0/8 Complete** |

---

## Technical Deliverables

### Middleware
- `apps/api/src/middleware/response-wrapper.ts` - Unified response formatting

### Type Definitions
- `packages/types/src/api-responses.ts` - Response type definitions
- `packages/types/src/error-codes.ts` - Error code enum

### Documentation
- `docs/API_ERRORS.md` - Error code reference
- `docs/API_RESPONSES.md` - Response structure guide

---

## Success Criteria

- ✅ All API endpoints use consistent response structure
- ✅ All errors have machine-readable codes
- ✅ All errors include suggested actions
- ✅ TypeScript types for all responses
- ✅ Complete error documentation

---

## Related Documentation

- **Epic 31:** Context API (uses structured responses)
- **Epic 32:** Tool Discovery (exposes error codes)
