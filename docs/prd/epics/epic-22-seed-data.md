# Epic 22: Seed Data & Final UI Integration 🌱

**Status:** ✅ COMPLETE (December 18, 2025)
**Phase:** Post-Epic 0
**Priority:** P2 (Polish & Demo Readiness)
**Total Points:** 21
**Stories:** 6/6 Complete
**Duration:** Completed in single session

[← Back to Master PRD](../PayOS_PRD_Master.md)

---

## Overview

Completes the remaining UI mock data elimination and ensures all tenants have rich, realistic seed data for demos. While Epic 0 handled main dashboard pages, several smaller pages still use hardcoded data.

---

## Business Value

- **Demo Readiness:** Application looks "alive" with realistic data
- **Testing:** Comprehensive seed data enables better testing
- **Onboarding:** New developers can quickly populate database
- **Consistency:** All tenants have similar data quality

---

## Stories

### Story 22.1: Dashboard Page Real Data (3 points) ✅ COMPLETE

**Objective:** Replace volumeData and transactions arrays in Dashboard.tsx

**Implementation:**
- Use same API endpoints as HomePage
- Add loading/error states
- Remove hardcoded mock arrays

**Acceptance Criteria:**
- ✅ Dashboard page fetches real transaction data
- ✅ Volume charts show actual data
- ✅ Loading states during fetch
- ✅ Error handling for failed requests

---

### Story 22.2: Account Payment Methods Tab (5 points) ✅ COMPLETE

**Objective:** Connect to `useAccountPaymentMethods()` hook

**Implementation:**
- Remove hardcoded payment methods array
- Connect to real API endpoint
- Implement set default functionality
- Implement delete functionality

**Acceptance Criteria:**
- ✅ Payment methods tab shows real data
- ✅ Can set default payment method
- ✅ Can delete payment methods
- ✅ Proper error handling

---

### Story 22.3: Master Seed Script (5 points) ✅ COMPLETE

**Objective:** Create `seed-all.ts` that runs all seed scripts in order

**Implementation:**
```typescript
// apps/api/scripts/seed-all.ts
async function seedAll() {
  console.log('🌱 Seeding PayOS Database...\n');

  // 1. Seed tenants
  await seedTenants();

  // 2. Seed accounts
  await seedAccounts();

  // 3. Seed agents
  await seedAgents();

  // 4. Seed wallets
  await seedWallets();

  // 5. Seed transfers
  await seedTransfers();

  // 6. Seed streams
  await seedStreams();

  console.log('\n✅ Database seeding complete!');
}
```

**Features:**
- Idempotency checks
- Progress indicators
- Error handling
- Configurable data volume

**Package.json Command:**
```json
{
  "scripts": {
    "seed:all": "tsx scripts/seed-all.ts"
  }
}
```

**Acceptance Criteria:**
- ✅ Single command populates entire database
- ✅ Idempotent (can run multiple times safely)
- ✅ Clear progress indicators
- ✅ Handles errors gracefully
- ✅ Documented in README

---

### Story 22.4: Active Streams Seed Data (3 points) ✅ COMPLETE

**Objective:** Generate 3-5 active streams per tenant

**Implementation:**
- Mix of inbound/outbound flows
- Realistic flow rates ($0.01 - $1.00 per second)
- Realistic balances
- Recent stream events (pause/resume)

**Sample Data:**
```typescript
{
  from_account_id: 'acc_customer_1',
  to_account_id: 'acc_saas_provider',
  flow_rate_per_second: '0.05',
  currency: 'USD',
  status: 'active',
  total_streamed: '432.50'
}
```

**Acceptance Criteria:**
- ✅ 3-5 active streams per tenant
- ✅ Mix of inbound/outbound
- ✅ Realistic flow rates
- ✅ Stream events populated

---

### Story 22.5: Agent Activity Seed Data (3 points) ✅ COMPLETE

**Objective:** Populate realistic agent permissions and activity

**Implementation:**
- Realistic agent permissions
- Agent-initiated transfers
- Agent-managed streams
- Usage tracking data

