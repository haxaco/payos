# PayOS Customer Categories & Test Profiles

**Last Updated:** January 2026  
**Purpose:** Categorized customer profiles for testing and demos without naming real companies

---

## Category Overview

| # | Category | Subcategories | Example Profiles | Key Characteristics |
|---|----------|---------------|------------------|---------------------|
| 1 | **Procurement & Supply Chain AI** | Negotiation, Sourcing, Compliance, Spend Analytics | 4 | High-value B2B, milestone payments, ERP integration |
| 2 | **LATAM Fintechs** | Neobanks, Wallets, Crypto Exchanges, Lending | 4 | High volume, local rails, consumer + B2B |
| 3 | **Global Payroll & HR** | EOR, Contractor Payments, Benefits | 3 | Batch payroll, multi-country, compliance-heavy |
| 4 | **Remittance & Money Transfer** | Consumer P2P, Corridor Specialists, Digital-First | 3 | High frequency, small amounts, speed-critical |
| 5 | **Creator & Gig Economy** | Streaming, Freelance Platforms, Marketplaces | 3 | Many small payouts, thresholds, self-service |
| 6 | **Enterprise & Logistics** | Freight, Manufacturing, Retail | 3 | Large B2B, urgent payments, vendor management |
| 7 | **Agentic Commerce Platforms** | Shopping Agents, Enterprise Agents, API Platforms | 4 | Protocol-native, autonomous, spending policies |
| 8 | **Cross-Border E-Commerce** | Marketplaces, D2C Brands, Dropshipping | 3 | Merchant settlement, multi-currency, refunds |

**Total: 8 Categories, 27 Subcategory Profiles**

---

# Category 1: Procurement & Supply Chain AI

Companies building AI for enterprise procurement workflows. They handle sourcing, negotiation, contracts, and compliance—but need payment settlement to complete the loop.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $10,000 - $500,000 |
| **Monthly Volume** | $2M - $50M |
| **Frequency** | 30-200 transactions/month |
| **Payment Pattern** | Event-driven (deal closes, milestone hit) |
| **Corridors** | US/EU → LATAM, Intra-LATAM |
| **Key Need** | API-triggered settlement, escrow, ERP integration |
| **Protocols** | Direct API, AP2 (mandates) |

## Subcategory 1.1: Negotiation AI

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
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Single settlement | $250K USD → MXN | SPEI delivery <15 min |
| 3-milestone escrow | $1.2M, 30/40/30 split | Escrow created, milestone releases work |
| Batch suppliers | 12 suppliers, $3M total | 95%+ success, detailed status |
| Failed settlement | Invalid CLABE | Clear error, suggested action |

### Seed Data Requirements
- 3 enterprise customer accounts
- 20 supplier accounts (MX: 8, BR: 6, CO: 3, Other: 3)
- 100 historical settlements
- 10 escrow agreements (various stages)

---

## Subcategory 1.2: Sourcing & Procurement Suite

**Profile Name:** `procurement_sourcing_suite`

### Description
End-to-end procurement platform: supplier discovery, RFx management, contract lifecycle, spend analytics. AI copilot automates workflows.

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
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Weekly batch | 400 payments, $12M | 95%+ success by EOD |
| Supplier onboarding | New BR supplier | Pix key verified, ready in 24h |
| Batch simulation | 400 payments preview | Fees, FX, ETAs calculated |
| Partial batch failure | 5% invalid details | Success for valid, clear errors for failures |

### Seed Data Requirements
- 5 enterprise customer accounts
- 300 supplier accounts (multi-country)
- 3,000 historical settlements
- Weekly batch records (12 weeks)

---

## Subcategory 1.3: Contract Compliance AI

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
1. Identify recovery but can't execute adjustment
2. Credit notes require manual processing
3. Early payment discounts expire before action
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
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Volume rebate credit | $85K credit to customer | Reflected in 24h |
| Early payment discount | $500K invoice, 2% if paid in 10 days | Savings calculated, executed |
| SLA penalty | $25K deduction from next payment | Applied to pending settlement |
| Multi-entity adjustment | 3 payers on 1 contract | Proper allocation |

### Seed Data Requirements
- 3 enterprise customer accounts
- 75 supplier accounts with contracts
- 200 historical adjustments
- Contract terms metadata

---

## Subcategory 1.4: Spend Analytics Platform

**Profile Name:** `procurement_spend_analytics`

### Description
AI-powered spend visibility and optimization. Categorizes spend, identifies savings opportunities, benchmarks against industry.

### Business Model
- Analytics SaaS ($50K-200K/year)
- Advisory services

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $10M - $30M (visibility) |
| Avg Transaction | $5,000 - $25,000 |
| Transactions/Month | 1,000-3,000 |
| Their Role | Analytics layer, not payment initiator |

### Key Need
- Payment data ingestion for analytics
- Real-time spend visibility
- Category-level reporting
- Anomaly detection

