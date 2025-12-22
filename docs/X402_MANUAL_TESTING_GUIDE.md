# x402 Manual Testing Guide

**Version:** 1.0  
**Date:** December 22, 2025  
**Purpose:** Manual validation of 3 business scenarios for x402 infrastructure

---

## 🎯 Overview

This guide provides step-by-step instructions for manually testing the 3 core x402 business scenarios:

1. **Scenario 1:** Register x402 Endpoint (Provider Side)
2. **Scenario 2:** Agent Makes x402 Payment (Consumer Side)
3. **Scenario 3:** Monitor Agent Spending (Parent Account)

Each scenario can be tested via:
- ✅ **UI** (https://payos.vercel.app)
- ✅ **API** (https://payos-production.up.railway.app)
- ✅ **Automated Script** (tsx scripts/test-scenario-X-*.ts)

---

## 🔐 Test Account Credentials

**Email:** `haxaco@gmail.com`  
**Password:** `Password123!`

**Production URLs:**
- Frontend: https://payos.vercel.app
- API: https://payos-production.up.railway.app

---

## 📋 Scenario 1: Register x402 Endpoint (Provider Side)

### **Goal:** Monetize an API endpoint via x402

### **Actor:** API Provider (PayOS Tenant)

### **Expected Duration:** 10-15 minutes

---

### **Step 1: Navigate to x402 Dashboard**

**UI Path:**
1. Log in to https://payos.vercel.app/auth/login
2. Click "x402 Endpoints" in the sidebar (under "x402 Payments" section)
3. URL: `/dashboard/x402/endpoints`

**Expected Result:**
- See x402 Endpoints page
- Stats cards showing: Total Endpoints, Total Revenue, Total API Calls
- List of existing endpoints (may be empty on first visit)

---

### **Step 2: Register New Endpoint**

**UI Steps:**
1. Click "Register Endpoint" button (top right)
2. Fill in the form:
   - **Name:** "LATAM Compliance Check API"
   - **Path:** "/api/compliance/check"
   - **Method:** POST
   - **Base Price:** 0.25
   - **Currency:** USDC
   - **Description:** "KYC/AML compliance verification for LATAM region"
   - **Volume Discounts** (optional):
     - Threshold: 1000, Price Multiplier: 0.8 (= $0.20 per call)
     - Threshold: 5000, Price Multiplier: 0.6 (= $0.15 per call)
   - **Webhook URL** (optional): "https://api.example.com/webhooks/x402"
3. Click "Submit"

**API Alternative:**
```bash
curl -X POST https://payos-production.up.railway.app/v1/x402/endpoints \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "YOUR_ACCOUNT_ID",
    "name": "LATAM Compliance Check API",
    "path": "/api/compliance/check",
    "method": "POST",
    "description": "KYC/AML compliance verification for LATAM region",
    "basePrice": 0.25,
    "currency": "USDC",
    "volumeDiscounts": [
      { "threshold": 1000, "priceMultiplier": 0.8 },
      { "threshold": 5000, "priceMultiplier": 0.6 }
    ],
    "webhookUrl": "https://api.example.com/webhooks/x402"
  }'
```

**Expected Result:**
- Success message
- Endpoint appears in the list
- Endpoint Details Card shows:
  - Status: Active (green badge)
  - Method: POST (blue badge)
  - Price: $0.25 USDC
  - Calls: 0
  - Revenue: $0.00

---

### **Step 3: View Endpoint Details**

**UI Steps:**
1. Find your endpoint in the list
2. Click on the endpoint card

**What to Verify:**
- ✅ Name matches
- ✅ Path displays correctly
- ✅ Base price shows $0.25 USDC
- ✅ Volume discounts listed (if added)
- ✅ Status is "active"
- ✅ Total Calls: 0
- ✅ Total Revenue: $0.00

---

### **Step 4: Integrate Provider SDK** (Conceptual)

**In a real application, you would:**
```typescript
import { createX402ProviderMiddleware } from '@payos/x402-provider-sdk';

// Add to your API server
app.use('/api/compliance/check', 
  createX402ProviderMiddleware({
    endpointId: 'YOUR_ENDPOINT_ID',
    verifyPayment: async (proof) => {
      // Verify with PayOS API
      return await verifyX402Payment(proof);
    }
  }),
  // Your actual endpoint handler
  async (req, res) => {
    res.json({ result: 'verified', risk_score: 0.12 });
  }
);
```

**For Testing:**
- Make note of the Endpoint ID
- This will be used in Scenario 2

---

### **Step 5: Simulate a Paid API Call**

**To simulate receiving payment:**
1. Use the automated test script:
   ```bash
   cd /Users/haxaco/Dev/PayOS
   tsx scripts/test-scenario-1-provider.ts
   ```

**OR manually via API:**
1. Create a test wallet (Scenario 2)
2. Make a payment to this endpoint
3. Verify payment
4. Check that endpoint stats update

---

### **Step 6: Monitor Revenue**

**UI Steps:**
1. Return to x402 Endpoints page
2. Refresh the page

**What to Verify:**
- ✅ Total Revenue stat card updated
- ✅ Total API Calls stat card updated
- ✅ Endpoint card shows updated stats:
  - Calls: Incremented
  - Revenue: Increased by payment amount

---

### **Step 7: Test Volume Discounts** (Optional)

**To verify volume pricing:**
1. Make 1000+ payments
2. Check that pricing changes to $0.20
3. Make 5000+ payments
4. Check that pricing changes to $0.15

**Use automated script for this:**
```bash
tsx scripts/test-scenario-1-provider.ts
```

---

### **Step 8: Update Endpoint**

**UI Steps:**
1. Click "..." menu on endpoint card
2. Select "Edit"
3. Update:
   - Base Price: 0.30
   - Description: "Updated: KYC/AML compliance verification..."
4. Click "Save"

**Expected Result:**
- Endpoint updated successfully
- New price reflected in UI
- Description updated

---

### **Step 9: Pause/Resume Endpoint**

**UI Steps:**
1. Click "..." menu on endpoint card
2. Select "Pause"
3. Verify status changes to "paused" (yellow badge)
4. Try to make a payment (should fail)
5. Click "..." menu again
6. Select "Resume"
7. Verify status changes to "active" (green badge)

---

### ✅ **Scenario 1 Success Criteria**

- [ ] Endpoint registered successfully
- [ ] Endpoint appears in list
- [ ] Volume discounts configured
- [ ] Stats (calls, revenue) display correctly
- [ ] Endpoint can be updated
- [ ] Endpoint can be paused/resumed
- [ ] Provider SDK integration understood

---

## 📋 Scenario 2: Agent Makes x402 Payment (Consumer Side)

### **Goal:** Autonomous agent makes paid API calls

### **Actor:** AI Agent (autonomous)

### **Expected Duration:** 15-20 minutes

---

### **Step 1: Create Agent Account**

**UI Path:**
1. Navigate to `/dashboard/x402/agents`
2. Click "Register Agent" button

**OR via API:**
```bash
curl -X POST https://payos-production.up.railway.app/v1/agents/x402/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Compliance Bot",
    "description": "Autonomous agent for compliance checks",
    "parentAccountId": "YOUR_ACCOUNT_ID",
    "spendingPolicy": {
      "dailyLimit": 100,
      "monthlyLimit": 2000,
      "approvedEndpoints": ["ENDPOINT_ID_FROM_SCENARIO_1"],
      "autoFund": {
        "threshold": 100,
        "amount": 200
      }
    },
    "initialBalance": 500,
    "currency": "USDC"
  }'
```

**Expected Result:**
- Agent created
- Wallet automatically created
- Wallet funded with $500 USDC
- Spending policies set

---

### **Step 2: View Agent in Dashboard**

**UI Path:**
1. Go to `/dashboard/x402/agents`
2. Find your "Compliance Bot" agent

**What to Verify:**
- ✅ Agent card displays
- ✅ Status: Active (green badge)
- ✅ Wallet section shows:
  - Balance: $500.00 USDC
  - Daily limit: $100/day
  - (or policy details)
- ✅ "Configure" button visible

---

### **Step 3: Agent Calls Paid API (Receives 402)**

**Simulated Flow:**
```
Agent → GET /api/compliance/check
     ← 402 Payment Required
       Headers:
         X-Payment-Endpoint-Id: abc123
         X-Payment-Amount: 0.25
         X-Payment-Currency: USDC
         X-Payment-Request-Id: req_xyz
```

**For Testing:**
Use the automated script:
```bash
tsx scripts/test-scenario-2-agent.ts
```

---

### **Step 4: Agent Pays Autonomously**

**The agent (via Consumer SDK) automatically:**
1. Gets quote: `GET /v1/x402/quote/{endpointId}`
2. Checks spending policy:
   - ✅ Is endpoint approved?
   - ✅ Daily limit remaining?
   - ✅ Monthly limit remaining?
   - ✅ Requires approval? (threshold check)
3. If all checks pass, processes payment:
   ```bash
   POST /v1/x402/pay
   {
     "endpointId": "abc123",
     "walletId": "wallet_xyz",
     "requestId": "req_xyz",
     "amount": 0.25
   }
   ```

**Expected Result:**
- Payment processed successfully
- Wallet balance decremented: $499.75
- Transfer created
- Payment proof returned

---

### **Step 5: Agent Retries with Proof**

**Simulated Flow:**
```
Agent → GET /api/compliance/check
        Header: X-Payment-Proof: proof_xyz
     ← 200 OK
       { result: "verified", risk_score: 0.12 }
```

**Provider verifies payment:**
```bash
POST /v1/x402/verify
{
  "transferId": "tx_abc",
  "expectedAmount": 0.25,
  "endpointId": "abc123"
}
```

**Expected Result:**
- `{ verified: true, status: "confirmed" }`
- API returns data to agent

---

### **Step 6: View Updated Wallet**

**UI Path:**
1. Go to `/dashboard/x402/wallets`
2. Find "Compliance Bot" wallet

**What to Verify:**
- ✅ Balance updated: $499.75
- ✅ Transaction appears in recent activity
- ✅ Spending metrics updated

**OR via API:**
```bash
curl https://payos-production.up.railway.app/v1/wallets/WALLET_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **Step 7: Test Spending Policy - Daily Limit**

**Test Steps:**
1. Make multiple payments until daily limit approaches
2. Try to exceed daily limit
3. Verify payment is rejected

**Use automated script:**
```bash
tsx scripts/test-scenario-2-agent.ts
# (includes policy enforcement tests)
```

**Expected Result:**
- Payments succeed until limit
- Payment rejected with error: "Daily spending limit exceeded"

---

### **Step 8: Test Spending Policy - Approved Endpoints**

**Test Steps:**
1. Create a second endpoint (not in approved list)
2. Try to pay that endpoint with agent wallet
3. Verify payment is rejected

**Expected Result:**
- Payment rejected with error: "Endpoint not in approved list"

---

### **Step 9: Test Spending Policy - Approval Threshold**

**Test Steps:**
1. Try to make a payment > $50 (approval threshold)
2. Verify payment is held for approval (or rejected)

**Expected Result:**
- Payment requires manual approval
- Status: "pending_approval"

---

### **Step 10: Test Auto-Funding**

**Test Steps:**
1. Make payments until balance < $100 (threshold)
2. Verify auto-fund triggers
3. Check that $200 is added to wallet

**Expected Result:**
- Balance automatically refilled
- Transfer from parent account to agent wallet

---

### ✅ **Scenario 2 Success Criteria**

- [ ] Agent account created with wallet
- [ ] Spending policies configured
- [ ] Agent can make autonomous payments
- [ ] 402 response handled correctly
- [ ] Payment verification works
- [ ] Daily limit enforced
- [ ] Monthly limit enforced
- [ ] Approved endpoints enforced
- [ ] Approval threshold respected
- [ ] Auto-funding triggers correctly

---

## 📋 Scenario 3: Monitor Agent Spending (Parent Account)

### **Goal:** Business monitors and controls agent spending

### **Actor:** Business User (Agent Owner)

### **Expected Duration:** 10-15 minutes

---

### **Step 1: Navigate to Agent Wallets Dashboard**

**UI Path:**
1. Log in as parent account
2. Click "Wallets" in sidebar (under "x402 Payments")
3. URL: `/dashboard/x402/wallets`

**Expected Result:**
- See all wallets
- Agent-managed wallets highlighted
- Stats cards show:
  - Total Wallets
  - Total Balance
  - Agent-Managed count

---

### **Step 2: View Wallet Overview**

**UI Display:**
```
┌─────────────────────────────────────────┐
│ Compliance Bot                          │
│ Balance: $475.25 USDC                   │
│                                          │
│ Daily Limit: $24.75 / $100 used         │
│ [████░░░░░░] 24.75%                     │
│                                          │
│ Monthly Limit: $24.75 / $2,000 used     │
│ [█░░░░░░░░░] 1.24%                      │
│                                          │
│ Status: Active                          │
│ [Pause] [Adjust Limits] [View Txs]      │
└─────────────────────────────────────────┘
```

**What to Verify:**
- ✅ Current balance displays
- ✅ Daily limit usage shows (with progress bar)
- ✅ Monthly limit usage shows (with progress bar)
- ✅ Status is "Active"
- ✅ Action buttons available

---

### **Step 3: View Transaction History**

**UI Steps:**
1. Click "View Txs" button on wallet card

**Expected Display:**
```
Recent Payments:
┌──────────────────────────────────────────┐
│ 10:23 AM - Compliance Check              │
│ api.acme.com/compliance/check            │
│ -$0.25 USDC                              │
│ Status: Confirmed                        │
├──────────────────────────────────────────┤
│ 10:15 AM - FX Rate Query                 │
│ api.acme.com/fx/rate                     │
│ -$0.05 USDC                              │
│ Status: Confirmed                        │
├──────────────────────────────────────────┤
│ 10:10 AM - Compliance Check              │
│ api.acme.com/compliance/check            │
│ -$0.25 USDC                              │
│ Status: Confirmed                        │
└──────────────────────────────────────────┘
```

**What to Verify:**
- ✅ Transactions listed chronologically
- ✅ Each shows: Time, Description, Amount, Status
- ✅ Correct amounts deducted
- ✅ All statuses are "Confirmed"

---

### **Step 4: Adjust Spending Limits**

**UI Steps:**
1. Click "Adjust Limits" button
2. Modal opens with current limits
3. Update:
   - Daily Limit: $150 (from $100)
   - Monthly Limit: $3000 (from $2000)
4. Click "Save"

**API Alternative:**
```bash
curl -X PATCH https://payos-production.up.railway.app/v1/wallets/WALLET_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spendingPolicy": {
      "dailyLimit": 150,
      "monthlyLimit": 3000
    }
  }'
