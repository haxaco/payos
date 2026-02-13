#!/usr/bin/env tsx

/**
 * Zindigi Demo Seed Script
 *
 * Creates demo data for the Zindigi (Pakistani fintech) live demos:
 *
 * Demo 1 — Freelancer Payment:
 *   - Tenant: "Zindigi Demo Corp"
 *   - Business Account: "Zindigi Corp US" (KYB tier 2, verified)
 *   - Agent: "Zindigi Payment Agent" (KYA tier 1, verified)
 *   - Wallet: "Zindigi Operations Wallet" (10,000 USDC)
 *   - AP2 Mandate: $500 USDC authorized for the agent
 *
 * Demo 2 — Ahmed's Remittance:
 *   - Personal Account: "Ahmed Khan" (KYC tier 1, verified)
 *   - Agent: "Ahmed's Financial Assistant" (KYA tier 1, verified)
 *   - Wallet: "Ahmed's Remittance Wallet" (5,000 USDC)
 *   - AP2 Mandate: $400 USDC authorized for the agent
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   pnpm --filter @sly/api seed:zindigi           # Create demo data
 *   pnpm --filter @sly/api seed:zindigi -- --reset # Reset for re-demo
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../src/utils/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Constants — Demo 1: Freelancer Payment
const TENANT_NAME = 'Haxaco Development';
const ACCOUNT_NAME = 'Zindigi Corp US';
const ACCOUNT_EMAIL = 'ops@zindigi-demo.example.com';
const AGENT_NAME = 'Zindigi Payment Agent';
const WALLET_NAME = 'Zindigi Operations Wallet';
const WALLET_BALANCE = 10000;
const MANDATE_AMOUNT = 500;
const MANDATE_CURRENCY = 'USDC';

// Constants — Demo 2: Ahmed's Remittance
const AHMED_ACCOUNT_NAME = 'Ahmed Khan';
const AHMED_ACCOUNT_EMAIL = 'ahmed.khan@example.com';
const AHMED_AGENT_NAME = "Ahmed's Financial Assistant";
const AHMED_WALLET_NAME = "Ahmed's Remittance Wallet";
const AHMED_WALLET_BALANCE = 5000;
const AHMED_MANDATE_AMOUNT = 400;

// Constants — Demo 2b: Fatima Khan (recipient in Karachi)
const FATIMA_ACCOUNT_NAME = 'Fatima Khan (Karachi)';
const FATIMA_ACCOUNT_EMAIL = 'fatima.khan@example.pk';
const FATIMA_ACCOUNT_CURRENCY = 'PKR';

// ============================================
// Reset Logic
// ============================================

async function resetDemo() {
  console.log('Resetting Zindigi demo data...\n');

  // Find tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', TENANT_NAME)
    .single();

  if (!tenant) {
    console.log('No Zindigi demo tenant found. Nothing to reset.');
    return;
  }

  const tenantId = tenant.id;

  // Find the agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', AGENT_NAME)
    .single();

  // Reset Demo 1 wallet balance
  const { error: walletErr } = await supabase
    .from('wallets')
    .update({
      balance: WALLET_BALANCE,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('name', WALLET_NAME);

  if (walletErr) console.warn('  Wallet reset error:', walletErr.message);
  else console.log(`  Demo 1 wallet balance reset to ${WALLET_BALANCE} USDC`);

  // Reset Demo 2 wallet balance
  const { error: ahmedWalletErr } = await supabase
    .from('wallets')
    .update({
      balance: AHMED_WALLET_BALANCE,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('name', AHMED_WALLET_NAME);

  if (ahmedWalletErr) console.warn('  Ahmed wallet reset error:', ahmedWalletErr.message);
  else console.log(`  Demo 2 wallet balance reset to ${AHMED_WALLET_BALANCE} USDC`);

  // Reset account balances
  await supabase
    .from('accounts')
    .update({ balance_total: WALLET_BALANCE, balance_available: WALLET_BALANCE })
    .eq('tenant_id', tenantId)
    .eq('email', ACCOUNT_EMAIL);

  await supabase
    .from('accounts')
    .update({ balance_total: AHMED_WALLET_BALANCE, balance_available: AHMED_WALLET_BALANCE })
    .eq('tenant_id', tenantId)
    .eq('email', AHMED_ACCOUNT_EMAIL);

  // Reset Fatima's balance to 0
  await supabase
    .from('accounts')
    .update({ balance_total: 0, balance_available: 0 })
    .eq('tenant_id', tenantId)
    .eq('email', FATIMA_ACCOUNT_EMAIL);

  console.log('  Account balances reset (incl. Fatima → 0 PKR)');

  // Delete ledger entries for this tenant (created by seed and mandate executions)
  await supabase
    .from('ledger_entries')
    .delete()
    .eq('tenant_id', tenantId);

  console.log('  Ledger entries cleared');

  // Reset agent_usage (daily spending trackers)
  await supabase
    .from('agent_usage')
    .delete()
    .eq('tenant_id', tenantId);

  console.log('  Agent usage stats cleared');

  // Reset Demo 1 mandate: used_amount=0, status=active (remaining_amount is a generated column)
  const { error: mandateErr } = await supabase
    .from('ap2_mandates')
    .update({
      used_amount: 0,
      execution_count: 0,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('agent_name', AGENT_NAME);

  if (mandateErr) console.warn('  Mandate reset error:', mandateErr.message);
  else console.log(`  Demo 1 mandate reset to $${MANDATE_AMOUNT} budget`);

  // Reset Demo 2 mandate
  const { error: ahmedMandateErr } = await supabase
    .from('ap2_mandates')
    .update({
      used_amount: 0,
      execution_count: 0,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('agent_name', AHMED_AGENT_NAME);

  if (ahmedMandateErr) console.warn('  Ahmed mandate reset error:', ahmedMandateErr.message);
  else console.log(`  Demo 2 mandate reset to $${AHMED_MANDATE_AMOUNT} budget`);

  // Delete mandate executions for this tenant
  const { data: mandates } = await supabase
    .from('ap2_mandates')
    .select('id')
    .eq('tenant_id', tenantId);

  if (mandates && mandates.length > 0) {
    const mandateIds = mandates.map((m: any) => m.id);
    const { error: execErr } = await supabase
      .from('ap2_mandate_executions')
      .delete()
      .in('mandate_id', mandateIds);

    if (execErr) console.warn('  Execution cleanup error:', execErr.message);
    else console.log('  Mandate executions cleared');
  }

  // Delete checkout sessions and orders for this tenant
  // Nullify the FK from checkout_sessions → orders first to break circular reference
  const { error: nullifyErr } = await supabase
    .from('ucp_checkout_sessions')
    .update({ order_id: null })
    .eq('tenant_id', tenantId);

  if (nullifyErr) console.warn('  Checkout nullify error:', nullifyErr.message);

  const { error: orderErr } = await supabase
    .from('ucp_orders')
    .delete()
    .eq('tenant_id', tenantId);

  if (orderErr) console.warn('  Order cleanup error:', orderErr.message);
  else console.log('  UCP orders cleared');

  const { error: checkoutErr } = await supabase
    .from('ucp_checkout_sessions')
    .delete()
    .eq('tenant_id', tenantId);

  if (checkoutErr) console.warn('  Checkout cleanup error:', checkoutErr.message);
  else console.log('  UCP checkout sessions cleared');

  // Delete transfer records created by mandate executions (internal + cross_border)
  {
    const { error: transferErr } = await supabase
      .from('transfers')
      .delete()
      .eq('tenant_id', tenantId)
      .in('type', ['internal', 'cross_border'])
      .contains('protocol_metadata', { protocol: 'ap2' } as any);

    if (transferErr) console.warn('  Transfer cleanup error:', transferErr.message);
    else console.log('  AP2 transfer records cleared');
  }

  console.log('\nDemo reset complete. Ready to run again.\n');
}

// ============================================
// Seed Logic
// ============================================

async function seedDemo() {
  console.log('Seeding Zindigi demo data...\n');

  // --- 1. Tenant ---
  let tenantId: string;
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', TENANT_NAME)
    .single();

  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log(`  Tenant "${TENANT_NAME}" already exists (${tenantId})`);
  } else {
    const testKey = generateApiKey('test');
    const liveKey = generateApiKey('live');

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name: TENANT_NAME,
        status: 'active',
        api_key: testKey,
        api_key_hash: hashApiKey(testKey),
        api_key_prefix: getKeyPrefix(testKey),
      })
      .select()
      .single();

    if (error) throw new Error(`Tenant creation failed: ${error.message}`);
    tenantId = tenant.id;

    // Create api_keys rows
    await supabase.from('api_keys').insert([
      {
        tenant_id: tenantId,
        name: 'Zindigi Test Key',
        environment: 'test',
        key_prefix: getKeyPrefix(testKey),
        key_hash: hashApiKey(testKey),
        description: 'Zindigi demo test key',
      },
      {
        tenant_id: tenantId,
        name: 'Zindigi Live Key',
        environment: 'live',
        key_prefix: getKeyPrefix(liveKey),
        key_hash: hashApiKey(liveKey),
        description: 'Zindigi demo live key',
      },
    ]);

    console.log(`  Tenant created: ${TENANT_NAME} (${tenantId})`);
    console.log(`  ===================================`);
    console.log(`  TEST API KEY: ${testKey}`);
    console.log(`  LIVE API KEY: ${liveKey}`);
    console.log(`  ===================================`);
  }

  // --- 2. Business Account ---
  let accountId: string;
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', ACCOUNT_EMAIL)
    .single();

  if (existingAccount) {
    accountId = existingAccount.id;
    console.log(`  Account "${ACCOUNT_NAME}" already exists (${accountId})`);
  } else {
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'business',
        name: ACCOUNT_NAME,
        email: ACCOUNT_EMAIL,
        verification_tier: 2,
        verification_status: 'verified',
        verification_type: 'kyb',
        balance_total: WALLET_BALANCE,
        balance_available: WALLET_BALANCE,
        currency: MANDATE_CURRENCY,
      })
      .select()
      .single();

    if (error) throw new Error(`Account creation failed: ${error.message}`);
    accountId = account.id;
    console.log(`  Account created: ${ACCOUNT_NAME} (${accountId})`);
  }

  // --- 3. Agent ---
  let agentId: string;
  const { data: existingAgent } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('parent_account_id', accountId)
    .eq('name', AGENT_NAME)
    .single();

  if (existingAgent) {
    agentId = existingAgent.id;
    console.log(`  Agent "${AGENT_NAME}" already exists (${agentId})`);
  } else {
    const agentToken = generateApiKey('agent');

    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        tenant_id: tenantId,
        parent_account_id: accountId,
        name: AGENT_NAME,
        description: 'AI payment agent for Zindigi cross-border payouts',
        status: 'active',
        type: 'payment',
        kya_tier: 1,
        kya_status: 'verified',
        x402_enabled: true,
        total_volume: 0,
        total_transactions: 0,
        auth_token_prefix: getKeyPrefix(agentToken),
        auth_token_hash: hashApiKey(agentToken),
        permissions: {
          transactions: { canInitiate: true, canApprove: true, maxAmount: 1000 },
          streams: { canCreate: false, canModify: false, canPause: false, canTerminate: false },
          accounts: { canView: true, canCreate: false, canModify: false },
          treasury: { canView: true, canManage: false },
        },
      })
      .select()
      .single();

    if (error) throw new Error(`Agent creation failed: ${error.message}`);
    agentId = agent.id;
    console.log(`  Agent created: ${AGENT_NAME} (${agentId})`);
    console.log(`  ===================================`);
    console.log(`  AGENT TOKEN: ${agentToken}`);
    console.log(`  ===================================`);
  }

  // --- 4. Wallet ---
  let walletId: string;
  const { data: existingWallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('owner_account_id', accountId)
    .eq('name', WALLET_NAME)
    .maybeSingle();

  if (existingWallet) {
    walletId = existingWallet.id;
    console.log(`  Wallet "${WALLET_NAME}" already exists (${walletId})`);
  } else {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert({
        tenant_id: tenantId,
        owner_account_id: accountId,
        managed_by_agent_id: agentId,
        name: WALLET_NAME,
        balance: WALLET_BALANCE,
        currency: MANDATE_CURRENCY,
        network: 'base-mainnet',
        status: 'active',
        purpose: 'Zindigi demo operations wallet',
      })
      .select()
      .single();

    if (error) throw new Error(`Wallet creation failed: ${error.message}`);
    walletId = wallet.id;
    console.log(`  Wallet created: ${WALLET_NAME} (${walletId}) — ${WALLET_BALANCE} ${MANDATE_CURRENCY}`);
  }

  // --- 5. AP2 Mandate ---
  let mandateId: string;
  const { data: existingMandate } = await supabase
    .from('ap2_mandates')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .eq('mandate_type', 'payment')
    .eq('status', 'active')
    .maybeSingle();

  if (existingMandate) {
    mandateId = existingMandate.id;
    console.log(`  Mandate already exists (${mandateId})`);
  } else {
    const { data: mandate, error } = await supabase
      .from('ap2_mandates')
      .insert({
        tenant_id: tenantId,
        account_id: accountId,
        agent_id: agentId,
        agent_name: AGENT_NAME,
        mandate_id: `mandate_zindigi_demo_${tenantId.slice(0, 8)}`,
        mandate_type: 'payment',
        authorized_amount: MANDATE_AMOUNT,
        currency: MANDATE_CURRENCY,
        status: 'active',
        mandate_data: {
          purpose: 'Freelancer payouts for Zindigi demo',
          max_single_payment: 500,
        },
        metadata: {
          demo: true,
          partner: 'zindigi',
        },
      })
      .select()
      .single();

    if (error) throw new Error(`Mandate creation failed: ${error.message}`);
    mandateId = mandate.id;
    console.log(`  Mandate created: $${MANDATE_AMOUNT} ${MANDATE_CURRENCY} budget (${mandateId})`);
  }

  // =============================================
  // DEMO 2 — Ahmed's Remittance
  // =============================================
  console.log('\n  --- Demo 2: Ahmed\'s Remittance ---');

  // --- 6. Ahmed's Personal Account ---
  let ahmedAccountId: string;
  const { data: existingAhmedAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', AHMED_ACCOUNT_EMAIL)
    .single();

  if (existingAhmedAccount) {
    ahmedAccountId = existingAhmedAccount.id;
    console.log(`  Account "${AHMED_ACCOUNT_NAME}" already exists (${ahmedAccountId})`);
  } else {
    const { data: ahmedAccount, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'person',
        name: AHMED_ACCOUNT_NAME,
        email: AHMED_ACCOUNT_EMAIL,
        verification_tier: 1,
        verification_status: 'verified',
        verification_type: 'kyc',
        balance_total: AHMED_WALLET_BALANCE,
        balance_available: AHMED_WALLET_BALANCE,
        currency: MANDATE_CURRENCY,
      })
      .select()
      .single();

    if (error) throw new Error(`Ahmed account creation failed: ${error.message}`);
    ahmedAccountId = ahmedAccount.id;
    console.log(`  Account created: ${AHMED_ACCOUNT_NAME} (${ahmedAccountId})`);
  }

  // --- 7. Ahmed's Agent ---
  let ahmedAgentId: string;
  const { data: existingAhmedAgent } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('parent_account_id', ahmedAccountId)
    .eq('name', AHMED_AGENT_NAME)
    .single();

  if (existingAhmedAgent) {
    ahmedAgentId = existingAhmedAgent.id;
    console.log(`  Agent "${AHMED_AGENT_NAME}" already exists (${ahmedAgentId})`);
  } else {
    const ahmedAgentToken = generateApiKey('agent');

    const { data: ahmedAgent, error } = await supabase
      .from('agents')
      .insert({
        tenant_id: tenantId,
        parent_account_id: ahmedAccountId,
        name: AHMED_AGENT_NAME,
        description: 'AI financial assistant for personal remittances',
        status: 'active',
        type: 'payment',
        kya_tier: 1,
        kya_status: 'verified',
        x402_enabled: true,
        total_volume: 0,
        total_transactions: 0,
        auth_token_prefix: getKeyPrefix(ahmedAgentToken),
        auth_token_hash: hashApiKey(ahmedAgentToken),
        permissions: {
          transactions: { canInitiate: true, canApprove: true, maxAmount: 500 },
          streams: { canCreate: false, canModify: false, canPause: false, canTerminate: false },
          accounts: { canView: true, canCreate: false, canModify: false },
          treasury: { canView: true, canManage: false },
        },
      })
      .select()
      .single();

    if (error) throw new Error(`Ahmed agent creation failed: ${error.message}`);
    ahmedAgentId = ahmedAgent.id;
    console.log(`  Agent created: ${AHMED_AGENT_NAME} (${ahmedAgentId})`);
    console.log(`  ===================================`);
    console.log(`  AHMED AGENT TOKEN: ${ahmedAgentToken}`);
    console.log(`  ===================================`);
  }

  // --- 8. Ahmed's Wallet ---
  let ahmedWalletId: string;
  const { data: existingAhmedWallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('owner_account_id', ahmedAccountId)
    .eq('name', AHMED_WALLET_NAME)
    .maybeSingle();

  if (existingAhmedWallet) {
    ahmedWalletId = existingAhmedWallet.id;
    console.log(`  Wallet "${AHMED_WALLET_NAME}" already exists (${ahmedWalletId})`);
  } else {
    const { data: ahmedWallet, error } = await supabase
      .from('wallets')
      .insert({
        tenant_id: tenantId,
        owner_account_id: ahmedAccountId,
        managed_by_agent_id: ahmedAgentId,
        name: AHMED_WALLET_NAME,
        balance: AHMED_WALLET_BALANCE,
        currency: MANDATE_CURRENCY,
        network: 'base-mainnet',
        status: 'active',
        purpose: 'Ahmed personal remittance wallet',
      })
      .select()
      .single();

    if (error) throw new Error(`Ahmed wallet creation failed: ${error.message}`);
    ahmedWalletId = ahmedWallet.id;
    console.log(`  Wallet created: ${AHMED_WALLET_NAME} (${ahmedWalletId}) — ${AHMED_WALLET_BALANCE} ${MANDATE_CURRENCY}`);
  }

  // --- 8b. Ahmed's initial ledger entry (wallet deposit) ---
  const { data: existingAhmedLedger } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_id', ahmedAccountId)
    .eq('reference_type', 'wallet_deposit')
    .maybeSingle();

  if (existingAhmedLedger) {
    console.log(`  Ahmed ledger entry already exists`);
  } else {
    const { error: ledgerErr } = await supabase
      .from('ledger_entries')
      .insert({
        tenant_id: tenantId,
        account_id: ahmedAccountId,
        type: 'credit',
        amount: AHMED_WALLET_BALANCE,
        currency: MANDATE_CURRENCY,
        balance_after: AHMED_WALLET_BALANCE,
        reference_type: 'wallet_deposit',
        reference_id: ahmedWalletId,
        description: `Initial deposit to ${AHMED_WALLET_NAME}`,
      });

    if (ledgerErr) console.warn('  Ahmed ledger entry error:', ledgerErr.message);
    else console.log(`  Ledger entry created: +${AHMED_WALLET_BALANCE} ${MANDATE_CURRENCY} deposit`);
  }

  // --- 8c. Fatima Khan (Karachi) — recipient account ---
  let fatimaAccountId: string;
  const { data: existingFatima } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', FATIMA_ACCOUNT_EMAIL)
    .single();

  if (existingFatima) {
    fatimaAccountId = existingFatima.id;
    console.log(`  Account "${FATIMA_ACCOUNT_NAME}" already exists (${fatimaAccountId})`);
  } else {
    const { data: fatimaAccount, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        type: 'person',
        name: FATIMA_ACCOUNT_NAME,
        email: FATIMA_ACCOUNT_EMAIL,
        verification_tier: 1,
        verification_status: 'verified',
        verification_type: 'kyc',
        balance_total: 0,
        balance_available: 0,
        currency: FATIMA_ACCOUNT_CURRENCY,
      })
      .select()
      .single();

    if (error) throw new Error(`Fatima account creation failed: ${error.message}`);
    fatimaAccountId = fatimaAccount.id;
    console.log(`  Account created: ${FATIMA_ACCOUNT_NAME} (${fatimaAccountId}) — ${FATIMA_ACCOUNT_CURRENCY}`);
  }

  // --- 9. Ahmed's AP2 Mandate ---
  let ahmedMandateId: string;
  const { data: existingAhmedMandate } = await supabase
    .from('ap2_mandates')
    .select('id')
    .eq('tenant_id', tenantId)
    .like('mandate_id', 'mandate_family_remittance%')
    .maybeSingle();

  if (existingAhmedMandate) {
    ahmedMandateId = existingAhmedMandate.id;
    // Reset mandate to active with full budget and destination info
    await supabase
      .from('ap2_mandates')
      .update({
        status: 'active',
        used_amount: 0,
        execution_count: 0,
        authorized_amount: AHMED_MANDATE_AMOUNT,
        mandate_data: {
          purpose: 'Monthly family support — mother in Karachi',
          max_single_payment: 400,
          destination_account_id: fatimaAccountId,
          destination_currency: 'PKR',
          corridor: 'USDC_PKR',
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', ahmedMandateId);
    console.log(`  Mandate already exists (${ahmedMandateId}) — reset to active with destination info`);
  } else {
    const { data: ahmedMandate, error } = await supabase
      .from('ap2_mandates')
      .insert({
        tenant_id: tenantId,
        account_id: ahmedAccountId,
        agent_id: ahmedAgentId,
        agent_name: AHMED_AGENT_NAME,
        mandate_id: `mandate_family_remittance_${tenantId.slice(0, 8)}`,
        mandate_type: 'payment',
        authorized_amount: AHMED_MANDATE_AMOUNT,
        currency: MANDATE_CURRENCY,
        status: 'active',
        mandate_data: {
          purpose: 'Monthly family support — mother in Karachi',
          max_single_payment: 400,
          destination_account_id: fatimaAccountId,
          destination_currency: 'PKR',
          corridor: 'USDC_PKR',
        },
        metadata: {
          demo: true,
          partner: 'zindigi',
          scenario: 'remittance',
        },
      })
      .select()
      .single();

    if (error) throw new Error(`Ahmed mandate creation failed: ${error.message}`);
    ahmedMandateId = ahmedMandate.id;
    console.log(`  Mandate created: $${AHMED_MANDATE_AMOUNT} ${MANDATE_CURRENCY} budget (${ahmedMandateId})`);
  }

  // --- Summary ---
  console.log('\n====================================');
  console.log('  ZINDIGI DEMO READY');
  console.log('====================================');
  console.log('');
  console.log('  DEMO 1 — FREELANCER PAYMENT');
  console.log(`  Tenant ID:   ${tenantId}`);
  console.log(`  Account ID:  ${accountId}`);
  console.log(`  Agent ID:    ${agentId}`);
  console.log(`  Wallet ID:   ${walletId}`);
  console.log(`  Mandate ID:  ${mandateId}`);
  console.log('');
  console.log("  DEMO 2 — AHMED'S REMITTANCE");
  console.log(`  Ahmed Account ID:  ${ahmedAccountId}`);
  console.log(`  Ahmed Agent ID:    ${ahmedAgentId}`);
  console.log(`  Ahmed Wallet ID:   ${ahmedWalletId}`);
  console.log(`  Ahmed Mandate ID:  ${ahmedMandateId}`);
  console.log(`  Fatima Account ID: ${fatimaAccountId} (PKR recipient)`);
  console.log('');
  console.log('====================================');
  console.log('  Set SLY_API_KEY to the test key above');
  console.log('  Set SLY_API_URL=http://localhost:4000');
  console.log('====================================\n');
}

// ============================================
// Main
// ============================================

const isReset = process.argv.includes('--reset');

(async () => {
  try {
    if (isReset) {
      await resetDemo();
    }
    await seedDemo();
  } catch (err: any) {
    console.error('\nFailed:', err.message);
    process.exit(1);
  }
})();
