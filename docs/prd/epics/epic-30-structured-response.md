# Epic 30: Structured Response System ✅

**Status:** ✅ COMPLETE (P0/P1 stories)  
**Phase:** AI-Native Foundation  
**Priority:** P0  
**Total Points:** 28  
**Stories:** 7/9 Complete (P2 story deferred)  
**Dependencies:** None  
**Enables:** All agent integrations, Epic 31, Epic 36

**Completed:** 2026-01-01

### Story Status:
- ✅ 30.1: Error Taxonomy (114 error codes)
- ✅ 30.2: Response Wrapper Middleware
- ✅ 30.3: Suggested Actions (context-aware)
- ✅ 30.4: Migrate Core Routes (transfers, accounts)
- ✅ 30.5: Migrate Remaining Core Routes (refunds, disputes, settlements)
- ✅ 30.6: Migrate Agent Routes (11 routes)
- ✅ 30.7: Add Retry Guidance (26 tests passing)
- ⏭️ 30.8: OpenAPI Spec Generation (P2 - deferred)
- ⏭️ 30.9: Deprecation Warnings (P2 - deferred)

[← Back to Epic List](./README.md)

---

## Overview

Transform all API responses to be machine-parseable with consistent structure, error codes, and suggested actions. This is foundational for AI agent integration.

**Why This Matters:**

AI agents need to programmatically handle errors and decide what to do next. Current API responses are inconsistent—some return `{ error: "message" }`, others return `{ message: "error" }`, and none provide actionable guidance. An agent receiving "Insufficient balance" doesn't know:
- What the required amount was
- What the current balance is
- What action to take next

This epic fixes that by standardizing every response.

---

## Target Response Structure

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "category": "balance",
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

All PayOS errors must be categorized. Here are the categories and example codes:

| Category | Example Codes | HTTP Status |
|----------|---------------|-------------|
| **Balance** | `INSUFFICIENT_BALANCE`, `HOLD_EXCEEDS_BALANCE`, `CURRENCY_MISMATCH` | 400 |
| **Validation** | `INVALID_AMOUNT`, `INVALID_CURRENCY`, `INVALID_ACCOUNT_ID`, `INVALID_PIX_KEY`, `INVALID_CLABE`, `MISSING_REQUIRED_FIELD` | 400, 422 |
| **Limits** | `DAILY_LIMIT_EXCEEDED`, `SINGLE_TRANSFER_LIMIT_EXCEEDED`, `AGENT_SPENDING_LIMIT_EXCEEDED`, `VELOCITY_LIMIT_EXCEEDED` | 400 |
| **Compliance** | `COMPLIANCE_HOLD`, `SANCTIONS_MATCH`, `KYC_REQUIRED`, `KYB_REQUIRED`, `RECIPIENT_NOT_VERIFIED` | 403 |
| **Technical** | `RATE_EXPIRED`, `QUOTE_EXPIRED`, `IDEMPOTENCY_CONFLICT`, `CONCURRENT_MODIFICATION`, `SERVICE_UNAVAILABLE`, `RATE_LIMITED` | 409, 429, 500, 503 |
| **Workflow** | `APPROVAL_REQUIRED`, `APPROVAL_PENDING`, `APPROVAL_REJECTED` | 400, 403 |
| **Auth** | `UNAUTHORIZED`, `FORBIDDEN`, `API_KEY_INVALID`, `API_KEY_EXPIRED`, `INSUFFICIENT_PERMISSIONS` | 401, 403 |
| **Resource** | `ACCOUNT_NOT_FOUND`, `TRANSFER_NOT_FOUND`, `AGENT_NOT_FOUND`, `WALLET_NOT_FOUND` | 404 |
| **State** | `ACCOUNT_INACTIVE`, `ACCOUNT_SUSPENDED`, `TRANSFER_ALREADY_COMPLETED`, `REFUND_NOT_ALLOWED` | 400, 409 |
| **Protocol** | `X402_PAYMENT_REQUIRED`, `X402_PAYMENT_INVALID`, `AP2_MANDATE_EXPIRED`, `ACP_CHECKOUT_INVALID` | 402, 400 |

The implementation should include **all error codes that can occur in PayOS** (expect 50+ codes minimum).

---

## Stories

### Story 30.1: Define Error Code Taxonomy and Response Schemas

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor

#### Description

Create the foundational type definitions for all PayOS error codes and API response structures. This is a types-only story—no middleware or route changes yet.

#### Requirements

