# Epic 88: MarketplaceRegistry On-Chain

**Status:** Planned
**Phase:** TBD (Marketplaces Platform)
**Priority:** P1
**Dependencies:** Epic 86 (Marketplaces as Entities), Epic 87 (KYM Trust Layer)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md), ERC-8004 Identity Registry (Epic 3)
**Created:** May 2026

---

## Implementation in Flight (as of 2026-05-14)

**Open PR #13** — `epic-88-invu-demo` — *"feat(epic-88): buyer-side wallet + B2C agentic checkout"*. Branch is local + remote at `epic-88-invu-demo`.

Scope per PR description: buyer-side wallet primitives and B2C agentic checkout flow. This work pre-empts the on-chain registry by validating the end-to-end buyer journey first; the registry itself (NFT mint, KYM tier on-chain) follows in subsequent stories.

Related uncommitted changes in working tree:
- `apps/marketplace-sim/src/scenarios/blocks/concierge.ts` (+301 lines), `apps/marketplace-sim/src/scenarios/blocks/a2a_x402_marketplace.ts` (+137 lines) — sim scenarios exercising the buyer-side wallet path
- `apps/web/src/app/dashboard/agents/[id]/page.tsx` — agent detail page updates that surface the new buyer-side wallet state

Status: under review. No story status changes from this note until PR #13 lands.

---

## Summary

A `MarketplaceRegistry` smart contract on Base (Sepolia → mainnet), parallel to ERC-8004 for agents. Each marketplace mints an NFT carrying its identity, KYM tier, discovery URL, and reputation hash. The on-chain registry is what makes the marketplace identity portable, verifiable by external agents, and resistant to centralized takedown — the same way ERC-8004 makes agent identity portable.

## Motivation

After Epics 86 and 87, marketplaces are first-class entities with verified KYM tiers. But the entity record lives in Sly's database. That has two limitations:

1. **External agents can't trust Sly's database without an API call.** A non-Sly agent that wants to verify "is this marketplace really a T2-verified marketplace?" needs to hit Sly's API and trust the response. On-chain proof removes that trust requirement — anyone can read the marketplace's NFT and its tier directly from Base.

2. **Marketplace identity isn't portable across infrastructure.** If Sly the company goes away, the marketplace records die with it. An on-chain registry survives the platform.

ERC-8004 already solved this for agents. The MarketplaceRegistry mirrors the pattern for the marketplaces themselves. Together, agents + marketplaces have credible on-chain identity — Sly's product moat is identity that survives Sly.

## Direction confirmed with the user

Symmetry with ERC-8004. NFT per marketplace; tier and reputation visible on-chain; mint gated by KYM T2+ (T0/T1 marketplaces stay off-chain). Discovery URL embedded in tokenURI metadata so any reader can find the marketplace's `/.well-known/sly-marketplace.json` (Epic 89) directly from the chain.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/marketplaces/:id/onchain/mint` | ✅ Yes | `sly.marketplaces` | P1 | Triggers async mint; returns tx hash |
| `GET /v1/marketplaces/:id/onchain` | ✅ Yes | `sly.marketplaces` | P1 | Mint status + token id + explorer link |
| `MarketplaceRegistry.address` constants per chain | ✅ Yes | `sly.constants` | P1 | Match ERC-8004 pattern |
| MarketplaceRegistry ABI exports | ✅ Yes | `sly.contracts` | P2 | For SDK users that want to read directly |

**SDK Stories Required:**
- [ ] Story 88.X: `sly.marketplaces.mint()` + `getOnchainStatus()`
- [ ] Story 88.Y: Export `MarketplaceRegistry` ABI from `@sly_ai/sdk`

## Scope

**In scope (v1):**

