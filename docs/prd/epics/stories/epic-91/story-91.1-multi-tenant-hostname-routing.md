# Story 91.1: Multi-Tenant Agentbazaar Deploy — Route by Hostname

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 13
**Priority:** P0
**Dependencies:** Epic 86 (marketplaces table + `runtime_config`), Epic 90 Story 90.8 (edit-page writes that trigger cache busts)

---

Refactor the agentbazaar runtime (currently `haxaco/sly-marketplaces`, deployed as a single global service against one fixed marketplace) into a multi-tenant Hono server where each marketplace is identified by the request hostname. One Railway deployment, one process, many marketplaces.

The runtime's request pipeline gains a new first-step middleware that resolves `req.headers.host` → `marketplace_id` via a cached lookup in the `marketplaces` table (or a `marketplace_domains` join table from Story 91.3). Every downstream handler — SSE viewer, showcase route, scheduler hooks, settlement notarization — reads the marketplace from `c.get('marketplace')` rather than from a global env var.

```typescript
// agentbazaar/src/middleware/resolve-marketplace.ts
app.use('*', async (c, next) => {
  const host = c.req.header('host');
  const mkt = await marketplaceCache.byHostname(host);
  if (!mkt) return c.notFound();
  if (mkt.status === 'paused') return c.json({ error: 'paused' }, 503);
  c.set('marketplace', mkt);
  await next();
});
```

Per-marketplace runtime config (scenario template, agent pool, feature toggles) lives in `marketplaces.runtime_config` JSONB — read once at request time, cached for 60 seconds with tag-based invalidation when the operator saves changes from Epic 90's edit page.

## Acceptance

- [ ] Single Hono service serves at least 10 distinct marketplaces in staging, each at its own hostname
- [ ] Marketplace resolution cached (60s TTL) — measured p99 lookup < 5ms
- [ ] Unknown hostname returns 404 (not 500, not leak of another marketplace)
- [ ] Paused marketplaces return 503 with `Retry-After`
- [ ] Cache invalidates within 30s of a `marketplaces.runtime_config` update from Epic 90
- [ ] No global state leaks between marketplaces (all per-request state derived from `c.get('marketplace')`)

## Technical notes

This is the structural rewrite — touch nearly every handler in the agentbazaar repo. Audit the existing `apps/sim/src/server.ts` (referenced as the ancestor of this code) for any global singletons (especially the scheduler) and rework them to be marketplace-keyed. Use a `Map<marketplaceId, SchedulerInstance>` keyed by ID so each marketplace's scheduler runs independently. Tag-based cache invalidation pairs with Vercel runtime cache or a simple in-process LRU with pub/sub on Supabase Realtime.

## Dependencies

Epic 86 (marketplaces table + `runtime_config`), Epic 90 Story 90.8 (edit-page writes that trigger cache busts).
