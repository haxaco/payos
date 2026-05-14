# Epic 93: Reputation Receipts (Score-Feeder)

**Status:** Planned
**Phase:** TBD (Identity-First Demos)
**Priority:** P1
**Estimated Points:** 19 (narrowed from 37, scope cut 2026-05-14 — Epic 97 absorbs receipt primitive)
**Stories:** 5 (was 9)
**Dependencies:** Epic 97 (Proof of Work Foundation — receipt primitive, dispute primitive, verification endpoint), Epic 98 (On-Chain Anchoring — Merkle batches), Epic 63 (External Reputation Bridge), Epic 69 (A2A Result Acceptance — quality feedback ✅)
**Companion:** [`docs/prd/IDENTITY_AND_GOVERNANCE_STRATEGY.md`](../IDENTITY_AND_GOVERNANCE_STRATEGY.md) (four-primitive bet: score-feeder consumes proof-of-work receipts)
**Created:** May 2026 · **Scope cut:** May 14, 2026 (PM-review pass)

---

## Summary

Epic 97 produces the bilateral signed receipt primitive (and Epic 98 anchors it on-chain). **Epic 93's job is now exclusively to feed those receipts into a composite identity score** — the *score-feeder* role.

Demo punchline unchanged: a buyer can see "score: 850" AND drill down to the receipts (Epic 97) that derived it. The drill-down primitive lives in Epic 97; the scoring math and the agent-scoped surfacing live here.

## Motivation

After Epic 97 + 98 ship, agents have provable per-task non-repudiable receipts. Composite identity score (Epic 63) needs a deterministic way to consume those receipts into a single 0–1000 number that:

