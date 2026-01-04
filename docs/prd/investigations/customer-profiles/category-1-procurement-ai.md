# Category 1: Procurement & Supply Chain AI

**Last Updated:** January 2026  
**Profiles:** 4  
**Monthly Volume Range:** $2M - $80M  
**Primary Protocols:** Direct API, AP2

---

## Category Overview

Companies building AI for enterprise procurement workflows. They handle sourcing, negotiation, contracts, and compliance—but need payment settlement to complete the loop.

### Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $10,000 - $500,000 |
| **Monthly Volume** | $2M - $50M |
| **Frequency** | 30-200 transactions/month |
| **Payment Pattern** | Event-driven (deal closes, milestone hit) |
| **Corridors** | US/EU → LATAM, Intra-LATAM |
| **Key Need** | API-triggered settlement, escrow, ERP integration |
| **Protocols** | Direct API, AP2 (mandates) |

### Why They Need PayOS
- AI handles everything *except* payment execution
- Manual handoff to treasury breaks the autonomous workflow
- Need settlement triggered programmatically on business events
- Escrow and milestone payments for large contracts
- Supplier onboarding with payment details collection

---

## Profile 1.1: Negotiation AI

**Profile Name:** `procurement_negotiation_ai`

### Description
AI platform that negotiates supplier contracts. Agents simulate counterparty behavior, recommend negotiation tactics, and can autonomously close deals within parameters.

### Business Model
- SaaS subscription ($50K-200K/year)
- Success fee (% of savings achieved)

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $5M - $15M |
| Avg Transaction | $100,000 - $300,000 |
| Transactions/Month | 30-80 |
| Settlement Urgency | Within 48 hours of deal close |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 40% | USD → MXN |
| US → Brazil | 30% | USD → BRL |
| EU → LATAM | 20% | EUR → MXN/BRL |
| Other | 10% | Various |

### Pain Points
1. Payment is manual after AI negotiates deal
2. Settlement delays damage supplier relationships
3. FX spreads erode negotiated savings
4. No payment visibility in their platform
5. Milestone payments require manual escrow

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (triggered by deal close webhook)
2. POST /v1/escrow (for milestone contracts)
3. POST /v1/escrow/{id}/release (milestone approval)
4. GET /v1/settlements/{id} (status for their dashboard)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Single settlement | $250K USD → MXN to Mexican supplier | SPEI delivery <15 min, webhook confirmation |
| 2 | 3-milestone escrow | $1.2M contract, 30/40/30 split | Escrow created, milestone 1 ($360K) released on approval |
| 3 | Batch suppliers | 12 suppliers across BR/MX/CO, $3M total | 95%+ success rate, detailed status per payment |
| 4 | Failed settlement | Invalid CLABE provided | Clear error code, suggested action, retry flow |

### Seed Data Requirements
- 3 enterprise customer accounts (Fortune 500 manufacturers)
- 20 supplier accounts (MX: 8, BR: 6, CO: 3, Other: 3)
- 100 historical settlements (last 6 months)
- 10 escrow agreements (various stages: pending, partial, complete)
- Deal metadata (negotiated terms, savings %)

### Sample Entities

**Partner Account:**
```json
{
  "name": "NegotiateAI Ltd",
  "type": "procurement_negotiation_ai",
  "tier": "growth",
  "monthly_volume_usd": 8000000,
  "primary_corridors": ["US-MX", "US-BR"],
  "integration_type": "api",
  "features": ["settlements", "escrow", "webhooks"]
}
```

**Sample Supplier:**
```json
{
  "name": "Componentes Industriales SA de CV",
  "country": "MX",
  "currency": "MXN",
  "payment_method": "spei",
  "clabe": "012180001234567890",
  "avg_transaction_usd": 185000,
  "payment_terms": "net_30"
}
```

---

## Profile 1.2: Sourcing & Procurement Suite

**Profile Name:** `procurement_sourcing_suite`

### Description
End-to-end procurement platform: supplier discovery, RFx management, contract lifecycle, spend analytics. Their "AI copilot" automates sourcing workflows.

