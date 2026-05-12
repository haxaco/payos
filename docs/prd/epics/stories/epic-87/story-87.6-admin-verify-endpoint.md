# Story 87.6: Admin Endpoint — `POST /admin/v1/marketplaces/:id/verify`

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 87.2, Story 87.3

---

Admin-only manual tier elevation, mirroring `/admin/v1/accounts/:id/verify` from Epic 73. Required for T3 (always manual), T2 partner-reliance path, and overrides when Persona has rejected a marketplace that the platform team has separately verified. Body accepts `target_tier`, `verification_path` (`'standard' | 'partner_reliance' | 'enterprise'`), and a free-form `justification` (logged to audit, mandatory).

## Acceptance

- [ ] Admin auth check enforces platform-admin role (not tenant-owner)
- [ ] Sets `kym_status = 'verified'`, `kym_verified_at = NOW()`, `kym_verified_by = admin_user_id`
- [ ] `justification` is required (400 if missing) and written to audit log
- [ ] Tier downgrades also supported (suspension path: target_tier < current)
- [ ] Email notification sent to marketplace owner on tier change

## Technical notes

Reuse `requireAdminRole` middleware if it exists, or add one keyed off `user_profiles.role = 'platform_admin'`. The audit row captures both the actor (admin) and the marketplace owner for compliance trails. Downgrade-to-suspend (target_tier = 0, status = 'suspended') is the manual lever for the dispute-threshold cases called out in the Risks section.

## Dependencies

87.2, 87.3.
