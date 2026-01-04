# Additional Test Sections: Agentic Payments & Advanced Features

This document extends `UI_REGRESSION_TEST_PLAN.md` with test cases for:
- Transactions/Ledger
- Wallets
- Transfer Schedules
- Refunds
- Treasury Management
- Agentic Payments (x402, AP2, ACP)

---

## 20. Transactions / Transaction History

### Navigation
1. Navigate to `/dashboard/transactions` OR
2. From account detail page, click "Transactions" tab
3. **Verify URL:** `/dashboard/transactions` or `/dashboard/accounts/{id}/transactions`

### Page Header
- [ ] Title: "Transactions" or "Transaction History"
- [ ] Date range picker present
- [ ] Filter options (type, status)
- [ ] Export button

### Transactions List
- [ ] **Shows 9+ ledger entries** (may vary by account)
- [ ] **Transaction details visible:**
  - Date/timestamp
  - Type (Credit/Debit)
  - Amount with +/- indicator
  - Balance after transaction
  - Description
  - Related account (if applicable)
  - Reference ID/type

### Transaction Types
- [ ] **Credits** show with + and green color
- [ ] **Debits** show with - and red color
- [ ] Running balance column accurate
- [ ] Descriptions are meaningful

### Sample Transactions Expected
- [ ] "Payroll deposit" - $2,500 (credit)
- [ ] "Savings transfer" - $500 (debit)
- [ ] "Stream payment received" - $1,000 (credit)
- [ ] "Card purchase - Coffee Shop" - $150 (debit)

### Filtering
- [ ] Filter by type (Credit/Debit) works
- [ ] Filter by date range works
- [ ] Filter by account works (if multi-account view)
- [ ] Clear filters button works

### Network & Console
- [ ] `GET /v1/ledger-entries` or `/v1/accounts/{id}/transactions` returns **200**
- [ ] Response contains transaction array
- [ ] No console errors

---

## 21. Wallets (`/dashboard/wallets`)

### Navigation
1. Click "Wallets" in sidebar OR navigate directly
2. **Verify URL:** `/dashboard/wallets`
3. **Verify Page Title:** "Wallets" or "My Wallets"

### Page Header
- [ ] Title: "Wallets"
- [ ] "Create Wallet" or "Add Wallet" button present
- [ ] Total balance across all wallets shown

### Wallets List
- [ ] **Shows 3 wallets**
- [ ] **Wallet cards display:**
  - Wallet name
  - Purpose/description
  - Balance (large, prominent)
  - Currency (USDC)
  - Network badge (Base Mainnet)
  - Wallet address (truncated with copy button)
  - Status indicator

### Expected Wallets
1. **Personal USDC Wallet**
   - Balance: $1,500.00
   - Purpose: Daily spending
   - Network: Base Mainnet
   - Status: Active

2. **Business Operations Wallet**
   - Balance: $5,000.00
   - Purpose: Business payments and collections
   - Network: Base Mainnet
   - Status: Active

3. **x402 Payment Wallet**
   - Balance: $500.00
   - Purpose: API micropayments
   - Network: Base Mainnet
   - Status: Active
   - Spending policy visible

### Wallet Actions
- [ ] Click wallet → navigate to wallet detail page
- [ ] "Send" button visible on each wallet
- [ ] "Receive" button shows QR code/address
- [ ] "..." menu shows more options

### Spending Policies
- [ ] x402 wallet shows spending limits:
  - Max per transaction: $10
  - Max daily: $100
  - Max monthly: $1,000

### Network & Console
- [ ] `GET /v1/wallets` returns **200**
- [ ] Response contains 3 wallets
- [ ] Balances sum correctly
- [ ] No console errors

---

## 22. Transfer Schedules (`/dashboard/transfers/scheduled` or `/dashboard/schedules`)

### Navigation
1. Navigate to `/dashboard/transfers` → "Scheduled" tab OR
2. Direct: `/dashboard/schedules`
3. **Verify URL:** Contains "scheduled" or "schedules"

