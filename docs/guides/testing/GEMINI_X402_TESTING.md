# x402 Testing Guide for Gemini

> Complete step-by-step validation guide for the x402 Gateway Infrastructure.

---

## 📋 Pre-flight Checklist

Before testing, ensure:
- [ ] PayOS API running on `http://localhost:3456`
- [ ] PayOS Dashboard running on `http://localhost:3000`
- [ ] Test data exists (accounts, wallets, x402 endpoints, transactions)

### Start Services
```bash
cd /Users/haxaco/Dev/PayOS
pnpm dev --filter=@payos/api &
pnpm dev --filter=@payos/web &
```

---

## 🧪 Test Suite 1: Dashboard UI Testing

### 1.1 Main x402 Dashboard
**Navigate to:** `http://localhost:3000/dashboard/x402`

**Verify Provider View:**
- [ ] Provider view tab is visible and clickable
- [ ] "Total Revenue" stat card shows value
- [ ] "Net Revenue" stat card shows value  
- [ ] "API Calls" stat card shows value
- [ ] "Active Endpoints" stat card shows value
- [ ] Endpoints table displays with columns: Name, Path, Method, Price, Status
- [ ] At least one endpoint row is visible
- [ ] Clicking endpoint row navigates to detail page

**Verify Consumer View:**
- [ ] Consumer view tab is visible and clickable
- [ ] Switch to consumer view
- [ ] "Total Spent" stat card shows value
- [ ] "API Calls Made" stat card shows value
- [ ] "Unique Endpoints" stat card shows value
- [ ] Payment history table shows transactions
- [ ] Endpoint column shows endpoint path (NOT "Unknown")
- [ ] Clicking payment row navigates to transfer detail

### 1.2 Endpoint Detail Page
**Navigate to:** Click any endpoint from provider view

**Verify:**
- [ ] Endpoint name displayed
- [ ] Path and method shown
- [ ] Base price displayed with currency
- [ ] Stats: Revenue, API Calls, Unique Payers, Avg Transaction
- [ ] Recent Transactions table visible
- [ ] Volume discounts section (if applicable)
- [ ] Back button works

### 1.3 Transfer Detail Page (from Consumer View)
**Navigate to:** Click any payment from consumer view payment history

**Verify:**
- [ ] Transfer amount displayed prominently
- [ ] Status badge shows (completed/pending/failed)
- [ ] Transfer Flow section shows From → To
- [ ] Transfer Details section with ID, type, amount, date
- [ ] Initiated By section with type and ID
- [ ] **x402 Payment Details section** (purple/gray card):
  - [ ] Endpoint Information (path, method, endpoint ID)
  - [ ] Wallet & Settlement (wallet ID, price, fees, net amount)
  - [ ] Request Details (request ID, timestamp)
  - [ ] Dark mode styling is readable (not washed out)
- [ ] Wallet ID is clickable and links to wallets page

### 1.4 Transactions Page with x402 Filter
**Navigate to:** `http://localhost:3000/dashboard/transfers`

**Verify:**
- [ ] Type dropdown includes "⚡ x402 Payments" option
- [ ] Selecting x402 filter shows only x402 transactions
- [ ] x402 transactions show purple badge with ⚡ icon
- [ ] Clicking transaction row navigates to detail

### 1.5 Dark Mode Testing
**For each page above:**
- [ ] Toggle dark mode
- [ ] Verify all text is readable
- [ ] Verify cards have proper contrast
- [ ] x402 Payment Details section has gray background (not purple)
- [ ] All buttons and links are visible

---

## 🧪 Test Suite 2: API Endpoint Testing

### 2.1 x402 Endpoints API

**List Endpoints:**
```bash
curl http://localhost:3456/v1/x402/endpoints \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns array of endpoints
- [ ] Each endpoint has: id, name, path, method, basePrice, currency

**Get Single Endpoint:**
```bash
curl http://localhost:3456/v1/x402/endpoints/ENDPOINT_ID \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns endpoint details
- [ ] Includes paymentAddress

**Create Endpoint:**
```bash
curl -X POST http://localhost:3456/v1/x402/endpoints \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Endpoint",
    "path": "/api/test",
    "method": "GET",
    "basePrice": 0.001,
    "currency": "USDC",
    "accountId": "ACCOUNT_ID"
  }' | jq
```
- [ ] Returns created endpoint with ID
- [ ] Endpoint appears in dashboard

### 2.2 x402 Analytics API

**Summary:**
```bash
curl http://localhost:3456/v1/x402/analytics/summary?period=30d \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns totalRevenue, netRevenue, transactionCount
- [ ] Returns uniqueEndpoints, uniquePayers

**Revenue Timeseries:**
```bash
curl http://localhost:3456/v1/x402/analytics/revenue?period=30d \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns array of date/revenue pairs

**Top Endpoints:**
```bash
curl http://localhost:3456/v1/x402/analytics/top-endpoints?limit=5 \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns ranked list of endpoints by revenue

### 2.3 Transfers API with x402 Filter

**Filter x402 Transfers:**
```bash
curl "http://localhost:3456/v1/transfers?type=x402" \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns only x402 type transfers
- [ ] Each transfer has x402_metadata

**Filter by Endpoint:**
```bash
curl "http://localhost:3456/v1/transfers?x402_endpoint_id=ENDPOINT_ID" \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns transfers for specific endpoint

### 2.4 Settlement API

**Get Config:**
```bash
curl http://localhost:3456/v1/settlement/config \
  -H "Authorization: Bearer YOUR_API_KEY" | jq
