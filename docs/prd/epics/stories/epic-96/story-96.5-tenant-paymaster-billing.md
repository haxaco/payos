# Story 96.5: Tenant-Level Paymaster Billing

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 96.4; Epic 65 (observability / metering pattern)

---

The whole point of gasless UX is that agents don't pay gas — but somebody does. Each paymaster-sponsored call gets billed back to the tenant (the operator) at cost + margin, surfaced in Sly Console as a usage line item. Without this, the paymaster gas bill is unbounded.

## Acceptance

- [ ] Each sponsored settle produces a billing event with gas_used + USDC equivalent
- [ ] Sly Console renders "ZeroDev paymaster gas: $X this month" per tenant
- [ ] Per-tenant daily / monthly gas budget configurable; exceeding it suspends sponsorship
- [ ] Bill-back rate documented and tunable
- [ ] Anomalous gas spikes alert (e.g. >2× rolling 7d average)

## Technical notes

Reuse the existing usage / observability surfaces (Epic 65) where possible — paymaster gas is just another metered resource. The margin is a business decision; ship with `0%` and a config knob.

## Dependencies

Story 96.4; Epic 65 (observability / metering pattern).