### PayOS Integration
```
API Flow:
1. GET /v1/settlements (data feed for analytics)
2. GET /v1/analytics/spend (aggregated views)
3. Webhooks for real-time updates
4. Export APIs for their dashboards
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Data sync | Pull 30 days of settlements | Complete transaction data |
| Real-time webhook | New settlement created | Webhook fires <1 sec |
| Category analysis | Group by supplier category | Accurate categorization |
| Anomaly alert | Unusual payment pattern | Alert triggered |

### Seed Data Requirements
- 3 enterprise accounts
- 500 suppliers with categories
- 5,000 historical settlements
- Category taxonomy

---

# Category 2: LATAM Fintechs

Financial technology companies based in or focused on Latin America. Need cross-border capabilities, local rail integration, and agentic payment features.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $50 - $50,000 |
| **Monthly Volume** | $10M - $500M |
| **Frequency** | 10,000 - 500,000 transactions/month |
| **Payment Pattern** | Real-time, on-demand |
| **Corridors** | US → LATAM, EU → LATAM, Intra-LATAM |
| **Key Need** | White-label, instant settlement, competitive FX |
| **Protocols** | Direct API, x402 |

## Subcategory 2.1: Digital Bank / Neobank

**Profile Name:** `latam_neobank`

### Description
Mobile-first digital bank serving consumers. Pix/SPEI native for domestic, launching cross-border remittance and B2B services.

### Business Model
- Transaction fees (0.5-1.5%)
- Premium subscriptions
- Interchange revenue

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $100M - $300M (domestic) |
| Cross-Border Target | $10M - $30M |
| Avg Transaction | $200 - $500 (remittance) |
| Transactions/Month | 50,000 - 150,000 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 60% | USD → BRL |
| EU → Brazil | 25% | EUR → BRL |
| Other LATAM → Brazil | 15% | Various → BRL |

### Pain Points
1. Building cross-border is 12+ months
2. Correspondent banking is expensive
3. Need instant delivery (users expect Pix speed)
4. Compliance burden for international
5. Can't compete on FX rates

### PayOS Integration
```
API Flow:
1. POST /v1/quotes (FX quote for user display)
2. POST /v1/settlements (execute transfer)
3. GET /v1/settlements/{id}/track (real-time status)
4. Webhooks for app notifications
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Consumer remittance | $500 US → BR | Pix in <10 min |
| Quote display | $1000 USD → BRL | Rate, fees, ETA shown |
| Peak load | 5,000 tx in 1 hour | All processed, <15 min avg |
| Failed Pix key | Invalid CPF format | Clear error, correction flow |

### Seed Data Requirements
- 1 partner account
- 10,000 sender accounts (US-based)
- 10,000 recipient accounts (Brazil)
- 100,000 historical remittances
- Failure scenarios

---

## Subcategory 2.2: Digital Wallet

**Profile Name:** `latam_wallet`

### Description
Mobile wallet for payments, P2P transfers, and merchant payments. Strong domestic presence, adding international features.

### Business Model
- Merchant fees (1.5-2.5%)
- P2P fees (free domestic, fee for international)
- Float income

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $50M - $150M |
| Cross-Border Target | $5M - $15M |
| Avg Transaction | $50 - $200 |
| Transactions/Month | 200,000 - 500,000 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 70% | USD → MXN |
| Mexico → US | 20% | MXN → USD |
| Other | 10% | Various |

### Pain Points
1. International P2P is clunky
2. Merchant settlement for cross-border is slow
3. Users want to hold USD
4. No crypto/stablecoin option
5. Compliance for international limits growth

### PayOS Integration
```
API Flow:
1. POST /v1/wallets (user wallet creation)
2. POST /v1/transfers (P2P international)
3. POST /v1/settlements (merchant settlement)
4. GET /v1/wallets/{id}/balance (multi-currency)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| International P2P | $100 US → MX wallet | Instant wallet credit |
| USD hold | User holds $500 USD | Balance shown, no auto-convert |
| Merchant settlement | MX merchant, $10K daily | SPEI next-day |
| Stablecoin option | User prefers USDC | USDC credited to wallet |

### Seed Data Requirements
- 1 partner account
- 20,000 user wallet accounts
- 5,000 merchant accounts
- 500,000 historical transactions

---

## Subcategory 2.3: Crypto Exchange (B2B Focus)

**Profile Name:** `latam_crypto_exchange`

### Description
Crypto exchange with strong B2B services: treasury management, cross-border payments, stablecoin on/off ramps for fintechs.

### Business Model
- Trading fees (0.1-0.5%)
- B2B service fees
- Spread on stablecoin conversion

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $100M - $300M (B2B) |
| Avg Transaction | $10,000 - $50,000 |
| Transactions/Month | 5,000 - 15,000 |
| Client Type | Fintechs, remittance cos, corporates |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 50% | USDC → MXN |
| US → Brazil | 30% | USDC → BRL |
| Intra-LATAM | 20% | USDC → Various |

### Pain Points
1. B2B clients want multi-protocol support
2. No AP2 for recurring payments
3. Each integration is custom
4. Agentic commerce clients need flexibility
5. Want to white-label settlement

### PayOS Integration
```
API Flow:
1. POST /v1/x402/endpoints (register x402 services)
2. POST /v1/ap2/mandates (mandate management)
3. POST /v1/settlements (fiat off-ramp)
4. GET /v1/agents (agent wallet management)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| x402 API payment | 0.05 USDC per call | Micro-payment processed |
| AP2 mandate | $50K/month supplier | Mandate created, monthly execution |
| Bulk off-ramp | $500K USDC → MXN | SPEI in <30 min |
| Agent wallet | Provision for client's AI | Wallet created, limits set |

### Seed Data Requirements
- 1 partner account
- 50 B2B client accounts
- 200 agent wallets
- 20,000 x402 transactions
- 100 AP2 mandates

---

## Subcategory 2.4: Lending Platform

**Profile Name:** `latam_lending_platform`

### Description
Digital lending platform: personal loans, SMB lending, BNPL. Need disbursement and collection capabilities.

### Business Model
- Interest income
- Origination fees
- Late fees

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Disbursements | $20M - $60M |
| Monthly Collections | $18M - $55M |
| Avg Disbursement | $2,000 - $10,000 |
| Transactions/Month | 10,000 - 30,000 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Domestic Brazil | 50% | BRL |
| Domestic Mexico | 40% | MXN |
| Cross-border (diaspora) | 10% | USD → BRL/MXN |

