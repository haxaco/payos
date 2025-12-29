# x402 Comprehensive Testing Scenarios

**Status:** Core flow working ✅  
**Next:** Validate edge cases, limits, errors, and advanced features  

---

## 🎯 Test Categories

### Category 1: Basic Flow Validation ✅ DONE
- [x] Free endpoint (no payment)
- [x] Paid endpoint (single payment)
- [x] Payment settlement
- [x] Payment verification
- [x] Data delivery

---

### Category 2: Error Scenarios 🔴 TODO

#### Scenario 2.1: Insufficient Balance
**Test:** Agent wallet has $0.001, tries to call $0.01 endpoint

**Expected:**
- Payment fails with `INSUFFICIENT_BALANCE` error
- Wallet balance unchanged
- Consumer gets clear error message
- No transfer record created

**Command:**
```bash
# First, drain wallet to low balance
# Then try expensive endpoint
cd apps/sample-consumer && pnpm dev --historical
```

---

#### Scenario 2.2: Invalid Payment Proof
**Test:** Consumer provides fake/invalid payment proof headers

**Expected:**
- Provider verification fails
- Provider returns 402 again
- No data delivered
- Clear error logged

**How to test:** Modify consumer SDK to send invalid proof

---

#### Scenario 2.3: Expired/Inactive Endpoint
**Test:** Call endpoint that has been deactivated

**Expected:**
- Payment fails with `ENDPOINT_INACTIVE` error
- No wallet deduction
- Clear error message

**Setup:** Deactivate an endpoint via dashboard or API

---

#### Scenario 2.4: Network Failure Mid-Payment
**Test:** Kill API server during payment processing

**Expected:**
- Consumer SDK retries
- Idempotency prevents double-charge
- Either completes or fails cleanly
- No orphaned transactions

---

### Category 3: Spending Limits 🔴 TODO

#### Scenario 3.1: Per-Request Limit
**Test:** Try to pay for endpoint that costs more than `maxAutoPayAmount`

**Current config:** `maxAutoPayAmount: 0.10`

**Test:**
```bash
# Create endpoint with price > $0.10
# Try to call it
```

**Expected:**
- Payment blocked before attempting
- `onLimitReached` callback fired
- Consumer gets limit error
- Wallet balance unchanged

---

#### Scenario 3.2: Daily Spending Limit
**Test:** Make payments until daily limit reached

**Current config:** `maxDailySpend: 10.0`

**Test:**
```bash
# Call paid endpoint 10,001 times (10,001 × $0.001 > $10)
# Or call expensive endpoint 1,000 times
```

**Expected:**
- First 10,000 succeed (= $10.00 spent)
- 10,001st payment blocked
- `onLimitReached` callback with type='daily'
- Error message shown
- Next day (or reset), limits refresh

---

#### Scenario 3.3: Limit Callback Handling
**Test:** Verify `onLimitReached` callback receives correct data

**Expected:**
```javascript
{
  type: 'per-request' | 'daily',
  limit: 0.10 | 10.0,
  requested: <amount>,
  current: <spent_today>
}
```

---

### Category 4: Payment Patterns 🔴 TODO

#### Scenario 4.1: Rapid Sequential Calls
**Test:** Call paid endpoint 10 times in quick succession

**Expected:**
- All 10 payments succeed
- Settlement completes for each
- Wallet balance decreases correctly ($0.01 total)
- No race conditions
- Data returned for each call

---

#### Scenario 4.2: Idempotency
**Test:** Same `requestId` called twice

**Expected:**
- First call: Payment processed
- Second call: Idempotent response (no double charge)
- Wallet balance only deducted once
- Both requests get success response

**Test:**
```bash
# Modify consumer SDK to use same requestId twice
# Or call payment API directly with same requestId
```

---

#### Scenario 4.3: Mixed Free and Paid Calls
**Test:** Alternate between free and paid endpoints

**Expected:**
- Free calls: Instant response (no payment)
- Paid calls: Payment flow triggers
- Spending tracking only counts paid calls
- Both types work independently

**Command:**
```bash
cd apps/sample-consumer
# Call: current → forecast → current → forecast → current
```

---

#### Scenario 4.4: Expensive Endpoint
**Test:** Call historical weather ($0.01 per call)

**Expected:**
- 402 response with amount: 0.01
- Payment of $0.01 processed
- Settlement completes
- Verification succeeds
- 30-day historical data returned

**Command:**
```bash
cd apps/sample-consumer && pnpm dev --historical
```

---

### Category 5: Provider Features 🔴 TODO

#### Scenario 5.1: Volume Discounts
**Test:** Call same endpoint multiple times to trigger volume discount

**Setup:**
```javascript
volumeDiscounts: [
  { threshold: 10, discountPercent: 10 },   // 10% off after 10 calls
  { threshold: 100, discountPercent: 20 },  // 20% off after 100 calls
]
```

