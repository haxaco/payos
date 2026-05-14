# Story 93.5: Daily On-Chain Merkle Rollup

> ## ⚠️ DEPRECATED — Absorbed into Epic 98 (On-Chain Anchoring)
>
> **Status:** 🚫 Deprecated (2026-05-14, Epic 93 scope cut)
> **Replaced by:** [Epic 98 Stories 98.1 (Merkle accumulator) + 98.2 (Sly Anchor Contract on Base) + 98.6 (batch closer + on-chain writer worker)](../../epic-98-onchain-anchoring.md)
>
> Epic 98 ships a ~60s Merkle accumulator (not daily), an audited `SlyAnchor` contract on Base, EAS schema registrations for `sly.receipt.v1` / `sly.dispute.v1` / `sly.policy_decision.v1`, and the verification endpoint extension for on-chain inclusion checks. Far more robust than the original Epic 93 plan (which targeted only daily rollups against ERC-8004's reputation_metadata slot).
>
> See [Epic 93 (revised)](../../epic-93-reputation-receipts.md) for the narrowed score-feeder scope (19 pts, 5 stories).

---

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 93.3; Epic 88 (pattern reference)

---

Once per day, batch all unrolled-up receipts (`onchain_rollup_id IS NULL`), compute a merkle root over their signatures, and write the root to ERC-8004's `reputation_metadata` slot (or a dedicated rollup contract on Base Sepolia). Update each included row with the rollup_id and merkle proof. Anyone can verify a receipt against the on-chain root using the stored proof.

## Acceptance

- [ ] Daily job (cron / scheduled worker) runs on a deterministic UTC schedule
- [ ] Merkle tree construction is reproducible (sorted by receipt.id)
- [ ] Each rolled-up row stores its merkle proof in a new `onchain_proof JSONB` column
- [ ] Gas-bounded: if the batch exceeds N receipts, split into multiple roots in the same day (logged)
- [ ] Verifier helper accepts `(receipt, root, proof) → bool`

## Technical notes

Hash function = keccak256 over the canonical receipt bytes from 93.3. Pattern reference: Epic 88 MarketplaceRegistry's on-chain hash refresh. On Base mainnet eventually; Base Sepolia for v1. Skip the rollup contract complexity in v1 if writing directly to ERC-8004 `reputation_metadata` is sufficient — document the choice.

## Dependencies

93.3 (signatures must exist before rollup); Epic 88 (pattern reference for hash refresh).