### Pain Points
1. Disbursement speed affects conversion
2. Collection costs are high
3. Cross-border diaspora loans are complex
4. Reconciliation is manual
5. No real-time payment status

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (bulk disbursements)
2. POST /v1/collections (set up collection)
3. Webhooks for payment confirmations
4. GET /v1/reconciliation (daily reports)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Bulk disbursement | 500 loans, $3M | All disbursed in 2 hours |
| Instant disbursement | Single $5K loan | Pix in <5 min |
| Collection setup | Monthly payment $500 | Mandate created |
| Diaspora loan | US borrower, BR disbursement | Cross-border disbursement |

### Seed Data Requirements
- 1 partner account
- 20,000 borrower accounts
- 50,000 loan records
- Disbursement and collection history

---

# Category 3: Global Payroll & HR

Companies managing international workforce payments: salaries, contractor payments, benefits, expenses.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $1,000 - $20,000 |
| **Monthly Volume** | $5M - $100M |
| **Frequency** | Semi-monthly batches |
| **Payment Pattern** | Scheduled (15th, last day) |
| **Corridors** | US/EU → Global (LATAM focus) |
| **Key Need** | Multi-country batch, compliance, consistency |
| **Protocols** | Direct API |

## Subcategory 3.1: Employer of Record (EOR)

**Profile Name:** `global_eor_platform`

### Description
Employs workers on behalf of companies without local entities. Handles compliance, payroll, benefits, taxes.

### Business Model
- Per-employee fee ($300-700/month)
- FX margin on payroll

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $20M - $80M |
| LATAM Portion | $6M - $25M (30%) |
| Avg Salary | $3,000 - $8,000 |
| Employees Managed | 5,000 - 20,000 |
| Pay Frequency | Semi-monthly |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 35% | USD → BRL |
| US → Mexico | 30% | USD → MXN |
| US → Argentina | 20% | USD → ARS |
| US → Colombia | 15% | USD → COP |

### Pain Points
1. LATAM payroll costs 3-4% vs 0.5% US
2. Argentina currency controls cause delays
3. Inconsistent pay dates across countries
4. Each country needs different rails
5. Compliance documentation is manual

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (payroll run)
2. POST /v1/entities/employees (onboarding)
3. GET /v1/compliance/requirements (country rules)
4. GET /v1/settlements/batch/{id}/status (tracking)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Monthly payroll | 2,500 employees, 4 countries | All paid within 24h |
| Employee onboarding | New hire in Brazil | CPF verified, bank verified |
| Argentina payment | 400 employees, $1.2M | Compliant routing, docs provided |
| Failed payment | Invalid bank account | Clear error, retry flow |

### Seed Data Requirements
- 1 partner account
- 100 company client accounts
- 5,000 employee accounts
- 24 months payroll history
- Compliance documentation

---

## Subcategory 3.2: Contractor Payment Platform

**Profile Name:** `global_contractor_payments`

### Description
Platform for paying international contractors. Handles invoicing, compliance, payments for companies with global freelance workforce.

### Business Model
- Platform fee (2-3%)
- FX margin
- Premium features

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $10M - $40M |
| Avg Payment | $800 - $3,000 |
| Contractors | 10,000 - 40,000 |
| Pay Frequency | Weekly, bi-weekly, monthly |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 35% | USD → BRL |
| US → Mexico | 25% | USD → MXN |
| EU → LATAM | 20% | EUR → Various |
| US → Argentina | 10% | USD → ARS |
| Other | 10% | Various |

### Pain Points
1. Contractors hate waiting 5-7 days
2. Fees eat contractor earnings
3. No stablecoin option
4. Self-service is limited
5. Each country has different timing

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (weekly/monthly batch)
2. POST /v1/settlements (on-demand instant payout)
3. POST /v1/entities/contractors (self-service onboarding)
4. GET /v1/wallets/{id}/balance (available for payout)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Weekly batch | 3,500 contractors, $4M | All received by +48h |
| Instant payout | $2,400 on-demand | Pix/SPEI in <15 min |
| Stablecoin option | USDC preference | Direct USDC transfer |
| Self-service update | Contractor changes bank | Verified, updated |

### Seed Data Requirements
- 1 partner account
- 1,000 company accounts
- 10,000 contractor accounts
- 100,000 historical payments

---

## Subcategory 3.3: Benefits & Expenses Platform

**Profile Name:** `global_benefits_expenses`

### Description
Platform for international employee benefits and expense reimbursements. Health stipends, equipment allowances, travel expenses.

### Business Model
- Platform SaaS
- Per-transaction fee
- Card program revenue

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $3M - $15M |
| Avg Transaction | $100 - $1,000 |
| Transactions/Month | 15,000 - 50,000 |
| Type | Stipends, reimbursements |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → LATAM | 60% | USD → Various |
| EU → LATAM | 30% | EUR → Various |
| Other | 10% | Various |

### Pain Points
1. Small amounts expensive to send
2. Timing expectations (employees want fast)
3. Multiple payment types (stipend vs reimbursement)
4. Card program integration
5. Expense reconciliation

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (monthly stipends)
2. POST /v1/settlements (instant reimbursement)
3. POST /v1/cards/fund (virtual card funding)
4. GET /v1/reconciliation/expenses (expense reports)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Monthly stipends | 2,000 employees, $200 each | All delivered by 5th |
| Instant reimbursement | $350 travel expense | Paid in <1 hour |
| Virtual card funding | $500 equipment allowance | Card funded instantly |
| Small amount batch | 500 x $50 stipends | Cost-effective delivery |

