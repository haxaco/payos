# Investigation: Universal Commerce Protocol (UCP) Integration

**Status:** 🔴 URGENT - New Protocol (Launched Jan 11, 2026)  
**Category:** Protocol Strategy  
**Related Epics:** Epic 17 (Multi-Protocol), Epic 36 (SDK)  
**Priority:** P0 Investigation

---

## Executive Summary

**UCP (Universal Commerce Protocol)** is a new open standard co-developed by **Google and Shopify** that launched on **January 11, 2026** - just 4 days ago. It's designed to be THE standard for agentic commerce, and has already been endorsed by **20+ major players** including:

- **Retailers:** Shopify, Target, Walmart, Etsy, Wayfair, Best Buy, Macy's, Home Depot, Flipkart, Zalando
- **Payment Processors:** Stripe, Adyen, Visa, Mastercard, American Express, PayPal (coming soon)
- **AI Platforms:** Google (AI Mode, Gemini), Microsoft Copilot, ChatGPT (via Shopify)

**Critical Insight:** UCP is designed to work WITH existing protocols (AP2, A2A, MCP), not replace them. PayOS's multi-protocol positioning is validated, but we MUST add UCP support to remain relevant.

---

## What is UCP?

### Overview

UCP is an **open-source standard** for agentic commerce that:

1. **Defines the entire shopping journey** - Discovery → Cart → Checkout → Order → Post-purchase
2. **Supports multiple transports** - REST API, MCP (Model Context Protocol), A2A (Agent-to-Agent)
3. **Separates payment instruments from handlers** - Flexible payment architecture
4. **Integrates with AP2** - Uses AP2 mandates for cryptographic proof of authorization

### Key Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            UCP ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONSUMER SURFACES (AI Mode, Gemini, Copilot, ChatGPT)                      │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    UCP PROTOCOL LAYER                                │   │
│  │                                                                      │   │
│  │  TRANSPORTS: REST API | MCP | A2A | Embedded Protocol (EP)           │   │
│  │                                                                      │   │
│  │  CAPABILITIES:                                                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                     │   │
│  │  │  Checkout  │  │  Identity  │  │   Order    │                     │   │
│  │  │            │  │  Linking   │  │ Management │                     │   │
│  │  └────────────┘  └────────────┘  └────────────┘                     │   │
│  │                                                                      │   │
│  │  EXTENSIONS:                                                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐          │   │
│  │  │Fulfillment│ │Discounts │ │AP2 Mandates│ │Buyer Consent │          │   │
│  │  └──────────┘ └──────────┘ └────────────┘ └──────────────┘          │   │
│  │                                                                      │   │
│  │  PAYMENT HANDLERS:                                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │   │
│  │  │Google Pay│ │ Shop Pay │ │  Stripe  │ │   AP2    │                │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  BUSINESS BACKENDS (Merchants, Platforms, PayOS)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UCP vs Existing Protocols

### Protocol Comparison

| Aspect | x402 | AP2 | ACP | UCP |
|--------|------|-----|-----|-----|
| **Owner** | Coinbase | Google | Stripe/OpenAI | Google+Shopify |
| **Focus** | Micropayments | Agent authorization | E-commerce checkout | Full commerce lifecycle |
| **Payment Method** | USDC on Base | Multi-rail (cards, x402) | SharedPaymentToken | Multi-handler (AP2, cards, wallets) |
| **Scope** | Payment only | Payment + mandates | Checkout only | Discovery → Post-purchase |
| **Transport** | HTTP 402 | REST + VDC | REST | REST + MCP + A2A + EP |
| **Launched** | 2024 | 2024 | 2024 | Jan 11, 2026 |

### Key Insight: UCP is a SUPERSET

UCP doesn't replace x402/AP2/ACP - it **orchestrates** them:

- **AP2 Mandates Extension** (`dev.ucp.shopping.ap2_mandate`) - UCP natively supports AP2 for cryptographic authorization
- **Payment Handlers** - UCP can route payments to any handler (Google Pay, Shop Pay, Stripe, x402, etc.)
- **Transport Agnostic** - UCP works over REST, MCP, or A2A

