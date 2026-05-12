# Story 88.11: Tests — Solidity Foundry, Service Retries, Gas-Bounded Cron

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 88.1, Story 88.3, Story 88.7

---

Full test pass across the stack. Foundry tests for the contract (already partially in 88.1 — this rounds out fuzz tests and invariant tests). Vitest integration tests for the service-level exponential backoff (mock RPC failures). Cron test that injects 100 mock marketplaces and asserts the gas cap halts iteration.

## Acceptance

- [ ] Foundry fuzz test on `mint` with arbitrary slug strings
- [ ] Foundry invariant test: `slugToTokenId` map always consistent with `marketplaces`
- [ ] Vitest: simulated RPC failure triggers backoff and eventual success
- [ ] Vitest: cron run with 100 mock marketplaces stops at gas cap
- [ ] CI: all tests run on every PR touching `services/marketplace-registry/` or `apps/contracts/`

## Technical notes

This story closes the gap between the per-layer tests added in 88.1, 88.3, and 88.7 with the cross-cutting suites that catch integration bugs. The Foundry invariant test on `slugToTokenId <-> marketplaces` consistency is the most important addition for audit readiness. CI scoping by changed paths (`services/marketplace-registry/`, `apps/contracts/`) keeps PR feedback fast without losing coverage on the slow Foundry suite.

## Dependencies

Story 88.1, Story 88.3, Story 88.7
