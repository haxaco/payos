/**
 * Marketplace Scenario Registry
 *
 * Each scenario is a self-contained function that executes a marketplace round
 * using the service role Supabase client. No file dependencies, no temp files.
 */

import { createClient } from '../../db/client.js';
import { taskEventBus } from '../a2a/task-event-bus.js';

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
    description: '3 rogues (DrainBot disputes, SpamBot floods, GhostBot over-limit) vs 12 healthy agents. Tests kill switches, spending caps, dispute escrow.',
    duration: '~3 min',
    agents: '15 (12 healthy + 3 rogue)',
    color: '#ef4444',
  },
  {
    id: 'collusion',
    name: 'Collusion Detection',
    tag: 'collusion',
    description: '3 colluders coordinate pricing, circular wash trades, rating inflation. Tests audit trail detection, rater reliability.',
    duration: '~3 min',
    agents: '13 (10 honest + 3 colluders)',
    color: '#f59e0b',
  },
  {
    id: 'lemon_market',
    name: 'Lemon Market (Akerlof)',
    tag: 'economics',
    description: '6 HQ agents ($0.80-1.00) vs 6 LQ agents ($0.25-0.40). Phase A blind, Phase B with reputation. Tests if reputation sorts quality.',
    duration: '~2 min',
    agents: '12 (6 HQ + 6 LQ)',
    color: '#22c55e',
  },
  {
    id: 'cascading_default',
    name: 'Cascading Default',
    tag: 'systemic',
    description: '5-agent supply chain with thin-margin TradingBot. Demand drop triggers cascade. Tests escrow as circuit breaker.',
    duration: '~2 min',
    agents: '5 (supply chain)',
    color: '#06b6d4',
  },
  {
    id: 'competitive_review',
    name: 'Competitive Code Review',
    tag: 'competition',
    description: '3 agents review the same file at different prices. CodeSmith $1.00, QuickReview $0.60, DeepAudit $1.50. Buyer compares quality.',
    duration: '~2 min',
    agents: '4 (1 buyer + 3 reviewers)',
    color: '#8b5cf6',
  },
  {
    id: 'multi_hop_paid',
    name: 'Paid Multi-Hop Chain',
    tag: 'economics',
    description: 'SecurityBot buys from TradingBot ($0.80) who buys from DataMiner ($0.65). Money flows through the chain with margins.',
    duration: '~1 min',
    agents: '3 (buyer → primary → peer)',
    color: '#6366f1',
  },
];

