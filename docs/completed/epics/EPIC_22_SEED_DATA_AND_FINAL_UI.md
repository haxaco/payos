# Epic 22: Seed Data & Final UI Integration

**Version:** 1.0  
**Date:** December 18, 2025  
**Status:** Planned  
**Priority:** P2 (Polish & Demo Readiness)  
**Points:** 21 points

---

## Executive Summary

This epic completes the remaining UI mock data elimination and ensures all tenants have rich, realistic seed data for demos. While Epic 0 handled the main dashboard pages, several smaller pages and features still use hardcoded data.

## Goals

1. **Eliminate remaining mock data** from UI pages
2. **Ensure all tenants** have realistic, comprehensive seed data
3. **Create master seed script** for easy database population
4. **Improve demo experience** with active, recent data

## Non-Goals

1. Create production-ready seed data (this is for dev/demo only)
2. Implement missing features (e.g., webhooks backend, AI assistant backend)
3. Performance optimization of seed scripts

---

## Current Status

### ✅ Completed (Epic 0)
- Dashboard & Home Page (real data)
- Treasury Page (real data)
- Card Detail Pages (real spending limits & transactions)
- Disputes Page (real data)
- Compliance Page (real data)
- Account Detail Page - Contractors tab (real data)

### ❌ Still Using Mock Data
1. **Dashboard.tsx** - Secondary dashboard page (volumeData, transactions arrays)
2. **AccountDetailPage.tsx** - Payment Methods tab
3. **WebhooksPage.tsx** - Complete page uses mock webhooks
4. **Developer Pages** - API Keys, Templates, Tiers (lower priority)

### 🌱 Seed Data Status
- ✅ Transfers (4,334 exist)
- ✅ Accounts with balances (enhanced)
- ✅ Card transactions (61 created)
- ✅ Some compliance flags
- ✅ Account relationships (12 created)
- ✅ Disputes (4 created)
- ❌ Webhooks (no table exists)
- ❌ Active streams (exist but may not be realistic)
- ❌ Recent agent activity
- ❌ Documents/statements

---

## Epic Breakdown: Stories & Tasks

### Story 22.1: Dashboard Page Real Data Integration (3 points)

**Description:** Replace mock volumeData and transactions arrays in Dashboard.tsx with real API calls.

**Current State:**
- Dashboard.tsx has hardcoded arrays with TODO comments
- Different from HomePage (which already has real data)
- Should use same API endpoints as HomePage

**Tasks:**
- [ ] Update Dashboard.tsx to use `useDashboardSummary()` hook
- [ ] Replace `volumeData` array with real API data
- [ ] Replace `transactions` array with real transfers data
- [ ] Remove TODO comments
- [ ] Add loading and error states
- [ ] Test with multiple tenants

**Acceptance Criteria:**
- ✅ Dashboard.tsx shows real volume data
- ✅ Dashboard.tsx shows real recent transactions
- ✅ No hardcoded mock arrays remain
- ✅ Loading states display correctly
- ✅ Works across all tenants

**Estimated Time:** 2-3 hours

---

### Story 22.2: Account Payment Methods Tab Real Data (5 points)

**Description:** Connect AccountDetailPage Payment Methods tab to real API endpoint.

**Current State:**
- PaymentMethodsTab has hardcoded `paymentMethods` array
- API endpoint exists: `GET /v1/accounts/:id/payment-methods`
- Hook exists: `useAccountPaymentMethods()`

**Tasks:**
- [ ] Update PaymentMethodsTab to use `useAccountPaymentMethods()` hook
- [ ] Remove hardcoded paymentMethods array
- [ ] Implement "Set Default" functionality
- [ ] Implement "Delete" functionality (or disable with "Coming Soon")
- [ ] Add "Add Payment Method" modal (or placeholder)
- [ ] Add loading and empty states
- [ ] Test with accounts that have 0, 1, and multiple payment methods

**Acceptance Criteria:**
- ✅ Payment methods load from API
- ✅ Empty state shows when no payment methods
- ✅ Can view payment method details
- ✅ Set default/delete either work or show "Coming Soon"
- ✅ Loading states display correctly

