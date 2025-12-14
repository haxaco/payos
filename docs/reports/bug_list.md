# PayOS Bug Report & Known Issues

**Date:** 2025-12-14
**Status:** ✅ All Critical Blockers Resolved

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
