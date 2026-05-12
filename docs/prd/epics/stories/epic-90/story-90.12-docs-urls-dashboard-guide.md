# Story 90.12: Documentation — URL Conventions, Dashboard Guide

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 3
**Priority:** P2
**Dependencies:** Stories 90.1–90.11

---

Write three docs:

1. **Explorer URL conventions** (`docs/guides/marketplaces/explorer-urls.md`) — canonical URLs for every public surface: marketplaces, agents, operators. SEO-relevant; partners reference this when linking.
2. **Operator dashboard guide** (`docs/guides/onboarding/marketplace-operator.md`) — step-by-step: create a marketplace, brand it, verify KYM tier, mint on-chain, add agents, link endpoints, monitor activity. Screenshots from staging.
3. **Public-data + RLS rules** (`docs/guides/development/marketplace-public-data.md`) — engineering doc for what's anonymously-readable and how to extend the public surface without introducing leaks.

## Acceptance

- [ ] All three docs written and linked from `docs/prd/MARKETPLACES_STRATEGY.md`
- [ ] Operator guide screenshotted against staging or production
- [ ] URL conventions doc cross-linked from the existing dashboard onboarding flow
- [ ] PR template updated to require RLS audit when changes touch public marketplace surfaces

## Technical notes

Docs land in three different directories by audience: `docs/guides/marketplaces/` for partner-facing URL canonicals, `docs/guides/onboarding/` for the operator step-by-step (with staging screenshots so the visuals match production chrome), and `docs/guides/development/` for the internal engineering guide on RLS boundaries. Cross-link from `docs/prd/MARKETPLACES_STRATEGY.md` so the docs are discoverable from the strategy hub. Update the PR template alongside the doc writes so future PRs touching public surfaces flag the RLS-audit requirement automatically.

## Dependencies

Stories 90.1–90.11.
