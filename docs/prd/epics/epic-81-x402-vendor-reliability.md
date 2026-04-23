# Epic 81: x402 Vendor Reliability Observatory

## Summary

Turn the response + classification data Sly already captures on every external x402 call into a rolling per-vendor reliability score. Surface it in the dashboard, expose it via MCP (`x402_endpoint_reputation`), and wire it into `x402_probe` and `x402_discover` so agents see "this vendor has a 3% success rate over the past week — avoid" *before* they spend. Pure observability — no schema changes, no new data collection, just aggregation of what already sits in `transfers`.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `GET /v1/analytics/x402-vendors` | ✅ Yes | `sly.analytics` | P1 | New analytics surface |
| `GET /v1/analytics/x402-vendors/:host` | ✅ Yes | `sly.analytics` | P1 | Per-vendor detail |
| MCP `x402_endpoint_reputation` | ✅ Yes | — | P1 | Agent-facing tool |
| Probe + discover enrichment | ❌ | Internal | - | Server-side only |

**SDK Stories Required:**
- [ ] Story 81.X: Add `sly.analytics.x402Vendors()` to SDK
- [ ] Story 81.Y: Add `x402_endpoint_reputation` MCP tool + weave reputation into existing probe/discover responses

## Motivation

We've now transacted enough through external x402 to see the ecosystem's reliability shape clearly: SlamAI is bulletproof (100% success across dozens of calls), StableTravel is chronically broken (every paid call 500s with empty body), PaySponge silently rejects, Exa is dual-auth gated. Every one of these patterns is already captured per-row in `protocol_metadata.classification.code` and `protocol_metadata.response.status` (epics shipped 2026-04-22).

Today an agent probing a new vendor has no prior-experience signal — they discover brokenness only by paying for it (or in the case of chronic `VENDOR_EMPTY_RESPONSE`, getting a row cancelled with no data returned). The data to prevent this exists; we just need to aggregate it.

Value per customer segment:
1. **Agents running autonomously** — stop retrying vendors that silently fail; reroute to known-good alternatives within the same category.
2. **Tenant owners / compliance** — reliability reports across their agent fleet: "which vendors did my agents try, which wasted money, which are worth standardizing on."
3. **Sly (us)** — aggregate opt-in-sharing across tenants would give us a cross-ecosystem view nobody else has. Potential public registry / ranking product later.

## What already exists (prerequisites — all satisfied)

- `transfers.protocol_metadata.response.status` — HTTP status of the post-payment call (commit `b237ec0`).
- `transfers.protocol_metadata.classification.code` — failure taxonomy (commit `8f6fd1f`).
- `transfers.protocol_metadata.resource.host` — vendor hostname (commit `f2583bb`).
- `transfers.protocol_metadata.resource.marketplace` — marketplace attribution (commit `f2583bb`).
- `transfers.settlement_network` — chain id (commit `29cc714`).
- `transfers.tx_hash` — on-chain settlement proof (commit `29cc714`).
- `transfers.status` + `failure_reason` — terminal outcome.

So everything needed is in place. This epic purely builds aggregation + surfacing.

## Scope

**In scope:**
- Per-tenant reliability aggregation across 7d / 30d / all-time windows
- Per-vendor breakdown: total, success count, failure-by-classification histogram, avg response size, avg duration
- Dashboard page + MCP tool + SDK method
- Auto-enrichment of `x402_probe` and `x402_discover` outputs with reputation when available

**Out of scope (phase 2):**
- Cross-tenant anonymized reputation pool (privacy + governance design needed)
- Predictive scoring (ML) — just aggregate counts and rates in v1
- Per-endpoint (not just per-host) stats — vendors can have broken + working endpoints under the same host; worth splitting in v2
- Alerting on reliability drops — observability first, alerts later

## Code changes

### 1. SQL — materialized view or query helper

No migration needed. Either a `public.x402_vendor_stats` materialized view refreshed every N minutes, OR a lazy SQL function `x402_vendor_reliability(tenant_id, window_seconds)` that aggregates on demand. Prefer the function for v1 — no refresh job to maintain and data is fresh.

Shape:
```sql
-- Returns one row per vendor host within the tenant + window
CREATE OR REPLACE FUNCTION x402_vendor_reliability(
  p_tenant_id uuid,
  p_since timestamptz
) RETURNS TABLE (
  host                 text,
  marketplace          text,
  settlement_network   text,
  total_calls          bigint,
  completed_count      bigint,
  cancelled_count      bigint,
  pending_count        bigint,
  success_rate         numeric,    -- completed / total
  avg_response_size    numeric,
  avg_duration_ms      numeric,
  classification_histogram jsonb,  -- { AGENTKIT_REQUIRED: 3, VENDOR_EMPTY_RESPONSE: 7, ... }
  last_success_at      timestamptz,
  last_failure_at      timestamptz,
  first_seen_at        timestamptz,
  total_usdc_spent     numeric,
  total_usdc_wasted    numeric     -- cancelled rows' amount — paid but nothing returned
) ...
```

Reads from `transfers` filtered by `tenant_id`, `type='x402'`, `protocol_metadata->>'direction'='external'`, `created_at >= p_since`.

### 2. API — `apps/api/src/routes/analytics/x402-vendors.ts`

- `GET /v1/analytics/x402-vendors?window=7d&sort=success_rate` — list of all vendors the tenant's agents have tried, sorted
- `GET /v1/analytics/x402-vendors/:host?window=30d` — single-vendor detail with per-endpoint drill-down (group by `resource.path`)
- Both tenant-scoped via existing auth middleware; no new RLS required since we're querying through a tenant-filtered SQL function.

