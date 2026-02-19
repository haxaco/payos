# Epic 54: OpenAI Agentic Checkout Spec (ACS) Integration 🛒

**Status:** 📋 Draft — Research & Planning
**Phase:** 4 (Protocol Integration)
**Priority:** P1
**Estimated Points:** ~55 (TBD after story breakdown)
**Stories:** 0/TBD
**Dependencies:** Epic 43 (UCP), Epic 17 (Multi-Protocol), Epic 36 (SDK), Epic 48 (Connected Accounts), Epic 49 (Protocol Discovery)
**Created:** February 16, 2026
**Spec Version:** `2026-01-30` (latest stable)
**Spec Source:** [github.com/agentic-commerce-protocol/agentic-commerce-protocol](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)

[← Back to Epic List](./README.md)

---

## 1. Executive Summary

The **Agentic Checkout Specification (ACS)** — commonly referred to as the "Agentic Commerce Protocol" or "OpenAI Checkout Spec" — is an open REST API standard ([spec repo](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)) that defines how AI agents (initially ChatGPT, but designed for any agent platform) create, manage, and complete checkout sessions on merchant websites. The spec version `2026-01-30` defines a **merchant-implemented** API surface: the merchant is the server, the agent platform is the client. The merchant remains the **system of record** for orders, payments, taxes, inventory, and compliance. A companion **Delegate Payment API** allows the agent platform to securely tokenize buyer payment credentials (e.g., card data) and pass them to the merchant's own PSP (currently Stripe) for authorization and capture — keeping PCI scope on established rails.

For Sly, supporting ACS is strategically important for two reasons. First, it gives Sly-powered merchants the ability to accept purchases initiated from ChatGPT and other ACS-compatible agent platforms, expanding their addressable market into the fastest-growing commerce channel. Second, it positions Sly as a **multi-protocol commerce hub** — alongside our existing UCP (Google/Shopify) and internal ACP implementations — capable of bridging agent-initiated checkouts into LATAM settlement corridors (Pix, SPEI). By implementing ACS on the merchant side and wiring it into our existing protocol abstraction layer, Sly tenants can onboard to agentic commerce from ChatGPT without building any new infrastructure themselves.

---

## 2. Scope and User Stories

### 2.1 User Stories

**Buyer (end-user shopping via ChatGPT or another ACS agent)**

- As a buyer, I want to select products in a conversational AI interface and have the agent handle checkout on my behalf, so I don't need to navigate merchant websites manually.
- As a buyer, I want to see an authoritative cart state (items, prices, taxes, shipping options, totals) at every step so I can make informed purchase decisions.
- As a buyer, I want to provide my shipping address and select a fulfillment option (standard, express, pickup, digital) conversationally, and see recalculated totals.
- As a buyer, I want to apply discount codes and see whether they were accepted or rejected with a clear reason.
- As a buyer, I want my payment credentials to be handled securely via delegated tokenization so the AI agent never sees my raw card data.
- As a buyer, I want to complete 3D Secure authentication when required, without leaving the agent interface.

**Merchant (Sly tenant operating an e-commerce store)**

- As a merchant, I want to expose my product catalog to AI agents through a standardized checkout API so I can capture sales from ChatGPT users.
- As a merchant, I want to remain the system of record for orders, inventory, tax calculation, and payment processing — ACS should not displace my existing commerce stack.
- As a merchant, I want to control which fulfillment options and payment handlers I expose to agents.
- As a merchant, I want to receive order lifecycle webhooks (order created, updated, shipped, delivered) so my operations team can track agent-originated orders alongside regular orders.

**Sly Platform (our system)**

- As the platform, I want to implement ACS endpoints on behalf of tenants so that any Sly merchant can be ACS-ready without custom development.
- As the platform, I want to map ACS checkout sessions to our canonical data model (shared with UCP and internal ACP) so all protocols flow through a single order pipeline.
- As the platform, I want to support the Delegate Payment API so that agent platforms can tokenize buyer card data and Sly merchants can charge through their configured PSP (Stripe).
- As the platform, I want to emit ACS-compliant webhooks to agent platforms for order lifecycle events.

**Support / Operations**

- As a support agent, I want to view ACS checkout sessions in the Sly dashboard alongside UCP and ACP sessions.
- As an operations team member, I want to see ACS-specific analytics (conversion rate, abandonment, completion time) in the dashboard.
- As a compliance officer, I want to ensure PII from ACS sessions is properly redacted in logs and retained per policy.

### 2.2 Scope Definition

**In Scope (v1):**

- Full ACS session lifecycle: create, update, retrieve, complete, cancel
- Delegate Payment API (`POST /agentic_commerce/delegate_payment`) for tokenized card credentials
- Fulfillment options: shipping, digital, pickup, local delivery
- Discount codes (applied/rejected with reason codes)
- 3D Secure / authentication flows (`authentication_required` status + `authentication_metadata` / `authentication_result`)
- Capability negotiation (payment handlers, intervention capabilities, extensions)
- Idempotency per spec §6 (24-hour key retention, replay semantics, conflict detection)
- Request signing verification (`Signature` + `Timestamp` headers)
- Webhook emission for `order_create` and `order_update` events
- ACS-specific message system (info, warning, error with severity and resolution)
- Multi-tenant support via existing RLS infrastructure
- Protocol registry integration (add `acs` alongside `x402`, `ap2`, `acp`, `ucp`)
- Dashboard visibility for ACS sessions

**Out of Scope (v1):**

