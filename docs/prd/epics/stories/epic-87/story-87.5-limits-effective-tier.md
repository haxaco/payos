# Story 87.5: REST — `GET /v1/marketplaces/:id/limits` + Effective-Tier Computation

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 87.1, Story 87.2

---

Implement `GET /v1/marketplaces/:id/limits` returning the effective KYM capabilities for the marketplace. Effective tier is computed as `MIN(marketplace.kym_tier, owner_tenant.verification_tier)` (mirroring Epic 73's agent-vs-parent-account rule). Response includes declared tier, effective tier, the bottleneck (`'marketplace_self'` vs `'owner_tenant'`), and the resolved capability flags from `marketplace_kym_tiers`.

```typescript
{
  marketplace_id: string;
  declared_tier: 0 | 1 | 2 | 3;
  effective_tier: 0 | 1 | 2 | 3;
  bottleneck: 'marketplace_self' | 'owner_tenant' | null;
  capabilities: {
    cross_tenant_inbound: boolean;
    cross_tenant_outbound: boolean;
    explorer_visibility: 'hidden' | 'listed' | 'verified' | 'featured';
    onchain_mint: boolean;
    max_agents: number | null;
  };
}
```

## Acceptance

- [ ] Endpoint returns declared + effective tier + bottleneck
- [ ] Effective-tier computation correct across all 16 combinations (4 marketplace tiers × 4 tenant tiers)
- [ ] Unit tests cover the full matrix
- [ ] Capabilities collapsed from the lookup table at the effective tier
- [ ] Public endpoint (no auth) returns reduced view for `visibility = 'public'` marketplaces

## Technical notes

This endpoint is the gate consumed by Epic 89 (discovery) and Epic 90 (Explorer). Cache the lookup table read in-process — `marketplace_kym_tiers` changes via migration, not runtime, so a 60-second TTL is safe. The "public reduced view" omits `kym_metadata` and bottleneck attribution to avoid leaking tenant-internal posture.

## Dependencies

87.1, 87.2.
