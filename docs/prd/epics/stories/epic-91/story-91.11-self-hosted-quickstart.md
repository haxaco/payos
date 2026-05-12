# Story 91.11: Self-Hosted Quickstart Docs + SDK Examples

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 91.12 (SDK module must exist before docs reference it)

---

Flip the `haxaco/sly-marketplaces` repo from private back to public when this story ships — that's the explicit success criterion. Then write the self-hosted onboarding path:

1. **README** in the agentbazaar repo — clone, install, set env vars (`SLY_API_KEY`, `SLY_TENANT_ID`, etc.), run `pnpm dev`, point to your marketplace.
2. **Quickstart doc** in `docs/guides/onboarding/marketplace-self-hosted.md` — same content but cross-linked from `getsly.ai` and the managed-runtime CTA ("prefer self-hosted? → here's how").
3. **Reference SDK example** — TypeScript snippet showing how a self-hosted runtime calls the Sly trust layer for KYA verification, KYM verification, settlement notarization, and reputation queries.

## Acceptance

- [ ] `haxaco/sly-marketplaces` repo is public on GitHub
- [ ] README runs cleanly from a fresh clone on a developer machine (one developer outside the team verifies)
- [ ] Quickstart references `@sly_ai/sdk` not internal package paths
- [ ] Example code is exact-paste-runnable, not pseudocode
- [ ] Pricing implication documented: self-hosted pays settlement bps + per-agent overage, no tier subscription

## Technical notes

Audit the repo before flipping public — strip any internal docs, credentials, partner names. Ensure CI on the repo runs without internal secrets. The README should be opinionated about deployment (suggested: Railway with Postgres add-on — mirror Epic 67's pattern).

## Dependencies

Story 91.12 (SDK module must exist before docs reference it).
