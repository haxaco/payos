/**
 * x402 Vendor Reputation Service — Epic 81
 *
 * Thin wrapper over the Postgres `x402_vendor_reliability` function.
 * Returns per-host aggregates and derives a recommendation code
 * (trusted / caution / avoid / unknown) callers can use to short-circuit
 * paid calls to known-broken vendors.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type Recommendation = 'trusted' | 'caution' | 'avoid' | 'unknown';

export interface VendorReputation {
  host: string;
  marketplace: string | null;
  settlementNetwork: string | null;
  totalCalls: number;
  completedCount: number;
  cancelledCount: number;
  pendingCount: number;
  successRate: number;                    // 0–1
  avgResponseSize: number | null;
  avgDurationMs: number | null;
  classificationHistogram: Record<string, number>;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  firstSeenAt: string | null;
  totalUsdcSpent: number;
  totalUsdcWasted: number;
  recommendation: Recommendation;
  reasoning: string;
}

// Thresholds — tuned from Tina's first ~60 calls. Move to per-tenant
// config later if needed.
const MIN_CALLS_FOR_RATING = 3;
const TRUSTED_SUCCESS = 0.9;
const AVOID_SUCCESS = 0.4;

function classify(row: any): { recommendation: Recommendation; reasoning: string } {
  const total = Number(row.total_calls) || 0;
  const completed = Number(row.completed_count) || 0;
  const cancelled = Number(row.cancelled_count) || 0;
  const rate = Number(row.success_rate) || 0;
  const hist = (row.classification_histogram || {}) as Record<string, number>;

  if (total < MIN_CALLS_FOR_RATING) {
    return {
      recommendation: 'unknown',
      reasoning: `Only ${total} call${total === 1 ? '' : 's'} in window — not enough signal yet.`,
    };
  }

  if (rate >= TRUSTED_SUCCESS) {
    return {
      recommendation: 'trusted',
      reasoning: `${completed}/${total} calls completed (${(rate * 100).toFixed(0)}%). Safe to use.`,
    };
  }

  if (rate >= AVOID_SUCCESS) {
    const topFailure = Object.entries(hist).sort(([, a], [, b]) => b - a)[0];
    const topNote = topFailure ? ` Most common failure: ${topFailure[0]} (${topFailure[1]}).` : '';
    return {
      recommendation: 'caution',
      reasoning: `${completed}/${total} completed (${(rate * 100).toFixed(0)}%).${topNote} Expect intermittent failures.`,
    };
  }

  // Avoid — most calls failing.
  const histNotes = Object.entries(hist)
    .sort(([, a], [, b]) => b - a)
    .map(([code, count]) => `${code}: ${count}`)
    .join(', ');
  return {
    recommendation: 'avoid',
    reasoning: `${cancelled}/${total} calls cancelled (${((1 - rate) * 100).toFixed(0)}% failure). Classifications — ${histNotes || 'unclassified'}. Prefer an alternative.`,
  };
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

function mapRow(row: any): VendorReputation {
  const { recommendation, reasoning } = classify(row);
  return {
    host: row.host,
    marketplace: row.marketplace ?? null,
    settlementNetwork: row.settlement_network ?? null,
    totalCalls: Number(row.total_calls) || 0,
    completedCount: Number(row.completed_count) || 0,
    cancelledCount: Number(row.cancelled_count) || 0,
    pendingCount: Number(row.pending_count) || 0,
    successRate: Number(row.success_rate) || 0,
    avgResponseSize: row.avg_response_size != null ? Number(row.avg_response_size) : null,
    avgDurationMs: row.avg_duration_ms != null ? Number(row.avg_duration_ms) : null,
    classificationHistogram: (row.classification_histogram || {}) as Record<string, number>,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    firstSeenAt: row.first_seen_at,
    totalUsdcSpent: Number(row.total_usdc_spent) || 0,
    totalUsdcWasted: Number(row.total_usdc_wasted) || 0,
    recommendation,
    reasoning,
  };
}

export interface ReputationQueryOptions {
  sinceDays?: number;       // default: 30
  environment?: 'live' | 'test';
}

export async function listVendorReputation(
  supabase: SupabaseClient,
  tenantId: string,
  opts: ReputationQueryOptions = {},
): Promise<VendorReputation[]> {
  const since = new Date(Date.now() - (opts.sinceDays ?? 30) * 86400_000).toISOString();
  const { data, error } = await (supabase.rpc('x402_vendor_reliability', {
    p_tenant_id: tenantId,
    p_since: since,
    p_environment: opts.environment ?? null,
  }) as any);
  if (error) {
    console.error('[reputation] RPC failed:', error);
    throw new Error(`Failed to read vendor reliability: ${error.message}`);
  }
  return (data || []).map(mapRow);
}

export async function getVendorReputation(
  supabase: SupabaseClient,
  tenantId: string,
  host: string,
  opts: ReputationQueryOptions = {},
): Promise<VendorReputation> {
  const target = normalizeHost(host);
  const all = await listVendorReputation(supabase, tenantId, opts);
  const match = all.find((r) => normalizeHost(r.host) === target);
  if (match) return match;
  // Host not seen — synthesize an "unknown" reading so callers have a
  // consistent shape to key off.
  return {
    host: target,
    marketplace: null,
    settlementNetwork: null,
    totalCalls: 0,
    completedCount: 0,
    cancelledCount: 0,
    pendingCount: 0,
    successRate: 0,
    avgResponseSize: null,
    avgDurationMs: null,
    classificationHistogram: {},
    lastSuccessAt: null,
    lastFailureAt: null,
    firstSeenAt: null,
    totalUsdcSpent: 0,
    totalUsdcWasted: 0,
    recommendation: 'unknown',
    reasoning: 'No calls to this host from this tenant in the window.',
  };
}
