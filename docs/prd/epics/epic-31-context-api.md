# Epic 31: Context API 🔍

**Status:** 🚧 IN PROGRESS  
**Phase:** AI-Native Foundation  
**Priority:** P0  
**Total Points:** 21  
**Stories:** 5/6 Complete (16 points done, 5 remaining)  
**Dependencies:** Epic 30 (Structured Responses) ✅  
**Enables:** CS agents, Accounting systems, Operations tools, Dashboard 360 views

**Started:** 2026-01-01

### Story Status:
- ✅ 31.1: Account Context Endpoint (5 pts) - COMPLETE
- ✅ 31.2: Transfer Context Endpoint (3 pts) - COMPLETE
- ✅ 31.3: Agent Context Endpoint (3 pts) - COMPLETE
- ✅ 31.4: Batch Context Endpoint (3 pts) - COMPLETE
- ✅ 31.5: Context Caching Layer (2 pts) - COMPLETE
- ✅ 31.6: Context Viewer / Account 360 (UI) (5 pts) - COMPLETE (Regression Tracked)

[← Back to Epic List](./README.md)

---

## Overview

The Context API provides "tell me everything about X" queries. Instead of calling 5 endpoints and assembling data, one call returns actionable context.

**Why This Matters:**

When a customer service agent asks "What's going on with account X?", they currently need to:
1. `GET /v1/accounts/:id` - Get basic info
2. `GET /v1/accounts/:id/balances` - Get balances
3. `GET /v1/transfers?account_id=:id` - Get recent transfers
4. `GET /v1/disputes?account_id=:id` - Check for disputes
5. `GET /v1/agents?account_id=:id` - List agents
6. ...and more

AI agents face the same problem—they burn tokens and time making sequential calls. The Context API solves this with single-call comprehensive responses.

