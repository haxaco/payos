# PayOS Bug Report & Known Issues

**Date:** 2025-12-14
**Status:** ✅ All Critical Blockers Resolved

This document tracks bugs found during UI testing.

## 🟢 Open Issues (Minor / Polish)

### 1. Global Search Dropdown Visibility
*   **Priority:** Low (P3)
*   **Description:** Dropdown UI doesn't always appear over content, but search input correctly filters full page lists.
*   **Action:** Polish z-index or dropdown positioning in future sprint.

### 10. API/UI Data Structure Mismatch (Critical)
*   **Priority:** Critical (P0) - Blocks Integration Testing
*   **Description:** All List Views (Accounts, Transactions, Cards) are empty despite data existing in the DB.
*   **Root Cause:** API response format changed to standard `{ data: [...], pagination: ... }`, but UI components and hooks still expect legacy format `{ accounts: [...] }`.
*   **Impact:** `useApi` hook successfully fetches data, but child components see `undefined` and render empty states.
*   **Fix Required:** Update `src/types/api.ts` and component mapping logic to read from `.data`.

### 2. AI Assistant Context Awareness
*   **Priority:** Medium (P2)
*   **Description:** AI responds to generic queries but lacks deep context (e.g., "Show high risk accounts").
*   **Action:** Connect AI Service to Compliance API.

### 3. Account Detail Routing Error
*   **Priority:** High (P1)
*   **Description:** Clicking any account in the list opens "Maria Garcia" (or hardcoded data) regardless of the ID in the URL.
*   **Root Cause:** `AccountDetailPage.tsx` likely ignores the `id` from `useParams` and defaults to a hardcoded prop or mock item.

### 4. Account Transactions Tab Empty
*   **Priority:** High (P1)
*   **Description:** "Transactions" tab in Account Detail is a placeholder or empty.
*   **Root Cause:** Component implementation is incomplete (mock data not mapped).

### 5. Cards Detail View Unresponsive
*   **Priority:** High (P1)
*   **Description:** Clicking a row in `/cards` does nothing.
*   **Root Cause:** `CardsPage.tsx` uses `onNavigate` prop but is not connected to a router outlet.

### 6. Compliance Detail View Render Issue
*   **Priority:** High (P1)
*   **Description:** Clicking a flag updates URL but re-renders the list view.
*   **Root Cause:** `CompliancePage.tsx` likely handling click incorrectly or Route definition in `App.tsx` has specificity issues.

### 7. Transaction Detail View Render Issue
*   **Priority:** High (P1)
*   **Description:** Clicking a transaction updates URL but re-renders list view.
*   **Root Cause:** `TransactionsPage.tsx` click handler issue.

### 8. Agent Detail View Render Issue
*   **Priority:** High (P1)
*   **Description:** Clicking an agent updates URL but re-renders list view.
*   **Root Cause:** `AgentsPage.tsx` click handler issue.

### 9. Breadcrumb Navigation Failure
*   **Priority:** Medium (P2)
*   **Description:** Clicking the "Accounts" link in the breadcrumb trail (top left) does not navigate back to the Accounts list.
*   **Root Cause:** Component uses `onNavigate('accounts')` but the parent `AccountDetailPage` does not receive this prop, nor is it connected to the Router.
    *   *Correction:* Initially thought to be working (likely tested sidebar link by mistake), but user report and re-verification confirmed failure.

---

## 🏁 Resolved / Closed Issues (Archive)

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
