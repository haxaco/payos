# Story 87.3: REST — `POST /v1/marketplaces/:id/verify` (Mock Provider)

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 87.1, Story 87.2

---

Implement `POST /v1/marketplaces/:id/verify` in `apps/api/src/routes/marketplaces.ts` (extending the file from Epic 86.3). Accepts a `target_tier` (1, 2, or 3) and tier-appropriate `verification_data` (operator profile for T1; KYB documents for T2; audit + kill-switch declaration for T3). In v1, ships with a `mock` provider mode that auto-approves T1 and puts T2/T3 into `pending` for admin review (Story 87.6).

## Acceptance

- [ ] Endpoint validates `target_tier` and required fields per tier with Zod
- [ ] T1 with valid operator profile auto-elevates (`kym_status = 'verified'`)
- [ ] T2/T3 set `kym_status = 'pending'` and create an internal review record
- [ ] Marketplace owner permission check enforced (tenant owner role required)
- [ ] All transitions write to audit log

## Technical notes

Mirror `POST /v1/accounts/:id/upgrade` from Epic 73.5 — same shape, different field set. The "mock provider" is a switch on `KYM_PROVIDER=mock|persona|sumsub` env var. Story 87.4 swaps mock for Persona. Keep the provider interface a thin abstraction so Sumsub is a drop-in later.

## Dependencies

87.1, 87.2.
