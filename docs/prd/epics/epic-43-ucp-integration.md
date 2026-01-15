# Epic 43: UCP (Universal Commerce Protocol) Integration 🌐

**Status:** 📋 Planning  
**Phase:** 3.5 (Protocol Integration)  
**Priority:** P0 — Strategic Imperative  
**Estimated Points:** 55  
**Stories:** 0/14  
**Dependencies:** Epic 17 (Multi-Protocol), Epic 36 (SDK), Epic 40 (Sandbox)  
**Created:** January 15, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

**UCP (Universal Commerce Protocol)** launched on **January 11, 2026** as the new industry standard for agentic commerce, co-developed by **Google and Shopify** with endorsement from **20+ major players** including Stripe, Visa, Mastercard, Walmart, Target, and more.

**Why This Matters:**
- UCP is designed to become THE standard for AI-driven commerce
- It supports AP2, MCP, and A2A natively — validating PayOS's multi-protocol strategy
- PayOS can become a **UCP Payment Handler** for LATAM settlement
- Not supporting UCP risks irrelevance in the agentic commerce ecosystem

**Goal:** Position PayOS as the LATAM settlement layer for the entire UCP ecosystem.

---

## Strategic Context

### UCP Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UCP ECOSYSTEM (Jan 2026)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PLATFORMS (Agents)           BUSINESSES (Merchants)    PAYMENT HANDLERS    │
│  ┌────────────────┐           ┌────────────────┐       ┌────────────────┐  │
│  │ Google AI Mode │           │    Shopify     │       │   Google Pay   │  │
│  │ Gemini App     │           │    Walmart     │       │   Shop Pay     │  │
│  │ MS Copilot     │           │    Target      │       │   Stripe       │  │
│  │ ChatGPT        │           │    Etsy        │       │   Adyen        │  │
│  │ Perplexity     │           │    Wayfair     │       │   PayPal       │  │
│  │ Custom Agents  │           │    1M+ more    │       │   ??? PayOS    │  │
│  └────────────────┘           └────────────────┘       └────────────────┘  │
│         │                            │                        │            │
│         └────────────────────────────┼────────────────────────┘            │
│                                      │                                     │
│                                      ▼                                     │
│                    ┌─────────────────────────────────┐                     │
│                    │     UCP PROTOCOL STANDARD       │                     │
│                    │  (Discovery, Checkout, Orders)  │                     │
│                    └─────────────────────────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### PayOS UCP Strategy

PayOS will integrate UCP in **three roles**:

1. **UCP Profile Publisher** — Expose /.well-known/ucp for discovery
2. **UCP Payment Handler** — Become `com.payos.latam_settlement` handler
3. **UCP Client** — Consume UCP-enabled merchants for settlement

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| UCP profile endpoint | ❌ No | - | P0 | Server-side only |
| UCP capability negotiation | ✅ Yes | `payos.ucp` | P0 | New module |
| UCP checkout consumer | ✅ Yes | `payos.ucp` | P1 | Merchant integration |
| Payment handler spec | ❌ No | - | P1 | Documentation |
| MCP transport binding | ✅ Yes | `payos.ucp` | P1 | Extends MCP server |
| A2A transport binding | ✅ Yes | `payos.ucp` | P2 | Future |

**SDK Stories Required:**
- [ ] Story 36.24: Add `payos.ucp` module to SDK
- [ ] Story 36.25: UCP-compatible MCP tools

---

## Stories

### Part 1: UCP Discovery & Profile (8 points)

#### Story 43.1: UCP Profile Endpoint

**Points:** 3  
**Priority:** P0  
**Dependencies:** None

**Description:**
Implement `/.well-known/ucp` endpoint that publishes PayOS's UCP profile, enabling discovery by any UCP platform.

**Acceptance Criteria:**
- [ ] `GET /.well-known/ucp` returns valid UCP profile JSON
- [ ] Profile declares PayOS version and capabilities
- [ ] Profile includes settlement service definition
- [ ] REST transport endpoint configured
- [ ] MCP transport endpoint configured (if available)
- [ ] Signing keys included for webhook verification
- [ ] Profile validates against UCP schema
- [ ] Cache-Control headers set appropriately

