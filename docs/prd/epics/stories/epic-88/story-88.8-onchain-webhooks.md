# Story 88.8: Webhooks — `marketplace.onchain.minted` and `.updated`

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 88.3, Story 88.7

---

Emit webhook events when a mint completes and on every successful metadata update. Reuse existing webhook delivery infrastructure (`apps/api/src/services/webhooks/`). Payload includes tokenId, txHash, explorerUrl, and which fields changed.

## Acceptance

- [ ] `marketplace.onchain.minted` fires on first successful mint
- [ ] `marketplace.onchain.updated` fires on every successful `updateMetadata`
- [ ] Payload includes `changedFields: ['kymTier' | 'reputationHash' | 'discoveryUrl']`
- [ ] Retries follow standard webhook retry policy
- [ ] Documented in webhook reference

## Technical notes

Hooks into the write service's success path (Story 88.3) — emit `marketplace.onchain.minted` exactly once per token, and `marketplace.onchain.updated` on every confirmed `updateMetadata` tx including refreshes from the daily cron (Story 88.7). Payload carries tokenId, txHash, explorerUrl, and a `changedFields[]` array so subscribers can short-circuit no-op updates. Delivery and retry semantics reuse the platform webhook infra in `apps/api/src/services/webhooks/`.

## Dependencies

Story 88.3, Story 88.7
