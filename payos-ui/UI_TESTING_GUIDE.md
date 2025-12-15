# PayOS UI Testing Guide

**Version:** 1.0  
**Date:** December 14, 2025  
**Purpose:** Comprehensive UI testing instructions for automated testing (Gemini)

---

## Overview

PayOS is a B2B stablecoin payout operating system. This guide covers all user flows for testing the dashboard UI.

### Application URL
- **Development:** http://localhost:5173
- **API:** http://localhost:4000

### Test User Context
- **User:** John Smith (Partner Admin)
- **Company:** Acme Fintech
- **Role:** Full administrative access

---

## Navigation Structure

### Primary Navigation (Sidebar)
| Route | Page | Badge |
|-------|------|-------|
| `/` | Home | — |
| `/accounts` | Accounts | — |
| `/transactions` | Transactions | — |
| `/cards` | Cards | — |
| `/compliance` | Compliance | 23 |
| `/disputes` | Disputes | 3 |
| `/treasury` | Treasury | — |
| `/agents` | Agents | — |
| `/reports` | Reports | — |

### Developer Navigation
| Route | Page |
|-------|------|
| `/api-keys` | API Keys |
| `/webhooks` | Webhooks |
| `/request-logs` | Request Logs |

### Configuration Navigation
| Route | Page |
|-------|------|
| `/templates` | Templates |
| `/verification-tiers` | Verification Tiers |
| `/agent-verification-tiers` | Agent Tiers (KYA) |
| `/settings` | Settings |

---

## Test Flows

### Flow 1: Home Dashboard

**Route:** `/`

**Steps:**
1. Navigate to Home page
2. Verify header shows "Home" with current date
3. Verify statistics cards display:
   - Accounts (12,847 with MTD growth)
   - Volume ($2.4M with MTD growth)
   - Cards (8,234 with MTD growth)
   - Pending Flags (23)
4. Verify AI Insights panel shows actionable items
5. Verify Volume by Corridor chart displays with time toggle (7D, 30D, 90D)
6. Verify "Requires Attention" section with risk badges
7. Verify Recent Activity feed shows transactions

**Expected Results:**
- All cards are clickable and navigate to respective pages
- Chart updates when time period is changed
- Activity items show proper formatting

---

### Flow 2: Accounts List

**Route:** `/accounts`

**Steps:**
1. Navigate to Accounts page
2. Verify page header "Accounts"
3. Verify search input is present
4. Verify filter dropdowns (Type, Status, Country)
5. Verify accounts table displays with columns:
   - Account (name, ID, type badge)
   - Balance
   - Status
   - Country
   - Created date
6. Click on an account row
7. Verify navigation to account detail page

**Test Data:**
- Person accounts: Maria Garcia, Ana Souza, Juan Perez, Carlos Martinez
- Business accounts: TechCorp Inc, Digital Services LLC, CloudSoft Inc

---

### Flow 3: Account Detail - Person

**Route:** `/accounts/acc_person_001`

**Steps:**
1. Navigate to Maria Garcia's account
2. Verify breadcrumb: Accounts > Maria Garcia
3. Verify header card shows:
   - Profile picture/avatar
   - Name: Maria Garcia
   - Email: maria.garcia@email.com
   - Phone: +54 11 1234 5678
   - Country: Argentina
   - Account ID: acc_person_001
   - Status badge: Active
   - Tier badge: T2 · Verified
4. Verify Balance card shows breakdown (USD, USDC)
5. Verify Card card shows card details
6. Verify tab navigation:
   - Overview
   - Transactions
   - **Payment Methods** ← New
   - Streams
   - Agents
   - Relationships
   - Documents
   - Logs

**Sub-Flow 3a: Overview Tab**
1. Click Overview tab
2. Verify AI Summary panel
3. Verify Recent Transactions list
4. Verify Relationships panel
5. Verify Verification checklist

**Sub-Flow 3c: Send Funds (Payment Creation)**
1. In the account header section, locate the action buttons:
   - "Edit" button (gray)
   - **"Send Funds" button (blue/primary)** ← Payment entry point
   - "Suspend/Activate" button (gray)
   - More options menu (gray)
2. Click the **"Send Funds"** button
3. Verify the New Payment modal opens
4. **Important:** The payment will originate from the account being viewed (Maria Garcia in this case)
5. In the modal, verify:
   - "From" account is pre-filled with current account (Maria Garcia)
   - "To" account selector is available
   - Amount input field
   - Currency selector
   - Description field
   - Payment type toggle (Transaction vs Stream)
6. Test canceling the modal
7. Test submitting a payment (if API is connected)

**Sub-Flow 3b: Payment Methods Tab** ← New Feature
1. Click "Payment Methods" tab
2. Verify header: "Payment Methods" with "Add Payment Method" button
3. Verify payment methods list shows:
   - Primary Checking (Wells Fargo, ****4521) - Default, Verified
   - USDC Wallet (Base, 0x1234...abcd) - Verified
   - Savings Account (Chase, ****8765) - Pending
4. Test "Set Default" button on non-default method
5. Test "Add Payment Method" button opens modal
6. In modal, verify:
   - Method type dropdown (Bank Account, Crypto Wallet)
   - Form fields change based on type selection
   - Bank account: Bank Name, Account Last 4, Routing Last 4
   - Wallet: Network dropdown, Wallet Address
   - "Set as default" checkbox
   - Cancel and Add buttons

---

