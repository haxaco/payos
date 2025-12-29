# x402 UI Validation Guide - Dashboard Walkthrough

**Purpose:** Visual verification of deployment and system state using the PayOS Dashboard  
**Date:** December 23, 2025  
**Dashboard URL:** `http://localhost:3000/dashboard` (local) or your deployed URL

---

## 🚀 Quick Start

### 1. Start the Dashboard

```bash
cd /Users/haxaco/Dev/PayOS/apps/web
pnpm dev
```

**Dashboard will be available at:** http://localhost:3000

### 2. Login

Use your test credentials or create an account if needed.

---

## ✅ **5-Minute Visual Health Check**

### Step 1: Check x402 Overview

**Navigate to:** Dashboard → x402 (sidebar)  
**URL:** http://localhost:3000/dashboard/x402

**What to Look For:**

#### Provider View Tab:
- **Total Revenue:** Should show > $0 (not $0.00!)
- **Total Calls:** Should show 133+ calls
- **Active Endpoints:** Should show 2 endpoints
- **Recent Endpoints Table:** Should list:
  - ✅ Weather Forecast API ($0.001/call)
  - ✅ Historical Weather API ($0.01/call)

**Expected Numbers:**
```
📊 Provider Statistics:
Total Revenue:    ~$0.0893 USDC ✅ (was $0.00 before fix!)
Total Calls:      133+ calls
Active Endpoints: 2
Avg Revenue:      ~$0.000671 per call
```

#### Consumer View Tab:
**Switch to "Consumer" tab**

- **Total Spent:** Should show ~$0.092 USDC
- **Total Payments:** Should show 133+ payments
- **Recent Payments Table:** Should show list of $0.001 payments
- **All payments should show:** ✅ Status: "Completed"

---

### Step 2: Check x402 Wallets

**Navigate to:** Dashboard → x402 → Wallets (sidebar under x402 section)  
**URL:** http://localhost:3000/dashboard/x402/wallets

**What to Look For:**

| Wallet | Owner | Currency | Balance | Status |
|--------|-------|----------|---------|--------|
| **Consumer Wallet** | AI Research Company (Test) | USDC | **~$99.908** | ✅ Active |
| **Provider Wallet** | Weather API Provider (Test) | USDC | **~$0.0893** | ✅ Active |

**🔴 CRITICAL CHECK:**
- Provider wallet balance should be **> $0.08** (NOT $0.00!)
- If it's $0.00, the backfill didn't work

**Click on a wallet** to see:
- Transaction history
- Spending policy (if configured)
- Recent activity

---

### Step 3: Check x402 Endpoints

**Navigate to:** Dashboard → x402 → Endpoints  
**URL:** http://localhost:3000/dashboard/x402/endpoints

**What to Look For:**

**Endpoints List:**
- ✅ Weather Forecast API
  - Path: `/api/weather/forecast`
  - Price: $0.001 USDC
  - Status: 🟢 Active
  - Calls: 74+
  - Revenue: ~$0.074

- ✅ Historical Weather API
  - Path: `/api/weather/historical`
  - Price: $0.01 USDC
  - Status: 🟢 Active
  - Calls: 1
  - Revenue: $0.01

**Click on "Weather Forecast API" endpoint:**

Should show:
- **📊 Statistics Card:**
  - Total Revenue: ~$0.074
  - Total Calls: 74+
  - Average per call: $0.001
  - Success Rate: 100%

- **📈 Recent Transactions Table:**
  - List of 20+ payments
  - All showing "Completed" status
  - Amounts: $0.001 each
  - Timestamps from Dec 23

---

### Step 4: Check Account Details

**Navigate to:** Dashboard → Accounts  
**URL:** http://localhost:3000/dashboard/accounts

**Find and click on:**
1. **"AI Research Company (Test)"** (Consumer)
2. Click "Transactions" tab

