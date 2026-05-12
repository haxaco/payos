# Story 89.3: REST `GET /v1/marketplaces/:id/activity`

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 89.1

---

Recent activity feed for a marketplace: settlements, milestone completions, dispute opens. Window-bounded (last 24h by default, configurable up to 7 days). Used by the Sly Explorer (Epic 90) for the marketplace overview.

## Acceptance

- [ ] `?since=24h` query param (max 7 days)
- [ ] Event types: `settlement.completed`, `milestone.completed`, `dispute.opened`
- [ ] Tenant filter unless marketplace is public + requester is KYM-tiered
- [ ] Backed by existing `settlements` + `disputes` tables; no new tables
- [ ] Cursor pagination by `event_at desc`

## Technical notes

No new tables — the feed is built by unioning rows from the existing `settlements` and `disputes` tables, filtered by `marketplace_id` and the `since` window. Uses the same shared KYM-gating helper from Story 89.1 so cross-tenant readability matches the rest of the discovery surface. The 7-day cap on `?since` is a guard against expensive scans; the Explorer (Epic 90) is the primary consumer.

## Dependencies

Story 89.1
