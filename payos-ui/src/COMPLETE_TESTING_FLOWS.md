# Complete PayOS Testing Flows

## Overview

This guide covers testing for **ALL implemented features** across multiple development rounds:

- **Round 3.1** (COMPLETE): 11 streaming & payment features  
- **Round 3.2** (PARTIAL): Agent-Account relationships & Reports

---

## 🎯 Round 3.1: Streaming Features (COMPLETE & READY TO TEST)

### Flow 1: Stream Health Monitoring (5 min)

**Path:** Homepage → Accounts → TechCorp Inc → Streams tab

#### What You'll See:

1. **Critical Banner** (red at top):
   - "Critical: Streams Will Pause Soon"
   - "1 stream(s) have less than 24 hours of runway"
   - Red "Top Up Now" button

2. **Streams Table** with 5 columns:
   ```
   Recipient     | Flow Rate  | Streamed | Runway   | Status        | Actions
   ------------- | ---------- | -------- | -------- | ------------- | --------
   Maria Garcia  | $2,000/mo  | $1,847   | 23 days  | 🟢 Streaming  | [Top Up]🔘[⏸][✏][✕]
   Carlos M.     | $1,800/mo  | $1,662   | 5 days   | ⚠️ Low Bal   | [Top Up]🟡[⏸][✏][✕]
   Ana Rodriguez | $2,200/mo  | $2,032   | 30 days  | 🟢 Streaming  | [Top Up]🔘[⏸][✏][✕]
   Luis F.       | $1,500/mo  | $1,385   | Paused   | ⏸️ Paused     | [▶][✏][✕]
   Sofia Herrera | $2,500/mo  | $890     | 16 hours | 🔴 Critical   | [Top Up]🔴[⏸][✏][✕]
   ```

#### Test Checklist:
- [ ] Critical banner appears
- [ ] 5 different status badges (green/amber/red/gray)
- [ ] Runway column shows time remaining
- [ ] Runway text is color-coded (gray/amber/red)
- [ ] Top Up buttons are color-coded (gray/amber/red)
- [ ] Luis shows Play ▶️ instead of Top Up
- [ ] Sofia's Top Up button is RED (most prominent)

---

### Flow 2: Balance Breakdown (3 min)

**Path:** Homepage → Accounts → TechCorp Inc (stay on Overview)

#### What You'll See:

**Balance Card** (middle card in header):
```
Balance
$45,200.00

[████████████████████████████|▓]
  ←——— Available (98.9%) ——→  ← In Streams (1.1%)

● Available                    $44,700
● In Streams ⚡                  $500
  └─ Buffer held                $27.32
  └─ Streaming out             $472.68

──────────────────────────────
Net Flow              -$10,000/mo
5 outgoing streams
```

#### Test Checklist:
- [ ] Visual progress bar (blue + green segments)
- [ ] Available shows $44,700
- [ ] In Streams shows $500
- [ ] Buffer and Streaming breakdown visible
- [ ] Net Flow shows -$10,000/mo
- [ ] "5 outgoing streams" text appears

---

### Flow 3: New Payment Modal (4 min)

**Path:** TechCorp Inc → Streams tab → "+ New Stream" button

#### What You'll See:

**Modal Title:** "New Payment"

**Payment Type Toggle:**
```
[One-Time 💸]               [Stream ⚡ Beta] ← Selected
Send fixed amount once      Pay continuously over time
```

**When Stream Selected:**
- Monthly Rate: $____
- Per-second calculation (e.g., "= $0.000772/second")
- Duration: ⚪ Until cancelled / ⚪ Fixed: [__] months
- Initial Funding: ⚪ Minimum / ⚪ One month
- Stream Protection: ✅ Auto-pause / ☐ Auto-wrap
- Button: Green "Start Stream"

**When One-Time Selected:**
- Amount: $____  
- No per-second calc
- No duration/funding/protection options
- Button: Blue "Send Payment"

#### Test Checklist:
- [ ] Modal opens from "+ New Stream"
- [ ] Stream is pre-selected (not One-Time)
- [ ] Toggle works (Stream ↔ One-Time)
- [ ] Per-second calculation shows when amount entered
- [ ] Stream options appear/disappear based on toggle
- [ ] Button text changes (Start Stream / Send Payment)
- [ ] Button color changes (green / blue)

---

### Flow 4: Authentication Details (3 min)

**Path:** AI Agents → Payroll Autopilot → Authentication tab

#### What You'll See:

