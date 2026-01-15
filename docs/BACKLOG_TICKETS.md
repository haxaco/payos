# Backlog Tickets

**Created:** January 6, 2026  
**Source:** Epic 42 API Feedback (Gemini)

---

## Quick Fixes (P1 - This Sprint)

### TICKET-001: Expose Rate Limit Headers in API Client
**Priority:** P1  
**Effort:** 2 points  
**Status:** 📋 Open

**Problem:**  
The `@payos/api-client` package hides HTTP response headers, making it impossible to read rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) for UI indicators.

**Solution Options:**
1. Expose response metadata in API client methods
2. Create dedicated endpoint `GET /v1/meta/rate-limits`
3. Add optional `includeHeaders` flag to API client config

**Acceptance Criteria:**
- [ ] Frontend can read current rate limit status
- [ ] RateLimitCard component shows real data instead of mock

---

### TICKET-002: Sync API Client Types with Backend
**Priority:** P1  
**Effort:** 3 points  
**Status:** 📋 Open

**Problem:**  
Some API response types in `@payos/api-client` don't match actual API responses (nested `data` objects vs flat responses).

**Affected Areas:**
- Transfer list responses
- Wallet balance responses
- Compliance flag responses

**Solution:**
1. Audit all endpoint responses against types
2. Update `packages/api-client/src/types.ts`
3. Add runtime validation with Zod
4. Regenerate types from OpenAPI spec (if available)

**Acceptance Criteria:**
- [ ] All API client types match actual responses
- [ ] TypeScript builds without type errors in frontend
- [ ] Runtime validation catches mismatches

---

### TICKET-003: Standardize Date Formats Across APIs
**Priority:** P2  
**Effort:** 2 points  
**Status:** 📋 Open

**Problem:**  
Inconsistent date formats (ISO strings vs timestamps) causing frontend parsing issues.

**Affected Endpoints:**
- Mandate expiry dates
- Transfer timestamps
- Wallet creation dates

**Solution:**
- Standardize all dates to ISO 8601 strings (`2026-01-06T12:00:00.000Z`)
- Add Zod transforms for consistent parsing
- Update API documentation

**Acceptance Criteria:**
- [ ] All date fields return ISO 8601 strings
- [ ] Frontend date parsing works consistently
- [ ] API documentation updated

---

## Infrastructure Improvements (P2 - Next Sprint)

### TICKET-004: Aggregate Balance Endpoint
**Priority:** P2  
**Effort:** 3 points  
**Status:** 📋 Open

**Problem:**  
Dashboard "Total Balance" requires client-side aggregation across all accounts. This is inefficient and error-prone.

**Solution:**  
Implement `GET /v1/accounts/aggregate-balance`

```json
// Response
{
  "totalUsd": "125000.00",
  "byAccount": [
    { "accountId": "acc_xxx", "balance": "50000.00", "currency": "USD" },
    { "accountId": "acc_yyy", "balance": "75000.00", "currency": "USD" }
  ],
  "byCurrency": {
    "USD": "125000.00",
    "BRL": "0.00",
    "MXN": "0.00"
  }
}
```

**Acceptance Criteria:**
- [ ] Single API call returns aggregated balance
- [ ] Supports multi-currency conversion
- [ ] Dashboard uses new endpoint

---

### TICKET-005: User-Account Relationship Clarification
**Priority:** P2  
**Effort:** 2 points  
**Status:** 📋 Open

**Problem:**  
Unclear how Users relate to Accounts. Wallet creation requires `ownerAccountId` but frontend defaults to first account.

**Solution:**
- Document User → Account relationship in API docs
- Add `GET /v1/me/accounts` for user's linked accounts
- Update wallet creation flow to handle multiple accounts

**Acceptance Criteria:**
- [ ] Relationship documented
- [ ] New endpoint available
- [ ] Wallet creation UI updated

---

## Future Epics (Tracked Separately)

| Item | Epic | Priority |
|------|------|----------|
| WebSocket/SSE for real-time updates | Epic 45 (Real-time Infrastructure) | P0 |
| Virtual Debit Cards API | Epic 43 (Cards Infrastructure) | P1 |
| Wallet Deposit/Top-up | Epic 43.12 | P1 |

---

## Completed

| Ticket | Description | Completed |
|--------|-------------|-----------|
| — | — | — |


