# Epic 98: On-Chain Anchoring ⛓️

**Status:** 📋 Pending — Committed (R3 of APoW Roadmap)
**Phase:** 5.5 (Trust & Verification Layer)
**Priority:** P1 — Upstream of portable reputation; required for "on-chain proof of work" claim
**Estimated Points:** ~50
**Stories:** 0/10 Complete
**Dependencies:** Epic 97 (Proof of Work Foundation — off-chain receipts must exist first), Epic 18 (Agent Wallets ✅), Epic 27 (Settlement ✅)
**Enables:** Portable reputation across marketplaces, Epic 99 (Trace anchoring), Mastercard Start Path "on-chain proof" requirement, regulator-engagement deals.
**Created:** May 14, 2026
**Companion:** [`APOW_RELEASE_ROADMAP.md`](../APOW_RELEASE_ROADMAP.md) R3, [`IDENTITY_AND_GOVERNANCE_STRATEGY.md`](../IDENTITY_AND_GOVERNANCE_STRATEGY.md)

[← Back to Epic List](./README.md)

---

## Executive Summary

Epic 97 produced bilateral signed receipts. Anyone can verify them — *if Sly is online to serve them*. If Sly is acquired, discontinued, or has an outage, the receipts lose their authoritative store. The cryptographic signatures still verify mathematically, but there is no canonical "this happened" registry independent of Sly's database.

Epic 98 closes that gap. A Merkle accumulator batches receipt hashes every ~60 seconds and posts the root to a Sly-owned anchor contract on Base. Each batched receipt also gets an EAS (Ethereum Attestation Service) attestation registered under a public schema. The verification endpoint extends to include an on-chain inclusion proof in its response.

After Epic 98, the marketing claim *"Sly is the trust layer for the agentic economy"* survives the *"what if Sly disappears"* objection. Receipts become portable beyond Sly's data layer.

This epic does **not** alter the data model produced by Epic 97. The `sly.receipt.v1`, `sly.mandate.v1`, `sly.policy_decision.v1`, `sly.dispute.v1` schemas are preserved verbatim. Epic 98 adds an anchoring layer on top.

---

## Strategic Context

### Why now (and not later)

The APoW Roadmap (R3) lists On-Chain Anchoring as a hard commit alongside Epic 97 because:

1. **Mastercard Start Path** return ask explicitly requested *"show us on-chain proof of governed transactions"* — a single piece of feedback that converts the anchoring layer from "future" to "near-term sales gate."
2. **Crypto-native enterprise prospects** (Coinbase, Circle partners) treat on-chain anchoring as the credibility marker. R2 alone (Epic 97 — bilateral but Sly-stored) is a half-claim: *"witness mode but signed."* That's vulnerable to *"what if Sly is the single point of failure"* objections.
3. **Regulator engagement** (TBD jurisdictions) increasingly requires the ability to demonstrate transactions on a public chain.

### Why ~60s batching (not per-tx anchoring)

Per-receipt anchoring is uneconomic at any meaningful x402/MPP volume (~$0.005–$0.02 per write on Base depending on gas conditions). Per-call anchoring would also bottleneck on Base block time (~2s) and gas auctions. Merkle accumulation collapses 1,000+ receipts into one root → one anchor write → portable proof at ~constant cost.

Trade-off: a receipt is only on-chain after the next batch lands. The verification endpoint reports two states for each receipt — *off-chain verified* (immediate, Epic 97) and *on-chain anchored* (after batch lands). Both are valid; the user picks the threshold appropriate to their audit posture.

### What this epic does NOT do

- Does not deploy a Sly-owned Layer 2 or appchain. Anchoring goes to Base (Coinbase L2 — mainnet 8453, Sepolia 84532), same network already used for x402 settlement.
- Does not introduce a new token. The anchor contract is non-custodial state storage; no value lives in it.
- Does not change Epic 97's signing model. The parties' Circle wallet signatures (secp256k1, EIP-712) remain the source of authenticity.
- Does not produce trace structures (Epic 99) or oracle/verifier protocols (Epic 100).
- Does not retroactively re-sign pre-Epic-97 HMAC JWTs. Backfill (story 98.10) anchors only Epic-97-shape receipts.