### Business Model
- Platform SaaS ($100K-500K/year)
- Per-seat licensing ($500-2000/user/month)

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $20M - $80M |
| Avg Transaction | $15,000 - $50,000 |
| Transactions/Month | 500-2,000 |
| Payment Pattern | Weekly batches (Fridays) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → LATAM | 35% | USD → MXN/BRL/COP |
| EU → LATAM | 30% | EUR → MXN/BRL |
| Intra-EU | 25% | EUR → EUR |
| Other | 10% | Various |

### Pain Points
1. "Source to pay" stops at PO generation
2. Each customer has different payment setup
3. No payment analytics in their dashboards
4. Supplier onboarding doesn't include payment details
5. Can't offer payment financing features

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (weekly batch)
2. POST /v1/entities/suppliers (supplier onboarding)
3. GET /v1/analytics/settlements (dashboard data)
4. POST /v1/settlements/simulate (batch preview)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Weekly batch | 400 payments, 8 countries, $12M total | 95%+ success by EOD, detailed failure reasons |
| 2 | Supplier onboarding | New Brazilian supplier with Pix key | Verified, KYB complete, ready in 24h |
| 3 | Batch simulation | 400 payments preview | Fees, FX rates, ETAs calculated before execution |
| 4 | Partial batch failure | 5% invalid payment details | Success for valid (95%), clear errors for failures |

### Seed Data Requirements
- 5 enterprise customer accounts (automotive, industrial, consumer goods)
- 300 supplier accounts (BR: 100, MX: 80, CO: 50, AR: 30, EU: 40)
- 3,000 historical settlements (last 12 months)
- Weekly batch records (52 weeks)
- Supplier categories and spend analytics

### Sample Entities

**Partner Account:**
```json
{
  "name": "SourceFlow GmbH",
  "type": "procurement_sourcing_suite",
  "tier": "enterprise",
  "monthly_volume_usd": 45000000,
  "primary_corridors": ["DE-BR", "DE-MX", "US-LATAM"],
  "integration_type": "api",
  "features": ["batch_settlements", "supplier_onboarding", "analytics", "simulation"]
}
```

**Sample Batch:**
```json
{
  "batch_id": "batch_20260103_weekly",
  "customer_id": "cust_automotive_corp",
  "total_payments": 387,
  "total_amount_usd": 11850000,
  "countries": ["MX", "BR", "CO", "AR", "DE", "FR"],
  "scheduled_date": "2026-01-03",
  "status": "pending"
}
```

---

## Profile 1.3: Contract Compliance AI

**Profile Name:** `procurement_compliance_ai`

### Description
AI monitors supplier contracts for compliance, errors, and missed opportunities. Automatically identifies volume rebates, payment term violations, SLA penalties.

### Business Model
- Pay-per-cure (% of recovered value)
- Platform subscription for monitoring

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $2M - $8M (adjustments) |
| Avg Transaction | $20,000 - $80,000 |
| Transactions/Month | 50-150 |
| Type | Mix of payments, credits, debits |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 50% | USD → MXN |
| US → Brazil | 30% | USD → BRL |
| EU → LATAM | 20% | EUR → Various |

### Pain Points
1. Identify recovery opportunity but can't execute adjustment
2. Credit notes require manual processing
3. Early payment discounts expire before treasury acts
4. No integration between contract and payment systems
5. Audit trail is fragmented