### Flow 4: Account Detail - Business

**Route:** `/accounts/acc_biz_001`

**Steps:**
1. Navigate to TechCorp Inc's account
2. Verify business-specific fields:
   - Company name
   - EIN/Tax ID
   - Business type
   - Registered address
3. Verify tabs include business-specific content
4. In the account header section, locate the action buttons:
   - **"Create Payout" button (blue/primary)** ← Payment entry point for businesses
   - "Add Contractor" button (gray)
   - "Edit" button (gray)
   - More options menu (gray)
5. Click the **"Create Payout"** button
6. Verify the New Payment modal opens
7. **Important:** The payout will originate from the business account being viewed (TechCorp Inc)
8. The modal should pre-fill the "From" account with the business account

**Note:** Business accounts use "Create Payout" terminology, while person accounts use "Send Funds". Both open the same New Payment modal, but the terminology reflects the business context (payouts to contractors) vs personal context (sending funds to another account).

---

### Flow 5: Transactions List

**Route:** `/transactions`

**Steps:**
1. Navigate to Transactions page
2. Verify page header
3. Verify search and filter controls
4. Verify transactions table with columns:
   - Transaction ID
   - Type (Transfer, Card Spend, Deposit, etc.)
   - From/To
   - Amount
   - Status
   - Date
5. Click on a transaction row
6. Verify transaction detail panel opens

---

### Flow 6: Disputes Page ← New Feature

**Route:** `/disputes`

**Steps:**
1. Navigate to Disputes page via sidebar
2. Verify page header: "Disputes" with subtitle
3. Verify "AI Insights" button in header

**Step 6a: Alert Banner**
1. Verify alert banner shows: "2 disputes due within 7 days"
2. Verify "Review Now" button is present

**Step 6b: Status Cards**
Verify 5 status cards:
| Card | Value |
|------|-------|
| Open | 1 |
| Under Review | 1 |
| Escalated | 1 |
| Resolved | 1 |
| At Risk | $1,950 |

**Step 6c: Search and Filter**
1. Verify search input placeholder: "Search by name, ID, or transaction..."
2. Verify status dropdown with options:
   - All Status
   - Open
   - Under Review
   - Escalated
   - Resolved
3. Test filtering by different statuses

**Step 6d: Disputes Table**
Verify table columns:
- Dispute (ID, date)
- Parties (claimant → respondent)
- Amount (disputed / total)
- Reason
- Due Date (with "X days left" indicator)
- Status (badge)
- Actions (menu button)

Verify dispute rows:
| ID | Claimant | Respondent | Amount | Reason | Status |
|----|----------|------------|--------|--------|--------|
| dsp_001 | Maria Garcia | Digital Services LLC | $500 | Service Not Received | Open |
| dsp_002 | TechCorp Inc | John Smith Consulting | $250 | Incorrect Amount | Under Review |
| dsp_003 | Ana Souza | CloudSoft Inc | $1,200 | Duplicate Charge | Escalated |
| dsp_004 | Juan Perez | TechCorp Inc | $350 | Quality Issue | Resolved |

**Step 6e: Dispute Detail Slide-over**
1. Click on first dispute row (Maria Garcia)
2. Verify slide-over opens from right
3. Verify header shows:
   - "Dispute Details"
   - Dispute ID: dsp_001
   - Status badge: Open
   - Close (X) button
4. Verify "Original Transaction" section:
   - Amount: $500 USDC
   - Status: Completed with date
   - "View Transaction" link
5. Verify Parties section:
   - Claimant: Maria Garcia (Filed dispute)
   - Respondent: Digital Services LLC (Must respond)
6. Verify "Claim Details" grid:
   - Reason: Service Not Received
   - Amount Disputed: $500
   - Requested Resolution: Full Refund
   - Due Date: [date]
7. Verify "Claimant's Statement" text block
8. Verify "Admin Actions" section:
   - "Resolve Dispute" button
   - "Escalate" button
9. Click close button, verify slide-over closes

**Step 6f: Test Different Dispute States**
1. Click on Under Review dispute (dsp_002)
2. Verify status badge shows "Under Review" (blue)
3. Click on Escalated dispute (dsp_003)
4. Verify status badge shows "Escalated" (red)
5. Click on Resolved dispute (dsp_004)
6. Verify status badge shows "Resolved" (green)
7. Verify resolved disputes don't show action buttons

---

### Flow 7: Compliance Page

**Route:** `/compliance`

**Steps:**
1. Navigate to Compliance page
2. Verify compliance flags queue
3. Verify risk level badges (High, Medium, Low)
4. Click on a flag to view detail

---

### Flow 8: Cards Page

**Route:** `/cards`

**Steps:**
1. Navigate to Cards page
2. Verify cards list with:
   - Card number (masked)
   - Cardholder name
   - Type (Virtual/Physical)
   - Status
   - Balance/Limit
3. Click on a card to view detail

**Route:** `/cards/card_001`

**Steps:**
1. Verify card detail page shows:
   - Card visual
   - Card number
   - Expiry date
   - CVV (hidden)
   - Recent transactions
   - Spending limits
   - Controls (freeze, cancel)

---

### Flow 9: Treasury Page

**Route:** `/treasury`

**Steps:**
1. Navigate to Treasury page
2. Verify treasury overview:
   - Total balance across corridors
   - Float balances by currency
3. Verify corridor health indicators
4. Test adding funds flow

---

### Flow 10: Agents Page

