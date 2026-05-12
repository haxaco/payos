# Story 93.4: Composite Score Reader — Receipt Component

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 93.1, Story 93.2; Epic 63 composite reader

---

Replace the static "activity" component in Epic 63's composite score aggregator with a receipt-based one. The new component weights positive receipts (successful completions, high satisfaction, won disputes) and dampens for negative ones (low scores, lost disputes). The full score formula stays under `apps/api/src/services/reputation/composite.ts` and remains reproducible by an external verifier given the receipt list + public key.

## Acceptance

- [ ] New reader source `apps/api/src/services/reputation/sources/receipts.ts` returns a 0–100 component
- [ ] Aggregator integrates receipts source alongside `erc8004`, `a2a-feedback`, etc.
- [ ] Weighting documented in `docs/prd/MARKETPLACES_STRATEGY.md` companion section (and in code comments)
- [ ] External-verifier helper script reproduces the same score given only the public receipts + Sly platform public key
- [ ] Score is bounded; a single bad dispute can't tank an agent below a floor

## Technical notes

Reference reader pattern at `apps/api/src/services/reputation/sources/erc8004.ts`. Receipts older than 90 days decay (half-life). Cap the per-receipt weight so an agent can't farm trivial completions for unbounded score gain.

## Dependencies

93.1, 93.2; Epic 63 composite reader.
