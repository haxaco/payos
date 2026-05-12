# Story 88.7: Daily Reputation Refresh + Tier Sync Cron

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 88.3, Epic 87 (reputation snapshot source)

---

Background job that walks all minted marketplaces once per day, recomputes the reputation hash from the latest reputation snapshot (Epic 87), compares against the last-pushed value, and calls `updateMetadata` only on delta. Same pass also reconciles `kymTier` if the off-chain tier has changed.

```typescript
// apps/api/src/workers/marketplace-onchain-refresh.ts
// Hard gas cap per run: skip remaining marketplaces if cumulative gas > 0.05 ETH equivalent.
// Skip-if-unchanged is the dominant optimization — most marketplaces won't have reputation deltas.
```

## Acceptance

- [ ] Worker runs once daily; skip-if-unchanged is the default path
- [ ] Hard gas cap per run (cumulative, configurable env var)
- [ ] Tier change on `marketplace.kym_tier` triggers `updateMetadata` even outside cron
- [ ] Audit log row per marketplace per run (status: skipped | updated | failed)
- [ ] Integration test with 100 marketplaces, only 3 with reputation deltas → only 3 tx broadcast

## Technical notes

Gas cost at scale is the principal risk on mainnet (1000+ marketplaces). The skip-if-unchanged guard plus the daily cadence keeps the cost bounded. Long-term plan is to batch updates via a multicall variant — out of scope for v1.

## Dependencies

Story 88.3, Epic 87 (reputation snapshot source)