**Route:** `/agents`

**Steps:**
1. Navigate to Agents page
2. Verify agents table with:
   - Agent name
   - Owner account
   - KYA tier
   - Status
   - Capabilities
3. Click on an agent row

**Route:** `/agents/agt_001`

**Steps:**
1. Verify agent detail with tabs:
   - Overview
   - Activity
   - Authentication
   - KYA
   - Streams
2. Verify API key display
3. Verify permissions list

---

### Flow 11: Reports Page

**Route:** `/reports`

**Steps:**
1. Navigate to Reports page
2. Verify tabs: Financial, Compliance, Activity
3. Test date range picker
4. Test export functionality
5. Verify charts and summaries

---

### Flow 12: API Keys Page

**Route:** `/api-keys`

**Steps:**
1. Navigate to API Keys page
2. Verify existing API keys list
3. Test "Create New Key" flow
4. Verify key permissions display
5. Test revoke key flow

---

### Flow 13: Webhooks Page

**Route:** `/webhooks`

**Steps:**
1. Navigate to Webhooks page
2. Verify webhook endpoints list
3. Test "Add Webhook" flow
4. Verify event type selection
5. Test webhook testing/ping

---

### Flow 14: Settings Page

**Route:** `/settings`

**Steps:**
1. Navigate to Settings page
2. Verify sections:
   - Profile settings
   - Company settings
   - Notification preferences
   - Security settings
3. Test form editing and saving

---

### Flow 15: New Payment Modal

**Entry Points:**
- **Account Detail Page (Person):** "Send Funds" button in account header
- **Account Detail Page (Business):** "Create Payout" button in account header
- **Note:** There is NO global "New Payment" button. Payments must originate from a specific account.

**Steps:**
1. Navigate to an Account Detail page (e.g., `/accounts/acc_person_001`)
2. Click the "Send Funds" button (person) or "Create Payout" button (business)
3. Verify modal opens with:
   - **From account:** Pre-filled with the account being viewed (cannot be changed)
   - **To account selector:** Dropdown to select recipient
   - **Amount input:** Enter payment amount
   - **Currency selector:** USD, USDC, etc.
   - **Description field:** Optional payment description
   - **Payment type toggle:** Transaction (one-time) vs Stream (recurring)
4. If "Stream" type selected:
   - Duration options (indefinite or fixed months)
   - Funding method (minimum or monthly)
   - Auto-pause options
5. If "Transaction" type with "Make Recurring" enabled:
   - Frequency dropdown (daily, weekly, monthly, etc.)
   - Start date picker
   - End date picker (optional)
   - Max occurrences (optional)
6. Test form validation (required fields)
7. Test canceling the modal
8. Submit and verify success (if API connected)

**Important Design Principle:**
- Payments always originate from a specific account
- The "From" account is determined by which account detail page you're viewing
- This ensures proper balance tracking and audit trails
- No global payment creation - all payments are account-scoped

---

### Flow 16: Global Search

**Steps:**
1. Click search bar in header
2. Type a search query
3. Verify search suggestions appear
4. Verify results are categorized:
   - Accounts
   - Transactions
   - Agents
5. Click a result, verify navigation

---

### Flow 17: AI Assistant

**Steps:**
1. Click floating AI button (bottom-right)
2. Verify chat panel opens
3. Type a question
4. Verify AI response appears
5. Test follow-up questions
6. Close chat panel

---

### Flow 18: Dark Mode Toggle

**Steps:**
1. Find dark mode toggle in header
2. Click to switch to dark mode
3. Verify all components render correctly in dark mode
4. Verify text is readable
5. Verify badges/status indicators maintain contrast
6. Switch back to light mode

---

### Flow 19: Sandbox/Environment Indicator

**Steps:**
1. Verify "Sandbox" badge in header
2. Click to see environment info
3. Verify environment-specific styling

---

## Error State Testing

### Empty States
Test each page with no data:
- Accounts page with no accounts
- Transactions page with no transactions
- Disputes page with no disputes
- Payment Methods tab with no methods

### Loading States
- Verify loading spinners appear during data fetch
- Verify skeleton loaders for list items

### Error States
- Test API failure handling
- Verify error messages are user-friendly
- Test retry functionality

---

## Responsive Testing

### Breakpoints
| Width | Device |
|-------|--------|
| 320px | Mobile S |
| 375px | Mobile M |
| 425px | Mobile L |
| 768px | Tablet |
| 1024px | Laptop |
| 1440px | Desktop |

### Mobile-Specific Tests
1. Verify sidebar collapses to hamburger menu
2. Verify tables become scrollable or stack
3. Verify modals are full-screen
4. Verify touch targets are 44px minimum

---

## Accessibility Testing

### Keyboard Navigation
1. Tab through all interactive elements
2. Verify focus states are visible
3. Test Enter/Space for buttons
4. Test Escape to close modals

### Screen Reader
1. Verify proper heading hierarchy
2. Verify form labels are associated
3. Verify status badges have aria-labels
4. Verify dynamic content announces changes

---

## Performance Testing

### Metrics to Monitor
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3s
- Cumulative Layout Shift (CLS) < 0.1

### Heavy Data Tests
- Load accounts page with 100+ accounts
- Load transactions with 500+ items
- Load disputes with 50+ disputes

---

## Browser Compatibility

### Required Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Test Each Browser For
- Layout consistency
- JavaScript functionality
- Form validation
- Modal behavior
- Animations