**Profile Structure:**
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
        }
      }
    },
    "capabilities": [...]
  },
  "payment": {
    "handlers": [...]
  },
  "signing_keys": [...]
}
```

**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Server-side discovery endpoint

**Files to Create:**
- `apps/api/src/routes/well-known/ucp.ts`
- `apps/api/src/services/ucp/profile.ts`

---

#### Story 43.2: UCP Capability Definitions

**Points:** 3  
**Priority:** P0  
**Dependencies:** 43.1

**Description:**
Define PayOS-specific UCP capabilities for settlement services.

**Capabilities to Define:**

| Capability | Purpose |
|------------|---------|
| `com.payos.settlement.quote` | Get FX quote for corridor |
| `com.payos.settlement.transfer` | Create settlement transfer |
| `com.payos.settlement.status` | Get transfer status |

**Acceptance Criteria:**
- [ ] JSON schemas published for each capability
- [ ] OpenAPI spec generated for REST binding
- [ ] Capability specs follow UCP naming conventions
- [ ] Version negotiation logic implemented
- [ ] Schema composition with extensions supported

**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Schema definitions, not runtime code

**Files to Create:**
- `apps/api/public/ucp/schemas/quote.json`
- `apps/api/public/ucp/schemas/transfer.json`
- `apps/api/public/ucp/openapi.json`
- `docs/ucp/capabilities/README.md`

---

#### Story 43.3: UCP Version Negotiation

**Points:** 2  
**Priority:** P0  
**Dependencies:** 43.1

**Description:**
Implement UCP version negotiation per specification.

**Acceptance Criteria:**
- [ ] Parse `UCP-Agent` header from requests
- [ ] Fetch and cache platform profiles
- [ ] Compute capability intersection
- [ ] Include `ucp.version` and `ucp.capabilities` in all responses
- [ ] Return `version_unsupported` error for incompatible versions
- [ ] Support profile caching with HTTP cache headers

**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Server-side protocol handling

**Files to Create:**
- `apps/api/src/services/ucp/negotiation.ts`
- `apps/api/src/middleware/ucp.ts`

---

### Part 2: PayOS Payment Handler (21 points)

#### Story 43.4: Payment Handler Specification

**Points:** 5  
**Priority:** P1  
**Dependencies:** 43.2

**Description:**
Publish PayOS as a UCP Payment Handler that any UCP business can use for LATAM settlement.

**Handler Definition:**
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
  ]
}
```

**Acceptance Criteria:**
- [ ] Handler spec published at documented URL
- [ ] Config schema defines required merchant inputs (API key, settlement preferences)
- [ ] Pix instrument schema defines recipient fields
- [ ] SPEI instrument schema defines CLABE fields
- [ ] Documentation explains integration flow
- [ ] Test merchant can configure handler

**SDK Exposure:**
- **Needs SDK exposure?** No
- **Reason:** Spec documentation

**Files to Create:**
- `docs/ucp/handlers/latam/SPEC.md`
- `apps/api/public/ucp/schemas/handler_config.json`
- `apps/api/public/ucp/schemas/pix_instrument.json`
- `apps/api/public/ucp/schemas/spei_instrument.json`

---

#### Story 43.5: Handler Credential Flow

**Points:** 5  
**Priority:** P1  
**Dependencies:** 43.4

**Description:**
Implement the credential acquisition and completion flow for PayOS payment handler.

**Flow:**
```
1. UCP Business advertises com.payos.latam_settlement handler
2. Platform sees handler, calls PayOS token endpoint
3. PayOS returns settlement_token (with quote, expiration)
4. Platform completes checkout with settlement_token
5. Business calls PayOS /settle with token
6. PayOS executes Pix/SPEI settlement
```

**Acceptance Criteria:**
- [ ] Token acquisition endpoint: `POST /v1/ucp/tokens`
- [ ] Token includes: quote, expiration, settlement_id
- [ ] Token validation on settlement request
- [ ] Idempotency via token reference
- [ ] Token expiration handling (15 min default)
- [ ] Rate limiting on token requests