1. **MarketplaceRegistry contract** (Solidity, Base Sepolia testnet first, then mainnet).

   ```solidity
   contract MarketplaceRegistry is ERC721 {
       struct MarketplaceMetadata {
           string slug;            // "travel" — must be unique
           string name;             // "TravelHubs Marketplace"
           string discoveryUrl;     // canonical /.well-known/sly-marketplace.json URL
           uint8  kymTier;          // 0-3
           bytes32 reputationHash;  // off-chain reputation snapshot hash, periodically refreshed
           address operator;        // EOA or contract that can update the record
           uint64 mintedAt;
           uint64 updatedAt;
       }

       mapping(uint256 => MarketplaceMetadata) public marketplaces;
       mapping(string => uint256) public slugToTokenId;

       function mint(MarketplaceMetadata calldata m) external returns (uint256);
       function updateMetadata(uint256 tokenId, MarketplaceMetadata calldata m) external;
       function getMetadata(uint256 tokenId) external view returns (MarketplaceMetadata memory);

       event MarketplaceMinted(uint256 indexed tokenId, string slug, address operator);
       event MetadataUpdated(uint256 indexed tokenId, uint8 kymTier, bytes32 reputationHash);
   }
   ```

   - Standard ERC-721; tokenURI returns metadata with discovery URL for off-chain UIs
   - Mint authorized via signed message from a Sly platform key (T2+ KYM gating)
   - Update gated to current operator (Sly platform initially; eventually delegated to marketplace operator's wallet)

2. **`apps/api/src/services/marketplace-registry/`** — service mirroring `apps/api/src/services/erc8004/`:
   - `mint(marketplaceId)` — call after KYM T2 verification lands
   - `updateReputation(marketplaceId)` — periodic refresh of `reputationHash` (daily cron)
   - `updateTier(marketplaceId, newTier)` — when KYM tier changes
   - `getOnChainStatus(marketplaceId)` — returns `{ tokenId, txHash, explorerUrl, lastUpdatedAt }`

3. **Sly platform signing key.** Same key custody pattern as ERC-8004 — a managed CDP wallet held by Sly mints on the operator's behalf at first.

4. **Cron job**: daily reputation hash refresh for all minted marketplaces. Gas-bounded; skips marketplaces with no reputation delta.

5. **REST endpoints**:
   - `POST /v1/marketplaces/:id/onchain/mint` — trigger mint (T2+ required); idempotent
   - `GET /v1/marketplaces/:id/onchain` — current tokenId, mint tx, last-updated, explorer URL
   - Webhook event `marketplace.onchain.minted` and `.updated`

6. **`apps/web` Sly Console**: in the Marketplaces tab, show on-chain badge + basescan link once minted; allow operators to trigger re-mint after tier changes.

7. **Failure modes**: mints can fail (gas, RPC issues). Use the same retry pattern as ERC-8004 — async job, exponential backoff, audit log on every attempt.

8. **Mainnet rollout gate**: only deploy to Base mainnet after >50 successful mints + 30-day uptime on Base Sepolia. Initially everything is testnet; mainnet is a separate Phase.

**Out of scope (deferred):**

- Decentralized governance of the registry (DAO-controlled tier updates) — distant future
- ENS or naming-service integration for marketplace slugs
- Cross-chain mints (Solana, etc.)
- Marketplace reputation as a separate ERC-8004-style on-chain registry (we use a hash; full on-chain reputation arrays come later)
- Operator-self-mint (operator pays gas) — phase 2

## Stories

Each story spec lives in its own file at [`./stories/epic-88/`](./stories/epic-88/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: Contract + Testnet Deploy — 26 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [88.1](./stories/epic-88/story-88.1-marketplaceregistry-contract.md) | MarketplaceRegistry.sol — Contract, Foundry Tests, Audit Prep | 8 | P0 | Planned |
| [88.2](./stories/epic-88/story-88.2-deploy-base-sepolia.md) | Deploy to Base Sepolia + Verify on Basescan | 5 | P0 | Planned |
| [88.3](./stories/epic-88/story-88.3-registry-write-service.md) | Registry Write Service — `services/marketplace-registry/registry.ts` | 5 | P0 | Planned |
| [88.4](./stories/epic-88/story-88.4-registry-read-service.md) | Registry Read Service — `services/marketplace-registry/reader.ts` | 5 | P0 | Planned |
| [88.5](./stories/epic-88/story-88.5-rest-mint-endpoint.md) | REST `POST /v1/marketplaces/:id/onchain/mint` | 5 | P0 | Planned |

### Phase 2: Read Surface, Refresh, and Integrations — 21 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [88.6](./stories/epic-88/story-88.6-rest-onchain-status-endpoint.md) | REST `GET /v1/marketplaces/:id/onchain` | 3 | P0 | Planned |
| [88.7](./stories/epic-88/story-88.7-reputation-refresh-cron.md) | Daily Reputation Refresh + Tier Sync Cron | 5 | P1 | Planned |
| [88.8](./stories/epic-88/story-88.8-onchain-webhooks.md) | Webhooks — `marketplace.onchain.minted` and `.updated` | 3 | P1 | Planned |
| [88.9](./stories/epic-88/story-88.9-sdk-mcp-mint-status.md) | SDK + MCP — Mint + Status Methods | 5 | P1 | Planned |
| [88.10](./stories/epic-88/story-88.10-console-onchain-ui.md) | Sly Console UI — On-Chain Badge, Mint Trigger, Basescan Link | 5 | P1 | Planned |

### Phase 3: Hardening + Documentation — 10 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [88.11](./stories/epic-88/story-88.11-foundry-service-cron-tests.md) | Tests — Solidity Foundry, Service Retries, Gas-Bounded Cron | 5 | P0 | Planned |
| [88.12](./stories/epic-88/story-88.12-docs-abi-mainnet-plan.md) | Documentation — ABI, Addresses, Data Model, Mainnet Plan | 3 | P1 | Planned |

**Total:** 57 points across 12 stories (Phase 1: 26, Phase 2: 21, Phase 3: 10)

## Definition of Done

- [ ] MarketplaceRegistry deployed to Base Sepolia (audited, verified on basescan)
- [ ] Sly platform signing key configured + funded
- [ ] Mint flow functional end-to-end for a T2 marketplace (KYM-gated)
- [ ] Daily reputation refresh job running, gas-bounded
- [ ] On-chain status visible in Sly Console + via SDK + via webhook
- [ ] At least 5 marketplaces successfully minted on Base Sepolia in staging
- [ ] Documentation: deployed addresses, ABI, integration guide
- [ ] Mainnet deploy plan documented (gating criteria, signing key custody)

## Risks

- **Solidity audit cost + time.** Outsource (Spearbit, ConsenSys, etc.) — budget 2–4 weeks. Block mainnet deploy on audit pass.
- **Gas costs at scale.** Daily refresh for 1000+ marketplaces will get expensive on mainnet. Mitigate with batched updates + skip-if-unchanged.
- **Operator key custody migration.** v1 has Sly hold the signing key. Eventually operators want to self-mint with their own keys. Plan migration path now (operator address embedded in metadata; future contract upgrade to allow operator-self-update).

## References

- `apps/api/src/services/erc8004/registry.ts` — pattern reference (agent NFT mint)
- `apps/api/src/services/reputation/sources/erc8004.ts` — composite-score pattern
- `MARKETPLACES_STRATEGY.md` — section "MarketplaceRegistry on-chain"
