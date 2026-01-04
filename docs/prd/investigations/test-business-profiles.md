# PayOS Test Business Profiles

**Last Updated:** January 2026  
**Purpose:** Realistic business profiles for testing PayOS across all customer segments

---

## Overview

These profiles represent the diversity of PayOS's target customers. Each profile includes:
- Company background and business model
- Transaction patterns and volumes
- Corridors and currencies
- Pain points and needs
- Protocol preferences
- Test scenarios

---

# Tier 1: High-Priority Prospects

---

## Profile 1: NegotiateAI (Procurement AI)

**Inspired by:** Monq

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | NegotiateAI Ltd |
| **HQ** | London, UK |
| **Founded** | 2024 |
| **Employees** | 25 |
| **Funding** | €3M Seed |
| **Business Model** | SaaS subscription + % of savings |

### What They Do
AI-powered strategic negotiation platform for enterprise procurement. Their agents negotiate multi-million dollar supplier contracts, finding hidden value in payment terms, volume discounts, and contract clauses.

### Current State
- 15 enterprise customers (Fortune 500 manufacturers, healthcare groups)
- Average deal size: $2M-$50M
- AI closes 40+ negotiations per month
- **Problem:** When negotiation closes, payment is manual — wire transfers, 2-3 day delays

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $8M across all customers |
| **Avg Transaction** | $180,000 |
| **Frequency** | 45 transactions/month |
| **Corridors** | US→Mexico (40%), US→Brazil (30%), UK→Germany (20%), Other (10%) |
| **Currencies** | USD, MXN, BRL, EUR, GBP |

### Pain Points
1. Manual payment initiation after AI negotiation breaks workflow
2. 2-3 day SWIFT settlement delays vendor relationships
3. 3-4% FX spreads eating into negotiated savings
4. No visibility into payment status for their customers
5. Reconciliation between their system and customer ERPs is manual

### What They Need from PayOS
- API to trigger payment when negotiation closes
- Instant settlement to suppliers in local currency
- Webhook callbacks to update deal status
- ERP-compatible reconciliation data
- Escrow for milestone-based contracts

### Protocol Preferences
- **Primary:** Direct API (settlement focus)
- **Future:** AP2 (mandate-based recurring supplier payments)

### Test Scenarios
```
Scenario 1: Single supplier payment
- NegotiateAI closes $250,000 deal with Mexican manufacturer
- Trigger PayOS settlement: USD → MXN via SPEI
- Expected: <15 min settlement, webhook confirmation

Scenario 2: Milestone escrow
- $1.2M contract with 3 milestones (30/40/30)
- Create escrow, fund, release milestone 1
- Expected: Escrow created, $360K released on approval

Scenario 3: Batch supplier payments
- Month-end: 12 suppliers across Brazil, Mexico, Colombia
- Single batch API call
- Expected: All settled within 1 hour, detailed status per payment
```

### Seed Data Needed
- 3 enterprise customer accounts (manufacturers)
- 15 supplier accounts (Mexico: 6, Brazil: 5, Colombia: 2, Germany: 2)
- 50 historical transactions (last 3 months)
- 5 active escrow agreements

---

## Profile 2: SourceFlow (Procurement Suite)

**Inspired by:** Mercanis

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | SourceFlow GmbH |
| **HQ** | Berlin, Germany |
| **Founded** | 2021 |
| **Employees** | 55 |
| **Funding** | €18M Series A |
| **Business Model** | SaaS platform fee + per-seat licensing |

### What They Do
End-to-end procurement platform: supplier discovery, RFx management, contract lifecycle, spend analytics. Their "Mercu" AI copilot automates sourcing workflows.

### Current State
- 45 enterprise customers (automotive, industrial, consumer goods)
- Managing $2B+ in annual procurement spend
- Weekly batch payment runs (Fridays)
- **Problem:** "Source to pay" stops at PO — payment is customer's problem

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $45M across platform |
| **Avg Transaction** | $28,000 |
| **Frequency** | 1,600 transactions/month |
| **Payment Pattern** | Weekly batches (400/week) |
| **Corridors** | Germany→LATAM (35%), US→LATAM (30%), Intra-EU (25%), Other (10%) |
| **Currencies** | EUR, USD, BRL, MXN, COP, ARS |

