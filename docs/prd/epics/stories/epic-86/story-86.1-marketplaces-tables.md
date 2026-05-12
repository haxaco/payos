# Story 86.1: Migration — `marketplaces` + `agent_marketplaces` Tables

**Status:** Planned
**Linear:** SLY-538
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 5
**Priority:** P0
**Dependencies:** None

---

Ship the canonical schema from the Scope section: `marketplaces` (tenant-owned, slug-unique-within-tenant+environment, visibility + status lifecycle) and `agent_marketplaces` (many-to-many membership join). Add RLS policies so tenants only see their own rows, plus a public-read carve-out for `visibility = 'public'`. Indexes on `(tenant_id, slug, environment)`, `(visibility)` for the discovery path, and `(marketplace_id)` on the join table.

```sql
-- agent_marketplaces additionally needs:
CREATE INDEX idx_agent_marketplaces_agent ON agent_marketplaces(agent_id);
CREATE INDEX idx_agent_marketplaces_marketplace ON agent_marketplaces(marketplace_id);
CREATE INDEX idx_marketplaces_visibility ON marketplaces(visibility) WHERE visibility = 'public';
```

## Acceptance

- [ ] Migration file in `apps/api/supabase/migrations/` following `YYYYMMDD_description.sql` convention
- [ ] RLS policies pass `pnpm --filter @sly/api check:rls`
- [ ] Slug constraint enforces `^[a-z0-9-]+$` (Postgres CHECK constraint)
- [ ] Unique key `(tenant_id, slug, environment)` rejects duplicates
- [ ] Public-read policy verified to NOT leak private marketplaces in cross-tenant queries

## Technical notes

RLS for `visibility = 'public'` rows must be a separate SELECT policy from the tenant-scoped one — Postgres OR-combines policies, so a single policy with an OR clause works but the two-policy form is easier to audit. Keep the public-read policy in its own migration block with a comment so future cross-tenant features (Epic 89) can extend it without surprises.

## Dependencies

None.
