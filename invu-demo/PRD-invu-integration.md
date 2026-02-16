# Epic: Invu POS Integration — Agent-Powered Commerce for Central American POS

**Status:** Not Started
**Phase:** 4 (Customer Validation)
**Priority:** P0
**Total Points:** 18
**Stories:** 0/5 Complete
**Target Demo Date:** February 16, 2026

[← Back to invu-demo/](./README.md)

---

## Overview

Invu POS is the leading point-of-sale platform in Panama's restaurant and hospitality industry, expanding across Central America (Costa Rica, Guatemala). They serve restaurants, bars, hotels, retail stores, and wholesale operations. Their client base includes international franchises (Krispy Kreme) and high-profile local establishments (Maito, Café Unido, Hotel Tantalo).

This epic delivers the integration layer that positions Sly as Invu POS's settlement infrastructure for AI-powered commerce. The core use case: **an AI agent can discover any Invu POS merchant, browse their catalog, place an order, and complete payment autonomously** — with Invu POS appearing as the payment processor throughout the flow.

**Strategic Value:**
- Invu POS becomes the first POS platform in LATAM with native agent commerce support
- Sly gains distribution across 100s of Invu POS merchants
- Every Invu POS merchant becomes agent-discoverable via `/.well-known/ucp`

**Client Contact:** Rafi Turgman, Managing Partner and Co-Founder

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| Invu Payment Handler | ✅ Yes | `sly.ucp` | P0 | New handler in registry |
| Merchant Catalog API | ⚠️ Types | Types only | P1 | Future endpoint, demo uses seed data |
| Demo Seed Script | ❌ No | - | - | Internal tooling |
| Batch Ordering Flow | ❌ No | - | - | Uses existing `ucp_batch_checkout` |

---

## Stories

### Story 1: Invu Payment Handler Registration

**Points:** 5 | **Status:** Not Started

Register an `invu` payment handler in the UCP payment handler registry so that Invu POS appears as a real payment processor in the `/.well-known/ucp` discovery profile and can process checkouts.

**File to create:** `apps/api/src/services/ucp/payment-handlers/invu.ts`

**Requirements:**

1. Implement the `PaymentHandler` interface:
   ```typescript
   {
     id: 'invu',
     name: 'com.invupos.payments',
     version: '2026-02-01',
     supportedTypes: ['invu_pos', 'card', 'cash'],
     supportedCurrencies: ['USD', 'PAB'],
   }
   ```

2. Implement all four required methods:
   - `acquireInstrument()` — Create an Invu POS payment instrument. Store in the existing in-memory `instrumentStore` pattern (same as `payos.ts`). Instrument type should be `invu_pos`. Generate IDs with prefix `pi_invu_`.
   - `processPayment()` — Process payment. For the demo, use the same in-memory pattern as `payos.ts`. Generate payment IDs with prefix `pay_invu_` and settlement IDs with prefix `stl_invu_`.
   - `refundPayment()` — Handle refund requests. In-memory implementation.
   - `getPaymentStatus()` — Return payment status from in-memory store.

3. Register the handler in `apps/api/src/services/ucp/payment-handlers/index.ts`:
   - Import `invuHandler` from `./invu`
   - Add `registerHandler(invuHandler)` in `initializeHandlers()`

