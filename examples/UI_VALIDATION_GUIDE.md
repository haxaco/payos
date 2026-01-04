# PayOS UI Validation Guide

**User**: haxaco@gmail.com  
**Environment**: Sandbox  
**Purpose**: Validate all demo transactions on the PayOS dashboard

---

## Quick Start

### Step 1: Run the Complete Demo

```bash
cd /Users/haxaco/Dev/PayOS/examples
pnpm demo
```

This will generate **$125.80 in transactions** across all three protocols.

### Step 2: Start the Web App

```bash
cd /Users/haxaco/Dev/PayOS/apps/web
pnpm dev
```

### Step 3: Login

Navigate to: http://localhost:3000

Login with: **haxaco@gmail.com**

---

## What to Validate on Each Dashboard Page

### 1. 🏠 Dashboard Home (`/dashboard`)

**Expected to See**:

```
┌──────────────────────────────────────────────┐
│ Welcome back, haxaco@gmail.com               │
├──────────────────────────────────────────────┤
│                                              │
│ Total Activity: $125.80                      │
│ Transactions Today: 6                        │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ Activity by Protocol                 │    │
│ ├──────────────────────────────────────┤    │
│ │ x402 Micropayments    $0.30    0.2%  │    │
│ │ AP2 Subscriptions    $20.00   15.9%  │    │
│ │ ACP E-commerce      $105.50   83.9%  │    │
│ └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

**✅ Validation Checklist**:
- [ ] Total activity shows $125.80
- [ ] 6 transactions visible
- [ ] Protocol breakdown correct
- [ ] Chart displays all three protocols

---

### 2. 💳 Transactions Page (`/dashboard/transactions`)

**Expected Transactions** (newest first):

| Time | Type | Description | Amount | Status |
|------|------|-------------|--------|--------|
| Just now | ACP | API Credits Store | $105.50 | ✅ Completed |
| Just now | AP2 | Week 2 Usage | $12.00 | ✅ Completed |
| Just now | AP2 | Week 1 Usage | $8.00 | ✅ Completed |
| Just now | x402 | AI Generation (3×) | $0.30 | ✅ Completed |
| Just now | x402 | Image Enhancement | $0.15 | ✅ Completed |
| Just now | x402 | Analytics | $0.05 | ✅ Completed |

**✅ Validation Checklist**:
- [ ] All 6 transactions appear
- [ ] Amounts are correct
- [ ] All show "Completed" status
- [ ] User email is haxaco@gmail.com
- [ ] Timestamps are recent (today)

**How to Check**:
1. Click on each transaction to see details
2. Verify transaction ID format
3. Check metadata (protocol, description)
4. Confirm amounts match demo output

---

### 3. 🔹 x402 Transactions (`/dashboard/x402`)

**Expected to See**:

```
┌──────────────────────────────────────────────┐
│ x402 Micropayments (haxaco@gmail.com)        │
├──────────────────────────────────────────────┤
│ Total Spent: $0.30                           │
│ API Calls: 3                                 │
│ Average: $0.10 per call                      │
│                                              │
│ Recent Requests:                             │
│ ┌────────────────────────────────────────┐  │
│ │ POST /api/ai/generate       $0.10  ✅ │  │
│ │ GET /api/analytics/insights $0.05  ✅ │  │
│ │ POST /api/images/enhance    $0.15  ✅ │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Provider: haxaco@gmail.com                   │
│ Daily Limit: $10.00 ($9.70 remaining)        │
└──────────────────────────────────────────────┘
```

**✅ Validation Checklist**:
- [ ] Total spent: $0.30
- [ ] 3 API requests visible
- [ ] Endpoints match demo output
- [ ] Prices correct ($0.10, $0.05, $0.15)
- [ ] Daily limit shows $9.70 remaining
- [ ] All requests marked as completed

**Details to Check**:
- Request timestamps
- HTTP methods (POST, GET)
- Endpoint paths
- Payment status
- Provider information

---

### 4. 🔹 AP2 Mandates (`/dashboard/ap2` or `/dashboard/mandates`)

**Expected to See**:

```
┌──────────────────────────────────────────────┐
│ AP2 Mandates (haxaco@gmail.com)              │
├──────────────────────────────────────────────┤
│                                              │
│ AI Credits Subscription                      │
│ ┌────────────────────────────────────────┐  │
│ │ Status: Cancelled                      │  │
│ │ Authorized: $50.00                     │  │
│ │ Used: $20.00 (40%)                     │  │
│ │ Remaining: $30.00                      │  │
│ │                                        │  │
│ │ [████████░░░░░░░░░░] 40%              │  │
│ │                                        │  │
│ │ Execution History:                     │  │
│ │ • Week 1: $8.00  (800 API calls)      │  │
│ │ • Week 2: $12.00 (1200 API calls)     │  │
│ │                                        │  │
│ │ Total Executions: 2                    │  │
│ │ Cancelled: Today                       │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**✅ Validation Checklist**:
- [ ] Mandate shows "Cancelled" status
- [ ] Authorization: $50.00
- [ ] Used: $20.00
- [ ] Remaining: $30.00
- [ ] Utilization bar at 40%
- [ ] 2 executions in history
- [ ] Week 1: $8.00 visible
- [ ] Week 2: $12.00 visible
- [ ] Cancellation timestamp present

