# UI Mock Data Issues - Discovery Report

**Date:** December 17, 2025  
**Status:** Issues Identified During Testing  
**Priority:** High - UI Polish Required

---

## Executive Summary

While testing the UI after completing Stories 14.2 & 14.3, several areas still using mock data were discovered. These need to be addressed to achieve true "100% real data" across the entire UI.

---

## Issues Discovered

### 1. 🎴 **Card Detail Pages** - Critical Data Missing

**Location:** Card detail pages  
**Severity:** High  
**Status:** Needs Investigation

**Issues:**
- Very little data displayed
- ❌ No spending limit information shown
- ❌ No card activity/transaction history shown
- Limited details about the card

**Questions:**
- Does the backend API have card endpoints?
- Is there a `payment_methods` detail endpoint?
- What data is available in the database?

**Action Items:**
- [ ] Check if `payment_methods` table has spending limit fields
- [ ] Verify if card transactions are tracked
- [ ] Check if API endpoint exists: `GET /v1/payment-methods/:id`
- [ ] Investigate what data should be shown on card detail page
- [ ] Update UI to show all available data

---

### 2. 🤖 **Agent Detail Page** - UX Issue

**Location:** Agent detail page  
**Severity:** Low (UX improvement)  
**Status:** Quick Fix

**Issue:**
- Parent Account link is shown as a separate link element
- Should be clickable directly on the Parent Account name

**Current:**
```
Parent Account: TechCorp Inc
[View Account →]  ← separate link
```

**Desired:**
```
Parent Account: TechCorp Inc  ← clickable name itself
```

**Action Items:**
- [ ] Update AgentDetailPage component
- [ ] Make parent account name itself clickable
- [ ] Remove separate link element
- [ ] File: `payos-ui/src/pages/AgentDetailPage.tsx` (or similar)

---

### 3. 🚩 **All Transactions Show AI Flagged Card** - Hardcoded Data

**Location:** Transaction list pages  
**Severity:** Medium  
**Status:** Needs Backend Support

**Issue:**
- Every transaction shows a "flagged by AI" indicator
- Appears to be hardcoded/mock data
- Should be based on actual compliance flags

**Root Cause:**
- Likely hardcoded in transaction display component
- Or: All transactions have a flag in mock data
- Real data: Should query `compliance_flags` table

**Action Items:**
- [ ] Check `TransactionRow` or similar component
- [ ] Remove hardcoded flag indicators
- [ ] Connect to real compliance flags from API
- [ ] Add TODO for Epic 8 (AI Insights) to implement real AI flagging
- [ ] For now: Only show flag if actual compliance_flag exists

**Related:**
- Epic 8: AI Visibility & Agent Intelligence
- Epic 14.1: Compliance Flags (already implemented backend)
- Need to connect frontend to real compliance data

---

### 4. 💰 **Treasury Page** - All Mock Data

**Location:** Treasury/Treasury page  
**Severity:** High  
**Status:** Needs Full Implementation

**Issue:**
- Entire Treasury section appears to use mock data
- No real API integration

**Questions:**
- What should Treasury show?
  - Total balances across accounts?
  - Liquidity pools?
  - Fund movements?
  - Cash flow?
- Is there a treasury API endpoint?
- What data exists in the database for treasury?

**Action Items:**
- [ ] Define Treasury requirements
- [ ] Check if treasury API exists
- [ ] Check database for treasury-related data
- [ ] Identify what mock data exists: `payos-ui/src/data/mockTreasury.ts`?
- [ ] Create Treasury API if needed
- [ ] Update Treasury UI to use real data

---

### 5. 🏠 **Home Page Insights** - Mock Data

**Location:** Home page / Dashboard  
**Severity:** Medium  
**Status:** Needs API Integration

**Issue:**
- Home page insights appear to be mock data
- Dashboard metrics not connected to real data

**Likely Issues:**
- Total transaction volume
- Account counts
- Stream counts
- Recent activity
- Charts and graphs

**Action Items:**
- [ ] Identify all mock data on home page
- [ ] Check if dashboard/summary API exists: `GET /v1/reports/summary`?
- [ ] List all metrics shown on home page
- [ ] Create dashboard summary API if needed
- [ ] Update home page components to use real data

---

## Epic Priorities & Next Steps

### Current Epic Status (After 14.2 & 14.3)

- ✅ **Epic 11:** Authentication (12/12) - COMPLETE
- ✅ **Epic 14:** Compliance (3/3) - COMPLETE  
- ✅ **Epic 15:** RLS Hardening (10/10) - COMPLETE
- 🔄 **Epic 16:** Database Security (0/10) - PLANNED NEXT

### Recommended Approach

**Option A: Address UI Issues First (Polish Phase)**
- Fix all discovered mock data issues
- Complete UI integration with existing APIs
- Estimated: 8-12 hours
- Result: True "100% real data" UI

**Option B: Continue with Epic 16 (Planned Schedule)**
- Proceed with Database Security epic
- Address UI issues in Epic 8 (AI Insights) or Epic 9 (Demo Polish)
- Estimated: Follow original roadmap

