/**
 * agentforce_marketplace — sim buyers transact with live Salesforce Agentforce agents.
 *
 * Outbound flow:
 *   - Each (buyer, agent) pair opens ONE persistent Agentforce session at
 *     first use and reuses it for all subsequent turns. This produces a
 *     real conversation with growing context instead of single-shot Q&A,
 *     and ratings can compare reply quality across turns of the same
 *     thread. Sessions stay open until the round ends or shouldStop fires.
 *   - Each cycle: pick an active sim buyer + target agent, send the next
 *     brief on the session (sequenceId increments), capture the reply,
 *     score it heuristically, emit a milestone with `score` so the viewer
 *     aggregates a star rating against the Salesforce agent.
 *   - Settlement is observability-only — Agentforce agents don't advertise
 *     a payout address. When Salesforce surfaces a payout claim mechanism
 *     we wire it in.
 *
 * Inbound (Agentforce → Sly): operator-side config, not driven by this block.
 *   The block prints the /a2a/{slyAgentId} URLs once per round so the
 *   operator can configure a Named Credential + Apex callout / Flow on
 *   the Salesforce side. Once that's wired, inbound A2A tasks land at
 *   apps/api/src/routes/a2a.ts:263-447 and flow through the normal
 *   inbound poll loop just like any other peer agent.
 *
 * Auth: shells out to `sf org display --target-org <alias> --json` for the
 *   user session. ECA Client Credentials does NOT work for the Agent runtime
 *   (the bootstrap step requires a session cookie, not bearer). For prod
 *   we'll swap to JWT Bearer Flow — see docs/investigations/agentforce-org-probe.md
 */

import { SlyClient, isSuspensionError, isStaleAgentTokenError } from '../../sly-client.js';
import type { SimAgent, PersonaStyle } from '../../processors/types.js';
import type { ScenarioContext, ScenarioResult } from '../types.js';
import { filterByStyle, createAgentClient } from '../../agents/registry.js';
import { AgentStateManager } from '../../agents/agent-state.js';
import { AgentforceClient } from '../../agentforce/client.js';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Score an Agentforce reply on a 0-100 scale using lightweight heuristics.
 * Cheap, deterministic, and good enough to differentiate "I can't help"
 * canned refusals from substantive structured answers in the viewer's
 * star aggregator. Replace with an LLM judge if higher fidelity is needed.
 *
 * Signal:
 *  - Refusal phrases ("I'm unable", "I can't retrieve", "I couldn't")
 *    drop heavy — these are the boilerplate replies a bare topic-only
 *    agent emits when it has no Actions wired.
 *  - Structure (numbered steps, bullets) raises — implies the agent
 *    actually composed an answer.
 *  - Length without negation contributes a moderate baseline.
 */
function scoreReply(reply: string): { score: number; rationale: string } {
  const text = (reply || '').trim();
  if (!text) return { score: 0, rationale: 'empty reply' };

  const refusals = [
    "i'm unable",
    'i am unable',
    "i can't",
    'i cannot',
    "i couldn't",
    'i could not',
    "couldn't retrieve",
    'unable to retrieve',
    "i'm not able",
  ];
  const lower = text.toLowerCase();
  const hasRefusal = refusals.some(r => lower.includes(r));

  const hasNumberedSteps = /(?:^|\n)\s*(?:1[.)]|step\s*1)/im.test(text);
  const hasBullets = /(?:^|\n)\s*[-*•]\s/m.test(text) && (text.match(/(?:^|\n)\s*[-*•]\s/gm)?.length ?? 0) >= 2;
  const hasStructure = hasNumberedSteps || hasBullets;
  const len = text.length;

  let score: number;
  let rationale: string;
  if (hasStructure && !hasRefusal) {
    score = Math.min(95, 70 + Math.floor(len / 80));
    rationale = 'structured answer';
  } else if (hasStructure && hasRefusal) {
    // Refused-but-helpful: agent declines AND offers a generic framework.
    score = 55;
    rationale = 'refusal with generic framework';
  } else if (hasRefusal) {
    score = len > 120 ? 35 : 25;
    rationale = 'canned refusal';
  } else if (len > 200) {
    score = 60;
    rationale = 'substantive prose';
  } else if (len > 60) {
    score = 50;
    rationale = 'short reply';
  } else {
    score = 30;
    rationale = 'minimal reply';
  }
  return { score, rationale };
}

interface BuyerSession {
  sessionId: string;
  developerName: string;
  turnCount: number;
}

