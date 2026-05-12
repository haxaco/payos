# Story 86.2: Migration — `marketplace_id` Column on `x402_endpoints`

**Status:** Planned
**Linear:** SLY-539
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 86.1

---

Add a nullable `marketplace_id UUID REFERENCES marketplaces(id)` to `x402_endpoints`. Nullable on purpose: existing endpoints remain unscoped until backfill (Story 86.9) assigns them. Index for the discovery path. No data movement in this story — just the column.

## Acceptance

- [ ] Migration adds `marketplace_id` (nullable, FK with ON DELETE SET NULL)
- [ ] Index `idx_x402_endpoints_marketplace` on `(marketplace_id) WHERE marketplace_id IS NOT NULL`
- [ ] Existing endpoint creation paths continue to work without setting the field
- [ ] RLS policy on `x402_endpoints` updated to allow marketplace-membership-based reads if `marketplace.visibility = 'public'`

## Technical notes

Do NOT touch `x402_endpoints` insert/update logic in this story — leave the column orphan-friendly. Story 86.3 wires the REST layer to optionally set it; Story 86.9 backfills.

## Dependencies

86.1.
