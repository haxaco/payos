# PayOS Protocol Comparison Guide

**Version:** 1.0  
**Updated:** January 15, 2026  
**Status:** ✅ Production Reference

---

## Overview

PayOS supports **four** agentic payment protocols. This guide compares them to help understand when each is used and how they interoperate.

> **"We don't care which protocol wins. PayOS makes them all work."**

---

## Protocol Summary

| Protocol | Owner | Launch | Focus | PayOS Status |
|----------|-------|--------|-------|--------------|
| **x402** | Coinbase/Cloudflare | 2024 | Micropayments, API monetization | ✅ Full support |
| **AP2** | Google (60+ partners) | 2024 | Agent authorization, mandates | ✅ Full support |
| **ACP** | Stripe/OpenAI | 2024 | Consumer checkout, e-commerce | ✅ Full support |
| **UCP** | Google+Shopify (20+ partners) | Jan 11, 2026 | Full commerce lifecycle | 🚧 Epic 43 (P0) |

---

## Detailed Comparison

### Scope & Coverage

| Aspect | x402 | AP2 | ACP | UCP |
|--------|------|-----|-----|-----|
| **Primary Use Case** | Pay-per-API-call | Agent authorization | Shopping checkout | Full commerce |
| **Transaction Size** | Micropayments ($0.001-$10) | Any | Any | Any |
| **Discovery** | HTTP 402 response | Agent card | Checkout URL | `/.well-known/ucp` |
| **Cart Management** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Fulfillment** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Order Tracking** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Identity Linking** | ❌ No | Via mandates | Via Stripe | ✅ OAuth 2.0 |

### Payment Model

| Aspect | x402 | AP2 | ACP | UCP |
|--------|------|-----|-----|-----|
| **Payment Trigger** | HTTP 402 response | Mandate execution | Checkout completion | Handler negotiation |
| **Settlement Method** | USDC on Base | Multi-rail (cards, banks, x402) | SharedPaymentToken | Multi-handler |
| **Credential Type** | Payment JWT | SD-JWT mandate | Network token | Handler-specific |
| **User Consent** | Implicit (per-request) | Cryptographic mandate | One-time consent | AP2 + handler |

### Technical Architecture

| Aspect | x402 | AP2 | ACP | UCP |
|--------|------|-----|-----|-----|
| **Transport** | HTTP 402 header | REST + VDC | REST | REST + MCP + A2A + EP |
| **Crypto Required** | ✅ Yes (USDC) | Optional | ❌ No | Optional |
| **Agent Identity** | Wallet address | Signing key | API key | Profile URL |
| **Proof Method** | Payment JWT | SD-JWT | Transaction ID | JWS signature |

### Integration Complexity

| Aspect | x402 | AP2 | ACP | UCP |
|--------|------|-----|-----|-----|
| **Effort to Integrate** | Low (1-2 days) | Medium (3-5 days) | Medium (2-3 days) | Medium (3-5 days) |
| **Dependencies** | x402 SDK, wallet | Google VDC | Stripe SDK | UCP SDK |
| **Sandbox Available** | ✅ x402.org | ✅ Reference impl | ✅ Stripe test | ✅ Samples repo |

---

## Protocol Relationships