### 3. MCP — `x402_endpoint_reputation` tool

```
x402_endpoint_reputation(url)
  → {
      host, marketplace,
      totalCalls, successRate, avgDurationMs,
      classificationHistogram: { VENDOR_EMPTY_RESPONSE: 7, ... },
      recommendation: 'trusted' | 'caution' | 'avoid' | 'unknown',
      reasoning: "12/14 calls cancelled (86%) — 7 VENDOR_EMPTY_RESPONSE, 5 FACILITATOR_REJECTED_SILENT. Avoid.",
      lastSuccessAt, lastFailureAt,
    }
```

Also add a `since` parameter for window size. Returns `{ recommendation: 'unknown' }` when fewer than 3 calls exist — agents can decide whether to pioneer or stick with known-goods.

### 4. Weave reputation into existing tools

- `x402_probe` — when the probe returns a parsed challenge, also include the vendor's `reputation` block if the tenant has prior data for that host. Changes the recommendation text to incorporate historical signal.
- `x402_discover` — add a `reputation` field on each match (when available). Optional `sortBy='reputation'` param ranks matches by success rate instead of by price.

### 5. Dashboard — `apps/web/src/app/dashboard/analytics/vendors/page.tsx`

Single page, three sections:
1. **Summary KPIs** — total vendors tried, trusted (≥90% success), caution (40-90%), avoid (<40%), total USDC spent, total wasted on cancellations
2. **Vendor table** — sortable by success rate / volume / last activity / wasted USDC. Each row click drills into /dashboard/analytics/vendors/:host
3. **Per-vendor detail** — full classification histogram, per-endpoint breakdown, transfer-row links, rolling success rate chart

Fed by the analytics API. No real-time requirement; 1 min cache is fine.

### 6. Audit trail on automation

When an agent's call is skipped/rerouted because reputation said "avoid," record that decision so tenants can audit *why* an agent did (or didn't) call a vendor. Add a new audit action `vendor_skipped_by_reputation` with the host, snapshotted stats, and decision reason.

## Story breakdown (~15 pts MVP)

| # | Story | Points |
|---|---|---|
| 81.1 | SQL function `x402_vendor_reliability(tenant_id, since)` + tests | 3 |
| 81.2 | REST API routes: list + detail with sort/filter | 3 |
| 81.3 | MCP `x402_endpoint_reputation` tool | 2 |
| 81.4 | Enrich `x402_probe` output with reputation when available | 1 |
| 81.5 | `x402_discover` sort-by-reputation option + reputation field on matches | 1 |
| 81.6 | Dashboard analytics/vendors page: summary KPIs + table + drill-down | 3 |
| 81.7 | SDK `sly.analytics.x402Vendors()` module | 2 |

**MVP: ~15 story points.** Ship incrementally — 81.1 + 81.3 (~5pts) is enough to get agent-side reputation awareness working.

### Phase 2 backlog

- **Cross-tenant opt-in reliability pool** — tenants opt into contributing anonymized (host + classification + success/failure only, no transfer IDs) stats to a shared registry, query that registry when local data is thin. Privacy review required. ~5pts.
- **Per-endpoint breakdown** (vs just per-host) — split stats by `resource.path` because vendors often have broken + working endpoints under the same domain. ~3pts.
- **Reputation decay** — recent calls weighted heavier than old ones. Currently the function uses hard time windows; a smoother decay curve would handle vendors that got fixed after an outage. ~2pts.
- **Alerting on reliability drops** — webhook/email when a vendor's 7d success rate falls below some threshold. ~3pts.
- **Machine-readable reputation feed** — public `GET /v1/registry/x402-vendors.json` for the opt-in cross-tenant data, indexable by anyone. Our version of "npm audit" but for paid x402 endpoints. ~5pts if cross-tenant pool exists.

## Risks

- **Cold start.** New tenants have no reputation data. `unknown` is the right default — don't gate calls based on empty history. Agents can still pioneer; only known-avoids are discouraged.
- **Thresholds are subjective.** "Trusted / caution / avoid" cutoffs at 90%/40% are defensible but arbitrary. Make them configurable per tenant; default sensibly.
- **Single-vendor monopolies.** If only one cheap weather API exists and it's 60% reliable, the recommendation "avoid" isn't useful — there's no alternative. Dashboard should surface "best in category" alongside raw score.
- **Reputation gaming (future).** Once cross-tenant pools exist, a malicious vendor could spawn fake tenants that only record successful calls to their own endpoint. v1 ships per-tenant only, avoiding this; v2 needs Sybil resistance.

## Related

- **Epic 77 — BYO Wallet Custody** — orthogonal; reputation is about vendor reliability, custody is about payer infrastructure.
- **Epic 78 — Agentic Credential Vault** — when shipped, reputation extends naturally to vault-proxied calls too (same `transfers.protocol_metadata` writes, just different direction).
- **Epic 79 — API Monetization Gateway** — tenants running the gateway become vendors themselves; reputation is how buyers assess them.
- **Epic 80 — AgentKit Proof-of-Humanity** — agentkit-gated endpoints naturally cluster as `AGENTKIT_REQUIRED` classification, letting reputation tell agents "skip these unless you have human-attested custody."

## Critical files to reference during implementation

- `apps/api/src/routes/transfers.ts` — source data is already in this table
- `packages/mcp-server/src/server-factory.ts:classifyX402Failure` — source of classification codes
- `apps/api/src/services/ops/track-op.ts` — existing operation-telemetry pattern to mirror
- `apps/web/src/app/dashboard/analytics/` — existing analytics pages for styling consistency
- `docs/prd/epics/epic-65-operations-observability.md` — sibling observability epic, similar aggregation pattern