**What to Look For:**
- **Type:** x402 payments
- **Status:** All "Completed" ✅
- **Direction:** Outgoing (sent)
- **Amounts:** $0.001 each
- **Balance Change:** Should show decrease

**Then find and click on:**
1. **"Weather API Provider (Test)"** (Provider)
2. Click "Transactions" tab

**What to Look For:**
- **Type:** x402 receipts
- **Status:** All "Completed" ✅
- **Direction:** Incoming (received)
- **Amounts:** Should show received amounts
- **🔴 CRITICAL:** Should see transaction entries (not empty!)

---

### Step 5: Check x402 Analytics

**Navigate to:** Dashboard → x402 → Analytics  
**URL:** http://localhost:3000/dashboard/x402/analytics

**What to Look For:**

**📊 Revenue Chart:**
- Should show activity on Dec 23
- Spike showing ~$0.074 in revenue
- Not flat/empty line

**📈 Calls Chart:**
- Should show 74+ calls on Dec 23
- Clear spike in activity

**💰 Top Endpoints Table:**
- Weather Forecast API should be #1
- Should show revenue and call counts

**📅 Time Period Filter:**
- Try "7 days" - should show data
- Try "30 days" - should show data

---

## 🧪 **Live Payment Test (10 minutes)**

### Test: Make a New Payment and Watch It Appear

**Step 1: Open Dashboard in Browser**
- Keep Dashboard open on: http://localhost:3000/dashboard/x402
- Have the "Consumer View" tab selected

**Step 2: Record Current State**
Screenshot or write down:
- Consumer wallet balance: `____________`
- Provider wallet balance: `____________`
- Total payments count: `____________`

**Step 3: Make a Payment**
```bash
# In a new terminal
cd /Users/haxaco/Dev/PayOS/apps/sample-consumer
pnpm dev --forecast
```

**Step 4: Refresh Dashboard**
- Refresh the x402 Overview page
- Or wait ~30 seconds for auto-refresh (if implemented)

**Step 5: Verify Changes** ✅

**In Consumer View:**
- ✅ Total Spent should increase by $0.001
- ✅ Total Payments count should increase by 1
- ✅ New payment should appear at top of Recent Payments table

**In Wallets Page:**
- ✅ Consumer wallet: Decreased by $0.001
- ✅ **Provider wallet: Increased by ~$0.00097** ← MOST IMPORTANT!

**If provider wallet doesn't increase:**
- ❌ Bug still exists or fix not deployed
- Check API logs for errors
- Verify database function exists

---

## 📸 **Visual Checklist**

### What Should Look Like This:

#### ✅ x402 Overview (Provider View)
```
┌─────────────────────────────────────────────┐
│ 📊 Provider Statistics                      │
├─────────────────────────────────────────────┤
│ Total Revenue:    $0.0893 USDC             │
│ Total Calls:      133                       │
│ Active Endpoints: 2                         │
│ Avg per Call:     $0.000671               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📋 Recent Endpoints                         │
├─────────────────────────────────────────────┤
│ Weather Forecast API                        │
│ $0.001 • 74 calls • $0.074 revenue          │
│ Status: 🟢 Active                           │
├─────────────────────────────────────────────┤
│ Historical Weather API                      │
│ $0.01 • 1 call • $0.01 revenue             │
│ Status: 🟢 Active                           │
└─────────────────────────────────────────────┘
```

#### ✅ x402 Wallets
```
┌──────────────────────────────────────────────────────┐
│ 💼 Wallets                                           │
├──────────────────────────────────────────────────────┤
│ AI Research Company (Test)                           │
│ USDC • $99.908 • 🟢 Active                          │
│ Consumer Wallet                                      │
├──────────────────────────────────────────────────────┤
│ Weather API Provider (Test)                          │
│ USDC • $0.0893 • 🟢 Active  ← SHOULD NOT BE $0.00! │
│ Provider Wallet                                      │
└──────────────────────────────────────────────────────┘
```