### Coexistence with Epic 97

| Layer | Produced by | Authenticity check | Latency to anchor |
|-------|-------------|--------------------|--------------------|
| Receipt object (Epic 97) | Parties' Circle wallets | EIP-712 signature verify | Immediate (off-chain) |
| Merkle batch (Epic 98) | Sly batching service | Merkle proof against on-chain root | ~60s |
| Anchor write (Epic 98) | Sly anchor key on Base | On-chain `eth_call` to `getRoot()` | ~2s after batch close (Base block time) |
| EAS attestation (Epic 98) | EAS service contract | EAS `getAttestation()` | Same as anchor write |

The verification endpoint extension (Story 98.5) reports all four states in a single response.

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `GET /v1/anchors/:batch_id` | ✅ Yes | `sly.anchors` | P0 | Retrieve batch info + tx hash |
| `GET /v1/anchors/proof/:receipt_id` | ✅ Yes | `sly.anchors` | P0 | Merkle proof for a receipt |
| `GET /v1/verify/:receipt_id` (extended) | ✅ Yes | `sly.verify` | P0 | Includes on-chain inclusion check |
| `sly.anchors.verifyOnChain(receipt_id)` | ✅ Yes | `sly.anchors` | P0 | Client-side verify against Base RPC |
| Merkle accumulator | ❌ No | — | — | Internal worker |
| Anchor contract write | ❌ No | — | — | Internal service |
| EAS schema registration | ❌ No | — | — | One-time deployment |

**SDK Stories Required:**
- [ ] Story 36.X7: Add `anchors` module to `@sly/sdk`
- [ ] Story 36.X8: Extend `verify` module with on-chain inclusion check
- [ ] Story 36.X9: MCP tools for `get_anchor`, `verify_on_chain`

---

## Core Architectural Decision

**Before this epic:** Receipts produced by Epic 97 live in `receipts` table. Verification chain stops at Sly's database read.

**After this epic:** Receipt's `mandate_hash + receipt_id + dual_signature_hash` lands as a leaf in a Merkle tree. Tree root is posted to a Sly Anchor Contract on Base. Anyone with the receipt + a Merkle proof can verify against `eth_call(anchorContract.roots(batchId))` without trusting Sly's API.

**Implementation consequence:** Every receipt produced by Epic 97 inherits a future "anchored" state. The receipt row gets two new columns at write time: `pending_anchor_batch_id` (filled by the batcher) and `anchored_at` (filled when the batch lands on-chain). The on-chain anchor itself is queried via the existing Base RPC connection (`apps/api/src/services/chain/base-client.ts` from Epic 38) — no new chain client is provisioned.

---

## Data Model

### Schema Additions (no breaking changes to Epic 97)

```sql
-- New columns on existing receipts table
ALTER TABLE receipts
  ADD COLUMN pending_anchor_batch_id BIGINT REFERENCES anchor_batches(id),
  ADD COLUMN anchored_at TIMESTAMPTZ;

CREATE INDEX idx_receipts_pending_anchor ON receipts (pending_anchor_batch_id)
  WHERE pending_anchor_batch_id IS NOT NULL;

-- New table: anchor_batches
CREATE TABLE anchor_batches (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,  -- nullable: Sly aggregates cross-tenant for efficiency
  batch_hash BYTEA NOT NULL,           -- Merkle root, 32 bytes
  receipt_count INT NOT NULL,
  dispute_count INT NOT NULL,
  policy_decision_count INT NOT NULL,
  earliest_leaf_ts TIMESTAMPTZ NOT NULL,
  latest_leaf_ts TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'sealed', 'submitted', 'confirmed', 'failed')),
  tx_hash BYTEA,                       -- Base tx hash, 32 bytes
  block_number BIGINT,
  block_timestamp TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  gas_used BIGINT,
  retry_count INT NOT NULL DEFAULT 0,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anchor_batches_status ON anchor_batches (status);
CREATE INDEX idx_anchor_batches_confirmed_at ON anchor_batches (confirmed_at);

-- New table: anchor_leaves (per-receipt entry in a batch)
CREATE TABLE anchor_leaves (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES anchor_batches(id),
  leaf_type TEXT NOT NULL CHECK (leaf_type IN ('receipt', 'dispute', 'policy_decision')),
  source_id UUID NOT NULL,             -- FK to receipts.id, disputes.id, or policy_decisions.id
  leaf_hash BYTEA NOT NULL,            -- 32 bytes — the leaf value in the tree
  leaf_index INT NOT NULL,             -- position in the batch (for proof construction)
  eas_uid BYTEA,                       -- EAS attestation UID once registered
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, leaf_index),
  UNIQUE(leaf_type, source_id)         -- one anchoring per source object
);

CREATE INDEX idx_anchor_leaves_source ON anchor_leaves (leaf_type, source_id);
CREATE INDEX idx_anchor_leaves_batch ON anchor_leaves (batch_id, leaf_index);
```