### Page Header
- [ ] Title: "Scheduled Transfers" or "Recurring Payments"
- [ ] "Create Schedule" button present
- [ ] Filter by status (Active/Paused)

### Schedules List
- [ ] **Shows 3 schedules**
- [ ] **Schedule details visible:**
  - Name/Description
  - From/To accounts
  - Amount
  - Frequency (Bi-weekly, Monthly)
  - Next execution date
  - Status (Active/Paused)
  - Occurrences completed

### Expected Schedules
1. **Bi-weekly Salary**
   - From: Payroll → Personal
   - Amount: $2,500
   - Frequency: Every 2 weeks
   - Status: Active
   - Completed: 6 times

2. **Monthly Savings**
   - From: Personal → Savings
   - Amount: $500
   - Frequency: Monthly (1st)
   - Status: Active
   - Completed: 6 times

3. **Payroll Funding**
   - From: Business → Payroll
   - Amount: $10,000
   - Frequency: Monthly (25th)
   - Status: Paused
   - Completed: 3 times

### Status Indicators
- [ ] Active schedules: Green badge/icon
- [ ] Paused schedules: Yellow/orange badge
- [ ] Next execution date clearly visible
- [ ] "Resume" button visible for paused schedule

### Actions
- [ ] Click schedule → view details
- [ ] "Pause" button works for active schedules
- [ ] "Resume" button works for paused schedules
- [ ] "Edit" button opens edit modal
- [ ] "Delete" button with confirmation

### Network & Console
- [ ] `GET /v1/transfer-schedules` returns **200**
- [ ] Response contains 3 schedules
- [ ] No console errors

---

## 23. Refunds (`/dashboard/refunds`)

### Navigation
1. Click "Refunds" in sidebar OR
2. From transfers page → "Refunds" tab
3. **Verify URL:** `/dashboard/refunds`

### Page Header
- [ ] Title: "Refunds"
- [ ] Filter by status (All/Pending/Completed/Failed)
- [ ] Search by refund ID or original transfer

### Refunds List
- [ ] **Shows 2 refunds**
- [ ] **Refund details visible:**
  - Refund ID
  - Original transfer reference
  - Amount
  - Status (Completed/Pending)
  - Reason
  - Reason details
  - Created date
  - Completed date (if applicable)

### Expected Refunds
1. **Refund #1**
   - Amount: $500.00
   - Status: ✅ Completed
   - Reason: Customer request
   - Details: "Duplicate payment refund"
   - Completed ~2 days ago

2. **Refund #2**
   - Amount: $2,500.00
   - Status: ⏳ Pending
   - Reason: Fraudulent
   - Details: "Under investigation"
   - Created ~1 day ago

### Status Badges
- [ ] Completed: Green badge
- [ ] Pending: Yellow badge
- [ ] Failed: Red badge (if any)

### Actions
- [ ] Click refund → view full details
- [ ] "View Original Transfer" link works
- [ ] For pending: "Update Status" button visible
- [ ] Reason displayed prominently

### Network & Console
- [ ] `GET /v1/refunds` returns **200**
- [ ] Response contains 2 refunds
- [ ] No console errors

---

## 24. Treasury Management (`/dashboard/treasury`)

### Navigation
1. Click "Treasury" in sidebar (may be under "Finance")
2. **Verify URL:** `/dashboard/treasury`
3. **Verify Page Title:** "Treasury Dashboard" or "Liquidity Management"

### Overview Cards
- [ ] **Total Float Card:**
  - Shows: $1,750,000
  - Breakdown by rail visible
  - Health indicator (Green/Yellow/Red)

- [ ] **Available Liquidity:**
  - Shows: $1,640,000
  - Percentage of total

- [ ] **Reserved/Pending:**
  - Shows pending amounts
  - Breakdown visible

### Treasury Accounts
- [ ] **Shows 3 treasury accounts**
- [ ] **Each account displays:**
  - Rail name
  - Currency
  - Total balance
  - Available balance
  - Pending amounts
  - Reserved amounts
  - Min threshold
  - Target balance
  - Status

