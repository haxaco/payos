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

### Edge Cases
- [ ] Empty state displays
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsiveness

---

*End of Testing Guide*

