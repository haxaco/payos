# Major UI & Seed Data Bug Fixes

**Date:** December 18, 2025  
**Priority:** Critical  
**Status:** In Progress  

---

## Issues to Fix

### 🐛 Issue #1: No contractors shown in business accounts
**Severity:** High  
**Status:** 🔄 In Progress

**Problem:** Contractors tab shows "No contractors found" even though API is working.

**Root Causes:**
1. seed-relationships.ts looks for "Acme Corporation" which doesn't exist
2. Only 12 relationships created (6 contractors across 2 companies)
3. Not enough variety

**Fix:**
- Update seed-relationships.ts to work with all tenants
- Create more contractor relationships (20+ per major business)
- Ensure proper bidirectional relationships

---

### 🐛 Issue #2: No Transactions tab in business accounts
**Severity:** High  
**Status:** 🔄 In Progress

**Problem:** Business accounts only have Overview, Contractors, Payment Methods, Streams, Agents, Owners, Documents, Logs tabs. No Transactions tab.

**Root Cause:**
UI hard-codes tab list without Transactions.

**Fix:**
Add "Transactions" tab to business account tabs array and implement the tab content.

---

### 🐛 Issue #3: No beneficial owners shown
**Severity:** Medium  
**Status:** 🔄 In Progress

**Problem:** "Beneficial Owners" card shows empty even for businesses.

**Root Causes:**
1. `account.beneficialOwners` field doesn't exist in API response
2. Not seeded in database

**Fix:**
1. Add beneficial_owners JSONB field to accounts table (or separate table)
2. Seed beneficial owners data
3. Update API to return it
4. UI already checks for it

---

### 🐛 Issue #4: Person account transactions show wrong data
**Severity:** High  
**Status:** 🔄 In Progress

**Problem:** 
- Shows "from undefined"
- Invalid dates
- No status displayed

**Root Cause:**
Transaction mapping is using wrong field names or null values.

**Fix:**
Update transaction mapping in PersonAccountDetail:
```typescript
from: transfer.from_account_name || 'Unknown',
to: transfer.to_account_name || 'Unknown',
date: transfer.created_at,
status: transfer.status,
```

---

### 🐛 Issue #5: All transactions are cross-border type
**Severity:** Medium  
**Status:** 🔄 In Progress

**Problem:** Every transaction shows as external/cross-border. Need variety:
- Internal transfers
- Payroll payments
- Vendor payments
- Refunds
- Card purchases
- Top-ups/withdrawals

**Root Cause:**
seed-database.ts only creates external transfers with corridors.

**Fix:**
Update seed script to create varied transaction types:
- 40% external (cross-border)
- 20% internal (between accounts)
- 15% payroll
- 10% vendor
- 10% card_transaction
- 5% refunds/adjustments

---

### 🐛 Issue #6: No historical seed data
**Severity:** High  
**Status:** 🔄 In Progress

**Problem:** All data shows as yesterday/today. Need 6 months of history for realistic dashboard charts.

**Root Cause:**
Seed scripts use `NOW()` or recent dates.

**Fix:**
- Create historical-seed.ts script
- Generate data across last 6 months
- Vary volume realistically (growth curve)
- Ensure temporal consistency (relationships before transactions, etc.)

---

## Implementation Plan

### Phase 1: UI Fixes (Quick - 30 mins)
1. Add Transactions tab to BusinessAccountDetail
2. Fix transaction mapping in PersonAccountDetail
3. Add null checks for display fields

### Phase 2: Seed Data Fixes (Medium - 2 hours)
4. Update seed-relationships.ts for all tenants
5. Add transaction type variety to seed-database.ts
6. Create seed-beneficial-owners.ts

### Phase 3: Historical Data (Medium - 2 hours)
7. Create seed-historical.ts for 6-month data
8. Update seed-all.ts to include historical data
9. Add progress indicators

---

## Files to Modify

### UI Files
- `payos-ui/src/pages/AccountDetailPage.tsx` - Add Transactions tab, fix mapping

### Seed Files
- `apps/api/scripts/seed-relationships.ts` - Fix tenant lookup, add more
- `apps/api/scripts/seed-database.ts` - Add transaction type variety
- `apps/api/scripts/seed-beneficial-owners.ts` - NEW: Seed beneficial owners
- `apps/api/scripts/seed-historical.ts` - NEW: 6 months of history
- `apps/api/scripts/seed-all.ts` - Include new scripts

### Migration Files (Optional)
- `apps/api/supabase/migrations/20251218_add_beneficial_owners.sql` - NEW

---

## Testing Checklist

- [ ] Business accounts show contractors
- [ ] Business accounts have Transactions tab
- [ ] Beneficial owners displayed for businesses
- [ ] Person account transactions show correct data
- [ ] Transactions show varied types
- [ ] Dashboard charts show 6-month history
- [ ] All dates are realistic
- [ ] No "undefined" or null displays

---

## Progress Tracking

Current Status: **Analysis Complete, Fixes In Progress**

Next Steps:
1. ✅ Document all issues
2. 🔄 Implement UI fixes
3. ⏳ Implement seed data fixes
4. ⏳ Create historical data
5. ⏳ Test all fixes
6. ⏳ Update documentation


