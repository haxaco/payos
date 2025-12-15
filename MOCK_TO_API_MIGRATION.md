# Mock Data to API Migration - User Stories

**Goal:** Replace all hardcoded mock data with real API calls to Supabase, and seed the database with realistic test data properly linked to tenants.

**Date Created:** 2025-12-15
**Phase 2 Completed:** 2025-12-15
**Status:** 🎯 Ready for UI Testing (Phase 2 Complete)

---

## 🎯 TESTING STATUS

### ✅ Phase 2: Core Features - COMPLETE
- **Story 12.1**: Database Seeding ✅
- **Story 12.2**: API Data Fetching Hooks ✅
- **Story 12.3**: Accounts - Migrate to Real API ✅
- **Story 12.4**: Transactions/Transfers - Migrate to Real API ✅
- **Story 12.5**: Cards/Payment Methods - Migrate to Real API ✅

### 📝 Ready for Gemini Testing
**All core pages now use real API data!** See `payos-ui/UI_TESTING_GUIDE.md` for comprehensive test flows:
- Flow 36: Accounts Page Testing
- Flow 37: Account Detail Page Testing
- Flow 38: Transactions Page Testing
- Flow 39: Transaction Detail Page Testing
- Flow 40: Cards Page Testing
- Flow 41: Card Detail Page Testing
- Flow 42-45: Error, Loading, Empty States, End-to-End Testing

**Test URLs:**
- UI Dashboard: http://localhost:3001
- API Server: http://localhost:4000

**Test Data Available:**
- 7 Accounts (Acme Corporation tenant)
- 5 Transfers
- 4 Payment Methods
- 3 Agents
- 2 Streams

---

## 📊 Migration Overview

### Current State:
- 8 mock data files with hardcoded data
- 10+ pages using mock data instead of API calls
- No tenant-specific test data in database

### Target State:
- All pages fetch data from Supabase via API
- Database seeded with realistic test data
- All data properly isolated by tenant_id
- Mock data files kept only for Storybook/testing

---

## Epic 12: Mock Data Migration to Real API

### Story 12.1: Database Seeding Infrastructure ✅ **COMPLETE**

**Priority:** P0 - Foundation
**Effort:** 2 hours
**Dependencies:** None
**Status:** ✅ Completed 2025-12-15

**Description:**
Create a database seeding script that populates Supabase with realistic test data from our current mock data files, properly linked to tenants.

**Acceptance Criteria:**
- [x] Seeding script can be run multiple times (idempotent)
- [x] Creates 2-3 test tenants (organizations)
- [x] Seeds all core tables with tenant-specific data
- [x] Data relationships are maintained (foreign keys)
- [x] Script can be run via npm command: `pnpm seed:db`

**Implementation Tasks:**
1. Create `/apps/api/scripts/seed-database.ts`
2. Use Supabase service role key for admin access
3. Check if seed data already exists before inserting
4. Create test tenants:
   - `tenant_test_001`: "Acme Corporation" (business)
   - `tenant_test_002`: "TechCorp Inc" (business)
   - `tenant_demo_001`: "Demo Organization" (for demos)
5. Seed data for each tenant from mock files:
   - Accounts (person & business)
   - Transfers (transactions)
   - Payment Methods (cards)
   - Agents
   - Streams
   - Documents
6. Create admin users for each tenant
7. Generate API keys for each tenant
8. Add script to package.json

**Seed Data Mapping:**
```typescript
// Tenant 1: Acme Corporation
- 5 person accounts (Maria Garcia, Carlos Martinez, etc.)
- 2 business accounts (suppliers)
- 15 transfers (various statuses)
- 4 payment methods (2 cards, 2 bank accounts)
- 3 agents (payment, treasury, compliance)
- 2 active streams

// Tenant 2: TechCorp Inc
- 3 person accounts (contractors)
- 1 business account
- 10 transfers
- 2 payment methods
- 2 agents
- 1 active stream
```

**Testing:**
- Run script against local Supabase
- Verify data appears in Supabase dashboard
- Verify tenant isolation (can't see other tenant's data)
- Run script twice to verify idempotency

---

### Story 12.2: API Data Fetching Hooks ✅ **COMPLETE**

