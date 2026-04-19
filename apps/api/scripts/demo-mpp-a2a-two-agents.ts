#!/usr/bin/env tsx
/**
 * Demo Script: Two-Agent MPP + A2A with Real On-Chain pathUSD
 *
 * Showcases TinaCaller & CompanyIntelBot making real on-chain pathUSD payments:
 * - Phase 1: MPP direct charges to mpp.dev
 * - Phase 2: MPP sessions with vouchers
 * - Phase 3: A2A task TinaCaller → CompanyIntelBot (creates AP2 mandate)
 * - Phase 4: AP2 mandate creation + on-chain execution
 * - Phase 5: Verification & scorecard
 *
 * Usage: cd apps/api && set -a && source .env && set +a && npx tsx scripts/demo-mpp-a2a-two-agents.ts
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createPublicClient, http, defineChain } from 'viem';

// ============================================
// Configuration
// ============================================

const API = process.env.SLY_URL || 'http://localhost:4000';
const API_KEY = process.env.SLY_API_KEY || 'pk_test_demo_fintech_key_12345';
const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// TinaCaller agent (pre-provisioned with Tempo wallet)
const TINA_AGENT_ID = '5e8ea14c-f5e0-4434-8d83-fc2402342e10';
const TINA_WALLET_ID = 'fabc5282-0e9e-48dd-80a1-f28277b2f2e9';
const TINA_ACCOUNT_ID = 'bbbbbbbb-0000-0000-0000-000000000002'; // Acme Corp

// Tempo testnet config for on-chain balance reads
const TEMPO_TESTNET = defineChain({
  id: 42431,
  name: 'Tempo Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
});
const PATH_USD_CONTRACT = '0x20c0000000000000000000000000000000000000';
const ERC20_BALANCE_ABI = [{
  name: 'balanceOf', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: 'balance', type: 'uint256' }],
}] as const;

async function readOnChainBalance(walletAddress: string): Promise<number> {
  const client = createPublicClient({ chain: TEMPO_TESTNET, transport: http() });
  const raw = await client.readContract({
    address: PATH_USD_CONTRACT,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [walletAddress as `0x${string}`],
  } as any);
  return Number(raw) / 1e6; // pathUSD has 6 decimals
}

// Supabase client for direct DB operations
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

let passCount = 0;
let failCount = 0;
let companyAgentId = '';
let companyAccountId = '';
let companyWalletId = '';

// ============================================
// Helpers
// ============================================

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passCount++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

/** Unwrap API envelope: { success, data } → data, or return raw if no envelope */
function unwrap(res: any): any {
  if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
    return res.data;
  }
  return res;
}

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  return unwrap(await res.json());
}

async function apiPostRaw(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const raw = await apiPostRaw(path, body);
  return unwrap(raw);
}