**OAuth 2.0 Credentials** (white card):
```
OAuth 2.0 Credentials                     [Active]

CLIENT ID
payroll_autopilot_prod                    [Copy]

CLIENT SECRET
••••••••••••••••3d4e          [👁] [Rotate]
Created 9/15/2025

SCOPES
[payments:write] [accounts:read] [treasury:read]

Token Endpoint
POST https://api.payos.dev/oauth/token
```

**X-402 Payment Protocol** (purple gradient card):
```
⚡ X-402 Payment Protocol              [Enabled]

WALLET ADDRESS
0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a  [Copy]

Network              Currency
base                 USDC

PUBLIC KEY
x402_pk_live_7f8a9b2c3d4e5f6a7b8c9d0e      [Copy]
```

**For T3 Agent (Treasury Rebalancer):**
```
🔒 Mutual TLS (mTLS)                     [Active]

CERTIFICATE FINGERPRINT
SHA256:9d8c...5b4a

EXPIRES
11/1/2026

[Download Certificate] [Renew Certificate]
```

#### Test Checklist:
- [ ] OAuth section shows Client ID/Secret
- [ ] Copy buttons present
- [ ] Eye icon for reveal/hide secret
- [ ] X-402 section has purple gradient background
- [ ] mTLS section appears ONLY for Treasury Rebalancer (T3)

---

### Flow 5: KYA Tier Limits (2 min)

**Path:** AI Agents → Any Agent → KYA Verification tab

#### What You'll See:

**Limit Cards:**
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Transaction Limit│ Daily Limit    │ Human Approval  │
│ $10,000          │ $100,000       │ Above $5,000    │
└─────────────────┴─────────────────┴─────────────────┘
```

#### Expected Limits:

| Agent | Tier | Per Tx | Daily | Monthly |
|-------|------|--------|-------|---------|
| Vendor Payment Bot | T1 | $1K | $10K | **$50K** |
| Payroll Autopilot | T2 | $10K | $100K | **$500K** |
| Treasury Rebalancer | T3 | $100K | $500K | **$2M** |
| Compliance Sentinel | T2 | $0 | $0 | $0 |

#### Test Checklist:
- [ ] T1 = $1K/$10K/$50K
- [ ] T2 = $10K/$100K/$500K
- [ ] T3 = $100K/$500K/$2M
- [ ] Compliance Sentinel shows $0 (special case)

---

## 🔄 Round 3.2: Agent-Account Relationships (PARTIAL - Data Only)

> **Note:** Only data structures are complete. UI components still need implementation.

### What's Ready to Test:

1. **Data Models Updated:**
   - ✅ Agent type has `parentAccount` field
   - ✅ Agent type has `agentLimits` and `effectiveLimits`
   - ✅ Account type has `agents` array
   - ✅ Mock data includes parent relationships

2. **Mock Data Examples:**

**Payroll Autopilot (T2) under TechCorp (KYB T2):**
```javascript
{
  name: 'Payroll Autopilot',
  parentAccount: {
    name: 'TechCorp Inc',
    type: 'business',
    verificationTier: 2
  },
  kya: {
    tier: 2,
    agentLimits: { perTransaction: 10000, daily: 100000, monthly: 500000 },
    effectiveLimits: { perTransaction: 10000, daily: 100000, monthly: 500000, cappedByParent: false }
  }
}
```

**Treasury Rebalancer (T3) under TechCorp (KYB T2):**
```javascript
{
  name: 'Treasury Rebalancer',
  parentAccount: {
    name: 'TechCorp Inc',
    type: 'business',
    verificationTier: 2  // Parent is only T2!
  },
  kya: {
    tier: 3,
    agentLimits: { perTransaction: 100000, daily: 500000, monthly: 2000000 },
    effectiveLimits: { 
      perTransaction: 50000,   // ⚠️ CAPPED by parent's T2 limit
      daily: 200000,          // ⚠️ CAPPED
      monthly: 500000,        // ⚠️ CAPPED
      cappedByParent: true 
    }
  }
}
```

### What's NOT Ready Yet:

- ❌ Agents tab in Account Detail pages
- ❌ Parent Account column in Agents list page
- ❌ Parent Account card in Agent Detail page
- ❌ Effective Limits display with capping warnings
- ❌ Reports page
- ❌ Documents tab
- ❌ Export functionality

---

## 📊 Feature Status Summary

### ✅ Fully Implemented & Testable (11 features):

1. Stream health states & badges
2. Runway column with color coding
3. Top Up button context-aware styling
4. Warning & critical alert banners
5. Balance breakdown with visual progress
6. New Payment modal (Transaction vs Stream)
7. OAuth credentials display
8. X-402 wallet configuration
9. mTLS certificate display
10. Updated KYA tier limits
11. All streaming mock data

### ⚠️ Data Only - No UI (4 features):

12. Parent Account relationships (data structure)
13. Effective limits calculation (in mock data)
14. Agents array in accounts (data only)
15. Capped limits logic (data only)

### ❌ Not Started (5 features):

16. Agents tab UI in Account Detail
17. Parent Account display in Agents list
18. Parent Account card in Agent Detail
19. Reports page
20. Documents tab & Export functionality

---

## 🎯 Recommended Testing Order

### Quick Test (10 min) - Test Round 3.1 Only:
```
1. Flow 1: Stream Health (5 min) → Core streaming features
2. Flow 2: Balance Breakdown (3 min) → Financial visibility
3. Flow 3: New Payment Modal (2 min) → Payment creation
```

### Standard Test (20 min) - All Ready Features:
```
1. Flow 1: Stream Health (5 min)
2. Flow 2: Balance Breakdown (3 min)
3. Flow 3: New Payment Modal (4 min)
4. Flow 4: Authentication Details (3 min)
5. Flow 5: KYA Tier Limits (2 min)
6. Dark Mode Check (3 min) → Repeat Flow 1 in dark mode
```

### Complete Test (30 min) - Including Data Verification:
```
1-5. All flows above (20 min)
6. Inspect mock data in browser console (5 min):
   - Open DevTools → Console
   - Type: mockAgents[0].parentAccount
   - Type: mockAgents[1].kya.effectiveLimits
   - Verify cappedByParent: true for Treasury Rebalancer
