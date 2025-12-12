# PayOS Testing Flows - Visual Guide

## 🎯 Quick Navigation

1. [Stream Health & Monitoring Flow](#1-stream-health--monitoring-flow)
2. [New Payment Creation Flow](#2-new-payment-creation-flow)
3. [Agent Authentication Flow](#3-agent-authentication-flow)
4. [Balance Management Flow](#4-balance-management-flow)

---

## 1. Stream Health & Monitoring Flow

### 📍 Entry Point: Business Account Streams Tab

```
Homepage
  └─> Accounts (sidebar)
      └─> TechCorp Inc (click)
          └─> Streams (tab)
              │
              ├─> 🔴 CRITICAL BANNER (if any critical streams)
              │   "1 stream(s) have less than 24 hours of runway"
              │   └─> [Top Up Now] button
              │
              ├─> 🟡 WARNING BANNER (if warning streams and no critical)
              │   "1 stream(s) have less than 7 days of runway"  
              │   └─> [Review Streams] button
              │
              └─> Streams Table
                  │
                  ├─> Active Streams: 4
                  ├─> Monthly Outflow: $10,000
                  ├─> Total Streamed: $9,810
                  └─> Buffer Locked: $27.32
                  
                  Table Columns:
                  ┌──────────────┬──────────┬──────────┬─────────┬─────────┬──────────┐
                  │ Recipient    │ Flow Rate│ Streamed │ Runway  │ Status  │ Actions  │
                  ├──────────────┼──────────┼──────────┼─────────┼─────────┼──────────┤
                  │ Maria Garcia │ $2,000/mo│ $1,847   │ 23 days │ 🟢 Stream│[Top Up]🔘│
                  │              │          │          │ (gray)  │  -ing   │[⏸][✏][✕]│
                  ├──────────────┼──────────┼──────────┼─────────┼─────────┼──────────┤
                  │ Carlos M.    │ $1,800/mo│ $1,662   │ 5 days  │ ⚠️ Low  │[Top Up]🟡│
                  │              │          │          │ (amber) │ Balance │[⏸][✏][✕]│
                  ├──────────────┼──────────┼──────────┼─────────┼─────────┼──────────┤
                  │ Ana Rodriguez│ $2,200/mo│ $2,032   │ 30 days │ 🟢 Stream│[Top Up]🔘│
                  │              │          │          │ (gray)  │  -ing   │[⏸][✏][✕]│
                  ├──────────────┼──────────┼──────────┼─────────┼─────────┼──────────┤
                  │ Luis F.      │ $1,500/mo│ $1,385   │ Paused  │ ⏸️ Paused│ [▶][✏][✕]│
                  │              │          │          │ (gray)  │         │          │
                  ├──────────────┼──────────┼──────────┼─────────┼─────────┼──────────┤
                  │ Sofia Herrera│ $2,500/mo│ $890     │16 hours │ 🔴 Criti-│[Top Up]🔴│
                  │              │          │          │ (red)   │  cal    │[⏸][✏][✕]│
                  └──────────────┴──────────┴──────────┴─────────┴─────────┴──────────┘
```

### 🎯 What to Check:

**Status Badges:**
- ✅ Green with pulse = Healthy (>7 days)
- ⚠️ Amber with triangle = Warning (1-7 days)
- 🔴 Red with circle = Critical (<24 hours)
- ⏸️ Gray with pause = Paused

**Runway Column:**
- Text color matches health state
- Shows time remaining or "Paused"

**Top Up Buttons:**
- Red for critical streams (Sofia)
- Amber for warning streams (Carlos)
- Gray for healthy streams (Maria, Ana)
- Hidden for paused streams (Luis shows Play instead)

**Banners:**
- Critical banner shows if Sofia (16 hours) is active
- Warning banner shows if only Carlos (5 days) needs attention
- No banner if all streams healthy

---

## 2. New Payment Creation Flow

### 📍 Entry Point: "+ New Stream" Button

```
TechCorp Streams Tab
  └─> [+ New Stream] (blue button, top right)
      │
      └─> MODAL OPENS: "New Payment"
          │
          ├─> Recipient Field
          │   └─> Search name, email, or wallet address...
          │
          ├─> Payment Type Toggle
          │   │
          │   ├─> [One-Time] 💸                  ├─> [Stream] ⚡ Beta
          │   │   "Send fixed amount once"       │   "Pay continuously over time"
          │   │                                   │   (Pre-selected since clicked "New Stream")
          │   │                                   │
          │   ├─ IF ONE-TIME SELECTED:           ├─ IF STREAM SELECTED:
          │   │  └─> Amount: $______             │  └─> Monthly Rate: $______
          │   │      [Cancel] [Send Payment]     │      └─> = $X.XXXXXX/second
          │   │                                   │
          │   │                                   ├─> Duration
          │   │                                   │   ⚪ Until cancelled
          │   │                                   │   ⚪ Fixed: [__] months
          │   │                                   │
          │   │                                   ├─> Initial Funding
          │   │                                   │   ⚪ Minimum  →  $XXX.XX
          │   │                                   │   │  (Buffer + 7 days runway)
          │   │                                   │   ⚪ One month  →  $X,XXX.XX
          │   │                                   │      (30 days runway)
          │   │                                   │
          │   │                                   ├─> 🛡️ Stream Protection
          │   │                                   │   ✅ Auto-pause before liquidation
          │   │                                   │   ☐ Auto-wrap when balance low
          │   │                                   │
          │   │                                   └─> [Cancel] [Start Stream]
          │   │                                           ↑           ↑
          │   │                                         Gray        Green
          │
          └─> Description (both types)
              └─> Monthly salary, Invoice #123, etc.
```

### 🎯 Testing Steps:

**Test 1: Stream Payment (Default)**
```
1. Click "+ New Stream" → Modal opens with Stream pre-selected ✅
2. Enter amount: 2000 → Shows "= $0.000772/second" ✅
3. Toggle duration → Both options work ✅
4. Check funding options → Shows calculated amounts ✅
5. Check protection checkboxes → Both toggle ✅
6. Button says "Start Stream" (green) ✅
```

**Test 2: Switch to One-Time**
```
1. Click "One-Time" toggle ✅
2. Stream options disappear ✅
3. Amount field changes to "Amount" (not "Monthly Rate") ✅
4. Per-second calculation disappears ✅
5. Button changes to "Send Payment" (blue) ✅
```

**Test 3: Switch Back to Stream**
```
1. Click "Stream" toggle ✅
2. All stream options reappear ✅
3. Per-second calculation shows ✅
4. Button changes back to "Start Stream" (green) ✅
```

---

## 3. Agent Authentication Flow

### 📍 Entry Point: Agent Detail → Authentication Tab

```
Homepage
  └─> AI Agents (sidebar)
      └─> Select Agent
          │
          ├─> Payroll Autopilot (T2)
          │   └─> Authentication (tab)
          │       │
          │       ├─> 🔐 OAuth 2.0 Credentials [Active]
          │       │   │
          │       │   ├─> CLIENT ID
          │       │   │   payroll_autopilot_prod    [📋 Copy]
          │       │   │
          │       │   ├─> CLIENT SECRET
          │       │   │   ••••••••••••••••3d4e       [👁] [Rotate]
          │       │   │   Created 9/15/2025
          │       │   │
          │       │   ├─> SCOPES
          │       │   │   [payments:write] [accounts:read] [treasury:read]
          │       │   │
          │       │   └─> Token Endpoint
          │       │       POST https://api.payos.dev/oauth/token
          │       │
          │       └─> ⚡ X-402 Payment Protocol [Enabled]
          │           │   (Purple gradient background)
          │           │
          │           ├─> WALLET ADDRESS
          │           │   0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a  [📋]
          │           │
          │           ├─> Network: base  |  Currency: USDC
          │           │
          │           └─> PUBLIC KEY
          │               x402_pk_live_7f8a9b2c3d4e5f6a7b8c9d0e  [📋]
          │
          └─> Treasury Rebalancer (T3)
              └─> Authentication (tab)
                  │
                  └─> (Same as above, PLUS:)
                      │
                      └─> 🔒 Mutual TLS (mTLS) [Active]
                          │
                          ├─> CERTIFICATE FINGERPRINT
                          │   SHA256:9d8c...5b4a
                          │
                          ├─> EXPIRES
                          │   11/1/2026
                          │
                          └─> [Download Certificate] [Renew Certificate]
```

### 🎯 Comparison Table:

| Feature | T1 Agent | T2 Agent | T3 Agent |
|---------|----------|----------|----------|
| OAuth 2.0 | ✅ | ✅ | ✅ |
| PK-JWT | ❌ | ✅ | ✅ |
| X-402 | ❌ | ✅ | ✅ |
| mTLS | ❌ | ❌ | ✅ |

**Test Path:**
```
Vendor Payment Bot (T1) → Only OAuth
Payroll Autopilot (T2) → OAuth + X-402
Treasury Rebalancer (T3) → OAuth + X-402 + mTLS
```

---

## 4. Balance Management Flow

### 📍 Entry Point: Business Account Header

```
TechCorp Inc (Account Detail Page)
  └─> Header Cards (Top of page)
      │
      ├─> Profile Card (left)
      │   └─> TechCorp Inc info...
      │
      ├─> 💰 Balance Card (middle) ← FOCUS HERE
      │   │
      │   ├─> Total Balance
      │   │   $45,200.00
      │   │   
      │   ├─> Visual Breakdown Bar
      │   │   [████████████████████████████|▓]
      │   │    ←——— Available ——→  ← In Streams
      │   │    (Blue 98.9%)        (Green 1.1%)
      │   │
      │   ├─> Breakdown Details
      │   │   │
      │   │   ├─> ● Available           $44,700
      │   │   │     (Blue dot)
      │   │   │
      │   │   └─> ● In Streams ⚡         $500
      │   │         (Green dot + lightning)
      │   │         │
      │   │         ├─> Buffer held        $27.32
      │   │         └─> Streaming out    $472.68
      │   │
      │   ├─> Net Flow Section
      │   │   ────────────────────────────
      │   │   Net Flow          -$10,000/mo
      │   │   5 outgoing streams
      │   │
      │   └─> [Fund Account] button
      │
      └─> Payout Summary (right)
          └─> This Month: $24,500...
```

### 🎯 Visual Breakdown Calculation:

```
Total Balance:     $45,200
  ├─ Available:    $44,700  (98.9%) ← Blue in progress bar
  └─ In Streams:      $500  ( 1.1%) ← Green in progress bar
       ├─ Buffer:    $27.32 (locked for safety)
       └─ Streaming: $472.68 (actively flowing)

Net Flow: -$10,000/mo (outgoing)
  ├─ Maria:    $2,000/mo
  ├─ Carlos:   $1,800/mo
  ├─ Ana:      $2,200/mo
  ├─ Luis:     $0/mo (paused)
  └─ Sofia:    $2,500/mo
  ─────────────────────────
  Total:       $8,500/mo active
```

**Math Check:**
- 5 streams total, but Luis is paused
- 4 active streams = Maria + Carlos + Ana + Sofia
- Monthly rate shown in Net Flow includes all configured streams
- In Streams amount ($500) = sum of all buffer + streaming amounts

---

## 🎬 Complete Testing Scenario

### Scenario: "Emergency Low Balance Alert"

**Story:** Sofia's salary stream is running critically low. You need to identify and fix it.

```
START
  │
  ├─> 1. Navigate to Accounts
  │   └─> Click "TechCorp Inc"
  │       └─> See header with Balance breakdown
  │           ✅ Checkpoint: In Streams = $500 (small portion)
  │
  ├─> 2. Click "Streams" tab
  │   │
  │   ├─> 🔴 Critical Banner Appears!
  │   │   "1 stream(s) have less than 24 hours of runway"
  │   │   └─> ✅ Checkpoint: Banner is red, urgent
  │   │
  │   └─> Scan the table for red status badge
  │       └─> Found: Sofia Herrera
  │           ├─> Status: 🔴 Critical
  │           ├─> Runway: 16 hours (red text)
  │           └─> Action: 🔴 Red "Top Up" button
  │               └─> ✅ Checkpoint: Most prominent action
  │
  ├─> 3. Review other streams for context
  │   ├─> Carlos: ⚠️ Warning (5 days) - Amber Top Up
  │   ├─> Maria: 🟢 Healthy (23 days) - Gray Top Up
  │   ├─> Ana: 🟢 Healthy (30 days) - Gray Top Up
  │   └─> Luis: ⏸️ Paused - No Top Up button
  │       └─> ✅ Checkpoint: Clear visual hierarchy
  │
  ├─> 4. (Future) Click red "Top Up" button
  │   └─> Would open funding modal (not yet implemented)
  │
  └─> 5. Alternative: Create new stream
      └─> Click "+ New Stream"
          ├─> Modal opens with Stream pre-selected
          ├─> Enter Sofia's details
          ├─> Set Monthly Rate: $2,500
          │   └─> Shows: "= $0.000965/second"
          ├─> Select Funding: One month ($2,500)
          └─> ✅ Checkpoint: Protection options checked
              └─> Click "Start Stream"
  
END: Stream crisis resolved! 🎉
```

---

## 🔍 Edge Cases to Test

### 1. All Streams Healthy
```
Expected: No banners, all green badges, gray Top Up buttons
```

### 2. Only Warning Streams (no critical)
```
Expected: Amber banner shows, amber Top Up buttons prominent
```

### 3. Mixed Health States
```
Expected: Critical banner takes priority, red Top Up most prominent
```

### 4. All Streams Paused
```
Expected: No banners, Play buttons instead of Top Up, gray badges
```

### 5. Zero Balance
```
Expected: Balance breakdown shows $0 everywhere, visual bar empty
```

---

## 🎨 Visual Design System

### Color Meanings:
```
🔴 Red (#ef4444)     → Critical, urgent action needed
🟡 Amber (#f59e0b)   → Warning, attention required
🟢 Green (#10b981)   → Healthy, all good
🔵 Blue (#3b82f6)    → Primary actions, available funds
🟣 Purple (#8b5cf6)  → Special features (X-402, Beta)
⚫ Gray (#6b7280)    → Inactive, paused, neutral
```

### Icon Meanings:
```
⚡ Lightning → Streaming, real-time
⏸️ Pause → Paused, inactive
▶️ Play → Resume, activate
⚠️ Triangle → Warning
🔴 Circle → Critical alert
✅ Check → Success, verified
🔐 Lock → Security, authentication
💰 Money → Balance, funds
📋 Clipboard → Copy action
👁️ Eye → Reveal/hide
```

---

## 📊 Success Criteria

After testing, you should be able to answer YES to all:

### Stream Health Monitoring:
- [ ] Can identify critical streams at a glance?
- [ ] Can see runway remaining for each stream?
- [ ] Do colors match urgency levels?
- [ ] Are Top Up buttons prominent when needed?

### Payment Creation:
- [ ] Can open modal from "+ New Stream" button?
- [ ] Can switch between payment types?
- [ ] Do calculations show correctly?
- [ ] Are stream options contextual?

### Authentication:
- [ ] Can find OAuth credentials for all agents?
- [ ] Can see X-402 config for T2+ agents?
- [ ] Can see mTLS details for T3 agents?
- [ ] Are copy buttons functional?

### Balance Management:
- [ ] Can see breakdown of available vs locked funds?
- [ ] Is visual progress bar accurate?
- [ ] Does net flow calculation make sense?
- [ ] Are all amounts correct?

---

## 🚀 Next Steps After Testing

1. **Report Issues** → Note any visual bugs or confusing UX
2. **Test Dark Mode** → Repeat all tests with dark theme
3. **Test Responsive** → Resize browser, check mobile view
4. **Backend Integration** → Connect to real API endpoints
5. **Add Interactivity** → Make buttons actually do things!

---

**Happy Testing!** 🎉

If you find any issues or have suggestions, document them for the next iteration.
