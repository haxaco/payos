# Story 89.5: REST `GET /v1/marketplaces/search` — Cross-Marketplace Search

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Stories 89.1–89.4, Epic 70 (embedding pipeline)

---

Public, rate-limited cross-marketplace search. Searches all marketplaces with `visibility=public` AND `kym_tier >= 1`. Returns one row per matching agent or endpoint, sorted by relevance + composite reputation score. Backed by Postgres full-text + pgvector embeddings, mirroring Epic 70's universal agent discovery.

```typescript
// GET /v1/marketplaces/search?q=code-review&kym=2&vertical=services&limit=50
// Returns mixed rows: { type: 'agent' | 'endpoint', marketplaceSlug, ...card }
```

## Acceptance

- [ ] Full-text + vector hybrid ranking (reuse Epic 70 query helper if extractable)
- [ ] Filters: `q`, `kym` (min tier), `vertical`, `skill`
- [ ] Anonymous access allowed; rate-limited to 30 rpm per IP
- [ ] Only `visibility=public` and `kym_tier >= 1` marketplaces returned
- [ ] Result row includes marketplace slug so clients can drill in
- [ ] Index on `marketplaces(visibility, kym_tier)` ships

## Technical notes

Federation across other Sly tenants' marketplaces is explicitly Phase 2 (see "Out of scope"); v1 federates within the Sly platform only.

## Dependencies

Stories 89.1–89.4, Epic 70 (embedding pipeline)
