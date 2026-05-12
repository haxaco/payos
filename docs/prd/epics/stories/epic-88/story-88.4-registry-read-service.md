# Story 88.4: Registry Read Service — `services/marketplace-registry/reader.ts`

**Status:** Planned
**Linear:** SLY-554
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 88.3

---

Read-side counterpart. Calls `viewClient.readContract` against the deployed registry, caches results (60-second TTL by tokenId), and exposes `getOnChainStatus(marketplaceId)`. This is what powers the REST GET endpoint and the Sly Console badge.

```typescript
// apps/api/src/services/marketplace-registry/reader.ts
export async function getOnChainStatus(marketplaceId: string): Promise<{
  tokenId: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  kymTier: number | null;
  reputationHash: string | null;
  lastUpdatedAt: string | null;
  chainId: number;
}>;
```

## Acceptance

- [ ] Reads from `marketplace_onchain_records` first, falls back to on-chain read if stale
- [ ] 60-second in-memory cache per tokenId
- [ ] Explorer URL computed per chain (Sepolia vs mainnet)
- [ ] Handles "not yet minted" case explicitly (returns null fields, not throw)
- [ ] Unit tests with mocked viem client

## Technical notes

Uses viem's `viewClient.readContract` against the deployed registry to fetch live on-chain state, with a 60-second in-memory cache keyed by tokenId to bound RPC load. Database-first read path (`marketplace_onchain_records`) handles the common case; on-chain fallback covers stale rows. Explorer URL is computed per chain (Sepolia vs mainnet basescan host) so callers don't need chain awareness. Designed to never throw on "not yet minted" — returns a fully-null status object so the Console and SDK can render gracefully.

## Dependencies

Story 88.3