### PayOS Integration
```
API Flow:
1. POST /v1/adjustments (credit or debit)
2. POST /v1/settlements (early payment for discount)
3. GET /v1/context/suppliers/{id} (payment history)
4. POST /v1/settlements/simulate (discount calculation)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Volume rebate credit | $85K missed rebate identified | Credit reflected in customer treasury within 24h |
| 2 | Early payment discount | $500K invoice, 2% discount if paid in 10 days | Savings calculated ($10K), executed if approved |
| 3 | SLA penalty | $25K penalty for missed SLA | Deducted from supplier's next payment |
| 4 | Multi-entity adjustment | 3 payers on 1 contract | Proper allocation across entities |

### Seed Data Requirements
- 3 enterprise customer accounts
- 75 supplier accounts with active contracts
- 200 historical adjustments (credits and debits)
- Contract terms metadata (rebate thresholds, SLAs, payment terms)
- Recovery opportunity pipeline

### Sample Entities

**Partner Account:**
```json
{
  "name": "ContractGuard AI",
  "type": "procurement_compliance_ai",
  "tier": "growth",
  "monthly_volume_usd": 3500000,
  "primary_corridors": ["US-MX", "US-BR"],
  "integration_type": "api",
  "features": ["adjustments", "settlements", "context_api"]
}
```

**Sample Adjustment:**
```json
{
  "type": "credit",
  "reason": "volume_rebate_recovery",
  "amount_usd": 85000,
  "supplier_id": "sup_mx_manufacturer_01",
  "customer_id": "cust_fortune500_01",
  "contract_reference": "MSA-2024-0847",
  "recovery_period": "Q3-2025"
}
```

---

## Profile 1.4: Spend Analytics Platform

**Profile Name:** `procurement_spend_analytics`

### Description
AI-powered spend visibility and optimization. Categorizes spend, identifies savings opportunities, benchmarks against industry.

### Business Model
- Analytics SaaS ($50K-200K/year)
- Advisory services

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $10M - $30M (visibility, not initiated) |
| Avg Transaction | $5,000 - $25,000 |
| Transactions/Month | 1,000-3,000 |
| Their Role | Analytics layer, payment data consumer |

### Key Need
- Payment data ingestion for analytics
- Real-time spend visibility
- Category-level reporting
- Anomaly detection on payment patterns

### PayOS Integration
```
API Flow:
1. GET /v1/settlements (data feed for analytics)
2. GET /v1/analytics/spend (aggregated views)
3. Webhooks for real-time updates
4. Export APIs for their dashboards
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Data sync | Pull 30 days of settlements | Complete transaction data with metadata |
| 2 | Real-time webhook | New settlement created | Webhook fires <1 second |
| 3 | Category analysis | Group by supplier category | Accurate categorization and totals |
| 4 | Anomaly alert | Unusual payment pattern detected | Alert triggered with details |

### Seed Data Requirements
- 3 enterprise accounts (data consumers)
- 500 suppliers with category assignments
- 5,000 historical settlements with rich metadata
- Category taxonomy (direct materials, indirect, services, etc.)
- Benchmark data

### Sample Entities

**Partner Account:**
```json
{
  "name": "SpendLens Analytics",
  "type": "procurement_spend_analytics",
  "tier": "growth",
  "monthly_volume_usd": 0,
  "primary_corridors": ["data_consumer"],
  "integration_type": "api_readonly",
  "features": ["analytics", "webhooks", "exports"]
}
```

**Sample Analytics Query:**
```json
{
  "query_type": "spend_by_category",
  "customer_id": "cust_manufacturing_01",
  "date_range": {
    "start": "2025-10-01",
    "end": "2025-12-31"
  },
  "group_by": ["category", "country", "currency"],
  "include_yoy_comparison": true
}
```

---

## Category Summary

| Profile | Name | Volume | Tx Size | Key Feature |
|---------|------|--------|---------|-------------|
| 1.1 | `procurement_negotiation_ai` | $5-15M | $100-300K | Deal close → settlement trigger |
| 1.2 | `procurement_sourcing_suite` | $20-80M | $15-50K | Weekly batch, supplier onboarding |
| 1.3 | `procurement_compliance_ai` | $2-8M | $20-80K | Adjustments, early pay discounts |
| 1.4 | `procurement_spend_analytics` | $10-30M | $5-25K | Data feed, analytics API |

---

## Integration Priority

For PayOS development, prioritize these features for Category 1:

1. **Settlement API** — Core for all profiles
2. **Batch Processing** — Critical for 1.2
3. **Escrow/Milestones** — Important for 1.1
4. **Adjustments API** — Unique to 1.3
5. **Analytics/Export** — Important for 1.4
6. **Supplier Onboarding** — Valuable for 1.2
7. **Simulation Engine** — Valuable for 1.1, 1.2, 1.3