**This validates PayOS's multi-protocol strategy.** We're not choosing winners; we're the settlement layer.

---

## UCP Core Capabilities

### 1. Checkout Capability

The primary capability. Creates and manages checkout sessions.

```json
{
  "ucp": {
    "version": "2026-01-11",
    "capabilities": [
      {"name": "dev.ucp.shopping.checkout", "version": "2026-01-11"}
    ]
  },
  "id": "chk_123456789",
  "status": "ready_for_complete",
  "currency": "USD",
  "buyer": {
    "email": "customer@example.com",
    "first_name": "Jane",
    "last_name": "Smith"
  },
  "line_items": [
    {
      "id": "li_1",
      "item": {
        "id": "item_123",
        "title": "Product Name",
        "price": 26550
      },
      "quantity": 1
    }
  ],
  "totals": [...],
  "payment": {
    "handlers": [...]
  }
}
```

### 2. Identity Linking Capability

OAuth 2.0-based linking for loyalty programs and account access.

### 3. Order Management Capability

Post-purchase: shipping updates, delivery tracking, returns.

### Key Extensions

| Extension | Parent | Purpose |
|-----------|--------|---------|
| `dev.ucp.shopping.fulfillment` | checkout | Shipping options, delivery windows |
| `dev.ucp.shopping.discount` | checkout | Promo codes, loyalty discounts |
| `dev.ucp.shopping.ap2_mandate` | checkout | Cryptographic authorization |
| `dev.ucp.shopping.buyer_consent` | checkout | Terms acceptance, age verification |

---

## Payment Architecture

### UCP Payment Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   PLATFORM  │      │   BUSINESS  │      │   PAYMENT   │
│  (AI Agent) │      │  (Merchant) │      │  PROVIDER   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. Create Checkout│                    │
       │───────────────────>│                    │
       │                    │                    │
       │  2. Return handlers│                    │
       │<───────────────────│                    │
       │                    │                    │
       │  3. Acquire token  │                    │
       │─────────────────────────────────────────>│
       │                    │                    │
       │  4. Token/Credential                    │
       │<────────────────────────────────────────│
       │                    │                    │
       │  5. Complete checkout (with credential) │
       │───────────────────>│                    │
       │                    │                    │
       │                    │  6. Process payment│
       │                    │───────────────────>│
       │                    │                    │
       │  7. Order confirmation                  │
       │<───────────────────│                    │
       │                    │                    │
