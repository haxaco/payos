# Story 87.8: Reputation Source — `marketplace`

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 87.2; relies on existing reputation infrastructure (Epic 63)

---

Add a `marketplace` source to `apps/api/src/services/reputation/`. Computes a marketplace reputation score from: uptime (last 30 days, from existing health-check telemetry), dispute rate (escrow disputes / settled count, from `apps/api/src/services/settlement-batcher.ts`), agent satisfaction (1-5 star average from agent off-boarding survey responses), settlement success rate, and volume. Reputation is dynamic and separate from KYM tier — tier gates capabilities; reputation informs ranking.

## Acceptance

- [ ] New reputation source registered alongside existing agent/endpoint sources
- [ ] Score computed nightly via existing reputation aggregation worker
- [ ] `GET /v1/marketplaces/:id/reputation` returns score + component breakdown
- [ ] Score component weights documented in code comments + PRD Master
- [ ] Off-boarding survey schema added (lightweight; agents can leave a rating when removed from a marketplace)

## Technical notes

Don't conflate reputation with KYM tier in the API response — keep them separate fields. A T3 marketplace can still have a low reputation (e.g. high dispute rate); the Explorer (Epic 90) will use BOTH signals. The "abnormal suspension velocity" monitor called out in the Risks section is deferred to Phase 2 but the data model here should make it cheap to add.

## Dependencies

87.2; relies on existing reputation infrastructure (Epic 63).
