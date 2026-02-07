# Epic 55: Demo Scenario Readiness

**Status:** PLANNED
**Phase:** 5.1 (Demo & Sales Enablement)
**Priority:** P0 — Revenue Generating
**Estimated Points:** 89
**Stories:** 12
**Dependencies:** Epic 17 (complete), Epic 42 (complete), Epic 52 (complete)
**Created:** February 6, 2026
**Updated:** February 6, 2026

[<- Back to Epic List](./README.md)

---

## Executive Summary

Make the Sly dashboard and API demo-ready for all 8 scenarios defined in `docs/Sly_Demo_Scenarios_TierAB.md`. After a comprehensive screen-by-screen validation of the running dashboard, this epic addresses three categories of work:

1. **Seed Data** (P0) -- Populate the dashboard with realistic, scenario-specific demo data so every screen looks alive
2. **Missing UI Elements** (P1) -- Build dashboard components referenced in demo scenarios that don't yet exist (KPI panels, policy check visualizations, settlement timelines)
3. **Scenario Flow Polish** (P2) -- End-to-end clickthrough polish so each demo scenario can be walked through smoothly

---

## Dashboard Validation Report

### Screen-by-Screen Assessment

#### Core Screens

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Home | `/dashboard` | Needs data | Protocol stats, activity chart, activity feed all show 0/empty. API Usage widget works (135 req/min). |
| Transactions | `/dashboard/transfers` | Needs data | Excellent UI: search, 4 filters (Status/Type/Initiator/Protocol), Live Updates, Export, New Transfer. Empty. |
| Wallets | `/dashboard/wallets` | Needs data | Good stats cards (Total Balance, Agent-Managed, With Policies, Near Limit), filter tabs, agent wallet toggle. Empty. |
| Agents | `/dashboard/agents` | Needs data | Search, filter, Create Agent button. Empty. |
| Approvals | `/dashboard/approvals` | Needs data | Search, status/protocol filters. Empty. |
| FX Calculator | `/dashboard/fx` | Good to go | Live conversion working (1000 USDC = 920.40 EURC), market rates sidebar, fee display. Demo-ready. |
| Compliance | `/dashboard/compliance` | Needs data | Risk-level cards (Total/Urgent/Review/Monitor), Export Report. Empty. |
| Settlement Rules | `/dashboard/settlement-rules` | Needs data | Stats cards (Total/Enabled/Schedule/Threshold/Manual), History, Create Rule. Empty. |

#### x402 Screens (Scenarios 3, 8)

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| x402 Endpoints | `/dashboard/agentic-payments/x402/endpoints` | Needs data | Stats (Total Endpoints, Active, Revenue, Calls), search, filter tabs. Empty. |
| x402 Endpoint Detail | `/dashboard/agentic-payments/x402/endpoints/[id]` | Needs data | Page exists but needs endpoint to navigate to. |
| x402 Analytics | Via cross-protocol analytics (x402 tab) | Needs data | Tab exists on analytics page. Shows 0 values. |

#### ACP Screens (Scenarios 1, 2, 4)

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| ACP Checkouts | `/dashboard/agentic-payments/acp/checkouts` | Needs data | Table with proper columns (ID, Details, Entities, Items, Total, Status, Created). Empty. |
| ACP Checkout Detail | `/dashboard/agentic-payments/acp/checkouts/[id]` | Needs data | Page exists but needs checkout data. |
| ACP Analytics | `/dashboard/agentic-payments/acp/analytics` | Needs data | Exists. |

#### AP2 Screens (Scenarios 4, 5, 7)

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| AP2 Mandates | `/dashboard/agentic-payments/ap2/mandates` | Needs data | Table (Mandate ID, Agent, Type, Authorized, Used, Remaining, Status, Created). Empty. |
| AP2 Mandate Detail | `/dashboard/agentic-payments/ap2/mandates/[id]` | Needs data | Page exists but needs mandate data. VDC Visualizer referenced in scenarios. |
| AP2 Analytics | `/dashboard/agentic-payments/ap2/analytics` | Needs data | Exists. |

#### UCP Screens (Scenarios 1, 2)

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| UCP Settlements | `/dashboard/agentic-payments/ucp/checkouts` | Needs data | Good table (Settlement ID, Recipient, Amount, Corridor, FX Rate, Status, Created). Empty. |
| UCP Orders | `/dashboard/agentic-payments/ucp/orders` | Needs data | Page exists. |
| UCP Order Detail | `/dashboard/agentic-payments/ucp/orders/[id]` | Needs data | Needs order data to verify fulfillment timeline. |