```

### Payment Handlers

UCP decouples **what** (instruments) from **how** (handlers):

| Handler | Type | Use Case |
|---------|------|----------|
| `com.google.pay` | Digital Wallet | Consumer checkout |
| `dev.shopify.shop_pay` | Digital Wallet | Shopify merchants |
| `com.stripe.card` | Card | Direct card payments |
| `dev.ucp.ap2_mandate` | Cryptographic | Autonomous agents |
| **`com.payos.settlement`** | Settlement | **LATAM offramp** |

**This is PayOS's opportunity:** Become a UCP Payment Handler for LATAM settlement.

---

## PayOS Integration Strategy

### Option A: UCP Consumer (Platform Role)

PayOS acts as a **platform** that consumes UCP-enabled merchants.

- Read merchant profiles from `/.well-known/ucp`
- Call checkout APIs for cart management
- Submit payments on behalf of agents

**Pros:** Access to UCP merchant ecosystem
**Cons:** Limited differentiation, not our core value

### Option B: UCP Provider (Business Role) ⭐ RECOMMENDED

PayOS acts as a **business** that exposes UCP endpoints for settlement.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PayOS AS UCP BUSINESS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROFILE: /.well-known/ucp                                                  │
│  {                                                                          │
│    "ucp": {                                                                 │
│      "version": "2026-01-11",                                               │
│      "services": {                                                          │
│        "com.payos.settlement": {                                            │
│          "rest": { "endpoint": "https://api.payos.com/v1/ucp" }            │
│        }                                                                    │
│      },                                                                     │
│      "capabilities": [                                                      │
│        { "name": "com.payos.settlement.checkout" },                        │
│        { "name": "com.payos.settlement.pix" },                              │
│        { "name": "com.payos.settlement.spei" }                              │
│      ]                                                                      │
│    },                                                                       │
│    "payment": {                                                             │
│      "handlers": [                                                          │
│        { "name": "com.payos.usdc_pix" },                                   │
│        { "name": "com.payos.usdc_spei" }                                   │
│      ]                                                                      │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pros:** PayOS becomes discoverable by any UCP platform, positions as LATAM settlement layer
**Cons:** More implementation effort

### Option C: UCP Payment Handler (New!) ⭐⭐ HIGH VALUE

PayOS creates a **UCP Payment Handler** that any UCP business can use for LATAM settlement.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   PayOS AS UCP PAYMENT HANDLER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HANDLER: com.payos.latam_settlement                                        │
│  SPEC: https://payos.com/ucp/payment-handler                                │
│  CONFIG_SCHEMA: https://payos.com/ucp/schemas/handler_config.json           │
│  INSTRUMENT_SCHEMAS:                                                        │
│    - https://payos.com/ucp/schemas/pix_instrument.json                     │
│    - https://payos.com/ucp/schemas/spei_instrument.json                    │
│                                                                             │
│  HOW IT WORKS:                                                              │
│  1. UCP business adds com.payos.latam_settlement to their handlers          │
│  2. Platform sees PayOS handler in checkout response                        │
│  3. Platform acquires credential (e.g., AP2 mandate, USDC authorization)   │
│  4. Platform completes checkout with PayOS credential                       │
│  5. Business calls PayOS to settle to Pix/SPEI                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pros:** 
- Any UCP business can add LATAM settlement without custom integration
- PayOS becomes infrastructure for the entire UCP ecosystem
- Aligns with "we don't care which protocol wins" positioning

**Cons:**
- Most complex implementation
- Requires publishing handler spec and conformance tests

---

## Implementation Recommendation

### Phase 1: UCP Profile & Discovery (P0, 5 pts)

```
Story 17.X: Add UCP Profile Endpoint

- Implement /.well-known/ucp endpoint
- Expose PayOS capabilities (settlement, Pix, SPEI)
- Include x402/AP2/ACP as supported payment handlers
```

### Phase 2: UCP Checkout Consumer (P1, 13 pts)

```
Story 36.X: UCP Client in SDK

- Add payos.ucp module to SDK
- Implement checkout session management
- Support UCP capability negotiation
- Handle UCP payment completion
```

### Phase 3: UCP Payment Handler (P1, 21 pts)

```
Epic 4X: PayOS UCP Payment Handler

