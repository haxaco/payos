/**
 * Compliance flag engine — the missing link between the existing
 * `compliance_flags` case-management UI and real tenant activity.
 *
 * Pure rule evaluators. Each evaluator scans a small slice of recent
 * tenant state and writes flags via the existing schema. **Read-mostly,
 * idempotent**: every flag is deduped by (tenant_id, flag_type,
 * reason_code, scoped entity) so re-runs never produce duplicates.
 *
 * Driven by `apps/api/src/workers/compliance-evaluator.ts` on a periodic
 * tick. Deliberately decoupled from the transfer/x402/ACP money paths
 * (no in-line hooks) so this ships safely alongside other in-flight
 * work and never affects settlement semantics.
 *
 * Initial rule set (covers all three flag_types end-to-end):
 *   transaction:  cross_border_amount, velocity_check
 *   pattern:      remittance_split_pattern
 *   account:      sanctions_potential_match (bridges compliance_screenings)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FlagInsert {
  tenant_id: string;
  flag_type: 'transaction' | 'pattern' | 'account';
  reason_code: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  description: string;
  account_id?: string | null;
  transfer_id?: string | null;
  ai_analysis?: Record<string, unknown>;
}

export interface EngineRunResult {
  scanned: { transfers: number; accounts: number; screenings: number };
  emitted: { cross_border_amount: number; velocity_check: number; remittance_split_pattern: number; sanctions_potential_match: number };
  durationMs: number;
}

/** Scan window for transfer-driven rules (sized to comfortably outlast a 60s tick + a brief outage). */
const TRANSFER_LOOKBACK_MIN = 10;
/** Velocity window — transfers per account in the last N minutes. */
const VELOCITY_WINDOW_MIN = 10;
const VELOCITY_THRESHOLD = 5;
/** Remittance-split window — transfers just below the $100 reporting threshold. */
const SPLIT_WINDOW_MIN = 60;
const SPLIT_THRESHOLD_COUNT = 3;
const SPLIT_AMOUNT_LOW = 90;
const SPLIT_AMOUNT_HIGH = 99.99;
/** Cross-border severity bands (USD-equivalent). */
const CROSS_BORDER_HIGH_USD = 1000;
const CROSS_BORDER_MEDIUM_USD = 100;
/** Per-account / per-reason dedupe TTL for non-transfer-tied rules. */
const DEDUPE_TTL_HOURS = 24;

/**
 * Idempotent flag emitter. If a matching flag for the same scope already
 * exists (transfer-tied: same transfer_id+reason_code; otherwise:
 * account_id+reason_code within DEDUPE_TTL_HOURS), no-ops.
 */
async function emitFlag(supabase: SupabaseClient<any>, flag: FlagInsert): Promise<boolean> {
  // Build the dedupe query.
  const q = supabase
    .from('compliance_flags')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', flag.tenant_id)
    .eq('reason_code', flag.reason_code);

  if (flag.transfer_id) {
    q.eq('transfer_id', flag.transfer_id);
  } else if (flag.account_id) {
    const cutoff = new Date(Date.now() - DEDUPE_TTL_HOURS * 3600 * 1000).toISOString();
    q.eq('account_id', flag.account_id).gte('created_at', cutoff);
  } else {
    return false;
  }

  const { count } = await q;
  if ((count ?? 0) > 0) return false;

  const { error } = await supabase.from('compliance_flags').insert({
    tenant_id: flag.tenant_id,
    flag_type: flag.flag_type,
    reason_code: flag.reason_code,
    risk_level: flag.risk_level,
    reasons: flag.reasons,
    description: flag.description,
    status: 'open',
    account_id: flag.account_id ?? null,
    transfer_id: flag.transfer_id ?? null,
    ai_analysis: flag.ai_analysis ?? {},
  });
  if (error) {
    console.warn('[compliance-engine] flag insert failed:', error.message, flag.reason_code);
    return false;
  }
  return true;
}

