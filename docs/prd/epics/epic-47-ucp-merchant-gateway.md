# Epic 47: UCP Merchant Gateway 🏪

**Status:** 📋 Backlog
**Phase:** 4 (Customer Validation)
**Priority:** P2 — Future Expansion
**Estimated Points:** 89
**Stories:** 0/22
**Dependencies:** Epic 43 (UCP Integration)
**Created:** January 19, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

**UCP Merchant Gateway** enables businesses without Shopify (or other UCP-native platforms) to participate in the UCP ecosystem through PayOS. Instead of just being a Payment Handler, PayOS becomes a full **UCP Business Provider** — handling product catalogs, checkouts, orders, and settlement.

**Why This Matters:**
- Shopify has 1M+ merchants, but millions more don't use Shopify
- Small/medium LATAM businesses need UCP access to reach AI shopping agents
- PayOS can capture the full transaction (not just settlement)
- Higher revenue per transaction: checkout fees + settlement fees

**Goal:** Enable any merchant to be UCP-discoverable and sell to AI agents via PayOS.

---

## Strategic Context

### Current State (Epic 43)

```
Agent ──→ Shopify/Walmart ──→ PayOS (Payment Handler)
              ↑
         UCP Business
         (has own catalog)
```

PayOS only participates in settlement — merchant must already have UCP infrastructure.

### Future State (Epic 47)

```
Agent ──→ PayOS (UCP Business API) ──→ PayOS (Settlement)
              ↑
         Merchant registers
         products via PayOS
```

PayOS provides the full UCP stack — merchants just register products.

### Target Customers

| Segment | Example | Pain Point |
|---------|---------|------------|
| LATAM SMBs | Brazilian artisan shop | No Shopify, want AI agent sales |
| B2B Suppliers | Mexican parts distributor | Procurement agents need UCP |
| Service Providers | Freelance platforms | Agents booking services |
| Marketplaces | Regional e-commerce | White-label UCP for sellers |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PayOS UCP Merchant Gateway                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Merchant      │  │    Product      │  │    Checkout     │              │
│  │   Registry      │  │    Catalog      │  │    Engine       │              │
│  │                 │  │                 │  │                 │              │
│  │  • Onboarding   │  │  • CRUD         │  │  • Sessions     │              │
│  │  • Profile      │  │  • Categories   │  │  • Cart mgmt    │              │
│  │  • Settings     │  │  • Variants     │  │  • Completion   │              │
│  │  • API Keys     │  │  • Inventory    │  │  • Expiration   │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │     Order       │  │   UCP Profile   │  │    Webhook      │              │
│  │   Management    │  │   Generator     │  │    Delivery     │              │
│  │                 │  │                 │  │                 │              │
│  │  • Lifecycle    │  │  • Discovery    │  │  • Order events │              │
│  │  • Fulfillment  │  │  • Capabilities │  │  • Payment      │              │
│  │  • Refunds      │  │  • White-label  │  │  • Fulfillment  │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    Settlement Layer (Epic 43)                │            │
│  │         PayOS LATAM Settlement (Pix, SPEI, USDC)            │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

```sql
-- Merchant registry
CREATE TABLE ucp_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- for /.well-known/ucp URLs
  description TEXT,
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  support_email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(64),
  status VARCHAR(20) DEFAULT 'active',  -- active, suspended, closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product catalog
CREATE TABLE ucp_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES ucp_merchants(id),
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  images JSONB DEFAULT '[]',
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  inventory_count INTEGER,
  inventory_policy VARCHAR(20) DEFAULT 'continue',  -- continue, deny
  status VARCHAR(20) DEFAULT 'active',  -- active, draft, archived
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkout sessions
CREATE TABLE ucp_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES ucp_merchants(id),
  status VARCHAR(20) DEFAULT 'open',  -- open, completed, cancelled, expired
  line_items JSONB NOT NULL DEFAULT '[]',
  totals JSONB NOT NULL,
  buyer JSONB,
  shipping_address JSONB,
  payment_handler VARCHAR(100),
  payment_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE ucp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES ucp_merchants(id),
  checkout_id UUID REFERENCES ucp_checkouts(id),
  order_number VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'confirmed',
  line_items JSONB NOT NULL,
  totals JSONB NOT NULL,
  buyer JSONB NOT NULL,
  shipping_address JSONB,
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  payment_status VARCHAR(20) DEFAULT 'pending',
  settlement_id UUID,  -- links to UCP settlement
  refund_amount DECIMAL(12,2),
  refund_reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ucp_merchants_tenant ON ucp_merchants(tenant_id);
CREATE INDEX idx_ucp_merchants_slug ON ucp_merchants(slug);
CREATE INDEX idx_ucp_products_merchant ON ucp_products(merchant_id);
CREATE INDEX idx_ucp_products_status ON ucp_products(merchant_id, status);
CREATE INDEX idx_ucp_checkouts_merchant ON ucp_checkouts(merchant_id);
CREATE INDEX idx_ucp_checkouts_status ON ucp_checkouts(merchant_id, status);
CREATE INDEX idx_ucp_orders_merchant ON ucp_orders(merchant_id);
CREATE INDEX idx_ucp_orders_status ON ucp_orders(merchant_id, status);
```

