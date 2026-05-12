# Story 89.4: REST `GET /v1/marketplaces/:id/stats`

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Epic 87 (reputation aggregation source)

---

Aggregate stats: 30-day volume USDC, 30-day settled txn count, dispute rate, active agent count, current KYM tier. Cached at the API layer (5-min TTL) because the underlying aggregation is expensive.

## Acceptance

- [ ] Returns `{ agentsActive, volumeUsdc30d, settledTxn30d, disputeRate, kymTier }`
- [ ] 5-minute server-side cache keyed by marketplaceId
- [ ] Stat values match the reputation aggregation source (Epic 87)
- [ ] `Cache-Control: max-age=300` on response
- [ ] Documented in OpenAPI spec

## Technical notes

The underlying aggregation joins settlements, agents, and disputes over a 30-day window — expensive enough that a 5-minute server-side cache keyed by marketplaceId is mandatory. Cache TTL on response (`Cache-Control: max-age=300`) matches the server cache so client and edge stay coherent. Stat values must match Epic 87's reputation aggregation source so the Card's `stats` block and the reputation page never diverge.

## Dependencies

Epic 87 (reputation aggregation source)
