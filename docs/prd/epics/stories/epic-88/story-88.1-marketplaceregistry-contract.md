# Story 88.1: MarketplaceRegistry.sol — Contract, Foundry Tests, Audit Prep

**Status:** Planned
**Linear:** SLY-545
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 8
**Priority:** P0
**Dependencies:** None

---

Write the `MarketplaceRegistry` ERC-721 contract per the scope spec. Mirror the structural choices in the existing ERC-8004 IdentityRegistry: explicit metadata struct, slug uniqueness map, operator-only mutation, event emission on every state change. Ship with a full Foundry test suite (happy path, slug collision, unauthorized update, reputation hash churn, gas snapshots) so the contract is audit-ready before any deployment.

```solidity
// apps/contracts/src/MarketplaceRegistry.sol
contract MarketplaceRegistry is ERC721, Ownable {
    error SlugAlreadyTaken(string slug);
    error NotOperator(address caller, uint256 tokenId);
    error InvalidKymTier(uint8 tier);

    mapping(uint256 => MarketplaceMetadata) public marketplaces;
    mapping(string => uint256) public slugToTokenId;
    mapping(address => bool) public authorizedMinters; // Sly platform key(s)

    function mint(MarketplaceMetadata calldata m)
        external onlyAuthorizedMinter returns (uint256 tokenId);

    function updateMetadata(uint256 tokenId, MarketplaceMetadata calldata m)
        external onlyOperator(tokenId);

    function tokenURI(uint256 tokenId) public view override returns (string memory);
}
```

## Acceptance

- [ ] Contract compiles under Solidity 0.8.24+ with `via-ir` enabled
- [ ] Foundry tests cover mint, update, slug collision, unauthorized caller, reputation churn
- [ ] Gas snapshots for `mint`, `updateMetadata` recorded in CI
- [ ] `tokenURI` returns base64-encoded JSON with discovery URL embedded
- [ ] Slither / static analysis clean; audit-prep checklist filled

## Technical notes

Reuse OpenZeppelin v5 ERC-721 + Ownable. Keep storage layout upgrade-friendly even though v1 is non-upgradeable — leave gap slots after `marketplaces` mapping. The audit cost/timeline (Spearbit, ConsenSys) is the gating risk for mainnet; testnet does not require audit pass.

## Dependencies

None.
