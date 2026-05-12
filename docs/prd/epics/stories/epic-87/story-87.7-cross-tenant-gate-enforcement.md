# Story 87.7: KYM Gate Enforcement on Cross-Tenant Queries

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 87.5

---

Apply KYM capability flags to gate cross-tenant reads. The discovery surfaces from Epic 86.3 (`GET /v1/marketplaces?visibility=public`) and the future Epic 89 endpoints must filter out marketplaces whose effective tier disables `cross_tenant_inbound`. Similarly, when a marketplace tries to read another marketplace's listings, the source marketplace must have `cross_tenant_outbound` enabled at its effective tier.

## Acceptance

- [ ] Public listing endpoint filters by `effective_tier.cross_tenant_inbound = true`
- [ ] Cross-tenant agent/endpoint reads check outbound capability of caller's marketplace
- [ ] T0 marketplaces never appear in cross-tenant queries (verified by test)
- [ ] T1 marketplaces appear in inbound-read paths but cannot initiate outbound cross-tenant queries
- [ ] Audit log captures denied cross-tenant requests for compliance review

## Technical notes

Implement as a shared helper `assertCrossTenantAllowed(marketplaceId, direction)` in `apps/api/src/services/kym/gate.ts` that Epic 89 will reuse. Cache effective-tier lookups in-request (don't re-query per row of a list response). Denials should be silent filters in list responses (omit the row) but explicit 403s in single-resource reads.

## Dependencies

87.5.