### Pain Points
1. Customers asking for "source to pay" not "source to PO"
2. No payment visibility in their analytics dashboards
3. Each customer has different payment infrastructure
4. Can't offer payment financing or dynamic discounting
5. Supplier onboarding doesn't include payment setup

### What They Need from PayOS
- White-label payment module for their platform
- Batch payment API for weekly runs
- Supplier onboarding with Pix/SPEI/CLABE collection
- Payment status in their existing dashboards
- Multi-currency treasury management

### Protocol Preferences
- **Primary:** Direct API (batch focus)
- **Future:** AP2 (customer mandates for auto-pay)

### Test Scenarios
```
Scenario 1: Weekly batch run
- Friday 6am: 380 payments, 8 countries, $12M total
- Simulate: validation, FX quotes, execution, status tracking
- Expected: 95%+ success rate, detailed failure reasons

Scenario 2: Supplier onboarding
- New Brazilian supplier: collect Pix key, verify, KYB check
- Expected: Supplier ready for payments within 24 hours

Scenario 3: Payment analytics
- Dashboard showing: volume by corridor, success rates, avg settlement time
- Expected: Real-time updates, exportable reports
```

### Seed Data Needed
- 5 enterprise customer accounts
- 200 supplier accounts (Brazil: 70, Mexico: 50, Colombia: 30, Argentina: 20, EU: 30)
- 2,000 historical transactions (last 6 months)
- Weekly batch records

---

## Profile 3: ContractGuard (Contract Enforcement)

**Inspired by:** Magentic

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | ContractGuard AI |
| **HQ** | London, UK |
| **Founded** | 2023 |
| **Employees** | 18 |
| **Funding** | €5M Seed |
| **Business Model** | Pay-per-cure (% of value recovered) |

### What They Do
AI "Mages" that autonomously monitor supplier contracts, finding errors, missed discounts, and compliance violations. They recover value from existing contracts.

### Current State
- 8 Fortune 500 customers
- Monitoring 50,000+ supplier contracts
- Recovering $15M+ annually in missed discounts/errors
- **Problem:** Recovery requires payment adjustments they can't execute

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $3.5M in payment adjustments |
| **Avg Transaction** | $45,000 (credit notes, rebates, adjustments) |
| **Frequency** | 80 transactions/month |
| **Type** | Mix of payments and refunds |
| **Corridors** | US→Mexico (50%), US→Brazil (30%), UK→EU (20%) |

### Pain Points
1. Identify recovery opportunity but can't execute payment adjustment
2. Credit notes require manual processing
3. Dynamic discounting requires payment timing control
4. Early payment discounts expire before treasury acts
5. No integration between contract system and payment

### What They Need from PayOS
- Payment adjustment API (debits and credits)
- Dynamic discounting (pay early for discount)
- Integration with their recovery workflow
- Audit trail for recovered value
- Multi-entity support (multiple payers per contract)

### Protocol Preferences
- **Primary:** Direct API
- **Future:** AP2 (automated payment timing based on contract terms)

### Test Scenarios
```
Scenario 1: Volume rebate recovery
- Detected: $85,000 missed volume rebate from Mexican supplier
- Action: Trigger credit adjustment to customer's treasury
- Expected: Credit reflected in 24 hours

Scenario 2: Early payment discount
- Opportunity: 2% discount if paid in 10 days vs 30
- $500,000 invoice, $10,000 savings potential
- Expected: Calculate optimal timing, execute if approved

Scenario 3: Contract violation penalty
- Supplier missed SLA, $25,000 penalty clause
- Trigger penalty collection via payment adjustment
- Expected: Debit from supplier's next payment
```

### Seed Data Needed
- 3 enterprise customer accounts
- 50 supplier accounts with active contracts
- 100 historical adjustments (credits and debits)
- 20 active recovery opportunities

---

## Profile 4: PixelPay (LATAM Fintech)

**Inspired by:** Nequi/Nubank competitor

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | PixelPay S.A. |
| **HQ** | São Paulo, Brazil |
| **Founded** | 2020 |
| **Employees** | 120 |
| **Funding** | $25M Series B |
| **Business Model** | Transaction fees + premium subscriptions |

