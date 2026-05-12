# Story 87.12: Documentation — PRD Master, Dashboard Help, SDK Reference

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 3
**Priority:** P2
**Dependencies:** All prior stories landed

---

Update `docs/prd/PRD_Master.md` with the KYM tier table from the Scope section, add a "Marketplace verification" help page to the dashboard help index, and write SDK reference docs for the new `verify` / `getLimits` methods. Cross-reference Epic 73 (the KYA pattern) and `MARKETPLACES_STRATEGY.md` (the vision).

## Acceptance

- [ ] PRD Master KYM table matches the seeded `marketplace_kym_tiers` rows exactly
- [ ] Dashboard help page covers what each tier unlocks + how to upgrade
- [ ] SDK README includes a runnable example for verification
- [ ] Cross-references to Epic 73 + Epic 86 + Epic 89 (forward) added where relevant
- [ ] ONBOARDING guide gets a one-paragraph KYM blurb so new tenants understand the trust gradient

## Technical notes

Docs-only story. Keep tone consistent with Epic 73 docs — compliance-as-a-feature framing, not marketing. The help page is part of the existing `apps/web/src/app/dashboard/help/` tree if present, or under `docs/guides/onboarding/` otherwise.

## Dependencies

All prior stories landed.
