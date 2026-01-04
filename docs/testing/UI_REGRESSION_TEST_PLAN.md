# PayOS Dashboard - Comprehensive UI Regression Test Plan

**Version:** 1.0  
**Date:** 2026-01-02  
**Tester:** Gemini (AI Frontend)  
**Test User:** haxaco@gmail.com  
**Tenant:** Haxaco Development (`dad4308f-f9b6-4529-a406-7c2bdf3c6071`)  
**Expected Data:**
- **5 accounts** with realistic balances ($15K - $130K)
- **6 transfers** (3 completed, 1 pending, 1 processing, 1 failed)
- **3 agents** (2 active payment agents, 1 treasury agent)
- **3 streams** (2 active, 1 paused)
- **3 payment methods** (2 active cards, 1 frozen)
- **1 compliance flag** (open, medium risk)

---

## Test Environment Setup

### Prerequisites
- [ ] API server running on `http://localhost:4000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] User logged in as `haxaco@gmail.com`
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Clear browser cache before starting

### Test Accounts Available
1. **Personal Checking** (person)
   - Balance: $15,500.50 total ($15,000.50 available, $500 in streams)
   - Has 2 payment methods (1 active card, 1 frozen card)
   - Receiving salary stream from Payroll Account
   - Sending savings stream to Savings Account
   
2. **Business Account** (business)
   - Balance: $50,000.00 total ($48,250.75 available, $1,749.25 in streams)
   - Has 2 agents (Payroll Agent, Accounting Agent)
   - Has 1 active payment method
   - Has 1 compliance flag (high velocity, medium risk)
   - Has 1 paused stream to Payroll Account
   
3. **Savings Account** (person)
   - Balance: $8,500.00 (all available)
   - Receiving savings stream from Personal Checking
   
4. **Payroll Account** (business)
   - Balance: $130,000.00 total ($125,000 available, $5,000 in streams)
   - Has 1 agent (Treasury Agent)
   - Sending salary stream to Personal Checking
   
5. **Investment Account** (person)
   - Balance: $32,500.00 (all available)
   - Has 1 failed transfer (insufficient funds)

---

## 1. Dashboard Overview (`/dashboard`)

### Navigation
1. Navigate to `http://localhost:3000/dashboard`
2. **Verify URL:** Should be `/dashboard`
3. **Verify Page Title:** "Dashboard" or "Overview"

### Stats Cards
- [ ] **Accounts Card:**
  - Shows number: **5**
  - Icon present
  - No hardcoded fallback (12,847)
  - Clickable → redirects to `/dashboard/accounts`

- [ ] **Volume Card:**
  - Shows: "$2.4M" (placeholder)
  - Icon present
  - Label: "Volume" or "Total Volume"

- [ ] **Cards Card:**
  - Shows: "8234" (placeholder)
  - Icon present
  - Label: "Cards"

- [ ] **Compliance Flags Card:**
  - Shows number: **0** (or actual count)
  - Icon present
  - Clickable → redirects to `/dashboard/compliance`

### Charts/Graphs
- [ ] Volume chart present (if implemented)
- [ ] No broken images
- [ ] No console errors
- [ ] Loading states work properly

### Network Requests
- [ ] Check Network tab: `GET /v1/accounts?limit=1` returns **200**
- [ ] Response contains `pagination.total = 5`
- [ ] No 401, 403, or 500 errors
- [ ] Auth token present in request headers

### Console
- [ ] No JavaScript errors
- [ ] No "Invalid time value" errors
- [ ] No "undefined" or "null" errors

---

## 2. Accounts List (`/dashboard/accounts`)

### Navigation
1. Click "Accounts" in sidebar OR click "Accounts" stat card
2. **Verify URL:** `/dashboard/accounts`
3. **Verify Page Title:** "Accounts"

### Page Header
- [ ] Title: "Accounts" with count badge showing **5**
- [ ] "Create Account" button present and visible
- [ ] Search bar present
- [ ] Filter dropdown present (if implemented)

### Accounts Table/List
- [ ] Shows **5 accounts** (no more, no less)
- [ ] Each account shows:
  - Account name (e.g., "Personal Checking")
  - Account type badge (person/business)
  - Email address
  - Balance: $0.00 or formatted currency
  - Status indicator
  - Created date (formatted, not "Invalid Date")
  - Actions menu (3 dots or similar)