// ── Rule: cross_border_amount ─────────────────────────────────────────────
// Transfers whose destination currency differs from source currency, or
// whose destination tenant is a different tenant. Bands by amount.
async function evaluateCrossBorder(
  supabase: SupabaseClient<any>,
  transfer: any
): Promise<boolean> {
  const srcCur = transfer.currency;
  const dstCur = transfer.destination_currency;
  const crossTenant =
    transfer.destination_tenant_id &&
    transfer.destination_tenant_id !== transfer.tenant_id;
  const crossCurrency = srcCur && dstCur && srcCur !== dstCur;
  if (!crossCurrency && !crossTenant) return false;

  const amount = Number(transfer.amount) || 0;
  if (amount < CROSS_BORDER_MEDIUM_USD) return false;
  const risk: FlagInsert['risk_level'] =
    amount >= CROSS_BORDER_HIGH_USD ? 'high' : 'medium';

  const reasons = [
    crossCurrency
      ? `Cross-currency transfer (${srcCur} → ${dstCur})`
      : `Cross-tenant transfer (${String(transfer.destination_tenant_id).slice(0, 8)}…)`,
    `Amount ${amount.toFixed(2)} ${srcCur ?? ''} ≥ ${CROSS_BORDER_MEDIUM_USD}`,
  ];

  return emitFlag(supabase, {
    tenant_id: transfer.tenant_id,
    flag_type: 'transaction',
    reason_code: 'cross_border_amount',
    risk_level: risk,
    reasons,
    description: `Cross-border transfer of ${amount.toFixed(2)} ${srcCur ?? ''} flagged for review.`,
    transfer_id: transfer.id,
    account_id: transfer.from_account_id ?? null,
    ai_analysis: { amount, src_currency: srcCur, dst_currency: dstCur, cross_tenant: !!crossTenant },
  });
}