---

## Stories

### Part 1: Merchant Registry (13 points)

#### Story 47.1: Merchant Registration

**Points:** 5
**Priority:** P0
**Dependencies:** Epic 43

**Description:**
Enable tenants to register as UCP merchants with profile information.

**Acceptance Criteria:**
- [ ] `POST /v1/ucp/merchants` creates merchant profile
- [ ] Unique slug generated/validated for discovery URL
- [ ] Logo, description, support email stored
- [ ] Webhook URL configured for order notifications
- [ ] Merchant linked to tenant for RLS
- [ ] Returns merchant ID and discovery URL

**API:**
```
POST /v1/ucp/merchants
{
  "name": "Artesanato Brasil",
  "slug": "artesanato-brasil",
  "description": "Handcrafted Brazilian artisan goods",
  "logo_url": "https://...",
  "support_email": "suporte@artesanato.com.br",
  "webhook_url": "https://artesanato.com.br/webhooks/payos"
}

Response:
{
  "id": "uuid",
  "slug": "artesanato-brasil",
  "discovery_url": "https://api.payos.com/m/artesanato-brasil/.well-known/ucp",
  "status": "active"
}
```

---

#### Story 47.2: Merchant Profile Management

**Points:** 3
**Priority:** P0
**Dependencies:** 47.1

**Description:**
CRUD operations for merchant profiles.

**Acceptance Criteria:**
- [ ] `GET /v1/ucp/merchants` lists tenant's merchants
- [ ] `GET /v1/ucp/merchants/:id` returns merchant details
- [ ] `PATCH /v1/ucp/merchants/:id` updates profile
- [ ] `DELETE /v1/ucp/merchants/:id` soft-deletes (sets status=closed)
- [ ] Webhook secret rotation supported

---

#### Story 47.3: Merchant UCP Profile Generation

**Points:** 5
**Priority:** P0
**Dependencies:** 47.1

**Description:**
Generate UCP-compliant profile for merchant discovery.

**Acceptance Criteria:**
- [ ] `GET /m/:slug/.well-known/ucp` returns merchant UCP profile
- [ ] Profile includes product catalog endpoint
- [ ] Profile includes checkout endpoint
- [ ] PayOS listed as payment handler
- [ ] Cache-Control headers set appropriately
- [ ] Profile validates against UCP schema

**Profile Structure:**
```json
{
  "ucp": {
    "version": "2026-01-11",
    "services": {
      "dev.ucp.shopping": {
        "version": "2026-01-11",
        "rest": {
          "endpoint": "https://api.payos.com/m/artesanato-brasil/ucp"
        }
      }
    }
  },
  "business": {
    "name": "Artesanato Brasil",
    "logo_url": "...",
    "support_email": "..."
  },
  "payment": {
    "handlers": [{
      "id": "payos_latam",
      "name": "com.payos.latam_settlement"
    }]
  }
}
```

---

### Part 2: Product Catalog (18 points)

#### Story 47.4: Product CRUD

**Points:** 5
**Priority:** P0
**Dependencies:** 47.1

**Description:**
Full CRUD operations for product catalog.

**Acceptance Criteria:**
- [ ] `POST /v1/ucp/merchants/:mid/products` creates product
- [ ] `GET /v1/ucp/merchants/:mid/products` lists with pagination/filters
- [ ] `GET /v1/ucp/merchants/:mid/products/:pid` returns product
- [ ] `PATCH /v1/ucp/merchants/:mid/products/:pid` updates product
- [ ] `DELETE /v1/ucp/merchants/:mid/products/:pid` archives product
- [ ] SKU uniqueness enforced per merchant
- [ ] Image URLs validated

