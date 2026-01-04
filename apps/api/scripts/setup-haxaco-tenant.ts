#!/usr/bin/env tsx

/**
 * Setup Haxaco Tenant
 * 
 * Creates a tenant and test data for haxaco@gmail.com user
 * 
 * Usage:
 *   npx tsx scripts/setup-haxaco-tenant.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function generateApiKey(): string {
  return 'pk_test_' + crypto.randomBytes(32).toString('base64url');
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function setupHaxacoTenant() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║         Haxaco Tenant Setup                            ║');
  console.log('║         Creating tenant and test data                  ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  // ============================================
  // 1. Get User
  // ============================================
  console.log('1️⃣  Finding user haxaco@gmail.com...');
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === 'haxaco@gmail.com');
  
  if (!user) {
    console.error('❌ User haxaco@gmail.com not found');
    console.error('   Please sign up first at http://localhost:3000');
    process.exit(1);
  }
  
  console.log(`✅ Found user: ${user.email} (${user.id})`);
  
  // ============================================
  // 2. Check for Existing Tenant
  // ============================================
  console.log('\n2️⃣  Checking for existing tenant...');
  const { data: existingTenants } = await supabase
    .from('tenants')
    .select('*')
    .eq('name', 'Haxaco Development');
  
  let tenantId: string;
  
  if (existingTenants && existingTenants.length > 0) {
    console.log(`✅ Tenant already exists: ${existingTenants[0].name}`);
    tenantId = existingTenants[0].id;
  } else {
    // Create tenant with API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Haxaco Development',
        status: 'active',
        api_key: apiKey,
        api_key_hash: apiKeyHash,
      })
      .select()
      .single();
    
    if (tenantError) {
      console.error('❌ Failed to create tenant:', tenantError);
      process.exit(1);
    }
    
    console.log(`✅ Created tenant: ${tenant.name} (${tenant.id})`);
    console.log(`   API Key: ${apiKey}`);
    tenantId = tenant.id;
  }
  
  // ============================================
  // 3. Link User to Tenant
  // ============================================
  console.log('\n3️⃣  Linking user to tenant...');
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      tenant_id: tenantId,
      role: 'owner',
      name: 'Haxaco Admin',
    });
  
  if (profileError) {
    console.error('❌ Failed to link user to tenant:', profileError);
    process.exit(1);
  }
  
  console.log('✅ Linked user to tenant');
  
  // ============================================
  // 4. Create Sample Accounts
  // ============================================
  console.log('\n4️⃣  Creating sample accounts...');
  
  const accounts = [
    { 
      name: 'Personal Checking', 
      type: 'person', 
      email: 'personal@haxaco.com',
      balance: 25000.00,
    },
    { 
      name: 'Business Account', 
      type: 'business', 
      email: 'business@haxaco.com',
      balance: 150000.00,
    },
    { 
      name: 'Savings Account', 
      type: 'person', 
      email: 'savings@haxaco.com',
      balance: 50000.00,
    },
    { 
      name: 'Payroll Account', 
      type: 'business', 
      email: 'payroll@haxaco.com',
      balance: 75000.00,
    },
    { 
      name: 'Investment Account', 
      type: 'person', 
      email: 'investment@haxaco.com',
      balance: 100000.00,
    },
  ];
  
  const createdAccounts: any[] = [];
  
  for (const account of accounts) {
    const { data: acc, error: accError } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        name: account.name,
        type: account.type,
        email: account.email,
      })
      .select()
      .single();
    
    if (accError) {
      console.error(`❌ Failed to create account ${account.name}:`, accError);
      continue;
    }
    
    console.log(`✅ Created account: ${account.name} (${acc.id})`);
    createdAccounts.push({ ...acc, initialBalance: account.balance });
    
    // Add balance
    await supabase
      .from('balances')
      .insert({
        account_id: acc.id,
        tenant_id: tenantId,
        currency: 'USD',
        available: account.balance,
        pending_incoming: 0,
        pending_outgoing: 0,
        holds: 0,
      });
  }
  
  // ============================================
  // 5. Create Sample Transfers
  // ============================================
  console.log('\n5️⃣  Creating sample transfers...');
  
  if (createdAccounts.length >= 2) {
    const transfers = [
      {
        from: createdAccounts[0].id,
        to: createdAccounts[1].id,
        amount: 1000.00,
        status: 'completed',
        description: 'Monthly subscription payment',
      },
      {
        from: createdAccounts[1].id,
        to: createdAccounts[2].id,
        amount: 5000.00,
        status: 'completed',
        description: 'Savings transfer',
      },
      {
        from: createdAccounts[3].id,
        to: createdAccounts[0].id,
        amount: 3500.00,
        status: 'completed',
        description: 'Salary payment',
      },
      {
        from: createdAccounts[0].id,
        to: createdAccounts[4].id,
        amount: 2000.00,
        status: 'pending',
        description: 'Investment contribution',
      },
    ];
    
    for (const transfer of transfers) {
      const { error: transferError } = await supabase
        .from('transfers')
        .insert({
          tenant_id: tenantId,
          from_account_id: transfer.from,
          to_account_id: transfer.to,
          amount: transfer.amount,
          currency: 'USD',
          status: transfer.status,
          description: transfer.description,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      
      if (transferError) {
        console.error(`❌ Failed to create transfer:`, transferError);
      } else {
        console.log(`✅ Created transfer: $${transfer.amount} (${transfer.status})`);
      }
    }
  }
  
  // ============================================
  // 6. Create Sample Agent
  // ============================================
  console.log('\n6️⃣  Creating sample agent...');
  
  if (createdAccounts.length > 0) {
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        tenant_id: tenantId,
        parent_account_id: createdAccounts[1].id, // Business account
        agent_name: 'Payment Bot',
        agent_type: 'payment',
        status: 'active',
        kya_tier: 2,
        spending_limit_daily: 10000.00,
        spending_limit_monthly: 100000.00,
      })
      .select()
      .single();
    
    if (agentError) {
      console.error('❌ Failed to create agent:', agentError);
    } else {
      console.log(`✅ Created agent: ${agent.agent_name} (${agent.id})`);
    }
  }
  
  // ============================================
  // 7. Summary
  // ============================================
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║         ✅ Setup Complete!                              ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Summary:');
  console.log(`   User: haxaco@gmail.com`);
  console.log(`   Tenant: Haxaco Development`);
  console.log(`   Accounts: ${createdAccounts.length}`);
  console.log(`   Transfers: 4`);
  console.log(`   Agents: 1`);
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('   1. Refresh the dashboard: http://localhost:3000/dashboard');
  console.log('   2. You should now see your accounts');
  console.log('   3. Try the Account 360 view');
  console.log('');
}

setupHaxacoTenant()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });

