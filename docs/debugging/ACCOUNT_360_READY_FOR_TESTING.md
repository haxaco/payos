# Account 360 - Ready for Testing

**Date:** 2026-01-02  
**Status:** ✅ Debug Logging Applied & Server Running  
**Priority:** P1

## Summary

The Account 360 endpoint has been enhanced with comprehensive debug logging to diagnose the 404 error reported by Gemini. The API server is now running with these changes.

## Changes Applied

### 1. Enhanced Context API Endpoint
**File:** `apps/api/src/routes/context.ts`

Added three levels of debug logging:
1. **Account Not Found** - Account ID doesn't exist
2. **Tenant Mismatch** - Account exists but belongs to different tenant  
3. **Success** - Account found and accessible

### 2. Fixed Import Error
**File:** `apps/api/src/routes/transfers.ts`

Removed non-existent `QuoteExpiredError` import that was preventing server startup.

### 3. API Server Status
✅ **Running** on `http://localhost:4000`  
✅ **Health Check** passing  
✅ **Debug logging** active

## How to Reproduce & Diagnose

### Step 1: Navigate to Account 360
Open the dashboard and go to any account's 360 view:
```
http://localhost:3000/dashboard/accounts/{account_id}/360
```

### Step 2: Watch API Server Logs
The API server is logging to `/tmp/payos-api-live.log`. Watch it in real-time:

```bash
tail -f /tmp/payos-api-live.log | grep "Context API"
```

### Step 3: Interpret the Logs

**Scenario A: Account Not Found**
```
[Context API] Account not found: { accountId: 'acc_xxx' }
```
**Meaning:** The account ID from the URL doesn't exist in the database.  
**Action:** Verify the account ID is correct. Check if it was deleted.

**Scenario B: Tenant Mismatch** (Most Likely)
```
[Context API] Tenant mismatch: {
  accountId: 'acc_xxx',
  accountName: 'Example Account',
  accountTenant: 'tenant_abc',
  userTenant: 'tenant_def'
}
```
**Meaning:** The account exists but belongs to a different tenant than the logged-in user.  
**Action:** This indicates a bug in the accounts list page - it's showing accounts from other tenants. Need to fix the accounts list query to filter by tenant.

**Scenario C: Success**
```
[Context API] Account found: {
  accountId: 'acc_xxx',
  accountName: 'Example Account',
  tenantId: 'tenant_abc'
}
```
**Meaning:** Everything works! The 404 was a transient issue.  
**Action:** Monitor for recurrence.

## Quick Test

Test the endpoint directly with curl:

```bash
# Get your auth token from the browser
# Open DevTools → Application → Local Storage → look for auth token

# Test the endpoint
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:4000/v1/context/account/ACCOUNT_ID_HERE | jq .
```

## Expected Root Cause

Based on the regression report, the most likely cause is **Scenario B: Tenant Mismatch**.

### Why This Happens:
1. User logs in → Gets tenant ID `tenant_A`
2. Accounts list shows 744 accounts → Some may be from other tenants (bug)
3. User clicks on an account from `tenant_B`
4. Context API receives:
   - `accountId` from URL (belongs to `tenant_B`)
   - `ctx.tenantId` from auth token (`tenant_A`)
5. Query: `SELECT * FROM accounts WHERE id = accountId AND tenant_id = 'tenant_A'`
6. Result: No rows → 404

### The Fix:
Ensure the accounts list page only shows accounts from the user's tenant:

```typescript
// apps/api/src/routes/accounts.ts
accounts.get('/', async (c) => {
  const ctx = c.get('ctx');
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', ctx.tenantId);  // ← Must filter by tenant
  // ...
});
```

## Next Steps

1. ✅ **Server Running** - API server is up with debug logging
2. ⏭️ **Reproduce Issue** - Navigate to Account 360 view in dashboard
3. ⏭️ **Check Logs** - Look for tenant mismatch message
4. ⏭️ **Fix Root Cause** - Based on log output:
   - If tenant mismatch → Fix accounts list to filter by tenant
   - If account not found → Investigate why invalid IDs are in URLs
5. ⏭️ **Remove Debug Logs** - Once fixed, clean up console.log statements

## Files Modified

- ✅ `apps/api/src/routes/context.ts` - Added debug logging
- ✅ `apps/api/src/routes/transfers.ts` - Fixed import error
- ✅ API Server restarted with changes

## Related Documentation

- `docs/debugging/ACCOUNT_360_404_INVESTIGATION.md` - Full investigation
- `docs/debugging/ACCOUNT_360_FIX_APPLIED.md` - Changes applied
- `docs/reports/GEMINI_UI_REGRESSION_REPORT.md` - Original bug report

## Status

✅ **Debug logging active**  
✅ **Server running**  
⏭️ **Ready for reproduction and diagnosis**  
⏭️ **Awaiting log output to determine root cause**

---

**Note:** The debug logging will help us identify exactly why the 404 is occurring. Once we see the log output, we can apply the permanent fix.

