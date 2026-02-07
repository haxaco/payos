# Sly — Demo Scenarios (Tier A & B)

> **Purpose:** This document defines the demo flows for Sly's top 8 scenarios. Each scenario includes the setup context, specific application flows, protocols used, Sly features exercised, and measurable KPIs. Use this to build out the demo experience in the Sly dashboard and SDK.

---

## How to Read This Document

Each scenario follows a consistent structure:

- **Preface / Setup:** Narrative context — who the customer is, what problem they face
- **Protocols:** Which agentic payment protocols are exercised (x402, AP2, ACP, UCP)
- **Sly Features Exercised:** Specific platform capabilities the demo must showcase
- **Demo Flow:** Step-by-step walkthrough that maps to dashboard screens and API calls
- **KPIs:** Concrete before/after metrics the dashboard should display
- **Technical Notes:** Implementation hints for the demo build

---

## TIER A — Lead Demos (Show Every Time)

---

### Scenario 1: AI Shopping Agent — "The Birthday Gift"

**Type:** B2C | **Protocols:** UCP + ACP | **Tier:** 1 — Agentic Emerging

**Potential Customers:** Perplexity, Shopify, Klarna, Zalando

#### Preface

A consumer opens Perplexity and types: "Find a Tissot watch under $350 for my husband's birthday." The AI instantly surfaces three options from verified merchants, compares prices, checks availability, and recommends the PRX at $299. The consumer says "buy it." And then… nothing happens. The agent can't complete the purchase. There's no governed checkout infrastructure that lets an AI agent pay on a consumer's behalf with spending limits, merchant verification, and a confirmation step for first-time merchants. The consumer is redirected to the retailer's website to manually enter payment details — and 74.5% of the time, they abandon the cart. Sly closes that gap: the agent checks out autonomously, within the consumer's budget, with one-tap confirmation when needed.

#### Sly Features Exercised

- **UCP Payment Handler** — Sly acts as `com.sly.latam_settlement` in the UCP ecosystem
- **ACP Checkout** — CreateCheckoutRequest, SharedPaymentToken generation
- **Consumer Policy Engine** — Budget thresholds, merchant allowlists, first-purchase confirmation
- **KYA (Know Your Agent)** — Verify the shopping agent's identity and tier
- **Settlement** — Multi-currency settlement to merchant in preferred currency

#### Demo Flow

1. **Consumer query → UCP Discovery**
   - Consumer asks agent: "Find a Tissot watch under $350 for my husband's birthday"
   - Agent queries UCP merchant catalog (`dev.ucp.shopping.search`)
   - Dashboard screen: UCP Discovery panel shows merchant results, product matches
   - Agent selects Tissot PRX ($299) from verified retailer

2. **ACP Checkout Session Created**
   - Agent calls `POST /acp/checkout` → CreateCheckoutRequest with cart items
   - Dashboard screen: Active Checkouts table shows new session (status: `created`)
   - Cart details visible: item name, price, merchant ID, currency

3. **Consumer Policy Check**
   - Policy Engine evaluates: amount ($299) vs. auto-buy threshold ($500) → PASS
   - Policy Engine evaluates: merchant history → first purchase from this merchant → REQUIRES CONFIRMATION
   - Dashboard screen: Policy Check panel shows rule evaluation (green checkmarks, one amber flag)

4. **Consumer Confirmation**
   - One-time confirmation triggered → consumer approves via push notification
   - Dashboard screen: Approval Workflows shows pending → approved transition

5. **Settlement Execution**
   - SharedPaymentToken generated → settlement processes
   - Merchant receives payment in preferred currency
   - Dashboard screen: Settlement Timeline tab shows payment lifecycle (created → processing → settled)
   - Dashboard screen: Protocol Stats card increments ACP transaction count

6. **Order Confirmation**
   - Order confirmation flows back through UCP (`dev.ucp.shopping.order_status`)
   - Dashboard screen: Transaction Detail shows complete audit trail

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Cart abandonment | 74.5% | 12% | -84% |
| Conversion rate | 25.5% | 68% | +167% |
| Average order value | $87 | $142 | +63% |
| Consumer approval rate (repeat merchant) | N/A | 97% | New metric |
| Settlement time to merchant | 2-3 days | Same-day | 75% faster |
| Recoverable revenue per 1M visits | — | $260K | New value |

#### Technical Notes

- UCP integration via Epic 43 (complete) — use the UCP Payment Handler spec
- ACP checkout via Epic 17 (complete) — `POST /acp/checkout`, `PATCH /acp/checkout/:id`, `POST /acp/checkout/:id/complete`
- Policy Engine rules should be configurable per consumer: `max_auto_approve_amount`, `require_first_merchant_confirmation`, `blocked_merchants[]`
- SharedPaymentToken handling per ACP spec at agenticcommerce.dev
- Settlement routes through Circle for fiat offramp if merchant prefers local currency

