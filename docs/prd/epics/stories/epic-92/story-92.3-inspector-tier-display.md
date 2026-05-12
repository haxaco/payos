# Story 92.3: Inspector — Pricing Tier Display

**Status:** Planned
**Epic:** [Epic 92 — Score-Gated x402 Endpoints](../../epic-92-score-gated-x402-endpoints.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 92.2

---

Surface the pricing policy in two places: (1) the x402 endpoint detail page in `apps/web/src/app/dashboard/agentic-payments/x402/endpoints/[id]/page.tsx` shows the tier ladder with each tier's price + label; (2) the agentbazaar live round viewer milestone payload includes `effective_price_usdc` + `tier_label` so the spectator UI can render "buyer paid $5 (established tier)".

## Acceptance

- [ ] Endpoint detail page renders pricing ladder when `pricing_policy` is present, hides it otherwise
- [ ] Inline editor (admin only) for adjusting tier thresholds and prices; saves via existing PATCH endpoint
- [ ] Round viewer milestone JSON carries `pricing.policy_applied`, `pricing.tier_label`, `pricing.buyer_score`
- [ ] Round viewer renders a one-line "priced at $X — <label> tier" line per settlement

## Technical notes

The viewer rendering work is small (~30 LoC in `docs/demos/LIVE_ROUND_VIEWER.html`) and reuses the existing milestone formatter. Editor uses the `X402PricingPolicy` type from 92.1.

## Dependencies

92.2 (server emits the fields).
