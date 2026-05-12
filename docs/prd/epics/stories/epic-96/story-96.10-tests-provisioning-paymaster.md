# Story 96.10: Tests — Provisioning, Sessions, Paymaster

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 96.1, Story 96.2, Story 96.4, Story 96.5

---

Coverage for the trust-critical paths. The paymaster billing path especially — a bug here is a direct dollar leak.

## Acceptance

- [ ] Unit: kernel provisioning idempotent (same agent_id → same kernel address)
- [ ] Unit: session-key revocation propagates to ZeroDev
- [ ] Unit: paymaster gas accounting math is correct (gas_used × eth_price = billed USDC)
- [ ] Integration: end-to-end gasless settle against Base Sepolia
- [ ] Integration: per-tenant daily gas cap actually suspends sponsorship
- [ ] Regression: CDP-wallet agents continue to settle correctly

## Technical notes

Split unit vs integration along the same line as Epic 95 tests: pure functions (gas math, idempotency keys) at the unit tier; anything touching Base Sepolia or the ZeroDev SDK at the integration tier (gated on `INTEGRATION=true`). The CDP regression test is non-negotiable — the wallet-provider abstraction means both code paths share enough plumbing that a careless refactor in the ZeroDev path can silently break CDP. Mock the ETH price feed deterministically in unit tests so gas math is verifiable without network flake.

## Dependencies

Story 96.1, Story 96.2, Story 96.4, Story 96.5.
