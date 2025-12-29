# Next Session: Complete Stories 14.2 & 14.3

**Priority:** P1 - Mock Data Elimination  
**Points:** 10 total (5 + 5)  
**Estimated Time:** ~10 hours  
**Goal:** Achieve 100% real data in PayOS UI (eliminate all remaining mock data)

---

## Context: What Was Done Today

### ✅ Completed in This Session
1. **Story 11.12: Session Security** - Epic 11 now 100% complete (12/12 stories)
   - Backend: Refresh token rotation, session management, anomaly detection
   - Frontend: Automatic token refresh, 401 retry logic
   - Files: Migration, session service, API endpoints, React hooks updated
   
2. **Documentation Organization**
   - Merged x402 PRD extension into main PRD
   - Organized all docs in `docs/` folder with clear structure
   - Created `docs/README.md` with standards
   - Removed duplicates and misplaced files

3. **Stories 14.2 & 14.3 Preparation**
   - Updated `payos-ui/src/hooks/api/useDisputes.ts` with complete hooks
   - Created implementation plan in `docs/completed/STORIES_14.2_14.3_IMPLEMENTATION_PLAN.md`
   - Verified disputes API is fully implemented
   - Identified all files that need changes

---

## What Needs to Be Done Next

### Story 14.2: Disputes API Integration (5 points)

**Status:** API ✅ Complete | UI 🔄 Uses Mock Data

#### Tasks Remaining

1. **Update DisputesPage.tsx** 
   - File: `payos-ui/src/pages/DisputesPage.tsx`
   - Replace mock data (lines 12-125) with real API calls
   - Use `useDisputes()` and `useDisputeStats()` hooks (already created)
   - Add loading and error states
   - Enable navigation to accounts/transactions

2. **Seed Sample Disputes**
   - Create: `apps/api/scripts/seed-disputes.ts`
   - Link to real transfers in database
   - Run seed script to populate data

3. **Test & Verify**
   - Disputes page loads real data
   - Filtering works
   - Navigation to related entities works
   - No mock data remains

---

### Story 14.3: Account Relationships API (5 points)

**Status:** Not Started - Full Implementation Needed

#### Tasks Remaining

1. **Create Database Migration**
   - File: `apps/api/supabase/migrations/20251217_create_account_relationships.sql`
   - Schema provided in implementation plan
   - Includes RLS policies

2. **Create API Routes**
   - File: `apps/api/src/routes/relationships.ts` (new)
   - Endpoints:
     - GET `/v1/accounts/:id/related-accounts`
     - GET `/v1/accounts/:id/contractors`
     - GET `/v1/accounts/:id/employers`
     - POST `/v1/accounts/:id/relationships`
     - DELETE `/v1/accounts/:id/relationships/:relatedId`

3. **Register Routes**
   - File: `apps/api/src/app.ts`
   - Add: `app.route('/v1/accounts', relationships)`

4. **Create React Query Hooks**
   - File: `payos-ui/src/hooks/api/useRelationships.ts` (new)
   - Hooks: `useAccountRelationships`, `useAccountContractors`

5. **Update AccountDetailPage**
   - File: `payos-ui/src/pages/AccountDetailPage.tsx`
   - Replace mock contractors with real API calls
   - Use new hooks

6. **Seed Relationships**
   - Create: `apps/api/scripts/seed-relationships.ts`
   - Link existing accounts with relationships

7. **Test & Verify**
   - Account detail shows real contractors
   - Can create/delete relationships
   - Navigation works
   - No mock data remains

---

## Key Files Reference

### Already Modified (Today)
- ✅ `payos-ui/src/hooks/api/useDisputes.ts` - Hooks complete
- ✅ `apps/api/src/services/sessions.ts` - Session service
- ✅ `apps/api/src/routes/auth.ts` - Auth endpoints
- ✅ `payos-ui/src/hooks/useAuth.tsx` - Auto-refresh
- ✅ `docs/prd/PayOS_PRD_Development.md` - Merged, updated

### Need to Modify (Next Session)
- 🔄 `payos-ui/src/pages/DisputesPage.tsx` - Remove mock, add API (Story 14.2)
- 🔄 `payos-ui/src/pages/AccountDetailPage.tsx` - Remove mock, add API (Story 14.3)
- 🔄 `apps/api/src/app.ts` - Register relationships routes (Story 14.3)

### Need to Create (Next Session)
- ⭐ `apps/api/supabase/migrations/20251217_create_account_relationships.sql` (14.3)
- ⭐ `apps/api/src/routes/relationships.ts` (14.3)
- ⭐ `payos-ui/src/hooks/api/useRelationships.ts` (14.3)
- ⭐ `apps/api/scripts/seed-disputes.ts` (14.2)
- ⭐ `apps/api/scripts/seed-relationships.ts` (14.3)

