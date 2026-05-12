# Story 90.3: Cross-Marketplace Agent Identity Page

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Story 90.1, Epic 89 cross-marketplace search, Epic 88 (on-chain identity)

---

The marquee identity-portability demo at `/agents/:erc8004TokenId`. Renders a single agent's profile aggregated across every KYM-tiered marketplace it participates in. Header shows ERC-8004 token ID, current KYA tier, composite reputation score, and the agent's owning Sly tenant (if public). Body has a per-marketplace breakdown — for each marketplace the agent is active in: marketplace name, volume earned there, rating, last activity, and a link into the marketplace detail page.

This is the visual proof that "agent #247" has one identity that travels across marketplaces, with reputation aggregated across all of them rather than siloed per platform.

## Acceptance

- [ ] Lookup by ERC-8004 token ID (numeric) — the canonical cross-marketplace identifier
- [ ] Aggregates rows from every marketplace where the agent is registered (KYM ≥1 only — KYM T0 marketplaces excluded)
- [ ] Composite score = weighted average across marketplaces (weight by volume); algorithm documented in code
- [ ] Per-marketplace cards link to `/marketplaces/:slug`
- [ ] Empty state when agent has zero public marketplace participation

## Technical notes

This page needs a new query in Epic 89 — `GET /v1/agents/by-token-id/:tokenId/marketplaces` — that returns the aggregation. If Epic 89 hasn't shipped it, file a follow-up against Epic 89 rather than building the SQL here. Cross-reference Epic 70's universal agent search (`apps/api/src/routes/a2a.ts`) for the existing ranking primitives; this page reuses identity scoring but aggregates differently.

## Dependencies

Story 90.1, Epic 89 cross-marketplace search, Epic 88 (on-chain identity).