**API Endpoints:**
```
POST /v1/ucp/tokens              → Acquire settlement token
POST /v1/ucp/settle              → Complete settlement with token
GET  /v1/ucp/settlements/:id     → Get settlement status
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.ucp`
- **Method(s):** `acquireToken()`, `settle()`
- **MCP tool needed?** Yes - `payos_ucp_acquire_token`
- **SDK story:** Story 36.24

**Files to Create:**
- `apps/api/src/routes/ucp.ts`
- `apps/api/src/services/ucp/tokens.ts`
- `apps/api/src/services/ucp/settlement.ts`

---

#### Story 43.6: AP2 Mandate Support in Handler

**Points:** 5  
**Priority:** P1  
**Dependencies:** 43.5, Epic 17 (AP2)

**Description:**
Support AP2 mandates as credential type in PayOS payment handler, enabling autonomous agent settlement.

**Acceptance Criteria:**
- [ ] Accept AP2 payment mandates as credential
- [ ] Verify mandate signature using platform signing keys
- [ ] Validate mandate amount matches settlement amount
- [ ] Extract payment details from mandate
- [ ] Link settlement to mandate for audit
- [ ] Support `dev.ucp.shopping.ap2_mandate` extension

**Credential Structure:**
```json
{
  "payment_data": {
    "handler_id": "payos_latam",
    "type": "ap2_mandate",
    "credential": {
      "type": "PAYMENT_MANDATE",
      "token": "eyJhbGciOiJ..."  // Signed VDC
    }
  },
  "ap2": {
    "checkout_mandate": "eyJhbGciOiJ..."
  }
}
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.ucp`
- **Method(s):** `settleWithMandate()`
- **SDK story:** Story 36.24

**Files to Modify:**
- `apps/api/src/services/ucp/settlement.ts`
- `apps/api/src/services/ap2/mandate-service.ts`

---

#### Story 43.7: UCP Conformance Tests

**Points:** 3  
**Priority:** P1  
**Dependencies:** 43.5

**Description:**
Pass UCP conformance tests for payment handler implementation.

**Acceptance Criteria:**
- [ ] Clone UCP conformance test repo
- [ ] Configure tests for PayOS handler
- [ ] Pass profile discovery tests
- [ ] Pass capability negotiation tests
- [ ] Pass payment handler tests
- [ ] Document any spec deviations

**Files to Create:**
- `apps/api/test/ucp-conformance/README.md`
- `apps/api/test/ucp-conformance/run-tests.sh`

---

#### Story 43.8: Handler Documentation

**Points:** 3  
**Priority:** P1  
**Dependencies:** 43.4, 43.5

**Description:**
Create comprehensive documentation for UCP businesses to integrate PayOS settlement.

**Acceptance Criteria:**
- [ ] Integration guide with step-by-step instructions
- [ ] Code examples (Python, JavaScript)
- [ ] Sandbox testing guide
- [ ] Error code reference
- [ ] FAQ section
- [ ] Publish to docs.payos.com/ucp

**Files to Create:**
- `docs/ucp/INTEGRATION_GUIDE.md`
- `docs/ucp/examples/python/`
- `docs/ucp/examples/nodejs/`
- `docs/ucp/ERRORS.md`

---

### Part 3: UCP Client (SDK) (13 points)

#### Story 43.9: UCP Client Module

**Points:** 5  
**Priority:** P1  
**Dependencies:** 43.1

**Description:**
Add `payos.ucp` module to SDK for consuming UCP-enabled merchants.

**Acceptance Criteria:**
- [ ] `payos.ucp.discover(merchantUrl)` - Fetch merchant profile
- [ ] `payos.ucp.negotiate(merchantProfile, platformProfile)` - Compute capabilities
- [ ] `payos.ucp.createCheckout(merchantUrl, params)` - Create checkout session
- [ ] `payos.ucp.completeCheckout(checkoutId, paymentData)` - Complete with payment
- [ ] Profile caching with configurable TTL
- [ ] TypeScript types for UCP schemas

**SDK Usage:**
```typescript
import PayOS from '@payos/sdk';

const payos = new PayOS({ apiKey: '...' });

// Discover merchant capabilities
const merchant = await payos.ucp.discover('https://merchant.example.com');

// Create checkout
const checkout = await payos.ucp.createCheckout(merchant.endpoint, {
  line_items: [...],
  buyer: { email: '...' }
});

// Complete with PayOS settlement
const order = await payos.ucp.completeCheckout(checkout.id, {
  handler_id: 'payos_latam',
  credential: { token: settlementToken }
});
```

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `payos.ucp`
- **MCP tool needed?** Yes
- **SDK story:** Story 36.24

