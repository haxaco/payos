# Story 30.5: Migrate Remaining Core Routes - COMPLETE ✅

**Story:** 30.5  
**Epic:** 30 - Structured Response System  
**Completed:** 2026-01-01  
**Points:** 3  
**Priority:** P1

## Summary

Successfully migrated refund, dispute, and settlement routes to use the new structured response system. All routes now return consistent, machine-parseable responses with specific error codes, rich contextual details, links to related resources, and contextual next_actions for AI agent guidance.

## Changes Made

### 1. Refunds Routes (`/apps/api/src/routes/refunds.ts`)

#### Updated Routes:
- **GET /v1/refunds** - List refunds
- **POST /v1/refunds** - Create refund
- **GET /v1/refunds/:id** - Get single refund

#### Key Improvements:

**Refund-Specific Error Codes:**
- ✅ `REFUND_WINDOW_EXPIRED` - Refund requested outside allowed time window
  - Details: transfer_id, completed_at, days_since_transfer, window_days, expired_on
  - Helps agents understand when refunds are no longer possible

- ✅ `REFUND_EXCEEDS_ORIGINAL` - Refund amount exceeds remaining refundable amount
  - Details: transfer_id, original_amount, already_refunded, requested_amount, remaining_refundable, currency
  - Supports partial refunds with clear remaining amount tracking

- ✅ `INSUFFICIENT_BALANCE` - Source account lacks funds for refund
  - Details: account_id, required_amount, available_amount, shortfall, currency
  - Prevents refunds when recipient account can't cover the reversal

**Example Refund Window Error:**
```json
{
  "success": false,
  "error": {
    "code": "REFUND_WINDOW_EXPIRED",
    "category": "workflow",
    "message": "Refund window expired (90 days)",
    "details": {
      "transfer_id": "txn_abc123",
      "completed_at": "2025-09-01T10:00:00Z",
      "days_since_transfer": 95,
      "window_days": 90,
      "expired_on": "2025-11-30T10:00:00Z"
    },
    "suggested_actions": [
      {
        "action": "contact_support",
        "description": "Request manual refund review for expired transfer",
        "endpoint": "/v1/support/tickets"
      }
    ]
  }
}
```

**Example Refund Exceeds Original Error:**
```json
{
  "success": false,
  "error": {
    "code": "REFUND_EXCEEDS_ORIGINAL",
    "category": "validation",
    "message": "Refund amount exceeds remaining refundable amount",
    "details": {
      "transfer_id": "txn_abc123",
      "original_amount": "1000.00",
      "already_refunded": "600.00",
      "requested_amount": "500.00",
      "remaining_refundable": "400.00",
      "currency": "USD"
    },
    "suggested_actions": [
      {
        "action": "reduce_amount",
        "description": "Request refund for remaining refundable amount",
        "max_amount": "400.00"
      }
    ]
  }
}
```

**Success Response Enhancement:**
```typescript
// POST /v1/refunds - Create refund
{
  data: refund,
  links: {
    self: `/v1/refunds/${refund.id}`,
    original_transfer: `/v1/transfers/${originalTransferId}`,
    from_account: `/v1/accounts/${refund.from_account_id}`,
    to_account: `/v1/accounts/${refund.to_account_id}`,
  },
  next_actions: [
    {
      action: 'view_original_transfer',
      description: 'View the original transfer that was refunded',
      endpoint: `/v1/transfers/${originalTransferId}`,
    },
    {
      action: 'check_balance',
      description: 'Check updated account balance',
      endpoint: `/v1/accounts/${toAccountId}/balances`,
    },
  ]
}
```

```typescript
// GET /v1/refunds/:id - Get refund
{
  data: refund,
  links: {
    self: `/v1/refunds/${refundId}`,
    original_transfer: `/v1/transfers/${refund.original_transfer_id}`,
    from_account: `/v1/accounts/${refund.from_account_id}`,
    to_account: `/v1/accounts/${refund.to_account_id}`,
  }
}
```

### 2. Disputes Routes (`/apps/api/src/routes/disputes.ts`)

#### Updated Routes:
- **GET /v1/disputes** - List disputes
- **POST /v1/disputes** - Create dispute
- **GET /v1/disputes/:id** - Get single dispute (already in place)
- **PATCH /v1/disputes/:id** - Update dispute (already in place)

#### Key Improvements:

