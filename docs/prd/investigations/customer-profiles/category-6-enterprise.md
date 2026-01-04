# Category 6: Enterprise & Logistics

**Last Updated:** January 2026  
**Profiles:** 3  
**Monthly Volume Range:** $30M - $150M  
**Primary Protocols:** Direct API, AP2

---

## Category Overview

Large enterprises with significant cross-border payment needs. Vendor payments, supply chain, urgent settlements.

### Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $5,000 - $500,000 |
| **Monthly Volume** | $20M - $200M |
| **Frequency** | 1,000 - 20,000 transactions/month |
| **Payment Pattern** | Mix of urgent and scheduled |
| **Corridors** | US → LATAM, Global → LATAM |
| **Key Need** | Speed, reliability, ERP integration |
| **Protocols** | Direct API, AP2 |

### Why They Need PayOS
- Payment delays cause operational disruption
- Same-day payment is competitive advantage
- FX costs at scale are significant
- Treasury wants consolidated view
- ERP integration reduces manual work

---

## Profile 6.1: Freight & Logistics

**Profile Name:** `enterprise_freight_logistics`

### Description
International freight forwarding and logistics. Paying carriers, customs brokers, port operators, warehouses across borders.

### Business Model
- Freight forwarding fees
- Customs brokerage
- Warehousing and logistics
- Insurance products

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $30M - $100M |
| Avg Transaction | $5,000 - $15,000 |
| Transactions/Month | 4,000 - 12,000 |
| Urgent % | 30% require same-day |
| Payment Terms | Net 7-30, some immediate |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 45% | USD → MXN |
| US → Brazil | 25% | USD → BRL |
| US → Colombia | 15% | USD → COP |
| Other | 15% | USD → Various |

### Pain Points
1. Shipment holds due to payment delays
2. Carriers demand same-day payment
3. FX costs eating margins (2-3%)
4. Managing 15+ banking relationships
5. No payment visibility for operations

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (urgent payment)
2. POST /v1/settlements/batch (weekly batch)
3. POST /v1/escrow (customs holds)
4. GET /v1/settlements/{id}/track (real-time status)
5. Webhooks for TMS integration
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Urgent carrier | $12K to MX, 2-hour deadline | SPEI in <30 min |
| 2 | Weekly batch | 500 carriers, $6M | 95%+ by EOD |
| 3 | Customs escrow | $50K duty hold | Released on clearance |
| 4 | TMS integration | Status update | Real-time webhook |

### Seed Data Requirements
- 1 enterprise account
- 1,000 carrier/vendor accounts
- 50,000 historical payments
- Shipment reference data
- Urgency flags and SLAs

### Sample Entities

**Partner Account:**
```json
{
  "name": "GlobalShip Logistics Inc",
  "type": "enterprise_freight_logistics",
  "tier": "enterprise",
  "monthly_volume_usd": 65000000,
  "primary_corridors": ["US-MX", "US-BR", "US-CO"],
  "integration_type": "api",
  "features": ["urgent_settlements", "batch", "escrow", "tms_webhooks"]
}
```

**Sample Carrier:**
```json
{
  "vendor_id": "car_mx_00001",
  "name": "TransMex Cargo SA de CV",
  "type": "carrier",
  "country": "MX",
  "payment_method": "spei",
  "clabe": "012180001234567890",
  "payment_terms": "net_7",
  "avg_transaction_usd": 8500,
  "sla_hours": 24
}
```

---

## Profile 6.2: Manufacturing

**Profile Name:** `enterprise_manufacturing`

### Description
Manufacturer with LATAM supply chain. Paying component suppliers, contract manufacturers, logistics providers.

### Business Model
- Product manufacturing
- Supply chain management
- Contract manufacturing
- Distribution

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $50M - $150M |
| Avg Transaction | $20,000 - $100,000 |
| Transactions/Month | 1,000 - 3,000 |
| Payment Terms | Net 30/60/90 |
| Milestone % | 40% of large orders |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 60% | USD → MXN |
| US → Brazil | 25% | USD → BRL |
| US → China | 10% | USD → CNY |
| Other | 5% | Various |

### Pain Points
1. Payment timing affects supplier relationships
2. Early payment discounts expire before treasury acts
3. Currency exposure on large orders
4. ERP integration is manual
5. Milestone payments for large orders are complex

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (standard payment)
2. POST /v1/settlements/schedule (scheduled for terms)
3. POST /v1/escrow (milestone orders)
4. POST /v1/quotes/lock (FX hedging)
5. GET /v1/erp/export (ERP integration)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Standard payment | $75K to MX supplier | SPEI next-day |
| 2 | Early pay discount | Pay in 10 days, save 2% | Discount calculated, executed |
| 3 | Milestone order | $500K, 3 milestones | Escrow managed per milestone |
| 4 | FX lock | Lock rate for 30 days | Rate guaranteed |

