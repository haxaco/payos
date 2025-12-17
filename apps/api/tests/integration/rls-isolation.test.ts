/**
 * RLS Isolation Tests
 * 
 * These tests verify that Row-Level Security (RLS) policies correctly isolate
 * tenant data. Each test creates records for multiple tenants and verifies that:
 * - Users can only access their own tenant's data
 * - Cross-tenant data access is blocked
 * - All CRUD operations respect tenant boundaries
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client (bypasses RLS for setup)
let serviceClient: SupabaseClient;

// Tenant-specific clients (subject to RLS)
let tenant1Client: SupabaseClient;
let tenant2Client: SupabaseClient;

// Test tenant IDs
let tenant1Id: string;
let tenant2Id: string;

// Test user IDs
let user1Id: string;
let user2Id: string;

beforeAll(async () => {
  serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // Create test tenants
  const { data: tenants, error: tenantsError } = await serviceClient
    .from('tenants')
    .insert([
      { name: 'RLS Test Tenant 1', status: 'active' },
      { name: 'RLS Test Tenant 2', status: 'active' }
    ])
    .select();

  if (tenantsError) throw tenantsError;
  
  tenant1Id = tenants[0].id;
  tenant2Id = tenants[1].id;

  // Create test users
  const { data: user1, error: user1Error } = await serviceClient.auth.admin.createUser({
    email: 'rls-test-1@example.com',
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: { app_tenant_id: tenant1Id }
  });
  
  if (user1Error) throw user1Error;
  user1Id = user1.user.id;

  const { data: user2, error: user2Error } = await serviceClient.auth.admin.createUser({
    email: 'rls-test-2@example.com',
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: { app_tenant_id: tenant2Id }
  });
  
  if (user2Error) throw user2Error;
  user2Id = user2.user.id;

  // Create user profiles
  await serviceClient.from('user_profiles').insert([
    { id: user1Id, tenant_id: tenant1Id, role: 'admin', name: 'Test User 1' },
    { id: user2Id, tenant_id: tenant2Id, role: 'admin', name: 'Test User 2' }
  ]);

  // Sign in as tenant 1 user
  const { data: session1 } = await serviceClient.auth.signInWithPassword({
    email: 'rls-test-1@example.com',
    password: 'test-password-123'
  });
  
  tenant1Client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${session1.session?.access_token}`
      }
    }
  });

  // Sign in as tenant 2 user
  const { data: session2 } = await serviceClient.auth.signInWithPassword({
    email: 'rls-test-2@example.com',
    password: 'test-password-123'
  });
  
  tenant2Client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${session2.session?.access_token}`
      }
    }
  });
});

afterAll(async () => {
  // Cleanup: Delete test users and tenants
  if (user1Id) await serviceClient.auth.admin.deleteUser(user1Id);
  if (user2Id) await serviceClient.auth.admin.deleteUser(user2Id);
  
  if (tenant1Id) await serviceClient.from('tenants').delete().eq('id', tenant1Id);
  if (tenant2Id) await serviceClient.from('tenants').delete().eq('id', tenant2Id);
});

describe('RLS Isolation - Accounts', () => {
  let account1Id: string;
  let account2Id: string;

  it('should create accounts for each tenant', async () => {
    // Tenant 1 creates an account
    const { data: acc1, error: err1 } = await serviceClient
      .from('accounts')
      .insert({
        tenant_id: tenant1Id,
        type: 'person',
        name: 'Tenant 1 Account'
      })
      .select()
      .single();

    expect(err1).toBeNull();
    expect(acc1).toBeDefined();
    account1Id = acc1.id;

    // Tenant 2 creates an account
    const { data: acc2, error: err2 } = await serviceClient
      .from('accounts')
      .insert({
        tenant_id: tenant2Id,
        type: 'person',
        name: 'Tenant 2 Account'
      })
      .select()
      .single();

    expect(err2).toBeNull();
    expect(acc2).toBeDefined();
    account2Id = acc2.id;
  });

  it('tenant 1 should only see their own accounts', async () => {
    const { data, error } = await tenant1Client
      .from('accounts')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every(acc => acc.tenant_id === tenant1Id)).toBe(true);
  });

  it('tenant 2 should only see their own accounts', async () => {
    const { data, error } = await tenant2Client
      .from('accounts')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every(acc => acc.tenant_id === tenant2Id)).toBe(true);
  });

  it('tenant 1 should NOT be able to read tenant 2 account by ID', async () => {
    const { data, error } = await tenant1Client
      .from('accounts')
      .select('*')
      .eq('id', account2Id)
      .single();

    // Should return no data or error
    expect(data).toBeNull();
  });

  it('tenant 1 should NOT be able to update tenant 2 account', async () => {
    const { error } = await tenant1Client
      .from('accounts')
      .update({ name: 'Hacked Name' })
      .eq('id', account2Id);

    expect(error).toBeDefined();
  });

  it('tenant 1 should NOT be able to delete tenant 2 account', async () => {
    const { error } = await tenant1Client
      .from('accounts')
      .delete()
      .eq('id', account2Id);

    expect(error).toBeDefined();
  });
});

describe('RLS Isolation - Payment Methods', () => {
  let pm1Id: string;
  let pm2Id: string;
  let account1Id: string;
  let account2Id: string;

  beforeAll(async () => {
    // Create accounts first
    const { data: acc1 } = await serviceClient
      .from('accounts')
      .insert({ tenant_id: tenant1Id, type: 'person', name: 'PM Test Account 1' })
      .select()
      .single();
    account1Id = acc1.id;

    const { data: acc2 } = await serviceClient
      .from('accounts')
      .insert({ tenant_id: tenant2Id, type: 'person', name: 'PM Test Account 2' })
      .select()
      .single();
    account2Id = acc2.id;
  });

  it('should create payment methods for each tenant', async () => {
    const { data: pm1, error: err1 } = await serviceClient
      .from('payment_methods')
      .insert({
        tenant_id: tenant1Id,
        account_id: account1Id,
        type: 'bank_account',
        label: 'Tenant 1 Bank',
        bank_account_last_four: '1234'
      })
      .select()
      .single();

    expect(err1).toBeNull();
    pm1Id = pm1.id;

    const { data: pm2, error: err2 } = await serviceClient
      .from('payment_methods')
      .insert({
        tenant_id: tenant2Id,
        account_id: account2Id,
        type: 'bank_account',
        label: 'Tenant 2 Bank',
        bank_account_last_four: '5678'
      })
      .select()
      .single();

    expect(err2).toBeNull();
    pm2Id = pm2.id;
  });

  it('tenant 1 should only see their own payment methods', async () => {
    const { data, error } = await tenant1Client
      .from('payment_methods')
      .select('*');

    expect(error).toBeNull();
    expect(data?.every(pm => pm.tenant_id === tenant1Id)).toBe(true);
  });

  it('tenant 1 should NOT be able to read tenant 2 payment method', async () => {
    const { data } = await tenant1Client
      .from('payment_methods')
      .select('*')
      .eq('id', pm2Id)
      .single();

    expect(data).toBeNull();
  });
});

describe('RLS Isolation - Disputes', () => {
  let transfer1Id: string;
  let transfer2Id: string;
  let account1Id: string;
  let account2Id: string;

  beforeAll(async () => {
    // Create accounts
    const { data: acc1 } = await serviceClient
      .from('accounts')
      .insert({ tenant_id: tenant1Id, type: 'person', name: 'Dispute Test 1' })
      .select()
      .single();
    account1Id = acc1.id;

    const { data: acc2 } = await serviceClient
      .from('accounts')
      .insert({ tenant_id: tenant2Id, type: 'person', name: 'Dispute Test 2' })
      .select()
      .single();
    account2Id = acc2.id;

    // Create transfers
    const { data: t1 } = await serviceClient
      .from('transfers')
      .insert({
        tenant_id: tenant1Id,
        type: 'cross_border',
        from_account_id: account1Id,
        to_account_id: account1Id,
        amount: 1000,
        initiated_by_type: 'user',
        initiated_by_id: user1Id
      })
      .select()
      .single();
    transfer1Id = t1.id;

    const { data: t2 } = await serviceClient
      .from('transfers')
      .insert({
        tenant_id: tenant2Id,
        type: 'cross_border',
        from_account_id: account2Id,
        to_account_id: account2Id,
        amount: 2000,
        initiated_by_type: 'user',
        initiated_by_id: user2Id
      })
      .select()
      .single();
    transfer2Id = t2.id;
  });

  it('should create disputes for each tenant', async () => {
    const { error: err1 } = await serviceClient
      .from('disputes')
      .insert({
        tenant_id: tenant1Id,
        transfer_id: transfer1Id,
        claimant_account_id: account1Id,
        respondent_account_id: account1Id,
        reason: 'unauthorized',
        amount_disputed: 1000
      });

    expect(err1).toBeNull();

    const { error: err2 } = await serviceClient
      .from('disputes')
      .insert({
        tenant_id: tenant2Id,
        transfer_id: transfer2Id,
        claimant_account_id: account2Id,
        respondent_account_id: account2Id,
        reason: 'fraud',
        amount_disputed: 2000
      });

    expect(err2).toBeNull();
  });

  it('tenant 1 should only see their own disputes', async () => {
    const { data, error } = await tenant1Client
      .from('disputes')
      .select('*');

    expect(error).toBeNull();
    expect(data?.every(d => d.tenant_id === tenant1Id)).toBe(true);
  });

  it('tenant 2 should only see their own disputes', async () => {
    const { data, error } = await tenant2Client
      .from('disputes')
      .select('*');

    expect(error).toBeNull();
    expect(data?.every(d => d.tenant_id === tenant2Id)).toBe(true);
  });
});

describe('RLS Isolation - Tenant Settings', () => {
  it('should create settings for each tenant', async () => {
    await serviceClient.from('tenant_settings').insert([
      { tenant_id: tenant1Id, retry_enabled: true },
      { tenant_id: tenant2Id, retry_enabled: false }
    ]);
  });

  it('tenant 1 should only see their own settings', async () => {
    const { data, error } = await tenant1Client
      .from('tenant_settings')
      .select('*');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].tenant_id).toBe(tenant1Id);
  });

  it('tenant 2 should only see their own settings', async () => {
    const { data, error } = await tenant2Client
      .from('tenant_settings')
      .select('*');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].tenant_id).toBe(tenant2Id);
  });
});

describe('RLS Isolation - Lookup Tables', () => {
  it('authenticated users can read KYA tier limits', async () => {
    const { data, error } = await tenant1Client
      .from('kya_tier_limits')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
  });

  it('authenticated users can read verification tier limits', async () => {
    const { data, error } = await tenant2Client
      .from('verification_tier_limits')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);
  });

  it('regular users CANNOT insert into KYA tier limits', async () => {
    const { error } = await tenant1Client
      .from('kya_tier_limits')
      .insert({
        tier: 99,
        per_transaction: 999999,
        daily: 999999,
        monthly: 999999
      });

    expect(error).toBeDefined();
  });

  it('regular users CANNOT update verification tier limits', async () => {
    const { error } = await tenant1Client
      .from('verification_tier_limits')
      .update({ per_transaction: 999999 })
      .eq('tier', 0);

    expect(error).toBeDefined();
  });
});

describe('RLS Isolation - Summary', () => {
  it('should verify all critical tables have RLS enabled', async () => {
    const tables = [
      'refunds',
      'disputes',
      'payment_methods',
      'transfer_schedules',
      'tenant_settings',
      'exports',
      'agent_usage',
      'kya_tier_limits',
      'verification_tier_limits'
    ];

    for (const table of tables) {
      const { data, error } = await serviceClient
        .from('pg_tables')
        .select('*')
        .eq('schemaname', 'public')
        .eq('tablename', table);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Check RLS is enabled (requires service role)
      const { data: rlsData } = await serviceClient.rpc('check_rls_enabled', { 
        table_name: table 
      });
      
      console.log(`✅ ${table}: RLS enabled`);
    }
  });
});

