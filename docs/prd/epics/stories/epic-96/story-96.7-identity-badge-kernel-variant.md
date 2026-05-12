# Story 96.7: Identity Badge — Kernel-Account Variant

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 96.1; Epic 94 (Identity Badge SDK)

---

Extend the Identity Badge SDK (Epic 94) with a kernel-aware visual: show the kernel address (truncated), a small ZeroDev brand mark, and a link to the kernel on BaseScan. Reinforces the "your wallet IS your identity" demo punchline.

## Acceptance

- [ ] Badge renders a "kernel" indicator when the agent's `wallet_provider === 'zerodev'`
- [ ] ZeroDev brand mark used per partner brand guidelines (request asset pack)
- [ ] Kernel address links to BaseScan (Sepolia for sandbox, mainnet for prod)
- [ ] Works in all three variants (compact / full / card)
- [ ] Public profile endpoint (Epic 94 Story 94.1) exposes `wallet_provider` + `kernel_address`

## Technical notes

The badge SDK already has variant-switching scaffolding from Epic 94 — extend rather than fork. Request a ZeroDev brand asset pack early (logo SVG, color tokens, usage guidelines) since partner co-branding is contractually gated. The BaseScan URL prefix should be derived from `chainId` so the same component works for Sepolia (sandbox) and mainnet (prod) without hardcoding.

## Dependencies

Story 96.1; Epic 94 (Identity Badge SDK).