---

## Test Data Reference

### Accounts
| ID | Name | Type | Status |
|----|------|------|--------|
| acc_person_001 | Maria Garcia | Person | Active |
| acc_person_002 | Ana Souza | Person | Active |
| acc_person_003 | Juan Perez | Person | Active |
| acc_person_004 | Carlos Martinez | Person | Active |
| acc_biz_001 | TechCorp Inc | Business | Active |
| acc_biz_002 | Digital Services LLC | Business | Active |
| acc_biz_003 | CloudSoft Inc | Business | Active |

### Disputes
| ID | Status | Days Left |
|----|--------|-----------|
| dsp_001 | Open | 13 |
| dsp_002 | Under Review | 5 |
| dsp_003 | Escalated | 0 |
| dsp_004 | Resolved | — |

### Payment Methods (for acc_person_001)
| Label | Type | Status |
|-------|------|--------|
| Primary Checking | Bank Account | Default, Verified |
| USDC Wallet | Crypto Wallet | Verified |
| Savings Account | Bank Account | Pending |

---

## Checklist Summary

### Critical Flows (Must Pass)
- [x] Home dashboard loads correctly
- [x] Accounts list and detail pages work
- [x] Disputes page displays all elements
- [x] Dispute detail slide-over opens/closes
- [x] Payment Methods tab shows methods
- [x] Add Payment Method modal works
- [x] Navigation between all pages works
- [x] Dark mode toggle works
- [x] Search functionality works (Partially verified)

### Feature-Specific Tests
- [x] Dispute status filtering
- [x] Dispute status badges render correctly
- [x] Due date warnings display
- [x] Payment method verification badges
- [x] Set Default button on payment methods
- [x] AI Insights panels display
- [ ] Organization profile endpoints (API only)

### Edge Cases
- [ ] Empty state displays
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsiveness

---

## New Flows: Organization & Auth (Phase 1.5)

These flows are primarily API-level for now (the UI does not yet expose full org/team management), but Gemini should still verify them via HTTP calls.

### Flow 20: Self-Service Signup (API)

- **Goal**: Verify that a new organization and owner user can be created via API and that API keys and session tokens are returned.
- **Preconditions**:
  - API server running at `http://localhost:4000`
  - No existing user with the target email
- **Steps**:
  1. Call `POST /v1/auth/signup` with a fresh email:
     ```bash
     curl -s -X POST http://localhost:4000/v1/auth/signup \
       -H "Content-Type: application/json" \
       -d '{
         "email": "gemini-signup-<timestamp>@example.com",
         "password": "SecureP@ss123456",
         "organizationName": "Gemini Test Org <timestamp>",
         "userName": "Gemini Owner"
       }'
     ```
  2. Verify the response structure:
     - `user.id`, `user.email`, `user.name` present.
     - `tenant`/`organization` object with `id`, `name`, `status`.
     - `apiKeys.test.key` and `apiKeys.live.key` present.
     - `session.accessToken` and `session.refreshToken` present (may be `null` if token creation fails; treat as non-blocking).
  3. Confirm that keys look like:
     - `pk_test_...`
     - `pk_live_...`
  4. Confirm that keys are only shown in this response (they will not be retrievable later).

- **Expected Result**:
  - HTTP `201`.
  - Organization is created and visible in subsequent calls (see next flow).

### Flow 21: Login & Me (API)

- **Goal**: Verify login, lockout protection, and `/v1/auth/me`.
- **Steps**:
  1. Use the email/password from Flow 20.
  2. Call `POST /v1/auth/login`:
     ```bash
     curl -s -X POST http://localhost:4000/v1/auth/login \
       -H "Content-Type: application/json" \
       -d '{
         "email": "<signup-email>",
         "password": "SecureP@ss123456"
       }'
     ```
  3. Verify:
     - `user.id`, `user.email`, `user.role` (`owner`), `user.name` are present.
     - `tenant` object has `id`, `name`, `status: "active"`.
     - `session.accessToken` and `session.refreshToken` are non-empty strings.
  4. Call `GET /v1/auth/me` with the `accessToken`:
     ```bash
     TOKEN="<access-token-from-login>"
     curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/v1/auth/me
     ```
  5. Verify:
     - The same user and tenant information as login.

- **Negative Case**:
  - Call `POST /v1/auth/login` with the correct email and wrong password at least once.
  - Expected: HTTP `400` with `{ "error": "Invalid credentials" }`.

- **Expected Result**:
  - Login works with valid creds, fails correctly with invalid ones.
  - `/v1/auth/me` returns current user and organization.

### Flow 22: Organization Profile (API)

- **Goal**: Verify `GET /v1/organization` and `PATCH /v1/organization` for the current user’s organization.
- **Steps**:
  1. Obtain an `accessToken` via Flow 21.
  2. Call `GET /v1/organization`:
     ```bash
     TOKEN="<access-token-from-login>"
     curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/v1/organization
     ```
  3. Verify:
     - Response has an `organization` object.
     - Fields: `id`, `name`, `status`, `createdAt`, `updatedAt`.
  4. Call `PATCH /v1/organization` to change the name:
     ```bash
     curl -s -X PATCH http://localhost:4000/v1/organization \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
         "name": "Updated Org Name (Gemini)"
       }'
     ```
  5. Verify:
     - Response `organization.name` matches the new name.
     - `updatedAt` is later than the previous value.
  6. Call `GET /v1/organization` again and confirm the updated name persists.

