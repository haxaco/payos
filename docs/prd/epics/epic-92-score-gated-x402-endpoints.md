# Epic 92: Score-Gated x402 Endpoints

**Status:** Planned
**Phase:** TBD (Identity-First Demos)
**Priority:** P1
**Dependencies:** Epic 63 (External Reputation Bridge), Epic 73 (KYA Tiers)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md), agentbazaar repo
**Created:** May 2026

---

## Summary

Let x402 endpoint operators price requests by the buyer agent's composite identity score (0–1000) rather than just KYA tier or static price. A code-review endpoint could charge $0.50 base for score ≥900, $5 for 700–899, reject below 700. Identity becomes pricing on a single transaction — the deepest possible demo of "agentic identity has economic value."

## Motivation

Smith on the agentbazaar runtime already gates pricing by AWS WAF Bot Control tier (verified-bot vs unverified). That works because WAF labels are coarse (verified / unverified / unknown) — but Sly has a much richer signal: composite identity score from Epic 63 (ERC-8004 + KYA tier + age + activity + dispute history).

Score-gated pricing is the killer demo because:

1. The same agent shows up at the endpoint twice and gets two different prices because their score changed
2. New agents with low score genuinely pay more, incentivizing reputation-building
3. It's the cleanest possible argument to ZeroDev / partner conversations: "your kernel account holding a Sly NFT is worth real money — agents pay differently because of who they are"

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority |
|---|---|---|---|
| `pricing_policy` JSONB on x402_endpoints | ✅ Types | Types only | P1 |
| Pricing computed at request time | ❌ No | Server-only | - |
| Inspector showing price breakdown | ✅ Yes | dashboard | P2 |

## Scope

**In scope (v1):**

1. **`x402_endpoints.pricing_policy` JSONB** column. Schema:

   ```json
   {
     "kind": "score-gated",
     "tiers": [
       { "min_score": 900, "price_usdc": 0.50, "label": "trusted" },
       { "min_score": 700, "price_usdc": 5.00, "label": "established" },
       { "min_score": 500, "price_usdc": 50.00, "label": "new" }
     ],
     "below_min": "reject" | "allow" | "tenfold",
     "fallback_price_usdc": 5.00
   }
   ```

2. **Pricing service**: when an x402 request arrives, lookup buyer's composite score (Epic 63 reader) → match tier → return effective price in 402 challenge. ~50 LoC.

3. **Inspector UI**: in `apps/web` x402 endpoint detail, surface the per-tier pricing. In agentbazaar viewer, the milestone payload includes effective price + tier label.

4. **Demo scenario**: extend the existing Smith merchant or add a new "score-gated audit" merchant in agentbazaar that demonstrates the pricing on a live cycle.

**Out of scope:**

- Per-counterparty pricing (separate epic, see Epic 68)
- Dynamic / negotiated pricing (Epic 68)
- Per-marketplace pricing override (Epic 86 follow-up)

## Stories

Each story spec lives in its own file at [`./stories/epic-92/`](./stories/epic-92/). See [`./stories/README.md`](./stories/README.md) for the convention.

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [92.1](./stories/epic-92/story-92.1-pricing-policy-column.md) | `pricing_policy` JSONB Column on x402_endpoints | 3 | P0 | Planned |
| [92.2](./stories/epic-92/story-92.2-pricing-service-challenge.md) | Pricing Service + x402 Challenge Integration | 5 | P0 | Planned |
| [92.3](./stories/epic-92/story-92.3-inspector-tier-display.md) | Inspector — Pricing Tier Display | 3 | P1 | Planned |
| [92.4](./stories/epic-92/story-92.4-demo-score-gated-audit.md) | agentbazaar Demo Merchant — Score-Gated Audit | 3 | P1 | Planned |
| [92.5](./stories/epic-92/story-92.5-tests-tier-matching.md) | Tests — Tier Matching, Fallback, Reject | 3 | P0 | Planned |

**Total:** ~17 points across 5 stories.

## Definition of Done

- [ ] Score-gated pricing works end-to-end against a real agent's Sly composite score
- [ ] Demo merchant in agentbazaar shows different prices for high-score vs low-score agents
- [ ] Documentation: pricing policy schema reference

## References

- Epic 63 — External Reputation Bridge (composite score reader)
- Epic 68 — Flexible Skill Pricing (related pricing model work)
- Epic 79 — API Monetization Gateway (x402 endpoint infrastructure)
