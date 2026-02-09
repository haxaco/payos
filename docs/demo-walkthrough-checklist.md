# Demo Walkthrough Checklist (Story 55.12)

E2E validation that all 8 seeded scenarios render correctly across the Sly dashboard.

## Prerequisites

- [ ] `pnpm --filter @sly/api seed:demo -- --reset` ran successfully
- [ ] `pnpm --filter @sly/web build` completed with zero errors
- [ ] `pnpm dev` running (API on :4000, Web on :3000)
- [ ] Logged in to dashboard in sandbox mode

---

## Demo Mode UI (Story 55.11)

- [ ] "Demo" button visible in header (sandbox mode only)
- [ ] Clicking "Demo" activates demo mode (purple highlight)
- [ ] Scenario selector dropdown shows 8 scenarios in Tier A / Tier B groups
- [ ] Selecting a scenario navigates to step 1 and shows floating panel
- [ ] Floating panel shows step list with current step highlighted
- [ ] Clicking steps in panel navigates to correct pages
- [ ] Main sidebar remains accessible during demo mode
- [ ] "Exit Demo" dismisses panel and resets state
- [ ] Refresh page — demo mode persists (localStorage)
- [ ] Switch to production mode — "Demo" button hidden

---

## Scenario 1: Shopping Agent (ACP + UCP)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | KPI panels show non-zero values | [ ] |
| 2 | `/dashboard/agents` | AI Shopping Agent listed | [ ] |
| 3 | Agent Detail | KYA Tier 2, $550.99 volume, 3 transactions | [ ] |
| 4 | `/dashboard/agentic-payments/acp/checkouts` | Tissot watch + Nike shoes + headphones checkouts | [ ] |
| 5 | Checkout Detail | Tissot PRX — $325.16 total, line items, completed | [ ] |
| 6 | `/dashboard/settlements` | Pix settlement — $375, completed | [ ] |

---

## Scenario 2: Travel Itinerary (ACP + UCP)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | Activity feed shows travel bookings | [ ] |
| 2 | `/dashboard/agents` | Hopper Travel Agent listed | [ ] |
| 3 | Agent Detail | KYA Tier 2, $3,220 volume | [ ] |
| 4 | `/dashboard/agentic-payments/acp/checkouts` | 5 Barcelona vendor checkouts | [ ] |
| 5 | Checkout Detail | Multi-vendor: flight, hotel, restaurants, wine, museum | [ ] |
| 6 | `/dashboard/settlements` | SPEI settlement — $3,220 | [ ] |

---

## Scenario 3: Pay-Per-Inference (x402)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | KPIs reflect x402 revenue | [ ] |
| 2 | `/dashboard/agentic-payments/x402/endpoints` | 8 endpoints listed (3 inference + 3 media + 2 other) | [ ] |
| 3 | Endpoint Detail | GPT-4o: $0.003/call, 282K calls, volume discounts | [ ] |
| 4 | `/dashboard/transfers` | Micropayment transfers visible | [ ] |

---

## Scenario 4: Corporate Travel (AP2 + ACP + UCP)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | KPIs show corporate activity | [ ] |
| 2 | `/dashboard/agents` | Acme Corporate Travel Agent listed | [ ] |
| 3 | Agent Detail | KYA Tier 3, $1,850 volume | [ ] |
| 4 | `/dashboard/agentic-payments/ap2/mandates` | Intent → Cart → Payment chain | [ ] |
| 5 | Mandate Detail | São Paulo trip — $1,850 authorized, 2 executions | [ ] |
| 6 | `/dashboard/agentic-payments/acp/checkouts` | Corporate flight + hotel checkouts | [ ] |
| 7 | `/dashboard/settlements` | Pix settlement — processing | [ ] |

---

## Scenario 5: Bill Pay (AP2)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | KPIs | [ ] |
| 2 | `/dashboard/agents` | Smart Bill Pay Agent listed | [ ] |
| 3 | Agent Detail | KYA Tier 1, $3,075 volume, 4 transactions | [ ] |
| 4 | `/dashboard/agentic-payments/ap2/mandates` | 4 recurring mandates (rent, electric, internet, Netflix) | [ ] |
| 5 | Mandate Detail | Rent — P0 essential, $2,800, completed | [ ] |

---

## Scenario 6: Gig Payout (x402)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | KPIs | [ ] |
| 2 | `/dashboard/agentic-payments/x402/endpoints` | Endpoints listed | [ ] |
| 3 | `/dashboard/transfers` | 14 daily ride payouts (~$1,800–$2,400 each) | [ ] |

---

## Scenario 7: Remittance (AP2 + UCP)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | KPIs | [ ] |
| 2 | `/dashboard/agents` | Remittance Optimizer Agent listed | [ ] |
| 3 | Agent Detail | KYA Tier 2, $1,500 volume | [ ] |
| 4 | `/dashboard/agentic-payments/ap2/mandates` | Monthly remittance mandate | [ ] |
| 5 | Mandate Detail | US → MX corridor, 2 executions ($380 + $120) | [ ] |
| 6 | `/dashboard/settlements` | SPEI deferred settlement | [ ] |

---

## Scenario 8: Media Micropayments (x402)

| Step | Route | Check | Pass |
|------|-------|-------|------|
| 1 | `/dashboard` | KPIs | [ ] |
| 2 | `/dashboard/agentic-payments/x402/endpoints` | Article, summary, data extract APIs | [ ] |
| 3 | Endpoint Detail | Full-text article — $0.15/call, AI discount tiers | [ ] |

---

## Cross-Cutting Checks

- [ ] KPI panels render on home dashboard (Stories 55.7–55.8)
- [ ] Policy check panels render on relevant detail pages (Story 55.9)
- [ ] Agent detail shows mandates/checkouts tabs (Story 55.10)
- [ ] No broken links across all scenario routes
- [ ] No console errors during walkthrough
- [ ] Compliance flags show on compliance page (5 flags)
- [ ] Approval workflows visible on approvals page (3 records)
- [ ] Settlement rules configured (2 rules with execution history)
- [ ] Streams visible on streams page (3 streams)
- [ ] Dark mode renders correctly across all screens

---

## Build Verification

```bash
pnpm --filter @sly/web build
```

- [ ] Exit code 0
- [ ] No TypeScript errors
- [ ] No unused import warnings that break build

---

*Last updated: 2026-02-06*
*Epic: 55 | Stories: 55.11, 55.12*
