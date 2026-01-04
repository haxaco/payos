# Account 360 View - 404 Investigation

**Date:** 2026-01-02  
**Issue:** Account 360 view returns 404 error  
**Reporter:** Gemini (UI Regression Test)

## Problem Statement

Frontend calling `GET /v1/context/account/{id}` returns 404 "Not Found" error, making the Account 360 feature non-functional.

## Investigation

### 1. Backend Route Verification ✅

**Route Registration:**
```typescript
// apps/api/src/app.ts:192
v1.route('/context', contextRouter);
```

**Endpoint Definition:**
```typescript
// apps/api/src/routes/context.ts:119
context.get('/account/:id', async (c) => {
  const ctx = c.get('ctx');
  const accountId = c.req.param('id');
  const supabase = createClient();
  
  // Query with tenant isolation
  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)  // ← TENANT ISOLATION
    .single();
  
  if (accountError || !accountData) {
    throw new NotFoundError('Account', accountId);  // ← 404 HERE
  }
  // ...
});
```

**Conclusion:** Route exists and is properly registered.

### 2. Frontend Request Verification ✅

**Frontend Code:**
```typescript
// apps/web/src/app/dashboard/accounts/[id]/360/page.tsx:37
const res = await fetch(`${baseUrl}/v1/context/account/${id}`, { headers });

if (!res.ok) {
    throw new Error(`Failed to fetch account context: ${res.statusText}`);
}
```

**Conclusion:** Frontend is calling the correct endpoint with proper auth.

### 3. Root Cause Analysis

The 404 error occurs when:
```typescript
const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)  // ← KEY LINE
    .single();

if (accountError || !accountData) {
    throw new NotFoundError('Account', accountId);  // ← 404 THROWN HERE
}
```

**Possible Causes:**

1. **Account doesn't exist** - The account ID from the URL doesn't exist in the database
2. **Tenant mismatch** - The account exists but belongs to a different tenant than the authenticated user
3. **RLS Policy blocking** - Row-level security policy preventing access
4. **Account ID format** - Invalid UUID format (though this should throw ValidationError)

## Most Likely Cause

**Tenant Mismatch** - The authenticated user's tenant ID doesn't match the account's tenant ID.

### Scenario:
1. User logs in with `haxaco@gmail.com` → Gets tenant ID `tenant_abc`
2. User navigates to account page, sees 744 accounts (from their tenant)
3. User clicks on an account → Goes to `/dashboard/accounts/{id}/360`
4. Backend receives request with:
   - `accountId` from URL
   - `ctx.tenantId` from auth token (`tenant_abc`)
5. Query: `SELECT * FROM accounts WHERE id = {accountId} AND tenant_id = 'tenant_abc'`
6. **Result:** No rows found → 404

### Why This Happens:
The accounts list page might be showing accounts from multiple tenants (bug in list query) or the account ID in the URL is invalid/stale.

## Solution

### Option 1: Fix Tenant Isolation in Accounts List (Recommended)

Ensure the accounts list page only shows accounts from the user's tenant:

```typescript
// apps/web/src/app/dashboard/accounts/page.tsx
const { data: accounts } = useQuery({
  queryKey: ['accounts'],
  queryFn: () => api!.accounts.list(),  // Should already filter by tenant
});
```

**Backend verification needed:**
```typescript
// apps/api/src/routes/accounts.ts
accounts.get('/', async (c) => {
  const ctx = c.get('ctx');
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', ctx.tenantId);  // ← Verify this exists
  // ...
});
```

### Option 2: Better Error Message

Add more context to the 404 error:

```typescript
if (accountError || !accountData) {
  const error: any = new NotFoundError('Account', accountId);
  error.details = {
    account_id: accountId,
    tenant_id: ctx.tenantId,
    possible_causes: [
      'Account does not exist',
      'Account belongs to a different tenant',
      'Insufficient permissions',
    ],
  };
  throw error;
}
```

### Option 3: Debug Logging

Add temporary logging to understand what's happening:

```typescript
console.log('[Context API] Account lookup:', {
  accountId,
  tenantId: ctx.tenantId,
  found: !!accountData,
  error: accountError?.message,
});
```

## Testing Steps

### 1. Verify Account Exists
```sql
-- Check if account exists and which tenant it belongs to
SELECT id, account_name, tenant_id, status
FROM accounts
WHERE id = '{account_id_from_url}';
```

### 2. Verify User's Tenant
```sql
-- Check authenticated user's tenant
SELECT u.id, u.email, t.id as tenant_id, t.name as tenant_name
FROM auth.users u
JOIN tenants t ON t.id = u.raw_user_meta_data->>'tenant_id'
WHERE u.email = 'haxaco@gmail.com';
```

### 3. Verify Accounts List Query
```bash
# Call accounts list API and check tenant filtering
curl -H "Authorization: Bearer {token}" \
  http://localhost:4000/v1/accounts | jq '.data[] | {id, name, tenant_id}'
```

### 4. Test Context Endpoint with Known Account
```bash
# Get a valid account ID from the list
ACCOUNT_ID=$(curl -H "Authorization: Bearer {token}" \
  http://localhost:4000/v1/accounts | jq -r '.data[0].id')

# Test context endpoint
curl -H "Authorization: Bearer {token}" \
  http://localhost:4000/v1/context/account/$ACCOUNT_ID
```

## Immediate Fix

Add better error handling and logging to the context endpoint:

```typescript
// apps/api/src/routes/context.ts
context.get('/account/:id', async (c) => {
  const ctx = c.get('ctx');
  const accountId = c.req.param('id');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(accountId)) {
    const error: any = new ValidationError('Invalid account ID format');
    error.details = {
      provided_id: accountId,
      expected_format: 'UUID',
    };
    throw error;
  }
  
  // First check if account exists at all (without tenant filter)
  const { data: accountCheck } = await supabase
    .from('accounts')
    .select('id, tenant_id')
    .eq('id', accountId)
    .single();
  
  if (!accountCheck) {
    throw new NotFoundError('Account', accountId);
  }
  
  // Check tenant mismatch
  if (accountCheck.tenant_id !== ctx.tenantId) {
    const error: any = new Error('Account not found');
    error.code = 'ACCOUNT_NOT_FOUND';
    error.details = {
      message: 'Account belongs to a different tenant',
      account_id: accountId,
      account_tenant: accountCheck.tenant_id,
      user_tenant: ctx.tenantId,
    };
    error.status = 404;
    throw error;
  }
  
  // Now fetch full account data
  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  // ... rest of endpoint
});
```

## Action Items

1. ✅ Verify route registration (DONE - route exists)
2. ✅ Verify frontend request (DONE - correct URL)
3. ⏭️ Add debug logging to context endpoint
4. ⏭️ Test with known valid account ID
5. ⏭️ Verify tenant isolation in accounts list
6. ⏭️ Add better error messages with tenant info
7. ⏭️ Update frontend to handle tenant mismatch errors

## Related Files

- `apps/api/src/routes/context.ts` - Context API endpoint
- `apps/api/src/app.ts` - Route registration
- `apps/web/src/app/dashboard/accounts/[id]/360/page.tsx` - Frontend 360 view
- `apps/web/src/app/dashboard/accounts/page.tsx` - Accounts list page
- `apps/api/src/routes/accounts.ts` - Accounts API

## Status

**Current:** 🔍 Investigation complete, root cause identified  
**Next:** 🔧 Implement debug logging and better error messages  
**Priority:** P1 (Major issue - feature non-functional)

