#!/usr/bin/env tsx
/**
 * Comprehensive Test Data Seeding Script
 * Creates realistic test data for haxaco@gmail.com across all entities
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

interface Account {
  id: string;
  name: string;
  type: string;
}

interface TestDataSummary {
  accounts: number;
  transfers: number;
  agents: number;
  streams: number;
  cards: number;
  balances: number;
  transactions: number;
  complianceFlags: number;
}

async function main() {
  console.log('🌱 Seeding comprehensive test data...\n');

  // 1. Find the user
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !userData) {
    console.error('❌ Error fetching users:', userError);
    process.exit(1);
  }

  const user = userData.users.find(u => u.email === 'haxaco@gmail.com');
  if (!user) {
    console.error('❌ User haxaco@gmail.com not found');
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (${user.id})\n`);

  // 2. Get the tenant
  const { data: userProfile, error: userProfileError } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (userProfileError || !userProfile) {
    console.error('❌ Error fetching user profile:', userProfileError);
    console.error('   Run setup-haxaco-tenant.ts first to create tenant');
    process.exit(1);
  }

  const tenantId = userProfile.tenant_id;
  console.log(`✅ Using tenant: ${tenantId}\n`);

  // 3. Get existing accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name, type')
    .eq('tenant_id', tenantId);

  if (accountsError || !accounts || accounts.length === 0) {
    console.error('❌ No accounts found. Run setup-haxaco-tenant.ts first');
    process.exit(1);
  }

  console.log(`✅ Found ${accounts.length} accounts\n`);

  const summary: TestDataSummary = {
    accounts: accounts.length,
    transfers: 0,
    agents: 0,
    streams: 0,
    cards: 0,
    balances: 0,
    transactions: 0,
    complianceFlags: 0,
  };

  // 4. Create realistic balances for accounts
  console.log('💰 Creating account balances...');
  const balances = [
    { accountId: accounts[0].id, currency: 'USDC', available: 15000.50, total: 15500.50, pending_incoming: 500.00, pending_outgoing: 0, holds: 0 },
    { accountId: accounts[1].id, currency: 'USDC', available: 48250.75, total: 50000.00, pending_incoming: 0, pending_outgoing: 1749.25, holds: 0 },
    { accountId: accounts[2].id, currency: 'USDC', available: 8500.00, total: 8500.00, pending_incoming: 0, pending_outgoing: 0, holds: 0 },
    { accountId: accounts[3].id, currency: 'USDC', available: 125000.00, total: 130000.00, pending_incoming: 5000.00, pending_outgoing: 0, holds: 0 },
    { accountId: accounts[4].id, currency: 'USDC', available: 32500.00, total: 32500.00, pending_incoming: 0, pending_outgoing: 0, holds: 0 },
  ];

  for (const balance of balances) {
    const { error: balanceError } = await supabase.from('balances').upsert({
      account_id: balance.accountId,
      currency: balance.currency,
      available: balance.available,
      total: balance.total,
      pending_incoming: balance.pending_incoming,
      pending_outgoing: balance.pending_outgoing,
      holds: balance.holds,
      updated_at: new Date().toISOString(),
    });

    if (balanceError) {
      console.error(`  ❌ Error creating balance for ${balance.accountId}:`, balanceError);
    } else {
      summary.balances++;
    }
  }
  console.log(`  ✅ Created ${summary.balances} balances\n`);

  // 5. Create transfers
  console.log('💸 Creating transfers...');
  const now = new Date();
  const transfers = [
    // Completed transfers
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[0].id,
      to_account_id: accounts[2].id,
      amount: 500.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      description: 'Savings contribution',
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[3].id,
      to_account_id: accounts[0].id,
      amount: 2500.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      description: 'Payroll payment',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 120000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[1].id,
      to_account_id: accounts[3].id,
      amount: 15000.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      description: 'Business to Payroll funding',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 90000).toISOString(),
    },
    // Pending transfer
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[0].id,
      to_account_id: accounts[2].id,
      amount: 500.00,
      currency: 'USDC',
      status: 'pending',
      type: 'internal',
      description: 'Monthly savings',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    // Processing transfer
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[1].id,
      to_account_id: accounts[0].id,
      amount: 1749.25,
      currency: 'USDC',
      status: 'processing',
      type: 'internal',
      description: 'Vendor payment',
      created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    },
    // Failed transfer
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[4].id,
      to_account_id: accounts[1].id,
      amount: 50000.00,
      currency: 'USDC',
      status: 'failed',
      type: 'internal',
      description: 'Investment withdrawal (insufficient funds)',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      failed_at: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 5000).toISOString(),
      failure_reason: 'insufficient_funds',
    },
  ];

  for (const transfer of transfers) {
    const { error: transferError } = await supabase.from('transfers').insert(transfer);
    if (transferError) {
      console.error(`  ❌ Error creating transfer:`, transferError);
    } else {
      summary.transfers++;
    }
  }
  console.log(`  ✅ Created ${summary.transfers} transfers\n`);

  // 6. Create agents (for business accounts)
  console.log('🤖 Creating agents...');
  const businessAccounts = accounts.filter(a => a.type === 'business');
  const agents = [
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      name: 'Payroll Agent',
      parent_account_id: businessAccounts[0]?.id,
      type: 'payment',
      status: 'active',
      permissions: ['transfer:create', 'transfer:read'],
      daily_limit: 10000.00,
      monthly_limit: 100000.00,
      api_key_hash: crypto.createHash('sha256').update('test-key-1').digest('hex'),
      created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      name: 'Accounting Agent',
      parent_account_id: businessAccounts[0]?.id,
      type: 'readonly',
      status: 'active',
      permissions: ['account:read', 'transfer:read', 'balance:read'],
      daily_limit: 0,
      monthly_limit: 0,
      api_key_hash: crypto.createHash('sha256').update('test-key-2').digest('hex'),
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      name: 'Treasury Agent',
      parent_account_id: businessAccounts[1]?.id,
      type: 'payment',
      status: 'active',
      permissions: ['transfer:create', 'transfer:read', 'account:read'],
      daily_limit: 50000.00,
      monthly_limit: 500000.00,
      api_key_hash: crypto.createHash('sha256').update('test-key-3').digest('hex'),
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      name: 'Suspended Agent',
      parent_account_id: businessAccounts[0]?.id,
      type: 'payment',
      status: 'suspended',
      permissions: ['transfer:create'],
      daily_limit: 5000.00,
      monthly_limit: 50000.00,
      api_key_hash: crypto.createHash('sha256').update('test-key-4').digest('hex'),
      suspended_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      suspension_reason: 'Suspicious activity detected',
      created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const agent of agents) {
    const { error: agentError } = await supabase.from('agents').insert(agent);
    if (agentError) {
      console.error(`  ❌ Error creating agent:`, agentError);
    } else {
      summary.agents++;
    }
  }
  console.log(`  ✅ Created ${summary.agents} agents\n`);

  // 7. Create streams
  console.log('🌊 Creating streams...');
  const streams = [
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[3].id, // Payroll account
      to_account_id: accounts[0].id, // Personal checking
      amount_per_interval: 1000.00,
      currency: 'USDC',
      interval: 'weekly',
      status: 'active',
      start_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Weekly salary stream',
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[0].id, // Personal checking
      to_account_id: accounts[2].id, // Savings
      amount_per_interval: 500.00,
      currency: 'USDC',
      interval: 'monthly',
      status: 'active',
      start_date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Monthly savings stream',
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      from_account_id: accounts[1].id, // Business
      to_account_id: accounts[3].id, // Payroll
      amount_per_interval: 10000.00,
      currency: 'USDC',
      interval: 'monthly',
      status: 'paused',
      start_date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      paused_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Payroll funding stream (paused)',
      created_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const stream of streams) {
    const { error: streamError } = await supabase.from('streams').insert(stream);
    if (streamError) {
      console.error(`  ❌ Error creating stream:`, streamError);
    } else {
      summary.streams++;
    }
  }
  console.log(`  ✅ Created ${summary.streams} streams\n`);

  // 8. Create compliance flags
  console.log('🚩 Creating compliance flags...');
  const flags = [
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      account_id: accounts[1].id, // Business account
      flag_type: 'high_velocity',
      severity: 'medium',
      status: 'open',
      description: 'Unusual number of transactions in 24h period',
      details: { transaction_count: 45, threshold: 30, period: '24h' },
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      account_id: accounts[4].id, // Investment account
      flag_type: 'large_transaction',
      severity: 'low',
      status: 'resolved',
      description: 'Large single transaction detected',
      details: { amount: 50000, threshold: 25000, currency: 'USDC' },
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      resolution: 'Verified as legitimate investment activity',
    },
  ];

  for (const flag of flags) {
    const { error: flagError } = await supabase.from('compliance_flags').insert(flag);
    if (flagError) {
      console.error(`  ❌ Error creating compliance flag:`, flagError);
    } else {
      summary.complianceFlags++;
    }
  }
  console.log(`  ✅ Created ${summary.complianceFlags} compliance flags\n`);

  // 9. Create cards/payment methods
  console.log('💳 Creating payment methods...');
  const cards = [
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      account_id: accounts[0].id,
      card_type: 'virtual',
      last_four: '4242',
      brand: 'visa',
      status: 'active',
      exp_month: 12,
      exp_year: 2026,
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      account_id: accounts[1].id,
      card_type: 'physical',
      last_four: '8888',
      brand: 'mastercard',
      status: 'active',
      exp_month: 6,
      exp_year: 2027,
      created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      account_id: accounts[0].id,
      card_type: 'virtual',
      last_four: '1234',
      brand: 'visa',
      status: 'frozen',
      exp_month: 3,
      exp_year: 2026,
      frozen_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const card of cards) {
    const { error: cardError } = await supabase.from('cards').insert(card);
    if (cardError) {
      console.error(`  ❌ Error creating card:`, cardError);
    } else {
      summary.cards++;
    }
  }
  console.log(`  ✅ Created ${summary.cards} cards\n`);

  // Summary
  console.log('📊 Test Data Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Accounts:         ${summary.accounts}`);
  console.log(`✅ Balances:         ${summary.balances}`);
  console.log(`✅ Transfers:        ${summary.transfers}`);
  console.log(`   - Completed:      3`);
  console.log(`   - Pending:        1`);
  console.log(`   - Processing:     1`);
  console.log(`   - Failed:         1`);
  console.log(`✅ Agents:           ${summary.agents}`);
  console.log(`   - Active:         3`);
  console.log(`   - Suspended:      1`);
  console.log(`✅ Streams:          ${summary.streams}`);
  console.log(`   - Active:         2`);
  console.log(`   - Paused:         1`);
  console.log(`✅ Cards:            ${summary.cards}`);
  console.log(`   - Active:         2`);
  console.log(`   - Frozen:         1`);
  console.log(`✅ Compliance Flags: ${summary.complianceFlags}`);
  console.log(`   - Open:           1`);
  console.log(`   - Resolved:       1`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎉 Test data seeding complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Restart the API server to clear any caches');
  console.log('2. Run UI regression tests with updated test plan');
  console.log('3. Verify all data displays correctly in the dashboard\n');
}

main().catch(console.error);

