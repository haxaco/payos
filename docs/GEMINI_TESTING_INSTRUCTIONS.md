# Testing Instructions for Gemini

**Date:** December 23, 2025  
**Version:** Wallet v2 + x402 Complete Testing Suite  
**Purpose:** Guide Gemini through comprehensive x402 and wallet testing

---

## 🎯 What You're Testing

The PayOS x402 payment infrastructure, including:
1. **x402 Endpoints** - API providers monetizing their services
2. **Agent Wallets** - Autonomous agents making payments
3. **Spending Controls** - Policy enforcement and monitoring
4. **Enhanced Wallets** - Multiple wallet types and external wallet support

### **Important Terminology:**
- **`x402_endpoints.payment_address`** = Where to send payments for an API endpoint
- **`wallets.wallet_address`** = The wallet's unique address/identifier
  - For internal wallets: `internal://payos/...`
  - For external wallets: `0x...` (Ethereum address)
  - For Circle wallets: `0x...` (mock address in Phase 1)

---

## 🚀 Quick Start

### **1. Authentication**
All tests use the same test account:
```
Email: haxaco@gmail.com
Password: Password123!
```

### **2. API URLs**
```
Production API: https://payos-production.up.railway.app
Production UI: https://payos.vercel.app
Local API: http://localhost:4000 (if running locally)
```

### **3. Run All Tests**
```bash
cd /Users/haxaco/Dev/PayOS

# Run all 4 test suites in parallel
tsx scripts/test-scenario-1-provider.ts & \
tsx scripts/test-scenario-2-agent.ts & \
tsx scripts/test-scenario-3-monitoring.ts & \
tsx scripts/test-wallet-features.ts & \
wait
```

---

## 📋 Test Suites

### **Test Suite 1: x402 Provider (Scenario 1)**
**File:** `scripts/test-scenario-1-provider.ts`  
**Duration:** ~10 seconds  
**What it tests:**
- Register x402 endpoint
- Configure pricing and volume discounts
- Receive payments
- Track revenue and call counts
- Update endpoint configuration

**Run:**
```bash
tsx scripts/test-scenario-1-provider.ts
```

**Expected Output:**
```
✅ Passed: 7/7
❌ Failed: 0/7
⏱️  Duration: ~10s
```

---

### **Test Suite 2: x402 Agent Payments (Scenario 2)**
**File:** `scripts/test-scenario-2-agent.ts`  
**Duration:** ~15 seconds  
**What it tests:**
- Create agent account with wallet
- Configure spending policies
- Make autonomous payments
- Enforce spending limits
- Approve/deny based on policy
- Test approved endpoints list

**Run:**
```bash
tsx scripts/test-scenario-2-agent.ts
```

**Expected Output:**
```
✅ Passed: 10/10
❌ Failed: 0/10
⏱️  Duration: ~15s
```

---

### **Test Suite 3: Monitoring & Controls (Scenario 3)**
**File:** `scripts/test-scenario-3-monitoring.ts`  
**Duration:** ~12 seconds  
**What it tests:**
- View agent wallet dashboard
- Monitor spending in real-time
- Adjust spending limits
- Pause/resume wallets
- Generate spending reports
- Take corrective actions

**Run:**
```bash
tsx scripts/test-scenario-3-monitoring.ts
```

**Expected Output:**
```
✅ Passed: 8/8
❌ Failed: 0/8
⏱️  Duration: ~12s
```

---

### **Test Suite 4: Enhanced Wallet Features** (NEW)
**File:** `scripts/test-wallet-features.ts`  
**Duration:** ~15 seconds  
**What it tests:**
- Create internal wallet (PayOS custodial)
- Create multiple wallets per account
- Link external wallet (self-custody)
- Verify external wallet ownership
- Create Circle wallet (mocked)
- Test wallet type-specific behaviors
- Deposit/withdraw operations
- Wallet type validation

**Run:**
```bash
tsx scripts/test-wallet-features.ts
```

**Expected Output:**
```
✅ Passed: 10/10
❌ Failed: 0/10
⏱️  Duration: ~15s
```

---

## 📊 Expected Results Summary

### **All Tests Passing:**
```
╔══════════════════════════════════════════════════════════════╗
║                OVERALL TEST RESULTS                          ║
╚══════════════════════════════════════════════════════════════╝

Test Suite 1 (Provider):       ✅ 7/7 passed
Test Suite 2 (Agent):          ✅ 10/10 passed
Test Suite 3 (Monitoring):     ✅ 8/8 passed
Test Suite 4 (Wallets):        ✅ 10/10 passed
────────────────────────────────────────────────────────────────
Total:                         ✅ 35/35 passed (100%)
Duration:                      ~52s
Status:                        🎉 ALL TESTS PASSED
```

---

## 🐛 What to Do if Tests Fail

### **If authentication fails:**
1. Check API is accessible: `curl https://payos-production.up.railway.app/health`
2. Verify credentials are correct
3. Check if account exists in database

