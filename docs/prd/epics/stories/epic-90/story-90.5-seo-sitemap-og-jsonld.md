# Story 90.5: SEO — Sitemap, OG Tags, JSON-LD

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Stories 90.2, 90.3, 90.4

---

Make the Explorer first-class for discovery via web search and link previews. Three pieces:

1. **Sitemap** at `/sitemap.xml` (via `apps/web/src/app/sitemap.ts`) listing every public marketplace detail page, every public operator page, and the identity page for top-N most-active agents. Regenerated daily.
2. **Open Graph + Twitter card tags** on every page via `generateMetadata`. The marketplace detail page renders an OG image via `next/og` showing marketplace name, KYM badge, vertical, and stats overlay on the operator's accent color.
3. **JSON-LD structured data** (`schema.org/Organization` for operator pages, custom `MarketplaceListing` schema for marketplace pages) embedded server-side so crawlers index marketplace metadata.

## Acceptance

- [ ] `sitemap.xml` validates and lists at least the three public surfaces above
- [ ] OG image renders correctly when pasted into Twitter, LinkedIn, Discord, Slack
- [ ] `robots.txt` allows crawling of `/marketplaces`, `/agents`, `/operators`; disallows `/dashboard`
- [ ] Structured data validates with Google's Rich Results Test
- [ ] Twitter card preview shows on `https://cards-dev.twitter.com/validator`

## Technical notes

Use Next.js 16's metadata API. The OG-image route lives at `apps/web/src/app/(public)/marketplaces/[slug]/opengraph-image.tsx` with `runtime = 'nodejs'` (`next/og` works on both runtimes but Node gives more font options). Sitemap is built dynamically (not static) — query the marketplaces table at request time, paginate via `generateSitemaps` if > 50K entries.

## Dependencies

Stories 90.2, 90.3, 90.4.