- [ ] **Account Names Visible:**
  - Personal Checking
  - Business Account
  - Savings Account
  - Payroll Account
  - Investment Account

- [ ] **Type Badges Correct:**
  - 3 "person" accounts
  - 2 "business" accounts

- [ ] **No Duplicate Accounts**
- [ ] **No Accounts from Other Tenants**
- [ ] **Accounts are clickable** → navigate to detail page

### Pagination
- [ ] Shows "Page 1 of 1" or "Showing 5 of 5"
- [ ] If 50 items per page: all 5 on one page
- [ ] Pagination controls visible (even if disabled)
- [ ] Page numbers accurate

### Search Functionality
- [ ] Type "Personal" in search box
- [ ] Should filter to show only "Personal Checking"
- [ ] Clear search → shows all 5 accounts again
- [ ] Type "Invalid" → shows empty state with message

### Empty State (Search)
- [ ] Search for "ZZZZZ" (no results)
- [ ] Should show empty state message: "No accounts found matching 'ZZZZZ'"
- [ ] Shows illustration or icon
- [ ] "Clear search" or similar action

### Loading State
- [ ] Refresh page
- [ ] Should show skeleton loaders while fetching
- [ ] Smooth transition to actual data
- [ ] No flash of wrong content

### Network & Console
- [ ] `GET /v1/accounts?limit=50&page=1` returns **200**
- [ ] Response has 5 accounts in `data.data`
- [ ] No console errors
- [ ] No infinite loading states

---

## 3. Account Detail Page (`/dashboard/accounts/{id}`)

### Navigation
1. From accounts list, click on **"Personal Checking"**
2. **Verify URL:** `/dashboard/accounts/acf063fe-d2da-4e47-a3fa-7ec796978e26`
3. **Verify Page Title:** "Personal Checking" or account name

### Account Header
- [ ] Account name: "Personal Checking"
- [ ] Account type badge: "person"
- [ ] Account ID displayed (truncated or full)
- [ ] Status indicator: "Active" or similar
- [ ] Edit button present
- [ ] Delete/Actions menu present

### Tabs Navigation
- [ ] **Tabs visible:** Overview, Transactions, Streams, Agents
- [ ] **Default tab:** Overview
- [ ] Click each tab → smooth transition, no errors
- [ ] URL updates with tab (e.g., `?tab=transactions`)

### Overview Tab
- [ ] **Account Details Card:**
  - Name: "Personal Checking"
  - Type: "Person"
  - Email: "personal@haxaco.com"
  - Status: "Active"
  - Verification: Shows tier/status
  - Currency: "USDC" or "USD"
  - Created date: Formatted properly (not "Invalid Date")
  - Updated date: Formatted properly or "N/A"

- [ ] **Balance Card:**
  - Available balance: $0.00 (or actual)
  - Total balance: $0.00
  - In streams: $0.00
  - Holds: $0.00
  - Currency symbol correct

- [ ] **Recent Activity:** (if implemented)
  - Shows empty state: "No recent activity"
  - Or: Shows placeholder message

### Transactions Tab
- [ ] Click "Transactions" tab
- [ ] **Shows transactions** for this account:
  - Incoming and outgoing transfers
  - Dates formatted properly
  - Amounts with correct sign (+ for incoming, - for outgoing)
  - Status badges
  
- [ ] **For Personal Checking:**
  - Shows "Savings contribution" - $500 (outgoing)
  - Shows "Payroll payment" + $2,500 (incoming)
  - Shows "Monthly savings" - $500 (pending, outgoing)
  
- [ ] No errors in console
- [ ] Tab indicator shows active state

### Streams Tab
- [ ] Click "Streams" tab
- [ ] **Shows streams** for this account:
  
- [ ] **For Personal Checking:**
  - **Incoming:** Salary stream from Payroll Account ($1,000/month, active)
  - **Outgoing:** Savings stream to Savings Account ($500/month, active)
  - Shows flow rates
  - Shows status badges
  - Shows total streamed amounts
  
- [ ] **For Business Account:**
  - Shows paused stream to Payroll Account ($10,000/month, paused)
  - "Resume" button visible
  
- [ ] No errors in console

### Agents Tab
- [ ] Click "Agents" tab
- [ ] **For Business Accounts:**
  - Shows list of agents
  - Business Account: 2 agents (Payroll Agent, Accounting Agent)
  - Payroll Account: 1 agent (Treasury Agent)
  - Each shows: Name, Type, Status, Limits
  - "View Details" and "Manage" buttons
  
