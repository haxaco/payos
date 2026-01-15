# PayOS Testing Documentation

**Last Updated:** 2026-01-02

This directory contains comprehensive testing documentation for PayOS, including test data, test plans, and known issues.

---

## 📚 Documentation Index

### Test Plans
1. **`UI_REGRESSION_TEST_PLAN.md`** - Core UI regression test plan
   - Dashboard, Accounts, Transfers, Agents, Streams
   - Core banking features
   - Navigation and layout
   - Edge cases and error scenarios
   - **~1,000 lines of detailed test cases**

2. **`UI_REGRESSION_TEST_PLAN_AGENTIC.md`** - Advanced features test plan
   - Transactions/Ledger
   - Wallets
   - Transfer Schedules
   - Refunds
   - Treasury Management
   - **Agentic Payments (x402, AP2, ACP)**
   - Card Transactions
   - **~600 lines of additional test cases**

### Test Data
3. **`TEST_DATA_SEEDED.md`** - Initial test data summary
   - Basic test data (accounts, transfers, agents, streams)
   - Created during initial setup

4. **`COMPLETE_TEST_DATA_SUMMARY.md`** - Complete test data reference
   - **50+ entities across all categories**
   - Detailed breakdowns by category
   - Verification queries
   - Success criteria

### Known Issues
5. **`KNOWN_UI_ISSUES.md`** - Issue tracker
   - Critical, major, minor, and cosmetic issues
   - Status of fixes
   - Priority recommendations

### Debugging
6. **`../debugging/`** - Debugging documentation
   - Account 360 investigation
   - Tenant isolation fixes
   - Multi-tenancy audit

---

## 🎯 Quick Start for Testing

### Prerequisites
1. **API Server Running:** `http://localhost:4000`
2. **Frontend Running:** `http://localhost:3000`
3. **Test User:** `haxaco@gmail.com`
4. **Test Data Seeded:** Run seeding script (see below)

### Seed Test Data

```bash
cd /Users/haxaco/Dev/PayOS/apps/api

# Complete test data (recommended)
npx tsx scripts/seed-complete-test-data.ts

# OR basic test data only
npx tsx scripts/seed-comprehensive-test-data.ts
```

### Run Regression Tests
1. Open `UI_REGRESSION_TEST_PLAN.md`
2. Follow test cases systematically
3. Check off completed items
4. Document any failures
5. Continue with `UI_REGRESSION_TEST_PLAN_AGENTIC.md` for advanced features

---

## 📊 Test Data Overview

### Core Banking (Basic)
- **5 Accounts** with realistic balances ($15K - $130K)
- **6 Transfers** (3 completed, 1 pending, 1 processing, 1 failed)
- **3 Agents** (Payment, Treasury, Accounting)
- **3 Streams** (2 active, 1 paused)
- **3 Payment Methods** (2 active cards, 1 frozen)
- **1 Compliance Flag** (medium risk)

### Advanced Features (Complete)
- **9 Ledger Entries** (transaction history)
- **3 Wallets** (USDC wallets on Base)
- **3 Transfer Schedules** (recurring payments)
- **2 Refunds** (1 completed, 1 pending)
- **3 Treasury Accounts** ($1.75M total float)
- **3 Treasury Transactions** (deposits, withdrawals, rebalances)

### Agentic Payments (Complete)
- **3 x402 Endpoints** (HTTP 402 Payment Required APIs)
  - Total calls: 10,004
  - Total revenue: $21.82
- **3 AP2 Mandates** (Google Agent Payment Protocol)
  - 3 executions (2 completed, 1 pending)
- **2 ACP Checkouts** (Agentic Commerce Protocol)
  - 5 shopping cart items
  - 1 completed, 1 pending
- **4 Card Transactions** (3 purchases, 1 declined)

**Total:** 50+ distinct entities with realistic relationships

---

## 🧪 Testing Checklist

### Phase 1: Core Features (Priority 1)
- [ ] Dashboard loads with correct stats (5 accounts)
- [ ] Accounts list shows 5 accounts
- [ ] Account detail pages load
- [ ] Account 360 view works (no 404)
- [ ] Transfers page shows 6 transfers
- [ ] Agents page shows 3 agents
- [ ] Streams page shows 3 streams
- [ ] No console errors on critical paths