### Seed Data Requirements
- 1 partner account
- 50 company accounts
- 5,000 employee accounts
- 100,000 historical transactions
- Expense categories

---

# Category 4: Remittance & Money Transfer

Companies focused on cross-border consumer money transfer. High volume, small amounts, speed-critical.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $50 - $1,000 |
| **Monthly Volume** | $5M - $100M |
| **Frequency** | 20,000 - 500,000 transactions/month |
| **Payment Pattern** | Real-time, peaks on paydays |
| **Corridors** | US → LATAM primary |
| **Key Need** | Speed, cost, reliability |
| **Protocols** | Direct API |

## Subcategory 4.1: Consumer Remittance App

**Profile Name:** `remittance_consumer_app`

### Description
Mobile app for consumer remittances. Focus on specific diaspora community (e.g., Hispanic in US sending to Mexico/Central America).

### Business Model
- FX margin (1-3%)
- Flat fee ($2-5)

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $10M - $50M |
| Avg Transaction | $250 - $400 |
| Transactions/Month | 30,000 - 150,000 |
| Peak Times | Fridays, 15th, 30th |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 70% | USD → MXN |
| US → Guatemala | 15% | USD → GTQ |
| US → El Salvador | 10% | USD → USD |
| Other | 5% | Various |

### Pain Points
1. Current provider is slow (24h+)
2. FX rates not competitive
3. Can't offer instant delivery
4. Limited to few countries
5. No debit card collection

### PayOS Integration
```
API Flow:
1. POST /v1/quotes (display to user)
2. POST /v1/collections/card (card collection)
3. POST /v1/settlements (payout)
4. GET /v1/settlements/{id}/track (real-time tracking)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Standard remittance | $300 US → MX | SPEI in <10 min |
| Card collection | Visa debit | Collected, settled |
| Peak load | 3,000 tx in 2 hours | All processed |
| Cash pickup | $200 to Oxxo | Pickup code generated |

### Seed Data Requirements
- 1 partner account
- 10,000 sender accounts
- 10,000 recipient accounts
- 200,000 historical remittances
- Peak load scenarios

---

## Subcategory 4.2: Corridor Specialist

**Profile Name:** `remittance_corridor_specialist`

### Description
Focused on specific high-volume corridor with deep local expertise. Partners with local agents, banks, mobile money.

### Business Model
- FX margin (0.5-1.5%)
- Agent commissions
- B2B wholesale

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $30M - $100M |
| Avg Transaction | $200 - $600 |
| Transactions/Month | 80,000 - 250,000 |
| B2B Portion | 30% (wholesale to agents) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 100% | USD → BRL |

### Pain Points
1. Pix delivery speed is table stakes
2. B2B partners demand wholesale rates
3. Compliance costs are significant
4. Agent network management
5. Cash-out options needed

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (consumer)
2. POST /v1/settlements/wholesale (B2B)
3. POST /v1/cashout/locations (cash pickup)
4. GET /v1/compliance/brazil (regulatory)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Pix delivery | $500 US → BR | Pix in <5 min |
| Wholesale batch | Agent batch, 500 tx | Wholesale rate applied |
| Cash pickup | $300 to Banco do Brasil | Pickup ready in 1 hour |
| High value | $5,000 (requires docs) | Compliance flow triggered |

### Seed Data Requirements
- 1 partner account
- 5 B2B agent accounts
- 20,000 sender accounts
- 20,000 recipient accounts
- 500,000 historical transactions

---

## Subcategory 4.3: Digital-First Money Transfer

**Profile Name:** `remittance_digital_first`

### Description
Tech-first money transfer targeting younger demographics. Mobile-first, social features, gamification, crypto options.

### Business Model
- Freemium (first transfer free)
- FX margin
- Premium subscriptions

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $5M - $20M |
| Avg Transaction | $150 - $300 |
| Transactions/Month | 25,000 - 80,000 |
| User Demographics | 18-35, mobile-native |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 50% | USD → MXN |
| US → Colombia | 25% | USD → COP |
| US → Brazil | 25% | USD → BRL |

### Pain Points
1. Need instant for young users
2. Want crypto/stablecoin option
3. Social features need payment integration
4. Gamification requires micro-rewards
5. Traditional branding doesn't resonate

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (fiat)
2. POST /v1/settlements/stablecoin (USDC option)
3. POST /v1/rewards (micro-rewards)
4. Webhooks for social features
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Instant transfer | $200 US → MX | SPEI in <5 min |
| Stablecoin option | $100 as USDC | USDC to recipient wallet |
| Referral reward | $5 bonus | Instant credit |
| Social send | Send to contact | Notification + delivery |

### Seed Data Requirements
- 1 partner account
- 15,000 user accounts
- Social graph data
- 150,000 historical transactions
- Gamification records

---

# Category 5: Creator & Gig Economy

Platforms paying creators, freelancers, and gig workers. Many small payouts, threshold management, self-service.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $20 - $5,000 |
| **Monthly Volume** | $5M - $50M |
| **Frequency** | 10,000 - 200,000 payouts/month |
| **Payment Pattern** | Monthly batches, on-demand |
| **Corridors** | US/EU → Global (LATAM significant) |
| **Key Need** | Low cost for small amounts, self-service |
| **Protocols** | Direct API, x402 (stablecoin option) |

## Subcategory 5.1: Streaming Platform Payouts

**Profile Name:** `creator_streaming_payouts`

### Description
B2B infrastructure for streaming platform creator payments. Handle payouts for gaming, music, video platforms.

### Business Model
- Per-payout fee
- Platform SaaS
- Float income

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $20M - $60M |
| LATAM Portion | $5M - $15M (25%) |
| Avg Payout | $100 - $400 |
| Payouts/Month | 100,000 - 300,000 |
| Threshold | $50 minimum |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 40% | USD → BRL |
| US → Mexico | 35% | USD → MXN |
| US → Argentina | 15% | USD → ARS |
| US → Colombia | 10% | USD → COP |

### Pain Points
1. LATAM payouts cost 4-5%
2. Small payouts not economical
3. Creators want faster payments
4. Platform clients want cost reduction
5. No crypto option for gaming creators

### PayOS Integration
```
API Flow:
1. POST /v1/settlements/batch (monthly batch)
2. POST /v1/settlements/aggregate (sub-threshold)
3. POST /v1/settlements/stablecoin (crypto option)
4. GET /v1/analytics/payouts (platform dashboard)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Monthly batch | 50,000 LATAM creators | Cost <1%, 48h delivery |
| Sub-threshold | $30 balance | Aggregated, paid when $50 |
| Crypto payout | USDC preference | Direct to wallet |
| Platform dashboard | Real-time stats | Volume, costs, status |