1. **Error Code Enum:** Define all PayOS error codes as a TypeScript enum. Be exhaustive—include every error that could occur across all endpoints (transfers, accounts, agents, wallets, x402, AP2, ACP, refunds, disputes, etc.).

2. **Error Categories:** Map every error code to one of the 10 categories listed above.

3. **Error Metadata:** For each error code, define:
   - Default message (human-readable)
   - Description (longer explanation)
   - HTTP status code
   - Whether it's retryable
   - What action makes it retryable (if applicable)
   - What details fields are returned (schema)
   - Suggested resolution steps
   - Documentation URL pattern

4. **Response Types:** Define TypeScript interfaces for:
   - `ApiError` - the error object structure
   - `ApiErrorResponse` - full error response with request_id, timestamp
   - `ApiSuccessResponse<T>` - generic success response
   - `ApiPaginatedResponse<T>` - paginated list response
   - `SuggestedAction` - action the client can take

5. **Validation Schemas:** Create Zod schemas that validate these response structures.

6. **Helper Functions:** Create utilities like:
   - Get metadata for an error code
   - Get HTTP status for an error code
   - Check if an error is retryable
   - Get all errors in a category

#### Acceptance Criteria

- [ ] Error enum contains 50+ error codes covering all PayOS operations
- [ ] Every error code has complete metadata (no gaps)
- [ ] Every error code is mapped to exactly one category
- [ ] Response types are generic and reusable
- [ ] Zod schemas can validate both success and error responses
- [ ] All types are exported from `@payos/types` package
- [ ] Package builds without TypeScript errors
- [ ] Unit tests verify:
  - Every error code has metadata
  - Every error code has a category
  - HTTP status codes are valid (400-503 range)
  - Helper functions return correct values

#### Test Expectations

- Test that `Object.keys(ErrorCode).length >= 50`
- Test that every key in ErrorCode has a corresponding entry in metadata
- Test that `getErrorMetadata(ErrorCode.INSUFFICIENT_BALANCE)` returns correct data
- Test that Zod schemas reject malformed responses

---

### Story 30.2: Implement Response Wrapper Middleware

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 30.1

#### Description

Create Express middleware that automatically wraps all API responses in the standard structure. This should work transparently—existing route handlers shouldn't need to change their return values.

#### Requirements

1. **Success Wrapping:** When a route returns data, wrap it in:
   ```json
   { "success": true, "data": <returned_data>, "meta": {...} }
   ```

2. **Error Wrapping:** When an error is thrown or returned, wrap it in:
   ```json
   { "success": false, "error": {...}, "request_id": "...", "timestamp": "..." }
   ```

3. **Request ID Generation:** Generate unique request IDs for every request. Include in response and logs.

4. **Timing:** Track and include `processing_time_ms` in success responses.

5. **Error Transformation:** Convert various error types to structured errors:
   - Zod validation errors → `INVALID_*` codes with field details
   - Database errors → appropriate codes
   - Custom thrown errors → preserve error code if present
   - Unknown errors → `INTERNAL_ERROR` with safe message

6. **Backward Compatibility:** Existing routes should continue to work without modification.

#### Acceptance Criteria

- [ ] All API responses follow the standard structure
- [ ] Request IDs are unique and present on every response
- [ ] Processing time is accurate
- [ ] Zod validation errors include field-level details
- [ ] Unknown errors don't leak internal details
- [ ] Existing tests still pass
- [ ] New tests verify wrapper behavior

#### Test Expectations

- Test success response wrapping
- Test error response wrapping
- Test request ID uniqueness
- Test that Zod errors are transformed correctly
- Test that stack traces are not exposed in production

---

### Story 30.3: Add Suggested Actions to Error Responses

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 30.2

#### Description

Enhance error responses with contextual suggested actions that tell clients (especially AI agents) what to do next.

#### Requirements

1. **Context-Aware Actions:** Suggested actions should include actual IDs and values from the failed request. For example, `INSUFFICIENT_BALANCE` should suggest:
   ```json
   {
     "action": "top_up_account",
     "endpoint": "/v1/accounts/acc_123/deposits",  // actual account ID
     "min_amount": "1500.00"  // actual shortfall
   }
   ```

2. **Action Types to Support:**
   - `top_up_account` - add funds
   - `reduce_amount` - try smaller amount
   - `wait_and_retry` - rate limited, try later
   - `refresh_quote` - quote expired
   - `complete_kyc` - verification needed
   - `contact_support` - manual intervention needed
   - `use_different_account` - try alternative
   - `check_recipient` - verify recipient details

