# Epic 52: Dashboard Redesign (Agentic Focus)

**Status:** COMPLETE ✅
**Phase:** 4.0 (Platform Architecture)
**Priority:** P1 — User Experience
**Estimated Points:** 21
**Stories:** 5
**Dependencies:** Epic 49 (Protocol Discovery), Epic 42 (Frontend Dashboard)
**Created:** January 20, 2026

[← Back to Epic List](./README.md)

---

## Post-Merge Follow-ups in Flight (as of 2026-05-14)

This epic is complete (✅), but the dashboard continues to evolve. Working-tree changes not yet committed:

- `apps/web/src/components/dashboard/protocol-activity-feed.tsx` (+138 lines) — activity feed gains marketplace-aware filtering (overlap with Epic 86)
- `apps/web/src/components/layout/header.tsx` (+51 lines) — header updates
- `apps/web/src/app/dashboard/agents/[id]/page.tsx` — agent detail page updates (also touches Epic 88's buyer-wallet flow)
- `apps/api/src/services/analytics/dashboard.ts` — per-marketplace metrics roll-up (overlap with Epic 91)

These are follow-up enhancements that don't reopen Epic 52. They are tracked here for traceability; reviewers should expect future commits to touch these files under different epic banners.

---

## Executive Summary

Redesign the main dashboard to focus on agentic payment protocols. Replace generic widgets with protocol-specific metrics. Show real data instead of mocks.

**Why This Matters:**
- Current dashboard shows wrong data (Circle/ETH/BTC instead of protocols)
- No visibility into protocol-specific activity
- New users don't know what to do
- Existing users can't see protocol performance

**Goal:** Dashboard shows protocol activity, onboarding guidance, and real metrics.

---

## Current Problems

### 1. Protocol Distribution Widget Shows WRONG Data

**Current (Incorrect):**
```
Protocol Distribution:
- Circle (USDC): 65%
- Ethereum: 25%
- Bitcoin: 10%
```

**Should Be:**
```
Protocol Distribution:
- x402: 45% ($24.5K)
- UCP: 30% ($16.2K)
- AP2: 15% ($8.1K)
- ACP: 10% ($5.4K)
```

### 2. No Protocol-Specific Metrics

Current dashboard lacks:
- Active endpoints per protocol
- Mandates authorized amount
- Checkout conversion rate
- Agent transaction badges

### 3. No Onboarding Guidance

New users see:
- Empty data widgets
- No "what to do next"
- No setup progress

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| Dashboard API endpoints | ❌ No | - | P0 | Internal UI |
| Protocol metrics API | ❌ No | - | P0 | Dashboard only |
| Widget components | ❌ No | - | P1 | Frontend only |

**SDK Stories Required:** None (dashboard-only features)

---

## Target Dashboard Design

### For New Customers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Welcome to PayOS!                                                           │
│ Complete these steps to start accepting agentic payments                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│ │ 1. Connect      │ │ 2. Enable       │ │ 3. Create       │                │
│ │ Payment         │→│ Protocol        │→│ First           │                │
│ │ Account         │ │ (x402/UCP)      │ │ Endpoint        │                │
│ │ [Stripe ▶]      │ │ [Enable ▶]      │ │ [Create ▶]      │                │
│ │ ○ Pending       │ │ ○ Pending       │ │ ○ Pending       │                │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                             │
│ Quick Start Templates:                                                      │
│ • "API Monetization" - x402 + wallet setup                                  │
│ • "E-commerce" - UCP + payment handler                                      │
│ • "Agent Commerce" - ACP + agent registration                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### For Existing Customers

```
┌────────────────────────┬────────────────────────┬────────────────────────┐
│ x402 Protocol          │ AP2 Protocol           │ UCP Protocol           │
│ ━━━━━━━━━━━━━━━━━━━━  │ ━━━━━━━━━━━━━━━━━━━━  │ ━━━━━━━━━━━━━━━━━━━━  │
│ 12 endpoints active    │ 3 mandates active      │ 45 checkouts today     │
│ $2.4K revenue (24h)    │ $12.5K authorized      │ $8.2K volume (24h)     │
│ ↗ 23% vs yesterday     │ 2 executions today     │ ↗ 15% vs yesterday     │
└────────────────────────┴────────────────────────┴────────────────────────┘

┌──────────────────────────────────┬─────────────────────────────────────────┐
│ Protocol Activity Distribution   │ Recent Agent Transactions               │
│ ┌──────────────────────────────┐│ • Treasury Bot → $4.8K payout           │
│ │       ╭──────╮               ││ • Compliance Agent → $127 check         │
│ │     ╱   4    ╲  Active       ││ • Payroll Bot → $10K batch              │
│ │    │ Protocols │             ││ • Shopping Agent → $45 purchase         │
│ │     ╲        ╱               ││                                         │
│ │       ╰──────╯               ││ [View All Transactions →]               │
│ │ x402: 45% │ AP2: 25%         ││                                         │
│ │ UCP: 20%  │ ACP: 10%         ││                                         │
│ └──────────────────────────────┘│                                         │
└──────────────────────────────────┴─────────────────────────────────────────┘
```

---

## Stories

### Story 52.1: Protocol Distribution Widget Redesign

**Points:** 5
**Priority:** P0
**Dependencies:** Epic 49 (Protocol Discovery)

**Description:**
Replace the current incorrect protocol distribution widget with one showing actual x402/AP2/ACP/UCP distribution.

**Acceptance Criteria:**
- [ ] Show x402, AP2, ACP, UCP distribution (not Circle/ETH/BTC)
- [ ] Toggle between volume ($) and transaction count
- [ ] Real data from API (not mock)
- [ ] Time range selector (24h, 7d, 30d)
- [ ] Show percentage and absolute values
- [ ] Empty state for new users

**Widget Data Source:**
```typescript
interface ProtocolDistribution {
  protocol: 'x402' | 'ap2' | 'acp' | 'ucp';
  volume_usd: number;
  transaction_count: number;
  percentage: number;
}

// API: GET /v1/analytics/protocol-distribution?timeRange=24h
```

**Files to Modify:**
- `apps/web/src/components/agentic-payments/protocol-stats.tsx`

**Files to Create:**
- `apps/api/src/routes/analytics/protocol-distribution.ts`

---

### Story 52.2: Protocol Activity Chart

**Points:** 5
**Priority:** P1
**Dependencies:** 52.1

**Description:**
Replace the "Volume by Corridor" chart with a Protocol Activity chart showing activity over time.

**Acceptance Criteria:**
- [ ] Line/area chart showing protocol activity over time
- [ ] Filter by individual protocol or all
- [ ] Time range selector (24h, 7d, 30d)
- [ ] Show volume or transaction count
- [ ] Real data from API
- [ ] Responsive design

**Chart Configuration:**
```typescript
// Series per protocol
const series = [
  { name: 'x402', data: [...], color: '#3B82F6' },
  { name: 'AP2', data: [...], color: '#10B981' },
  { name: 'ACP', data: [...], color: '#F59E0B' },
  { name: 'UCP', data: [...], color: '#8B5CF6' }
];
```

**Files to Modify:**
- Replace `apps/web/src/components/dashboard/corridor-volume-chart.tsx`

**Files to Create:**
- `apps/web/src/components/dashboard/protocol-activity-chart.tsx`
- `apps/api/src/routes/analytics/protocol-activity.ts`

---

### Story 52.3: Protocol Quick Stats Cards

**Points:** 3
**Priority:** P1
**Dependencies:** Epic 49 (Protocol Discovery)

**Description:**
Add protocol-specific quick stat cards showing each protocol's key metric.

**Acceptance Criteria:**
- [ ] **x402 Card:** Active endpoints, 24h revenue, trend
- [ ] **AP2 Card:** Active mandates, authorized amount, executions today
- [ ] **ACP Card:** Active checkouts, 24h volume, trend
- [ ] **UCP Card:** Checkouts today, 24h volume, trend
- [ ] Only show enabled protocols
- [ ] Click to navigate to protocol detail page

**Card Layout:**
```
┌─────────────────────────────┐
│ x402 Micropayments          │
│ ────────────────────────    │
│ 12 endpoints active         │
│ $2,450 revenue (24h)        │
│ ↗ 23% vs yesterday          │
└─────────────────────────────┘
```

**Files to Create:**
- `apps/web/src/components/dashboard/protocol-quick-stats.tsx`
- `apps/api/src/routes/analytics/protocol-stats.ts`

---

### Story 52.4: Conditional Onboarding Banner

**Points:** 5
**Priority:** P0
**Dependencies:** Epic 51 (Unified Onboarding)

**Description:**
Show onboarding banner when no protocols are enabled; hide after setup is complete.

**Acceptance Criteria:**
- [ ] Show welcome banner for new users
- [ ] Show setup progress for incomplete onboarding
- [ ] Hide completely when all setup done
- [ ] "Dismiss" option (with confirmation)
- [ ] Links to onboarding flow
- [ ] Responsive design

**Banner States:**
1. **New User:** "Welcome to PayOS! Complete these steps..."
2. **In Progress:** "Continue setup - 2 of 3 steps complete"
3. **Complete:** Banner hidden, show normal dashboard

**Files to Create:**
- `apps/web/src/components/dashboard/onboarding-banner.tsx`

**Files to Modify:**
- `apps/web/src/app/dashboard/page.tsx`

---

### Story 52.5: Recent Protocol Activity Feed

**Points:** 3
**Priority:** P2
**Dependencies:** 52.1

**Description:**
Cross-protocol transaction feed showing recent activity with agent-initiated badges.

**Acceptance Criteria:**
- [ ] Show last 10 transactions across all protocols
- [ ] Protocol badge (x402/AP2/ACP/UCP)
- [ ] Agent badge for agent-initiated transactions
- [ ] Amount and timestamp
- [ ] Click to view transaction details
- [ ] Real-time updates (polling or websocket)

**Feed Item:**
```
┌──────────────────────────────────────────────────────────────────┐
│ 🤖 Treasury Bot                                     2 min ago   │
│ x402  $4,823.00 payout → Contractor Wallet                      │
└──────────────────────────────────────────────────────────────────┘
```

**Files to Create:**
- `apps/web/src/components/dashboard/protocol-activity-feed.tsx`
- `apps/api/src/routes/analytics/recent-activity.ts`

---

## Widget Changes Summary

| Current Widget | Action | New Purpose |
|---------------|--------|-------------|
| Protocol Distribution | **REPLACE** | Show x402/AP2/ACP/UCP with volume/count toggle |
| Volume by Corridor | **REPLACE** | Protocol Activity chart (by time) |
| AI Insights | **ENHANCE** | Real AI insights, not mock |
| Agent Performance | **ENHANCE** | Real agent data from API |
| Rate Limit Card | **KEEP** | Useful for developers |

### New Widgets to Add

| Widget | Purpose |
|--------|---------|
| Protocol Quick Stats | Cards showing each protocol's key metric |
| Onboarding Banner | Conditional, for new users shows setup steps |
| Protocol Activity Feed | Cross-protocol transaction feed |

---

## Story Summary

| Story | Points | Priority | Description | Dependencies |
|-------|--------|----------|-------------|--------------|
| 52.1 | 5 | P0 | Protocol distribution widget | Epic 49 |
| 52.2 | 5 | P1 | Protocol activity chart | 52.1 |
| 52.3 | 3 | P1 | Quick stats cards | Epic 49 |
| 52.4 | 5 | P0 | Onboarding banner | Epic 51 |
| 52.5 | 3 | P2 | Activity feed | 52.1 |
| **TOTAL** | **21** | | **5 stories** | |

---

## API Endpoints Required

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/analytics/protocol-distribution` | Distribution by protocol |
| `GET /v1/analytics/protocol-activity` | Activity over time |
| `GET /v1/analytics/protocol-stats` | Per-protocol key metrics |
| `GET /v1/analytics/recent-activity` | Recent transactions |

---

## Verification Plan

| Checkpoint | Verification |
|------------|--------------|
| Distribution | Shows x402/AP2/ACP/UCP (not Circle/ETH/BTC) |
| Real Data | All widgets show real data, not mock |
| Onboarding | Banner shows for new users, hides when complete |
| Charts | Protocol activity chart works with filters |
| Feed | Recent activity shows agent badges |

---

## Dependencies

**Requires:**
- Epic 49: Protocol Discovery (for protocol status)
- Epic 51: Unified Onboarding (for onboarding state)
- Epic 42: Frontend Dashboard (base dashboard)

**Enhances:**
- Epic 42: Frontend Dashboard (replaces mock widgets)

---

## Related Documentation

- [Three-Layer Architecture](../../architecture/three-layer-architecture.md)
- [Epic 42: Frontend Dashboard](./epic-42-frontend-dashboard.md)
- [Epic 51: Unified Onboarding](./epic-51-unified-onboarding.md)

---

*Created: January 20, 2026*
*Status: Planning*