### Seed Data Requirements
- 1 partner account
- 10 platform client accounts
- 50,000 creator accounts
- 500,000 historical payouts
- Threshold tracking

---

## Subcategory 5.2: Freelance Marketplace

**Profile Name:** `creator_freelance_marketplace`

### Description
Marketplace connecting freelancers with clients. Handles contracts, escrow, milestones, payouts.

### Business Model
- Platform fee (10-20%)
- Payment processing fee
- Premium subscriptions

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $10M - $30M |
| Avg Project | $500 - $3,000 |
| Avg Payout | $400 - $2,500 |
| Payouts/Month | 15,000 - 50,000 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Brazil | 30% | USD → BRL |
| US → Mexico | 25% | USD → MXN |
| EU → LATAM | 25% | EUR → Various |
| Other | 20% | Various |

### Pain Points
1. Escrow release to payout is slow
2. Freelancers want instant access
3. International fees are high
4. Milestone payments are complex
5. Dispute resolution affects payments

### PayOS Integration
```
API Flow:
1. POST /v1/escrow (project escrow)
2. POST /v1/escrow/{id}/milestones/{mid}/release
3. POST /v1/settlements (instant payout)
4. GET /v1/disputes (dispute management)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Project escrow | $2,000 project, 3 milestones | Escrow funded |
| Milestone release | Milestone 1 approved | $600 released to freelancer |
| Instant payout | Available balance $1,500 | Paid in <15 min |
| Dispute hold | Client disputes milestone | Funds held pending resolution |

### Seed Data Requirements
- 1 partner account
- 5,000 client accounts
- 15,000 freelancer accounts
- 50,000 project records
- Escrow and milestone data

---

## Subcategory 5.3: Gig Work Platform

**Profile Name:** `creator_gig_platform`

### Description
Platform for gig workers: delivery, rideshare, tasks. High frequency, small payouts, instant access important.

### Business Model
- Platform fee on transactions
- Instant payout fee (1-2%)
- Tip processing

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $15M - $40M |
| Avg Payout | $50 - $200 |
| Payouts/Month | 200,000 - 500,000 |
| Instant % | 40% pay for instant |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Domestic Brazil | 50% | BRL |
| Domestic Mexico | 40% | MXN |
| Cross-border | 10% | USD → Various |

### Pain Points
1. Workers need instant access to earnings
2. Small amounts make fees significant
3. High transaction volume needs efficiency
4. Multiple payout preferences
5. Tip processing is separate

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (standard payout)
2. POST /v1/settlements/instant (instant, fee applies)
3. POST /v1/settlements/batch (daily batch)
4. Webhooks for earnings updates
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Instant cashout | $85 earnings | Pix in <5 min |
| Daily batch | 10,000 workers | All paid by midnight |
| Tip payout | $12 tip | Added to next payout |
| High frequency | Worker cashes out 3x/day | All processed |

### Seed Data Requirements
- 1 partner account
- 50,000 worker accounts
- 5,000,000 historical payouts
- Earnings and tip records

---

# Category 6: Enterprise & Logistics

Large enterprises with significant cross-border payment needs. Vendor payments, supply chain, urgent settlements.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $5,000 - $500,000 |
| **Monthly Volume** | $20M - $200M |
| **Frequency** | 1,000 - 20,000 transactions/month |
| **Payment Pattern** | Mix of urgent and scheduled |
| **Corridors** | US → LATAM, Global → LATAM |
| **Key Need** | Speed, reliability, integration |
| **Protocols** | Direct API, AP2 |

## Subcategory 6.1: Freight & Logistics

**Profile Name:** `enterprise_freight_logistics`

### Description
International freight forwarding and logistics. Paying carriers, customs brokers, port operators across borders.

### Business Model
- Freight forwarding fees
- Customs brokerage
- Logistics services

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $30M - $100M |
| Avg Transaction | $5,000 - $15,000 |
| Transactions/Month | 4,000 - 12,000 |
| Urgent % | 30% same-day required |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 45% | USD → MXN |
| US → Brazil | 25% | USD → BRL |
| US → Colombia | 15% | USD → COP |
| Other | 15% | Various |

### Pain Points
1. Shipment holds due to payment delays
2. Carriers demand same-day payment
3. FX costs eat margins
4. Treasury managing many bank relationships
5. No visibility for operations team

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (urgent payment)
2. POST /v1/settlements/batch (weekly batch)
3. POST /v1/escrow (customs hold)
4. Webhooks for TMS integration
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Urgent carrier payment | $12K, 2 hour deadline | SPEI in <30 min |
| Weekly batch | 500 carriers, $6M | 95%+ by EOD |
| Customs escrow | $50K hold | Released on clearance webhook |
| TMS integration | Payment status | Real-time updates |

### Seed Data Requirements
- 1 enterprise account
- 1,000 carrier/vendor accounts
- 50,000 historical payments
- Shipment reference data

---

## Subcategory 6.2: Manufacturing

**Profile Name:** `enterprise_manufacturing`

### Description
Manufacturer with LATAM supply chain. Paying component suppliers, contract manufacturers, logistics providers.

### Business Model
- Product manufacturing
- Supply chain management

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $50M - $150M |
| Avg Transaction | $20,000 - $100,000 |
| Transactions/Month | 1,000 - 3,000 |
| Payment Terms | Net 30/60/90 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 60% | USD → MXN |
| US → Brazil | 25% | USD → BRL |
| US → China | 10% | USD → CNY |
| Other | 5% | Various |

### Pain Points
1. Payment timing affects supplier relationships
2. Early payment discounts expire
3. Currency exposure on large orders
4. ERP integration is manual
5. Milestone payments for large orders

### PayOS Integration
```
API Flow:
1. POST /v1/settlements (standard)
2. POST /v1/settlements/schedule (scheduled for terms)
3. POST /v1/escrow (milestone orders)
4. POST /v1/quotes/lock (FX hedging)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Standard payment | $75K to MX supplier | SPEI next-day |
| Early pay discount | Pay in 10 days, save 2% | Discount calculated, executed |
| Milestone order | $500K, 3 milestones | Escrow managed |
| FX lock | Lock rate for 30 days | Rate guaranteed |

