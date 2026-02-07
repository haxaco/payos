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

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant-id' && args[i + 1]) tenantId = args[++i];
    if (args[i] === '--reset') reset = true;
  }

  return { tenantId, reset };
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

async function seedDemoScenarios(tenantId: string) {
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
    { key: 'shopping_agent', accountKey: 'maria', name: 'Perplexity Shopping Agent', description: 'AI shopping assistant for product discovery and checkout', type: 'payment', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 4520.75, totalTransactions: 32 },
    // Scenario 2 — Travel Agent
    { key: 'travel_agent', accountKey: 'david', name: 'Hopper Travel Agent', description: 'AI travel planner with multi-vendor booking capability', type: 'payment', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 12840.00, totalTransactions: 8 },
    // Scenario 3 — Inference API Consumer
    { key: 'inference_agent', accountKey: 'techstart', name: 'Inference API Consumer', description: 'AI agent consuming pay-per-call inference APIs', type: 'custom', kyaTier: 1, kyaStatus: 'verified', x402Enabled: true, totalVolume: 847.23, totalTransactions: 282410 },
    // Scenario 3/8 — Content Scraper
    { key: 'content_agent', accountKey: 'techstart', name: 'Content Access Agent', description: 'Licensed content access agent for media APIs', type: 'custom', kyaTier: 2, kyaStatus: 'verified', x402Enabled: true, totalVolume: 1234.56, totalTransactions: 61728 },
    // Scenario 4 — Corporate Travel Agent
    { key: 'corp_travel_agent', accountKey: 'acme', name: 'Acme Corporate Travel Agent', description: 'Corporate travel booking with policy enforcement', type: 'treasury', kyaTier: 3, kyaStatus: 'verified', x402Enabled: false, totalVolume: 45200.00, totalTransactions: 24 },
    // Scenario 5 — Bill Pay Agent
    { key: 'billpay_agent', accountKey: 'david', name: 'Smart Bill Pay Agent', description: 'Neobank bill prioritization and auto-pay agent', type: 'payment', kyaTier: 1, kyaStatus: 'verified', x402Enabled: false, totalVolume: 8750.00, totalTransactions: 47 },
    // Scenario 6 — Smart Payout Agent
    { key: 'payout_agent', accountKey: 'rideplatform', name: 'Smart Payout Agent', description: 'Gig economy auto-allocation payout agent', type: 'treasury', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 156000.00, totalTransactions: 2340 },
    // Scenario 7 — Remittance Agent
    { key: 'remittance_agent', accountKey: 'maria', name: 'Remittance Optimizer Agent', description: 'FX-optimized recurring remittance agent', type: 'payment', kyaTier: 2, kyaStatus: 'verified', x402Enabled: false, totalVolume: 6000.00, totalTransactions: 12 },
  ];

  for (const agent of agents) {
    ids[agent.key] = await upsertAgent(tenantId, ids[agent.accountKey], agent);
    console.log(`  + ${agent.name} (KYA ${agent.kyaTier})`);
  }

  // ──────────────────────────────────────────
  // 3. WALLETS (10 wallets with spending policies)
  // ──────────────────────────────────────────
  console.log('\n3. Creating wallets...');

  const wallets = [
    // Enterprise treasury
    { key: 'acme_treasury', accountKey: 'acme', name: 'Acme Treasury', balance: 250000, purpose: 'Main corporate treasury', spendingPolicy: { daily_limit: 50000, monthly_limit: 500000, requires_approval_above: 10000 } },
    // x402 provider revenue wallet
    { key: 'acme_x402_revenue', accountKey: 'acme', name: 'x402 Revenue Wallet', balance: 48230.42, purpose: 'x402 micropayment revenue collection' },
    // Inference consumer wallet
    { key: 'techstart_ops', accountKey: 'techstart', name: 'TechStartup Operations', balance: 5000, purpose: 'Agent operations wallet', spendingPolicy: { daily_limit: 200, per_transaction_limit: 1 } },
    // Shopping consumer wallet
    { key: 'maria_wallet', accountKey: 'maria', name: 'Maria Personal Wallet', balance: 1200, purpose: 'Shopping and remittance', spendingPolicy: { daily_limit: 500, monthly_limit: 2000 } },
    // Travel consumer wallet
    { key: 'david_wallet', accountKey: 'david', name: 'David Personal Wallet', balance: 4500, purpose: 'Travel and bill pay', spendingPolicy: { daily_limit: 4000, monthly_limit: 8000, requires_approval_above: 2000 } },
    // Gig worker wallets (tax, savings, spending)
    { key: 'carlos_spending', accountKey: 'carlos', name: 'Carlos Spending', balance: 1680, purpose: 'Instant payout spending wallet' },
    { key: 'carlos_tax', accountKey: 'carlos', name: 'Carlos Tax Reserve', balance: 14400, purpose: 'Tax reserve — locked', spendingPolicy: { locked: true, unlock_date: '2026-04-15' } },
    { key: 'carlos_savings', accountKey: 'carlos', name: 'Carlos Emergency Savings', balance: 7200, purpose: 'Emergency savings with friction' },
    // Corporate travel wallet
    { key: 'acme_travel', accountKey: 'acme', name: 'Acme Travel Budget', balance: 75000, purpose: 'Corporate travel expenses', spendingPolicy: { per_trip_limit: 5000, hotel_per_night_max: 500, class: 'economy' } },
    // Remittance sender wallet
    { key: 'maria_remittance', accountKey: 'maria', name: 'Maria Remittance Fund', balance: 650, purpose: 'Monthly remittance to family' },
  ];

  for (const w of wallets) {
    ids[w.key] = await upsertWallet(tenantId, ids[w.accountKey], w);
    console.log(`  + ${w.name} ($${w.balance.toLocaleString()})`);
  }

  // ──────────────────────────────────────────
  // 4. TRANSFERS (50+ across 30 days)
  // ──────────────────────────────────────────
  console.log('\n4. Creating transfers...');

  const transferDefs = [
    // Scenario 1 — Shopping completed purchase
    { from: 'maria', to: 'merchant', amount: 299, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Tissot PRX watch purchase (ACP checkout)', created: daysAgo(2), initiatorType: 'agent', initiatorId: 'shopping_agent', initiatorName: 'Perplexity Shopping Agent' },
    { from: 'maria', to: 'merchant', amount: 45.99, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Leather watch strap purchase', created: daysAgo(5), initiatorType: 'agent', initiatorId: 'shopping_agent', initiatorName: 'Perplexity Shopping Agent' },
    { from: 'maria', to: 'merchant', amount: 89.00, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Running shoes — Nike Pegasus 41', created: daysAgo(12), initiatorType: 'agent', initiatorId: 'shopping_agent', initiatorName: 'Perplexity Shopping Agent' },

    // Scenario 2 — Travel multi-vendor
    { from: 'david', to: 'merchant', amount: 680, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'LATAM Airlines — round-trip flight (BCN)', created: daysAgo(8), initiatorType: 'agent', initiatorId: 'travel_agent', initiatorName: 'Hopper Travel Agent' },
    { from: 'david', to: 'merchant', amount: 1680, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Hotel Casa Camper — 5 nights Barcelona', created: daysAgo(8), initiatorType: 'agent', initiatorId: 'travel_agent', initiatorName: 'Hopper Travel Agent' },
    { from: 'david', to: 'merchant', amount: 560, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Restaurant bookings — 5 dinners Barcelona', created: daysAgo(8), initiatorType: 'agent', initiatorId: 'travel_agent', initiatorName: 'Hopper Travel Agent' },
    { from: 'david', to: 'merchant', amount: 450, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Penedès wine tour — 2 guests', created: daysAgo(8), initiatorType: 'agent', initiatorId: 'travel_agent', initiatorName: 'Hopper Travel Agent' },
    { from: 'david', to: 'merchant', amount: 350, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Sagrada Familia + Park Güell tickets', created: daysAgo(8), initiatorType: 'agent', initiatorId: 'travel_agent', initiatorName: 'Hopper Travel Agent' },

    // Scenario 4 — Corporate travel
    { from: 'acme', to: 'merchant', amount: 680, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'LATAM Airlines — VP Sales São Paulo RT', created: daysAgo(3), initiatorType: 'agent', initiatorId: 'corp_travel_agent', initiatorName: 'Acme Corporate Travel Agent' },
    { from: 'acme', to: 'merchant', amount: 840, currency: 'USDC', status: 'completed', type: 'cross_border', desc: 'Hotel Fasano — 2 nights São Paulo', created: daysAgo(3), initiatorType: 'agent', initiatorId: 'corp_travel_agent', initiatorName: 'Acme Corporate Travel Agent' },
    { from: 'acme', to: 'merchant', amount: 120, currency: 'USDC', status: 'processing', type: 'cross_border', desc: 'Ground transport São Paulo', created: daysAgo(1), initiatorType: 'agent', initiatorId: 'corp_travel_agent', initiatorName: 'Acme Corporate Travel Agent' },

    // Scenario 5 — Bill pay
    { from: 'david', to: 'merchant', amount: 1200, currency: 'USDC', status: 'completed', type: 'internal', desc: 'Rent payment — Feb 2026', created: daysAgo(6), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },
    { from: 'david', to: 'merchant', amount: 180, currency: 'USDC', status: 'completed', type: 'internal', desc: 'Electric bill — deferred, paid on Friday', created: daysAgo(4), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },
    { from: 'david', to: 'merchant', amount: 80, currency: 'USDC', status: 'completed', type: 'internal', desc: 'Internet bill — deferred, paid on Friday', created: daysAgo(4), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },
    { from: 'david', to: 'merchant', amount: 15, currency: 'USDC', status: 'completed', type: 'internal', desc: 'Netflix subscription — deferred, paid on Friday', created: daysAgo(4), initiatorType: 'agent', initiatorId: 'billpay_agent', initiatorName: 'Smart Bill Pay Agent' },

    // Scenario 6 — Gig payouts (multiple daily payouts over 2 weeks)
    ...Array.from({ length: 14 }, (_, i) => ({
      from: 'rideplatform', to: 'carlos', amount: 1800 + Math.round(Math.random() * 600), currency: 'USDC', status: 'completed' as const, type: 'internal' as const,
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
  ];

  for (const ep of x402Endpoints) {
    const { error } = await supabase.from('x402_endpoints').insert({
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
    });

    if (error) console.log(`  ! x402 endpoint failed: ${ep.name} — ${error.message}`);
    else console.log(`  + ${ep.name} ($${ep.base_price}/call, ${ep.total_calls.toLocaleString()} calls)`);
  }

  // ──────────────────────────────────────────
  // 6. ACP CHECKOUTS (Scenarios 1, 2, 4)
  // ──────────────────────────────────────────
  console.log('\n6. Creating ACP checkouts...');

  const acpCheckouts = [
    // Scenario 1 — Shopping Agent "Birthday Gift"
    {
      checkout_id: 'chk_tissot_watch', session_id: 'sess_shop_001',
      agent_id: ids.shopping_agent, agent_name: 'Perplexity Shopping Agent',
      customer_id: 'cust_maria', customer_email: 'maria@demo-consumer.com',
      account_id: ids.maria, merchant_id: 'merch_global_retail', merchant_name: 'Global Retail Co',
      merchant_url: 'https://globalretail-demo.com',
      subtotal: 299, tax_amount: 26.16, shipping_amount: 0, discount_amount: 0, total_amount: 325.16,
      status: 'completed', payment_method: 'wallet',
      transfer_id: transferIds[0] || null,
      checkout_data: { scenario: 'birthday_gift', policy_check: 'passed', auto_approved: true },
      created_at: daysAgo(2),
      items: [
        { item_id: 'tissot_prx_001', name: 'Tissot PRX Powermatic 80', description: 'Swiss automatic watch, 40mm, blue dial', quantity: 1, unit_price: 299, total_price: 299, image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200' },
      ],
    },
    {
      checkout_id: 'chk_shoes_nike', session_id: 'sess_shop_002',
      agent_id: ids.shopping_agent, agent_name: 'Perplexity Shopping Agent',
      customer_id: 'cust_maria', customer_email: 'maria@demo-consumer.com',
      account_id: ids.maria, merchant_id: 'merch_global_retail', merchant_name: 'Global Retail Co',
      subtotal: 89, tax_amount: 7.79, shipping_amount: 5.99, total_amount: 102.78,
      status: 'completed', payment_method: 'wallet',
      created_at: daysAgo(12),
      items: [
        { item_id: 'nike_pegasus_001', name: 'Nike Pegasus 41', description: 'Running shoes, size 9', quantity: 1, unit_price: 89, total_price: 89 },
      ],
    },

    // Scenario 2 — Travel multi-vendor (6 parallel checkouts)
    ...[
      { id: 'chk_flight_bcn', name: 'LATAM Airlines RT Flight', desc: 'Round-trip Dallas → Barcelona', price: 680, merchant: 'LATAM Airlines' },
      { id: 'chk_hotel_bcn', name: 'Hotel Casa Camper', desc: '5 nights, double room, Las Ramblas', price: 1680, merchant: 'Booking.com' },
      { id: 'chk_restaurants_bcn', name: 'Restaurant Reservations', desc: '5 dinner reservations — curated by agent', price: 560, merchant: 'TheFork' },
      { id: 'chk_wine_tour', name: 'Penedès Wine Tour', desc: 'Full-day wine tour, 2 guests', price: 450, merchant: 'Viator' },
      { id: 'chk_museum_bcn', name: 'Sagrada Familia + Park Güell', desc: 'Skip-the-line tickets, 2 guests', price: 350, merchant: 'Tiqets' },
    ].map((item, i) => ({
      checkout_id: item.id, session_id: 'sess_travel_bcn',
      agent_id: ids.travel_agent, agent_name: 'Hopper Travel Agent',
      customer_id: 'cust_david', customer_email: 'david@demo-consumer.com',
      account_id: ids.david, merchant_id: `merch_${item.merchant.toLowerCase().replace(/\s+/g, '_')}`, merchant_name: item.merchant,
      subtotal: item.price, tax_amount: 0, shipping_amount: 0, discount_amount: 0, total_amount: item.price,
      status: 'completed', payment_method: 'wallet',
      checkout_data: { scenario: 'anniversary_trip', checkout_group_id: 'grp_bcn_trip', vendor_index: i + 1, total_vendors: 5 },
      created_at: daysAgo(8),
      items: [
        { item_id: `item_${item.id}`, name: item.name, description: item.desc, quantity: item.price > 600 ? 1 : 2, unit_price: item.price > 600 ? item.price : item.price / 2, total_price: item.price },
      ],
    })),

    // Scenario 4 — Corporate travel São Paulo
    {
      checkout_id: 'chk_corp_flight_gru', session_id: 'sess_corp_001',
      agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      customer_id: 'cust_acme_vp', customer_email: 'vp.sales@acme-demo.com',
      account_id: ids.acme, merchant_id: 'merch_latam_airlines', merchant_name: 'LATAM Airlines',
      subtotal: 680, tax_amount: 0, shipping_amount: 0, total_amount: 680,
      status: 'completed', payment_method: 'corporate_wallet',
      checkout_data: { scenario: 'corporate_travel', policy_check: 'all_passed', auto_approved: true, gl_code: 'Travel-Sales', cost_center: 'LATAM Expansion' },
      created_at: daysAgo(3),
      items: [
        { item_id: 'corp_flight_001', name: 'LATAM Airlines Economy — NYC to GRU', description: 'Round-trip, Feb 12-14', quantity: 1, unit_price: 680, total_price: 680 },
      ],
    },
    {
      checkout_id: 'chk_corp_hotel_sp', session_id: 'sess_corp_002',
      agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      customer_id: 'cust_acme_vp', customer_email: 'vp.sales@acme-demo.com',
      account_id: ids.acme, merchant_id: 'merch_booking', merchant_name: 'Booking.com',
      subtotal: 840, tax_amount: 0, shipping_amount: 0, total_amount: 840,
      status: 'completed', payment_method: 'corporate_wallet',
      checkout_data: { scenario: 'corporate_travel', policy_check: 'all_passed', auto_approved: true, gl_code: 'Travel-Sales', cost_center: 'LATAM Expansion' },
      created_at: daysAgo(3),
      items: [
        { item_id: 'corp_hotel_001', name: 'Hotel Fasano São Paulo', description: '2 nights, standard room, $420/night', quantity: 2, unit_price: 420, total_price: 840 },
      ],
    },

    // Active/pending checkout
    {
      checkout_id: 'chk_pending_headphones', session_id: 'sess_shop_003',
      agent_id: ids.shopping_agent, agent_name: 'Perplexity Shopping Agent',
      customer_id: 'cust_maria', customer_email: 'maria@demo-consumer.com',
      account_id: ids.maria, merchant_id: 'merch_global_retail', merchant_name: 'Global Retail Co',
      subtotal: 349, tax_amount: 30.54, shipping_amount: 0, total_amount: 379.54,
      status: 'pending',
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
      currency: 'USDC',
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
          currency: 'USDC',
        });
      }
    }

    console.log(`  + ${checkoutData.checkout_id} (${checkoutData.status}, $${checkoutData.total_amount})`);
  }

  // ──────────────────────────────────────────
  // 7. AP2 MANDATES (Scenarios 4, 5, 7)
  // ──────────────────────────────────────────
  console.log('\n7. Creating AP2 mandates...');

  const mandates = [
    // Scenario 4 — Corporate travel mandate chain
    {
      mandate_id: `${tp}_mandate_corp_travel_intent`, mandate_type: 'intent',
      account_id: ids.acme, agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      authorized_amount: 5000, used_amount: 0, execution_count: 0, status: 'completed',
      mandate_data: { traveler: 'VP of Sales', destination: 'São Paulo', dates: 'Feb 12-14', purpose: 'Client meeting — $2M deal' },
      created_at: daysAgo(5),
    },
    {
      mandate_id: `${tp}_mandate_corp_travel_cart`, mandate_type: 'cart',
      account_id: ids.acme, agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      authorized_amount: 1640, used_amount: 0, execution_count: 0, status: 'completed',
      mandate_data: { items: [{ type: 'flight', vendor: 'LATAM Airlines', amount: 680 }, { type: 'hotel', vendor: 'Hotel Fasano', amount: 840, nights: 2 }, { type: 'transport', vendor: 'Transfer service', amount: 120 }] },
      created_at: daysAgo(4),
    },
    {
      mandate_id: `${tp}_mandate_corp_travel_payment`, mandate_type: 'payment',
      account_id: ids.acme, agent_id: ids.corp_travel_agent, agent_name: 'Acme Corporate Travel Agent',
      authorized_amount: 1640, used_amount: 1520, execution_count: 2, status: 'active',
      mandate_data: { gl_code: 'Travel-Sales', cost_center: 'LATAM Expansion', policy_result: 'all_passed' },
      created_at: daysAgo(3),
    },

    // Scenario 5 — Bill pay recurring mandates
    {
      mandate_id: `${tp}_mandate_rent_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 1200, used_amount: 1200, execution_count: 1, status: 'completed',
      mandate_data: { bill_type: 'rent', priority: 'P0', frequency: 'monthly', payee: 'Landlord', auto_resume: true },
      metadata: { priority_tier: 'P0_essential' },
      created_at: daysAgo(6),
    },
    {
      mandate_id: `${tp}_mandate_electric_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 180, used_amount: 180, execution_count: 1, status: 'completed',
      mandate_data: { bill_type: 'electric', priority: 'P1', frequency: 'monthly', payee: 'Electric Co', deferred: true, deferred_until: 'paycheck_friday' },
      metadata: { priority_tier: 'P1_important' },
      created_at: daysAgo(6),
    },
    {
      mandate_id: `${tp}_mandate_internet_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 80, used_amount: 80, execution_count: 1, status: 'completed',
      mandate_data: { bill_type: 'internet', priority: 'P2', frequency: 'monthly', payee: 'ISP Corp' },
      metadata: { priority_tier: 'P2_discretionary' },
      created_at: daysAgo(6),
    },
    {
      mandate_id: `${tp}_mandate_netflix_recurring`, mandate_type: 'payment',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 15, used_amount: 15, execution_count: 1, status: 'completed',
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

    // Active mandate — next month's bills
    {
      mandate_id: `${tp}_mandate_march_bills`, mandate_type: 'intent',
      account_id: ids.david, agent_id: ids.billpay_agent, agent_name: 'Smart Bill Pay Agent',
      authorized_amount: 1475, used_amount: 0, execution_count: 0, status: 'active',
      mandate_data: { month: 'March 2026', bills: ['rent', 'electric', 'internet', 'netflix'], total_estimated: 1475 },
      created_at: hoursAgo(12),
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
      currency: 'USDC',
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

  // AP2 Mandate Executions
  console.log('\n   Creating mandate executions...');

  const executions = [
    { mandate_id: `${tp}_mandate_corp_travel_payment`, execution_index: 1, amount: 680, status: 'completed', created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_corp_travel_payment`, execution_index: 2, amount: 840, status: 'completed', created_at: daysAgo(3) },
    { mandate_id: `${tp}_mandate_rent_recurring`, execution_index: 1, amount: 1200, status: 'completed', created_at: daysAgo(6) },
    { mandate_id: `${tp}_mandate_electric_recurring`, execution_index: 1, amount: 180, status: 'completed', created_at: daysAgo(4) },
    { mandate_id: `${tp}_mandate_internet_recurring`, execution_index: 1, amount: 80, status: 'completed', created_at: daysAgo(4) },
    { mandate_id: `${tp}_mandate_netflix_recurring`, execution_index: 1, amount: 15, status: 'completed', created_at: daysAgo(4) },
    { mandate_id: `${tp}_mandate_remittance_monthly`, execution_index: 1, amount: 380, status: 'completed', created_at: daysAgo(7) },
    { mandate_id: `${tp}_mandate_remittance_monthly`, execution_index: 2, amount: 120, status: 'completed', created_at: daysAgo(5) },
  ];

  for (const exec of executions) {
    const dbMandateId = mandateIdMap[exec.mandate_id];
    if (!dbMandateId) continue;

    const { error } = await supabase.from('ap2_mandate_executions').insert({
      tenant_id: tenantId,
      mandate_id: dbMandateId,
      execution_index: exec.execution_index,
      amount: exec.amount,
      currency: 'USDC',
      status: exec.status,
      created_at: exec.created_at,
      completed_at: exec.status === 'completed' ? exec.created_at : null,
    });

    if (error) console.log(`  ! Execution failed: ${exec.mandate_id}#${exec.execution_index} — ${error.message}`);
    else console.log(`  + ${exec.mandate_id} #${exec.execution_index} ($${exec.amount})`);
  }

  // ──────────────────────────────────────────
  // 8. UCP CHECKOUT SESSIONS & ORDERS (Scenarios 1, 2)
  // ──────────────────────────────────────────
  console.log('\n8. Creating UCP checkout sessions & orders...');

  const ucpSessions = [
    // Scenario 1 — Shopping completed
    {
      status: 'completed', currency: 'USD',
      line_items: [{ id: 'item_tissot', name: 'Tissot PRX Powermatic 80', description: 'Swiss automatic watch', quantity: 1, unit_price: 29900, total_price: 29900, image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200' }],
      totals: [{ type: 'subtotal', amount: 29900, label: 'Subtotal' }, { type: 'tax', amount: 2616, label: 'Tax (8.75%)' }, { type: 'total', amount: 32516, label: 'Total' }],
      buyer: { email: 'maria@demo-consumer.com', name: 'Maria Rodriguez', phone: '+1-555-0201' },
      shipping_address: { line1: '456 Oak Ave', city: 'Dallas', state: 'TX', postal_code: '75201', country: 'US' },
      metadata: { scenario: 'birthday_gift', agent: 'Perplexity Shopping Agent' },
      created_at: daysAgo(2),
      order_status: 'shipped',
    },
    // Scenario 2 — Travel multi-vendor completed
    {
      status: 'completed', currency: 'USD',
      line_items: [
        { id: 'item_flight', name: 'LATAM Airlines RT — Dallas to Barcelona', quantity: 2, unit_price: 34000, total_price: 68000 },
        { id: 'item_hotel', name: 'Hotel Casa Camper — 5 nights', quantity: 1, unit_price: 168000, total_price: 168000 },
        { id: 'item_restaurants', name: 'Restaurant Reservations (5 dinners)', quantity: 1, unit_price: 56000, total_price: 56000 },
        { id: 'item_wine', name: 'Penedès Wine Tour', quantity: 2, unit_price: 22500, total_price: 45000 },
        { id: 'item_museum', name: 'Sagrada Familia + Park Güell', quantity: 2, unit_price: 17500, total_price: 35000 },
      ],
      totals: [{ type: 'subtotal', amount: 372000, label: 'Subtotal' }, { type: 'total', amount: 372000, label: 'Total' }],
      buyer: { email: 'david@demo-consumer.com', name: 'David Chen', phone: '+1-555-0202' },
      metadata: { scenario: 'anniversary_trip', agent: 'Hopper Travel Agent', checkout_group: 'grp_bcn_trip' },
      created_at: daysAgo(8),
      order_status: 'confirmed',
    },
    // Active session — pending
    {
      status: 'requires_escalation', currency: 'USD',
      line_items: [{ id: 'item_headphones', name: 'Sony WH-1000XM5', description: 'Wireless noise-cancelling', quantity: 1, unit_price: 34900, total_price: 34900 }],
      totals: [{ type: 'subtotal', amount: 34900, label: 'Subtotal' }, { type: 'tax', amount: 3054, label: 'Tax' }, { type: 'total', amount: 37954, label: 'Total' }],
      buyer: { email: 'maria@demo-consumer.com', name: 'Maria Rodriguez' },
      messages: [{ type: 'warning', code: 'FIRST_MERCHANT', severity: 'recoverable', content: 'First purchase from this merchant — confirmation required' }],
      metadata: { scenario: 'shopping', requires_confirmation: true },
      created_at: hoursAgo(2),
    },
    // Incomplete session
    {
      status: 'incomplete', currency: 'USD',
      line_items: [{ id: 'item_laptop', name: 'MacBook Air M4', quantity: 1, unit_price: 129900, total_price: 129900 }],
      totals: [{ type: 'subtotal', amount: 129900, label: 'Subtotal' }, { type: 'total', amount: 129900, label: 'Total' }],
      messages: [{ type: 'error', code: 'BUDGET_EXCEEDED', severity: 'recoverable', content: 'Amount exceeds daily spending limit ($500)' }],
      metadata: { scenario: 'shopping', budget_check: 'failed' },
      created_at: hoursAgo(6),
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
      payment_config: { handlers: ['payos'] },
      payment_instruments: sessionData.status === 'completed' ? [{ id: `pi_${randomUUID().slice(0, 8)}`, handler: 'payos', type: 'wallet' }] : [],
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
  // 9. COMPLIANCE FLAGS (5 records)
  // ──────────────────────────────────────────
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

  // ──────────────────────────────────────────
  // 10. APPROVAL WORKFLOWS (3 records)
  // ──────────────────────────────────────────
  console.log('\n10. Creating approval workflows...');

  const approvals = [
    // Scenario 1 — First merchant confirmation (approved)
    {
      wallet_id: ids.maria_wallet, agent_id: ids.shopping_agent,
      protocol: 'acp', amount: 299, currency: 'USDC',
      recipient: { name: 'Global Retail Co', type: 'merchant', merchant_id: 'merch_global_retail' },
      payment_context: { scenario: 'birthday_gift', reason: 'first_time_merchant', item: 'Tissot PRX watch' },
      status: 'approved', decided_at: daysAgo(2), decision_reason: 'Consumer confirmed via push notification',
      requested_by_type: 'agent', requested_by_id: ids.shopping_agent, requested_by_name: 'Perplexity Shopping Agent',
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
      protocol: 'acp', amount: 379.54, currency: 'USDC',
      recipient: { name: 'AudioTech Store', type: 'merchant', merchant_id: 'merch_audiotech' },
      payment_context: { scenario: 'shopping', reason: 'first_time_merchant', item: 'Sony WH-1000XM5' },
      status: 'pending',
      requested_by_type: 'agent', requested_by_id: ids.shopping_agent, requested_by_name: 'Perplexity Shopping Agent',
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

  // ──────────────────────────────────────────
  // 11. SETTLEMENT RULES (2 rules + executions)
  // ──────────────────────────────────────────
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

  const { tenantId: specifiedId, reset } = parseArgs();
  const tenantId = await resolveTenant(specifiedId);

  if (reset) {
    await resetDemoData(tenantId);
  }

  const stats = await seedDemoScenarios(tenantId);

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
  UCP Sessions:      4
  Compliance Flags:  5
  Approvals:         3
  Settlement Rules:  2
  Connected Accounts: 3
  Streams:           3

  Scenarios covered:
    1. Shopping Agent (ACP + UCP)
    2. Travel Itinerary (ACP + UCP)
    3. API Monetization (x402)
    4. Corporate Travel (AP2 + ACP)
    5. Bill Pay (AP2)
    6. Gig Payout (Core transfers)
    7. Remittance (AP2 + FX)
    8. Media/Publishing (x402)

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
