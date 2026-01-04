# Category 8: Cross-Border E-Commerce

**Last Updated:** January 2026  
**Profiles:** 3  
**Monthly Volume Range:** $2M - $80M  
**Primary Protocols:** ACP, Direct API

---

## Category Overview

E-commerce platforms selling cross-border. Need merchant settlement, multi-currency, refund handling.

### Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $20 - $2,000 |
| **Monthly Volume** | $5M - $100M |
| **Frequency** | 20,000 - 500,000 transactions/month |
| **Payment Pattern** | Real-time checkout, batch settlement |
| **Corridors** | Global → LATAM merchants |
| **Key Need** | Checkout conversion, merchant settlement |
| **Protocols** | ACP, Direct API |

### Why They Need PayOS
- Cross-border checkout has high abandonment (70%+)
- Local payment methods (Pix, SPEI) increase conversion 30%+
- Merchant settlement in local currency is complex
- Refunds and disputes need proper handling
- Multi-currency treasury management

---

## Profile 8.1: Cross-Border Marketplace

**Profile Name:** `ecommerce_crossborder_marketplace`

### Description
Marketplace connecting buyers globally with LATAM sellers. Handle checkout, payment, merchant settlement.

### Business Model
- Marketplace fee (10-15%)
- Payment processing fee (2-3%)
- Advertising revenue
- Premium seller subscriptions

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly GMV | $20M - $80M |
| Avg Order | $50 - $150 |
| Orders/Month | 200,000 - 700,000 |
| Seller Payouts | $15M - $60M |
| Refund Rate | 5-8% |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US buyers → MX sellers | 45% | USD → MXN |
| US buyers → BR sellers | 35% | USD → BRL |
| EU buyers → LATAM | 20% | EUR → Various |

### Pain Points
1. Checkout conversion drops for international (70%+ abandonment)
2. Seller settlement is slow (7-14 days typical)
3. Multi-currency complexity
4. Refund and dispute handling
5. Seller onboarding friction

### PayOS Integration
```
API Flow:
1. POST /v1/acp/checkout (buyer checkout)
2. POST /v1/settlements/batch (seller weekly batch)
3. POST /v1/refunds (order refunds)
4. POST /v1/entities/sellers (seller onboarding)
5. GET /v1/analytics/marketplace (performance data)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Buyer checkout | $85 order, US buyer, MX seller | Payment collected |
| 2 | Seller settlement | Weekly batch, 500 sellers | All settled in 48h |
| 3 | Refund | $45 return | Buyer refunded, seller adjusted |
| 4 | Seller onboarding | New MX seller | Bank verified, ready for payouts |

### Seed Data Requirements
- 1 partner account
- 50,000 buyer accounts
- 10,000 seller accounts
- 1,000,000 historical orders
- Refund and dispute records
- Seller performance data

### Sample Entities

**Partner Account:**
```json
{
  "name": "LatamMart Marketplace",
  "type": "ecommerce_crossborder_marketplace",
  "tier": "enterprise",
  "monthly_volume_usd": 45000000,
  "primary_corridors": ["US-MX", "US-BR", "EU-LATAM"],
  "integration_type": "api",
  "features": ["acp_checkout", "batch_settlements", "refunds", "seller_onboarding"]
}
```

**Sample Seller:**
```json
{
  "seller_id": "sel_mx_00001",
  "name": "Artesanías Oaxaca",
  "country": "MX",
  "category": "handcrafts",
  "products_listed": 45,
  "monthly_sales_usd": 8500,
  "rating": 4.7,
  "payout_schedule": "weekly",
  "payment_method": "spei",
  "clabe": "012180001234567890",
  "status": "verified"
}
```

**Sample Order:**
```json
{
  "order_id": "ord_00001",
  "buyer_id": "buy_us_00001",
  "seller_id": "sel_mx_00001",
  "items": [
    { "sku": "OAX-001", "name": "Handwoven Rug", "price_usd": 75 }
  ],
  "subtotal_usd": 75,
  "shipping_usd": 12,
  "total_usd": 87,
  "payment_status": "captured",
  "settlement_status": "pending"
}
```

---

## Profile 8.2: D2C Brand (LATAM Expansion)

**Profile Name:** `ecommerce_d2c_brand`

### Description
Direct-to-consumer brand expanding to LATAM markets. Need local payment acceptance and supplier payments.

### Business Model
- Product sales (direct)
- Subscription options
- Wholesale to retailers

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Revenue | $2M - $10M |
| Avg Order | $80 - $200 |
| Orders/Month | 15,000 - 60,000 |
| Supplier Payments | $500K - $3M |
| LATAM % of Revenue | 20-40% |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| LATAM customers (collection) | 60% | BRL/MXN → USD |
| US → LATAM suppliers | 40% | USD → MXN/BRL |

### Pain Points
1. LATAM customers prefer local payment (Pix, SPEI)
2. Cart abandonment high without local methods
3. Supplier payments are manual
4. Currency exposure on inventory purchases
5. Subscription billing in local currency is complex

### PayOS Integration
```
API Flow:
1. POST /v1/collections/pix (Pix checkout)
2. POST /v1/collections/spei (SPEI checkout)
3. POST /v1/settlements (supplier payments)
4. POST /v1/subscriptions (recurring billing)
5. GET /v1/treasury/exposure (FX exposure report)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Pix checkout | R$450 order | Pix QR generated, paid |
| 2 | Supplier payment | $25K to MX supplier | SPEI next-day |
| 3 | Subscription | R$99/month | Recurring Pix collection |
| 4 | FX exposure | Monthly report | BRL/MXN exposure shown |

