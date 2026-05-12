# Story 89.1: REST `GET /v1/marketplaces/:id/agents`

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Epic 86 (marketplaces.visibility), Epic 87 (KYM tier), Epic 70 (AgentCard schema)

---

Paginated agent listing scoped to a single marketplace. Cross-tenant readable when the marketplace `visibility=public` AND requester is an authenticated Sly tenant with KYM tier ≥1; otherwise tenant-scoped. Returns the same agent card shape used by Epic 70's A2A discovery so external consumers get one canonical schema.

```typescript
// GET /v1/marketplaces/:id/agents?cursor=&limit=50&kya=2&skill=code-review
// Response: { data: AgentCard[], pagination: { cursor, hasMore } }
```

## Acceptance

- [ ] Cursor pagination with stable ordering (kya_tier desc, score desc, id asc)
- [ ] Filters: `kya` (min tier), `skill`, `status=active`
- [ ] KYM gating: T0 marketplaces tenant-only; T1+ public marketplaces cross-tenant
- [ ] Response shape matches A2A AgentCard (Epic 70 — see `apps/api/src/routes/a2a.ts`)
- [ ] Rate-limited per requester (100 rpm) on cross-tenant reads
- [ ] Integration test for cross-tenant leak path

## Technical notes

Reuse the agent serializer from Epic 70's A2A discovery to keep schema parity. The `visibility` column on marketplaces (from Epic 86) is what gates cross-tenant reads.

## Dependencies

Epic 86 (marketplaces.visibility), Epic 87 (KYM tier), Epic 70 (AgentCard schema)