- Returns / exchanges / refund workflows (spec explicitly defers this)
- Subscription / recurring billing
- Multi-ship (split shipments to different addresses) — spec supports `fulfillment_groups` but v1 will support single-group only
- Promotions engine (we pass through discount codes to merchant logic; we don't run promotion rules)
- Product discovery / catalog API (ACS assumes items are known by ID; discovery is agent-platform responsibility)
- Fraud modeling (merchant responsibility per spec)
- PSP-specific authorization/capture configuration beyond Stripe
- Affiliate attribution (spec supports `affiliate_attribution` but v1 defers)
- Gift wrap and tip handling (optional Total types; deferred)
- Split payments
- B2B payment terms (`net_15`, `net_30`, etc.)

---

## 3. System Overview / Lifecycle Flow

### 3.1 End-to-End Sequence Narrative

The ACS lifecycle involves three actors: the **Agent Platform** (e.g., ChatGPT), the **Merchant Server** (Sly, acting on behalf of the tenant), and optionally a **Delegate Payment Provider** (Stripe, via the agent platform).

**Phase 1: Product Discovery → Cart Creation**

The agent platform discovers products through its own mechanisms (web browsing, product feeds, MCP tools, etc.). This is outside ACS scope. The agent knows item IDs and quantities before starting the ACS flow.

**Phase 2: Checkout Session Creation**

The agent platform sends `POST /checkout_sessions` with:
- `items[]` — array of `{ id, quantity }` objects
- `buyer` — optional first/last name, email, phone
- `fulfillment_details` — optional name, phone, email, and nested `address` object
- `capabilities` — agent's payment handler support, intervention capabilities, supported extensions

The Sly merchant server:
1. Validates the `API-Version: 2026-01-30` header
2. Validates the `Authorization: Bearer <token>` (merchant-issued API key for the agent platform)
3. Verifies `Idempotency-Key` (required on all POSTs)
4. Optionally verifies `Signature` + `Timestamp` for request integrity
5. Resolves items against tenant's product catalog → computes line-item prices, taxes, discounts
6. Determines available fulfillment options based on address (if provided)
7. Computes session-level totals (subtotal, tax, fulfillment, discount, total)
8. Sets `status` based on completeness:
   - `not_ready_for_payment` — missing required fields (address, buyer info)
   - `ready_for_payment` — all requirements met, can proceed to complete
9. Returns `201 Created` with the **full authoritative cart state** — this is the source of truth

**Source of truth at this point:** The merchant server. Every response contains the complete, recalculated session state. The agent platform MUST NOT cache or compute prices locally.

**Phase 3: Session Updates**

The agent platform sends `POST /checkout_sessions/{id}` with partial updates:
- Changed `items[]` (quantity adjustments, additions, removals)
- Updated `fulfillment_details` (new address triggers tax/shipping recalculation)
- Changed `selected_fulfillment_options[]` (switch from Standard to Express shipping)
- Discount codes via the `discounts.codes[]` extension field

Each update returns the **full authoritative state** with recalculated totals and status. The server may include `messages[]` with warnings (low stock, price changes) or errors (out of stock, invalid address) — each with a `param` JSONPath pointing to the affected field and an optional `resolution` indicating whether the agent can fix it programmatically (`recoverable`), needs buyer input (`requires_buyer_input`), or needs buyer review (`requires_buyer_review`).

**Source of truth:** Still the merchant server. Totals, taxes, and availability are recomputed on every response.

**Phase 4: Completion**

The agent platform sends `POST /checkout_sessions/{id}/complete` with:
- `payment_data` — containing `handler_id`, `instrument` (with `credential.type` and `credential.token` — typically an `spt` Shared Payment Token from the Delegate Payment API), and optional `billing_address`
- `buyer` — final buyer info
- `authentication_result` — required if session status was `authentication_required` (3DS flow)

The Sly merchant server:
1. Validates the session is in `ready_for_payment` (or `authentication_required` if 3DS was triggered)
2. If `authentication_required`, validates `authentication_result` is present
3. Charges the payment via the tenant's PSP using the delegated token
4. Creates an order record
5. Returns `200 OK` with `status: completed` and an `order` object containing `id`, `checkout_session_id`, and `permalink_url`

**Source of truth:** The merchant server holds the canonical order. The agent platform receives a permalink URL for the buyer.

**Phase 5: Order Lifecycle Events via Webhooks**

After completion, the merchant server emits webhooks to the agent platform's registered endpoint:
- `order_create` — immediately after successful completion
- `order_update` — on status changes: `confirmed` → `processing` → `shipped` → `delivered`

Each webhook carries an `Merchant-Signature` HMAC header for verification.

**Phase 5a: Cancellation (alternative path)**

At any point before completion, the agent platform may send `POST /checkout_sessions/{id}/cancel`. The server returns the full session state with `status: canceled`. If the session is already `completed` or `canceled`, the server returns `405 Method Not Allowed`.

### 3.2 State Machine

```
                                    ┌──────────────┐
                                    │  incomplete   │ (initial, items provided but missing data)
                                    └──────┬───────┘
                                           │ (address/buyer added)
                                           ▼
┌───────────────────┐          ┌────────────────────────┐
│ requires_escalation│◄────────│  not_ready_for_payment  │ (validation errors, needs info)
└───────────────────┘          └───────────┬────────────┘
                                           │ (all requirements met)
                                           ▼
                               ┌────────────────────────┐
                               │   ready_for_payment     │
                               └───────────┬────────────┘
                                           │ (complete called)
                            ┌──────────────┼──────────────┐
                            ▼              ▼              ▼
              ┌─────────────────┐  ┌──────────────┐  ┌──────────┐
              │authentication_  │  │complete_in_  │  │ canceled │
              │required (3DS)   │  │progress      │  └──────────┘
              └────────┬────────┘  └──────┬───────┘
                       │ (auth result)     │ (payment succeeds)
                       ▼                   ▼
              ┌──────────────────────────────────┐
              │            completed              │
              └──────────────────────────────────┘
                       │
                       ▼ (expired if TTL hit before complete)
              ┌──────────────┐
              │   expired    │
              └──────────────┘
```

All states except `completed` can transition to `canceled` via the cancel endpoint.

---

## 4. API Surface

### 4.1 Endpoint Table

#### Required Endpoints (Merchant-Implemented — i.e., Sly implements these)

| Method | Path | Purpose | Idempotency | Success Status |
|--------|------|---------|-------------|----------------|
| `POST` | `/checkout_sessions` | Create a new checkout session from items + optional buyer/fulfillment info | `Idempotency-Key` REQUIRED | `201 Created` |
| `POST` | `/checkout_sessions/{id}` | Update an existing session (items, address, fulfillment selection, discounts) | `Idempotency-Key` REQUIRED | `200 OK` |
| `GET` | `/checkout_sessions/{id}` | Retrieve current authoritative session state | N/A (GET) | `200 OK` / `404` |
| `POST` | `/checkout_sessions/{id}/complete` | Finalize checkout with payment data; creates order | `Idempotency-Key` REQUIRED | `200 OK` |
| `POST` | `/checkout_sessions/{id}/cancel` | Cancel a session (if not already completed/canceled) | `Idempotency-Key` REQUIRED | `200 OK` / `405` |

#### Required Endpoint (Delegate Payment — Sly implements if acting as payment delegate)

| Method | Path | Purpose | Idempotency | Success Status |
|--------|------|---------|-------------|----------------|
| `POST` | `/agentic_commerce/delegate_payment` | Tokenize buyer card credentials into a delegated vault token (SPT) with allowance constraints | `Idempotency-Key` REQUIRED | `201 Created` |

#### Webhook Endpoints (Agent Platform Receives — Sly emits these)

| Method | Path (on agent platform) | Purpose | Signature |
|--------|--------------------------|---------|-----------|
| `POST` | Configured webhook URL | `order_create` event after successful checkout completion | `Merchant-Signature` HMAC |
| `POST` | Configured webhook URL | `order_update` event on order status changes (processing, shipped, delivered) | `Merchant-Signature` HMAC |

### 4.2 Common Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization: Bearer <token>` | **REQUIRED** | Merchant-issued API key for the agent platform |
| `Content-Type: application/json` | **REQUIRED** (on request body) | JSON content type |
| `API-Version: 2026-01-30` | **REQUIRED** | Protocol version; server MUST validate |
| `Idempotency-Key: <string>` | **REQUIRED** (all POST) | Max 255 chars; UUID v4 recommended |
| `Accept-Language: <locale>` | RECOMMENDED | e.g., `en-US` for localized content |
| `User-Agent: <string>` | RECOMMENDED | Agent platform identifier |
| `Signature: <base64url>` | RECOMMENDED | Detached signature over canonical JSON |
| `Timestamp: <RFC3339>` | RECOMMENDED | For freshness validation with Signature |
| `Request-Id: <string>` | RECOMMENDED | Correlation ID for tracing |

### 4.3 Common Response Headers

| Header | Description |
|--------|-------------|
| `Idempotency-Key` | Echoed on all POST responses |
| `Request-Id` | Echoed if provided |
| `Idempotent-Replayed: true` | Included when returning a cached idempotent response |
| `Retry-After: <seconds>` | Included on `409 idempotency_in_flight` responses |

### 4.4 Error Shape (Flat — No Envelope)

All errors return a flat JSON object:

```json
{
  "type": "invalid_request",
  "code": "invalid",
  "message": "Quantity must be at least 1",
  "param": "$.line_items[0].quantity"
}
```

**Error `type` values:** `invalid_request`, `processing_error`, `service_unavailable`

**Error `code` values (non-exhaustive):** `invalid`, `missing`, `out_of_stock`, `payment_declined`, `requires_sign_in`, `requires_3ds`, `idempotency_key_required`, `idempotency_conflict`, `idempotency_in_flight`, `unsupported_api_version`, `missing_api_version`

### 4.5 Example JSON Shapes

#### Create Session — Request

```json
{
  "items": [
    { "id": "item_456", "quantity": 2 }
  ],
  "buyer": {
    "first_name": "Maria",
    "last_name": "Silva",
    "email": "maria@example.com"
  },
  "fulfillment_details": {
    "name": "Maria Silva",
    "phone_number": "5511999887766",
    "email": "maria@example.com",
    "address": {
      "name": "Maria Silva",
      "line_one": "Av. Paulista, 1000",
      "city": "São Paulo",
      "state": "SP",
      "country": "BR",
      "postal_code": "01310-100"
    }
  },
  "capabilities": {
    "payment": {
      "handlers": [
        {
          "id": "handler_1",
          "name": "dev.acp.tokenized.card",
          "version": "2026-01-30",
          "requires_delegate_payment": true,
          "psp": "stripe"
        }
      ]
    },
    "interventions": {
      "supported": ["3ds", "address_verification"],
      "display_context": "webview"
    },
    "extensions": ["discount"]
  }
}
```

#### Create Session — Response (`201 Created`)

```json
{
  "id": "cs_abc123",
  "protocol": { "version": "2026-01-30" },
  "status": "ready_for_payment",
  "currency": "usd",
  "buyer": {
    "first_name": "Maria",
    "last_name": "Silva",
    "email": "maria@example.com"
  },
  "line_items": [
    {
      "id": "li_001",
      "item": { "id": "item_456", "name": "Wireless Headphones", "unit_amount": 7999 },
      "quantity": 2,
      "name": "Wireless Headphones",
      "unit_amount": 7999,
      "availability_status": "in_stock",
      "totals": [
        { "type": "subtotal", "display_text": "Subtotal", "amount": 15998 },
        { "type": "tax", "display_text": "Tax", "amount": 1440 },
        { "type": "total", "display_text": "Total", "amount": 17438 }
      ]
    }
  ],
  "fulfillment_options": [
    {
      "type": "shipping", "id": "ship_standard", "title": "Standard Shipping",
      "carrier": "USPS",
      "earliest_delivery_time": "2026-02-20T00:00:00Z",
      "latest_delivery_time": "2026-02-24T23:59:59Z",
      "totals": [{ "type": "fulfillment", "display_text": "Shipping", "amount": 599 }]
    }
  ],
  "selected_fulfillment_options": [
    { "type": "shipping", "option_id": "ship_standard", "item_ids": ["li_001"] }
  ],
  "totals": [
    { "type": "items_base_amount", "display_text": "Items total", "amount": 15998 },
    { "type": "subtotal", "display_text": "Subtotal", "amount": 15998 },
    { "type": "tax", "display_text": "Sales Tax", "amount": 1440 },
    { "type": "fulfillment", "display_text": "Shipping", "amount": 599 },
    { "type": "total", "display_text": "Total", "amount": 18037 }
  ],
  "capabilities": {
    "payment": {
      "handlers": [{
        "id": "handler_stripe_card",
        "name": "dev.acp.tokenized.card",
        "version": "2026-01-30",
        "spec": "https://acp.dev/handlers/tokenized.card",
        "requires_delegate_payment": true,
        "requires_pci_compliance": false,
        "psp": "stripe",
        "config_schema": "https://acp.dev/schemas/handlers/tokenized.card/config.json",
        "instrument_schemas": ["https://acp.dev/schemas/handlers/tokenized.card/instrument.json"],
        "config": { "merchant_id": "acct_sly_tenant_123", "psp": "stripe" }
      }]
    },
    "interventions": { "supported": ["3ds"] },
    "extensions": [
      { "name": "discount@2026-01-30", "extends": ["$.CheckoutSession.discounts"] }
    ]
  },
  "messages": [],
  "links": [
    { "type": "terms_of_use", "url": "https://merchant.example.com/terms" },
    { "type": "return_policy", "url": "https://merchant.example.com/returns" }
  ]
}
```

#### Update Session — Request (change fulfillment + add discount)

```json
{
  "selected_fulfillment_options": [
    { "type": "shipping", "option_id": "ship_express", "item_ids": ["li_001"] }
  ],
  "discounts": {
    "codes": ["SAVE20"]
  }
}
```

#### Complete Session — Request

```json
{
  "buyer": {
    "first_name": "Maria",
    "last_name": "Silva",
    "email": "maria@example.com",
    "phone_number": "5511999887766"
  },
  "payment_data": {
    "handler_id": "handler_stripe_card",
    "instrument": {
      "type": "card",
      "credential": {
        "type": "spt",
        "token": "spt_1234567890abcdef"
      }
    },
    "billing_address": {
      "name": "Maria Silva",
      "line_one": "Av. Paulista, 1000",
      "city": "São Paulo",
      "state": "SP",
      "country": "BR",
      "postal_code": "01310-100"
    }
  }
}
```

#### Complete Session — Response (`200 OK`)

Response contains the full session state with `"status": "completed"` plus:

```json
{
  "order": {
    "id": "ord_xyz789",
    "checkout_session_id": "cs_abc123",
    "order_number": "ORD-2026-0001",
    "permalink_url": "https://merchant.example.com/orders/ord_xyz789",
    "status": "confirmed",
    "estimated_delivery": {
      "earliest": "2026-02-18T00:00:00Z",
      "latest": "2026-02-20T23:59:59Z"
    },
    "confirmation": {
      "confirmation_number": "ORD-2026-0001",
      "confirmation_email_sent": true,
      "receipt_url": "https://merchant.example.com/receipts/ord_xyz789"
    },
    "support": {
      "email": "support@merchant.example.com",
      "help_center_url": "https://merchant.example.com/help"
    }
  }
}
```

#### Webhook Event — `order_create`

```json
{
  "type": "order_create",
  "id": "evt_001",
  "created_at": "2026-02-16T14:30:00Z",
  "data": {
    "order_id": "ord_xyz789",
    "checkout_session_id": "cs_abc123",
    "status": "confirmed",
    "currency": "usd",
    "total_amount": 18037,
    "permalink_url": "https://merchant.example.com/orders/ord_xyz789"
  }
}
```

#### Webhook Event — `order_update` (shipped)

```json
{
  "type": "order_update",
  "id": "evt_002",
  "created_at": "2026-02-18T10:00:00Z",
  "data": {
    "order_id": "ord_xyz789",
    "checkout_session_id": "cs_abc123",
    "status": "shipped",
    "tracking": {
      "carrier": "USPS",
      "tracking_number": "9400111899223456789012",
      "tracking_url": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223456789012"
    }
  }
}
```

---

## 5. Security & Compliance Requirements

### 5.1 Authentication

- **Bearer Token:** `Authorization: Bearer <token>` is REQUIRED on all requests ([RFC §3.1](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.agentic_checkout.md#31-common-requirements)). Sly will issue per-tenant API keys to agent platforms (similar to existing `pk_test_*` / `pk_live_*` keys).
- **API Version:** `API-Version: 2026-01-30` is REQUIRED. Sly MUST validate this header and return `400 Bad Request` with `supported_versions` array if missing or unsupported.

### 5.2 Signature Verification

- The spec RECOMMENDS (not REQUIRES) `Signature` and `Timestamp` headers on requests ([RFC §7](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.agentic_checkout.md#7-security-considerations)).
- `Signature` is a base64url-encoded detached signature over canonical JSON of the request body.
- `Timestamp` is an RFC 3339 timestamp; server SHOULD verify within a bounded clock-skew window (recommended: ±5 minutes).
- **Sly implementation:** SHOULD support signature verification from day one; signature algorithms to be published out-of-band per spec.

### 5.3 PII Handling

- **Addresses, emails, phone numbers:** Stored in `acs_checkout_sessions` table with tenant-scoped RLS. Subject to existing Sly data retention policies.
- **Logging redaction:** Full card numbers, CVCs MUST NOT appear in logs per PCI DSS. Addresses and emails SHOULD be redacted in production logs (show only country/postal code).
- **Retention:** Checkout session data retained per tenant configuration (default 90 days for completed, 30 days for abandoned/canceled).

### 5.4 Replay Protection & Idempotency

Per [RFC §6](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.agentic_checkout.md#6-idempotency-retries--concurrency):
- `Idempotency-Key` REQUIRED on all POST requests. Missing → `400` with `code: "idempotency_key_required"`.
- Same key + identical body → return cached response with `Idempotent-Replayed: true` header.
- Same key + different body → `422` with `code: "idempotency_conflict"` (permanent error).
- Same key + original still in-flight → `409` with `code: "idempotency_in_flight"` + `Retry-After` header.
- Keys scoped to authenticated identity + endpoint path.
- 5xx responses MUST NOT be cached against the key.
- Keys retained for at least 24 hours.

### 5.5 Rate Limiting

- Spec does not mandate specific rate limits, but Sly will apply existing rate limiting: 100 req/min per IP for general API, stricter limits for auth endpoints.
- Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` included per existing Sly middleware.

### 5.6 Transport Security

- All requests MUST use HTTPS/TLS 1.3 ([RFC §7](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.agentic_checkout.md#7-security-considerations)).

### 5.7 Compliance Posture

- The merchant (Sly tenant) remains the **merchant of record**. Payments, taxes, and compliance are merchant responsibility.
- The Delegate Payment API handles PCI-sensitive card data. Sly will use Stripe's existing tokenization to avoid expanding our PCI scope.
- Webhook signature verification uses HMAC (`Merchant-Signature`) — Sly MUST sign all outbound webhooks.

---

## 6. Payments Model

### 6.1 Delegated Payments — Conceptual Model

The ACS spec uses a **delegated payment** model: the agent platform collects the buyer's payment credentials (e.g., card data) in its own secure UI, then tokenizes them via the Delegate Payment API into a **Shared Payment Token (SPT)**. This SPT is a one-time, allowance-constrained token that the merchant can use with their own PSP (Stripe) to authorize and capture the payment.

The flow:

1. Agent platform collects card data in its secure UI (ChatGPT's payment form)
2. Agent platform calls `POST /agentic_commerce/delegate_payment` with the card details, an `allowance` (max amount, currency, expiry, checkout session ID), and `risk_signals`
3. The delegate payment server (Stripe) tokenizes the card and returns an SPT ID (`vt_01J8Z...`)
4. Agent platform passes this SPT to the merchant in `POST /checkout_sessions/{id}/complete` as `payment_data.instrument.credential.token`
5. Merchant's server uses the SPT with their Stripe account to create a PaymentIntent and capture funds
6. The SPT is single-use and expires per the allowance constraints

### 6.2 Integrations Required

- **Stripe:** Primary PSP integration. Sly tenants already have Stripe accounts. The SPT token is used with Stripe's `PaymentIntent` API via the tenant's Stripe account.
- **3D Secure:** When Stripe requires 3DS, the merchant server sets `status: "authentication_required"` with `authentication_metadata` (acquirer details, directory server). The agent platform handles the 3DS challenge and returns `authentication_result` in the complete request.

### 6.3 Merchant of Record & Disputes

- The **Sly tenant** (merchant) is the merchant of record for all ACS transactions.
- Funds are captured into the tenant's Stripe account — Sly does not intermediate the payment flow.
- Disputes and chargebacks are handled by the tenant via their existing Stripe Dashboard.
- Refunds are out of scope for ACS v1 but will be merchant-initiated via their PSP.

### 6.4 What We Must Store vs. Must Not Store

**Must store:** Checkout session state (items, totals, addresses, status), order records, SPT token reference (not the raw card data), payment intent IDs, webhook delivery records.

**Must NOT store:** Raw card numbers (PAN), CVCs, full card expiry details, raw SPT card data. The SPT token ID is safe to store; it is a reference, not a credential.

---

## 7. Webhook / Eventing Model

### 7.1 Event Types

Per the [Agentic Checkout Webhooks OAS](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/spec/2026-01-30/openapi/openapi.agentic_checkout_webhook.yaml):

| Event Type | Trigger | Required Fields |
|------------|---------|-----------------|
| `order_create` | Successful checkout completion | `order_id`, `checkout_session_id`, `status`, `currency`, `total_amount`, `permalink_url` |
| `order_update` | Order status change (processing, shipped, delivered) | `order_id`, `checkout_session_id`, `new_status`, tracking info (if shipped) |

### 7.2 Delivery Guarantees

- **At-least-once delivery:** Sly MUST retry failed webhook deliveries.
- **Retry strategy:** Exponential backoff — 1s, 5s, 30s, 2m, 15m, 1h, 6h — up to 7 retries over 24 hours (aligns with Sly's existing webhook infrastructure).
- **Ordering:** Webhooks are NOT guaranteed to arrive in order. Agent platforms should use the `created_at` timestamp and `order.status` to determine the latest state.
- **Idempotency on receiver side:** Each webhook event carries a unique `id` field. Agent platforms should deduplicate by event ID.

### 7.3 Signature Verification

- All webhooks include `Merchant-Signature` header containing an HMAC-SHA256 digest over the request body.
- The signing key is shared out-of-band during agent platform onboarding.
- Agent platforms MUST verify the signature before processing the event.

### 7.4 Correlation Fields

| Field | Purpose |
|-------|---------|
| `event.id` | Unique event identifier for deduplication |
| `event.data.checkout_session_id` | Links event to the checkout session |
| `event.data.order_id` | Links event to the order |
| Fulfillment tracking fields | Carrier, tracking number, tracking URL |

---

## 8. Edge Cases & Failure Modes

### 8.1 Inventory Changes Mid-Checkout

- If an item goes out of stock between session creation and completion, the server MUST include a message with `type: "error"`, `code: "out_of_stock"`, `param: "$.line_items[N]"` in the update/complete response.
- Server SHOULD set `status: "not_ready_for_payment"` and optionally set `availability_status: "out_of_stock"` on the affected line item.
- The agent can respond by removing the item and retrying.

### 8.2 Tax/Shipping Recalculation

- Every update that changes the address or fulfillment selection triggers a full recalculation of taxes and shipping costs.
- The response always contains the authoritative totals — the agent platform MUST NOT cache stale totals.
- If tax calculation fails (e.g., tax service unavailable), server SHOULD return `status: "not_ready_for_payment"` with a `processing_error` message.

### 8.3 Partial Failures and Retries

- Idempotency keys ensure safe retries. Same key + same body = same response.
- If payment authorization fails during complete, server returns a session with `status: "not_ready_for_payment"` and a message with `code: "payment_declined"`.
- 5xx errors are NOT cached against the idempotency key — retrying is always safe.

### 8.4 Timeout Behavior

- Sessions have no explicit server-side TTL in the spec (unlike UCP's 6-hour default). **Assumption:** Sly will implement a configurable session TTL (default 24 hours) after which sessions transition to `expired`.
- The Delegate Payment API tokens have an `allowance.expires_at` — typically 15 minutes. If the SPT expires before the complete call, the agent platform must re-tokenize.

### 8.5 User Abandons Checkout

- Abandoned sessions remain in `not_ready_for_payment` or `ready_for_payment` status until they expire.
- The agent platform MAY call cancel explicitly.
- Sly SHOULD run a background job to expire stale sessions (similar to existing UCP expiration logic).

### 8.6 Duplicate Complete Calls

- If complete is called with the same `Idempotency-Key` and same body, the cached response is returned (no double-charge).
- If complete is called with a DIFFERENT `Idempotency-Key` on an already-completed session, server returns `405 Method Not Allowed` or an error with `code: "conflict"`.

### 8.7 Address Validation Failures

- Server MAY validate addresses and return messages with `code: "invalid"`, `param: "$.fulfillment_details.address"`.
- The `resolution: "requires_buyer_input"` hint tells the agent to ask the buyer for a corrected address.

### 8.8 Fraud / Risk Signals

- The Delegate Payment API requires `risk_signals[]` (currently only `card_testing` type with a score and action).
- Sly passes these through to Stripe for risk assessment. Stripe's fraud rules apply — Sly does not run independent fraud models in v1.
- **Assumption:** Additional risk signal types may be added in future spec versions.

---

## 9. Conformance / Certification Checklist

### 9.1 Contract Tests (per endpoint)

- [ ] `POST /checkout_sessions` returns `201` with full authoritative cart state
- [ ] `POST /checkout_sessions` returns all required fields: `id`, `status`, `currency`, `line_items[]`, `totals[]`
- [ ] `POST /checkout_sessions` rejects missing `API-Version` with `400` + `supported_versions`
- [ ] `POST /checkout_sessions` rejects missing `Idempotency-Key` with `400` + `code: "idempotency_key_required"`
- [ ] `POST /checkout_sessions/{id}` returns `200` with recalculated state
- [ ] `GET /checkout_sessions/{id}` returns `200` or `404`
- [ ] `POST /checkout_sessions/{id}/complete` returns `200` with `status: "completed"` and `order` object
- [ ] `POST /checkout_sessions/{id}/complete` returns `order.permalink_url` (REQUIRED per spec)
- [ ] `POST /checkout_sessions/{id}/cancel` returns `200` with `status: "canceled"`
- [ ] `POST /checkout_sessions/{id}/cancel` returns `405` if already completed/canceled
- [ ] `POST /agentic_commerce/delegate_payment` returns `201` with `id` and `created`

### 9.2 Webhook Tests

- [ ] `order_create` webhook emitted after successful completion
- [ ] `order_update` webhook emitted on status change
- [ ] Webhook includes valid `Merchant-Signature` HMAC
- [ ] Webhook retried on delivery failure (up to 7 times with exponential backoff)
- [ ] Duplicate webhook events have the same event `id` (idempotency)

### 9.3 Idempotency Tests

- [ ] Same `Idempotency-Key` + same body → returns cached response with `Idempotent-Replayed: true`
- [ ] Same `Idempotency-Key` + different body → `422` with `code: "idempotency_conflict"`
- [ ] Same `Idempotency-Key` + in-flight → `409` with `code: "idempotency_in_flight"` + `Retry-After`
- [ ] Missing `Idempotency-Key` → `400` with `code: "idempotency_key_required"`
- [ ] 5xx responses NOT cached (retry produces fresh execution)
- [ ] Keys retained for at least 24 hours

### 9.4 Error Taxonomy Tests

- [ ] All errors are flat JSON: `{ type, code, message, param? }`
- [ ] `type` is one of: `invalid_request`, `processing_error`, `service_unavailable`
- [ ] `param` uses RFC 9535 JSONPath when applicable
- [ ] Out-of-stock returns `code: "out_of_stock"` with `param` pointing to affected line item
- [ ] Invalid address returns `code: "invalid"` with `param: "$.fulfillment_details.address"`
- [ ] Payment declined returns `code: "payment_declined"`
- [ ] 3DS required returns `status: "authentication_required"` + `authentication_metadata`
- [ ] Missing `authentication_result` on complete → `400` with `code: "requires_3ds"`

### 9.5 Performance Benchmarks

| Operation | Target p50 | Target p99 |
|-----------|-----------|-----------|
| Create session | < 500ms | < 2s |
| Update session | < 300ms | < 1.5s |
| Retrieve session | < 100ms | < 500ms |
| Complete session | < 2s | < 5s (includes PSP call) |
| Cancel session | < 200ms | < 1s |
| Delegate payment | < 1s | < 3s (includes Stripe tokenization) |

### 9.6 Observability Requirements

- [ ] All endpoints emit structured logs with `request_id`, `session_id`, `tenant_id`, `status`, `duration_ms`
- [ ] Metrics: request count, latency histogram, error rate by code, session conversion funnel
- [ ] Traces: OpenTelemetry spans for session lifecycle (create → update(s) → complete)
- [ ] Alerts: p99 latency > 5s, error rate > 5%, webhook delivery failure rate > 10%
- [ ] Dashboard: ACS sessions visible alongside UCP/ACP in unified view

---

## 10. Integration Strategy for Sly

### 10.1 Protocol Abstraction Layer

Sly already has a protocol registry (`apps/api/src/services/protocol-registry/protocols.ts`) with `x402`, `ap2`, `acp`, and `ucp`. ACS will be registered as a new protocol `acs` (or `openai_checkout`).

**Canonical Objects (shared across protocols):**

| Canonical Object | ACS Mapping | UCP Mapping | Internal ACP Mapping |
|-----------------|-------------|-------------|----------------------|
| `Product` | `Item` (id, name, unit_amount) | Part of `line_items` JSONB | `CheckoutItem` |
| `Cart` / `CheckoutSession` | `CheckoutSession` (full response) | `UCPCheckoutSession` | `ACPCheckout` |
| `LineItem` | `LineItem` (with totals array) | JSONB array in session | `acp_checkout_items` row |
| `Order` | `Order` (id, permalink_url, status) | `UCPOrder` | Transfer record |
| `FulfillmentOption` | Shipping/Digital/Pickup/LocalDelivery | Not modeled (shipping_address only) | Not modeled |
| `PaymentInstrument` | `PaymentData` (handler_id, instrument, credential) | `payment_instruments` JSONB | `shared_payment_token` |
| `Total` | `Total` (typed: subtotal, tax, fulfillment, discount, total) | `totals` JSONB array | Computed fields |
| `Message` | `Message` (info/warning/error with code, param, resolution) | `messages` JSONB array | N/A |

**Adapter Pattern:**

```
ACS Request → ACS Adapter → Canonical CheckoutSession → Business Logic → Canonical Response → ACS Adapter → ACS Response
UCP Request → UCP Adapter → Canonical CheckoutSession → Business Logic → Canonical Response → UCP Adapter → UCP Response
```

This ensures that tax calculation, inventory checks, and payment processing share a single code path regardless of protocol.

### 10.2 Mapping: ACS → Sly Canonical Model

| ACS Field | Sly Canonical | Notes |
|-----------|---------------|-------|
| `id` (session) | `checkout_session_id` | ACS uses opaque string; Sly uses UUID internally, maps via lookup |
| `status` | `status` | Map: `not_ready_for_payment` → `incomplete`, `ready_for_payment` → `ready_for_complete`, `completed` → `completed`, `canceled` → `canceled`, `authentication_required` → `requires_escalation` |
| `currency` | `currency` | Direct mapping (ACS uses lowercase ISO 4217) |
| `line_items[].totals[]` | Computed from `line_items` + tax service | ACS uses `Total[]` array with typed amounts; Sly computes similarly |
| `fulfillment_details` | `shipping_address` + `buyer` | ACS nests address inside `fulfillment_details`; Sly stores separately |
| `fulfillment_options[]` | New field needed | ACS has rich fulfillment model; UCP/ACP don't have this |
| `selected_fulfillment_options[]` | New field needed | Maps fulfillment option → line items |
| `capabilities.payment.handlers[]` | `payment_config.handlers` (UCP-compatible) | ACS handlers are more detailed (config_schema, instrument_schemas) |
| `messages[]` | `messages` JSONB | ACS messages include `resolution` field not present in UCP |
| `discounts` (extension) | New field needed | ACS has full discount model (applied, rejected, allocations) |
| `order` | `order_id` FK | ACS returns order inline on complete; Sly creates separate order record |
| `authentication_metadata` | New field needed | 3DS-specific; not present in UCP/ACP |

### 10.3 Minimal Data Model Additions

**New table: `acs_checkout_sessions`**

```sql
CREATE TABLE acs_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  external_id TEXT NOT NULL,                    -- ACS session ID exposed to agent
  api_version TEXT NOT NULL DEFAULT '2026-01-30',
  status TEXT NOT NULL DEFAULT 'incomplete',    -- ACS status enum
  currency TEXT NOT NULL,
  buyer JSONB,                                  -- { first_name, last_name, email, phone }
  fulfillment_details JSONB,                    -- { name, phone, email, address }
  line_items JSONB NOT NULL DEFAULT '[]',       -- Array of LineItem objects
  fulfillment_options JSONB DEFAULT '[]',       -- Available options
  selected_fulfillment_options JSONB DEFAULT '[]',
  fulfillment_groups JSONB DEFAULT '[]',
  totals JSONB NOT NULL DEFAULT '[]',           -- Array of Total objects
  messages JSONB DEFAULT '[]',                  -- Info/warning/error messages
  capabilities JSONB,                           -- Negotiated capabilities
  authentication_metadata JSONB,               -- 3DS metadata if required
  discounts JSONB,                             -- Applied/rejected discounts (extension)
  links JSONB DEFAULT '[]',                    -- Policy links
  payment_data JSONB,                          -- Payment handler + instrument on complete
  order_id UUID REFERENCES acs_orders(id),
  agent_platform_id TEXT,                      -- Identifies the calling agent platform
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  UNIQUE(tenant_id, external_id)
);

-- RLS policy
ALTER TABLE acs_checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON acs_checkout_sessions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**New table: `acs_orders`**

```sql
CREATE TABLE acs_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  checkout_session_id UUID NOT NULL REFERENCES acs_checkout_sessions(id),
  external_order_id TEXT NOT NULL,              -- Merchant-facing order number
  status TEXT NOT NULL DEFAULT 'confirmed',     -- confirmed, processing, shipped, delivered
  permalink_url TEXT NOT NULL,
  currency TEXT NOT NULL,
  total_amount INTEGER NOT NULL,                -- Minor units
  line_items JSONB NOT NULL,
  buyer JSONB,
  fulfillment_details JSONB,
  payment_intent_id TEXT,                       -- Stripe PaymentIntent ID
  confirmation JSONB,                           -- { confirmation_number, email_sent, receipt_url }
  support JSONB,                                -- { email, phone, hours, help_center_url }
  estimated_delivery JSONB,                     -- { earliest, latest }
  tracking JSONB,                               -- { carrier, tracking_number, tracking_url }
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, external_order_id)
);
```

**New table: `acs_idempotency_keys`**

```sql
CREATE TABLE acs_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  identity_id TEXT NOT NULL,                   -- Authenticated caller
  endpoint_path TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_body_hash TEXT NOT NULL,             -- SHA-256 of canonical JSON
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  in_flight BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE(tenant_id, identity_id, endpoint_path, idempotency_key)
);
```

### 10.4 Multi-Tenant Considerations

- All ACS tables include `tenant_id` with RLS policies (consistent with existing pattern).
- Agent platform API keys are tenant-scoped: each tenant issues keys to their agent platform partners.
- ACS endpoints are mounted under the tenant's API namespace; the auth middleware resolves tenant from the Bearer token.
- Session IDs are globally unique (UUID) but queries always filter by `tenant_id`.

### 10.5 Backward Compatibility Plan

- ACS is a **new protocol addition**, not a replacement. Existing ACP and UCP flows are unaffected.
- The protocol registry gains a new entry; existing `ProtocolId` type union expands to include `'acs'`.
- Transfers linked to ACS sessions use `protocol_metadata.protocol = 'acs'` (same pattern as ACP/UCP).
- Dashboard adds an ACS tab in the existing multi-protocol view (`all-protocols-overview.tsx`).
- API routes are mounted at `/v1/acs/checkout_sessions` (Sly's namespace) — but the tenant can also expose the spec-native paths (`/checkout_sessions`) via a configurable route prefix for direct ChatGPT integration.

---

## 11. Open Questions

### 11.1 Spec Ambiguities to Confirm

1. **Session expiration:** The ACS spec does not define a mandatory session TTL. **Assumption:** Sly will use 24 hours. Should we make this configurable per tenant? Per agent platform?

2. **Webhook event schema:** The webhook OAS defines `order_create` and `order_update`, but the detailed payload schema for `order_update` is minimal. We need to confirm the exact fields expected for status transitions (processing, shipped, delivered) with tracking info.

3. **Multi-currency presentment:** The spec includes `presentment_currency`, `exchange_rate`, and `exchange_rate_timestamp` on CheckoutSessionBase. It's unclear if these are required when settlement and presentment currencies differ, or purely optional. **Assumption:** Optional for v1.

4. **Extension negotiation:** The spec supports extensions (e.g., `discount@2026-01-30`) via capabilities negotiation. The extension registry mechanism (who publishes extension schemas, how they are discovered) is not fully documented. **Assumption:** We support the `discount` extension only in v1.

5. **Payment handler discovery:** The spec mentions `config_schema` and `instrument_schemas` URLs on PaymentHandler objects. Are agent platforms expected to fetch and validate against these schemas at runtime? **Assumption:** Sly publishes these URLs but does not enforce schema validation on the agent platform side.

6. **Delegate Payment provider:** The delegate payment RFC is tightly coupled to Stripe (card-only, SPT tokens). Will the spec expand to support other PSPs or payment methods (e.g., wallets, BNPL)? This affects how we design the payment handler abstraction.

7. **`requires_escalation` vs `authentication_required`:** Both appear in the status enum. The distinction between these two states (when does escalation apply vs authentication?) needs clarification. **Assumption:** `authentication_required` is specifically for 3DS; `requires_escalation` is for other agent-to-human handoffs.

8. **Fulfillment groups vs. selected_fulfillment_options:** The spec includes both `fulfillment_groups[]` and `selected_fulfillment_options[]`. The relationship between these (are groups auto-generated from selections? Can they diverge?) needs clarification. **Assumption:** v1 supports single-group only.

9. **Rate limiting response format:** The spec uses error `type: "invalid_request"` for most errors. Should rate-limited requests use `type: "rate_limit_exceeded"` (matching the Delegate Payment RFC) or the standard ACS error types?

10. **Affiliate attribution:** The spec mentions `affiliate_attribution` with `touchpoint: "first"` for multi-touch attribution. Is this expected in v1 or future? **Assumption:** Deferred to v2.

### 11.2 Sly-Specific Questions

11. **Route namespace:** Should ACS endpoints live at `/v1/acs/checkout_sessions` (Sly-namespaced) or at the spec-native `/checkout_sessions` path? The latter is what ChatGPT expects directly, but the former fits our multi-protocol pattern. **Recommendation:** Support both via configurable route prefix.

12. **Existing ACP overlap:** Our current "ACP" implementation (`/v1/acp/checkouts`) uses Stripe SharedPaymentTokens similarly. Should we migrate the existing ACP to ACS-compliant endpoints, or keep them as separate protocols? **Recommendation:** Keep separate; ACS is the open standard, our internal ACP is Sly-specific.

13. **Payment handler for LATAM:** Can Sly register as an ACS payment handler (like we did for UCP with `com.payos.latam_settlement`)? The spec's handler model supports custom handlers via `config_schema` + `instrument_schemas`. This would allow ChatGPT users to pay with Pix/SPEI through Sly merchants. **Needs investigation** of whether ChatGPT's agent supports non-Stripe payment handlers.

14. **Tenant onboarding:** What's the minimum setup for a Sly tenant to become ACS-ready? They need: product catalog with item IDs, Stripe account (for delegate payment), webhook endpoint configured for the agent platform. Should we auto-provision this for existing tenants?

---

## References

- **ACS OpenAPI Spec (v2026-01-30):** [openapi.agentic_checkout.yaml](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/spec/2026-01-30/openapi/openapi.agentic_checkout.yaml)
- **ACS Webhook OpenAPI:** [openapi.agentic_checkout_webhook.yaml](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/spec/2026-01-30/openapi/openapi.agentic_checkout_webhook.yaml)
- **Delegate Payment OpenAPI:** [openapi.delegate_payment.yaml](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/spec/2026-01-30/openapi/openapi.delegate_payment.yaml)
- **ACS RFC (Checkout):** [rfc.agentic_checkout.md](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.agentic_checkout.md)
- **Delegate Payment RFC:** [rfc.delegate_payment.md](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.delegate_payment.md)
- **Sly Master PRD (v1.22):** [PayOS_PRD_Master.md](../PayOS_PRD_Master.md)
- **Sly Epic 43 (UCP Integration):** [epic-43-ucp-integration.md](./epic-43-ucp-integration.md)
- **Sly Epic 48 (Connected Accounts):** [epic-48-connected-accounts.md](./epic-48-connected-accounts.md)
- **Sly Epic 49 (Protocol Discovery):** [epic-49-protocol-discovery.md](./epic-49-protocol-discovery.md)
- **Sly Protocol Registry:** `apps/api/src/services/protocol-registry/protocols.ts`
- **Sly ACP Implementation:** `apps/api/src/routes/acp.ts`
- **Sly UCP Implementation:** `apps/api/src/routes/ucp-checkout.ts`

---

*Created: February 16, 2026*
*Status: Draft — Research & Planning*
*Author: Generated from ACS spec analysis*