---

### Scenario 2: AI Travel Itinerary — "Plan My Anniversary Trip"

**Type:** B2C | **Protocols:** UCP + ACP | **Tier:** 1 — Agentic Emerging

**Potential Customers:** Booking.com, Expedia, Hopper, Google Travel

#### Preface

David and his wife's 10th anniversary is in three weeks. He wants to surprise her with a trip to Barcelona — five days of wine, architecture, and great food. Today, planning that trip means 9 days of searching flights (comparing 4+ options), 12 days browsing hotels (scrolling 21+ listings), and then separately booking restaurants, tours, and museum tickets across 6 different websites in 3 currencies. By the time he's done, he's spent more time planning than he'll spend traveling. He opens his AI travel agent and says: "Plan a 5-day anniversary trip to Barcelona for two. Budget $4,000. We love wine, architecture, and good food." Five minutes later, the agent has a complete itinerary across 6 merchants in 3 countries. All it needs is David's approval and a payment infrastructure that can settle each vendor in their local currency. That infrastructure is Sly.

#### Sly Features Exercised

- **UCP Merchant Discovery** — Multi-vendor catalog search across airlines, hotels, experiences
- **ACP Multi-Checkout** — Parallel checkout sessions per vendor
- **Consumer Policy Engine** — Budget cap ($4,000), multi-vendor threshold confirmation
- **Multi-Currency Settlement** — USD (airline), EUR (hotel, experiences) via FX engine
- **FX Calculator** — Real-time quote preview for cross-currency settlement
- **Simulation Engine** — Preview total cost, FX impact, settlement timeline before execution

#### Demo Flow

1. **Consumer Query → UCP Multi-Vendor Discovery**
   - Consumer describes trip preferences
   - Agent queries UCP across merchant categories: flights, hotels, restaurants, experiences
   - Dashboard screen: Multi-vendor cart builder shows 6 merchants across 3 countries
   - Total assembled: $3,720 (flights $680, hotel $1,680, restaurants $560, wine tour $450, museum $350)

2. **Simulation Engine Preview**
   - Agent calls `POST /simulate` with full cart
   - Dashboard screen: Simulation Results panel shows:
     - Total cost breakdown by vendor and currency
     - FX rates applied (USD→EUR at current rate)
     - Settlement timeline per vendor (all same-day)
     - Compliance screening results (all clean)

3. **Consumer Budget & Policy Check**
   - Policy Engine: $3,720 < $4,000 budget → PASS
   - Policy Engine: multi-vendor trip > $2,000 threshold → REQUIRES CONFIRMATION
   - Dashboard screen: Policy Check panel with rule evaluations

4. **Consumer Review & Approval**
   - Consumer reviews itinerary in-app, swaps one restaurant for another
   - Agent updates cart → re-simulates → $3,740 new total
   - Consumer approves → ACP checkout sessions created per vendor
   - Dashboard screen: 6 parallel checkout sessions visible in Active Checkouts

5. **Multi-Currency Settlement**
   - Airline settles in USD via ACP SharedPaymentToken
   - Hotel + experiences settle in EUR → Sly handles FX (USD→EUR)
   - Dashboard screen: Settlement Timeline shows parallel settlement tracks
   - FX Calculator shows locked rates and spreads

6. **Price Optimization (Agentic Behavior)**
   - Agent monitors flight prices for up to 9 days post-search
   - Detects 12% price drop → locks fare → saves $86
   - Dashboard screen: Price Optimization card shows savings captured

7. **Post-Booking**
   - Confirmations aggregated → agent adds to consumer's calendar
   - Dashboard screen: Transaction Detail shows complete multi-vendor audit trail

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Planning time | 9 days (flights) + 12 days (hotels) | < 5 minutes | 99.9% reduction |
| Options compared | 4 flights + 21 hotels manually | 200+ scored automatically | 8x coverage |
| Booking conversion | 25.5% | 68% | +167% |
| Cart abandonment | 74.5% | 12% | -84% |
| Price optimization savings | $0 | $86/trip avg (12% fare drop) | New value |
| Multi-vendor settlement time | 3-5 days per vendor | Same-day unified | 80% faster |
| Consumer satisfaction | 48% trust AI for planning | 78% post-agent | +63% |

#### Technical Notes

- This is the most complex demo — exercises UCP discovery, ACP checkout, FX engine, simulation, and multi-currency settlement simultaneously
- Each vendor gets its own ACP checkout session — use `checkout_group_id` to link them
- FX quotes via Epic 42 FX Calculator — inline preview in transfer form
- Simulation Engine (Epic 28) must support batch simulation (multiple transfers in one call)
- Settlement routes: USD direct via ACP, EUR via Circle USDC→EUR conversion
- Price monitoring is an agentic behavior — agent uses scheduled polling against merchant price APIs

---

