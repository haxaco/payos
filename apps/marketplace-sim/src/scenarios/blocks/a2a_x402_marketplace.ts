/**
 * a2a_x402_marketplace — peer agent marketplace where the SETTLEMENT RAIL
 * is x402 (instead of AP2 mandates). Mixed inventory: some sellers are
 * Sly agents who own x402 endpoints they fulfill via A2A tasks; some
 * inventory is merchant-only (cross-tenant public x402 endpoints with
 * no seller agent — discovered via the same gateway, paid directly).
 *
 * Two flow paths chosen probabilistically per cycle (configurable
 * `a2aMix`, default 60% A2A / 40% direct):
 *
 *   ── A2A path ────────────────────────────────────────────
 *   1. Buyer createTask → seller agent (real a2a_tasks row,
 *      A2A session opens, viewer's task panel + live feed light up).
 *   2. Seller claimTask.
 *   3. Seller completeTask with deliverable (real backend fetch
 *      from the seller's matching endpoint when available, otherwise
 *      synthesized in-character content).
 *   4. Buyer payX402 → seller's endpoint (settlement rail).
 *   5. Buyer respond (rate).
 *
 *   ── Direct path ─────────────────────────────────────────
 *   1. Buyer picks ANY available endpoint (seller-owned OR merchant-
 *      only) via persona strategy.
 *   2. payX402 directly. No A2A task.
 *
 * Why both:
 *   - Real marketplaces have both deep-relationship work (A2A tasks
 *     with brief, deliverable, rating) AND drive-by purchases (paid
 *     APIs without a back-and-forth).
 *   - The viewer's existing topology renders both cleanly: A2A
 *     sessions in the live feed; direct hits in the merchant inspector.
 *   - This block is the only place in the sim where A2A lifecycle is
 *     paired with x402 settlement (instead of AP2 mandates) — proves
 *     x402 works as a settlement rail for agent-to-agent commerce.
 *
 * Setup phase (idempotent, runs once per round):
 *   - Each seller agent is provisioned with a RANDOM SUBSET of the
 *     skill catalog (1–3 endpoints by default, not all 5). Sellers
 *     specialize. Total endpoints stay small — no catalog explosion.
 *   - Cross-tenant public merchant endpoints (e.g. Tina Demo Services)
 *     are loaded into the same discovery pool, tagged as merchant-only.
 *
 * Persona strategy (matches merchant_comparison.ts):
 *   - whale, quality-reviewer, researcher, conservative → highest_rating
 *   - mm, budget, opportunist, newcomer, rogue-spam     → lowest_price
 *   - honest, colluder, rogue-disputer, default          → weighted 50/50
 */

import { SlyClient, isSuspensionError, isStaleAgentTokenError } from '../../sly-client.js';
import type { SimAgent, PersonaStyle } from '../../processors/types.js';
import type { ScenarioContext, ScenarioResult } from '../types.js';
import { filterByStyle, createAgentClient } from '../../agents/registry.js';
import { AgentStateManager } from '../../agents/agent-state.js';
import { randomUUID } from 'node:crypto';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

type Strategy = 'lowest_price' | 'highest_rating' | 'weighted';

function strategyFor(style: SimAgent['style'] | string | undefined): Strategy {
  if (!style) return 'weighted';
  const s = style as string;
  if (['whale', 'quality-reviewer', 'researcher', 'conservative'].includes(s)) return 'highest_rating';
  if (['mm', 'budget', 'budget-trader', 'opportunist', 'newcomer', 'rogue-spam'].includes(s)) return 'lowest_price';
  return 'weighted';
}

export interface A2aX402SkillCatalogEntry {
  skill_id: string;
  name: string;
  path: string;
  basePrice: number;
  description?: string;
}

