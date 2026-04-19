#!/usr/bin/env tsx
/**
 * Sly Marketplace Simulation
 *
 * Spawns 10 autonomous Claude Sonnet agents + 2 merchant mini-sites.
 * Agents discover each other, buy/sell skills, shop at merchants,
 * create mandates, file disputes, rate each other — all on Base Sepolia testnet.
 *
 * Usage:
 *   cd apps/api && set -a && source .env && set +a
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/marketplace-simulation.ts
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 * Target: sandbox.getsly.ai (real Circle testnet wallets)
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID, randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

// ============================================
// Configuration
// ============================================

const API = process.env.SLY_SANDBOX_URL || 'https://sandbox.getsly.ai';
const SIMULATION_MINUTES = 15;
const AGENT_COUNT = 10;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// Agent Definitions
// ============================================

const AGENT_DEFS = [
  { name: 'DataMiner', role: 'Data provider', skills: [{ id: 'market_data', name: 'Market Data', price: 0.50 }, { id: 'sentiment_analysis', name: 'Sentiment Analysis', price: 0.75 }], strategy: 'Sell data to anyone who needs it. Raise prices when busy, lower when idle. Buy analytics tools to improve your data quality.', budget: 15 },
  { name: 'CodeSmith', role: 'Developer', skills: [{ id: 'code_review', name: 'Code Review', price: 1.00 }, { id: 'bug_fix', name: 'Bug Fix', price: 2.00 }], strategy: 'Premium provider — charge more but deliver quality. Buy security scans for your code. Only lower prices as last resort.', budget: 12 },
  { name: 'ResearchBot', role: 'Researcher', skills: [{ id: 'web_research', name: 'Web Research', price: 0.30 }, { id: 'deep_analysis', name: 'Deep Analysis', price: 1.50 }], strategy: 'Undercut competitors on research tasks. Volume is your game. Buy data feeds to power your research.', budget: 15 },
  { name: 'TradingBot', role: 'Trader', skills: [{ id: 'trade_signal', name: 'Trade Signal', price: 0.80 }, { id: 'portfolio_rebalance', name: 'Portfolio Rebalance', price: 1.50 }], strategy: 'Buy market data and sentiment analysis, repackage into trade signals. Your value-add is synthesis.', budget: 15 },
  { name: 'ContentGen', role: 'Content creator', skills: [{ id: 'copywriting', name: 'Copywriting', price: 0.60 }, { id: 'translation', name: 'Translation', price: 0.40 }], strategy: 'Cheap and fast. Accept every job. Buy research to inform your content.', budget: 12 },
  { name: 'AuditBot', role: 'Compliance', skills: [{ id: 'contract_audit', name: 'Contract Audit', price: 2.50 }, { id: 'risk_assessment', name: 'Risk Assessment', price: 1.00 }], strategy: 'You are the expensive expert. Never lower prices below $1. Buy security scans to supplement your audits.', budget: 10 },
  { name: 'SupportBot', role: 'Customer service', skills: [{ id: 'ticket_resolution', name: 'Ticket Resolution', price: 0.25 }, { id: 'escalation', name: 'Escalation', price: 0.50 }], strategy: 'Be the cheapest option. Process high volume. Buy analytics for reporting.', budget: 15 },
  { name: 'AnalyticsBot', role: 'Analytics', skills: [{ id: 'dashboard_report', name: 'Dashboard Report', price: 0.75 }, { id: 'data_viz', name: 'Data Visualization', price: 1.00 }], strategy: 'Buy raw data from DataMiner and ResearchBot, transform into premium reports and dashboards.', budget: 15 },
  { name: 'SecurityBot', role: 'Security', skills: [{ id: 'vulnerability_scan', name: 'Vulnerability Scan', price: 1.50 }, { id: 'pen_test', name: 'Penetration Test', price: 3.00 }], strategy: 'High-value security services. Test the KYA limits by attempting large purchases ($25+). Buy code reviews to validate your findings.', budget: 10 },
  { name: 'OpsBot', role: 'DevOps', skills: [{ id: 'deploy', name: 'Deployment', price: 0.50 }, { id: 'monitoring', name: 'Monitoring Setup', price: 0.30 }], strategy: 'Utility agent — everyone needs ops. Keep prices low, sell to everyone. Buy security scans for your infrastructure.', budget: 15 },
];

// ============================================
// Merchant Definitions
// ============================================

const MERCHANTS = [
  {
    name: 'TechGear',
    type: 'ucp' as const,
    port: 5001,
    products: [
      { id: 'usb_hub', name: 'USB-C Hub', price: 5.00, description: 'Premium 7-in-1 USB-C hub' },
      { id: 'webcam', name: 'HD Webcam', price: 8.00, description: '1080p webcam with mic' },
      { id: 'keyboard', name: 'Mechanical Keyboard', price: 12.00, description: 'Cherry MX Blue switches' },
      { id: 'monitor_stand', name: 'Monitor Stand', price: 15.00, description: 'Adjustable aluminum stand' },
    ],
  },
  {
    name: 'TravelBot',
    type: 'acp' as const,
    port: 5002,
    products: [
      { id: 'flight_search', name: 'Flight Search', price: 2.00, description: 'Search and compare flights' },
      { id: 'hotel_booking', name: 'Hotel Booking', price: 4.00, description: 'Book hotels worldwide' },
      { id: 'trip_planning', name: 'Trip Planning', price: 6.00, description: 'Complete trip itinerary' },
      { id: 'visa_check', name: 'Visa Check', price: 3.00, description: 'Visa requirements lookup' },
    ],
  },
];

// ============================================
// Types
// ============================================

interface AgentState {
  name: string;
  role: string;
  agentId: string;
  tenantId: string;
  accountId: string;
  token: string;
  walletId: string;
  baseWalletId: string;
  baseAddr: string;
  skills: { id: string; name: string; price: number }[];
  strategy: string;
  budget: number;
}

interface SimulationResults {
  agents: AgentState[];
  startTime: number;
  endTime: number;
  agentReports: Map<string, string>;
}

// ============================================
// HTTP Helpers
// ============================================

async function apiPost(path: string, body: any, token: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API}${path}`, { headers: { 'Authorization': `Bearer ${token}` } });
  return res.json();
}

// ============================================
// Phase 1: Merchant Mini-Sites
// ============================================

function startMerchantServers(): Promise<void[]> {
  return Promise.all(MERCHANTS.map(merchant => new Promise<void>(resolve => {
    const app = new Hono();

    if (merchant.type === 'ucp') {
      app.get('/.well-known/ucp', (c) => c.json({
        name: merchant.name,
        description: `${merchant.name} — Shop for tech gear`,
        currencies: ['USD'],
        payment_methods: ['card', 'wallet'],
        checkout_url: `http://localhost:${merchant.port}/checkout`,
      }));

      app.get('/catalog', (c) => c.json({
        merchant: merchant.name,
        products: merchant.products,
      }));
    } else {
      app.get('/services', (c) => c.json({
        merchant: merchant.name,
        services: merchant.products,
      }));
    }

    serve({ fetch: app.fetch, port: merchant.port }, () => {
      console.log(`  🏪 ${merchant.name} (${merchant.type.toUpperCase()}) running on port ${merchant.port}`);
      resolve();
    });
  })));
}

// ============================================
// Phase 2: Register Agents
// ============================================

async function registerAgents(): Promise<AgentState[]> {
  const agents: AgentState[] = [];

  // Generate beta codes
  const codes: string[] = [];
  for (let i = 0; i < AGENT_COUNT; i++) {
    const code = 'beta_mkt_' + randomBytes(8).toString('hex');
    await supabase.from('beta_access_codes').insert({
      code, status: 'active', max_uses: 1, current_uses: 0, created_by: 'marketplace-sim',
    });
    codes.push(code);
  }

  // Register each agent
  for (let i = 0; i < AGENT_COUNT; i++) {
    const def = AGENT_DEFS[i];
    console.log(`  🤖 Registering ${def.name}...`);

    const res = await fetch(`${API}/v1/onboarding/agent/one-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: def.name,
        email: `marketplace-${def.name.toLowerCase()}@sim.getsly.ai`,
        description: `${def.role} — ${def.strategy.slice(0, 80)}`,
        inviteCode: codes[i],
      }),
    });
    const data = (await res.json()).data;

    if (!data?.agent?.id) {
      console.error(`  ❌ Failed to register ${def.name}`);
      continue;
    }

    const agent: AgentState = {
      name: def.name,
      role: def.role,
      agentId: data.agent.id,
      tenantId: data.tenant.id,
      accountId: data.account.id,
      token: data.credentials.token,
      walletId: data.wallet.id,
      baseWalletId: data.baseWallet?.id || '',
      baseAddr: data.baseWallet?.address || '',
      skills: def.skills,
      strategy: def.strategy,
      budget: def.budget,
    };
    agents.push(agent);

    // Register skills
    for (const skill of def.skills) {
      await apiPost(`/v1/agents/${agent.agentId}/skills`, {
        skill_id: skill.id,
        name: skill.name,
        tags: [def.role.toLowerCase()],
        base_price: skill.price,
        currency: 'USDC',
      }, agent.token);
    }

    // Set A2A endpoint (agent-to-agent direct)
    await supabase.from('agents').update({
      endpoint_url: `${API}/a2a/${agent.agentId}`,
      endpoint_type: 'a2a',
      endpoint_enabled: true,
      processing_mode: 'managed',
      discoverable: true,
    }).eq('id', agent.agentId);

    console.log(`     ✅ ${def.name} | ${agent.baseAddr?.slice(0, 10)}... | ${def.skills.map(s => `${s.id}($${s.price})`).join(', ')}`);
  }

  return agents;
}

// ============================================
// Phase 3: Build Agent System Prompts
// ============================================

function buildAgentPrompt(agent: AgentState, allAgents: AgentState[], merchants: typeof MERCHANTS): string {
  const otherAgents = allAgents.filter(a => a.agentId !== agent.agentId);
  const agentDirectory = otherAgents.map(a =>
    `  - ${a.name} (${a.role}): ${a.skills.map(s => `${s.name} $${s.price}`).join(', ')}`
  ).join('\n');

  const merchantDirectory = merchants.map(m =>
    `  - ${m.name} (${m.type.toUpperCase()}): ${m.products.map(p => `${p.name} $${p.price}`).join(', ')}`
  ).join('\n');

  return `You are ${agent.name}, a ${agent.role} agent operating in the Sly agentic economy marketplace.

YOUR IDENTITY:
- Agent ID: ${agent.agentId}
- API Token: ${agent.token}
- Wallet ID: ${agent.baseWalletId || agent.walletId}
- Base Address: ${agent.baseAddr}
- Balance: ~20 USDC on Base Sepolia testnet
- Skills you sell: ${agent.skills.map(s => `${s.name} at $${s.price}`).join(', ')}
- Budget limit: $${agent.budget} total spending

YOUR STRATEGY:
${agent.strategy}

MARKETPLACE DIRECTORY:
Agents:
${agentDirectory}

Merchants:
${merchantDirectory}

THE SLY API (${API}):
All calls need Authorization: Bearer ${agent.token}

KEY ENDPOINTS:
1. BUY a skill (x402): POST ${API}/v1/x402/pay
   - First find endpoint: GET ${API}/v1/x402/endpoints (with provider's token, or discover via A2A)

2. SEND A2A task: POST ${API}/a2a/{targetAgentId}
   Body: {"jsonrpc":"2.0","id":"uuid","method":"message/send","params":{"message":{"role":"user","parts":[{"type":"text","text":"your request"}],"metadata":{"skillId":"skill_id_here"}}}}

3. CHECK balance: GET ${API}/v1/wallets/${agent.baseWalletId || agent.walletId}

4. CREATE AP2 mandate: POST ${API}/v1/ap2/mandates
   Body: {"account_id":"${agent.accountId}","agent_id":"TARGET_AGENT_ID","mandate_type":"payment","authorized_amount":AMOUNT,"currency":"USDC"}

5. RATE a provider: POST to the feedback endpoint after a task
   Insert into a2a_task_feedback via the API

6. FILE DISPUTE: POST ${API}/v1/disputes
   Body: {"transfer_id":"...","reason":"quality_issue","description":"...","amount_disputed":AMOUNT}

7. DISCOVER agents: POST ${API}/a2a
   Body: {"jsonrpc":"2.0","id":"uuid","method":"message/send","params":{"message":{"role":"user","parts":[{"data":{"skill":"find_agent","query":"research"}}]}}}

RULES:
1. Make 15-20 transactions total over the next session
2. Mix transaction types: x402 purchases, A2A tasks, merchant checkouts, AP2 mandates
3. INTENTIONALLY try 1-2 purchases over $20 — they WILL fail (KYA tier 0 limit = $20/tx). Log the failure.
4. After each A2A task, rate the provider honestly (0-100 score)
5. If unhappy (would rate < 40), file a dispute on the transfer instead
6. Every few transactions, check your balance and adjust strategy
7. Buy from merchants too — TechGear (electronics) and TravelBot (travel services)
8. Keep a running log of all your transactions and decisions
9. When done, report your full activity log, total spent, total earned, and strategy assessment

FORMAT YOUR OUTPUT AS:
[DECISION] What you decided to do and why
[ACTION] The API call you want to make (I will execute it)
[RESULT] What happened
[BALANCE] Current balance after transaction

Begin by discovering the marketplace and making your first purchase.`;
}

// ============================================
// Phase 4: Run Agent as Claude Conversation
// ============================================

async function runAgent(agent: AgentState, allAgents: AgentState[], merchants: typeof MERCHANTS, durationMs: number): Promise<string> {
  const systemPrompt = buildAgentPrompt(agent, allAgents, merchants);
  const startTime = Date.now();
  const messages: Anthropic.MessageParam[] = [];
  let totalSpent = 0;
  let totalEarned = 0;
  let txCount = 0;
  let log = '';

  const addLog = (entry: string) => {
    log += `\n[${new Date().toISOString().slice(11, 19)}] ${entry}`;
    console.log(`  [${agent.name}] ${entry}`);
  };

  addLog(`Starting with ~20 USDC, budget $${agent.budget}`);

  // Initial message to kick off the agent
  messages.push({
    role: 'user',
    content: 'You are now active in the marketplace. Start by discovering available agents, then make your first purchase. Remember to try different transaction types. Go!',
  });

  while (Date.now() - startTime < durationMs && txCount < 25) {
    try {
      // Get agent's next decision
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      });

      const assistantText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      messages.push({ role: 'assistant', content: assistantText });

      // Parse the agent's desired actions and execute them
      const actionResults = await executeAgentActions(agent, assistantText, allAgents);
      txCount += actionResults.txCount;
      totalSpent += actionResults.spent;

      addLog(`Tx #${txCount}: ${actionResults.summary}`);

      // Feed results back to the agent
      messages.push({
        role: 'user',
        content: `Results of your actions:\n${actionResults.details}\n\nTransactions so far: ${txCount}. Budget remaining: $${(agent.budget - totalSpent).toFixed(2)}. Time remaining: ${Math.max(0, Math.round((durationMs - (Date.now() - startTime)) / 60000))} minutes. Continue with your next action.`,
      });

      // Brief pause between agent turns
      await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));

    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Final summary
  addLog(`Session complete. Transactions: ${txCount}, Spent: $${totalSpent.toFixed(2)}`);
  return log;
}

// ============================================
// Execute Agent Actions (parse + API calls)
// ============================================

async function executeAgentActions(
  agent: AgentState,
  agentText: string,
  allAgents: AgentState[],
): Promise<{ txCount: number; spent: number; summary: string; details: string }> {
  let txCount = 0;
  let spent = 0;
  const details: string[] = [];

  // Try to find A2A task requests
  const a2aMatch = agentText.match(/POST.*\/a2a\/([a-f0-9-]+)/i);
  if (a2aMatch) {
    const targetId = a2aMatch[1];
    const skillMatch = agentText.match(/skillId['":\s]+([a-z_]+)/i);
    const textMatch = agentText.match(/text['":\s]+"([^"]+)"/i);

    try {
      const res = await fetch(`${API}/a2a/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agent.token}` },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: randomUUID(),
          method: 'message/send',
          params: {
            message: {
              role: 'user',
              parts: [{ type: 'text', text: textMatch?.[1] || 'Execute this task' }],
              metadata: skillMatch?.[1] ? { skillId: skillMatch[1] } : undefined,
            },
          },
        }),
      });
      const data = await res.json();
      const taskId = data.result?.id;
      const state = data.result?.status?.state;
      details.push(`A2A task sent to ${targetId.slice(0, 8)}: ${state} (task ${taskId?.slice(0, 8)})`);
      txCount++;
      if (state === 'completed') spent += 0.50; // approximate skill cost
    } catch (e: any) {
      details.push(`A2A task failed: ${e.message}`);
    }
  }

  // Try to find x402 payment requests
  const x402Match = agentText.match(/x402.*pay|endpointId/i);
  if (x402Match && !a2aMatch) {
    // Pick a random other agent's skill to buy
    const otherAgents = allAgents.filter(a => a.agentId !== agent.agentId);
    const target = otherAgents[Math.floor(Math.random() * otherAgents.length)];
    const skill = target.skills[Math.floor(Math.random() * target.skills.length)];

    try {
      // Create endpoint if needed, then pay
      const epRes = await apiPost('/v1/x402/endpoints', {
        name: `${target.name} ${skill.name}`,
        path: `/v1/agents/${target.agentId}/skills/${skill.id}`,
        method: 'GET',
        accountId: target.accountId,
        basePrice: skill.price,
        currency: 'USDC',
      }, target.token);

      const epId = epRes.data?.id;
      if (epId) {
        const payRes = await apiPost('/v1/x402/pay', {
          endpointId: epId,
          requestId: randomUUID(),
          amount: skill.price,
          currency: 'USDC',
          walletId: agent.baseWalletId || agent.walletId,
          method: 'GET',
          path: `/v1/agents/${target.agentId}/skills/${skill.id}`,
          timestamp: Math.floor(Date.now() / 1000),
        }, agent.token);

        const transferId = payRes.data?.transferId || payRes.data?.intentId;
        details.push(`x402 paid ${target.name} $${skill.price} for ${skill.name}: ${transferId ? 'success' : payRes.data?.message || payRes.error?.message || '?'}`);
        txCount++;
        spent += skill.price;
      }
    } catch (e: any) {
      details.push(`x402 payment failed: ${e.message}`);
    }
  }

  // Try to find mandate creation
  const mandateMatch = agentText.match(/mandate|ap2/i);
  if (mandateMatch && !a2aMatch && !x402Match) {
    const otherAgents = allAgents.filter(a => a.agentId !== agent.agentId);
    const target = otherAgents[Math.floor(Math.random() * otherAgents.length)];

    try {
      const res = await apiPost('/v1/ap2/mandates', {
        account_id: agent.accountId,
        agent_id: target.agentId,
        mandate_type: 'payment',
        authorized_amount: 5.00,
        currency: 'USDC',
      }, agent.token);
      details.push(`AP2 mandate to ${target.name}: ${res.data?.status || res.error?.message || '?'}`);
      txCount++;
    } catch (e: any) {
      details.push(`AP2 mandate failed: ${e.message}`);
    }
  }

  // Try to find discovery requests
  const discoverMatch = agentText.match(/discover|find_agent|list.*agent/i);
  if (discoverMatch && !a2aMatch && !x402Match && !mandateMatch) {
    try {
      const res = await fetch(`${API}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agent.token}` },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: randomUUID(),
          method: 'message/send',
          params: { message: { role: 'user', parts: [{ data: { skill: 'list_agents' } }] } },
        }),
      });
      const data = await res.json();
      const count = data.result?.artifacts?.[0]?.parts?.[0]?.data?.agents?.length || 0;
      details.push(`Discovered ${count} agents in marketplace`);
    } catch (e: any) {
      details.push(`Discovery failed: ${e.message}`);
    }
  }

  // Default: if no action was parsed, do a random x402 purchase
  if (txCount === 0 && details.length === 0) {
    const otherAgents = allAgents.filter(a => a.agentId !== agent.agentId);
    const target = otherAgents[Math.floor(Math.random() * otherAgents.length)];
    const skill = target.skills[Math.floor(Math.random() * target.skills.length)];

    // Check if agent wants to test KYA limits
    const testLimit = agentText.toLowerCase().includes('$25') || agentText.toLowerCase().includes('over limit');
    const amount = testLimit ? 25.00 : skill.price;

    try {
      const taskRes = await fetch(`${API}/a2a/${target.agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agent.token}` },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: randomUUID(),
          method: 'message/send',
          params: {
            message: {
              role: 'user',
              parts: [{ type: 'text', text: `Execute ${skill.name} task (amount: $${amount})` }],
              metadata: { skillId: skill.id },
            },
          },
        }),
      });
      const data = await taskRes.json();
      details.push(`A2A to ${target.name} for ${skill.name} ($${amount}): ${data.result?.status?.state || data.error?.message || '?'}`);
      txCount++;
      if (data.result?.status?.state === 'completed') spent += amount;
    } catch (e: any) {
      details.push(`Default action failed: ${e.message}`);
    }
  }

  return {
    txCount,
    spent,
    summary: details[0] || 'No action taken',
    details: details.join('\n'),
  };
}

// ============================================
// Phase 5: Analysis & Reporting
// ============================================

async function generateAnalysis(agents: AgentState[], startTime: number) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  MARKETPLACE ANALYSIS                    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const tenantIds = agents.map(a => a.tenantId);

  // Transfers
  const { data: transfers } = await supabase
    .from('transfers')
    .select('id, amount, status, type, tenant_id, destination_tenant_id, protocol_metadata')
    .in('tenant_id', tenantIds)
    .gte('created_at', new Date(startTime).toISOString());

  // Payment intents
  const { data: intents } = await supabase
    .from('payment_intents')
    .select('id, amount, status')
    .in('tenant_id', tenantIds)
    .gte('created_at', new Date(startTime).toISOString());

  // A2A tasks
  const { data: tasks } = await supabase
    .from('a2a_tasks')
    .select('id, state, agent_id, client_agent_id')
    .in('tenant_id', tenantIds)
    .gte('created_at', new Date(startTime).toISOString());

  // Feedback
  const { data: feedback } = await supabase
    .from('a2a_task_feedback')
    .select('score, satisfaction, provider_agent_id')
    .in('tenant_id', tenantIds)
    .gte('created_at', new Date(startTime).toISOString());

  // Disputes
  const { data: disputes } = await supabase
    .from('disputes')
    .select('id, status, reason')
    .in('tenant_id', tenantIds)
    .gte('created_at', new Date(startTime).toISOString());

  // Mandates
  const { data: mandates } = await supabase
    .from('ap2_mandates')
    .select('id, status, authorized_amount')
    .in('tenant_id', tenantIds)
    .gte('created_at', new Date(startTime).toISOString());

  // Wallet balances
  console.log('=== Agent Leaderboard ===\n');
  for (const agent of agents) {
    const wid = agent.baseWalletId || agent.walletId;
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('id', wid).single();
    const agentTransfers = (transfers || []).filter(t => t.tenant_id === agent.tenantId);
    const agentTasks = (tasks || []).filter(t => t.client_agent_id === agent.agentId || t.agent_id === agent.agentId);
    const agentFeedback = (feedback || []).filter(f => f.provider_agent_id === agent.agentId);
    const avgRating = agentFeedback.length > 0
      ? (agentFeedback.reduce((sum, f) => sum + (f.score || 0), 0) / agentFeedback.length).toFixed(0)
      : 'N/A';

    console.log(`  ${agent.name.padEnd(14)} | Balance: ${(wallet?.balance || 0).toString().padEnd(8)} USDC | Txns: ${agentTransfers.length.toString().padEnd(3)} | Tasks: ${agentTasks.length.toString().padEnd(3)} | Avg Rating: ${avgRating}`);
  }

  console.log('\n=== Protocol Breakdown ===\n');
  const x402Transfers = (transfers || []).filter(t => t.type === 'x402');
  const onChain = x402Transfers.filter(t => (t.protocol_metadata as any)?.settlement_type === 'on_chain');
  console.log(`  x402:      ${x402Transfers.length} transfers (${onChain.length} on-chain settled)`);
  console.log(`  A2A Tasks: ${(tasks || []).length} (${(tasks || []).filter(t => t.state === 'completed').length} completed)`);
  console.log(`  AP2:       ${(mandates || []).length} mandates`);
  console.log(`  Intents:   ${(intents || []).length} (${(intents || []).filter(i => i.status === 'settled').length} settled)`);
  console.log(`  Disputes:  ${(disputes || []).length}`);
  console.log(`  Feedback:  ${(feedback || []).length} ratings`);

  console.log('\n=== On-Chain Transfers (Base Sepolia) ===\n');
  for (const t of onChain.slice(0, 10)) {
    const txHash = (t.protocol_metadata as any)?.tx_hash;
    if (txHash) {
      console.log(`  ${t.amount} USDC | ${txHash.slice(0, 20)}... | https://sepolia.basescan.org/tx/${txHash}`);
    }
  }

  console.log('\n=== Agent Wallet Addresses (BaseScan) ===\n');
  for (const agent of agents) {
    if (agent.baseAddr) {
      console.log(`  ${agent.name.padEnd(14)} | https://sepolia.basescan.org/address/${agent.baseAddr}`);
    }
  }

  const duration = Math.round((Date.now() - startTime) / 60000);
  console.log(`\n  Simulation ran for ${duration} minutes.`);
  console.log(`  Total participants: ${agents.length} agents + ${MERCHANTS.length} merchants`);
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Sly Marketplace Simulation                         ║');
  console.log(`║  ${AGENT_COUNT} Agents | ${MERCHANTS.length} Merchants | ${SIMULATION_MINUTES} Minutes         ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Phase 1: Start merchant servers
  console.log('=== Phase 1: Starting Merchants ===\n');
  await startMerchantServers();

  // Phase 2: Register agents
  console.log('\n=== Phase 2: Registering Agents ===\n');
  const agents = await registerAgents();
  console.log(`\n  ✅ ${agents.length} agents registered\n`);

  if (agents.length < 3) {
    console.error('Not enough agents registered. Aborting.');
    process.exit(1);
  }

  // Wait for faucet drips
  console.log('  ⏳ Waiting 15s for Circle faucet drips...');
  await new Promise(r => setTimeout(r, 15000));

  // Phase 3: Run agents
  console.log('\n=== Phase 3: Autonomous Trading ===\n');
  const durationMs = (SIMULATION_MINUTES - 3) * 60 * 1000; // Leave 3 min for setup + analysis

  // Run agents in parallel
  const agentPromises = agents.map(agent =>
    runAgent(agent, agents, MERCHANTS, durationMs)
      .catch(err => `Agent ${agent.name} crashed: ${err.message}`)
  );

  // Monitor progress every 60s
  const monitorInterval = setInterval(async () => {
    const elapsed = Math.round((Date.now() - startTime) / 60000);
    const tenantIds = agents.map(a => a.tenantId);
    const { count } = await supabase
      .from('transfers')
      .select('id', { count: 'exact', head: true })
      .in('tenant_id', tenantIds)
      .gte('created_at', new Date(startTime).toISOString());
    console.log(`\n  📊 [${elapsed}min] ${count || 0} transfers so far\n`);
  }, 60000);

  const reports = await Promise.all(agentPromises);
  clearInterval(monitorInterval);

  // Phase 4: Analysis
  console.log('\n=== Phase 4: Analysis ===\n');
  await generateAnalysis(agents, startTime);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
