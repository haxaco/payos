# Story 96.4: Paymaster-Sponsored x402 Settle

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Story 96.1, Story 96.2, Story 96.3

---

Wire ZeroDev paymasters into the x402 settle path. For agents on a kernel wallet, settlement calls (e.g. `transferWithAuthorization` to the x402 facilitator) are sponsored — the kernel doesn't need ETH. Sly platform funds a paymaster contract and bills back to the tenant (96.5).

## Acceptance

- [ ] x402 settle for a kernel-wallet agent succeeds with zero ETH in the agent wallet
- [ ] Paymaster scope locked to x402-relevant call selectors only (no general gas sponsorship)
- [ ] Paymaster funded from a Sly-platform-owned source with documented top-up cadence
- [ ] Gas cost per settle is recorded against the tenant (input for 96.5)
- [ ] CDP-wallet agents are unaffected (no regression in existing settlement flow)

## Technical notes

Reference `apps/api/src/services/settlement-batcher.ts` for current settle flow. Paymaster validation logic on-chain must check the call selector + recipient so a compromised session key can't drain the paymaster. Set a per-tenant daily gas cap as a circuit breaker.

## Dependencies

Story 96.1, Story 96.2, Story 96.3.