**Files to Create:**
- `packages/sdk/src/modules/ucp/index.ts`
- `packages/sdk/src/modules/ucp/client.ts`
- `packages/sdk/src/modules/ucp/types.ts`

---

#### Story 43.10: UCP MCP Transport

**Points:** 5  
**Priority:** P1  
**Dependencies:** 43.9, Epic 36 (MCP Server)

**Description:**
Add UCP tools to PayOS MCP server, enabling Claude/Gemini to use UCP directly.

**MCP Tools:**
```typescript
// Discover UCP merchant
payos_ucp_discover({ merchant_url: string })

// Create UCP checkout
payos_ucp_create_checkout({ 
  merchant_url: string,
  line_items: LineItem[],
  buyer: Buyer
})

// Complete checkout with PayOS settlement
payos_ucp_complete_checkout({
  checkout_id: string,
  corridor: 'pix' | 'spei',
  recipient: PixRecipient | SpeiRecipient
})
```

**Acceptance Criteria:**
- [ ] MCP tools registered for UCP operations
- [ ] Tool descriptions include UCP context
- [ ] Tools handle UCP error responses
- [ ] Integration test with Claude MCP client

**Files to Create:**
- `packages/mcp-server/src/tools/ucp.ts`

**Files to Modify:**
- `packages/mcp-server/src/index.ts`

---

#### Story 43.11: UCP Webhook Handler

**Points:** 3  
**Priority:** P2  
**Dependencies:** 43.5

**Description:**
Handle UCP webhooks for order status updates.

**Webhook Events:**
- `order.created` - New order from UCP checkout
- `order.updated` - Status change (shipped, delivered)
- `order.cancelled` - Order cancelled

**Acceptance Criteria:**
- [ ] Webhook endpoint: `POST /v1/webhooks/ucp`
- [ ] Signature verification using business signing keys
- [ ] Event type routing
- [ ] Idempotent processing
- [ ] Forward to partner webhooks

**Files to Create:**
- `apps/api/src/routes/webhooks/ucp.ts`
- `apps/api/src/services/ucp/webhooks.ts`

---

### Part 4: Integration & Testing (13 points)

#### Story 43.12: E2E: UCP Checkout → PayOS Settlement

**Points:** 5  
**Priority:** P0  
**Dependencies:** 43.5, 43.9

**Description:**
End-to-end test demonstrating UCP checkout completing with PayOS LATAM settlement.

**Test Scenario:**
```
1. UCP platform discovers test merchant
2. Platform creates checkout session
3. Merchant advertises com.payos.latam_settlement handler
4. Platform acquires PayOS settlement token
5. Platform completes checkout with token
6. Merchant calls PayOS to settle
7. PayOS executes Pix payout
8. Platform receives order confirmation
```

**Acceptance Criteria:**
- [ ] Full flow works with UCP reference merchant
- [ ] PayOS token acquisition works
- [ ] Settlement completes to Pix sandbox
- [ ] Order status updates via webhook
- [ ] Integration test automated

**Files to Create:**
- `apps/api/test/e2e/ucp-checkout-settlement.test.ts`

---

#### Story 43.13: E2E: UCP with AP2 Mandate

**Points:** 5  
**Priority:** P1  
**Dependencies:** 43.6, 43.12

**Description:**
End-to-end test for autonomous agent using AP2 mandate through UCP.

**Test Scenario:**
```
1. Agent has AP2 payment mandate from user
2. Agent discovers UCP merchant
3. Agent creates checkout with AP2 mandate extension
4. Agent completes with mandate as credential
5. PayOS verifies mandate and settles
6. Agent receives confirmation
```

**Acceptance Criteria:**
- [ ] AP2 mandate verification works in UCP context
- [ ] Cryptographic proof chain intact
- [ ] Settlement executes successfully
- [ ] Audit trail links mandate to settlement

**Files to Create:**
- `apps/api/test/e2e/ucp-ap2-settlement.test.ts`