- **Negative Cases**:
  - Call `GET /v1/organization` without `Authorization` → expect `401`.
  - Call `PATCH /v1/organization` with no body `{}` → expect `400` with `error: "No changes provided"`.

- **Expected Result**:
  - Authenticated users see their organization.
  - Owners/admins can rename the organization.

### Flow 23: Organization Team (API)

- **Goal**: Verify `GET /v1/organization/team` returns the list of team members for the current organization.
- **Steps**:
  1. Obtain an `accessToken` via Flow 21 (login as the owner user).
  2. Call `GET /v1/organization/team`:
     ```bash
     TOKEN="<access-token-from-login>"
     curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/v1/organization/team
     ```
  3. Verify:
     - Response has a `members` array.
     - For the initial owner-only setup:
       - `members.length` is at least 1.
       - The first member has:
         - `role: "owner"`
         - `name` matching the signup or login user (e.g., `"Test User"` / `"Gemini Owner"`).
         - `invited: false`
         - `createdAt` and `updatedAt` timestamps.
  4. (Later, when invites are implemented) verify that invited-but-not-accepted users show:
     - `invited: true`
     - `inviteExpiresAt` is in the future.
     - `inviteAcceptedAt` is `null`.

- **Negative Cases**:
  - Call `GET /v1/organization/team` without `Authorization` → expect `401`.

- **Expected Result**:
  - Authenticated users can list all team members for their organization.
  - Owners/admins can see who is active vs invited (once invites are wired).

> Note: For now, the dashboard UI does not yet expose a full organization settings page. These flows are **API-only** and are meant to ensure backend correctness before the UI is wired up.

### Flow 24: Organization Team Role & Removal Safety (API)

- **Goal**: Verify that role changes and removals are protected (cannot remove last owner, cannot leave via team API).
- **Preconditions**:
  - Only one member exists (the owner created in Flow 20).
- **Steps**:
  1. Obtain an `accessToken` via Flow 21.
  2. Try to change the owner’s role:
     ```bash
     TOKEN="<access-token-from-login>"
     OWNER_ID="<user-id-from-Flows-20-21>"
     curl -s -X PATCH http://localhost:4000/v1/organization/team/$OWNER_ID \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{ "role": "admin" }' | jq '.'
     ```
  3. Verify:
     - HTTP `400`.
     - Response `{ "error": "Cannot change role of the last owner" }`.
  4. Try to remove the owner via team API:
     ```bash
     curl -s -X DELETE http://localhost:4000/v1/organization/team/$OWNER_ID \
       -H "Authorization: Bearer $TOKEN" | jq '.'
     ```
  5. Verify:
     - HTTP `400`.
     - Response `{ "error": "Use account settings to leave organization" }`.

- **Expected Result**:
  - The last owner cannot be demoted or removed via the team API.
  - Owners must use a dedicated flow (to be implemented) to leave/transfer ownership.

---

### Flow 25: Send Team Invite (API)

- **Goal**: Verify that owners and admins can invite new members to their organization.
- **Pre-requisite**: Complete Flow 20 (signup) and Flow 21 (login) to get an `accessToken` for the owner user.
- **Steps**:
  1. Obtain the `accessToken` for the owner user.
  2. Send a POST request to create a team invite:
     ```bash
     OWNER_TOKEN="<access-token-from-login>"
     curl -s -X POST http://localhost:4000/v1/organization/team/invite \
       -H "Authorization: Bearer $OWNER_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
         "email": "newteammember@example.com",
         "role": "member",
         "name": "New Team Member"
       }' | jq '.'
     ```
  3. **Verify**:
     - HTTP `201` status code.
     - Response contains `invite` object with:
       - `id`: UUID of the invite
       - `email`: The invited email
       - `role`: The specified role
       - `name`: The specified name (optional)
       - `expiresAt`: Expiry timestamp (7 days from now)
       - `inviteUrl`: URL with token for accepting the invite
  4. **Note**: Save the `inviteUrl` token for Flow 27.
  5. Test that a viewer cannot send invites:
     ```bash
     VIEWER_TOKEN="<access-token-for-viewer>"
     curl -s -X POST http://localhost:4000/v1/organization/team/invite \
       -H "Authorization: Bearer $VIEWER_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
         "email": "unauthorized@example.com",
         "role": "member"
       }' | jq '.'
     ```
  6. **Verify**: HTTP `403` status, error: `"Forbidden"`.

- **Expected Result**:
  - Owners and admins can successfully create team invites.
  - Viewers and members are forbidden from sending invites.
  - The invite is stored with a secure token and 7-day expiry.

---

### Flow 26: List Pending Invites (API)

- **Goal**: Verify that owners and admins can view all pending (unaccepted) invites for their organization.
- **Pre-requisite**: Complete Flow 25 to create at least one pending invite.
- **Steps**:
  1. Obtain the `accessToken` for the owner user.
  2. Send a GET request to list pending invites:
     ```bash
     OWNER_TOKEN="<access-token-from-login>"
     curl -s -X GET http://localhost:4000/v1/organization/team/invites \
       -H "Authorization: Bearer $OWNER_TOKEN" | jq '.'
     ```
  3. **Verify**:
     - HTTP `200` status code.
     - Response contains `invites` array with pending invites.
     - Each invite has:
       - `id`: UUID
       - `email`: Invited email
       - `role`: Invited role
       - `name`: Invited name (if provided)
       - `expiresAt`: Expiry timestamp
       - `expired`: Boolean indicating if the invite is expired
       - `createdAt`: Creation timestamp
       - `updatedAt`: Last update timestamp
     - Accepted invites (with `accepted_at` set) are NOT in the list.

