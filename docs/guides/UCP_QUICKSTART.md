# UCP Quick-Start Guide for PayOS

**Created:** January 15, 2026  
**Status:** 🚀 Ready for Exploration  
**Protocol Version:** 2026-01-11  
**Related:** [Epic 43: UCP Integration](../prd/epics/epic-43-ucp-integration.md)

---

## What is UCP?

**Universal Commerce Protocol (UCP)** is an open-source standard launched on **January 11, 2026** by Google and Shopify. It's designed to be THE standard for agentic commerce.

### Key Facts

| Aspect | Detail |
|--------|--------|
| **Launched** | January 11, 2026 (NRF Conference) |
| **Co-developed by** | Google, Shopify, Etsy, Wayfair, Target, Walmart |
| **Endorsed by** | 20+ companies: Stripe, Visa, Mastercard, Adyen, PayPal, Best Buy, Macy's, Home Depot, etc. |
| **Protocol Version** | `2026-01-11` |
| **License** | Apache 2.0 |

### Why UCP Matters for PayOS

1. **UCP orchestrates existing protocols** (AP2, MCP, A2A) — doesn't replace them
2. **Google AI Mode & Gemini** will use UCP for shopping agents
3. **Shopify's 1M+ merchants** will support UCP natively
4. **PayOS can become a UCP Payment Handler** for LATAM settlement
5. **Not supporting UCP = irrelevance** in agentic commerce

---

## Quick Concepts

### The 4 Actors

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UCP ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PLATFORM          BUSINESS         CREDENTIAL         PAYMENT    │
│   (Agent)           (Merchant)       PROVIDER           SERVICE    │
│   ┌─────────┐       ┌─────────┐      ┌─────────┐       ┌─────────┐│
│   │ Gemini  │       │ Shopify │      │ Google  │       │ Stripe  ││
│   │ ChatGPT │──────▶│ Walmart │◀────▶│  Pay    │──────▶│ Adyen   ││
│   │ PayOS   │       │ Target  │      │ Shop Pay│       │ PayOS?  ││
│   │ Agent   │       │ Etsy    │      │ PayPal  │       │         ││
│   └─────────┘       └─────────┘      └─────────┘       └─────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Constructs

| Construct | Description | Examples |
|-----------|-------------|----------|
| **Capabilities** | Core features (the "verbs") | Checkout, Identity Linking, Order |
| **Extensions** | Augment capabilities | Fulfillment, Discounts, AP2 Mandates |
| **Services** | Transport layer | REST, MCP, A2A |

### Protocol Layer (What PayOS Implements)

```
DISCOVERY    ─────▶  CHECKOUT     ─────▶  ORDER
/.well-known/ucp    Create/Update         Lifecycle
Profile exchange    Complete              Webhooks
Capability          Payment               Fulfillment
negotiation         Handlers              Returns
```

---

## Resources

### Official Documentation

| Resource | URL |
|----------|-----|
| **Main Site** | https://ucp.dev |
| **Specification** | https://ucp.dev/specification/overview/ |
| **Core Concepts** | https://ucp.dev/documentation/core-concepts/ |
| **Checkout (REST)** | https://ucp.dev/specification/checkout-rest/ |
| **Checkout (MCP)** | https://ucp.dev/specification/checkout-mcp/ |
| **AP2 Mandates** | https://ucp.dev/specification/ap2-mandates/ |
| **Payment Handler Guide** | https://ucp.dev/specification/payment-handler-guide/ |
| **Google Merchant Guide** | https://developers.google.com/merchant/ucp |

### GitHub Repositories