### Scenario 3: API Monetization — "Pay-Per-Inference"

**Type:** B2B | **Protocols:** x402 | **Tier:** 0 — Agentic Now

**Potential Customers:** Cohere, Replicate, Hugging Face, Together AI

#### Preface

A fast-growing AI model provider serves 500+ agent customers through its inference API. Problem: 35% of their traffic comes from AI agents abusing the free tier — making thousands of calls with no intention of upgrading. The company can't charge micropayments (Stripe's minimum is $0.50, their inference costs $0.003). They're stuck with monthly invoicing that creates 30-day cash flow gaps, and they have no way to distinguish a legitimate enterprise agent from a scraping bot. They need a way to charge per call, in real time, and know exactly who's calling. Sly's x402 integration turns every API call into a revenue event.

#### Sly Features Exercised

- **x402 Endpoint Registration** — Register API routes as payable resources
- **x402 Payment Middleware** — Intercept requests, verify payment, forward to origin
- **KYA (Know Your Agent)** — Identify and tier agent callers
- **Agent Wallets** — Budget caps, daily limits per agent
- **Real-time Analytics** — Revenue per endpoint, per agent, per minute
- **Offramp Settlement** — USDC → fiat via Pix (Brazil), SEPA (Europe), ACH (US)

#### Demo Flow

1. **x402 Endpoint Registration**
   - Provider registers `/v1/inference` as x402 payable: price $0.003/call, currency USDC
   - Dashboard screen: x402 Endpoints table shows registered endpoint with pricing
   - Provider sets rate limits: 1,000 calls/minute per agent, $200/day cap per wallet

2. **Agent Wallet Provisioning**
   - Customer's AI agent gets a Sly wallet
   - Agent goes through KYA verification → identity confirmed, tier assigned (Standard)
   - Dashboard screen: Agent Management shows new agent with wallet balance, tier, and policies
   - Wallet funded: $200 daily budget cap

3. **Pay-Per-Call Execution**
   - Agent calls `GET /v1/inference` with x402 payment header
   - x402 middleware intercepts → verifies agent wallet has sufficient balance
   - 0.003 USDC deducted on Base chain → payment proof (JWT) returned
   - Provider SDK verifies JWT locally (1ms, no API call) → request forwarded to origin
   - Dashboard screen: x402 Payments feed shows real-time transactions streaming

4. **Real-time Analytics Dashboard**
   - Dashboard screen: x402 Analytics panel shows:
     - Revenue per endpoint ($/hour, $/day)
     - Unique paying agents (count, trend)
     - Calls per minute (real-time graph)
     - Top agents by spend
     - Rate limit utilization

5. **End-of-Day Offramp**
   - Provider accumulated $1,200 USDC
   - Initiates offramp: USDC → BRL via Pix (if Brazil), USD via ACH (if US), EUR via SEPA (if Europe)
   - Dashboard screen: Settlement Timeline shows offramp lifecycle
   - FX Calculator shows conversion rate and fees

6. **KYA Agent Tiering**
   - Dashboard screen: Agent Registry shows agents tiered by volume:
     - Standard: $0.003/call, 1K calls/min
     - Growth: $0.002/call, 5K calls/min (volume discount)
     - Enterprise: $0.001/call, 10K calls/min (negotiated)

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Revenue per API call | $0 (free tier abuse) | $0.003-$0.01 | ∞ new revenue |
| Payment latency | 30-day invoice cycle | < 200ms | Instant |
| Free tier abuse rate | 35% of traffic | < 2% (KYA verified) | 94% reduction |
| Invoicing cost per customer | $2.50/month | $0 | Eliminated |
| Unique paying agents/month | 0 | 500+ | New metric |
| Net revenue margin | 15% | 22% | +47% |

#### Technical Notes

- x402 implementation via Epic 17 (complete) — full endpoint registration, payment verification, SDK
- x402 payment performance optimized in Epic 26: JWT proof verification (140ms → 1ms), Bloom filter idempotency (169ms → 0ms)
- Agent wallets via Epic 18 (pending) — spending policies, budget caps per wallet
- KYA verification is a core differentiator — agents must register identity before transacting
- Offramp via Circle: USDC → fiat conversion with Pix/SPEI/ACH/SEPA support
- Demo should show the x402 middleware intercepting a live API call in real time

---

### Scenario 4: Corporate Travel — "São Paulo in 48 Hours"

**Type:** B2B | **Protocols:** AP2 + ACP | **Tier:** 1 — Agentic Emerging

**Potential Customers:** Navan, SAP Concur, TravelPerk, Spotnana

#### Preface

