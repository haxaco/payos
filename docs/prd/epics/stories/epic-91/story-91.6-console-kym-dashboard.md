# Story 91.6: Sly Console — KYM Dashboard

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Epic 87 (KYM data), Epic 90 Story 90.9 (per-marketplace verification)

---

Surface Epic 87's KYM data in the Sly Console as a tenant-wide overview. List all of the tenant's marketplaces with their current KYM tier, verification status, on-chain mint badge, last-verified date, and a CTA to upgrade. Cross-references Epic 90 Story 90.9 (per-marketplace verification flow) but aggregates across the tenant.

Place at `/dashboard/marketplaces/kym` — a sibling to the marketplace list page. Pulls from Epic 87's `GET /v1/marketplaces/:id/kym` aggregated client-side.

## Acceptance

- [ ] Table lists every marketplace owned by the tenant with tier, status, mint state
- [ ] Sortable by tier desc, then by status
- [ ] "Upgrade" CTA per row deep-links to Story 90.9's verification panel
- [ ] On-chain mint badge links to Basescan for the MarketplaceRegistry NFT
- [ ] Empty state when tenant has no marketplaces

## Technical notes

Pure consumption — no new endpoints. If Epic 87 doesn't ship a tenant-wide query, file a follow-up there rather than aggregating in this UI. Reuse the table components from `apps/web/src/components/dashboard/`.

## Dependencies

Epic 87 (KYM data), Epic 90 Story 90.9 (per-marketplace verification).
