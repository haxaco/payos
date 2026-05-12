# Story 96.8: End-to-End Joint Demo

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 96.1, Story 96.2, Story 96.3, Story 96.4, Story 96.7

---

A single live demo scenario in `apps/marketplace-sim` that exercises the whole stack: create a kernel-wallet agent, mint ERC-8004 NFT into the kernel, issue an Ed25519 session, hit a real x402 endpoint, paymaster sponsors the settle, agent never holds ETH, identity badge renders the kernel variant in the round viewer. Recorded as the joint launch artifact with ZeroDev.

## Acceptance

- [ ] Scenario runs cleanly end-to-end on Base Sepolia
- [ ] Round viewer renders the kernel-variant identity badge per settle
- [ ] Demo script + recording committed to `docs/demos/`
- [ ] No manual ETH funding step anywhere in the flow
- [ ] Reproducible by an external developer in under 30 minutes

## Technical notes

Build the demo as a marketplace-sim scenario block (mirror existing patterns under `apps/marketplace-sim/src/scenarios/blocks/`) so it runs deterministically against the sandbox. The "no manual ETH funding" acceptance is the critical signal — any step that needs operator intervention breaks the joint-launch narrative. Capture the recording in 1080p with a clean terminal theme; it becomes the embeddable artifact for the co-marketing post (96.9).

## Dependencies

Story 96.1, Story 96.2, Story 96.3, Story 96.4, Story 96.7.