**Dispute-Specific Error Codes:**
- ✅ `TRANSFER_NOT_COMPLETED` - Only completed transfers can be disputed
  - Details: transfer_id, current_status, required_status
  - Prevents disputes on pending/failed transfers

- ✅ `DISPUTE_WINDOW_EXPIRED` - Dispute filed outside allowed time window
  - Details: transfer_id, completed_at, days_since_transfer, filing_window_days, expired_on
  - Enforces dispute filing deadlines

- ✅ `DISPUTE_ALREADY_EXISTS` - Duplicate dispute for same transfer
  - Details: transfer_id, existing_dispute_id, dispute_status, due_date
  - Prevents multiple concurrent disputes

- ✅ Enhanced validation errors for disputed amount exceeding transfer amount
  - Details: transfer_id, transfer_amount, disputed_amount, currency

**Example Dispute Window Expired Error:**
```json
{
  "success": false,
  "error": {
    "code": "DISPUTE_WINDOW_EXPIRED",
    "category": "workflow",
    "message": "Dispute filing window expired",
    "details": {
      "transfer_id": "txn_abc123",
      "completed_at": "2025-05-01T10:00:00Z",
      "days_since_transfer": 125,
      "filing_window_days": 120,
      "expired_on": "2025-08-29T10:00:00Z"
    },
    "suggested_actions": [
      {
        "action": "contact_support",
        "description": "Request manual dispute review for expired case",
        "endpoint": "/v1/support/tickets"
      }
    ]
  }
}
```

**Example Dispute Already Exists Error:**
```json
{
  "success": false,
  "error": {
    "code": "DISPUTE_ALREADY_EXISTS",
    "category": "state",
    "message": "An open dispute already exists for this transfer",
    "details": {
      "transfer_id": "txn_abc123",
      "existing_dispute_id": "dsp_xyz789",
      "dispute_status": "under_review",
      "due_date": "2026-02-01T10:00:00Z"
    },
    "suggested_actions": [
      {
        "action": "view_existing_dispute",
        "description": "View and update the existing dispute",
        "endpoint": "/v1/disputes/dsp_xyz789"
      },
      {
        "action": "add_evidence",
        "description": "Add evidence to existing dispute",
        "endpoint": "/v1/disputes/dsp_xyz789/evidence",
        "method": "POST"
      }
    ]
  }
}
```

**Success Response Enhancement:**
```typescript
// POST /v1/disputes - Create dispute
{
  data: {
    id: dispute.id,
    transferId: dispute.transfer_id,
    status: dispute.status,
    reason: dispute.reason,
    description: dispute.description,
    claimant: { accountId, accountName },
    respondent: { accountId, accountName },
    amountDisputed: parseFloat(dispute.amount_disputed),
    requestedResolution: dispute.requested_resolution,
    requestedAmount: dispute.requested_amount,
    dueDate: dispute.due_date,
    createdAt: dispute.created_at,
  },
  links: {
    self: `/v1/disputes/${dispute.id}`,
    transfer: `/v1/transfers/${transferId}`,
    claimant_account: `/v1/accounts/${dispute.claimant_account_id}`,
    respondent_account: `/v1/accounts/${dispute.respondent_account_id}`,
  },
  next_actions: [
    {
      action: 'add_evidence',
      description: 'Add supporting evidence to strengthen your case',
      endpoint: `/v1/disputes/${dispute.id}/evidence`,
      method: 'POST',
    },
    {
      action: 'check_status',
      description: 'Monitor dispute resolution progress',
      endpoint: `/v1/disputes/${dispute.id}`,
      due_date: dispute.due_date,
    },
  ]
}
```

### 3. Settlement Routes (`/apps/api/src/routes/settlement.ts`)

#### Updated Routes:
- **POST /v1/settlement/route** - Get routing decision
- **POST /v1/settlement/execute** - Execute settlement
- **POST /v1/settlement/batch** - Batch settlement

#### Key Improvements:

**Settlement-Specific Error Handling:**
- ✅ Replaced generic error returns with thrown errors
- ✅ Existing Zod validation already provides structured errors
- ✅ Settlement failure responses already include rail information

**Note:** Settlement routes already had good error handling with `retryable` flags and rail selection metadata. The main improvement was consistency with error throwing vs. returning errors.

## Error Codes Summary

