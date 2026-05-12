# Story 88.10: Sly Console UI — On-Chain Badge, Mint Trigger, Basescan Link

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 88.9 (SDK)

---

In `apps/web` Marketplaces tab, add an on-chain status section to each marketplace detail page. Shows tokenId, mint tx, last-updated, basescan link when minted. Shows a "Mint on-chain" CTA gated on KYM T2+ when not minted. Trigger calls the API via the SDK.

## Acceptance

- [ ] On-chain badge visible on marketplace cards in list view (minted / not minted)
- [ ] Detail page section shows tokenId, last-updated, basescan link
- [ ] "Mint on-chain" CTA disabled with tooltip for KYM <T2 marketplaces
- [ ] Polling UI for in-flight mints (every 5s while job is queued/processing)
- [ ] Re-mint trigger after tier change (calls `updateTier` via `updateMetadata`)

## Technical notes

Lives under the Marketplaces tab in `apps/web`; consumes the SDK methods from Story 88.9 rather than calling the REST API directly. The list view shows a compact minted/not-minted badge; the detail view shows the full status block with tokenId, last-updated timestamp, and a basescan deep link. The mint CTA stays disabled with an explanatory tooltip below KYM T2, and the detail-page polling loop (every 5s while the mint job is queued/processing) reuses the existing `useApi` retry pattern.

## Dependencies

Story 88.9 (SDK)
