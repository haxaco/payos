# Story 88.12: Documentation — ABI, Addresses, Data Model, Mainnet Plan

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 88.2 (testnet address must exist)

---

Ship `docs/guides/onchain/marketplace-registry.md`: deployed addresses (testnet + mainnet placeholder), exported ABI snippet, the `MarketplaceMetadata` struct fields explained, the mint/update lifecycle diagram, and the mainnet rollout gating criteria (audit pass + 50 testnet mints + 30-day uptime). Also documents the operator-self-mint migration path that's deferred to a future phase.

## Acceptance

- [ ] `docs/guides/onchain/marketplace-registry.md` published
- [ ] Deployed addresses table (testnet live, mainnet pending)
- [ ] Lifecycle diagram (mint → reputation refresh → tier sync)
- [ ] Mainnet rollout gating criteria documented
- [ ] Linked from `MARKETPLACES_STRATEGY.md`

## Technical notes

The guide is the canonical external reference for the registry — partner integrators read it before they consume the SDK. Mainnet gating criteria (audit pass + 50 testnet mints + 30-day uptime) are documented here as the contractual checklist, not just an internal note, so partners know what's required before mainnet deploy. The operator-self-mint migration path is captured here even though it's deferred, so future contract upgrade work has a documented starting point.

## Dependencies

Story 88.2 (testnet address must exist)
