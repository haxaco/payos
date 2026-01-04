# x402 Payment Protocol - Complete Testing Guide

**Purpose:** Comprehensive testing guide for validating x402 payment functionality  
**For:** Gemini AI Testing Agent  
**Last Updated:** December 24, 2025  
**Estimated Time:** 30-45 minutes for full test suite

---

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Test Categories](#test-categories)
4. [UI Validation Tests](#ui-validation-tests)
5. [API/SDK Payment Tests](#apisdk-payment-tests)
6. [Database Validation Queries](#database-validation-queries)
7. [End-to-End Test Scenarios](#end-to-end-test-scenarios)
8. [Expected Results Checklist](#expected-results-checklist)

---

## 🔧 **Prerequisites**

### Required Services Running

Before testing, ensure these services are running:

```bash
# 1. API Server (port 4000)
cd /Users/haxaco/Dev/PayOS/apps/api && pnpm dev

# 2. Sample Provider Server (port 4001)
cd /Users/haxaco/Dev/PayOS/apps/sample-provider && pnpm dev

# 3. Web Dashboard (port 3000)
cd /Users/haxaco/Dev/PayOS/apps/web && pnpm dev
```

### Verify Services

```bash
# Check API health
curl http://localhost:4000/health

# Expected response:
# {"status":"healthy","timestamp":"...","version":"0.1.0","checks":{"api":"running","database":"connected"}}

# Check Provider health
curl http://localhost:4001/health

# Expected response:
# {"status":"ok","endpoints":{"free":["/api/time"],"paid":["/api/weather/forecast","/api/weather/historical"]}}
```

### Test Credentials

**API Key for Testing:**
```
pk_test_YOUR_API_KEY_HERE
```

**Tenant ID:** `da500003-4de9-416b-aebc-61cfcba914c9`  
**User:** haxaco@gmail.com

---

## 🌐 **Environment Setup**

### Dashboard Access

**URL:** http://localhost:3000

**Login:** Use your credentials (haxaco@gmail.com)

### Key Dashboard Pages

| Page | URL | Purpose |
|------|-----|---------|
| x402 Overview | `/dashboard/x402` | Provider & Consumer stats |
| Endpoints | `/dashboard/x402/endpoints` | Manage API endpoints |
| Wallets | `/dashboard/wallets` | View wallet balances |
| Analytics | `/dashboard/x402/analytics` | Revenue charts |
| Transactions | `/dashboard/transfers` | Transaction history |

---

## 📊 **Test Categories**

### P0 - Critical (Must Pass)
1. ✅ Basic payment flow (provider → 402 → payment → data)
2. ✅ Provider wallet receives payment
3. ✅ Consumer wallet debited correctly
4. ✅ UI shows accurate stats

### P1 - Important
5. Spending limits (per-request, daily)
6. Idempotency (no double charges)
7. Error handling (insufficient balance)

### P2 - Standard
8. Multiple endpoint pricing
9. Webhook notifications
10. Volume discounts

### P3 - Nice to Have
11. Performance under load
12. Analytics accuracy
13. Export functionality

---

## 🖥️ **UI Validation Tests**

### Test UI-1: Provider View Stats

**Steps:**
1. Navigate to http://localhost:3000/dashboard/x402
2. Ensure "Provider View" tab is selected
3. Verify stats cards display:

**Expected Values (approximate):**
- **Total Revenue:** ~$1.04+ USDC
- **Net Revenue:** ~$1.04+ USDC (0.00 in fees for test)
- **API Calls:** 140+ calls
- **Active Endpoints:** 67 endpoints

**✅ Pass if:** Stats cards show non-zero values and endpoints count is 60+

---

### Test UI-2: Consumer View Stats

**Steps:**
1. On same page, click "Consumer View" tab
2. Verify stats cards display:

**Expected Values:**
- **Total Spent:** ~$0.01+ USDC
- **API Calls Made:** 10+ calls
- **Unique Endpoints:** 1+ endpoint

**✅ Pass if:** Consumer shows payment history with completed transactions

---

### Test UI-3: Endpoints List

**Steps:**
1. Navigate to http://localhost:3000/dashboard/x402/endpoints
2. Verify endpoint list shows multiple endpoints

**Expected:**
- **Total Endpoints:** 67+
- **Active:** 67 (all active)
- Each endpoint shows: Name, Path, Price, Calls, Revenue, Status

**Sample Endpoints to Look For:**
| Name | Path | Price |
|------|------|-------|
| Weather Forecast API | /api/weather/forecast | $0.001 |
| Historical Weather API | /api/weather/historical | $0.01 |
| Weather API Premium | /api/weather-premium | $0.01 |

**✅ Pass if:** 60+ endpoints visible, mix of prices shown

---

### Test UI-4: Wallets Balance

**Steps:**
1. Navigate to http://localhost:3000/dashboard/wallets
2. Look for these key wallets:

**Expected Wallets:**
| Wallet Name | Expected Balance | Status |
|-------------|------------------|--------|
| Agent Spending Wallet | ~$99+ USDC | Active |
| Provider Revenue Wallet | ~$0.09+ USDC | Active |

**✅ Pass if:** Both wallets exist with positive balances

---

### Test UI-5: Transaction History

**Steps:**
1. Navigate to http://localhost:3000/dashboard/transfers
2. Filter by type: x402
3. Verify completed transactions exist

**Expected:**
- Multiple x402 type transactions
- Status: "completed"
- Amounts: $0.001 - $0.25 range
- Recent dates (December 2025)

**✅ Pass if:** 10+ x402 transactions visible

---

## 🔌 **API/SDK Payment Tests**

### Test SDK-1: Basic Payment Flow

**Steps:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
pnpm dev --forecast
```

**Expected Output:**
```
╔══════════════════════════════════════════════════════════════════╗
║   🤖 AI Agent (x402 Consumer SDK Demo)                         ║
╠══════════════════════════════════════════════════════════════════╣
║   Agent ID:    7549e236-5a42-41f...                          ║
║   Weather API: http://localhost:4001                         ║
║   Auto-pay:    Enabled                                          ║
║   Max/request: $0.10                                            ║
║   Daily limit: $10.00                                           ║
╚══════════════════════════════════════════════════════════════════╝

- Fetching 5-day forecast (paid)...

   💰 Payment processed!
      Amount: 0.001 USDC
      Transfer: xxxxxxxx...
      New Balance: $XX.XXXX

   📍 San Francisco - 5 Day Forecast
   ... (weather data)
```

**✅ Pass if:** 
- Payment processed message appears
- Weather forecast data received
- No errors

---

### Test SDK-2: Free Endpoint (No Payment)

**Steps:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
pnpm dev --time
```

**Expected Output:**
```
- Fetching current time (free)...
   🕐 Current time: 2025-12-24T...
✔ Time received (free endpoint)
```

**✅ Pass if:** No payment message, data received for free

---

### Test SDK-3: Historical Data (Higher Price)

**Steps:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
pnpm dev --historical
```

**Expected Output:**
```
- Fetching historical weather (paid)...

   💰 Payment processed!
      Amount: 0.01 USDC  ← Note: 10x higher than forecast
      Transfer: xxxxxxxx...
```

**✅ Pass if:** Payment amount is $0.01 (higher tier pricing)

---

### Test SDK-4: Multiple Sequential Payments

**Steps:**
```bash
# Run 5 consecutive payments
for i in {1..5}; do
  cd /Users/haxaco/Dev/PayOS/apps/sample-consumer && pnpm dev --forecast
  sleep 2
done
```

**Expected:**
- All 5 payments succeed
- Each shows "Payment processed!"
- Balance decreases by ~$0.005 total

**✅ Pass if:** All 5 payments complete without errors

---

### Test SDK-5: Payment via Direct API Call

**Steps:**
```bash
# Get quote first
curl -X GET "http://localhost:4000/v1/x402/quote/ea6ff54b-a427-40f9-8ea6-30c937d9fbed" \
  -H "Authorization: Bearer pk_test_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "endpoint": {
    "id": "ea6ff54b-...",
    "name": "Weather Forecast API",
    "path": "/api/weather/forecast",
    "price": 0.001,
    "currency": "USDC"
  },
  "quote": {
    "price": 0.001,
    "currency": "USDC",
    "expiresAt": "..."
  }
}
```

**✅ Pass if:** Quote returned with price and expiration

---

## 🗄️ **Database Validation Queries**

### Query DB-1: Total Endpoint Count

```sql
SELECT 
  COUNT(*) as total_endpoints,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_endpoints,
  SUM(total_calls) as total_calls,
  SUM(total_revenue) as total_revenue
FROM x402_endpoints
WHERE tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9';
```

**Expected:**
- `total_endpoints`: 67+
- `active_endpoints`: 67+
- `total_calls`: 140+
- `total_revenue`: ~1.04

**✅ Pass if:** Counts match or exceed expected values

---

### Query DB-2: Recent x402 Transfers

```sql
SELECT 
  id,
  amount,
  status,
  created_at,
  x402_metadata->>'endpoint_path' as endpoint
FROM transfers
WHERE 
  tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9'
  AND type = 'x402'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- 10 recent x402 transfers
- Status: "completed"
- Amounts: $0.001 - $0.25 range

**✅ Pass if:** Recent transfers exist with completed status

---

### Query DB-3: Wallet Balances

```sql
SELECT 
  name,
  balance,
  currency,
  status
FROM wallets
WHERE 
  tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9'
  AND name IN ('Agent Spending Wallet', 'Provider Revenue Wallet')
ORDER BY name;
```

**Expected:**
| name | balance | status |
|------|---------|--------|
| Agent Spending Wallet | ~99.90 | active |
| Provider Revenue Wallet | ~0.09+ | active |

**✅ Pass if:** Both wallets have positive balances

---

### Query DB-4: Payment Settlement Verification

```sql
SELECT 
  t.id as transfer_id,
  t.amount,
  t.status,
  t.settled_at,
  t.x402_metadata->>'endpoint_id' as endpoint_id
FROM transfers t
WHERE 
  t.type = 'x402'
  AND t.status = 'completed'
  AND t.settled_at IS NOT NULL
ORDER BY t.settled_at DESC
LIMIT 5;
```

**Expected:**
- `settled_at` is NOT NULL for completed transfers
- All recent transfers show completed status

**✅ Pass if:** settled_at timestamps present for completed transfers

---

### Query DB-5: Money Flow Validation

```sql
-- Check that money adds up
SELECT 
  'Consumer Spent' as category,
  SUM(amount) as total
FROM transfers
WHERE 
  tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9'
  AND type = 'x402'
  AND status = 'completed'

UNION ALL

SELECT 
  'Provider Revenue' as category,
  SUM(total_revenue) as total
FROM x402_endpoints
WHERE tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9';
```

**Expected:** Consumer Spent ≈ Provider Revenue (within 3% for fees)

**✅ Pass if:** Values are approximately equal

---

## 🔄 **End-to-End Test Scenarios**

### E2E-1: Complete Payment Lifecycle

**Objective:** Verify entire payment flow from request to settlement

**Steps:**

1. **Record Initial State**
   ```sql
   -- Note current wallet balances
   SELECT name, balance FROM wallets 
   WHERE name IN ('Agent Spending Wallet', 'Provider Revenue Wallet');
   ```
   
   Record: Consumer Balance = $______, Provider Balance = $______

2. **Make Payment**
   ```bash
   cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
   pnpm dev --forecast
   ```

3. **Verify Payment Success**
   - ✅ "Payment processed!" message appeared
   - ✅ Weather data received

4. **Check Final State**
   ```sql
   SELECT name, balance FROM wallets 
   WHERE name IN ('Agent Spending Wallet', 'Provider Revenue Wallet');
   ```

5. **Validate Changes**
   - Consumer balance decreased by ~$0.001
   - Provider balance increased by ~$0.00097 (after 3% fee)

**✅ Pass if:** Both wallet balances changed correctly

---

### E2E-2: UI Updates After Payment

**Objective:** Verify UI reflects new payment in real-time

**Steps:**

1. **Open Dashboard** in browser: http://localhost:3000/dashboard/x402
2. **Note Current Values:**
   - Total Revenue: $______
   - API Calls: ______

3. **Make Payment** (in terminal):
   ```bash
   cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
   pnpm dev --forecast
   ```

4. **Refresh Dashboard** (F5 or click refresh)

5. **Verify Updates:**
   - Total Revenue increased by ~$0.001
   - API Calls increased by 1
   - New payment appears in Consumer → Payment History

**✅ Pass if:** UI updated within 30 seconds of payment

---

### E2E-3: Spending Limit Enforcement

**Objective:** Verify spending limits prevent excessive payments

**Steps:**

1. **Check Current Spending Policy:**
   ```sql
   SELECT name, spending_policy 
   FROM wallets 
   WHERE name = 'Agent Spending Wallet';
   ```

2. **If no policy, set one:**
   ```bash
   curl -X PATCH "http://localhost:4000/v1/wallets/{wallet_id}" \
     -H "Authorization: Bearer pk_test_YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     -d '{"spending_policy": {"dailySpendLimit": 0.05, "perTransactionLimit": 0.10}}'
   ```

3. **Make payments until limit reached:**
   ```bash
   for i in {1..60}; do
     cd /Users/haxaco/Dev/PayOS/apps/sample-consumer && timeout 10 pnpm dev --forecast || break
     sleep 1
   done
   ```

4. **Expected:** After ~50 payments ($0.05 daily limit), payment should fail with limit error

**✅ Pass if:** Spending limit prevents payments after threshold

---

### E2E-4: Idempotency Test

**Objective:** Verify duplicate requests don't double-charge

**Steps:**

1. **Make payment with specific request ID:**
   ```bash
   # First payment
   curl -X POST "http://localhost:4000/v1/x402/pay" \
     -H "Authorization: Bearer pk_test_YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     -H "X-Request-Id: test-idempotency-12345" \
     -d '{
       "endpointId": "ea6ff54b-a427-40f9-8ea6-30c937d9fbed",
       "walletId": "{consumer_wallet_id}",
       "amount": 0.001
     }'
   ```

2. **Repeat exact same request:**
   ```bash
   # Second payment (same X-Request-Id)
   curl -X POST "http://localhost:4000/v1/x402/pay" \
     -H "Authorization: Bearer pk_test_YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     -H "X-Request-Id: test-idempotency-12345" \
     -d '{
       "endpointId": "ea6ff54b-a427-40f9-8ea6-30c937d9fbed",
       "walletId": "{consumer_wallet_id}",
       "amount": 0.001
     }'
   ```

3. **Expected:** Second request returns same transfer ID, no new charge

**✅ Pass if:** Only 1 transfer created, second request returns existing transfer

---

### E2E-5: Error Handling - Insufficient Balance

**Objective:** Verify proper error when wallet has insufficient funds

**Steps:**

1. **Create a test wallet with low balance:**
   ```sql
   -- Find a wallet with very low balance or create test scenario
   SELECT id, name, balance FROM wallets 
   WHERE balance < 0.001 AND status = 'active'
   LIMIT 1;
   ```

2. **Attempt payment from that wallet**

3. **Expected Error:**
   ```json
   {
     "error": "Insufficient balance",
     "code": "INSUFFICIENT_BALANCE",
     "required": 0.001,
     "available": 0.0001
   }
   ```

**✅ Pass if:** Clear error returned, no partial charge

---

## ✅ **Expected Results Checklist**

### UI Tests
- [ ] UI-1: Provider View shows ~$1.04 revenue, 140+ calls, 67 endpoints
- [ ] UI-2: Consumer View shows $0.01+ spent, 10+ calls
- [ ] UI-3: Endpoints page lists 67+ endpoints
- [ ] UI-4: Wallets show correct balances
- [ ] UI-5: Transaction history shows x402 payments

### SDK Tests
- [ ] SDK-1: Basic payment succeeds with weather data
- [ ] SDK-2: Free endpoint works without payment
- [ ] SDK-3: Higher-priced endpoint charges $0.01
- [ ] SDK-4: Multiple sequential payments all succeed
- [ ] SDK-5: Direct API quote works

### Database Tests
- [ ] DB-1: Endpoint count is 67+
- [ ] DB-2: Recent transfers exist
- [ ] DB-3: Wallet balances are positive
- [ ] DB-4: Settlements have timestamps
- [ ] DB-5: Money flow balances

### E2E Tests
- [ ] E2E-1: Complete payment lifecycle works
- [ ] E2E-2: UI updates after payment
- [ ] E2E-3: Spending limits enforced
- [ ] E2E-4: Idempotency prevents double-charge
- [ ] E2E-5: Insufficient balance handled gracefully

---

## 🐛 **Known Issues & Workarounds**

### Issue 1: Settlement Function Parameter Types
**Fixed:** Database function `settle_x402_payment` now uses UUID for tenant_id

### Issue 2: Browser Automation Session
**Note:** Browser automation tools may see different data than logged-in users. Always verify via direct UI access.

### Issue 3: Spending Policy Not Set
**Workaround:** Set spending policy via API if wallet doesn't have one configured

---

## 📝 **Test Report Template**

```markdown
# x402 Test Report - [DATE]

## Summary
- Tests Executed: ___
- Passed: ___
- Failed: ___
- Skipped: ___

## Environment
- API Server: [Running/Not Running]
- Provider Server: [Running/Not Running]
- Dashboard: [Running/Not Running]
- Database: [Connected/Disconnected]

## Test Results

### UI Tests
| Test | Status | Notes |
|------|--------|-------|
| UI-1 | ⬜ | |
| UI-2 | ⬜ | |
| UI-3 | ⬜ | |
| UI-4 | ⬜ | |
| UI-5 | ⬜ | |

### SDK Tests
| Test | Status | Notes |
|------|--------|-------|
| SDK-1 | ⬜ | |
| SDK-2 | ⬜ | |
| SDK-3 | ⬜ | |
| SDK-4 | ⬜ | |
| SDK-5 | ⬜ | |

### Database Tests
| Test | Status | Notes |
|------|--------|-------|
| DB-1 | ⬜ | |
| DB-2 | ⬜ | |
| DB-3 | ⬜ | |
| DB-4 | ⬜ | |
| DB-5 | ⬜ | |

### E2E Tests
| Test | Status | Notes |
|------|--------|-------|
| E2E-1 | ⬜ | |
| E2E-2 | ⬜ | |
| E2E-3 | ⬜ | |
| E2E-4 | ⬜ | |
| E2E-5 | ⬜ | |

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Sign-off
Tested by: _______________
Date: _______________
```

---

## 🔗 **Related Documentation**

- **Test Scenarios:** `/docs/X402_TESTING_SCENARIOS.md`
- **Audit Trail:** `/docs/X402_AUDIT_TRAIL.md`
- **API Documentation:** `/docs/api/x402-endpoints.md`
- **SDK Documentation:** `/packages/x402-client-sdk/README.md`

---

**End of Testing Guide**

*For questions or issues, refer to the PayOS development team.*



