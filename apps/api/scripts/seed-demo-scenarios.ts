#!/usr/bin/env tsx

/**
 * Demo Scenario Seed Script (Epic 55 — Stories 55.5 + 55.6)
 *
 * Seeds all 8 demo scenarios with realistic data across all protocols.
 * Designed to make every dashboard screen look demo-ready.
 *
 * Usage:
 *   pnpm --filter @sly/api seed:demo              # Seed demo data
 *   pnpm --filter @sly/api seed:demo -- --reset    # Clear + reseed
 *   pnpm --filter @sly/api seed:demo -- --tenant-id <id>  # Specific tenant
 *   pnpm --filter @sly/api seed:demo -- --scenario 1,3,5  # Specific scenarios only
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../src/utils/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ============================================
// CLI Arguments
// ============================================

function parseArgs() {
  const args = process.argv.slice(2);
  let tenantId: string | undefined;
  let reset = false;
  let scenarios: number[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant-id' && args[i + 1]) tenantId = args[++i];
    if (args[i] === '--reset') reset = true;
    if (args[i] === '--scenario' && args[i + 1]) {
      scenarios = args[++i].split(',').map(Number).filter(n => !isNaN(n));
    }
  }

  return { tenantId, reset, scenarios };
}

/**
 * Check if a set of scenarios should be seeded.
 * Returns true if no --scenario filter was given, or if any of the specified
 * scenarios matches the filter.
 */
function shouldSeed(filter: number[], ...scenarioNums: number[]): boolean {
  if (filter.length === 0) return true;
  return scenarioNums.some(n => filter.includes(n));
}

// ============================================
// Helpers
// ============================================

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
  return d.toISOString();
}