**Estimated Time:** 4-5 hours

---

### Story 22.3: Master Seed Script Creation (5 points)

**Description:** Create a comprehensive master seed script that populates all tables with realistic data in the correct order.

**Current Scripts:**
- `seed-database.ts` (main seed)
- `seed-disputes.ts`
- `seed-relationships.ts`
- `seed-card-transactions.ts`
- `enhance-seed-data.ts`
- `seed-compliance-flags.ts`

**Tasks:**
- [ ] Create `seed-all.ts` master script
- [ ] Run scripts in dependency order:
  1. Main database (tenants, accounts, agents)
  2. Transfers & streams
  3. Payment methods
  4. Card transactions
  5. Relationships
  6. Disputes
  7. Compliance flags
  8. Enhancement (balances, recent activity)
- [ ] Add idempotency checks (can run multiple times safely)
- [ ] Add progress indicators
- [ ] Add error handling and rollback
- [ ] Update package.json with `pnpm seed:all` command
- [ ] Create README documentation

**Acceptance Criteria:**
- ✅ Single command seeds entire database
- ✅ Safe to run multiple times (idempotent)
- ✅ Clear progress output
- ✅ Handles errors gracefully
- ✅ Documentation in scripts/README.md

**Estimated Time:** 4-5 hours

---

### Story 22.4: Active Streams Seed Data (3 points)

**Description:** Ensure all tenants have realistic, active money streams with proper balances and flow rates.

**Current State:**
- 35 streams exist in database
- May not be active or realistic
- Demo Fintech has good data, other tenants don't

**Tasks:**
- [ ] Create `seed-streams.ts` script
- [ ] Generate 3-5 active streams per tenant
- [ ] Mix of inbound and outbound streams
- [ ] Realistic flow rates ($100-$5000/month)
- [ ] Properly funded balances
- [ ] Recent stream events (funded, paused, resumed)
- [ ] Update account `balance_in_streams` accordingly

**Acceptance Criteria:**
- ✅ All tenants have 3-5 active streams
- ✅ Stream balances match account balances
- ✅ Mix of inbound/outbound flows
- ✅ Recent stream activity events
- ✅ Streams page shows realistic data

**Estimated Time:** 3-4 hours

---

### Story 22.5: Agent Activity Seed Data (3 points)

**Description:** Add realistic agent activity, permissions, and recent actions to make agents look active.

**Current State:**
- 58 agents exist
- No recent agent activity tracked
- May not have realistic permissions configured

**Tasks:**
- [ ] Create `seed-agent-activity.ts` script
- [ ] Update agent permissions to be realistic
- [ ] Create agent-initiated transfers (last 7 days)
- [ ] Create agent-managed streams
- [ ] Add agent usage tracking data
- [ ] Configure KYA tiers realistically
- [ ] Add API keys for some agents

**Acceptance Criteria:**
- ✅ Agents have realistic permissions
- ✅ Some transfers show "initiated_by_type: 'agent'"
- ✅ Some streams show "managed_by_type: 'agent'"
- ✅ Agent detail pages show recent activity
- ✅ Agent usage stats are populated

**Estimated Time:** 3-4 hours

---

### Story 22.6: Webhooks Page Backend Stub (2 points) - OPTIONAL

**Description:** Either connect WebhooksPage to real backend or document as "Coming Soon".

**Current State:**
- WebhooksPage uses `mockWebhooks` from mock data file
- No webhooks table exists in database
- No webhooks API endpoint exists

**Options:**

**Option A: Quick Stub (Recommended)**
- Add banner: "Webhooks coming in Epic 10"
- Keep mock data for visual demo
- Document in UI_MOCK_DATA_ISSUES.md

**Option B: Full Implementation (Epic 10)**
- Create webhooks table
- Create webhooks API endpoints
- Connect UI to real API
- Implement webhook delivery system

**Tasks (Option A):**
- [ ] Add "Coming Soon" banner to WebhooksPage
- [ ] Update mock data to be more realistic
- [ ] Document in Epic 10 scope

**Acceptance Criteria (Option A):**
- ✅ Users know webhooks are not functional yet
- ✅ Visual demo still looks good
- ✅ Documented for future implementation