- Reproduces mechanically (any external verifier with the receipt list can recompute the score)
- Weights receipts by type, age decay, counterparty KYA tier, dispute resolution outcome, partial-settlement signal (Epic 69)
- Surfaces via REST + SDK + MCP at *agent-scope* (different from Epic 97's `GET /v1/receipts/:id`, which is receipt-scope)

## What this epic does NOT do (after the scope cut)

These now live in Epic 97 / Epic 98:

- ❌ `receipts` table — owned by Epic 97 (Story 97.2)
- ❌ Receipt generation hooks — owned by Epic 97 (Stories 97.8, 97.9, 97.14, 97.15, 97.16)
- ❌ Receipt signing service — owned by Epic 97 (Stories 97.5, 97.6)
- ❌ Daily on-chain Merkle rollup — owned by Epic 98 (Stories 98.1, 98.2, 98.6)
- ❌ Dispute primitive — owned by Epic 97 (Stories 97.12, 97.13)
- ❌ Public verification endpoint — owned by Epic 97 (Story 97.17)

Without this cut, Epic 93 would partially re-implement the Epic 97 primitives with subtly different semantics — a real risk for cryptographic divergence and audit confusion.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|---|---|---|---|---|
| `GET /v1/agents/:id/receipts` (agent-scope rollup) | ✅ Yes | `sly.agents` | P1 | Different from Epic 97's `sly.receipts.get()` — agent-scope, score-relevant filtering |
| `GET /v1/agents/:id/score` | ✅ Yes | `sly.agents` | P1 | Returns the composite score + per-component breakdown |
| MCP tool `sly_agent_receipts` | ✅ Yes | `mcp-server` | P2 | LLM agents query peer reputation |
| MCP tool `sly_agent_score` | ✅ Yes | `mcp-server` | P2 | |
| Inspector UI (agentbazaar viewer) | ❌ No | UI only | — | |

## Scope (after cut)

1. **Composite Score Reader — Receipt Component (Story 93.4).** Epic 63's composite score gets a new mechanical input: a weighted sum over Epic 97 receipts. Weights encode:
   - **Receipt type:** `delivered` > `auto_accepted` > `refunded` > `resolved_for_payee` > `resolved_for_payer` > `disputed_unresolved` > `abandoned`
   - **Age decay:** exponential half-life (default 90 days, configurable)
   - **Counterparty KYA tier:** higher-tier counterparties contribute more weight
   - **Partial-settlement signal:** from Epic 69's `a2a_task_feedback.satisfaction` field
   - **Anchored vs unanchored:** receipts anchored via Epic 98 weighted slightly higher (marginal nudge toward audit-grade evidence)

2. **Agent-scoped receipts REST surface (Story 93.6).** `GET /v1/agents/:id/receipts` — paginated, score-weighted, public-readable for agents with `discovery.public=true`. Distinct from Epic 97's `GET /v1/receipts/:id` (receipt-scope detail).

3. **Inspector — Receipt list in agentbazaar viewer (Story 93.7).** UI that surfaces the last N receipts with link-throughs to Epic 97's verify endpoint and Epic 98's on-chain inclusion proof. Implemented in `apps/web/` per CLAUDE.md.

4. **SDK + MCP score-feeder accessors (Story 93.8).** `sly.agents.getReceipts()`, `sly.agents.getScore()`, MCP tool `sly_agent_receipts`. Distinct from Epic 97's `sly.receipts.get()` — these are agent-scope, score-relevant filters.

5. **Tests — score-feeder layer only (Story 93.9).** Receipt-weighting math, age-decay function, score reproducibility (given the same receipt list, same score).

**Out of scope (unchanged from original):**

- Receipts for skills outside Sly (federated reputation)
- Receipts as transferable NFTs (each task as an NFT) — interesting future direction, not v1
- Selective disclosure (zero-knowledge proofs of partial reputation)

## Stories

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [93.4](./stories/epic-93/story-93.4-composite-score-reader.md) | Composite Score Reader — Receipt Component | 5 | P0 | Planned |
| [93.6](./stories/epic-93/story-93.6-rest-receipts-endpoint.md) | REST — `GET /v1/agents/:id/receipts` (agent-scope) | 3 | P0 | Planned |
| [93.7](./stories/epic-93/story-93.7-inspector-receipt-list.md) | Inspector — Receipt list in agentbazaar viewer | 5 | P1 | Planned |
| [93.8](./stories/epic-93/story-93.8-sdk-mcp-accessors.md) | SDK + MCP agent-scoped receipt accessors | 3 | P1 | Planned |
| [93.9](./stories/epic-93/story-93.9-tests-hooks-signatures-rollup.md) | Tests — score math + reproducibility + age decay | 3 | P0 | Planned |

**Total:** 19 points across 5 stories (was 37 / 9).

### Stories removed in the scope cut (absorbed by Epic 97 / 98)

| Removed | Original title | Now owned by |
|---|---|---|
| 93.1 | `reputation_receipts` Table Migration | [Epic 97 Story 97.2](./epic-97-proof-of-work-foundation.md) (`receipts` table) |
| 93.2 | Receipt Generation Hooks | [Epic 97 Stories 97.8/97.9/97.14/97.15/97.16](./epic-97-proof-of-work-foundation.md) (receipt assembler + protocol adapters) |
| 93.3 | Receipt Signing Service | [Epic 97 Stories 97.5/97.6](./epic-97-proof-of-work-foundation.md) (EIP-712 signing + KMS) |
| 93.5 | Daily On-Chain Merkle Rollup | [Epic 98 Stories 98.1/98.2/98.6](./epic-98-onchain-anchoring.md) (Merkle accumulator + anchor contract + batch worker) |

Each removed story's file at `./stories/epic-93/` is marked DEPRECATED with a redirect pointer.

## Definition of Done

- [ ] Composite score recomputes deterministically from a receipt list
- [ ] Agent-scoped REST endpoint serves score-weighted receipt rollups (different surface from Epic 97's `GET /v1/receipts/:id`)
- [ ] Agentbazaar inspector surfaces receipt history with link-throughs to Epic 97 verify + Epic 98 on-chain proof
- [ ] SDK + MCP expose agent-scoped accessors
- [ ] External verifier with the receipt list reproduces the same score (cryptographic + business-logic correctness)
- [ ] Original 93.1 / 93.2 / 93.3 / 93.5 story files marked DEPRECATED with redirect pointers
- [ ] Status updated to ✅ Complete in [`PRD_STATUS_MATRIX.md`](../PRD_STATUS_MATRIX.md)

## References

- **Epic 97 — Proof of Work Foundation** — receipt + dispute primitives (the substrate this epic consumes)
- **Epic 98 — On-Chain Anchoring** — Merkle batches (so score-feeder can include "anchored" as a weighting input)
- **Epic 63 — External Reputation Bridge** — the composite score this epic feeds into
- **Epic 69 — A2A Result Acceptance & Quality Feedback** ✅ — quality feedback signal (already used in Story 63.8 at 15% weight)
- **Epic 73 — KYA Tiers** ✅ — counterparty tier as a weighting input
