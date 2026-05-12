# Story 87.10: SDK — `verify`, `getLimits` Methods

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 87.3, Story 87.5, Epic 86.4

---

Extend the `sly.marketplaces` SDK module from Epic 86.4 with `verify(id, { targetTier, verificationData })` and `getLimits(id)`. Types updated for `kymTier`, `kymStatus`, the `MarketplaceLimits` response shape from Story 87.5, and the reputation response from Story 87.8. Add `sly_marketplace_verify` and `sly_kym_status` MCP tools.

## Acceptance

- [ ] SDK methods land in `packages/sdk/src/marketplaces.ts`
- [ ] Types exported (`KymTier`, `KymStatus`, `MarketplaceLimits`)
- [ ] MCP tools registered with helpful descriptions
- [ ] SDK README updated with verification example
- [ ] Version bumped + ready for `pnpm publish:sdk`

## Technical notes

Co-version with Epic 86.4's SDK module bump if both ship together. Otherwise treat as a minor version bump (additive). The `verify` MCP tool description should clarify that T3 requires platform-team review and cannot be self-served.

## Dependencies

87.3, 87.5, Epic 86.4.
