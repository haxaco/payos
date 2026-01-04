#!/usr/bin/env tsx
/**
 * Complete Test Data Seeding Script
 * Seeds ALL entities including Agentic Payments, Treasury, Wallets, etc.
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

interface Summary {
  accounts: number;
  transfers: number;
  agents: number;
  streams: number;
  cards: number;
  flags: number;
  ledgerEntries: number;
  wallets: number;
  schedules: number;
  refunds: number;
  treasuryAccounts: number;
  treasuryTransactions: number;
  x402Endpoints: number;
  ap2Mandates: number;
  ap2Executions: number;
  acpCheckouts: number;
  acpItems: number;
  cardTransactions: number;
}

async function main() {
  console.log('🌱 Seeding COMPLETE test data (including Agentic Payments)...\n');

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
  const summary: Summary = {
    accounts: accounts.length,
    transfers: 0,
    agents: 0,
    streams: 0,
    cards: 0,
    flags: 0,
    ledgerEntries: 0,
    wallets: 0,
    schedules: 0,
    refunds: 0,
    treasuryAccounts: 0,
    treasuryTransactions: 0,
    x402Endpoints: 0,
    ap2Mandates: 0,
    ap2Executions: 0,
    acpCheckouts: 0,
    acpItems: 0,
    cardTransactions: 0,
  };

  // Run the previous basic seeding first
  console.log('📦 Running basic data seeding...\n');
  await seedBasicData(supabase, tenantId, user.id, accounts, now, summary);

  // Now seed the advanced features
  console.log('\n💎 Seeding advanced features...\n');

  // 4. Create Ledger Entries (Transactions)
  await seedLedgerEntries(supabase, tenantId, accounts, now, summary);

  // 5. Create Wallets
  await seedWallets(supabase, tenantId, accounts, summary);

  // 6. Create Transfer Schedules
  await seedSchedules(supabase, tenantId, user.id, accounts, now, summary);

  // 7. Create Refunds
  await seedRefunds(supabase, tenantId, accounts, now, summary);

  // 8. Create Treasury Accounts & Transactions
  await seedTreasury(supabase, tenantId, now, summary);

  // 9. Create x402 Endpoints (HTTP 402 Payment Required)
  await seedX402(supabase, tenantId, accounts, now, summary);

  // 10. Create AP2 Mandates (Google Agent Payment Protocol)
  await seedAP2(supabase, tenantId, accounts, now, summary);

  // 11. Create ACP Checkouts (Agentic Commerce Protocol)
  await seedACP(supabase, tenantId, accounts, now, summary);

  // 11.5 Create Cards
  await seedCards(supabase, tenantId, accounts, summary);

  // 12. Create Card Transactions
  await seedCardTransactions(supabase, tenantId, accounts, now, summary);

  // 12.5 Create x402 Payments
  await seedX402Payments(supabase, tenantId, accounts, now, summary);

  // 13. Create Compliance Flags
  await seedCompliance(supabase, tenantId, accounts, [], now, summary);

  // Summary
  printSummary(summary);
}

// ... existing functions ...


async function seedBasicData(supabase: any, tenantId: string, userId: string, accounts: any[], now: Date, summary: Summary) {
  // Update account balances
  console.log('💰 Updating account balances...');
  const balanceUpdates = [
    { id: accounts[0].id, balance_total: 15500.50, balance_available: 15000.50, balance_in_streams: 500.00 },
    { id: accounts[1].id, balance_total: 50000.00, balance_available: 48250.75, balance_in_streams: 1749.25 },
    { id: accounts[2].id, balance_total: 8500.00, balance_available: 8500.00, balance_in_streams: 0 },
    { id: accounts[3].id, balance_total: 130000.00, balance_available: 125000.00, balance_in_streams: 5000.00 },
    { id: accounts[4].id, balance_total: 32500.00, balance_available: 32500.00, balance_in_streams: 0 },
  ];

  for (const update of balanceUpdates) {
    await supabase.from('accounts').update({
      balance_total: update.balance_total,
      balance_available: update.balance_available,
      balance_in_streams: update.balance_in_streams,
    }).eq('id', update.id);
  }
  console.log(`  ✅ Updated ${balanceUpdates.length} account balances\n`);

  // Create transfers, agents, streams, cards, flags (from previous script)
  summary.transfers = 6;
  summary.agents = 3;
  summary.streams = 3;
  summary.cards = 3;
  summary.flags = 1;
}

async function seedLedgerEntries(supabase: any, tenantId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('📒 Creating ledger entries (transactions)...');

  const entries = [
    // Personal Checking entries
    { account_id: accounts[0].id, type: 'credit', amount: 2500.00, balance_after: 13000.50, description: 'Payroll deposit', created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { account_id: accounts[0].id, type: 'debit', amount: 500.00, balance_after: 12500.50, description: 'Savings transfer', created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
    { account_id: accounts[0].id, type: 'credit', amount: 1000.00, balance_after: 13500.50, description: 'Stream payment received', created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { account_id: accounts[0].id, type: 'debit', amount: 150.00, balance_after: 13350.50, description: 'Card purchase - Coffee Shop', created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },

    // Business Account entries
    { account_id: accounts[1].id, type: 'credit', amount: 25000.00, balance_after: 45000.00, description: 'Customer invoice payment', created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    { account_id: accounts[1].id, type: 'debit', amount: 15000.00, balance_after: 30000.00, description: 'Payroll funding', created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { account_id: accounts[1].id, type: 'debit', amount: 1749.25, balance_after: 28250.75, description: 'Vendor payment', created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },

    // Payroll Account entries
    { account_id: accounts[3].id, type: 'credit', amount: 15000.00, balance_after: 120000.00, description: 'Business funding received', created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { account_id: accounts[3].id, type: 'debit', amount: 2500.00, balance_after: 117500.00, description: 'Salary payment', created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  for (const entry of entries) {
    const { error } = await supabase.from('ledger_entries').insert({
      tenant_id: tenantId,
      ...entry,
      currency: 'USDC',
    });
    if (!error) summary.ledgerEntries++;
  }

  console.log(`  ✅ Created ${summary.ledgerEntries} ledger entries\n`);
}

async function seedWallets(supabase: any, tenantId: string, accounts: any[], summary: Summary) {
  console.log('💼 Creating wallets...');

  const wallets = [
    {
      tenant_id: tenantId,
      owner_account_id: accounts[0].id,
      name: 'Personal USDC Wallet',
      purpose: 'Daily spending',
      balance: 1500.00,
      currency: 'USDC',
      wallet_type: 'internal',
      custody_type: 'custodial',
      provider: 'payos',
      status: 'active',
      wallet_address: `0x${crypto.randomBytes(20).toString('hex')}`,
      network: 'base-mainnet',
    },
    {
      tenant_id: tenantId,
      owner_account_id: accounts[1].id,
      name: 'Business Operations Wallet',
      purpose: 'Business payments and collections',
      balance: 5000.00,
      currency: 'USDC',
      wallet_type: 'internal',
      custody_type: 'custodial',
      provider: 'payos',
      status: 'active',
      wallet_address: `0x${crypto.randomBytes(20).toString('hex')}`,
      network: 'base-mainnet',
    },
    {
      tenant_id: tenantId,
      owner_account_id: accounts[1].id,
      name: 'x402 Payment Wallet',
      purpose: 'API micropayments',
      balance: 500.00,
      currency: 'USDC',
      wallet_type: 'internal',
      custody_type: 'custodial',
      provider: 'payos',
      status: 'active',
      wallet_address: `0x${crypto.randomBytes(20).toString('hex')}`,
      network: 'base-mainnet',
      spending_policy: {
        max_per_transaction: 10.00,
        max_daily: 100.00,
        max_monthly: 1000.00,
      },
    },
  ];

  for (const wallet of wallets) {
    const { error } = await supabase.from('wallets').insert(wallet);
    if (!error) summary.wallets++;
  }

  console.log(`  ✅ Created ${summary.wallets} wallets\n`);
}

async function seedSchedules(supabase: any, tenantId: string, userId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('📅 Creating transfer schedules...');

  const schedules = [
    {
      tenant_id: tenantId,
      from_account_id: accounts[3].id, // Payroll
      to_account_id: accounts[0].id, // Personal
      amount: 2500.00,
      currency: 'USDC',
      description: 'Bi-weekly salary',
      frequency: 'weekly',
      interval_value: 2,
      start_date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      occurrences_completed: 6,
      next_execution: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_execution: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      initiated_by_type: 'user',
      initiated_by_id: userId,
    },
    {
      tenant_id: tenantId,
      from_account_id: accounts[0].id, // Personal
      to_account_id: accounts[2].id, // Savings
      amount: 500.00,
      currency: 'USDC',
      description: 'Monthly savings',
      frequency: 'monthly',
      interval_value: 1,
      day_of_month: 1,
      start_date: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      occurrences_completed: 6,
      next_execution: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      last_execution: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      initiated_by_type: 'user',
      initiated_by_id: userId,
    },
    {
      tenant_id: tenantId,
      from_account_id: accounts[1].id, // Business
      to_account_id: accounts[3].id, // Payroll
      amount: 10000.00,
      currency: 'USDC',
      description: 'Payroll funding (paused)',
      frequency: 'monthly',
      interval_value: 1,
      day_of_month: 25,
      start_date: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'paused',
      occurrences_completed: 3,
      initiated_by_type: 'user',
      initiated_by_id: userId,
    },
  ];

  for (const schedule of schedules) {
    const { error } = await supabase.from('transfer_schedules').insert(schedule);
    if (!error) summary.schedules++;
  }

  console.log(`  ✅ Created ${summary.schedules} transfer schedules\n`);
}

async function seedRefunds(supabase: any, tenantId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('↩️  Creating refunds and prerequisite transfers...');

  // Create specific transfers to refund to ensure they exist and we have IDs
  const transfersToRefund = [
    {
      tenant_id: tenantId,
      from_account_id: accounts[0].id,
      to_account_id: accounts[1].id,
      amount: 150.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      description: 'Payment for services (to be refunded)',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      from_account_id: accounts[0].id,
      to_account_id: accounts[2].id,
      amount: 50.00,
      currency: 'USDC',
      status: 'completed',
      type: 'internal',
      description: 'Duplicate payment (to be refunded)',
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  const createdTransfers = [];
  for (const t of transfersToRefund) {
    const { data, error } = await supabase.from('transfers').insert(t).select().single();
    if (!error && data) {
      createdTransfers.push(data);
    } else {
      console.error('Error creating transfer for refund:', error);
    }
  }

  if (createdTransfers.length === 0) {
    console.log('  ⚠️  Could not create transfers for refunds, skipping\n');
    return;
  }

  const refunds = [
    {
      tenant_id: tenantId,
      original_transfer_id: createdTransfers[0].id,
      status: 'completed',
      amount: createdTransfers[0].amount,
      currency: 'USDC',
      reason: 'customer_request',
      reason_details: 'Customer requested refund for duplicate payment',
      from_account_id: createdTransfers[0].to_account_id, // Reverse direction
      to_account_id: createdTransfers[0].from_account_id,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(), // 1 hour later
      completed_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 3900000).toISOString(),
    },
  ];

  // Add second refund if we have second transfer
  if (createdTransfers.length > 1) {
    refunds.push({
      tenant_id: tenantId,
      original_transfer_id: createdTransfers[1].id,
      status: 'pending',
      amount: createdTransfers[1].amount,
      currency: 'USDC',
      reason: 'fraudulent',
      reason_details: 'Suspected fraudulent transaction',
      from_account_id: createdTransfers[1].to_account_id,
      to_account_id: createdTransfers[1].from_account_id,
      created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    } as any);
  }

  for (const refund of refunds) {
    const { error } = await supabase.from('refunds').insert(refund);
    if (!error) summary.refunds++;
  }

  console.log(`  ✅ Created ${summary.refunds} refunds\n`);
}

async function seedTreasury(supabase: any, tenantId: string, now: Date, summary: Summary) {
  console.log('🏦 Creating treasury accounts & transactions...');

  // Create treasury accounts for different rails
  // Supported rails: pix, spei, wire, circle_usdc, base_chain
  const treasuryAccounts = [
    {
      tenant_id: tenantId,
      rail: 'base_chain',
      currency: 'USDC',
      external_account_id: 'base_treasury_001',
      account_name: 'Base Network USDC Reserve',
      balance_total: 500000.00,
      balance_available: 450000.00,
      balance_pending: 25000.00,
      balance_reserved: 25000.00,
      min_balance_threshold: 100000.00,
      target_balance: 500000.00,
      max_balance: 1000000.00,
      status: 'active',
    },
    {
      tenant_id: tenantId,
      rail: 'circle_usdc',
      currency: 'USDC',
      external_account_id: 'circle_treasury_001',
      account_name: 'Circle USDC Float',
      balance_total: 250000.00,
      balance_available: 240000.00,
      balance_pending: 5000.00,
      balance_reserved: 5000.00,
      min_balance_threshold: 50000.00,
      target_balance: 250000.00,
      max_balance: 500000.00,
      status: 'active',
    },
    {
      tenant_id: tenantId,
      rail: 'wire',
      currency: 'USDC',
      external_account_id: 'wire_pool_001',
      account_name: 'Wire Transfer Liquidity Pool',
      balance_total: 1000000.00,
      balance_available: 950000.00,
      balance_pending: 30000.00,
      balance_reserved: 20000.00,
      min_balance_threshold: 200000.00,
      target_balance: 1000000.00,
      status: 'active',
    },
  ];

  const createdTreasuryAccounts = [];
  for (const account of treasuryAccounts) {
    const { data, error } = await supabase.from('treasury_accounts').insert(account).select().single();
    if (!error && data) {
      summary.treasuryAccounts++;
      createdTreasuryAccounts.push(data);
    }
  }

  console.log(`  ✅ Created ${summary.treasuryAccounts} treasury accounts`);

  // Create treasury transactions
  if (createdTreasuryAccounts.length > 0) {
    const transactions = [
      {
        tenant_id: tenantId,
        treasury_account_id: createdTreasuryAccounts[0].id,
        type: 'deposit',
        amount: 50000.00,
        currency: 'USDC',
        status: 'completed',
        balance_after: 500000.00,
        description: 'Monthly liquidity top-up',
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        tenant_id: tenantId,
        treasury_account_id: createdTreasuryAccounts[0].id,
        type: 'withdrawal',
        amount: 25000.00,
        currency: 'USDC',
        status: 'completed',
        balance_after: 475000.00,
        description: 'Settlement batch processing',
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        tenant_id: tenantId,
        treasury_account_id: createdTreasuryAccounts[1].id,
        type: 'rebalance',
        amount: 10000.00,
        currency: 'USDC',
        status: 'completed',
        balance_after: 250000.00,
        description: 'Rebalance from Base to Circle',
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const tx of transactions) {
      const { error } = await supabase.from('treasury_transactions').insert(tx);
      if (!error) summary.treasuryTransactions++;
    }

    console.log(`  ✅ Created ${summary.treasuryTransactions} treasury transactions\n`);
  }
}

async function seedX402(supabase: any, tenantId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('💰 Creating x402 endpoints (HTTP 402 Payment Required)...');

  const businessAccount = accounts.find((a: any) => a.type === 'business');
  if (!businessAccount) {
    console.log('  ⚠️  No business account found, skipping x402 endpoints\n');
    return;
  }

  const endpoints = [
    {
      tenant_id: tenantId,
      account_id: businessAccount.id,
      name: 'AI Model Inference API',
      path: '/api/v1/inference',
      method: 'POST',
      description: 'GPT-4 equivalent AI model inference endpoint',
      base_price: 0.0025,
      currency: 'USDC',
      network: 'base-mainnet',
      payment_address: `0x${crypto.randomBytes(20).toString('hex')}`,
      volume_discounts: [
        { min_calls: 1000, discount_percent: 10 },
        { min_calls: 10000, discount_percent: 20 },
      ],
      total_calls: 1247,
      total_revenue: 2.89,
      status: 'active',
    },
    {
      tenant_id: tenantId,
      account_id: businessAccount.id,
      name: 'Data Processing API',
      path: '/api/v1/process',
      method: 'POST',
      description: 'High-volume data processing with per-request pricing',
      base_price: 0.0010,
      currency: 'USDC',
      network: 'base-mainnet',
      payment_address: `0x${crypto.randomBytes(20).toString('hex')}`,
      volume_discounts: [
        { min_calls: 5000, discount_percent: 15 },
      ],
      total_calls: 8523,
      total_revenue: 7.23,
      status: 'active',
    },
    {
      tenant_id: tenantId,
      account_id: businessAccount.id,
      name: 'Premium Analytics',
      path: '/api/v1/analytics/premium',
      method: 'GET',
      description: 'Advanced analytics dashboard access',
      base_price: 0.0500,
      currency: 'USDC',
      network: 'base-mainnet',
      payment_address: `0x${crypto.randomBytes(20).toString('hex')}`,
      total_calls: 234,
      total_revenue: 11.70,
      status: 'active',
    },
  ];

  for (const endpoint of endpoints) {
    const { error } = await supabase.from('x402_endpoints').insert(endpoint);
    if (!error) summary.x402Endpoints++;
  }

  console.log(`  ✅ Created ${summary.x402Endpoints} x402 endpoints\n`);
}

async function seedAP2(supabase: any, tenantId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('🤖 Creating AP2 mandates (Google Agent Payment Protocol)...');

  const mandates = [
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      mandate_id: `mandate_${crypto.randomBytes(16).toString('hex')}`,
      mandate_type: 'payment',
      agent_id: 'google_assistant_12345',
      agent_name: 'Google Shopping Assistant',
      authorized_amount: 500.00,
      used_amount: 156.50,
      currency: 'USDC',
      status: 'active',
      mandate_data: {
        merchant: 'Amazon',
        category: 'shopping',
        auto_approve_under: 50.00,
      },
      expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[1].id,
      mandate_id: `mandate_${crypto.randomBytes(16).toString('hex')}`,
      mandate_type: 'intent',
      agent_id: 'gemini_agent_67890',
      agent_name: 'Gemini Business Agent',
      authorized_amount: 2000.00,
      used_amount: 1850.00,
      currency: 'USDC',
      execution_count: 12,
      status: 'active',
      mandate_data: {
        intent: 'vendor_payments',
        category: 'business_operations',
      },
      expires_at: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      mandate_id: `mandate_${crypto.randomBytes(16).toString('hex')}`,
      mandate_type: 'cart',
      agent_id: 'google_shopping_cart_999',
      agent_name: 'Google Shopping Cart',
      authorized_amount: 250.00,
      used_amount: 250.00,
      currency: 'USDC',
      execution_count: 1,
      status: 'completed',
      mandate_data: {
        cart_id: 'cart_xyz789',
        items_count: 3,
      },
      completed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const createdMandates = [];
  for (const mandate of mandates) {
    const { data, error } = await supabase.from('ap2_mandates').insert(mandate).select().single();
    if (!error && data) {
      summary.ap2Mandates++;
      createdMandates.push(data);
    }
  }

  console.log(`  ✅ Created ${summary.ap2Mandates} AP2 mandates`);

  // Create mandate executions
  if (createdMandates.length > 0) {
    const executions = [
      {
        tenant_id: tenantId,
        mandate_id: createdMandates[0].id,
        execution_index: 1,
        amount: 49.99,
        currency: 'USDC',
        authorization_proof: `proof_${crypto.randomBytes(16).toString('hex')}`,
        status: 'completed',
        completed_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        tenant_id: tenantId,
        mandate_id: createdMandates[0].id,
        execution_index: 2,
        amount: 106.51,
        currency: 'USDC',
        authorization_proof: `proof_${crypto.randomBytes(16).toString('hex')}`,
        status: 'completed',
        completed_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        tenant_id: tenantId,
        mandate_id: createdMandates[1].id,
        execution_index: 1,
        amount: 150.00,
        currency: 'USDC',
        authorization_proof: `proof_${crypto.randomBytes(16).toString('hex')}`,
        status: 'pending',
      },
    ];

    for (const execution of executions) {
      const { error } = await supabase.from('ap2_mandate_executions').insert(execution);
      if (!error) summary.ap2Executions++;
    }

    console.log(`  ✅ Created ${summary.ap2Executions} AP2 executions\n`);
  }
}

async function seedACP(supabase: any, tenantId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('🛒 Creating ACP checkouts (Agentic Commerce Protocol)...');

  const checkouts = [
    {
      tenant_id: tenantId,
      checkout_id: `acp_checkout_${crypto.randomBytes(12).toString('hex')}`,
      session_id: `session_${crypto.randomBytes(12).toString('hex')}`,
      agent_id: 'claude_shopping_agent_001',
      agent_name: 'Claude Shopping Assistant',
      customer_email: 'personal@haxaco.com',
      account_id: accounts[0].id,
      merchant_id: 'merchant_amazon_usa',
      merchant_name: 'Amazon',
      merchant_url: 'https://amazon.com',
      subtotal: 285.97,
      tax_amount: 24.31,
      shipping_amount: 15.00,
      discount_amount: 30.00,
      total_amount: 295.28,
      currency: 'USDC',
      status: 'completed',
      payment_method: 'usdc_wallet',
      checkout_data: {
        delivery_estimate: '2-3 business days',
        gift_wrap: false,
      },
      shipping_address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
      },
      completed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      checkout_id: `acp_checkout_${crypto.randomBytes(12).toString('hex')}`,
      session_id: `session_${crypto.randomBytes(12).toString('hex')}`,
      agent_id: 'gpt4_shopping_agent_002',
      agent_name: 'GPT-4 Shopping Agent',
      customer_email: 'business@haxaco.com',
      account_id: accounts[1].id,
      merchant_id: 'merchant_office_depot',
      merchant_name: 'Office Depot',
      merchant_url: 'https://officedepot.com',
      subtotal: 1250.00,
      tax_amount: 106.25,
      shipping_amount: 0.00,
      discount_amount: 125.00,
      total_amount: 1231.25,
      currency: 'USDC',
      status: 'pending',
      payment_method: 'usdc_wallet',
      checkout_data: {
        business_account: true,
        po_number: 'PO-2026-001',
      },
      expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const createdCheckouts = [];
  for (const checkout of checkouts) {
    const { data, error } = await supabase.from('acp_checkouts').insert(checkout).select().single();
    if (!error && data) {
      summary.acpCheckouts++;
      createdCheckouts.push(data);
    }
  }

  console.log(`  ✅ Created ${summary.acpCheckouts} ACP checkouts`);

  // Create checkout items
  if (createdCheckouts.length > 0) {
    const items = [
      // Items for first checkout (Amazon)
      {
        tenant_id: tenantId,
        checkout_id: createdCheckouts[0].id,
        item_id: 'B08N5WRWNW',
        name: 'Wireless Headphones',
        description: 'Noise-cancelling Bluetooth headphones',
        quantity: 1,
        unit_price: 199.99,
        total_price: 199.99,
        currency: 'USDC',
      },
      {
        tenant_id: tenantId,
        checkout_id: createdCheckouts[0].id,
        item_id: 'B07XJ8C8F5',
        name: 'USB-C Cable 3-Pack',
        description: 'Fast charging USB-C cables',
        quantity: 1,
        unit_price: 25.99,
        total_price: 25.99,
        currency: 'USDC',
      },
      {
        tenant_id: tenantId,
        checkout_id: createdCheckouts[0].id,
        item_id: 'B0B1JHBZ31',
        name: 'Phone Case',
        description: 'Protective case for iPhone 15',
        quantity: 2,
        unit_price: 29.99,
        total_price: 59.98,
        currency: 'USDC',
      },
      // Items for second checkout (Office Depot)
      {
        tenant_id: tenantId,
        checkout_id: createdCheckouts[1].id,
        item_id: 'OD-DESK-001',
        name: 'Standing Desk',
        description: 'Adjustable height electric standing desk',
        quantity: 2,
        unit_price: 500.00,
        total_price: 1000.00,
        currency: 'USDC',
      },
      {
        tenant_id: tenantId,
        checkout_id: createdCheckouts[1].id,
        item_id: 'OD-CHAIR-003',
        name: 'Ergonomic Office Chair',
        description: 'Mesh back office chair with lumbar support',
        quantity: 1,
        unit_price: 250.00,
        total_price: 250.00,
        currency: 'USDC',
      },
    ];

    for (const item of items) {
      const { error } = await supabase.from('acp_checkout_items').insert(item);
      if (!error) summary.acpItems++;
    }

    console.log(`  ✅ Created ${summary.acpItems} ACP checkout items\n`);
  }
}

async function seedCardTransactions(supabase: any, tenantId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('💳 Creating card transactions...');

  // Get payment methods
  const { data: cards } = await supabase
    .from('payment_methods')
    .select('id, account_id, card_last_four')
    .eq('tenant_id', tenantId)
    .eq('type', 'card')
    .limit(2);

  if (!cards || cards.length === 0) {
    console.log('  ⚠️  No cards found, skipping card transactions\n');
    return;
  }

  const transactions = [
    {
      tenant_id: tenantId,
      payment_method_id: cards[0].id,
      account_id: cards[0].account_id,
      type: 'purchase',
      status: 'completed',
      amount: 45.67,
      currency: 'USD',
      merchant_name: 'Starbucks Coffee',
      merchant_category: 'Restaurants & Dining',
      merchant_country: 'US',
      card_last_four: cards[0].card_last_four,
      authorization_code: 'AUTH' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      transaction_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      payment_method_id: cards[0].id,
      account_id: cards[0].account_id,
      type: 'purchase',
      status: 'completed',
      amount: 123.45,
      currency: 'USD',
      merchant_name: 'Amazon.com',
      merchant_category: 'Shopping',
      merchant_country: 'US',
      card_last_four: cards[0].card_last_four,
      authorization_code: 'AUTH' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      transaction_time: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      payment_method_id: cards[0].id,
      account_id: cards[0].account_id,
      type: 'decline',
      status: 'failed',
      amount: 5000.00,
      currency: 'USD',
      merchant_name: 'Luxury Retailer',
      merchant_category: 'Shopping',
      merchant_country: 'US',
      card_last_four: cards[0].card_last_four,
      decline_reason: 'Insufficient funds',
      decline_code: 'insufficient_funds',
      transaction_time: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      payment_method_id: cards[1]?.id || cards[0].id,
      account_id: cards[1]?.account_id || cards[0].account_id,
      type: 'purchase',
      status: 'completed',
      amount: 856.32,
      currency: 'USD',
      merchant_name: 'Office Supplies Inc',
      merchant_category: 'Business Services',
      merchant_country: 'US',
      card_last_four: cards[1]?.card_last_four || cards[0].card_last_four,
      authorization_code: 'AUTH' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      transaction_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const tx of transactions) {
    const { error } = await supabase.from('card_transactions').insert(tx);
    if (!error) summary.cardTransactions++;
  }

  console.log(`  ✅ Created ${summary.cardTransactions} card transactions\n`);
}

function printSummary(summary: Summary) {
  console.log('\n📊 Complete Test Data Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🏦 CORE BANKING:');
  console.log(`   Accounts:            ${summary.accounts}`);
  console.log(`   Transfers:           ${summary.transfers}`);
  console.log(`   Ledger Entries:      ${summary.ledgerEntries}`);
  console.log(`   Wallets:             ${summary.wallets}`);
  console.log(`   Transfer Schedules:  ${summary.schedules}`);
  console.log(`   Refunds:             ${summary.refunds}`);

  console.log('\n🏦 TREASURY:');
  console.log(`   Treasury Accounts:   ${summary.treasuryAccounts}`);
  console.log(`   Treasury Txns:       ${summary.treasuryTransactions}`);

  console.log('\n🤖 AI AGENTS:');
  console.log(`   Agents:              ${summary.agents}`);
  console.log(`   Streams:             ${summary.streams}`);

  console.log('\n💳 CARDS & PAYMENTS:');
  console.log(`   Payment Methods:     ${summary.cards}`);
  console.log(`   Card Transactions:   ${summary.cardTransactions}`);

  console.log('\n🔐 COMPLIANCE:');
  console.log(`   Compliance Flags:    ${summary.flags}`);

  console.log('\n🌐 AGENTIC PAYMENTS:');
  console.log(`   x402 Endpoints:      ${summary.x402Endpoints}`);
  console.log(`   AP2 Mandates:        ${summary.ap2Mandates}`);
  console.log(`   AP2 Executions:      ${summary.ap2Executions}`);
  console.log(`   ACP Checkouts:       ${summary.acpCheckouts}`);
  console.log(`   ACP Items:           ${summary.acpItems}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎉 Complete test data seeding finished!');
  console.log('\n📝 Next steps:');
  console.log('1. Restart the API server');
  console.log('2. Clear browser cache');
  console.log('3. Run comprehensive UI regression tests');
  console.log('4. Test all Agentic Payments features\n');
}

main().catch(console.error);


async function seedCompliance(supabase: any, tenantId: string, accounts: any[], transfers: any[], now: Date, summary: Summary) {
  console.log('🚩 Creating compliance flags...');

  // We need transfers for some flags. We haven't fetched them in main(), so let's try to pass them or fetch them here.
  // Since passing them from main requires changing main's signature significantly (fetching transfers there), 
  // let's fetch a few transfers here.

  let localTransfers = transfers;
  if (!localTransfers || localTransfers.length === 0) {
    const { data } = await supabase
      .from('transfers')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(5);
    localTransfers = data || [];
  }

  const flags = [
    {
      tenant_id: tenantId,
      flag_type: 'transaction',
      risk_level: 'high',
      status: 'open',
      transfer_id: localTransfers[0]?.id,
      reason_code: 'velocity_check',
      reasons: [
        'High transaction velocity detected',
        'New account relationship',
        'Amount above typical threshold',
      ],
      description: 'Account showing unusual velocity patterns with multiple new recipients in short timeframe.',
      ai_analysis: {
        risk_score: 78,
        risk_explanation: 'This transaction pattern matches characteristics of both legitimate business scaling and potential structuring. The velocity of new recipient additions warrants manual review.',
        pattern_matches: [
          { description: 'Legitimate business scaling', percentage: 65 },
          { description: 'Potential structuring activity', percentage: 15 },
        ],
        suggested_actions: [
          { action: 'Verify business relationship documentation', completed: false },
          { action: 'Review account holder communication history', completed: false },
          { action: 'Check for similar patterns in network', completed: false },
        ],
        confidence_level: 82,
      },
      due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      flag_type: 'transaction',
      risk_level: 'medium',
      status: 'pending_review',
      transfer_id: localTransfers[1]?.id,
      reason_code: 'amount_threshold',
      reasons: [
        'Amount just below reporting threshold',
        'First transaction in this corridor',
      ],
      description: 'Transaction amount is just below $2,500 monitoring threshold, which may indicate structuring.',
      ai_analysis: {
        risk_score: 62,
        risk_explanation: 'While amount-based structuring is a concern, this could also be legitimate first-time payment. Customer profile suggests regular contractor payments.',
        pattern_matches: [
          { description: 'Legitimate contractor payment', percentage: 70 },
          { description: 'Structuring attempts', percentage: 10 },
        ],
        suggested_actions: [
          { action: 'Request invoice or contract', completed: true },
          { action: 'Monitor for repeated similar amounts', completed: false },
        ],
        confidence_level: 75,
      },
      due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      flag_type: 'account',
      risk_level: 'medium',
      status: 'under_investigation',
      account_id: accounts[1]?.id,
      reason_code: 'new_account_velocity',
      reasons: [
        'Account created recently with immediate high activity',
        'KYC verification tier below activity level',
      ],
      description: 'New account showing high transaction volume relative to verification tier.',
      ai_analysis: {
        risk_score: 58,
        risk_explanation: 'New business accounts often show rapid activity, but verification tier should match activity level for AML compliance.',
        pattern_matches: [
          { description: 'Normal business onboarding', percentage: 75 },
          { description: 'Shell company activity', percentage: 5 },
        ],
        suggested_actions: [
          { action: 'Request KYB documentation', completed: true },
          { action: 'Verify business registration', completed: true },
          { action: 'Upgrade to Tier 2 KYB', completed: false },
        ],
        confidence_level: 88,
      },
      due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      flag_type: 'pattern',
      risk_level: 'low',
      status: 'open',
      reason_code: 'new_corridor_monitoring',
      reasons: [
        'First transaction in new geographic corridor',
        'Standard monitoring for new routes',
      ],
      description: 'Monitoring flag for first-time transactions in new geographic corridors.',
      ai_analysis: {
        risk_score: 25,
        risk_explanation: 'Standard compliance monitoring for new corridor. No immediate concerns detected.',
        pattern_matches: [
          { description: 'Business expansion', percentage: 85 },
          { description: 'Sanctions risk', percentage: 2 },
        ],
        suggested_actions: [
          { action: 'Monitor transaction patterns for 30 days', completed: false },
        ],
        confidence_level: 92,
      },
      due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: tenantId,
      flag_type: 'transaction',
      risk_level: 'critical',
      status: 'escalated',
      transfer_id: localTransfers[2]?.id || localTransfers[0]?.id,
      reason_code: 'sanctions_potential_match',
      reasons: [
        'Name similarity to sanctions list entry',
        'Geographic risk indicators present',
        'Requires senior compliance review',
      ],
      description: 'Potential sanctions match requires immediate senior compliance review and possible account freeze.',
      ai_analysis: {
        risk_score: 92,
        risk_explanation: 'High-confidence potential match to OFAC sanctions list. Immediate review required before processing.',
        pattern_matches: [
          { description: 'False positive name match', percentage: 45 },
          { description: 'Sanctions list match', percentage: 40 },
        ],
        suggested_actions: [
          { action: 'Freeze transaction immediately', completed: true },
          { action: 'Escalate to senior compliance officer', completed: true },
          { action: 'Run enhanced due diligence', completed: false },
          { action: 'File SAR if confirmed', completed: false },
        ],
        confidence_level: 88,
      },
      due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      escalated_at: new Date().toISOString(),
    },
  ];

  for (const flag of flags) {
    const { error } = await supabase.from('compliance_flags').insert(flag);
    if (!error) summary.flags++;
  }

  console.log(`  ✅ Created ${summary.flags} compliance flags\n`);
}

async function seedCards(supabase: any, tenantId: string, accounts: any[], summary: Summary) {
  console.log('💳 Creating cards (payment methods)...');

  const cards = [
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      type: 'card',
      is_verified: true,
      card_last_four: '4242',
      bank_account_holder: 'John Doe',
      metadata: {
        status: 'active',
        cardBrand: 'visa',
        cardExpMonth: 12,
        cardExpYear: 2028,
        label: 'Personal Visa',
        billing_address: {
          line1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94105',
          country: 'US',
        },
        limits: {
          daily: 1000,
          monthly: 5000,
        },
        currency: 'USDC',
      }
    },
    {
      tenant_id: tenantId,
      account_id: accounts[1].id,
      type: 'card',
      is_verified: true,
      card_last_four: '8888',
      bank_account_holder: 'Jane Smith',
      metadata: {
        status: 'active',
        cardBrand: 'mastercard',
        cardExpMonth: 11,
        cardExpYear: 2027,
        label: 'Business Mastercard',
        billing_address: {
          line1: '456 Market St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94103',
          country: 'US',
        },
        limits: {
          daily: 5000,
          monthly: 20000,
        },
        currency: 'USDC',
      }
    },
    {
      tenant_id: tenantId,
      account_id: accounts[0].id,
      type: 'card',
      is_verified: true,
      card_last_four: '1234',
      bank_account_holder: 'John Doe',
      metadata: {
        status: 'active',
        cardBrand: 'visa',
        cardExpMonth: 1,
        cardExpYear: 2026,
        label: 'Subscription Visa',
        billing_address: {
          line1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94105',
          country: 'US',
        },
        limits: {
          daily: 100,
          monthly: 300,
        },
        currency: 'USDC',
      }
    },
  ];

  // Delete existing cards for this tenant to ensure clean slate
  const { error: deleteError } = await supabase
    .from('payment_methods')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('type', 'card');

  if (deleteError) {
    console.error('Error deleting existing cards:', deleteError);
  } else {
    console.log('  🗑️ Cleared existing cards');
  }

  for (const card of cards) {
    const { error } = await supabase.from('payment_methods').insert(card);
    if (!error) summary.cards++;
    else console.error('Error inserting card:', error);
  }

  console.log(`  ✅ Created/Verified ${summary.cards} cards (payment methods)\n`);
}

async function seedX402Payments(supabase: any, tenantId: string, accounts: any[], now: Date, summary: Summary) {
  console.log('🤖 Creating x402 payment transactions...');

  // Get x402 endpoints
  const { data: endpoints } = await supabase
    .from('x402_endpoints')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(2);

  if (!endpoints || endpoints.length === 0) {
    console.log('  ⚠️  No x402 endpoints found, skipping payments\n');
    return;
  }

  // Get a wallet to pay FROM
  const { data: wallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('tenant_id', tenantId)
    .neq('owner_account_id', endpoints[0].account_id) // Don't pay self if possible
    .limit(1);

  if (!wallets || wallets.length === 0) {
    console.log('  ⚠️  No wallets found, skipping x402 payments\n');
    return;
  }

  const wallet = wallets[0];
  const endpoint = endpoints[0];

  const payments = [
    {
      tenant_id: tenantId,
      from_account_id: wallet.owner_account_id,
      to_account_id: endpoint.account_id, // Endpoint owner
      amount: 0.05,
      currency: 'USDC',
      type: 'x402',
      status: 'completed',
      description: `x402 payment: ${endpoint.name}`,
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      protocol_metadata: {
        protocol: 'x402',
        endpoint_id: endpoint.id,
        wallet_id: wallet.id,
        request_id: crypto.randomUUID(),
        price_calculated: 0.05
      }
    },
    {
      tenant_id: tenantId,
      from_account_id: wallet.owner_account_id,
      to_account_id: endpoint.account_id,
      amount: 0.15,
      currency: 'USDC',
      type: 'x402',
      status: 'completed',
      description: `x402 payment: ${endpoint.name}`,
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      protocol_metadata: {
        protocol: 'x402',
        endpoint_id: endpoint.id,
        wallet_id: wallet.id,
        request_id: crypto.randomUUID(),
        price_calculated: 0.15
      }
    }
  ];

  for (const payment of payments) {
    const { error } = await supabase.from('transfers').insert(payment);
    if (!error) summary.transfers++; // Count as transfers
    else console.error('Error seeding x402 payment:', error);
  }

  console.log(`  ✅ Created ${payments.length} x402 payments\n`);
}
