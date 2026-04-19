/**
 * Collusion signal detector.
 *
 * The pitch post-mortem exposed a gap: ColluderBot-1 earned a 99/100
 * trust score entirely from ColluderBot-2/3/4 rating it 99s (closed
 * rating ring). Current reputation just averages raw scores — no
 * defense against mutual-inflation schemes.
 *
 * v1 computes three cheap signals over `a2a_task_feedback`:
 *
 *   - uniqueRaters       — distinct caller_agent_id rating this agent
 *   - topRaterShare      — top-1 rater's share of total ratings received
 *   - reciprocalRatio    — % of this agent's raters that this agent also rated
 *
 * A ring is flagged when any of:
 *   - uniqueRaters <= 2 && totalRatings >= 2       (tight clique)
 *   - topRaterShare > 0.6 && uniqueRaters < 5      (dominated by one rater)
 *   - reciprocalRatio > 0.5 && uniqueRaters < 5    (mutual-rating pattern)
 *
 * Flagged agents get their service_quality dimension capped at 600 (C tier
 * max). The raw signals are returned so the dashboard can surface the
 * "why" and link through to the raters.
 *
 * v2 will add graph-community detection (closed-clique discovery over the
 * full rating graph) and time-series spike detection; v1 is deliberately
 * a single agent lookup so it's cheap to compute on every reputation read.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CollusionSignals {
  /** Distinct raters for this agent (as provider). */
  uniqueRaters: number;
  /** Top-1 rater's share of this agent's ratings, 0-1. */
  topRaterShare: number;
  /** % of this agent's raters that this agent also rated back, 0-1. */
  reciprocalRatio: number;
  /** True when the ring-detection heuristics trip. */
  flagged: boolean;
  /** Short human-readable reason when flagged (null otherwise). */
  reason: string | null;
  /** IDs of the agents whose rating-share this is concentrated with. */
  topRaters: string[];
  /** Total ratings received — provided for convenience. */
  totalRatings: number;
}

export const EMPTY_COLLUSION: CollusionSignals = {
  uniqueRaters: 0,
  topRaterShare: 0,
  reciprocalRatio: 0,
  flagged: false,
  reason: null,
  topRaters: [],
  totalRatings: 0,
};

/** Cap applied to service_quality when a ring is flagged (score out of 1000). */
export const COLLUSION_PENALTY_CAP = 600;

/**
 * Compute collusion signals for a single agent.
 *
 * Runs two fast queries (one group-by on ratings received, one on ratings
 * given) and does the rest in JS. Cheap enough to call on every
 * `/v1/reputation/:id` request.
 */
export async function computeCollusionSignals(
  supabase: SupabaseClient,
  agentId: string,
): Promise<CollusionSignals> {
  if (!agentId) return EMPTY_COLLUSION;

  // 1. Ratings received by this agent — who gave them?
  const { data: received } = await supabase
    .from('a2a_task_feedback')
    .select('caller_agent_id')
    .eq('provider_agent_id', agentId)
    .not('caller_agent_id', 'is', null) as any;

  const receivedRows = (received ?? []) as Array<{ caller_agent_id: string }>;
  const totalRatings = receivedRows.length;
  if (totalRatings === 0) return EMPTY_COLLUSION;

  const raterCounts = new Map<string, number>();
  for (const r of receivedRows) {
    const k = r.caller_agent_id;
    raterCounts.set(k, (raterCounts.get(k) ?? 0) + 1);
  }

  const uniqueRaters = raterCounts.size;
  const sortedRaters = [...raterCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCount = sortedRaters[0]?.[1] ?? 0;
  const topRaterShare = totalRatings > 0 ? topCount / totalRatings : 0;
  const topRaters = sortedRaters.slice(0, 3).map(([id]) => id);

  // 2. Ratings this agent gave — which of its raters has it rated back?
  const raterIds = [...raterCounts.keys()];
  const { data: given } = await supabase
    .from('a2a_task_feedback')
    .select('provider_agent_id')
    .eq('caller_agent_id', agentId)
    .in('provider_agent_id', raterIds) as any;

  const reciprocated = new Set(
    (given ?? []).map((r: any) => r.provider_agent_id).filter(Boolean),
  );
  const reciprocalRatio = uniqueRaters > 0 ? reciprocated.size / uniqueRaters : 0;

  // 3. Apply the ring heuristics
  let flagged = false;
  let reason: string | null = null;

  if (uniqueRaters <= 2 && totalRatings >= 2) {
    flagged = true;
    reason = `Only ${uniqueRaters} unique rater${uniqueRaters === 1 ? '' : 's'} across ${totalRatings} ratings — tight clique`;
  } else if (topRaterShare > 0.6 && uniqueRaters < 5) {
    flagged = true;
    reason = `${Math.round(topRaterShare * 100)}% of ratings from a single rater across only ${uniqueRaters} unique raters`;
  } else if (reciprocalRatio > 0.5 && uniqueRaters < 5) {
    flagged = true;
    reason = `${Math.round(reciprocalRatio * 100)}% of raters rated back — mutual-rating pattern`;
  }

  return {
    uniqueRaters,
    topRaterShare: Math.round(topRaterShare * 100) / 100,
    reciprocalRatio: Math.round(reciprocalRatio * 100) / 100,
    flagged,
    reason,
    topRaters,
    totalRatings,
  };
}