**Details to Check**:
- Mandate ID format
- Agent information
- Execution timestamps
- Description text
- Cancellation reason

---

### 5. 🔹 ACP Checkouts (`/dashboard/acp` or `/dashboard/orders`)

**Expected to See**:

```
┌──────────────────────────────────────────────┐
│ ACP Orders (haxaco@gmail.com)                │
├──────────────────────────────────────────────┤
│                                              │
│ Order #order_1704298000000                   │
│ ┌────────────────────────────────────────┐  │
│ │ Merchant: API Credits Store            │  │
│ │ Status: ✅ Completed                   │  │
│ │                                        │  │
│ │ Items (2):                             │  │
│ │ • API Credits - Starter Pack × 2      │  │
│ │   $45.00 each = $90.00                │  │
│ │ • Premium Support × 1                  │  │
│ │   $20.00 each = $20.00                │  │
│ │                                        │  │
│ │ Subtotal:        $110.00              │  │
│ │ Tax:              +$5.50              │  │
│ │ Discount:        -$10.00 (WELCOME10)  │  │
│ │ ───────────────────────────           │  │
│ │ Total:           $105.50 ✅           │  │
│ │                                        │  │
│ │ Transfer ID: txn_1767488105822        │  │
│ │ Completed: Today                       │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**✅ Validation Checklist**:
- [ ] Order status: Completed
- [ ] 2 items in order
- [ ] Item 1: API Credits × 2 = $90
- [ ] Item 2: Premium Support × 1 = $20
- [ ] Subtotal: $110.00
- [ ] Tax: $5.50
- [ ] Discount: $10.00 (WELCOME10)
- [ ] Total: $105.50
- [ ] Transfer ID present
- [ ] Completion timestamp visible

**Details to Check**:
- Order ID format
- Merchant information
- Item descriptions
- Quantity and pricing
- Promo code applied
- Receipt/invoice link

---

### 6. 📊 Analytics Page (`/dashboard/analytics`)

**Expected to See**:

```
┌──────────────────────────────────────────────┐
│ Analytics Overview (haxaco@gmail.com)        │
├──────────────────────────────────────────────┤
│                                              │
│ Today's Activity                             │
│ ┌────────────────────────────────────────┐  │
│ │ Total Volume:        $125.80           │  │
│ │ Transactions:        6                 │  │
│ │ Average Transaction: $20.97            │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ By Protocol:                                 │
│ ┌────────────────────────────────────────┐  │
│ │ x402                                   │  │
│ │ [█] $0.30 (0.2%)                      │  │
│ │                                        │  │
│ │ AP2                                    │  │
│ │ [████████] $20.00 (15.9%)             │  │
│ │                                        │  │
│ │ ACP                                    │  │
│ │ [██████████████████████████] $105.50  │  │
│ │ (83.9%)                                │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Trends:                                      │
│ [Line chart showing activity spike today]    │
└──────────────────────────────────────────────┘
```

**✅ Validation Checklist**:
- [ ] Total volume: $125.80
- [ ] Transaction count: 6
- [ ] Average: $20.97
- [ ] Protocol breakdown percentages correct
- [ ] Charts display properly
- [ ] x402: $0.30 (0.2%)
- [ ] AP2: $20.00 (15.9%)
- [ ] ACP: $105.50 (83.9%)

---

## Step-by-Step Validation Process

### Phase 1: Run Demo & Start UI

```bash
# Terminal 1: Run the demo
cd /Users/haxaco/Dev/PayOS/examples
pnpm demo

# Wait for completion (~8 seconds)
# You should see: "Grand Total: $125.80"

# Terminal 2: Start web app
cd /Users/haxaco/Dev/PayOS/apps/web
pnpm dev

