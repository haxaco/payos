# Story 92.5: Tests — Tier Matching, Fallback, Reject

**Status:** Planned
**Epic:** [Epic 92 — Score-Gated x402 Endpoints](../../epic-92-score-gated-x402-endpoints.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 92.1, Story 92.2

---

Unit + integration coverage for the pricing service. Must include the edge cases that will bite us: missing score, score exactly at a threshold, `below_min` modes, malformed policy, and authenticated vs anonymous buyers.

## Acceptance

- [ ] Unit: tier matching is correct for boundary scores (e.g. score=900 matches the 900+ tier, not the 700+)
- [ ] Unit: malformed `pricing_policy` (non-array tiers, missing fields) falls back to `price_usdc` and logs a warning
- [ ] Unit: `below_min` modes (`reject` / `allow` / `tenfold`) all return correct shapes
- [ ] Integration: 402 challenge with policy applied returns the resolved price in payment_requirements
- [ ] Integration: anonymous buyer (no agent token) gets `fallback_price_usdc`

## Technical notes

Mock the composite-score reader in unit tests; use a seeded test agent with a known score in integration tests. Add a regression fixture for the case where the score reader throws — fallback must be deterministic.

## Dependencies

92.1, 92.2.
