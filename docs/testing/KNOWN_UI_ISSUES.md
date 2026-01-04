# Known UI Issues (As of 2026-01-02)

This document tracks UI issues discovered during development that need to be addressed.

## Critical Issues (P0)

### 1. Double-Nested API Responses
**Status:** 🔧 Partially Fixed  
**Pages Affected:** Dashboard, Accounts List, Account Detail  

**Issue:**
API responses are double-nested (`data.data.pagination` instead of `data.pagination`) due to response wrapper middleware adding an extra layer.

**Root Cause:**
- Response wrapper middleware wraps responses in `{ success: true, data: {...} }`
- Route handlers already return `{ data: [...], pagination: {...} }`
- Result: `{ success: true, data: { data: [...], pagination: {...} } }`

**Fixes Applied:**
- ✅ Dashboard stats now reads from `data.data.pagination.total`
- ✅ Accounts list pagination fixed
- ✅ Accounts list data fixed to read from `data.data`
- ✅ Account detail fixed to unwrap double-nested response

**Still Needs Fixing:**
- ⏭️ All other pages (Transfers, Agents, Streams, etc.)
- ⏭️ Audit entire frontend for response structure assumptions
- ⏭️ OR: Fix backend to not double-wrap responses

**Workaround:**
```typescript
// Frontend needs to handle double-nesting:
const data = (response as any)?.data?.data || response?.data;
const pagination = (response as any)?.data?.pagination || response?.pagination;
```

---

### 2. Invalid Date Handling
**Status:** ✅ Fixed  
**Pages Affected:** Account Detail, anywhere dates are displayed

**Issue:**
Calling `formatDate()` on null/undefined dates caused "Invalid time value" errors and crashed pages.

**Root Cause:**
- `formatDate()` function didn't validate input
- Some date fields in API responses are `null`
- `new Date(null)` creates invalid date object

**Fix Applied:**
```typescript
const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return 'N/A';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  return formatter.format(dateObj);
};
```

**Status:** ✅ Complete

---

### 3. Hardcoded Fallback Values
**Status:** ✅ Fixed  
**Page:** Dashboard stats

**Issue:**
Dashboard showed "12,847 accounts" when API didn't return data, instead of showing 0 or loading state.

**Root Cause:**
```typescript
accounts: accountsData?.pagination?.total || 12847  // ← Hardcoded!
```

**Fix Applied:**
```typescript
accounts: (accountsData as any)?.data?.pagination?.total || 0
```

**Status:** ✅ Complete

---

## Major Issues (P1)

### 4. Account 360 Returns 404
**Status:** 🔍 Diagnosed, Needs Testing  
**Page:** `/dashboard/accounts/{id}/360`

**Issue:**
Account 360 view returns 404 "Not Found" error.

**Root Cause:**
Initially thought to be tenant mismatch, but actual cause needs confirmation after recent fixes.

**Debugging Added:**
- ✅ Added debug logging to Context API
- ✅ Logs show tenant matches
- ✅ Accounts exist in database

**Next Steps:**
- ⏭️ Test Account 360 view after double-nesting fix
- ⏭️ Check if frontend is parsing response correctly
- ⏭️ Verify API endpoint returns expected structure

**API Endpoint:** `GET /v1/context/account/{id}`

---

### 5. Empty States Not Showing
**Status:** ⏭️ Needs Audit  
**Pages Affected:** Unknown (needs testing)

**Issue:**
Pages with no data may show blank content instead of helpful empty states.

**Expected:**
- Illustration/icon
- Message explaining why empty
- Call-to-action button
- Helpful description

**Next Steps:**
- ⏭️ Test all pages with empty data
- ⏭️ Ensure empty states are implemented
- ⏭️ Verify empty state designs are user-friendly

---

### 6. Tenant Isolation Not Enforced in UI
**Status:** ⏭️ Needs Verification  
**Severity:** Critical (Security)

**Issue:**
Frontend might not be properly filtering data by tenant, potentially showing data from other tenants.

**Verification Needed:**
- ✅ API filters by tenant correctly (verified)
- ⏭️ Frontend doesn't bypass API
- ⏭️ No direct Supabase calls in frontend
- ⏭️ All data comes through API

**Security Test:**
1. Create second tenant
2. Add accounts to second tenant
3. Log in as first tenant
4. Verify NO accounts from second tenant visible

---

## Minor Issues (P2)

### 7. Loading States Inconsistent
**Status:** ⏭️ Needs Review  
**Pages Affected:** Various

**Issue:**
Some pages show skeleton loaders, some show spinners, some show nothing.

**Desired:**
- Consistent loading UI across all pages
- Skeleton loaders for list views
- Spinners for actions/forms
- Smooth transitions when data loads

---

### 8. Error Messages Not User-Friendly
**Status:** ⏭️ Needs Improvement  
**Pages Affected:** Various

