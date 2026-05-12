# Story 90.7: Sly Console — Marketplaces List + Create Dialog

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Epic 86 (`POST /v1/marketplaces`)

---

Add a new top-level nav item "Marketplaces" inside the existing `apps/web/src/app/dashboard/` shell. The list page is tenant-scoped (only the authenticated tenant's marketplaces) and shows: status (draft / live / paused), KYM tier badge, today's volume, agent count, link to detail. A "Create new marketplace" CTA opens a modal dialog (parallel intercepting route `@modal/(.)new`) capturing the minimum required to call `POST /v1/marketplaces` from Epic 86: name, slug, vertical, visibility.

```
apps/web/src/app/dashboard/marketplaces/
├── page.tsx                    # List page (tenant-scoped)
├── @modal/
│   ├── default.tsx             # Returns null
│   └── (.)new/page.tsx         # Create dialog as intercepting modal
├── new/page.tsx                # Full-page fallback for /marketplaces/new
└── _components/
    ├── marketplace-row.tsx
    └── create-form.tsx
```

The list uses the existing dashboard data-fetching pattern (`useApi` for client-side hooks or async Server Component with `cookies()` for the tenant JWT). On successful create, push to `/dashboard/marketplaces/:slug/edit` (Story 90.8).

## Acceptance

- [ ] Nav item "Marketplaces" visible to all authenticated users (gated by role to follow)
- [ ] List query filters by `ctx.tenantId` — no cross-tenant leak even with broken RLS
- [ ] Create dialog validates slug uniqueness within tenant client-side and server-side
- [ ] Successful create redirects to edit page
- [ ] Empty state shows "Create your first marketplace" CTA

## Technical notes

Modal pattern is parallel + intercepting routes (Next.js App Router idiom). Clicking the CTA opens the modal at `/dashboard/marketplaces/new` overlaid on the list; navigating directly to that URL renders the full-page version. Use `router.back()` to close, not `router.push('/dashboard/marketplaces')`, so the back button works.

## Dependencies

Epic 86 (`POST /v1/marketplaces`).