```
- [ ] Returns settlement configuration

**Preview Settlement:**
```bash
curl -X POST http://localhost:3456/v1/settlement/preview \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USDC"}' | jq
```
- [ ] Returns fee breakdown
- [ ] Shows net amount after fees

---

## 🧪 Test Suite 3: SDK Testing

### 3.1 Provider SDK

**Setup:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-provider
pnpm install
```

**Run Provider:**
```bash
PAYOS_API_KEY=YOUR_KEY \
PAYOS_ACCOUNT_ID=YOUR_ACCOUNT \
pnpm dev
```

**Verify:**
- [ ] Server starts on port 4000
- [ ] Endpoints register with PayOS (check console)
- [ ] `curl http://localhost:4000/api/weather/free` returns weather data
- [ ] `curl -v http://localhost:4000/api/weather/premium` returns 402
- [ ] 402 response includes X-Payment-Required header
- [ ] 402 response includes X-Payment-Amount header
- [ ] 402 response includes X-Endpoint-ID header

### 3.2 Consumer SDK

**Setup:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
pnpm install
```

**Run Consumer:**
```bash
PAYOS_API_KEY=YOUR_KEY \
PAYOS_WALLET_ID=YOUR_WALLET \
pnpm dev --free
```
- [ ] Free weather data displayed

```bash
PAYOS_API_KEY=YOUR_KEY \
PAYOS_WALLET_ID=YOUR_WALLET \
pnpm dev --premium
```
- [ ] 402 detected
- [ ] Payment processed automatically
- [ ] Payment confirmation shown
- [ ] Premium weather data displayed

```bash
PAYOS_API_KEY=YOUR_KEY \
PAYOS_WALLET_ID=YOUR_WALLET \
pnpm dev --balance
```
- [ ] Wallet balance displayed
- [ ] Balance decreased after payment

### 3.3 E2E Flow

**With both apps running:**
1. [ ] Consumer calls provider's premium endpoint
2. [ ] Provider returns 402
3. [ ] Consumer SDK processes payment via PayOS
4. [ ] Consumer retries with payment proof
5. [ ] Provider verifies payment
6. [ ] Provider returns data
7. [ ] Transaction visible in provider dashboard
8. [ ] Transaction visible in consumer dashboard

---

## 🧪 Test Suite 4: Edge Cases

### 4.1 Error Handling

**Insufficient Balance:**
1. Set wallet balance to 0
2. Call premium endpoint
- [ ] Payment fails with clear error
- [ ] No partial transaction created

**Invalid Endpoint ID:**
```bash
curl http://localhost:3456/v1/x402/endpoints/invalid-id \
  -H "Authorization: Bearer YOUR_API_KEY"
```
- [ ] Returns 404 with error message

**Unauthorized Access:**
```bash
curl http://localhost:3456/v1/x402/endpoints
```
- [ ] Returns 401 without auth header

### 4.2 Concurrent Requests

1. Make 5 simultaneous requests to same endpoint
- [ ] All payments process correctly
- [ ] No double-charges
- [ ] All responses successful

### 4.3 Dark Mode Consistency

Visit each page and toggle dark mode:
- [ ] `/dashboard/x402` - both views
- [ ] `/dashboard/x402/endpoints/[id]`
- [ ] `/dashboard/x402/analytics`
- [ ] `/dashboard/transfers`
- [ ] `/dashboard/transfers/[id]`
- [ ] All text readable
- [ ] All cards have proper background

---

## ✅ Test Results Template

```markdown
## Test Results - [DATE]

### Environment
- API: http://localhost:3456
- Dashboard: http://localhost:3000
- Browser: [Chrome/Firefox/Safari]

### UI Tests
| Test | Pass | Notes |
|------|------|-------|
| Provider View | ⬜ | |
| Consumer View | ⬜ | |
| Endpoint Detail | ⬜ | |
| Transfer Detail | ⬜ | |
| x402 Filter | ⬜ | |
| Dark Mode | ⬜ | |

### API Tests
| Test | Pass | Notes |
|------|------|-------|
| List Endpoints | ⬜ | |
| Create Endpoint | ⬜ | |
| Analytics Summary | ⬜ | |
| Transfer Filter | ⬜ | |

### SDK Tests
| Test | Pass | Notes |
|------|------|-------|
| Provider Start | ⬜ | |
| 402 Response | ⬜ | |
| Consumer Auto-pay | ⬜ | |
| E2E Flow | ⬜ | |

### Issues Found
1. [Issue description]

### Overall Status: [PASS/FAIL]
```

---

## 🔧 Troubleshooting

### Common Issues

**"Not found" errors:**
- Check API is running: `curl http://localhost:3456/health`
- Check test data exists: `curl http://localhost:3456/v1/x402/endpoints`

**Dark mode issues:**
- Hard refresh the page (Cmd+Shift+R)
- Check browser dev tools for CSS errors

**Payment failures:**
- Verify wallet has balance
- Check API key is valid
- Look at API logs for errors

**SDK connection issues:**
- Verify PAYOS_API_URL is correct
- Check CORS settings in API

### Debug Commands
```bash
# Check API health
curl http://localhost:3456/health

# Check endpoints exist
curl http://localhost:3456/v1/x402/endpoints -H "Authorization: Bearer KEY"

# Check wallet balance
curl http://localhost:3456/v1/wallets/WALLET_ID -H "Authorization: Bearer KEY"

# View API logs
tail -f apps/api/logs/combined.log
```


