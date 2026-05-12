# Story 90.8: Sly Console — Marketplace Edit Page

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Story 90.7, Epic 86 (CRUD), Epic 88 (mint endpoint)

---

Per-marketplace edit page at `/dashboard/marketplaces/:slug/edit`. Form covers every editable field on the `marketplaces` row from Epic 86: name, slug, vertical, description, branding (logo upload, accent color), visibility (public / unlisted / private), feature toggles. Below the basics, three management sections:

1. **Agents** — list current agents in the marketplace, add / remove buttons. "Add agent" opens a picker over the tenant's existing agents (from `/v1/agents` filtered by `marketplace_id IS NULL`).
2. **Endpoints** — link existing x402 endpoints to this marketplace. Picker over the tenant's x402 endpoints.
3. **On-chain mint** trigger (T2+ KYM only, after Story 90.9 verification completes) — calls Epic 88's `POST /v1/marketplaces/:id/mint`.

All edits go through `PATCH /v1/marketplaces/:id` from Epic 86. Form validation with Zod; optimistic update on save with rollback on error.

## Acceptance

- [ ] Form fields all editable, persist via PATCH
- [ ] Logo upload to Sly's blob store; URL stored in `marketplaces.branding.logoUrl`
- [ ] Visibility change triggers public-Explorer cache bust (calls Story 90.6's tag invalidation)
- [ ] Agent add/remove respects RLS — only the tenant's own agents shown
- [ ] On-chain mint button disabled until KYM tier ≥ 2 and `onchain_token_id IS NULL`
- [ ] Slug change is blocked once any agent or endpoint is linked (would break public URLs)

## Technical notes

Use `react-hook-form` + Zod resolver to match the existing pattern in `apps/web/src/app/dashboard/agents/[id]/page.tsx`. Color picker from the existing UI package — don't add a new dependency. Logo uploads go via a Vercel Blob endpoint (or whatever Sly's existing asset pipeline uses — check `apps/web/src/app/dashboard/settings/`).

## Dependencies

Story 90.7, Epic 86 (CRUD), Epic 88 (mint endpoint).