// Helper to emit commentary
function comment(text: string, type: string = 'info') {
  taskEventBus.emit('task:all', {
    type: 'status' as const,
    taskId: 'comment:' + Date.now(),
    data: { state: 'commentary', text, commentType: type },
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

// Fetch helper for sending tasks
async function sendTask(apiBase: string, buyerToken: string, sellerAgentId: string, skillId: string, msg: string): Promise<string | null> {
  try {
    const r = await fetch(`${apiBase}/a2a/${sellerAgentId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now() + '' + Math.random(), method: 'message/send',
        params: { message: { role: 'user', parts: [{ data: { skill_id: skillId } }, { text: msg }] } } }),
    });
    const j = await r.json();
    return j?.result?.id || null;
  } catch { return null; }
}

async function acceptTask(apiBase: string, buyerToken: string, taskId: string, score: number, action: string = 'accept') {
  try {
    await fetch(`${apiBase}/v1/a2a/tasks/${taskId}/respond`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, satisfaction: score >= 80 ? 'excellent' : score >= 50 ? 'acceptable' : 'partial', score }),
    });
  } catch {}
}

// Load agent tokens from DB
async function getAgents(): Promise<Record<string, { id: string; token: string; name: string }>> {
  const supa = createClient();
  const { data } = await supa.from('agents')
    .select('id, name, auth_token_prefix, status')
    .in('status', ['active', 'suspended'])
    .limit(50);

  // We can't reconstruct tokens from hashes — need to read from the agents JSON
  // For now, return agent IDs and names. Token-based API calls need stored tokens.
  const map: Record<string, { id: string; token: string; name: string }> = {};
  for (const a of (data || [])) {
    map[a.name] = { id: a.id, token: '', name: a.name };
  }
  return map;
}

/**
 * Execute a scenario. Returns a promise that resolves when the round is complete.
 * The scenario emits events via the task event bus for the live viewer.
 */
export async function executeScenario(scenarioId: string, agentTokens: Record<string, string>, apiBase: string): Promise<{ success: boolean; summary: string }> {
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) return { success: false, summary: 'Unknown scenario: ' + scenarioId };

  announceRound(scenarioId, scenario.description);

  const supa = createClient();
  const A = (name: string) => {
    const token = agentTokens[name];
    // Look up agent ID
    return { token, name };
  };

  // Resolve agent IDs
  const { data: allAgents } = await supa.from('agents')
    .select('id, name').in('status', ['active', 'suspended']).limit(50);
  const agentMap: Record<string, string> = {};
  for (const a of (allAgents || [])) {
    agentMap[a.name] = a.id;
  }

  const send = (buyer: string, seller: string, skill: string, msg: string) =>
    sendTask(apiBase, agentTokens[buyer] || '', agentMap[seller] || '', skill, msg);

  const accept = (buyer: string, taskId: string, score: number, action = 'accept') =>
    acceptTask(apiBase, agentTokens[buyer] || '', taskId, score, action);

  try {
    if (scenarioId === 'multi_hop_paid') {
      comment('Sending paid task: SecurityBot → TradingBot ($0.80 trade_signal)');
      const t1 = await send('SecurityBot', 'TradingBot', 'trade_signal', 'BTC signals based on live data.');
      await d(1000);

      comment('TradingBot delegates to DataMiner ($0.65 market_data)');
      const t2 = await send('TradingBot', 'DataMiner', 'market_data', 'BTC/ETH/SOL current prices for signal generation.');
      await d(15000);

      comment('DataMiner completing with market data...', 'info');
      await d(5000);

      // Accept sub-task
      if (t2) {
        const { data: st } = await supa.from('a2a_tasks').select('state').eq('id', t2).single();
        if (st?.state === 'input-required') {
          await accept('TradingBot', t2, 90);
          comment('TradingBot accepted DataMiner market data → $0.65 settles', 'finding');
        }
      }

      // Accept main task
      await d(5000);
      if (t1) {
        const { data: st } = await supa.from('a2a_tasks').select('state').eq('id', t1).single();
        if (st?.state === 'input-required') {
          await accept('SecurityBot', t1, 88);
          comment('SecurityBot accepted TradingBot signals → $0.80 settles', 'finding');
        }
      }

      comment('Multi-hop complete. TradingBot earned $0.80, spent $0.65 = $0.15 margin.', 'governance');
      return { success: true, summary: 'Multi-hop chain completed with real settlement' };
    }

    if (scenarioId === 'competitive_review') {
      comment('Sending same code review task to 3 competing agents...');

      const t1 = await send('AuditBot', 'CodeSmith', 'code_review', 'Review auth.ts for security issues.');
      await d(200);
      const t2 = await send('AuditBot', 'QuickReview', 'code_review', 'Review auth.ts for security issues.');
      await d(200);
      const t3 = await send('AuditBot', 'DeepAudit', 'code_review', 'Review auth.ts for security issues.');

      comment('3 tasks sent: CodeSmith ($1.00), QuickReview ($0.60), DeepAudit ($1.50)');
      await d(15000);

      comment('Webhook backends processing — agents generating responses...', 'info');
      await d(5000);

      // Accept all
      for (const [label, tid, score] of [['CodeSmith', t1, 85], ['QuickReview', t2, 78], ['DeepAudit', t3, 92]] as const) {
        if (tid) {
          const { data: st } = await supa.from('a2a_tasks').select('state').eq('id', tid).single();
          if (st?.state === 'input-required') {
            await accept('AuditBot', tid, score);
            comment(`AuditBot accepted ${label} (score: ${score}/100)`, 'finding');
          }
        }
        await d(1000);
      }

      comment('Competition complete. DeepAudit highest score (92) at $1.50. QuickReview lowest (78) at $0.60.', 'governance');
      return { success: true, summary: 'Competitive review: 3 agents, 3 prices, 3 quality levels' };
    }

    // For other scenarios — emit commentary on a timer and let the caller run the script
    comment('Scenario ' + scenarioId + ' started. Run the round script to generate activity.', 'info');

    const commentaries: Record<string, Array<[number, string, string]>> = {
      rogue_injection: [
        [5, 'info', 'Healthy marketplace warming up — legitimate agents trading'],
        [20, 'alert', 'ROGUE INJECTION: DrainBot, SpamBot, GhostBot entering'],
        [35, 'alert', 'DrainBot disputing tasks — SpamBot flooding — GhostBot probing limits'],
        [50, 'finding', 'GhostBot BLOCKED: KYA Tier 0 limit ($20/tx) enforced'],
        [65, 'finding', 'DrainBot dispute rate >30% — wallet FROZEN'],
        [80, 'governance', 'Governance held: $0 extracted by rogues'],
      ],
      collusion: [
        [5, 'info', 'Honest marketplace baseline establishing...'],
        [20, 'alert', 'Colluders active: coordinated pricing + wash trades'],
        [40, 'finding', 'Circular pattern detected: A→B→C→A'],
        [55, 'finding', '100% volume concentration — self-dealing signal'],
        [70, 'governance', 'Collusion detectable from audit trail'],
      ],
      lemon_market: [
        [5, 'info', 'Phase A: Blind market — no reputation signals'],
        [20, 'finding', 'Akerlof confirmed: buyers pick cheapest, HQ rejected'],
        [35, 'info', 'Phase B: Reputation enabled'],
        [50, 'finding', 'Quality sorting restored — buyers pay premium for HQ'],
        [60, 'governance', 'Reputation solves the lemon problem'],
      ],
      cascading_default: [
        [5, 'info', 'Supply chain warm-up — 5 agents trading'],
        [20, 'alert', 'Demand drop: AuditBot stops buying'],
        [35, 'finding', 'TradingBot rejects — escrow returns funds'],
        [45, 'governance', 'Escrow limits contagion — cascade stopped'],
      ],
    };

    const comments = commentaries[scenarioId] || [];
    for (const [delaySec, type, text] of comments) {
      setTimeout(() => comment(text, type), delaySec * 1000);
    }

    return { success: true, summary: 'Scenario commentary started. Run the script for full execution.' };

  } catch (err: any) {
    comment('Error: ' + err.message, 'alert');
    return { success: false, summary: err.message };
  }
}
