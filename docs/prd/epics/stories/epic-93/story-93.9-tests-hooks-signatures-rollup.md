# Story 93.9: Tests — Hooks, Signatures, Rollup

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 93.2, Story 93.3, Story 93.4, Story 93.5

---

Full coverage on the trust-critical paths.

## Acceptance

- [ ] Unit: canonicalization produces identical bytes regardless of insertion key order
- [ ] Unit: signature verification round-trip works; corrupted payload fails
- [ ] Unit: composite score reader produces deterministic output for a fixed receipt list
- [ ] Integration: each of the three hooks (A2A, x402, dispute) generates exactly one receipt per event
- [ ] Integration: daily rollup produces a merkle root; verifier accepts in-tree receipts and rejects forged ones

## Technical notes

Snapshot the canonical-bytes output for a few representative receipts and check it into the test fixtures so canonicalization regressions are obvious in code review.

## Dependencies

93.2, 93.3, 93.4, 93.5.
