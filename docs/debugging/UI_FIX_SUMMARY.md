# 🐛 UI Issue: Root Cause & Fix Summary

**Date**: January 4, 2026  
**Issue**: AP2 Mandates page shows empty table despite data existing in database

---

## ✅ Root Cause: Tenant Mismatch

### The Problem

The dashboard user (Supabase JWT) and the SDK transactions (API key) belong to **different tenants**:

| Auth Method | Tenant ID | User |
|-------------|-----------|------|
| **Dashboard (Supabase JWT)** | `dad4308f-f9b6-4529-a406-7c2bdf3c6071` | haxaco@gmail.com (dashboard user) |
| **SDK (API Key)** | `da500003-4de9-416b-aebc-61cfcba914c9` | haxaco@gmail.com (API key owner) |

**Result**: Dashboard queries tenant `dad4308f...` (empty), but transactions are in tenant `da500003...` (has 3 mandates).

---

## 🔧 The Fix

### Changed Authentication Priority

**File**: `apps/web/src/lib/api-client.tsx`

**Before** (line 78):
```typescript
const token = authToken || apiKey;  // Prefers JWT (wrong tenant)
```

**After**:
```typescript
const token = apiKey || authToken;  // Prefers API key (correct tenant)
```

### How to Apply

1. **Set API key in browser localStorage**:
   ```javascript
   localStorage.setItem('payos_api_key', 'pk_test_...');
   location.reload();
   ```

2. **Dashboard will now use API key** instead of Supabase JWT
3. **Queries will hit the correct tenant** (da500003-4de9-416b-aebc-61cfcba914c9)
4. **Mandates will appear** in the UI

---

## ✅ Verification

### Database Check
```sql
SELECT COUNT(*) FROM ap2_mandates 
WHERE tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9';
-- Returns: 3 mandates
```

### API Check
```bash
curl -H "Authorization: Bearer pk_test_..." \
  http://localhost:4000/v1/ap2/mandates
# Returns: 200 OK with 3 mandates
```

### Browser Check
```javascript
// Open browser console
localStorage.getItem('payos_api_key');
// Should return: pk_test_...

// Test API call
fetch('http://localhost:4000/v1/ap2/mandates?page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('payos_api_key')}` }
}).then(r => r.json()).then(console.log);
// Should return: { data: [...3 mandates...] }
```

---

## 📊 Transaction Data

All transactions exist in tenant `da500003-4de9-416b-aebc-61cfcba914c9`:

### AP2 Mandates (3 total)
1. **9434a212-39ed-48fd-9455-63ada04cf180**
   - Account: Haxaco Personal Account (0e8f6620-1666-4f9b-840c-84c7f6ff8f15)
   - Authorized: $50, Used: $20
   - Status: cancelled
   
2. **e32c84a1-173a-45b5-a6aa-6e82180b2711**
   - Account: AI Research Company (f9c37b69-26d8-4a66-a91e-18e77c8e566f)
   - Authorized: $50, Used: $20
   - Status: cancelled

3. **03223c46-9aab-4b9b-a5ea-986530f4517f**
   - Account: Compliance Bot Account (cd979010-d206-4aaa-9db2-6798ef5d4eed)
   - Authorized: $100, Used: $14
   - Status: cancelled

---

## 🎯 Long-term Solutions

### 1. Tenant Switcher (Recommended)
Add a tenant selector to the dashboard UI:
- Show current tenant
- Allow switching between tenants
- Store selection in localStorage

### 2. Unified Authentication
Consolidate user records:
- One email → one tenant
- Migrate data from duplicate tenants
- Update RLS policies

### 3. Multi-Tenant Dashboard
Support viewing data across multiple tenants:
- Tenant dropdown in header
- Filter all queries by selected tenant
- Show tenant name in breadcrumbs

---

## 🚀 Next Steps

1. ✅ Code fix applied (`api-client.tsx`)
2. ⏳ User needs to set API key in localStorage
3. ⏳ Verify UI shows data
4. 📋 Plan long-term tenant management solution

---

## 📝 Files Modified

- `apps/web/src/lib/api-client.tsx` - Changed auth priority
- `.gitignore` - Added patterns to exclude credential files
- `docs/debugging/UI_ISSUE_ROOT_CAUSE.md` - Detailed analysis
- `docs/debugging/UI_FIX_SUMMARY.md` - This file

---

## ⚠️ Security Note

**API keys removed from tracked files**:
- Deleted `FINAL_SUMMARY.md` (contained API key)
- Deleted `AUTHENTICATION_FLOW_EXPLAINED.md` (contained API key)
- Deleted `apps/sample-consumer/AUTHENTICATION_FLOW.md` (contained API key)
- Updated `.gitignore` to prevent future commits

**API keys should NEVER be committed to git!**