### Expected Accounts
1. **Base Network USDC Reserve**
   - Balance: $500,000
   - Available: $450,000
   - Min: $100,000
   - Target: $500,000
   - Status: Active

2. **Circle USDC Float**
   - Balance: $250,000
   - Available: $240,000
   - Min: $50,000
   - Target: $250,000
   - Status: Active

3. **Internal Liquidity Pool**
   - Balance: $1,000,000
   - Available: $950,000
   - Min: $200,000
   - Target: $1,000,000
   - Status: Active

### Recent Transactions
- [ ] Shows last 3-5 treasury transactions
- [ ] Transaction types: Deposit, Withdrawal, Rebalance
- [ ] Expected transactions:
  - ✅ Deposit: $50,000 (5 days ago)
  - ✅ Withdrawal: $25,000 (2 days ago)
  - ✅ Rebalance: $10,000 (1 day ago)

### Charts/Visualizations
- [ ] Balance trend chart present
- [ ] Distribution pie chart (by rail)
- [ ] Health indicators visible

### Alerts (if any)
- [ ] Low balance alerts shown
- [ ] Threshold warnings visible
- [ ] Rebalance recommendations

### Network & Console
- [ ] `GET /v1/treasury/accounts` returns **200**
- [ ] `GET /v1/treasury/transactions` returns **200**
- [ ] No console errors

---

## 25. Agentic Payments - x402 Endpoints (`/dashboard/agentic/x402`)

### Navigation
1. Click "Agentic Payments" in sidebar
2. Select "x402 Endpoints" tab OR navigate to `/dashboard/agentic/x402`
3. **Verify URL:** Contains "x402" or "http-402"

### Page Header
- [ ] Title: "x402 Endpoints" or "HTTP 402 Payment Required"
- [ ] "Create Endpoint" button present
- [ ] Total revenue stat visible

### Endpoints List
- [ ] **Shows 3 endpoints**
- [ ] **Endpoint cards display:**
  - Endpoint name
  - HTTP method + path
  - Description
  - Price per call
  - Currency (USDC)
  - Total calls
  - Total revenue
  - Status (Active)
  - Payment address (truncated)

### Expected Endpoints
1. **AI Model Inference API**
   - Method: POST
   - Path: `/api/v1/inference`
   - Price: $0.0025/call
   - Calls: 1,247
   - Revenue: $2.89
   - Status: Active

2. **Data Processing API**
   - Method: POST
   - Path: `/api/v1/process`
   - Price: $0.0010/call
   - Calls: 8,523
   - Revenue: $7.23
   - Status: Active

3. **Premium Analytics**
   - Method: GET
   - Path: `/api/v1/analytics/premium`
   - Price: $0.0500/call
   - Calls: 234
   - Revenue: $11.70
   - Status: Active

### Stats Summary
- [ ] Total calls: 10,004
- [ ] Total revenue: $21.82
- [ ] Average price per call calculated

### Volume Discounts
- [ ] Endpoints with discounts show badge
- [ ] Hover/click shows discount tiers
- [ ] Discount percentages visible

### Actions
- [ ] Click endpoint → view analytics
- [ ] "Edit" button opens configuration
- [ ] "Pause" button to temporarily disable
- [ ] "View Logs" shows recent calls

### Network & Console
- [ ] `GET /v1/x402/endpoints` returns **200**
- [ ] Response contains 3 endpoints
- [ ] No console errors

---

## 26. Agentic Payments - AP2 Mandates (`/dashboard/agentic/ap2`)

### Navigation
1. From Agentic Payments section, click "AP2 Mandates"
2. **Verify URL:** `/dashboard/agentic/ap2`
3. **Verify Page Title:** "AP2 Mandates" or "Agent Payment Protocol"

### Page Header
- [ ] Title: "AP2 Mandates" or "Google Agent Payment Protocol"
- [ ] "Create Mandate" button present
- [ ] Filter by status (Active/Completed/Expired)