### What They Do
Digital wallet and neobank for Brazilian millennials. Pix-native, card issuing, P2P transfers, bill pay. Growing into cross-border remittances.

### Current State
- 2.5M active users
- $180M monthly transaction volume (domestic)
- Launching US→Brazil remittance corridor
- **Problem:** Cross-border is expensive, slow, and requires new infrastructure

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Domestic Volume** | $180M/month |
| **Target X-Border** | $15M/month (Year 1) |
| **Avg Remittance** | $350 |
| **Frequency** | 40,000 transactions/month target |
| **Corridors** | US→Brazil (primary), EU→Brazil (secondary) |
| **Currencies** | BRL, USD, EUR |

### Pain Points
1. Building cross-border from scratch is 12+ months
2. Correspondent banking relationships are expensive
3. Competitors (Wise, Remitly) already in market
4. Need to offer competitive FX rates
5. Compliance burden for international transfers

### What They Need from PayOS
- White-label cross-border API
- Competitive FX (< 1% spread)
- Instant Pix payout (their users expect instant)
- Compliance/AML handled by PayOS
- Real-time tracking for their app

### Protocol Preferences
- **Primary:** Direct API (white-label remittance)
- **Future:** x402 (for agentic features in their app)

### Test Scenarios
```
Scenario 1: Consumer remittance
- Maria in Miami sends $500 to her mother in São Paulo
- Collection: Debit card, Settlement: Pix
- Expected: Pix delivered in <10 minutes

Scenario 2: Batch payout (employer payroll)
- US company pays 50 Brazilian contractors
- Single API call, 50 Pix destinations
- Expected: All delivered within 1 hour

Scenario 3: Failed Pix key
- Invalid Pix key provided
- Expected: Clear error message, suggested actions, refund path
```

### Seed Data Needed
- 1 PixelPay partner account
- 500 end-user accounts (senders in US)
- 500 recipient accounts (receivers in Brazil)
- 5,000 historical remittances
- Various failure scenarios (invalid Pix, limits, compliance holds)

---

## Profile 5: CryptoMex (Crypto Exchange)

**Inspired by:** Bitso B2B

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | CryptoMex Exchange |
| **HQ** | Mexico City, Mexico |
| **Founded** | 2019 |
| **Employees** | 85 |
| **Funding** | $40M Series B |
| **Business Model** | Trading fees + B2B services |

### What They Do
Leading Mexican crypto exchange. Consumer trading plus B2B services: treasury management, cross-border payments for fintechs, stablecoin on/off ramps.

### Current State
- 800,000 retail users
- 45 B2B clients (fintechs, remittance companies)
- $500M monthly trading volume
- **Problem:** B2B clients want multi-protocol support for agents

### Transaction Profile
| Metric | Value |
|--------|-------|
| **B2B Volume** | $120M/month |
| **Avg B2B Transaction** | $25,000 |
| **Frequency** | 4,800 transactions/month |
| **Corridors** | US→Mexico (60%), LATAM→Mexico (25%), EU→Mexico (15%) |
| **Currencies** | USDC, USDT, MXN, USD |

### Pain Points
1. B2B clients asking for x402 support (API monetization)
2. No AP2 mandate support for recurring payments
3. Each client integration is custom
4. Agentic commerce clients need protocol flexibility
5. Want to offer settlement-as-a-service to their B2B clients

### What They Need from PayOS
- Multi-protocol gateway they can white-label
- x402 facilitator for their API clients
- AP2 mandate management
- SPEI settlement (they have it, want redundancy)
- Agent wallet infrastructure for their B2B clients

### Protocol Preferences
- **Primary:** x402 (API monetization for clients)
- **Secondary:** AP2 (mandate-based recurring)
- **Future:** ACP (shopping agent support)

### Test Scenarios
```
Scenario 1: x402 API payment
- Developer using CryptoMex client's API
- Pays 0.05 USDC per API call via x402
- Expected: Micro-payment processed, balance updated

Scenario 2: AP2 mandate
- Fintech client sets up $50,000/month supplier mandate
- Monthly auto-execution
- Expected: Mandate created, executed on schedule

Scenario 3: Agent wallet
- CryptoMex client provisions wallet for their AI agent
- Agent makes 500 micro-transactions/day
- Expected: Spending limits enforced, daily reporting
```

