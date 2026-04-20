/**
 * Agent-Friendliness Index.
 *
 * Scores the DESIGN choices a merchant made — the intentional signals — on
 * a 0-100 scale. Separate from commercial performance (conversion,
 * abandonment, volume) which is emergent and lives elsewhere.
 *
 * Weights:
 *   Catalog Structure    30 %   — SKU presence, clear prices, categories
 *   Reliability          25 %   — checkout complete rate
 *   Price Accuracy       20 %   — catalog == checkout, rating-derived
 *   Latency              15 %   — p95 create→complete
 *   Manifest Compliance  10 %   — .well-known endpoint for external merchants
 *
 * Any signal that's unmeasurable (e.g., manifest on a hosted merchant, or
 * price_accuracy with no ratings yet) is marked N/A and its weight is
 * redistributed across the present signals so the score stays honest.
 */

export interface FriendlinessBreakdown {
  catalog: FriendlinessSignal;
  reliability: FriendlinessSignal;
  price_accuracy: FriendlinessSignal;
  latency: FriendlinessSignal;
  manifest: FriendlinessSignal;
}

export interface FriendlinessSignal {
  /** 0-100, or null when not measurable. */
  score: number | null;
  /** Raw observation that drove the score. Useful for the dashboard breakdown tooltip. */
  detail: Record<string, unknown>;
  /** Issues surfaced by the linter/check (shown as a checklist). */
  issues?: string[];
}

export interface FriendlinessResult {
  /** 0-100 weighted composite. null when no signals could be measured. */
  score: number | null;
  /** Per-signal scores + details. */
  breakdown: FriendlinessBreakdown;
  /** Effective weights (after N/A redistribution). Sum to 1 when score is non-null. */
  weights: Record<keyof FriendlinessBreakdown, number>;
}

const BASE_WEIGHTS: Record<keyof FriendlinessBreakdown, number> = {
  catalog: 0.30,
  reliability: 0.25,
  price_accuracy: 0.20,
  latency: 0.15,
  manifest: 0.10,
};

// ─── Catalog linter ────────────────────────────────────────────────────
// Scores the structural quality of a product catalog. Works on any shape —
// our seeded `metadata.catalog.products`, a fetched external response, etc.
export function lintCatalog(products: any[] | undefined | null): FriendlinessSignal {
  const list = Array.isArray(products) ? products : [];
  if (list.length === 0) {
    return { score: 0, detail: { products: 0 }, issues: ['No products in catalog'] };
  }

  // Per-product checks. Required fields weighted higher than bonus fields.
  // Max score per product = 10 (5 required × 1.5 + 5 bonus × 0.5).
  const requiredChecks = [
    { key: 'name', weight: 1.5, test: (p: any) => typeof p?.name === 'string' && p.name.trim().length > 0 },
    { key: 'valid_price', weight: 1.5, test: (p: any) => Number(p?.unit_price_cents) > 0 },
    { key: 'currency', weight: 1.5, test: (p: any) => typeof p?.currency === 'string' && /^[A-Z]{3,10}$/.test(p.currency) },
    { key: 'id', weight: 1.5, test: (p: any) => typeof p?.id === 'string' && p.id.trim().length > 0 },
    { key: 'category', weight: 1.5, test: (p: any) => typeof p?.category === 'string' && p.category.trim().length > 0 },
  ];
  const bonusChecks = [
    { key: 'sku', weight: 0.5, test: (p: any) => typeof p?.sku === 'string' && p.sku.trim().length > 0 },
    { key: 'description', weight: 0.5, test: (p: any) => typeof p?.description === 'string' && p.description.trim().length > 0 },
  ];
  const maxPer = requiredChecks.reduce((s, c) => s + c.weight, 0) + bonusChecks.reduce((s, c) => s + c.weight, 0);

  const issueCounts: Record<string, number> = {};
  let totalScore = 0;
  for (const p of list) {
    let got = 0;
    for (const c of [...requiredChecks, ...bonusChecks]) {
      if (c.test(p)) got += c.weight;
      else issueCounts[c.key] = (issueCounts[c.key] || 0) + 1;
    }
    totalScore += (got / maxPer);
  }
  const score = Math.round((totalScore / list.length) * 100);

  // Build human-readable issues list — only surface the ones that affect
  // >20% of the catalog so the panel doesn't scream about bonus fields.
  const threshold = Math.max(1, Math.floor(list.length * 0.2));
  const issues: string[] = [];
  for (const [key, count] of Object.entries(issueCounts)) {
    if (count < threshold) continue;
    const label: Record<string, string> = {
      name: 'Products missing name',
      valid_price: 'Products with zero/invalid price',
      currency: 'Products missing currency (or non-ISO)',
      id: 'Products missing stable id',
      category: 'Products missing category',
      sku: 'Products missing SKU (bonus)',
      description: 'Products missing description (bonus)',
    };
    issues.push(`${count}/${list.length} ${label[key] || key}`);
  }

  return {
    score,
    detail: { products: list.length, issueCounts },
    issues,
  };
}