| Repo | Description |
|------|-------------|
| [ucp](https://github.com/Universal-Commerce-Protocol/ucp) | Spec & documentation (1.6k ⭐) |
| [samples](https://github.com/Universal-Commerce-Protocol/samples) | Python & Node.js samples |
| [python-sdk](https://github.com/Universal-Commerce-Protocol/python-sdk) | Official Python SDK |
| [js-sdk](https://github.com/Universal-Commerce-Protocol/js-sdk) | Official JavaScript SDK |
| [conformance](https://github.com/Universal-Commerce-Protocol/conformance) | Conformance tests |

### Community Resources

| Resource | URL |
|----------|-----|
| [awesome-ucp](https://github.com/Upsonic/awesome-ucp) | Curated list of UCP resources |
| [ucp-merchant](https://github.com/steven2030/ucp-merchant) | Open-source sandbox merchant |
| [UCP Playground](https://ucp.dev/playground/) | Interactive playground |

---

## Hands-On: Run the Samples

### Option 1: Python Server (Recommended)

```bash
# Clone the samples repo
git clone https://github.com/Universal-Commerce-Protocol/samples.git
cd samples/rest/python/server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

Then test discovery:
```bash
curl http://localhost:8000/.well-known/ucp | jq
```

### Option 2: Node.js Server

```bash
cd samples/rest/nodejs

# Install dependencies
npm install

# Run the server
npm run dev
```

### Option 3: Test Against a Live Sandbox

The community has built a live UCP sandbox:

```bash
# Test discovery
curl https://puddingheroes.com/.well-known/ucp.json | jq

# List products
curl https://puddingheroes.com/api/ucp/products | jq

# Create a checkout (sandbox)
curl -X POST https://puddingheroes.com/api/ucp/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "line_items": [{"product_id": "pudding-theory-pdf", "quantity": 1}],
    "payment_token": "sandbox_test"
  }' | jq
```

---

## UCP Profile Structure

Every UCP business publishes a profile at `/.well-known/ucp`:

```json
{
  "ucp": {
    "version": "2026-01-11",
    "services": {
      "dev.ucp.shopping": {
        "version": "2026-01-11",
        "spec": "https://ucp.dev/specification/overview",
        "rest": {
          "endpoint": "https://business.example.com/ucp/checkout-sessions"
        },
        "mcp": {
          "endpoint": "https://business.example.com/ucp/mcp"
        }
      }
    },
    "capabilities": [
      {
        "name": "dev.ucp.shopping.checkout",
        "version": "2026-01-11"
      },
      {
        "name": "dev.ucp.shopping.fulfillment",
        "version": "2026-01-11",
        "extends": "dev.ucp.shopping.checkout"
      },
      {
        "name": "dev.ucp.shopping.ap2_mandate",
        "version": "2026-01-11",
        "extends": "dev.ucp.shopping.checkout"
      }
    ],
    "signing_keys": [
      {
        "kid": "business_key_1",
        "kty": "EC",
        "crv": "P-256",
        "x": "...",
        "y": "..."
      }
    ]
  },
  "payment": {
    "handlers": [
      {
        "name": "com.google.pay",
        "version": "2026-01-11"
      },
      {
        "name": "com.payos.latam_settlement",
        "version": "2026-01-11"
      }
    ]
  }
}
```

---

## PayOS Integration Strategy

### PayOS as UCP Payment Handler

PayOS will register as `com.payos.latam_settlement` — a payment handler that:

1. **Receives checkout credentials** from any UCP business
2. **Settles to LATAM rails** (Pix, SPEI) via Circle
3. **Returns settlement confirmation** back through UCP

```
UCP Agent ──▶ UCP Business ──▶ PayOS Handler ──▶ Circle ──▶ Pix/SPEI
              (Shopify)       (LATAM Settlement)
```

### Integration Points

| UCP Component | PayOS Implementation |
|---------------|---------------------|
| `/.well-known/ucp` | Publish PayOS profile with capabilities |
| Capability Negotiation | Support checkout + AP2 mandates |
| Payment Handler | `com.payos.latam_settlement` spec |
| Checkout Completion | Accept credentials, execute settlement |
| Webhooks | Send settlement status updates |

### SDK Integration

The PayOS SDK (`@sly/sdk`) will add a `payos.ucp` module:

```typescript
import { PayOS } from '@sly/sdk';

const payos = new PayOS({ apiKey: 'pk_...' });

// Discover a UCP merchant
const profile = await payos.ucp.discover('https://merchant.example.com');

// Create checkout through UCP
const checkout = await payos.ucp.createCheckout({
  merchantUrl: 'https://merchant.example.com',
  lineItems: [{ itemId: 'product_123', quantity: 1 }],
  buyer: { email: 'customer@example.com' }
});

// Complete with PayOS settlement
const order = await payos.ucp.completeCheckout({
  checkoutId: checkout.id,
  settlementMethod: 'pix',
  recipient: { pixKey: 'recipient@email.com' }
});
```

---

## Checkout Flow Deep Dive

### 1. Create Checkout

```bash
POST /checkout-sessions
Content-Type: application/json
UCP-Agent: profile="https://agent.example/profile"

{
  "line_items": [
    {
      "item": {
        "id": "item_123",
        "title": "Product Name",
        "price": 2500
      },
      "quantity": 1
    }
  ],
  "buyer": {
    "email": "customer@example.com"
  },
  "currency": "USD"
}
```

### 2. Response with Payment Handlers

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
  "totals": [
    {"type": "subtotal", "amount": 2500},
    {"type": "tax", "amount": 200},
    {"type": "total", "amount": 2700}
  ],
  "payment": {
    "handlers": [
      {
        "id": "gpay_handler",
        "name": "com.google.pay",
        "version": "2026-01-11",
        "spec": "https://pay.google.com/gp/p/ucp/2026-01-11/"
      },
      {
        "id": "payos_handler",
        "name": "com.payos.latam_settlement",
        "version": "2026-01-11",
        "spec": "https://api.payos.io/ucp/handler"
      }
    ]
  }
}
```

### 3. Complete Checkout

```bash
POST /checkout-sessions/{id}/complete
Content-Type: application/json

{
  "payment": {
    "handler_id": "payos_handler",
    "credential": {
      "type": "settlement_request",
      "destination": {
        "type": "pix",
        "key": "recipient@example.com"
      }
    }
  }
}
```

---

## AP2 Mandates with UCP

UCP supports AP2 mandates through the `dev.ucp.shopping.ap2_mandate` extension:

```json
{
  "ap2": {
    "merchant_authorization": "eyJhbGciOiJFUzI1NiIsImtpZCI6Im1lcmNoYW50X2tleV8xIn0..SIGNATURE",
    "checkout_mandate": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImFnZW50X2tleV8xIn0..MANDATE"
  }
}
```

This means:
- **PayOS's existing AP2 work applies directly to UCP**
- Cryptographic proof of user authorization flows through UCP
- PayOS verifies mandates before executing settlements

---

## Next Steps for PayOS

### Immediate (This Week)

1. ✅ **Read this guide** — You're doing it!
2. 🔲 **Clone samples repo** and run Python server locally
3. 🔲 **Test against live sandbox** (puddingheroes.com)
4. 🔲 **Review spec**: checkout-rest, payment-handler-guide

### Short-term (Next 2 Weeks)

5. 🔲 **Implement `/.well-known/ucp`** endpoint for PayOS
6. 🔲 **Define PayOS payment handler spec** (`com.payos.latam_settlement`)
7. 🔲 **Add UCP client module** to @sly/sdk

### Medium-term (1 Month)

8. 🔲 **Pass UCP conformance tests**
9. 🔲 **Create E2E demo**: UCP → PayOS → Pix
10. 🔲 **Announce PayOS UCP support** (marketing opportunity)

---

## Commands Reference

```bash
# Clone all UCP repos
git clone https://github.com/Universal-Commerce-Protocol/ucp.git
git clone https://github.com/Universal-Commerce-Protocol/samples.git
git clone https://github.com/Universal-Commerce-Protocol/python-sdk.git
git clone https://github.com/Universal-Commerce-Protocol/js-sdk.git

# Run Python sample server
cd samples/rest/python/server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Test endpoints
curl http://localhost:8000/.well-known/ucp | jq
curl http://localhost:8000/products | jq
curl -X POST http://localhost:8000/checkout-sessions \
  -H "Content-Type: application/json" \
  -d '{"line_items": [{"item": {"id": "prod_1", "title": "Test", "price": 1000}, "quantity": 1}]}' | jq

# Run conformance tests (once PayOS implements UCP)
cd conformance
pip install -r requirements.txt
pytest tests/ --base-url=http://localhost:3000
```

---

## Related Documentation

- [Epic 43: UCP Integration](../prd/epics/epic-43-ucp-integration.md) — Full epic with stories
- [UCP Investigation](../prd/investigations/ucp-integration.md) — Strategic analysis
- [Epic 36: SDK](../prd/epics/epic-36-sdk-developer-experience.md) — SDK integration
- [PRD Master v1.20](../prd/PayOS_PRD_Master.md) — Updated with UCP

---

*This guide will be updated as PayOS UCP integration progresses.*
