# Verified User Flows

**Date:** 2025-12-14
**Context:** Gemini UI Testing Session

This document outlines the user flows that were executed during the testing session, mapping back to the `UI_TESTING_GUIDE.md` where applicable.

## Prescribed Flows (from Testing Guide)

### Flow 1: Home Dashboard
**Status:** ✅ Verified with minor issues
**Steps Executed:**
1.  Navigated to Home page (`/`).
2.  Verified header elements and date.
3.  Verified statistics cards (Accounts, Volume, Cards, Pending Flags).
4.  Verified AI Insights panel visibility.
5.  Verified Volume by Corridor chart and time toggles.
6.  Verified "Requires Attention" queue.
7.  Verified Recent Activity feed.

### Flow 2: Accounts List
**Status:** ✅ Verified with minor issues
**Steps Executed:**
1.  Navigated to Accounts page (`/accounts`).
2.  Verified search and filter inputs.
3.  Verified table columns and data rendering.
4.  Tested navigation to Account Detail (`/accounts/acc_person_001`).

### Flow 3b: Account Detail - Payment Methods
**Status:** ✅ Verified
**Steps Executed:**
1.  Navigated to Maria Garcia's account.
2.  Switched to "Payment Methods" tab.
3.  Verified list of existing methods.
4.  Tested "Set Default" interaction.
5.  Opened "Add Payment Method" modal and verified fields.

### Flow 6: Disputes Page
**Status:** ⚠️ Partial (Slide-over navigation issues)
**Steps Executed:**
1.  Navigated to Disputes page (`/disputes`).
2.  Verified Alert Banner and "Review Now" call-to-action.
3.  Verified Status Cards (counts and "At Risk" amount).
4.  Verified Disputes Table content.
5.  Attempted to open Dispute Detail slide-over (intermittent success with automation).

## Exploratory Flows (New)

### E1: Global Search
**Status:** ⚠️ Partial (Results visibility unclear)
**Steps Executed:**
1.  Clicked Global Search bar.
2.  Entered search term "Maria".
3.  Attempted to verify dropdown results.

### E2: New Payment Input Validation
**Status:** ⛔ Blocked
**Steps Planned:**
1.  Locate "New Payment" / "Send Funds" button.
2.  Enter negative amount to test validation.
**Blocker:** Could not locate entry point button on Dashboard or Accounts page.

### E3: AI Assistant Verification
**Status:** ✅ Executed (Context limitations found)
**Steps Executed:**
1.  Opened AI Assistant panel.
2.  Queried: "Show me high risk accounts".
3.  Verified response content (Assistant provided generic info, not specific data).