function hoursAgo(hours: number): string {
  const d = new Date();
  d.setTime(d.getTime() - hours * 60 * 60 * 1000);
  return d.toISOString();
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function walletAddress(): string {
  return '0x' + randomUUID().replace(/-/g, '').slice(0, 40);
}

// ============================================
// Resolve or Create Tenant
// ============================================

async function resolveTenant(specifiedId?: string): Promise<string> {
  if (specifiedId) {
    const { data } = await supabase.from('tenants').select('id, name').eq('id', specifiedId).single();
    if (!data) { console.error(`Tenant not found: ${specifiedId}`); process.exit(1); }
    console.log(`Using tenant: ${data.name} (${data.id})`);
    return data.id;
  }

  // Prefer "Demo Organization"
  const { data: demo } = await supabase.from('tenants').select('id, name').eq('name', 'Demo Organization').single();
  if (demo) {
    console.log(`Using tenant: ${demo.name} (${demo.id})`);
    return demo.id;
  }

  // Fallback to first tenant
  const { data: first } = await supabase.from('tenants').select('id, name').limit(1).single();
  if (!first) { console.error('No tenants found. Run pnpm seed:db first.'); process.exit(1); }
  console.log(`Using tenant: ${first.name} (${first.id})`);
  return first.id;
}

// ============================================
// Reset (Clear Demo Data)
// ============================================

async function resetDemoData(tenantId: string) {
  console.log('\n--- Clearing existing demo data ---');

  // Break circular FK: ucp_checkout_sessions.order_id -> ucp_orders -> ucp_checkout_sessions
  await supabase.from('ucp_checkout_sessions').update({ order_id: null }).eq('tenant_id', tenantId);

  // Delete refunds before transfers (refunds FK -> transfers)
  await supabase.from('refunds').delete().eq('tenant_id', tenantId).then(() => {});

  // Order matters: children before parents
  const tables = [
    'agent_usage',
    'ucp_settlements',
    'settlement_rule_executions',
    'settlement_rules',
    'agent_payment_approvals',
    'ap2_mandate_executions',
    'ap2_mandates',
    'acp_checkout_items',
    'acp_checkouts',
    'ucp_orders',
    'ucp_checkout_sessions',
    'x402_endpoints',
    'compliance_flags',
    'ledger_entries',
    'streams',
    'transfers',
    'wallets',
    'agents',
    'payment_methods',
    'connected_accounts',
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('tenant_id', tenantId);

    if (error) {
      console.log(`  [${table}] skip: ${error.message}`);
    } else {
      console.log(`  [${table}] deleted ${count || 0} rows`);
    }
  }
}

// ============================================
// Upsert helper — insert if not exists by unique key
// ============================================

async function upsertAccount(tenantId: string, data: any): Promise<string> {
  const { data: existing } = await supabase
    .from('accounts').select('id').eq('tenant_id', tenantId).eq('email', data.email).single();
  if (existing) return existing.id;

  const { data: row, error } = await supabase.from('accounts').insert({
    tenant_id: tenantId,
    type: data.type,
    name: data.name,
    email: data.email,
    verification_tier: data.verificationTier || 0,
    verification_status: data.verificationStatus || 'unverified',
    verification_type: data.type === 'person' ? 'kyc' : 'kyb',
  }).select('id').single();
  if (error) throw error;
  return row.id;
}

async function upsertAgent(tenantId: string, accountId: string, data: any): Promise<string> {
  const { data: existing } = await supabase
    .from('agents').select('id').eq('tenant_id', tenantId).eq('parent_account_id', accountId).eq('name', data.name).single();
  if (existing) return existing.id;

  const token = generateApiKey('agent');
  const { data: row, error } = await supabase.from('agents').insert({
    tenant_id: tenantId,
    parent_account_id: accountId,
    name: data.name,
    description: data.description || '',
    status: data.status || 'active',
    type: data.type || 'custom',
    kya_tier: data.kyaTier || 0,
    kya_status: data.kyaStatus || 'unverified',
    x402_enabled: data.x402Enabled ?? true,
    total_volume: data.totalVolume || 0,
    total_transactions: data.totalTransactions || 0,
    auth_token_prefix: getKeyPrefix(token),
    auth_token_hash: hashApiKey(token),
  }).select('id').single();
  if (error) throw error;
  return row.id;
}

async function upsertWallet(tenantId: string, accountId: string, data: any): Promise<string> {
  const { data: existing } = await supabase
    .from('wallets').select('id').eq('tenant_id', tenantId).eq('owner_account_id', accountId).eq('name', data.name).maybeSingle();
  if (existing) return existing.id;

  const { data: row, error } = await supabase.from('wallets').insert({
    tenant_id: tenantId,
    owner_account_id: accountId,
    name: data.name,
    balance: data.balance || 0,
    currency: data.currency || 'USDC',
    wallet_address: data.walletAddress || walletAddress(),
    network: data.network || 'base-mainnet',
    status: data.status || 'active',
    purpose: data.purpose || null,
    spending_policy: data.spendingPolicy || null,
  }).select('id').single();
  if (error) throw error;
  return row.id;
}

// ============================================
// Main Seed Function
// ============================================

async function seedDemoScenarios(tenantId: string, scenarioFilter: number[] = []) {
  const ids: Record<string, string> = {};
  let transferCount = 0;
  // Short tenant prefix for globally-unique fields (mandate_id, checkout_id)
  const tp = tenantId.slice(0, 8);

  // ──────────────────────────────────────────
  // 1. ACCOUNTS (Story 55.5 — Core Entities)
  // ──────────────────────────────────────────
  console.log('\n1. Creating accounts...');

  const accounts = [
    // Enterprise account — Scenarios 3, 4, 8 (API provider, corporate)
    { key: 'acme', type: 'business', name: 'Acme Corp', email: 'finance@acme-demo.com', verificationTier: 3, verificationStatus: 'verified' },
    // SMB account — Scenario 3 (API consumer)
    { key: 'techstart', type: 'business', name: 'TechStartup AI', email: 'ops@techstartup-demo.com', verificationTier: 2, verificationStatus: 'verified' },
    // Consumer — Scenarios 1, 2, 7 (shopping, travel, remittance sender)
    { key: 'maria', type: 'person', name: 'Maria Rodriguez', email: 'maria@demo-consumer.com', verificationTier: 2, verificationStatus: 'verified' },
    // Gig worker — Scenario 6
    { key: 'carlos', type: 'person', name: 'Carlos Mendez', email: 'carlos@demo-gig.com', verificationTier: 1, verificationStatus: 'verified' },
    // Consumer — Scenario 2 (travel), Scenario 5 (bill pay)
    { key: 'david', type: 'person', name: 'David Chen', email: 'david@demo-consumer.com', verificationTier: 2, verificationStatus: 'verified' },
    // Merchant — Scenarios 1, 8
    { key: 'merchant', type: 'business', name: 'Global Retail Co', email: 'payments@globalretail-demo.com', verificationTier: 2, verificationStatus: 'verified' },
    // Remittance recipient — Scenario 7
    { key: 'recipient_mom', type: 'person', name: 'Elena Rodriguez', email: 'elena@demo-recipient.com', verificationTier: 1, verificationStatus: 'verified' },
    // Ride platform — Scenario 6
    { key: 'rideplatform', type: 'business', name: 'RideMax Platform', email: 'payouts@ridemax-demo.com', verificationTier: 3, verificationStatus: 'verified' },
  ];

  for (const acct of accounts) {
    ids[acct.key] = await upsertAccount(tenantId, acct);
    console.log(`  + ${acct.name} (${acct.key})`);
  }

  // ──────────────────────────────────────────
  // 2. AGENTS (8 agents matching scenarios)
  // ──────────────────────────────────────────
  console.log('\n2. Creating agents...');

  const agents = [
    // Scenario 1 — Shopping Agent
    { key: 'shopping_agent', accountKey: 'maria', name: 'AI Shopping Agent', description: 'AI shopping assistant for product discovery and checkout', type: 'payment', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 583.80, totalTransactions: 3 },
    // Scenario 2 — Travel Agent
    { key: 'travel_agent', accountKey: 'david', name: 'Hopper Travel Agent', description: 'AI travel planner with multi-vendor booking capability', type: 'payment', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 3720, totalTransactions: 6 },
    // Scenario 3 — Inference API Consumer
    { key: 'inference_agent', accountKey: 'techstart', name: 'Inference API Consumer', description: 'AI agent consuming pay-per-call inference APIs', type: 'custom', kyaTier: 1, kyaStatus: 'verified', x402Enabled: true, totalVolume: 847.23, totalTransactions: 282410 },
    // Scenario 3/8 — Content Scraper
    { key: 'content_agent', accountKey: 'techstart', name: 'Content Access Agent', description: 'Licensed content access agent for media APIs', type: 'custom', kyaTier: 2, kyaStatus: 'verified', x402Enabled: true, totalVolume: 1168.40, totalTransactions: 58420 },
    // Scenario 4 — Corporate Travel Agent
    { key: 'corp_travel_agent', accountKey: 'acme', name: 'Acme Corporate Travel Agent', description: 'Corporate travel booking with policy enforcement', type: 'treasury', kyaTier: 3, kyaStatus: 'verified', x402Enabled: false, totalVolume: 1850, totalTransactions: 3 },
    // Scenario 5 — Bill Pay Agent
    { key: 'billpay_agent', accountKey: 'david', name: 'Smart Bill Pay Agent', description: 'Neobank bill prioritization and auto-pay agent', type: 'payment', kyaTier: 1, kyaStatus: 'verified', x402Enabled: false, totalVolume: 3075, totalTransactions: 4 },
    // Scenario 6 — Smart Payout Agent
    { key: 'payout_agent', accountKey: 'rideplatform', name: 'Smart Payout Agent', description: 'Gig economy auto-allocation payout agent', type: 'treasury', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 3710, totalTransactions: 14 },
    // Scenario 7 — Remittance Agent
    { key: 'remittance_agent', accountKey: 'maria', name: 'Remittance Optimizer Agent', description: 'FX-optimized recurring remittance agent', type: 'payment', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 1500, totalTransactions: 4 },
    // Scenario 9 — Data Pipeline Agent
    { key: 'data_pipeline_agent', accountKey: 'techstart', name: 'Data Pipeline Agent', description: 'ETL and data processing agent consuming compute and storage APIs', type: 'custom', kyaTier: 1, kyaStatus: 'verified', x402Enabled: true, totalVolume: 284.50, totalTransactions: 9420 },
  ];

  for (const agent of agents) {
    ids[agent.key] = await upsertAgent(tenantId, ids[agent.accountKey], agent);
    console.log(`  + ${agent.name} (KYA ${agent.kyaTier})`);
  }

  // ── Scenario 9: Agent budget limits ──
  if (shouldSeed(scenarioFilter, 9)) {
    console.log('\n  Setting Scenario 9 agent budget limits...');
    const agentLimits = [
      { key: 'inference_agent', perTx: 0.10, daily: 50, monthly: 500 },
      { key: 'content_agent', perTx: 1.00, daily: 100, monthly: 1000 },
      { key: 'data_pipeline_agent', perTx: 0.50, daily: 30, monthly: 300 },
    ];
    for (const al of agentLimits) {
      await supabase.from('agents').update({
        limit_per_transaction: al.perTx,
        limit_daily: al.daily,
        limit_monthly: al.monthly,
        effective_limit_per_tx: al.perTx,
        effective_limit_daily: al.daily,
        effective_limit_monthly: al.monthly,
      }).eq('id', ids[al.key]);
    }
  }

  // ── Scenario 1: Shopping Agent budget limits ──
  if (shouldSeed(scenarioFilter, 1)) {
    console.log('\n  Setting Scenario 1 shopping agent budget limits...');
    await supabase.from('agents').update({
      limit_per_transaction: 500,
      limit_daily: 1000,
      limit_monthly: 5000,
      effective_limit_per_tx: 500,
      effective_limit_daily: 1000,
      effective_limit_monthly: 5000,
    }).eq('id', ids.shopping_agent);

    // Seed shopping agent daily usage so the Daily Limit card shows $625/$1,000 remaining
    const today = new Date().toISOString().split('T')[0];
    const { error: shopUsageErr } = await supabase.from('agent_usage').insert({
      tenant_id: tenantId,
      agent_id: ids.shopping_agent,
      date: today,
      daily_amount: 407.81,    // Tissot purchase today ($375 + $32.81 tax)
      monthly_amount: 583.80,  // All 3 transfers: 407.81 + 45.99 + 130
      transaction_count: 1,
    });
    if (shopUsageErr) console.log(`  ! shopping agent usage insert failed: ${shopUsageErr.message}`);
    else console.log('  + shopping agent usage: $407.81 / $1,000 daily');
  }

  // ── Scenario 9: Agent usage records (near-limit utilization) ──
  if (shouldSeed(scenarioFilter, 9)) {
    console.log('\n  Seeding agent usage records...');
    const usageProfiles = [
      { agentKey: 'inference_agent', todayAmount: 42, avgDaily: 14, variance: 3 },
      { agentKey: 'content_agent', todayAmount: 65, avgDaily: 28, variance: 5 },
      { agentKey: 'data_pipeline_agent', todayAmount: 28, avgDaily: 9.2, variance: 1.5 },
    ];
    // Columns: id, tenant_id, agent_id, date, daily_amount, monthly_amount, transaction_count, created_at, updated_at
    const usageRecords: any[] = [];
    for (const profile of usageProfiles) {
      // Calculate cumulative monthly amount for each day
      let monthlyRunning = 0;
      for (let day = 29; day >= 0; day--) {
        const date = new Date(); date.setDate(date.getDate() - day);
        const amount = day === 0
          ? profile.todayAmount
          : profile.avgDaily + (Math.random() - 0.5) * profile.variance * 2;
        monthlyRunning += amount;
        usageRecords.push({
          tenant_id: tenantId,
          agent_id: ids[profile.agentKey],
          date: date.toISOString().split('T')[0],
          daily_amount: parseFloat(amount.toFixed(4)),
          monthly_amount: parseFloat(monthlyRunning.toFixed(4)),
          transaction_count: Math.floor(amount * 100),
        });
      }
    }
    const { error: usageErr } = await supabase.from('agent_usage').insert(usageRecords);
    if (usageErr) console.log(`  ! agent_usage insert failed: ${usageErr.message}`);
    else console.log(`  + ${usageRecords.length} agent_usage records`);
  }

  // ── Scenario 2: Travel Agent budget limits + usage ──
  if (shouldSeed(scenarioFilter, 2)) {
    console.log('\n  Setting Scenario 2 travel agent budget limits...');
    await supabase.from('agents').update({
      limit_per_transaction: 2000,
      limit_daily: 4000,
      limit_monthly: 8000,
      effective_limit_per_tx: 2000,
      effective_limit_daily: 4000,
      effective_limit_monthly: 8000,
    }).eq('id', ids.travel_agent);

    const today = new Date().toISOString().split('T')[0];
    const { error: travelUsageErr } = await supabase.from('agent_usage').insert({
      tenant_id: tenantId,
      agent_id: ids.travel_agent,
      date: today,
      daily_amount: 3720,
      monthly_amount: 3720,
      transaction_count: 6,
    });
    if (travelUsageErr) console.log(`  ! travel agent usage insert failed: ${travelUsageErr.message}`);
    else console.log('  + travel agent usage: $3,720 / $4,000 daily');
  }

  // ──────────────────────────────────────────
  // 3. WALLETS (10 wallets with spending policies)
  // ──────────────────────────────────────────
  console.log('\n3. Creating wallets...');

  const wallets = [
    // Enterprise treasury
    { key: 'acme_treasury', accountKey: 'acme', name: 'Acme Treasury', balance: 250000, purpose: 'Main corporate treasury', spendingPolicy: { daily_limit: 50000, monthly_limit: 500000, requires_approval_above: 10000 } },
    // x402 provider revenue wallet
    { key: 'acme_x402_revenue', accountKey: 'acme', name: 'x402 Revenue Wallet', balance: 5480, purpose: 'x402 micropayment revenue collection' },
    // Inference consumer wallet
    { key: 'techstart_ops', accountKey: 'techstart', name: 'TechStartup Operations', balance: 5000, purpose: 'Agent operations wallet', spendingPolicy: { daily_limit: 200, per_transaction_limit: 1 } },
    // Shopping consumer wallet
    { key: 'maria_wallet', accountKey: 'maria', name: 'Maria Personal Wallet', balance: 850, purpose: 'Shopping and remittance', spendingPolicy: { daily_limit: 1000, monthly_limit: 5000 } },
    // Travel consumer wallet
    { key: 'david_wallet', accountKey: 'david', name: 'David Personal Wallet', balance: 3500, purpose: 'Travel and bill pay', spendingPolicy: { daily_limit: 4000, monthly_limit: 7000, requires_approval_above: 3000 } },
    // Gig worker wallets (tax, savings, spending)
    { key: 'carlos_spending', accountKey: 'carlos', name: 'Carlos Spending', balance: 200, purpose: 'Instant payout spending wallet' },
    { key: 'carlos_tax', accountKey: 'carlos', name: 'Carlos Tax Reserve', balance: 930, purpose: 'Tax reserve — locked', spendingPolicy: { locked: true, unlock_date: '2026-04-15' } },
    { key: 'carlos_savings', accountKey: 'carlos', name: 'Carlos Emergency Savings', balance: 740, purpose: 'Emergency savings with friction' },
    // Corporate travel wallet
    { key: 'acme_travel', accountKey: 'acme', name: 'Acme Travel Budget', balance: 75000, purpose: 'Corporate travel expenses', spendingPolicy: { per_trip_limit: 5000, hotel_per_night_max: 500, class: 'economy' } },
    // Remittance sender wallet
    { key: 'maria_remittance', accountKey: 'maria', name: 'Maria Remittance Fund', balance: 650, purpose: 'Monthly remittance to family' },
    // Scenario 9 — Per-agent operations wallets
    { key: 'inference_ops', accountKey: 'techstart', name: 'Inference API Budget', balance: 150, purpose: 'Budget for LLM inference API calls', spendingPolicy: { daily_limit: 50, monthly_limit: 500, per_transaction_limit: 0.10, approvedVendors: ['openai.com', 'anthropic.com'] } },
    { key: 'content_ops', accountKey: 'techstart', name: 'Content License Budget', balance: 350, purpose: 'Budget for licensed content access APIs', spendingPolicy: { daily_limit: 100, monthly_limit: 1000, per_transaction_limit: 1.00, approvedVendors: ['reuters.com', 'apnews.com'] } },
    { key: 'data_pipeline_ops', accountKey: 'techstart', name: 'Data Pipeline Budget', balance: 80, purpose: 'Budget for compute and storage APIs', spendingPolicy: { daily_limit: 30, monthly_limit: 300, per_transaction_limit: 0.50, requires_approval_above: 0.25, approvedVendors: ['snowflake.com', 'aws.amazon.com'] } },
  ];

  for (const w of wallets) {
    ids[w.key] = await upsertWallet(tenantId, ids[w.accountKey], w);
    console.log(`  + ${w.name} ($${w.balance.toLocaleString()})`);
  }

  // Link per-agent wallets to their managing agents
  const agentWalletLinks: [string, string][] = [
    ['inference_ops', 'inference_agent'],
    ['content_ops', 'content_agent'],
    ['data_pipeline_ops', 'data_pipeline_agent'],
    ['maria_wallet', 'shopping_agent'],
  ];
  for (const [walletKey, agentKey] of agentWalletLinks) {
    if (ids[walletKey] && ids[agentKey]) {
      await supabase.from('wallets').update({ managed_by_agent_id: ids[agentKey] }).eq('id', ids[walletKey]);
    }
  }

  // ──────────────────────────────────────────
  // 4. TRANSFERS (50+ across 30 days)
  // ──────────────────────────────────────────
  console.log('\n4. Creating transfers...');

  const transferDefs = [
    // Scenario 1 — Shopping completed purchase (domestic e-commerce, internal transfers)
    { from: 'maria', to: 'merchant', amount: 407.81, currency: 'USD', status: 'completed', type: 'internal', desc: 'Tissot PRX watch purchase (ACP checkout)', created: hoursAgo(2), initiatorType: 'agent', initiatorId: 'shopping_agent', initiatorName: 'AI Shopping Agent' },
    { from: 'maria', to: 'merchant', amount: 45.99, currency: 'USD', status: 'completed', type: 'internal', desc: 'Leather watch strap purchase', created: daysAgo(5), initiatorType: 'agent', initiatorId: 'shopping_agent', initiatorName: 'AI Shopping Agent' },
    { from: 'maria', to: 'merchant', amount: 130, currency: 'USD', status: 'completed', type: 'internal', desc: 'Running shoes — Nike Pegasus 41', created: daysAgo(12), initiatorType: 'agent', initiatorId: 'shopping_agent', initiatorName: 'AI Shopping Agent' },

    // Scenario 2 — Travel payments handled via UCP checkout sessions (no separate transfers)

    // Scenario 4 — Corporate travel (USD + Visa AgentPay)
    { from: 'acme', to: 'merchant', amount: 890, currency: 'USD', status: 'completed', type: 'cross_border', desc: 'LATAM Airlines — VP Sales São Paulo RT', created: daysAgo(3), initiatorType: 'agent', initiatorId: 'corp_travel_agent', initiatorName: 'Acme Corporate Travel Agent' },
    { from: 'acme', to: 'merchant', amount: 840, currency: 'USD', status: 'completed', type: 'cross_border', desc: 'Hotel Fasano — 2 nights São Paulo', created: daysAgo(3), initiatorType: 'agent', initiatorId: 'corp_travel_agent', initiatorName: 'Acme Corporate Travel Agent' },
    { from: 'acme', to: 'merchant', amount: 120, currency: 'USD', status: 'processing', type: 'cross_border', desc: 'Ground transport São Paulo', created: daysAgo(1), initiatorType: 'agent', initiatorId: 'corp_travel_agent', initiatorName: 'Acme Corporate Travel Agent' },

    // Scenario 5 — Bill pay (USD)
    { from: 'david', to: 'merchant', amount: 2800, currency: 'USD', status: 'completed', type: 'internal', desc: 'Rent payment — Feb 2026', created: daysAgo(6), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },
    { from: 'david', to: 'merchant', amount: 180, currency: 'USD', status: 'completed', type: 'internal', desc: 'Electric bill — deferred, paid on Friday', created: daysAgo(4), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },
    { from: 'david', to: 'merchant', amount: 80, currency: 'USD', status: 'completed', type: 'internal', desc: 'Internet bill — deferred, paid on Friday', created: daysAgo(4), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },
    { from: 'david', to: 'merchant', amount: 15, currency: 'USD', status: 'completed', type: 'internal', desc: 'Netflix subscription — deferred, paid on Friday', created: daysAgo(4), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },

    // Scenario 6 — Gig payouts (multiple daily payouts over 2 weeks)
    ...Array.from({ length: 14 }, (_, i) => ({
      from: 'rideplatform', to: 'carlos', amount: 180 + Math.round(Math.random() * 170), currency: 'USDC', status: 'completed' as const, type: 'internal' as const,
      desc: `Daily ride earnings — ${12 + Math.floor(Math.random() * 4)} rides`, created: daysAgo(i + 1),
      initiatorType: 'agent', initiatorId: 'payout_agent', initiatorName: 'Smart Payout Agent',
    })),

    // Scenario 7 — Remittance (last 3 months)
    { from: 'maria', to: 'recipient_mom', amount: 500, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Monthly remittance — Dec 2025', created: daysAgo(67), initiatorType: 'agent', initiatorId: 'remittance_agent', initiatorName: 'Remittance Optimizer Agent' },
    { from: 'maria', to: 'recipient_mom', amount: 500, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Monthly remittance — Jan 2026', created: daysAgo(37), initiatorType: 'agent', initiatorId: 'remittance_agent', initiatorName: 'Remittance Optimizer Agent' },
    { from: 'maria', to: 'recipient_mom', amount: 380, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Monthly remittance — Feb 2026 (partial, low balance)', created: daysAgo(7), initiatorType: 'agent', initiatorId: 'remittance_agent', initiatorName: 'Remittance Optimizer Agent' },
    { from: 'maria', to: 'recipient_mom', amount: 120, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Monthly remittance — Feb 2026 (remainder after deposit)', created: daysAgo(5), initiatorType: 'agent', initiatorId: 'remittance_agent', initiatorName: 'Remittance Optimizer Agent' },

    // General treasury operations
    { from: 'acme', to: 'techstart', amount: 15000, currency: 'USDC', status: 'completed', type: 'internal', desc: 'Quarterly API license payment', created: daysAgo(15) },
    { from: 'acme', to: 'merchant', amount: 8500, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Vendor payment — cloud infrastructure', created: daysAgo(22) },
    { from: 'acme', to: 'carlos', amount: 3200, currency: 'USDC', status: 'pending', type: 'cross_border', desc: 'Contractor payment — pending review', created: daysAgo(1) },
  ];

  const transferIds: string[] = [];

  for (const t of transferDefs) {
    const fromId = ids[t.from];
    const toId = ids[t.to];
    const fromName = accounts.find(a => a.key === t.from)?.name || t.from;
    const toName = accounts.find(a => a.key === t.to)?.name || t.to;

    const { data, error } = await supabase.from('transfers').insert({
      tenant_id: tenantId,
      from_account_id: fromId,
      from_account_name: fromName,
      to_account_id: toId,
      to_account_name: toName,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      type: t.type,
      description: t.desc,
      initiated_by_type: t.initiatorType || 'user',
      initiated_by_id: t.initiatorId ? ids[t.initiatorId] || fromId : fromId,
      initiated_by_name: t.initiatorName || fromName,
      created_at: t.created,
    }).select('id').single();

    if (error) {
      console.log(`  ! Transfer failed: ${t.desc} — ${error.message}`);
      continue;
    }

    transferIds.push(data.id);
    transferCount++;

    // Create ledger entries for completed transfers
    if (t.status === 'completed') {
      await supabase.from('ledger_entries').insert([
        { tenant_id: tenantId, account_id: fromId, transfer_id: data.id, amount: -t.amount, currency: t.currency, entry_type: 'debit', description: `To ${toName}` },
        { tenant_id: tenantId, account_id: toId, transfer_id: data.id, amount: t.amount, currency: t.currency, entry_type: 'credit', description: `From ${fromName}` },
      ]);
    }
  }
  console.log(`  + ${transferCount} transfers created`);

  // ──────────────────────────────────────────
  // 5. x402 ENDPOINTS (Scenarios 3, 8)
  // ──────────────────────────────────────────

  if (shouldSeed(scenarioFilter, 3, 8)) {
  console.log('\n5. Creating x402 endpoints...');

  const x402Endpoints = [
    // Scenario 3 — API Monetization
    { name: 'Inference API — GPT-4o', path: '/v1/inference', method: 'POST', description: 'Pay-per-call AI inference endpoint', base_price: 0.003, total_calls: 282410, total_revenue: 847.23, status: 'active',
      volume_discounts: { tiers: [{ min_calls: 10000, price: 0.002 }, { min_calls: 100000, price: 0.001 }] } },
    { name: 'Embeddings API', path: '/v1/embeddings', method: 'POST', description: 'Text embedding generation', base_price: 0.0005, total_calls: 145200, total_revenue: 72.60, status: 'active' },
    { name: 'Image Generation API', path: '/v1/images/generate', method: 'POST', description: 'AI image generation endpoint', base_price: 0.02, total_calls: 18340, total_revenue: 366.80, status: 'active' },

    // Scenario 8 — Media/Publishing
    { name: 'Article — Full Text', path: '/content/articles/:id', method: 'GET', description: 'Full article access — human readers and AI agents', base_price: 0.15, total_calls: 61728, total_revenue: 9259.20, status: 'active',
      volume_discounts: { tiers: [{ agent_type: 'ai', price: 0.02 }, { agent_type: 'ai_summary', price: 0.005 }] } },
    { name: 'Article — Summary Only', path: '/content/articles/:id/summary', method: 'GET', description: 'Article summary access for AI agents', base_price: 0.005, total_calls: 340000, total_revenue: 1700.00, status: 'active' },
    { name: 'Data Extract API', path: '/content/articles/:id/structured', method: 'GET', description: 'Full text + structured metadata extraction', base_price: 0.05, total_calls: 8200, total_revenue: 410.00, status: 'active' },

    // Additional endpoints
    { name: 'Speech-to-Text', path: '/v1/audio/transcribe', method: 'POST', description: 'Audio transcription API', base_price: 0.006, total_calls: 42100, total_revenue: 252.60, status: 'active' },
    { name: 'Deprecated — v0 Inference', path: '/v0/inference', method: 'POST', description: 'Legacy inference endpoint (deprecated)', base_price: 0.005, total_calls: 1200, total_revenue: 6.00, status: 'paused' },

    // Scenario 9 — Data Pipeline compute endpoints
    { name: 'Snowflake Compute', path: '/v1/compute', method: 'POST', description: 'Snowflake warehouse compute credits for ETL pipelines', base_price: 0.035, total_calls: 4710, total_revenue: 164.85, status: 'active' },
    { name: 'AWS Bedrock Embeddings', path: '/v1/data/embeddings', method: 'POST', description: 'AWS Bedrock embedding inference for data enrichment', base_price: 0.025, total_calls: 4400, total_revenue: 110.00, status: 'active' },
  ];

  const x402EndpointIds: Record<string, string> = {};
  for (const ep of x402Endpoints) {
    const { data: epRow, error } = await supabase.from('x402_endpoints').insert({
      tenant_id: tenantId,
      account_id: ids.acme,
      name: ep.name,
      path: ep.path,
      method: ep.method,
      description: ep.description,
      base_price: ep.base_price,
      currency: 'USDC',
      volume_discounts: ep.volume_discounts || null,
      payment_address: walletAddress(),
      network: 'base-mainnet',
      total_calls: ep.total_calls,
      total_revenue: ep.total_revenue,
      status: ep.status,
    }).select('id').single();

    if (error) {
      // If duplicate, fetch existing endpoint ID
      const { data: existing } = await supabase.from('x402_endpoints').select('id')
        .eq('tenant_id', tenantId).eq('path', ep.path).eq('method', ep.method).single();
      if (existing) {
        x402EndpointIds[ep.path] = existing.id;
        console.log(`  = ${ep.name} (exists)`);
      } else {
        console.log(`  ! x402 endpoint failed: ${ep.name} — ${error.message}`);
      }
    } else {
      if (epRow) x402EndpointIds[ep.path] = epRow.id;
      console.log(`  + ${ep.name} ($${ep.base_price}/call, ${ep.total_calls.toLocaleString()} calls)`);
    }
  }

  // Delete existing x402 transfers so we can re-seed with diversified payers
  const { count: deletedX402 } = await supabase.from('transfers')
    .delete({ count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('type', 'x402');
  if (deletedX402 && deletedX402 > 0) console.log(`  (cleaned ${deletedX402} old x402 transfers)`);

  // Create x402 transfer records (micropayments)
  console.log('\n5b. Creating x402 transfer records...');

  const x402TransferDefs: Array<{ endpoint_path: string; base_price: number; count: number; from: string; to: string }> = [
    // Scenario 3 — Inference API consumers → provider (multiple payers)
    { endpoint_path: '/v1/inference', base_price: 0.003, count: 2, from: 'techstart', to: 'acme' },
    { endpoint_path: '/v1/inference', base_price: 0.003, count: 2, from: 'david', to: 'acme' },
    { endpoint_path: '/v1/inference', base_price: 0.003, count: 1, from: 'merchant', to: 'acme' },
    { endpoint_path: '/v1/inference', base_price: 0.003, count: 1, from: 'rideplatform', to: 'acme' },
    { endpoint_path: '/v1/embeddings', base_price: 0.0005, count: 2, from: 'techstart', to: 'acme' },
    { endpoint_path: '/v1/embeddings', base_price: 0.0005, count: 1, from: 'david', to: 'acme' },
    { endpoint_path: '/v1/embeddings', base_price: 0.0005, count: 1, from: 'maria', to: 'acme' },
    { endpoint_path: '/v1/embeddings', base_price: 0.0005, count: 1, from: 'merchant', to: 'acme' },
    { endpoint_path: '/v1/images/generate', base_price: 0.02, count: 1, from: 'techstart', to: 'acme' },
    { endpoint_path: '/v1/images/generate', base_price: 0.02, count: 1, from: 'david', to: 'acme' },
    { endpoint_path: '/v1/images/generate', base_price: 0.02, count: 1, from: 'maria', to: 'acme' },
    { endpoint_path: '/v1/images/generate', base_price: 0.02, count: 1, from: 'rideplatform', to: 'acme' },
    // Scenario 8 — Content access (multiple payers)
    { endpoint_path: '/content/articles/:id', base_price: 0.15, count: 2, from: 'techstart', to: 'acme' },
    { endpoint_path: '/content/articles/:id', base_price: 0.15, count: 1, from: 'david', to: 'acme' },
    { endpoint_path: '/content/articles/:id', base_price: 0.15, count: 1, from: 'maria', to: 'acme' },
    { endpoint_path: '/content/articles/:id', base_price: 0.15, count: 1, from: 'merchant', to: 'acme' },
    { endpoint_path: '/content/articles/:id/summary', base_price: 0.005, count: 1, from: 'techstart', to: 'acme' },
    { endpoint_path: '/content/articles/:id/summary', base_price: 0.005, count: 1, from: 'david', to: 'acme' },
    { endpoint_path: '/content/articles/:id/summary', base_price: 0.005, count: 1, from: 'maria', to: 'acme' },
    { endpoint_path: '/content/articles/:id/summary', base_price: 0.005, count: 1, from: 'rideplatform', to: 'acme' },
  ];

  let x402TransferCount = 0;
  for (const def of x402TransferDefs) {
    const endpointId = x402EndpointIds[def.endpoint_path];
    if (!endpointId) continue;

    for (let i = 0; i < def.count; i++) {
      const callCount = 50 + Math.floor(Math.random() * 200);
      const variation = 0.8 + Math.random() * 0.4; // 80-120% of base price
      const amount = parseFloat((def.base_price * variation * callCount).toFixed(6));
      const day = 1 + (x402TransferCount % 25); // spread evenly across last 25 days
      const fromId = ids[def.from];
      const toId = ids[def.to];
      const fromName = accounts.find(a => a.key === def.from)?.name || def.from;
      const toName = accounts.find(a => a.key === def.to)?.name || def.to;

      const { data: xferRow, error: xferErr } = await supabase.from('transfers').insert({
        tenant_id: tenantId,
        from_account_id: fromId,
        from_account_name: fromName,
        to_account_id: toId,
        to_account_name: toName,
        amount,
        currency: 'USDC',
        status: 'completed',
        type: 'x402',
        description: `x402 micropayment — ${def.endpoint_path} (${callCount} calls)`,
        initiated_by_type: 'agent',
        initiated_by_id: ids.inference_agent || fromId,
        initiated_by_name: 'Inference API Consumer',
        protocol_metadata: { endpoint_id: endpointId, endpoint_path: def.endpoint_path, call_count: callCount, price_per_call: def.base_price, settlement_fee: parseFloat((amount * 0.01).toFixed(6)) },
        created_at: daysAgo(day),
      }).select('id').single();

      if (!xferErr && xferRow) {
        x402TransferCount++;
        // Create ledger entries
        await supabase.from('ledger_entries').insert([
          { tenant_id: tenantId, account_id: fromId, transfer_id: xferRow.id, amount: -amount, currency: 'USDC', entry_type: 'debit', description: `x402 ${def.endpoint_path}` },
          { tenant_id: tenantId, account_id: toId, transfer_id: xferRow.id, amount, currency: 'USDC', entry_type: 'credit', description: `x402 ${def.endpoint_path}` },
        ]);
      }
    }
  }
  console.log(`  + ${x402TransferCount} x402 transfers created`);

  // Scenario 9 — Data Pipeline Agent x402 micropayments (fixed amounts to match daily/monthly usage)
  console.log('\n5c. Creating Data Pipeline Agent x402 transfers...');
  const dataPipelineTransfers: Array<{ path: string; amount: number; calls: number; day: number; from?: string }> = [
    // Today — $28 total ($16.80 Snowflake + $11.20 Bedrock) — multiple payers
    { path: '/v1/compute', amount: 5.60, calls: 160, day: 0 },
    { path: '/v1/compute', amount: 5.80, calls: 166, day: 0, from: 'david' },
    { path: '/v1/compute', amount: 5.40, calls: 154, day: 0, from: 'merchant' },
    { path: '/v1/data/embeddings', amount: 3.80, calls: 152, day: 0 },
    { path: '/v1/data/embeddings', amount: 3.90, calls: 156, day: 0, from: 'david' },
    { path: '/v1/data/embeddings', amount: 3.50, calls: 140, day: 0, from: 'rideplatform' },
    // Yesterday — ~$9.20
    { path: '/v1/compute', amount: 5.20, calls: 149, day: 1 },
    { path: '/v1/data/embeddings', amount: 4.00, calls: 160, day: 1, from: 'maria' },
    // Day 2-7 — spread to reach ~$275 monthly
    { path: '/v1/compute', amount: 5.50, calls: 157, day: 2, from: 'david' },
    { path: '/v1/data/embeddings', amount: 3.70, calls: 148, day: 2 },
    { path: '/v1/compute', amount: 5.30, calls: 151, day: 3, from: 'merchant' },
    { path: '/v1/data/embeddings', amount: 3.60, calls: 144, day: 3, from: 'david' },
    { path: '/v1/compute', amount: 5.70, calls: 163, day: 5 },
    { path: '/v1/data/embeddings', amount: 3.80, calls: 152, day: 5, from: 'rideplatform' },
    { path: '/v1/compute', amount: 5.40, calls: 154, day: 7, from: 'maria' },
    { path: '/v1/data/embeddings', amount: 3.50, calls: 140, day: 7 },
    // Older days — larger batches representing weekly settlement
    { path: '/v1/compute', amount: 38.00, calls: 1086, day: 14 },
    { path: '/v1/data/embeddings', amount: 25.00, calls: 1000, day: 14, from: 'david' },
    { path: '/v1/compute', amount: 40.00, calls: 1143, day: 21, from: 'merchant' },
    { path: '/v1/data/embeddings', amount: 27.00, calls: 1080, day: 21 },
    { path: '/v1/compute', amount: 42.00, calls: 1200, day: 28, from: 'rideplatform' },
    { path: '/v1/data/embeddings', amount: 28.00, calls: 1120, day: 28 },
  ];

  let dpTransferCount = 0;
  for (const t of dataPipelineTransfers) {
    const endpointId = x402EndpointIds[t.path];
    if (!endpointId) continue;

    const fromKey = t.from || 'techstart';
    const fromId = ids[fromKey];
    const toId = ids.acme;
    const fromName = accounts.find(a => a.key === fromKey)?.name || fromKey;
    const toName = accounts.find(a => a.key === 'acme')?.name || 'Acme Corp';

    const { data: xferRow, error: xferErr } = await supabase.from('transfers').insert({
      tenant_id: tenantId,
      from_account_id: fromId,
      from_account_name: fromName,
      to_account_id: toId,
      to_account_name: toName,
      amount: t.amount,
      currency: 'USDC',
      status: 'completed',
      type: 'x402',
      description: `x402 micropayment — ${t.path} (${t.calls} calls)`,
      initiated_by_type: 'agent',
      initiated_by_id: ids.data_pipeline_agent,
      initiated_by_name: 'Data Pipeline Agent',
      protocol_metadata: { endpoint_id: endpointId, endpoint_path: t.path, call_count: t.calls, price_per_call: t.path.includes('compute') ? 0.035 : 0.025, settlement_fee: parseFloat((t.amount * 0.01).toFixed(6)) },
      created_at: daysAgo(t.day),
    }).select('id').single();

    if (!xferErr && xferRow) {
      dpTransferCount++;
      await supabase.from('ledger_entries').insert([
        { tenant_id: tenantId, account_id: fromId, transfer_id: xferRow.id, amount: -t.amount, currency: 'USDC', entry_type: 'debit', description: `x402 ${t.path}` },
        { tenant_id: tenantId, account_id: toId, transfer_id: xferRow.id, amount: t.amount, currency: 'USDC', entry_type: 'credit', description: `x402 ${t.path}` },
      ]);
    }
  }
  console.log(`  + ${dpTransferCount} Data Pipeline x402 transfers created`);

  } // end x402 guard

  // ──────────────────────────────────────────
  // 6. ACP CHECKOUTS (Scenarios 1, 2, 4)
  // ──────────────────────────────────────────

  if (shouldSeed(scenarioFilter, 1, 2, 4)) {
  console.log('\n6. Creating ACP checkouts...');

  const acpCheckouts = [
    // Scenario 1 — Shopping Agent "Birthday Gift"
    {
      checkout_id: 'chk_tissot_watch', session_id: 'sess_shop_001',
      agent_id: ids.shopping_agent, agent_name: 'AI Shopping Agent',
      customer_id: 'cust_maria', customer_email: 'maria@demo-consumer.com',
      account_id: ids.maria, merchant_id: 'merch_global_retail', merchant_name: 'Global Retail Co',
      merchant_url: 'https://globalretail-demo.com',
      subtotal: 375, tax_amount: 32.81, shipping_amount: 0, discount_amount: 0, total_amount: 407.81,
      currency: 'USD',
      status: 'completed', payment_method: 'card',
      transfer_id: transferIds[0] || null,
      checkout_data: { scenario: 'birthday_gift', policy_check: 'passed', auto_approved: true, payment_handler: 'stripe', card_network: 'mastercard' },
      created_at: hoursAgo(2),
      items: [
        { item_id: 'tissot_prx_001', name: 'Tissot PRX', description: 'Swiss watch, 40mm, blue dial', quantity: 1, unit_price: 375, total_price: 375, image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200' },
      ],
    },
    {
      checkout_id: 'chk_shoes_nike', session_id: 'sess_shop_002',
      agent_id: ids.shopping_agent, agent_name: 'AI Shopping Agent',
      customer_id: 'cust_maria', customer_email: 'maria@demo-consumer.com',
      account_id: ids.maria, merchant_id: 'merch_global_retail', merchant_name: 'Global Retail Co',
      subtotal: 130, tax_amount: 11.38, shipping_amount: 5.99, total_amount: 147.37,
      currency: 'USD',
      status: 'completed', payment_method: 'card',
      checkout_data: { scenario: 'shopping', payment_handler: 'stripe', card_network: 'mastercard' },
      created_at: daysAgo(12),
      items: [
        { item_id: 'nike_pegasus_001', name: 'Nike Pegasus 41', description: 'Running shoes, size 9', quantity: 1, unit_price: 130, total_price: 130 },
      ],
    },

    // Scenario 2 — Travel multi-vendor: Moved to UCP-only (no ACP checkouts)

    // Scenario 4 — Corporate travel São Paulo
    {
      checkout_id: 'chk_corp_flight_gru', session_id: 'sess_corp_001',
      agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      customer_id: 'cust_acme_vp', customer_email: 'vp.sales@acme-demo.com',
      account_id: ids.acme, merchant_id: 'merch_latam_airlines', merchant_name: 'LATAM Airlines',
      subtotal: 890, tax_amount: 0, shipping_amount: 0, total_amount: 890,
      status: 'completed', payment_method: 'corporate_wallet',
      currency: 'USD', payment_method: 'corporate_card',
      checkout_data: { scenario: 'corporate_travel', policy_check: 'all_passed', auto_approved: true, gl_code: 'Travel-Sales', cost_center: 'LATAM Expansion', payment_handler: 'visa_agentpay', card_network: 'visa' },
      created_at: daysAgo(3),
      items: [
        { item_id: 'corp_flight_001', name: 'LATAM Airlines Economy — NYC to GRU', description: 'Round-trip, Feb 12-14', quantity: 1, unit_price: 890, total_price: 890 },
      ],
    },
    {
      checkout_id: 'chk_corp_hotel_sp', session_id: 'sess_corp_002',
      agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      customer_id: 'cust_acme_vp', customer_email: 'vp.sales@acme-demo.com',
      account_id: ids.acme, merchant_id: 'merch_booking', merchant_name: 'Booking.com',
      subtotal: 840, tax_amount: 0, shipping_amount: 0, total_amount: 840,
      currency: 'USD', payment_method: 'corporate_card',
      checkout_data: { scenario: 'corporate_travel', policy_check: 'all_passed', auto_approved: true, gl_code: 'Travel-Sales', cost_center: 'LATAM Expansion', payment_handler: 'visa_agentpay', card_network: 'visa' },
      created_at: daysAgo(3),
      items: [
        { item_id: 'corp_hotel_001', name: 'Hotel Fasano São Paulo', description: '2 nights, standard room, $420/night', quantity: 2, unit_price: 420, total_price: 840 },
      ],
    },

    // Active/pending checkout
    {
      checkout_id: 'chk_pending_headphones', session_id: 'sess_shop_003',
      agent_id: ids.shopping_agent, agent_name: 'AI Shopping Agent',
      customer_id: 'cust_maria', customer_email: 'maria@demo-consumer.com',
      account_id: ids.maria, merchant_id: 'merch_global_retail', merchant_name: 'Global Retail Co',
      subtotal: 349, tax_amount: 30.54, shipping_amount: 0, total_amount: 379.54,
      currency: 'USD', status: 'pending',
      checkout_data: { scenario: 'shopping', awaiting_confirmation: true, first_time_merchant: true },
      created_at: hoursAgo(2),
      items: [
        { item_id: 'sony_wh1000xm5', name: 'Sony WH-1000XM5 Headphones', description: 'Wireless noise-cancelling headphones', quantity: 1, unit_price: 349, total_price: 349 },
      ],
    },
  ];

  for (const checkout of acpCheckouts) {
    const { items, ...checkoutData } = checkout;

    const { data: row, error } = await supabase.from('acp_checkouts').insert({
      tenant_id: tenantId,
      checkout_id: checkoutData.checkout_id,
      session_id: checkoutData.session_id,
      agent_id: checkoutData.agent_id,
      agent_name: checkoutData.agent_name,
      customer_id: checkoutData.customer_id,
      customer_email: checkoutData.customer_email,
      account_id: checkoutData.account_id,
      merchant_id: checkoutData.merchant_id,
      merchant_name: checkoutData.merchant_name,
      merchant_url: checkoutData.merchant_url || null,
      subtotal: checkoutData.subtotal,
      tax_amount: checkoutData.tax_amount,
      shipping_amount: checkoutData.shipping_amount || 0,
      discount_amount: checkoutData.discount_amount || 0,
      total_amount: checkoutData.total_amount,
      currency: (checkoutData as any).currency || 'USD',
      status: checkoutData.status,
      payment_method: checkoutData.payment_method || null,
      transfer_id: checkoutData.transfer_id || null,
      checkout_data: checkoutData.checkout_data || null,
      created_at: checkoutData.created_at,
      completed_at: checkoutData.status === 'completed' ? checkoutData.created_at : null,
    }).select('id').single();

    if (error) {
      console.log(`  ! ACP checkout failed: ${checkoutData.checkout_id} — ${error.message}`);
      continue;
    }

    // Insert checkout items
    if (items?.length && row) {
      for (const item of items) {
        await supabase.from('acp_checkout_items').insert({
          tenant_id: tenantId,
          checkout_id: row.id,
          item_id: item.item_id,
          name: item.name,
          description: item.description || null,
          image_url: item.image_url || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          currency: (checkoutData as any).currency || 'USD',
        });
      }
    }

    console.log(`  + ${checkoutData.checkout_id} (${checkoutData.status}, $${checkoutData.total_amount})`);
  }

  // Historical ACP checkouts (30-60 days ago) for dashboard trend comparison
  console.log('  + Adding historical ACP checkouts for trend data...');
  const historicalAcpCheckouts = [
    { subtotal: 325, total_amount: 350, currency: 'USD', created_at: daysAgo(38) },
    { subtotal: 260, total_amount: 280, currency: 'USD', created_at: daysAgo(45) },
    { subtotal: 250, total_amount: 270, currency: 'USD', created_at: daysAgo(52) },
  ];
  let histAcpCount = 0;
  for (const h of historicalAcpCheckouts) {
    const { error } = await supabase.from('acp_checkouts').insert({
      tenant_id: tenantId,
      checkout_id: `chk_hist_${randomUUID().slice(0, 8)}`,
      session_id: `sess_hist_${randomUUID().slice(0, 8)}`,
      agent_id: ids.shopping_agent,
      agent_name: 'AI Shopping Agent',
      account_id: ids.maria,
      merchant_id: 'merch_global_retail',
      merchant_name: 'Global Retail Co',
      subtotal: h.subtotal,
      tax_amount: h.total_amount - h.subtotal,
      total_amount: h.total_amount,
      currency: h.currency,
      status: 'completed',
      created_at: h.created_at,
      completed_at: h.created_at,
    });
    if (error) console.log(`  ! Historical ACP insert failed: ${error.message}`);
    else histAcpCount++;
  }
  console.log(`  + ${histAcpCount}/${historicalAcpCheckouts.length} historical ACP checkouts (trend baseline)`);
  } // end ACP guard

  // ──────────────────────────────────────────
  // 7. AP2 MANDATES (Scenarios 4, 5, 7)
  // ──────────────────────────────────────────

  if (shouldSeed(scenarioFilter, 4, 5, 6, 7, 9)) {
  console.log('\n7. Creating AP2 mandates...');

  const mandates = [
    // Scenario 4 — Corporate travel mandate chain (USD)
    {
      mandate_id: `${tp}_mandate_corp_travel_intent`, mandate_type: 'intent',
      account_id: ids.acme, agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      authorized_amount: 5000, used_amount: 1850, execution_count: 1, status: 'completed',
      currency: 'USD',
      mandate_data: { traveler: 'VP of Sales', destination: 'São Paulo', dates: 'Feb 12-14', purpose: 'Client meeting — $2M deal' },
      created_at: daysAgo(5),
    },
    {
      mandate_id: `${tp}_mandate_corp_travel_cart`, mandate_type: 'cart',
      account_id: ids.acme, agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      authorized_amount: 1850, used_amount: 1850, execution_count: 3, status: 'completed',
      currency: 'USD',
      mandate_data: { items: [{ type: 'flight', vendor: 'LATAM Airlines', amount: 890 }, { type: 'hotel', vendor: 'Hotel Fasano', amount: 840, nights: 2 }, { type: 'transport', vendor: 'Transfer service', amount: 120 }] },
      created_at: daysAgo(4),
    },
    {
      mandate_id: `${tp}_mandate_corp_travel_payment`, mandate_type: 'payment',
      account_id: ids.acme, agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      authorized_amount: 1850, used_amount: 1730, execution_count: 2, status: 'active',
      currency: 'USD',
      mandate_data: { gl_code: 'Travel-Sales', cost_center: 'LATAM Expansion', policy_result: 'all_passed', payment_handler: 'visa_agentpay', card_network: 'visa' },
      created_at: daysAgo(3),
    },

    // Scenario 5 — Bill pay recurring mandates (USD)
    {
      mandate_id: `${tp}_mandate_rent_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 2800, used_amount: 2800, execution_count: 1, status: 'completed',
      currency: 'USD',
      mandate_data: { bill_type: 'rent', priority: 'P0', frequency: 'monthly', payee: 'Landlord', auto_resume: true },
      metadata: { priority_tier: 'P0_essential' },
      created_at: daysAgo(6),
    },
    {
      mandate_id: `${tp}_mandate_electric_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 180, used_amount: 180, execution_count: 1, status: 'completed',
      currency: 'USD',
      mandate_data: { bill_type: 'electric', priority: 'P1', frequency: 'monthly', payee: 'Electric Co', deferred: true, deferred_until: 'paycheck_friday' },
      metadata: { priority_tier: 'P1_important' },
      created_at: daysAgo(6),
    },
    {
      mandate_id: `${tp}_mandate_internet_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 80, used_amount: 80, execution_count: 1, status: 'completed',
      currency: 'USD',
      mandate_data: { bill_type: 'internet', priority: 'P2', frequency: 'monthly', payee: 'ISP Corp' },
      metadata: { priority_tier: 'P2_discretionary' },
      created_at: daysAgo(6),
    },
    {
      mandate_id: `${tp}_mandate_netflix_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 15, used_amount: 15, execution_count: 1, status: 'completed',
      currency: 'USD',
      mandate_data: { bill_type: 'streaming', priority: 'P3', frequency: 'monthly', payee: 'Netflix' },
      metadata: { priority_tier: 'P3_deferrable' },
      created_at: daysAgo(6),
    },

    // Scenario 7 — Remittance recurring mandate
    {
      mandate_id: `${tp}_mandate_remittance_monthly`, mandate_type: 'payment',
      account_id: ids.maria, agent_id: ids.remittance_agent, agent_name: 'Remittance Optimizer Agent',
      authorized_amount: 500, used_amount: 500, execution_count: 2, status: 'active',
      mandate_data: { recipient: 'Elena Rodriguez (Mom)', destination_country: 'MX', delivery_deadline_day: 1, fx_optimization_window_days: 3, frequency: 'monthly' },
      metadata: { corridor: 'US-MX', settlement_rail: 'SPEI' },
      created_at: daysAgo(67),
    },

    // Scenario 6 — Gig payout daily mandate
    {
      mandate_id: `${tp}_mandate_gig_daily_payout`, mandate_type: 'payment',
      account_id: ids.rideplatform, agent_id: ids.payout_agent, agent_name: 'Smart Payout Agent',
      authorized_amount: 5000, used_amount: 3710, execution_count: 14, status: 'active',
      mandate_data: { payout_type: 'daily_gig_earnings', worker: 'Carlos Mendez', frequency: 'daily', allocation: { spending: '55%', tax: '25%', savings: '20%' } },
      created_at: daysAgo(15),
    },

    // Active mandate — next month's bills
    {
      mandate_id: `${tp}_mandate_march_bills`, mandate_type: 'intent',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 3075, used_amount: 0, execution_count: 0, status: 'active',
      mandate_data: { month: 'March 2026', bills: ['rent', 'electric', 'internet', 'netflix'], total_estimated: 3075 },
      created_at: hoursAgo(12),
    },

    // Scenario 9 — Per-vendor API budget mandates
    {
      mandate_id: `${tp}_mandate_openai_budget`, mandate_type: 'payment',
      account_id: ids.techstart, agent_id: ids.inference_agent, agent_name: 'Inference API Consumer',
      authorized_amount: 250, used_amount: 210, execution_count: 28241, status: 'active',
      mandate_data: { vendor: 'OpenAI', endpoint: '/v1/inference', budget_period: 'monthly', description: 'Monthly budget for GPT-4o inference API calls' },
      created_at: daysAgo(30),
    },
    {
      mandate_id: `${tp}_mandate_anthropic_budget`, mandate_type: 'payment',
      account_id: ids.techstart, agent_id: ids.inference_agent, agent_name: 'Inference API Consumer',
      authorized_amount: 150, used_amount: 130, execution_count: 4520, status: 'active',
      mandate_data: { vendor: 'Anthropic', endpoint: '/v1/inference', budget_period: 'monthly', description: 'Monthly budget for Claude inference calls' },
      created_at: daysAgo(30),
    },
    {
      mandate_id: `${tp}_mandate_reuters_license`, mandate_type: 'payment',
      account_id: ids.techstart, agent_id: ids.content_agent, agent_name: 'Content Access Agent',
      authorized_amount: 500, used_amount: 425, execution_count: 2833, status: 'active',
      mandate_data: { vendor: 'Reuters', endpoint: '/content/articles/:id', budget_period: 'monthly', description: 'Reuters full-text article access license' },
      created_at: daysAgo(30),
    },
    {
      mandate_id: `${tp}_mandate_apnews_feed`, mandate_type: 'payment',
      account_id: ids.techstart, agent_id: ids.content_agent, agent_name: 'Content Access Agent',
      authorized_amount: 300, used_amount: 280, execution_count: 56000, status: 'active',
      mandate_data: { vendor: 'AP News', endpoint: '/content/articles/:id/summary', budget_period: 'monthly', description: 'AP News summary data feed' },
      created_at: daysAgo(30),
    },
    {
      mandate_id: `${tp}_mandate_snowflake_compute`, mandate_type: 'payment',
      account_id: ids.techstart, agent_id: ids.data_pipeline_agent, agent_name: 'Data Pipeline Agent',
      authorized_amount: 180, used_amount: 165, execution_count: 4710, status: 'active',
      mandate_data: { vendor: 'Snowflake', endpoint: '/v1/compute', budget_period: 'monthly', description: 'Snowflake compute credits for ETL pipelines' },
      created_at: daysAgo(30),
    },
    {
      mandate_id: `${tp}_mandate_aws_bedrock`, mandate_type: 'payment',
      account_id: ids.techstart, agent_id: ids.data_pipeline_agent, agent_name: 'Data Pipeline Agent',
      authorized_amount: 120, used_amount: 110, execution_count: 4400, status: 'active',
      mandate_data: { vendor: 'AWS Bedrock', endpoint: '/v1/data/embeddings', budget_period: 'monthly', description: 'AWS Bedrock inference for data enrichment' },
      created_at: daysAgo(30),
    },
  ];

  const mandateIdMap: Record<string, string> = {};

  for (const m of mandates) {
    const { data: row, error } = await supabase.from('ap2_mandates').insert({
      tenant_id: tenantId,
      account_id: m.account_id,
      mandate_id: m.mandate_id,
      mandate_type: m.mandate_type,
      agent_id: m.agent_id,
      agent_name: m.agent_name,
      authorized_amount: m.authorized_amount,
      currency: (m as any).currency || 'USDC',
      used_amount: m.used_amount,
      execution_count: m.execution_count,
      mandate_data: m.mandate_data,
      status: m.status,
      metadata: m.metadata || {},
      created_at: m.created_at,
      expires_at: futureDate(30),
      completed_at: m.status === 'completed' ? m.created_at : null,
    }).select('id').single();

    if (error) {
      console.log(`  ! AP2 mandate failed: ${m.mandate_id} — ${error.message}`);
      continue;
    }

    mandateIdMap[m.mandate_id] = row.id;
    console.log(`  + ${m.mandate_id} (${m.mandate_type}, ${m.status})`);
  }

  // Patch corporate mandate chain links with DB UUIDs
  const intentDbId = mandateIdMap[`${tp}_mandate_corp_travel_intent`];
  const cartDbId = mandateIdMap[`${tp}_mandate_corp_travel_cart`];
  const paymentDbId = mandateIdMap[`${tp}_mandate_corp_travel_payment`];

  if (intentDbId && cartDbId && paymentDbId) {
    console.log('\n   Linking corporate mandate chain...');
    await supabase.from('ap2_mandates').update({
      mandate_data: { traveler: 'VP of Sales', destination: 'São Paulo', dates: 'Feb 12-14', purpose: 'Client meeting — $2M deal', chain: { type: 'root', child_id: cartDbId, child_mandate_id: `${tp}_mandate_corp_travel_cart` } },
    }).eq('id', intentDbId);

    await supabase.from('ap2_mandates').update({
      mandate_data: { items: [{ type: 'flight', vendor: 'LATAM Airlines', amount: 890 }, { type: 'hotel', vendor: 'Hotel Fasano', amount: 840, nights: 2 }, { type: 'transport', vendor: 'Transfer service', amount: 120 }], chain: { type: 'middle', parent_id: intentDbId, parent_mandate_id: `${tp}_mandate_corp_travel_intent`, child_id: paymentDbId, child_mandate_id: `${tp}_mandate_corp_travel_payment` } },
    }).eq('id', cartDbId);

    await supabase.from('ap2_mandates').update({
      mandate_data: { gl_code: 'Travel-Sales', cost_center: 'LATAM Expansion', policy_result: 'all_passed', payment_handler: 'visa_agentpay', card_network: 'visa', chain: { type: 'leaf', parent_id: cartDbId, parent_mandate_id: `${tp}_mandate_corp_travel_cart` } },
    }).eq('id', paymentDbId);

    console.log(`    + Intent (${intentDbId}) → Cart (${cartDbId}) → Payment (${paymentDbId})`);
  }

  // AP2 Mandate Executions
  console.log('\n   Creating mandate executions...');

  const executions = [
    { mandate_id: `${tp}_mandate_corp_travel_payment`, execution_index: 1, amount: 890, currency: 'USD', status: 'completed', created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_corp_travel_payment`, execution_index: 2, amount: 840, currency: 'USD', status: 'completed', created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_rent_recurring`, execution_index: 1, amount: 2800, currency: 'USD', status: 'completed', created_at: daysAgo(6) },
    { mandate_id: `${tp}_mandate_electric_recurring`, execution_index: 1, amount: 180, currency: 'USD', status: 'completed', created_at: daysAgo(4) },
    { mandate_id: `${tp}_mandate_internet_recurring`, execution_index: 1, amount: 80, currency: 'USD', status: 'completed', created_at: daysAgo(4) },
    { mandate_id: `${tp}_mandate_netflix_recurring`, execution_index: 1, amount: 15, currency: 'USD', status: 'completed', created_at: daysAgo(4) },
    { mandate_id: `${tp}_mandate_remittance_monthly`, execution_index: 1, amount: 380, currency: 'USDC', status: 'completed', created_at: daysAgo(7) },
    { mandate_id: `${tp}_mandate_remittance_monthly`, execution_index: 2, amount: 120, currency: 'USDC', status: 'completed', created_at: daysAgo(5) },
    // Scenario 6 — 14 daily gig payouts
    ...Array.from({ length: 14 }, (_, i) => ({
      mandate_id: `${tp}_mandate_gig_daily_payout`, execution_index: i + 1, amount: 180 + Math.round(Math.random() * 170), currency: 'USDC', status: 'completed' as const, created_at: daysAgo(i + 1),
    })),
    // Scenario 9 — Per-vendor budget mandate executions (3 recent per mandate)
    { mandate_id: `${tp}_mandate_openai_budget`, execution_index: 1, amount: 72, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_openai_budget`, execution_index: 2, amount: 68, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(2) },
    { mandate_id: `${tp}_mandate_openai_budget`, execution_index: 3, amount: 70, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(1) },
    { mandate_id: `${tp}_mandate_anthropic_budget`, execution_index: 1, amount: 45, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_anthropic_budget`, execution_index: 2, amount: 42, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(2) },
    { mandate_id: `${tp}_mandate_anthropic_budget`, execution_index: 3, amount: 43, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(1) },
    { mandate_id: `${tp}_mandate_reuters_license`, execution_index: 1, amount: 145, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_reuters_license`, execution_index: 2, amount: 140, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(2) },
    { mandate_id: `${tp}_mandate_reuters_license`, execution_index: 3, amount: 140, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(1) },
    { mandate_id: `${tp}_mandate_apnews_feed`, execution_index: 1, amount: 95, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_apnews_feed`, execution_index: 2, amount: 92, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(2) },
    { mandate_id: `${tp}_mandate_apnews_feed`, execution_index: 3, amount: 93, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(1) },
    { mandate_id: `${tp}_mandate_snowflake_compute`, execution_index: 1, amount: 56, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_snowflake_compute`, execution_index: 2, amount: 55, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(2) },
    { mandate_id: `${tp}_mandate_snowflake_compute`, execution_index: 3, amount: 54, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(1) },
    { mandate_id: `${tp}_mandate_aws_bedrock`, execution_index: 1, amount: 38, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_aws_bedrock`, execution_index: 2, amount: 36, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(2) },
    { mandate_id: `${tp}_mandate_aws_bedrock`, execution_index: 3, amount: 36, currency: 'USDC', status: 'completed' as const, created_at: daysAgo(1) },
  ];

  for (const exec of executions) {
    const dbMandateId = mandateIdMap[exec.mandate_id];
    if (!dbMandateId) continue;

    const { error } = await supabase.from('ap2_mandate_executions').insert({
      tenant_id: tenantId,
      mandate_id: dbMandateId,
      execution_index: exec.execution_index,
      amount: exec.amount,
      currency: exec.currency || 'USDC',
      status: exec.status,
      created_at: exec.created_at,
      completed_at: exec.status === 'completed' ? exec.created_at : null,
    });

    if (error) console.log(`  ! Execution failed: ${exec.mandate_id}#${exec.execution_index} — ${error.message}`);
    else console.log(`  + ${exec.mandate_id} #${exec.execution_index} ($${exec.amount})`);
  }

  // Historical AP2 executions (30-60 days ago) for dashboard trend comparison
  console.log('  + Adding historical AP2 executions for trend data...');
  const historicalAp2 = [
    { key: `${tp}_mandate_rent_recurring`, amount: 2800, currency: 'USD', created_at: daysAgo(36) },
    { key: `${tp}_mandate_electric_recurring`, amount: 180, currency: 'USD', created_at: daysAgo(35) },
    { key: `${tp}_mandate_internet_recurring`, amount: 80, currency: 'USD', created_at: daysAgo(35) },
    { key: `${tp}_mandate_openai_budget`, amount: 65, currency: 'USDC', created_at: daysAgo(34) },
    { key: `${tp}_mandate_anthropic_budget`, amount: 40, currency: 'USDC', created_at: daysAgo(34) },
    { key: `${tp}_mandate_reuters_license`, amount: 138, currency: 'USDC', created_at: daysAgo(34) },
    { key: `${tp}_mandate_apnews_feed`, amount: 90, currency: 'USDC', created_at: daysAgo(34) },
    { key: `${tp}_mandate_snowflake_compute`, amount: 52, currency: 'USDC', created_at: daysAgo(34) },
    { key: `${tp}_mandate_aws_bedrock`, amount: 35, currency: 'USDC', created_at: daysAgo(34) },
    { key: `${tp}_mandate_remittance_monthly`, amount: 500, currency: 'USDC', created_at: daysAgo(37) },
    { key: `${tp}_mandate_gig_daily_payout`, amount: 220, currency: 'USDC', created_at: daysAgo(38) },
    { key: `${tp}_mandate_gig_daily_payout`, amount: 195, currency: 'USDC', created_at: daysAgo(39) },
    { key: `${tp}_mandate_gig_daily_payout`, amount: 260, currency: 'USDC', created_at: daysAgo(40) },
    { key: `${tp}_mandate_gig_daily_payout`, amount: 210, currency: 'USDC', created_at: daysAgo(41) },
    { key: `${tp}_mandate_gig_daily_payout`, amount: 235, currency: 'USDC', created_at: daysAgo(42) },
    { key: `${tp}_mandate_corp_travel_payment`, amount: 750, currency: 'USD', created_at: daysAgo(45) },
  ];
  let histAp2Count = 0;
  for (const h of historicalAp2) {
    const dbId = mandateIdMap[h.key];
    if (!dbId) continue;
    const { error } = await supabase.from('ap2_mandate_executions').insert({
      tenant_id: tenantId,
      mandate_id: dbId,
      execution_index: 100 + histAp2Count,
      amount: h.amount,
      currency: h.currency,
      status: 'completed',
      created_at: h.created_at,
      completed_at: h.created_at,
    });
    if (!error) histAp2Count++;
  }
  console.log(`  + ${histAp2Count} historical AP2 executions (trend baseline)`);
  } // end AP2 guard

  // ──────────────────────────────────────────
  // 8. UCP CHECKOUT SESSIONS & ORDERS (Scenarios 1, 2, 4)
  // ──────────────────────────────────────────

  if (shouldSeed(scenarioFilter, 1, 2, 4)) {
  console.log('\n8. Creating UCP checkout sessions & orders...');

  const ucpSessions = [
    // Scenario 1 — Shopping: ACP-only (no UCP duplicates)
    // Scenario 2 — Travel per-vendor sessions (6 separate UCP checkouts, group: grp_bcn_trip)
    // 1. American Airlines (USD)
    {
      status: 'completed', currency: 'USD',
      line_items: [{ id: 'item_aa_flight', name: 'American Airlines RT — Dallas to Barcelona', description: '2 passengers, economy', quantity: 2, unit_price: 55500, total_price: 111000 }],
      totals: [{ type: 'subtotal', amount: 111000, label: 'Subtotal' }, { type: 'total', amount: 111000, label: 'Total' }],
      buyer: { email: 'david@demo-consumer.com', name: 'David Chen', phone: '+1-555-0202' },
      metadata: { scenario: 'anniversary_trip', agent: 'Hopper Travel Agent', merchant_name: 'American Airlines', checkout_group: 'grp_bcn_trip', price_optimized: true, savings: 86, price_watch_days: 9 },
      payment_config: { handlers: ['google_pay'] }, payment_handler: 'google_pay', payment_type: 'digital_wallet',
      created_at: daysAgo(8),
      order_status: 'confirmed',
    },
    // 2. Hotel Casa Camper (EUR)
    {
      status: 'completed', currency: 'EUR',
      line_items: [{ id: 'item_hotel_camper', name: 'Hotel Casa Camper — 5 nights', description: 'Superior room, El Born district', quantity: 5, unit_price: 26950, total_price: 134750 }],
      totals: [{ type: 'subtotal', amount: 134750, label: 'Subtotal' }, { type: 'total', amount: 134750, label: 'Total' }],
      buyer: { email: 'david@demo-consumer.com', name: 'David Chen' },
      metadata: { scenario: 'anniversary_trip', agent: 'Hopper Travel Agent', merchant_name: 'Hotel Casa Camper', checkout_group: 'grp_bcn_trip' },
      payment_config: { handlers: ['google_pay'] }, payment_handler: 'google_pay', payment_type: 'digital_wallet',
      created_at: daysAgo(8),
      order_status: 'confirmed',
    },
    // 3. OpenTable Barcelona (EUR)
    {
      status: 'completed', currency: 'EUR',
      line_items: [{ id: 'item_restaurants', name: 'Restaurant Reservations — 5 dinners', description: 'Pre-paid dining experiences', quantity: 5, unit_price: 9600, total_price: 48000 }],
      totals: [{ type: 'subtotal', amount: 48000, label: 'Subtotal' }, { type: 'total', amount: 48000, label: 'Total' }],
      buyer: { email: 'david@demo-consumer.com', name: 'David Chen' },
      metadata: { scenario: 'anniversary_trip', agent: 'Hopper Travel Agent', merchant_name: 'OpenTable Barcelona', checkout_group: 'grp_bcn_trip' },
      payment_config: { handlers: ['google_pay'] }, payment_handler: 'google_pay', payment_type: 'digital_wallet',
      created_at: daysAgo(8),
      order_status: 'confirmed',
    },
    // 4. Viator Barcelona (EUR)
    {
      status: 'completed', currency: 'EUR',
      line_items: [{ id: 'item_wine_tour', name: 'Penedès Wine Tour', description: 'Full-day wine country experience', quantity: 2, unit_price: 11500, total_price: 23000 }],
      totals: [{ type: 'subtotal', amount: 23000, label: 'Subtotal' }, { type: 'total', amount: 23000, label: 'Total' }],
      buyer: { email: 'david@demo-consumer.com', name: 'David Chen' },
      metadata: { scenario: 'anniversary_trip', agent: 'Hopper Travel Agent', merchant_name: 'Viator Barcelona', checkout_group: 'grp_bcn_trip' },
      payment_config: { handlers: ['google_pay'] }, payment_handler: 'google_pay', payment_type: 'digital_wallet',
      created_at: daysAgo(8),
      order_status: 'confirmed',
    },
    // 5. GetYourGuide (EUR)
    {
      status: 'completed', currency: 'EUR',
      line_items: [{ id: 'item_museum_tix', name: 'Sagrada Familia + Park Güell', description: 'Skip-the-line combo tickets', quantity: 2, unit_price: 4700, total_price: 9400 }],
      totals: [{ type: 'subtotal', amount: 9400, label: 'Subtotal' }, { type: 'total', amount: 9400, label: 'Total' }],
      buyer: { email: 'david@demo-consumer.com', name: 'David Chen' },
      metadata: { scenario: 'anniversary_trip', agent: 'Hopper Travel Agent', merchant_name: 'GetYourGuide', checkout_group: 'grp_bcn_trip' },
      payment_config: { handlers: ['google_pay'] }, payment_handler: 'google_pay', payment_type: 'digital_wallet',
      created_at: daysAgo(8),
      order_status: 'confirmed',
    },
    // 6. Welcome Pickups (EUR)
    {
      status: 'completed', currency: 'EUR',
      line_items: [{ id: 'item_airport_xfer', name: 'Airport Transfer — round-trip', description: 'BCN airport to El Born and back', quantity: 1, unit_price: 9000, total_price: 9000 }],
      totals: [{ type: 'subtotal', amount: 9000, label: 'Subtotal' }, { type: 'total', amount: 9000, label: 'Total' }],
      buyer: { email: 'david@demo-consumer.com', name: 'David Chen' },
      metadata: { scenario: 'anniversary_trip', agent: 'Hopper Travel Agent', merchant_name: 'Welcome Pickups', checkout_group: 'grp_bcn_trip' },
      payment_config: { handlers: ['google_pay'] }, payment_handler: 'google_pay', payment_type: 'digital_wallet',
      created_at: daysAgo(8),
      order_status: 'confirmed',
    },
  ];

  for (const sess of ucpSessions) {
    const { order_status, ...sessionData } = sess as any;
    const sessId = randomUUID();

    const { data: row, error } = await supabase.from('ucp_checkout_sessions').insert({
      id: sessId,
      tenant_id: tenantId,
      status: sessionData.status,
      currency: sessionData.currency,
      line_items: sessionData.line_items,
      totals: sessionData.totals,
      buyer: sessionData.buyer || null,
      shipping_address: sessionData.shipping_address || null,
      billing_address: sessionData.shipping_address || null,
      payment_config: sessionData.payment_config || { handlers: ['payos'] },
      payment_instruments: sessionData.status === 'completed'
        ? [{
            id: `pi_${randomUUID().slice(0, 8)}`,
            handler: sessionData.payment_handler || 'payos',
            type: sessionData.payment_type || 'wallet',
            ...(sessionData.card_network ? { network: sessionData.card_network, last4: '4242' } : {}),
          }]
        : [],
      messages: sessionData.messages || [],
      metadata: sessionData.metadata || {},
      created_at: sessionData.created_at,
      expires_at: futureDate(1),
    }).select('id').single();

    if (error) {
      console.log(`  ! UCP session failed: ${error.message}`);
      continue;
    }

    console.log(`  + UCP session (${sessionData.status})`);

    // Create order for completed sessions
    if (order_status && row) {
      const totalAmount = sessionData.totals.find((t: any) => t.type === 'total')?.amount || 0;

      const events = [
        { id: `evt_${randomUUID().slice(0, 8)}`, type: 'confirmed', timestamp: sessionData.created_at, description: 'Order confirmed' },
      ];
      if (order_status === 'shipped' || order_status === 'delivered') {
        events.push({ id: `evt_${randomUUID().slice(0, 8)}`, type: 'shipped', timestamp: daysAgo(1), description: 'Package shipped via DHL' });
      }

      const { error: orderErr } = await supabase.from('ucp_orders').insert({
        tenant_id: tenantId,
        checkout_id: row.id,
        status: order_status,
        currency: sessionData.currency,
        line_items: sessionData.line_items,
        totals: sessionData.totals,
        buyer: sessionData.buyer,
        shipping_address: sessionData.shipping_address || null,
        billing_address: sessionData.shipping_address || null,
        payment: { handler_id: 'payos', status: 'completed', amount: totalAmount, currency: sessionData.currency },
        events,
        metadata: sessionData.metadata,
        created_at: sessionData.created_at,
      });

      if (orderErr) console.log(`  ! UCP order failed: ${orderErr.message}`);
      else console.log(`  + UCP order (${order_status})`);
    }
  }

  // ──────────────────────────────────────────
  // 8b. UCP SETTLEMENTS (Story 55.4)
  // ──────────────────────────────────────────
  console.log('\n8b. Creating UCP settlements...');

  const ucpSettlements = [
    // Completed SPEI — travel scenario (8 days ago)
    {
      status: 'completed', corridor: 'spei',
      source_amount: 3220, source_currency: 'USDC',
      destination_amount: 55545, destination_currency: 'MXN',
      fx_rate: 17.25, fees: 32.20,
      recipient: { type: 'spei', clabe: '012345678901234567', name: 'Hoteles México SA de CV' },
      token: `ucp_tok_${tp}_travel_spei`,
      created_at: daysAgo(8), completed_at: daysAgo(8),
    },
    // Processing Pix — hotel booking (1 hour ago)
    {
      status: 'processing', corridor: 'pix',
      source_amount: 840, source_currency: 'USDC',
      destination_amount: 4998, destination_currency: 'BRL',
      fx_rate: 5.95, fees: 8.40,
      recipient: { type: 'pix', pix_key: 'hotel@fasano-demo.com.br', pix_key_type: 'email', name: 'Hotel Fasano São Paulo' },
      token: `ucp_tok_${tp}_hotel_pix`,
      estimated_completion: futureDate(0),
      created_at: hoursAgo(1),
    },
    // Deferred/auto — remittance (6 hours ago, deferred to rules engine)
    {
      status: 'deferred', corridor: 'auto',
      source_amount: 500, source_currency: 'USDC',
      destination_amount: 0, destination_currency: 'MXN',
      fx_rate: 0, fees: 5.00,
      recipient: { type: 'spei', clabe: '098765432109876543', name: 'Elena Rodriguez' },
      token: `ucp_tok_${tp}_remit_auto`,
      deferred_to_rules: true,
      created_at: hoursAgo(6),
    },
  ];

  for (const stl of ucpSettlements) {
    const { error } = await supabase.from('ucp_settlements').insert({
      tenant_id: tenantId,
      status: stl.status,
      corridor: stl.corridor,
      source_amount: stl.source_amount,
      source_currency: stl.source_currency,
      destination_amount: stl.destination_amount,
      destination_currency: stl.destination_currency,
      fx_rate: stl.fx_rate,
      fees: stl.fees,
      recipient: stl.recipient,
      token: stl.token,
      estimated_completion: stl.estimated_completion || null,
      completed_at: stl.completed_at || null,
      deferred_to_rules: stl.deferred_to_rules || false,
      created_at: stl.created_at,
    });

    if (error) console.log(`  ! UCP settlement failed: ${error.message}`);
    else console.log(`  + ${stl.corridor} settlement ($${stl.source_amount}, ${stl.status})`);
  }

  // 3rd UCP checkout session + order — Corporate travel São Paulo
  console.log('\n   Creating 3rd UCP order (corporate travel)...');

  const corpTravelSessId = randomUUID();
  const { data: corpSess, error: corpSessErr } = await supabase.from('ucp_checkout_sessions').insert({
    id: corpTravelSessId,
    tenant_id: tenantId,
    status: 'completed',
    currency: 'USD',
    line_items: [
      { id: 'item_corp_flight', name: 'LATAM Airlines — NYC to GRU RT', quantity: 1, unit_price: 89000, total_price: 89000 },
      { id: 'item_corp_hotel', name: 'Hotel Fasano São Paulo — 2 nights', quantity: 2, unit_price: 42000, total_price: 84000 },
      { id: 'item_corp_transport', name: 'Airport transfer + ground transport', quantity: 1, unit_price: 12000, total_price: 12000 },
    ],
    totals: [
      { type: 'subtotal', amount: 185000, label: 'Subtotal' },
      { type: 'total', amount: 185000, label: 'Total' },
    ],
    buyer: { email: 'vp.sales@acme-demo.com', name: 'VP of Sales' },
    payment_config: { handlers: ['visa_agentpay'] },
    payment_instruments: [{ id: `pi_${randomUUID().slice(0, 8)}`, handler: 'visa_agentpay', type: 'corporate_card', network: 'visa', last4: '8901' }],
    metadata: { scenario: 'corporate_travel', agent: 'Acme Corporate Travel Agent', cost_center: 'LATAM Expansion' },
    created_at: daysAgo(3),
    expires_at: futureDate(1),
  }).select('id').single();

  if (corpSessErr) {
    console.log(`  ! Corporate travel session failed: ${corpSessErr.message}`);
  } else if (corpSess) {
    const { error: corpOrderErr } = await supabase.from('ucp_orders').insert({
      tenant_id: tenantId,
      checkout_id: corpSess.id,
      status: 'confirmed',
      currency: 'USD',
      line_items: [
        { id: 'item_corp_flight', name: 'LATAM Airlines — NYC to GRU RT', quantity: 1, unit_price: 89000, total_price: 89000 },
        { id: 'item_corp_hotel', name: 'Hotel Fasano São Paulo — 2 nights', quantity: 2, unit_price: 42000, total_price: 84000 },
        { id: 'item_corp_transport', name: 'Airport transfer + ground transport', quantity: 1, unit_price: 12000, total_price: 12000 },
      ],
      totals: [
        { type: 'subtotal', amount: 185000, label: 'Subtotal' },
        { type: 'total', amount: 185000, label: 'Total' },
      ],
      buyer: { email: 'vp.sales@acme-demo.com', name: 'VP of Sales' },
      payment: { handler_id: 'payos', status: 'completed', amount: 185000, currency: 'USD' },
      events: [
        { id: `evt_${randomUUID().slice(0, 8)}`, type: 'confirmed', timestamp: daysAgo(3), description: 'Corporate travel booking confirmed' },
      ],
      metadata: { scenario: 'corporate_travel', cost_center: 'LATAM Expansion', gl_code: 'Travel-Sales' },
      created_at: daysAgo(3),
    });

    if (corpOrderErr) console.log(`  ! Corporate travel order failed: ${corpOrderErr.message}`);
    else console.log(`  + UCP order (corporate travel, confirmed)`);
  }

  // Historical UCP sessions (30-60 days ago) for dashboard trend comparison
  console.log('  + Adding historical UCP sessions for trend data...');
  const historicalUcp = [
    { totals: [{ type: 'subtotal', amount: 89500, label: 'Subtotal' }, { type: 'total', amount: 95000, label: 'Total' }], currency: 'USD', created_at: daysAgo(36) },
    { totals: [{ type: 'subtotal', amount: 118000, label: 'Subtotal' }, { type: 'total', amount: 125000, label: 'Total' }], currency: 'USD', created_at: daysAgo(42) },
    { totals: [{ type: 'subtotal', amount: 95000, label: 'Subtotal' }, { type: 'total', amount: 100000, label: 'Total' }], currency: 'EUR', created_at: daysAgo(50) },
  ];
  let histUcpCount = 0;
  for (const h of historicalUcp) {
    const { error } = await supabase.from('ucp_checkout_sessions').insert({
      id: randomUUID(),
      tenant_id: tenantId,
      status: 'completed',
      currency: h.currency,
      totals: h.totals,
      line_items: [{ id: `hist_${randomUUID().slice(0, 8)}`, name: 'Historical order', quantity: 1, unit_price: h.totals[0].amount, total_price: h.totals[0].amount }],
      payment_config: { handlers: ['payos'] },
      payment_instruments: [{ id: `pi_hist_${randomUUID().slice(0, 8)}`, handler: 'payos', type: 'wallet' }],
      messages: [],
      metadata: { historical: true },
      created_at: h.created_at,
      expires_at: futureDate(1),
    });
    if (error) console.log(`  ! Historical UCP insert failed: ${error.message}`);
    else histUcpCount++;
  }
  console.log(`  + ${histUcpCount}/${historicalUcp.length} historical UCP sessions (trend baseline)`);
  } // end UCP guard

  // ──────────────────────────────────────────
  // 9. COMPLIANCE FLAGS (5 records)
  // ──────────────────────────────────────────

  if (shouldSeed(scenarioFilter, 1, 2, 6, 7, 9)) {
  console.log('\n9. Creating compliance flags...');

  const complianceFlags = [
    {
      flag_type: 'transaction', risk_level: 'high', status: 'open',
      transfer_id: transferIds[0] || null,
      reason_code: 'velocity_check',
      reasons: ['High transaction velocity — 3 purchases in 48 hours', 'New merchant relationship', 'Amount above typical consumer pattern'],
      description: 'Shopping agent made 3 purchases in rapid succession across new merchants.',
      ai_analysis: { risk_score: 72, risk_explanation: 'Pattern consistent with legitimate shopping agent behavior, but velocity warrants review.', confidence_level: 85 },
    },
    {
      flag_type: 'transaction', risk_level: 'medium', status: 'pending_review',
      transfer_id: transferIds[3] || null, // Travel flight
      reason_code: 'cross_border_amount',
      reasons: ['Cross-border transaction > $500', 'First transaction to this merchant'],
      description: 'Cross-border flight purchase to new airline merchant.',
      ai_analysis: { risk_score: 45, risk_explanation: 'Standard travel booking pattern. Agent verified at KYA Tier 2.', confidence_level: 90 },
    },
    {
      flag_type: 'account', risk_level: 'low', status: 'resolved',
      account_id: ids.carlos,
      reason_code: 'new_account_high_volume',
      reasons: ['14 payouts received in 14 days', 'Gig economy pattern detected'],
      description: 'New gig worker account with consistent daily payouts.',
      ai_analysis: { risk_score: 18, risk_explanation: 'Typical gig economy payout pattern. Auto-resolved.', confidence_level: 95 },
    },
    {
      flag_type: 'transaction', risk_level: 'critical', status: 'escalated',
      transfer_id: transferIds[transferIds.length - 1] || null,
      reason_code: 'sanctions_potential_match',
      reasons: ['Name similarity to OFAC list entry (62% match)', 'Geographic risk — high-risk corridor', 'Requires senior compliance review'],
      description: 'Potential sanctions match on pending contractor payment.',
      ai_analysis: { risk_score: 88, risk_explanation: 'Fuzzy name match against OFAC SDN list. Manual review required.', confidence_level: 78 },
    },
    {
      flag_type: 'pattern', risk_level: 'medium', status: 'under_investigation',
      reason_code: 'remittance_split_pattern',
      reasons: ['Remittance split into two transfers ($380 + $120)', 'Could indicate structuring or legitimate low-balance handling'],
      description: 'Agent split monthly remittance due to insufficient balance.',
      ai_analysis: { risk_score: 42, risk_explanation: 'Agent documented low-balance reason. Split pattern matches Balance Shield feature. Likely legitimate.', confidence_level: 82 },
    },
    // Scenario 9 — Budget threshold alerts
    {
      flag_type: 'account', risk_level: 'high', status: 'open',
      account_id: ids.techstart,
      reason_code: 'budget_threshold_daily_93',
      reasons: ['Data Pipeline Agent consumed 93% of daily budget ($28/$30)', 'Monthly: $275/$300 (92%)', 'Projected to exceed daily limit within 2 hours', 'Vendor: Snowflake compute — 47 calls remaining'],
      description: 'Data Pipeline Agent approaching daily spend limit. Auto-pause recommended.',
      ai_analysis: { risk_score: 78, risk_explanation: 'Agent burn rate exceeds sustainable daily pace. At current velocity, daily limit will be reached by 4:30 PM. Recommend throttling or pausing non-critical pipelines.', confidence_level: 92 },
    },
    {
      flag_type: 'account', risk_level: 'medium', status: 'pending_review',
      account_id: ids.techstart,
      reason_code: 'budget_threshold_monthly_85',
      reasons: ['Content Access Agent at 85% of monthly budget ($850/$1000)', '15 days remaining in billing period', 'Trending to exceed monthly limit by day 24'],
      description: 'Content Access Agent monthly budget tracking ahead of pace.',
      ai_analysis: { risk_score: 52, risk_explanation: 'Monthly burn rate slightly above linear pace. Content scraping patterns show seasonal spike. Consider requesting budget increase or prioritizing high-value content.', confidence_level: 88 },
    },
    {
      flag_type: 'account', risk_level: 'low', status: 'resolved',
      account_id: ids.techstart,
      reason_code: 'budget_threshold_monthly_84',
      reasons: ['Inference API Consumer at 84% of monthly budget ($420/$500)', 'Consistent usage pattern — within expected range'],
      description: 'Inference agent monthly budget on track. Auto-resolved — usage within normal band.',
      ai_analysis: { risk_score: 22, risk_explanation: 'Usage pattern consistent with previous months. 84% utilization at day 22 is within expected range. No action needed.', confidence_level: 95 },
    },
  ];

  for (const flag of complianceFlags) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (['high', 'critical'].includes(flag.risk_level) ? 7 : 14));

    const { error } = await supabase.from('compliance_flags').insert({
      tenant_id: tenantId,
      flag_type: flag.flag_type,
      risk_level: flag.risk_level,
      status: flag.status,
      account_id: flag.account_id || null,
      transfer_id: flag.transfer_id || null,
      reason_code: flag.reason_code,
      reasons: flag.reasons,
      description: flag.description,
      ai_analysis: flag.ai_analysis,
      due_date: dueDate.toISOString(),
    });

    if (error) console.log(`  ! Compliance flag failed: ${error.message}`);
    else console.log(`  + ${flag.risk_level} — ${flag.reason_code}`);
  }
  } // end compliance guard

  // ──────────────────────────────────────────
  // 10. APPROVAL WORKFLOWS (3 records)
  // ──────────────────────────────────────────

  if (shouldSeed(scenarioFilter, 1, 5, 7)) {
  console.log('\n10. Creating approval workflows...');

  const approvals = [
    // Scenario 1 — First merchant confirmation (approved)
    {
      wallet_id: ids.maria_wallet, agent_id: ids.shopping_agent,
      protocol: 'acp', amount: 407.81, currency: 'USD',
      recipient: { name: 'Global Retail Co', type: 'merchant', merchant_id: 'merch_global_retail' },
      payment_context: { scenario: 'birthday_gift', reason: 'first_time_merchant', item: 'Tissot PRX watch' },
      status: 'approved', decided_at: hoursAgo(2), decision_reason: 'Consumer confirmed via push notification',
      requested_by_type: 'agent', requested_by_id: ids.shopping_agent, requested_by_name: 'AI Shopping Agent',
    },
    // Scenario 5 — Bill split approval (approved)
    {
      wallet_id: ids.david_wallet, agent_id: ids.billpay_agent,
      protocol: 'ap2', amount: 380, currency: 'USDC',
      recipient: { name: 'Elena Rodriguez', type: 'person', relationship: 'family' },
      payment_context: { scenario: 'remittance_split', reason: 'insufficient_balance', original_amount: 500, remaining: 120 },
      status: 'approved', decided_at: daysAgo(7), decision_reason: 'Maria approved split payment',
      requested_by_type: 'agent', requested_by_id: ids.remittance_agent, requested_by_name: 'Remittance Optimizer Agent',
    },
    // Pending approval — headphones (first-time merchant)
    {
      wallet_id: ids.maria_wallet, agent_id: ids.shopping_agent,
      protocol: 'acp', amount: 379.54, currency: 'USD',
      recipient: { name: 'AudioTech Store', type: 'merchant', merchant_id: 'merch_audiotech' },
      payment_context: { scenario: 'shopping', reason: 'first_time_merchant', item: 'Sony WH-1000XM5' },
      status: 'pending',
      requested_by_type: 'agent', requested_by_id: ids.shopping_agent, requested_by_name: 'AI Shopping Agent',
    },
  ];

  for (const approval of approvals) {
    const { error } = await supabase.from('agent_payment_approvals').insert({
      tenant_id: tenantId,
      wallet_id: approval.wallet_id,
      agent_id: approval.agent_id,
      protocol: approval.protocol,
      amount: approval.amount,
      currency: approval.currency,
      recipient: approval.recipient,
      payment_context: approval.payment_context,
      status: approval.status,
      decided_at: approval.decided_at || null,
      decision_reason: approval.decision_reason || null,
      requested_by_type: approval.requested_by_type,
      requested_by_id: approval.requested_by_id,
      requested_by_name: approval.requested_by_name,
      expires_at: futureDate(1),
    });

    if (error) console.log(`  ! Approval failed: ${error.message}`);
    else console.log(`  + ${approval.protocol} approval (${approval.status}, $${approval.amount})`);
  }
  } // end approvals guard

  // ──────────────────────────────────────────
  // 11. SETTLEMENT RULES (2 rules + executions)
  // ──────────────────────────────────────────

  if (shouldSeed(scenarioFilter, 3, 6)) {
  console.log('\n11. Creating settlement rules...');

  const settlementRules = [
    {
      name: 'Daily USDC Sweep', description: 'Sweep x402 revenue to treasury daily at midnight',
      trigger_type: 'schedule', trigger_config: { cron: '0 0 * * *', timezone: 'America/New_York' },
      settlement_rail: 'usdc', settlement_priority: 'standard',
      minimum_amount: 100, minimum_currency: 'USD',
      enabled: true, priority: 10,
      metadata: { scenario: 'api_monetization', applies_to: 'x402_revenue' },
    },
    {
      name: 'Threshold Offramp — BRL via Pix', description: 'Auto-offramp to BRL when balance exceeds $5,000',
      trigger_type: 'threshold', trigger_config: { balance_above: 5000, currency: 'USDC', target_currency: 'BRL' },
      settlement_rail: 'pix', settlement_priority: 'expedited',
      minimum_amount: 1000, maximum_amount: 50000,
      enabled: true, priority: 20,
      metadata: { scenario: 'gig_payout', corridor: 'US-BR' },
    },
  ];

  for (const rule of settlementRules) {
    const { data: row, error } = await supabase.from('settlement_rules').insert({
      tenant_id: tenantId,
      wallet_id: ids.acme_treasury,
      name: rule.name,
      description: rule.description,
      trigger_type: rule.trigger_type,
      trigger_config: rule.trigger_config,
      settlement_rail: rule.settlement_rail,
      settlement_priority: rule.settlement_priority,
      minimum_amount: rule.minimum_amount,
      minimum_currency: rule.minimum_currency || 'USD',
      maximum_amount: rule.maximum_amount || null,
      maximum_currency: rule.maximum_amount ? 'USD' : null,
      enabled: rule.enabled,
      priority: rule.priority,
      metadata: rule.metadata,
    }).select('id').single();

    if (error) {
      console.log(`  ! Settlement rule failed: ${rule.name} — ${error.message}`);
      continue;
    }

    console.log(`  + ${rule.name}`);

    // Add execution history
    if (row) {
      const execStatuses = ['completed', 'completed', 'completed', 'completed', 'skipped'];
      for (let i = 0; i < execStatuses.length; i++) {
        await supabase.from('settlement_rule_executions').insert({
          tenant_id: tenantId,
          rule_id: row.id,
          status: execStatuses[i],
          trigger_reason: rule.trigger_type === 'schedule' ? 'Scheduled daily sweep' : 'Balance threshold exceeded',
          trigger_context: { balance_at_trigger: 5000 + Math.round(Math.random() * 3000), timestamp: daysAgo(i + 1) },
          amount: execStatuses[i] === 'skipped' ? null : 800 + Math.round(Math.random() * 2000),
          currency: 'USD',
          settlement_rail: rule.settlement_rail,
          started_at: daysAgo(i + 1),
          completed_at: execStatuses[i] !== 'skipped' ? daysAgo(i + 1) : null,
        });
      }
      console.log(`    + 5 execution history records`);
    }
  }
  } // end settlement rules guard

  // ──────────────────────────────────────────
  // 12. CONNECTED ACCOUNTS
  // ──────────────────────────────────────────
  console.log('\n12. Creating connected accounts...');

  const connectedAccounts = [
    { handlerType: 'stripe', handlerName: 'Stripe — Merchant Payments', metadata: { account_id: 'acct_demo_stripe', country: 'US' } },
    { handlerType: 'circle', handlerName: 'Circle — USDC Settlement', metadata: { entity_id: 'entity_demo_circle', currencies: ['USDC', 'EURC'] } },
    { handlerType: 'payos_native', handlerName: 'Sly Native — Pix/SPEI', metadata: { pix_enabled: true, spei_enabled: true } },
  ];

  for (const ca of connectedAccounts) {
    const { data: existing } = await supabase.from('connected_accounts').select('id')
      .eq('tenant_id', tenantId).eq('handler_type', ca.handlerType).eq('handler_name', ca.handlerName).maybeSingle();
    if (existing) { console.log(`  = ${ca.handlerName} (exists)`); continue; }

    const { error } = await supabase.from('connected_accounts').insert({
      tenant_id: tenantId,
      handler_type: ca.handlerType,
      handler_name: ca.handlerName,
      credentials_encrypted: Buffer.from(JSON.stringify({ placeholder: true })).toString('base64'),
      credentials_key_id: 'v1-demo',
      status: 'active',
      last_verified_at: new Date().toISOString(),
      metadata: ca.metadata,
    });

    if (error) console.log(`  ! Connected account failed: ${error.message}`);
    else console.log(`  + ${ca.handlerName}`);
  }

  // ──────────────────────────────────────────
  // 13. STREAMS (salary + contractor)
  // ──────────────────────────────────────────
  console.log('\n13. Creating payment streams...');

  const streams = [
    { sender: 'acme', senderName: 'Acme Corp', receiver: 'carlos', receiverName: 'Carlos Mendez', monthly: 3200, status: 'active' },
    { sender: 'acme', senderName: 'Acme Corp', receiver: 'maria', receiverName: 'Maria Rodriguez', monthly: 2500, status: 'active' },
    { sender: 'rideplatform', senderName: 'RideMax Platform', receiver: 'carlos', receiverName: 'Carlos Mendez', monthly: 4800, status: 'paused' },
  ];

  for (const s of streams) {
    const flowRate = s.monthly / (30 * 24 * 60 * 60);
    const { error } = await supabase.from('streams').insert({
      tenant_id: tenantId,
      sender_account_id: ids[s.sender],
      sender_account_name: s.senderName,
      receiver_account_id: ids[s.receiver],
      receiver_account_name: s.receiverName,
      flow_rate_per_second: flowRate,
      flow_rate_per_month: s.monthly,
      currency: 'USDC',
      status: s.status,
      initiated_by_type: 'user',
      initiated_by_id: ids[s.sender],
      initiated_by_name: s.senderName,
      managed_by_type: 'user',
      managed_by_id: ids[s.sender],
      managed_by_name: s.senderName,
    });

    if (error) console.log(`  ! Stream failed: ${error.message}`);
    else console.log(`  + ${s.senderName} -> ${s.receiverName} ($${s.monthly}/mo, ${s.status})`);
  }

  return { transferCount, accountCount: accounts.length, agentCount: agents.length, walletCount: wallets.length };
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('  Sly Demo Scenario Seed Script (Epic 55)');
  console.log('='.repeat(60));

  const { tenantId: specifiedId, reset, scenarios } = parseArgs();
  const tenantId = await resolveTenant(specifiedId);

  if (scenarios.length > 0) {
    console.log(`Scenario filter: ${scenarios.join(', ')}`);
  }

  if (reset) {
    await resetDemoData(tenantId);
  }

  const stats = await seedDemoScenarios(tenantId, scenarios);

  console.log('\n' + '='.repeat(60));
  console.log('  Seeding Complete!');
  console.log('='.repeat(60));
  console.log(`
  Accounts:          ${stats.accountCount}
  Agents:            ${stats.agentCount}
  Wallets:           ${stats.walletCount}
  Transfers:         ${stats.transferCount}
  x402 Endpoints:    8
  ACP Checkouts:     11
  AP2 Mandates:      10
  UCP Sessions:      5 (incl. corporate travel)
  UCP Settlements:   4
  UCP Orders:        3
  Compliance Flags:  5
  Approvals:         3
  Settlement Rules:  2
  Connected Accounts: 3
  Streams:           3

  Scenarios covered:
    1. Shopping Agent (ACP only)
    2. Travel Itinerary (ACP + UCP)
    3. API Monetization (x402)
    4. Corporate Travel (AP2 + ACP)
    5. Bill Pay (AP2)
    6. Gig Payout (Core transfers)
    7. Remittance (AP2 + FX)
    8. Media/Publishing (x402)
    9. Agent Limits / ClawdBot (x402 + AP2)

  Dashboard URLs:
    http://localhost:3000/dashboard
    http://localhost:3000/dashboard/agentic-payments
    http://localhost:3000/dashboard/transfers
    http://localhost:3000/dashboard/wallets
    http://localhost:3000/dashboard/agents
  `);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