async function jsonRpc(agentId: string, method: string, params: Record<string, unknown>) {
  const res = await fetch(`${API}/a2a/${agentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }),
  });
  return res.json() as Promise<any>;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================
// Phase 0: Setup
// ============================================

async function phase0_setup() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Phase 0: Setup                                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  // Verify API is running
  try {
    const health = await fetch(`${API}/health`);
    const raw = await health.json() as any;
    const h = raw?.data || raw;
    assert(h?.status === 'healthy' || h?.status === 'ok', `API running: ${h?.status}`);
  } catch {
    console.log('  ❌ API not running at', API);
    process.exit(1);
  }

  // Check TinaCaller wallet directly from DB
  const { data: tinaWallet } = await supabase
    .from('wallets')
    .select('id, balance, currency, wallet_address, network, provider_metadata')
    .eq('id', TINA_WALLET_ID)
    .single();

  assert(!!tinaWallet, 'TinaCaller wallet exists');
  console.log(`  TinaCaller wallet: ${tinaWallet?.balance} ${tinaWallet?.currency} @ ${tinaWallet?.wallet_address?.slice(0, 14)}...`);
  console.log(`  Network: ${tinaWallet?.network}, Has key: ${!!(tinaWallet?.provider_metadata as any)?.encrypted_private_key}`);

  // ── Create or find CompanyIntelBot ──
  console.log('\n  Setting up CompanyIntelBot...');

  // Find an existing account in the tenant (not the Acme Corp one)
  const { data: existingAcct } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .neq('id', TINA_ACCOUNT_ID)
    .limit(1)
    .single();

  if (existingAcct) {
    companyAccountId = existingAcct.id;
  } else {
    companyAccountId = randomUUID();
    await supabase.from('accounts').insert({
      id: companyAccountId,
      tenant_id: TENANT_ID,
      name: 'OpenClaw Testing',
      type: 'business',
      status: 'active',
      balance_total: 0,
      balance_available: 0,
    });
  }
  console.log(`  Account: ${companyAccountId.slice(0, 12)}...`);

  // Find or create CompanyIntelBot agent
  const { data: existingAgent } = await supabase
    .from('agents')
    .select('id')
    .eq('name', 'CompanyIntelBot')
    .eq('tenant_id', TENANT_ID)
    .maybeSingle();

  if (existingAgent) {
    companyAgentId = existingAgent.id;
    console.log(`  Agent already exists: ${companyAgentId.slice(0, 12)}...`);
  } else {
    companyAgentId = randomUUID();
    const { error: agentErr } = await supabase.from('agents').insert({
      id: companyAgentId,
      tenant_id: TENANT_ID,
      name: 'CompanyIntelBot',
      description: 'Company intelligence and market data agent',
      status: 'active',
      kya_tier: 1,
    });
    if (agentErr) {
      console.log(`  ⚠️  Agent creation error: ${agentErr.message}`);
    } else {
      console.log(`  Agent created: ${companyAgentId.slice(0, 12)}...`);
    }
  }

  // Provision or find CompanyIntelBot Tempo wallet
  const { data: existingCompanyWallet } = await supabase
    .from('wallets')
    .select('id, wallet_address, balance, network')
    .eq('managed_by_agent_id', companyAgentId)
    .eq('tenant_id', TENANT_ID)
    .like('network', 'tempo-%')
    .eq('status', 'active')
    .maybeSingle();

  if (existingCompanyWallet) {
    companyWalletId = existingCompanyWallet.id;
    console.log(`  Wallet already exists: ${companyWalletId.slice(0, 12)}... addr=${existingCompanyWallet.wallet_address?.slice(0, 14)}...`);
  } else {
    console.log('  Provisioning new Tempo wallet...');
    const provisionResult = await apiPost('/v1/mpp/wallets/provision', {
      agent_id: companyAgentId,
      owner_account_id: companyAccountId,
      testnet: true,
      initial_balance: 0,
    });

    // provisionResult is already unwrapped — check for id
    if (provisionResult?.id) {
      companyWalletId = provisionResult.id;
      assert(true, `Wallet provisioned: ${companyWalletId.slice(0, 12)}... addr=${provisionResult.address?.slice(0, 14)}...`);
    } else {
      // Maybe the response still has a nested data field
      const wallet = provisionResult?.data || provisionResult;
      if (wallet?.id) {
        companyWalletId = wallet.id;
        assert(true, `Wallet provisioned: ${companyWalletId.slice(0, 12)}...`);
      } else {
        assert(false, 'Wallet provisioning', JSON.stringify(provisionResult).slice(0, 200));
      }
    }
  }

  // Sync wallet balances with on-chain state
  console.log('\n  Syncing wallet balances with on-chain state...');
  const MIN_BALANCE_FOR_DEMO = 5; // pathUSD
  for (const [name, wId] of [
    ['TinaCaller', TINA_WALLET_ID],
    ['CompanyIntelBot', companyWalletId],
  ] as const) {
    if (!wId) continue;
    const { data: w } = await supabase
      .from('wallets')
      .select('wallet_address, balance')
      .eq('id', wId)
      .single();
    if (!w?.wallet_address) { console.log(`  ${name}: no wallet address`); continue; }

    const onChain = await readOnChainBalance(w.wallet_address);
    const dbBalance = Number(w.balance || 0);

    if (Math.abs(onChain - dbBalance) > 0.001) {
      await supabase
        .from('wallets')
        .update({ balance: onChain, updated_at: new Date().toISOString() })
        .eq('id', wId);
      console.log(`  ${name}: DB ${dbBalance} -> ${onChain} pathUSD (synced to on-chain)`);
    } else {
      console.log(`  ${name}: ${onChain} pathUSD (in sync)`);
    }

    if (onChain < MIN_BALANCE_FOR_DEMO) {
      console.log(`  Warning: ${name} has only ${onChain} pathUSD on-chain.`);
      console.log(`     Fund via: npx mppx account fund --account ${name.toLowerCase()}`);
      console.log(`     Or use Tempo testnet faucet at the wallet address.`);
    }
  }

  // Configure agents for managed A2A task processing
  console.log('\n  Configuring A2A processing mode...');
  await supabase
    .from('agents')
    .update({
      processing_mode: 'managed',
      processing_config: {
        model: 'regex',
        systemPrompt: 'You are CompanyIntelBot, a company intelligence and market data agent. Process research requests and provide market analysis.',
      },
    })
    .eq('id', companyAgentId)
    .eq('tenant_id', TENANT_ID);
  console.log('  CompanyIntelBot: processing_mode=managed configured');

  await supabase
    .from('agents')
    .update({
      processing_mode: 'managed',
      processing_config: {
        model: 'regex',
        systemPrompt: 'You are TinaCaller, a payment and API access agent. Process payment requests and mandate operations.',
      },
    })
    .eq('id', TINA_AGENT_ID)
    .eq('tenant_id', TENANT_ID);
  console.log('  TinaCaller: processing_mode=managed configured');

  // Print summary
  console.log('\n  ── Agent Summary ──');
  console.log(`  TinaCaller:       ${TINA_AGENT_ID.slice(0, 12)}... wallet=${TINA_WALLET_ID.slice(0, 12)}...`);
  console.log(`  CompanyIntelBot:  ${companyAgentId.slice(0, 12)}... wallet=${companyWalletId.slice(0, 12)}...`);
}

// ============================================
// Phase 1: MPP Direct Charges to mpp.dev
// ============================================

async function phase1_mppDirectCharges() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Phase 1: MPP Direct Charges to mpp.dev           ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  for (const [name, agentId, walletId] of [
    ['TinaCaller', TINA_AGENT_ID, TINA_WALLET_ID],
    ['CompanyIntelBot', companyAgentId, companyWalletId],
  ] as const) {
    if (!walletId) {
      console.log(`\n  ${name}: skipped (no wallet)`);
      continue;
    }
    console.log(`\n  ${name} → mpp.dev/api/ping/paid ($0.10)`);
    const charge = await apiPost('/v1/mpp/pay', {
      service_url: 'https://mpp.dev/api/ping/paid',
      amount: 0.10,
      agent_id: agentId,
      wallet_id: walletId,
    });

    if (charge?.status === 'completed') {
      assert(true, `${name} charge completed, transfer=${charge.transfer_id?.slice(0, 8)}...`);
      assert(!!charge.payment?.receipt_id, `Receipt: ${(charge.payment?.receipt_id || '').slice(0, 24)}...`);
      console.log(`  Method: ${charge.payment?.payment_method}`);
      if (charge.payment?.settlement_tx_hash) {
        console.log(`  TX: ${charge.payment.settlement_tx_hash}`);
      }
    } else {
      console.log(`  Result: ${JSON.stringify(charge).slice(0, 200)}`);
      assert(false, `${name} charge`, charge?.error || charge?.reason || 'see above');
    }
  }
}

// ============================================
// Phase 2: MPP Sessions + Vouchers
// ============================================

async function phase2_mppSessions() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Phase 2: MPP Sessions + Vouchers                 ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  const configs = [
    { name: 'TinaCaller', agentId: TINA_AGENT_ID, walletId: TINA_WALLET_ID, deposit: 1.00, vouchers: [0.10, 0.15, 0.25] },
    { name: 'CompanyIntelBot', agentId: companyAgentId, walletId: companyWalletId, deposit: 0.75, vouchers: [0.20, 0.30] },
  ];

  for (const s of configs) {
    if (!s.walletId) {
      console.log(`\n  ${s.name}: skipped (no wallet)`);
      continue;
    }
    console.log(`\n  ${s.name} opens session ($${s.deposit} deposit)`);
    const session = await apiPost('/v1/mpp/sessions', {
      service_url: 'https://mpp.dev/api/ping/paid',
      deposit_amount: s.deposit,
      agent_id: s.agentId,
      wallet_id: s.walletId,
      currency: 'USDC',
    });

    const sessId = session?.id;
    if (sessId) {
      assert(true, `Session opened: ${sessId.slice(0, 8)}...`);

      for (const vAmount of s.vouchers) {
        const v = await apiPost(`/v1/mpp/sessions/${sessId}/voucher`, { amount: vAmount });
        if (v?.voucher_index !== undefined) {
          assert(true, `Voucher $${vAmount}: idx=${v.voucher_index}, cumulative=$${v.cumulative_spent}`);
        } else {
          assert(false, `Voucher $${vAmount}`, v?.error || v?.reason || 'unknown');
        }
      }

      const close = await apiPost(`/v1/mpp/sessions/${sessId}/close`, {});
      const closed = close?.status === 'closed';
      const spent = close?.spentAmount ?? close?.spent_amount;
      assert(closed, `Session closed, spent=$${spent}`);
    } else {
      console.log(`  Result: ${JSON.stringify(session).slice(0, 200)}`);
      assert(false, `${s.name} session`, session?.error || session?.reason || 'see above');
    }
  }
}

// ============================================
// Phase 3: A2A Task — TinaCaller → CompanyIntelBot
// ============================================

async function phase3_a2aTaskTinaToCompany() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Phase 3: A2A Task — TinaCaller → CompanyIntelBot  ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  const rpc = await jsonRpc(companyAgentId, 'message/send', {
    message: {
      role: 'user',
      parts: [{ text: 'Research and provide a market analysis report on LATAM payment corridors' }],
      metadata: { callerAgentId: TINA_AGENT_ID },
    },
  });

  if (rpc.error) {
    console.log(`  A2A result: ${JSON.stringify(rpc.error).slice(0, 200)}`);
    assert(false, 'A2A task send', rpc.error.message || rpc.error.data);
    return;
  }

  const taskId = rpc.result?.id;
  assert(!!taskId, `Task created: ${taskId?.slice(0, 8)}...`);

  // Trigger processing
  await apiPostRaw(`/v1/a2a/tasks/${taskId}/process`, {});
  await sleep(2000);

  // Fetch final state
  const finalRpc = await jsonRpc(companyAgentId, 'tasks/get', { id: taskId });
  const task = finalRpc.result;
  assert(task?.status?.state === 'completed', `Task state: ${task?.status?.state}`);

  // Check for AP2 mandate creation
  const contextId = task?.contextId || task?.context_id;
  if (contextId) {
    console.log(`  Context ID: ${contextId}`);
    const timeline = await apiGet(`/v1/a2a/sessions/${contextId}`);
    if (timeline?.timeline) {
      console.log(`  Timeline events: ${timeline.timeline.length}`);
    }
  }

  // Check mandates for this agent pair
  const mandates = await apiGet(`/v1/ap2/mandates?agent_id=${companyAgentId}`);
  const recentMandate = mandates?.data?.[0];
  if (recentMandate) {
    assert(true, `AP2 mandate found: ${recentMandate.id?.slice(0, 8)}... currency=${recentMandate.currency}`);
  } else {
    console.log('  ℹ️  No AP2 mandate auto-created (expected — requires explicit creation)');
  }
}

// ============================================
// Phase 4: AP2 Mandate + On-Chain Execution
// ============================================

async function phase4_mandateExecution() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Phase 4: AP2 Mandate + On-Chain Execution        ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  // Get wallet addresses
  const { data: companyWallet } = await supabase
    .from('wallets')
    .select('wallet_address')
    .eq('id', companyWalletId)
    .single();

  const { data: tinaWallet } = await supabase
    .from('wallets')
    .select('wallet_address')
    .eq('id', TINA_WALLET_ID)
    .single();

  console.log(`  TinaCaller addr:       ${tinaWallet?.wallet_address?.slice(0, 14)}...`);
  console.log(`  CompanyIntelBot addr:  ${companyWallet?.wallet_address?.slice(0, 14)}...`);

  // Create a 25 pathUSD mandate: Acme Corp account authorizes TinaCaller (agent) to pay CompanyIntelBot
  // Using TinaCaller as agent_id so the wallet query finds the Tempo wallet with on-chain key
  console.log('\n  Creating AP2 mandate: Acme Corp → TinaCaller pays CompanyIntelBot (25 pathUSD)');
  const mandateResult = await apiPost('/v1/ap2/mandates', {
    account_id: TINA_ACCOUNT_ID,
    agent_id: TINA_AGENT_ID,
    agent_name: 'TinaCaller',
    mandate_type: 'payment',
    authorized_amount: 25,
    currency: 'pathUSD',
    metadata: {
      recipientAgentId: companyAgentId,
      recipientAddress: companyWallet?.wallet_address,
      purpose: 'Recurring API access for market data — pays CompanyIntelBot',
    },
  });

  const mandate = mandateResult?.data || mandateResult;
  if (!mandate?.id) {
    assert(false, 'Mandate creation', JSON.stringify(mandateResult).slice(0, 200));
    return;
  }
  assert(true, `Mandate created: ${mandate.id.slice(0, 8)}... authorized=$${mandate.authorized_amount}`);

  // Execute mandate 3 times
  const executions = [
    { amount: 5, desc: 'API access — batch 1' },
    { amount: 8, desc: 'API access — batch 2' },
    { amount: 3, desc: 'API access — batch 3' },
  ];

  let totalExecuted = 0;
  for (const exec of executions) {
    console.log(`\n  Execute mandate: $${exec.amount} pathUSD — ${exec.desc}`);
    const rawResult = await apiPostRaw(`/v1/ap2/mandates/${mandate.id}/execute`, {
      amount: exec.amount,
      currency: 'pathUSD',
      description: exec.desc,
    });
    const execData = rawResult?.data || rawResult;

    if (execData?.status === 'completed') {
      totalExecuted += exec.amount;
      assert(true, `Execution #${execData.execution_index}: $${exec.amount} completed`);
      assert(
        execData.remaining_amount === 25 - totalExecuted,
        `Remaining: $${execData.remaining_amount} (expected $${25 - totalExecuted})`,
      );

      if (execData.settlement_tx_hash) {
        assert(true, `Settlement TX: ${execData.settlement_tx_hash.slice(0, 20)}...`);
        assert(
          execData.settlement_network?.includes('tempo'),
          `Network: ${execData.settlement_network}`,
        );
      } else {
        console.log('  ℹ️  No on-chain settlement (wallet may lack key or recipient address)');
      }

      if (execData.wallet_deduction) {
        console.log(`  Wallet: ${execData.wallet_deduction.previousBalance} → ${execData.wallet_deduction.newBalance}`);
      }
    } else {
      assert(false, `Execution $${exec.amount}`, JSON.stringify(rawResult).slice(0, 200));
    }
  }

  // Verify mandate state
  const finalMandate = await apiGet(`/v1/ap2/mandates/${mandate.id}`);
  const fm = finalMandate?.data || finalMandate;
  if (fm) {
    console.log(`\n  Final mandate state:`);
    console.log(`    Authorized: $${fm.authorized_amount}`);
    console.log(`    Used:       $${fm.used_amount}`);
    console.log(`    Remaining:  $${fm.remaining_amount ?? (Number(fm.authorized_amount) - Number(fm.used_amount))}`);
    console.log(`    Executions: ${fm.executions?.length || fm.execution_count}`);
    assert(Number(fm.used_amount) === 16, `Used amount = $16 (5+8+3)`);

    // Print execution settlement details
    if (fm.executions) {
      for (const ex of fm.executions) {
        const txh = ex.settlement_tx_hash || ex.authorization_proof;
        if (txh && txh.startsWith('0x')) {
          console.log(`    Exec #${ex.execution_index}: TX=${txh.slice(0, 20)}... (${ex.settlement_network || 'tempo'})`);
        }
      }
    }
  }

  // Send A2A task from CompanyIntelBot → TinaCaller
  console.log('\n  A2A task: CompanyIntelBot → TinaCaller');
  const rpc = await jsonRpc(TINA_AGENT_ID, 'message/send', {
    message: {
      role: 'user',
      parts: [{ text: 'Set up a recurring payment mandate for API access services' }],
      metadata: { callerAgentId: companyAgentId },
    },
  });

  if (rpc.result?.id) {
    assert(true, `A2A task created: ${rpc.result.id.slice(0, 8)}...`);
    await apiPostRaw(`/v1/a2a/tasks/${rpc.result.id}/process`, {});
    await sleep(2000);
    const final = await jsonRpc(TINA_AGENT_ID, 'tasks/get', { id: rpc.result.id });
    assert(final.result?.status?.state === 'completed', `Task state: ${final.result?.status?.state}`);
  } else {
    console.log(`  ℹ️  A2A task: ${JSON.stringify(rpc.error || rpc).slice(0, 100)}`);
  }
}