**Priority:** P0 - Foundation
**Effort:** 3 hours
**Dependencies:** Story 12.1
**Status:** ✅ Completed 2025-12-15

**Description:**
Create reusable React hooks for fetching data from the API with proper loading states, error handling, and caching.

**Acceptance Criteria:**
- [x] Create `useAccounts()` hook
- [x] Create `useTransfers()` hook
- [x] Create `usePaymentMethods()` hook
- [x] Create `useAgents()` hook
- [x] Create `useStreams()` hook
- [x] All hooks handle loading, error, and success states
- [x] Hooks use the authenticated user's access token
- [x] Support pagination where applicable
- [x] Support filters/query params

**Implementation Tasks:**
1. Create `/payos-ui/src/hooks/api/` directory
2. Create base `useApi.ts` hook with common logic
3. Implement individual hooks:

```typescript
// /payos-ui/src/hooks/api/useAccounts.ts
export function useAccounts(filters?: AccountFilters) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch logic with useEffect
  // Return { data, loading, error, refetch }
}

// Similar for other resources
```

4. Handle authentication errors (redirect to login if 401)
5. Add TypeScript types for all API responses
6. Include retry logic for failed requests
7. Add request deduplication

**Testing:**
- Hook returns loading state initially
- Hook returns data after successful fetch
- Hook returns error on API failure
- Hook refetches when dependencies change

---

### Story 12.3: Accounts - Migrate to Real API ✅ **COMPLETE**

**Priority:** P0 - High Impact
**Effort:** 4 hours
**Dependencies:** Stories 12.1, 12.2
**Status:** ✅ Completed 2025-12-15

**Description:**
Replace `mockAccounts.ts` usage in AccountsPage and AccountDetailPage with real API calls to `GET /v1/accounts`.

**Acceptance Criteria:**
- [x] AccountsPage fetches accounts from API
- [x] AccountDetailPage fetches single account from API  
- [x] Loading states display while fetching
- [x] Empty states show when no accounts exist
- [x] Error states show on API failure
- [x] Filters work correctly (person/business tabs)
- [x] Can navigate between list and detail using real IDs
- [x] Account balances are accurate from API

**Files to Update:**
- `/payos-ui/src/pages/AccountsPage.tsx`
- `/payos-ui/src/pages/AccountDetailPage.tsx`
- Remove import of `mockAccounts.ts`

**Implementation:**
```typescript
// AccountsPage.tsx
export function AccountsPage() {
  const { data: accounts, loading, error } = useAccounts();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!accounts?.length) return <EmptyState />;
  
  return (
    // Render accounts table
  );
}
```

**Testing:**
- [ ] View accounts list - shows seeded accounts
- [ ] Filter by person/business - works correctly
- [ ] Click account - opens detail page with correct data
- [ ] Account detail shows correct balance
- [ ] Account detail shows real transaction history
- [ ] Test with empty database - shows empty state
- [ ] Test with API down - shows error state

---

### Story 12.4: Transactions/Transfers - Migrate to Real API ✅ **COMPLETE**

**Priority:** P0 - High Impact
**Effort:** 4 hours
**Dependencies:** Stories 12.1, 12.2
**Status:** ✅ Completed 2025-12-15

**Description:**
Replace `mockTransactions.ts` usage in TransactionsPage and TransactionDetailPage with real API calls to `GET /v1/transfers`.

**Acceptance Criteria:**
- [x] TransactionsPage fetches transfers from API
- [x] TransactionDetailPage fetches single transfer from API
- [x] Loading/error/empty states handled
- [x] Status badges work (completed, pending, processing, failed, cancelled)
- [x] Type display works (cross_border, internal, etc.)
- [x] Can navigate using real transfer IDs
- [x] AI insights show real data counts

**Files to Update:**
- `/payos-ui/src/pages/TransactionsPage.tsx`
- `/payos-ui/src/pages/TransactionDetailPage.tsx`
- Delete `/payos-ui/src/data/mockTransactions.ts`

**API Mapping:**
- UI "Transactions" → API "Transfers"
- UI calls `/v1/transfers` with filters
- Transfer detail includes full sender/recipient info