### Seed Data Needed
- 1 CryptoMex partner account
- 20 B2B client accounts
- 100 agent wallets
- 10,000 x402 transactions
- 50 active AP2 mandates

---

# Tier 2: Enterprise Brands

---

## Profile 6: GlobalShip Logistics

**Inspired by:** Crossmint enterprise customer

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | GlobalShip Logistics Inc. |
| **HQ** | Miami, FL, USA |
| **Founded** | 1998 |
| **Employees** | 2,500 |
| **Revenue** | $800M annually |
| **Business Model** | Freight forwarding + logistics |

### What They Do
International freight forwarding with strong LATAM presence. Moving goods for major retailers and manufacturers. Heavy cross-border payment needs.

### Current State
- 150 agents/offices across Americas
- Paying 3,000+ carriers, customs brokers, port operators
- Using legacy banking for payments (Wells Fargo, Citi)
- **Problem:** 48-72 hour payment delays cause shipment holds

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $65M in vendor payments |
| **Avg Transaction** | $8,500 |
| **Frequency** | 7,600 transactions/month |
| **Urgency** | 30% require same-day |
| **Corridors** | US→Mexico (45%), US→Brazil (25%), US→Colombia (15%), Other (15%) |
| **Currencies** | USD, MXN, BRL, COP |

### Pain Points
1. Shipment holds due to payment delays
2. Carriers demand same-day payment, banks can't deliver
3. FX costs eating margins (current: 2.5% average)
4. Treasury managing 15+ banking relationships
5. No visibility into payment status for operations team

### What They Need from PayOS
- Same-day (ideally instant) LATAM payments
- Batch payment for weekly carrier settlements
- Real-time status for operations dashboard
- Competitive FX (target: <1%)
- Integration with their TMS (Transportation Management System)

### Protocol Preferences
- **Primary:** Direct API (settlement speed focus)
- **Future:** AP2 (pre-authorized carrier payments)

### Test Scenarios
```
Scenario 1: Urgent carrier payment
- Shipment held at Manzanillo port
- $12,000 payment to carrier needed in 2 hours
- Expected: SPEI delivery in <30 minutes

Scenario 2: Weekly carrier batch
- Friday: 450 carriers across Mexico, Brazil, Colombia
- $5.2M total
- Expected: 95%+ settled by end of day

Scenario 3: Customs broker escrow
- Hold $50,000 for customs clearance
- Release when shipment clears
- Expected: Escrow funded, released on webhook trigger
```

### Seed Data Needed
- 1 GlobalShip enterprise account
- 500 carrier/vendor accounts
- 10,000 historical transactions
- Urgency flags, shipment references

---

## Profile 7: TalentBridge (Global Payroll)

**Inspired by:** Deel/Remote competitor

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | TalentBridge Inc. |
| **HQ** | San Francisco, CA, USA |
| **Founded** | 2021 |
| **Employees** | 200 |
| **Funding** | $75M Series C |
| **Business Model** | Per-employee fee + FX margin |

### What They Do
Employer of Record (EOR) and global payroll. Companies hire internationally without setting up entities. TalentBridge handles compliance, payroll, benefits.

### Current State
- 800 company clients
- 15,000 contractors/employees managed
- 45 countries supported
- **Problem:** LATAM payroll is most expensive and slowest

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Payroll** | $28M |
| **LATAM Portion** | $8M (28%) |
| **Avg Salary** | $4,200/month |
| **Frequency** | 2x monthly (15th and last day) |
| **Corridors** | US→Brazil (40%), US→Mexico (35%), US→Argentina (15%), US→Colombia (10%) |
| **Currencies** | USD, BRL, MXN, ARS, COP |

### Pain Points
1. LATAM payroll costs 3-4% (FX + fees) vs 0.5% for US
2. Argentina currency controls create delays
3. Contractors complain about inconsistent pay dates
4. Each country requires different rails
5. Compliance documentation for audits is manual

### What They Need from PayOS
- Multi-country LATAM payroll in single API
- Consistent settlement times across countries
- Compliance documentation for each country
- Contractor onboarding (collect bank details, verify)
- Cost transparency (show fees upfront)