3. **Multiple Actions:** Some errors should suggest multiple alternatives.

4. **Retry Guidance:** Include `retry.retry_after_seconds` when applicable (rate limits, temporary failures).

#### Acceptance Criteria

- [ ] Balance errors include top-up suggestion with actual shortfall
- [ ] Validation errors suggest correcting specific fields
- [ ] Rate limit errors include retry_after_seconds
- [ ] Quote expiry errors suggest refresh endpoint
- [ ] Compliance errors suggest KYC/KYB completion
- [ ] Actions include actual IDs from the request context
- [ ] Unit tests verify action generation for each error category

#### Test Expectations

- Test that INSUFFICIENT_BALANCE includes correct account ID and shortfall
- Test that RATE_LIMITED includes retry_after_seconds
- Test that INVALID_PIX_KEY suggests field correction

---

### Story 30.4: Migrate Core Routes to Structured Responses

**Points:** 8  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 30.2, 30.3

#### Description

Apply the response wrapper and error codes to the most critical API routes: transfers and accounts.

#### Routes to Migrate

**Transfers:**
- `POST /v1/transfers` - Create transfer
- `GET /v1/transfers` - List transfers
- `GET /v1/transfers/:id` - Get transfer
- `POST /v1/transfers/:id/cancel` - Cancel transfer

**Accounts:**
- `POST /v1/accounts` - Create account
- `GET /v1/accounts` - List accounts
- `GET /v1/accounts/:id` - Get account
- `PATCH /v1/accounts/:id` - Update account
- `GET /v1/accounts/:id/balances` - Get balances

#### Requirements

1. **Consistent Error Codes:** Each route should throw specific error codes (not generic messages).

2. **Appropriate Details:** Error details should include relevant context:
   - `INSUFFICIENT_BALANCE`: required_amount, available_amount, shortfall, currency
   - `INVALID_ACCOUNT_ID`: provided_id, expected_format
   - `TRANSFER_NOT_FOUND`: transfer_id

3. **Success Links:** Include relevant links in success responses:
   - Transfer creation → link to transfer, link to source account
   - Account creation → link to account, link to balances

4. **Next Actions:** Include next actions on success:
   - Transfer created → suggest checking status
   - Account created → suggest adding payment methods

#### Acceptance Criteria

- [ ] All listed routes return structured responses
- [ ] Error codes are specific (not generic 500s)
- [ ] Details include relevant context
- [ ] Links point to valid related resources
- [ ] Next actions are contextually appropriate
- [ ] Existing integration tests updated and passing
- [ ] API documentation reflects new response format

#### Test Expectations

- Test transfer creation success response structure
- Test transfer creation with insufficient balance returns correct error
- Test account not found returns 404 with ACCOUNT_NOT_FOUND code
- Test validation errors include field details

---

### Story 30.5: Migrate Remaining Core Routes

**Points:** 3  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 30.4

#### Description

Extend structured responses to refund, dispute, and settlement routes. These routes have unique error scenarios that need specific error codes and contextual details.

#### Routes to Migrate

**Refunds:**
- `POST /v1/refunds` - Create refund
- `GET /v1/refunds/:id` - Get refund status
- `GET /v1/refunds` - List refunds

**Disputes:**
- `POST /v1/disputes` - Create dispute
- `GET /v1/disputes/:id` - Get dispute
- `PATCH /v1/disputes/:id` - Update dispute (add evidence)
- `GET /v1/disputes` - List disputes

**Settlements:**
- `POST /v1/settlements` - Create settlement
- `GET /v1/settlements/:id` - Get settlement status
- `GET /v1/settlements` - List settlements

#### Requirements

1. **Refund-Specific Errors:**
   - `REFUND_NOT_ALLOWED` - Transfer not eligible (already refunded, too old, wrong status)
   - `REFUND_EXCEEDS_ORIGINAL` - Partial refund amount too high
   - `REFUND_WINDOW_EXPIRED` - Past refund deadline
   - Details should include: original_transfer_id, original_amount, refund_deadline, already_refunded_amount

2. **Dispute-Specific Errors:**
   - `DISPUTE_ALREADY_EXISTS` - Duplicate dispute
   - `DISPUTE_WINDOW_EXPIRED` - Past dispute deadline
   - `EVIDENCE_REQUIRED` - Missing required documentation
   - `DISPUTE_ALREADY_RESOLVED` - Can't modify closed dispute
   - Details should include: dispute_id, transfer_id, deadline, current_status