---

#### Story 47.5: Product Variants

**Points:** 5
**Priority:** P1
**Dependencies:** 47.4

**Description:**
Support product variants (size, color, etc.).

**Acceptance Criteria:**
- [ ] Variants stored as JSONB array
- [ ] Each variant has: name, options, price_modifier, sku_suffix
- [ ] Inventory tracked per variant (optional)
- [ ] Variant selection in checkout

**Example:**
```json
{
  "variants": [
    {
      "name": "Size",
      "options": [
        { "value": "S", "price_modifier": 0 },
        { "value": "M", "price_modifier": 0 },
        { "value": "L", "price_modifier": 5.00 }
      ]
    },
    {
      "name": "Color",
      "options": [
        { "value": "Natural", "price_modifier": 0 },
        { "value": "Dyed", "price_modifier": 10.00 }
      ]
    }
  ]
}
```

---

#### Story 47.6: Inventory Management

**Points:** 3
**Priority:** P1
**Dependencies:** 47.4

**Description:**
Track inventory and handle stock policies.

**Acceptance Criteria:**
- [ ] `inventory_count` decremented on order completion
- [ ] `inventory_policy`: "continue" (allow oversell) or "deny" (reject if 0)
- [ ] Low stock webhook notification
- [ ] Bulk inventory update endpoint

---

#### Story 47.7: Product Categories & Search

**Points:** 5
**Priority:** P1
**Dependencies:** 47.4

**Description:**
Enable product organization and discovery.

**Acceptance Criteria:**
- [ ] Category field with free-text or predefined list
- [ ] Tags as JSONB array for flexible filtering
- [ ] Search by name, description, tags
- [ ] Filter by category, price range, status
- [ ] Sort by price, name, created_at

---

### Part 3: Checkout Engine (21 points)

#### Story 47.8: Checkout Creation

**Points:** 5
**Priority:** P0
**Dependencies:** 47.4

**Description:**
Create checkout sessions for UCP agents.

**Acceptance Criteria:**
- [ ] `POST /m/:slug/ucp/checkout` creates session (public, no auth)
- [ ] Line items reference product IDs or inline items
- [ ] Totals calculated (subtotal, tax, shipping, total)
- [ ] Session expires in 30 minutes
- [ ] Returns checkout ID and available payment handlers

**Request:**
```json
{
  "line_items": [
    { "product_id": "uuid", "quantity": 2 },
    { "product_id": "uuid", "variant": { "Size": "L" }, "quantity": 1 }
  ],
  "buyer": {
    "email": "buyer@example.com",
    "name": "João Silva"
  }
}
```

---

#### Story 47.9: Checkout Updates

**Points:** 3
**Priority:** P0
**Dependencies:** 47.8

**Description:**
Allow modifications to open checkouts.

**Acceptance Criteria:**
- [ ] `PATCH /m/:slug/ucp/checkout/:id` updates session
- [ ] Can add/remove/update line items
- [ ] Can update buyer info
- [ ] Can add shipping address
- [ ] Totals recalculated on change
- [ ] Cannot modify completed/cancelled checkouts

---

#### Story 47.10: Checkout Completion

**Points:** 8
**Priority:** P0
**Dependencies:** 47.8, Epic 43

**Description:**
Complete checkout with payment.

**Acceptance Criteria:**
- [ ] `POST /m/:slug/ucp/checkout/:id/complete` finalizes
- [ ] Accepts PayOS settlement token as payment
- [ ] Validates token matches checkout amount
- [ ] Creates order record
- [ ] Triggers settlement execution
- [ ] Sends webhook to merchant
- [ ] Returns order confirmation

**Request:**
```json
{
  "payment_handler": "payos_latam",
  "payment_data": {
    "token": "ucp_tok_..."
  },
  "shipping_address": {
    "line1": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "postal_code": "01234-567",
    "country": "BR"
  }
}
```

---

#### Story 47.11: Checkout Cancellation

**Points:** 2
**Priority:** P1
**Dependencies:** 47.8

**Description:**
Cancel open checkouts.

**Acceptance Criteria:**
- [ ] `DELETE /m/:slug/ucp/checkout/:id` cancels session
- [ ] Only open checkouts can be cancelled
- [ ] Inventory restored if reserved
- [ ] Returns cancellation confirmation