### Seed Data Requirements
- 1 enterprise account
- 500 supplier accounts
- 20,000 historical payments
- Payment terms data

---

## Subcategory 6.3: Retail & E-Commerce Enterprise

**Profile Name:** `enterprise_retail_ecommerce`

### Description
Large retailer with LATAM operations. Paying vendors, franchisees, marketplace sellers, service providers.

### Business Model
- Product retail
- Marketplace commissions
- Franchise fees

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $40M - $120M |
| Avg Transaction | $2,000 - $30,000 |
| Transactions/Month | 5,000 - 15,000 |
| Recipient Types | Vendors, franchisees, sellers |

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
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Vendor batch | 200 vendors, $8M | All paid by terms |
| Seller payouts | 2,000 sellers, $500K | Weekly batch |
| Franchisee payment | Monthly fee $15K | Scheduled, consistent |
| Refund processing | $5K return adjustment | Credit applied |

### Seed Data Requirements
- 1 enterprise account
- 500 vendor accounts
- 5,000 seller accounts
- 200 franchisee accounts
- 100,000 historical transactions

---

# Category 7: Agentic Commerce Platforms

Platforms building AI agents that need to make payments. Protocol-native, autonomous transactions, spending controls.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $0.001 - $50,000 |
| **Monthly Volume** | $100K - $20M |
| **Frequency** | 1,000 - 1,000,000 transactions/month |
| **Payment Pattern** | Autonomous, event-driven |
| **Corridors** | Global, LATAM settlement |
| **Key Need** | Protocol support, spending policies, audit |
| **Protocols** | x402, AP2, ACP |

## Subcategory 7.1: Consumer Shopping Agent

**Profile Name:** `agentic_shopping_consumer`

### Description
AI shopping assistant for consumers. Finds deals, compares prices, purchases autonomously within user limits.

### Business Model
- Freemium subscriptions
- Affiliate commissions
- Premium features

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $200K - $2M |
| Avg Transaction | $50 - $200 |
| Transactions/Month | 3,000 - 20,000 |
| Success Rate | 70% (30% fail on payment) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US domestic | 60% | USD |
| US → Mexico | 25% | USD → MXN |
| US → Brazil | 15% | USD → BRL |

### Pain Points
1. Non-US merchants need local payment
2. No x402 support for crypto merchants
3. User wallet management is complex
4. Currency conversion confusing
5. Merchant settlement not their problem (want it handled)

### PayOS Integration
```
API Flow:
1. POST /v1/x402/execute (crypto merchant)
2. POST /v1/acp/checkout (traditional merchant)
3. GET /v1/wallets/{id}/limits (spending check)
4. POST /v1/wallets/{id}/authorize (user approval)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| x402 purchase | $0.50 API call | Instant, proof returned |
| ACP checkout | $150 shoes | Checkout completed |
| Spending limit | $600 purchase, $500 limit | Rejected with message |
| Multi-currency | MXN merchant | USD converted, settled |

### Seed Data Requirements
- 1 partner account
- 5,000 user wallet accounts
- 500 merchant accounts
- 50,000 historical purchases
- Spending limit configurations

---

## Subcategory 7.2: Enterprise Procurement Agent

**Profile Name:** `agentic_procurement_enterprise`

### Description
Internal AI agent for enterprise procurement. Handles routine purchases autonomously within policies.

### Business Model
- Internal tool (cost center)
- Or: SaaS for enterprises

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $5M - $20M |
| Avg Transaction | $5,000 - $25,000 |
| Transactions/Month | 300 - 1,000 |
| Auto-Approved % | 60% under threshold |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 55% | USD → MXN |
| US → Brazil | 25% | USD → BRL |
| US → EU | 15% | USD → EUR |
| Other | 5% | Various |

### Pain Points
1. Payment bottleneck slows autonomous procurement
2. Approval workflows not integrated
3. No agent-native payment protocols
4. Audit trail is fragmented
5. Treasury wants real-time visibility

### PayOS Integration
```
API Flow:
1. POST /v1/ap2/mandates (supplier mandates)
2. POST /v1/agents/{id}/payments (agent-initiated)
3. POST /v1/workflows/approval (approval routing)
4. GET /v1/agents/{id}/audit (audit trail)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Auto-approved | $8K within mandate | Executed, no human |
| Approval required | $35K over threshold | Routed to manager |
| Policy violation | Non-approved supplier | Blocked, alert sent |
| Audit query | Last 30 days | Complete audit trail |

