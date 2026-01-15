# Story 30.7: Add Retry Guidance to All Retryable Errors - COMPLETE ✅

**Story:** 30.7  
**Epic:** 30 - Structured Response System  
**Status:** ✅ COMPLETE  
**Points:** 2  
**Priority:** P1  
**Completed:** 2026-01-01

## Summary

Successfully implemented comprehensive retry guidance for all retryable errors in the PayOS API. The system now provides specific, context-aware retry instructions including:
- Retry timing (`retry_after_seconds`)
- Backoff strategies (exponential, fixed, linear)
- Maximum retry attempts
- Retry actions (what to do before retrying)

## Changes Made

### 1. Enhanced Response Wrapper Middleware (`apps/api/src/middleware/response-wrapper.ts`)

**Added comprehensive retry guidance logic:**
- ✅ **Rate Limiting & Throttling** - Fixed delays based on actual rate limit windows
- ✅ **Spending & Transaction Limits** - Calculate exact seconds until limit resets
- ✅ **Balance Errors** - Immediate retry (0 seconds) after top-up action
- ✅ **Quote & Timing Errors** - Immediate retry with fresh quote
- ✅ **Service Availability** - Exponential backoff with max retries
- ✅ **Idempotency & Concurrency** - Non-retryable or quick exponential backoff
- ✅ **Compliance & Workflow** - Delayed retry (1 hour) for human actions
- ✅ **AP2 & Mandate Errors** - Immediate retry after getting new mandate
- ✅ **Default Guidance** - Sensible defaults (5s, exponential, 3 retries)

**Key Features:**
```typescript
// Ensure retry object exists for all errors
if (!apiError.retry) {
  apiError.retry = {
    retryable: metadata.retryable,
    retry_after_action: metadata.retryAfterAction,
  };
}

// Add specific guidance based on error type
switch (errorCode) {
  case ErrorCode.RATE_LIMITED:
    apiError.retry.retry_after_seconds = details?.retry_after_seconds || 60;
    apiError.retry.backoff_strategy = 'fixed';
    break;
    
  case ErrorCode.DAILY_LIMIT_EXCEEDED:
    // Calculate seconds until midnight UTC
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    apiError.retry.retry_after_seconds = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
    break;
    
  case ErrorCode.INSUFFICIENT_BALANCE:
    apiError.retry.retry_after_seconds = 0; // Retry immediately after top-up
    break;
    
  // ... 15+ more specific cases
}
```

### 2. Created Comprehensive Test Suite (`apps/api/tests/unit/middleware/retry-guidance.test.ts`)

**26 Tests Covering:**

#### Rate Limiting & Throttling (4 tests)
- ✅ RATE_LIMITED with explicit retry_after_seconds
- ✅ RATE_LIMITED with default 60s fallback
- ✅ VELOCITY_LIMIT_EXCEEDED with exponential backoff
- ✅ CONCURRENT_REQUEST_LIMIT with window-based retry

#### Spending & Transaction Limits (3 tests)
- ✅ DAILY_LIMIT_EXCEEDED with calculated reset time
- ✅ MONTHLY_LIMIT_EXCEEDED with reset time
- ✅ AGENT_SPENDING_LIMIT_EXCEEDED with limit details

#### Balance Errors (3 tests)
- ✅ INSUFFICIENT_BALANCE - immediate retry after top-up
- ✅ HOLD_EXCEEDS_BALANCE - immediate retry after funding
- ✅ NEGATIVE_BALANCE_NOT_ALLOWED - immediate retry after deposit

#### Quote & Timing Errors (2 tests)
- ✅ QUOTE_EXPIRED - immediate retry with fresh quote
- ✅ RATE_EXPIRED - immediate retry

#### Service Availability (3 tests)
- ✅ SERVICE_UNAVAILABLE - 30s exponential backoff, max 5 retries
- ✅ RAIL_UNAVAILABLE - 30s exponential backoff
- ✅ TIMEOUT - 10s exponential backoff, max 3 retries

#### Idempotency & Concurrency (2 tests)
- ✅ IDEMPOTENCY_CONFLICT - non-retryable, suggests retrieval
- ✅ CONCURRENT_MODIFICATION - 1s exponential backoff

#### Compliance & Workflow (3 tests)
- ✅ COMPLIANCE_HOLD - 1 hour delay
- ✅ APPROVAL_REQUIRED - 1 hour delay
- ✅ APPROVAL_PENDING - 1 hour delay

#### AP2 & Mandate Errors (1 test)
- ✅ AP2_MANDATE_EXPIRED - immediate retry after renewal

#### Non-Retryable Errors (4 tests)
- ✅ INVALID_REQUEST_FORMAT - explicitly non-retryable
- ✅ ACCOUNT_NOT_FOUND - explicitly non-retryable
- ✅ INVALID_AMOUNT - explicitly non-retryable
- ✅ CURRENCY_MISMATCH - explicitly non-retryable

#### Default Guidance (1 test)
- ✅ Generic retryable errors - 5s exponential, max 3 retries

