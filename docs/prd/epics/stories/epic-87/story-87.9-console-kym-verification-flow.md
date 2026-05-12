# Story 87.9: Sly Console — KYM Verification Flow

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 8
**Priority:** P1
**Dependencies:** Story 87.3, Story 87.4, Epic 86.6

---

Extend the Marketplaces tab from Epic 86.6 with the KYM verification flow. Per-marketplace detail page gains a "Verification" section showing current tier, status badge (Unverified / Pending / Verified / Rejected / Suspended), and "Upgrade to T1 / T2 / T3" CTAs. T1 = simple form (operator profile, declared compliance posture). T2 = embedded Persona Web SDK for KYB documents. T3 = "Contact platform team" CTA (manual review per Story 87.6).

## Acceptance

- [ ] Verification section visible on marketplace detail page
- [ ] T1 upgrade form auto-elevates on submission (mock provider) or transitions to pending (real provider)
- [ ] T2 upgrade launches Persona inquiry inline; status polls webhook outcome
- [ ] T3 CTA opens a support form pre-filled with marketplace details
- [ ] Tier badge renders in both the list view and the detail header
- [ ] Owner role can initiate; non-owners see read-only

## Technical notes

Build in `apps/web/src/app/dashboard/marketplaces/[id]/verification/`. Reuse Persona SDK wrapper from Epic 73 UI work (don't fork it). The status polling can read `GET /v1/marketplaces/:id` directly — no need for a dedicated status endpoint.

## Dependencies

87.3, 87.4, Epic 86.6.