```

**Expected Result:**
- Limits updated successfully
- Progress bars recalculate
- Percentage usage decreases

---

### **Step 5: Pause Agent Wallet**

**UI Steps:**
1. Click "Pause" button on wallet card
2. Confirm action
3. Verify status changes to "Frozen" (blue badge)

**What Happens:**
- Agent can no longer make payments
- Existing payments still valid
- Wallet balance preserved

**Test It:**
Try to make a payment with paused wallet:
```bash
# Should return error: "Wallet is frozen"
```

**Expected Result:**
- ✅ Status shows "Frozen"
- ✅ Payments blocked
- ✅ Error message clear

---

### **Step 6: Monitor Spending in Real-Time**

**UI Path:**
1. Go to `/dashboard/x402/agents`
2. View agent card

**What to Monitor:**
- Current balance
- Daily spending progress
- Monthly spending progress
- Recent transaction count
- Policy compliance status

**Set up alerts (future feature):**
- Alert when 80% of daily limit used
- Alert when wallet balance < threshold
- Alert when unusual spending pattern

---

### **Step 7: Resume Agent Wallet**

**UI Steps:**
1. Click "Resume" button on wallet card
2. Confirm action
3. Verify status changes to "Active" (green badge)

**Test It:**
Make a payment to verify wallet is active again.

**Expected Result:**
- ✅ Status shows "Active"
- ✅ Payments work again
- ✅ Spending limits still enforced

---

### **Step 8: View Multi-Agent Overview**

**UI Path:**
1. Go to `/dashboard/x402/agents`
2. View all agents

**What to Verify:**
- ✅ All agents listed
- ✅ Each shows wallet status
- ✅ Balance visible for each
- ✅ Can identify which agents are spending most

**Stats Cards Show:**
- Total Agents: X
- Agents with Wallets: Y
- Total Wallet Balance: $Z

---

### **Step 9: Generate Spending Report**

**Use automated script:**
```bash
tsx scripts/test-scenario-3-monitoring.ts
```

**Report Shows:**
```
╔══════════════════════════════════════════════════════╗
║           Agent Spending Report                      ║
╚══════════════════════════════════════════════════════╝