3. **Settlement-Specific Errors:**
   - `QUOTE_EXPIRED` - Settlement quote no longer valid
   - `RAIL_UNAVAILABLE` - Pix/SPEI temporarily down
   - `RECIPIENT_VALIDATION_FAILED` - PIX key or CLABE invalid
   - Details should include: quote_id, rail, expiry_time, recipient_details

4. **Success Response Enrichment:**
   - Refund success → link to original transfer, link to refund
   - Dispute success → link to dispute, next action (add evidence or wait)
   - Settlement success → link to settlement, estimated completion time

#### Acceptance Criteria

- [ ] All listed routes return structured responses
- [ ] Refund errors include original transfer context
- [ ] Dispute errors include case information and deadlines
- [ ] Settlement errors include quote/rail information
- [ ] Success responses include relevant links
- [ ] Each error type has appropriate suggested actions
- [ ] Integration tests cover refund/dispute/settlement error scenarios

#### Test Expectations

- Test refund on already-refunded transfer returns REFUND_NOT_ALLOWED
- Test dispute after window expires returns DISPUTE_WINDOW_EXPIRED
- Test settlement with expired quote returns QUOTE_EXPIRED with refresh suggestion
- Test successful refund includes link to original transfer

---

### Story 30.6: Migrate Agent and Wallet Routes

**Points:** 2  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 30.4

#### Description

Extend structured responses to agent and wallet management routes. These routes are critical for AI agent integrations and need clear error guidance.

#### Routes to Migrate

**Agents:**
- `POST /v1/agents` - Create agent
- `GET /v1/agents` - List agents
- `GET /v1/agents/:id` - Get agent
- `PATCH /v1/agents/:id` - Update agent
- `DELETE /v1/agents/:id` - Delete agent

**Wallets:**
- `GET /v1/agents/:id/wallet` - Get agent wallet
- `POST /v1/agents/:id/wallet/fund` - Fund agent wallet
- `POST /v1/agents/:id/wallet/withdraw` - Withdraw from wallet
- `GET /v1/agents/:id/wallet/transactions` - Wallet transaction history

#### Requirements

1. **Agent-Specific Errors:**
   - `AGENT_NOT_FOUND` - Agent doesn't exist
   - `AGENT_LIMIT_REACHED` - Max agents per account
   - `AGENT_NAME_TAKEN` - Duplicate agent name
   - `AGENT_SUSPENDED` - Agent is suspended
   - Details should include: agent_id, current_count, max_allowed

2. **Wallet-Specific Errors:**
   - `WALLET_NOT_FOUND` - Wallet doesn't exist
   - `AGENT_SPENDING_LIMIT_EXCEEDED` - Daily/monthly limit hit
   - `WALLET_INSUFFICIENT_BALANCE` - Not enough in wallet
   - `FUNDING_SOURCE_INSUFFICIENT` - Parent account can't fund
   - Details should include: wallet_id, current_balance, limit_amount, limit_period, limit_remaining

3. **Spending Limit Context:**
   - When spending limit is exceeded, include:
     - Which limit was hit (daily vs monthly)
     - Current spend amount
     - Limit amount
     - When limit resets
     - Suggested action: wait for reset or request limit increase

4. **Success Response Enrichment:**
   - Agent creation → link to agent, link to wallet, next action (fund wallet)
   - Wallet fund → link to wallet, new balance, remaining limits

#### Acceptance Criteria

- [ ] All listed routes return structured responses
- [ ] Agent limit errors include current count and max allowed
- [ ] Spending limit errors include limit type, amount, and reset time
- [ ] Wallet funding errors include source account balance
- [ ] Success responses include relevant links and next actions
- [ ] Tests cover agent and wallet error scenarios

#### Test Expectations

- Test agent creation when at limit returns AGENT_LIMIT_REACHED with count
- Test wallet payment exceeding daily limit returns correct error with reset time
- Test funding from insufficient source returns FUNDING_SOURCE_INSUFFICIENT
- Test successful agent creation includes wallet link and fund suggestion

---

### Story 30.7: Add Retry Guidance to All Retryable Errors

**Points:** 2  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 30.3

#### Description

Ensure all retryable errors include proper retry guidance.

#### Requirements

1. **Retry Object:** Every retryable error should include:
   ```json
   "retry": {
     "retryable": true,
     "retry_after_seconds": 60,
     "retry_after_action": "wait"
   }
   ```