**Option C: Hybrid Approach (Recommended)**
1. Quick fixes (Agent link) - 15 min ✅
2. Continue Epic 16 - Database Security
3. Create "Epic 0: UI Mock Data Elimination" for next session
4. Batch all UI fixes together

---

## Detailed Investigation Needed

### 1. Check What APIs Exist

```bash
# List all API routes
grep -r "app.route\|router.get\|router.post" apps/api/src/

# Check for treasury endpoints
grep -r "treasury" apps/api/src/routes/

# Check for dashboard/summary endpoints  
grep -r "summary\|dashboard" apps/api/src/routes/
```

### 2. Check What Mock Data Files Exist

```bash
# Find all mock data files
find payos-ui/src -name "mock*.ts" -o -name "*Mock*.ts"

# Check data folder
ls -la payos-ui/src/data/
```

### 3. Check Database Schema

```sql
-- Check payment_methods table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_methods';

-- Check if treasury tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%treasury%';
```

---

## Quick Wins (Can Fix Immediately)

### 1. Agent Parent Account Link (5 min)

**File:** `payos-ui/src/pages/AgentDetailPage.tsx`

```tsx
// BEFORE
<div>
  <span className="text-gray-500">Parent Account:</span>
  <span>{agent.parentAccountName}</span>
  <Link to={`/accounts/${agent.parentAccountId}`}>View Account →</Link>
</div>

// AFTER
<div>
  <span className="text-gray-500">Parent Account:</span>
  <span 
    className="text-blue-600 cursor-pointer hover:underline"
    onClick={() => navigate(`/accounts/${agent.parentAccountId}`)}
  >
    {agent.parentAccountName}
  </span>
</div>
```

### 2. Remove Hardcoded AI Flags (10 min)

**File:** `payos-ui/src/components/TransactionRow.tsx` (or similar)

```tsx
// BEFORE
const showAIFlag = true; // Hardcoded

// AFTER
const showAIFlag = transaction.complianceFlags?.length > 0;
```

---

## Create New Epic: UI Data Integration

**Epic 0: Complete UI Data Integration**

**Goal:** Eliminate all remaining mock data from UI

**Stories:**
1. Card Detail Pages Enhancement (8 pts)
   - Add spending limits display
   - Add card transaction history
   - Connect to payment methods API
   
2. Treasury Page Integration (13 pts)
   - Define treasury requirements
   - Create treasury API endpoints
   - Integrate treasury UI with real data
   
3. Home Page Dashboard Integration (8 pts)
   - Create dashboard summary API
   - Update home page metrics with real data
   - Add real-time charts
   
4. Transaction Flags Cleanup (3 pts)
   - Remove hardcoded AI flags
   - Connect to real compliance flags
   - Add TODO for Epic 8 AI insights
   
5. Agent UX Improvements (2 pts)
   - Make parent account name clickable
   - Other small UX fixes

**Total:** 34 points (~34 hours)

---

## Recommendation

### Immediate Action (Today)

1. ✅ **Quick Fix:** Agent parent account link (5 min)
2. ✅ **Quick Fix:** Remove hardcoded AI flags (10 min)
3. 📝 **Document:** Create detailed issue list (done - this doc)

### Next Session Priority

**Recommended:** Address UI issues before Epic 16

**Reasoning:**
- UI polish is highly visible
- Demo/testing effectiveness
- True "100% real data" claim
- Better user experience for validation

**Alternative:** Continue with Epic 16, batch UI fixes later

---

## Files to Investigate

### Frontend Components
- `payos-ui/src/pages/AgentDetailPage.tsx`
- `payos-ui/src/pages/CardDetailPage.tsx` (or similar)
- `payos-ui/src/pages/TreasuryPage.tsx`
- `payos-ui/src/pages/HomePage.tsx` or `Dashboard.tsx`
- `payos-ui/src/components/TransactionRow.tsx`

### Mock Data Files
- `payos-ui/src/data/mockTreasury.ts`
- `payos-ui/src/data/mockDashboard.ts`
- Any other `mock*.ts` files

### API Routes to Check
- `apps/api/src/routes/payment-methods.ts`
- `apps/api/src/routes/reports.ts` (for dashboard summary)
- `apps/api/src/routes/treasury.ts` (if exists)

---

## Summary

**Discovered Issues:** 5 major areas with mock data  
**Quick Fixes Available:** 2 (15 minutes total)  
**Full Resolution:** ~34 story points (estimated)  
**Recommendation:** Quick fixes now, full epic for UI polish next

**Status:** Documented and ready for prioritization

---

**Next Steps:**
1. Decide: Continue Epic 16 or address UI issues?
2. If UI: Investigate APIs and database schema
3. If Epic 16: Create "Epic 0: UI Integration" for later
4. Apply quick fixes regardless of choice

---

*Report generated: December 17, 2025*  
*Discovered by: User testing after Stories 14.2 & 14.3*


