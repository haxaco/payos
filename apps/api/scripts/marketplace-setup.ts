#!/usr/bin/env tsx
/**
 * Sly Marketplace Setup + Analysis
 *
 * Phase 1: Registers 10 agents + 2 merchants on sandbox.getsly.ai
 * Phase 2: Outputs credentials for each agent (used by Claude subagents)
 * Phase 3: After simulation, collects analysis from DB
 *
 * Usage:
 *   cd apps/api && set -a && source .env && set +a
 *   npx tsx scripts/marketplace-setup.ts [setup|analyze]
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const API = process.env.SLY_SANDBOX_URL || 'https://sandbox.getsly.ai';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const AGENT_DEFS = [
  { name: 'DataMiner', role: 'Data provider', skills: [{ id: 'market_data', name: 'Market Data', price: 0.50, tags: ['data'] }, { id: 'sentiment_analysis', name: 'Sentiment Analysis', price: 0.75, tags: ['data','ai'] }], strategy: 'Sell data. Raise prices when busy.', budget: 15 },
  { name: 'CodeSmith', role: 'Developer', skills: [{ id: 'code_review', name: 'Code Review', price: 1.00, tags: ['dev'] }, { id: 'bug_fix', name: 'Bug Fix', price: 2.00, tags: ['dev'] }], strategy: 'Premium pricing, high quality.', budget: 12 },
  { name: 'ResearchBot', role: 'Researcher', skills: [{ id: 'web_research', name: 'Web Research', price: 0.30, tags: ['research'] }, { id: 'deep_analysis', name: 'Deep Analysis', price: 1.50, tags: ['research','ai'] }], strategy: 'Undercut on price, win on volume.', budget: 15 },
  { name: 'TradingBot', role: 'Trader', skills: [{ id: 'trade_signal', name: 'Trade Signal', price: 0.80, tags: ['finance'] }, { id: 'portfolio_rebalance', name: 'Portfolio Rebalance', price: 1.50, tags: ['finance'] }], strategy: 'Buy data, sell signals.', budget: 15 },
  { name: 'ContentGen', role: 'Content creator', skills: [{ id: 'copywriting', name: 'Copywriting', price: 0.60, tags: ['content'] }, { id: 'translation', name: 'Translation', price: 0.40, tags: ['content'] }], strategy: 'Cheap and fast, accept everything.', budget: 12 },
  { name: 'AuditBot', role: 'Compliance', skills: [{ id: 'contract_audit', name: 'Contract Audit', price: 2.50, tags: ['compliance'] }, { id: 'risk_assessment', name: 'Risk Assessment', price: 1.00, tags: ['compliance'] }], strategy: 'Expensive expert. Never go below $1.', budget: 10 },
  { name: 'SupportBot', role: 'Customer service', skills: [{ id: 'ticket_resolution', name: 'Ticket Resolution', price: 0.25, tags: ['support'] }, { id: 'escalation', name: 'Escalation', price: 0.50, tags: ['support'] }], strategy: 'Cheapest option. High volume.', budget: 15 },
  { name: 'AnalyticsBot', role: 'Analytics', skills: [{ id: 'dashboard_report', name: 'Dashboard Report', price: 0.75, tags: ['analytics'] }, { id: 'data_viz', name: 'Data Visualization', price: 1.00, tags: ['analytics'] }], strategy: 'Buy raw data, sell premium reports.', budget: 15 },
  { name: 'SecurityBot', role: 'Security', skills: [{ id: 'vulnerability_scan', name: 'Vulnerability Scan', price: 1.50, tags: ['security'] }, { id: 'pen_test', name: 'Penetration Test', price: 3.00, tags: ['security'] }], strategy: 'High-value security. Test KYA limits with $25+ purchases.', budget: 10 },
  { name: 'OpsBot', role: 'DevOps', skills: [{ id: 'deploy', name: 'Deployment', price: 0.50, tags: ['ops'] }, { id: 'monitoring', name: 'Monitoring Setup', price: 0.30, tags: ['ops'] }], strategy: 'Utility agent. Low prices, sell to everyone.', budget: 15 },
];

// ============================================
// Setup
// ============================================

async function setup() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Marketplace Setup — 10 Agents + 2 Merchants ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Generate beta codes
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = 'beta_mkt_' + randomBytes(8).toString('hex');
    await supabase.from('beta_access_codes').insert({ code, status: 'active', max_uses: 1, current_uses: 0, created_by: 'marketplace' });
    codes.push(code);
  }

  // Register agents
  const agents: any[] = [];
  for (let i = 0; i < AGENT_DEFS.length; i++) {
    const def = AGENT_DEFS[i];
    process.stdout.write(`  Registering ${def.name}...`);

    const res = await fetch(`${API}/v1/onboarding/agent/one-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: def.name,
        email: `mkt-${def.name.toLowerCase()}@sim.getsly.ai`,
        description: `${def.role} — ${def.strategy}`,
        inviteCode: codes[i],
      }),
    });
    const data = (await res.json()).data;

    if (!data?.agent?.id) {
      console.log(' ❌');
      continue;
    }

    // Register skills
    for (const skill of def.skills) {
      await fetch(`${API}/v1/agents/${data.agent.id}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.credentials.token}` },
        body: JSON.stringify({ skill_id: skill.id, name: skill.name, tags: skill.tags, base_price: skill.price, currency: 'USDC' }),
      });
    }

    // Set A2A endpoint + discoverable
    await supabase.from('agents').update({
      endpoint_url: `${API}/a2a/${data.agent.id}`,
      endpoint_type: 'a2a',
      endpoint_enabled: true,
      processing_mode: 'managed',
      discoverable: true,
    }).eq('id', data.agent.id);

    agents.push({
      ...def,
      agentId: data.agent.id,
      tenantId: data.tenant.id,
      accountId: data.account.id,
      token: data.credentials.token,
      walletId: data.wallet.id,
      baseWalletId: data.baseWallet?.id,
      baseAddr: data.baseWallet?.address,
    });

    console.log(` ✅ ${data.baseWallet?.address?.slice(0, 12) || 'no-addr'}...`);
  }

  // Create connected accounts for Stripe (needed for UCP/ACP)
  for (const agent of agents) {
    await supabase.from('connected_accounts').insert({
      tenant_id: agent.tenantId,
      handler_type: 'stripe',
      handler_name: 'Stripe Test',
      status: 'active',
      credentials_encrypted: '{}',
      metadata: { account_id: `acct_mkt_${agent.name.toLowerCase()}`, business_name: agent.name },
    });
  }

  console.log(`\n  ✅ ${agents.length} agents registered\n`);

  // Wait for faucet
  console.log('  ⏳ Waiting 15s for Circle faucet drips...\n');
  await new Promise(r => setTimeout(r, 15000));

  // Verify balances
  console.log('  === Agent Directory ===\n');
  for (const agent of agents) {
    const wid = agent.baseWalletId || agent.walletId;
    const sync = await fetch(`${API}/v1/wallets/${wid}/sync`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${agent.token}` },
    }).then(r => r.json());
    const bal = sync.data?.data?.balance ?? '?';
    console.log(`  ${agent.name.padEnd(14)} | ${bal} USDC | ${agent.baseAddr || 'no-addr'}`);
    console.log(`    Skills: ${agent.skills.map((s: any) => `${s.name}($${s.price})`).join(', ')}`);
    console.log(`    Token: ${agent.token.slice(0, 20)}...`);
    console.log(`    Agent ID: ${agent.agentId}`);
    console.log('');
  }

  // Save to file for subagents
  const fs = await import('fs');
  fs.writeFileSync('/tmp/marketplace-agents.json', JSON.stringify(agents, null, 2));
  console.log('  Credentials saved to /tmp/marketplace-agents.json');
  console.log('  Ready to spawn subagents!\n');
}

// ============================================
// Analyze
// ============================================

async function analyze() {
  const fs = await import('fs');
  const agents = JSON.parse(fs.readFileSync('/tmp/marketplace-agents.json', 'utf8'));
  const tenantIds = agents.map((a: any) => a.tenantId);

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  MARKETPLACE ANALYSIS                    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Transfers
  const { data: transfers } = await supabase.from('transfers').select('*').in('tenant_id', tenantIds);
  const { data: intents } = await supabase.from('payment_intents').select('*').in('tenant_id', tenantIds);
  const { data: tasks } = await supabase.from('a2a_tasks').select('*').in('tenant_id', tenantIds);
  const { data: feedback } = await supabase.from('a2a_task_feedback').select('*').in('tenant_id', tenantIds);
  const { data: disputes } = await supabase.from('disputes').select('*').in('tenant_id', tenantIds);
  const { data: mandates } = await supabase.from('ap2_mandates').select('*').in('tenant_id', tenantIds);

  console.log('=== Agent Leaderboard ===\n');
  for (const agent of agents) {
    const wid = agent.baseWalletId || agent.walletId;
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('id', wid).single();
    const txOut = (transfers || []).filter((t: any) => t.tenant_id === agent.tenantId).length;
    const txIn = (transfers || []).filter((t: any) => t.destination_tenant_id === agent.tenantId).length;
    const taskCount = (tasks || []).filter((t: any) => t.agent_id === agent.agentId || t.client_agent_id === agent.agentId).length;
    const ratings = (feedback || []).filter((f: any) => f.provider_agent_id === agent.agentId);
    const avgRating = ratings.length > 0 ? (ratings.reduce((s: number, f: any) => s + (f.score || 0), 0) / ratings.length).toFixed(0) : 'N/A';

    console.log(`  ${agent.name.padEnd(14)} | ${(wallet?.balance || 0).toString().padEnd(8)} USDC | Out: ${txOut.toString().padEnd(3)} In: ${txIn.toString().padEnd(3)} | Tasks: ${taskCount.toString().padEnd(3)} | Rating: ${avgRating}`);
  }

  console.log('\n=== Protocol Breakdown ===\n');
  const x402 = (transfers || []).filter((t: any) => t.type === 'x402');
  const onChain = x402.filter((t: any) => t.protocol_metadata?.settlement_type === 'on_chain');
  const a2aTasks = tasks || [];
  console.log(`  x402:      ${x402.length} transfers (${onChain.length} on-chain)`);
  console.log(`  A2A:       ${a2aTasks.length} tasks (${a2aTasks.filter((t: any) => t.state === 'completed').length} completed, ${a2aTasks.filter((t: any) => t.state === 'failed').length} failed)`);
  console.log(`  AP2:       ${(mandates || []).length} mandates`);
  console.log(`  Intents:   ${(intents || []).length} deferred (${(intents || []).filter((i: any) => i.status === 'settled').length} settled)`);
  console.log(`  Disputes:  ${(disputes || []).length}`);
  console.log(`  Feedback:  ${(feedback || []).length} ratings`);

  if (onChain.length > 0) {
    console.log('\n=== On-Chain Settlements ===\n');
    for (const t of onChain.slice(0, 15)) {
      const txHash = t.protocol_metadata?.tx_hash;
      if (txHash) console.log(`  ${t.amount} USDC | https://sepolia.basescan.org/tx/${txHash}`);
    }
  }

  if ((feedback || []).length > 0) {
    console.log('\n=== Rating Distribution ===\n');
    const satisfactions: Record<string, number> = {};
    for (const f of feedback || []) {
      satisfactions[f.satisfaction] = (satisfactions[f.satisfaction] || 0) + 1;
    }
    for (const [k, v] of Object.entries(satisfactions)) {
      console.log(`  ${k}: ${v} (${((v / (feedback || []).length) * 100).toFixed(0)}%)`);
    }
  }

  console.log('\n=== Wallet Addresses (BaseScan Sepolia) ===\n');
  for (const agent of agents) {
    if (agent.baseAddr) console.log(`  ${agent.name.padEnd(14)} | https://sepolia.basescan.org/address/${agent.baseAddr}`);
  }
}

// ============================================
// Main
// ============================================

const command = process.argv[2] || 'setup';
if (command === 'setup') setup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
else if (command === 'analyze') analyze().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
else console.log('Usage: npx tsx scripts/marketplace-setup.ts [setup|analyze]');
