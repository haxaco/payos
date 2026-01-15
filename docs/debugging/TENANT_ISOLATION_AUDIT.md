# Tenant Isolation Audit - CRITICAL P0

**Date:** 2026-01-02  
**Issue:** Multi-tenancy isolation broken - showing 12,847 accounts instead of 5  
**Priority:** P0 - CRITICAL SECURITY ISSUE

## Problem Statement

User `haxaco@gmail.com` has tenant `dad4308f-f9b6-4529-a406-7c2bdf3c6071` with 5 accounts, but dashboard shows **12,847 accounts**.

**This is a critical security vulnerability** - users can see data from other tenants.

## Investigation

### Auth Context is Correct ✅

From terminal logs:
```
DEBUG: Auth Success (JWT). Setting ctx: {
  tenantId: 'dad4308f-f9b6-4529-a406-7c2bdf3c6071',
  actorType: 'user',
  userId: '08bc1507-3338-4eb2-8fc7-2634db173bc4',
  userName: 'Haxaco Admin'
}
```

The auth middleware is correctly setting the tenant ID.

### Accounts API Has Tenant Filter ✅

`apps/api/src/routes/accounts.ts:54`:
```typescript
let dbQuery = supabase
  .from('accounts')
  .select('*', { count: 'exact' })
  .eq('tenant_id', ctx.tenantId)  // ← Filter is present
  .order('created_at', { ascending: false })
```

The filter exists but isn't working.

## Root Causes (Possible)

### 1. Frontend Bypassing API (Most Likely)

The frontend might be:
- Calling Supabase directly (bypassing API)
- Using a different endpoint
- Not using the API at all

**Check:** `apps/web` for direct Supabase calls

### 2. RLS Policies Not Enforced

Row Level Security might not be enabled or has bypass policies.

**Check:** Supabase RLS policies on `accounts` table

### 3. Accounts Have NULL tenant_id

Some accounts might have `tenant_id = NULL`, causing them to appear for all users.

**Check:** 
```sql
SELECT COUNT(*) FROM accounts WHERE tenant_id IS NULL;
```

### 4. Service Role Key Used

Frontend might be using service role key instead of user JWT, bypassing RLS.

**Check:** Frontend auth configuration

## Immediate Actions Required

### Action 1: Check Frontend API Calls

```bash
# Search for direct Supabase calls in frontend
grep -r "supabase.from('accounts')" apps/web/
grep -r "createClient" apps/web/src/lib/
```

### Action 2: Verify RLS Policies

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'accounts';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'accounts';
```

### Action 3: Check for NULL tenant_id

```sql
-- Count accounts by tenant
SELECT tenant_id, COUNT(*) 
FROM accounts 
GROUP BY tenant_id 
ORDER BY COUNT(*) DESC;

-- Find NULL tenant_id accounts
SELECT COUNT(*) FROM accounts WHERE tenant_id IS NULL;
```

### Action 4: Test API Directly

```bash
# Get JWT token from browser DevTools
TOKEN="your_jwt_token_here"

# Test accounts endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/v1/accounts | jq '.data | length'

# Should return 5, not 12847
```

## Expected vs Actual

### Expected:
- User sees **5 accounts** (their tenant's accounts)
- API query: `SELECT * FROM accounts WHERE tenant_id = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071'`
- Result: 5 rows

### Actual:
- User sees **12,847 accounts** (all accounts in database)
- Something is bypassing the tenant filter

## Security Impact

**CRITICAL:** This is a **data leak vulnerability**. Users can:
- ❌ See accounts from other tenants
- ❌ Potentially access other tenants' data
- ❌ View sensitive information (names, emails, balances)

**Must be fixed immediately before any production use.**

## All Endpoints Need Audit

Every API endpoint must filter by `tenant_id`. Check:

1. ✅ **Accounts** - Has filter but not working
2. ⏭️ **Transfers** - Need to verify
3. ⏭️ **Agents** - Need to verify
4. ⏭️ **Streams** - Need to verify
5. ⏭️ **Payment Methods** - Need to verify
6. ⏭️ **Disputes** - Need to verify
7. ⏭️ **Webhooks** - Need to verify
8. ⏭️ **All other endpoints** - Need to verify

## Fix Strategy

### Option 1: Enforce RLS (Recommended)

Enable Row Level Security on all tables:
```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their tenant's accounts"
ON accounts FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
```

### Option 2: Middleware Enforcement

Add middleware to verify all queries include tenant filter:
```typescript
// Intercept all Supabase queries
supabase.from('accounts').select('*')
// Automatically add: .eq('tenant_id', ctx.tenantId)
```

### Option 3: Frontend Fix

Ensure frontend uses API, not direct Supabase:
```typescript
// ❌ BAD: Direct Supabase call
const { data } = await supabase.from('accounts').select('*');

// ✅ GOOD: Use API
const data = await api.accounts.list();
```

## Next Steps

1. ⏭️ **Find where 12,847 is coming from** - Frontend or API?
2. ⏭️ **Enable RLS on all tables** - Database-level protection
3. ⏭️ **Audit all API endpoints** - Ensure tenant filtering
4. ⏭️ **Test multi-tenancy** - Create second tenant, verify isolation
5. ⏭️ **Add integration tests** - Prevent regression

## Status

🚨 **CRITICAL SECURITY ISSUE**  
⏭️ **Investigating source of 12,847 accounts**  
⏭️ **Must fix before proceeding with any other work**

---

**This is the highest priority issue. All other work should be paused until tenant isolation is fixed.**