---

#### Story 43.14: UCP Demo Script

**Points:** 3  
**Priority:** P0  
**Dependencies:** 43.12

**Description:**
Create demo script showing UCP → PayOS → Pix for YC/investor demos.

**Demo Flow:**
```
1. Show Gemini/AI Mode discovering products
2. Show checkout creation via UCP
3. Show PayOS as payment handler option
4. Execute settlement to Brazilian Pix
5. Show real-time settlement confirmation
```

**Acceptance Criteria:**
- [ ] Demo script runs end-to-end
- [ ] Clear visual output at each step
- [ ] Works with sandbox APIs
- [ ] Under 2 minutes total
- [ ] Can be shown in investor meetings

**Files to Create:**
- `scripts/demos/ucp-pix-demo.ts`
- `docs/demos/UCP_PIX_DEMO.md`

---

## Story Summary

| Story | Points | Priority | Description | Dependencies |
|-------|--------|----------|-------------|--------------|
| **Part 1: Discovery** | **8** | | | |
| 43.1 | 3 | P0 | UCP Profile Endpoint | None |
| 43.2 | 3 | P0 | Capability Definitions | 43.1 |
| 43.3 | 2 | P0 | Version Negotiation | 43.1 |
| **Part 2: Payment Handler** | **21** | | | |
| 43.4 | 5 | P1 | Handler Specification | 43.2 |
| 43.5 | 5 | P1 | Credential Flow | 43.4 |
| 43.6 | 5 | P1 | AP2 Mandate Support | 43.5 |
| 43.7 | 3 | P1 | Conformance Tests | 43.5 |
| 43.8 | 3 | P1 | Handler Documentation | 43.4, 43.5 |
| **Part 3: SDK** | **13** | | | |
| 43.9 | 5 | P1 | UCP Client Module | 43.1 |
| 43.10 | 5 | P1 | MCP Transport | 43.9 |
| 43.11 | 3 | P2 | Webhook Handler | 43.5 |
| **Part 4: Testing** | **13** | | | |
| 43.12 | 5 | P0 | E2E: UCP → Pix | 43.5, 43.9 |
| 43.13 | 5 | P1 | E2E: UCP + AP2 | 43.6 |
| 43.14 | 3 | P0 | Demo Script | 43.12 |
| **TOTAL** | **55** | | **14 stories** | |

---

## Priority Summary

| Priority | Stories | Points | Focus |
|----------|---------|--------|-------|
| **P0** | 5 | 16 | Profile, negotiation, demo |
| **P1** | 8 | 36 | Payment handler, SDK, testing |
| **P2** | 1 | 3 | Webhooks |
| **Total** | **14** | **55** | |

---

## Success Criteria

| Checkpoint | Criteria |
|------------|----------|
| After P0 Discovery | PayOS discoverable via /.well-known/ucp |
| After P0 Demo | Can demo UCP → PayOS → Pix to investors |
| After P1 Handler | Any UCP business can add PayOS for LATAM |
| After P1 SDK | SDK supports UCP merchant consumption |
| **Full Integration** | PayOS is standard LATAM settlement for UCP ecosystem |

---

## External Resources

| Resource | URL |
|----------|-----|
| UCP Specification | https://ucp.dev/specification/overview/ |
| UCP GitHub | https://github.com/Universal-Commerce-Protocol/ucp |
| Python SDK | https://github.com/Universal-Commerce-Protocol/python-sdk |
| JavaScript SDK | https://github.com/Universal-Commerce-Protocol/js-sdk |
| Samples | https://github.com/Universal-Commerce-Protocol/samples |
| Conformance Tests | https://github.com/Universal-Commerce-Protocol/conformance |
| Google Integration Guide | https://developers.google.com/merchant/ucp |

---

## Related Documentation

- [Investigation: UCP Integration](../investigations/ucp-integration.md)
- [Epic 17: Multi-Protocol Gateway](./epic-17-multi-protocol.md)
- [Epic 36: SDK & Developer Experience](./epic-36-sdk-developer-experience.md)
- [PRD Master](../PayOS_PRD_Master.md)

---

*Created: January 15, 2026*  
*Status: Planning - Ready for Implementation*
