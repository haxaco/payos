# Story 92.2: Pricing Service + x402 Challenge Integration

**Status:** Planned
**Epic:** [Epic 92 — Score-Gated x402 Endpoints](../../epic-92-score-gated-x402-endpoints.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 92.1; Epic 63 composite score reader

---

Implement `resolveEndpointPrice(endpoint, buyerAgentId)` that, when `pricing_policy.kind === 'score-gated'`, reads the buyer's composite identity score via the Epic 63 reader, matches the highest tier the buyer qualifies for, and returns `{ price_usdc, tier_label, score, policy_applied: true }`. Wire this into the existing 402 challenge response so the buyer sees the effective price and reason.

```typescript
// apps/api/src/services/x402/pricing.ts
export async function resolveEndpointPrice(
  endpoint: X402Endpoint,
  buyerAgentId: string | null,
): Promise<ResolvedPrice> {
  if (!endpoint.pricing_policy) {
    return { price_usdc: endpoint.price_usdc, policy_applied: false };
  }
  // ...read composite score, match tier
}
```

## Acceptance

- [ ] When `pricing_policy` is absent, behavior is identical to today (no regression)
- [ ] Score lookup uses the existing `getCompositeScore()` reader; on read failure, falls back to `fallback_price_usdc`
- [ ] `below_min: 'reject'` returns a 402 with `error: 'score_too_low'` and no payment_requirements
- [ ] 402 challenge JSON includes `pricing.policy_applied`, `pricing.tier_label`, `pricing.buyer_score` (omit score if unauthenticated buyer)
- [ ] Per-request structured log captures resolved tier for analytics

## Technical notes

The buyer's `agent_id` is known when the request carries a Sly agent token or session token; for anonymous probes use `fallback_price_usdc`. Cache score reads for ~30s per agent to avoid hammering the reader on burst traffic. Do NOT cache across tenants.

## Dependencies

92.1 (column); Epic 63 composite score reader (`apps/api/src/services/reputation/sources/erc8004.ts` and aggregator).