### 3. Fixed Error Code Detection

**Enhanced error transformation logic:**
```typescript
// Check for explicit ErrorCode first (before Supabase errors)
if ('code' in err && Object.values(ErrorCode).includes((err as any).code)) {
  errorCode = (err as any).code;
  details = (err as any).details || {};
  const metadata = getErrorMetadata(errorCode);
  httpStatus = metadata.httpStatus;
}
```

## Example Retry Guidance Responses

### Rate Limited Error
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many API requests",
    "retry": {
      "retryable": true,
      "retry_after_seconds": 120,
      "backoff_strategy": "fixed",
      "retry_after_action": "wait"
    }
  }
}
```

### Daily Limit Exceeded
```json
{
  "success": false,
  "error": {
    "code": "DAILY_LIMIT_EXCEEDED",
    "message": "Daily transfer limit exceeded",
    "details": {
      "daily_limit": 1000,
      "current_usage": 1000,
      "resets_at": "2026-01-02T00:00:00Z"
    },
    "retry": {
      "retryable": true,
      "retry_after_seconds": 43200,
      "backoff_strategy": "fixed",
      "retry_after_action": "wait_for_reset"
    }
  }
}
```

### Insufficient Balance
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance",
    "details": {
      "required_amount": "100.00",
      "available_amount": "50.00",
      "shortfall": "50.00"
    },
    "retry": {
      "retryable": true,
      "retry_after_seconds": 0,
      "backoff_strategy": "fixed",
      "retry_after_action": "top_up_account"
    },
    "suggested_actions": [
      {
        "action": "top_up_account",
        "description": "Add funds to the source account",
        "endpoint": "/v1/accounts/acc_123/deposits",
        "method": "POST",
        "min_amount": "50.00"
      }
    ]
  }
}
```

### Service Unavailable
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "retry": {
      "retryable": true,
      "retry_after_seconds": 30,
      "backoff_strategy": "exponential",
      "max_retries": 5
    }
  }
}
```

### Non-Retryable Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Invalid amount",
    "retry": {
      "retryable": false
    }
  }
}
```

## Test Results

```
✓ tests/unit/middleware/retry-guidance.test.ts (26 tests) 42ms
  ✓ Rate Limiting & Throttling (4)
  ✓ Spending & Transaction Limits (3)
  ✓ Balance Errors (3)
  ✓ Quote & Timing Errors (2)
  ✓ Service Availability (3)
  ✓ Idempotency & Concurrency (2)
  ✓ Compliance & Workflow (3)
  ✓ AP2 & Mandate Errors (1)
  ✓ Non-Retryable Errors (4)
  ✓ Default Retry Guidance (1)
```

## Benefits for AI Agents

1. **Automatic Retry Logic**: Agents can implement exponential backoff automatically
2. **Smart Timing**: Know exactly when to retry (seconds until limit resets)
3. **Action Guidance**: Understand what action is needed before retry
4. **Backoff Strategy**: Choose appropriate backoff (exponential vs fixed)
5. **Max Retries**: Avoid infinite retry loops
6. **Non-Retryable Detection**: Don't waste time retrying validation errors

## SDK Integration Ready

The retry guidance is designed for SDK consumption:

```typescript
// Example SDK retry logic
async function retryableRequest(fn: () => Promise<Response>) {
  let attempt = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const retry = error.response?.error?.retry;
      
      if (!retry?.retryable || attempt >= (retry.max_retries || 3)) {
        throw error;
      }
      
      const delay = calculateBackoff(
        retry.retry_after_seconds,
        retry.backoff_strategy,
        attempt
      );
      
      await sleep(delay * 1000);
      attempt++;
    }
  }
}
```

## Acceptance Criteria

- [x] All retryable errors include retry guidance
- [x] Rate limits include actual reset time from headers/details
- [x] Non-retryable errors explicitly marked as `retryable: false`
- [x] SDK can use retry guidance for automatic retry logic
- [x] Specific guidance for different error types:
  - [x] RATE_LIMITED includes actual rate limit reset time
  - [x] SERVICE_UNAVAILABLE suggests exponential backoff
  - [x] QUOTE_EXPIRED suggests immediate retry with fresh quote
  - [x] INSUFFICIENT_BALANCE suggests retry after top-up
- [x] Comprehensive test coverage (26 tests)

## Files Modified

1. **`apps/api/src/middleware/response-wrapper.ts`**
   - Added comprehensive retry guidance switch statement
   - Enhanced error code detection
   - Ensured retry object exists for all errors

2. **`apps/api/tests/unit/middleware/retry-guidance.test.ts`** (NEW)
   - 26 comprehensive tests
   - Covers all retry scenarios
   - Tests both retryable and non-retryable errors

## Next Steps

**Story 30.6:** Migrate Agent and Wallet Routes (documented plan ready)
- Then proceed to **Epic 31: Context API**

---

**Status:** ✅ **COMPLETE**  
**All Tests Passing:** 26/26  
**Ready for Production:** Yes