It's 4pm on Wednesday. The VP of Sales just got a call: a $2M deal in São Paulo needs an in-person meeting by Friday. She tells her AI travel agent to book it. The agent finds flights, hotels, and ground transport in seconds. But 35% of corporate bookings happen out-of-policy — wrong airline, hotel over budget, no corporate rate applied. When that happens, Finance discovers it 3 weeks later during expense reconciliation, and the company eats the difference. Sly enforces policy at the moment of booking, not after the fact. The agent can only book what's allowed, and it auto-categorizes every transaction to the right GL code before Finance ever sees it.

#### Sly Features Exercised

- **AP2 Mandate Chain** — IntentMandate → CartMandate → PaymentMandate lifecycle
- **Policy Engine** — Corporate travel rules (class, hotel cap, preferred carriers, trip budget)
- **Approval Workflows** — Auto-approve within policy, escalate above threshold
- **Multi-vendor Settlement** — Airline via ACP, hotel via local rails (BRL)
- **Metadata Schema** — Auto-GL coding, cost center assignment
- **Simulation Engine** — Preview total trip cost with FX before execution
- **Audit Trail** — Complete transaction history linked to trip, traveler, policy

#### Demo Flow

1. **Agent Registration with Corporate Policy**
   - Agent registered with Acme Corp's travel policy:
     - Economy class only
     - Max $500/night hotel
     - Preferred carriers: LATAM Airlines, United, American
     - $5,000 per-trip cap
   - Dashboard screen: Agent Management shows policy rules attached to agent

2. **AP2 Intent Mandate**
   - Agent creates IntentMandate: "book travel São Paulo, Feb 12-14 for VP Sales"
   - Dashboard screen: AP2 Mandates table shows new mandate (status: `intent`)
   - Mandate contains: traveler, destination, dates, purpose

3. **AP2 Cart Mandate — Options Assembled**
   - Agent searches and selects: LATAM Airlines $680 round-trip + hotel $420/night (2 nights)
   - Cart Mandate created with full itinerary → total $1,520
   - Dashboard screen: Mandate Detail shows cart items, vendor details, total cost
   - VDC Visualizer shows mandate progression (Intent → Cart)

4. **Policy Check + Simulation**
   - Policy Engine evaluates each item:
     - Flight: economy ✓, preferred carrier (LATAM) ✓, price within range ✓
     - Hotel: $420/night < $500 max ✓
     - Total: $1,520 < $5,000 trip cap ✓
   - Simulation Engine: previews FX (USD→BRL for hotel), settlement timeline
   - Dashboard screen: Policy Check panel — all green checkmarks

5. **Auto-Approved → Payment Mandate Executes**
   - All within policy → auto-approved (no human in the loop)
   - PaymentMandate created → execution begins
   - Dashboard screen: VDC Visualizer shows Intent → Cart → Payment progression
   - Dashboard screen: Approval Workflows shows "auto-approved" status

6. **Multi-Vendor Settlement**
   - Airline: settles via ACP SharedPaymentToken (USD)
   - Hotel: settles via Pix/local rails (BRL) — FX conversion handled by Sly
   - Dashboard screen: Settlement Timeline shows parallel settlement tracks
   - Both completed same-day

7. **Auto-Categorization & Audit**
   - Metadata auto-assigned: GL code "Travel-Sales", cost center "LATAM Expansion"
   - Dashboard screen: Transaction Detail shows full audit trail with metadata
   - Zero reconciliation work for Finance

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Avg trip cost | $1,500 | $1,180 | 21% savings |
| Out-of-policy bookings | 35% | < 2% | 94% reduction |
| Expense reconciliation time | 5-7 days per trip | 0 (auto at booking) | Eliminated |
| Booking-to-approval time | 4-8 hours | < 30 seconds | 99.9% faster |
| Corporate rate capture | 55% | 96% | +75% |
| Annual savings per 1,000 trips | — | $320K | New value |

#### Technical Notes

- AP2 mandate lifecycle via Epic 17 (complete) — IntentMandate, CartMandate, PaymentMandate CRUD APIs
- AP2 mandate actions (activate, suspend, revoke) via Epic 42 (complete)
- VDC Visualizer (Epic 42) shows mandate progression visually
- Policy Engine rules should be JSON-configurable per partner/company
- Multi-vendor settlement requires parallel ACP + local rails execution
- Metadata Schema (Epic 33, pending) — GL codes, cost centers, PO numbers
- FX Calculator (Epic 42) — inline preview in transfer form for BRL conversion

---

## TIER B — Strong Supporting Demos (Rotate Based on Audience)

---

### Scenario 5: Neobank Bill Pay — "The Rent-First Rule"

**Type:** B2C | **Protocols:** AP2 | **Tier:** 2 — Friction Reduction

**Potential Customers:** Nubank, Chime, Revolut, Stori

#### Preface