**Testing:**
- [ ] View all transfers - shows seeded data
- [ ] Filter by status - works correctly
- [ ] Filter by type - works correctly
- [ ] Click transfer - opens detail with correct data
- [ ] Transfer detail shows AI analysis (if flagged)
- [ ] Export CSV works with current filters
- [ ] Pagination works with 50+ transfers

---

### Story 12.5: Cards/Payment Methods - Migrate to Real API ✅ **COMPLETE**

**Priority:** P0 - High Impact
**Effort:** 4 hours
**Dependencies:** Stories 12.1, 12.2
**Status:** ✅ Completed 2025-12-15

**Description:**
Replace `mockCards.ts` usage in CardsPage and CardDetailPage with real API calls to `GET /v1/payment-methods?type=card`.

**Acceptance Criteria:**
- [x] CardsPage fetches payment methods filtered by type=card
- [x] CardDetailPage fetches single payment method from API
- [x] Loading/error/empty states handled
- [x] Payment method status (verified/unverified) displayed correctly
- [x] Default payment method badge shown
- [x] Navigate using real payment method IDs
- [x] Security: Full PAN not exposed (only last 4 digits)

**Files to Update:**
- `/payos-ui/src/pages/CardsPage.tsx`
- `/payos-ui/src/pages/CardDetailPage.tsx`
- Delete `/payos-ui/src/data/mockCards.ts`

**API Mapping:**
- UI "Cards" → API "Payment Methods" (type='card')
- Use `GET /v1/payment-methods?type=card`
- Card transactions via `GET /v1/transfers?payment_method_id=xxx`

**Security Note:**
- PAN (card number) should be masked by default
- CVV should never be returned by API
- Require additional auth to reveal full PAN

**Testing:**
- [ ] View all cards - shows seeded cards
- [ ] Filter by status - works correctly
- [ ] Click card - opens detail with masked PAN
- [ ] Card spending limits display correctly
- [ ] Card transactions list is accurate
- [ ] Freeze card action works
- [ ] Test with no cards - shows empty state

---

### Story 12.6: Agents - Migrate to Real API

**Priority:** P1 - Medium Impact
**Effort:** 3 hours
**Dependencies:** Stories 12.1, 12.2

**Description:**
Replace `mockAgents.ts` usage in AgentsPage and AgentDetailPage with real API calls to `GET /v1/agents`.

**Acceptance Criteria:**
- [ ] AgentsPage fetches agents from API
- [ ] AgentDetailPage fetches single agent from API
- [ ] Agent types filter works (payment, treasury, compliance)
- [ ] Agent status displayed correctly (active, paused, disabled)
- [ ] KYA tier and verification status shown
- [ ] Agent activity/stats pulled from real data
- [ ] Agent limits based on parent account tier
- [ ] Navigate using real agent IDs

**Files to Update:**
- `/payos-ui/src/pages/AgentsPage.tsx`
- `/payos-ui/src/pages/AgentDetailPage.tsx`
- `/payos-ui/src/components/AgentsTab.tsx`
- Delete `/payos-ui/src/data/mockAgents.ts`

**Testing:**
- [ ] View all agents - shows seeded agents
- [ ] Filter by type - works correctly
- [ ] Filter by status - works correctly
- [ ] Click agent - opens detail with correct data
- [ ] Agent belongs to correct parent account
- [ ] Agent limits respect parent account tier
- [ ] Test account detail page agents tab

---

### Story 12.7: Streams - Migrate to Real API

**Priority:** P1 - Medium Impact
**Effort:** 3 hours
**Dependencies:** Stories 12.1, 12.2

**Description:**
Replace `mockStreams.ts` usage in AccountDetailPage streams tab with real API calls to `GET /v1/streams`.

**Acceptance Criteria:**
- [ ] Streams tab fetches streams for specific account
- [ ] Active streams displayed prominently
- [ ] Stream health status calculated from balance
- [ ] Stream events/history pulled from API
- [ ] Top-up actions work with real data
- [ ] Pause/resume stream actions work
- [ ] Navigate to stream detail using real IDs

**Files to Update:**
- `/payos-ui/src/pages/AccountDetailPage.tsx` (streams tab)
- Delete `/payos-ui/src/data/mockStreams.ts`

