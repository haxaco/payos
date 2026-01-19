# PayOS UCP Error Reference

This document lists all error codes returned by the PayOS UCP API.

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

With validation errors, additional details may be included:

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "amount": ["Amount must be greater than 0"]
    }
  }
}
```

## Token Errors

### TOKEN_NOT_FOUND
**HTTP Status:** 404

The provided token does not exist or belongs to a different tenant.

```json
{
  "error": {
    "code": "TOKEN_NOT_FOUND",
    "message": "Token not found"
  }
}
```

**Resolution:** Verify the token string is correct. Tokens are tenant-specific.

---

### TOKEN_EXPIRED
**HTTP Status:** 410

The token TTL (15 minutes) has been exceeded.

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Settlement token has expired"
  }
}
```

**Resolution:** Acquire a new token with `POST /v1/ucp/tokens`.

---

### TOKEN_USED
**HTTP Status:** 409

The token has already been used for a settlement.

```json
{
  "error": {
    "code": "TOKEN_USED",
    "message": "Settlement token has already been used"
  }
}
```

**Resolution:** Each token can only be used once. For retries, use the same `idempotency_key`.

---

## Validation Errors

### INVALID_REQUEST
**HTTP Status:** 400

Request body failed validation.

```json
{
  "error": "Invalid token request",
  "details": {
    "fieldErrors": {
      "amount": ["Expected number, received string"],
      "corridor": ["Invalid enum value"]
    }
  }
}
```

**Resolution:** Check the request body matches the API schema.

---

### INVALID_RECIPIENT
**HTTP Status:** 400

Recipient details failed validation.

```json
{
  "error": "SPEI recipient requires clabe and name"
}
```

**Common causes:**
- Missing required fields (pix_key, clabe, name)
- Invalid pix_key_type (must be: cpf, cnpj, email, phone, evp)
- Invalid CLABE format (must be exactly 18 digits)
- Recipient type doesn't match corridor

---

### AMOUNT_EXCEEDS_LIMIT
**HTTP Status:** 400

Settlement amount exceeds the maximum allowed.

```json
{
  "error": "Amount exceeds maximum limit of 100,000"
}
```

**Resolution:** Maximum single settlement is $100,000 USD. Split into multiple settlements.

---

### CORRIDOR_NOT_SUPPORTED
**HTTP Status:** 400

The requested corridor is not available.

```json
{
  "error": "Corridor USD->EUR via wire is not supported"
}
```

**Supported corridors:**
- USD/USDC → BRL (pix)
- USD/USDC → MXN (spei)

---

## Settlement Errors

### SETTLEMENT_NOT_FOUND
**HTTP Status:** 404

Settlement ID does not exist or belongs to a different tenant.

```json
{
  "error": "Settlement not found"
}
```

**Resolution:** Verify the settlement ID. Settlements are tenant-specific.

---

### SETTLEMENT_FAILED
**HTTP Status:** Returned in settlement object, not as HTTP error

Settlement execution failed.

```json
{
  "id": "...",
  "status": "failed",
  "failure_reason": "Recipient account not found",
  "failed_at": "2026-01-19T12:00:45Z"
}
```

**Common failure reasons:**
- Recipient account not found
- Recipient account closed
- Bank rejection
- Compliance check failed

---

## Authentication Errors

### UNAUTHORIZED
**HTTP Status:** 401

API key is missing or invalid.

```json
{
  "error": "Unauthorized"
}
```

**Resolution:** Include valid API key in `Authorization: Bearer pk_...` header.

---

### FORBIDDEN
**HTTP Status:** 403

API key doesn't have permission for this operation.

```json
{
  "error": "Forbidden"
}
```

**Resolution:** Check API key permissions in the dashboard.

---

## Rate Limiting

### RATE_LIMITED
**HTTP Status:** 429

Too many requests.

```json
{
  "error": "Rate limit exceeded"
}
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705665700
```

**Resolution:** Wait until `X-RateLimit-Reset` timestamp or implement exponential backoff.

---

## Webhook Errors

### INVALID_SIGNATURE
**HTTP Status:** 401

Webhook signature verification failed.

```json
{
  "error": "Invalid webhook signature"
}
```

**Common causes:**
- Wrong signing key
- Payload modified
- Timestamp too old (>5 minutes)

---

### INVALID_PAYLOAD
**HTTP Status:** 400

Webhook payload is not valid JSON.

```json
{
  "error": "Invalid JSON payload"
}
```

---

## Error Handling Best Practices

### 1. Implement Retry Logic

For transient errors (5xx, rate limits), implement exponential backoff:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 || error.status >= 500) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

### 2. Use Idempotency Keys

Always include idempotency keys for settlement requests:

```javascript
const settlement = await payos.ucp.settle({
  token: tokenValue,
  idempotency_key: `order_${orderId}_settlement`
});
```

### 3. Handle Token Expiration Gracefully

```javascript
async function settleWithRetry(orderAmount, recipient) {
  let token = await acquireToken(orderAmount, recipient);

  try {
    return await settle(token);
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      // Acquire new token and retry
      token = await acquireToken(orderAmount, recipient);
      return await settle(token);
    }
    throw error;
  }
}
```

### 4. Log Error Details

Always log the full error response for debugging:

```javascript
try {
  await payos.ucp.settle({ token });
} catch (error) {
  console.error('Settlement failed:', {
    code: error.code,
    message: error.message,
    details: error.details,
    requestId: error.requestId
  });
}
```

---

*Last updated: January 2026*
