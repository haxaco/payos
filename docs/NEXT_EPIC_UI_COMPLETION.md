# Next Epic: UI Data Completion

**Date:** December 18, 2025  
**Status:** Ready for Implementation  
**Priority:** High - Demo Polish  

---

## Executive Summary

After completing Stories 14.2 & 14.3, user testing revealed several areas where the UI still uses mock data or lacks features. This document outlines the remaining work to achieve true "100% real data" across the entire UI.

---

## ✅ **Quick Fixes Applied** (15 minutes)

### 1. Agent Parent Account Link ✅
**Status:** **FIXED**

**Issue:** Parent account link showed "View Parent Account →" instead of the actual account name.

**Fix Applied:**
- Updated `/Users/haxaco/Dev/PayOS/payos-ui/src/types/api.ts` to include optional `parentAccount` field in Agent interface
- Updated `/Users/haxaco/Dev/PayOS/payos-ui/src/pages/AgentDetailPage.tsx` to display `agent.parentAccount?.name`
- Name is now clickable and navigates to account detail page

**Result:** Agents now show "Belongs to: TechCorp Inc" (clickable) instead of generic link

---

### 2. Transaction AI Flags ✅
**Status:** **DOCUMENTED**

**Issue:** Homepage and Dashboard show transactions with hardcoded `status: 'flagged'` in mock data arrays.

**Fix Applied:**
- Added TODO comments to `/Users/haxaco/Dev/PayOS/payos-ui/src/pages/HomePage.tsx`
- Added TODO comments to `/Users/haxaco/Dev/PayOS/payos-ui/src/pages/Dashboard.tsx`
- Marked for Epic 8 (AI Insights) to replace with real API data

**Root Cause:** Entire transaction lists on HomePage/Dashboard are hardcoded mock data, not connected to `/v1/transfers` API.

**Action Items:**
- [ ] Replace `recentActivity` array with `useTransfers` API call
- [ ] Replace `transactions` array with `useTransfers` API call
- [ ] Show flag emoji only if `transfer.complianceFlags?.length > 0`

---

## 🔍 **Investigation Complete** - Feature Gaps Identified

### 3. Card Detail Pages - Missing Data ⚠️
**Status:** **FEATURE GAP** - Requires database schema changes

**Investigation Results:**

**Database Schema Analysis:**
- ✅ `payment_methods` table exists with 33 rows
- ❌ NO spending limit columns (`daily_limit`, `monthly_limit`, `per_transaction_limit`)
- ❌ NO card transaction tracking (no `card_transactions` table)
- ❌ Transfers table does NOT link to payment methods

