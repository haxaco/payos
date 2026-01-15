# Account 360 - Debug Logging Added

**Date:** 2026-01-02  
**Status:** 🔧 Fix Applied  
**Priority:** P1

## Changes Made

### Enhanced Error Handling in Context API

**File:** `apps/api/src/routes/context.ts`

Added comprehensive debug logging and tenant mismatch detection to the Account Context endpoint.

### What Was Added

1. **Pre-check for Account Existence**
   ```typescript
   // Check if account exists at all (without tenant filter)
   const { data: accountCheck } = await supabase
     .from('accounts')
     .select('id, tenant_id, account_name')
     .eq('id', accountId)
     .single();
   
   if (!accountCheck) {
     console.log('[Context API] Account not found:', { accountId });
     throw new NotFoundError('Account', accountId);
   }
   ```

2. **Tenant Mismatch Detection**
   ```typescript
   // Check for tenant mismatch (common cause of 404)
   if (accountCheck.tenant_id !== ctx.tenantId) {
     console.log('[Context API] Tenant mismatch:', {
       accountId,
       accountName: accountCheck.account_name,
       accountTenant: accountCheck.tenant_id,
       userTenant: ctx.tenantId,
     });
     const error: any = new NotFoundError('Account', accountId);
     error.details = {
       message: 'Account not accessible (tenant mismatch)',
       account_id: accountId,
     };
     throw error;
   }
   ```

3. **Success Logging**
   ```typescript
   console.log('[Context API] Account found:', {
     accountId,
     accountName: accountData.account_name,
     tenantId: ctx.tenantId,
   });
   ```

## How to Use

### 1. Restart API Server

The API server needs to be restarted to pick up the changes:

```bash
# Kill existing instances
lsof -ti:4000 | xargs kill -9 2>/dev/null

# Start fresh
cd /Users/haxaco/Dev/PayOS/apps/api
pnpm dev
```

### 2. Reproduce the Issue

Navigate to the Account 360 view in the dashboard:
```
http://localhost:3000/dashboard/accounts/{account_id}/360
```

### 3. Check Server Logs

Watch the API server terminal for log output:

**If account doesn't exist:**
```
[Context API] Account not found: { accountId: 'acc_xxx' }
```

**If tenant mismatch:**
```
[Context API] Tenant mismatch: {
  accountId: 'acc_xxx',
  accountName: 'Example Account',
  accountTenant: 'tenant_abc',
  userTenant: 'tenant_def'
}
```

**If successful:**
```
[Context API] Account found: {
  accountId: 'acc_xxx',
  accountName: 'Example Account',
  tenantId: 'tenant_abc'
}
```

## Expected Outcomes

### Scenario 1: Account Doesn't Exist
- **Log:** `[Context API] Account not found`
- **Response:** 404 with `ACCOUNT_NOT_FOUND` error code
- **Action:** Verify the account ID is correct

### Scenario 2: Tenant Mismatch
- **Log:** `[Context API] Tenant mismatch`
- **Response:** 404 with tenant mismatch details
- **Action:** Check why the accounts list is showing accounts from other tenants

### Scenario 3: Success
- **Log:** `[Context API] Account found`
- **Response:** 200 with full account context
- **Action:** None - working as expected

## Next Steps

1. **Restart API server** to apply changes
2. **Reproduce the 404 error** in the UI
3. **Check server logs** to see which scenario occurs
4. **Based on logs:**
   - If "Account not found" → Verify account ID
   - If "Tenant mismatch" → Fix accounts list query to filter by tenant
   - If "Account found" → Issue is elsewhere (caching, frontend, etc.)

## Files Modified

- `apps/api/src/routes/context.ts` - Added debug logging and tenant mismatch detection

## Related Documentation

- `docs/debugging/ACCOUNT_360_404_INVESTIGATION.md` - Full investigation details
- `docs/reports/GEMINI_UI_REGRESSION_REPORT.md` - Original bug report

## Status

✅ **Debug logging added**  
⏭️ **Waiting for server restart and reproduction**  
⏭️ **Analyze logs to determine root cause**  
⏭️ **Apply permanent fix based on findings**

---

**Note:** These console.log statements are temporary for debugging. Once the root cause is identified and fixed, they should be removed or converted to proper structured logging.



