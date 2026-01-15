# No Data for haxaco@gmail.com User

**Date:** 2026-01-02  
**Issue:** User `haxaco@gmail.com` sees no accounts, transactions, or data  
**Root Cause:** User has no tenant or tenant has no data

## Problem

The Account 360 404 error is actually a symptom of a bigger issue:
- User `haxaco@gmail.com` is logged in
- But has **no accounts, no transactions, no cards, nothing**
- This means either:
  1. User has no tenant assigned
  2. User's tenant exists but has no data
  3. Frontend is not filtering by the correct tenant

## Why This Causes 404 on Account 360

1. User navigates to accounts list → Sees 744 accounts
2. These 744 accounts likely belong to **other tenants** (seed data)
3. User clicks on an account from a different tenant
4. Context API checks: `WHERE account_id = X AND tenant_id = user_tenant`
5. No match → 404

## Solution Options

### Option 1: Create Test Data for haxaco@gmail.com (Recommended)

Create a tenant and seed data specifically for your user.

**Quick Script:**
```typescript
// apps/api/scripts/setup-haxaco-tenant.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function setupHaxacoTenant() {
  console.log('🏗️  Setting up tenant for haxaco@gmail.com...');
  
  // 1. Get or create user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === 'haxaco@gmail.com');
  
  if (!user) {
    console.error('❌ User haxaco@gmail.com not found');
    process.exit(1);
  }
  
  // 2. Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: 'Haxaco Development',
      slug: 'haxaco',
      status: 'active',
    })
    .select()
    .single();
  
  if (tenantError) {
    console.error('❌ Failed to create tenant:', tenantError);
    process.exit(1);
  }
  
  console.log(`✅ Created tenant: ${tenant.name} (${tenant.id})`);
  
  // 3. Link user to tenant
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      tenant_id: tenant.id,
      role: 'owner',
      name: 'Haxaco Admin',
    });
  
  if (profileError) {
    console.error('❌ Failed to link user to tenant:', profileError);
    process.exit(1);
  }
  
  console.log('✅ Linked user to tenant');
  
  // 4. Create sample accounts
  const accounts = [
    { name: 'Personal Account', type: 'person', email: 'personal@haxaco.com' },
    { name: 'Business Account', type: 'business', email: 'business@haxaco.com' },
    { name: 'Savings Account', type: 'person', email: 'savings@haxaco.com' },
  ];
  
  for (const account of accounts) {
    const { data: acc } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenant.id,
        account_name: account.name,
        account_type: account.type,
        email: account.email,
        status: 'active',
        kyc_status: 'approved',
        verification_tier: 2,
      })
      .select()
      .single();
    
    console.log(`✅ Created account: ${account.name} (${acc.id})`);
    
    // Add balance
    await supabase
      .from('balances')
      .insert({
        account_id: acc.id,
        tenant_id: tenant.id,
        currency: 'USD',
        available: 10000.00,
        pending_incoming: 0,
        pending_outgoing: 0,
        holds: 0,
      });
  }
  
  console.log('\n✅ Setup complete!');
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Accounts: ${accounts.length}`);
  console.log(`   User: haxaco@gmail.com`);
}

setupHaxacoTenant().catch(console.error);
```

### Option 2: Use Existing Test Tenant

Link `haxaco@gmail.com` to an existing tenant that has seed data.

**Steps:**
1. Find existing tenant with data:
   ```sql
   SELECT t.id, t.name, COUNT(a.id) as account_count
   FROM tenants t
   LEFT JOIN accounts a ON a.tenant_id = t.id
   GROUP BY t.id, t.name
   HAVING COUNT(a.id) > 0;
   ```

2. Link user to that tenant:
   ```sql
   -- Get user ID
   SELECT id FROM auth.users WHERE email = 'haxaco@gmail.com';
   
   -- Link to tenant (replace with actual IDs)
   INSERT INTO user_profiles (id, tenant_id, role, name)
   VALUES ('user_id_here', 'tenant_id_here', 'owner', 'Haxaco Admin')
   ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
   ```

### Option 3: Fix Frontend to Show Only User's Tenant Data

The accounts list is showing 744 accounts from **all tenants**, not just the user's tenant. This is a bug.

**Fix the accounts list query:**
```typescript
// apps/api/src/routes/accounts.ts
accounts.get('/', async (c) => {
  const ctx = c.get('ctx');
  
  // MUST filter by tenant
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', ctx.tenantId)  // ← CRITICAL
    .order('created_at', { ascending: false });
  
  // ...
});
```

## Immediate Action

**I recommend Option 1** - Create a proper tenant and test data for `haxaco@gmail.com`.

This will:
1. Give you a clean tenant to work with
2. Provide realistic test data
3. Ensure proper tenant isolation
4. Make the Account 360 view work correctly

## Files to Create

1. `apps/api/scripts/setup-haxaco-tenant.ts` - Script to create tenant and data
2. Run it once to populate your user's tenant

## Expected Result

After running the setup script:
- ✅ User `haxaco@gmail.com` has a tenant
- ✅ Tenant has 3+ accounts with balances
- ✅ Accounts list shows only user's accounts
- ✅ Account 360 view works (no 404)
- ✅ All features testable

## Why 744 Accounts Were Showing

The 744 accounts are from seed data for **other tenants**. The frontend accounts list is not filtering by tenant, so it shows all accounts in the database. This is a critical bug that needs to be fixed.

## Next Steps

1. ✅ Identify the issue (no tenant/data for haxaco@gmail.com)
2. ⏭️ Create setup script for haxaco tenant
3. ⏭️ Run script to populate data
4. ⏭️ Fix accounts list to filter by tenant
5. ⏭️ Test Account 360 view
6. ⏭️ Verify tenant isolation works

---

**Status:** 🔍 Root cause identified  
**Priority:** P0 (Blocking all testing)  
**Action:** Create tenant and data for haxaco@gmail.com