**Current Card Detail Page Status:**
- Shows basic card info (last 4 digits, holder name, status)
- Correctly displays "N/A" for spending limits (data doesn't exist)
- Correctly shows "No card activity yet" (no transaction tracking)

**Root Cause:** This is NOT a UI bug - the backend database schema doesn't support:
1. Card spending limits
2. Card transaction history

**Recommended Solution:**

**Option A: Add to Epic 10 - PSP Table Stakes**
- Epic 10 already includes card management features
- Add card spending limits to schema
- Track card transactions separately from account transfers
- Estimated: 8 story points

**Option B: New Epic - Card Management**
- Create dedicated epic for full card feature set
- Include virtual cards, physical cards, spending controls
- Estimated: 21 story points

**Immediate Action:**
- **No UI changes needed** - CardDetailPage is working correctly with available data
- Update CardDetailPage to add informational message: "Spending limits coming soon"
- Add database migration to Epic 10 or new epic

---

### 4. Treasury Page - All Mock Data 📊
**Status:** **MOCK DATA** - Requires API & possibly new database tables

**Investigation Results:**

**Current Implementation:**
```typescript
// /Users/haxaco/Dev/PayOS/payos-ui/src/pages/TreasuryPage.tsx
const floatData = [ /* hardcoded array */ ];
```

All data is hardcoded:
- Float balances (USDC, ARS, COP, MXN) - Lines 44-81
- Float projection chart - Lines 10-16
- Rail status - Lines 228-269
- Stream netflow - Lines 323-360

**What Treasury Should Show:**
1. **Aggregate balances** across all accounts by currency
2. **Float projection** based on scheduled transfers and historical patterns
3. **Rail status** from external providers (Circle, PIX, SPEI, etc.)
4. **Stream netflow** calculated from active streams

**Database Tables Available:**
- ✅ `accounts` - has `balance_total`, `balance_available`, `currency`
- ✅ `streams` - has flow rates and totals
- ✅ `transfers` - has scheduled transfers
- ❌ NO `treasury` table
- ❌ NO `provider_status` table
- ❌ NO `liquidity_pools` table

**Required Backend Work:**

1. **Create Treasury API Endpoints:**
   ```
   GET /v1/reports/treasury/summary
   GET /v1/reports/treasury/float-projection
   GET /v1/reports/treasury/netflow
   ```

2. **Aggregate Queries:**
   ```sql
   -- Total balances by currency
   SELECT currency, SUM(balance_total), SUM(balance_available)
   FROM accounts WHERE tenant_id = ?
   GROUP BY currency;
   
   -- Stream netflow
   SELECT 
     SUM(flow_rate_per_month) as inflow,
     SUM(outflow) as outflow
   FROM streams WHERE status = 'active';
   ```

3. **Consider New Tables:**
   - `treasury_snapshots` - Daily snapshots for historical tracking
   - `provider_status` - Track external rail health
   - `liquidity_rules` - Auto-rebalancing rules

**Estimated Effort:**
- Backend API: 8 points
- Frontend integration: 5 points
- Testing: 3 points
- **Total: 16 points**

**Recommendation:** Create Story 16.1 in Epic 16 or new "Epic 0: UI Completion"

---

### 5. Home Page Insights - Mock Data 🏠
**Status:** **MOCK DATA** - Requires Dashboard Summary API

**Investigation Results:**

**Current Mock Data** (`/Users/haxaco/Dev/PayOS/payos-ui/src/pages/HomePage.tsx`):
```typescript
const volumeData = [ /* hardcoded chart data */ ];  // Lines 9-16
const recentActivity = [ /* hardcoded transactions */ ];  // Lines 18-24
```

**Hardcoded Stats:**
- "Active Accounts: 1,234" - Should query `SELECT COUNT(*) FROM accounts WHERE status = 'active'`
- "Cards Issued: 89" - Should query `SELECT COUNT(*) FROM payment_methods WHERE type = 'card'`
- "Pending Flags: 23" - Should query `SELECT COUNT(*) FROM compliance_flags WHERE status = 'open'`
- Volume chart - Should aggregate `transfers` by month

**Required Backend Work:**

1. **Create Dashboard Summary API:**
   ```
   GET /v1/reports/dashboard/summary
   ```

   Response:
   ```json
   {
     "accounts": {
       "total": 1234,
       "active": 1150,
       "verified": 980
     },
     "cards": {
       "total": 89,
       "active": 76
     },
     "compliance": {
       "pending_flags": 23,
       "open_disputes": 4
     },
     "volume": {
       "last_30_days": 2450000,
       "change_percent": 12.5,
       "by_month": [...]
     },
     "recent_activity": [...]
   }
   ```

2. **Update Frontend:**
   - Create `useDashboardSummary()` hook
   - Replace hardcoded values with API data
   - Add loading/error states

**Estimated Effort:**
- Backend API: 5 points
- Frontend integration: 3 points
- **Total: 8 points**

**Recommendation:** Bundle with Treasury work in "Epic 0: UI Completion"

---

## 📋 **Recommended Next Epic: Epic 0 - UI Data Completion**

**Goal:** Eliminate ALL remaining mock data from UI and complete missing features for demo readiness.

### Epic 0 Stories

#### **Story 0.1: Dashboard & Home Page Real Data** (8 points)
**Description:** Replace all mock data on HomePage and Dashboard with real API calls.

**Tasks:**
- [ ] Create `GET /v1/reports/dashboard/summary` endpoint
- [ ] Aggregate account stats, card stats, compliance stats
- [ ] Aggregate volume data by month from transfers
- [ ] Fetch recent activity from transfers (limit 10)
- [ ] Create `useDashboardSummary()` hook
- [ ] Update HomePage to use real data
- [ ] Update Dashboard to use real data
- [ ] Remove hardcoded arrays

**Acceptance Criteria:**
- ✅ HomePage shows real account/card/flag counts
- ✅ Volume chart shows real transfer data
- ✅ Recent activity shows real transfers
- ✅ AI flag indicator only shows if compliance_flags exist
- ✅ No hardcoded data arrays remain

---

#### **Story 0.2: Treasury Page Real Data** (16 points)
**Description:** Build Treasury reporting system with real-time balance tracking and projections.

**Tasks:**
- [ ] Create `GET /v1/reports/treasury/summary` endpoint
- [ ] Query aggregate balances by currency across all accounts
- [ ] Calculate float thresholds and health status
- [ ] Create `GET /v1/reports/treasury/netflow` endpoint
- [ ] Calculate stream inflows and outflows
- [ ] Create `useTreasuryData()` hooks
- [ ] Update TreasuryPage to use real data
- [ ] Add loading states and error handling
- [ ] Consider: Create `treasury_snapshots` table for historical tracking

**Acceptance Criteria:**
- ✅ Treasury shows real aggregate balances per currency
- ✅ Float health calculated from real data
- ✅ Stream netflow calculated from active streams
- ✅ No hardcoded balance or flow data
- ✅ Real-time updates when streams/transfers change

---

#### **Story 0.3: Card Spending Limits** (8 points)
**Description:** Add spending limit support to payment methods schema and UI.

**Tasks:**
- [ ] Create migration to add columns to `payment_methods`:
  - `spending_limit_per_transaction NUMERIC`
  - `spending_limit_daily NUMERIC`
  - `spending_limit_monthly NUMERIC`
  - `spending_used_daily NUMERIC DEFAULT 0`
  - `spending_used_monthly NUMERIC DEFAULT 0`
  - `spending_limit_period_start TIMESTAMPTZ`
- [ ] Update `GET /v1/payment-methods/:id` to return limits
- [ ] Update CardDetailPage to display real limits
- [ ] Add "Edit Limits" functionality (or mark as "Coming Soon")
- [ ] Update RLS policies for `payment_methods`

**Acceptance Criteria:**
- ✅ Database supports spending limits
- ✅ API returns spending limit data
- ✅ CardDetailPage shows real limits (not N/A)
- ✅ Progress bars show actual usage vs limits
- ✅ "Coming Soon" message for limit editing if not implemented

---

#### **Story 0.4: Card Transaction History** (13 points)
**Description:** Track and display card transaction history on card detail pages.

**Tasks:**
- [ ] **Option A:** Add `payment_method_id` to transfers table
  - Migration to add `payment_method_id UUID NULLABLE`
  - Update transfer creation to link payment methods
- [ ] **Option B:** Create `card_transactions` table
  - Separate table for card-specific transactions
  - Link to both `payment_methods` and `accounts`
- [ ] Update `GET /v1/payment-methods/:id/transactions` endpoint
- [ ] Create `useCardTransactions()` hook
- [ ] Update CardDetailPage to show real transaction list
- [ ] Add filters (date range, amount, merchant)

**Acceptance Criteria:**
- ✅ Card transactions tracked in database
- ✅ API returns transaction history for cards
- ✅ CardDetailPage shows real transactions (not "No activity")
- ✅ Can view transaction details from card page
- ✅ Shows merchant, amount, date, status

**Recommendation:** This may belong in Epic 10 (PSP Table Stakes) instead, as it's a more fundamental feature.

---

### **Epic 0 Summary**

| Story | Description | Points | Status |
|-------|-------------|--------|--------|
| 0.1 | Dashboard & Home Page Real Data | 8 | Ready |
| 0.2 | Treasury Page Real Data | 16 | Ready |
| 0.3 | Card Spending Limits | 8 | Ready |
| 0.4 | Card Transaction History | 13 | Consider moving to Epic 10 |
| **Total** | | **45** | |

**Time Estimate:** ~45 hours (1-2 weeks)

---

## 📊 **Current Roadmap Status**

### Completed Epics ✅
- ✅ Epic 11: Authentication (12/12 stories)
- ✅ Epic 14: Compliance & Disputes (3/3 stories)
- ✅ Epic 15: RLS Hardening (10/10 stories)

### In Progress
- **Epic 16: Database Security** (0/10 stories) - Planned next

### Proposed Changes

**Option A: Insert Epic 0 Before Epic 16**
```
Current Session: ✅ Epic 14 Complete
Next Session:    🆕 Epic 0: UI Data Completion (45 points)
After That:      ⏭️  Epic 16: Database Security
```

**Reasoning:**
- Demo readiness is high priority
- UI polish is highly visible
- User testing revealed these gaps
- Better to have complete, polished UI before backend hardening

**Option B: Continue with Epic 16, Address UI in Epic 8/9**
```
Current Session: ✅ Epic 14 Complete
Next Session:    ⏭️  Epic 16: Database Security
Later:           📝 Epic 8: AI Insights (includes Dashboard)
                 📝 Epic 9: Demo Polish
```

**Reasoning:**
- Follow original roadmap
- Epic 8 already planned for Dashboard/AI insights
- Epic 9 already planned for demo polish
- Card features belong in Epic 10

---

## 🎯 **Recommendation**

### **Recommended Approach: Hybrid**

1. **This Session (Just Completed):**
   - ✅ Quick fixes for Agent link and AI flag TODO comments (15 min)
   - ✅ Investigation and documentation (this doc)

2. **Next Session:**
   - **Do Stories 0.1 & 0.2 FIRST** (Dashboard + Treasury) - 24 points, ~1 day
   - These are pure data integration, no schema changes
   - Immediate visible impact for demos
   - Then proceed with **Epic 16: Database Security**

3. **Later:**
   - **Stories 0.3 & 0.4** (Card limits + transactions) move to **Epic 10: PSP Table Stakes**
   - Card features naturally belong with other PSP features
   - Epic 10 already includes subscriptions, refunds, exports

**Rationale:**
- Get biggest UI wins quickly (Dashboard + Treasury)
- Don't delay security hardening (Epic 16)
- Keep card features together in Epic 10
- Balanced approach: demo polish + technical rigor

---

## 📁 **Files Modified in This Session**

### ✅ Fixed:
1. `/Users/haxaco/Dev/PayOS/payos-ui/src/types/api.ts` - Added `parentAccount` field to Agent interface
2. `/Users/haxaco/Dev/PayOS/payos-ui/src/pages/AgentDetailPage.tsx` - Display parent account name clickable
3. `/Users/haxaco/Dev/PayOS/payos-ui/src/pages/HomePage.tsx` - Added TODO comments for mock data
4. `/Users/haxaco/Dev/PayOS/payos-ui/src/pages/Dashboard.tsx` - Added TODO comments for mock data

### 📝 Documented:
5. `/Users/haxaco/Dev/PayOS/docs/UI_MOCK_DATA_ISSUES.md` - Detailed investigation results
6. `/Users/haxaco/Dev/PayOS/docs/NEXT_EPIC_UI_COMPLETION.md` - This file

---

## 🚀 **Next Steps**

### Immediate (If Proceeding with Stories 0.1 & 0.2):

1. **Backend: Create Reports API** (`apps/api/src/routes/reports.ts`)
   ```typescript
   router.get('/dashboard/summary', getDashboardSummary);
   router.get('/treasury/summary', getTreasurySummary);
   router.get('/treasury/netflow', getTreasuryNetflow);
   ```

2. **Frontend: Create Hooks** (`payos-ui/src/hooks/api/useReports.ts`)
   ```typescript
   export function useDashboardSummary() { ... }
   export function useTreasurySummary() { ... }
   export function useTreasuryNetflow() { ... }
   ```

3. **Update Pages:**
   - Remove hardcoded data arrays
   - Use API hooks
   - Add loading/error states

### If Continuing with Epic 16:
- Proceed with Epic 16: Database Security
- Revisit UI completion in Epic 8 (AI Insights) and Epic 9 (Demo Polish)

---

## 📝 **Implementation Notes**

### Database Queries for Reports

**Dashboard Summary:**
```sql
-- Account stats
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_30d
FROM accounts WHERE tenant_id = $1;

-- Card stats
SELECT COUNT(*) as total
FROM payment_methods 
WHERE tenant_id = $1 AND type = 'card';

-- Compliance stats
SELECT 
  COUNT(*) as open_flags,
  COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk
FROM compliance_flags 
WHERE tenant_id = $1 AND status = 'open';

-- Volume by month
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(amount) as total_volume,
  COUNT(*) as transaction_count
FROM transfers
WHERE tenant_id = $1 
  AND created_at > NOW() - INTERVAL '6 months'
  AND status = 'completed'
GROUP BY month
ORDER BY month DESC;
```

**Treasury Summary:**
```sql
-- Aggregate balances by currency
SELECT 
  currency,
  SUM(balance_total) as total_balance,
  SUM(balance_available) as available_balance,
  SUM(balance_in_streams) as balance_in_streams,
  COUNT(*) as account_count
FROM accounts
WHERE tenant_id = $1
GROUP BY currency;

-- Stream netflow
SELECT 
  COALESCE(SUM(flow_rate_per_month) FILTER (WHERE sender_account_id IN 
    (SELECT id FROM accounts WHERE tenant_id = $1)), 0) as inflow,
  COALESCE(SUM(flow_rate_per_month) FILTER (WHERE receiver_account_id IN 
    (SELECT id FROM accounts WHERE tenant_id = $1)), 0) as outflow
FROM streams
WHERE tenant_id = $1 AND status = 'active';
```

---

## 🎬 **Summary**

### ✅ **What We Accomplished This Session:**
1. Fixed Agent parent account link UX
2. Documented mock data locations with TODOs
3. Investigated database schema for cards/treasury
4. Identified feature gaps vs UI bugs
5. Created comprehensive implementation plan

### 🎯 **What's Next:**
**Recommended:** Implement Stories 0.1 & 0.2 (Dashboard + Treasury real data) before Epic 16

**Result:** Professional, demo-ready UI with real data across all pages! 🎉

---

**Last Updated:** December 18, 2025  
**Status:** Ready for User Decision on Next Steps


