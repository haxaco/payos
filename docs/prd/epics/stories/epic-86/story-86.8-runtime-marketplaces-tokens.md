# Story 86.8: Agentbazaar Runtime — `marketplaces[]` from `tokens.json`

**Status:** Planned
**Linear:** SLY-546
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 86.1, Story 86.3

---

Extend the agentbazaar runtime (`apps/marketplace-sim/`) to read `marketplaces[]` per agent from `tokens.json`. Persona seeding (`apps/marketplace-sim/scripts/seed-personas.ts`) writes membership for each agent. The runner (`apps/marketplace-sim/src/runner.ts`) and processors (`apps/marketplace-sim/src/processors/types.ts`) tag A2A task metadata with `buyer_marketplace_id`, `seller_marketplace_id`, and `cross_marketplace: bool` on send.

The scenarios (`a2a_x402_marketplace`, `concierge`, `resale_chain`) gain optional `marketplace` selectors so a round can be scoped to a single marketplace or run cross-marketplace.

## Acceptance

- [ ] `tokens.json` schema documents `marketplaces[]` field
- [ ] Seeder writes marketplace membership during persona creation
- [ ] A2A task metadata carries marketplace IDs on every send
- [ ] At least one scenario can run scoped to a single marketplace via config
- [ ] At least one demo round shows the same agent (e.g. concierge) active in two marketplaces — the proof point called out in the Definition of Done

## Technical notes

This is the agent-side complement to Story 86.7. The viewer filter only works if the runtime tags tasks correctly. Mock-then-real: seed personas can hardcode marketplace assignments in v1; later we'll drive from the API. The `cross_marketplace` flag is `buyer_marketplace_id !== seller_marketplace_id`, computed at send time.

## Dependencies

86.1, 86.3.
