# UCP → PayOS → Pix Demo

This demo demonstrates how PayOS acts as a UCP Payment Handler for LATAM settlement.

## Overview

The demo shows a complete flow where:
1. A UCP shopping agent discovers PayOS's capabilities
2. The agent gets an FX quote for USD → BRL
3. The agent acquires a settlement token for Pix payout
4. The agent completes checkout with the token
5. PayOS executes the Pix transfer to Brazil

## Running the Demo

### Prerequisites

1. Start the PayOS API server:
   ```bash
   pnpm --filter @sly/api dev
   ```

2. (Optional) Set environment variables:
   ```bash
   export PAYOS_API_URL=http://localhost:4000
   export PAYOS_API_KEY=pk_test_your_api_key_here
   ```

### Run the Demo

```bash
pnpm --filter @sly/api tsx scripts/demos/ucp-pix-demo.ts
```

### Expected Output

```
═══════════════════════════════════════════════════════════════
  UCP → PayOS → Pix Settlement Demo
═══════════════════════════════════════════════════════════════

This demo shows how a UCP shopping agent can complete checkout
with PayOS LATAM settlement, sending funds via Brazilian Pix.

▸ Step 1: Discover PayOS UCP Profile
────────────────────────────────────────
  ✓ Found PayOS UCP profile
  UCP Version: 2026-01-11
  Settlement Service: 2026-01-11
  Payment Handler: com.payos.latam_settlement
  Supported Corridors: pix, spei

▸ Step 2: Get FX Quote for USD → BRL
────────────────────────────────────────
  ✓ Quote received
  From: 100 USD
  To: 588.65 BRL
  FX Rate: 5.95
  Fees: 1 USD

▸ Step 3: Acquire Settlement Token
────────────────────────────────────────
  ✓ Settlement token acquired
  Token: ucp_tok_abc123...
  Settlement ID: 550e8400-e29b-41d4-a716-446655440000
  Expires: 2026-01-19T15:15:00Z

▸ Step 4: Complete Settlement
────────────────────────────────────────
  ✓ Settlement initiated
  Status: pending
  Corridor: pix
  Estimated Completion: < 1 minute

▸ Step 5: Check Settlement Status
────────────────────────────────────────
  ✓ Settlement status retrieved
  Status: processing → completed

═══════════════════════════════════════════════════════════════
  Demo Complete!
═══════════════════════════════════════════════════════════════
```

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/ucp` | GET | UCP profile discovery |
| `/v1/ucp/quote` | POST | Get FX quote |
| `/v1/ucp/tokens` | POST | Acquire settlement token |
| `/v1/ucp/settle` | POST | Complete settlement |
| `/v1/ucp/settlements/:id` | GET | Check settlement status |

## Supported Corridors

| Corridor | Source | Destination | Rail | Settlement Time |
|----------|--------|-------------|------|-----------------|
| USD → BRL | USD/USDC | BRL | Pix | < 1 minute |
| USD → MXN | USD/USDC | MXN | SPEI | < 30 minutes |

## Token Lifecycle

1. **Acquire**: Token created with 15-minute expiration
2. **Use**: Token can only be used once for settlement
3. **Expire**: Unused tokens automatically expire

## Settlement States

```
pending → processing → completed
                   → failed
```

- **pending**: Settlement created, awaiting execution
- **processing**: Settlement in progress with PSP
- **completed**: Funds delivered to recipient
- **failed**: Settlement failed (see failure_reason)

## Integration Notes

### UCP-Agent Header

All requests should include the `UCP-Agent` header:

```
UCP-Agent: YourAgent/2026-01-11 (https://yourdomain.com/.well-known/ucp)
```

### Idempotency

Use the `idempotency_key` parameter on settlement requests to prevent duplicate settlements:

```json
{
  "token": "ucp_tok_...",
  "idempotency_key": "checkout_12345_payment"
}
```

### Error Handling

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `TOKEN_NOT_FOUND` | 404 | Token doesn't exist |
| `TOKEN_EXPIRED` | 410 | Token has expired |
| `TOKEN_USED` | 409 | Token already used |
| `VALIDATION_ERROR` | 400 | Invalid request data |

## For Investor Demos

This demo is designed to show:

1. **Protocol Compatibility**: PayOS works with UCP (Google+Shopify's standard)
2. **Real-Time Settlement**: Pix transfers complete in under 1 minute
3. **Multi-Currency**: Automatic FX from USD/USDC to BRL/MXN
4. **Simple Integration**: Just 3 API calls for complete settlement

### Key Talking Points

- PayOS is the **only** settlement layer supporting all 4 agentic protocols (x402, AP2, ACP, UCP)
- Native LATAM rails via Circle (Pix, SPEI) - 12-month head start
- Partners bring their Circle accounts (SaaS model, no licensing required initially)
- B2B volume today, positioned for agentic commerce tomorrow