### Seed Data Requirements
- 1 enterprise account
- 500 supplier accounts
- 20,000 historical payments
- Payment terms metadata
- PO and invoice data
- FX exposure records

### Sample Entities

**Partner Account:**
```json
{
  "name": "MegaCorp Manufacturing",
  "type": "enterprise_manufacturing",
  "tier": "enterprise",
  "monthly_volume_usd": 85000000,
  "primary_corridors": ["US-MX", "US-BR"],
  "integration_type": "api",
  "features": ["settlements", "scheduling", "escrow", "fx_hedging", "erp_export"]
}
```

**Sample Supplier:**
```json
{
  "vendor_id": "sup_mx_00001",
  "name": "Componentes Industriales",
  "type": "component_supplier",
  "country": "MX",
  "category": "electronics",
  "payment_terms": "net_60",
  "early_pay_discount": { "days": 10, "discount_pct": 2.0 },
  "avg_order_usd": 45000,
  "annual_volume_usd": 2500000
}
```

---

## Profile 6.3: Retail & E-Commerce Enterprise

**Profile Name:** `enterprise_retail_ecommerce`

### Description
Large retailer with LATAM operations. Paying vendors, franchisees, marketplace sellers, service providers.

### Business Model
- Product retail
- Marketplace commissions
- Franchise fees
- Financial services

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $40M - $120M |
| Avg Transaction | $2,000 - $30,000 |
| Transactions/Month | 5,000 - 15,000 |
| Recipient Types | Vendors, franchisees, sellers |
| Payment Frequency | Weekly sellers, monthly vendors |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 50% | USD → MXN |
| US → Brazil | 30% | USD → BRL |
| Intra-LATAM | 20% | Various |

### Pain Points
1. Multiple recipient types, different needs
2. Marketplace seller payouts are high volume
3. Franchisee payments need consistency
4. Vendor payment terms vary
5. Refund and adjustment complexity

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (vendor batch)
2. POST /v1/settlements/marketplace (seller payouts)
3. POST /v1/adjustments (refunds, chargebacks)
4. GET /v1/reconciliation (ERP feed)
5. POST /v1/ap2/mandates (franchisee recurring)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Vendor batch | 200 vendors, $8M | All paid by terms |
| 2 | Seller payouts | 2,000 sellers, $500K | Weekly batch complete |
| 3 | Franchisee payment | $15K monthly fee | AP2 mandate executed |
| 4 | Refund processing | $5K return adjustment | Credit applied |

### Seed Data Requirements
- 1 enterprise account
- 500 vendor accounts
- 5,000 seller accounts
- 200 franchisee accounts
- 100,000 historical transactions
- Refund and adjustment records

### Sample Entities

**Partner Account:**
```json
{
  "name": "RetailMax Corp",
  "type": "enterprise_retail_ecommerce",
  "tier": "enterprise",
  "monthly_volume_usd": 75000000,
  "primary_corridors": ["US-MX", "US-BR"],
  "integration_type": "api",
  "features": ["batch", "marketplace_payouts", "adjustments", "ap2_mandates"]
}
```

**Sample Seller:**
```json
{
  "seller_id": "sel_mx_00001",
  "name": "Tienda Martinez",
  "type": "marketplace_seller",
  "country": "MX",
  "category": "home_goods",
  "monthly_gmv_usd": 25000,
  "commission_rate": 0.12,
  "payout_schedule": "weekly",
  "payment_method": "spei"
}
```

---

## Category Summary

| Profile | Name | Volume | Tx Size | Key Feature |
|---------|------|--------|---------|-------------|
| 6.1 | `enterprise_freight_logistics` | $30-100M | $5K-15K | Urgent payments, TMS integration |
| 6.2 | `enterprise_manufacturing` | $50-150M | $20K-100K | Milestone escrow, FX hedging |
| 6.3 | `enterprise_retail_ecommerce` | $40-120M | $2K-30K | Multi-recipient, marketplace |

---

## Integration Priority

For PayOS development, prioritize these features for Category 6:

1. **Settlement API** — Critical for all
2. **Batch Processing** — Critical for all
3. **Urgent/Priority Payments** — Critical for 6.1
4. **Escrow/Milestones** — Critical for 6.2
5. **FX Hedging** — Important for 6.2
6. **AP2 Mandates** — Important for 6.3
7. **ERP Integration** — Important for all
8. **Webhooks/TMS** — Critical for 6.1

---

## Enterprise Requirements

### Security
- SOC 2 Type II compliance
- SSO/SAML integration
- Role-based access control
- Audit logging
- IP whitelisting

### Integration
- REST API with OpenAPI spec
- Webhook delivery with retry
- ERP connectors (SAP, Oracle, NetSuite)
- TMS connectors (for logistics)
- Batch file upload (CSV, XML)

### Support
- Dedicated account manager
- 24/7 support for urgent payments
- Custom SLAs
- Regular business reviews