### Anchor Contract (Base, Solidity)

```solidity
// SlyAnchor.sol — minimal anchor contract
pragma solidity ^0.8.20;

contract SlyAnchor {
    address public owner;                    // Sly-owned EOA from KMS (per environment)
    address public pendingOwner;             // 2-step ownership transfer
    mapping(uint256 => bytes32) public roots; // batchId → merkle root
    mapping(uint256 => uint64) public timestamps; // batchId → block timestamp

    uint256 public nextBatchId;

    event RootSubmitted(
        uint256 indexed batchId,
        bytes32 root,
        uint32 leafCount,
        uint64 earliestLeafTs,
        uint64 latestLeafTs
    );

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    function submitRoot(
        bytes32 root,
        uint32 leafCount,
        uint64 earliestLeafTs,
        uint64 latestLeafTs
    ) external onlyOwner returns (uint256 batchId) {
        batchId = nextBatchId++;
        roots[batchId] = root;
        timestamps[batchId] = uint64(block.timestamp);
        emit RootSubmitted(batchId, root, leafCount, earliestLeafTs, latestLeafTs);
    }

    function getRoot(uint256 batchId) external view returns (bytes32) {
        return roots[batchId];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
    }
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "not pending owner");
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}
```

**Deployment targets:**
- Sandbox: Base Sepolia (`84532`)
- Production: Base mainnet (`8453`)
- Owner key: Sly KMS-managed EOA (separate per environment per Epic 67 isolation rules)

### EAS Schema Registration