### Phase 2: Advanced Features (Priority 2)
- [ ] Transactions/Ledger shows 9 entries
- [ ] Wallets page shows 3 wallets
- [ ] Schedules page shows 3 recurring payments
- [ ] Refunds page shows 2 refunds
- [ ] Treasury dashboard shows $1.75M float
- [ ] Card transactions show 4 transactions

### Phase 3: Agentic Payments (Priority 3)
- [ ] x402 endpoints page shows 3 endpoints
- [ ] AP2 mandates page shows 3 mandates
- [ ] ACP checkouts page shows 2 checkouts
- [ ] All agentic payment stats accurate
- [ ] Agent names display correctly

### Phase 4: Edge Cases & Errors
- [ ] Invalid UUIDs handled gracefully
- [ ] Network errors show friendly messages
- [ ] Loading states work correctly
- [ ] Empty states display properly
- [ ] Date formatting works (no "Invalid Date")

---

## 🔍 Verification

### Quick Verification Query
```sql
SELECT 
  (SELECT COUNT(*) FROM accounts WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as accounts,
  (SELECT COUNT(*) FROM transfers WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as transfers,
  (SELECT COUNT(*) FROM agents WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as agents,
  (SELECT COUNT(*) FROM streams WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as streams,
  (SELECT COUNT(*) FROM wallets WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as wallets,
  (SELECT COUNT(*) FROM x402_endpoints WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as x402,
  (SELECT COUNT(*) FROM ap2_mandates WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as ap2,
  (SELECT COUNT(*) FROM acp_checkouts WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071') as acp;
```

**Expected Result:**
```
accounts: 5
transfers: 6
agents: 3
streams: 3
wallets: 3
x402: 3
ap2: 3
acp: 2
```

---

## 🚨 Known Critical Issues

### Must Fix Before Production
1. ✅ **Double-nested API responses** - Fixed in dashboard/accounts
2. ✅ **Invalid date handling** - Fixed in formatDate()
3. ⏭️ **Account 360 returns 404** - Needs testing with new data
4. ⏭️ **Tenant isolation** - Needs verification across all endpoints

### In Progress
- Frontend data parsing (double-nesting)
- Empty state consistency
- Loading state standardization

See `KNOWN_UI_ISSUES.md` for complete list.

---

## 📝 Bug Reporting

When you find a bug during testing:

1. **Check if it's already documented** in `KNOWN_UI_ISSUES.md`
2. **Document the bug** with:
   - Page/URL where it occurs
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/console errors
   - Browser and OS
3. **Add to Known Issues** if new
4. **Prioritize:** P0 (Critical), P1 (Major), P2 (Minor), P3 (Cosmetic)

---

## 🎉 Success Criteria

Testing is considered successful when:

### Core Functionality
- ✅ All pages load without errors
- ✅ All data displays correctly
- ✅ All counts match expected values
- ✅ No console errors on critical paths
- ✅ Dates format properly
- ✅ No "Invalid Date" errors

### Data Integrity
- ✅ All data belongs to correct tenant
- ✅ No cross-tenant data leakage
- ✅ All relationships link correctly
- ✅ Balances and amounts accurate

### User Experience
- ✅ Navigation works smoothly
- ✅ Loading states show appropriately
- ✅ Empty states are helpful
- ✅ Error messages are user-friendly
- ✅ Actions complete successfully

### Agentic Payments
- ✅ x402 endpoints functional
- ✅ AP2 mandates display correctly
- ✅ ACP checkouts show shopping carts
- ✅ All agent integrations work

---

## 📞 Support

- **Test Data Issues:** Check seeding scripts in `apps/api/scripts/`
- **UI Issues:** See `KNOWN_UI_ISSUES.md`
- **API Issues:** Check `docs/debugging/`
- **Questions:** Review test plans for expected behavior

---

## 🔄 Maintenance

### Re-seeding Data
If you need to re-seed test data:

```bash
# 1. Clear existing data (optional)
# Be careful - this will delete ALL data for the tenant!

# 2. Re-run seeding script
cd /Users/haxaco/Dev/PayOS/apps/api
npx tsx scripts/seed-complete-test-data.ts

# 3. Restart API server
lsof -ti:4000 | xargs kill -9
pnpm dev

# 4. Clear browser cache
# Hard reload in browser (Cmd+Shift+R or Ctrl+Shift+R)
```

### Updating Test Plans
When adding new features:
1. Add test cases to appropriate test plan
2. Seed corresponding test data
3. Update `COMPLETE_TEST_DATA_SUMMARY.md`
4. Update this README

---

**Happy Testing! 🧪**