Agent: Compliance Bot
Period: Last 24 hours

Financial Summary:
  Initial Balance:    $500.00
  Current Balance:    $475.25
  Total Spent:        $24.75

Activity:
  Total Transactions: 10
  Average per Tx:     $2.48

Policy Compliance:
  Daily Limit:        $24.75 / $100.00 (24.8%)
  Monthly Limit:      $24.75 / $2,000.00 (1.2%)
  Status:             ✅ Within Limits
```

---

### **Step 10: Take Corrective Action**

**If spending is too high:**
1. Pause wallet immediately
2. Adjust limits down
3. Review transaction history
4. Identify spending patterns
5. Update spending policy
6. Resume with new limits

**If wallet depleted:**
1. Add funds (deposit)
2. Adjust auto-fund settings
3. Increase auto-fund amount

**If unauthorized spending:**
1. Pause wallet
2. Review approved endpoints
3. Remove unauthorized endpoints
4. Resume wallet

---

### ✅ **Scenario 3 Success Criteria**

- [ ] Can view all agent wallets
- [ ] Balance displays correctly
- [ ] Spending limits visible
- [ ] Transaction history accessible
- [ ] Can adjust limits
- [ ] Can pause/resume wallets
- [ ] Multi-wallet overview works
- [ ] Spending reports generate
- [ ] Real-time monitoring possible
- [ ] Corrective actions work

---

## 🤖 Automated Testing

All 3 scenarios have automated test scripts:

### **Run All Tests:**
```bash
cd /Users/haxaco/Dev/PayOS