### Protocol Preferences
- **Primary:** Direct API (batch payroll)
- **Future:** Stablecoin option for contractors who prefer it

### Test Scenarios
```
Scenario 1: Monthly payroll run
- 15th of month: 2,200 contractors across LATAM
- $3.8M total, 4 countries
- Expected: All paid within 24 hours of initiation

Scenario 2: Contractor onboarding
- New hire in Brazil: collect CPF, bank account, verify
- Expected: Ready for next payroll cycle

Scenario 3: Argentina payment
- Navigate currency controls
- $85,000 to 40 Argentine contractors
- Expected: Compliant routing, documentation provided
```

### Seed Data Needed
- 1 TalentBridge partner account
- 50 company client accounts
- 2,500 contractor accounts (with country distribution)
- 12 months of payroll history
- Compliance flags and documentation

---

# Tier 3: Remittance & Cross-Border

---

## Profile 8: SendHome (Remittance Startup)

**Inspired by:** Smaller Remitly/Wise competitor

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | SendHome Inc. |
| **HQ** | Houston, TX, USA |
| **Founded** | 2022 |
| **Employees** | 35 |
| **Funding** | $8M Series A |
| **Business Model** | FX margin + flat fee |

### What They Do
Mobile-first remittance app targeting Hispanic communities in Texas. Focus on US→Mexico corridor with plans to expand to Central America.

### Current State
- 45,000 active users
- $12M monthly volume
- Average send: $280
- **Problem:** Current provider (legacy) charges 2.5% and takes 24 hours

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $12M |
| **Avg Transaction** | $280 |
| **Frequency** | 43,000 transactions/month |
| **Peak Times** | Fridays, 15th/30th of month |
| **Corridors** | US→Mexico (100% currently) |
| **Currencies** | USD, MXN |

### Pain Points
1. Current provider too slow (24+ hours)
2. FX rates not competitive (losing to Wise)
3. Can't offer instant delivery
4. Limited to Mexico (want Guatemala, El Salvador)
5. No debit card collection (ACH only)

### What They Need from PayOS
- Instant SPEI delivery
- Competitive FX (< 0.5% spread to compete)
- Card collection support
- Expansion to Central America
- Mobile SDK for their app

### Protocol Preferences
- **Primary:** Direct API (speed focus)
- **Future:** x402 (for agent-initiated remittances)

### Test Scenarios
```
Scenario 1: Instant remittance
- $300 from Houston to Guadalajara
- Card collection, SPEI delivery
- Expected: Delivered in <10 minutes

Scenario 2: Peak load
- Friday evening: 2,000 transactions in 2 hours
- Expected: All processed, <15 min average delivery

Scenario 3: Failed delivery
- Invalid CLABE provided
- Expected: Clear error, easy correction flow, refund if needed
```

### Seed Data Needed
- 1 SendHome partner account
- 5,000 sender accounts
- 5,000 recipient accounts
- 50,000 historical transactions
- Peak load scenarios

---

## Profile 9: FreelanceFlow (Creator Payouts)

**Inspired by:** Payoneer for LATAM creators

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | FreelanceFlow Ltd. |
| **HQ** | London, UK |
| **Founded** | 2020 |
| **Employees** | 45 |
| **Funding** | $15M Series A |
| **Business Model** | Platform fee (2%) + FX |

### What They Do
Platform connecting LATAM freelancers with US/EU clients. Handle contracts, time tracking, invoicing, and payments.

### Current State
- 25,000 freelancers on platform
- 3,000 client companies
- $18M monthly payouts
- **Problem:** Freelancers wait 5-7 days for international payments

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $18M in payouts |
| **Avg Payout** | $1,200 |
| **Frequency** | 15,000 payouts/month |
| **Pattern** | Weekly batches + on-demand |
| **Corridors** | US→Brazil (40%), US→Mexico (30%), US→Argentina (15%), EU→LATAM (15%) |
| **Currencies** | USD, EUR, BRL, MXN, ARS, COP |

### Pain Points
1. Freelancers hate waiting 5-7 days
2. High fees eating freelancer earnings
3. Argentina payouts are problematic
4. No stablecoin option for crypto-savvy freelancers
5. Each country has different payout timing