- **Expected Result**:
  - Owners and admins can see all pending invites.
  - Accepted invites are filtered out.
  - Expired invites are marked with `expired: true`.

---

### Flow 27: Accept Team Invite (API)

- **Goal**: Verify that a user can accept a team invite and join an organization.
- **Pre-requisite**: Complete Flow 25 to create an invite and obtain the `token` from the `inviteUrl`.
- **Steps**:
  1. Extract the token from the `inviteUrl` (e.g., `http://localhost:3000/accept-invite?token=<TOKEN>`).
  2. Send a POST request to accept the invite:
     ```bash
     INVITE_TOKEN="<token-from-invite-url>"
     curl -s -X POST http://localhost:4000/v1/auth/accept-invite \
       -H "Content-Type: application/json" \
       -d '{
         "token": "'$INVITE_TOKEN'",
         "password": "SecureNewPass@123",
         "name": "New Team Member"
       }' | jq '.'
     ```
  3. **Verify**:
     - HTTP `201` status code.
     - Response contains:
       - `user`: Object with `id`, `email`, `name`, `role` (as specified in the invite)
       - `tenant`: Object with organization details (`id`, `name`, `status`)
       - `session`: Object with `accessToken` and `refreshToken`
  4. Verify the new user can log in:
     ```bash
     curl -s -X POST http://localhost:4000/v1/auth/login \
       -H "Content-Type: application/json" \
       -d '{
         "email": "<invited-email>",
         "password": "SecureNewPass@123"
       }' | jq '.'
     ```
  5. **Verify**: Login succeeds, user is associated with the correct organization.
  6. Verify the user appears in the team list (Flow 23).
  7. Test edge cases:
     - **Already accepted**: Try to accept the same invite again.
       ```bash
       curl -s -X POST http://localhost:4000/v1/auth/accept-invite \
         -H "Content-Type: application/json" \
         -d '{
           "token": "'$INVITE_TOKEN'",
           "password": "AnotherPass@123"
         }' | jq '.'
       ```
       **Verify**: HTTP `400` status, error: `"This invite has already been accepted"`.
     - **Invalid token**: Use a non-existent or malformed token.
       **Verify**: HTTP `400` status, error: `"Invalid or expired invite token"`.

- **Expected Result**:
  - Users can successfully accept invites and join the organization.
  - A new user account is created (or existing account is linked if the email already exists in Supabase Auth but has no profile).
  - The user is assigned the role specified in the invite.
  - The invite is marked as accepted and no longer appears in the pending invites list.
  - Already-accepted invites cannot be reused.

---

### Flow 28: Create API Key (API)

- **Goal**: Verify that users can create new API keys for test and live environments.
- **Pre-requisite**: Complete Flow 21 (login) to get an `accessToken`.
- **Steps**:
  1. Obtain the `accessToken` for an owner or admin user.
  2. Create a test environment API key:
     ```bash
     TOKEN="<access-token-from-login>"
     curl -s -X POST http://localhost:4000/v1/api-keys \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
         "name": "Test Backend Key",
         "environment": "test",
         "description": "API key for testing"
       }' | jq '.'
     ```
  3. **Verify**:
     - HTTP `201` status code.
     - Response contains `apiKey` object with:
       - `id`: UUID
       - `name`: "Test Backend Key"
       - `environment`: "test"
       - `prefix`: First 12 chars of the key (e.g., "pk_test_abc1")
       - `key`: Full API key (shown ONCE) - format: `pk_test_<32_random_chars>`
       - `description`: "API key for testing"
       - `expiresAt`: null (or specified expiry)
       - `createdAt`: Timestamp
     - Response includes warning: "This key will only be shown once. Please save it securely."
  4. Save the full `key` value for later testing.
  5. Create a live environment API key:
     ```bash
     curl -s -X POST http://localhost:4000/v1/api-keys \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
         "name": "Production Backend Key",
         "environment": "live",
         "description": "API key for production",
         "expiresAt": "2026-12-31T23:59:59Z"
       }' | jq '.'
     ```
  6. **Verify**: Same as above, but `environment` is "live" and `expiresAt` is set.

- **Expected Result**:
  - API keys are created with 256-bit random entropy.
  - Full key is shown only once on creation.
  - Key prefix is stored for identification.
  - Keys are stored as SHA-256 hashes (not verified in API, internal only).

---

### Flow 29: List API Keys (API)

- **Goal**: Verify that users can list all API keys for their organization, with optional filtering by environment.
- **Pre-requisite**: Complete Flow 28 to create some API keys.
- **Steps**:
  1. Obtain the `accessToken`.
  2. List all API keys:
     ```bash
     TOKEN="<access-token-from-login>"
     curl -s -X GET http://localhost:4000/v1/api-keys \
       -H "Authorization: Bearer $TOKEN" | jq '.'
     ```
  3. **Verify**:
     - HTTP `200` status code.
     - Response contains `apiKeys` array.
     - Each key has:
       - `id`, `name`, `environment`, `prefix`, `description`, `status`, `expiresAt`, `lastUsedAt`, `createdAt`, `updatedAt`, `createdBy`
     - Full `key` is NOT returned (only `prefix`).
     - Keys are sorted by `createdAt` descending (newest first).
  4. Filter by test environment:
     ```bash
     curl -s -X GET "http://localhost:4000/v1/api-keys?environment=test" \
       -H "Authorization: Bearer $TOKEN" | jq '.apiKeys[] | {name, environment, prefix}'
     ```
  5. **Verify**: Only keys with `environment: "test"` are returned.
  6. Filter by live environment:
     ```bash
     curl -s -X GET "http://localhost:4000/v1/api-keys?environment=live" \
       -H "Authorization: Bearer $TOKEN" | jq '.apiKeys[] | {name, environment, prefix}'
     ```
  7. **Verify**: Only keys with `environment: "live"` are returned.