**Sample Data:**
```typescript
{
  name: 'Procurement Agent',
  parent_account_id: 'acc_company',
  permissions: {
    canInitiateTransfers: true,
    canManageStreams: true,
    maxTransferAmount: '5000.00',
    approvalRequired: true
  },
  usage: {
    totalTransfers: 47,
    totalVolume: '125000.00',
    lastActive: '2025-12-18T10:30:00Z'
  }
}
```

**Acceptance Criteria:**
- ✅ Realistic agent permissions
- ✅ Agent-initiated transfers in database
- ✅ Agent-managed streams
- ✅ Usage tracking populated

---

### Story 22.6: Webhooks Page Stub (2 points) - OPTIONAL ✅ COMPLETE

**Objective:** Add "Coming Soon" banner to webhooks page

**Implementation:**
- Keep mock data for visual demo
- Add banner: "Webhook delivery coming in Epic 10"
- Document for future implementation

**Acceptance Criteria:**
- ✅ "Coming Soon" banner visible
- ✅ Mock data still shows for demo purposes
- ✅ Link to Epic 10 documentation

---

## Story Summary

| Story | Points | Priority | Status |
|-------|--------|----------|--------|
| 22.1 Dashboard Page Real Data | 3 | P1 | ✅ Complete |
| 22.2 Account Payment Methods Tab | 5 | P1 | ✅ Complete |
| 22.3 Master Seed Script | 5 | P1 | ✅ Complete |
| 22.4 Active Streams Seed Data | 3 | P2 | ✅ Complete |
| 22.5 Agent Activity Seed Data | 3 | P2 | ✅ Complete |
| 22.6 Webhooks Page Stub | 2 | P2 | ✅ Complete |
| **Total** | **21** | | **6/6 Complete** |

---

## Implementation Order

### Phase 1: Critical UI Fixes ✅ COMPLETE
1. Story 22.1: Dashboard Page Real Data
2. Story 22.2: Account Payment Methods Tab

### Phase 2: Seed Infrastructure ✅ COMPLETE
3. Story 22.3: Master Seed Script
4. Story 22.4: Active Streams Seed Data

### Phase 3: Polish ✅ COMPLETE
5. Story 22.5: Agent Activity Seed Data
6. Story 22.6: Webhooks Page Stub

---

## Completion Summary

**What Was Built:**
- ✅ All major UI pages now use real API data
- ✅ Comprehensive seed script (`pnpm seed:all`)
- ✅ Rich demo data for all tenants
- ✅ Payment methods tab fully functional
- ✅ Active streams seed data
- ✅ Agent activity and permissions

**Metrics:**
- Mock data elimination: 95%+ complete
- Seed data coverage: 100% of core entities
- Setup time: < 5 minutes from empty database

**Impact:**
- Application looks "alive" with realistic data
- Demos are more convincing
- Developer onboarding faster
- Testing more comprehensive

---

## Technical Deliverables

### Scripts
- `apps/api/scripts/seed-all.ts` - Master seed script
- `apps/api/scripts/seed-streams.ts` - Stream data
- `apps/api/scripts/seed-agent-activity.ts` - Agent data

### UI Updates
- `apps/web/src/app/dashboard/page.tsx` - Real data integration
- `apps/web/src/app/dashboard/accounts/[id]/page.tsx` - Payment methods tab

### Package.json Commands
```json
{
  "scripts": {
    "seed:all": "tsx scripts/seed-all.ts",
    "seed:streams": "tsx scripts/seed-streams.ts",
    "seed:agents": "tsx scripts/seed-agent-activity.ts"
  }
}
```

---

## Success Criteria

- ✅ All major UI pages use real API data
- ✅ All tenants have comprehensive seed data
- ✅ Single command populates entire database
- ✅ Application looks "alive" and active
- ✅ No critical mock data remains

---

## Related Documentation

- **Detailed Plan:** `/docs/EPIC_22_SEED_DATA_AND_FINAL_UI.md`
- **Epic 0:** Main Dashboard Integration (prerequisite)
- **Seed Scripts:** `/apps/api/scripts/`
