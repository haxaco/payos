# PayOS Bug Report & Known Issues

**Date:** 2025-12-15
**Status:** ✅ All P1 Issues Resolved

This document tracks bugs found during UI testing.

## 🟢 Open Issues (Minor / Polish)

### 1. Global Search Dropdown Visibility
*   **Priority:** Low (P3)
*   **Description:** Dropdown UI doesn't always appear over content, but search input correctly filters full page lists.
*   **Action:** Polish z-index or dropdown positioning in future sprint.

### 2. AI Assistant Context Awareness
*   **Priority:** Medium (P2)
*   **Description:** AI responds to generic queries but lacks deep context (e.g., "Show high risk accounts").
*   **Action:** Connect AI Service to Compliance API.


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

### ✅ Fixed: Account Detail Routing Error
*   **Original Issue:** Clicking any account opened hardcoded "Maria Garcia" data regardless of URL.
*   **Root Cause:** `AccountDetailPage.tsx` was using props instead of `useParams()` from React Router.
*   **Fix Verification:** Updated all detail pages to use `useParams()` and `useNavigate()` hooks. Now correctly reads ID from URL and displays the right account.

### ✅ Fixed: Account Transactions Tab Empty
*   **Original Issue:** Transactions tab showed placeholder text instead of data.
*   **Root Cause:** Component was incomplete with just a TODO comment.
*   **Fix Verification:** Added full transaction tables for both person and business accounts with mock data, showing date, description, type (credit/debit), amount, and status. Transactions are clickable and navigate to detail pages.

### ✅ Fixed: Cards Detail View Unresponsive
*   **Original Issue:** Clicking cards didn't navigate to detail page.
*   **Root Cause:** Both `CardDetailPage.tsx` (detail page) and `CardsPage.tsx` (list page) were using props instead of React Router hooks.
*   **Fix Verification:** 
    - Updated detail page to use `useParams()` and `useNavigate()`
    - **Updated list page to navigate on row click: `navigate(\`/cards/${card.id}\`)`**
    - Card rows now clickable and navigate to detail page correctly

### ✅ Fixed: Compliance Detail View Render Issue
*   **Original Issue:** Clicking a flag updated URL but re-rendered list view.
*   **Root Cause:** Both `ComplianceFlagDetailPage.tsx` (detail page) and `CompliancePage.tsx` (list page) were using props instead of React Router hooks.
*   **Fix Verification:**
    - Updated detail page to use `useParams()` and `useNavigate()`
    - **Updated list page to navigate on row click: `navigate(\`/compliance/${flag.id}\`)`**
    - Compliance flags now clickable and navigate to detail page correctly

### ✅ Fixed: Transaction Detail View Render Issue
*   **Original Issue:** Clicking a transaction updated URL but re-rendered list view.
*   **Root Cause:** Both `TransactionDetailPage.tsx` (detail page) and `TransactionsPage.tsx` (list page) were using props instead of React Router hooks.
*   **Fix Verification:**
    - Updated detail page to use `useParams()` and `useNavigate()`
    - **Updated list page to navigate on row click: `navigate(\`/transactions/${tx.id}\`)`**
    - Made all transactions clickable (not just flagged ones)
    - Transactions now clickable and navigate to detail page correctly

### ✅ Fixed: Agent Detail View Render Issue
*   **Original Issue:** Clicking an agent updated URL but re-rendered list view.
*   **Root Cause:** Both `AgentDetailPage.tsx` (detail page) and `AgentsPage.tsx` (list page) were using props instead of React Router hooks.
*   **Fix Verification:**
    - Updated detail page to use `useParams()` and `useNavigate()`
    - **Updated list page to navigate on row click: `navigate(\`/agents/${agent.id}\`)`**
    - Agent rows now clickable and navigate to detail page correctly

### ✅ Fixed: Breadcrumb Navigation Failure
*   **Original Issue:** Breadcrumb links didn't navigate back to list pages.
*   **Root Cause:** Components were using `onNavigate()` prop callbacks instead of React Router's `navigate()`.
*   **Fix Verification:** All breadcrumb links updated to use `navigate('/path')`. Back navigation now works correctly across all detail pages.
