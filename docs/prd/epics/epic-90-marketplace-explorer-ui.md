# Epic 90: Marketplace Explorer UI

**Status:** Planned
**Phase:** TBD (Marketplaces Platform)
**Priority:** P0
**Dependencies:** Epic 86 (entities), Epic 87 (KYM), Epic 88 (on-chain), Epic 89 (discovery API)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md)
**Created:** May 2026

---

## Summary

Public web UI for the cross-marketplace directory. Two surfaces:

1. **Public Explorer** at `getsly.ai/marketplaces` (or similar) — anonymous-readable directory of every KYM-tiered marketplace, filterable by vertical / KYM tier / volume / agent count, with identity-first cross-marketplace search.
2. **Owner Dashboard** at `app.getsly.ai/marketplaces` (inside `apps/web`) — auth-gated management surface for tenants to create / configure / monitor their own marketplaces.

This is what makes the platform feel like a platform — Vercel Marketplace, Stripe Apps, AWS Marketplace analogs for the agentic-commerce space.

## Motivation

After Epics 86–89, Sly has marketplaces with KYM tiers, on-chain proof, and discovery APIs. But none of that is browsable. A founder evaluating Sly, a partner sketching an integration, or an agent operator looking for distribution can't see what's already running.

The Explorer is also a strategic surface — it's the page Sly would point press to ("here's the agent commerce graph"), the page partners reference ("our marketplace lives here"), and the page Claude/Cursor users open when they want to understand "what's the agent economy look like today?"

## Direction confirmed with the user

Two surfaces, separation of concerns:

- **Public surface** is the marketing-grade directory. Anyone can browse. SEO-relevant.
- **Auth-gated dashboard** is the operator console. Configure your marketplace, see your stats, trigger verification, manage agents.

Identity-first cross-marketplace search is the headline feature: "show me agent #247 across all marketplaces" — which proves identity portability visually.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| Frontend consumes Epic 89 endpoints | ❌ No | - | - | Pure UI |
| Sitemap + OG metadata generation | ❌ No | - | - | Server-side |
| Public agent search (used by Explorer) | ✅ Yes | `sly.search` | P1 | Reuses existing Epic 70 search |

**SDK Stories Required:** None new (UI consumes existing SDK from Epic 89).

## Scope

**In scope (v1):**

### Public Explorer (`getsly.ai/marketplaces` or `apps/explorer`)

1. **Directory homepage**:
   - Hero with platform stat ("X marketplaces, Y agents, $Z lifetime volume")
   - Filter sidebar: vertical, KYM tier, has-on-chain-mint, sort (volume / age / score)
   - Marketplace cards: name, vertical, KYM badge, agent count, 30-day volume, on-chain badge
   - Pagination