### New Error Codes Added (from Story 30.1):
1. **REFUND_WINDOW_EXPIRED** - Refund requested too late
2. **REFUND_EXCEEDS_ORIGINAL** - Partial refund amount validation
3. **DISPUTE_WINDOW_EXPIRED** - Dispute filing deadline passed
4. **DISPUTE_ALREADY_EXISTS** - Duplicate dispute prevention
5. **TRANSFER_NOT_COMPLETED** - Dispute on incomplete transfer

### Existing Error Codes Used:
- **INSUFFICIENT_BALANCE** - For refund source account checks
- **RESOURCE_NOT_FOUND** - For missing transfers/refunds/disputes
- **VALIDATION_ERROR** - For general validation failures
- **INTERNAL_ERROR** - For database errors (middleware transformation)

## Acceptance Criteria

- ✅ All listed routes return structured responses
- ✅ Refund errors include original transfer context and remaining amounts
- ✅ Dispute errors include case information, deadlines, and existing dispute details
- ✅ Settlement errors include quote/rail information (already present)
- ✅ Success responses include relevant links to transfers, accounts
- ✅ Each error type has appropriate suggested actions
- ✅ All generic error returns converted to thrown errors

## Example Scenarios

### Scenario 1: Successful Refund Creation
**Request:**
```json
POST /v1/refunds
{
  "originalTransferId": "txn_abc123",
  "amount": 50.00,
  "reason": "customer_request",
  "reasonDetails": "Customer changed their mind"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ref_xyz789",
    "original_transfer_id": "txn_abc123",
    "amount": 50.00,
    "currency": "USD",
    "reason": "customer_request",
    "status": "completed",
    "completed_at": "2026-01-01T12:00:00Z"
  },
  "meta": {
    "request_id": "req_123",
    "timestamp": "2026-01-01T12:00:00Z",
    "processing_time_ms": 250
  },
  "links": {
    "self": "/v1/refunds/ref_xyz789",
    "original_transfer": "/v1/transfers/txn_abc123",
    "from_account": "/v1/accounts/acc_456",
    "to_account": "/v1/accounts/acc_789"
  },
  "next_actions": [
    {
      "action": "view_original_transfer",
      "description": "View the original transfer that was refunded",
      "endpoint": "/v1/transfers/txn_abc123"
    },
    {
      "action": "check_balance",
      "description": "Check updated account balance",
      "endpoint": "/v1/accounts/acc_789/balances"
    }
  ]
}
```

### Scenario 2: Dispute Window Expired
**Request:**
```json
POST /v1/disputes
{
  "transferId": "txn_old123",
  "reason": "service_not_received",
  "description": "Goods never arrived"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "DISPUTE_WINDOW_EXPIRED",
    "category": "workflow",
    "message": "Dispute filing window expired",
    "details": {
      "transfer_id": "txn_old123",
      "completed_at": "2025-05-01T10:00:00Z",
      "days_since_transfer": 245,
      "filing_window_days": 120,
      "expired_on": "2025-08-29T10:00:00Z"
    },
    "suggested_actions": [
      {
        "action": "contact_support",
        "description": "Request manual dispute review for expired case",
        "endpoint": "/v1/support/tickets"
      }
    ],
    "retry": {
      "retryable": false
    },
    "documentation_url": "https://docs.payos.com/errors/DISPUTE_WINDOW_EXPIRED"
  },
  "request_id": "req_xyz",
  "timestamp": "2026-01-01T12:00:00Z"
}
```

### Scenario 3: Partial Refund Exceeds Remaining
**Request:**
```json
POST /v1/refunds
{
  "originalTransferId": "txn_abc123",
  "amount": 500.00,
  "reason": "error"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "REFUND_EXCEEDS_ORIGINAL",
    "category": "validation",
    "message": "Refund amount exceeds remaining refundable amount",
    "details": {
      "transfer_id": "txn_abc123",
      "original_amount": "1000.00",
      "already_refunded": "600.00",
      "requested_amount": "500.00",
      "remaining_refundable": "400.00",
      "currency": "USD"
    },
    "suggested_actions": [
      {
        "action": "reduce_amount",
        "description": "Request refund for remaining refundable amount",
        "max_amount": "400.00"
      },
      {
        "action": "check_refund_history",
        "description": "View all refunds for this transfer",
        "endpoint": "/v1/refunds?originalTransferId=txn_abc123"
      }
    ],
    "retry": {
      "retryable": true,
      "after_action": "reduce_amount"
    },
    "documentation_url": "https://docs.payos.com/errors/REFUND_EXCEEDS_ORIGINAL"
  },
  "request_id": "req_xyz",
  "timestamp": "2026-01-01T12:00:00Z"
}
```

