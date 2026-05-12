# Story 90.10: Sly Console — Live Activity Dashboard Per Marketplace

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Stories 90.7–90.9, existing `round-viewer.ts` SSE infra

---

Per-marketplace live dashboard at `/dashboard/marketplaces/:slug` (the index page, not the edit subpath). Three panels:

1. **Settlements feed** — real-time SSE stream of new settlements. Reuses the SSE infrastructure in `apps/api/src/routes/round-viewer.ts` — extend it to accept a `marketplace_id` filter param so the viewer scopes to one marketplace.
2. **Health metrics** — uptime, error rate, dispute rate trend over last 24h.
3. **Top agents this hour** — ranked by volume, with KYA tier badges.

Reuse the existing dashboard charts from `apps/web/src/components/dashboard/` for consistent look. The settlements feed is a streamed list with virtualization (react-window) so it doesn't grow unbounded.

## Acceptance

- [ ] SSE reconnects automatically on disconnect (Last-Event-ID for replay)
- [ ] Filter by marketplace works server-side — clients can't see other tenants' settlements
- [ ] Health metrics auto-refresh every 30s
- [ ] Feed retains last 100 entries client-side; older entries garbage-collected
- [ ] Page handles "no activity yet" empty state gracefully

## Technical notes

Extend `apps/api/src/routes/round-viewer.ts` rather than building a new SSE endpoint — same auth, same RLS, same heartbeat pattern (Epic 72's 30s heartbeat). Use the existing `EventSource` hook from `apps/web/src/components/dashboard/protocol-activity-feed.tsx` if it's general enough; otherwise factor it into a shared hook.

## Dependencies

Stories 90.7–90.9, existing `round-viewer.ts` SSE infra.
