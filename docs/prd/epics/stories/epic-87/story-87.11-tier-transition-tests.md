# Story 87.11: Tests — Tier Transitions, Inheritance, Cross-Tenant RLS

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 87.3, Story 87.5, Story 87.6, Story 87.7

---

Integration tests covering: (a) all tier transition paths (T0→T1, T1→T2 via Persona mock, T2→T3 via admin, downgrade-to-suspended); (b) effective-tier inheritance across the 16-cell matrix from Story 87.5; (c) cross-tenant query gating — a T0 marketplace's listings are not visible to other tenants even if `visibility = 'public'`; (d) Persona webhook idempotency (replayed webhooks don't double-fire status updates).

## Acceptance

- [ ] Tier-transition tests cover all valid paths + invalid attempts (e.g. T0 → T3 direct rejected)
- [ ] Effective-tier matrix fully covered
- [ ] Cross-tenant gating test uses two tenants and asserts T0 marketplace invisible
- [ ] Webhook idempotency test sends the same payload twice and asserts no double-elevation
- [ ] Audit log assertions on every transition

## Technical notes

Tests live in `apps/api/tests/integration/kym.test.ts`. Share fixtures with Epic 86.10's marketplace tests to avoid duplicating tenant/marketplace setup.

## Dependencies

87.3, 87.5, 87.6, 87.7.