#### Cross-Protocol

| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Agentic Payments Overview | `/dashboard/agentic-payments` | Partially ready | 4 protocol cards with stats. ACP shows 2/$1,245, AP2 shows 3/2 active, x402 shows 3/$21.82. UCP empty. |
| Cross-Protocol Analytics | `/dashboard/agentic-payments/analytics` | Needs data | Tabs (Overview/UCP/ACP/AP2/x402), Performance table, protocol cards. All 0. |

### Gap Categories

**Good to Go (1 screen):**
- FX Calculator -- fully functional with live rates

**Needs Data Only (18 screens):**
- Dashboard Home, Transactions, Wallets, Agents, Approvals, Compliance, Settlement Rules
- x402 Endpoints, x402 Detail, x402 Analytics
- ACP Checkouts, ACP Detail, ACP Analytics
- AP2 Mandates, AP2 Detail, AP2 Analytics
- UCP Settlements, UCP Orders

**Partially Ready (1 screen):**
- Agentic Payments Overview -- has some protocol stats, needs UCP data and more volume

**Needs UI Work (0 screens, but scenario features missing):**
- Policy Check panels (Scenarios 1, 2, 4, 5) -- scenarios reference "Policy Check panel with rule evaluations" but no such standalone component exists
- Settlement Timeline visualization (Scenarios 1-8) -- scenarios reference visual timeline showing payment lifecycle, not built as a standalone viz
- Simulation Engine preview (Scenarios 2, 4) -- `POST /simulate` response visualization panel
- Balance Shield panel (Scenario 5) -- balance check visualization
- KPI Before/After panels -- each scenario has specific KPI tables for demo

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| Seed data script | No | - | - | Internal tooling |
| KPI demo widgets | No | - | - | Dashboard-only |
| Policy check viz | No | - | - | Dashboard-only |
| Settlement timeline | No | - | - | Dashboard-only |

**SDK Stories Required:** None -- this epic is entirely dashboard/seed focused.

---

## Stories

### Story 55.1: Demo Seed Data Script -- x402 Scenarios (3, 8)

**Points:** 8
**Priority:** P0

**Description:**
Create seed data for x402 demo scenarios (Pay-Per-Inference and Media Micropayments). This populates the x402 Endpoints, Wallets, and Transactions screens with realistic demo data.

**Seed Data:**
- 3 x402 endpoints: `/v1/inference` ($0.003/call), `/articles/:id` ($0.15 human, $0.02 agent), `/data/extract` ($0.05/call)
- 5 agent wallets with varying balances ($50-$500), spending policies, and budget caps
- 200+ x402 payment transactions over 30 days (varying agents, endpoints, amounts)
- Revenue accumulation showing $1,200/day pattern
- Agent tier distribution (Standard: 60%, Growth: 30%, Enterprise: 10%)

**Acceptance Criteria:**
- [ ] x402 Endpoints page shows 3 endpoints with pricing, call counts, and revenue
- [ ] x402 Endpoint Detail shows analytics chart, recent transactions
- [ ] Wallets page shows 5 agent wallets with balances and spending progress
- [ ] Transactions page shows x402 transactions when filtered by protocol
- [ ] Home page Protocol Distribution shows x402 activity

**Files to Modify:**
- `apps/api/scripts/seed-demo-scenarios.ts` (NEW)

---

### Story 55.2: Demo Seed Data Script -- ACP Scenarios (1, 2)

**Points:** 8
**Priority:** P0

**Description:**
Create seed data for ACP demo scenarios (Shopping Agent, Travel Itinerary). Populates ACP Checkouts with realistic e-commerce and travel checkout sessions.

**Seed Data:**
- 8 ACP checkout sessions across shopping and travel verticals:
  - Tissot PRX watch checkout ($299, status: completed)
  - Barcelona trip: 6 parallel checkouts (flights $680, hotel $1,680, restaurants $560, wine tour $450, museum $350, total $3,720)
  - 1 pending checkout for live demo
- Cart items with merchant names, currencies, and product details
- Settlement records linked to checkouts
- Checkout group linking for multi-vendor scenarios

**Acceptance Criteria:**
- [ ] ACP Checkouts page shows 8 checkout sessions with statuses
- [ ] ACP Checkout Detail shows cart items, merchant info, totals
- [ ] Protocol overview card shows ACP volume and count
- [ ] Cross-protocol analytics shows ACP data