### What They Need from PayOS
- Same-day payouts across all LATAM countries
- Consistent fees (predictable for freelancers)
- Optional stablecoin payout
- Freelancer self-service (add/update bank details)
- Detailed payout notifications (SMS, email)

### Protocol Preferences
- **Primary:** Direct API (batch payouts)
- **Secondary:** x402 (stablecoin option)
- **Future:** Agent-initiated payouts (client AI pays freelancer)

### Test Scenarios
```
Scenario 1: Weekly batch
- Monday: 3,200 freelancers across 6 countries
- $4.5M total
- Expected: All received by Wednesday

Scenario 2: On-demand payout
- Freelancer requests instant payout of available balance ($2,400)
- Expected: Pix/SPEI in <15 minutes

Scenario 3: Stablecoin payout
- Freelancer prefers USDC
- Expected: USDC to their wallet, no conversion fees
```

### Seed Data Needed
- 1 FreelanceFlow partner account
- 500 client company accounts
- 5,000 freelancer accounts
- 30,000 historical payouts
- Balance tracking, on-demand requests

---

# Tier 4: Creator Economy

---

## Profile 10: StreamerPay (Gaming Payouts)

**Inspired by:** Twitch/YouTube payout infrastructure

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | StreamerPay Inc. |
| **HQ** | Los Angeles, CA, USA |
| **Founded** | 2021 |
| **Employees** | 60 |
| **Funding** | $20M Series B |
| **Business Model** | B2B (streaming platforms pay per payout) |

### What They Do
Payout infrastructure for streaming platforms. Handle creator payments for gaming, music, and video platforms.

### Current State
- 8 platform clients (mid-size streaming services)
- 180,000 creators receiving payouts
- $35M monthly volume
- **Problem:** LATAM creators are most expensive to pay

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $35M |
| **LATAM Portion** | $8M (23%) |
| **Avg Payout** | $195 |
| **Frequency** | Monthly, 1st week |
| **Threshold** | $50 minimum payout |
| **Corridors** | US→Brazil (45%), US→Mexico (35%), US→Argentina (10%), US→Colombia (10%) |

### Pain Points
1. LATAM payouts cost 4-5% (vs 1% for US)
2. Small payouts ($50-100) are not economical
3. Creators complain about slow payments
4. Platform clients want cost reduction
5. No crypto payout option for gaming creators (who want it)

### What They Need from PayOS
- Low-cost small payouts (under $100)
- Batch optimization for high volume
- Crypto/stablecoin option
- Creator self-service portal
- White-label for platform clients

### Protocol Preferences
- **Primary:** Direct API (batch efficiency)
- **Secondary:** x402 (micro-payouts, stablecoin)

### Test Scenarios
```
Scenario 1: Monthly creator run
- 1st of month: 45,000 LATAM creators
- $8M total, many small amounts ($50-200)
- Expected: Cost under 1%, all delivered in 48 hours

Scenario 2: Micro-payout aggregation
- 500 creators with $25-49 balances
- Aggregate across months, pay when threshold met
- Expected: Efficient handling of sub-threshold amounts

Scenario 3: Crypto payout
- Creator selects USDC payout
- Expected: Direct to wallet, lower fees than fiat
```

### Seed Data Needed
- 1 StreamerPay partner account
- 8 platform client accounts
- 20,000 creator accounts
- 200,000 historical payouts
- Threshold tracking, aggregation logic

---

# Tier 5: Agentic Commerce

---

## Profile 11: ShopBot AI (Shopping Agent)

**Inspired by:** Consumer shopping agent startup

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | ShopBot AI Inc. |
| **HQ** | San Francisco, CA, USA |
| **Founded** | 2024 |
| **Employees** | 20 |
| **Funding** | $5M Seed |
| **Business Model** | Freemium + affiliate commissions |

### What They Do
AI shopping assistant that finds deals, compares prices, and purchases on behalf of users. Chrome extension + mobile app.