---

#### Story 47.12: Checkout Expiration

**Points:** 3
**Priority:** P1
**Dependencies:** 47.8

**Description:**
Automatically expire stale checkouts.

**Acceptance Criteria:**
- [ ] Background job runs every 5 minutes
- [ ] Checkouts older than `expires_at` marked as expired
- [ ] Inventory restored for expired checkouts
- [ ] Expired checkouts return 410 Gone on access

---

### Part 4: Order Management (21 points)

#### Story 47.13: Order Creation

**Points:** 3
**Priority:** P0
**Dependencies:** 47.10

**Description:**
Create orders from completed checkouts.

**Acceptance Criteria:**
- [ ] Order created automatically on checkout completion
- [ ] Order number generated (human-readable format)
- [ ] Links to settlement for payment tracking
- [ ] Initial status: "confirmed"

---

#### Story 47.14: Order Lifecycle

**Points:** 5
**Priority:** P0
**Dependencies:** 47.13

**Description:**
Manage order status transitions.

**Acceptance Criteria:**
- [ ] `GET /v1/ucp/merchants/:mid/orders` lists orders
- [ ] `GET /v1/ucp/merchants/:mid/orders/:oid` returns order
- [ ] `PATCH /v1/ucp/merchants/:mid/orders/:oid` updates status
- [ ] Valid transitions: confirmed → processing → shipped → delivered
- [ ] Tracking number and URL can be added

**Status Flow:**
```
confirmed → processing → shipped → delivered
         ↘           ↘        ↘
          cancelled   cancelled  returned
```

---

#### Story 47.15: Order Fulfillment Webhooks

**Points:** 5
**Priority:** P0
**Dependencies:** 47.13

**Description:**
Send webhooks to merchants on order events.

**Acceptance Criteria:**
- [ ] Webhook sent on: order.created, order.paid, order.shipped, order.delivered
- [ ] Webhook includes order details and settlement status
- [ ] Signature verification using merchant webhook_secret
- [ ] Retry with exponential backoff (3 attempts)
- [ ] Dead letter queue for failed deliveries

---

#### Story 47.16: Order Refunds

**Points:** 5
**Priority:** P1
**Dependencies:** 47.13

**Description:**
Process full or partial refunds.

**Acceptance Criteria:**
- [ ] `POST /v1/ucp/merchants/:mid/orders/:oid/refund` initiates refund
- [ ] Full or partial refund amount
- [ ] Refund reason required
- [ ] Triggers settlement reversal (if supported)
- [ ] Webhook sent on refund completion
- [ ] Order status updated to "refunded" or "partially_refunded"

---

#### Story 47.17: Order Search & Export

**Points:** 3
**Priority:** P2
**Dependencies:** 47.14

**Description:**
Search and export order data.

**Acceptance Criteria:**
- [ ] Filter by: status, date range, buyer email
- [ ] Sort by: created_at, total, status
- [ ] Export to CSV endpoint
- [ ] Pagination with cursor support

---

### Part 5: Agent-Facing API (10 points)

#### Story 47.18: Product Discovery API

**Points:** 3
**Priority:** P0
**Dependencies:** 47.4

**Description:**
Public API for agents to browse products.

**Acceptance Criteria:**
- [ ] `GET /m/:slug/ucp/products` lists active products (public)
- [ ] Supports search, filter, pagination
- [ ] Returns UCP-compliant product format
- [ ] Includes variant information
- [ ] Includes inventory availability

---

#### Story 47.19: Product Details API

**Points:** 2
**Priority:** P0
**Dependencies:** 47.18

**Description:**
Get single product details.

**Acceptance Criteria:**
- [ ] `GET /m/:slug/ucp/products/:id` returns product (public)
- [ ] Full product details including variants
- [ ] Related products (optional)
- [ ] 404 if product not found or inactive

---

#### Story 47.20: Order Status API (Buyer)

**Points:** 3
**Priority:** P1
**Dependencies:** 47.14

**Description:**
Allow buyers/agents to check order status.

**Acceptance Criteria:**
- [ ] `GET /m/:slug/ucp/orders/:id` returns order status
- [ ] Requires order ID + buyer email (for verification)
- [ ] Returns: status, tracking info, estimated delivery
- [ ] Does not expose merchant-only fields