**Issue:**
Technical error messages shown to users instead of friendly messages.

**Examples:**
- "Failed to fetch from database" → "Unable to load accounts"
- "401 Unauthorized" → "Please log in to continue"
- "Network error" → "Connection lost. Please check your internet."

---

### 9. No Offline Support
**Status:** ⏭️ Enhancement  
**Pages Affected:** All

**Issue:**
When network is offline, app shows cryptic errors or blank pages.

**Desired:**
- Detect offline state
- Show friendly "You're offline" message
- Cache recent data for offline viewing
- Auto-retry when connection restored

---

## Cosmetic Issues (P3)

### 10. Placeholder/Mock Data Still Showing
**Status:** ⏭️ Needs Cleanup  
**Pages Affected:** Dashboard, possibly others

**Issue:**
Some placeholder values still showing:
- Volume: "$2.4M" (placeholder)
- Cards: "8234" (placeholder)

**Action:**
- ⏭️ Replace with real data or remove
- ⏭️ Audit for other placeholder content

---

### 11. Inconsistent Typography/Spacing
**Status:** ⏭️ Polish  
**Pages Affected:** Various

**Issue:**
Font sizes, weights, and spacing vary across pages.

**Action:**
- ⏭️ Design system audit
- ⏭️ Standardize typography scale
- ⏭️ Consistent spacing system

---

## Backend Issues Affecting UI

### 12. Response Structure Inconsistency
**Status:** ⏭️ Backend Fix Needed  
**Affected:** All API endpoints

**Issue:**
Some endpoints return `{ data: [...], pagination: {...} }` while response wrapper adds another `{ success: true, data: {...} }` layer.

**Options:**
1. **Backend Fix:** Response wrapper should not wrap if response already has `data` key
2. **Frontend Fix:** Always handle double-nesting
3. **Standardize:** Choose one structure and enforce it

**Recommendation:** Backend fix (Option 1) is cleaner long-term.

---

### 13. Missing Account Balances
**Status:** ⏭️ Data Issue  
**Affected:** All accounts

**Issue:**
All accounts show $0 balance. Setup script created accounts but balances may not be properly linked.

**Verification Needed:**
```sql
SELECT a.id, a.name, b.available, b.currency
FROM accounts a
LEFT JOIN balances b ON b.account_id = a.id
WHERE a.tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';
```

**Expected:** Each account should have a balance record.

---

## Testing Gaps

### Areas Not Yet Tested
- [ ] Transfers page
- [ ] Agents page
- [ ] Streams page
- [ ] Payment methods/Cards page
- [ ] Compliance page
- [ ] Reports page
- [ ] Settings/Organization page
- [ ] API Keys page
- [ ] Create/Edit/Delete flows
- [ ] Form validation
- [ ] Mobile responsive design
- [ ] Cross-browser compatibility
- [ ] Accessibility
- [ ] Performance under load

---

## Priority Recommendations

### Must Fix Before Production
1. ✅ Double-nested responses (in progress)
2. ✅ Invalid date handling (fixed)
3. ⏭️ Account 360 returns 404 (needs testing)
4. ⏭️ Tenant isolation (needs verification)
5. ⏭️ Error messages user-friendly

### Should Fix Soon
6. ⏭️ Empty states consistent
7. ⏭️ Loading states consistent
8. ⏭️ Remove placeholder data
9. ⏭️ All pages handle double-nesting

### Can Defer
10. ⏭️ Offline support
11. ⏭️ Typography/spacing polish
12. ⏭️ Advanced accessibility
13. ⏭️ Performance optimization

---

## How to Report New Issues

When you find a new UI issue, add it here following this template:

```markdown
### [#] Issue Title
**Status:** 🔍 New / 🔧 In Progress / ✅ Fixed / ⏭️ Backlog  
**Severity:** P0 (Critical) / P1 (Major) / P2 (Minor) / P3 (Cosmetic)  
**Page:** URL or page name  
**Affected Users:** All / Specific role / Edge case

**Issue:**
Clear description of what's wrong

**Root Cause:**
Why this is happening (if known)

**Fix/Workaround:**
How to solve it or work around it

**Status:** Current state and next steps
```

---


## Regression Test Results - 2026-01-02

**Tester:** Agent Antigravity
**Scope:** Core & Agentic Features
**Result:** 🔴 FAILED - Critical Regressions Found

### 🚨 Critical Regressions (New P0)

#### 14. Authentication Loop on Protected Routes
**Status:** ✅ FIXED (2026-01-02)
**Pages Affected:** `/dashboard/agentic-payments/*` (x402, AP2, ACP)
**Issue:** 
Attempting to access Agentic Payment pages results in a redirect to `/auth/login`. Login attempts fail or loop. 
**Root Cause:** Conflict between Server-Side auth check in `dashboard/layout.tsx` and Middleware session update. Race condition caused layout to read stale session.
**Fix Applied:** Removed redundant server-side check in layout, relying on Middleware (correct pattern for Next.js + Supabase).
**Verification:** Browser test confirmed access to `/dashboard/agentic-payments/x402/endpoints` works without redirect.

