# Story 92.1: `pricing_policy` JSONB Column on x402_endpoints

**Status:** Planned
**Linear:** SLY-550
**Epic:** [Epic 92 — Score-Gated x402 Endpoints](../../epic-92-score-gated-x402-endpoints.md)
**Points:** 3
**Priority:** P0
**Dependencies:** None

---

Add a nullable `pricing_policy JSONB` column to `x402_endpoints`. When present, it overrides the static `price_usdc` and is interpreted by the pricing service (Story 92.2). Schema is open-ended to leave room for non-score policies (per-counterparty, time-of-day) but v1 ships only the `score-gated` kind.

```sql
ALTER TABLE x402_endpoints
  ADD COLUMN pricing_policy JSONB;

CREATE INDEX idx_x402_endpoints_pricing_policy_kind
  ON x402_endpoints ((pricing_policy->>'kind'))
  WHERE pricing_policy IS NOT NULL;
```

## Acceptance

- [ ] Migration ships with the partial index on `kind`
- [ ] `pricing_policy` is nullable; existing endpoints unaffected
- [ ] CHECK constraint or app-side validation ensures `tiers[]` is sorted descending by `min_score`
- [ ] Shared TypeScript type in `packages/types` (`X402PricingPolicy`) used by API + UI

## Technical notes

Validate `below_min` is one of `reject | allow | tenfold`. The `tenfold` mode multiplies the lowest tier's price by 10× as a punitive fallback — useful for demos where rejecting feels too harsh. Keep `tiers[].label` purely cosmetic (it surfaces in 402 challenge JSON for buyer-side UX).

## Dependencies

None — pure schema.
