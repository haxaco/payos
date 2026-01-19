# PayOS LATAM Settlement Handler Specification

**Handler ID:** `payos_latam`
**Handler Name:** `com.payos.latam_settlement`
**Version:** `2026-01-11`
**Spec URL:** https://docs.payos.com/ucp/handlers/latam

## Overview

The PayOS LATAM Settlement Handler enables UCP-enabled merchants and platforms to settle payments to recipients in Brazil (via Pix) and Mexico (via SPEI) using USD or USDC.

## Handler Definition

```json
{
  "id": "payos_latam",
  "name": "com.payos.latam_settlement",
  "version": "2026-01-11",
  "spec": "https://docs.payos.com/ucp/handlers/latam",
  "config_schema": "https://api.payos.com/ucp/schemas/handler_config.json",
  "instrument_schemas": [
    "https://api.payos.com/ucp/schemas/pix_instrument.json",
    "https://api.payos.com/ucp/schemas/spei_instrument.json"
  ],
  "supported_currencies": ["USD", "USDC"],
  "corridors": [
    {
      "id": "usd-brl-pix",
      "source_currency": "USD",
      "destination_currency": "BRL",
      "destination_country": "BR",
      "rail": "pix",
      "estimated_settlement": "< 1 minute"
    },
    {
      "id": "usdc-brl-pix",
      "source_currency": "USDC",
      "destination_currency": "BRL",
      "destination_country": "BR",
      "rail": "pix",
      "estimated_settlement": "< 1 minute"
    },
    {
      "id": "usd-mxn-spei",
      "source_currency": "USD",
      "destination_currency": "MXN",
      "destination_country": "MX",
      "rail": "spei",
      "estimated_settlement": "< 30 minutes"
    },
    {
      "id": "usdc-mxn-spei",
      "source_currency": "USDC",
      "destination_currency": "MXN",
      "destination_country": "MX",
      "rail": "spei",
      "estimated_settlement": "< 30 minutes"
    }
  ]
}
```

## Configuration Schema

Merchants configure the PayOS handler with their API key and settlement preferences.

**Schema URL:** https://api.payos.com/ucp/schemas/handler_config.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "api_key": {
      "type": "string",
      "description": "PayOS API key (pk_test_... or pk_live_...)"
    },
    "default_corridor": {
      "type": "string",
      "enum": ["pix", "spei"],
      "description": "Default settlement corridor if not specified"
    },
    "webhook_url": {
      "type": "string",
      "format": "uri",
      "description": "URL to receive settlement status webhooks"
    },
    "webhook_secret": {
      "type": "string",
      "description": "Secret for webhook signature verification"
    }
  },
  "required": ["api_key"]
}
```

## Payment Instrument Schemas

### Pix Instrument

**Schema URL:** https://api.payos.com/ucp/schemas/pix_instrument.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "type": {
      "const": "pix"
    },
    "pix_key": {
      "type": "string",
      "maxLength": 77,
      "description": "Pix key value"
    },
    "pix_key_type": {
      "type": "string",
      "enum": ["cpf", "cnpj", "email", "phone", "evp"],
      "description": "Type of Pix key"
    },
    "name": {
      "type": "string",
      "maxLength": 200,
      "description": "Recipient legal name"
    },
    "tax_id": {
      "type": "string",
      "description": "CPF (11 digits) or CNPJ (14 digits)"
    }
  },
  "required": ["type", "pix_key", "pix_key_type", "name"]
}
```

### SPEI Instrument

**Schema URL:** https://api.payos.com/ucp/schemas/spei_instrument.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "type": {
      "const": "spei"
    },
    "clabe": {
      "type": "string",
      "pattern": "^[0-9]{18}$",
      "description": "CLABE interbank number (18 digits)"
    },
    "name": {
      "type": "string",
      "maxLength": 200,
      "description": "Recipient legal name"
    },
    "rfc": {
      "type": "string",
      "description": "Mexican tax ID (RFC)"
    }
  },
  "required": ["type", "clabe", "name"]
}
```

## Credential Flow

### Token Acquisition

The platform acquires a settlement token from PayOS, which:
- Locks in the FX rate for 15 minutes
- Pre-validates the recipient details
- Returns a `settlement_id` for tracking

**Request:**
```http
POST https://api.payos.com/v1/ucp/tokens
Authorization: Bearer {api_key}
Content-Type: application/json
UCP-Agent: PlatformName/2026-01-11

{
  "corridor": "pix",
  "amount": 100.00,
  "currency": "USD",
  "recipient": {
    "type": "pix",
    "pix_key": "12345678901",
    "pix_key_type": "cpf",
    "name": "Maria Silva"
  },
  "metadata": {
    "order_id": "ucp_order_123",
    "merchant_id": "shop_abc"
  }
}
```

**Response:**
```json
{
  "token": "ucp_tok_...",
  "settlement_id": "uuid",
  "quote": {
    "from_amount": 100.00,
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

### Checkout Completion

The merchant completes the checkout with the PayOS token:

```json
{
  "payment_handler": "payos_latam",
  "payment_data": {
    "token": "ucp_tok_..."
  }
}
```

### Settlement Execution

The merchant (or PayOS automatically) executes the settlement:

```http
POST https://api.payos.com/v1/ucp/settle
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "token": "ucp_tok_...",
  "idempotency_key": "checkout_12345"
}
```

## AP2 Mandate Support

PayOS supports AP2 payment mandates as an alternative credential type, enabling autonomous agent purchases.

### Using AP2 Mandate

```json
{
  "payment_handler": "payos_latam",
  "payment_data": {
    "type": "ap2_mandate",
    "credential": {
      "type": "PAYMENT_MANDATE",
      "token": "eyJhbGciOiJ..."
    }
  },
  "ap2": {
    "checkout_mandate": "eyJhbGciOiJ..."
  }
}
```

### Mandate Verification

PayOS verifies:
1. Mandate signature using platform signing keys
2. Mandate amount matches settlement amount
3. Mandate is not expired
4. Mandate has not been used (if one-time)

## Limits

| Limit | Value |
|-------|-------|
| Maximum single settlement | $100,000 USD |
| Token TTL | 15 minutes |
| Minimum amount | $1 USD |

## Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| Token acquisition | 100/minute |
| Settlement execution | 50/minute |
| Status checks | 200/minute |

## Webhooks

PayOS sends settlement status updates to the configured webhook URL:

```json
{
  "id": "evt_123",
  "type": "settlement.completed",
  "created_at": "2026-01-19T12:00:45Z",
  "data": {
    "settlement_id": "uuid",
    "status": "completed",
    "transfer_id": "tr_xyz",
    "completed_at": "2026-01-19T12:00:45Z"
  }
}
```

## Testing

### Sandbox Environment

- **Base URL:** https://sandbox.api.payos.com
- **Test API Keys:** `pk_test_...`

### Test Values

| Scenario | Pix Key | Result |
|----------|---------|--------|
| Success | `12345678901` (cpf) | Settlement completes |
| Slow settlement | `slow@test.com` (email) | Takes 30+ seconds |
| Failed | `fail@test.com` (email) | Settlement fails |

## Contact

- Documentation: https://docs.payos.com/ucp
- Support: ucp-support@payos.com
- Status: https://status.payos.com

---

*Version: 2026-01-11*
*Last Updated: January 2026*
