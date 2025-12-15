# Multi-Tenancy Testing Strategy

## Current Status (UI Mock Phase)
The current UI (`payos-ui`) operates in **Partner Admin Mode** by default.
*   **Data Source:** Static `mockAccounts.ts`.
*   **Filtering:** None. All accounts are visible.
*   **Implication:** You cannot currently "log in" as a specific tenant (e.g., TechCorp) to test data isolation in the browser.

## How to Test Multi-Tenancy

### Option A: API Level Testing (Recommended for Logic)
Since tenancy is enforced by the Backend API (`apps/api/src/middleware/auth.ts`) using API Keys, true isolation testing should happen there.
1.  **Test Case:** Use `curl` or Postman with TechCorp's API Key (`pk_test_techcorp`).
2.  **Action:** Request `GET /v1/accounts`.
3.  **Verify:** Response contains *only* TechCorp's data, not StartupXYZ's.

### Option B: UI Simulation (Recommended for Demo)
To visualize this in the UI without a real backend, we can implement a **Mock Tenant Switcher**:
1.  **Create Context:** Add a global `TenantContext` to `App.tsx`.
2.  **Add Switcher:** A dropdown in the `TopBar` to select "View as Partner" vs "View as TechCorp".
3.  **Filter Data:** Update `AccountsPage` to filter `mockAccounts` based on the selected ID.
    *   *If "TechCorp" selected:* Show only `acc_biz_001` and its related `acc_person_...` records.

## Recommendation
For **Phase 1 (User Flows)**, assume you are the **Partner Admin**.
For **Phase 2 (Integration)**, rely on the real API to enforce what data is returned.