#### ✅ Endpoint Detail Page
```
┌─────────────────────────────────────────────┐
│ Weather Forecast API                        │
│ /api/weather/forecast • GET • $0.001 USDC   │
│ Status: 🟢 Active                           │
├─────────────────────────────────────────────┤
│ 📊 Statistics                               │
│ Revenue:   $0.074                           │
│ Calls:     74                               │
│ Avg:       $0.001                           │
│ Success:   100%                             │
├─────────────────────────────────────────────┤
│ 📈 Recent Transactions (20)                 │
│ ✅ $0.001 • Dec 23, 19:44:47 • Completed   │
│ ✅ $0.001 • Dec 23, 19:44:47 • Completed   │
│ ✅ $0.001 • Dec 23, 19:44:47 • Completed   │
│ ...                                         │
└─────────────────────────────────────────────┘
```

---

## 🔍 **What to Check in Each Page**

### Dashboard Home (`/dashboard`)
- [ ] Recent activity shows x402 payments
- [ ] Stats cards show activity (not all zeros)
- [ ] Charts show data for Dec 23

### x402 Overview (`/dashboard/x402`)
- [ ] **Provider view:** Total revenue > $0.08 ✅
- [ ] **Provider view:** Active endpoints = 2 ✅
- [ ] **Consumer view:** Total spent ~$0.092 ✅
- [ ] **Consumer view:** Total payments = 133+ ✅
- [ ] Recent payments table populated ✅

### x402 Endpoints (`/dashboard/x402/endpoints`)
- [ ] Shows 2 endpoints ✅
- [ ] Weather Forecast: 74+ calls, ~$0.074 revenue ✅
- [ ] Historical: 1 call, $0.01 revenue ✅
- [ ] All endpoints show "Active" status 🟢

### x402 Wallets (`/dashboard/x402/wallets`)
- [ ] Consumer wallet: ~$99.908 USDC ✅
- [ ] **Provider wallet: ~$0.0893 USDC** (NOT $0.00!) ✅
- [ ] Both wallets show "Active" status 🟢
- [ ] Click wallet → Shows transaction history ✅

### x402 Analytics (`/dashboard/x402/analytics`)
- [ ] Revenue chart shows data ✅
- [ ] Calls chart shows spike on Dec 23 ✅
- [ ] Top endpoints table populated ✅
- [ ] Filters work (7d, 30d, etc.) ✅

### Accounts (`/dashboard/accounts`)
- [ ] AI Research Company shows $0.092 in outgoing transfers ✅
- [ ] Weather API Provider shows incoming transfers ✅
- [ ] Transaction history shows x402 payments ✅

---

## 🚨 **Red Flags in UI**

### ❌ Issues That Indicate Problems:

1. **Provider wallet shows $0.00**
   - Settlement bug not fixed or backfill failed
   - Go to `/docs/VALIDATION_GUIDE.md` for SQL fixes

2. **Total revenue shows $0.00**
   - Analytics not calculating correctly
   - Or no payments in database

3. **Recent payments table is empty**
   - No x402 payments in system
   - Or query filtering incorrectly

4. **All endpoints show 0 calls**
   - Endpoint stats not updating
   - Or wrong endpoint IDs

5. **Making a test payment doesn't update UI**
   - New payment not being created
   - Or UI not refreshing data
   - Check API logs

6. **Charts are flat/empty**
   - No data for selected time period
   - Or analytics aggregation failing

---

## 🔧 **Troubleshooting UI Issues**

### Issue: Can't see x402 section in sidebar

**Fix:** Check if x402 feature is enabled
```bash
# Check environment variables
cat apps/web/.env.local | grep X402
```

Should have:
```
NEXT_PUBLIC_X402_ENABLED=true
```

---

### Issue: Data not loading (spinning forever)