```
                    ┌─────────────────────────────────────────┐
                    │               UCP                        │
                    │    (Full Commerce Lifecycle)            │
                    │                                         │
                    │  Discovery ─▶ Checkout ─▶ Order        │
                    │       │           │          │          │
                    └───────┼───────────┼──────────┼──────────┘
                            │           │          │
              ┌─────────────┼───────────┼──────────┼─────────────┐
              │             ▼           ▼          ▼             │
              │  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
              │  │     AP2      │ │     ACP      │ │   x402   │ │
              │  │  (Mandates)  │ │  (Checkout)  │ │  (Micro) │ │
              │  │              │ │              │ │          │ │
              │  │ ┌──────────┐ │ │ ┌──────────┐ │ │  USDC    │ │
              │  │ │   VDC    │ │ │ │  Stripe  │ │ │   on     │ │
              │  │ │ SD-JWT   │ │ │ │  Token   │ │ │  Base    │ │
              │  │ └──────────┘ │ │ └──────────┘ │ │          │ │
              │  └──────────────┘ └──────────────┘ └──────────┘ │
              │                PAYMENT LAYER                    │
              └─────────────────────────────────────────────────┘
                                      │
                                      ▼
              ┌─────────────────────────────────────────────────┐
              │                   PayOS                         │
              │           (Settlement Infrastructure)           │
              │                                                 │
              │   ┌─────────┐  ┌─────────┐  ┌─────────┐        │
              │   │  Circle │  │   Pix   │  │  SPEI   │        │
              │   │  USDC   │  │ Brazil  │  │ Mexico  │        │
              │   └─────────┘  └─────────┘  └─────────┘        │
              │                                                 │
              └─────────────────────────────────────────────────┘
```

### Key Insight: UCP is a Superset

- **UCP doesn't replace x402/AP2/ACP** — it orchestrates them
- **AP2 mandates work inside UCP** via `dev.ucp.shopping.ap2_mandate` extension
- **Any payment handler** can be used (Google Pay, Shop Pay, x402, PayOS)
- **PayOS becomes a UCP Payment Handler** for LATAM settlement

---

## When to Use Each Protocol

### x402 — Micropayments & API Monetization

**Best for:**
- Pay-per-API-call scenarios
- AI agent tool usage payments
- Content micropayments
- Real-time streaming payments

**Example:**
```
Agent calls weather API → Server returns HTTP 402 → 
Agent pays 0.001 USDC → Server returns data
```

### AP2 — Agent Authorization & Mandates

**Best for:**
- Pre-authorized spending limits
- Recurring agent transactions
- User-delegated procurement
- Cryptographic proof of consent

**Example:**
```
User creates $500/month shopping mandate → 
Agent discovers products → Verifies mandate → 
Executes purchase with cryptographic proof
```

### ACP — E-commerce Checkout

**Best for:**
- Traditional shopping flows
- Stripe-integrated merchants
- One-time purchases
- Cart-based transactions

**Example:**
```
Agent builds cart → Creates checkout session → 
User confirms → Stripe processes → Delivery
```

### UCP — Full Commerce Lifecycle

**Best for:**
- Multi-merchant shopping
- Complex fulfillment flows
- Order lifecycle management
- Platform-agnostic commerce

**Example:**
```
Agent discovers products across merchants → 
Negotiates capabilities → Creates checkout →
Completes with PayOS (LATAM settlement) →
Tracks fulfillment → Handles returns
```

---

## PayOS Implementation by Protocol

### x402 Implementation

```typescript
// Provider: Accept x402 payments
import { x402Middleware } from '@sly/x402-provider-sdk';

app.use('/api/data', x402Middleware({
  price: '0.001 USDC',
  network: 'base',
  facilitator: 'https://x402.org'
}));

// Client: Make x402 payments  
import { payWithX402 } from '@sly/x402-client-sdk';

const response = await payWithX402(fetch, 'https://api.example.com/data');
```

### AP2 Implementation

```typescript
import { PayOS } from '@sly/sdk';

// Verify mandate and execute payment
const result = await payos.ap2.executeMandate({
  mandate: mandateCredential,
  amount: 150.00,
  currency: 'USD',
  settlementMethod: 'pix',
  recipient: { pixKey: 'merchant@email.com' }
});
```

### ACP Implementation

```typescript
import { PayOS } from '@sly/sdk';

// Complete ACP checkout with settlement
const order = await payos.acp.completeCheckout({
  sessionId: 'cs_123',
  sharedPaymentToken: 'spt_abc',
  settlementMethod: 'spei',
  recipient: { clabe: '012345678901234567' }
});
```

### UCP Implementation (Epic 43)

