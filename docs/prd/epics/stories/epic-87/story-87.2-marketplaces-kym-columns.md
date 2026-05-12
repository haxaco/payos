# Story 87.2: Migration — `marketplaces` Column Additions

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Epic 86.1

---

Extend `marketplaces` (from Epic 86) with `kym_tier INTEGER DEFAULT 0`, `kym_status TEXT DEFAULT 'unverified'` (CHECK in `'unverified'|'pending'|'verified'|'rejected'|'suspended'`), `kym_metadata JSONB DEFAULT '{}'`, `kym_verified_at TIMESTAMPTZ NULL`, `kym_verified_by UUID NULL` (admin user reference when manually elevated).

## Acceptance

- [ ] Migration adds all five columns without breaking existing rows
- [ ] All pre-existing marketplaces default to `kym_tier = 0`, `kym_status = 'unverified'`
- [ ] CHECK constraint rejects unknown `kym_status` values
- [ ] Index on `(kym_tier, kym_status)` for the discovery filter path used by Epic 89

## Technical notes

`kym_metadata` stores provider-specific blobs (Persona inquiry IDs, Sumsub applicant IDs, partner reliance agreement references). Treat it as opaque JSON at the schema level; structured access happens in the verification service. Audit logging on tier transitions is handled in Story 87.6.

## Dependencies

Epic 86.1 (this column lives on the `marketplaces` table).