**Expected:**
- First 10 calls: $0.001 each
- Calls 11-100: $0.0009 each (10% off)
- Calls 101+: $0.0008 each (20% off)
- Pricing updates dynamically
- Dashboard shows discount tier

---

#### Scenario 5.2: Webhook Notifications
**Test:** Configure webhook URL on endpoint, make payment

**Expected:**
- Payment completes
- Webhook POST sent to configured URL
- Webhook payload includes:
  - event: 'x402.payment.completed'
  - transferId, requestId, endpointId
  - amount, currency, from, to
- Webhook fires async (doesn't block response)

**Setup:**
```bash
# Use webhook.site or requestbin to capture webhooks
# Set webhook_url on endpoint
# Make payment
```

---

#### Scenario 5.3: Multiple Endpoints per Provider
**Test:** Register 3 endpoints with different pricing

**Expected:**
- All endpoints register successfully
- Each has independent pricing
- Each tracks calls/revenue separately
- Consumer can call any endpoint
- Payments route to correct provider account

---

### Category 6: Dashboard Validation 🔴 TODO

#### Scenario 6.1: View Transactions in Dashboard
**Test:** Make several payments, check dashboard UI

**Expected:**
- Transfers page shows x402 transactions
- Purple lightning badge visible
- Filter by "x402 Payments" works
- Click transfer → detail page loads
- x402 metadata visible (endpoint, wallet, etc.)
- Dark mode looks good

**Navigate to:** `/dashboard/transfers?type=x402`

---

#### Scenario 6.2: Provider Analytics
**Test:** Make payments, check provider dashboard

**Expected:**
- x402 Analytics page shows data
- Total revenue updates
- Call count increases
- Revenue per endpoint tracked
- Charts/graphs display correctly

**Navigate to:** `/dashboard/x402/analytics`

---

#### Scenario 6.3: Consumer View
**Test:** Check consumer payment history

**Expected:**
- Consumer view shows paid endpoints
- Payment history displays
- Endpoint names shown (not "Unknown")
- Click payment → transfer detail page
- All metadata visible

**Navigate to:** `/dashboard/x402?view=consumer`

---

#### Scenario 6.4: Wallet Balance Tracking
**Test:** Make payment, check wallet in dashboard

**Expected:**
- Wallet balance decreases
- Transaction appears in wallet history
- Link from transfer to wallet works
- Search wallet by ID works
- Balance updates in real-time

**Navigate to:** `/dashboard/wallets?search=<walletId>`

---

### Category 7: SDK Features 🔴 TODO

#### Scenario 7.1: Custom Callbacks
**Test:** Implement all SDK callbacks

**Consumer SDK:**
```typescript
{
  onPayment: (payment) => { /* track */ },
  onLimitReached: (limit) => { /* alert */ },
  onError: (error) => { /* log */ }
}
```

**Expected:**
- `onPayment` fires on successful payment
- `onLimitReached` fires when limit hit
- `onError` fires on payment failure
- All callbacks receive correct data

---

#### Scenario 7.2: Manual Payment (No Auto-pay)
**Test:** Disable auto-pay, handle 402 manually

**Config:**
```typescript
fetch(url, { autoRetry: false })
```

**Expected:**
- 402 response returned to caller
- No automatic payment
- Consumer can inspect 402
- Consumer decides whether to pay
- Can call SDK.pay() manually

---

#### Scenario 7.3: Custom Payment Verification
**Test:** Provider uses custom `verifyPayment` function

**Expected:**
- Custom verifier called instead of default
- Can implement custom logic
- Return true/false controls access
- Default verifier skipped

---

### Category 8: Security & Boundary Tests 🔴 TODO

#### Scenario 8.1: Tampered Payment Proof
**Test:** Modify payment proof signature

**Expected:**
- Verification fails
- Provider returns 402 again
- Security event logged
- No data leaked

---

#### Scenario 8.2: Replay Attack
**Test:** Use old payment proof for new request

**Expected:**
- Verification checks transfer metadata
- Old proof doesn't match new request
- Blocked
- Error logged

---

#### Scenario 8.3: Cross-Tenant Access
**Test:** Use payment from Tenant A for Tenant B's endpoint

**Expected:**
- Verification fails (tenant mismatch)
- RLS policies prevent access
- Clear error message
- Security event logged

---

#### Scenario 8.4: Concurrent Payment Attempts
**Test:** Two consumers try to use same payment proof

**Expected:**
- Only one succeeds
- Database constraints prevent double-use
- Second attempt gets error
- No data duplication

---

### Category 9: Performance & Scale 🔴 TODO

#### Scenario 9.1: High-Frequency Calls
**Test:** 100 requests/second to paid endpoint

**Expected:**
- All payments process
- No race conditions
- Settlement keeps up
- Database handles load
- Response times acceptable (<500ms)

---

#### Scenario 9.2: Large Number of Endpoints
**Test:** Register 1,000 endpoints per provider

**Expected:**
- All register successfully
- SDK caches endpoints
- Lookup remains fast
- Dashboard pagination works
- No performance degradation

---

#### Scenario 9.3: Settlement Backlog
**Test:** Create 10,000 unsettled transfers, then settle

**Expected:**
- Settlement service processes all
- No deadlocks
- Status updates correctly
- Wallet balances reconcile
- Performance acceptable

---

### Category 10: Integration Tests 🔴 TODO

#### Scenario 10.1: End-to-End with Real Apps
**Test:** Build actual consumer app (e.g., chatbot) and provider (e.g., API)

**Example:**
- Provider: LLM API ($0.01 per request)
- Consumer: Chatbot that uses LLM
- Run conversation with 10 messages
- Verify all payments work
- Check dashboard shows everything

---

#### Scenario 10.2: Multi-Provider Scenario
**Test:** Consumer uses 3 different provider APIs

**Expected:**
- Consumer can authenticate to all 3
- Payments route to correct providers
- Spending limits apply across all
- Dashboard aggregates spending
- Each provider sees only their revenue

---

#### Scenario 10.3: Agent Autonomy
**Test:** Agent makes decisions about which APIs to call

**Expected:**
- Agent checks prices before calling
- Agent respects budget constraints
- Agent tracks spending
- Agent switches to cheaper alternatives if over budget
- All autonomous decisions logged

---

## 📋 Testing Priority

### P0 (Critical - Test Now)
- [x] Scenario 4.4: Expensive endpoint ($0.01) ✅
- [x] Scenario 3.1: Per-request limit ✅
- [x] Scenario 3.2: Daily spending limit ❌ **BUG FOUND**
- [x] Scenario 4.1: Rapid sequential calls ✅
- [ ] Scenario 6.1: Dashboard transaction view ⏭️ (Dashboard not running)

### P1 (High - Test Soon)
- [x] Scenario 2.1: Insufficient balance ✅ (Code verified)
- [ ] Scenario 4.2: Idempotency
- [ ] Scenario 5.1: Volume discounts
- [ ] Scenario 6.2: Provider analytics
- [ ] Scenario 6.3: Consumer view

### P2 (Medium - Test Before Production)
- [ ] Scenario 2.2: Invalid payment proof
- [ ] Scenario 5.2: Webhook notifications
- [ ] Scenario 7.1: Custom callbacks
- [ ] Scenario 8.1: Tampered proof
- [ ] Scenario 9.1: High-frequency calls

### P3 (Nice to Have)
- [ ] Scenario 8.3: Cross-tenant access
- [ ] Scenario 9.2: Large number of endpoints
- [ ] Scenario 10.1: Real app integration

---

## 🎯 Recommended Next Test

**START WITH: Scenario 4.4 - Expensive Endpoint**

Why?
1. Tests higher-value transaction ($0.01 vs $0.001)
2. Validates pricing flexibility
3. Tests settlement with larger amounts
4. Verifies consumer SDK handles variable pricing
5. Quick to execute (1 command)

**Command:**
```bash
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
pnpm dev --historical
```

**Expected Result:**
- Consumer pays $0.01 (10x more expensive)
- Settlement completes
- 30-day historical weather data returned
- Wallet balance: $99.991 → $99.981

---

## 📊 Test Coverage Matrix

| Category | Scenarios | Priority | Status |
|----------|-----------|----------|--------|
| Basic Flow | 5 | P0 | ✅ DONE |
| Error Scenarios | 4 | P0-P1 | 🔴 TODO |
| Spending Limits | 3 | P0 | 🔴 TODO |
| Payment Patterns | 4 | P0-P1 | 🔴 TODO |
| Provider Features | 3 | P1 | 🔴 TODO |
| Dashboard | 4 | P0-P1 | 🔴 TODO |
| SDK Features | 3 | P1-P2 | 🔴 TODO |
| Security | 4 | P2 | 🔴 TODO |
| Performance | 3 | P2 | 🔴 TODO |
| Integration | 3 | P3 | 🔴 TODO |

**Total:** 36 scenarios  
**Completed:** 11 (31%)  
**Failed:** 1 (3% - critical bug)  
**Remaining:** 24 (67%)

---

## 🚀 Quick Test Commands

```bash
# Test expensive endpoint
cd apps/sample-consumer && pnpm dev --historical

# Test rapid calls
for i in {1..10}; do 
  cd apps/sample-consumer && pnpm dev --forecast &
done
wait

# Test spending limit
# (requires modifying consumer config to lower limits)

# Check dashboard
open http://localhost:3000/dashboard/transfers?type=x402
open http://localhost:3000/dashboard/x402/analytics
open http://localhost:3000/dashboard/x402?view=consumer
```

---

## 📝 Test Documentation Template

For each test, document:
```markdown
### Test: [Scenario Name]
**Date:** YYYY-MM-DD
**Tester:** [Name]
**Result:** ✅ PASS / ❌ FAIL

**Steps:**
1. ...
2. ...

**Expected:**
- ...

**Actual:**
- ...

**Issues Found:**
- ...

**Screenshots:** (if applicable)
```