export interface A2aX402MarketplaceConfig {
  /** Skill catalog. Each seller is provisioned with a random subset. */
  catalog?: A2aX402SkillCatalogEntry[];
  /** Probability a cycle uses the full A2A flow (createTask + claim +
   *  complete + pay + respond) vs direct payX402. 0.6 default — most
   *  cycles A2A so the live feed is rich, ~40% direct so the heatmap
   *  also fills. */
  a2aMix?: number;
  /** Random subset size per seller. Default {min:1, max:3} — sellers
   *  specialize. Set min=max=catalog.length to disable subsetting. */
  endpointsPerSeller?: { min: number; max: number };
  /** Pull cross-tenant `visibility=public` merchant endpoints into the
   *  discovery pool too (e.g. Tina Demo Services). Default true. */
  includeMerchantEndpoints?: boolean;
  /** Hard cap on round spend (defensive). Default $5. */
  maxRoundSpendUsdc?: number;
  defaults?: {
    cycleSleepMs?: number;
    buyerStyles?: PersonaStyle[];
    sellerStyles?: PersonaStyle[];
  };
}

export interface RunA2aX402MarketplaceOptions {
  scenarioId: string;
  config: A2aX402MarketplaceConfig;
  dryRun?: boolean;
}

const DEFAULT_CATALOG: A2aX402SkillCatalogEntry[] = [
  { skill_id: 'code_review',    name: 'Code Review',     path: '/sim/code-review',    basePrice: 0.10, description: 'Async security + style review of a code snippet' },
  { skill_id: 'data_summary',   name: 'Data Summary',    path: '/sim/data-summary',   basePrice: 0.05, description: 'Compress a JSON blob into a 3-bullet summary' },
  { skill_id: 'research_brief', name: 'Research Brief',  path: '/sim/research-brief', basePrice: 0.25, description: 'Topic deep-dive with citations' },
  { skill_id: 'image_caption',  name: 'Image Caption',   path: '/sim/image-caption',  basePrice: 0.02, description: 'Caption an image URL in <30 words' },
  { skill_id: 'translation',    name: 'Translation',     path: '/sim/translation',    basePrice: 0.03, description: 'Translate input to a requested language' },
];

interface CatalogItem {
  /** Endpoint UUID. */
  endpointId: string;
  endpointName: string;
  path: string;
  method: 'POST' | 'GET';
  basePrice: number;
  currency: 'USDC';
  /** Stable rating per (owner, skill) for highest_rating selection. */
  rating: number;
  /** Skill family, used for brief + grouping. */
  skillId: string;
  /** Who owns this endpoint. Either an agent (seller) or a merchant
   *  account (no seller agent — drive-by inventory). */
  kind: 'seller' | 'merchant';
  /** Set when kind === 'seller'. */
  sellerAgentId?: string;
  sellerAgentName?: string;
  /** Display label for the merchant when kind === 'merchant'. */
  merchantName?: string;
  /** Optional backend URL — when present, A2A path can fetch real
   *  content for the deliverable. */
  backendUrl?: string;
}

const BRIEFS_BY_SKILL: Record<string, string[]> = {
  code_review:    ['Review my OAuth callback for security issues.', 'Audit this rate-limiter for race conditions.', 'Look at this JWT validator and flag anything sketchy.'],
  data_summary:   ['Summarize this JSON dump in 3 bullets.', 'Pull the headline metric out of this payload.'],
  research_brief: ['Find the top 3 sources on agentic-commerce adoption.', 'Brief me on x402 vs AP2 — comparative pros/cons.'],
  image_caption:  ['Caption this product hero shot for our launch deck.', 'Generate alt-text for this dashboard screenshot.'],
  translation:    ['Translate the attached spec to Spanish.', 'Render this article in French, marketing tone.'],
};

function pickSellerForSkill(buyerStyle: SimAgent['style'] | string | undefined, candidates: CatalogItem[]): CatalogItem {
  if (candidates.length === 1) return candidates[0];
  const strategy = strategyFor(buyerStyle);
  if (strategy === 'lowest_price') {
    return candidates.slice().sort((a, b) => a.basePrice - b.basePrice)[0];
  }
  if (strategy === 'highest_rating') {
    return candidates.slice().sort((a, b) => b.rating - a.rating)[0];
  }
  const prices = candidates.map((s) => s.basePrice);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const ratings = candidates.map((s) => s.rating);
  const minR = Math.min(...ratings), maxR = Math.max(...ratings);
  const scored = candidates.map((c) => {
    const priceN = maxP === minP ? 0.5 : (c.basePrice - minP) / (maxP - minP);
    const ratingN = maxR === minR ? 0.5 : (c.rating - minR) / (maxR - minR);
    return { c, score: 0.5 * (1 - priceN) + 0.5 * ratingN };
  });
  return scored.sort((a, b) => b.score - a.score)[0].c;
}

function hashInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

/**
 * Brief the buyer hands the seller for a given skill. Picked per cycle
 * so each A2A task has a real, varied brief in its message history.
 */
function pickBrief(skillId: string): string {
  const list = BRIEFS_BY_SKILL[skillId] || [`Do the work for skill: ${skillId}.`];
  return pick(list);
}

/**
 * In-character deliverable the seller hands back as the completeTask
 * artifact. Per-skill shape so buyers see actual content (research
 * findings, code review notes, translation, etc.) instead of meta text.
 */
function synthesizeDeliverable(skillId: string, brief: string, sellerName: string): string {
  const sn = brief.replace(/\.$/, '').slice(0, 120);
  switch (skillId) {
    case 'code_review':
      return [
        `# Code review — ${sn}`,
        ``,
        `**Findings**:`,
        `- 🟡 No CSRF guard on the callback handler — recommend double-submit cookie or origin check.`,
        `- 🟡 Token comparison uses \`===\` — switch to \`crypto.timingSafeEqual\` to avoid a side-channel.`,
        `- 🟢 Error paths properly return 4xx without leaking internal state.`,
        ``,
        `Reviewed by ${sellerName}.`,
      ].join('\n');
    case 'data_summary':
      return [
        `# Summary — ${sn}`,
        ``,
        `- Headline metric is up ~3.2× YoY across the surveyed window.`,
        `- Top contributor: A2A federation traffic (47% of growth).`,
        `- Watch item: long-tail concentration — bottom 80% of agents = 12% of volume.`,
        ``,
        `Summarized by ${sellerName}.`,
      ].join('\n');
    case 'research_brief':
      return [
        `# Research brief — ${sn}`,
        ``,
        `Sources surveyed:`,
        `- "x402 micropayments at scale" — Coinbase blog, 2026 Q1`,
        `- "AP2 vs x402: settlement rails compared" — Sly research, 2026 Q2`,
        `- "Agent-mediated commerce adoption" — Visa VIC report, Apr 2026`,
        ``,
        `Bottom line: x402 wins on latency + composability for sub-$1 transactions; AP2 wins on dispute lifecycle for >$1 work.`,
        ``,
        `Compiled by ${sellerName}.`,
      ].join('\n');
    case 'image_caption':
      return [
        `# Caption`,
        ``,
        `> "${sn.slice(0, 90)}…" — captured in a clean product context, suitable for hero placement.`,
        ``,
        `Captioned by ${sellerName}.`,
      ].join('\n');
    case 'translation':
      return [
        `# Translation result — ${sn}`,
        ``,
        `**Source**: en (auto). **Target**: es (per brief). **Confidence**: 0.94.`,
        ``,
        `> "El protocolo de pago x402 permite a los agentes liquidar micropagos sin custodia, lo que reduce la latencia de transacción a menos de un segundo en la mayoría de los flujos del mundo real."`,
        ``,
        `Translated by ${sellerName}.`,
      ].join('\n');
    default:
      return `Done. — ${sellerName}`;
  }
}

/**
 * Discover cross-tenant `visibility=public` merchant endpoints (e.g.
 * Tina Demo Services). The admin route already merges these with the
 * sim tenant's own catalog; we filter to merchant-only here so they
 * can be flagged distinctly from seller-owned endpoints in the cycle
 * loop.
 */
async function loadMerchantEndpoints(adminClient: SlyClient, sellerAccountIds: Set<string>): Promise<CatalogItem[]> {
  const all: any[] = await (adminClient as any).listX402Endpoints({ limit: 50 }).catch(() => []);
  const out: CatalogItem[] = [];
  for (const e of all) {
    if (!e?.id) continue;
    if (e.account_id && sellerAccountIds.has(e.account_id)) continue; // skip seller-owned
    const skillId = inferSkillFromName(e.name || '');
    out.push({
      endpointId: e.id,
      endpointName: e.name || 'Merchant endpoint',
      path: e.path || '/',
      method: (e.method || 'POST') as 'POST' | 'GET',
      basePrice: Number(e.base_price ?? e.price ?? 0),
      currency: 'USDC',
      rating: 4.0 + (hashInt(e.id) % 1000) / 1000, // 4.0–5.0 stable
      skillId,
      kind: 'merchant',
      merchantName: 'Merchant',
      backendUrl: e.backend_url || undefined,
    });
  }
  return out;
}

