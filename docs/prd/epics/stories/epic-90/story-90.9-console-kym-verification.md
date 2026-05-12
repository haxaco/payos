# Story 90.9: Sly Console — KYM Verification Flow

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 90.8, Epic 87 (KYM endpoints)

---

Integrate Epic 87's KYM verification UX into the marketplace edit page. A "Verify your marketplace" panel renders the current KYM tier as a badge, the next-tier requirements as a checklist, and a "Start verification" button. Clicking it walks the operator through Epic 87's tier-specific form (T1: simple declaration, T2: docs upload, T3: enterprise contact).

After submission, the panel polls Epic 87's `GET /v1/marketplaces/:id/kym/status` and updates with success / pending / rejected states. On success, the on-chain mint CTA from Story 90.8 becomes available.

## Acceptance

- [ ] Tier badge reflects current `marketplaces.kym_tier`
- [ ] Next-tier checklist shows which requirements are met / pending
- [ ] Form submission calls Epic 87's POST endpoint with correct payload
- [ ] Status updates poll on 5s interval; switch to SSE if Epic 87 supports it
- [ ] Rejected state shows reason and a "Retry" CTA

## Technical notes

Reuse Epic 73's verification UX patterns (`apps/web/src/app/dashboard/agent-tiers/`) for visual consistency. Don't reimplement document uploads — call into the same upload helper Epic 87 ships.

## Dependencies

Story 90.8, Epic 87 (KYM endpoints).