## Dependencies

**Built On:**
- ✅ Story 30.1 - Error Code Taxonomy (includes refund/dispute error codes)
- ✅ Story 30.2 - Response Wrapper Middleware
- ✅ Story 30.3 - Suggested Actions
- ✅ Story 30.4 - Migrate Core Routes (transfers, accounts)

**Enables:**
- 🔄 Story 30.6 - Migrate Agent and Wallet Routes
- 🔄 Story 30.7 - Add Retry Guidance
- 🔄 Story 31.x - Context API (will use structured responses)

## Impact

### For AI Agents:
- ✅ Can understand why refunds are rejected (window expired, insufficient funds, exceeds original)
- ✅ Know which disputes already exist for a transfer
- ✅ Understand dispute filing deadlines and requirements
- ✅ Get actionable guidance (reduce amount, add evidence, contact support)
- ✅ Navigate to related resources (original transfer, accounts, existing disputes)

### For Developers:
- ✅ Consistent error handling across refunds, disputes, and settlements
- ✅ Rich contextual information for debugging
- ✅ Clear API navigation with links

### For Customer Support:
- ✅ Error responses include all context needed to help users
- ✅ Suggested actions guide users to resolution
- ✅ Clear rules for refund/dispute eligibility

## Files Modified

1. **`/apps/api/src/routes/refunds.ts`**
   - Added specific error codes: REFUND_WINDOW_EXPIRED, REFUND_EXCEEDS_ORIGINAL
   - Enhanced error details with amounts, dates, windows
   - Added links (self, original_transfer, accounts)
   - Added next_actions (view_original_transfer, check_balance)
   - Replaced generic error returns with thrown errors

2. **`/apps/api/src/routes/disputes.ts`**
   - Added specific error codes: DISPUTE_WINDOW_EXPIRED, DISPUTE_ALREADY_EXISTS, TRANSFER_NOT_COMPLETED
   - Enhanced error details with dispute context, deadlines, existing dispute info
   - Added links (self, transfer, claimant_account, respondent_account)
   - Added next_actions (add_evidence, check_status)
   - Replaced generic error returns with thrown errors

3. **`/apps/api/src/routes/settlement.ts`**
   - Replaced remaining generic error returns with thrown errors
   - Already had good error handling with rail metadata

## Testing

### Integration Tests Status:
- ⏭️ Existing integration tests will be updated in Story 30.6/30.7 when all routes are migrated
- ⏭️ Full E2E testing will validate structured responses for refund/dispute workflows

### Manual Testing Verification:
```bash
# Test refund window expired
curl -X POST http://localhost:4000/v1/refunds \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "originalTransferId": "old_transfer_id",
    "reason": "error"
  }'
# Should return REFUND_WINDOW_EXPIRED with dates

# Test partial refund exceeds remaining
curl -X POST http://localhost:4000/v1/refunds \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "originalTransferId": "partially_refunded_id",
    "amount": 9999,
    "reason": "error"
  }'
# Should return REFUND_EXCEEDS_ORIGINAL with amounts

# Test dispute already exists
curl -X POST http://localhost:4000/v1/disputes \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "transferId": "disputed_transfer_id",
    "reason": "unauthorized",
    "description": "Fraudulent charge"
  }'
# Should return DISPUTE_ALREADY_EXISTS with existing dispute ID
```

## Breaking Changes

⚠️ **Response Format Change:** Same as Story 30.4 - all responses now wrapped in structured format.

## Next Steps

1. **Story 30.6** - Migrate agent and wallet routes
2. **Story 30.7** - Add comprehensive retry guidance
3. **Story 30.8** - Generate OpenAPI spec
4. **Update integration tests** - Update remaining tests for new response format

## Notes

- Refund-specific error codes provide clear guidance on partial refund scenarios
- Dispute error codes enforce filing windows and prevent duplicate cases
- Settlement routes already had good error structures with rail metadata
- All error responses include suggested actions for agent recovery
- Links provide easy navigation to related resources

---

**Status:** ✅ COMPLETE  
**Next Story:** 30.6 - Migrate Agent and Wallet Routes



