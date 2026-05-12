# Story 87.1: Migration — `marketplace_kym_tiers` Lookup Table

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 3
**Priority:** P0
**Dependencies:** None

---

Create the read-mostly lookup table that stores per-tier capability flags, mirroring `tier_limits` from Epic 73 in shape. Seed with T0–T3 rows reflecting the tier matrix in the Scope section. Tier rows are global in v1 (no per-tenant overrides yet — the Epic 73 multi-tenant refactor pattern can be applied later if needed).

```sql
CREATE TABLE marketplace_kym_tiers (
  tier_level INTEGER PRIMARY KEY CHECK (tier_level BETWEEN 0 AND 3),
  tier_name TEXT NOT NULL,
  cross_tenant_inbound_enabled BOOLEAN NOT NULL DEFAULT false,
  cross_tenant_outbound_enabled BOOLEAN NOT NULL DEFAULT false,
  explorer_visibility TEXT NOT NULL DEFAULT 'hidden'
    CHECK (explorer_visibility IN ('hidden', 'listed', 'verified', 'featured')),
  onchain_mint_enabled BOOLEAN NOT NULL DEFAULT false,
  max_agents INTEGER,                       -- NULL = unlimited (T3)
  dispute_threshold_pct NUMERIC(5,2),       -- auto-suspend trigger
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Acceptance

- [ ] Table shipped with all four tier rows seeded
- [ ] T0 row: cross-tenant disabled, hidden, mint disabled
- [ ] T2 row: bidirectional cross-tenant, verified visibility, mint enabled
- [ ] T3 row: max_agents = NULL (unlimited), featured visibility
- [ ] Constraints prevent unknown visibility values

## Technical notes

Keep this table read-only from the API layer — values change via migration, not runtime writes. Mirrors the Epic 73 `tier_limits` pattern. If the multi-tenant override pattern from the Epic 73 refactor becomes necessary, plan to add `tenant_id UUID NULL` and treat NULL rows as platform ceiling (same convention).

## Dependencies

None.
