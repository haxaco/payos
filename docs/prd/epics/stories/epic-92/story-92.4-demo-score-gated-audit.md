# Story 92.4: agentbazaar Demo Merchant — Score-Gated Audit

**Status:** Planned
**Epic:** [Epic 92 — Score-Gated x402 Endpoints](../../epic-92-score-gated-x402-endpoints.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 92.2; existing marketplace-sim scaffolding

---

Add (or extend the existing Smith merchant in) `apps/marketplace-sim/src/scenarios/blocks/` to demonstrate score-gated pricing on a live cycle: one merchant endpoint, three buyer agents at different score tiers, they all hit the same endpoint, and the round viewer shows three distinct prices for the same call. The point is visual — the demo punchline of the epic.

## Acceptance

- [ ] New (or extended) scenario block writes a single x402 endpoint with a 3-tier `pricing_policy`
- [ ] Seeded buyers span all three tiers (one high-score, one mid, one new)
- [ ] Round viewer shows three distinct settlement prices for the same endpoint within one cycle
- [ ] Scenario runs cleanly under the existing `pnpm --filter @sly/marketplace-sim` harness

## Technical notes

Reuse existing persona seeding (`apps/marketplace-sim/scripts/seed-personas.ts`). If a fresh buyer's composite score isn't yet bootstrapped, seed `reputation_receipts` (Epic 93) directly or override via fixture. Mention this dependency in the scenario README.

## Dependencies

92.2; existing marketplace-sim scaffolding.