// ============================================
// Phase 5: Verification
// ============================================

async function phase5_verification() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Phase 5: Verification & Scorecard                ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  // MPP Analytics
  console.log('\n  ── MPP Analytics ──');
  const analytics = await apiGet('/v1/mpp/analytics');
  if (analytics?.summary) {
    console.log(`  Total revenue:     $${analytics.summary.totalRevenue}`);
    console.log(`  Total sessions:    ${analytics.summary.totalSessions}`);
    console.log(`  Total spent:       $${analytics.summary.totalSpent}`);
    console.log(`  Unique agents:     ${analytics.summary.uniqueAgents}`);
    console.log(`  Unique services:   ${analytics.summary.uniqueServices}`);
  }

  // MPP Transfers
  console.log('\n  ── MPP Transfers (recent) ──');
  const transfers = await apiGet('/v1/mpp/transfers?limit=20');
  const txList = transfers?.data || (Array.isArray(transfers) ? transfers : []);
  for (const tx of txList.slice(0, 10)) {
    const meta = tx.protocolMetadata || tx.protocol_metadata;
    const txHash = tx.txHash || tx.tx_hash || meta?.settlement_tx_hash;
    console.log(`  ${tx.id?.slice(0, 8)}... $${tx.amount} ${tx.currency} [${meta?.payment_method || 'unknown'}]${txHash ? ` TX: ${txHash.slice(0, 16)}...` : ''}`);
  }

  // AP2 Mandates
  console.log('\n  ── AP2 Mandates ──');
  const mandates = await apiGet('/v1/ap2/mandates?limit=10');
  const mandateList = mandates?.data || (Array.isArray(mandates) ? mandates : []);
  for (const m of mandateList.slice(0, 5)) {
    console.log(`  ${m.id?.slice(0, 8)}... $${m.authorized_amount} ${m.currency} used=$${m.used_amount} [${m.status}]`);
  }

  // Re-sync DB balances to on-chain, then verify
  console.log('\n  ── Balance Verification (On-Chain vs DB) ──');
  for (const [name, wId] of [
    ['TinaCaller', TINA_WALLET_ID],
    ['CompanyIntelBot', companyWalletId],
  ] as const) {
    if (!wId) continue;
    const { data: w } = await supabase
      .from('wallets')
      .select('balance, currency, wallet_address')
      .eq('id', wId)
      .single();
    if (!w?.wallet_address) {
      console.log(`  ${name}: no wallet address`);
      continue;
    }
    const onChain = await readOnChainBalance(w.wallet_address);
    const dbBefore = Number(w.balance || 0);
    const drift = Math.abs(onChain - dbBefore);

    // Sync DB to on-chain if drifted (recipient credits happen on-chain only)
    if (drift > 0.001) {
      await supabase
        .from('wallets')
        .update({ balance: onChain, updated_at: new Date().toISOString() })
        .eq('id', wId);
      console.log(`  ${name}: DB ${dbBefore} -> ${onChain} pathUSD (re-synced)`);
    } else {
      console.log(`  ${name}: ${onChain} pathUSD (in sync)`);
    }
    assert(onChain > 0, `${name} on-chain balance > 0 (${onChain} pathUSD)`);
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Two-Agent MPP + A2A Demo: Real On-Chain pathUSD         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`API:   ${API}`);
  console.log(`Key:   ${API_KEY.slice(0, 15)}...`);
  console.log(`Date:  ${new Date().toISOString()}`);

  try {
    await phase0_setup();
    await phase1_mppDirectCharges();
    await phase2_mppSessions();
    await phase3_a2aTaskTinaToCompany();
    await phase4_mandateExecution();
    await phase5_verification();
  } catch (err: any) {
    console.error(`\n💥 Unhandled error: ${err.message}`);
    console.error(err.stack);
    failCount++;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  SCORECARD: ${passCount} passed, ${failCount} failed`);
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failCount > 0 ? 1 : 0);
}

main();
