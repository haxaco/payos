#!/usr/bin/env tsx
/**
 * Comprehensive Test Data Seeding Script (Schema-Aware)
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

  const now = new Date();
  let transfersCreated = 0;
  let agentsCreated = 0;
  let streamsCreated = 0;
  let flagsCreated = 0;
  let cardsCreated = 0;

  // 4. Update account balances (accounts already have balance fields)
  console.log('💰 Updating account balances...');
  const balanceUpdates = [
    { id: accounts[0].id, balance_total: 15500.50, balance_available: 15000.50, balance_in_streams: 500.00 },
    { id: accounts[1].id, balance_total: 50000.00, balance_available: 48250.75, balance_in_streams: 1749.25 },
    { id: accounts[2].id, balance_total: 8500.00, balance_available: 8500.00, balance_in_streams: 0 },
    { id: accounts[3].id, balance_total: 130000.00, balance_available: 125000.00, balance_in_streams: 5000.00 },
    { id: accounts[4].id, balance_total: 32500.00, balance_available: 32500.00, balance_in_streams: 0 },
  ];

  for (const update of balanceUpdates) {
    await supabase
      .from('accounts')
      .update({
        balance_total: update.balance_total,
        balance_available: update.balance_available,
        balance_in_streams: update.balance_in_streams,
      })
      .eq('id', update.id);
  }
  console.log(`  ✅ Updated ${balanceUpdates.length} account balances\n`);

  // 5. Create transfers
  console.log('💸 Creating transfers...');
  const transfers = [
    // Completed transfers
    {
      tenant_id: tenantId,
      from_account_id: accounts[0].id,
      to_account_id: accounts[2].id,
      amount: 500.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      description: 'Savings contribution',
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
    },
    {
      tenant_id: tenantId,
      from_account_id: accounts[3].id,
      to_account_id: accounts[0].id,
      amount: 2500.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      description: 'Payroll payment',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 120000).toISOString(),
    },
    {
      tenant_id: tenantId,
      from_account_id: accounts[1].id,
      to_account_id: accounts[3].id,
      amount: 15000.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      description: 'Business to Payroll funding',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 90000).toISOString(),
    },
    // Pending transfer
    {
      tenant_id: tenantId,
      from_account_id: accounts[0].id,
      to_account_id: accounts[2].id,
      amount: 500.00,
      currency: 'USDC',
      status: 'pending',
      type: 'internal',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      description: 'Monthly savings',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    // Processing transfer
    {
      tenant_id: tenantId,
      from_account_id: accounts[1].id,
      to_account_id: accounts[0].id,
      amount: 1749.25,
      currency: 'USDC',
      status: 'processing',
      type: 'internal',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      description: 'Vendor payment',
      created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    },
    // Failed transfer
    {
      tenant_id: tenantId,
      from_account_id: accounts[4].id,
      to_account_id: accounts[1].id,
      amount: 50000.00,
      currency: 'USDC',
      status: 'failed',
      type: 'internal',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      description: 'Investment withdrawal (insufficient funds)',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      failed_at: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 5000).toISOString(),
      failure_reason: 'insufficient_funds',
    },
  ];

  for (const transfer of transfers) {
    const { error } = await supabase.from('transfers').insert(transfer);
    if (!error) transfersCreated++;
  }
  console.log(`  ✅ Created ${transfersCreated} transfers\n`);

  // 6. Create agents (for business accounts)
  console.log('🤖 Creating agents...');
  const businessAccounts = accounts.filter(a => a.type === 'business');
  
  if (businessAccounts.length > 0) {
    const agents = [
      {
        tenant_id: tenantId,
        name: 'Payroll Agent',
        parent_account_id: businessAccounts[0].id,
        type: 'payment',
        status: 'active',
        limit_daily: 10000.00,
        limit_monthly: 100000.00,
        auth_token_hash: crypto.createHash('sha256').update('test-key-1').digest('hex'),
        created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        tenant_id: tenantId,
        name: 'Accounting Agent',
        parent_account_id: businessAccounts[0].id,
        type: 'custom',
        status: 'active',
        limit_daily: 0,
        limit_monthly: 0,
        auth_token_hash: crypto.createHash('sha256').update('test-key-2').digest('hex'),
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    if (businessAccounts.length > 1) {
      agents.push({
        tenant_id: tenantId,
        name: 'Treasury Agent',
        parent_account_id: businessAccounts[1].id,
        type: 'treasury',
        status: 'active',
        limit_daily: 50000.00,
        limit_monthly: 500000.00,
        auth_token_hash: crypto.createHash('sha256').update('test-key-3').digest('hex'),
        created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    for (const agent of agents) {
      const { error } = await supabase.from('agents').insert(agent);
      if (!error) agentsCreated++;
    }
  }
  console.log(`  ✅ Created ${agentsCreated} agents\n`);

  // 7. Create streams
  console.log('🌊 Creating streams...');
  const streams = [
    {
      tenant_id: tenantId,
      sender_account_id: accounts[3].id,
      sender_account_name: accounts[3].name,
      receiver_account_id: accounts[0].id,
      receiver_account_name: accounts[0].name,
      flow_rate_per_second: 0.00001157407, // ~$1000/month
      flow_rate_per_month: 1000.00,
      currency: 'USDC',
      status: 'active',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      managed_by_type: 'user',
      managed_by_id: user.id,
      description: 'Weekly salary stream',
      category: 'salary',
      started_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      sender_account_id: accounts[0].id,
      sender_account_name: accounts[0].name,
      receiver_account_id: accounts[2].id,
      receiver_account_name: accounts[2].name,
      flow_rate_per_second: 0.00000578704, // ~$500/month
      flow_rate_per_month: 500.00,
      currency: 'USDC',
      status: 'active',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      managed_by_type: 'user',
      managed_by_id: user.id,
      description: 'Monthly savings stream',
      category: 'other',
      started_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      sender_account_id: accounts[1].id,
      sender_account_name: accounts[1].name,
      receiver_account_id: accounts[3].id,
      receiver_account_name: accounts[3].name,
      flow_rate_per_second: 0.00011574074, // ~$10000/month
      flow_rate_per_month: 10000.00,
      currency: 'USDC',
      status: 'paused',
      initiated_by_type: 'user',
      initiated_by_id: user.id,
      managed_by_type: 'user',
      managed_by_id: user.id,
      description: 'Payroll funding stream (paused)',
      category: 'other',
      started_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      paused_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const stream of streams) {
    const { error } = await supabase.from('streams').insert(stream);
    if (!error) streamsCreated++;
  }
  console.log(`  ✅ Created ${streamsCreated} streams\n`);

  // 8. Create compliance flags (diverse types and risk levels)
  console.log('🚩 Creating compliance flags...');
  const flags = [
    {
      tenant_id: tenantId,
      account_id: accounts[1].id,
      flag_type: 'account',
      risk_level: 'medium',
      status: 'open',
      reason_code: 'high_velocity',
      reasons: ['Unusual number of transactions in 24h period'],
      description: 'Unusual transaction velocity detected',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      transfer_id: null,
      flag_type: 'account',
      risk_level: 'low',
      status: 'resolved',
      reason_code: 'address_verification',
      reasons: ['Address verification required'],
      description: 'Routine address verification completed',
      resolution_action: 'approved',
      resolution_notes: 'Address verified successfully',
      resolved_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[1].id,
      transfer_id: transfers[0]?.id || null,
      flag_type: 'transaction',
      risk_level: 'high',
      status: 'under_investigation',
      reason_code: 'large_amount',
      reasons: ['Transaction amount exceeds typical pattern', 'First time recipient'],
      description: 'Large transaction to new recipient requires review',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[3].id,
      transfer_id: null,
      flag_type: 'pattern',
      risk_level: 'critical',
      status: 'pending_review',
      reason_code: 'suspected_fraud',
      reasons: ['Multiple failed login attempts', 'Transaction from unusual location', 'Rapid succession of transfers'],
      description: 'Potential fraudulent activity detected - immediate review required',
      created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    },
    {
      tenant_id: tenantId,
      account_id: accounts[2].id,
      transfer_id: null,
      flag_type: 'account',
      risk_level: 'low',
      status: 'dismissed',
      reason_code: 'dormant_account',
      reasons: ['No activity for 30 days'],
      description: 'Account flagged for dormancy',
      resolution_action: 'no_action',
      resolution_notes: 'User confirmed account is intentionally inactive',
      resolved_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[4].id,
      transfer_id: null,
      flag_type: 'pattern',
      risk_level: 'medium',
      status: 'escalated',
      reason_code: 'structuring',
      reasons: ['Multiple transactions just below reporting threshold', 'Pattern suggests structuring'],
      description: 'Potential structuring activity - escalated to compliance team',
      escalated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      transfer_id: transfers[1]?.id || null,
      flag_type: 'transaction',
      risk_level: 'high',
      status: 'open',
      reason_code: 'high_risk_country',
      reasons: ['Transfer to high-risk jurisdiction', 'Enhanced due diligence required'],
      description: 'Transaction involves high-risk country per FATF guidelines',
      created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    },
  ];

  for (const flag of flags) {
    const { error } = await supabase.from('compliance_flags').insert(flag);
    if (!error) flagsCreated++;
  }
  console.log(`  ✅ Created ${flagsCreated} compliance flags\n`);

  // 9. Create payment methods (cards)
  console.log('💳 Creating payment methods...');
  const cards = [
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      type: 'card',
      label: 'Virtual Card - Personal',
      card_last_four: '4242',
      is_verified: true,
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[1].id,
      type: 'card',
      label: 'Business Card',
      card_last_four: '8888',
      is_verified: true,
      created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      type: 'card',
      label: 'Frozen Card',
      card_last_four: '1234',
      is_verified: true,
      is_frozen: true,
      frozen_reason: 'user_requested',
      frozen_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const card of cards) {
    const { error } = await supabase.from('payment_methods').insert(card);
    if (!error) cardsCreated++;
  }
  console.log(`  ✅ Created ${cardsCreated} payment methods\n`);

  // Summary
  console.log('📊 Test Data Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Accounts:         ${accounts.length} (with updated balances)`);
  console.log(`✅ Transfers:        ${transfersCreated}`);
  console.log(`   - Completed:      3`);
  console.log(`   - Pending:        1`);
  console.log(`   - Processing:     1`);
  console.log(`   - Failed:         1`);
  console.log(`✅ Agents:           ${agentsCreated}`);
  console.log(`✅ Streams:          ${streamsCreated}`);
  console.log(`   - Active:         2`);
  console.log(`   - Paused:         1`);
  console.log(`✅ Payment Methods:  ${cardsCreated}`);
  console.log(`   - Active:         2`);
  console.log(`   - Frozen:         1`);
  console.log(`✅ Compliance Flags: ${flagsCreated}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎉 Test data seeding complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Restart the API server to clear any caches');
  console.log('2. Run UI regression tests with updated test plan');
  console.log('3. Verify all data displays correctly in the dashboard\n');
}

main().catch(console.error);