export interface AgentforceAgentSpec {
  /** BotDefinition.DeveloperName, e.g. "SlyTestAgent". Required. */
  developerName: string;
  /** Display label for the viewer + comments. Defaults to developerName. */
  label?: string;
  /** Per-call cost in USDC for milestone observability. Default 0.10. */
  pricePerCallUsdc?: number;
}

export interface AgentforceMarketplaceConfig {
  /** sf CLI org alias. Required. */
  orgAlias: string;
  /** Agents to trade with. At least one required. */
  agents: AgentforceAgentSpec[];
  /** Briefs/utterances rotated through. At least one required. */
  briefs?: string[];
  /** Hard cap on total spend per round (defensive). Default 5.0 USDC. */
  maxRoundSpendUsdc?: number;
  defaults?: {
    cycleSleepMs?: number;
    buyerStyles?: PersonaStyle[];
  };
}

export interface RunAgentforceMarketplaceOptions {
  scenarioId: string;
  config: AgentforceMarketplaceConfig;
  dryRun?: boolean;
}

const DEFAULT_BRIEFS = [
  "I'm shopping for headphones. What do you recommend?",
  'Help me discover new products that match my preferences.',
  "What's the best way to compare merchants on the same item?",
  'Recommend a personalized purchase strategy for someone on a budget.',
];