- [ ] **For Personal Accounts:**
  - Empty state: "No agents"
  - Explanation: "Agents are only available for business accounts"
  
- [ ] No errors in console
- [ ] Badge shows correct count

### Date Formatting
- [ ] **All dates formatted properly:**
  - Created: "Jan 2, 2026" or similar (not "Invalid Date")
  - Updated: Shows date or "N/A" (not crash)
  - No "Invalid time value" errors

### Network & Console
- [ ] `GET /v1/accounts/{id}` returns **200**
- [ ] Response has account data
- [ ] No double-nesting issues causing blank page
- [ ] No console errors
- [ ] No infinite loading

### Test All 5 Accounts
Repeat account detail test for:
- [ ] Business Account
- [ ] Savings Account  
- [ ] Payroll Account
- [ ] Investment Account

---

## 4. Account 360 View (`/dashboard/accounts/{id}/360`)

### Navigation
1. From **Personal Checking** detail page, find "360 View" button/link
2. Click "360 View"
3. **Verify URL:** `/dashboard/accounts/acf063fe-d2da-4e47-a3fa-7ec796978e26/360`
4. **Verify Page Title:** "Account 360" or similar

### Page Header
- [ ] Account name: "Personal Checking"
- [ ] Account type badge visible
- [ ] "Refresh" button present
- [ ] "Back" navigation works
- [ ] Last updated timestamp shown

### Balance Card
- [ ] **Currencies Section:**
  - Shows USD/USDC balance
  - Available: $0.00
  - Pending incoming: $0.00
  - Pending outgoing: $0.00
  - Holds: $0.00
  - Total: $0.00

- [ ] **USD Equivalent:**
  - Available: $0.00
  - Total: $0.00

### Activity Card (30-day summary)
- [ ] Period: "Last 30 days"
- [ ] **Transfers:**
  - Count: 3+ (incoming/outgoing from this account)
  - Volume: Shows total amount
  - Average: Calculated correctly
  - Success rate: Shows percentage

- [ ] **Recent Transfers:**
  - Shows recent transfers involving this account
  - "Payroll payment" - $2,500 (incoming, completed)
  - "Monthly savings" - $500 (outgoing, pending)
  - Dates formatted properly

### Agents Card
- [ ] **Agent List:**
  - Shows agents if account is business type
  - For Business Account: Shows 2 agents (Payroll Agent, Accounting Agent)
  - For Payroll Account: Shows 1 agent (Treasury Agent)
  - For Personal accounts: Shows "No agents" (correct)

- [ ] **Agent Details:**
  - Name
  - Type
  - Status
  - Limits
  - "View Details" link

### Limits Card
- [ ] **Daily Limit:**
  - Limit amount shown
  - Used: $0.00
  - Remaining: Shows full limit
  - Percentage bar: 0% used
  - Resets at: Shows next reset time

- [ ] **Monthly Limit:**
  - Limit amount shown
  - Used: $0.00
  - Remaining: Shows full limit
  - Percentage bar: 0% used
  - Resets at: Shows next reset time

### Compliance Card
- [ ] KYB/KYC Status: Shows status
- [ ] Tier: Shows tier number
- [ ] Risk Level: "Low" for most, "Medium" for Business Account
- [ ] **Flags:**
  - Business Account: Shows 1 flag (high velocity)
  - Other accounts: 0 flags
- [ ] **For Business Account flag:**
  - Shows flag summary
  - "View Details" link
  - Risk level indicator

### Payment Methods Card (if implemented)
- [ ] Shows list or empty state
- [ ] "Add Payment Method" button present

### Suggested Actions
- [ ] Shows action buttons:
  - "Create Transfer"
  - "Add Agent"
  - "View Transactions"
  - Or similar context-aware actions

### Error States
- [ ] **No 404 Error** (this was the reported bug)
- [ ] **No "Account not found" error**
- [ ] **No "Tenant mismatch" error**
- [ ] All data loads successfully

### Network & Console
- [ ] `GET /v1/context/account/{id}` returns **200** (not 404!)
- [ ] Response contains all expected sections
- [ ] Check API server logs for: `[Context API] Account found: {...}`
- [ ] No `[Context API] Tenant mismatch` errors
- [ ] No console errors