# Scenario 1: Provider
tsx scripts/test-scenario-1-provider.ts

# Scenario 2: Agent Payments
tsx scripts/test-scenario-2-agent.ts

# Scenario 3: Monitoring
tsx scripts/test-scenario-3-monitoring.ts
```

### **Parallel Testing (for LLMs like Gemini):**
```bash
# Run all 3 in parallel
tsx scripts/test-scenario-1-provider.ts & \
tsx scripts/test-scenario-2-agent.ts & \
tsx scripts/test-scenario-3-monitoring.ts & \
wait
```

---

## 📊 Test Results Template

Use this template to record your testing results:

```markdown
## Test Execution Report

**Date:** YYYY-MM-DD
**Tester:** [Name/LLM]
**Environment:** Production / Staging / Local

### Scenario 1: Register x402 Endpoint
- [ ] Step 1-9 completed
- [ ] All success criteria met
- [ ] Issues found: [None / List]
- [ ] Screenshots: [Attached]

### Scenario 2: Agent Payment
- [ ] Step 1-10 completed
- [ ] All success criteria met
- [ ] Policy enforcement verified
- [ ] Issues found: [None / List]

### Scenario 3: Monitoring
- [ ] Step 1-10 completed
- [ ] All success criteria met
- [ ] Dashboard functionality verified
- [ ] Issues found: [None / List]

