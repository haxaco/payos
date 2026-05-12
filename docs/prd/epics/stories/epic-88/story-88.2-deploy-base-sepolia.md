# Story 88.2: Deploy to Base Sepolia + Verify on Basescan

**Status:** Planned
**Linear:** SLY-547
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 88.1

---

Foundry script that deploys `MarketplaceRegistry` to Base Sepolia, seeds `authorizedMinters` with the Sly platform CDP wallet address, verifies the bytecode on basescan, and records the deployment address into `packages/contracts/deployments/base-sepolia.json`. Run end-to-end mint of a smoke-test marketplace as part of the deploy script to prove the wiring.

```bash
# apps/contracts/script/DeployRegistry.s.sol via:
forge script script/DeployRegistry.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

## Acceptance

- [ ] Contract deployed to Base Sepolia; address committed to `deployments/base-sepolia.json`
- [ ] Verified on basescan (source visible)
- [ ] CDP wallet address added to `authorizedMinters`
- [ ] Smoke-test mint succeeds and is queryable via `getMetadata`
- [ ] Deploy runbook documented in `docs/runbooks/marketplace-registry-deploy.md`

## Technical notes

The CDP wallet address is the same custody pattern used for ERC-8004 — see `apps/api/src/services/erc8004/registry.ts` for the existing key wiring. Mainnet deploy is intentionally a separate story (Phase 3) gated on audit pass + 50 testnet mints.

## Dependencies

Story 88.1