### Test Edge Cases
- [ ] Try 360 view for **all 5 accounts**
- [ ] All should load without 404 errors
- [ ] Data should be account-specific
- [ ] No cross-tenant data leakage

---

## 5. Transfers (`/dashboard/transfers`)

### Navigation
1. Click "Transfers" in sidebar
2. **Verify URL:** `/dashboard/transfers`
3. **Verify Page Title:** "Transfers"

### Transfers List
- [ ] **Shows 6 transfers** in the list
- [ ] **Statuses visible:**
  - 3 "Completed" (green badge)
  - 1 "Pending" (yellow badge)
  - 1 "Processing" (blue badge)
  - 1 "Failed" (red badge)
- [ ] **Transfer details show:**
  - From/To account names
  - Amount with currency
  - Description
  - Created date
  - Status
- [ ] **Completed transfers:**
  - "Savings contribution" - $500
  - "Payroll payment" - $2,500
  - "Business to Payroll funding" - $15,000
- [ ] **Pending:** "Monthly savings" - $500
- [ ] **Processing:** "Vendor payment" - $1,749.25
- [ ] **Failed:** "Investment withdrawal" - $50,000 (insufficient funds)

### Create Transfer Button
- [ ] Click "Create Transfer" button
- [ ] Modal/form opens or navigates to creation page
- [ ] Form has fields: From Account, To Account, Amount
- [ ] Can close/cancel without error

### Network & Console
- [ ] `GET /v1/transfers?limit=50` returns **200**
- [ ] Response has empty data array or pagination.total = 0
- [ ] No errors in console

---

## 6. Agents (`/dashboard/agents`)

### Navigation
1. Click "Agents" in sidebar
2. **Verify URL:** `/dashboard/agents`
3. **Verify Page Title:** "Agents" or "AI Agents"

### Agents List
- [ ] **Shows 3 agents** in the list
- [ ] **Agent details visible:**
  - Name
  - Type (Payment, Treasury, Custom)
  - Parent account
  - Status (Active)
  - Daily/Monthly limits
  - Created date
  
- [ ] **Agents present:**
  1. **Payroll Agent**
     - Type: Payment
     - Parent: Business Account
     - Daily limit: $10,000
     - Monthly limit: $100,000
     - Status: Active
     
  2. **Accounting Agent**
     - Type: Custom
     - Parent: Business Account
     - Daily limit: $0 (read-only)
     - Monthly limit: $0
     - Status: Active
     
  3. **Treasury Agent**
     - Type: Treasury
     - Parent: Payroll Account
     - Daily limit: $50,000
     - Monthly limit: $500,000
     - Status: Active

### Create Agent Button
- [ ] Click "Create Agent"
- [ ] Modal/form opens
- [ ] Form has fields: Name, Parent Account, Type
- [ ] Can close/cancel without error

### Network & Console
- [ ] `GET /v1/agents?limit=50` returns **200**
- [ ] Response has empty data array
- [ ] No errors in console

---

## 7. Streams (`/dashboard/streams`)

### Navigation
1. Click "Streams" in sidebar (if available)
2. **Verify URL:** `/dashboard/streams`
3. **Verify Page Title:** "Streams" or "Money Streams"

### Streams List
- [ ] **Shows 3 streams** in the list
- [ ] **Stream details visible:**
  - From/To accounts
  - Flow rate (per month)
  - Status (Active/Paused)
  - Category
  - Started date
  - Total streamed
  
- [ ] **Streams present:**
  1. **Salary Stream**
     - From: Payroll Account → Personal Checking
     - Rate: $1,000/month
     - Status: Active
     - Category: Salary
     - Started: 30 days ago
     
  2. **Savings Stream**
     - From: Personal Checking → Savings Account
     - Rate: $500/month
     - Status: Active
     - Category: Other
     - Started: 60 days ago
     
  3. **Payroll Funding Stream**
     - From: Business Account → Payroll Account
     - Rate: $10,000/month
     - Status: Paused
     - Category: Other
     - Paused: 5 days ago

### Network & Console
- [ ] API request successful
- [ ] No errors in console

---

## 8. Payment Methods (`/dashboard/payment-methods` or `/dashboard/cards`)

### Navigation
1. Click "Cards" or "Payment Methods" in sidebar
2. **Verify URL:** `/dashboard/cards` or `/dashboard/payment-methods`