**Estimated Time:** 1-2 hours

---

## Summary Table

| Story | Description | Points | Priority | Time |
|-------|-------------|--------|----------|------|
| 22.1 | Dashboard Page Real Data | 3 | P2 | 2-3h |
| 22.2 | Account Payment Methods Tab | 5 | P2 | 4-5h |
| 22.3 | Master Seed Script | 5 | P1 | 4-5h |
| 22.4 | Active Streams Seed Data | 3 | P2 | 3-4h |
| 22.5 | Agent Activity Seed Data | 3 | P2 | 3-4h |
| 22.6 | Webhooks Page Stub | 2 | P3 | 1-2h |
| **Total** | | **21** | | **~20h** |

---

## Implementation Order

### Phase 1: Critical UI Fixes (8 points, ~6-8 hours)
1. Story 22.1 - Dashboard Real Data
2. Story 22.2 - Payment Methods Tab

### Phase 2: Seed Infrastructure (8 points, ~7-9 hours)
3. Story 22.3 - Master Seed Script
4. Story 22.4 - Active Streams

### Phase 3: Polish (5 points, ~4-6 hours)
5. Story 22.5 - Agent Activity
6. Story 22.6 - Webhooks Stub (optional)

---

## Success Criteria

### UI Completeness
- ✅ All major UI pages use real API data
- ✅ No critical pages show "mock" or hardcoded data
- ✅ Loading and error states work correctly
- ✅ Empty states are handled gracefully

### Seed Data Quality
- ✅ All tenants have comprehensive, realistic data
- ✅ Recent activity (last 7 days) is present
- ✅ Balances are non-zero and realistic
- ✅ Relationships between entities make sense
- ✅ Single command populates entire database

### Demo Readiness
- ✅ Application looks "alive" and active
- ✅ Every page has meaningful data to show
- ✅ Can demonstrate all major features
- ✅ Multiple tenant scenarios work well

---

## Dependencies

### Requires
- Epic 0 completion (database functions, API endpoints)
- Epic 14 completion (compliance APIs)
- Existing seed scripts as foundation

### Blocks
- Epic 10 (PSP Table Stakes) - needs comprehensive seed data
- Epic 8 (AI Insights) - benefits from realistic data patterns
- Demo presentations - needs polished, realistic UI

---

## Testing Strategy

### Manual Testing
1. Log in as each tenant
2. Navigate through all major pages
3. Verify data displays correctly
4. Check for any "undefined" or "N/A" values that should have data
5. Test loading and error states

### Seed Script Testing
1. Drop and recreate database
2. Run master seed script
3. Verify all tables have data
4. Check foreign key relationships
5. Verify data makes logical sense

### Cross-Browser Testing
1. Test on Chrome, Firefox, Safari
2. Check dark mode rendering
3. Verify responsive layouts with real data

---

## Known Limitations

### Out of Scope
- Production-level seed data security
- Performance optimization of seed scripts
- Automated seed data generation
- Real external API integrations (Circle, Superfluid)

### Future Work (Other Epics)
- Webhooks backend (Epic 10)
- AI Assistant functionality (Epic 8)
- Document generation (Epic 6)
- Real PSP integration (Epic 10)
- Streaming payments (Epic 5)

---

## Documentation

### Files to Create/Update
- [ ] `apps/api/scripts/seed-all.ts` - Master seed script
- [ ] `apps/api/scripts/seed-streams.ts` - Stream seed data
- [ ] `apps/api/scripts/seed-agent-activity.ts` - Agent activity
- [ ] `apps/api/scripts/README.md` - Seed script documentation
- [ ] `docs/SEED_DATA_GUIDE.md` - Guide for using seed scripts
- [ ] Update `package.json` with new seed commands

### Documentation Requirements
- Clear instructions for running seed scripts
- Explanation of what data is created
- Troubleshooting common issues
- Reset/cleanup procedures

---

## Changelog

### Version 1.0 (December 18, 2025)
- Initial epic creation
- Defined 6 stories (21 points)
- Identified remaining mock data locations
- Planned seed data improvements
- Established success criteria


