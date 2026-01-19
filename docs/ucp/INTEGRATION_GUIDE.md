# PayOS UCP Integration Guide

This guide explains how to integrate PayOS as a UCP Payment Handler for LATAM settlement.

## Overview

PayOS is a **UCP Payment Handler** (`com.payos.latam_settlement`) that enables any UCP-enabled merchant or platform to settle payments to Brazil (Pix) and Mexico (SPEI).

### Supported Corridors

| Corridor | Source Currency | Destination | Rail | Settlement Time |
|----------|-----------------|-------------|------|-----------------|
| USD → BRL | USD, USDC | Brazil | Pix | < 1 minute |
| USD → MXN | USD, USDC | Mexico | SPEI | < 30 minutes |

## Quick Start

### 1. Get API Credentials

Sign up at [dashboard.payos.com](https://dashboard.payos.com) to get your API key.

```bash
# Test environment
PAYOS_API_KEY=pk_test_...

# Production environment
PAYOS_API_KEY=pk_live_...
```

### 2. Discover PayOS Capabilities

Fetch the PayOS UCP profile to verify available capabilities:

```bash
curl https://api.payos.com/.well-known/ucp
```

Response:
```json
{
  "ucp": {
    "version": "2026-01-11",
    "services": {
      "com.payos.settlement": {
        "version": "2026-01-11",
        "rest": {
          "schema": "https://api.payos.com/ucp/openapi.json",
          "endpoint": "https://api.payos.com/v1/ucp"
        }
      }
    }
  },
  "payment": {
    "handlers": [
      {
        "id": "payos_latam",
        "name": "com.payos.latam_settlement",
        "supported_currencies": ["USD", "USDC"],
        "corridors": [
          { "rail": "pix", "destination_currency": "BRL" },
          { "rail": "spei", "destination_currency": "MXN" }
        ]
      }
    ]
  }
}
```

### 3. Integration Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UCP Platform  │     │     Merchant    │     │     PayOS       │
│  (Google AI)    │     │   (Shopify)     │     │  (Settlement)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Create Checkout   │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. Checkout Response │                       │
         │  (includes PayOS      │                       │
         │   as handler option)  │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  3. Acquire Token     │                       │
         │───────────────────────────────────────────────>│
         │                       │                       │
         │  4. Token + Quote     │                       │
         │<───────────────────────────────────────────────│
         │                       │                       │
         │  5. Complete Checkout │                       │
         │  (with PayOS token)   │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │                       │  6. Settle with Token │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │  7. Settlement Status │
         │                       │<──────────────────────│
         │                       │                       │
         │  8. Order Confirmed   │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

## API Reference

### Get FX Quote

Get a real-time FX quote before acquiring a token.

```bash
POST /v1/ucp/quote
Authorization: Bearer pk_test_...
Content-Type: application/json

{
  "corridor": "pix",
  "amount": 100,
  "currency": "USD"
}
```

Response:
```json
{
  "from_amount": 100,
  "from_currency": "USD",
  "to_amount": 589.05,
  "to_currency": "BRL",
  "fx_rate": 5.95,
  "fees": 1.00,
  "expires_at": "2026-01-19T12:00:30Z"
}
```

### Acquire Settlement Token

Acquire a token that locks in the FX rate for 15 minutes.

```bash
POST /v1/ucp/tokens
Authorization: Bearer pk_test_...
Content-Type: application/json
UCP-Agent: YourPlatform/2026-01-11 (https://yourplatform.com/.well-known/ucp)

{
  "corridor": "pix",
  "amount": 100,
  "currency": "USD",
  "recipient": {
    "type": "pix",
    "pix_key": "maria@email.com",
    "pix_key_type": "email",
    "name": "Maria Silva"
  },
  "metadata": {
    "order_id": "order_12345",
    "merchant_id": "shop_abc"
  }
}
```

Response:
```json
{
  "token": "ucp_tok_abc123...",
  "settlement_id": "550e8400-e29b-41d4-a716-446655440000",
  "quote": {
    "from_amount": 100,
    "from_currency": "USD",
    "to_amount": 589.05,
    "to_currency": "BRL",
    "fx_rate": 5.95,
    "fees": 1.00
  },
  "expires_at": "2026-01-19T12:15:00Z",
  "created_at": "2026-01-19T12:00:00Z"
}
```

### Execute Settlement

Complete the settlement using the token.

```bash
POST /v1/ucp/settle
Authorization: Bearer pk_test_...
Content-Type: application/json

{
  "token": "ucp_tok_abc123...",
  "idempotency_key": "checkout_12345"
}
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "corridor": "pix",
  "amount": {
    "source": 100,
    "source_currency": "USD",
    "destination": 589.05,
    "destination_currency": "BRL",
    "fx_rate": 5.95,
    "fees": 1.00
  },
  "recipient": {
    "type": "pix",
    "pix_key": "maria@email.com",
    "pix_key_type": "email",
    "name": "Maria Silva"
  },
  "estimated_completion": "2026-01-19T12:01:00Z",
  "created_at": "2026-01-19T12:00:00Z"
}
```

### Check Settlement Status

Poll for settlement completion.

```bash
GET /v1/ucp/settlements/{settlement_id}
Authorization: Bearer pk_test_...
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "transfer_id": "tr_xyz789",
  "completed_at": "2026-01-19T12:00:45Z"
}
```

### Settlement Status Values

| Status | Description |
|--------|-------------|
| `pending` | Settlement created, awaiting processing |
| `processing` | Settlement being executed |
| `completed` | Funds delivered to recipient |
| `failed` | Settlement failed (see `failure_reason`) |

## Recipient Schemas

### Pix Recipient (Brazil)

```json
{
  "type": "pix",
  "pix_key": "12345678901",
  "pix_key_type": "cpf",
  "name": "Maria Silva",
  "tax_id": "12345678901"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"pix"` |
| `pix_key` | string | Yes | Pix key value |
| `pix_key_type` | enum | Yes | `cpf`, `cnpj`, `email`, `phone`, `evp` |
| `name` | string | Yes | Recipient name |
| `tax_id` | string | No | CPF or CNPJ number |

### SPEI Recipient (Mexico)

```json
{
  "type": "spei",
  "clabe": "012345678901234567",
  "name": "Juan Garcia",
  "rfc": "GAJR850101ABC"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"spei"` |
| `clabe` | string | Yes | 18-digit CLABE number |
| `name` | string | Yes | Recipient name |
| `rfc` | string | No | Mexican tax ID (RFC) |

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Settlement token has expired"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `INVALID_RECIPIENT` | 400 | Recipient validation failed |
| `AMOUNT_EXCEEDS_LIMIT` | 400 | Amount exceeds maximum (100,000) |
| `CORRIDOR_NOT_SUPPORTED` | 400 | Corridor not available |
| `TOKEN_NOT_FOUND` | 404 | Token does not exist |
| `TOKEN_EXPIRED` | 410 | Token TTL exceeded (15 min) |
| `TOKEN_USED` | 409 | Token already used for settlement |
| `SETTLEMENT_NOT_FOUND` | 404 | Settlement ID not found |

## Webhooks

Configure a webhook endpoint to receive settlement status updates:

### Webhook Events

| Event | Description |
|-------|-------------|
| `settlement.pending` | Settlement created |
| `settlement.processing` | Settlement being executed |
| `settlement.completed` | Settlement successful |
| `settlement.failed` | Settlement failed |

### Webhook Payload

```json
{
  "id": "evt_12345",
  "type": "settlement.completed",
  "created_at": "2026-01-19T12:00:45Z",
  "data": {
    "settlement_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "transfer_id": "tr_xyz789",
    "completed_at": "2026-01-19T12:00:45Z"
  }
}
```

### Signature Verification

Webhooks include a `UCP-Signature` header:

```
UCP-Signature: t=1705665645,v1=abc123...
```

Verify using HMAC-SHA256:
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const [timestamp, sig] = signature.split(',').map(p => p.split('=')[1]);
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

## Best Practices

### 1. Always Use Idempotency Keys

Include an `idempotency_key` in settlement requests to prevent duplicate settlements:

```json
{
  "token": "ucp_tok_...",
  "idempotency_key": "checkout_12345_attempt_1"
}
```

### 2. Handle Token Expiration

Tokens expire after 15 minutes. If a token expires, acquire a new one with fresh FX rates.

### 3. Poll for Completion

Pix settlements typically complete in under 1 minute. SPEI may take up to 30 minutes. Poll the status endpoint or configure webhooks.

### 4. Validate Recipients

Validate recipient details before acquiring tokens:
- Pix: Verify key type matches key format
- SPEI: Verify CLABE is exactly 18 digits

## Testing

### Sandbox Environment

Use the sandbox environment for testing:

```
Base URL: https://sandbox.api.payos.com
API Key: pk_test_...
```

### Test Recipients

| Corridor | Test Recipient |
|----------|---------------|
| Pix | `pix_key: "12345678901"`, `pix_key_type: "cpf"` |
| SPEI | `clabe: "012345678901234567"` |

### Test Scenarios

| Scenario | How to Trigger |
|----------|---------------|
| Successful settlement | Use valid test recipient |
| Token expired | Wait 15+ minutes before settling |
| Invalid recipient | Use invalid CLABE (wrong length) |

## Support

- Documentation: https://docs.payos.com/ucp
- API Status: https://status.payos.com
- Support: support@payos.com

---

*Last updated: January 2026*
*UCP Version: 2026-01-11*