**API Calls:**
```typescript
GET /v1/streams?account_id={accountId}
GET /v1/streams/{streamId}
GET /v1/streams/{streamId}/events
POST /v1/streams/{streamId}/pause
POST /v1/streams/{streamId}/resume
```

**Testing:**
- [ ] View account with streams - shows correctly
- [ ] Stream health indicator accurate
- [ ] Stream events history displays
- [ ] Top-up button navigates correctly
- [ ] Pause stream works
- [ ] Resume stream works
- [ ] Test account with no streams - shows empty state

---

### Story 12.8: Payment Methods Tab - Verify Integration

**Priority:** P2 - Already Done
**Effort:** 1 hour
**Dependencies:** Story 12.5

**Description:**
Verify that the Payment Methods tab in AccountDetailPage is correctly using the real API and update any remaining mock references.

**Acceptance Criteria:**
- [ ] Payment methods tab uses `GET /v1/accounts/:id/payment-methods`
- [ ] Add payment method modal works
- [ ] Set default payment method works
- [ ] Remove payment method works
- [ ] Verification status displayed correctly
- [ ] No mock data imports

**Files to Check:**
- `/payos-ui/src/components/PaymentMethodsTab.tsx`

**Testing:**
- [ ] Tab loads payment methods for account
- [ ] Add new payment method works
- [ ] Set as default works
- [ ] Remove payment method works
- [ ] All data persists correctly

---

### Story 12.9: HomePage - Real-Time Stats

**Priority:** P2 - Low Impact
**Effort:** 2 hours
**Dependencies:** Stories 12.3, 12.4

**Description:**
Update HomePage dashboard widgets to show real-time statistics calculated from actual database data.

**Acceptance Criteria:**
- [ ] Total accounts stat from `GET /v1/accounts` count
- [ ] Total transfers stat from `GET /v1/transfers` count
- [ ] Active streams stat from `GET /v1/streams?status=active` count
- [ ] Total volume calculated from actual transfers
- [ ] Recent activity shows real recent transfers
- [ ] Quick actions work with real data
- [ ] Date range filters work correctly

**Files to Update:**
- `/payos-ui/src/pages/HomePage.tsx`

**API Calls:**
```typescript
GET /v1/accounts?limit=1 // Get total count from pagination
GET /v1/transfers?limit=1 // Get total count
GET /v1/transfers?status=completed&from_date=2025-12-01 // Volume calculation
GET /v1/transfers?limit=5&sort=created_at:desc // Recent activity
```

**Testing:**
- [ ] Stats reflect actual database counts
- [ ] Volume calculation is accurate
- [ ] Recent activity shows latest transfers
- [ ] Date range filter updates all stats
- [ ] Real-time updates if data changes

---

### Story 12.10: Reports - Real Data Export

**Priority:** P2 - Medium Impact
**Effort:** 2 hours
**Dependencies:** Story 12.4

**Description:**
Update ReportsPage to generate exports from real API data instead of mock data.

**Acceptance Criteria:**
- [ ] Summary reports use `GET /v1/reports/summary` API
- [ ] Date range filters work correctly
- [ ] Export formats work (CSV, JSON)
- [ ] Reports include all required fields
- [ ] Large datasets handled (pagination/streaming)
- [ ] Reports filtered by current tenant only

**Files to Update:**
- `/payos-ui/src/pages/ReportsPage.tsx`

**API Calls:**
```typescript
GET /v1/reports/summary?period=day&date=2025-12-15
GET /v1/reports/summary?period=custom&start_date=2025-12-01&end_date=2025-12-15
```

**Testing:**
- [ ] Daily report shows correct data
- [ ] Weekly report aggregates correctly
- [ ] Monthly report aggregates correctly
- [ ] Custom date range works
- [ ] Export to CSV works
- [ ] Export to JSON works
- [ ] Large date ranges don't timeout

---

### Story 12.11: Compliance (Future) - API Implementation

**Priority:** P3 - Future
**Effort:** 8 hours
**Dependencies:** None (new feature)

**Description:**
Implement compliance flags API and database table, then migrate CompliancePage to use real data.