// ── Rule: velocity_check ──────────────────────────────────────────────────
// Account with ≥ VELOCITY_THRESHOLD completed transfers in the last
// VELOCITY_WINDOW_MIN minutes. Account-tied + 24h dedupe.
async function evaluateVelocity(
  supabase: SupabaseClient<any>,
  tenantId: string,
  accountId: string
): Promise<boolean> {
  const since = new Date(Date.now() - VELOCITY_WINDOW_MIN * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('transfers')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('from_account_id', accountId)
    .eq('status', 'completed')
    .gte('completed_at', since);
  if ((count ?? 0) < VELOCITY_THRESHOLD) return false;

  return emitFlag(supabase, {
    tenant_id: tenantId,
    flag_type: 'transaction',
    reason_code: 'velocity_check',
    risk_level: 'high',
    reasons: [
      `${count} completed transfers from this account in the last ${VELOCITY_WINDOW_MIN} minutes`,
      `Threshold: ${VELOCITY_THRESHOLD}`,
    ],
    description: `Unusually high transfer velocity (${count} in ${VELOCITY_WINDOW_MIN} min) from account.`,
    account_id: accountId,
    ai_analysis: { window_minutes: VELOCITY_WINDOW_MIN, count, threshold: VELOCITY_THRESHOLD },
  });
}

// ── Rule: remittance_split_pattern ────────────────────────────────────────
// Multiple transfers just below the $100 reporting threshold from the
// same account in a short window — classic structuring signal. Pattern
// flag, account-tied, 24h dedupe.
async function evaluateRemittanceSplit(
  supabase: SupabaseClient<any>,
  tenantId: string,
  accountId: string
): Promise<boolean> {
  const since = new Date(Date.now() - SPLIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { data, count } = await supabase
    .from('transfers')
    .select('amount', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('from_account_id', accountId)
    .eq('status', 'completed')
    .gte('completed_at', since)
    .gte('amount', SPLIT_AMOUNT_LOW)
    .lte('amount', SPLIT_AMOUNT_HIGH);
  if ((count ?? 0) < SPLIT_THRESHOLD_COUNT) return false;

  const total = (data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  return emitFlag(supabase, {
    tenant_id: tenantId,
    flag_type: 'pattern',
    reason_code: 'remittance_split_pattern',
    risk_level: 'high',
    reasons: [
      `${count} transfers between ${SPLIT_AMOUNT_LOW} and ${SPLIT_AMOUNT_HIGH} in the last ${SPLIT_WINDOW_MIN} minutes`,
      `Aggregate ${total.toFixed(2)} structured just under the 100 reporting threshold`,
    ],
    description: `Possible structuring: ${count} sub-threshold transfers totalling ${total.toFixed(2)}.`,
    account_id: accountId,
    ai_analysis: {
      window_minutes: SPLIT_WINDOW_MIN,
      count,
      total,
      band: [SPLIT_AMOUNT_LOW, SPLIT_AMOUNT_HIGH],
    },
  });
}

// ── Rule: sanctions_potential_match (bridge) ──────────────────────────────
// The existing screening system already writes compliance_screenings rows
// with risk_level when a sanctions / PEP / country-risk hit comes back.
// Nothing was bridging those to compliance_flags, so the case-management
// UI never saw them. We do that here.
async function bridgeScreeningHits(
  supabase: SupabaseClient<any>,
  sinceIso: string
): Promise<number> {
  const { data: screenings, error } = await supabase
    .from('compliance_screenings')
    .select('id, tenant_id, type, provider, risk_level, related_id, subject, result, created_at')
    .gte('created_at', sinceIso)
    .in('risk_level', ['medium', 'high', 'critical']);
  if (error || !screenings) return 0;
  let emitted = 0;
  for (const s of screenings) {
    const accountId: string | null =
      s.related_id ||
      (s.subject && typeof s.subject === 'object' ? (s.subject as any).account_id ?? null : null);
    const ok = await emitFlag(supabase, {
      tenant_id: s.tenant_id,
      flag_type: 'account',
      reason_code: 'sanctions_potential_match',
      risk_level: (s.risk_level as any) ?? 'medium',
      reasons: [
        `${s.type ?? 'screening'} via ${s.provider ?? 'provider'} returned risk=${s.risk_level}`,
      ],
      description: `Sanctions / PEP screening hit from ${s.provider ?? 'screening provider'}.`,
      account_id: accountId,
      ai_analysis: {
        screening_id: s.id,
        screening_type: s.type,
        provider: s.provider,
        result_summary: s.result,
      },
    });
    if (ok) emitted++;
  }
  return emitted;
}

/**
 * Single periodic-tick entrypoint. Scans the last TRANSFER_LOOKBACK_MIN
 * window of completed transfers, evaluates all transfer + pattern
 * rules, and bridges new screening hits to flags. Returns counts for
 * observability.
 */
export async function runComplianceEvaluation(
  supabase: SupabaseClient<any>
): Promise<EngineRunResult> {
  const start = Date.now();
  const sinceIso = new Date(Date.now() - TRANSFER_LOOKBACK_MIN * 60 * 1000).toISOString();

  const result: EngineRunResult = {
    scanned: { transfers: 0, accounts: 0, screenings: 0 },
    emitted: {
      cross_border_amount: 0,
      velocity_check: 0,
      remittance_split_pattern: 0,
      sanctions_potential_match: 0,
    },
    durationMs: 0,
  };

  // ── Transfer-driven rules ───────────────────────────────────────────────
  const { data: transfers } = await supabase
    .from('transfers')
    .select(
      'id, tenant_id, from_account_id, amount, currency, destination_currency, destination_tenant_id, status, completed_at'
    )
    .eq('status', 'completed')
    .gte('completed_at', sinceIso);

  result.scanned.transfers = transfers?.length ?? 0;

  if (transfers && transfers.length > 0) {
    for (const t of transfers) {
      if (await evaluateCrossBorder(supabase, t)) result.emitted.cross_border_amount++;
    }

    // Dedupe accounts touched, evaluate velocity + split per-account once.
    const accountKeys = new Set<string>();
    for (const t of transfers) {
      if (t.tenant_id && t.from_account_id)
        accountKeys.add(`${t.tenant_id}::${t.from_account_id}`);
    }
    result.scanned.accounts = accountKeys.size;
    for (const key of accountKeys) {
      const [tenantId, accountId] = key.split('::');
      if (await evaluateVelocity(supabase, tenantId, accountId))
        result.emitted.velocity_check++;
      if (await evaluateRemittanceSplit(supabase, tenantId, accountId))
        result.emitted.remittance_split_pattern++;
    }
  }

  // ── Screening bridge ────────────────────────────────────────────────────
  const screeningEmitted = await bridgeScreeningHits(supabase, sinceIso);
  result.emitted.sanctions_potential_match = screeningEmitted;
  result.scanned.screenings = screeningEmitted; // approximate

  result.durationMs = Date.now() - start;
  return result;
}