```typescript
import { PayOS } from '@sly/sdk';

// Discover UCP merchant
const profile = await payos.ucp.discover('https://merchant.example.com');

// Create checkout
const checkout = await payos.ucp.createCheckout({
  merchantUrl: 'https://merchant.example.com',
  lineItems: [{ itemId: 'product_123', quantity: 1 }],
  buyer: { email: 'customer@example.com' }
});

// Complete with PayOS settlement
const order = await payos.ucp.completeCheckout({
  checkoutId: checkout.id,
  handlerId: 'com.payos.latam_settlement',
  settlementMethod: 'pix',
  recipient: { pixKey: 'merchant@email.com' }
});
```

---

## Protocol Detection in PayOS

PayOS automatically detects which protocol is being used:

```typescript
// PayOS Protocol Router
function detectProtocol(request: Request): Protocol {
  // x402: HTTP 402 response handling
  if (request.headers.get('X-Payment-Required') === '402') {
    return 'x402';
  }
  
  // AP2: Mandate credential present
  if (request.body?.ap2_mandate || request.body?.mandate_credential) {
    return 'ap2';
  }
  
  // ACP: Stripe checkout session
  if (request.body?.checkout_session_id || request.body?.shared_payment_token) {
    return 'acp';
  }
  
  // UCP: UCP-Agent header or .well-known/ucp
  if (request.headers.get('UCP-Agent') || request.path.includes('/.well-known/ucp')) {
    return 'ucp';
  }
  
  return 'direct'; // Direct PayOS API
}
```

---

## Settlement Flow Comparison

### x402 Settlement

```
Agent ──▶ HTTP 402 ──▶ Agent Pays ──▶ Provider Verifies ──▶ Settlement
                           │
                           ▼
                      PayOS x402 Gateway
                           │
                           ▼
                    Circle USDC → Pix/SPEI
```

### AP2 Settlement

```
User ──▶ Creates Mandate ──▶ Agent Executes ──▶ PayOS Verifies ──▶ Settlement
                                    │
                                    ▼
                           Mandate Verification
                                    │
                                    ▼
                           Circle → Pix/SPEI
```

### ACP Settlement

```
Agent ──▶ Checkout ──▶ User Confirms ──▶ Stripe Token ──▶ PayOS ──▶ Settlement
                                              │
                                              ▼
                                      Token Exchange
                                              │
                                              ▼
                                      Circle → Pix/SPEI
```

### UCP Settlement

```
Agent ──▶ Discovery ──▶ Checkout ──▶ Handler Selection ──▶ PayOS ──▶ Settlement
               │            │              │
               │            │              ▼
               │            │      com.payos.latam_settlement
               │            │              │
               │            │              ▼
               │            │      Credential Acquisition
               │            │              │
               │            │              ▼
               │            │      Circle → Pix/SPEI
               │            │
               │            ▼
               │     Fulfillment Tracking
               │            │
               │            ▼
               │     Order Management
               │
               ▼
        Webhooks & Updates
```

---

## Revenue by Protocol

| Protocol | PayOS Revenue Stream | Typical Take Rate |
|----------|---------------------|-------------------|
| **x402** | Facilitator fee + settlement | 0.25% + settlement |
| **AP2** | Mandate verification + settlement | 0.15% + settlement |
| **ACP** | Checkout routing + settlement | 0.20% + settlement |
| **UCP** | Payment handler + settlement | 0.20% + settlement |
| **Settlement** | FX spread + rail fee | 0.65% + 0.35% |

---

## Related Documentation

- [x402 Implementation Guide](/docs/X402_GEMINI_TESTING_GUIDE.md)
- [AP2 Testing Guide](/docs/testing/AP2_TESTING_GUIDE.md)
- [ACP Testing Guide](/docs/testing/ACP_TESTING_GUIDE.md)
- [UCP Quick-Start Guide](/docs/guides/UCP_QUICKSTART.md)
- [Epic 17: Multi-Protocol Gateway](/docs/prd/epics/epic-17-multi-protocol.md)
- [Epic 43: UCP Integration](/docs/prd/epics/epic-43-ucp-integration.md)

---

*This guide is maintained as part of PayOS multi-protocol documentation.*
