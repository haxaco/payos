# Story 90.6: Anonymous Search Rate-Limiting + Caching

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Epic 89 search endpoint, Stories 90.1–90.4

---

The public search endpoint is the easiest abuse surface — anyone can hammer it. Two protections:

1. **Rate-limit** anonymous calls per IP at the API edge: 30 requests/min hard cap on `/v1/marketplaces/search` and any anonymous-readable `/v1/marketplaces/*` route. Reuses `apps/api/src/middleware/rate-limit.ts` but with stricter per-IP buckets for anonymous (`actorType === undefined`).
2. **Cache** search results aggressively at the edge — Cloudflare cache or Vercel's runtime cache keyed on the canonicalized search params. 60-second TTL with `stale-while-revalidate`. Bust the cache when any marketplace's `kym_tier` or `visibility` changes.

## Acceptance

- [ ] Anonymous search returns 429 with `Retry-After` after 30 req/min from one IP
- [ ] Authenticated requests bypass the anonymous bucket (existing API key / JWT rate-limits still apply)
- [ ] Search cache hit rate > 80% in steady-state (measured via response header `X-Cache: HIT`)
- [ ] Cache invalidates within 30s of a marketplace's visibility or tier change

## Technical notes

Don't put RLS gating on the cache key — the public search endpoint always returns the same data regardless of caller for KYM ≥1 marketplaces. RLS only matters for the auth-gated console (Stories 90.7+). Use Vercel runtime cache (`vercel-plugin:runtime-cache`) with `cacheTag(['marketplace-search'])` so a webhook from Epic 87 (KYM tier change) or Epic 86 (visibility change) can call `updateTag('marketplace-search')` for instant bust.

## Dependencies

Epic 89 search endpoint, Stories 90.1–90.4.
