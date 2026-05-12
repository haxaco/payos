# Story 89.10: Cache Layer — 5-min Card TTL, Configurable REST TTL

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 89.6, Story 89.9

---

Two-layer caching: edge cache for the `/.well-known/sly-marketplace.json` Card (5-min TTL, busted by 89.9 webhook), and per-route server-side caching for the REST discovery endpoints with configurable TTL via env var. Card hit ratio target: >90% in staging.

## Acceptance

- [ ] Card responses set `Cache-Control: public, max-age=300`
- [ ] CDN configured (Cloudflare or Vercel edge) to honor TTL
- [ ] REST endpoint TTLs configurable: `MARKETPLACE_STATS_CACHE_TTL`, etc.
- [ ] Cache-bust on `marketplace.discovery.updated` webhook
- [ ] Staging metric dashboard tracks Card hit ratio

## Technical notes

Two-layer design: edge cache for the public Card (CDN-honored `Cache-Control: public, max-age=300`) and per-route server-side cache for the REST discovery endpoints with env-configurable TTLs (`MARKETPLACE_STATS_CACHE_TTL`, etc.). The `marketplace.discovery.updated` webhook from Story 89.9 drives a CDN-invalidation worker so updates propagate within seconds instead of waiting out the TTL. The >90% Card hit ratio target in staging is the primary signal that the layer is doing its job.

## Dependencies

Story 89.6, Story 89.9