function inferSkillFromName(name: string): string {
  const n = name.toLowerCase();
  if (/research|report|study/.test(n)) return 'research_brief';
  if (/article|premium|content|summar/.test(n)) return 'data_summary';
  if (/image|render|caption|picture|photo/.test(n)) return 'image_caption';
  if (/transcrib|speech|audio|clip/.test(n)) return 'translation';
  if (/translat/.test(n)) return 'translation';
  if (/code|review|audit/.test(n)) return 'code_review';
  return 'data_summary';
}

export async function runA2aX402Marketplace(
  ctx: ScenarioContext,
  opts: RunA2aX402MarketplaceOptions,
): Promise<ScenarioResult> {
  const { agents, durationMs, params, shouldStop } = ctx;
  const { scenarioId, config, dryRun = false } = opts;
  const baseUrl = process.env.SLY_API_URL!;
  const adminKey = process.env.SLY_PLATFORM_ADMIN_KEY!;

  const adminClient = new SlyClient({ baseUrl, adminKey });
  const cycleSleepMs = (params.cycleSleepMs as number) || config.defaults?.cycleSleepMs || 2500;
  const buyerStyles =
    config.defaults?.buyerStyles || (['honest', 'whale', 'mm', 'budget', 'opportunist', 'newcomer'] as PersonaStyle[]);
  const sellerStyles =
    config.defaults?.sellerStyles || (['quality-reviewer', 'mm', 'whale', 'specialist', 'conservative'] as PersonaStyle[]);
  const maxRoundSpend = config.maxRoundSpendUsdc ?? 5.0;
  const catalog = (config.catalog && config.catalog.length > 0) ? config.catalog : DEFAULT_CATALOG;
  const a2aMix = Math.min(Math.max(config.a2aMix ?? 0.6, 0), 1);
  const epsPerSeller = config.endpointsPerSeller ?? { min: 1, max: 3 };
  const includeMerchant = config.includeMerchantEndpoints !== false;

  const clients: Record<string, SlyClient> = {};
  for (const a of agents) clients[a.agentId] = createAgentClient(a, baseUrl, adminKey);
  const agentState = new AgentStateManager({ slyClient: adminClient });

  const buyerPool = filterByStyle(agents, buyerStyles);
  const sellerPool = filterByStyle(agents, sellerStyles);
  if (buyerPool.length === 0 || sellerPool.length === 0) {
    await adminClient.comment(
      `a2a_x402_marketplace: need at least 1 buyer (${buyerStyles.join('|')}) and 1 seller (${sellerStyles.join('|')}). Found ${buyerPool.length}/${sellerPool.length}.`,
      'alert',
    );
    return { completedTrades: 0, totalVolume: 0, findings: ['Insufficient pool'] };
  }

  // ─── Setup: provision a random skill subset per seller ────────────
  const sellerInventory = sellerPool.map((s) => {
    const numSkills = epsPerSeller.min + Math.floor(Math.random() * Math.max(1, epsPerSeller.max - epsPerSeller.min + 1));
    return { seller: s, skills: pickN(catalog, numSkills) };
  });

  const tenantId = sellerPool[0].tenantId;
  const sellerEndpoints: CatalogItem[] = [];
  try {
    // Provision endpoints for each seller's chosen subset, then merge
    // back into a flat catalog. We call the admin route per-seller so
    // each seller's `catalog` is the random subset, not the full set.
    for (const inv of sellerInventory) {
      if (inv.skills.length === 0) continue;
      const setup = await adminClient.setupX402SellerEndpoints({
        sellers: [{ agentId: inv.seller.agentId, parentAccountId: inv.seller.parentAccountId }],
        catalog: inv.skills.map((c) => ({
          skill_id: c.skill_id,
          name: c.name,
          path: c.path,
          basePrice: c.basePrice,
          description: c.description,
        })),
        tenantId,
        environment: 'test',
      });
      for (const e of setup.endpoints) {
        sellerEndpoints.push({
          endpointId: e.endpointId,
          endpointName: e.endpointName,
          path: e.path,
          method: e.method,
          basePrice: e.basePrice,
          currency: e.currency,
          rating: 3.5 + (hashInt(e.sellerAgentId + e.skillId) % 1500) / 1000,
          skillId: e.skillId,
          kind: 'seller',
          sellerAgentId: e.sellerAgentId,
          sellerAgentName: e.sellerAgentName,
        });
      }
    }
  } catch (e: any) {
    await adminClient.comment(`a2a_x402_marketplace: setup failed — ${e.message}`, 'alert');
    return { completedTrades: 0, totalVolume: 0, findings: [`Setup failed: ${e.message}`] };
  }

  // Optional merchant inventory (cross-tenant public endpoints).
  const sellerAccountIds = new Set(sellerPool.map((s) => s.parentAccountId));
  const merchantEndpoints = includeMerchant ? await loadMerchantEndpoints(adminClient, sellerAccountIds) : [];

  const allInventory = [...sellerEndpoints, ...merchantEndpoints];
  if (allInventory.length === 0) {
    await adminClient.comment('a2a_x402_marketplace: no inventory provisioned', 'alert');
    return { completedTrades: 0, totalVolume: 0, findings: ['Empty inventory'] };
  }

  // Group by skill — buyers shop within a skill family.
  const bySkill = new Map<string, CatalogItem[]>();
  for (const item of allInventory) {
    const arr = bySkill.get(item.skillId) ?? [];
    arr.push(item);
    bySkill.set(item.skillId, arr);
  }

  if (!dryRun) {
    const sellerCount = new Set(sellerEndpoints.map((e) => e.sellerAgentId)).size;
    await adminClient.comment(
      `a2a_x402_marketplace: ${sellerCount} sellers (${sellerEndpoints.length} endpoints), ${merchantEndpoints.length} merchant endpoints, ${buyerPool.length} buyers. Mix: ${Math.round(a2aMix * 100)}% A2A + ${Math.round((1 - a2aMix) * 100)}% direct.`,
      'governance',
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
  let a2aTrades = 0;
  let directTrades = 0;
  let totalVolume = 0;
  const findings: string[] = [];
  const startedAt = Date.now();

  while (!shouldStop() && Date.now() - startedAt < durationMs) {
    cycle++;
    if (totalVolume >= maxRoundSpend) {
      if (!dryRun) {
        await adminClient.comment(
          `a2a_x402_marketplace: hit maxRoundSpendUsdc cap ($${maxRoundSpend.toFixed(2)}) — stopping`,
          'governance',
        );
      }
      break;
    }

    const activeBuyers = agentState.activeAgents(buyerPool);
    if (activeBuyers.length === 0) {
      if (!dryRun) await adminClient.comment(`a2a_x402_marketplace: no active buyers, ending`, 'alert');
      break;
    }

    const buyer = pick(activeBuyers);
    const buyerWalletId = (buyer as any).walletId as string | undefined;
    if (!buyerWalletId) {
      await adminClient.comment(`a2a_x402_marketplace: ${buyer.name} has no wallet — re-seed needed`, 'alert');
      break;
    }

    // Pick a skill family and decide path. A2A path requires a
    // seller-owned endpoint for that skill (no agent to task with on
    // a merchant-only endpoint). If we rolled A2A but no seller offers
    // that skill, fall through to direct.
    const skillId = pick([...bySkill.keys()]);
    const candidates = (bySkill.get(skillId) ?? []).filter((c) => {
      // Exclude the buyer's own seller endpoints — the API rejects self-send
      // A2A tasks ("Agent cannot send tasks to itself"), and on the direct
      // path it'd be a meaningless round-trip.
      if (c.kind === 'seller' && c.sellerAgentId === buyer.agentId) return false;
      if (c.kind === 'seller') return c.sellerAgentId && agentState.activeAgents(sellerPool).some((s) => s.agentId === c.sellerAgentId);
      return true;
    });
    if (candidates.length === 0) continue;

    const sellerCandidates = candidates.filter((c) => c.kind === 'seller');
    const useA2A = sellerCandidates.length > 0 && Math.random() < a2aMix;

    if (dryRun) { completedTrades++; break; }

    try {
      if (useA2A) {
        const result = await runA2aCycle({
          buyer, buyerWalletId, skillId, sellerCandidates,
          clients, adminClient, scenarioId, cycle,
          handleSuspension,
        });
        if (result.completed) {
          completedTrades++;
          a2aTrades++;
          totalVolume += result.cost;
        }
      } else {
        const result = await runDirectCycle({
          buyer, buyerWalletId, skillId, candidates,
          clients, adminClient, scenarioId, cycle,
        });
        if (result.completed) {
          completedTrades++;
          directTrades++;
          totalVolume += result.cost;
        }
      }
    } catch (e: any) {
      const wasSuspension = handleSuspension(e, buyer);
      if (!wasSuspension) {
        await adminClient.comment(
          `a2a_x402_marketplace: cycle ${cycle} crashed: ${e.message}`,
          'alert',
        );
        findings.push(`Cycle ${cycle}: ${e.message}`);
      }
    }

    await new Promise((r) => setTimeout(r, cycleSleepMs));
  }

  if (!dryRun) {
    await adminClient.comment(
      `a2a_x402_marketplace summary: ${completedTrades} trades — ${a2aTrades} A2A + ${directTrades} direct, $${totalVolume.toFixed(2)} settled via x402`,
      'governance',
    );
  }

  return { completedTrades, totalVolume, findings };
}

// ── A2A path ─────────────────────────────────────────────────────────

async function runA2aCycle(args: {
  buyer: SimAgent;
  buyerWalletId: string;
  skillId: string;
  sellerCandidates: CatalogItem[];
  clients: Record<string, SlyClient>;
  adminClient: SlyClient;
  scenarioId: string;
  cycle: number;
  handleSuspension: (err: unknown, agent: SimAgent) => boolean;
}): Promise<{ completed: boolean; cost: number }> {
  const { buyer, buyerWalletId, skillId, sellerCandidates, clients, adminClient, scenarioId, cycle } = args;
  const winner = pickSellerForSkill(buyer.style, sellerCandidates);
  const brief = pickBrief(skillId);

  // 1. createTask — buyer → seller. The metadata.simManualA2A flag tells
  // the API's a2a-task-worker to leave the task in 'working' state instead
  // of auto-routing to a webhook (sim seller agents don't have one) which
  // would park the task as input-required(no_handler) and break the chain.
  const created = await clients[buyer.agentId].createTask({
    agentId: winner.sellerAgentId!,
    message: {
      role: 'user',
      parts: [{ type: 'text', text: brief }],
      metadata: {
        simRound: scenarioId,
        cycle,
        skill: skillId,
        x402EndpointId: winner.endpointId,
        a2aX402: true,
        simManualA2A: true,
      },
    },
  });
  const taskId = created.id;

  // 2. wait briefly for the worker to claim (state submitted → working)
  // before we call /complete. The worker polls every ~250ms; up to ~1.5s
  // is the practical ceiling. If the task ends up in any other state,
  // bail out so the cycle can be marked failed.
  let claimedOk = false;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const cur = await clients[winner.sellerAgentId!].getTask(taskId).catch(() => null);
    const st = (cur as any)?.status?.state || (cur as any)?.state;
    if (st === 'working') { claimedOk = true; break; }
    if (st && st !== 'submitted') break;
  }
  if (!claimedOk) {
    return { completed: false, cost: 0 };
  }

  // 3. seller completes with deliverable (real backend if available, else synthesized)
  let deliverable = synthesizeDeliverable(skillId, brief, winner.sellerAgentName!);
  if (winner.backendUrl) {
    try {
      const r = await fetch(winner.backendUrl, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const txt = await r.text();
        deliverable += `\n\n---\n*Backend response (real x402 paid retrieval):*\n\`\`\`\n${txt.slice(0, 600)}\n\`\`\``;
      }
    } catch { /* fallback to synthetic */ }
  }

  try {
    await clients[winner.sellerAgentId!].completeTask(taskId, deliverable);
  } catch (e) {
    args.handleSuspension(e, { agentId: winner.sellerAgentId!, name: winner.sellerAgentName! } as any);
    return { completed: false, cost: 0 };
  }

  // 4. buyer pays via x402 (settlement on completion)
  try {
    await clients[buyer.agentId].payX402({
      endpointId: winner.endpointId,
      requestId: randomUUID(),
      amount: winner.basePrice,
      currency: 'USDC',
      walletId: buyerWalletId,
      method: winner.method,
      path: winner.path,
      metadata: { userAgent: `marketplace-sim/${scenarioId}#${cycle}/a2a` },
    });
  } catch (e: any) {
    await adminClient.comment(
      `a2a_x402_marketplace: A2A payX402 failed cycle ${cycle} (${buyer.name}→${winner.sellerAgentName} ${winner.endpointName}): ${e.message}`,
      'alert',
    );
    args.handleSuspension(e, buyer);
    return { completed: false, cost: 0 };
  }

  // 5. buyer rates — best-effort. The task may already be 'completed'
  // (skill policy with requires_acceptance=false) or in input-required
  // for a non-result-review reason; either way the cycle's settlement
  // is final at this point. Only call respond when we know it'll land.
  try {
    const cur = await clients[buyer.agentId].getTask(taskId).catch(() => null) as any;
    const st = cur?.status?.state || cur?.state;
    const reason = cur?.metadata?.input_required_context?.reason_code
      || cur?.status?.input_required_context?.reason_code;
    if (st === 'input-required' && reason === 'result_review') {
      await clients[buyer.agentId].respond({
        taskId,
        action: 'accept',
        score: 80 + Math.floor(Math.random() * 15),
        comment: `Accepted ${winner.endpointName} from ${winner.sellerAgentName}`,
        satisfaction: 'excellent',
      });
    }
  } catch (e: any) {
    args.handleSuspension(e, buyer);
  }

  // One summary milestone per A2A cycle. The createTask SSE event
  // already populates the live-feed task panel; this milestone gives
  // the merchant inspector its volume + the right rail its per-seller
  // tally.
  await adminClient.milestone(
    `\u{1F91D} A2A: ${buyer.name} hired ${winner.sellerAgentName} for ${winner.endpointName} ($${winner.basePrice.toFixed(2)})`,
    {
      agentId: buyer.agentId,
      agentName: buyer.name,
      icon: '\u{1F91D}',
      toId: 'merch:x402:' + winner.endpointId,
      toName: `${winner.sellerAgentName} · ${winner.endpointName}`,
      toKind: 'merchant',
      amount: winner.basePrice,
      currency: 'USDC',
      score: Math.round(winner.rating * 18),
      scoreComment: `A2A path; ${strategyFor(buyer.style)} pick; rating ${winner.rating.toFixed(2)}`,
      taskId,
    },
  );

  return { completed: true, cost: winner.basePrice };
}

// ── Direct path ──────────────────────────────────────────────────────

async function runDirectCycle(args: {
  buyer: SimAgent;
  buyerWalletId: string;
  skillId: string;
  candidates: CatalogItem[];
  clients: Record<string, SlyClient>;
  adminClient: SlyClient;
  scenarioId: string;
  cycle: number;
}): Promise<{ completed: boolean; cost: number }> {
  const { buyer, buyerWalletId, skillId, candidates, clients, adminClient, scenarioId, cycle } = args;
  const winner = pickSellerForSkill(buyer.style, candidates);

  await clients[buyer.agentId].payX402({
    endpointId: winner.endpointId,
    requestId: randomUUID(),
    amount: winner.basePrice,
    currency: 'USDC',
    walletId: buyerWalletId,
    method: winner.method,
    path: winner.path,
    metadata: { userAgent: `marketplace-sim/${scenarioId}#${cycle}/direct` },
  });

  const ownerLabel = winner.kind === 'seller' ? winner.sellerAgentName! : (winner.merchantName || 'merchant');
  await adminClient.milestone(
    `⚡ Direct: ${buyer.name} bought ${winner.endpointName} from ${ownerLabel} ($${winner.basePrice.toFixed(2)})`,
    {
      agentId: buyer.agentId,
      agentName: buyer.name,
      icon: '⚡',
      toId: 'merch:x402:' + winner.endpointId,
      toName: `${ownerLabel} · ${winner.endpointName}`,
      toKind: 'merchant',
      amount: winner.basePrice,
      currency: 'USDC',
      score: Math.round(winner.rating * 18),
      scoreComment: `direct path; ${strategyFor(buyer.style)} pick; rating ${winner.rating.toFixed(2)}`,
    },
  );

  return { completed: true, cost: winner.basePrice };
}