### Current State
- 50,000 users
- 5,000 purchases/month
- Average purchase: $85
- **Problem:** Can't complete purchases on non-US sites (especially LATAM)

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $425,000 |
| **Avg Transaction** | $85 |
| **Frequency** | 5,000 transactions/month |
| **Success Rate** | 60% (40% fail on non-US merchants) |
| **Target Corridors** | US→Mexico (retail), US→Brazil (retail) |
| **Currencies** | USD, MXN, BRL |

### Pain Points
1. LATAM merchants require local payment methods
2. No x402 support for crypto-native merchants
3. User wallets not set up for cross-border
4. Currency conversion confusing for users
5. Merchant settlement is their problem (want it handled)

### What They Need from PayOS
- x402 payment for crypto-accepting merchants
- ACP checkout for traditional merchants
- User wallet management (spending limits)
- Multi-currency support
- Merchant settlement in local currency

### Protocol Preferences
- **Primary:** x402 (crypto merchants)
- **Secondary:** ACP (traditional checkout)
- **Tertiary:** AP2 (pre-authorized shopping mandates)

### Test Scenarios
```
Scenario 1: x402 micro-purchase
- Agent finds API service, pays 0.10 USDC
- Expected: Instant payment, proof returned

Scenario 2: ACP checkout
- Agent purchases $120 shoes from Mexican retailer
- Expected: Checkout created, payment completed, merchant settles in MXN

Scenario 3: User spending limit
- User sets $500/month limit
- Agent attempts $600 purchase
- Expected: Rejected with clear limit message
```

### Seed Data Needed
- 1 ShopBot partner account
- 1,000 user wallet accounts
- 200 merchant accounts (x402 and ACP)
- 10,000 historical purchases
- Spending limit scenarios

---

## Profile 12: ProcureBot (Enterprise Procurement Agent)

**Inspired by:** Internal enterprise procurement AI

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | ProcureBot (Internal Tool) |
| **HQ** | Chicago, IL, USA |
| **Founded** | 2024 (internal project) |
| **Employees** | N/A (internal) |
| **Parent Company** | MegaCorp Manufacturing |
| **Business Model** | Internal cost center |

### What They Do
Internal AI agent for procurement at a Fortune 500 manufacturer. Handles routine purchases under $50,000 autonomously.

### Current State
- Autonomous purchasing for 12 categories
- $8M monthly in agent-initiated purchases
- 800 approved suppliers
- **Problem:** Agent can find and order, but payment requires human

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $8M |
| **Avg Transaction** | $12,000 |
| **Frequency** | 650 transactions/month |
| **Autonomy Level** | Full auto under $10K, approval $10-50K |
| **Corridors** | US→Mexico (60%), US→China (25%), US→Germany (15%) |
| **Currencies** | USD, MXN, CNY, EUR |

### Pain Points
1. Payment bottleneck slows autonomous procurement
2. Approval workflows not integrated with payment
3. No agent-native payment protocols
4. Audit trail for agent purchases is separate from payment
5. Treasury wants real-time visibility into agent spending

### What They Need from PayOS
- AP2 mandates for approved suppliers
- Agent wallet with spending policies
- Approval workflow integration
- Real-time treasury dashboard
- Audit trail connecting purchase → payment

### Protocol Preferences
- **Primary:** AP2 (mandate-based, enterprise)
- **Secondary:** x402 (for API/SaaS purchases)
- **Tertiary:** Direct API (large one-time)

### Test Scenarios
```
Scenario 1: Autonomous purchase
- Agent orders $8,500 of components from Mexican supplier
- Within pre-approved mandate
- Expected: Auto-executed, no human intervention

Scenario 2: Approval required
- Agent orders $35,000 of equipment
- Exceeds auto-approval threshold
- Expected: Routed to manager, executed on approval

Scenario 3: Spending policy violation
- Agent attempts purchase from non-approved supplier
- Expected: Blocked, alert to procurement team
```

### Seed Data Needed
- 1 MegaCorp enterprise account
- 1 ProcureBot agent wallet
- 200 supplier accounts with mandates
- 5,000 historical agent purchases
- Approval workflows, spending policies

---

## Profile 13: APIMarket (API Monetization Platform)

**Inspired by:** RapidAPI + x402

### Company Overview
| Attribute | Value |
|-----------|-------|
| **Name** | APIMarket Inc. |
| **HQ** | Austin, TX, USA |
| **Founded** | 2023 |
| **Employees** | 30 |
| **Funding** | $12M Series A |
| **Business Model** | Marketplace fees (15%) + enterprise plans |

