# Story 86.10: Tests — RLS Isolation, Multi-Marketplace Visibility, Slug Uniqueness

**Status:** Planned
**Linear:** SLY-553
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 5
**Priority:** P0
**Dependencies:** All prior stories in this epic

---

Integration test suite covering: (a) cross-tenant RLS — tenant A cannot read tenant B's private marketplaces, but can read public ones; (b) multi-marketplace agent visibility — same agent ID listed in two marketplaces appears in both viewer feeds; (c) slug uniqueness — duplicate slug within same tenant+environment rejected, same slug across tenants allowed; (d) public-read carve-out — `?visibility=public` lists across tenants without leaking private rows; (e) backfill idempotency.

## Acceptance

- [ ] All five test categories pass under `INTEGRATION=true pnpm test:integration`
- [ ] Cross-tenant read tests use two distinct test tenants
- [ ] Multi-marketplace test confirms agent appears in both marketplace member lists AND both viewer filters
- [ ] Slug-uniqueness tests cover same-tenant collision, same-environment collision, and cross-environment same-slug (should be allowed)
- [ ] Backfill test runs migration twice and asserts row count unchanged second time

## Technical notes

Tests live in `apps/api/tests/integration/marketplaces.test.ts`. Reuse the test-tenant helpers from existing integration tests. The multi-marketplace test is the proof-of-portability check called out in the DoD — make it explicit which assertion encodes that.

## Dependencies

All prior stories in this epic.