---

#### Story 47.21: Shipping Rates API

**Points:** 2
**Priority:** P2
**Dependencies:** 47.8

**Description:**
Calculate shipping rates for checkout.

**Acceptance Criteria:**
- [ ] `POST /m/:slug/ucp/shipping-rates` calculates rates
- [ ] Based on destination address and cart items
- [ ] Returns available shipping methods with prices
- [ ] Merchant can configure shipping zones/rates

---

### Part 6: White-Label & Advanced (6 points)

#### Story 47.22: White-Label Domain Support

**Points:** 6
**Priority:** P2
**Dependencies:** 47.3

**Description:**
Allow merchants to use custom domains.

**Acceptance Criteria:**
- [ ] Merchant can configure custom domain
- [ ] DNS verification flow
- [ ] SSL certificate provisioning
- [ ] `/.well-known/ucp` served from custom domain
- [ ] Checkout and product URLs use custom domain

---

## Story Summary

| Story | Points | Priority | Description |
|-------|--------|----------|-------------|
| **Part 1: Merchant Registry** | **13** | | |
| 47.1 | 5 | P0 | Merchant Registration |
| 47.2 | 3 | P0 | Profile Management |
| 47.3 | 5 | P0 | UCP Profile Generation |
| **Part 2: Product Catalog** | **18** | | |
| 47.4 | 5 | P0 | Product CRUD |
| 47.5 | 5 | P1 | Product Variants |
| 47.6 | 3 | P1 | Inventory Management |
| 47.7 | 5 | P1 | Categories & Search |
| **Part 3: Checkout Engine** | **21** | | |
| 47.8 | 5 | P0 | Checkout Creation |
| 47.9 | 3 | P0 | Checkout Updates |
| 47.10 | 8 | P0 | Checkout Completion |
| 47.11 | 2 | P1 | Checkout Cancellation |
| 47.12 | 3 | P1 | Checkout Expiration |
| **Part 4: Order Management** | **21** | | |
| 47.13 | 3 | P0 | Order Creation |
| 47.14 | 5 | P0 | Order Lifecycle |
| 47.15 | 5 | P0 | Fulfillment Webhooks |
| 47.16 | 5 | P1 | Order Refunds |
| 47.17 | 3 | P2 | Search & Export |
| **Part 5: Agent-Facing API** | **10** | | |
| 47.18 | 3 | P0 | Product Discovery |
| 47.19 | 2 | P0 | Product Details |
| 47.20 | 3 | P1 | Order Status (Buyer) |
| 47.21 | 2 | P2 | Shipping Rates |
| **Part 6: White-Label** | **6** | | |
| 47.22 | 6 | P2 | Custom Domain Support |
| **TOTAL** | **89** | | **22 stories** |

---

## Priority Summary

| Priority | Stories | Points | Focus |
|----------|---------|--------|-------|
| **P0** | 11 | 47 | Core merchant, catalog, checkout, orders |
| **P1** | 7 | 26 | Variants, inventory, refunds, buyer API |
| **P2** | 4 | 16 | Export, shipping, white-label |
| **Total** | **22** | **89** | |

---

## Revenue Model

| Service | Pricing | Notes |
|---------|---------|-------|
| UCP Merchant Gateway | $99/month | Base platform fee |
| Checkout Processing | 0.5% of GMV | Per completed checkout |
| LATAM Settlement | 1% + FX spread | Stacks with checkout fee |
| White-Label Domain | $199/month | Custom domain add-on |
| Priority Support | $299/month | Dedicated support |

**Example Revenue (Single Merchant):**
- $10,000/month GMV
- Platform: $99
- Checkout: $50 (0.5%)
- Settlement: $100 (1%)
- **Total: $249/month per merchant**

---

## Success Criteria

| Milestone | Criteria |
|-----------|----------|
| MVP | 3 merchants onboarded, products listed |
| Beta | 10 merchants, 100 orders/month |
| Launch | 50 merchants, 1000 orders/month |
| Scale | 500 merchants, $1M GMV/month |

---

## Related Documentation

- [Epic 43: UCP Integration](./epic-43-ucp-integration.md)
- [UCP Specification](https://ucp.dev/specification/overview/)
- [PRD Master](../PayOS_PRD_Master.md)

---

*Created: January 19, 2026*
*Status: Backlog - Lower Priority*