#### 15. Missing/Empty Data Lists
**Status:** ✅ FIXED (2026-01-02)
**Pages Affected:** ALL list pages (Transfers, Wallets, Cards, etc.)
**Issue:**
Lists were displaying 0 items ("No transactions yet") despite seeded test data.
**Root Cause:**
1. Tenant ID mismatch between User Profile and Seed Data.
2. Double-nested API responses (previously fixed).
**Fix Applied:** 
1. Re-ran `seed-complete-test-data.ts` which now correctly discovers the user's tenant ID dynamically.
2. Verified database is populated for the correct tenant.
**Verification:** 
- Transfers list: Shows 12 items (previously 0)
- Endpoints list: Shows 3 items (previously 0)
- Wallets list: Shows 6 items (previously 0)

### 🔸 Major Issues (Confirmed P1)

#### 4. Account 360 View 404 (Confirmed)
**Status:** 🔴 Confirmed Regression
**Page:** `/dashboard/accounts/{id}/360`
**Issue:**
Page returns 404 Not Found. Link is missing from Account Detail page UI.
**Action:** Needs immediate backend/routing fix.

#### 16. JavaScript Error in Cards/Payment Methods
**Status:** ✅ FIXED (2026-01-02)
**Page:** `/dashboard/cards`
**Issue:**
Console error: `TypeError: cardTransactions is not iterable`
**Status:** ✅ Complete

### 🔹 Minor Findings (P2/P3)

#### 17. Sidebar UI Inconsistency
**Status:** ⚪ Minor
**Issue:** Agentic Payments sidebar sub-items (AP2, Mandates, Integration) lack icons/styling consistent with main nav.

#### 18. Dashboard Loading Flash
**Status:** ⚪ Cosmetic
**Issue:** Stats cards briefly show `...` text before loading skeletons or data.

---

**Last Updated:** 2026-01-02 (Post Double-Nesting Fix)
**Next Review:** After investigating Issue #14 (Auth Loop)

---

## ✅ Fixes Applied (2026-01-02)

### Issue #15: Missing/Empty Data Lists - RESOLVED
- **Root Cause:** Double-nested API responses (`data.data` instead of `data`)
- **Pages Fixed:** 14 pages total
  - Transfers, Wallets, Schedules, Refunds
  - Agents, Streams, Compliance
  - Cards, Reports
  - x402 Endpoints, x402 Endpoint Detail, x402 Wallets
  - AP2 Mandates, ACP Checkouts
- **Fix:** Updated all pagination and data extraction to handle `(response as any)?.data?.data`
- **Status:** ✅ Complete - Ready for re-testing

### Issue #16: Cards Page Display Issues - RESOLVED
- **Issues:** "No Cards Found", "Configure API Key" overlay race condition, Invalid API call.
- **Root Causes:**
  1. Frontend race condition on `isConfigured` vs `isLoading`.
  2. Frontend using private `(api as any).get` method.
  3. API returning inconsistent response structure (`payment_methods` vs `data`).
  4. Seed data missing metadata columns.
- **Fixes:**
  1. Refactored `CardsPage` to wait for initialization.
  2. Added `api.paymentMethods.listAll()` to client library.
  3. Standardized API to return `{ data: [...] }`.
  4. Fixed seeding script to correctly populate `metadata`.
- **Status:** ✅ Fully Verified (2026-01-02)

---

## 🔍 Still Needs Investigation

### Issue #14: Authentication Loop
- Routes exist in codebase
- API client methods exist
- Backend routes registered
- **Next Steps:**
  1. Check browser console for auth errors
  2. Check network tab for 401/403 responses
  3. Verify localStorage session token
  4. Test with fresh login

---

## ✅ Fixes Applied (2026-01-03)

### Critical UI Bug Fixes - RESOLVED
Addressed 6 critical UI bugs causing crashes and data inconsistency:
1.  **Agent Detail Page Crash:** Fixed crash when accessing parent account properties.
2.  **Agentic Payments Layout:** Restored padding in Analytics and Checkouts pages.
3.  **Transfer Detail Page Crash:** Resolved crash on undefined `amount` from nested API response.
4.  **Cards Page Build Error:** Fixed build-time context error.
5.  **Refunds Page:** Fixed broken "Original Transfer" links and formatting.
6.  **Compliance Page:** Fixed date/reason formatting.
7.  **Card Detail Page Error:** Fixed `PayOSError` by replacing missing RPC call with direct query.

**Verification:** All fixes validted manually in browser.