**Acceptance Criteria:**
- [ ] Create `compliance_flags` database table
- [ ] Create API endpoints for compliance flags
- [ ] Implement flag creation logic (automatic & manual)
- [ ] Create compliance rules engine
- [ ] Update CompliancePage to use API
- [ ] Update ComplianceFlagDetailPage to use API

**Implementation:**
1. Database schema design
2. API route implementation
3. Flag creation on transfer events
4. UI integration
5. Testing

**Note:** This is a new feature, not just a migration. Requires full implementation.

---

### Story 12.12: Developer Tools - Keep Mock Data

**Priority:** P3 - Low Impact
**Effort:** 1 hour
**Dependencies:** None

**Description:**
Developer tools (API Keys, Webhooks, Request Logs) will eventually use real API, but for now document that they use mock data.

**Acceptance Criteria:**
- [ ] Document that these use mock data
- [ ] Create TODO for future API implementation
- [ ] Ensure mock data is clear and realistic
- [ ] Add "Demo Mode" indicator

**Files:**
- `/payos-ui/src/data/mockDeveloper.ts`
- `/payos-ui/src/pages/APIKeysPage.tsx` (old, replaced by Settings)
- `/payos-ui/src/pages/WebhooksPage.tsx`
- `/payos-ui/src/pages/RequestLogsPage.tsx`

**Note:** API Keys page is now replaced by Settings > API Keys which uses real API.

---

### Story 12.13: Cleanup - Remove Unused Mock Files

**Priority:** P3 - Cleanup
**Effort:** 1 hour
**Dependencies:** Stories 12.3-12.10 complete

**Description:**
Remove or archive mock data files that are no longer used anywhere in the application.

**Acceptance Criteria:**
- [ ] Delete or move to `/archived/` directory
- [ ] Update all imports
- [ ] Verify no broken imports
- [ ] Keep mock data for Storybook/testing if needed
- [ ] Update documentation

**Files to Remove:**
- `mockAccounts.ts` (after Story 12.3)
- `mockTransactions.ts` (after Story 12.4)
- `mockCards.ts` (after Story 12.5)
- `mockAgents.ts` (after Story 12.6)
- `mockStreams.ts` (after Story 12.7)

**Files to Keep:**
- `aiResponses.ts` (for AI mock responses)
- `mockDeveloper.ts` (for developer tools)
- `mockFlags.ts` (until Story 12.11)

---

## 📋 Implementation Order

### Phase 1: Foundation (Start Here)
1. ✅ Story 12.1: Database Seeding Infrastructure
2. ✅ Story 12.2: API Data Fetching Hooks

### Phase 2: Core Features (High Impact)
3. Story 12.3: Accounts Migration
4. Story 12.4: Transactions/Transfers Migration
5. Story 12.5: Cards/Payment Methods Migration

### Phase 3: Secondary Features
6. Story 12.6: Agents Migration
7. Story 12.7: Streams Migration
8. Story 12.9: HomePage Real-Time Stats
9. Story 12.10: Reports Real Data Export

### Phase 4: Verification & Cleanup
10. Story 12.8: Payment Methods Tab Verification
11. Story 12.13: Cleanup Unused Mock Files

### Phase 5: Future (As Needed)
12. Story 12.11: Compliance API Implementation
13. Story 12.12: Developer Tools Documentation

---

## 🧪 Testing Strategy

### For Each Migration Story:
1. **Before Migration:**
   - Document current behavior with mock data
   - Take screenshots of UI

2. **During Migration:**
   - Test with empty database
   - Test with seeded data
   - Test loading states
   - Test error states

3. **After Migration:**
   - Verify UI looks identical
   - Verify functionality works
   - Verify performance is acceptable
   - Compare screenshots

### Integration Testing:
- Test cross-page navigation
- Test data consistency
- Test tenant isolation
- Test concurrent user scenarios

---

## 📊 Success Metrics

- [ ] 0 mock data imports in production pages
- [ ] All pages load data from API
- [ ] Database has realistic test data
- [ ] No performance regressions
- [ ] All tests passing
- [ ] UI looks and behaves identically

---

## 🚀 Ready to Start?

**Recommended Starting Point:** Story 12.1 (Database Seeding)

This creates the foundation for all other stories by ensuring we have realistic test data in the database.

Would you like me to implement Story 12.1 first?

