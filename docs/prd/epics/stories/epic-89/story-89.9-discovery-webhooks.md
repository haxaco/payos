# Story 89.9: Webhooks — `marketplace.published`, `marketplace.discovery.updated`

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 89.6

---

Emit `marketplace.published` when a marketplace first reaches `visibility=public` AND `kym_tier >= 1` (i.e. when its Card first becomes resolvable). Emit `marketplace.discovery.updated` when discovery-relevant fields change (slug, name, vertical, KYM tier, on-chain tokenId, operator info). Used by external systems and the CDN to bust Card caches.

## Acceptance

- [ ] `marketplace.published` fires exactly once per marketplace (idempotent)
- [ ] `marketplace.discovery.updated` payload includes `changedFields[]`
- [ ] Subscribed CDN invalidation worker busts the Card cache on update
- [ ] Webhook retry policy follows platform default
- [ ] Documented in webhook reference

## Technical notes

`marketplace.published` is one-shot per marketplace and gated on the first transition into `(visibility=public AND kym_tier>=1)` so external systems get a clear signal that the Card is now resolvable. `marketplace.discovery.updated` fires on any change to a discovery-relevant column with a `changedFields[]` payload so the CDN-invalidation worker can decide whether to bust the Card cache. Reuses the platform webhook delivery and retry policy in `apps/api/src/services/webhooks/`.

## Dependencies

Story 89.6