### Payment Methods List
- [ ] **Shows 3 payment methods** in the list
- [ ] **Card details visible:**
  - Label/Name
  - Last 4 digits
  - Account linked to
  - Status (Active/Frozen)
  - Created date
  
- [ ] **Cards present:**
  1. **Virtual Card - Personal**
     - Last 4: •••• 4242
     - Account: Personal Checking
     - Status: Active
     - Created: 60 days ago
     
  2. **Business Card**
     - Last 4: •••• 8888
     - Account: Business Account
     - Status: Active
     - Created: 45 days ago
     
  3. **Frozen Card**
     - Last 4: •••• 1234
     - Account: Personal Checking
     - Status: Frozen
     - Reason: User requested
     - Frozen: 10 days ago

### Network & Console
- [ ] API request successful
- [ ] No errors in console

---

## 9. Compliance (`/dashboard/compliance`)

### Navigation
1. Click "Compliance" in sidebar
2. **Verify URL:** `/dashboard/compliance`
3. **Verify Page Title:** "Compliance" or "Compliance Flags"

### Page Content
- [ ] Shows compliance flags count: **1**
- [ ] **Flag details visible:**
  - Flag type
  - Risk level
  - Status
  - Account affected
  - Reason
  - Created date
  
- [ ] **Flag present:**
  - **High Velocity Flag**
    - Type: Account
    - Risk Level: Medium
    - Status: Open
    - Account: Business Account
    - Reason: Unusual transaction velocity detected
    - Description: Unusual number of transactions in 24h period
    - Created: 3 days ago
    
- [ ] **Actions available:**
  - View details
  - Investigate
  - Resolve
  - Dismiss

### Network & Console
- [ ] `GET /v1/compliance/flags` returns **200**
- [ ] Response shows 0 flags
- [ ] No errors in console

---

## 10. Reports (`/dashboard/reports`)

### Navigation
1. Click "Reports" in sidebar (if available)
2. **Verify URL:** `/dashboard/reports`
3. **Verify Page Title:** "Reports"

### Page Content
- [ ] Report options visible
- [ ] Date range picker present
- [ ] Export buttons visible
- [ ] No errors on page load

### Network & Console
- [ ] API requests successful
- [ ] No errors in console

---

## 11. API Keys (`/dashboard/api-keys`)

### Navigation
1. Click "Settings" → "API Keys" OR direct navigate
2. **Verify URL:** `/dashboard/api-keys`
3. **Verify Page Title:** "API Keys"

### Page Content
- [ ] Shows list of API keys (if any)
- [ ] "Create API Key" button present
- [ ] Environment toggle: Test/Live
- [ ] Each key shows: Name, Environment, Created date
- [ ] Keys are masked/hidden by default
- [ ] "Reveal" button shows key when clicked

### Create API Key
- [ ] Click "Create API Key"
- [ ] Modal opens
- [ ] Form has: Name, Environment, Permissions
- [ ] Can submit (creates key)
- [ ] New key shown once with copy button
- [ ] Warning: "Save this key, won't be shown again"

### Network & Console
- [ ] `GET /v1/api-keys` returns **200**
- [ ] Response contains key list
- [ ] No keys exposed in console/network (should be hashed)
- [ ] No errors

---

## 12. Settings / Organization (`/dashboard/settings`)

### Navigation
1. Click user avatar → "Settings" OR sidebar "Settings"
2. **Verify URL:** `/dashboard/settings`

### Tabs/Sections
- [ ] Profile/Account section
- [ ] Organization/Tenant details
- [ ] Team members (if implemented)
- [ ] Billing (if implemented)
- [ ] Security settings

### Organization Details
- [ ] Tenant Name: "Haxaco Development"
- [ ] Tenant ID visible
- [ ] User email: "haxaco@gmail.com"
- [ ] User role: "Owner" or similar

### Network & Console
- [ ] Profile data loads successfully
- [ ] No errors in console

---

## 13. Navigation & Layout

### Sidebar Navigation
- [ ] All navigation links present:
  - Dashboard
  - Accounts
  - Transfers
  - Agents
  - Streams
  - Cards/Payment Methods
  - Compliance
  - Reports
  - Settings

- [ ] Active link highlighted
- [ ] Icons present for each link
- [ ] Sidebar collapsible (if feature exists)
- [ ] Hover states work properly

