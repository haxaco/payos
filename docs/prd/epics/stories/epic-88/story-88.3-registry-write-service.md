# Story 88.3: Registry Write Service — `services/marketplace-registry/registry.ts`

**Status:** Planned
**Linear:** SLY-551
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 88.2; Epic 87 (KYM tier signal)

---

Mirror `apps/api/src/services/erc8004/registry.ts`. Async job-driven mint/update via CDP wallet signing. The service is the only code path that calls the contract — REST handlers enqueue jobs, the worker picks them up, signs with CDP, broadcasts, waits for confirmation, and writes `marketplace_onchain_records` rows.

```typescript
// apps/api/src/services/marketplace-registry/registry.ts
export async function mint(marketplaceId: string): Promise<MintJob>;
export async function updateMetadata(marketplaceId: string, patch: Partial<OnChainMetadata>): Promise<UpdateJob>;
export async function updateReputation(marketplaceId: string): Promise<void>;
export async function updateTier(marketplaceId: string, newTier: number): Promise<void>;
```

## Acceptance

- [ ] Service uses CDP wallet via existing `apps/api/src/services/cdp/` helpers
- [ ] Idempotent mint (re-submitting for an already-minted marketplace returns existing tokenId)
- [ ] Exponential backoff on RPC / gas-price failures (matches ERC-8004 retry policy)
- [ ] Every attempt audit-logged to `marketplace_onchain_audit` (tx hash, gas used, status)
- [ ] `marketplace_onchain_records` table migration ships (`tokenId`, `txHash`, `chainId`, `lastUpdatedAt`)

## Technical notes

KYM T2+ gate is enforced here, not in the REST handler — defence in depth. Reputation hash is `keccak256` of a canonical JSON blob from Epic 87's reputation snapshot.

## Dependencies

Story 88.2; Epic 87 (KYM tier signal)