### Seed Data Requirements
- 1 brand account
- 20,000 customer accounts (Brazil, Mexico)
- 100 supplier accounts
- 200,000 historical orders
- Subscription records
- Inventory/supplier data

### Sample Entities

**Partner Account:**
```json
{
  "name": "TrendyBrand Co",
  "type": "ecommerce_d2c_brand",
  "tier": "growth",
  "monthly_volume_usd": 5000000,
  "primary_corridors": ["BR-collection", "MX-collection", "US-MX", "US-BR"],
  "integration_type": "api",
  "features": ["pix_collection", "spei_collection", "settlements", "subscriptions"]
}
```

**Sample Customer:**
```json
{
  "customer_id": "cust_br_00001",
  "name": "Fernanda Costa",
  "country": "BR",
  "city": "São Paulo",
  "preferred_payment": "pix",
  "lifetime_orders": 8,
  "lifetime_value_brl": 2450,
  "subscription": {
    "active": true,
    "plan": "monthly_box",
    "amount_brl": 99,
    "next_billing": "2026-02-01"
  }
}
```

**Sample Supplier:**
```json
{
  "supplier_id": "sup_mx_00001",
  "name": "TextilesMex SA",
  "country": "MX",
  "category": "raw_materials",
  "payment_terms": "net_30",
  "avg_order_usd": 15000,
  "payment_method": "spei"
}
```

---

## Profile 8.3: Dropshipping Platform

**Profile Name:** `ecommerce_dropshipping`

### Description
Dropshipping platform where sellers source from LATAM suppliers. Handle supplier payments, seller payouts, quality escrow.

### Business Model
- Platform fee (5-10%)
- Payment processing (2-3%)
- Premium tools
- Supplier network access

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $5M - $20M |
| Avg Order | $30 - $80 |
| Orders/Month | 100,000 - 350,000 |
| Supplier Payments | $3M - $12M |
| Quality Dispute Rate | 3-5% |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Platform → MX suppliers | 50% | USD → MXN |
| Platform → BR suppliers | 30% | USD → BRL |
| Platform → CN suppliers | 20% | USD → CNY |

### Pain Points
1. Fast supplier payment needed for fulfillment
2. Many small supplier payments
3. Quality/fulfillment disputes
4. Multi-supplier orders
5. Seller margin visibility

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (supplier payment)
2. POST /v1/escrow (quality hold)
3. POST /v1/settlements/split (multi-supplier)
4. GET /v1/analytics/margins (margin tracking)
5. POST /v1/disputes (dispute handling)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Supplier payment | $150 for order fulfillment | SPEI in <1 hour |
| 2 | Quality escrow | Hold until delivery confirmed | Released on webhook |
| 3 | Multi-supplier | Order from 3 suppliers | Split payment executed |
| 4 | Dispute | Supplier didn't ship | Escrow returned to seller |

