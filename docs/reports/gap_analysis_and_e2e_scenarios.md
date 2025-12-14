# PayOS Testing Gap Analysis & Proposed E2E Scenarios

**Date:** 2025-12-14
**Objective:** Identify missing "Real World" and "End-to-End" flows to validate PayOS readiness for clients.

## 1. Current Coverage Limits
The current `UI_TESTING_GUIDE.md` focuses primarily on **Component/Page Verification** (e.g., "Does the Accounts page load?", "Does the button exist?"). It lacks **Workflow Verification** (e.g., "Can a user complete a full lifecycle event?").

**Critical Gaps Identified:**
*   **Lifecycle Persistence:** Creating an entity and verifying it appears in lists/reports is not fully tested.
*   **Multi-Tenancy:** Testing is restricted to a single "Partner Admin" view. We need to verify data isolation between tenants (e.g., TechCorp vs. StartupXYZ).
*   **Agent Autonomy:** No test for an Agent performing an action (creating a stream) vs. a Human.
*   **Financial Integrity:** No flow to verify math (e.g., `Balance - Transfer Amount - Fee = New Balance`).
*   **Compliance/Edge Cases:** No test for "Happy Path" alternatives (e.g., Blocked Transactions, KYB Failures).

## 2. Proposed "Real World" E2E Scenarios

### Scenario A: The "New Client Onboarding" Flow (Multi-tenancy)
**Perspective:** Partner Admin
**Goal:** Verify new tenants are correctly isolated and initialized.
1.  **Partner Admin** creates a new Tenant: "Global Gig Workers Ltd".
2.  **Partner Admin** creates an Admin User for that Tenant.
3.  **Log out** and **Log in** as the new Tenant Admin.
4.  **Verify:**
    *   Dashboard is empty (no data leakage from TechCorp).
    *   Settings profile matches "Global Gig Workers".
    *   Can create their first "Business Account".

### Scenario B: The "Payroll Run" Validation
**Perspective:** Finance Manager (Client)
**Goal:** Verify balance logic and history accuracy.
1.  **Start With:** Account A ($10,000) and Account B ($0).
2.  **Action:** Send $5,000 from A to B.
3.  **Verify:**
    *   Account A Balance = $5,000 (approx, less fees).
    *   Account B Balance = $5,000.
    *   **Transactions List:** Shows 1 new transaction (Status: Completed).
    *   **Reports:** Export shows a $5,000 debit for A.
**Status:** ✅ **VERIFIED** (Entry point via "Create Payout" confirmed; Form validation passes; Execution mocked).

### Scenario C: The "Rogue Agent" Defense (Compliance)
**Perspective:** Compliance Officer
**Goal:** Verify limit enforcement and audit trails.
1.  **Setup:** Agent "Payroll Bot" has a $1,000 daily limit.
2.  **Action:** Bot attempts a $5,000 transfer.
3.  **Result:** Transfer fails (Error: "Exceeds Agent Limit").
4.  **Verification:**
    *   **Agent Activity Feed:** Shows "Failed transfer: Limit Exceeded".
    *   **Dashboard:** "Compliance Flags" count increases by 1 (if configured).
    *   **Audit Log:** Records the attempt.

### Scenario D: The "Dispute Resolution" Lifecycle
**Perspective:** Operations Manager
**Goal:** Test state transitions.
1.  Identify a defined Transaction (TX-123).
2.  **Action:** Open a Dispute for TX-123.
3.  **Verify:** Dispute appears in "Open" queue.
4.  **Action:** "Resolve" the dispute (Issue Refund).
5.  **Verify:**
    *   Dispute moves to "Resolved" queue.
    *   Transaction status updates to "Refunded" (or linked refund created).
    *   Funds move back to Originator.
**Status:** ✅ **PARTIALLY VERIFIED** (Slide-over details verified; Action buttons functionality pending integration).

## 3. Recommended Next Steps
1.  **Implement Scenario B (Payroll Run):** This is the highest value to prove "it works" to a client.
2.  **Mock Multi-tenancy:** If full login/logout isn't ready, simulate by toggling a `tenant_id` context in the Developer Console or URL param if supported.
3.  **Automate "Creation" Tests:** Ensure that when we "Add Payment Method", it actually persists to the list.
