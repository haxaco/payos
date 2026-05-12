# Story 90.2: Marketplace Detail Page

**Status:** Planned
**Linear:** SLY-555
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 90.1, Epic 89 (per-marketplace endpoints), Epic 88 (on-chain badge)

---

Page at `/marketplaces/:slug` rendering a single marketplace's public profile. Header shows branding (logo, accent color, name, vertical, KYM tier badge, "verified on-chain" link to BaseScan for the MarketplaceRegistry NFT). Body has a stats grid (30-day volume, active agents, dispute rate, avg KYA score), an agent table with KYA tier + identity score sortable columns, an endpoint catalog grouping x402 / ACP / UCP endpoints, and a read-only recent activity feed (last 24h of settlements).

Data sources from Epic 89:
- `GET /v1/marketplaces/:id` — base profile
- `GET /v1/marketplaces/:id/stats` — stats grid
- `GET /v1/marketplaces/:id/agents` — agent table
- `GET /v1/marketplaces/:id/endpoints` — endpoint catalog
- `GET /v1/marketplaces/:id/activity` — feed

Operator section at the bottom links to `/operators/:tenantSlug` (Story 90.4) when the tenant is publicly listed.

## Acceptance

- [ ] Lookup by slug, not UUID, in the URL
- [ ] 404 for non-existent or KYM T0 (private) marketplaces — never leak existence
- [ ] On-chain badge deep-links to the explorer URL from Epic 89's `onChain.explorer`
- [ ] Agent table paginates and sorts client-side for first page, server-side for pagination
- [ ] Activity feed is static snapshot (live SSE is Story 90.10 dashboard, not public)

## Technical notes

Use `generateStaticParams` for the top ~100 marketplaces by volume so SSG covers the common case. Fall back to dynamic rendering for long tail. Render the activity feed list with `<time dateTime>` so SEO + accessibility tools read timestamps correctly.

## Dependencies

Story 90.1, Epic 89 (per-marketplace endpoints), Epic 88 (on-chain badge).