### Seed Data Requirements
- 1 platform account
- 5,000 seller accounts
- 2,000 supplier accounts
- 500,000 historical orders
- Escrow and dispute records
- Quality scores

### Sample Entities

**Partner Account:**
```json
{
  "name": "DropShipLatam",
  "type": "ecommerce_dropshipping",
  "tier": "growth",
  "monthly_volume_usd": 12000000,
  "primary_corridors": ["US-MX", "US-BR"],
  "integration_type": "api",
  "features": ["settlements", "escrow", "split_payments", "disputes"]
}
```

**Sample Seller:**
```json
{
  "seller_id": "drp_sel_00001",
  "name": "TrendStore",
  "country": "US",
  "niche": "home_decor",
  "monthly_orders": 850,
  "monthly_gmv_usd": 42000,
  "avg_margin_pct": 25,
  "preferred_suppliers": ["sup_mx_001", "sup_mx_002", "sup_br_001"]
}
```

**Sample Order:**
```json
{
  "order_id": "drp_ord_00001",
  "seller_id": "drp_sel_00001",
  "customer_order_value_usd": 65,
  "suppliers": [
    {
      "supplier_id": "sup_mx_001",
      "items": ["item_001"],
      "cost_usd": 28,
      "status": "awaiting_payment"
    },
    {
      "supplier_id": "sup_mx_002",
      "items": ["item_002"],
      "cost_usd": 15,
      "status": "awaiting_payment"
    }
  ],
  "total_supplier_cost_usd": 43,
  "seller_margin_usd": 22,
  "escrow_status": "held"
}
```

---

## Category Summary

| Profile | Name | Volume | Tx Size | Key Feature |
|---------|------|--------|---------|-------------|
| 8.1 | `ecommerce_crossborder_marketplace` | $20-80M | $50-150 | Buyer checkout, seller settlement |
| 8.2 | `ecommerce_d2c_brand` | $2-10M | $80-200 | Local collection, supplier payments |
| 8.3 | `ecommerce_dropshipping` | $5-20M | $30-80 | Escrow, multi-supplier |

---

## Integration Priority

For PayOS development, prioritize these features for Category 8:

1. **ACP Checkout** — Critical for 8.1
2. **Pix/SPEI Collection** — Critical for 8.2
3. **Batch Settlement** — Critical for 8.1
4. **Escrow** — Critical for 8.3
5. **Split Payments** — Important for 8.3
6. **Refunds** — Critical for 8.1
7. **Subscriptions** — Important for 8.2
8. **Seller Onboarding** — Important for 8.1

---

## E-Commerce Checkout Optimization

### Conversion Impact by Payment Method

| Payment Method | Conversion Lift | Why |
|----------------|-----------------|-----|
| Pix (Brazil) | +25-35% | Instant, no card needed |
| SPEI (Mexico) | +20-30% | Trusted, bank-native |
| Local cards | +15-20% | Lower decline rates |
| Installments | +30-40% | Affordability |
| Boleto | +10-15% | Cash alternative |

### Checkout Best Practices

1. **Show local currency** — Display prices in BRL/MXN
2. **Local payment first** — Pix/SPEI above international cards
3. **Installment options** — 3-12x for higher AOV
4. **Mobile-first** — 70%+ mobile in LATAM
5. **One-click return** — Save payment methods

---

## Refund & Dispute Handling

### Refund Types

| Type | Timeline | Complexity |
|------|----------|------------|
| Full refund | 1-3 days | Low |
| Partial refund | 1-3 days | Medium |
| Multi-seller refund | 3-5 days | High |
| Dispute/chargeback | 30-90 days | High |

### Best Practices

1. **Instant refund for Pix** — Same-day possible
2. **Clear communication** — Notify buyer and seller
3. **Seller adjustments** — Deduct from next payout
4. **Dispute evidence** — Collect delivery proof
5. **Fraud prevention** — Flag suspicious patterns