**Files to Modify:**
- `apps/api/scripts/seed-demo-scenarios.ts`

---

### Story 55.3: Demo Seed Data Script -- AP2 Scenarios (4, 5, 7)

**Points:** 8
**Priority:** P0

**Description:**
Create seed data for AP2 demo scenarios (Corporate Travel, Bill Pay, Remittance). Populates AP2 Mandates with authorization chains.

**Seed Data:**
- 6 AP2 mandates across 3 verticals:
  - Corporate travel: IntentMandate (active), CartMandate (active), PaymentMandate (executed)
  - Bill pay: 4 recurring mandates (rent P0, electric P1, internet P2, Netflix P3) with execution history
  - Remittance: recurring monthly mandate ($500 USD->MXN) with 3 months of executions
- Mandate progression history (intent -> cart -> payment)
- Policy evaluation records

**Acceptance Criteria:**
- [ ] AP2 Mandates page shows 6 mandates with types and statuses
- [ ] AP2 Mandate Detail shows mandate chain progression
- [ ] Mandate detail shows VDC Visualizer state transitions
- [ ] Cross-protocol analytics shows AP2 data

**Files to Modify:**
- `apps/api/scripts/seed-demo-scenarios.ts`

---

### Story 55.4: Demo Seed Data Script -- UCP Scenarios (1, 2)

**Points:** 5
**Priority:** P0

**Description:**
Create seed data for UCP scenarios. UCP is used in the Shopping Agent and Travel Itinerary scenarios for merchant discovery and settlement.

**Seed Data:**
- 4 UCP settlements (2 shopping, 2 travel) with corridors (USD->EUR, USD->BRL)
- 3 UCP orders with fulfillment status progression
- UCP identity/client registration

**Acceptance Criteria:**
- [ ] UCP Settlements page shows 4 settlements with corridors and FX rates
- [ ] UCP Orders page shows 3 orders with statuses
- [ ] Protocol overview card shows UCP volume

**Files to Modify:**
- `apps/api/scripts/seed-demo-scenarios.ts`

---

### Story 55.5: Demo Seed Data Script -- Core Entities

**Points:** 8
**Priority:** P0

**Description:**
Create the foundation entities that all scenarios reference: accounts, agents with KYA tiers, wallets with spending policies, and cross-scenario transactions.

**Seed Data:**
- 5 accounts: Acme Corp (enterprise), TechStartup (SMB), Maria (consumer), Carlos (gig worker), David (consumer)
- 8 agents:
  - Shopping Agent (KYA Tier 2, linked to David)
  - Travel Agent (KYA Tier 2, linked to David)
  - Corporate Travel Agent (KYA Tier 1, linked to Acme Corp)
  - Bill Pay Agent (KYA Tier 1, linked to Maria)
  - Remittance Agent (KYA Tier 1, linked to Maria)
  - Inference API Consumer (KYA Tier 0, linked to TechStartup)
  - Content Scraper (KYA Tier 0, linked to TechStartup)
  - Smart Payout Agent (KYA Tier 1, linked to Carlos)
- 10 wallets with varying balances, spending policies, and limit utilization
- 50+ transactions across all protocols over 30 days
- 5 compliance screening records (3 clear, 1 review, 1 flagged)
- 3 approval workflow records (1 pending, 1 approved, 1 auto-approved)
- 2 settlement rules (1 scheduled daily, 1 threshold-based)

**Acceptance Criteria:**
- [ ] Home dashboard shows non-zero stats in all 4 top cards
- [ ] Protocol Activity chart shows data over 7d/30d
- [ ] Protocol Distribution donut chart shows distribution across 4 protocols
- [ ] Recent Activity feed shows last 10 transactions
- [ ] Agents page shows 8 agents with KYA tiers and statuses
- [ ] Wallets page shows wallets with spending progress bars
- [ ] Approvals page shows approval records
- [ ] Compliance page shows flags by risk level
- [ ] Settlement Rules page shows 2 rules

**Files to Modify:**
- `apps/api/scripts/seed-demo-scenarios.ts`

---

### Story 55.6: Seed Script Runner & Reset

**Points:** 3
**Priority:** P0

**Description:**
Create the CLI runner for the demo seed script with reset capability, integrated with the existing `pnpm seed:db` pattern.

**Implementation:**
- `pnpm --filter @sly/api seed:demo` command
- `--reset` flag to clear and re-seed demo data
- `--scenario <n>` flag to seed only a specific scenario (1-8)
- Idempotent execution (safe to re-run)
- Uses existing Supabase service role client