- **Expected Result**:
  - All API keys for the organization are listed.
  - Full keys are never exposed (only prefix).
  - Filtering by environment works correctly.

---

### Flow 30: Get API Key Details (API)

- **Goal**: Verify that users can retrieve detailed information about a specific API key.
- **Pre-requisite**: Complete Flow 28 or 29 to have a key ID.
- **Steps**:
  1. Obtain the `accessToken` and a key `id` from Flow 29.
  2. Get key details:
     ```bash
     TOKEN="<access-token-from-login>"
     KEY_ID="<key-id-from-list>"
     curl -s -X GET "http://localhost:4000/v1/api-keys/$KEY_ID" \
       -H "Authorization: Bearer $TOKEN" | jq '.'
     ```
  3. **Verify**:
     - HTTP `200` status code.
     - Response contains `apiKey` object with detailed fields:
       - `id`, `name`, `environment`, `prefix`, `description`, `status`, `expiresAt`
       - `lastUsedAt`, `lastUsedIp` (null if never used)
       - `createdAt`, `updatedAt`, `createdBy` (user ID)
     - Full `key` is NOT returned.

- **Expected Result**:
  - Detailed information is returned for the specified key.
  - Last used timestamp and IP are available (for auditing).

---

### Flow 31: Revoke API Key (API)

- **Goal**: Verify that users can revoke API keys with proper permission checks.
- **Pre-requisite**: Complete Flow 28 to create a key to revoke.
- **Steps**:
  1. Obtain the `accessToken` and a key `id` to revoke.
  2. Revoke the key:
     ```bash
     TOKEN="<access-token-from-login>"
     KEY_ID="<key-id-to-revoke>"
     curl -s -X DELETE "http://localhost:4000/v1/api-keys/$KEY_ID" \
       -H "Authorization: Bearer $TOKEN" | jq '.'
     ```
  3. **Verify**:
     - HTTP `200` status code.
     - Response: `{ "success": true }`.
  4. Verify the key status changed:
     ```bash
     curl -s -X GET "http://localhost:4000/v1/api-keys/$KEY_ID" \
       -H "Authorization: Bearer $TOKEN" | jq '.apiKey | {status, revokedAt: .updatedAt}'
     ```
  5. **Verify**: `status` is "revoked", `updatedAt` reflects revocation time.
  6. Test permission check - viewer trying to revoke owner's key:
     ```bash
     VIEWER_TOKEN="<viewer-access-token>"
     OWNER_KEY_ID="<owner-key-id>"
     curl -s -X DELETE "http://localhost:4000/v1/api-keys/$OWNER_KEY_ID" \
       -H "Authorization: Bearer $VIEWER_TOKEN" | jq '.'
     ```
  7. **Verify**: HTTP `403` status, error: "You can only revoke your own API keys".

- **Expected Result**:
  - API keys are immediately revoked (status changed to "revoked").
  - Members can only revoke their own keys.
  - Admins and owners can revoke any key in the organization.
  - Security event logged: `api_key_revoked`.

---

### Flow 32: Rotate API Key (API)

- **Goal**: Verify that users can rotate API keys with a 24-hour grace period.
- **Pre-requisite**: Complete Flow 28 to create a key to rotate.
- **Steps**:
  1. Obtain the `accessToken` and a key `id` to rotate.
  2. Rotate the key:
     ```bash
     TOKEN="<access-token-from-login>"
     KEY_ID="<key-id-to-rotate>"
     curl -s -X POST "http://localhost:4000/v1/api-keys/$KEY_ID/rotate" \
       -H "Authorization: Bearer $TOKEN" | jq '.'
     ```
  3. **Verify**:
     - HTTP `201` status code.
     - Response contains:
       - `newApiKey`: Object with new key details, including full `key` (shown ONCE).
       - `oldApiKey`: Object with old key `id`, `prefix`, and `gracePeriodEnds` timestamp (24 hours from now).
       - `warning`: "The new key will only be shown once. The old key will remain valid for 24 hours."
  4. Save the new `key` value.
  5. Verify the old key status:
     ```bash
     curl -s -X GET "http://localhost:4000/v1/api-keys/$KEY_ID" \
       -H "Authorization: Bearer $TOKEN" | jq '.apiKey | {status, gracePeriodEndsAt}'
     ```
  6. **Verify**: `status` is "grace_period" (if implemented) or remains "active" for 24 hours.
  7. Verify the new key is active:
     ```bash
     NEW_KEY_ID="<new-key-id-from-response>"
     curl -s -X GET "http://localhost:4000/v1/api-keys/$NEW_KEY_ID" \
       -H "Authorization: Bearer $TOKEN" | jq '.apiKey | {name, status, environment}'
     ```
  8. **Verify**: New key is `active`, name includes "(Rotated)", same environment as old key.