2. **Marketplace detail page** (`/marketplaces/:slug`):
   - Header: branding, KYM tier badge, on-chain link to MarketplaceRegistry NFT
   - Stats grid: volume, agents, dispute rate, avg agent score
   - Agent table with KYA tier + score
   - Endpoint catalog (x402 + ACP + UCP)
   - Recent activity feed (read-only, last 24h)
   - Operator section (linked to operator's Sly tenant page if public)

3. **Cross-marketplace identity search** (`/agents/:erc8004TokenId`):
   - Single-page view of one agent's identity across all marketplaces
   - "agent #247: active in Travel, Compute, Services Marketplaces"
   - Composite identity score
   - Marketplace-by-marketplace stats (volume in each, avg rating, etc.)
   - This is **the visual proof of agentic identity portability**.

4. **Operator profile page** (`/operators/:tenantSlug`):
   - All of an operator's public marketplaces
   - Total volume across them
   - Verified-operator badge

5. **Public-only endpoints**:
   - Anonymous browsing (no auth required)
   - Anonymous search (rate-limited)
   - SEO metadata (OG tags, sitemap, structured-data JSON-LD)

### Owner Dashboard (`apps/web` extension)

1. **Marketplaces list page** (in existing dashboard nav):
   - Tenant-scoped — shows only the user's marketplaces
   - "Create new marketplace" CTA
   - Per-marketplace card with status, KYM tier, today's stats, link to drill-down

2. **Marketplace edit page**:
   - Form covering all `marketplaces` row fields (name, slug, vertical, branding, visibility)
   - KYM verification flow (form → upload docs → status indicator)
   - On-chain mint trigger (T2+ only, after KYM verified)
   - Agent management (add / remove / list)
   - Endpoint management (link existing x402 endpoints to this marketplace)

3. **Marketplace settings**:
   - Custom domain configuration (Epic 91 dependency for managed runtime)
   - Federation settings (allowlist peer marketplaces — Phase 2)
   - Webhook URLs

4. **Live activity dashboard** (per marketplace):
   - Real-time SSE feed (reuses `apps/api/src/routes/round-viewer.ts` infrastructure)
   - Settlements panel (mirrors agentbazaar viewer)
   - Health metrics

**Out of scope (deferred):**

- Public marketplace reviews / ratings (consumer-style)
- Operator-to-operator messaging
- Full Stripe-Apps-style marketplace listing pages with screenshots / changelogs
- Subscription billing UI (Epic 91 covers managed runtime billing)
- Mobile app
- Internationalization (English-only v1)

## Stories

Each story spec lives in its own file at [`./stories/epic-90/`](./stories/epic-90/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: Public Explorer — 36 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [90.1](./stories/epic-90/story-90.1-explorer-scaffold-directory.md) | Public Explorer Scaffold + Directory Homepage | 8 | P0 | Planned |
| [90.2](./stories/epic-90/story-90.2-marketplace-detail-page.md) | Marketplace Detail Page | 5 | P0 | Planned |
| [90.3](./stories/epic-90/story-90.3-agent-identity-page.md) | Cross-Marketplace Agent Identity Page | 8 | P0 | Planned |
| [90.4](./stories/epic-90/story-90.4-operator-profile-page.md) | Operator Profile Page | 5 | P1 | Planned |
| [90.5](./stories/epic-90/story-90.5-seo-sitemap-og-jsonld.md) | SEO — Sitemap, OG Tags, JSON-LD | 5 | P1 | Planned |
| [90.6](./stories/epic-90/story-90.6-anonymous-rate-limit-cache.md) | Anonymous Search Rate-Limiting + Caching | 5 | P1 | Planned |

### Phase 2: Sly Console (Auth-Gated Dashboard) — 26 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [90.7](./stories/epic-90/story-90.7-console-list-create.md) | Sly Console — Marketplaces List + Create Dialog | 8 | P0 | Planned |
| [90.8](./stories/epic-90/story-90.8-console-marketplace-edit.md) | Sly Console — Marketplace Edit Page | 8 | P0 | Planned |
| [90.9](./stories/epic-90/story-90.9-console-kym-verification.md) | Sly Console — KYM Verification Flow | 5 | P1 | Planned |
| [90.10](./stories/epic-90/story-90.10-console-live-activity.md) | Sly Console — Live Activity Dashboard Per Marketplace | 5 | P1 | Planned |

### Phase 3: Quality + Documentation — 8 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [90.11](./stories/epic-90/story-90.11-tests-rls-ranking-permissions.md) | Tests — Anonymous RLS, Search Ranking, Permission Gates | 5 | P0 | Planned |
| [90.12](./stories/epic-90/story-90.12-docs-urls-dashboard-guide.md) | Documentation — URL Conventions, Dashboard Guide | 3 | P2 | Planned |

**Total:** ~70 points across 12 stories.

## Definition of Done

- [ ] Public Explorer browseable end-to-end against staging marketplaces
- [ ] Cross-marketplace agent identity page renders correctly for a multi-marketplace agent (the marquee identity demo)
- [ ] Sly Console Marketplaces tab functional: create, edit, KYM-verify, mint-on-chain, manage agents
- [ ] Live activity SSE works per marketplace
- [ ] SEO: sitemap submitted, OG tags render in Twitter/LinkedIn/Discord previews
- [ ] All Epic 89 discovery endpoints consumed by the UI
- [ ] Anonymous-vs-auth permission boundary correct (no private data leak in public Explorer)
- [ ] Performance: Explorer homepage < 2s LCP at p95

## Risks

- **Public-data RLS bugs.** Anonymous browsing of multiple tenants' marketplaces is a new threat surface. Heavy RLS testing required.
- **Search relevance.** Cross-marketplace ranking is hard. Start with simple weighted score (KYM tier × volume × recency); iterate based on user feedback.
- **Custom domains for managed marketplaces** (Epic 91 dependency) need DNS+TLS automation. May slip Custom Domain UI to Epic 91.

## References

- Epic 70 — Universal Agent Discovery (search infrastructure)
- Epic 89 — discovery API (data source)
- `apps/web` existing dashboard structure
- `apps/api/src/routes/round-viewer.ts` — SSE pattern for live activity
- Vercel / Stripe / AWS marketplace UIs as design references