**Acceptance Criteria:**
- [ ] `pnpm --filter @sly/api seed:demo` seeds all demo data
- [ ] `pnpm --filter @sly/api seed:demo --reset` clears and re-seeds
- [ ] Script completes in < 30 seconds
- [ ] All seeded data belongs to the "Demo Organization" tenant

**Files to Modify:**
- `apps/api/scripts/seed-demo-scenarios.ts`
- `apps/api/package.json` (add `seed:demo` script)

---

### Story 55.7: KPI Dashboard Panels

**Points:** 13
**Priority:** P1

**Description:**
Build reusable "Before Sly / After Sly" KPI comparison panels for each demo scenario. These are the headline metrics shown in every scenario's KPI table and are critical for the sales pitch.

**Implementation:**
- Reusable `<KpiPanel>` component with before/after/delta columns
- 8 scenario-specific KPI configurations (hardcoded for demo, API-backed later)
- Accessible from each protocol's analytics page or a dedicated "Demo KPIs" section
- Animated counter transitions for dramatic effect during demos

**KPI Panels:**
1. Shopping Agent: Cart abandonment 74.5% -> 12%, Conversion 25.5% -> 68%
2. Travel Itinerary: Planning time 9 days -> 5 min, Options 4 -> 200+
3. Pay-Per-Inference: Revenue per call $0 -> $0.003, Payment latency 30-day -> 200ms
4. Corporate Travel: Avg trip cost $1,500 -> $1,180, Out-of-policy 35% -> 2%
5. Bill Pay: Overdrafts 3.4/yr -> 0.2, Bills on time 78% -> 97%
6. Gig Payout: Payout timing 3-5 days -> Instant, Tax reserve 12% -> 100%
7. Remittance: Fee 6.49% -> <1%, Settlement 2-5 days -> 15 min
8. Media: Paywall bounce 83% -> 35%, AI licensing revenue $0 -> $12M/yr

**Acceptance Criteria:**
- [ ] `<KpiPanel>` component renders before/after/delta for each metric
- [ ] Delta column shows green (improvement) or red (reduction) with % change
- [ ] Panels load with animated counters
- [ ] At least Scenarios 1, 3, and 4 panels are demo-ready

**Files to Create/Modify:**
- `apps/web/src/components/demo/kpi-panel.tsx` (NEW)
- Protocol analytics pages to include KPI panels

---

### Story 55.8: Settlement Timeline Visualization

**Points:** 8
**Priority:** P1

**Description:**
Build a visual settlement timeline component showing the payment lifecycle (created -> processing -> settled). Referenced in every demo scenario.

**Implementation:**
- Vertical timeline component with status dots and timestamps
- Supports single-vendor and multi-vendor (parallel tracks) layouts
- States: created, policy_check, approved, processing, settled, failed
- Shows elapsed time between steps
- Used on Transfer Detail and Checkout Detail pages

**Acceptance Criteria:**
- [ ] Timeline renders on transfer detail page with real status progression
- [ ] Multi-vendor parallel timeline works for travel scenario (6 vendors)
- [ ] Each step shows timestamp and elapsed time
- [ ] Status colors: green (complete), blue (in progress), gray (pending), red (failed)

**Files to Create/Modify:**
- `apps/web/src/components/settlement-timeline.tsx` (NEW)
- `apps/web/src/app/dashboard/transfers/[id]/page.tsx`

---

### Story 55.9: Policy Check Visualization

**Points:** 8
**Priority:** P1

**Description:**
Build a policy evaluation panel showing rule-by-rule check results. Referenced in Scenarios 1, 2, 4, 5.

**Implementation:**
- Policy rule list with pass/fail/warning icons per rule
- Rules: amount threshold, merchant history, budget cap, carrier preference, hotel cap, trip total
- Green checkmark (pass), amber flag (requires confirmation), red X (blocked)
- Shows which policy triggered the approval workflow

**Acceptance Criteria:**
- [ ] Policy check panel renders on mandate detail and checkout detail pages
- [ ] Shows rule name, evaluation result, and trigger action
- [ ] Amber flag rules link to the corresponding approval workflow record
- [ ] Works with demo seed data

**Files to Create/Modify:**
- `apps/web/src/components/policy-check-panel.tsx` (NEW)
- `apps/web/src/app/dashboard/agentic-payments/ap2/mandates/[id]/page.tsx`
- `apps/web/src/app/dashboard/agentic-payments/acp/checkouts/[id]/page.tsx`