It's the 28th of the month. A neobank customer has $1,350 in her account and $1,475 in bills due tomorrow: rent ($1,200), electric ($180), internet ($80), and Netflix ($15). Without intervention, her auto-pay will process them in whatever order the billers submit — and if Netflix hits first, followed by internet and electric, she might overdraft on rent. The average overdraft fee is $27.08, and affected customers get hit 3.4 times per year. That's $92 in fees for a timing problem, not a spending problem. Worse, 40% of neobank churn is involuntary — triggered by payment failures that erode trust. She doesn't need a budgeting app. She needs an agent that pays her bills in the right order, pre-checks her balance, and defers non-essential payments when funds are tight.

#### Sly Features Exercised

- **AP2 Recurring Mandates** — Agent authorized for recurring bill payments
- **Balance Shield** — Pre-transaction balance check, delay if insufficient
- **Policy Engine** — Bill priority rules (P0: essential, P1: important, P2: discretionary, P3: deferrable)
- **Anomaly Detection** — Flag unusual bill amounts
- **Graceful Degradation** — Defer non-essential payments with clear consumer messaging
- **Approval Workflows** — Consumer notification for deferred payments

#### Demo Flow

1. **Smart Pay Enrollment**
   - Customer enables "Smart Pay" in neobank app
   - AI agent receives AP2 mandate for recurring bills: rent, electric, internet, streaming
   - Dashboard screen: AP2 Mandates table shows recurring mandates with priority levels
   - Each bill has a priority: rent (P0), electric (P1), internet (P2), Netflix (P3)

2. **Bills Due — Balance Shield Trigger**
   - Bills come due: rent $1,200 + electric $180 + internet $80 + Netflix $15 = $1,475
   - Balance Shield checks: account balance = $1,350 → INSUFFICIENT for all
   - Dashboard screen: Balance Shield panel shows:
     - Available balance: $1,350
     - Total bills due: $1,475
     - Shortfall: $125
     - Status: PARTIAL — priority ordering activated

3. **Priority-Based Execution**
   - Agent applies priority rules:
     - P0 (Rent $1,200): EXECUTE → balance now $150
     - P1 (Electric $180): INSUFFICIENT → check if can partial pay → no → DEFER to Friday
     - Wait — customer's known deposit pattern detected (paycheck Friday)
     - Revised plan: pay rent now, hold electric + internet + Netflix until Friday deposit
   - Dashboard screen: Payment Queue shows ordered execution with status per bill

4. **Consumer Notification**
   - Agent sends alert: "Paid rent ($1,200). Holding electric, internet, and Netflix until your deposit on Friday. You're covered."
   - Dashboard screen: Notification Log shows consumer alert sent with details

5. **Friday — Deposit Arrives → Auto-Resume**
   - Paycheck deposits $2,100 → balance now $2,250
   - Agent auto-resumes deferred bills: electric ($180), internet ($80), Netflix ($15) → all paid
   - Dashboard screen: Payment Queue shows all items resolved (status: settled)

6. **Month-End Summary**
   - Dashboard screen: Smart Pay Summary shows:
     - Bills paid on time: 4/4
     - Overdraft incidents prevented: 1
     - Overdraft fees saved: $27.08
     - Next month projection based on spending patterns

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Overdraft incidents/customer/year | 3.4 | 0.2 | 94% reduction |
| Overdraft fee savings/customer | — | $92/year | New value |
| Bills paid on time | 78% | 97% | +24% |
| Customer churn (annual) | 19% | 11% | 42% reduction |
| Payment support calls/customer/year | 2.1 | 0.4 | 81% reduction |
| Premium tier conversion | N/A | 18% upgrade for Smart Pay | New revenue |

#### Technical Notes

- AP2 mandate system via Epic 17 (complete) — use recurring mandates with configurable frequency
- Balance Shield is a pre-transaction check — needs read access to account balance before executing
- Priority rules should be partner-configurable: each bill gets a priority tier (P0-P3)
- Graceful Degradation: when funds insufficient, agent must produce a clear plan (what pays now, what defers, when it resumes)
- Auto-resume logic: agent polls for balance changes (or receives webhook from neobank) and executes deferred queue
- Consumer notifications: webhook to neobank's push notification system

---

### Scenario 6: Gig Economy — "The Smart Payout"

**Type:** B2C | **Protocols:** Core Settlement API | **Tier:** 2 — Friction Reduction

**Potential Customers:** Uber, DoorDash, Rappi, DiDi, Deel

#### Preface

Carlos drives for a ride-hailing platform in Mexico City. He earns 2,400 MXN on a good day across 12 rides. His payout arrives 3-5 business days later. When tax season comes, he's part of the 62% of gig workers who are unprepared — he owes 15.3% self-employment tax but only saved 12% of his net income, leaving a $2,400 shortfall. He also missed $1,840 in deductions because he tracked mileage and expenses manually. Carlos doesn't need faster payouts alone. He needs an agent that intercepts every payout, auto-reserves for taxes, auto-saves for emergencies, sends the rest instantly, and compiles deductions at quarter-end. The platform that offers this — powered by Sly — becomes his financial safety net.

