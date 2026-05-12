# Story 88.9: SDK + MCP — Mint + Status Methods

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 88.5, Story 88.6

---

Add `sly.marketplaces.mint(marketplaceId)` and `sly.marketplaces.getOnchainStatus(marketplaceId)` to `@sly_ai/sdk`. Export `MarketplaceRegistry` ABI from `sly.contracts` for advanced consumers. Add equivalent MCP tools (`mint_marketplace_onchain`, `get_marketplace_onchain_status`) to `@sly_ai/mcp-server`.

## Acceptance

- [ ] `sly.marketplaces.mint()` and `getOnchainStatus()` shipped, typed, tested
- [ ] `sly.constants.MarketplaceRegistry` exposes per-chain addresses (Sepolia now, mainnet later)
- [ ] `sly.contracts.MarketplaceRegistry.abi` exported for direct on-chain reads
- [ ] MCP tools registered and visible in Claude Desktop after install
- [ ] SDK README updated with usage example

## Technical notes

Surfaces the mint and status REST endpoints (Stories 88.5/88.6) as typed SDK methods under `sly.marketplaces.*`, with per-chain registry addresses exposed via `sly.constants.MarketplaceRegistry` to match the ERC-8004 pattern documented in the SDK Impact Assessment. The MCP server registers the same two operations as tools so Claude Desktop users can mint and check status by chat. ABI is re-exported from `sly.contracts.MarketplaceRegistry.abi` for advanced consumers who want to read directly with viem/ethers.

## Dependencies

Story 88.5, Story 88.6