7. Check responsive layouts (5 min)
```

---

## 🐛 Known Limitations

### Not Bugs (Expected Behavior):

1. **Top Up buttons don't do anything** → Backend not connected
2. **Can't actually create payments** → UI prototype only
3. **Critical banner won't dismiss** → Sofia's stream really is low (mock data)
4. **Balance numbers don't change** → Static mock data
5. **No Agents tab visible** → UI not implemented yet
6. **No Reports page** → Not implemented yet

### Real Issues to Report:

1. Visual glitches or misalignment
2. Missing icons or broken images
3. Incorrect color coding
4. Dark mode rendering issues
5. Responsive layout problems
6. Console errors in DevTools

---

## 💡 Pro Testing Tips

### 1. Use Browser DevTools
```javascript
// Open Console (F12) and try:
console.log(mockAgents);  // See all agent data
console.log(mockAccounts.find(a => a.id === 'acc_biz_001'));  // TechCorp with agents array
```

### 2. Test Dark Mode
- Click theme toggle (top right)
- Repeat Flow 1 in dark mode
- Check all colors are readable

### 3. Test Responsive Design
- Resize browser to: 1920px, 1366px, 768px, 375px
- Check table wrapping and card stacking

### 4. Check Accessibility
- Tab through forms (keyboard navigation)
- Check color contrast ratios
- Verify ARIA labels on buttons

### 5. Performance Check
- Open DevTools → Network tab
- Reload page
- Verify fast load times

---

## 📋 Quick Reference Card

### Stream Health Colors:
```
🟢 Green    = >7 days (healthy)
⚠️ Amber    = 1-7 days (warning)
🔴 Red      = <24 hours (critical)
⏸️ Gray     = Paused (inactive)
```

### Button Priority:
```
🔴 Red      = Critical action (Sofia's Top Up)
🟡 Amber    = Warning action (Carlos's Top Up)
⚪ Gray     = Normal action (Maria/Ana Top Up)
🔵 Blue     = Primary action (Send Payment)
🟢 Green    = Success action (Start Stream)
```

### Agent Tier Limits:
```
T0 = $0 / $0 / $0 (Sandbox)
T1 = $1K / $10K / $50K (Basic)
T2 = $10K / $100K / $500K (Verified)
T3 = $100K / $500K / $2M (Trusted)
```

---

## 🚀 What to Test RIGHT NOW

If you only have **5 minutes**, run **Flow 1** (Stream Health).
If you have **15 minutes**, run **Flows 1-3**.
If you have **30 minutes**, run the **Complete Test**.

Start with the features that are **fully implemented** (Round 3.1) before worrying about the partial implementations.

---

**Last Updated:** December 10, 2024  
**Status:** Round 3.1 Complete (11/11) | Round 3.2 Partial (4/9)  
**Total Features:** 15/20 fully testable

Happy Testing! 🎉