# Terminal 3: Start API server (if not running)
cd /Users/haxaco/Dev/PayOS/apps/api
pnpm dev
```

### Phase 2: Navigate Dashboard

1. **Open Browser**: http://localhost:3000
2. **Login**: haxaco@gmail.com
3. **Check Home**: Verify total activity
4. **Check Each Section**: Follow checklists above

### Phase 3: Detailed Verification

For each transaction type:

#### x402 Transactions
```bash
# Click on x402 section
# Expected: 3 API requests
# Verify:
- POST /api/ai/generate: $0.10
- GET /api/analytics/insights: $0.05
- POST /api/images/enhance: $0.15
```

#### AP2 Mandate
```bash
# Click on AP2/Mandates section
# Expected: 1 cancelled mandate
# Verify:
- Authorization: $50
- Used: $20 (40%)
- 2 executions
- Status: Cancelled
```

#### ACP Order
```bash
# Click on ACP/Orders section
# Expected: 1 completed order
# Verify:
- 2 items
- Total: $105.50
- Status: Completed
- Transfer ID present
```

---

## Common Issues & Solutions

### Issue 1: No Transactions Showing

**Problem**: Dashboard is empty

**Solution**:
```bash
# 1. Check if demo ran successfully
cd /Users/haxaco/Dev/PayOS/examples
pnpm demo
# Look for "Grand Total: $125.80" at the end

# 2. Verify API server is running
cd /Users/haxaco/Dev/PayOS/apps/api
pnpm dev

# 3. Check database connection
# Transactions should be in sandbox mode
```

### Issue 2: Wrong User Data Showing

**Problem**: Seeing other user's transactions

**Solution**:
```bash
# 1. Verify login
# Ensure logged in as: haxaco@gmail.com

# 2. Check user context
# Dashboard should show: "haxaco@gmail.com" in header

# 3. Filter by user
# Use account filter: acct_haxaco_test
```

### Issue 3: Amounts Don't Match

**Problem**: Transaction amounts are different

**Solution**:
```bash
# 1. Re-run demo to reset
cd /Users/haxaco/Dev/PayOS/examples
pnpm demo

# 2. Check demo output
# Verify these exact amounts:
# x402: $0.30
# AP2: $20.00
# ACP: $105.50

# 3. Refresh browser
# Clear cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Issue 4: Status Not Updating

**Problem**: Transactions show "Pending"

**Solution**:
```bash
# 1. Check sandbox mode
# In sandbox, all should complete immediately

# 2. Refresh data
# Click refresh button or reload page

# 3. Check API logs
cd /Users/haxaco/Dev/PayOS/apps/api
# Look for any errors in console
```

---

## Database Queries for Verification

If you have database access, verify with these queries:

### Check All Transactions
```sql
SELECT 
  id,
  user_email,
  amount,
  currency,
  protocol,
  status,
  created_at
FROM transactions
WHERE user_email = 'haxaco@gmail.com'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Expected**: 6 rows

### Check x402 Requests
```sql
SELECT 
  endpoint,
  amount,
  status
FROM x402_requests
WHERE user_email = 'haxaco@gmail.com'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Expected**: 3 rows ($0.10, $0.05, $0.15)

### Check AP2 Mandate
```sql
SELECT 
  mandate_id,
  authorized_amount,
  used_amount,
  remaining_amount,
  execution_count,
  status
FROM ap2_mandates
WHERE account_id = 'acct_haxaco_test'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Expected**: 1 row (status: 'cancelled')

### Check ACP Checkout
```sql
SELECT 
  checkout_id,
  total_amount,
  status,
  items_count
FROM acp_checkouts
WHERE customer_email = 'haxaco@gmail.com'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Expected**: 1 row ($105.50, status: 'completed')

---

## Screenshots to Take

Document your validation with these screenshots:

1. **Dashboard Home** - Showing total $125.80
2. **Transactions List** - All 6 transactions
3. **x402 Section** - 3 API requests
4. **AP2 Section** - Cancelled mandate with 40% utilization
5. **ACP Section** - Completed order with 2 items
6. **Analytics** - Protocol breakdown chart

---

## Success Criteria

✅ **UI Validation Complete** when you can confirm:

- [ ] Dashboard shows $125.80 total activity
- [ ] 6 transactions visible in list
- [ ] x402: 3 requests totaling $0.30
- [ ] AP2: 1 mandate with $20 used
- [ ] ACP: 1 order totaling $105.50
- [ ] All transactions for haxaco@gmail.com
- [ ] All statuses show "Completed" (except cancelled mandate)
- [ ] Charts and visualizations render correctly
- [ ] No errors in browser console
- [ ] Data refreshes properly

---

## Next Steps After Validation

Once UI validation is complete:

1. **Test Filters**: Filter by protocol, date, status
2. **Test Search**: Search for transaction IDs
3. **Test Export**: Export transaction data
4. **Test Details**: Click into each transaction
5. **Test Pagination**: If more than 10 transactions
6. **Test Sorting**: Sort by amount, date, protocol

---

## Support

If validation fails:

1. Check demo output matches expected amounts
2. Verify API server logs for errors
3. Check browser console for JS errors
4. Verify database contains transactions
5. Try clearing browser cache
6. Re-run demo if needed

---

**User**: haxaco@gmail.com  
**Expected Total**: $125.80  
**Transactions**: 6  
**Protocols**: x402, AP2, ACP  
**Status**: All should be visible on dashboard

**Happy validating!** 🎉