### Top Navigation Bar
- [ ] Logo/Brand present
- [ ] User avatar/menu present
- [ ] Notifications icon (if implemented)
- [ ] Search bar (if implemented)
- [ ] Breadcrumbs show current location

### User Menu
- [ ] Click user avatar
- [ ] Dropdown opens with:
  - User name: "Haxaco Admin"
  - User email: "haxaco@gmail.com"
  - "Settings" link
  - "Log Out" link

- [ ] Click outside → menu closes
- [ ] "Log Out" → redirects to login page

### Responsive Design
- [ ] Resize browser to mobile width (< 768px)
- [ ] Sidebar collapses to hamburger menu
- [ ] Content reflows properly
- [ ] No horizontal scroll
- [ ] All features accessible on mobile

---

## 14. Edge Cases & Error Scenarios

### Invalid Account ID
1. Navigate to `/dashboard/accounts/invalid-uuid-format`
2. **Expected:** Error page or redirect
3. **Message:** "Invalid account ID" or "Account not found"
4. **No crash or blank page**

### Non-Existent Account
1. Navigate to `/dashboard/accounts/00000000-0000-0000-0000-000000000000`
2. **Expected:** 404 page or "Account not found" message
3. **Network:** API returns 404
4. **No infinite loading**

### Network Offline
1. Open DevTools → Network tab
2. Select "Offline" in throttling dropdown
3. Navigate to any page
4. **Expected:** Error message "Unable to connect" or similar
5. **Retry button** present
6. **No infinite loading spinners**

### Slow Network
1. DevTools → Network → "Slow 3G"
2. Navigate to accounts list
3. **Expected:** Loading skeleton shows
4. **Content loads eventually**
5. **No timeout errors** (reasonable timeout)

### API Server Down
1. Stop the API server
2. Refresh dashboard
3. **Expected:** Error message "Server unavailable"
4. **Graceful error handling**
5. **No blank pages**
6. Restart API → refresh → should work again

### Token Expired
1. Let session expire (or manually clear token)
2. Try to access dashboard
3. **Expected:** Redirect to login page
4. **OR:** "Session expired" message with re-login prompt

### Permission Denied
1. (If multi-user): Try to access another tenant's account
2. **Expected:** 403 or redirect
3. **Message:** "Access denied" or "Not authorized"
4. **No data leak**

---

## 15. Data Validation & Integrity

### Tenant Isolation
- [ ] **CRITICAL:** All data belongs to tenant `dad4308f-f9b6-4529-a406-7c2bdf3c6071`
- [ ] No accounts from other tenants visible
- [ ] Account count is exactly **5** (not 12,847 or any other number)
- [ ] Each account has correct tenant_id in API response

### Account Data Integrity
For each account, verify:
- [ ] Name matches expected (e.g., "Personal Checking")
- [ ] Email matches expected (e.g., "personal@haxaco.com")
- [ ] Type is correct (person/business)
- [ ] Created date is recent (within last hour/day)
- [ ] Balance is $0.00 (as seeded)

### API Response Structure
- [ ] All responses have `success: true`
- [ ] Data is in `data.data` (double-nested) or handle properly
- [ ] Pagination present: `data.data.pagination.total`
- [ ] Meta info present: `request_id`, `timestamp`, `processing_time_ms`
- [ ] Error responses have `success: false` and `error` object

### Console Cleanliness
- [ ] **No red errors** in console (unless intentionally testing error states)
- [ ] **No "Invalid time value"** errors
- [ ] **No "undefined" property access** errors
- [ ] **No "Cannot read property of null"** errors
- [ ] Warnings are acceptable but note them

---

## 16. Performance Checks

### Page Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Accounts list loads in < 2 seconds
- [ ] Account detail loads in < 1 second
- [ ] Account 360 view loads in < 3 seconds (more data)

### Network Requests
- [ ] No duplicate API calls (check Network tab)
- [ ] Proper caching (repeated visits use cached data)
- [ ] Pagination doesn't refetch all pages
- [ ] No N+1 query problems visible

### Memory Leaks
- [ ] Navigate between pages 5-10 times
- [ ] Check DevTools → Performance → Memory
- [ ] Memory usage should stabilize
- [ ] No continuous memory growth

---

## 17. Accessibility (Basic Checks)

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Can navigate entire dashboard with keyboard
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals

### Screen Reader (Optional)
- [ ] Turn on screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Navigation elements announced properly
- [ ] Buttons have descriptive labels
- [ ] Form inputs have labels
- [ ] Images have alt text

