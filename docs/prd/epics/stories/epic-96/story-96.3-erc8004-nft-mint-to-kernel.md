# Story 96.3: ERC-8004 NFT Mint to Kernel Address

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 96.1; Epic 63 reader (`apps/api/src/services/reputation/sources/erc8004.ts`)

---

When an agent on a ZeroDev kernel mints (or is reassigned) an ERC-8004 NFT, the NFT mints to the kernel account address (not to a placeholder EOA). Verify all existing ERC-8004 read paths transparently work because ERC-8004 only cares about the holding address — confirm by running the existing composite score reader against a kernel-held NFT.

## Acceptance

- [ ] NFT mint flow accepts a kernel address as recipient
- [ ] Existing `getCompositeScore()` reader returns identical results for kernel-held vs EOA-held NFTs
- [ ] Agent inspector shows the kernel address (not the master signer) as the "wallet"
- [ ] Migration plan documented for upgrading existing CDP-wallet agents to ZeroDev (deferred to a future epic, but document the path)

## Technical notes

The ERC-8004 contract pattern is already address-agnostic; this story is mostly verification + a small UI label change. If any read path is found that assumes EOA semantics (e.g. signature-based ownership verification), that path needs a kernel-aware code path — flag in PR review.

## Dependencies

Story 96.1; Epic 63 reader (`apps/api/src/services/reputation/sources/erc8004.ts`).
