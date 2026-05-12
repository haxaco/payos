# Story 86.4: SDK Module — `@sly_ai/sdk` `marketplaces`

**Status:** Planned
**Linear:** SLY-541
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 86.3

---

Add a `marketplaces` namespace to `@sly_ai/sdk` (`packages/sdk/src/marketplaces.ts`) exposing `create`, `get`, `list`, `update`, `addAgent`, `removeAgent`, `listAgents`. Types live in `packages/types/src/index.ts` as a new `Marketplace`, `AgentMarketplace`, plus request/response shapes. Bump SDK version and prep for publish via `pnpm publish:sdk`.

## Acceptance

- [ ] Module exported from SDK root (`sly.marketplaces.create(...)` works)
- [ ] All seven REST endpoints have corresponding SDK methods
- [ ] Types exported from `@sly/types` (internal) and re-exported from `@sly_ai/sdk` (public)
- [ ] SDK README updated with a quickstart snippet
- [ ] Version bumped in `packages/sdk/package.json`

## Technical notes

Follow the existing `sly.agents` / `sly.x402` patterns — same fluent builder style, same error handling. The `marketplaces[]` field on agent records (Story 86.8 lands the data; this story lands the type) needs to be in the `Agent` type now to avoid a follow-up version bump.

## Dependencies

86.3.