---

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v1/context/account/{id}` | Everything about an account |
| `GET /v1/context/transfer/{id}` | Everything about a transfer |
| `GET /v1/context/agent/{id}` | Everything about an agent |
| `GET /v1/context/batch/{id}` | Everything about a batch |

---

## Stories

### Story 31.1: Account Context Endpoint

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** Epic 30 (for structured response format)

#### Description

Create `GET /v1/context/account/{account_id}` that returns comprehensive account information in a single call. This is the most important context endpoint—it powers customer service, dashboards, and AI agents.

#### Requirements

1. **Account Details:**
   - Basic info: id, name, type, status, created_at
   - KYB tier and verification status
   - Parent account (if sub-account)
   - Metadata

2. **Balances:**
   - All currencies the account holds
   - Available balance per currency
   - Pending balance per currency (incoming/outgoing)
   - Total USD equivalent

3. **Recent Activity Summary:**
   - Last 30 days statistics:
     - Total transfer count
     - Total volume (USD equivalent)
     - Average transfer size
     - Success rate
   - Last 5 transfers (summary, not full details)

4. **Payment Methods:**
   - All linked payment methods
   - Type (PIX, SPEI, card, bank)
   - Masked identifiers
   - Status (active, pending verification, expired)

5. **Pending Items:**
   - Count of pending transfers
   - Count of pending refunds
   - Count of open disputes
   - Count of pending workflow approvals
   - For each category, include the 3 most urgent items with basic info

6. **Compliance:**
   - Overall compliance status (compliant, review_needed, blocked)
   - Active flags (if any)
   - Next scheduled review date
   - Required actions (if any)

7. **Limits:**
   - Daily limit (amount and currency)
   - Daily used amount
   - Monthly limit (if applicable)
   - Monthly used amount
   - Single transfer limit
   - Percentage used (for progress bars)

8. **Available Actions:**
   - List of actions the account can currently perform
   - Based on status, compliance, and limits
   - Examples: `initiate_transfer`, `create_agent`, `add_payment_method`, `request_limit_increase`

9. **Related Entities:**
   - Count of agents under this account
   - Count of sub-accounts (if parent)
   - Link to parent account (if sub-account)

#### Response Structure

```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_123",
      "name": "Acme Corp",
      "type": "business",
      "status": "active",
      "kyb_tier": 2,
      "created_at": "2024-06-15T10:00:00Z"
    },
    "balances": [
      { "currency": "USD", "available": "50000.00", "pending": "5000.00" },
      { "currency": "BRL", "available": "125000.00", "pending": "0.00" }
    ],
    "total_balance_usd": "75000.00",
    "recent_activity": {
      "period": "last_30_days",
      "total_transfers": 47,
      "total_volume_usd": "125000.00",
      "avg_transfer_usd": "2659.57",
      "success_rate": 0.98,
      "recent_transfers": [
        { "id": "txn_1", "amount": "5000.00", "currency": "USD", "status": "completed", "created_at": "..." }
      ]
    },
    "payment_methods": [
      { "id": "pm_1", "type": "pix", "identifier_masked": "***7890", "status": "active" }
    ],
    "pending_items": {
      "transfers": { "count": 3, "items": [...] },
      "refunds": { "count": 0, "items": [] },
      "disputes": { "count": 1, "items": [...] },
      "workflows": { "count": 2, "items": [...] }
    },
    "compliance": {
      "status": "compliant",
      "flags": [],
      "next_review": "2025-06-15",
      "required_actions": []
    },
    "limits": {
      "daily": { "limit": "100000.00", "used": "45000.00", "remaining": "55000.00", "percentage_used": 45 },
      "monthly": { "limit": "1000000.00", "used": "350000.00", "remaining": "650000.00", "percentage_used": 35 },
      "single_transfer": { "limit": "50000.00" }
    },
    "available_actions": [
      "initiate_transfer",
      "create_agent",
      "add_payment_method",
      "request_limit_increase"
    ],
    "related": {
      "agent_count": 3,
      "sub_account_count": 0,
      "parent_account_id": null
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-12-30T10:00:00Z",
    "processing_time_ms": 145
  },
  "links": {
    "self": "/v1/context/account/acc_123",
    "account": "/v1/accounts/acc_123",
    "transfers": "/v1/transfers?account_id=acc_123",
    "agents": "/v1/agents?account_id=acc_123"
  }
}
```

#### Performance Requirements

- Response time < 500ms for 95th percentile
- Should use parallel queries where possible
- Consider which data can be slightly stale (e.g., 30-day stats)

#### Acceptance Criteria

- [ ] Endpoint returns all sections defined above
- [ ] Response follows Epic 30 structured response format
- [ ] Handles account not found with proper error code
- [ ] Handles inactive/suspended accounts appropriately
- [ ] Available actions are context-aware (no "create_transfer" if blocked)
- [ ] Response time < 500ms for typical accounts
- [ ] TypeScript types defined for response
- [ ] Unit tests for each section of the response
- [ ] Integration test for full endpoint

#### Test Expectations

- Test that all sections are present in response
- Test account not found returns ACCOUNT_NOT_FOUND error
- Test suspended account shows limited available_actions
- Test pending items counts match actual database state
- Test limits show correct percentage calculations
- Test response time is under 500ms

---

### Story 31.2: Transfer Context Endpoint

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 31.1

#### Description

Create `GET /v1/context/transfer/{transfer_id}` that returns comprehensive transfer information including related entities, timeline, and available actions.

#### Requirements

1. **Transfer Details:**
   - All basic transfer fields (id, amount, currency, status, etc.)
   - Source and destination account summaries (not full context)
   - Created by (user, agent, API key)

2. **Settlement Details:**
   - Settlement rail (pix, spei, wire)
   - FX rate applied (if cross-currency)
   - Fees breakdown (platform fee, fx fee, rail fee)
   - Destination amount and currency
   - Expected/actual settlement time

3. **Timeline:**
   - Ordered list of events:
     - Created
     - Compliance check (passed/flagged)
     - Quote locked
     - Approved (if workflow)
     - Submitted to rail
     - Settled
     - Failed (if applicable)
   - Each event includes timestamp and actor

4. **Refund Eligibility:**
   - Can be refunded? (boolean)
   - If not, why? (already refunded, window expired, wrong status)
   - Refund window expiry (if eligible)
   - Already refunded amount (for partial refunds)
   - Max refundable amount

5. **Related Entities:**
   - Quote ID (if used)
   - Workflow ID (if approval was required)
   - Simulation ID (if simulated first)
   - Refund IDs (if any refunds issued)
   - Dispute ID (if disputed)
   - Batch ID (if part of batch)

6. **Available Actions:**
   - Based on current status
   - Examples: `cancel`, `refund`, `dispute`, `retry`, `download_receipt`

#### Response Structure

```json
{
  "success": true,
  "data": {
    "transfer": {
      "id": "txn_123",
      "amount": "5000.00",
      "currency": "USD",
      "status": "completed",
      "created_at": "2025-12-30T10:00:00Z",
      "completed_at": "2025-12-30T10:02:15Z"
    },
    "source_account": {
      "id": "acc_123",
      "name": "Acme Corp"
    },
    "destination_account": {
      "id": "acc_456",
      "name": "João Silva"
    },
    "settlement": {
      "rail": "pix",
      "fx_rate": "4.95",
      "destination_amount": "24750.00",
      "destination_currency": "BRL",
      "fees": {
        "platform_fee": "25.00",
        "fx_fee": "17.50",
        "rail_fee": "0.00",
        "total": "42.50"
      },
      "estimated_time_seconds": 120,
      "actual_time_seconds": 135
    },
    "timeline": [
      { "event": "created", "timestamp": "2025-12-30T10:00:00Z", "actor": "user_789" },
      { "event": "compliance_passed", "timestamp": "2025-12-30T10:00:05Z" },
      { "event": "submitted_to_rail", "timestamp": "2025-12-30T10:00:10Z" },
      { "event": "settled", "timestamp": "2025-12-30T10:02:15Z" }
    ],
    "refund_eligibility": {
      "can_refund": true,
      "refund_window_expires": "2025-01-29T10:02:15Z",
      "already_refunded": "0.00",
      "max_refundable": "5000.00"
    },
    "related": {
      "quote_id": "quote_abc",
      "workflow_id": null,
      "simulation_id": null,
      "refund_ids": [],
      "dispute_id": null,
      "batch_id": null
    },
    "available_actions": ["refund", "download_receipt"]
  },
  "meta": { ... },
  "links": {
    "self": "/v1/context/transfer/txn_123",
    "transfer": "/v1/transfers/txn_123",
    "source_account": "/v1/accounts/acc_123",
    "destination_account": "/v1/accounts/acc_456",
    "refund": "/v1/refunds?transfer_id=txn_123"
  }
}
```

#### Acceptance Criteria

- [ ] Endpoint returns all sections defined above
- [ ] Timeline is ordered chronologically
- [ ] Refund eligibility logic is accurate
- [ ] Related entities include links when present
- [ ] Available actions match current transfer status
- [ ] Handles transfer not found with proper error
- [ ] Response time < 300ms

#### Test Expectations

- Test completed transfer shows correct timeline
- Test pending transfer shows appropriate available actions
- Test refund eligibility after window expires shows can_refund: false
- Test failed transfer includes failure reason in timeline
- Test transfer with refunds shows correct already_refunded amount

---

### Story 31.3: Agent Context Endpoint

**Points:** 3  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 31.1

#### Description

Create `GET /v1/context/agent/{agent_id}` that returns comprehensive agent information including wallet, limits, and transaction history.

#### Requirements

1. **Agent Details:**
   - Basic info: id, name, status, created_at
   - KYA (Know Your Agent) status
   - Parent account reference
   - Spending policy summary

2. **Wallet:**
   - Current balance (by currency)
   - Pending transactions
   - Funding source account

3. **Limits:**
   - Daily spending limit
   - Daily spent amount
   - Monthly spending limit (if applicable)
   - Monthly spent amount
   - Per-transaction limit
   - Remaining amounts and percentages

4. **Spending Policy:**
   - Allowed currencies
   - Allowed destinations (any, allowlist, etc.)
   - Requires approval above amount
   - Blocked actions

5. **Recent Transactions:**
   - Last 10 transactions
   - Summary: type, amount, status, timestamp
   - 30-day statistics

6. **Available Actions:**
   - Based on status and limits
   - Examples: `make_payment`, `request_limit_increase`, `update_policy`, `deactivate`

#### Response Structure

```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "agent_123",
      "name": "Procurement Bot",
      "status": "active",
      "kya_status": "verified",
      "created_at": "2025-01-15T10:00:00Z"
    },
    "parent_account": {
      "id": "acc_123",
      "name": "Acme Corp"
    },
    "wallet": {
      "balance": { "USD": "5000.00" },
      "pending": { "USD": "500.00" },
      "funding_source": "acc_123"
    },
    "limits": {
      "daily": { "limit": "10000.00", "used": "2500.00", "remaining": "7500.00", "percentage_used": 25 },
      "monthly": { "limit": "100000.00", "used": "45000.00", "remaining": "55000.00", "percentage_used": 45 },
      "per_transaction": { "limit": "5000.00" }
    },
    "spending_policy": {
      "allowed_currencies": ["USD", "BRL"],
      "destination_restriction": "allowlist",
      "allowlisted_accounts": ["acc_456", "acc_789"],
      "approval_required_above": "2500.00",
      "blocked_actions": []
    },
    "recent_transactions": {
      "last_10": [...],
      "last_30_days": {
        "count": 23,
        "total_amount_usd": "45000.00",
        "avg_amount": "1956.52"
      }
    },
    "available_actions": ["make_payment", "request_limit_increase"]
  },
  "meta": { ... },
  "links": { ... }
}
```

#### Acceptance Criteria

- [ ] Endpoint returns all sections defined above
- [ ] Wallet balance is accurate and real-time
- [ ] Limits show correct remaining amounts
- [ ] Spending policy reflects current configuration
- [ ] Recent transactions are ordered by date
- [ ] Available actions respect policy restrictions
- [ ] Handles agent not found with proper error

#### Test Expectations

- Test active agent shows correct available actions
- Test suspended agent shows limited actions
- Test limits calculation is accurate
- Test spending policy restrictions are reflected in actions
- Test agent with exhausted daily limit shows appropriate response

---

### Story 31.4: Batch Context Endpoint

**Points:** 3  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 31.1, 31.2

#### Description

Create `GET /v1/context/batch/{batch_id}` that returns comprehensive batch operation information including individual item statuses and aggregated results.

#### Requirements

1. **Batch Summary:**
   - Batch ID, name/description
   - Status (pending, processing, completed, partial, failed)
   - Created at, completed at
   - Initiator (user, agent, API key)
   - Total item count

2. **Aggregated Status:**
   - Count by status (pending, processing, completed, failed)
   - Total amount (by currency)
   - Total fees
   - Success rate percentage

3. **Simulation Results (if simulated):**
   - Was batch simulated?
   - Simulation ID
   - Predicted success count
   - Predicted failures
   - Variance from actual (if executed)

4. **Approval Status (if workflow):**
   - Requires approval?
   - Approval status
   - Approver(s)
   - Approval/rejection timestamp

5. **Individual Items:**
   - List of all items with summary info
   - Status per item
   - Error details for failed items
   - Links to individual transfers

6. **Failure Analysis:**
   - Count by error code
   - Most common failure reasons
   - Suggested remediation

#### Response Structure

```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch_123",
      "name": "December Payroll",
      "status": "partial",
      "created_at": "2025-12-30T10:00:00Z",
      "completed_at": "2025-12-30T10:15:00Z",
      "initiated_by": "user_789",
      "total_items": 500
    },
    "status_breakdown": {
      "completed": 495,
      "failed": 5,
      "pending": 0,
      "processing": 0
    },
    "totals": {
      "amount": { "USD": "125000.00" },
      "fees": { "USD": "2500.00" },
      "success_rate": 0.99
    },
    "simulation": {
      "was_simulated": true,
      "simulation_id": "sim_abc",
      "predicted_success": 498,
      "predicted_failures": 2,
      "variance": { "additional_failures": 3 }
    },
    "approval": {
      "required": true,
      "status": "approved",
      "approved_by": "user_456",
      "approved_at": "2025-12-30T09:55:00Z"
    },
    "items": [
      { "index": 0, "transfer_id": "txn_001", "status": "completed", "amount": "250.00" },
      { "index": 4, "transfer_id": null, "status": "failed", "error_code": "INVALID_PIX_KEY", "amount": "250.00" }
    ],
    "failure_analysis": {
      "by_error_code": {
        "INVALID_PIX_KEY": 3,
        "INSUFFICIENT_BALANCE": 2
      },
      "suggested_remediation": [
        { "error_code": "INVALID_PIX_KEY", "suggestion": "Verify PIX keys for rows 5, 23, 156" },
        { "error_code": "INSUFFICIENT_BALANCE", "suggestion": "Add $500 to source account and retry rows 201, 350" }
      ]
    },
    "available_actions": ["retry_failed", "download_report", "cancel_remaining"]
  },
  "meta": { ... },
  "links": { ... }
}
```

#### Acceptance Criteria

- [ ] Endpoint returns all sections defined above
- [ ] Status breakdown counts are accurate
- [ ] Simulation variance is calculated correctly
- [ ] Failure analysis groups errors helpfully
- [ ] Individual items include error details
- [ ] Available actions match batch status
- [ ] Handles batch not found with proper error
- [ ] Response handles large batches (1000+ items) efficiently

#### Test Expectations

- Test completed batch shows correct success rate
- Test partial batch shows failure analysis
- Test batch with simulation shows variance
- Test batch pending approval shows appropriate status
- Test large batch response time is acceptable (< 1s for 1000 items)

---

### Story 31.5: Context Caching Layer

**Points:** 2  
**Priority:** P2  
**Assignee:** Cursor  
**Dependencies:** 31.1, 31.2, 31.3, 31.4

#### Description

Implement a caching layer for context endpoints to improve response times and reduce database load. Some context data changes infrequently and can be cached.

#### Requirements

1. **Cacheable Data Identification:**
   - Identify which parts of context responses change frequently vs. infrequently
   - Examples of stable data: account name, KYB tier, payment methods
   - Examples of volatile data: balances, pending counts, limits used

2. **Caching Strategy:**
   - Determine TTL for different data types:
     - Account metadata: 5 minutes
     - 30-day activity stats: 1 hour
     - Balances: 30 seconds or no cache
   - Cache invalidation on relevant writes

3. **Implementation:**
   - Use Redis or in-memory cache
   - Cache key strategy (by account ID, etc.)
   - Partial cache hits (use cached metadata + fresh balances)

4. **Cache Headers:**
   - Include cache status in response headers
   - `X-Cache: HIT` or `X-Cache: MISS`
   - `X-Cache-Age: 45` (seconds since cached)

5. **Cache Bypass:**
   - Support `Cache-Control: no-cache` header to force fresh data
   - Support `?fresh=true` query parameter

#### Acceptance Criteria

- [ ] Frequently-accessed contexts are cached
- [ ] Cache TTLs are appropriate for data volatility
- [ ] Cache invalidation works on relevant writes
- [ ] Response headers indicate cache status
- [ ] Cache bypass works via header and query param
- [ ] Response time improves by 50%+ for cached hits
- [ ] No stale data issues for critical fields (balances)

#### Test Expectations

- Test cache hit returns faster than cache miss
- Test cache invalidation on account update
- Test cache bypass with no-cache header
- Test balances are always fresh (not cached or short TTL)
- Test 30-day stats use longer cache TTL

---

### Story 31.6: Context Viewer / Account 360 (UI)

**Points:** 5  
**Priority:** P1  
**Assignee:** Gemini  
**Dependencies:** 31.1, 31.2

#### Description

Create a rich "Account 360" view in the dashboard that displays the full context for an account in a single, comprehensive page.

#### Requirements

1. **Header Section:**
   - Account name and ID
   - Status badge (active, suspended, etc.)
   - KYB tier badge
   - Last updated timestamp with refresh button

2. **Balances Card:**
   - All currencies with available + pending
   - Total USD equivalent
   - Visual indicator for pending amounts

3. **Pending Items Card:**
   - Count badges for transfers, disputes, approvals
   - Click to expand and see urgent items
   - Link to full list for each type

4. **Limits Card:**
   - Visual progress bars for daily/monthly usage
   - Percentage and absolute amounts
   - Warning color when > 80% used

5. **Recent Activity Section:**
   - 30-day summary stats
   - Mini chart of volume over time
   - Link to full transaction history

6. **Payment Methods Card:**
   - List of methods with masked identifiers
   - Status indicators
   - Add new method button

7. **Compliance Card:**
   - Overall status with icon
   - Any active flags
   - Next review date
   - Required actions (if any)

8. **Available Actions Bar:**
   - Dynamic buttons based on API response
   - Primary action prominent
   - Disabled state with tooltip for unavailable actions

9. **Pending Items Detail:**
   - Expandable section
   - Shows 5 most urgent items
   - Click to navigate to detail

#### Acceptance Criteria

- [ ] Single page shows all account context
- [ ] Data fetched from `GET /v1/context/account/:id`
- [ ] Loading skeleton while fetching
- [ ] Error state if fetch fails
- [ ] Pending items clickable → navigate to detail
- [ ] Available actions render as buttons
- [ ] Responsive layout for mobile
- [ ] Refresh button fetches fresh data

---

## Story Summary

| Story | Points | Priority | Assignee | Status |
|-------|--------|----------|----------|--------|
| 31.1 | 5 | P0 | Cursor | Pending |
| 31.2 | 3 | P0 | Cursor | Pending |
| 31.3 | 3 | P1 | Cursor | Pending |
| 31.4 | 3 | P1 | Cursor | Pending |
| 31.5 | 2 | P2 | Cursor | Pending |
| 31.6 | 5 | P1 | **Gemini** | Pending |
| **Total** | **21** | | | **0/6 Complete** |

---

## Success Criteria

- [ ] All context endpoints return comprehensive data in single call
- [ ] Response time < 500ms for all context queries
- [ ] Includes all relevant related entities
- [ ] Available actions based on current state
- [ ] TypeScript types for all context responses
- [ ] Caching reduces load for repeated queries
- [ ] Account 360 UI displays full context in single view

---

## Related Documentation

- **Epic 30:** Structured Response System (context uses same format)
- **Epic 36:** SDK & Developer Experience (advertises context endpoints)