### Seed Data Requirements
- 1 enterprise account
- 5 agent accounts
- 300 supplier accounts with mandates
- 10,000 historical agent payments
- Approval workflow configurations

---

## Subcategory 7.3: API Monetization Platform

**Profile Name:** `agentic_api_monetization`

### Description
Marketplace for API monetization via x402 micropayments. Developers monetize APIs, consumers pay per call.

### Business Model
- Marketplace fee (10-20%)
- Enterprise plans
- Premium features

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $500K - $3M |
| Avg Transaction | $0.001 - $0.10 |
| Transactions/Month | 5M - 50M |
| Developer Payouts | $400K - $2.5M |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Global (collection) | 100% | USDC |
| Payout US | 40% | USDC → USD |
| Payout LATAM | 35% | USDC → BRL/MXN |
| Payout EU | 15% | USDC → EUR |
| Payout Other | 10% | USDC → Various |

### Pain Points
1. LATAM developer payouts expensive
2. Small payouts not economical
3. Developers want stablecoin option
4. x402 in, traditional out (mismatch)
5. Micro-aggregation needed

### PayOS Integration
```
API Flow:
1. POST /v1/x402/endpoints (API registration)
2. GET /v1/x402/earnings/{dev_id} (earnings tracking)
3. POST /v1/settlements/aggregate (threshold payout)
4. POST /v1/settlements/stablecoin (USDC payout)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| API call collection | $0.005 x402 payment | Collected, attributed |
| Threshold payout | Balance hits $100 | Payout triggered |
| USDC preference | Developer wants USDC | Direct USDC transfer |
| LATAM payout | $450 to Brazil | Pix in <1 hour |

### Seed Data Requirements
- 1 partner account
- 5,000 developer accounts
- 1,000 API consumer accounts
- 10M historical x402 transactions
- Earnings and payout records

---

## Subcategory 7.4: Multi-Agent Orchestration Platform

**Profile Name:** `agentic_orchestration_platform`

### Description
Platform for building and deploying multi-agent systems. Agents need payment capabilities as tools.

### Business Model
- Platform SaaS
- Usage-based pricing
- Enterprise licenses

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $1M - $10M |
| Avg Transaction | $10 - $5,000 |
| Transactions/Month | 10,000 - 100,000 |
| Agent Types | Shopping, procurement, research, operations |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Global (stablecoin) | 50% | USDC |
| US → LATAM | 30% | USD → Various |
| EU → LATAM | 20% | EUR → Various |

### Pain Points
1. Agents need payment as tool
2. Multiple protocols needed
3. Spending policies per agent
4. Audit across agent actions
5. Human-in-the-loop for high value

### PayOS Integration
```
API Flow:
1. GET /v1/capabilities (tool discovery)
2. POST /v1/agents (agent registration)
3. POST /v1/agents/{id}/tools/payment (payment tool)
4. POST /v1/agents/{id}/policies (spending policies)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Tool discovery | Agent queries capabilities | Full capability list |
| Agent payment | Agent calls payment tool | Executed per policy |
| Policy enforcement | Over-limit attempt | Rejected, logged |
| Multi-agent | 3 agents, shared budget | Budget tracked across |

### Seed Data Requirements
- 1 partner account
- 100 agent accounts
- Various policy configurations
- 100,000 historical agent transactions
- Multi-agent scenarios

---

# Category 8: Cross-Border E-Commerce

E-commerce platforms selling cross-border. Need merchant settlement, multi-currency, refund handling.

## Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $20 - $2,000 |
| **Monthly Volume** | $5M - $100M |
| **Frequency** | 20,000 - 500,000 transactions/month |
| **Payment Pattern** | Real-time checkout, batch settlement |
| **Corridors** | Global → LATAM merchants |
| **Key Need** | Checkout conversion, merchant settlement |
| **Protocols** | ACP, Direct API |

## Subcategory 8.1: Cross-Border Marketplace

**Profile Name:** `ecommerce_crossborder_marketplace`

### Description
Marketplace connecting buyers globally with LATAM sellers. Handle checkout, payment, merchant settlement.

### Business Model
- Marketplace fee (10-15%)
- Payment processing fee
- Advertising

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly GMV | $20M - $80M |
| Avg Order | $50 - $150 |
| Orders/Month | 200,000 - 700,000 |
| Seller Payouts | $15M - $60M |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US buyers → MX sellers | 45% | USD → MXN |
| US buyers → BR sellers | 35% | USD → BRL |
| EU buyers → LATAM | 20% | EUR → Various |

### Pain Points
1. Checkout conversion drops for international
2. Seller settlement is slow (7-14 days)
3. Multi-currency complexity
4. Refund and dispute handling
5. Seller onboarding friction

