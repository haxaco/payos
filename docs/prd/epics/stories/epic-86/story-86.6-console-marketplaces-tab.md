# Story 86.6: Sly Console — Marketplaces Tab

**Status:** Planned
**Linear:** SLY-543
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 8
**Priority:** P1
**Dependencies:** Story 86.3, Story 86.4

---

Build the Marketplaces tab in `apps/web` (Next.js, port 3000 — NOT `payos-ui`). Lives at `apps/web/src/app/dashboard/marketplaces/page.tsx`. Shows a table of the tenant's marketplaces with slug, vertical, visibility badge, agent count, status. Create dialog (`+ New marketplace`), edit dialog (clicking a row), and a per-marketplace detail view at `/dashboard/marketplaces/[id]` with the agent list and branding preview.

## Acceptance

- [ ] List page shows all tenant marketplaces with usable filters
- [ ] Create dialog enforces slug regex client-side with helpful error
- [ ] Edit dialog updates branding (logo_url, accent_color) and visibility
- [ ] Detail page shows agent list with add/remove (admins only)
- [ ] Owner role can edit; member/viewer roles see read-only
- [ ] Loading + error states match existing dashboard patterns

## Technical notes

Use `useApi` / `useApiMutation` from `apps/web/src/hooks/`. Branding accent_color should be a hex picker — existing UI library probably already has one (`packages/ui`). Hide the tab entirely for tenants on the legacy single-marketplace plan via a feature flag.

## Dependencies

86.3, 86.4.
