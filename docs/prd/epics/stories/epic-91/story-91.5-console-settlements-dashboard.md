# Story 91.5: Sly Console — Marketplace Settlements Dashboard

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Epic 90 Story 90.10 (SSE hook), Epic 87 (settlement events)

---

Per-marketplace settlements dashboard inside `apps/web/src/app/dashboard/marketplaces/:slug/settlements`. Shows real-time settlement feed (SSE from `apps/api/src/routes/round-viewer.ts`, filtered by `marketplace_id`), running totals (today / this week / this month), and a downloadable CSV export.

Three panels:
1. **Live feed** — latest 50 settlements, streamed.
2. **Stats grid** — volume USDC, settlement count, average size, dispute count.
3. **Export** — CSV download for the visible date range.

## Acceptance

- [ ] SSE feed reconnects on drop with Last-Event-ID replay (Epic 72 pattern)
- [ ] Stats grid auto-refreshes every 30s
- [ ] CSV export covers up to 90 days; > 90 days requires the data-export pipeline (out of scope here)
- [ ] Page shows the standard auth-required redirect for non-tenant users
- [ ] Tenant from a different org cannot access via URL guessing — RLS enforced

## Technical notes

Reuses the SSE infra from Epic 90 Story 90.10 — both stories add panels to the same `/dashboard/marketplaces/:slug` route group, just at different subpaths. Coordinate so neither duplicates the SSE hook. Cross-check with Epic 65 (Operations Observability) for the metrics-source layer — this dashboard reads from the same per-tenant metrics aggregator.

## Dependencies

Epic 90 Story 90.10 (SSE hook), Epic 87 (settlement events).