- Publish com.payos.latam_settlement handler spec
- Implement handler config schema
- Create Pix/SPEI instrument schemas
- Build credential acquisition flow
- Pass UCP conformance tests
```

---

## Technical Details

### UCP Profile Example for PayOS

```json
{
  "ucp": {
    "version": "2026-01-11",
    "services": {
      "com.payos.settlement": {
        "version": "2026-01-11",
        "spec": "https://docs.payos.com/ucp/settlement",
        "rest": {
          "schema": "https://api.payos.com/ucp/openapi.json",
          "endpoint": "https://api.payos.com/v1/ucp"
        },
        "mcp": {
          "schema": "https://api.payos.com/ucp/mcp.json",
          "endpoint": "https://api.payos.com/v1/ucp/mcp"
        }
      }
    },
    "capabilities": [
      {
        "name": "com.payos.settlement.quote",
        "version": "2026-01-11",
        "spec": "https://docs.payos.com/ucp/capabilities/quote",
        "schema": "https://api.payos.com/ucp/schemas/quote.json"
      },
      {
        "name": "com.payos.settlement.transfer",
        "version": "2026-01-11",
        "spec": "https://docs.payos.com/ucp/capabilities/transfer",
        "schema": "https://api.payos.com/ucp/schemas/transfer.json"
      }
    ]
  },
  "payment": {
    "handlers": [
      {
        "id": "payos_pix",
        "name": "com.payos.pix",
        "version": "2026-01-11",
        "spec": "https://docs.payos.com/ucp/handlers/pix",
        "config_schema": "https://api.payos.com/ucp/schemas/pix_config.json",
        "instrument_schemas": [
          "https://api.payos.com/ucp/schemas/pix_instrument.json"
        ]
      },
      {
        "id": "payos_spei",
        "name": "com.payos.spei",
        "version": "2026-01-11",
        "spec": "https://docs.payos.com/ucp/handlers/spei",
        "config_schema": "https://api.payos.com/ucp/schemas/spei_config.json",
        "instrument_schemas": [
          "https://api.payos.com/ucp/schemas/spei_instrument.json"
        ]
      }
    ]
  },
  "signing_keys": [
    {
      "kid": "payos_2026",
      "kty": "EC",
      "crv": "P-256",
      "x": "...",
      "y": "...",
      "use": "sig",
      "alg": "ES256"
    }
  ]
}
```

### MCP Tool Mapping

UCP capabilities map 1:1 to MCP tools, which aligns with our Epic 36 MCP server:

| UCP Capability | MCP Tool | PayOS Implementation |
|----------------|----------|---------------------|
| `com.payos.settlement.quote` | `payos_get_quote` | Already exists |
| `com.payos.settlement.transfer` | `payos_create_transfer` | Already exists |
| `com.payos.settlement.pix` | `payos_settle_pix` | Epic 40 |
| `com.payos.settlement.spei` | `payos_settle_spei` | Epic 40 |

---

## Risks & Considerations

### 1. Protocol Velocity

UCP launched 4 days ago. Spec is version `2026-01-11`. Expect rapid changes.

**Mitigation:** Implement minimally, follow GitHub discussions, contribute feedback.

### 2. Google/Shopify Dominance

Google and Shopify co-own UCP. They may optimize for their platforms.

**Mitigation:** Focus on settlement layer (they don't have Pix/SPEI), not checkout.

### 3. Stripe's Position

Stripe endorsed UCP. What happens to ACP?

**Observation:** ACP and UCP can coexist. ACP is checkout-focused; UCP is broader.

### 4. Implementation Effort

Full UCP support is significant (profile, capabilities, payment handler, conformance).

**Mitigation:** Phase implementation. Start with profile/discovery, expand based on demand.

---

## Action Items

### Immediate (This Week)

1. **Clone UCP repo** and review specification in detail
2. **Test UCP samples** (Python/Node.js reference implementations)
3. **Create Epic 43: UCP Integration** with phased stories

### Short-term (2 Weeks)

4. **Implement /.well-known/ucp** endpoint for PayOS
5. **Add UCP client to SDK** for consuming UCP merchants
6. **Update PRD** with UCP as fourth protocol

### Medium-term (1 Month)

7. **Publish PayOS payment handler spec** for LATAM settlement
8. **Pass UCP conformance tests**
9. **Announce PayOS UCP support** (marketing opportunity)

---

## Resources

- **GitHub:** https://github.com/Universal-Commerce-Protocol/ucp
- **Documentation:** https://ucp.dev/
- **SDKs:** 
  - Python: https://github.com/Universal-Commerce-Protocol/python-sdk
  - JavaScript: https://github.com/Universal-Commerce-Protocol/js-sdk
- **Samples:** https://github.com/Universal-Commerce-Protocol/samples
- **Conformance Tests:** https://github.com/Universal-Commerce-Protocol/conformance
- **Google Guide:** https://developers.google.com/merchant/ucp
- **Shopify Announcement:** https://www.shopify.com/ucp

---

## Related Documents

- [Epic 17: Multi-Protocol Gateway](../epics/epic-17-multi-protocol.md)
- [Epic 36: SDK & Developer Experience](../epics/epic-36-sdk-developer-experience.md)
- [PayOS PRD Master](../PayOS_PRD_Master.md)

---

*Created: January 15, 2026*
*Status: Investigation Complete - Ready for Epic Creation*