2. **Specific Guidance:**
   - `RATE_LIMITED`: Include actual rate limit reset time
   - `SERVICE_UNAVAILABLE`: Suggest exponential backoff
   - `QUOTE_EXPIRED`: Suggest immediate retry with fresh quote
   - `INSUFFICIENT_BALANCE`: Suggest retry after top-up

3. **Non-Retryable Errors:** Explicitly mark as `retryable: false`

#### Acceptance Criteria

- [ ] All retryable errors include retry guidance
- [ ] Rate limits include actual reset time from headers
- [ ] Non-retryable errors explicitly say so
- [ ] SDK can use retry guidance for automatic retry logic

---

### Story 30.8: OpenAPI Spec Generation

**Points:** 3  
**Priority:** P2  
**Assignee:** Cursor  
**Dependencies:** 30.4

#### Description

Generate or update the OpenAPI specification to document the structured response format. This enables SDK generation, API documentation, and contract testing.

#### Requirements

1. **Response Schemas:** Define reusable schemas for:
   - `ApiSuccessResponse` - generic success wrapper
   - `ApiErrorResponse` - error wrapper with code, details, suggestions
   - `ApiPaginatedResponse` - paginated list wrapper
   - `SuggestedAction` - action object schema

2. **Error Code Documentation:**
   - List all possible error codes per endpoint
   - Include error code enum as a schema
   - Document which errors are retryable

3. **Response Examples:**
   - Success example for each endpoint
   - Error examples for common failure scenarios
   - Include realistic data in examples

4. **Generation Approach:**
   - Option A: Generate from TypeScript types using ts-to-openapi or similar
   - Option B: Generate from Zod schemas using zod-to-openapi
   - Option C: Manually maintain but validate against actual responses
   - Choose the approach that fits best with existing tooling

5. **Validation:**
   - Spec should be valid OpenAPI 3.0 or 3.1
   - Responses should validate against spec in tests

#### Acceptance Criteria

- [ ] OpenAPI spec includes structured response schemas
- [ ] Each endpoint documents possible error codes
- [ ] Examples show real response structures with realistic data
- [ ] Spec is valid (passes openapi-validator)
- [ ] At least one test validates actual response against spec
- [ ] Spec is accessible (served at /openapi.json or similar)

#### Test Expectations

- Test that spec is valid OpenAPI 3.x
- Test that at least one actual API response validates against spec
- Test that error response examples match actual error structure

---

### Story 30.9: Error Reference Page (UI)

**Points:** 2  
**Priority:** P1  
**Assignee:** Gemini  
**Dependencies:** 30.1

#### Description

Create a searchable error reference page in the dashboard where developers can look up error codes, understand their meaning, and see resolution steps.

#### Requirements

1. **Error List:** Display all error codes grouped by category
2. **Search:** Filter by code name or description
3. **Category Filter:** Filter by error category
4. **Error Details:** For each error show:
   - Code and category
   - Description
   - What details are returned
   - Resolution steps
   - Whether it's retryable
5. **Copy Button:** One-click copy of error code
6. **Link to Docs:** Deep link to documentation

#### Acceptance Criteria

- [ ] All error codes are displayed
- [ ] Search filters in real-time
- [ ] Category filter works
- [ ] Error details are complete and accurate
- [ ] Mobile responsive
- [ ] Loads error data from API or static JSON

---

## Story Summary

| Story | Points | Priority | Assignee | Status |
|-------|--------|----------|----------|--------|
| 30.1 | 3 | P0 | Cursor | Pending |
| 30.2 | 5 | P0 | Cursor | Pending |
| 30.3 | 5 | P0 | Cursor | Pending |
| 30.4 | 8 | P0 | Cursor | Pending |
| 30.5 | 3 | P1 | Cursor | Pending |
| 30.6 | 2 | P1 | Cursor | Pending |
| 30.7 | 2 | P1 | Cursor | Pending |
| 30.8 | 3 | P2 | Cursor | Pending |
| 30.9 | 2 | P1 | **Gemini** | Pending |
| **Total** | **28** | | | **0/9 Complete** |

---

## Success Criteria

- [ ] All API endpoints use consistent response structure
- [ ] All errors have machine-readable codes
- [ ] All errors include contextual suggested actions
- [ ] Retry guidance is present on all retryable errors
- [ ] TypeScript types exist for all responses
- [ ] OpenAPI spec documents the format
- [ ] Dashboard has error reference page

---

## Related Documentation

- **Epic 31:** Context API (uses structured responses)
- **Epic 36:** SDK & Developer Experience (exposes error codes via capabilities)