// ─── Reliability: complete / attempted ─────────────────────────────────
export function computeReliability(input: {
  acpRows: any[];            // all ACP checkouts in window, any status
  ucpRows: any[];            // filtered to this merchant
  x402Rows: any[];           // transfers targeting this merchant
  abandonedCount: number;    // from discovery block
}): FriendlinessSignal {
  // A checkout "attempt" = any row where the agent started the flow. Completed
  // = settled. The ratio is the merchant's reliability.
  const acpCompleted = input.acpRows.filter((c) => c.status === 'completed').length;
  const acpFailed = input.acpRows.filter((c) => c.status === 'failed' || c.status === 'cancelled').length;
  const acpAbandoned = input.abandonedCount;

  const ucpCompleted = input.ucpRows.length; // already filtered to completed
  const ucpOtherAttempts = 0; // merchant-stats doesn't currently fetch non-completed UCP; conservative estimate

  const x402Completed = input.x402Rows.filter((t) => t.status === 'completed' || t.status === 'pending').length;
  const x402Failed = input.x402Rows.filter((t) => t.status === 'failed' || t.status === 'cancelled').length;

  const completed = acpCompleted + ucpCompleted + x402Completed;
  const attempted = completed + acpFailed + acpAbandoned + ucpOtherAttempts + x402Failed;

  if (attempted < 3) {
    return { score: null, detail: { attempted, completed, note: 'Not enough volume to score reliability' } };
  }

  const rate = completed / attempted;
  // Score is the raw completion rate × 100. Perfect 100%, anything under 70%
  // signals operational problems.
  return {
    score: Math.round(rate * 100),
    detail: { completed, attempted, completion_rate: rate },
  };
}

// ─── Latency: p95 on ACP create→complete ───────────────────────────────
export function computeLatency(acpRows: any[]): FriendlinessSignal {
  const completed = acpRows
    .filter((c) => c.status === 'completed' && c.created_at && c.updated_at)
    .map((c) => new Date(c.updated_at).getTime() - new Date(c.created_at).getTime())
    .filter((ms) => ms > 0 && ms < 10 * 60 * 1000); // ignore garbage / multi-minute outliers

  if (completed.length < 3) {
    return { score: null, detail: { samples: completed.length, note: 'Not enough completed checkouts to measure latency' } };
  }

  completed.sort((a, b) => a - b);
  const p50 = completed[Math.floor(completed.length * 0.5)];
  const p95 = completed[Math.floor(completed.length * 0.95)] || completed[completed.length - 1];

  // Scoring: <1s = 100, 30s = 0, log-linear in between.
  // score = max(0, 100 × (1 − log10(p95ms / 1000) / log10(30)))
  let score: number;
  if (p95 <= 1000) score = 100;
  else if (p95 >= 30000) score = 0;
  else score = Math.round(Math.max(0, 100 * (1 - Math.log10(p95 / 1000) / Math.log10(30))));

  return {
    score,
    detail: { samples: completed.length, p50_ms: p50, p95_ms: p95 },
  };
}

// ─── Price accuracy from ratings ──────────────────────────────────────
export function computePriceAccuracy(priceAccuracyAvg: number | null, sampleCount: number): FriendlinessSignal {
  if (priceAccuracyAvg == null || sampleCount < 3) {
    return { score: null, detail: { samples: sampleCount, note: 'Not enough ratings' } };
  }
  // Rating is 1-5. Normalize: 1 → 0, 5 → 100.
  const score = Math.round(((priceAccuracyAvg - 1) / 4) * 100);
  return {
    score: Math.max(0, Math.min(100, score)),
    detail: { samples: sampleCount, avg: Number(priceAccuracyAvg.toFixed(2)) },
  };
}

// ─── Manifest compliance (best-effort probe) ───────────────────────────
// For hosted merchants without a manifest_url this returns N/A and the
// signal drops out of the weighted score.
export async function probeManifest(manifestUrl: string | null | undefined): Promise<FriendlinessSignal> {
  if (!manifestUrl) {
    return { score: null, detail: { note: 'No manifest_url on account (N/A for hosted merchants)' } };
  }
  try {
    const res = await fetch(manifestUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      return { score: 0, detail: { url: manifestUrl, http_status: res.status }, issues: [`Manifest returned HTTP ${res.status}`] };
    }
    const body = await res.text();
    try {
      JSON.parse(body);
      return { score: 100, detail: { url: manifestUrl, http_status: res.status, size_bytes: body.length } };
    } catch {
      // 200 but not parseable as JSON — partial credit.
      return {
        score: 50,
        detail: { url: manifestUrl, http_status: res.status, size_bytes: body.length },
        issues: ['Manifest is reachable but not valid JSON'],
      };
    }
  } catch (err: any) {
    return { score: 0, detail: { url: manifestUrl, error: err?.message || 'fetch failed' }, issues: ['Manifest endpoint unreachable'] };
  }
}

// ─── Composite ──────────────────────────────────────────────────────────
/**
 * Combine the per-signal scores with weight redistribution.
 *
 * Example: if manifest is N/A (no manifest_url), its 10% weight is
 * redistributed proportionally across the four remaining signals so the
 * composite isn't mechanically penalized for an optional signal.
 */
export function composeFriendliness(breakdown: FriendlinessBreakdown): FriendlinessResult {
  const keys = Object.keys(breakdown) as Array<keyof FriendlinessBreakdown>;
  const present = keys.filter((k) => breakdown[k].score != null);
  const presentWeightSum = present.reduce((s, k) => s + BASE_WEIGHTS[k], 0);

  if (present.length === 0 || presentWeightSum === 0) {
    return {
      score: null,
      breakdown,
      weights: keys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {} as Record<keyof FriendlinessBreakdown, number>),
    };
  }

  // Redistribute — each present signal's effective weight is its base weight
  // scaled up so they sum to 1. Absent signals get 0.
  const weights = keys.reduce((acc, k) => {
    acc[k] = breakdown[k].score != null ? BASE_WEIGHTS[k] / presentWeightSum : 0;
    return acc;
  }, {} as Record<keyof FriendlinessBreakdown, number>);

  const weighted = present.reduce((s, k) => s + (breakdown[k].score as number) * weights[k], 0);
  return {
    score: Math.round(weighted),
    breakdown,
    weights,
  };
}
