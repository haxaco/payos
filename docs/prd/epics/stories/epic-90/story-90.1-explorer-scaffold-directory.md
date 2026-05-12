# Story 90.1: Public Explorer Scaffold + Directory Homepage

**Status:** Planned
**Linear:** SLY-549
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Epic 89 (`GET /v1/marketplaces/search`)

---

Stand up the public-facing Explorer inside `apps/web` under a `(public)` route group so anonymous visitors hit `getsly.ai/marketplaces` without auth. Build the directory homepage: hero with live platform stats, a filter sidebar (vertical, KYM tier, has-on-chain-mint, sort), and a paginated grid of marketplace cards. Data comes from Epic 89's `GET /v1/marketplaces/search` — anonymous-readable, rate-limited per IP.

```
apps/web/src/app/(public)/marketplaces/
├── layout.tsx          # Public layout (no auth, distinct chrome)
├── page.tsx            # Directory homepage — Server Component
├── _components/
│   ├── filter-sidebar.tsx
│   ├── marketplace-card.tsx
│   └── stats-hero.tsx
└── loading.tsx
```

Render as Server Components with `async` data fetching against the Epic 89 API. Filter state lives in URL search params (so deep-links share). Card components reuse design tokens from `apps/web/src/components` — same fonts, spacing, and dark-mode behavior as the auth-gated dashboard.

## Acceptance

- [ ] `/marketplaces` route renders anonymously with no JWT
- [ ] Filters update URL search params; deep-links restore filter state on reload
- [ ] Marketplace cards show name, vertical, KYM badge, agent count, 30-day volume, on-chain badge
- [ ] Pagination via `?page=N&limit=20`; cursor or offset both acceptable
- [ ] LCP < 2s at p95 on the homepage (cached at the edge)

## Technical notes

Use Next.js App Router Server Components — no `'use client'` on the page itself, only on the filter sidebar that needs interactivity. Cache the search response with `cacheLife('minutes')` (Next.js 16 cache components) keyed on the search params. Layout is separate from `apps/web/src/app/dashboard/layout.tsx` so the public surface has no sidebar / no auth-required UI.

## Dependencies

Epic 89 (`GET /v1/marketplaces/search`).
