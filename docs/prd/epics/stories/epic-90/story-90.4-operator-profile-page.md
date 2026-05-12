# Story 90.4: Operator Profile Page

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 90.1

---

Page at `/operators/:tenantSlug` showing all public marketplaces operated by a single Sly tenant. Header has operator name, verified-operator badge (when KYM T2+ on any marketplace), total volume aggregated across their marketplaces, and a join date. Body lists each marketplace as a card (same component as Story 90.1).

Use case: a partner like "TravelHubs Inc." runs three marketplaces (Travel, Hotels, Activities) — this page is their canonical landing surface.

## Acceptance

- [ ] Lookup by `tenantSlug`; 404 if tenant has no public marketplaces
- [ ] Verified-operator badge requires at least one KYM T2+ marketplace
- [ ] Volume aggregation excludes private (visibility=private) marketplaces
- [ ] Listed marketplaces sorted by KYM tier desc, then 30-day volume desc

## Technical notes

Needs an Epic 89 endpoint `GET /v1/operators/:tenantSlug/marketplaces` — file a follow-up if not present. Reuse the marketplace card component from Story 90.1 verbatim — same affordance, just filtered to one operator.

## Dependencies

Story 90.1.