export async function runAgentforceMarketplace(
  ctx: ScenarioContext,
  opts: RunAgentforceMarketplaceOptions,
): Promise<ScenarioResult> {
  const { agents, durationMs, params, shouldStop } = ctx;
  const { scenarioId, config, dryRun = false } = opts;
  const baseUrl = process.env.SLY_API_URL!;
  const adminKey = process.env.SLY_PLATFORM_ADMIN_KEY!;

  if (!config.orgAlias) {
    throw new Error('agentforce_marketplace: orgAlias is required (sf CLI alias)');
  }
  if (!Array.isArray(config.agents) || config.agents.length === 0) {
    throw new Error('agentforce_marketplace: blockConfig.agents must list at least one Agentforce agent');
  }

  const adminClient = new SlyClient({ baseUrl, adminKey });
  const cycleSleepMs = (params.cycleSleepMs as number) || config.defaults?.cycleSleepMs || 5000;
  const buyerStyles = config.defaults?.buyerStyles || (['honest', 'whale', 'mm'] as PersonaStyle[]);
  const maxRoundSpend = config.maxRoundSpendUsdc ?? 5.0;
  const briefs = (config.briefs && config.briefs.length > 0) ? config.briefs : DEFAULT_BRIEFS;

  const clients: Record<string, SlyClient> = {};
  for (const a of agents) clients[a.agentId] = createAgentClient(a, baseUrl, adminKey);
  const agentState = new AgentStateManager({ slyClient: adminClient });

  const buyerPool = filterByStyle(agents, buyerStyles);
  if (buyerPool.length === 0) {
    await adminClient.comment(
      `agentforce_marketplace: no buyers matching styles [${buyerStyles.join(', ')}]`,
      'alert',
    );
    return { completedTrades: 0, totalVolume: 0, findings: ['No buyers'] };
  }

  // Initialize the Agentforce client + capture instance host for ext: ID.
  // sf org display is shelled lazily on first call — prove it works up
  // front so we fail fast rather than mid-round.
  const af = new AgentforceClient({ orgAlias: config.orgAlias });
  let orgHost = `${config.orgAlias}.salesforce.com`;
  try {
    orgHost = await af.getInstanceHost();
    const probe = await af.startSession(config.agents[0].developerName);
    await af.endSession(probe.sessionId).catch(() => undefined);
  } catch (e: any) {
    await adminClient.comment(
      `agentforce_marketplace: precheck failed against ${config.orgAlias} — ${e.message}`,
      'alert',
    );
    return { completedTrades: 0, totalVolume: 0, findings: [`Precheck failed: ${e.message}`] };
  }

  if (!dryRun) {
    await adminClient.comment(
      `agentforce_marketplace: ${config.agents.length} live Agentforce agent(s) on ${config.orgAlias}, ${buyerPool.length} sim buyer(s)`,
      'governance',
    );
    // Inbound hint: print the Sly endpoint(s) so a Salesforce admin can
    // wire Named Credentials → Apex callout for the reverse direction.
    const inboundHints = buyerPool.slice(0, 3).map((b) =>
      `${baseUrl.replace(/\/$/, '')}/a2a/${b.agentId}  (${b.name})`,
    );
    await adminClient.comment(
      `agentforce inbound stub — point Salesforce Named Credential at any of:\n  ${inboundHints.join('\n  ')}`,
      'info',
    );
  }

  const handleSuspension = (err: unknown, agent: SimAgent): boolean => {
    if (isSuspensionError(err)) {
      agentState.markKilled(agent.agentId, 'kill_switch', { agentName: agent.name });
      return true;
    }
    if (isStaleAgentTokenError(err)) {
      agentState.markKilled(agent.agentId, 'stale_token', { agentName: agent.name });
      return true;
    }
    return false;
  };

  let cycle = 0;
  let completedTrades = 0;
  let totalVolume = 0;
  let totalSpend = 0;
  const findings: string[] = [];
  const startedAt = Date.now();

  // Persistent sessions keyed by `${buyerAgentId}::${developerName}`. Opened
  // lazily on first interaction with a given (buyer, agent) pair, reused for
  // all subsequent turns until the round ends. Salesforce sessions hold
  // conversational context so multi-turn quality degrades / improves over
  // the round and we can score it.
  const sessions = new Map<string, BuyerSession>();
  const sessionKey = (buyerId: string, developerName: string) => `${buyerId}::${developerName}`;

  while (!shouldStop() && Date.now() - startedAt < durationMs) {
    cycle++;
    if (totalSpend >= maxRoundSpend) {
      if (!dryRun) {
        await adminClient.comment(
          `agentforce_marketplace: hit maxRoundSpendUsdc cap ($${maxRoundSpend.toFixed(2)}) — stopping`,
          'governance',
        );
      }
      break;
    }

    const activeBuyers = agentState.activeAgents(buyerPool);
    if (activeBuyers.length === 0) {
      if (!dryRun) await adminClient.comment(`agentforce_marketplace: no active buyers, ending`, 'alert');
      break;
    }

    const buyer = pick(activeBuyers);
    const target = pick(config.agents);
    const brief = pick(briefs);
    const callCost = target.pricePerCallUsdc ?? 0.10;
    const targetLabel = target.label || target.developerName;
    const targetExtId = `ext:${orgHost}/${target.developerName}`;
    const key = sessionKey(buyer.agentId, target.developerName);

    if (dryRun) { completedTrades++; break; }

    try {
      // ─── Open the persistent session if first turn for this pair ─────
      let session = sessions.get(key);
      if (!session) {
        const opened = await af.startSession(target.developerName);
        session = { sessionId: opened.sessionId, developerName: target.developerName, turnCount: 0 };
        sessions.set(key, session);
      }

      // ─── Send the next turn ─────────────────────────────────────────
      session.turnCount += 1;
      const r = await af.sendMessage(session.sessionId, brief, session.turnCount);
      const reply = r.reply || '(no reply)';
      const { score, rationale } = scoreReply(reply);

      completedTrades++;
      totalVolume += callCost;
      totalSpend += callCost;

      await adminClient.milestone(
        `\u{2601} ${buyer.name} → ${targetLabel} (turn ${session.turnCount}): "${brief.slice(0, 60)}${brief.length > 60 ? '…' : ''}"`,
        {
          agentId: buyer.agentId,
          agentName: buyer.name,
          icon: '\u{2601}',
          toId: targetExtId,
          toName: targetLabel,
          toKind: 'agent',
          amount: callCost,
          currency: 'USDC',
          score,
          scoreComment: rationale,
        },
      );

      await adminClient.comment(
        `${targetLabel} replied (score ${score}/100, ${rationale}): "${reply.slice(0, 140)}${reply.length > 140 ? '…' : ''}"`,
        'finding',
      );
    } catch (e: any) {
      const wasSuspension = handleSuspension(e, buyer);
      if (!wasSuspension) {
        // Session may have died — drop it so the next cycle reopens.
        sessions.delete(key);
        await adminClient.comment(
          `agentforce_marketplace: ${buyer.name} → ${targetLabel} failed: ${e.message}`,
          'alert',
        );
        findings.push(`Cycle ${cycle} failed: ${e.message}`);
      }
    }

    await new Promise((r) => setTimeout(r, cycleSleepMs));
  }

  // ─── Round end: close every persistent session ─────────────────────
  // Best-effort — Salesforce times sessions out anyway, but explicit close
  // keeps the org's session ledger tidy and surfaces real failures.
  await Promise.allSettled(
    [...sessions.values()].map((s) => af.endSession(s.sessionId, 'RoundEnded')),
  );

  if (!dryRun) {
    const sessionCount = sessions.size;
    await adminClient.comment(
      `agentforce_marketplace summary: ${completedTrades} turn(s) across ${sessionCount} session(s), $${totalVolume.toFixed(2)} USDC observability`,
      'governance',
    );
  }

  return { completedTrades, totalVolume, findings };
}

