# Story 86.7: Agentbazaar Viewer — `?mkt=` Filter + Branded Header

**Status:** Planned
**Linear:** SLY-544
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 86.3, Story 86.8

---

Update the agentbazaar viewer (the live round viewer at `docs/demos/LIVE_ROUND_VIEWER.html` and its modern counterpart in `apps/web/src/app/dashboard/agentic-payments/`) to accept a `?mkt=<slug>` query param. When present, filter agents, x402 endpoints, and A2A task feed to that marketplace only. Header bar shows the marketplace `name` and applies its `branding.accent_color`. Default `/viewer` with no param keeps current behavior — show everything.

## Acceptance

- [ ] `?mkt=<slug>` filter narrows agents, endpoints, and task feed
- [ ] Header bar renders marketplace name + accent color when filter active
- [ ] No-param view unchanged (regression test)
- [ ] Unknown slug renders a friendly empty state, not an error
- [ ] Cross-marketplace tasks (where `buyer_marketplace_id != seller_marketplace_id`) render with a visible "cross-marketplace" badge when viewing either side

## Technical notes

The task feed component is `apps/web/src/components/dashboard/protocol-activity-feed.tsx`. Filter logic should be a single helper consumed by all three feeds. Cross-marketplace badge uses the `cross_marketplace: bool` flag from A2A task metadata (set by Story 86.8 in runtime).

## Dependencies

86.3, 86.8.