---

## Implementation Strategy

### Recommended Order

**Phase 1: Story 14.2 (Simpler - API exists)**
1. Update DisputesPage to use real API (30 min)
2. Seed sample disputes (15 min)
3. Test and verify (15 min)
4. **Checkpoint:** Disputes using real data ✅

**Phase 2: Story 14.3 (More complex - Full stack)**
1. Create account_relationships migration (20 min)
2. Create relationships API routes (45 min)
3. Create React hooks (20 min)
4. Update AccountDetailPage (20 min)
5. Seed relationships (15 min)
6. Test and verify (20 min)
7. **Checkpoint:** Accounts using real data ✅

**Total:** ~3 hours of focused implementation

---

## Detailed Implementation Plan

See: `docs/completed/STORIES_14.2_14.3_IMPLEMENTATION_PLAN.md`

This file contains:
- Complete code examples for all changes
- Database schemas
- API endpoint specifications
- React hook implementations
- Testing checklists

---

## Success Criteria

When both stories are complete:

✅ **DisputesPage** - No mock data, loads from API  
✅ **AccountDetailPage** - No mock data, loads from API  
✅ **Navigation** - Can click to related accounts/transfers  
✅ **Database** - account_relationships table exists with RLS  
✅ **API** - All relationship endpoints working  
✅ **Tests** - Manual verification of all features  

**Result:** 100% real data in PayOS UI! 🎉

---

## Current Epic Status

After completing 14.2 and 14.3:

- ✅ Epic 11: Authentication (12/12 stories) - **COMPLETE**
- ✅ Epic 15: RLS Hardening (10/10 stories) - **COMPLETE**
- ✅ Epic 14: Compliance (3/3 stories) - **COMPLETE** (14.1 done, 14.2+14.3 next)
- 🔄 Epic 16: Database Security (0/10 stories) - **PENDING**
- 📋 Epic 17-20: x402 Infrastructure (89 points) - **PLANNED**

---

## Quick Start for Next Session

```bash
# 1. Review implementation plan
cat docs/completed/STORIES_14.2_14.3_IMPLEMENTATION_PLAN.md

# 2. Check current disputes hooks
cat payos-ui/src/hooks/api/useDisputes.ts

# 3. Verify disputes API is working
# Check: apps/api/src/routes/disputes.ts

# 4. Start with Story 14.2 (simpler)
# Edit: payos-ui/src/pages/DisputesPage.tsx
# Replace lines 12-125 (mock data) with useDisputes() hook

# 5. Then Story 14.3 (full implementation)
# Create migration, routes, hooks, update UI
```

---

## Notes

- **Disputes API:** Fully implemented, just needs UI integration
- **Relationships API:** Needs full implementation (migration → API → UI)
- **Database:** Disputes table exists with RLS, relationships table needs creation
- **Testing:** Manual testing sufficient, integration tests optional
- **Documentation:** Update PRD when stories complete (mark as ✅)

---

## Files Changed Today (Reference)

**Created:**
- `apps/api/supabase/migrations/20251217_create_user_sessions.sql`
- `apps/api/src/services/sessions.ts`
- `apps/api/tests/integration/session-security.test.ts`
- `docs/completed/EPIC_11_STORY_11.12_COMPLETE.md`
- `docs/completed/STORY_11.12_SUMMARY.md`
- `docs/completed/DOCS_REORGANIZATION_COMPLETE.md`
- `docs/completed/STORIES_14.2_14.3_IMPLEMENTATION_PLAN.md`
- `docs/README.md`
- `docs/NEXT_SESSION_STORIES_14.2_14.3.md` (this file)

**Modified:**
- `apps/api/src/routes/auth.ts` (added 4 endpoints)
- `payos-ui/src/hooks/useAuth.tsx` (auto-refresh)
- `payos-ui/src/hooks/api/useApi.ts` (401 retry)
- `payos-ui/src/hooks/api/useDisputes.ts` (complete hooks)
- `docs/prd/PayOS_PRD_Development.md` (merged x402, updated)

**Moved:**
- `GEMINI_START_HERE.md` → `docs/`
- `MOCK_TO_API_MIGRATION.md` → `docs/`

**Deleted:**
- `PayOS_PRD_Development.md` (root duplicate)
- `docs/prd/PayOS_x402_PRD_Extension.md` (merged)

---

**Ready for next session!** 🚀

All preparation is done. Implementation is straightforward following the plan.