### **If endpoint creation fails:**
1. Check for duplicate path/method combinations
2. Verify account ID is valid
3. Check RLS policies allow creation

### **If payments fail:**
1. Verify wallet has sufficient balance
2. Check spending policy configuration
3. Ensure endpoint is in approved list
4. Verify wallet is not frozen

### **If wallet operations fail:**
1. Check wallet type supports operation
2. Verify external wallets are verified before use
3. Check for rate limiting issues
4. Verify account ownership

---

## 📝 How to Report Results

### **Option 1: Automated Summary**
All test scripts output a summary automatically:
```
✅ Passed: X/Y
❌ Failed: Z/Y
⏱️  Duration: Ns
```

Copy the entire terminal output to your report.

### **Option 2: Structured Report**
Create a report using this template:

```markdown
# Gemini Test Execution Report

**Date:** YYYY-MM-DD HH:MM  
**Environment:** Production  
**Tester:** Gemini

## Test Results

### Scenario 1: x402 Provider
- Status: ✅ PASSED / ❌ FAILED
- Steps: 7/7
- Duration: Xs
- Issues: None / [List]

### Scenario 2: x402 Agent Payments
- Status: ✅ PASSED / ❌ FAILED
- Steps: 10/10
- Duration: Xs
- Issues: None / [List]

### Scenario 3: Monitoring & Controls
- Status: ✅ PASSED / ❌ FAILED
- Steps: 8/8
- Duration: Xs
- Issues: None / [List]

### Scenario 4: Enhanced Wallets
- Status: ✅ PASSED / ❌ FAILED
- Steps: 10/10
- Duration: Xs
- Issues: None / [List]

## Summary
- **Total Tests:** 35
- **Passed:** X
- **Failed:** Y
- **Success Rate:** Z%
- **Overall Status:** ✅ PASS / ❌ FAIL

## Issues Found
[None / Detailed list of any issues]

## Recommendations
[Any suggestions for improvements]
```

---

## 🔍 Manual Verification (Optional)

If you want to verify things manually via the UI:

### **1. Check x402 Endpoints**
- Navigate to: https://payos.vercel.app/dashboard/x402/endpoints
- Verify endpoints are listed
- Check stats cards show correct data

### **2. Check Wallets**
- Navigate to: https://payos.vercel.app/dashboard/x402/wallets
- Verify all wallets appear
- Check balances are correct
- Verify wallet types displayed

### **3. Check Agents**
- Navigate to: https://payos.vercel.app/dashboard/x402/agents
- Verify agents listed
- Check spending policies display
- Verify wallet associations

---

## 📚 Additional Documentation

For more detailed testing instructions:

1. **x402 Core Features:**
   - [`docs/X402_MANUAL_TESTING_GUIDE.md`](./X402_MANUAL_TESTING_GUIDE.md)
   - Comprehensive manual testing steps
   - UI screenshots and expected behavior
   - Troubleshooting guide

2. **Enhanced Wallet Features:**
   - [`docs/X402_WALLET_TESTING_GUIDE.md`](./X402_WALLET_TESTING_GUIDE.md)
   - Wallet type-specific testing
   - External wallet verification
   - Circle integration testing

3. **Previous Test Reports:**
   - [`docs/X402_TEST_REPORT.md`](./X402_TEST_REPORT.md)
   - Issues found and resolved
   - Testing history

4. **Implementation Details:**
   - [`docs/EPIC_17_18_X402_IMPLEMENTATION_PLAN.md`](./EPIC_17_18_X402_IMPLEMENTATION_PLAN.md)
   - Architecture and design decisions
   - API specifications

---

## ✅ Final Checklist

Before submitting your test report:

- [ ] All 4 automated test suites executed
- [ ] Test results documented (pass/fail counts)
- [ ] Any failures investigated and documented
- [ ] API accessibility confirmed
- [ ] Authentication working
- [ ] Test duration reasonable (~50-60s total)
- [ ] No unexpected errors in output
- [ ] Summary report generated

---

## 🎉 Success Criteria

The testing is considered **SUCCESSFUL** if:

1. ✅ All 35 automated tests pass (100% success rate)
2. ✅ No critical errors or crashes
3. ✅ Test execution completes in < 2 minutes
4. ✅ All wallet types work correctly
5. ✅ Spending policies enforced properly
6. ✅ x402 payment flow works end-to-end

---

## 🚨 Priority Issues to Report

If you encounter these, report immediately:

1. **Authentication failures** - Blocks all testing
2. **Database errors** - Indicates data corruption
3. **Policy bypasses** - Security vulnerability
4. **Wallet balance errors** - Financial integrity issue
5. **Payment failures** - Core functionality broken

---

## 📞 Getting Help

If you need clarification or encounter issues:

1. Check the detailed testing guides (linked above)
2. Review previous test reports for similar issues
3. Check API logs if accessible
4. Document the issue with full error details

---

**Happy Testing!** 🧪

*This comprehensive test suite validates all x402 and wallet features across 35 automated tests.*