### Mandates List
- [ ] **Shows 3 mandates**
- [ ] **Mandate cards display:**
  - Mandate ID
  - Agent name
  - Mandate type (Payment/Intent/Cart)
  - Authorized amount
  - Used amount
  - Remaining amount
  - Usage bar/percentage
  - Execution count
  - Status
  - Expires date

### Expected Mandates
1. **Google Shopping Assistant**
   - Type: Payment
   - Authorized: $500.00
   - Used: $156.50
   - Remaining: $343.50
   - Status: Active
   - Executions: 2

2. **Gemini Business Agent**
   - Type: Intent
   - Authorized: $2,000.00
   - Used: $1,850.00
   - Remaining: $150.00
   - Status: Active
   - Executions: 12

3. **Google Shopping Cart**
   - Type: Cart
   - Authorized: $250.00
   - Used: $250.00
   - Remaining: $0.00
   - Status: Completed
   - Executions: 1

### Usage Indicators
- [ ] Progress bars show usage correctly
- [ ] Colors: Green (< 50%), Yellow (50-80%), Red (> 80%)
- [ ] Percentage labels visible

### Executions Tab
- [ ] Click "Executions" tab
- [ ] Shows 3 executions
- [ ] Execution details:
  - Execution index
  - Amount
  - Authorization proof (truncated)
  - Status (Completed/Pending)
  - Timestamp

### Expected Executions
- [ ] Shopping #1: $49.99 (completed)
- [ ] Shopping #2: $106.51 (completed)
- [ ] Business #1: $150.00 (pending)

### Actions
- [ ] Click mandate → view full details
- [ ] "Revoke" button for active mandates
- [ ] "Extend" button to add more funds
- [ ] "View Agent" link

### Network & Console
- [ ] `GET /v1/ap2/mandates` returns **200**
- [ ] `GET /v1/ap2/executions` returns **200**
- [ ] Response contains expected data
- [ ] No console errors

---

## 27. Agentic Payments - ACP Checkouts (`/dashboard/agentic/acp`)

### Navigation
1. From Agentic Payments section, click "ACP Checkouts"
2. **Verify URL:** `/dashboard/agentic/acp`
3. **Verify Page Title:** "ACP Checkouts" or "Agentic Commerce"

### Page Header
- [ ] Title: "ACP Checkouts" or "Agentic Commerce Protocol"
- [ ] Filter by status (All/Completed/Pending/Cancelled)
- [ ] Search by checkout ID or merchant

### Checkouts List
- [ ] **Shows 2 checkouts**
- [ ] **Checkout cards display:**
  - Checkout ID
  - Agent name
  - Merchant name + logo
  - Items count
  - Subtotal
  - Tax, Shipping, Discounts
  - Total amount
  - Status
  - Date

### Expected Checkouts
1. **Amazon Order (Completed)**
   - Agent: Claude Shopping Assistant
   - Merchant: Amazon
   - Items: 3
   - Subtotal: $285.97
   - Tax: $24.31
   - Shipping: $15.00
   - Discount: -$30.00
   - Total: $295.28
   - Status: ✅ Completed
   - Date: 5 days ago

2. **Office Depot Order (Pending)**
   - Agent: GPT-4 Shopping Agent
   - Merchant: Office Depot
   - Items: 2
   - Subtotal: $1,250.00
   - Tax: $106.25
   - Shipping: $0.00
   - Discount: -$125.00
   - Total: $1,231.25
   - Status: ⏳ Pending
   - Expires: In 2 hours

### Checkout Detail View
- [ ] Click checkout → view full details
- [ ] **Shows checkout items:**
  
**Amazon Items:**
  - [ ] Wireless Headphones - $199.99
  - [ ] USB-C Cable 3-Pack - $25.99
  - [ ] Phone Case (×2) - $59.98

**Office Depot Items:**
  - [ ] Standing Desk (×2) - $1,000.00
  - [ ] Ergonomic Office Chair - $250.00