### Overall Status
- **Passed:** X/30 steps
- **Failed:** Y/30 steps
- **Blockers:** [None / List]
- **Recommendation:** [Pass / Fix & Retest]
```

---

## 🐛 Troubleshooting

### **Issue: Can't log in**
- Verify credentials: `haxaco@gmail.com` / `Password123!`
- Check production URL: https://payos.vercel.app
- Try incognito mode

### **Issue: Endpoint not appearing**
- Refresh page
- Check API response for errors
- Verify accountId is correct
- Check RLS policies

### **Issue: Payment fails**
- Check wallet balance
- Verify spending policies
- Check wallet status (not frozen)
- Verify endpoint is approved

### **Issue: Stats not updating**
- Refresh page
- Check API directly
- Verify RLS permissions
- Check database triggers

---

## ✅ Final Checklist

Before marking testing complete:

### **Functional**
- [ ] All 3 scenarios tested
- [ ] All UI pages accessible
- [ ] All API endpoints working
- [ ] All spending policies enforced

### **Security**
- [ ] RLS enforced (can't see other tenants' data)
- [ ] Authentication required
- [ ] Spending limits can't be bypassed
- [ ] Wallet freeze works

### **Performance**
- [ ] Pages load quickly
- [ ] API responses < 500ms
- [ ] No console errors
- [ ] Mobile responsive

### **UX**
- [ ] Empty states helpful
- [ ] Error messages clear
- [ ] Success feedback visible
- [ ] Navigation intuitive

---

**Testing Complete!** 🎉

*This guide ensures comprehensive validation of all x402 features across the 3 core business scenarios.*

