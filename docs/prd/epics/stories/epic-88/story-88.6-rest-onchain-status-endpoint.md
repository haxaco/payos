# Story 88.6: REST `GET /v1/marketplaces/:id/onchain`

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 88.4

---

Read endpoint backed by the reader service. Returns the on-chain status object shape from Story 88.4. Tenant-scoped read; the SDK and Sly Console UI both consume this.

## Acceptance

- [ ] Returns the `OnChainStatus` shape from 88.4
- [ ] 404 if marketplace doesn't exist; 200 with null fields if not yet minted
- [ ] Cached responses set `Cache-Control: max-age=60`
- [ ] Tenant filter enforced

## Technical notes

Thin Hono handler over `getOnChainStatus()` from Story 88.4 — no additional logic, just HTTP plumbing and `Cache-Control: max-age=60` to align with the reader's 60-second in-memory cache. Returns 404 only when the marketplace itself does not exist; an existing-but-not-minted marketplace returns 200 with null fields so the UI can render the "Mint on-chain" CTA without distinguishing error paths. Tenant filter is enforced on the marketplace load before reaching the reader.

## Dependencies

Story 88.4