**Check:**
1. Is API server running? `http://localhost:4000/health`
2. Check browser console for errors (F12 → Console)
3. Check Network tab for failed API calls
4. Verify API URL is correct in environment

**Common fixes:**
```bash
# Restart API server
cd apps/api
pnpm dev

# Restart web server
cd apps/web
pnpm dev
```

---

### Issue: Data is stale (doesn't update)

**Fix:** Force refresh
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear cache: Browser DevTools → Application → Clear Storage
- Or wait for React Query cache to expire (~30s)

---

### Issue: Provider wallet still shows $0.00 in UI

**Verify in database first:**
```sql
-- In Supabase SQL Editor
SELECT balance FROM wallets 
WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13';
```

**If database shows correct balance but UI shows $0:**
- Clear browser cache
- Hard refresh page
- Check React Query devtools (if enabled)

**If database also shows $0:**
- Backfill didn't work
- Run SQL from `/docs/VALIDATION_GUIDE.md`

---

## 📱 **Mobile Validation**

The dashboard should be responsive. Test on:
- Desktop (1920x1080)
- Tablet (iPad: 768x1024)
- Mobile (iPhone: 375x667)

**Key pages to test:**
- x402 Overview
- Wallets list
- Endpoint detail

---

## ⚡ **Quick Validation Script**

Use this checklist while clicking through UI:

```
□ Step 1: Open http://localhost:3000/dashboard/x402
   ✅ Provider Revenue: $_________ (should be > $0.08)
   
□ Step 2: Switch to Consumer tab
   ✅ Total Spent: $_________ (should be ~$0.092)
   
□ Step 3: Click "Wallets" in sidebar
   ✅ Provider wallet: $_________ (should be ~$0.0893)
   ✅ Consumer wallet: $_________ (should be ~$99.908)
   
□ Step 4: Click "Endpoints" in sidebar
   ✅ Weather Forecast: ____ calls (should be 74+)
   ✅ Historical Weather: ____ calls (should be 1)
   
□ Step 5: Make a test payment
   ✅ Provider wallet increased? (YES/NO)
   ✅ New payment appears in list? (YES/NO)
   
RESULT: □ ALL CHECKS PASS ✅ / □ SOME FAILURES ❌
```

---

## 🎯 **Success Criteria**

### ✅ UI Validation Passes If:

1. **Provider wallet balance > $0.08** (visible in Wallets page)
2. **Total revenue shows > $0.08** (visible in x402 Overview)
3. **133+ payments listed** (visible in Consumer view)
4. **2 endpoints showing calls/revenue** (visible in Endpoints page)
5. **Charts show activity on Dec 23** (visible in Analytics page)
6. **New test payment updates all UI components** immediately or within 30 seconds

### ❌ Fail If:

1. Provider wallet shows $0.00
2. All charts are empty
3. No transactions appear
4. Making a test payment doesn't update provider wallet

---

## 📚 **Related Documentation**

- **SQL Validation:** `/docs/VALIDATION_GUIDE.md` - Database queries
- **Audit Trail:** `/docs/X402_AUDIT_TRAIL.md` - Complete transaction history
- **Deployment Status:** `/docs/DEPLOYMENT_COMPLETE.md` - What was deployed

---

## 💡 **Pro Tips**

1. **Use Browser DevTools:**
   - Network tab: See API calls in real-time
   - Console: Check for React errors
   - React Query Devtools: See cached data

2. **Watch API Logs:**
   ```bash
   # In terminal where API is running
   # You'll see real-time logs of payments being processed
   ```

3. **Compare UI vs Database:**
   - UI shows what users see
   - SQL shows source of truth
   - If they don't match: refresh or cache issue

4. **Take Screenshots:**
   - Before making test payment
   - After making test payment
   - Compare to verify changes

---

**Last Updated:** December 23, 2025  
**Dashboard Version:** Next.js Web App  
**Status:** ✅ UI validation ready



