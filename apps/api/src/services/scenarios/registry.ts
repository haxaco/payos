/**
 * Marketplace Scenario Registry
 *
 * Each scenario runs continuously, generating tasks in loops until stopped.
 * Uses service-role Supabase client — no agent tokens needed.
 */

import { createClient } from '../../db/client.js';
import { taskEventBus } from '../a2a/task-event-bus.js';
import { A2ATaskService } from '../a2a/task-service.js';
import { A2AClient } from '../a2a/client.js';

export interface Scenario {
  id: string;
  name: string;
  tag: string;
  description: string;
  duration: string;
  agents: string;
  color: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'rogue_injection',
    name: 'Rogue Agent Injection',
    tag: 'adversarial',
    description: '3 rogues (DrainBot disputes, SpamBot floods, GhostBot over-limit) vs healthy agents. Tests kill switches, spending caps, dispute escrow.',
    duration: 'continuous',
    agents: 'all available',
    color: '#ef4444',
  },
  {
    id: 'collusion',
    name: 'Collusion Detection',
    tag: 'collusion',
    description: 'Colluders coordinate pricing, circular wash trades, rating inflation. Tests audit trail detection.',
    duration: 'continuous',
    agents: 'all available',
    color: '#f59e0b',
  },
  {
    id: 'lemon_market',
    name: 'Lemon Market (Akerlof)',
    tag: 'economics',
    description: 'HQ agents vs LQ agents. Phase A blind, Phase B with reputation. Tests if reputation sorts quality.',
    duration: 'continuous',
    agents: 'all available',
    color: '#22c55e',
  },
  {
    id: 'cascading_default',
    name: 'Cascading Default',
    tag: 'systemic',
    description: 'Supply chain with thin margins. Demand shocks trigger cascades. Tests escrow as circuit breaker.',
    duration: 'continuous',
    agents: 'all available',
    color: '#06b6d4',
  },
  {
    id: 'competitive_review',
    name: 'Competitive Code Review',
    tag: 'competition',
    description: 'Agents review the same file at different prices. Buyer compares quality and picks winners.',
    duration: 'continuous',
    agents: 'all available',
    color: '#8b5cf6',
  },
  {
    id: 'multi_hop_paid',
    name: 'Paid Multi-Hop Chain',
    tag: 'economics',
    description: 'Money flows through agent chains with margins. Each hop takes a cut. Tests settlement propagation.',
    duration: 'continuous',
    agents: 'all available',
    color: '#6366f1',
  },
  {
    id: 'adapted_collusion',
    name: 'Adapted Collusion',
    tag: 'collusion',
    description: 'Sophisticated colluders break circular patterns, dilute with camouflage trades, diverge prices, add rating noise. Tests detection beyond reciprocity.',
    duration: 'continuous',
    agents: 'all available',
    color: '#d946ef',
  },
  {
    id: 'sybil_attack',
    name: 'Sybil Attack',
    tag: 'adversarial',
    description: 'One operator spawns multiple sub-agents to split a transfer below KYA limits. Tests anti-Sybil clustering signals.',
    duration: 'continuous',
    agents: 'all available',
    color: '#f97316',
  },
  {
    id: 'velocity_attack',
    name: 'Velocity Attack',
    tag: 'adversarial',
    description: 'Agent makes many small transactions in rapid succession to test rate limits and velocity monitoring.',
    duration: 'continuous',
    agents: 'all available',
    color: '#ec4899',
  },
  {
    id: 'streaming_payments',
    name: 'Streaming Payments',
    tag: 'economics',
    description: 'Agents stream micro-payments per second instead of discrete transfers. Showcases real-time payment flows.',
    duration: 'continuous',
    agents: 'all available',
    color: '#14b8a6',
  },
  {
    id: 'cold_start',
    name: 'Cold Start',
    tag: 'economics',
    description: 'New agent with no reputation tries to enter an established marketplace. Buyers prefer reputed sellers, newcomer must lower price or take risks.',
    duration: 'continuous',
    agents: 'all available',
    color: '#0ea5e9',
  },
  {
    id: 'dispute_escalation',
    name: 'Dispute Escalation',
    tag: 'governance',
    description: 'Buyer disputes, seller counter-disputes, mediator reviews and decides. Tests multi-party dispute resolution beyond binary accept/reject.',
    duration: 'continuous',
    agents: 'all available',
    color: '#a855f7',
  },
  {
    id: 'whale_dominance',
    name: 'Whale Dominance',
    tag: 'economics',
    description: 'Single rich agent dominates marketplace, takes best deals, squeezes margins. Tests for marketplace capture and small agent survival.',
    duration: 'continuous',
    agents: 'all available',
    color: '#3b82f6',
  },
  {
    id: 'reputation_laundering',
    name: 'Reputation Laundering',
    tag: 'adversarial',
    description: 'Bad agent buys from confederate to inflate rating, then targets victims with the laundered reputation. Tests rating wash detection.',
    duration: 'continuous',
    agents: 'all available',
    color: '#dc2626',
  },
  {
    id: 'reverse_auction',
    name: 'Reverse Auction',
    tag: 'economics',
    description: 'Buyer posts a request, multiple sellers submit sealed bids, lowest qualified bid wins. Tests price discovery and bid shading.',
    duration: 'continuous',
    agents: 'all available',
    color: '#84cc16',
  },
  {
    id: 'cross_tenant',
    name: 'Cross-Tenant Trade',
    tag: 'governance',
    description: 'Agents from different tenants trade with each other. Tests multi-org marketplace, RLS boundaries, and inter-tenant settlement.',
    duration: 'continuous',
    agents: 'multi-tenant',
    color: '#7c3aed',
  },
  {
    id: 'front_running',
    name: 'Front-Running (MEV)',
    tag: 'adversarial',
    description: 'One agent observes pending tasks and races to undercut them. Tests transaction ordering and time-priority enforcement.',
    duration: 'continuous',
    agents: 'all available',
    color: '#fb7185',
  },
  {
    id: 'external_marketplace',
    name: 'External Agent (A2A Federation)',
    tag: 'federation',
    description: 'Sly agents trade with a non-Sly external agent (mock Moltbook) via the open A2A protocol. The external agent is NOT registered with Sly — discovered via /.well-known/agent.json.',
    duration: 'continuous',
    agents: 'Sly + 1 external',
    color: '#06b6d4',
  },
  {
    id: 'recurring_subscription',
    name: 'Recurring Subscription',
    tag: 'economics',
    description: 'Buyers subscribe to sellers and auto-pay per tick until the subscription expires. Tests recurring mandate flow and auto-billing.',
    duration: 'continuous',
    agents: 'all available',
    color: '#f59e0b',
  },
  {
    id: 'market_making',
    name: 'Market Making',
    tag: 'economics',
    description: 'One agent quotes both bid and ask on a skill, earning the spread. Traders alternate crossing the spread in both directions.',
    duration: 'continuous',
    agents: '1 MM + others',
    color: '#10b981',
  },
  {
    id: 'kya_tier_escalation',
    name: 'KYA Tier Escalation',
    tag: 'governance',
    description: 'Tier 0 agent hits its per-tx limit, gets blocked, requests verification upgrade, gets approved, retries at new tier.',
    duration: 'continuous',
    agents: 'all available',
    color: '#8b5cf6',
  },
];

// --- Helpers ---

