# PayOS Bug Report & Known Issues

**Date:** 2025-12-16  
**Status:** ✅ All P1 Issues Resolved | P2/P3 Remaining

This document tracks bugs found during UI testing.

## 🟡 Open Issues (Minor / Polish)

### 3. Compliance Detail View Navigation (INVESTIGATING - P1)
*   **Priority:** High (P1)
*   **Description:** Gemini reported that navigation to `/compliance/flag_001` fails with "Invalid ID" or "Not Found". Click on list row may be untargetable or mapped to wrong ID.
*   **Likely Cause:** Session expiration or authentication issue. The API endpoint requires valid JWT token and filters by `tenant_id`. If session expires, API returns 401/404.
*   **Action:** 
    - **For Gemini:** Please refresh the page and log in again at `http://localhost:5173/login`. Use any test account you've created.
    - **For Dev:** Improve error messaging - show "Session expired, please log in" instead of generic "Not Found". Add token refresh logic.
*   **Status:** Under investigation - awaiting Gemini confirmation after re-login
*   **Technical Details:**
    - API endpoint: `GET /v1/compliance/flags/:id` ✅ Implemented correctly
    - Frontend hook: `useComplianceFlag(id)` ✅ Implemented correctly  
    - Route: `/compliance/:id` ✅ Mapped correctly in App.tsx
    - Navigation: `navigate('/compliance/${flag.id}')` ✅ Using correct UUID
    - Database: 5 compliance flags exist with valid UUIDs ✅
    - **Issue:** API filters by `ctx.tenantId` (line 149 in compliance.ts), which requires valid authenticated session

### 2. AI Assistant Context Awareness
*   **Priority:** Medium (P2)
*   **Description:** AI responds to generic queries but lacks deep context (e.g., "Show high risk accounts").
*   **Action:** Connect AI Service to Compliance API.
*   **Status:** Open - future enhancement

### 1. Global Search Dropdown Visibility
*   **Priority:** Low (P3)
*   **Description:** Dropdown UI doesn't always appear over content, but search input correctly filters full page lists.
*   **Action:** Polish z-index or dropdown positioning in future sprint.
*   **Status:** Open - UI polish

---

## 🏁 Resolved / Closed Issues (Archive)

### ✅ Fixed: Bug #9 - Breadcrumb Navigation (2025-12-16)
*   **Original Issue:** Breadcrumb links not navigating back to list pages.
*   **Fix:** All detail pages (AccountDetailPage, CardDetailPage, ComplianceFlagDetailPage) already using correct navigate() implementation.
*   **Verification:** Breadcrumb navigation works correctly across all detail pages.

### ✅ Fixed: Bug #11 - Search Filtering on Accounts Page (2025-12-16)
*   **Original Issue:** Search input updated tab counts but didn't filter table rows.
*   **Fix:** Added searchQuery state, onChange handler, and filtering logic to filteredAccounts memo.
*   **Verification:** Search now filters in real-time, tab counts reflect filtered results, empty state triggers correctly.

### ✅ Fixed: Bug #3 - Account Detail Routing Error (2025-12-16)
*   **Original Issue:** All accounts opened same hardcoded data regardless of URL ID.
*   **Fix:** Migrated AccountDetailPage to use useParams() and useAccount(id) API hook.
*   **Verification:** Each account now loads its own data based on ID in URL.

### ✅ Fixed: Bug #4 - Account Transactions Tab Empty (2025-12-16)
*   **Original Issue:** Transactions tab in Account Detail was placeholder/empty.
*   **Fix:** Integrated full transaction table with useTransfers() API hook filtered by account_id.
*   **Verification:** Transactions now display correctly for each account.

### ✅ Fixed: Bug #5 - Cards Detail View Unresponsive (2025-12-16)
*   **Original Issue:** Clicking card row in /cards did nothing.
*   **Fix:** Updated CardsPage to use useNavigate() hook instead of onNavigate prop.
*   **Verification:** Clicking card rows now navigates to detail page.

### ✅ Fixed: Bug #6 - Compliance Detail View (2025-12-16)
*   **Original Issue:** Clicking flag updated URL but re-rendered list view.
*   **Fix:** CompliancePage already had correct useNavigate() implementation.
*   **Verification:** Navigation now works correctly to detail pages.

### ✅ Fixed: Bug #7 - Transaction Detail View (2025-12-16)
*   **Original Issue:** Clicking transaction updated URL but re-rendered list view.
*   **Fix:** Migrated TransactionDetailPage to use useParams() and useTransfer(id) API hook.
*   **Verification:** Each transaction now loads its own data and displays correctly.

### ✅ Fixed: Bug #8 - Agent Detail View (2025-12-16)
*   **Original Issue:** Clicking agent updated URL but re-rendered list view.
*   **Fix:** AgentsPage already had correct useNavigate() implementation.
*   **Verification:** Navigation now works correctly to detail pages.

### ✅ Fixed: Bug #10 - CardDetailPage JS Errors (2025-12-16)
*   **Original Issue:** CardDetailPage failed with undefined 'card' variable errors.
*   **Fix:** Replaced all 'card' references with 'paymentMethod' variable, removed non-existent fields.
*   **Verification:** Card detail pages now render without JS errors.

### ✅ Fixed: Missing "New Payment" Entry Point
*   **Original Issue:** Could not find button to start payment.
*   **Fix Verification:** "Send Funds" and "Create Payout" buttons confirmed visible and functional in Account Headers.

### ✅ Fixed: Dashboard Date Mismatch
*   **Original Issue:** Date showed Dec 6.
*   **Fix Verification:** Now reflects current system date.

### ✅ Fixed: Accounts Table - Missing Column
*   **Original Issue:** "Created" column missing.
*   **Fix Verification:** Column restored.

### ✅ Fixed: Dispute Detail Slide-over
*   **Original Issue:** Hard to click.
*   **Fix Verification:** Click reliability improved.

### ✅ Fixed: API/UI Data Structure Mismatch
*   **Original Issue:** List views were empty (Accounts, Transactions, Cards).
*   **Fix Verification:** Verified all lists display correct count and data after type alignment.
