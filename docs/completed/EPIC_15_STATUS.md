# Epic 15 Status & Gemini Testing Guide

## Epic 15: Row-Level Security Hardening - Status Report

### ✅ **COMPLETE (10/10 points)**

All 5 stories are marked as complete in the PRD:

| Story | Points | Status | Deliverables |
|-------|--------|--------|--------------|
| 15.1 Refunds & Disputes RLS | 2 | ✅ Complete | Migration applied |
| 15.2 Payments & Schedules RLS | 2 | ✅ Complete | Migration applied |
| 15.3 Settings & Exports RLS | 2 | ✅ Complete | Migration applied |
| 15.4 Lookup Tables RLS | 1 | ✅ Complete | Migration applied |
| 15.5 RLS Audit & Testing | 3 | ✅ Complete | Tests + Docs created |

---

## 🔍 What's Actually Left to Do

### 1. **Integration Tests - Run & Verify** ⚠️

**Status:** Tests written but need to be run and verified

**Location:** `apps/api/tests/integration/rls-isolation.test.ts`

**Action Required:**
```bash
cd apps/api
pnpm test:integration -- rls-isolation.test.ts
```

**What to Verify:**
- [ ] All tests pass
- [ ] Tests actually create multi-tenant scenarios
- [ ] Tests verify cross-tenant isolation
- [ ] No false positives

**Estimated Time:** 30 minutes

---

### 2. **CI Check for New Tables Without RLS** ⚠️

**Status:** Marked complete in PRD but **NOT actually implemented**

**What's Needed:**
- GitHub Actions workflow or pre-commit hook
- Script to detect new tables without RLS
- Fail CI if new table is created without RLS enabled

**Action Required:**
- Create `.github/workflows/rls-check.yml` or similar
- Add script to check RLS coverage on new migrations
- Integrate into CI pipeline

**Estimated Time:** 1-2 hours

**Acceptance Criteria:**
- [ ] CI fails if new table is created without RLS
- [ ] CI fails if new table has RLS but no policies
- [ ] Warning/error message is clear and actionable

---

### 3. **Manual Verification of RLS Policies** ⚠️

**Status:** Should be done but not verified

**Action Required:**
- Run RLS audit script: `psql $DATABASE_URL -f apps/api/scripts/audit-rls-coverage.sql`
- Verify all 24 tables show RLS enabled
- Verify all policies are correct

**Estimated Time:** 15 minutes

---

## 🧪 What Gemini Can Test

### ✅ **What Gemini CAN Test (Through UI/API):**

#### 1. **Tenant Data Isolation (UI Level)**
**Test:** Log in as different users and verify data isolation

**Steps:**
1. Log in as User A (Tenant A)
2. Navigate to Accounts, Transactions, Payment Methods, etc.
3. Note the data visible
4. Log out
5. Log in as User B (Tenant B)
6. Navigate to same pages
7. Verify User B cannot see User A's data

**What This Tests:**
- ✅ Application-level tenant isolation
- ✅ UI correctly filters by tenant
- ✅ API correctly filters by tenant
- ⚠️ **Indirectly tests RLS** (if API respects RLS, UI will show correct data)

**Limitations:**
- Cannot directly test database-level RLS
- Cannot test if someone bypasses the API
- Cannot test service role access

---

#### 2. **API Endpoint Isolation**
**Test:** Make API calls with different tenant contexts

**Steps:**
1. Get API key for Tenant A
2. Make API calls to `/v1/accounts`, `/v1/payment-methods`, etc.
3. Note the data returned
4. Get API key for Tenant B
5. Make same API calls
6. Verify Tenant B cannot access Tenant A's data

**What This Tests:**
- ✅ API middleware correctly filters by tenant
- ✅ API keys are properly scoped
- ⚠️ **Indirectly tests RLS** (if RLS works, API will return correct data)

**Limitations:**
- Cannot test direct database access
- Cannot test if RLS is bypassed

---

#### 3. **Cross-Tenant Access Attempts**
**Test:** Try to access other tenant's data by ID

**Steps:**
1. Log in as Tenant A
2. Get an account ID from Tenant A
3. Log in as Tenant B
4. Try to access Tenant A's account by ID: `/accounts/{tenant-a-account-id}`
5. Verify access is denied or returns 404/403

**What This Tests:**
- ✅ Direct ID access is blocked
- ✅ Error handling is correct
- ⚠️ **Tests RLS effect** (if RLS blocks, API will return error)

---

### ❌ **What Gemini CANNOT Test:**

1. **Direct Database Access**
   - Cannot test if RLS blocks direct SQL queries
   - Cannot test service role bypass

2. **RLS Policy Implementation**
   - Cannot verify policy syntax
   - Cannot verify policy logic

3. **Performance Impact**
   - Cannot measure RLS query overhead
   - Cannot test init plan optimization

4. **Edge Cases**
   - Cannot test NULL tenant_id scenarios
   - Cannot test JWT claim manipulation

---

## 📋 Recommended Testing Plan for Gemini

### **Phase 1: Basic Tenant Isolation (30 min)**

1. **Multi-User Login Test**
   - Create 2 test users (different tenants)
   - Log in as User 1, note visible data
   - Log in as User 2, verify different data
   - Verify no cross-contamination

2. **Account Isolation**
   - User 1: View accounts list
   - User 2: View accounts list
   - Verify different accounts shown
   - Try to access User 1's account ID as User 2

3. **Transaction Isolation**
   - User 1: View transactions
   - User 2: View transactions
   - Verify different transactions shown

### **Phase 2: Payment Methods & Financial Data (30 min)**

4. **Payment Methods Isolation**
   - User 1: View payment methods
   - User 2: View payment methods
   - Verify different payment methods shown
   - Try to access User 1's payment method ID as User 2

5. **Disputes Isolation**
   - User 1: View disputes
   - User 2: View disputes
   - Verify different disputes shown

6. **Refunds Isolation**
   - User 1: View refunds (if available)
   - User 2: View refunds (if available)
   - Verify different refunds shown

### **Phase 3: Settings & Configuration (15 min)**

7. **Settings Isolation**
   - User 1: View tenant settings
   - User 2: View tenant settings
   - Verify settings are tenant-specific

8. **API Keys Isolation**
   - User 1: View API keys
   - User 2: View API keys
   - Verify different API keys shown

### **Phase 4: Compliance & Security (15 min)**

9. **Compliance Flags Isolation**
   - User 1: View compliance flags
   - User 2: View compliance flags
   - Verify different flags shown

10. **Security Events Isolation**
    - User 1: View security events (if accessible)
    - User 2: View security events (if accessible)
    - Verify different events shown

---

## 🎯 Summary

### **What's Left in Epic 15:**
1. ⚠️ Run integration tests and verify they pass (30 min)
2. ⚠️ Implement CI check for new tables without RLS (1-2 hours)
3. ⚠️ Manual verification of RLS coverage (15 min)

**Total Remaining Work:** ~2-3 hours

### **What Gemini Can Test:**
- ✅ **80% of RLS effectiveness** through UI/API testing
- ✅ Tenant data isolation at application level
- ✅ Cross-tenant access blocking
- ✅ Error handling for unauthorized access
- ❌ Cannot test database-level RLS directly
- ❌ Cannot test service role scenarios

### **Recommendation:**
1. **Run integration tests first** to verify RLS works at DB level
2. **Then have Gemini test UI/API** to verify RLS works at application level
3. **Implement CI check** to prevent future regressions

---

**Last Updated:** December 17, 2025