---

### Story 55.10: Agent Detail Enhancement for Demos

**Points:** 5
**Priority:** P1

**Description:**
Enhance the Agent Detail page to display all the information referenced in demo scenarios: KYA tier badge, wallet balance, spending policy summary, permission matrix, and linked mandates/checkouts.

**Implementation:**
- KYA tier badge with tier name and color (Tier 0: gray, 1: blue, 2: green, 3: gold)
- Wallet balance card with spending progress bar and daily limit
- Permission matrix grid (transactions, streams, accounts, treasury)
- Recent activity feed for this specific agent
- Linked mandates (AP2) and checkouts (ACP) tabs

**Acceptance Criteria:**
- [ ] Agent detail shows KYA tier badge prominently
- [ ] Wallet section shows balance and spending policy
- [ ] Permission matrix is visible
- [ ] Linked mandates/checkouts shown in tabs
- [ ] Works with demo seed data

**Files to Modify:**
- `apps/web/src/app/dashboard/agents/[id]/page.tsx`

---

### Story 55.11: Demo Flow Navigation Helpers

**Points:** 5
**Priority:** P2

**Description:**
Add navigation helpers that make it easy to walk through each demo scenario during a live presentation. A "Demo Mode" toggle that shows scenario context and next-step hints.

**Implementation:**
- "Demo Mode" toggle in dashboard header (visible only in sandbox)
- When active, shows a scenario selector (1-8)
- Each scenario shows a step-by-step sidebar with clickable links to the relevant screens
- Current step highlighted based on current route
- Quick "Reset Demo Data" button

**Acceptance Criteria:**
- [ ] Demo Mode toggle visible in sandbox mode
- [ ] Scenario selector shows all 8 scenarios with names
- [ ] Step sidebar navigates to correct screens
- [ ] Current step auto-highlights

**Files to Create/Modify:**
- `apps/web/src/components/demo/demo-mode-provider.tsx` (NEW)
- `apps/web/src/components/demo/scenario-sidebar.tsx` (NEW)
- `apps/web/src/app/dashboard/layout.tsx`

---

### Story 55.12: End-to-End Demo Walkthrough Testing

**Points:** 10
**Priority:** P2

**Description:**
Validate each of the 8 demo scenarios can be walked through end-to-end on the seeded dashboard. Document any remaining gaps and polish issues.

**Validation Checklist per Scenario:**
1. Can navigate to every screen referenced in the scenario
2. Screens show relevant data (not empty states)
3. Detail pages load with correct linked data
4. Analytics show meaningful charts/numbers
5. KPI panels (if built) render correctly

**Acceptance Criteria:**
- [ ] All 4 Tier A scenarios (1-4) pass walkthrough
- [ ] At least 2 Tier B scenarios (5-8) pass walkthrough
- [ ] No broken links or error states during walkthrough
- [ ] Document remaining polish items as follow-up issues

**Deliverable:**
- Demo walkthrough checklist in `docs/demo-walkthrough-checklist.md`

---

## Story Dependency Graph

```
55.5 (Core Entities) ──┐
                       ├── 55.6 (Runner) ──── 55.12 (E2E Testing)
55.1 (x402 Data) ──────┤
55.2 (ACP Data) ───────┤
55.3 (AP2 Data) ───────┤
55.4 (UCP Data) ───────┘

55.7 (KPI Panels) ─────┐
55.8 (Timeline) ───────┼── 55.12 (E2E Testing)
55.9 (Policy Check) ───┤
55.10 (Agent Detail) ──┤
55.11 (Demo Nav) ──────┘
```

---

## Priority Summary

| Priority | Stories | Points | Description |
|----------|---------|--------|-------------|
| P0 | 55.1-55.6 | 40 | Seed data -- makes every screen come alive |
| P1 | 55.7-55.10 | 34 | UI components -- scenario-specific visualizations |
| P2 | 55.11-55.12 | 15 | Polish -- demo flow helpers and validation |
| **Total** | **12** | **89** | |

---

## Technical Notes

- All seed data must belong to the "Demo Organization" tenant (existing from current seed script)
- Seed script should be idempotent and not interfere with existing tenants
- KPI panels use hardcoded values for demo (matching the scenario doc exactly)
- Settlement timeline component can later be backed by real API data
- Demo Mode is sandbox-only and should have zero impact on production builds
- Protocol analytics should aggregate seed data correctly across the time range selectors (24h/7d/30d)

---

*Created: February 6, 2026*