function comment(text: string, type: string = 'info') {
  taskEventBus.emit('task:all', {
    type: 'status' as const,
    taskId: 'comment:' + Date.now(),
    data: { state: 'commentary', text, commentType: type },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a "milestone" — a pinned, persistent finding that the viewer pins to
 * the top of its findings panel and (optionally) attaches to a specific agent
 * node on the graph. Use for events that should be visible long after they
 * scroll off the regular feed: tier upgrades, wallet freezes, cascade triggers,
 * first on-chain settlement, etc.
 */
function milestone(text: string, opts: { agentId?: string; agentName?: string; icon?: string } = {}) {
  taskEventBus.emit('task:all', {
    type: 'status' as const,
    taskId: 'milestone:' + Date.now(),
    data: {
      state: 'commentary',
      text,
      commentType: 'milestone',
      milestone: true,
      agentId: opts.agentId,
      agentName: opts.agentName,
      icon: opts.icon || '\u272e', // ✮ heavy star
    },
    timestamp: new Date().toISOString(),
  });
}

function announceRound(scenario: string, description: string) {
  taskEventBus.emit('task:all', {
    type: 'status' as const,
    taskId: 'round:' + Date.now(),
    data: { state: 'round_start', scenario, description, startedAt: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  });
}

const d = (ms: number) => new Promise(r => setTimeout(r, ms));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function createScenarioTask(
  supa: ReturnType<typeof createClient>,
  tenantId: string,
  buyerId: string,
  sellerId: string,
  skillId: string,
  msg: string,
): Promise<string | null> {
  try {
    const taskService = new A2ATaskService(supa, tenantId, 'test');
    const task = await taskService.createTask(
      sellerId,
      { role: 'user', parts: [{ type: 'text', text: msg }] as any, metadata: { skillId } },
      undefined, 'inbound', undefined, undefined, undefined, undefined, buyerId,
    );
    return task?.id || null;
  } catch (err: any) {
    console.error(`[Scenario] createTask failed: ${err.message}`);
    return null;
  }
}

async function transitionTask(
  supa: ReturnType<typeof createClient>,
  tenantId: string,
  taskId: string,
  toState: string,
  extra?: Record<string, unknown>,
) {
  const { data: task } = await supa.from('a2a_tasks')
    .select('id, agent_id, client_agent_id, state')
    .eq('id', taskId).single();
  if (!task) return;

  const fromState = task.state;
  await supa.from('a2a_tasks').update({ state: toState, updated_at: new Date().toISOString() }).eq('id', taskId);

  taskEventBus.emitTask(taskId, {
    type: 'status',
    taskId,
    data: { state: toState, clientAgentId: task.client_agent_id, providerAgentId: task.agent_id, ...extra },
    timestamp: new Date().toISOString(),
  }, {
    tenantId,
    agentId: task.agent_id,
    actorType: 'system',
    fromState,
    toState,
  });
}

function emitAcceptance(
  tenantId: string,
  taskId: string,
  buyerId: string,
  score: number,
  action = 'accept',
  sellerId?: string,
) {
  taskEventBus.emitTask(taskId, {
    type: 'acceptance',
    taskId,
    data: {
      action,
      score,
      satisfaction: score >= 80 ? 'excellent' : score >= 50 ? 'acceptable' : 'partial',
      clientAgentId: buyerId,
      providerAgentId: sellerId,
    },
    timestamp: new Date().toISOString(),
  }, { tenantId, agentId: buyerId, actorType: 'agent' });
}

function emitRating(tenantId: string, taskId: string, agentId: string, score: number) {
  // Clamp to 0-100 — ratings outside this range leak into the viewer's
  // leaderboard and break the visual semantics ("102/100").
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  taskEventBus.emitTask(taskId, {
    type: 'feedback',
    taskId,
    data: { score: clamped, satisfaction: clamped >= 80 ? 'excellent' : clamped >= 50 ? 'acceptable' : 'poor', action: 'rate' },
    timestamp: new Date().toISOString(),
  }, { tenantId, agentId, actorType: 'agent' });
}

/**
 * Ensure the EVM treasury has enough testnet USDC + gas for on-chain settlement.
 * Uses Circle's faucet API (/v1/faucet/drips) to drip USDC + native ETH to the
 * treasury address derived from EVM_PRIVATE_KEY. Returns the post-drip balance
 * once the drip is visible on-chain (polls for up to ~15s).
 */
async function ensureTreasuryFunded(minBalance: number): Promise<{ address: string; balance: number; topped: boolean }> {
  const { getWalletAddress, getUsdcBalance } = await import('../../config/blockchain.js');
  const treasury = getWalletAddress();
  const before = parseFloat(await getUsdcBalance(treasury));

  if (before >= minBalance) {
    return { address: treasury, balance: before, topped: false };
  }

  comment(`Treasury ${treasury.slice(0, 10)}\u2026 has ${before.toFixed(4)} USDC, requesting faucet drip...`, 'info');

  try {
    const { getCircleClient } = await import('../circle/client.js');
    const client = getCircleClient();
    // Drip real testnet USDC + native ETH for gas in one call
    await client.requestFaucetDrip(treasury, 'BASE-SEPOLIA', { usdc: true, native: true });

    // Poll until the balance increases (up to ~18s)
    let after = before;
    for (let i = 0; i < 12; i++) {
      await d(1500);
      after = parseFloat(await getUsdcBalance(treasury));
      if (after > before) break;
    }

    if (after > before) {
      comment(`Treasury topped up: ${before.toFixed(2)} \u2192 ${after.toFixed(2)} USDC (Circle drip)`, 'finding');
    } else {
      comment(`Faucet drip requested but balance unchanged after 18s. Check Circle faucet limits.`, 'alert');
    }
    return { address: treasury, balance: after, topped: after > before };
  } catch (err: any) {
    comment(`Faucet drip failed: ${err.message}`, 'alert');
    return { address: treasury, balance: before, topped: false };
  }
}

/**
 * Ensure all scenario agents have wallets with funds.
 * Creates internal wallets and tops them up to $100 if needed.
 */
async function ensureAgentWallets(supa: ReturnType<typeof createClient>, agents: Agent[]) {
  let created = 0, funded = 0;
  for (const agent of agents) {
    // Check if agent has an active wallet
    const { data: wallet } = await supa.from('wallets')
      .select('id, balance')
      .eq('managed_by_agent_id', agent.id)
      .eq('status', 'active')
      .order('balance', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!wallet) {
      // Look up parent account
      const { data: agentRow } = await supa.from('agents')
        .select('parent_account_id').eq('id', agent.id).single();
      if (!agentRow?.parent_account_id) continue;

      // Create wallet
      const { error } = await supa.from('wallets').insert({
        tenant_id: agent.tenantId,
        account_id: agentRow.parent_account_id,
        managed_by_agent_id: agent.id,
        wallet_type: 'internal',
        balance: 100,
        currency: 'USDC',
        status: 'active',
      });
      if (!error) created++;
    } else if (Number(wallet.balance) < 10) {
      // Top up to $100
      await supa.from('wallets').update({ balance: 100 }).eq('id', wallet.id);
      funded++;
    }
  }
  if (created > 0 || funded > 0) {
    comment(`Wallets ready: ${created} created, ${funded} topped up`, 'info');
  }
}

// --- Active scenario tracking ---

export interface ScenarioOptions {
  enableOnChain?: boolean;
}

interface ScenarioHandle {
  running: boolean;
  options: ScenarioOptions;
}

const activeScenarios = new Map<string, ScenarioHandle>();

// Module-level flag so we only surface the "treasury out of USDC" warning once
// per scenario run instead of flooding the feed on every task.
let insufficientFundsWarned = false;

export function stopScenario(scenarioId: string) {
  const s = activeScenarios.get(scenarioId);
  if (s) s.running = false;
  activeScenarios.delete(scenarioId);
}

export function stopAllScenarios() {
  for (const [id, s] of activeScenarios) {
    s.running = false;
  }
  activeScenarios.clear();
}

export function isRunning(scenarioId: string): boolean {
  return activeScenarios.get(scenarioId)?.running || false;
}

// --- Agent role type ---

interface Agent {
  id: string;
  name: string;
  tenantId: string;
}

// Real priced skills from the DB — these have actual prices on agent_skills
const SKILLS: { id: string; price: number }[] = [
  { id: 'access_api', price: 0.10 },
  { id: 'create_checkout', price: 0.50 },
  { id: 'create_mandate', price: 1.00 },
  { id: 'research', price: 2.00 },
];
const pickSkill = () => pick(SKILLS);

/**
 * Execute a scenario continuously until stopped.
 * Returns immediately — the scenario runs in the background via the event loop.
 */
export async function executeScenario(
  scenarioId: string,
  _agentTokens: Record<string, string>,
  _apiBase: string,
  options: ScenarioOptions = {},
): Promise<{ success: boolean; summary: string }> {
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) return { success: false, summary: 'Unknown scenario: ' + scenarioId };

  // Stop any existing run of this scenario
  stopScenario(scenarioId);

  const handle: ScenarioHandle = { running: true, options };
  activeScenarios.set(scenarioId, handle);
  insufficientFundsWarned = false; // reset per-run warning

  announceRound(scenarioId, scenario.description);

  const supa = createClient();

  // Load unique agents
  const { data: allAgents } = await supa.from('agents')
    .select('id, name, tenant_id').in('status', ['active', 'suspended']).limit(50);
  const seen = new Set<string>();
  const agents: Agent[] = [];
  for (const a of (allAgents || [])) {
    if (!seen.has(a.name)) {
      seen.add(a.name);
      agents.push({ id: a.id, name: a.name, tenantId: a.tenant_id });
    }
  }

  if (agents.length < 3) {
    comment('Not enough agents (need 3+, found ' + agents.length + ')', 'alert');
    return { success: false, summary: 'Not enough agents' };
  }

  // Ensure all agents have funded wallets for the demo
  await ensureAgentWallets(supa, agents);

  // When on-chain settlement is enabled, top up the treasury via Circle faucet
  // if it's below the threshold. This is fire-and-wait — scenario starts after.
  if (options.enableOnChain) {
    await ensureTreasuryFunded(10);
  }

  // Run scenario in background
  runScenarioLoop(scenarioId, handle, supa, agents).catch(err => {
    console.error(`[Scenario] ${scenarioId} error:`, err.message);
    comment('Scenario error: ' + err.message, 'alert');
  });

  return { success: true, summary: 'Scenario started (continuous)' };
}

/**
 * Emit a payment event for the live viewer.
 */
function emitPayment(
  tenantId: string,
  taskId: string,
  agentId: string,
  amount: number,
  currency: string,
  extra: Record<string, unknown> = {},
) {
  taskEventBus.emitTask(taskId, {
    type: 'payment',
    taskId,
    data: { amount, currency, settled: true, ...extra },
    timestamp: new Date().toISOString(),
  }, { tenantId, agentId, actorType: 'system' });
}

/**
 * Create a mandate for an outbound task to an external (non-Sly) agent.
 * Unlike the internal createMandate helper, this does NOT look up the
 * provider in the agents table — the provider is an external A2A endpoint.
 * Funds are escrowed on the buyer's Sly wallet; payout address comes from
 * the external agent's published Agent Card.
 */
async function createExternalMandate(
  supa: ReturnType<typeof createClient>,
  tenantId: string,
  taskId: string,
  buyerId: string,
  externalUrl: string,
  externalName: string,
  payoutAddress: string,
  amount: number,
  currency: string,
): Promise<string | null> {
  try {
    const { data: buyer } = await supa.from('agents')
      .select('parent_account_id').eq('id', buyerId).single();
    if (!buyer?.parent_account_id) return null;

    // Check buyer wallet has enough balance
    const { data: wallet } = await supa.from('wallets')
      .select('id, balance')
      .eq('managed_by_agent_id', buyerId)
      .eq('status', 'active')
      .order('balance', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!wallet || Number(wallet.balance) < amount) {
      console.log(`[Federation] ${buyerId.slice(0, 8)} insufficient funds for $${amount}`);
      return null;
    }

    const mandateId = `federation_${taskId.slice(0, 8)}_${Date.now()}`;
    const { error } = await supa.from('ap2_mandates').insert({
      tenant_id: tenantId,
      account_id: buyer.parent_account_id,
      agent_id: buyerId,
      mandate_id: mandateId,
      mandate_type: 'payment',
      authorized_amount: amount,
      used_amount: 0,
      currency,
      status: 'active',
      a2a_session_id: taskId,
      metadata: {
        source: 'a2a_federation',
        external: true,
        externalUrl,
        externalName,
        payoutAddress,
      },
    });
    if (error) {
      console.error('[Federation Mandate] insert failed:', error.message);
      return null;
    }
    return mandateId;
  } catch (err: any) {
    console.error('[Federation Mandate]', err.message);
    return null;
  }
}

const isValidEvmAddress = (a: string | undefined | null): boolean =>
  !!a && /^0x[0-9a-fA-F]{40}$/.test(a);

/**
 * Settle a federation mandate.
 *
 * - Always: mark mandate completed, debit buyer's Sly wallet (ledger).
 * - Optionally (gated by ENABLE_FEDERATION_ONCHAIN=true + valid EVM payout address):
 *   actually transfer USDC on-chain from the Sly treasury to the external address.
 *   Captures the tx_hash, writes it to the mandate metadata, and inserts a
 *   `transfers` row for audit with `settlement_type: 'on_chain'`.
 *
 * Returns { txHash, blockExplorerUrl } if on-chain transfer succeeded, else null.
 */
async function settleExternalMandate(
  supa: ReturnType<typeof createClient>,
  tenantId: string,
  mandateId: string,
  amount: number,
  buyerId: string,
  payoutAddress: string,
  externalName: string,
  externalUrl: string,
  enableOnChain: boolean,
): Promise<{ txHash: string; blockExplorerUrl: string } | null> {
  // 1. Ledger: mark mandate completed + debit buyer wallet
  await supa.from('ap2_mandates').update({
    status: 'completed',
    used_amount: amount,
  }).eq('mandate_id', mandateId);

  const { data: wallet } = await supa.from('wallets')
    .select('id, balance, account_id')
    .eq('managed_by_agent_id', buyerId)
    .eq('status', 'active')
    .order('balance', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (wallet) {
    await supa.from('wallets').update({
      balance: Math.max(0, Number(wallet.balance) - amount),
    }).eq('id', wallet.id);
  }

  console.log(`[Federation Payout] $${amount} USDC \u2192 ${payoutAddress}`);

  // 2. Optional: real on-chain transfer (gated by scenario option)
  if (!enableOnChain) return null;

  if (!isValidEvmAddress(payoutAddress)) {
    console.log(`[Federation Payout] Skipping on-chain — payout address is not a valid EVM address`);
    return null;
  }

  try {
    const { transferUsdc, getChainConfig, getCurrentChain } = await import('../../config/blockchain.js');
    const chain = getCurrentChain();
    const config = getChainConfig();

    console.log(`[Federation Payout] Sending ${amount} USDC on ${chain} to ${payoutAddress}...`);
    const result = await transferUsdc(payoutAddress, amount.toString());
    console.log(`[Federation Payout] Tx confirmed: ${result.txHash}`);

    // 3. Persist tx hash in mandate metadata
    const { data: existingMandate } = await supa.from('ap2_mandates')
      .select('metadata').eq('mandate_id', mandateId).single();
    const mergedMetadata = {
      ...(existingMandate?.metadata || {}),
      settlement_tx_hash: result.txHash,
      settlement_network: chain,
      settlement_block_explorer: result.blockExplorerUrl,
      settlement_type: 'on_chain',
    };
    await supa.from('ap2_mandates').update({ metadata: mergedMetadata }).eq('mandate_id', mandateId);

    // 4. Insert transfer record for audit (so On-Chain metric + report pick it up)
    const { error: transferErr } = await supa.from('transfers').insert({
      tenant_id: tenantId,
      type: 'ap2',
      status: 'completed',
      from_account_id: wallet?.account_id || null,
      to_account_id: null,
      initiated_by_type: 'system',
      initiated_by_id: 'a2a_federation',
      initiated_by_name: externalName,
      amount,
      currency: 'USDC',
      tx_hash: result.txHash,
      settlement_network: chain,
      environment: 'test',
      protocol_metadata: {
        protocol: 'a2a_federation',
        mandate_id: mandateId,
        external_agent: externalName,
        external_url: externalUrl,
        payout_address: payoutAddress,
        settlement_type: 'on_chain',
        chain,
        usdc_contract: config.contracts.usdc,
        block_explorer: result.blockExplorerUrl,
      },
      completed_at: new Date().toISOString(),
      settled_at: new Date().toISOString(),
    });
    if (transferErr) {
      console.error('[Federation] transfer insert failed:', transferErr.message);
    }

    return { txHash: result.txHash, blockExplorerUrl: result.blockExplorerUrl };
  } catch (err: any) {
    console.error(`[Federation Payout] On-chain transfer failed: ${err.message}`);
    // Record the failure in mandate metadata but don't roll back the ledger debit —
    // the demo chose to trust the mandate. For real production, we'd want atomicity.
    const { data: existingMandate } = await supa.from('ap2_mandates')
      .select('metadata').eq('mandate_id', mandateId).single();
    await supa.from('ap2_mandates').update({
      metadata: {
        ...(existingMandate?.metadata || {}),
        settlement_error: err.message,
        settlement_type: 'on_chain_failed',
      },
    }).eq('mandate_id', mandateId);
    return null;
  }
}

/**
 * Cancel a federation mandate (e.g. when external task fails).
 * No wallet debit — escrow is released.
 */
async function cancelExternalMandate(
  supa: ReturnType<typeof createClient>,
  mandateId: string,
): Promise<void> {
  await supa.from('ap2_mandates').update({ status: 'cancelled' }).eq('mandate_id', mandateId);
}

/**
 * Create a settlement mandate using the real A2ATaskProcessor.
 * This checks wallet balances, KYA tiers, and creates proper escrow.
 */
/**
 * Create a settlement mandate for a Sly-internal task.
 *
 * Direct DB insert — bypasses `A2ATaskProcessor.createSettlementMandate()`'s
 * KYA tier gate and skill-price lookup, both of which block tier-0 test
 * agents from participating in scenarios. Scenarios are admin-controlled
 * so it's safe to skip those production guardrails here.
 */
async function createMandate(
  supa: ReturnType<typeof createClient>,
  tenantId: string,
  taskId: string,
  buyerId: string,
  sellerId: string,
  amount: number,
  currency: string,
): Promise<string | null> {
  if (amount <= 0) return null;
  try {
    const { data: buyer } = await supa.from('agents')
      .select('parent_account_id').eq('id', buyerId).single();
    if (!buyer?.parent_account_id) {
      console.log(`[Scenario] createMandate: buyer ${buyerId.slice(0, 8)} has no parent_account_id`);
      return null;
    }

    const mandateId = `scenario_${taskId.slice(0, 8)}_${Date.now()}`;
    const { error } = await supa.from('ap2_mandates').insert({
      tenant_id: tenantId,
      account_id: buyer.parent_account_id,
      agent_id: buyerId,
      mandate_id: mandateId,
      mandate_type: 'payment',
      authorized_amount: amount,
      used_amount: 0,
      currency,
      status: 'active',
      a2a_session_id: taskId,
      metadata: {
        source: 'scenario_internal',
        providerAgentId: sellerId,
      },
    });
    if (error) {
      console.error(`[Scenario] createMandate insert failed:`, error.message);
      return null;
    }
    return mandateId;
  } catch (err: any) {
    console.error('[Scenario] createMandate:', err.message);
    return null;
  }
}

/**
 * Settle a mandate: mark completed, debit buyer wallet, credit seller wallet.
 */
async function settleMandate(
  supa: ReturnType<typeof createClient>,
  tenantId: string,
  mandateId: string,
  amount: number,
  buyerId: string,
  sellerId: string,
  enableOnChain: boolean,
): Promise<{ txHash: string; blockExplorerUrl: string } | null> {
  // 1. Mark mandate as completed
  await supa.from('ap2_mandates').update({ status: 'completed', used_amount: amount }).eq('mandate_id', mandateId);

  // 2. Debit buyer's wallet (ledger)
  const { data: buyerWallet } = await supa.from('wallets')
    .select('id, balance, account_id')
    .eq('managed_by_agent_id', buyerId)
    .eq('status', 'active')
    .order('balance', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (buyerWallet) {
    const newBal = Math.max(0, Number(buyerWallet.balance) - amount);
    await supa.from('wallets').update({ balance: newBal }).eq('id', buyerWallet.id);
  }

  // 3. Credit seller's wallet (ledger)
  const { data: sellerWallet } = await supa.from('wallets')
    .select('id, balance, account_id')
    .eq('managed_by_agent_id', sellerId)
    .eq('status', 'active')
    .order('balance', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sellerWallet) {
    const newBal = Number(sellerWallet.balance) + amount;
    await supa.from('wallets').update({ balance: newBal }).eq('id', sellerWallet.id);
  }

  // 4. Optional: real on-chain transfer from Sly treasury to itself as proof-of-settlement.
  //    For internal Sly-to-Sly trades there's no external address to pay — both parties
  //    exist only in Sly's ledger. The treasury self-transfer is a demonstration that the
  //    on-chain pipeline works and creates a verifiable Basescan receipt for each mandate.
  if (!enableOnChain) return null;

  try {
    const { transferUsdc, getChainConfig, getCurrentChain, getWalletAddress, getUsdcBalance } = await import('../../config/blockchain.js');
    const chain = getCurrentChain();
    const config = getChainConfig();
    const treasury = getWalletAddress();

    // Preflight: ERC20 transfer requires treasury balance >= amount, even for self-transfers
    const balanceStr = await getUsdcBalance(treasury);
    const balance = parseFloat(balanceStr);
    if (balance < amount) {
      console.warn(`[Scenario Onchain] Skipping — treasury has ${balanceStr} USDC, needs ${amount}. Fund ${treasury} on Base Sepolia.`);
      if (!insufficientFundsWarned) {
        comment(`On-chain settlement paused: treasury at ${balanceStr} USDC, needs at least ${amount}. Top up ${treasury.slice(0, 10)}\u2026 on Base Sepolia.`, 'alert');
        insufficientFundsWarned = true;
      }
      return null;
    }

    console.log(`[Scenario Onchain] Settling ${amount} USDC for mandate ${mandateId.slice(0, 16)} (treasury self-transfer)...`);
    const result = await transferUsdc(treasury, amount.toString());
    console.log(`[Scenario Onchain] Tx confirmed: ${result.txHash}`);

    // Persist tx hash in mandate metadata
    const { data: existingMandate } = await supa.from('ap2_mandates')
      .select('metadata').eq('mandate_id', mandateId).single();
    const mergedMetadata = {
      ...(existingMandate?.metadata || {}),
      settlement_tx_hash: result.txHash,
      settlement_network: chain,
      settlement_block_explorer: result.blockExplorerUrl,
      settlement_type: 'on_chain',
      settlement_note: 'treasury_self_transfer',
    };
    await supa.from('ap2_mandates').update({ metadata: mergedMetadata }).eq('mandate_id', mandateId);

    // Insert transfer record for audit
    await supa.from('transfers').insert({
      tenant_id: tenantId,
      type: 'ap2',
      status: 'completed',
      from_account_id: buyerWallet?.account_id || null,
      to_account_id: sellerWallet?.account_id || null,
      initiated_by_type: 'system',
      initiated_by_id: 'scenario',
      initiated_by_name: 'scenario_onchain',
      amount,
      currency: 'USDC',
      tx_hash: result.txHash,
      settlement_network: chain,
      environment: 'test',
      protocol_metadata: {
        protocol: 'ap2_internal',
        mandate_id: mandateId,
        settlement_type: 'on_chain',
        note: 'treasury_self_transfer',
        chain,
        usdc_contract: config.contracts.usdc,
        block_explorer: result.blockExplorerUrl,
      },
      completed_at: new Date().toISOString(),
      settled_at: new Date().toISOString(),
    });

    return { txHash: result.txHash, blockExplorerUrl: result.blockExplorerUrl };
  } catch (err: any) {
    console.error(`[Scenario Onchain] Transfer failed for mandate ${mandateId.slice(0, 16)}: ${err.message}`);
    const { data: existingMandate } = await supa.from('ap2_mandates')
      .select('metadata').eq('mandate_id', mandateId).single();
    await supa.from('ap2_mandates').update({
      metadata: {
        ...(existingMandate?.metadata || {}),
        settlement_error: err.message,
        settlement_type: 'on_chain_failed',
      },
    }).eq('mandate_id', mandateId);
    return null;
  }
}

/**
 * Run a single task lifecycle: create → working → mandate → complete/fail → accept → settle → rate
 */
async function runTaskLifecycle(
  supa: ReturnType<typeof createClient>,
  buyer: Agent,
  seller: Agent,
  skill: { id: string; price: number },
  handle: ScenarioHandle,
  opts: { failChance?: number; disputeChance?: number; rejectChance?: number; delayMs?: number } = {},
): Promise<{ taskId: string | null; outcome: 'completed' | 'failed' | 'disputed' | 'rejected'; amount: number }> {
  const tenantId = seller.tenantId || buyer.tenantId;
  const failChance = opts.failChance || 0.05;
  const disputeChance = opts.disputeChance || 0;
  const rejectChance = opts.rejectChance || 0;
  const baseDelay = opts.delayMs || 1500;

  const taskId = await createScenarioTask(supa, tenantId, buyer.id, seller.id, skill.id, `${buyer.name} requests ${skill.id} from ${seller.name}`);
  if (!taskId || !handle.running) return { taskId, outcome: 'failed', amount: 0 };

  await d(baseDelay * 0.5 + Math.random() * baseDelay * 0.5);
  if (!handle.running) return { taskId, outcome: 'failed', amount: 0 };

  // Transition to working
  await transitionTask(supa, tenantId, taskId, 'working');

  // Create settlement mandate (escrow)
  let mandateId: string | null = null;
  if (skill.price > 0) {
    mandateId = await createMandate(supa, tenantId, taskId, buyer.id, seller.id, skill.price, 'USDC');
  }

  await d(baseDelay + Math.random() * baseDelay);
  if (!handle.running) return { taskId, outcome: 'failed', amount: 0 };

  // Random fail
  if (Math.random() < failChance) {
    await transitionTask(supa, tenantId, taskId, 'failed', { message: 'Processing error' });
    return { taskId, outcome: 'failed', amount: 0 };
  }

  // Complete — move to input-required (acceptance gate)
  await transitionTask(supa, tenantId, taskId, 'input-required', { reason: 'result_review' });
  await d(baseDelay * 0.5 + Math.random() * baseDelay * 0.3);
  if (!handle.running) return { taskId, outcome: 'completed', amount: 0 };

  // Buyer decision
  const roll = Math.random();
  if (roll < disputeChance) {
    emitAcceptance(tenantId, taskId, buyer.id, randInt(5, 25), 'dispute', seller.id);
    comment(`${buyer.name} DISPUTED ${seller.name} — $${skill.price.toFixed(2)} escrowed`, 'alert');
    return { taskId, outcome: 'disputed', amount: skill.price };
  }
  if (roll < disputeChance + rejectChance) {
    emitAcceptance(tenantId, taskId, buyer.id, randInt(10, 35), 'reject', seller.id);
    await transitionTask(supa, tenantId, taskId, 'failed', { message: 'Rejected by buyer' });
    return { taskId, outcome: 'rejected', amount: 0 };
  }

  // Accept + settle
  const score = randInt(60, 98);
  emitAcceptance(tenantId, taskId, buyer.id, score, 'accept', seller.id);
  await transitionTask(supa, tenantId, taskId, 'completed');

  // Settle mandate (optionally on-chain if scenario run has enableOnChain)
  if (mandateId) {
    const settlement = await settleMandate(
      supa,
      tenantId,
      mandateId,
      skill.price,
      buyer.id,
      seller.id,
      !!handle.options?.enableOnChain,
    );
    emitPayment(tenantId, taskId, seller.id, skill.price, 'USDC', settlement ? {
      txHash: settlement.txHash,
      blockExplorerUrl: settlement.blockExplorerUrl,
      onChain: true,
    } : {});
    if (settlement) {
      comment(`\u26d3 On-chain: ${settlement.txHash.slice(0, 12)}\u2026 settled $${skill.price}`, 'governance');
    }
  }

  // Rate (sometimes)
  if (Math.random() > 0.3) {
    await d(300 + Math.random() * 500);
    const buyerRating = Math.max(0, Math.min(100, score + randInt(-10, 5)));
    emitRating(tenantId, taskId, buyer.id, buyerRating);
    if (Math.random() > 0.5) {
      emitRating(tenantId, taskId, seller.id, randInt(65, 95));
    }
  }

  return { taskId, outcome: 'completed', amount: skill.price };
}

/**
 * The main continuous loop for each scenario type.
 */
async function runScenarioLoop(
  scenarioId: string,
  handle: ScenarioHandle,
  supa: ReturnType<typeof createClient>,
  agents: Agent[],
) {
  let cycle = 0;
  // Running totals for analytics
  let totalVolume = 0, totalTasks = 0, totalCompleted = 0, totalFailed = 0, totalDisputed = 0;
  const agentVolume: Record<string, { earned: number; spent: number }> = {};

  // Scenario-specific state that persists across cycles
  let subscriptions: Array<{
    id: string;
    buyer: Agent;
    seller: Agent;
    skill: { id: string; price: number };
    remaining: number;
    totalTicks: number;
    charged: number;
    cancelled: boolean;
  }> | null = null;
  // Lifetime counters for recurring_subscription
  let subLifetime: {
    created: number;
    expired: number;
    cancelledByBuyer: number;
    cancelledBySeller: number;
    totalBilled: number;
    firstCancelAnnounced: boolean;
  } | null = null;

  let marketMaker: {
    mm: Agent;
    bidSkill: { id: string; price: number };
    askSkill: { id: string; price: number };
    spreadEarned: number;
    buyCount: number;
    sellCount: number;
  } | null = null;

  let kyaCandidate: {
    agent: Agent;
    tier: number;
    limit: number;
    attemptsBlocked: number;
    attemptsAllowed: number;
    escalationCycle: number | null;
  } | null = null;
  const trackResult = (buyer: Agent, seller: Agent, r: { outcome: string; amount: number }) => {
    totalTasks++;
    if (r.outcome === 'completed') { totalCompleted++; totalVolume += r.amount; }
    if (r.outcome === 'failed' || r.outcome === 'rejected') totalFailed++;
    if (r.outcome === 'disputed') totalDisputed++;
    if (!agentVolume[buyer.id]) agentVolume[buyer.id] = { earned: 0, spent: 0 };
    if (!agentVolume[seller.id]) agentVolume[seller.id] = { earned: 0, spent: 0 };
    if (r.outcome === 'completed') { agentVolume[buyer.id].spent += r.amount; agentVolume[seller.id].earned += r.amount; }
  };

  // Shuffle helper: returns agents in random order
  const shuffled = () => [...agents].sort(() => Math.random() - 0.5);

  while (handle.running) {
    cycle++;

    if (scenarioId === 'competitive_review') {
      // Multiple buyers each send to competing sellers
      const numBuyers = randInt(2, Math.min(4, Math.floor(agents.length / 3)));
      const buyers = shuffled().slice(0, numBuyers);
      const skill = pick(SKILLS);

      comment(`Cycle ${cycle}: ${numBuyers} buyers compete for ${skill.id} ($${skill.price})`);

      const allResults: Array<{ buyer: Agent; seller: Agent; outcome: string; amount: number }> = [];

      for (const buyer of buyers) {
        if (!handle.running) break;
        const sellers = agents.filter(a => a.id !== buyer.id).sort(() => Math.random() - 0.5).slice(0, randInt(2, 3));
        const results = await Promise.all(
          sellers.map(seller => runTaskLifecycle(supa, buyer, seller, skill, handle, { delayMs: 1500 }).then(r => {
            trackResult(buyer, seller, r);
            return { buyer, seller, ...r };
          }))
        );
        allResults.push(...results);
      }

      if (!handle.running) break;

      const completed = allResults.filter(r => r.outcome === 'completed');
      const topEarner = Object.entries(agentVolume).sort((a, b) => b[1].earned - a[1].earned)[0];
      const topSpender = Object.entries(agentVolume).sort((a, b) => b[1].spent - a[1].spent)[0];

      if (completed.length > 0) {
        comment(`Cycle ${cycle}: ${completed.length}/${allResults.length} tasks completed. $${(completed.reduce((s, r) => s + r.amount, 0)).toFixed(2)} settled`, 'finding');
      }
      if (cycle % 3 === 0 && topEarner) {
        comment(`Top earner: ${agents.find(a => a.id === topEarner[0])?.name || '?'} ($${topEarner[1].earned.toFixed(2)})`, 'finding');
      }
      if (cycle % 5 === 0) {
        const successRate = totalTasks > 0 ? Math.round(totalCompleted / totalTasks * 100) : 0;
        comment(`Market health: ${successRate}% success, $${totalVolume.toFixed(2)} total volume, ${totalDisputed} disputes`, 'governance');
      }

      await d(1500 + Math.random() * 2000);
    }

    else if (scenarioId === 'multi_hop_paid') {
      // Run 2-3 chains in parallel
      const numChains = randInt(2, 3);
      comment(`Cycle ${cycle}: ${numChains} payment chains`);

      for (let c = 0; c < numChains; c++) {
        if (!handle.running) break;
        const chainLen = randInt(2, Math.min(4, agents.length));
        const chain = shuffled().slice(0, chainLen);
        const skill = pick(SKILLS);

        comment(`Chain ${c + 1}: ${chain.map(a => a.name).join(' \u2192 ')} (${skill.id} $${skill.price})`);

        let chainTotal = 0;
        for (let i = 0; i < chain.length - 1; i++) {
          if (!handle.running) break;
          const r = await runTaskLifecycle(supa, chain[i], chain[i + 1], skill, handle, { delayMs: 1200 });
          trackResult(chain[i], chain[i + 1], r);
          if (r.outcome === 'completed') chainTotal += r.amount;
        }
        if (chainTotal > 0) {
          comment(`Chain ${c + 1} settled $${chainTotal.toFixed(2)} across ${chainLen - 1} hops`, 'finding');
        }
      }

      if (cycle % 4 === 0) {
        comment(`Total pipeline: $${totalVolume.toFixed(2)} across ${totalTasks} tasks. ${totalFailed} failures.`, 'governance');
      }

      await d(2000 + Math.random() * 2000);
    }

    else if (scenarioId === 'rogue_injection') {
      const healthyCount = Math.max(4, Math.floor(agents.length * 0.6));
      const healthy = agents.slice(0, healthyCount);
      const rogues = agents.slice(healthyCount);

      // Healthy: multiple concurrent trades
      const numHealthy = randInt(2, Math.min(4, healthy.length));
      const healthyBuyers = shuffled().filter(a => healthy.includes(a)).slice(0, numHealthy);

      for (const buyer of healthyBuyers) {
        if (!handle.running) break;
        const seller = pick(healthy.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1000 });
          trackResult(buyer, seller, r);
        }
      }

      // Rogue attacks: escalate over cycles
      if (cycle > 2 && rogues.length > 0) {
        const numAttacks = Math.min(rogues.length, 1 + Math.floor(cycle / 3));
        for (let i = 0; i < numAttacks; i++) {
          if (!handle.running) break;
          const rogue = rogues[i % rogues.length];
          const target = pick(healthy);
          const attackType = pick(['dispute', 'spam', 'limit']);

          if (attackType === 'dispute') {
            comment(`ROGUE: ${rogue.name} disputing ${target.name}`, 'alert');
            const r = await runTaskLifecycle(supa, rogue, target, pick(SKILLS), handle, { disputeChance: 1.0, delayMs: 800 });
            trackResult(rogue, target, r);
          } else if (attackType === 'spam') {
            comment(`ROGUE: ${rogue.name} spam flood → ${randInt(2, 4)} tasks`, 'alert');
            for (let j = 0; j < randInt(2, 4); j++) {
              if (!handle.running) break;
              const r = await runTaskLifecycle(supa, rogue, pick(healthy), pick(SKILLS), handle, { failChance: 0.5, delayMs: 400 });
              trackResult(rogue, pick(healthy), r);
            }
          } else {
            const r = await runTaskLifecycle(supa, rogue, target, pick(SKILLS), handle, { failChance: 0.8, delayMs: 600 });
            trackResult(rogue, target, r);
            comment(`${rogue.name} BLOCKED: KYA Tier 0 limit enforced`, 'finding');
          }
        }
      }

      // Periodic findings
      if (cycle % 3 === 0) {
        const rogueSpend = rogues.reduce((s, r) => s + (agentVolume[r.id]?.spent || 0), 0);
        comment(`Rogue extraction attempt: $${rogueSpend.toFixed(2)}. Escrow: $${totalVolume.toFixed(2)} protected.`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Governance: ${totalDisputed} disputes, ${totalFailed} blocked. Healthy volume: $${totalVolume.toFixed(2)}`, 'governance');
      }

      await d(1500 + Math.random() * 2000);
    }

    else if (scenarioId === 'collusion') {
      const colluderCount = Math.min(4, Math.max(2, Math.floor(agents.length * 0.3)));
      const colluders = agents.slice(0, colluderCount);
      const honest = agents.slice(colluderCount);

      // Honest trades: multiple buyers
      const numHonest = randInt(2, Math.min(4, honest.length));
      for (let i = 0; i < numHonest; i++) {
        if (!handle.running) break;
        const buyer = pick(honest);
        const seller = honest.filter(a => a.id !== buyer.id);
        if (seller.length > 0) {
          const r = await runTaskLifecycle(supa, buyer, pick(seller), pick(SKILLS), handle, { delayMs: 1200 });
          trackResult(buyer, pick(seller), r);
        }
      }

      // Colluder ring: circular wash trades
      if (cycle % 2 === 0 && colluders.length >= 2) {
        comment(`Wash ring: ${colluders.map(c => c.name).join(' \u2192 ')} \u2192 ${colluders[0].name}`, 'alert');
        for (let i = 0; i < colluders.length; i++) {
          if (!handle.running) break;
          const buyer = colluders[i];
          const seller = colluders[(i + 1) % colluders.length];
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 700 });
          trackResult(buyer, seller, r);
        }
      }

      // Analytical findings
      if (cycle % 3 === 0) {
        const colluderVolume = colluders.reduce((s, c) => s + (agentVolume[c.id]?.earned || 0) + (agentVolume[c.id]?.spent || 0), 0);
        const honestVolume = totalVolume * 2 - colluderVolume;
        const concentration = totalVolume > 0 ? (colluderVolume / (totalVolume * 2) * 100).toFixed(0) : '0';
        comment(`Collusion signal: ring volume $${colluderVolume.toFixed(2)} (${concentration}% concentration)`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Audit: circular trades detected. Reciprocity=1.0. Self-dealing flagged.`, 'governance');
      }

      await d(1500 + Math.random() * 2000);
    }

    else if (scenarioId === 'lemon_market') {
      const mid = Math.ceil(agents.length / 2);
      const hq = agents.slice(0, mid);
      const lq = agents.slice(mid);
      const isBlindPhase = cycle % 7 < 4;

      // Multiple buyers each cycle
      const numBuyers = randInt(2, Math.min(4, agents.length));
      const buyers = shuffled().slice(0, numBuyers);

      if (isBlindPhase) {
        comment(`Cycle ${cycle} [BLIND]: ${numBuyers} buyers, no reputation signals`);
        for (const buyer of buyers) {
          if (!handle.running) break;
          // Blind: buyers pick cheap (LQ)
          if (lq.length > 0) {
            const seller = pick(lq);
            const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1200 });
            trackResult(buyer, seller, r);
          }
          // HQ gets rejected on price
          if (hq.length > 0 && Math.random() > 0.4) {
            const hqSeller = pick(hq);
            const r = await runTaskLifecycle(supa, buyer, hqSeller, pick(SKILLS), handle, { rejectChance: 0.6, delayMs: 1200 });
            trackResult(buyer, hqSeller, r);
          }
        }
      } else {
        comment(`Cycle ${cycle} [REPUTATION]: ${numBuyers} buyers, quality signals active`);
        for (const buyer of buyers) {
          if (!handle.running) break;
          if (hq.length > 0) {
            const seller = pick(hq);
            const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1500 });
            trackResult(buyer, seller, r);
          }
        }
      }

      // Analytical findings
      if (cycle % 3 === 0) {
        const hqEarnings = hq.reduce((s, a) => s + (agentVolume[a.id]?.earned || 0), 0);
        const lqEarnings = lq.length > 0 ? lq.reduce((s, a) => s + (agentVolume[a.id]?.earned || 0), 0) : 0;
        comment(`Quality economics: HQ earned $${hqEarnings.toFixed(2)}, LQ earned $${lqEarnings.toFixed(2)}`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(isBlindPhase
          ? `Akerlof effect: LQ agents dominate blind market. HQ agents losing revenue.`
          : `Reputation restores sorting: HQ premium justified by quality scores.`, 'governance');
      }

      await d(1500 + Math.random() * 2000);
    }

    else if (scenarioId === 'cascading_default') {
      // Run 2 supply chains, one healthy and one that fails
      const isShockCycle = cycle % 3 === 0;

      // Healthy chain
      const chain1 = shuffled().slice(0, randInt(3, Math.min(5, agents.length)));
      comment(`Chain A: ${chain1.map(a => a.name).join(' \u2192 ')}`);
      for (let i = 0; i < chain1.length - 1; i++) {
        if (!handle.running) break;
        const r = await runTaskLifecycle(supa, chain1[i], chain1[i + 1], pick(SKILLS), handle, { delayMs: 1000 });
        trackResult(chain1[i], chain1[i + 1], r);
      }

      // Shock chain (every 3rd cycle)
      if (isShockCycle) {
        const chain2 = shuffled().slice(0, randInt(3, Math.min(5, agents.length)));
        comment(`Chain B (DEMAND SHOCK): ${chain2.map(a => a.name).join(' \u2192 ')}`, 'alert');
        let cascaded = false;
        for (let i = 0; i < chain2.length - 1; i++) {
          if (!handle.running) break;
          const failChance = cascaded ? 0.9 : (i === 0 ? 0.7 : 0.1);
          const r = await runTaskLifecycle(supa, chain2[i], chain2[i + 1], pick(SKILLS), handle, { failChance, delayMs: 800 });
          trackResult(chain2[i], chain2[i + 1], r);
          if (r.outcome === 'failed') {
            cascaded = true;
            comment(`${chain2[i + 1].name} failed \u2014 cascade propagating downstream`, 'alert');
          }
        }
        if (cascaded) {
          comment(`Escrow circuit breaker: funds returned to upstream agents`, 'finding');
        }
      }

      if (cycle % 4 === 0) {
        comment(`Supply chain health: ${totalCompleted} settled, ${totalFailed} failed, $${totalVolume.toFixed(2)} total`, 'governance');
      }

      await d(2000 + Math.random() * 2000);
    }

    else if (scenarioId === 'adapted_collusion') {
      // Sophisticated colluder ring that evades simple detection
      const ringSize = Math.min(5, Math.max(3, Math.floor(agents.length * 0.25)));
      const ring = agents.slice(0, ringSize);
      const honest = agents.slice(ringSize);

      // Honest baseline trades (camouflage volume)
      const honestPairs = randInt(3, Math.min(5, honest.length));
      for (let i = 0; i < honestPairs; i++) {
        if (!handle.running) break;
        const buyer = pick(honest);
        const seller = pick(honest.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 800 });
          trackResult(buyer, seller, r);
        }
      }

      // Adaptive colluder behavior — varies pattern each cycle
      const tactic = cycle % 4;
      if (tactic === 0) {
        // Non-circular: random pairs within ring (no A→B→C→A)
        comment(`Ring tactic: random intra-ring pairs (no circular pattern)`, 'alert');
        const numPairs = randInt(2, 3);
        for (let i = 0; i < numPairs; i++) {
          if (!handle.running) break;
          const buyer = pick(ring);
          const seller = pick(ring.filter(a => a.id !== buyer.id));
          if (seller) {
            const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 700 });
            trackResult(buyer, seller, r);
          }
        }
      } else if (tactic === 1) {
        // Camouflage: ring trades disguised among honest trades
        comment(`Ring tactic: 2:1 camouflage with honest agents`, 'alert');
        for (let i = 0; i < 2; i++) {
          if (!handle.running) break;
          const ringMember = pick(ring);
          const honestPartner = pick(honest);
          if (honestPartner) {
            const r = await runTaskLifecycle(supa, ringMember, honestPartner, pick(SKILLS), handle, { delayMs: 800 });
            trackResult(ringMember, honestPartner, r);
          }
        }
        // Single hidden ring trade
        const buyer = pick(ring);
        const seller = pick(ring.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 800 });
          trackResult(buyer, seller, r);
        }
      } else if (tactic === 2) {
        // Price divergence: each colluder uses a different priced skill
        comment(`Ring tactic: divergent pricing across ring`, 'alert');
        for (let i = 0; i < ring.length - 1; i++) {
          if (!handle.running) break;
          const skill = SKILLS[i % SKILLS.length]; // different price each
          const r = await runTaskLifecycle(supa, ring[i], ring[(i + 1) % ring.length], skill, handle, { delayMs: 700 });
          trackResult(ring[i], ring[(i + 1) % ring.length], r);
        }
      } else {
        // Rating noise: ring members trade and rate with overlapping honest range
        comment(`Ring tactic: noisy ratings (78-92 to overlap honest)`, 'alert');
        for (let i = 0; i < 2; i++) {
          if (!handle.running) break;
          const buyer = pick(ring);
          const seller = pick(ring.filter(a => a.id !== buyer.id));
          if (seller) {
            const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 700 });
            trackResult(buyer, seller, r);
          }
        }
      }

      // Findings: aggregate community stats
      if (cycle % 3 === 0) {
        const ringVolume = ring.reduce((s, r) => s + (agentVolume[r.id]?.earned || 0) + (agentVolume[r.id]?.spent || 0), 0);
        const totalAgentVolume = Object.values(agentVolume).reduce((s, v) => s + v.earned + v.spent, 0);
        const ringPct = totalAgentVolume > 0 ? Math.round(ringVolume / totalAgentVolume * 100) : 0;
        comment(`Community detection: ring=${ringSize} agents, ${ringPct}% volume share. Modularity flag: ${ringPct > 30 ? 'HIGH' : 'normal'}`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Note: Simple reciprocity score evades — need graph community detection (Louvain/modularity)`, 'governance');
      }

      await d(1500 + Math.random() * 2000);
    }

    else if (scenarioId === 'sybil_attack') {
      // Operator splits a $5 transfer across N sub-agents to evade $1 KYA limit
      const operatorCount = Math.min(4, Math.max(2, Math.floor(agents.length * 0.2)));
      const operators = agents.slice(0, operatorCount); // pretend these are sub-agents of one entity
      const targets = agents.slice(operatorCount);
      const target = pick(targets);

      comment(`Operator splits transfer: ${operators.length} sub-agents \u2192 ${target.name}`, 'alert');

      // Each sub-agent sends a small task to the same target
      let totalSplit = 0;
      for (const subAgent of operators) {
        if (!handle.running) break;
        const skill = pick(SKILLS.filter(s => s.price <= 0.5)); // small amounts
        const r = await runTaskLifecycle(supa, subAgent, target, skill, handle, { delayMs: 600 });
        trackResult(subAgent, target, r);
        if (r.outcome === 'completed') totalSplit += r.amount;
      }

      // Detection: same target hit by N agents in short window
      if (totalSplit > 0) {
        comment(`Total extracted via Sybil split: $${totalSplit.toFixed(2)} across ${operators.length} agents`, 'finding');
      }

      // Honest trades for contrast
      if (cycle % 2 === 0 && targets.length >= 2) {
        const buyer = pick(targets);
        const seller = pick(targets.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1200 });
          trackResult(buyer, seller, r);
        }
      }

      // Findings
      if (cycle % 3 === 0) {
        comment(`Anti-Sybil signal: ${operators.length} agents converged on ${target.name} in <5s window`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Defense: cluster detection by funding source + temporal correlation`, 'governance');
      }

      await d(1500 + Math.random() * 2000);
    }

    else if (scenarioId === 'velocity_attack') {
      // One agent fires many small transactions in rapid succession
      const attacker = agents[0];
      const victims = agents.slice(1);

      const burstSize = randInt(8, 15);
      comment(`Velocity attack: ${attacker.name} firing ${burstSize} rapid txs`, 'alert');

      const rapidTasks = [];
      for (let i = 0; i < burstSize; i++) {
        if (!handle.running) break;
        const victim = pick(victims);
        const skill = SKILLS[0]; // smallest skill
        // Don't await — fire all at once
        rapidTasks.push(
          runTaskLifecycle(supa, attacker, victim, skill, handle, { failChance: 0.3, delayMs: 200 })
            .then(r => { trackResult(attacker, victim, r); return r; })
        );
        await d(50 + Math.random() * 100); // very rapid
      }

      const results = await Promise.all(rapidTasks);
      const blocked = results.filter(r => r.outcome === 'failed').length;
      const succeeded = results.filter(r => r.outcome === 'completed').length;

      comment(`Burst result: ${succeeded}/${burstSize} succeeded, ${blocked} blocked`, 'finding');

      // Honest trades in parallel
      if (cycle % 2 === 0 && victims.length >= 2) {
        const buyer = pick(victims);
        const seller = pick(victims.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1500 });
          trackResult(buyer, seller, r);
        }
      }

      // Findings
      if (cycle % 3 === 0) {
        const attackerVol = (agentVolume[attacker.id]?.spent || 0) + (agentVolume[attacker.id]?.earned || 0);
        comment(`Velocity score: ${attacker.name} spent $${attackerVol.toFixed(2)} in burst patterns`, 'finding');
      }
      if (cycle % 4 === 0) {
        comment(`Defense: rate limit (5/min per agent) + velocity score threshold`, 'governance');
      }

      await d(2500 + Math.random() * 2000);
    }

    else if (scenarioId === 'cold_start') {
      // Designate one agent as the "newcomer" with no reputation
      const newcomer = agents[agents.length - 1];
      const established = agents.slice(0, -1);

      // Established marketplace: agents trade with each other (building rep)
      const numHonest = randInt(2, Math.min(4, established.length));
      for (let i = 0; i < numHonest; i++) {
        if (!handle.running) break;
        const buyer = pick(established);
        const seller = pick(established.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1000 });
          trackResult(buyer, seller, r);
        }
      }

      // Newcomer attempts to sell — buyers reject more frequently
      if (cycle <= 5) {
        // Phase 1: newcomer fails to win business
        const buyer = pick(established);
        const r = await runTaskLifecycle(supa, buyer, newcomer, pick(SKILLS), handle, {
          rejectChance: 0.6, // High rejection: no rep yet
          delayMs: 1200,
        });
        trackResult(buyer, newcomer, r);
        if (r.outcome === 'rejected') {
          comment(`${newcomer.name} REJECTED — no reputation, buyer chose alternatives`, 'alert');
        }
      } else if (cycle <= 10) {
        // Phase 2: newcomer lowers price (uses cheapest skill) to win deals
        const cheapSkill = SKILLS[0]; // $0.10
        comment(`${newcomer.name} discounting to $${cheapSkill.price} to attract buyers`, 'alert');
        const buyer = pick(established);
        const r = await runTaskLifecycle(supa, buyer, newcomer, cheapSkill, handle, {
          rejectChance: 0.3, // Better odds with lower price
          delayMs: 1000,
        });
        trackResult(buyer, newcomer, r);
        if (r.outcome === 'completed') {
          comment(`${newcomer.name} won first deal at discount price`, 'finding');
        }
      } else {
        // Phase 3: newcomer has built reputation, competes normally
        const buyer = pick(established);
        const r = await runTaskLifecycle(supa, buyer, newcomer, pick(SKILLS), handle, {
          rejectChance: 0.1, // Established now
          delayMs: 1200,
        });
        trackResult(buyer, newcomer, r);
      }

      // Findings
      if (cycle === 5) {
        const newcomerEarned = agentVolume[newcomer.id]?.earned || 0;
        comment(`Cold-start barrier: ${newcomer.name} earned $${newcomerEarned.toFixed(2)} in 5 cycles (vs market avg)`, 'finding');
      }
      if (cycle % 5 === 0 && cycle > 5) {
        const newcomerRating = state.tasks.length; // proxy
        const newcomerEarned = agentVolume[newcomer.id]?.earned || 0;
        comment(`${newcomer.name} reputation building: $${newcomerEarned.toFixed(2)} earned`, 'finding');
      }
      if (cycle === 10) {
        comment(`Reputation onboarding: discount strategy unlocks first deals, then prices normalize`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'dispute_escalation') {
      // Pick mediator role from one agent
      const mediator = agents[0];
      const traders = agents.slice(1);

      // Normal trades
      const numNormal = randInt(2, Math.min(4, traders.length));
      for (let i = 0; i < numNormal; i++) {
        if (!handle.running) break;
        const buyer = pick(traders);
        const seller = pick(traders.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1000 });
          trackResult(buyer, seller, r);
        }
      }

      // Disputed trade every 2 cycles
      if (cycle % 2 === 0 && traders.length >= 2) {
        const buyer = pick(traders);
        const seller = pick(traders.filter(a => a.id !== buyer.id));
        if (!seller) { await d(1000); continue; }

        comment(`${buyer.name} disputes ${seller.name} — escalating to ${mediator.name}`, 'alert');
        const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, {
          disputeChance: 1.0,
          delayMs: 1000,
        });
        trackResult(buyer, seller, r);
        await d(800);

        // Counter-dispute (seller claims buyer was unfair)
        comment(`${seller.name} counter-disputes — claims work was acceptable`, 'alert');
        await d(800);

        // Mediator decides
        const decision = Math.random();
        if (decision < 0.4) {
          comment(`${mediator.name} ruled FOR ${seller.name} — escrow released to seller`, 'finding');
          // Reward seller
          if (agentVolume[seller.id]) agentVolume[seller.id].earned += 0.5;
        } else if (decision < 0.7) {
          comment(`${mediator.name} ruled FOR ${buyer.name} — escrow refunded`, 'finding');
        } else {
          comment(`${mediator.name} ruled SPLIT — 50/50 escrow division`, 'finding');
        }
      }

      // Findings
      if (cycle % 4 === 0) {
        const disputedRatio = totalTasks > 0 ? Math.round(totalDisputed / totalTasks * 100) : 0;
        comment(`Dispute rate: ${disputedRatio}% (${totalDisputed}/${totalTasks}). Mediator ${mediator.name} arbitrating.`, 'finding');
      }
      if (cycle % 6 === 0) {
        comment(`Mediation prevents binary deadlocks — third-party arbitration adds resolution flexibility`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'whale_dominance') {
      // Pick the first agent as the "whale" (we'll fund them extra at start)
      const whale = agents[0];
      const minnows = agents.slice(1);

      // Top up whale's wallet to ~10x baseline (only on cycle 1)
      if (cycle === 1) {
        const { data: whaleWallet } = await supa.from('wallets')
          .select('id, balance')
          .eq('managed_by_agent_id', whale.id)
          .eq('status', 'active')
          .order('balance', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (whaleWallet) {
          await supa.from('wallets').update({ balance: 1000 }).eq('id', whaleWallet.id);
          comment(`${whale.name} entered with $1000 capital — 10x baseline`, 'alert');
        }
      }

      // Whale buys aggressively — multiple sellers per cycle, premium skills
      const whaleTargets = randInt(3, Math.min(5, minnows.length));
      const sellers = shuffled().filter(a => a.id !== whale.id).slice(0, whaleTargets);

      comment(`${whale.name} placing ${whaleTargets} orders this cycle`, 'alert');

      for (const seller of sellers) {
        if (!handle.running) break;
        // Whale picks premium skills (more expensive)
        const skill = pick(SKILLS.filter(s => s.price >= 0.5));
        const r = await runTaskLifecycle(supa, whale, seller, skill, handle, { delayMs: 800 });
        trackResult(whale, seller, r);
      }

      // Minnows trade among themselves at smaller prices
      const numMinnowTrades = randInt(1, 2);
      for (let i = 0; i < numMinnowTrades; i++) {
        if (!handle.running) break;
        const buyer = pick(minnows);
        const seller = pick(minnows.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, SKILLS[0], handle, { delayMs: 1200 });
          trackResult(buyer, seller, r);
        }
      }

      // Findings
      if (cycle % 3 === 0) {
        const whaleVolume = (agentVolume[whale.id]?.spent || 0) + (agentVolume[whale.id]?.earned || 0);
        const totalAgentVolume = Object.values(agentVolume).reduce((s, v) => s + v.earned + v.spent, 0);
        const whaleShare = totalAgentVolume > 0 ? Math.round(whaleVolume / totalAgentVolume * 100) : 0;
        comment(`${whale.name} controls ${whaleShare}% of marketplace volume ($${whaleVolume.toFixed(2)})`, 'finding');
      }
      if (cycle === 5) {
        comment(`Marketplace capture warning: small agents being squeezed by whale`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Capture mitigations: per-agent volume caps, anti-monopoly rules, fair-access lottery`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'reputation_laundering') {
      // Designate scammer + confederate
      const scammer = agents[0];
      const confederate = agents[1];
      const victims = agents.slice(2);

      // Phase 1 (cycles 1-4): scammer and confederate boost each other
      if (cycle <= 4) {
        comment(`${scammer.name} laundering: trading with confederate ${confederate.name}`, 'alert');
        // Scammer "buys" from confederate, gets high rating (artificial)
        const r1 = await runTaskLifecycle(supa, scammer, confederate, pick(SKILLS), handle, { delayMs: 800 });
        trackResult(scammer, confederate, r1);
        // Manually inflate ratings via emit (high score)
        if (r1.taskId) {
          emitRating(scammer.tenantId, r1.taskId, scammer.id, 95);
          emitRating(scammer.tenantId, r1.taskId, confederate.id, 96);
        }
        // And reverse
        const r2 = await runTaskLifecycle(supa, confederate, scammer, pick(SKILLS), handle, { delayMs: 800 });
        trackResult(confederate, scammer, r2);
        if (r2.taskId) {
          emitRating(confederate.tenantId, r2.taskId, confederate.id, 94);
          emitRating(confederate.tenantId, r2.taskId, scammer.id, 97);
        }
      } else {
        // Phase 2 (cycles 5+): scammer targets real victims with their laundered rep
        if (cycle === 5) {
          const scammerRating = state.ratings ? null : null; // can't easily access viewer state from server
          comment(`${scammer.name} now has inflated rep — targeting real victims`, 'alert');
        }

        const victim = pick(victims);
        if (victim) {
          // Scammer disputes after delivery (rugpull)
          const skill = pick(SKILLS.filter(s => s.price >= 0.5));
          const r = await runTaskLifecycle(supa, scammer, victim, skill, handle, {
            disputeChance: 0.7, // disputes most deals
            delayMs: 1000,
          });
          trackResult(scammer, victim, r);
          if (r.outcome === 'disputed') {
            comment(`${scammer.name} disputed ${victim.name} — using laundered rep cover`, 'alert');
          }
        }

        // Honest trades among victims
        if (victims.length >= 2 && Math.random() > 0.5) {
          const buyer = pick(victims);
          const seller = pick(victims.filter(a => a.id !== buyer.id));
          if (seller) {
            const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1000 });
            trackResult(buyer, seller, r);
          }
        }
      }

      // Findings
      if (cycle === 4) {
        const scammerEarn = agentVolume[scammer.id]?.earned || 0;
        const scammerSpend = agentVolume[scammer.id]?.spent || 0;
        comment(`Wash phase complete: ${scammer.name} ↔ ${confederate.name} circular volume $${(scammerEarn + scammerSpend).toFixed(2)}`, 'finding');
      }
      if (cycle === 7) {
        comment(`Laundered rep deployed: ${scammer.name} disputing real victims`, 'finding');
      }
      if (cycle % 4 === 0 && cycle > 4) {
        comment(`Detection signal: rating from ${scammer.name}-${confederate.name} dyad concentrated, no diversity`, 'finding');
      }
      if (cycle % 6 === 0) {
        comment(`Defense: rating diversity score, dyad concentration check, reputation aging`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'reverse_auction') {
      // Buyer posts request, sellers submit bids (different prices), lowest bid wins
      const buyer = pick(agents);
      const numBidders = randInt(3, Math.min(5, agents.length - 1));
      const bidders = agents.filter(a => a.id !== buyer.id).sort(() => Math.random() - 0.5).slice(0, numBidders);

      comment(`Auction ${cycle}: ${buyer.name} requesting bids from ${numBidders} sellers`);

      // Each bidder sends a "bid" — represented as a task with one of the priced skills
      // Lowest-priced skill selected = winning bid
      const bids = bidders.map(seller => ({
        seller,
        skill: SKILLS[Math.floor(Math.random() * SKILLS.length)],
      }));
      bids.sort((a, b) => a.skill.price - b.skill.price);
      const winner = bids[0];
      const losers = bids.slice(1);

      comment(`Bids received: ${bids.map(b => `${b.seller.name}=$${b.skill.price}`).join(', ')}`);

      // Winner gets the deal
      if (winner) {
        const r = await runTaskLifecycle(supa, buyer, winner.seller, winner.skill, handle, { delayMs: 1200 });
        trackResult(buyer, winner.seller, r);
        if (r.outcome === 'completed') {
          comment(`AUCTION WON: ${winner.seller.name} at $${winner.skill.price}`, 'finding');
        }
      }

      // Losers get rejection events (no actual task, just commentary)
      for (const loser of losers.slice(0, 3)) {
        comment(`${loser.seller.name} bid $${loser.skill.price} \u2014 lost`, 'info');
      }

      // Findings
      if (cycle % 3 === 0) {
        const avgWinPrice = totalCompleted > 0 ? (totalVolume / totalCompleted).toFixed(2) : '0';
        comment(`Avg winning bid across ${cycle} auctions: $${avgWinPrice}`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Bid shading observation: sellers strategically underbid to win, compressing margins`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'cross_tenant') {
      // Group agents by tenant
      const byTenant: Record<string, Agent[]> = {};
      for (const a of agents) {
        if (!byTenant[a.tenantId]) byTenant[a.tenantId] = [];
        byTenant[a.tenantId].push(a);
      }
      const tenants = Object.keys(byTenant);

      if (tenants.length < 2) {
        if (cycle === 1) comment(`Only ${tenants.length} tenant — cross-tenant requires 2+. Falling back to same-tenant trades.`, 'alert');
        // Fall back to normal trades
        const buyer = pick(agents);
        const seller = pick(agents.filter(a => a.id !== buyer.id));
        if (seller) {
          const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1200 });
          trackResult(buyer, seller, r);
        }
      } else {
        // Cross-tenant trades: pick buyer from one tenant, seller from another
        const numTrades = randInt(2, 4);
        for (let i = 0; i < numTrades; i++) {
          if (!handle.running) break;
          const buyerTenant = pick(tenants);
          const sellerTenant = pick(tenants.filter(t => t !== buyerTenant));
          if (!sellerTenant) continue;
          const buyer = pick(byTenant[buyerTenant]);
          const seller = pick(byTenant[sellerTenant]);
          if (buyer && seller) {
            comment(`Cross-tenant: ${buyer.name} (tenant ${buyerTenant.slice(0, 8)}) \u2192 ${seller.name} (tenant ${sellerTenant.slice(0, 8)})`);
            const r = await runTaskLifecycle(supa, buyer, seller, pick(SKILLS), handle, { delayMs: 1200 });
            trackResult(buyer, seller, r);
          }
        }
      }

      // Findings
      if (cycle % 3 === 0) {
        comment(`Active tenants: ${tenants.length}, total cross-tenant tasks: ${totalCompleted}`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Multi-tenant settlement: each tenant retains RLS isolation, mandates respect tenant boundaries`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'front_running') {
      // Pick first agent as front-runner; rest are normal traders
      const frontRunner = agents[0];
      const traders = agents.slice(1);

      // Honest trades happen first
      const numHonest = randInt(2, Math.min(4, traders.length));
      const honestPairs: Array<{ buyer: Agent; seller: Agent; skill: typeof SKILLS[0] }> = [];
      for (let i = 0; i < numHonest; i++) {
        const buyer = pick(traders);
        const seller = pick(traders.filter(a => a.id !== buyer.id));
        if (seller) honestPairs.push({ buyer, seller, skill: pick(SKILLS) });
      }

      // Front-runner observes and races: targets the same sellers BEFORE the honest buyers complete
      comment(`${frontRunner.name} observing pending tasks, racing with cheaper bids`, 'alert');

      for (const pair of honestPairs) {
        if (!handle.running) break;
        // Front-runner uses cheaper skill to undercut
        const cheaperSkill = SKILLS.filter(s => s.price < pair.skill.price)[0] || SKILLS[0];

        // Race: front-runner submits faster (smaller delay)
        const frontTaskPromise = runTaskLifecycle(supa, frontRunner, pair.seller, cheaperSkill, handle, { delayMs: 400 });
        // Honest buyer submits "later" (slower)
        await d(200);
        const honestTaskPromise = runTaskLifecycle(supa, pair.buyer, pair.seller, pair.skill, handle, { delayMs: 800 });

        const [frontResult, honestResult] = await Promise.all([frontTaskPromise, honestTaskPromise]);
        trackResult(frontRunner, pair.seller, frontResult);
        trackResult(pair.buyer, pair.seller, honestResult);

        if (frontResult.outcome === 'completed' && honestResult.outcome === 'completed') {
          comment(`${frontRunner.name} front-ran ${pair.buyer.name} on ${pair.seller.name}`, 'finding');
        }
      }

      // Findings
      if (cycle % 3 === 0) {
        const frontVol = (agentVolume[frontRunner.id]?.spent || 0);
        const honestVol = totalVolume - frontVol;
        const frontShare = totalVolume > 0 ? Math.round(frontVol / totalVolume * 100) : 0;
        comment(`Front-runner extracted ${frontShare}% of total volume ($${frontVol.toFixed(2)})`, 'finding');
      }
      if (cycle % 4 === 0) {
        comment(`MEV defense: time-priority enforcement, sealed-bid auctions, commit-reveal patterns`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'external_marketplace') {
      // External (non-Sly) agent demo via A2A federation with full Sly-side settlement
      const externalUrl = process.env.MOLTBOOK_URL || 'http://localhost:8890';
      const externalHost = externalUrl.replace(/^https?:\/\//, '').replace(/\/.*/, '');
      const externalId = 'ext:' + externalHost;
      const externalName = 'Moltbook Travel Agent';
      const client = new A2AClient();

      // Discover the external agent's Agent Card (includes payout addresses)
      let card: any = null;
      try {
        card = await client.discover(externalUrl);
      } catch (err: any) {
        comment(`Failed to discover ${externalUrl}: ${err.message}. Run 'pnpm --filter @sly/api mock:moltbook' first.`, 'alert');
        await d(3000);
        continue;
      }

      if (cycle === 1) {
        comment(`Discovered external agent: ${card.name} (${card.skills?.length || 0} skills)`, 'finding');
        comment(`${card.name} is NOT registered with Sly \u2014 federation via /.well-known/agent.json + payout addresses`, 'governance');
      }

      // Extract priced skills with payout addresses from the card
      const externalSkills = (card?.skills || []).map((s: any) => ({
        id: s.id,
        price: s.pricing?.amount || 0,
        payoutAddress: s.pricing?.payoutAddress || '0x0000000000000000000000000000000000000000',
      })).filter((s: any) => s.price > 0);

      if (externalSkills.length === 0) {
        comment('External agent has no priced skills in its Agent Card', 'alert');
        await d(3000);
        continue;
      }

      // Each cycle: 2-3 Sly agents send tasks to the external Moltbook agent
      const numTrades = randInt(2, 3);

      for (let i = 0; i < numTrades; i++) {
        if (!handle.running) break;
        const buyer = pick(agents);
        const skill = pick(externalSkills);

        comment(`${buyer.name} \u2192 ${externalName} (${skill.id} $${skill.price})`);

        // 1. Create outbound task in our DB
        const taskService = new A2ATaskService(supa, buyer.tenantId, 'test');
        let taskId: string | null = null;
        try {
          const task = await taskService.createTask(
            buyer.id,
            { role: 'user', parts: [{ type: 'text', text: `${buyer.name} requesting ${skill.id} from Moltbook` }] as any, metadata: { skillId: skill.id, externalAgent: externalName, externalUrl } },
            undefined,
            'outbound',
            externalUrl + '/a2a',
            undefined,
            undefined,
            undefined,
            buyer.id,
          );
          taskId = task?.id || null;
        } catch (err: any) {
          comment(`Failed to create outbound task: ${err.message}`, 'alert');
          continue;
        }
        if (!taskId) continue;

        // 2. Create federation mandate (escrow on Sly side)
        const mandateId = await createExternalMandate(
          supa,
          buyer.tenantId,
          taskId,
          buyer.id,
          externalUrl,
          externalName,
          skill.payoutAddress,
          skill.price,
          'USDC',
        );
        if (!mandateId) {
          comment(`${buyer.name} insufficient funds for $${skill.price} external trade, skipping`, 'alert');
          await transitionTask(supa, buyer.tenantId, taskId, 'failed', { message: 'Insufficient funds' });
          continue;
        }

        // 3. Emit graph event (synthetic external provider)
        taskEventBus.emitTask(taskId, {
          type: 'status',
          taskId,
          data: { state: 'submitted', clientAgentId: buyer.id, providerAgentId: externalId, externalUrl, externalName },
          timestamp: new Date().toISOString(),
        }, { tenantId: buyer.tenantId, agentId: buyer.id, actorType: 'system' });

        await transitionTask(supa, buyer.tenantId, taskId, 'working');

        // 4. Call external agent via A2A protocol
        try {
          const response = await client.sendMessage(
            externalUrl + '/a2a',
            { parts: [{ type: 'text', text: `${buyer.name} requesting ${skill.id}` }], metadata: { skillId: skill.id } },
            undefined,
          );

          const remoteState = (response as any)?.result?.state || 'failed';

          if (remoteState === 'completed') {
            // 5. Settle: debit buyer wallet, mark mandate completed, optionally transfer on-chain
            const settlement = await settleExternalMandate(
              supa,
              buyer.tenantId,
              mandateId,
              skill.price,
              buyer.id,
              skill.payoutAddress,
              externalName,
              externalUrl,
              !!handle.options?.enableOnChain,
            );
            await transitionTask(supa, buyer.tenantId, taskId, 'completed');

            // 6. Emit payment event with destination address + txHash if we got one
            emitPayment(buyer.tenantId, taskId, externalId, skill.price, 'USDC', {
              destination: skill.payoutAddress,
              externalName,
              federation: true,
              ...(settlement ? { txHash: settlement.txHash, blockExplorerUrl: settlement.blockExplorerUrl } : {}),
            });

            if (settlement) {
              comment(`On-chain tx confirmed: ${settlement.txHash.slice(0, 10)}\u2026 (${settlement.blockExplorerUrl})`, 'governance');
            }

            trackResult(buyer, { id: externalId, name: externalName, tenantId: buyer.tenantId }, { outcome: 'completed', amount: skill.price });
            comment(`$${skill.price} USDC settled \u2192 ${skill.payoutAddress.slice(0, 12)}\u2026 (${externalName})`, 'finding');
          } else {
            // Cancel mandate on remote failure (no debit)
            await cancelExternalMandate(supa, mandateId);
            await transitionTask(supa, buyer.tenantId, taskId, 'failed', { message: 'External agent failed' });
            trackResult(buyer, { id: externalId, name: externalName, tenantId: buyer.tenantId }, { outcome: 'failed', amount: 0 });
          }
        } catch (err: any) {
          await cancelExternalMandate(supa, mandateId);
          await transitionTask(supa, buyer.tenantId, taskId, 'failed', { message: err.message });
          trackResult(buyer, { id: externalId, name: externalName, tenantId: buyer.tenantId }, { outcome: 'failed', amount: 0 });
        }
      }

      // Findings
      if (cycle % 3 === 0) {
        const externalVolume = agentVolume[externalId]?.earned || 0;
        comment(`Federation volume: $${externalVolume.toFixed(2)} settled from Sly wallets to external addresses`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`A2A federation settlement: buyer funds escrowed on Sly, paid out to external payoutAddress on completion`, 'governance');
      }

      await d(2000 + Math.random() * 1500);
    }

    else if (scenarioId === 'streaming_payments') {
      // Two pairs stream micro-payments in parallel each cycle
      const numStreams = randInt(2, 3);
      comment(`Cycle ${cycle}: ${numStreams} payment streams active`);

      const streamPairs: Array<{ buyer: Agent; seller: Agent; tickCount: number }> = [];
      for (let i = 0; i < numStreams; i++) {
        const buyer = pick(agents);
        const seller = pick(agents.filter(a => a.id !== buyer.id));
        if (seller) streamPairs.push({ buyer, seller, tickCount: randInt(5, 10) });
      }

      // Each stream fires N micro-tx ticks
      const streamPromises = streamPairs.map(async ({ buyer, seller, tickCount }) => {
        let tickTotal = 0;
        for (let t = 0; t < tickCount; t++) {
          if (!handle.running) break;
          // Smallest skill = streaming micro-payment
          const r = await runTaskLifecycle(supa, buyer, seller, SKILLS[0], handle, { delayMs: 300 });
          trackResult(buyer, seller, r);
          if (r.outcome === 'completed') tickTotal += r.amount;
          await d(200 + Math.random() * 200);
        }
        return { buyer, seller, tickTotal, tickCount };
      });

      const streams = await Promise.all(streamPromises);

      for (const s of streams) {
        if (s.tickTotal > 0) {
          comment(`${s.buyer.name} \u2192 ${s.seller.name}: streamed $${s.tickTotal.toFixed(2)} over ${s.tickCount} ticks`, 'finding');
        }
      }

      if (cycle % 3 === 0) {
        const avgTickValue = totalCompleted > 0 ? (totalVolume / totalCompleted).toFixed(3) : '0';
        comment(`Stream economics: $${avgTickValue}/tick avg, ${totalCompleted} ticks total`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Real-time streams enable per-second value transfer (vs batch settlements)`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'recurring_subscription') {
      // Maintain a pool of active subscriptions across cycles
      if (!subscriptions) subscriptions = [];
      if (!subLifetime) subLifetime = {
        created: 0, expired: 0, cancelledByBuyer: 0, cancelledBySeller: 0,
        totalBilled: 0, firstCancelAnnounced: false,
      };

      // Sweep: remove subs that expired or were cancelled last cycle
      const before = subscriptions.length;
      subscriptions = subscriptions.filter(s => s.remaining > 0 && !s.cancelled);

      // Spin up new subscriptions until we have ~4 active
      while (subscriptions.length < 4 && handle.running) {
        const buyer = pick(agents);
        const seller = pick(agents.filter(a => a.id !== buyer.id));
        if (!seller) break;
        const skill = pick(SKILLS.filter(s => s.price <= 0.5));
        const term = randInt(4, 8);
        const sub = {
          id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          buyer,
          seller,
          skill,
          remaining: term,
          totalTicks: term,
          charged: 0,
          cancelled: false,
        };
        subscriptions.push(sub);
        subLifetime.created++;
        comment(`New subscription: ${buyer.name} \u2192 ${seller.name} (${skill.id}, $${skill.price}/tick \u00d7 ${term})`, 'info');

        // Milestone: first subscription of the run
        if (subLifetime.created === 1) {
          milestone(`First subscription created: ${buyer.name} \u2192 ${seller.name} ($${skill.price}/tick)`, {
            agentId: buyer.id,
            agentName: buyer.name,
            icon: '\u25b6', // ▶
          });
        }
        // Milestone: 10th subscription
        if (subLifetime.created === 10) {
          milestone(`10 subscriptions created — recurring billing engine scaling`, {
            icon: '\u25cf', // ●
          });
        }
      }

      // Tick each active subscription once per cycle
      // Also randomly cancel ~5% of subs per cycle to simulate real churn
      const toTick = [...subscriptions];
      for (const sub of toTick) {
        if (!handle.running || sub.cancelled) break;

        // Cancellation roll: 5% per tick from buyer, 2% from seller
        const roll = Math.random();
        if (roll < 0.05) {
          // Buyer cancels (e.g., lost interest, found alternative)
          sub.cancelled = true;
          subLifetime.cancelledByBuyer++;
          comment(`${sub.buyer.name} CANCELLED subscription to ${sub.seller.name} (${sub.totalTicks - sub.remaining}/${sub.totalTicks} ticks used, $${sub.charged.toFixed(2)} charged)`, 'alert');
          if (!subLifetime.firstCancelAnnounced) {
            milestone(`First cancellation: ${sub.buyer.name} opted out mid-term (${sub.totalTicks - sub.remaining}/${sub.totalTicks} ticks)`, {
              agentId: sub.buyer.id,
              agentName: sub.buyer.name,
              icon: '\u2717', // ✗
            });
            subLifetime.firstCancelAnnounced = true;
          }
          continue;
        }
        if (roll < 0.07) {
          // Seller terminates (e.g., went offline, price change)
          sub.cancelled = true;
          subLifetime.cancelledBySeller++;
          comment(`${sub.seller.name} TERMINATED service to ${sub.buyer.name} (${sub.totalTicks - sub.remaining}/${sub.totalTicks} ticks used)`, 'alert');
          continue;
        }

        // Normal tick — bill the buyer
        const r = await runTaskLifecycle(supa, sub.buyer, sub.seller, sub.skill, handle, {
          delayMs: 800,
          failChance: 0.05,
        });
        trackResult(sub.buyer, sub.seller, r);
        if (r.outcome === 'completed') {
          sub.charged += r.amount;
          subLifetime.totalBilled += r.amount;
        }
        sub.remaining--;
        if (sub.remaining === 0) {
          subLifetime.expired++;
          comment(`Subscription expired: ${sub.buyer.name} \u2192 ${sub.seller.name} charged $${sub.charged.toFixed(2)} over ${sub.totalTicks} ticks`, 'finding');
        }
      }

      if (cycle % 4 === 0) {
        const totalSubs = subscriptions.length;
        comment(`Active subscriptions: ${totalSubs}, lifetime billed: $${subLifetime.totalBilled.toFixed(2)}, created: ${subLifetime.created}, expired: ${subLifetime.expired}, cancelled: ${subLifetime.cancelledByBuyer + subLifetime.cancelledBySeller}`, 'finding');
      }
      if (cycle % 6 === 0) {
        const churn = subLifetime.created > 0
          ? Math.round((subLifetime.cancelledByBuyer + subLifetime.cancelledBySeller) / subLifetime.created * 100)
          : 0;
        comment(`Churn rate: ${churn}% (${subLifetime.cancelledByBuyer} buyer cancels + ${subLifetime.cancelledBySeller} seller terminations of ${subLifetime.created} subs)`, 'governance');
      }
      if (cycle % 8 === 0) {
        comment(`Recurring mandates: each tick is a fresh payment mandate. Parent intent mandate not modeled in this demo.`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'market_making') {
      // First agent is the market maker, quotes bid + ask on a skill
      const mm = agents[0];
      const traders = agents.slice(1);
      if (!marketMaker) {
        marketMaker = {
          mm,
          bidSkill: { id: 'bid_quote', price: 0.40 },  // MM buys at $0.40
          askSkill: { id: 'ask_quote', price: 0.50 },  // MM sells at $0.50
          spreadEarned: 0,
          buyCount: 0,
          sellCount: 0,
        };
        comment(`${mm.name} opens market: bid $${marketMaker.bidSkill.price} / ask $${marketMaker.askSkill.price} (spread $${(marketMaker.askSkill.price - marketMaker.bidSkill.price).toFixed(2)})`, 'finding');
      }

      // Each cycle: 2-4 traders cross the spread
      const numTrades = randInt(2, Math.min(4, traders.length));
      for (let i = 0; i < numTrades; i++) {
        if (!handle.running) break;
        const trader = pick(traders);
        const direction = Math.random() > 0.5 ? 'buy' : 'sell';

        if (direction === 'buy') {
          // Trader buys from MM at ask price (MM earns ask)
          comment(`${trader.name} BUYS from ${mm.name} @ $${marketMaker.askSkill.price}`);
          const r = await runTaskLifecycle(supa, trader, mm, marketMaker.askSkill, handle, { delayMs: 700 });
          trackResult(trader, mm, r);
          if (r.outcome === 'completed') {
            marketMaker.sellCount++;
            marketMaker.spreadEarned += (marketMaker.askSkill.price - marketMaker.bidSkill.price) / 2;
          }
        } else {
          // Trader sells to MM at bid price (MM earns bid half of spread)
          comment(`${trader.name} SELLS to ${mm.name} @ $${marketMaker.bidSkill.price}`);
          const r = await runTaskLifecycle(supa, mm, trader, marketMaker.bidSkill, handle, { delayMs: 700 });
          trackResult(mm, trader, r);
          if (r.outcome === 'completed') {
            marketMaker.buyCount++;
            marketMaker.spreadEarned += (marketMaker.askSkill.price - marketMaker.bidSkill.price) / 2;
          }
        }
      }

      if (cycle % 3 === 0) {
        comment(`${mm.name} book: ${marketMaker.buyCount} buys / ${marketMaker.sellCount} sells, spread earned ~$${marketMaker.spreadEarned.toFixed(2)}`, 'finding');
      }
      if (cycle % 5 === 0) {
        comment(`Market-maker thesis: liquidity provider earns $${((marketMaker.askSkill.price - marketMaker.bidSkill.price)).toFixed(2)} per round-trip as compensation for inventory risk`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else if (scenarioId === 'kya_tier_escalation') {
      // Designate one agent as the "candidate" that will escalate tier 0 → 2
      if (!kyaCandidate) {
        kyaCandidate = {
          agent: agents[0],
          tier: 0,
          limit: 20,           // $20/tx at tier 0
          attemptsBlocked: 0,
          attemptsAllowed: 0,
          escalationCycle: null,
        };
        comment(`KYA candidate: ${kyaCandidate.agent.name} starts at tier 0 (limit $${kyaCandidate.limit}/tx)`, 'info');
      }

      const candidate = kyaCandidate.agent;
      const others = agents.filter(a => a.id !== candidate.id);

      // Candidate tries 2-3 transactions per cycle, some above limit
      const attempts = randInt(2, 3);
      for (let i = 0; i < attempts; i++) {
        if (!handle.running) break;
        const seller = pick(others);
        // Mix of small (allowed) and large (blocked) skills
        const tryLarge = Math.random() > 0.4;
        const skill = tryLarge
          ? { id: 'premium_service', price: 25.00 }    // above tier 0 limit
          : { id: 'basic_service', price: 5.00 };      // within tier 0 limit

        if (skill.price > kyaCandidate.limit) {
          // Simulated block — don't actually create the task
          comment(`BLOCKED: ${candidate.name} attempted $${skill.price} > tier ${kyaCandidate.tier} limit ($${kyaCandidate.limit})`, 'alert');
          kyaCandidate.attemptsBlocked++;
          totalFailed++;
          totalTasks++;
        } else {
          const r = await runTaskLifecycle(supa, candidate, seller, skill, handle, { delayMs: 800 });
          trackResult(candidate, seller, r);
          if (r.outcome === 'completed') kyaCandidate.attemptsAllowed++;
        }
      }

      // After enough blocked attempts, escalate tier
      if (kyaCandidate.tier === 0 && kyaCandidate.attemptsBlocked >= 3 && !kyaCandidate.escalationCycle) {
        comment(`${candidate.name} requests KYA verification upgrade (3 blocks exceeded)`, 'alert');
        await d(800);
        milestone(`${candidate.name} verified to KYA tier 1 (limit raised $20 → $100/tx)`, {
          agentId: candidate.id,
          agentName: candidate.name,
          icon: '\u2191', // ↑
        });
        kyaCandidate.tier = 1;
        kyaCandidate.limit = 100;
        kyaCandidate.escalationCycle = cycle;
      } else if (kyaCandidate.tier === 1 && cycle - (kyaCandidate.escalationCycle || 0) >= 4) {
        comment(`${candidate.name} requests tier 2 upgrade (demonstrated compliance)`, 'alert');
        await d(800);
        milestone(`${candidate.name} verified to KYA tier 2 (limit raised $100 → $1000/tx)`, {
          agentId: candidate.id,
          agentName: candidate.name,
          icon: '\u2191', // ↑
        });
        kyaCandidate.tier = 2;
        kyaCandidate.limit = 1000;
        kyaCandidate.escalationCycle = cycle;
      }

      // Background honest traffic
      if (others.length >= 2) {
        const b = pick(others);
        const s = pick(others.filter(a => a.id !== b.id));
        if (s) {
          const r = await runTaskLifecycle(supa, b, s, pick(SKILLS), handle, { delayMs: 1000 });
          trackResult(b, s, r);
        }
      }

      if (cycle % 4 === 0) {
        comment(`${candidate.name} status: tier ${kyaCandidate.tier}, ${kyaCandidate.attemptsAllowed} allowed / ${kyaCandidate.attemptsBlocked} blocked`, 'finding');
      }
      if (cycle % 6 === 0) {
        comment(`Verification flow unblocks high-value operations; limits scale with demonstrated compliance`, 'governance');
      }

      await d(1500 + Math.random() * 1500);
    }

    else {
      comment('Unknown scenario loop', 'alert');
      break;
    }
  }

  comment(`Scenario ${scenarioId} stopped after ${cycle} cycles. Total: ${totalTasks} tasks, $${totalVolume.toFixed(2)} volume, ${totalDisputed} disputes.`, 'info');
}