Three new EAS schemas, registered once via [easscan.org](https://easscan.org):

```text
sly.receipt.v1
  bytes32 receiptId, bytes32 mandateHash, bytes32 policyDecisionHash,
  bytes32 batchRoot, uint256 anchoredAt

sly.dispute.v1
  bytes32 disputeId, bytes32 receiptId, bytes32 batchRoot, uint256 anchoredAt

sly.policy_decision.v1
  bytes32 decisionId, bytes32 mandateHash, bytes32 batchRoot, uint256 anchoredAt
```

Each schema is non-revocable and resolves to the Sly anchor contract for cross-reference. Schema UIDs captured in `apps/api/src/services/anchor/eas-schemas.ts` at deployment time.

---

## Architecture

### Anchoring Pipeline

```
                  Epic 97 produces receipt
                          │
                          ▼
              ┌───────────────────────────┐
              │ receipt.terminal_state    │
              │ transitions to terminal   │
              │ (delivered, etc.)         │
              └─────────────┬─────────────┘
                            │ trigger
                            ▼
              ┌───────────────────────────┐
              │ Accumulator (98.1)         │
              │ leaf_hash =                │
              │   keccak256(canonicalHash) │
              │ Append to anchor_leaves    │
              │ Tag with current open      │
              │ batch_id                   │
              └─────────────┬─────────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
            (every ~60s)        (immediately)
                  │                   │
                  ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Batch Closer     │  │ Verify response  │
        │ (98.6)           │  │ reports          │
        │ Seal batch       │  │ "pending anchor" │
        │ Compute root     │  └──────────────────┘
        │ status=sealed    │
        └─────────┬────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ On-chain Writer  │
        │ (98.2 contract)  │
        │ submitRoot(...)  │
        │ status=submitted │
        └─────────┬────────┘
                  │ tx confirmed
                  ▼
        ┌──────────────────┐
        │ Confirmation     │
        │ Watcher          │
        │ status=confirmed │
        │ Update receipts. │
        │ anchored_at      │
        └─────────┬────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ EAS Registrar    │
        │ (98.3)           │
        │ Register one     │
        │ attestation per  │
        │ leaf             │
        └──────────────────┘
```

### Existing Infrastructure Reused

| Component | Location | Reuse |
|-----------|----------|-------|
| Base RPC client | `apps/api/src/services/chain/base-client.ts` (Epic 38) | Anchor reads + writes |
| Tx signer | `apps/api/src/services/wallets/circle-service.ts` (Epic 40) or KMS (Epic 67) | Sign anchor txs from Sly-owned EOA |
| Receipt assembler | `apps/api/src/services/receipts/assembler.ts` (Epic 97) | Hook into receipt-terminal event |
| Webhook delivery | `apps/api/src/services/webhooks/` (Epic 17) | Notify subscribers when receipt anchored |
| `@sly/sdk` | `packages/sdk/` (Epic 36) | Add anchors + extended verify modules |
| Public verify endpoint | `apps/api/src/routes/verify.ts` (Epic 97 Story 97.10) | Extend response shape |

### Batch Cadence & Failure Modes

**Cadence:** Batch closer wakes every 60s (configurable via `ANCHOR_BATCH_INTERVAL_MS`). If batch has zero leaves, skip (don't waste gas). If batch exceeds 1,024 leaves before the timer fires, force-close early (Merkle tree depth cap to keep proof size <1 KB).

**Failure modes & responses:**
- *Gas spike on Base*: batch sits in `sealed` state, retried with EIP-1559 fee bumping every 30s for up to 10 retries; after that, alert + manual review.
- *RPC outage*: same as gas spike; the retry loop is idempotent (same root, same nonce).
- *EAS contract unavailable*: anchor write succeeds, EAS registration deferred to a separate worker; receipt is considered anchored as soon as `submitRoot` confirms; EAS adds queryability but isn't on the critical path.
- *Receipt produced after batch sealed*: lands in the next open batch (normal flow).

---

## Stories

### Phase 2a — Schema & Accumulator (16 points)

---

### Story 98.1: Merkle Accumulator + `anchor_batches` / `anchor_leaves` Schema

**Points:** 8
**Priority:** P0
**Dependencies:** Epic 97 (✅ at time of Epic 98 start)

**Description:**
Database schema for batch + leaf storage plus the in-process accumulator. Accumulator subscribes to the receipt-terminal event from Epic 97's assembler, computes the canonical leaf hash, and appends to the currently open batch row. Pure data layer + event handler — no on-chain interaction in this story.

**Acceptance Criteria:**
- [ ] Migration creates `anchor_batches`, `anchor_leaves` tables with full column set per data model section
- [ ] RLS: read scoped by tenant via JOIN through `anchor_leaves.source_id`; write restricted to service role
- [ ] Trigger blocks any UPDATE on `anchor_leaves` after insert (append-only)
- [ ] Trigger blocks UPDATE on `anchor_batches.batch_hash` after status moves past `open`
- [ ] `Accumulator.appendLeaf(leafType, sourceId, canonicalHash)` is idempotent: same source twice = single row
- [ ] Receipt assembler emits `receipt.terminal` event when row's `terminal_state` transitions; accumulator consumes
- [ ] `receipts` table gets new columns `pending_anchor_batch_id`, `anchored_at` (nullable, set by batcher)
- [ ] Indexes per data model section
- [ ] Unit tests: 1,000 sequential leaves land in one batch in append order; concurrent leaves serialize via row-level lock on the open batch

**SDK Exposure:**
- **Needs SDK exposure?** No (data layer, internal)

**Files to Create:**
- `apps/api/supabase/migrations/XXX_anchor_schema.sql`
- `apps/api/src/services/anchor/accumulator.ts`
- `packages/types/src/anchor/leaf.ts`
- `packages/types/src/anchor/batch.ts`

**Files to Modify:**
- `apps/api/src/services/receipts/assembler.ts` (emit terminal event)

---

### Story 98.2: Sly Anchor Contract on Base (Audited Solidity)

**Points:** 10
**Priority:** P0
**Dependencies:** None (independent)

**Description:**
Deploy the `SlyAnchor` contract to Base Sepolia (sandbox) and Base mainnet (production). Audit prerequisite: the contract surface area is tiny (<100 lines) but it stores Sly's authoritative state, so a third-party audit is non-negotiable before production deployment. Use a Sly-owned EOA from KMS as the initial owner; document the 2-step ownership transfer flow.

**Acceptance Criteria:**
- [ ] Contract code at `contracts/SlyAnchor.sol` matches the spec in the Data Model section
- [ ] Foundry tests cover: only-owner gate, batch ID monotonicity, root mapping correctness, ownership transfer flow
- [ ] Slither + Mythril static analysis clean
- [ ] Third-party audit completed (single firm; one round of remediation acceptable)
- [ ] Deployed to Base Sepolia at `0x...` (record in `apps/api/src/services/anchor/addresses.ts`)
- [ ] Deployed to Base mainnet at `0x...`
- [ ] Owner keys provisioned in KMS: `sly-anchor-owner-sandbox`, `sly-anchor-owner-prod`
- [ ] Verified on BaseScan for both networks
- [ ] Deployment runbook in `docs/runbooks/anchor-deploy.md` covers key rotation, ownership transfer, contract upgrade strategy (the contract is intentionally non-upgradeable; if a redesign is needed, deploy v2 and operate both)

**SDK Exposure:**
- **Needs SDK exposure?** No (contract addresses surface via SDK in 98.8)

**Files to Create:**
- `contracts/SlyAnchor.sol`
- `contracts/test/SlyAnchor.t.sol`
- `contracts/script/Deploy.s.sol`
- `apps/api/src/services/anchor/addresses.ts`
- `docs/runbooks/anchor-deploy.md`

**Files to Modify:**
- `package.json` (foundry script wrappers)

---

### Phase 2b — On-Chain Writes (16 points)

---

### Story 98.3: EAS Schema Registration

**Points:** 5
**Priority:** P0
**Dependencies:** Story 98.2 (anchor contract deployed)

**Description:**
Register three EAS schemas — `sly.receipt.v1`, `sly.dispute.v1`, `sly.policy_decision.v1` — on Base Sepolia and Base mainnet via easscan.org. Capture the resulting schema UIDs and bake them into the codebase as constants. EAS is non-revocable: register once per network, never mutate.

**Acceptance Criteria:**
- [ ] Three schemas registered on Base Sepolia, UIDs recorded
- [ ] Same three schemas registered on Base mainnet, UIDs recorded
- [ ] `eas-schemas.ts` exports all six UIDs (3 schemas × 2 networks)
- [ ] Resolver address per schema points to `SlyAnchor` for cross-reference (so a third party reading EAS can locate the anchor batch)
- [ ] Documentation: how to register additional schemas in the future (e.g., when Epic 99 / 100 ship trace + verifier schemas)

**SDK Exposure:**
- **Needs SDK exposure?** Schema UIDs exposed as `sly.anchors.SCHEMA_UIDS` constant for downstream consumers

**Files to Create:**
- `apps/api/src/services/anchor/eas-schemas.ts`

**Files to Modify:**
- `packages/sdk/src/anchors/constants.ts`

---

### Story 98.4: Merkle Proof Generator + Verifier

**Points:** 5
**Priority:** P0
**Dependencies:** Story 98.1

**Description:**
Pure-function library (no I/O, no DB) that builds a Merkle proof for a leaf inside a batch and verifies a proof against a root. Used by the public verification endpoint and by the SDK's client-side verifier. Reference implementation: OpenZeppelin Merkle library (sorted pair hashing); choose this to match what auditors will expect.

**Acceptance Criteria:**
- [ ] `MerkleTree.build(leafHashes: Buffer[]) → { root, proofs }` returns root and per-leaf proof
- [ ] `MerkleTree.verify(leaf: Buffer, proof: Buffer[], root: Buffer) → boolean`
- [ ] Hashing matches OpenZeppelin `_efficientHash` (sorted pair)
- [ ] Tree handles 1, 2, 1024 leaves without edge-case bugs
- [ ] Test vectors match a reference implementation (viem/ethers-rs)
- [ ] Performance: 1,024-leaf tree builds in <100ms on a typical Fluid Compute instance

**SDK Exposure:**
- **Needs SDK exposure?** Yes — bundled into `@sly/sdk/anchors`

**Files to Create:**
- `packages/utils/src/merkle/tree.ts`
- `packages/utils/src/merkle/verify.ts`
- `packages/utils/src/merkle/index.ts`

**Files to Modify:**
- `packages/utils/src/index.ts`

---

### Story 98.5: Verification Endpoint Extension (On-Chain Inclusion Check)

**Points:** 3
**Priority:** P0
**Dependencies:** Story 98.2, Story 98.4

**Description:**
Extend Epic 97's public `GET /v1/verify/:receipt_id` endpoint to include on-chain inclusion proof when the receipt is anchored. Response shape adds `onChain` object; when receipt is unanchored, that object is `{ status: 'pending', estimatedReadyAt: <ts> }`.

**Acceptance Criteria:**
- [ ] Response shape extension is purely additive (no breaking changes to Epic 97 clients)
- [ ] When receipt anchored: response includes `onChain.batchId`, `onChain.merkleRoot`, `onChain.merkleProof`, `onChain.anchorContractAddress`, `onChain.txHash`, `onChain.blockNumber`, `onChain.easUid`
- [ ] When receipt not yet anchored: `onChain.status='pending'`, `onChain.estimatedReadyAt` based on next batch close time
- [ ] Endpoint remains unauthenticated (regulators / auditors can query without API key)
- [ ] Rate limit: 30 req/min per IP (stricter than the global 100/min — flag from Epic 97 review)
- [ ] Caching: 5-minute CDN cache once `onChain.status='anchored'` (response is immutable after anchoring)

**SDK Exposure:**
- **Needs SDK exposure?** Yes — `sly.verify.get(receipt_id)` returns extended response

**Files to Create:**
- None

**Files to Modify:**
- `apps/api/src/routes/verify.ts`
- `apps/api/src/services/verify/builder.ts`
- `apps/api/src/middleware/rate-limit.ts` (add stricter rule for `/v1/verify/*`)
- `packages/types/src/proof-of-work/verify-response.ts`

---

### Phase 2c — Pipeline Workers (13 points)

---

### Story 98.6: Batch Closer + On-Chain Writer Worker

**Points:** 5
**Priority:** P0
**Dependencies:** Story 98.1, Story 98.2, Story 98.4

**Description:**
Two coordinating workers. Batch closer wakes every 60s, seals the open batch (status `open` → `sealed`), computes the Merkle root, and writes it to `anchor_batches.batch_hash`. On-chain writer picks up sealed batches, calls `submitRoot` on the anchor contract, marks `status=submitted` with the returned tx hash, and a separate confirmation watcher transitions to `status=confirmed` after N confirmations.

**Acceptance Criteria:**
- [ ] Batch closer is idempotent (running twice on the same open batch is a no-op after seal)
- [ ] Empty-batch skip (no leaves → don't waste gas)
- [ ] Force-close on leaf-count cap (1,024 leaves)
- [ ] On-chain writer uses EIP-1559 fees, bumps fee 20% per retry, max 10 retries over ~5 minutes
- [ ] Confirmation watcher requires 3 confirmations on Base before marking `confirmed`
- [ ] Failed batch (10 retries exhausted) sets `status=failed`, fires PagerDuty alert, leaves accumulator state untouched (leaves stay anchored to the same batch_id; next batch will pick up new leaves)
- [ ] Metrics: batch_close_duration_ms, on_chain_tx_duration_ms, gas_used per batch
- [ ] Worker graceful shutdown on SIGTERM (Fluid Compute friendly)

**SDK Exposure:**
- **Needs SDK exposure?** No (internal worker)

**Files to Create:**
- `apps/api/src/workers/anchor-batch-closer.ts`
- `apps/api/src/workers/anchor-onchain-writer.ts`
- `apps/api/src/workers/anchor-confirmation-watcher.ts`

**Files to Modify:**
- `apps/api/src/index.ts` (register workers on boot)

---

### Story 98.7: Anchor Contract Deployment Runbook + Key Management

**Points:** 3
**Priority:** P0
**Dependencies:** Story 98.2

**Description:**
Operational documentation + IaC for anchor contract lifecycle. Covers initial deployment, ownership transfer, key rotation (KMS key version bump), failure-recovery scenarios, and contract-version migration strategy (the anchor contract is non-upgradeable; if it must change, v2 is deployed and the system writes to both for a transition window).

**Acceptance Criteria:**
- [ ] Runbook at `docs/runbooks/anchor-deploy.md` covers: initial deploy, ownership transfer (2-step), KMS key rotation, gas-spike incident response, contract retirement
- [ ] Terraform module deploys KMS keys, IAM roles, monitoring/alerting (PagerDuty integration)
- [ ] Recovery scenario: if anchor key is compromised, document the exact ownership-transfer procedure that minimizes downtime (current `submitRoot` calls would fail until ownership transfers)
- [ ] Disaster-recovery scenario: if Base goes down for >24h, document the operational posture (receipts stay in `pending_anchor`; verification endpoint reports `pending`; no data loss; resumes on Base recovery)

**SDK Exposure:** No (ops only)

**Files to Create:**
- `docs/runbooks/anchor-deploy.md`
- `terraform/anchor/main.tf`
- `terraform/anchor/variables.tf`

**Files to Modify:**
- `docs/runbooks/README.md` (index)

---

### Phase 2d — SDK + Verification (10 points)

---

### Story 98.8: SDK `sly.anchors` + Extended `sly.verify` Modules

**Points:** 5
**Priority:** P0
**Dependencies:** Story 98.4, Story 98.5

**Description:**
Two new/extended modules in `@sly/sdk`. `sly.anchors` exposes batch and proof retrieval. `sly.verify` extends to include client-side on-chain inclusion check (the SDK can do this without trusting Sly's API by reading the anchor contract directly via Base RPC).

**Acceptance Criteria:**
- [ ] `sly.anchors.getBatch(batchId)` returns batch + tx hash + block info
- [ ] `sly.anchors.getProof(receiptId)` returns Merkle proof for a receipt
- [ ] `sly.anchors.verifyOnChain(receiptId, opts?)` — opts can supply a custom Base RPC URL; SDK reads `getRoot(batchId)` on-chain and verifies the Merkle proof locally without calling Sly's verify endpoint
- [ ] `sly.verify.get(receiptId)` returns the extended response shape from Story 98.5
- [ ] TypeScript types generated; zero `any`
- [ ] Examples in `packages/sdk/examples/verify-onchain.ts`
- [ ] Vitest suite includes a fixture chain (anvil) + a test vector for deterministic verification

**SDK Exposure:** This story IS the SDK exposure.

**Files to Create:**
- `packages/sdk/src/anchors/index.ts`
- `packages/sdk/src/anchors/types.ts`
- `packages/sdk/src/anchors/onchain.ts`
- `packages/sdk/examples/verify-onchain.ts`

**Files to Modify:**
- `packages/sdk/src/verify/index.ts` (extended response shape)
- `packages/sdk/src/index.ts`

---

### Story 98.9: Integration Tests — Full Off-Chain → On-Chain → Verify Roundtrip

**Points:** 3
**Priority:** P0
**Dependencies:** All preceding 98.* stories

**Description:**
End-to-end integration test that produces a receipt via Epic 97's flow, waits for it to be anchored, verifies on-chain inclusion via the SDK, and verifies via the public verify endpoint. Runs against a local anvil fork of Base. Forms the regression backstop for any future change to Epic 97 or 98.

**Acceptance Criteria:**
- [ ] `tests/integration/anchor-roundtrip.test.ts` exists and passes in CI
- [ ] Test: spin up anvil, deploy SlyAnchor contract, create receipt via Epic 97 flow, force-close batch via worker hook, verify on-chain
- [ ] Test: 100 receipts batched into a single anchor; all 100 produce valid Merkle proofs
- [ ] Test: receipt produced after batch sealed lands in next batch (state machine correctness)
- [ ] Test: SDK `verifyOnChain` returns true for anchored receipts, false for tampered ones
- [ ] Test runtime <60s

**SDK Exposure:** No

**Files to Create:**
- `apps/api/tests/integration/anchor-roundtrip.test.ts`
- `apps/api/tests/helpers/anvil-helpers.ts`

**Files to Modify:**
- `apps/api/vitest.config.ts` (if needed for anvil fixture)

---

### Story 98.10: Backfill — Anchor Existing Epic 97 Receipts

**Points:** 3
**Priority:** P1
**Dependencies:** All preceding stories

**Description:**
One-time migration that takes all receipts produced after Epic 97 ships but before Epic 98's pipeline goes live, hashes them, and feeds them into the accumulator. Receipts ship in batches of ~512 to amortize gas. Idempotent — can be re-run if it fails mid-way.

**Acceptance Criteria:**
- [ ] Script `apps/api/scripts/anchor-backfill.ts` reads all receipts with `pending_anchor_batch_id IS NULL AND anchored_at IS NULL AND terminal_state IS NOT NULL`
- [ ] Streams receipts through the accumulator in chronological order
- [ ] Respects the standard batch close cadence (no special "mega-batch")
- [ ] Dry-run mode: report count + estimated batch count without writing
- [ ] Production-run mode: actually feeds the accumulator
- [ ] Logging: per-batch summary written to stdout for audit
- [ ] Idempotent re-run: receipts already accumulated are skipped via the unique constraint on `(leaf_type, source_id)`

**SDK Exposure:** No (one-off script)

**Files to Create:**
- `apps/api/scripts/anchor-backfill.ts`

**Files to Modify:**
- None

---

## Definition of Done — Epic Level

- [ ] All 10 stories complete
- [ ] Anchor contract deployed and verified on Base Sepolia + Base mainnet
- [ ] Three EAS schemas registered on both networks
- [ ] Integration test (98.9) passes in CI on every PR
- [ ] Backfill (98.10) run for production; zero unanchored terminal receipts
- [ ] Verification endpoint (Story 98.5) returns extended response for at least 100 distinct anchored receipts in production
- [ ] Operational runbook (98.7) reviewed by Diego + on-call rotation
- [ ] SDK release: `@sly/sdk@0.X.0` with `anchors` module, published to npm
- [ ] Status updated to ✅ Complete in [`PRD_STATUS_MATRIX.md`](../PRD_STATUS_MATRIX.md)
- [ ] Master PRD bumped to v1.29 with completion entry

---

## Open Questions

1. **Audit firm:** Spearbit / OpenZeppelin / Trail of Bits? Story 98.2 stalls without this decision. Recommendation: shortest-path firm; the surface area is small enough that engagement should be <2 weeks.
2. **Anchor batch retention:** Do we keep the full leaves table indefinitely (storage cost on Supabase grows linearly), or expire leaves after a configurable retention window (proofs become unverifiable but on-chain root persists)? Recommendation: keep indefinitely; storage is cheap, audit posture matters more.
3. **EAS resolver:** Should the resolver enforce a write-through to anchor contract (rejecting EAS attestations that don't match an on-chain root)? Recommendation: yes; prevents misuse of the schema by third parties.
4. **Multi-chain future:** Do we anchor to anything other than Base? Today, no. The Anchor contract is Solidity, easy to deploy to any EVM chain. Cross-chain anchoring is parked until a buyer requires it.