- **Expected Result**:
  - New API key is created with same environment and description.
  - Old key enters grace period (valid for 24 hours).
  - Full new key is shown only once.
  - Security event logged: `api_key_rotated`.

---

### Flow 33: Test JWT Auth Middleware (API)

- **Goal**: Verify that JWT tokens from Supabase Auth work with all protected API endpoints.
- **Pre-requisite**: Complete Flow 21 (login) to get a JWT access token.
- **Steps**:
  1. Login and obtain JWT access token:
     ```bash
     LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/v1/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email": "your-email@example.com", "password": "YourPassword123"}')
     JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.accessToken')
     echo "JWT Token: ${JWT_TOKEN:0:30}..."
     ```
  2. Call a protected endpoint (e.g., `/v1/api-keys`):
     ```bash
     curl -s -X GET http://localhost:4000/v1/api-keys \
       -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
     ```
  3. **Verify**:
     - HTTP `200` status code.
     - Response contains data (e.g., `apiKeys` array).
     - No authentication errors.
  4. Test with an invalid/expired JWT:
     ```bash
     curl -s -X GET http://localhost:4000/v1/api-keys \
       -H "Authorization: Bearer invalid_jwt_token" | jq '.'
     ```
  5. **Verify**: HTTP `401` status, error: "Invalid or expired session token".

- **Expected Result**:
  - JWT tokens work seamlessly with all protected endpoints.
  - Request context includes: `tenantId`, `actorType: 'user'`, `userId`, `userRole`, `userName`.
  - Invalid JWTs are rejected with clear error messages.

---

### Flow 34: Test API Key Auth Middleware (API)

- **Goal**: Verify that API keys from the `api_keys` table work with all protected API endpoints and track usage.
- **Pre-requisite**: Complete Flow 28 to create an API key.
- **Steps**:
  1. Use an API key created earlier:
     ```bash
     API_KEY="pk_test_abc123xyz..."  # From Flow 28
     ```
  2. Call a protected endpoint (e.g., `/v1/accounts`):
     ```bash
     curl -s -X GET http://localhost:4000/v1/accounts \
       -H "Authorization: Bearer $API_KEY" | jq '.'
     ```
  3. **Verify**:
     - HTTP `200` status code.
     - Response contains accounts data.
     - No authentication errors.
  4. Check that `last_used_at` and `last_used_ip` are tracked:
     ```bash
     # Login with JWT to check the API key details
     JWT_TOKEN="<your-jwt-token>"
     API_KEY_ID="<api-key-id>"
     curl -s -X GET "http://localhost:4000/v1/api-keys/$API_KEY_ID" \
       -H "Authorization: Bearer $JWT_TOKEN" | jq '.apiKey | {lastUsedAt, lastUsedIp}'
     ```
  5. **Verify**: `lastUsedAt` is recent, `lastUsedIp` is set.
  6. Test with a revoked API key:
     ```bash
     # Revoke the key first (via JWT auth)
     curl -s -X DELETE "http://localhost:4000/v1/api-keys/$API_KEY_ID" \
       -H "Authorization: Bearer $JWT_TOKEN"
     # Try to use the revoked key
     curl -s -X GET http://localhost:4000/v1/accounts \
       -H "Authorization: Bearer $API_KEY" | jq '.'
     ```
  7. **Verify**: HTTP `401` status, error: "API key is not active".

- **Expected Result**:
  - API keys work with all protected endpoints.
  - Request context includes: `tenantId`, `actorType: 'api_key'`, `apiKeyId`, `apiKeyEnvironment`.
  - `last_used_at` and `last_used_ip` are updated on each request.
  - Revoked, expired, or invalid keys are rejected.
  - Legacy API keys (from `tenants` table) still work as fallback.

---

### Flow 35: Test Auth Middleware - Multiple Auth Types (API)

- **Goal**: Verify that the auth middleware correctly handles API keys, JWTs, and agent tokens.
- **Pre-requisite**: Have API keys, JWT tokens, and agent tokens (if applicable) ready.
- **Steps**:
  1. Test API key (pk_test_*):
     ```bash
     curl -s -X GET http://localhost:4000/v1/accounts \
       -H "Authorization: Bearer pk_test_..." | jq '.accounts | length'
     ```
  2. Test JWT (eyJ*):
     ```bash
     curl -s -X GET http://localhost:4000/v1/api-keys \
       -H "Authorization: Bearer eyJ..." | jq '.apiKeys | length'
     ```
  3. Test agent token (agent_*) if applicable:
     ```bash
     curl -s -X GET http://localhost:4000/v1/some-endpoint \
       -H "Authorization: Bearer agent_..." | jq '.'
     ```
  4. Test with missing Authorization header:
     ```bash
     curl -s -X GET http://localhost:4000/v1/accounts | jq '.'
     ```
  5. **Verify**: HTTP `401` status, error: "Missing or invalid authorization header".
  6. Test with malformed token:
     ```bash
     curl -s -X GET http://localhost:4000/v1/accounts \
       -H "Authorization: Bearer invalid_token_format" | jq '.'
     ```
  7. **Verify**: HTTP `401` status, error: "Invalid token format".

- **Expected Result**:
  - All three auth types (API key, JWT, agent) work correctly.
  - Missing or malformed tokens are rejected with appropriate errors.
  - Security events are logged for all auth attempts.

---

*End of Testing Guide*