#### Sly Features Exercised

- **Core Settlement API** — Instant payouts via SPEI (Mexico), Pix (Brazil), ACH (US)
- **Policy Engine** — Auto-allocation rules (tax %, savings %, spending %)
- **Agent Wallets** — Separate wallets for tax reserve, savings, spending
- **Metadata Schema** — Auto-categorization of ride earnings, expenses
- **Audit Trail** — Per-ride earnings, cumulative tax reserve, deduction tracking

#### Demo Flow

1. **Driver Onboarding — Smart Payout Rules**
   - Carlos enables Smart Payout on the platform
   - Agent configured with allocation rules:
     - 20% → Tax Reserve (locked wallet, visible but protected)
     - 10% → Emergency Savings (withdrawable with friction)
     - 70% → Instant Payout (SPEI to Carlos's bank)
   - Dashboard screen: Agent Management shows allocation policy

2. **Ride Completion → Payout Triggered**
   - Carlos completes 12 rides, earns 2,400 MXN
   - Platform triggers payout to Sly
   - Dashboard screen: Incoming Transfer shows 2,400 MXN

3. **Auto-Allocation Execution**
   - Agent applies rules:
     - 480 MXN → Tax Reserve wallet (cumulative balance shown)
     - 240 MXN → Savings wallet (cumulative balance shown)
     - 1,680 MXN → SPEI instant payout to Carlos's bank account
   - Dashboard screen: Allocation Breakdown shows per-ride split
   - Dashboard screen: Wallet Balances shows all three wallets with running totals

4. **Real-Time Settlement**
   - 1,680 MXN sent via SPEI → Carlos receives in his bank within minutes
   - Dashboard screen: Settlement Timeline shows SPEI payout status
   - Carlos gets push notification: "Ride earnings: 2,400 MXN. Tax reserved: 480. Savings: 240. Sent to your bank: 1,680."

5. **Quarter-End Tax Summary (Agentic Behavior)**
   - Agent compiles quarterly summary:
     - Total earnings: 72,000 MXN
     - Tax reserved: 14,400 MXN
     - Estimated tax liability: 14,200 MXN → FULLY COVERED
     - Auto-categorized deductions: gas (4,200 MXN), phone (1,800 MXN), vehicle maintenance (3,600 MXN)
   - Dashboard screen: Tax Summary report with downloadable PDF for accountant

6. **Year-Over-Year Comparison**
   - Dashboard screen: YoY Metrics panel:
     - Tax surprise: eliminated (was $2,400 shortfall)
     - Savings rate: improved (10% consistent)
     - Deduction capture: 40% → 92%
   - Platform sees: 22% of drivers opted into Smart Payout premium tier

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Payout timing | 3-5 business days | Instant (SPEI) | 99% faster |
| Tax reserve adequacy | 12% of drivers save | 100% auto-reserved (25% of net) | From 12% to 100% |
| Tax surprise (April shortfall) | $2,400 avg | $0 | Eliminated |
| Driver retention (12-month) | 58% | 74% | +28% |
| Deduction capture rate | 40% (manual) | 92% (auto-categorized) | +130% |
| Annual tax savings per driver | — | $1,840 | New value |
| Premium tier adoption | N/A | 22% opt in | New revenue |

#### Technical Notes

- Core settlement via transfers API — no protocol needed, direct SPEI/Pix/ACH
- Agent wallets (Epic 18, pending) — need sub-wallets per purpose (tax, savings, spending)
- SPEI instant settlement via Circle (Epic 40, complete)
- Auto-allocation rules should be configurable per partner: percentages, wallet types, lock durations
- Tax summary requires Metadata Schema (Epic 33) for expense categorization
- Deduction auto-categorization: merchant category codes (MCCs) from spending data
- Quarterly reporting: generate structured data (JSON + PDF export)

---

### Scenario 7: Agentic Remittance — "Mom's Rent is Due Friday"

**Type:** B2C | **Protocols:** AP2 | **Tier:** 1 — Agentic Emerging

**Potential Customers:** Wise, Remitly, Nubank, DolarApp

#### Preface

Maria lives in Dallas and sends $500 to her mother in Guadalajara every month for rent. Today she uses a traditional remittance service: 6.49% in fees ($32.45), a 2-5 day wait, and no certainty about the exchange rate her mother will actually receive. If her bank balance is short the week before, the transfer fails and she has to remember to retry manually. If her mother's bank account number changes, there's no verification — the money could go to the wrong account. Maria doesn't need cheaper rails. She needs an AI financial agent that watches the FX market, picks the best moment to send, handles her when funds are tight, and protects her mother from receiving errors. The agent doesn't just move money — it manages the entire obligation.

#### Sly Features Exercised

- **AP2 Recurring Mandate** — Monthly obligation with delivery deadline and FX window
- **FX Calculator** — Real-time rate monitoring, rate locking, historical comparison
- **Balance Shield** — Pre-check sender balance before execution
- **Compliance Screening** — KYC on sender and recipient
- **Anomaly Detection** — Recipient account change detection
- **Settlement** — USD → USDC → SPEI (MXN) via Circle
- **Approval Workflows** — Consumer confirmation for exceptions (split payment, account changes)

#### Demo Flow

1. **Recurring Transfer Setup**
   - Maria sets up: "$500/month to mom, due by the 1st, she needs it for rent"
   - Agent creates AP2 recurring mandate:
     - Amount: $500 USD
     - Recipient: Mom (KYC verified)
     - Delivery deadline: 1st of each month
     - FX optimization window: 3 days prior (28th-30th)
   - Dashboard screen: AP2 Mandates shows recurring mandate with schedule

2. **Agentic Behavior #1: FX Optimization**
   - 3 days before deadline, agent starts monitoring USD/MXN rate
   - Day 1 (28th): rate = 17.9 (below 30-day avg 17.8) → HOLD
   - Day 2 (29th): rate = 18.2 (above 30-day avg) → LOCK & EXECUTE
   - Dashboard screen: FX Optimization panel shows:
     - Rate locked: 18.2
     - 30-day average: 17.8
     - Savings: $11.50 (mom receives 91 MXN more)
     - Decision: "Executed early — rate was 2.2% above average"

3. **Settlement Execution**
   - USD → USDC (on-ramp) → SPEI payout in MXN
   - Mom receives pesos in her bank account within minutes
   - Dashboard screen: Settlement Timeline shows full lifecycle
   - Confirmation sent to both Maria and her mother

4. **Agentic Behavior #2: Exception Handling (Low Balance)**
   - Next month: Maria's balance is $380 three days before deadline
   - Agent detects insufficient funds → does NOT fail silently
   - Agent sends alert: "Your balance is $380. Should I send $380 now and $120 on Friday when your paycheck hits?"
   - Maria approves the split via push notification
   - Dashboard screen: Approval Workflows shows split-payment request and approval
   - First transfer: $380 → SPEI
   - Friday: paycheck deposits → agent auto-sends remaining $120 → SPEI
   - Mom receives full amount by the 1st

5. **Agentic Behavior #3: Fraud Prevention (Account Change)**
   - Following month: recipient bank account number has changed
   - Anomaly Detection flags: "Recipient account differs from last 11 transfers"
   - Agent pauses transfer → sends verification request to Maria
   - Maria confirms: "Yes, mom switched banks" → agent updates and proceeds
   - Dashboard screen: Anomaly Detection panel shows flagged event and resolution

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Transfer fee | 5-6.49% ($25-$32 on $500) | < 1% ($4.50) | 82% cheaper |
| Settlement time | 2-5 business days | < 15 minutes | 99% faster |
| FX savings per transfer | $0 | $11.50 avg (agent-timed) | New value |
| Annual savings per customer | — | $438/year (fee + FX combined) | New value |
| Failed transfers from low balance | 8-12% | 0% (agent splits/alerts) | Eliminated |
| Consumer retention (12-month) | 62% | 89% | +44% |

#### Technical Notes

- AP2 recurring mandates via Epic 17 — use mandate with `frequency: monthly`, `deadline_day: 1`
- FX optimization: agent needs access to FX rate feed (real-time or 15-min delayed) and historical averages
- FX Calculator (Epic 42) for rate comparison and locking
- Balance Shield: check sender's funding source balance via Plaid (US) or Belvo (LATAM) — Epic 41
- Settlement: USD → USDC → SPEI via Circle (Epic 40, complete)
- Exception handling (split payment): create two linked transfers with the same mandate reference
- Anomaly Detection: compare recipient account details against historical transfer metadata

---

### Scenario 8: Media & Publishing — "The Article That Pays for Itself"

**Type:** B2B | **Protocols:** x402 | **Tier:** 0 — Agentic Now

**Potential Customers:** The New York Times, Medium, Axel Springer (Politico, Business Insider), The Guardian, Substack, Reuters/AP

#### Preface

The New York Times has 10 million digital subscribers. But for every subscriber, there are 50 people who hit the paywall, read the headline, and leave. The math is brutal: a subscription costs $4/week, but 83% of readers only want one article. They won't pay $17/month for a single story about Barcelona's new wine bars. Meanwhile, AI agents are now the fastest-growing source of content traffic — ChatGPT, Perplexity, and Gemini surface article summaries millions of times per day. Publishers get zero revenue from this. They can block AI crawlers (and lose visibility) or let them scrape freely (and lose revenue). There's no middle ground — until now. Sly enables x402 micropayments per article: a human reader pays $0.15 to read one piece, and an AI agent pays $0.02 to access the full text for a response. No subscription required. No paywall friction. Every read becomes revenue.

#### Sly Features Exercised

- **x402 Endpoint Registration** — Register articles/content as payable resources
- **x402 Payment Middleware** — Intercept content requests, verify payment, unlock content
- **KYA (Know Your Agent)** — Distinguish AI agent traffic from human readers, tier access
- **Policy Engine** — Content access rules (summary-only vs. full text vs. data extraction)
- **Agent Wallets** — Budget management for AI agents accessing content at scale
- **Real-time Analytics** — Revenue per article, per writer, human vs. AI split
- **Dynamic Pricing** — Trending content price adjustment
- **Offramp Settlement** — USDC → fiat via ACH, SEPA, Pix

#### Demo Flow

1. **Content Registration as x402 Resources**
   - Publisher registers article catalog as x402 payable:
     - Human reader price: $0.15/article
     - AI agent price: $0.02/access (full text), $0.005/access (summary only)
     - Free tier: 3 articles/month (human), 100 summaries/month (AI agent)
   - Dashboard screen: x402 Endpoints shows content catalog with tiered pricing

2. **Human Reader — Micropayment Checkout**
   - Reader lands on article → hits paywall
   - One-click x402 payment option: "Read this article for $0.15"
   - Reader pays → article unlocks instantly → no subscription required
   - Dashboard screen: x402 Payments feed shows human reader transaction

3. **AI Agent — Paid Content Access**
   - Perplexity agent requests article to answer user query: "best wine bars in Barcelona"
   - KYA verifies agent identity → Perplexity (verified, Tier: Premium)
   - Agent pays $0.02 for full text access → x402 payment on Base → <200ms
   - Full article text returned in API response (not scraped — licensed)
   - Dashboard screen: Agent Traffic panel shows AI vs. human split

4. **Real-time Revenue Dashboard**
   - Dashboard screen: Content Analytics shows:
     - Revenue per article (top performers highlighted)
     - Revenue per writer (Medium/Substack model)
     - Human vs. AI traffic ratio and revenue contribution
     - Trending articles with dynamic pricing indicators
     - Free tier usage (articles remaining per reader/agent)

5. **Dynamic Pricing (Agentic Behavior)**
   - Article goes viral on social media → traffic spikes 10x
   - Publisher's pricing engine raises price to $0.25 for 24 hours
   - Sly enforces new rate immediately for all new requests
   - Dashboard screen: Dynamic Pricing card shows price change, traffic spike, revenue impact

6. **AI Access Governance**
   - Publisher sets access-level tiers for AI agents:
     - Summary-only ($0.005): 200-word excerpt
     - Full text ($0.02): complete article
     - Data extraction ($0.05): full text + structured metadata
   - Policy Engine enforces: AI agent requesting full text pays full text rate
   - Dashboard screen: AI Access Tiers shows usage by tier

7. **End-of-Month Settlement**
   - Publisher accumulated $48,000 in micropayments (human + AI)
   - Offramp: USDC → USD via ACH (or SEPA for European publishers)
   - Dashboard screen: Monthly Revenue Summary with writer-level breakdown
   - Writer payouts calculated automatically (Medium/Substack model)

#### KPIs (Dashboard Values)

| KPI | Before Sly | After Sly | Delta |
|-----|-----------|-----------|-------|
| Revenue from non-subscribers | $0 (paywall blocks them) | $0.15/read × millions | New revenue stream |
| Revenue from AI traffic | $0 (scraped or blocked) | $0.02/access × millions | New revenue stream |
| Paywall bounce rate | 83% of visitors leave | 35% (micropayment option) | -58% |
| Subscription cannibalization | N/A | < 5% (casual ≠ subscriber) | Minimal |
| Revenue per viral article (top 10%) | $0 (fixed subscription) | $2,400/month (dynamic pricing) | New metric |
| Writer revenue (per-read model) | $0.05/read (membership pool) | $0.08/read (direct micropayment) | +60% |
| AI licensing revenue (est.) | $0/query | $0.02 × 50M queries/mo = $1M/mo | $12M/year new |
| Payment latency | N/A (subscription) | < 200ms (x402) | Frictionless |

#### Technical Notes

- x402 implementation via Epic 17 (complete) — register content endpoints as payable resources
- x402 middleware sits in front of CMS/CDN — intercepts content requests, checks payment, forwards
- KYA is critical here: must distinguish human readers from AI agents from scrapers
- Tiered pricing per agent type: configure in x402 endpoint pricing rules
- Dynamic pricing: publisher provides pricing callback URL, Sly queries at request time
- For human readers: x402 payment can be wrapped in a one-click button (no wallet required — custodial)
- AI access governance: content delivery can be partial (summary) or full based on payment tier
- Offramp via Circle: USDC → fiat, with writer-level revenue attribution from Metadata Schema
- This scenario pairs well with Scenario 3 (API Monetization) — same x402 infrastructure, different vertical
