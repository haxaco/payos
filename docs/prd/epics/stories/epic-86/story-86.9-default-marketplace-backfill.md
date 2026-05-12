# Story 86.9: Backfill Migration — Default Marketplace per Tenant

**Status:** Planned
**Linear:** SLY-548
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 86.1, Story 86.2

---

One-shot migration that creates a default marketplace (`slug = 'default'`, `name = '<tenant_name>'`, `vertical = NULL`, `visibility = 'private'`) for every tenant, then inserts `agent_marketplaces` rows linking every existing agent. Also backfills `x402_endpoints.marketplace_id` to the tenant's default marketplace. Idempotent: re-running is a no-op.

## Acceptance

- [ ] Every tenant ends up with exactly one default marketplace
- [ ] Every existing agent is a member of its tenant's default marketplace
- [ ] Every existing x402 endpoint's `marketplace_id` is set
- [ ] Re-running the migration is a no-op (idempotent guards via `ON CONFLICT DO NOTHING`)
- [ ] Chunked inserts (batch size 500) to avoid lock contention on large tenants

## Technical notes

Run on staging first against a clone of prod. The Risks section calls out lock contention — chunked transaction batches of 500 rows are the mitigation. Log progress (`X of Y tenants processed`) so production rollout is observable.

## Dependencies

86.1, 86.2.
