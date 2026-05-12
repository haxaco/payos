# Story 95.8: Tests + Integration Coverage

**Status:** Planned
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 95.1, Story 95.2, Story 95.6, Story 95.7

---

Trust-critical paths get heavy test investment.

## Acceptance

- [ ] Unit: score-report signature round-trip works; corrupted payload fails
- [ ] Unit: credit-line recommendation function is deterministic for a fixed score
- [ ] Integration: credit application lifecycle (submitted → decided → audit logged)
- [ ] Integration: webhook delivery retries with backoff
- [ ] Integration: audit-log append-only RLS prevents tampering

## Technical notes

Cover both unit and integration tiers — the signing/canonicalization layer is unit-testable in isolation, but RLS append-only guarantees and webhook retry behavior require live Supabase + a real outbox runner. Mirror the test layout from Epic 93's signing tests (which share the canonicalization primitive). Seed deterministic score fixtures so the recommendation-tier table can be exercised across boundary values without flaky composite-score recomputation.

## Dependencies

Story 95.1, Story 95.2, Story 95.6, Story 95.7.