### Color Contrast
- [ ] Text readable on backgrounds
- [ ] Buttons stand out
- [ ] Links distinguishable from text
- [ ] Status indicators clear (not color-only)

---

## 18. Browser Compatibility (If Time Permits)

Test in:
- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Look for:
- [ ] Layout differences
- [ ] JavaScript errors
- [ ] CSS rendering issues
- [ ] Functionality works the same

---

## 19. Final Checklist

### Critical Paths Working
- [ ] ✅ User can log in
- [ ] ✅ Dashboard loads with correct stats (5 accounts)
- [ ] ✅ Accounts list shows 5 accounts (not 12,847)
- [ ] ✅ Account detail pages load without errors
- [ ] ✅ Account 360 view works (no 404)
- [ ] ✅ Dates format properly (no "Invalid Date")
- [ ] ✅ Empty states show for sections with no data
- [ ] ✅ Navigation works smoothly
- [ ] ✅ User can log out

### No Regressions
- [ ] ✅ No hardcoded fallback values showing
- [ ] ✅ No double-nesting issues causing blank pages
- [ ] ✅ No tenant data leakage
- [ ] ✅ No infinite loading states
- [ ] ✅ No unhandled promise rejections in console

### Performance Acceptable
- [ ] ✅ Pages load within reasonable time
- [ ] ✅ No excessive API calls
- [ ] ✅ Smooth transitions between pages

---

## 20. Bug Reporting Template

For any issues found, report in this format:

```markdown
### Bug Title
**Severity:** Critical / Major / Minor / Cosmetic
**Page:** /dashboard/accounts/{id}
**User:** haxaco@gmail.com

**Steps to Reproduce:**
1. Navigate to dashboard
2. Click on "Personal Checking" account
3. Observe error message

**Expected Result:**
Account detail page should load with account information

**Actual Result:**
Page shows "Invalid time value" error and crashes

**Screenshot:** [attach if possible]
**Console Errors:** [paste any errors]
**Network Requests:** [paste failed requests]
**API Server Logs:** [paste relevant logs]

**Browser:** Chrome 120
**OS:** macOS
**Timestamp:** 2026-01-02 04:30:00 UTC
```

---

## Testing Summary Template

After completing all tests, fill out:

```markdown
# UI Regression Test Results

**Date:** 2026-01-02
**Tester:** Gemini
**Duration:** ~30 minutes
**Test User:** haxaco@gmail.com

## Summary
- **Total Checks:** X
- **Passed:** X
- **Failed:** X
- **Blocked:** X
- **Not Tested:** X

## Pass Rate
XX% of tests passing

## Critical Issues (P0)
1. [List any critical bugs]

## Major Issues (P1)
1. [List major bugs]

## Minor Issues (P2)
1. [List minor bugs]

## Recommendations
1. [What needs to be fixed before production]
2. [What can be deferred]
3. [What requires more investigation]

## Sign-off
- [ ] All critical issues resolved
- [ ] Ready for next phase of testing
- [ ] Requires additional work
```

---

## Notes for Tester (Gemini)

### Testing Mindset
- **Be thorough but efficient** - Focus on critical paths first
- **Document everything** - Screenshots, errors, unexpected behavior
- **Think like a user** - Does this make sense? Is it intuitive?
- **Check the details** - Formatting, alignment, typos, placeholder text

### Common Issues to Watch For
1. **Double-nested responses** causing blank pages or wrong data
2. **Invalid date handling** causing crashes
3. **Hardcoded fallback values** instead of real data
4. **Tenant isolation failures** showing data from other tenants
5. **401/403 errors** indicating auth problems
6. **404 errors** for existing resources
7. **Infinite loading** states that never resolve
8. **Console errors** that indicate underlying problems

### Priority Order
1. **Critical:** Dashboard, Accounts list, Account detail, Account 360
2. **High:** Transfers, Agents, Navigation, Auth
3. **Medium:** Settings, API Keys, Reports
4. **Low:** Edge cases, accessibility, browser compat

### Time Estimate
- **Quick Pass:** 30 minutes (critical paths only)
- **Thorough Pass:** 60-90 minutes (all routes + edge cases)
- **Complete:** 2-3 hours (includes accessibility, performance, all browsers)

---

**Good luck with testing! Document everything you find.** 🧪