4. Update `/.well-known/ucp` profile generation in `apps/api/src/routes/well-known-ucp.ts`:
   - Add `invu` to the `payment.handlers` array with:
     ```json
     {
       "id": "invu",
       "name": "com.invupos.payments",
       "version": "2026-02-01",
       "spec": "https://docs.invupos.com/payments/api",
       "config_schema": "https://api.invupos.com/schemas/handler_config.json",
       "instrument_schemas": [
         "https://api.invupos.com/schemas/pos_instrument.json"
       ],
       "supported_currencies": ["USD", "PAB"],
       "supported_corridors": [
         {
           "id": "usd-usd-invu",
           "name": "USD via Invu POS",
           "source_currency": "USD",
           "destination_currency": "USD",
           "destination_country": "PA",
           "rail": "invu_pos",
           "estimated_settlement": "instant"
         },
         {
           "id": "usd-pab-invu",
           "name": "USD to PAB via Invu POS",
           "source_currency": "USD",
           "destination_currency": "PAB",
           "destination_country": "PA",
           "rail": "invu_pos",
           "estimated_settlement": "instant"
         }
       ]
     }
     ```

   Note: The well-known profile should dynamically include ALL registered handlers (currently it's hardcoded to only show `payos_latam`). Refactor `generateUCPProfile()` to call `getAllHandlers()` from the registry and build the handlers array dynamically. This way any newly registered handler (like `invu`) automatically appears in discovery.

**Acceptance Criteria:**
- `GET /.well-known/ucp` returns `invu` in `payment.handlers[]`
- UCP checkouts with `handler: "invu"` can be created and completed
- Payment instruments with `handler: "invu"` are accepted
- Existing `payos_latam` handler continues to work unchanged

---

### Story 2: Merchant Catalog Seed Data & Future API Design

**Points:** 3 | **Status:** Not Started

For the demo, merchant catalogs come from CSV seed data (see `invu-demo/seed-data/`). This story also documents the future API design for when Invu POS provides a live catalog feed.

**Demo Implementation (seed data):**
- Merchants: `invu-demo/seed-data/merchants.csv` (12 merchants)
- Products: `invu-demo/seed-data/products.csv` (~70 products)
- The seed script (`invu-demo/seed-invu-demo.ts`) loads these into the demo environment

**Future API Design (document only, do not build yet):**

```
GET /v1/ucp/merchants
  → List merchants available via UCP discovery
  → Response: { data: Merchant[], pagination }

GET /v1/ucp/merchants/:merchantId/catalog
  → List products for a specific merchant
  → Response: { data: Product[], merchant: Merchant }
  → Filterable by: category, search query, price range

POST /v1/ucp/merchants/:merchantId/catalog/sync
  → Trigger catalog sync from merchant's POS system
  → For Invu POS: pulls from their API
```

**Data Model (future):**
```sql
CREATE TABLE ucp_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  external_id TEXT,                    -- e.g., 'invu_merch_001'
  name TEXT NOT NULL,
  type TEXT,                           -- 'restaurant', 'retail', 'hotel', 'bar'
  country TEXT,
  city TEXT,
  currency TEXT DEFAULT 'USD',
  pos_provider TEXT,                   -- 'invu', 'square', etc.
  pos_merchant_id TEXT,                -- ID in the POS system
  catalog_sync_url TEXT,               -- URL to pull catalog from
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ucp_merchant_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  merchant_id UUID NOT NULL REFERENCES ucp_merchants(id),
  external_id TEXT,                    -- e.g., 'prod_kk_001'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Acceptance Criteria:**
- CSV seed data is complete and loadable (already done — see seed-data/)
- Future API design is documented above
- Seed script can load merchants + products into demo environment

---

### Story 3: Demo Tenant & Agent Provisioning

**Points:** 3 | **Status:** Not Started

Create a seed script that provisions the complete Invu POS demo environment. The script should be idempotent (safe to run multiple times).

**File:** `invu-demo/seed-invu-demo.ts`

**What it provisions:**

1. **Demo Tenant:** "Invu POS" with API key `pk_test_invu_demo_2026`
2. **Merchant Accounts:** 12 accounts from `merchants.csv`, type matching merchant_type
3. **AI Agent:** "Invu Concierge Agent"
   - KYA Tier 1 (Standard)
   - Status: active
   - Permissions: transactions.initiate, transactions.view, accounts.view
4. **Agent Wallet:** Funded with 10,000 USDC (test funds)
5. **Spending Mandate:**
   - ID: `mandate_invu_concierge_daily`
   - Authorized amount: $2,500
   - Type: payment
   - Description: "Daily spending mandate for Invu demo ordering"
6. **Sample Checkouts:** Pre-created to show in dashboard
   - 1 completed single-restaurant order (La Cevichería del Rey — 3 items)
   - 1 completed batch order (Krispy Kreme + Café Unido + El Trapiche — 8 items total)
   - 1 pending order (Hotel Tantalo room service — 2 items)

**Acceptance Criteria:**
- Script runs with `pnpm tsx invu-demo/seed-invu-demo.ts`
- All entities created successfully with Invu branding
- Dashboard shows Invu demo data when logged in
- Agent has working wallet and mandate

---

### Story 4: Dynamic Handler Discovery in well-known Profile

**Points:** 2 | **Status:** Not Started

Currently `/.well-known/ucp` has the handler list partially hardcoded. Refactor so that ALL registered handlers appear automatically in the discovery profile.

**File to modify:** `apps/api/src/routes/well-known-ucp.ts`

**Changes:**
1. In `generateUCPProfile()`, replace the hardcoded `payment.handlers` array
2. Call `getAllHandlers()` from the payment handler registry
3. Map each registered handler to the discovery profile format:
   ```typescript
   const registeredHandlers = getAllHandlers();
   const handlersProfile = registeredHandlers.map(h => ({
     id: h.id,
     name: h.name,
     version: h.version,
     // ... handler-specific metadata from a new getProfileMetadata() method
   }));
   ```
4. Each handler implementation should export a `getProfileMetadata()` function that returns the handler's corridors, schemas, and supported currencies for the discovery profile.

**Acceptance Criteria:**
- `GET /.well-known/ucp` dynamically lists all registered handlers
- Adding a new handler file + registering it automatically makes it discoverable
- No hardcoded handler data in the well-known route
- Existing `payos_latam` handler still appears correctly

---

### Story 5: Demo Walkthrough Validation

**Points:** 5 | **Status:** Not Started

End-to-end validation that the demo flow works. Run through every step in `invu-demo/demo-script.md` and verify.

**Validation Checklist:**

1. **Discovery:**
   - [ ] `GET /.well-known/ucp` returns both `payos_latam` and `invu` handlers
   - [ ] `invu` handler shows USD/PAB currencies and `invu_pos` rail

2. **Single Restaurant Order:**
   - [ ] Create UCP checkout with `handler: "invu"`, line items from products.csv
   - [ ] Checkout status progresses: incomplete → ready_for_complete → completed
   - [ ] Order created with correct totals
   - [ ] Agent spending tracked against mandate

3. **Batch Ordering:**
   - [ ] `ucp_batch_checkout` creates 5 checkouts from different merchants
   - [ ] All 5 complete successfully
   - [ ] Total spending deducted from mandate budget

4. **Dashboard:**
   - [ ] Invu Concierge Agent visible with correct KYA tier
   - [ ] Wallet balance reflects transactions
   - [ ] Mandate shows remaining budget
   - [ ] Checkout history shows all orders with Invu branding

5. **Error Cases (good to demo):**
   - [ ] Agent tries to exceed mandate budget → blocked
   - [ ] Agent tries to order from unapproved vendor → spending policy check

**Acceptance Criteria:**
- All checklist items pass
- Demo can run without errors in under 30 minutes
- Presenter guide (`demo-script.md`) matches actual behavior

---

## Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| UCP Checkout System | ✅ Built | Existing in `apps/api/src/services/ucp/` |
| Payment Handler Registry | ✅ Built | Existing in `apps/api/src/services/ucp/payment-handlers/` |
| Agent + KYA System | ✅ Built | Existing agent management |
| Wallet System | ✅ Built | Existing wallet + test funding |
| AP2 Mandates | ✅ Built | Existing mandate system |
| Batch Checkout | ✅ Built | Existing `ucp_batch_checkout` |
| well-known UCP Endpoint | ✅ Built | Needs dynamic handler listing (Story 4) |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Handler registration breaks existing flow | Low | High | Unit test payos_latam before and after |
| Seed script fails on fresh DB | Medium | Medium | Make script idempotent, test on clean env |
| Demo timing exceeds 30 min | Medium | Low | Rehearse with demo-script.md, have shortcuts |
| Client asks about production timeline | High | Medium | Prepare "Phase 4 → Phase 5" roadmap talking points |

---

## Post-Demo Roadmap (to discuss with Invu POS)

1. **Phase 1 (This Demo):** Agent ordering + batch ordering with Invu as handler
2. **Phase 2:** Live catalog sync from Invu POS API → `ucp_merchant_products` table
3. **Phase 3:** Cross-border supplier payments (PA → CR, PA → CO)
4. **Phase 4:** Franchise treasury with money streaming
5. **Phase 5:** Delivery orchestration (Deliverect integration)