### Item Details
- [ ] Each item shows:
  - Product name
  - Description
  - Image (if available)
  - Quantity
  - Unit price
  - Total price

### Shipping Address
- [ ] Shipping address visible for completed
- [ ] Address formatted properly
- [ ] Country, state, zip visible

### Actions
- [ ] For pending: "Approve" and "Cancel" buttons
- [ ] For completed: "View Receipt" button
- [ ] "Contact Merchant" link
- [ ] "Track Shipment" (if applicable)

### Network & Console
- [ ] `GET /v1/acp/checkouts` returns **200**
- [ ] `GET /v1/acp/checkouts/{id}/items` returns **200**
- [ ] Response contains all items
- [ ] No console errors

---

## 28. Card Transaction History (`/dashboard/cards/{id}/transactions`)

### Navigation
1. From payment methods page, click a card
2. Click "Transactions" tab
3. **Verify URL:** `/dashboard/cards/{id}/transactions`

### Page Header
- [ ] Card name and last 4 digits in title
- [ ] Date range picker
- [ ] Filter by type (Purchase/Refund/Decline)
- [ ] Export button

### Transactions List
- [ ] **Shows 4 card transactions**
- [ ] **Transaction details:**
  - Date/time
  - Merchant name
  - Merchant category
  - Amount
  - Type (Purchase/Decline)
  - Status (Completed/Failed)
  - Authorization code (for completed)
  - Decline reason (for failed)

### Expected Transactions
1. **Starbucks Coffee**
   - Amount: $45.67
   - Type: Purchase
   - Status: ✅ Completed
   - Category: Restaurants & Dining
   - Date: 2 days ago

2. **Amazon.com**
   - Amount: $123.45
   - Type: Purchase
   - Status: ✅ Completed
   - Category: Shopping
   - Date: 5 days ago

3. **Luxury Retailer**
   - Amount: $5,000.00
   - Type: Declined
   - Status: ❌ Failed
   - Reason: Insufficient funds
   - Date: 1 day ago

4. **Office Supplies Inc**
   - Amount: $856.32
   - Type: Purchase
   - Status: ✅ Completed
   - Category: Business Services
   - Date: 3 days ago

### Visual Indicators
- [ ] Completed: Green checkmark
- [ ] Declined: Red X with reason
- [ ] Merchant categories with icons
- [ ] Amount formatting correct

### Spending Insights
- [ ] Total spent this period shown
- [ ] Breakdown by category (chart/graph)
- [ ] Average transaction amount
- [ ] Largest transaction highlighted

### Actions
- [ ] Click transaction → view receipt/details
- [ ] "Dispute" button for completed transactions
- [ ] "Report Fraud" option
- [ ] "Download Statement" button

### Network & Console
- [ ] `GET /v1/cards/{id}/transactions` returns **200**
- [ ] Response contains 4 transactions
- [ ] No console errors

---

## Summary: Additional Test Coverage

### New Pages Tested
1. ✅ Transactions/Ledger (9 entries)
2. ✅ Wallets (3 wallets)
3. ✅ Transfer Schedules (3 schedules)
4. ✅ Refunds (2 refunds)
5. ✅ Treasury Dashboard (3 accounts)
6. ✅ x402 Endpoints (3 endpoints)
7. ✅ AP2 Mandates (3 mandates + 3 executions)
8. ✅ ACP Checkouts (2 checkouts + 5 items)
9. ✅ Card Transactions (4 transactions)

### Total Test Data
- **Core Banking:** 5 accounts, 6 transfers, 9 ledger entries, 3 wallets, 3 schedules, 2 refunds
- **Treasury:** 3 accounts, 3 transactions
- **Agents:** 3 agents, 3 streams
- **Cards:** 3 payment methods, 4 transactions
- **Compliance:** 1 flag
- **Agentic:** 3 x402, 3 AP2 mandates, 2 ACP checkouts

**Grand Total:** 50+ distinct entities with realistic relationships

---

**Complete UI test coverage for ALL PayOS features! 🎉**