### What They Do
API marketplace where developers monetize APIs via x402 micropayments. Pay-per-call model, no subscriptions required.

### Current State
- 2,000 APIs listed
- 15,000 developer users
- 2M API calls/month
- **Problem:** Developer payouts to LATAM are expensive

### Transaction Profile
| Metric | Value |
|--------|-------|
| **Monthly Volume** | $1.2M (gross) |
| **Avg API Call** | $0.006 |
| **Payout Volume** | $1M (after 15% fee) |
| **Avg Developer Payout** | $350 |
| **Frequency** | Weekly payouts |
| **Developer Locations** | US (40%), LATAM (35%), EU (15%), Asia (10%) |

### Pain Points
1. LATAM developer payouts cost 4-5%
2. Small payouts ($20-50) not economical
3. Developers want stablecoin option
4. x402 payments in, but traditional payouts out
5. Currency conversion for small amounts is expensive

### What They Need from PayOS
- x402 payment collection (already have)
- Low-cost LATAM payouts
- Stablecoin payout option
- Micro-payout aggregation
- Developer self-service

### Protocol Preferences
- **Primary:** x402 (both directions)
- **Secondary:** Direct API (fiat payouts)

### Test Scenarios
```
Scenario 1: x402 collection + LATAM payout
- Developer earns $450 from API calls (x402)
- Weekly payout to Brazilian bank account
- Expected: x402 collected, Pix payout in <1 hour

Scenario 2: Micro-aggregation
- Developer earns $5-10/week
- Aggregate until $50 threshold
- Expected: Single payout when threshold met

Scenario 3: Stablecoin preference
- Developer selects USDC payout
- Expected: Direct USDC transfer, no conversion
```

### Seed Data Needed
- 1 APIMarket partner account
- 3,000 developer accounts
- 500 API provider accounts
- 5M historical API calls (x402)
- 50,000 historical payouts

---

# Summary Table

| Profile | Company | Tier | Segment | Monthly Volume | Avg Tx | Primary Protocol |
|---------|---------|------|---------|----------------|--------|------------------|
| 1 | NegotiateAI | 1 | Procurement AI | $8M | $180K | Direct/AP2 |
| 2 | SourceFlow | 1 | Procurement AI | $45M | $28K | Direct/AP2 |
| 3 | ContractGuard | 1 | Procurement AI | $3.5M | $45K | Direct |
| 4 | PixelPay | 1 | LATAM Fintech | $15M | $350 | Direct/x402 |
| 5 | CryptoMex | 1 | Crypto Exchange | $120M | $25K | x402/AP2 |
| 6 | GlobalShip | 2 | Enterprise | $65M | $8.5K | Direct/AP2 |
| 7 | TalentBridge | 2 | Global Payroll | $28M | $4.2K | Direct |
| 8 | SendHome | 3 | Remittance | $12M | $280 | Direct |
| 9 | FreelanceFlow | 3 | Creator Payouts | $18M | $1.2K | Direct/x402 |
| 10 | StreamerPay | 4 | Gaming Payouts | $35M | $195 | Direct/x402 |
| 11 | ShopBot AI | 5 | Shopping Agent | $425K | $85 | x402/ACP |
| 12 | ProcureBot | 5 | Enterprise Agent | $8M | $12K | AP2/x402 |
| 13 | APIMarket | 5 | API Monetization | $1.2M | $0.006 | x402 |

---

## Usage Notes

### For Development Testing
- Each profile includes specific test scenarios
- Seed data requirements are specified
- Protocol preferences enable protocol-specific testing

### For Demo Purposes
- Profiles span all customer tiers
- Diverse use cases (B2B, B2C, agentic)
- Realistic transaction volumes and patterns

### For Sales/Marketing
- Pain points are realistic industry problems
- Value propositions are tailored
- Competitive positioning is implicit

---

## Next Steps

1. [ ] Create database seed scripts for each profile
2. [ ] Build demo dashboards for key profiles
3. [ ] Develop protocol-specific test suites
4. [ ] Create realistic transaction generators
5. [ ] Document API flows for each use case
