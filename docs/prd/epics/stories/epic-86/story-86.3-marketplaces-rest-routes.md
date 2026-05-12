# Story 86.3: REST Routes — `/v1/marketplaces/*`

**Status:** Planned
**Linear:** SLY-540
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Story 86.1, Story 86.2

---

Implement the seven endpoints in `apps/api/src/routes/marketplaces.ts`, mounted from `apps/api/src/app.ts`. All routes tenant-scope via `c.get('ctx').tenantId` except the public-listing path. Validate inputs with Zod (slug regex, vertical enum, visibility enum). `POST` returns 201 with the full record; `PATCH` is idempotent; `DELETE` on agent membership is a soft no-op if the row doesn't exist.

Membership endpoints (`POST /v1/marketplaces/:id/agents`, `DELETE /v1/marketplaces/:id/agents/:agentId`, `GET /v1/marketplaces/:id/agents`) enforce that the agent belongs to the same tenant as the marketplace before linking.

## Acceptance

- [ ] All seven endpoints from the Scope section land
- [ ] Zod schemas reject invalid slugs, unknown verticals, malformed branding JSON
- [ ] `GET /v1/marketplaces?visibility=public` returns cross-tenant public marketplaces without leaking private rows
- [ ] Agent-membership endpoints reject cross-tenant agent IDs with 403
- [ ] Integration tests cover happy path + RLS edge cases

## Technical notes

Mount before the catch-all auth in `app.ts:117-133`. Marketplace-membership writes should `logAudit` with `actor_type` from the request context so we can attribute who added/removed agents. The list endpoint defaults to `visibility = any` for the calling tenant, but only `public` cross-tenant — make this asymmetry explicit in the route handler with a comment.

## Dependencies

86.1, 86.2.