### PayOS Integration
```
API Flow:
1. POST /v1/acp/checkout (buyer checkout)
2. POST /v1/settlements/batch (seller batch)
3. POST /v1/refunds (order refunds)
4. POST /v1/entities/sellers (seller onboarding)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Buyer checkout | $85 order, US buyer | Payment collected |
| Seller settlement | Weekly batch, 500 sellers | All settled in 48h |
| Refund | $45 return | Buyer refunded, seller adjusted |
| Seller onboarding | New MX seller | Pix/SPEI collected, verified |

### Seed Data Requirements
- 1 partner account
- 50,000 buyer accounts
- 10,000 seller accounts
- 1,000,000 historical orders
- Refund and dispute records

---

## Subcategory 8.2: D2C Brand (LATAM Expansion)

**Profile Name:** `ecommerce_d2c_brand`

### Description
Direct-to-consumer brand expanding to LATAM. Need local payment acceptance and supplier payments.

### Business Model
- Product sales
- Subscription options

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Revenue | $2M - $10M |
| Avg Order | $80 - $200 |
| Orders/Month | 15,000 - 60,000 |
| Supplier Payments | $500K - $3M |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| LATAM customers (collection) | 60% | BRL/MXN → USD |
| US → LATAM suppliers | 40% | USD → MXN/BRL |

### Pain Points
1. LATAM customers prefer local payment
2. Cart abandonment high without Pix/SPEI
3. Supplier payments are manual
4. Currency exposure on inventory
5. Subscription billing complexity

### PayOS Integration
```
API Flow:
1. POST /v1/collections/pix (Pix collection)
2. POST /v1/settlements (supplier payment)
3. POST /v1/subscriptions (recurring billing)
4. GET /v1/treasury/exposure (FX exposure)
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Pix checkout | R$450 order | Pix QR generated, paid |
| Supplier payment | $25K to MX supplier | SPEI next-day |
| Subscription | R$99/month | Recurring Pix collection |
| FX exposure | Monthly report | BRL/MXN exposure shown |

### Seed Data Requirements
- 1 brand account
- 20,000 customer accounts
- 100 supplier accounts
- 200,000 historical orders
- Subscription records

---

## Subcategory 8.3: Dropshipping Platform

**Profile Name:** `ecommerce_dropshipping`

### Description
Dropshipping platform where sellers source from LATAM suppliers. Handle supplier payments, seller payouts.

### Business Model
- Platform fee
- Payment processing
- Premium tools

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $5M - $20M |
| Avg Order | $30 - $80 |
| Orders/Month | 100,000 - 350,000 |
| Supplier Payments | $3M - $12M |

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
```

### Test Scenarios
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Supplier payment | $150 for order fulfillment | SPEI in <1 hour |
| Quality escrow | Hold until delivery confirmed | Released on webhook |
| Multi-supplier | Order from 3 suppliers | Split payment executed |
| Dispute | Supplier didn't ship | Escrow returned |

### Seed Data Requirements
- 1 platform account
- 5,000 seller accounts
- 2,000 supplier accounts
- 500,000 historical orders
- Escrow and dispute records

---

# Summary: All Categories and Profiles

| Category | Subcategory | Profile Name | Key Protocol |
|----------|-------------|--------------|--------------|
| **1. Procurement AI** | Negotiation | `procurement_negotiation_ai` | Direct, AP2 |
| | Sourcing Suite | `procurement_sourcing_suite` | Direct, AP2 |
| | Compliance | `procurement_compliance_ai` | Direct |
| | Spend Analytics | `procurement_spend_analytics` | Direct |
| **2. LATAM Fintechs** | Neobank | `latam_neobank` | Direct, x402 |
| | Wallet | `latam_wallet` | Direct, x402 |
| | Crypto Exchange | `latam_crypto_exchange` | x402, AP2, ACP |
| | Lending | `latam_lending_platform` | Direct |
| **3. Global Payroll** | EOR | `global_eor_platform` | Direct |
| | Contractor Payments | `global_contractor_payments` | Direct, x402 |
| | Benefits/Expenses | `global_benefits_expenses` | Direct |
| **4. Remittance** | Consumer App | `remittance_consumer_app` | Direct |
| | Corridor Specialist | `remittance_corridor_specialist` | Direct |
| | Digital-First | `remittance_digital_first` | Direct, x402 |
| **5. Creator Economy** | Streaming Payouts | `creator_streaming_payouts` | Direct, x402 |
| | Freelance Marketplace | `creator_freelance_marketplace` | Direct, x402 |
| | Gig Platform | `creator_gig_platform` | Direct |
| **6. Enterprise** | Freight/Logistics | `enterprise_freight_logistics` | Direct, AP2 |
| | Manufacturing | `enterprise_manufacturing` | Direct, AP2 |
| | Retail/E-Commerce | `enterprise_retail_ecommerce` | Direct |
| **7. Agentic Commerce** | Shopping Agent | `agentic_shopping_consumer` | x402, ACP |
| | Procurement Agent | `agentic_procurement_enterprise` | AP2, x402 |
| | API Monetization | `agentic_api_monetization` | x402 |
| | Orchestration Platform | `agentic_orchestration_platform` | x402, AP2, ACP |
| **8. E-Commerce** | Marketplace | `ecommerce_crossborder_marketplace` | ACP, Direct |
| | D2C Brand | `ecommerce_d2c_brand` | Direct |
| | Dropshipping | `ecommerce_dropshipping` | Direct |

---

## Next Steps

1. [ ] Create database seed scripts for each profile
2. [ ] Build demo environment with sample data
3. [ ] Develop protocol-specific test suites
4. [ ] Create realistic transaction generators
5. [ ] Document API integration examples per profile
6. [ ] Build demo dashboards for key categories

---

## Usage Guide

### For Testing
- Use profile names as `partner_type` in database
- Each profile has specific seed data requirements
- Test scenarios map to specific API flows

### For Demos
- Select profiles relevant to prospect's industry
- Use realistic transaction volumes
- Show relevant protocol capabilities

### For Development
- Profile API flows guide implementation priority
- Pain points inform feature requirements
- Seed data requirements guide test data generation
