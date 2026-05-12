# Epic 93: Reputation Receipts

**Status:** Planned
**Phase:** TBD (Identity-First Demos)
**Priority:** P1
**Dependencies:** Epic 63 (External Reputation Bridge), Epic 69 (A2A Result Acceptance), Epic 88 (MarketplaceRegistry — for hash refresh pattern)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md)
**Created:** May 2026

---

## Summary

Every successful A2A task completion, x402 settlement, and dispute resolution generates an attestation (a "reputation receipt") that compounds into the agent's composite identity score. Receipts are individually inspectable on-chain (or off-chain with cryptographic proof) and feed directly into Epic 63's composite score. Demo punchline: an agent's history is provably 100 successful code reviews, the buyer can verify it before hiring.

## Motivation

Composite identity score (Epic 63) today aggregates from coarse signals — KYA tier, ERC-8004 NFT base, age, activity. There's no fine-grained, per-task evidence. Two problems:

1. **Reputation is a black box.** A buyer can see "score: 850" but can't drill down to "why" — what tasks, what counterparties, what outcomes.
2. **Reputation can't be exported with cryptographic proof.** When an agent moves to a non-Sly host, they can claim "I've done 100 successful reviews" but can't prove it.

Reputation receipts solve both. Each successful interaction produces a signed attestation. The composite score is mechanically derived from the receipts. Anyone — Sly or external — can audit the receipt list and reproduce the score.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority |
|---|---|---|---|
| `GET /v1/agents/:id/receipts` | ✅ Yes | `sly.agents` | P1 |
| `GET /v1/agents/:id/receipts/:receiptId` | ✅ Yes | `sly.agents` | P1 |
| Receipt inclusion in agent inspector | ❌ No | UI only | - |
| MCP tool `sly_agent_receipts` | ✅ Yes | `mcp-server` | P2 |

## Scope

**In scope (v1):**

1. **`reputation_receipts` table**:

   ```sql
   CREATE TABLE reputation_receipts (
     id UUID PRIMARY KEY,
     agent_id UUID NOT NULL REFERENCES agents(id),
     counterparty_id UUID,           -- agent or merchant
     marketplace_id UUID,             -- Epic 86
     event_type TEXT NOT NULL,        -- 'a2a_completion' | 'x402_settle' | 'dispute_resolved'
     payload JSONB NOT NULL,          -- task id, score, comment, satisfaction, amount
     signature TEXT,                  -- signed by Sly platform key
     onchain_hash TEXT,               -- if rolled up on-chain
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Hooks** at receipt-generating events:
   - A2A task completion (Epic 69 acceptance flow already captures score + comment) → generate receipt
   - x402 settlement → generate receipt with amount + counterparty
   - Dispute resolution (Epic 14 / Epic 15) → generate receipt with outcome

3. **Composite score recomputation**: Epic 63's reader gets a new input — sum / weight receipts. Replace static "activity" component with receipt-based one.

4. **Periodic on-chain rollup** (optional, gas-bounded): a daily merkle root of new receipts is written to ERC-8004's `reputation_metadata` slot, so external readers can verify any individual receipt against the on-chain root.

5. **Public receipt list per agent**: `GET /v1/agents/:id/receipts?since=&limit=` — paginated, public-readable for agents with `discovery.public=true`.

6. **Inspector**: agent inspector in agentbazaar viewer shows last N receipts with link-throughs.

**Out of scope:**

- Receipts for skills outside Sly (federated reputation)
- Receipts as transferable NFTs (each task as an NFT) — interesting future direction, not v1
- Selective disclosure (zero-knowledge proofs of partial reputation)

## Stories

Each story spec lives in its own file at [`./stories/epic-93/`](./stories/epic-93/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: Receipt Generation & Storage — 18 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [93.1](./stories/epic-93/story-93.1-receipts-table.md) | `reputation_receipts` Table Migration | 3 | P0 | Planned |
| [93.2](./stories/epic-93/story-93.2-receipt-generation-hooks.md) | Receipt Generation Hooks | 5 | P0 | Planned |
| [93.3](./stories/epic-93/story-93.3-receipt-signing-service.md) | Receipt Signing Service | 5 | P0 | Planned |
| [93.4](./stories/epic-93/story-93.4-composite-score-reader.md) | Composite Score Reader — Receipt Component | 5 | P0 | Planned |

### Phase 2: On-Chain Anchoring & Surfaces — 19 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [93.5](./stories/epic-93/story-93.5-daily-merkle-rollup.md) | Daily On-Chain Merkle Rollup | 5 | P1 | Planned |
| [93.6](./stories/epic-93/story-93.6-rest-receipts-endpoint.md) | REST — `GET /v1/agents/:id/receipts` | 3 | P0 | Planned |
| [93.7](./stories/epic-93/story-93.7-inspector-receipt-list.md) | Inspector — Receipt List in agentbazaar Viewer | 5 | P1 | Planned |
| [93.8](./stories/epic-93/story-93.8-sdk-mcp-accessors.md) | SDK + MCP Receipt Accessors | 3 | P1 | Planned |
| [93.9](./stories/epic-93/story-93.9-tests-hooks-signatures-rollup.md) | Tests — Hooks, Signatures, Rollup | 3 | P0 | Planned |

**Total:** ~37 points across 9 stories.

## Definition of Done

- [ ] Receipts generated for every completed A2A task + every x402 settle + every dispute resolution
- [ ] Composite score derives mechanically from receipts (reproducible by an external verifier)
- [ ] Daily on-chain rollup live on Base Sepolia
- [ ] Agent inspector shows receipt history
- [ ] Documentation: receipt schema, signature verification, rollup spec

## References

- Epic 63 — External Reputation Bridge
- Epic 69 — A2A Result Acceptance & Quality Feedback
- Epic 73 — KYA Tiers (effective limits already use behavior signals)
