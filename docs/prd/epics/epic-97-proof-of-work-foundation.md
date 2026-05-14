# Epic 97: Proof of Work Foundation 🧾

**Status:** 📋 Pending
**Phase:** 5.5 (Trust & Verification Layer)
**Priority:** P0 — Foundational primitive upstream of Epics 92, 93, 94, 95
**Estimated Points:** 76
**Stories:** 0/19 Complete
**Dependencies:** Epic 18 (Agent Wallets ✅), Epic 17 (Multi-Protocol Gateway ✅), Epic 27 (Settlement ✅), Epic 36 (SDK ✅)
**Enables:** Epic 93 (Reputation Receipts), Epic 92 (Score-Gated x402), Epic 95 (Agent FICO), Epic 98 (On-Chain Anchoring, future), Epic 99 (Trace, future)
**Created:** May 13, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Today every "proof" Sly emits is signed by Sly itself via HMAC. The x402 JWT, the dispute state record, the audit log — all attest "Sly says this happened." This is the wrong trust model for the product Sly is selling. The pitch deck says bilateral, double-blind, non-repudiable proof of work. The shipped code does not deliver that.

Epic 97 closes the gap. It introduces four primitive signed objects — `Receipt`, `Mandate`, `PolicyDecision`, `Dispute` — produced as EIP-712 typed structures signed by the actual parties using their Circle Programmable Wallets (Epic 18). Sly's role downgrades from "signer of truth" to "policy gate, witness, and assembler." The HMAC JWT survives as an internal hot-path optimization but is no longer the canonical attestation.

This epic ships only the off-chain layer: schemas, signing, assembly, dispute, off-chain verification endpoint. On-chain anchoring (Merkle batches, Base anchor contract, EAS attestations) is intentionally deferred to Epic 98. Receipts produced here are forward-compatible with the on-chain layer with no schema changes.

This is the substrate Epic 93 (Reputation Receipts) consumes. Without Epic 97, Epic 93 ships a thin per-task attestation that does not deliver the full bilateral state machine, dispute linkage, or replayable verification described in external positioning.

---

## Strategic Context

### Why a separate P0 epic and not an expansion of Epic 93

Epic 93 in v1.27 is positioned as a Track B "amplifier" feeding a composite identity score. It is 37 points, P1. As scoped it cannot deliver:

- Bilateral state machine with all terminal states (delivered, auto-accepted, abandoned, unconfirmed, disputed)
- First-class signed `Mandate` primitive distinct from the receipt
- First-class signed `PolicyDecision` artifact linked to the receipt by hash
- Dispute attestation primitive replacing today's basic state tracker
- Off-chain verification endpoint that runs the full check chain independent of Sly
- Protocol adapter refactor (x402, AP2, ACP, UCP, MPP) so every settled payment emits a receipt

These are foundational. They belong upstream of any consumer of the receipt artifact. Epic 93 stays narrow (the score-feeder role) once Epic 97 ships the primitive.

### Positioning relative to v1.27 Track A and Track B

| Track | Wedge | Role of Epic 97 |
|-------|-------|-----------------|
| Track A — Marketplaces platform (Epics 86–91) | Marketplaces as first-class entities + KYM | Receipts produced inside any marketplace prove what happened, portable across marketplaces |
| Track B — Identity-first amplifiers (Epics 92–96) | Portable agentic identity | Receipts are the raw event stream that feeds composite identity score |
| **Epic 97 — Proof of Work Foundation** | **Bilateral non-repudiable attestation** | **Substrate both tracks depend on** |

### What this epic does NOT do

- Does not anchor receipts on-chain (Epic 98)
- Does not produce Merkle batches or EAS attestations (Epic 98)
- Does not introduce a meta-Trace structure with intent + plan + discovery + selection (Epic 99)
- Does not build oracle/verifier-agent infrastructure (Epic 100, network/GTM)
- Does not replace the existing HMAC JWT in the x402 hot path (kept as internal optimization)
- Does not introduce Cedar; integrates with existing JSONB+Zod policy engine from Epic 18

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/mandates` | ✅ Yes | `sly.mandates` | P0 | Create and sign mandate |
| `GET /v1/mandates/:id` | ✅ Yes | `sly.mandates` | P0 | Retrieve mandate |
| `POST /v1/mandates/:id/revoke` | ✅ Yes | `sly.mandates` | P0 | Revoke before expiry |
| `GET /v1/receipts/:id` | ✅ Yes | `sly.receipts` | P0 | Retrieve full receipt bundle |
| `POST /v1/receipts/:id/counter-sign` | ✅ Yes | `sly.receipts` | P0 | Payer counter-signs |
| `GET /v1/receipts` | ✅ Yes | `sly.receipts` | P0 | List receipts with filters |
| `POST /v1/disputes` | ✅ Yes | `sly.disputes` | P0 | File signed dispute |
| `POST /v1/disputes/:id/respond` | ✅ Yes | `sly.disputes` | P0 | Counterparty responds |
| `POST /v1/disputes/:id/resolve` | ✅ Yes | `sly.disputes` | P0 | Resolution flow |
| `GET /v1/verify/:bundle_id` | ✅ Yes | `sly.verify` | P0 | Public verification endpoint (no auth) |
| `POST /v1/policy/evaluate` | ✅ Yes | `sly.policy` | P1 | Dry-run policy evaluation (returns decision object) |
| SDK signing helpers (EIP-712) | ✅ Yes | `sly.signing` | P0 | Client-side typed-data signers |
| Receipt assembler service | ❌ No | - | - | Internal worker |
| Mandate verifier service | ❌ No | - | - | Internal service |
| Policy decision logger | ❌ No | - | - | Internal service |
| Dashboard receipt viewer | ❌ No | - | - | Frontend only |

**SDK Stories Required:**
- [ ] Story 36.X1: Add `mandates` module to `@sly/sdk`
- [ ] Story 36.X2: Add `receipts` module to `@sly/sdk`
- [ ] Story 36.X3: Add `disputes` module to `@sly/sdk`
- [ ] Story 36.X4: Add `verify` module to `@sly/sdk` (unauthenticated client)
- [ ] Story 36.X5: Add `signing` helpers (EIP-712 typed-data signers) to `@sly/sdk`
- [ ] Story 36.X6: MCP tools for `mandates`, `receipts`, `disputes`, `verify`

---

## Core Architectural Decision

**Before this epic:** Sly signs everything via HMAC-SHA256 with a server-side secret. The receipt asserts "Sly says payment occurred."

**After this epic:** The parties sign with their Circle Programmable Wallet secp256k1 keys over EIP-712 typed structures. Sly assembles, witnesses, and gates via policy. The receipt asserts "Payer X signed the mandate. Payee Y signed the delivery. Payer X counter-signed acceptance. Sly verified all signatures and the underlying settlement transaction on Base."

This single shift is what makes the receipt non-repudiable and what makes the eventual on-chain anchoring (Epic 98) meaningful. Anchoring an HMAC-signed Sly receipt to Base just proves Sly's HMAC, not what the parties agreed.

**Implementation consequence:** every signed object in this epic uses the same EIP-712 domain separator and is signed by the wallet of the party making the claim. Sly's own signature uses a KMS-managed secp256k1 key under the same EIP-712 domain (not HMAC) so that Sly-signed objects (PolicyDecision, bundle assembly signatures) are verifiable with the same cryptographic primitives.

---

## Data Model

### EIP-712 Domain

```typescript
// packages/types/src/proof-of-work/domain.ts

export const SLY_EIP712_DOMAIN = {
  name: 'Sly',
  version: '1',
  chainId: <CHAIN_ID>,           // 84532 sandbox, 8453 production
  verifyingContract: '0x0000...0000', // Placeholder until Epic 98 deploys anchor contract
                                       // until then, treated as a domain separator only
} as const;

export type SlyDomain = typeof SLY_EIP712_DOMAIN;
```

### Schema Registry

All four schemas registered under versioned identifiers. Schema changes are versioned (`sly.receipt.v1` → `sly.receipt.v2`) never mutated. Receipts carry their schema version in the `schema` field for forward compatibility.

#### `sly.mandate.v1`

Payer agent's pre-authorization for a payee to receive payments under defined constraints.

```typescript
export const MANDATE_TYPES = {
  Mandate: [
    { name: 'mandateId',          type: 'bytes32' },  // ULID hashed to bytes32
    { name: 'payerDid',           type: 'string' },   // did:sly:agent:0x...
    { name: 'payeeDid',           type: 'string' },
    { name: 'scope',              type: 'string' },   // e.g. "data.merchant_risk_scoring"
    { name: 'maxAmount',          type: 'uint256' },  // total budget in atomic units
    { name: 'perCallCap',         type: 'uint256' },  // per-transaction cap, 0 if unused
    { name: 'currency',           type: 'string' },   // "USDC", "USDT", etc.
    { name: 'chainId',            type: 'uint256' },
    { name: 'workDescriptorHash', type: 'bytes32' },  // hash of agreed deliverable spec
    { name: 'expiresAt',          type: 'uint256' },  // unix timestamp
    { name: 'nonce',              type: 'bytes32' }   // replay protection
  ]
} as const;
```

Database table: `mandates`. Columns map 1:1 to the typed structure plus `id`, `tenant_id`, `payer_signature`, `mandate_hash` (canonical hash for receipt reference), `status` (`active`, `revoked`, `expired`, `consumed`), `revoked_at`, `revoked_by`, `created_at`.

#### `sly.policy_decision.v1`

Sly's signed record that policy evaluation occurred and what it decided. Signed by Sly's KMS key.

```typescript
export const POLICY_DECISION_TYPES = {
  PolicyDecision: [
    { name: 'decisionId',     type: 'bytes32' },
    { name: 'policyVersion',  type: 'string' },     // semver from policy registry
    { name: 'policyHash',     type: 'bytes32' },    // hash of policy document at eval time
    { name: 'inputHash',      type: 'bytes32' },    // hash of (mandate + counterparty state + tenant state)
    { name: 'decision',       type: 'string' },     // "allow" | "deny" | "escalate"
    { name: 'mandateHash',    type: 'bytes32' },
    { name: 'decidedAt',      type: 'uint256' },
    { name: 'signerKeyId',    type: 'string' }      // KMS key identifier
  ]
} as const;
```

Database table: `policy_decisions`. Plus columns: `predicates_evaluated` JSONB (the per-rule pass/fail breakdown), `evaluation_ms`, `sly_signature`, `tenant_id`.

The `predicates_evaluated` JSONB is the audit substrate — it captures every rule the policy engine ran and what each one returned, allowing future replay against the immutable policy_hash.

#### `sly.receipt.v1`

Canonical bilateral attestation that work was performed and accepted.

```typescript
export const RECEIPT_TYPES = {
  Receipt: [
    { name: 'receiptId',           type: 'bytes32' },
    { name: 'mandateHash',         type: 'bytes32' },
    { name: 'policyDecisionHash',  type: 'bytes32' },
    { name: 'payerDid',            type: 'string' },
    { name: 'payeeDid',            type: 'string' },
    { name: 'amount',              type: 'uint256' },
    { name: 'currency',            type: 'string' },
    { name: 'settlementRail',      type: 'string' },   // "x402_base", "ap2", "acp", "ucp", "mpp_tempo", etc.
    { name: 'settlementTxHash',    type: 'bytes32' },  // 0x0 if off-chain rail
    { name: 'workDescriptorHash',  type: 'bytes32' },
    { name: 'workDescriptorMatched', type: 'bool' },
    { name: 'outcome',             type: 'string' },   // "delivered" | "delivered_unverified" | "refunded" | "disputed"
    { name: 'deliveredAt',         type: 'uint256' },
    { name: 'nonce',               type: 'bytes32' }
  ]
} as const;
```

Database table: `receipts`. Plus columns: `id`, `tenant_id`, `payee_signature`, `payee_signed_at`, `payer_signature`, `payer_signed_at`, `terminal_state`, `dual_sig_complete`, `transfer_id` (FK to existing transfers table), `created_at`.

#### `sly.dispute.v1`

Signed challenge against a receipt. Filed by either party.

```typescript
export const DISPUTE_TYPES = {
  Dispute: [
    { name: 'disputeId',         type: 'bytes32' },
    { name: 'receiptId',         type: 'bytes32' },
    { name: 'disputerDid',       type: 'string' },
    { name: 'reasonCode',        type: 'string' },   // enumerated codes
    { name: 'reasonDescription', type: 'string' },
    { name: 'evidenceHash',      type: 'bytes32' },  // hash of off-chain evidence blob
    { name: 'filedAt',           type: 'uint256' },
    { name: 'nonce',             type: 'bytes32' }
  ]
} as const;
```

Database table: `disputes` (refactor of existing dispute state tracker from Epic 14). Plus columns: `id`, `tenant_id`, `disputer_signature`, `response_signature`, `response_description`, `responded_at`, `resolution`, `resolved_at`, `evidence_storage_uri`.

**Reason codes (enumerated):**
- `delivery_not_received`
- `delivery_did_not_match_descriptor`
- `delivery_quality_unacceptable`
- `payment_not_received`
- `unauthorized_charge`
- `duplicate_charge`
- `other`

### Receipt State Machine

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Mandate signed by payer                                       │
│             │                                                  │
│             ▼                                                  │
│  Policy decision: allow                                        │
│             │                                                  │
│             ▼                                                  │
│  Settlement executes on rail                                   │
│             │                                                  │
│             ▼                                                  │
│  ┌──────────────────────┐                                      │
│  │   created            │  ← receipt row exists, no sigs       │
│  └──────────┬───────────┘                                      │
│             │ payee signs delivery                             │
│             ▼                                                  │
│  ┌──────────────────────┐                                      │
│  │   payee_signed       │  ← awaiting payer counter-sign       │
│  └──────────┬───────────┘                                      │
│             │                                                  │
│      ┌──────┴───────┬──────────────┐                           │
│      │              │              │                           │
│      ▼              ▼              ▼                           │
│  payer_signed   timeout_T1     dispute_filed                   │
│      │              │              │                           │
│      ▼              ▼              ▼                           │
│  ┌─────────┐  ┌──────────────┐  ┌──────────┐                   │
│  │delivered│  │auto_accepted │  │disputed  │                   │
│  └────┬────┘  └──────┬───────┘  └────┬─────┘                   │
│       │              │               │                         │
│       │              │               ▼                         │
│       │              │      ┌──────────────────┐               │
│       │              │      │ dispute response │               │
│       │              │      │ + resolution     │               │
│       │              │      └────────┬─────────┘               │
│       │              │               │                         │
│       │              │       ┌───────┴────────┐                │
│       │              │       ▼                ▼                │
│       │              │   resolved_for      resolved_for        │
│       │              │   _payer            _payee              │
│       │              │       │                │                │
│       └──────────────┴───────┴────────────────┘                │
│                              ▼                                 │
│                       terminal_state                           │
│                       (one of seven)                           │
└────────────────────────────────────────────────────────────────┘
```

**Terminal states (every receipt must end in exactly one):**

| State | Meaning | Reputation Impact |
|-------|---------|-------------------|
| `delivered` | Both parties signed, no dispute | Full positive for both |
| `auto_accepted` | Payee signed, payer never countered within T1 | Reduced positive for payee, neutral payer |
| `abandoned` | Payee never signed within T2 of settlement | Negative payee, neutral payer |
| `disputed_unresolved` | Dispute filed, no resolution within T3 | Neutral both, flagged |
| `resolved_for_payer` | Dispute resolution accepted by both, payer favored | Negative payee, neutral payer |
| `resolved_for_payee` | Dispute resolution accepted by both, payee favored | Reduced positive payee, slight negative payer |
| `refunded` | Payee issued refund attestation | Reduced positive payee, neutral payer |

**Timeout constants (per operation class, configurable in receipt_policies table):**

| Operation Class | T1 (counter-sign window) | T2 (payee-sign window) | T3 (dispute resolution) |
|-----------------|--------------------------|------------------------|-------------------------|
| `x402_micropayment` | 5 minutes | 1 hour | 24 hours |
| `ap2_mandate` | 1 hour | 24 hours | 7 days |
| `acp_checkout` | 24 hours | 7 days | 14 days |
| `mpp_session` | 5 minutes | 1 hour | 24 hours |
| `escrow_backed` | 48 hours | n/a (escrow contract) | 30 days |

---

## Architecture

### Receipt Production Flow

```
                Agent Action Request
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Mandate Creation (97.3)      │
        │  Payer agent signs mandate    │
        │  via Circle wallet (EIP-712)  │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Mandate Verifier (97.7)      │
        │  Sig valid + not expired      │
        │  + not revoked                │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Policy Decision (97.4)       │
        │  Existing Epic 18 engine      │
        │  Now produces signed record   │
        └──────────────┬───────────────┘
                       │
                       │ allow
                       ▼
        ┌──────────────────────────────┐
        │  Settlement                   │
        │  Existing rail flows          │
        │  (x402, AP2, ACP, UCP, MPP)  │
        │  Returns settlement_tx_hash   │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Receipt Assembly (97.8)      │
        │  Sly creates receipt row      │
        │  status=created               │
        │  Notifies payee               │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Payee Half-Sign (97.8)       │
        │  Payee wallet signs receipt   │
        │  status=payee_signed          │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Payer Counter-Sign (97.9)    │
        │  Payer wallet signs receipt   │
        │  status=delivered             │
        │  Emits reputation event       │
        │  (97.11)                      │
        └──────────────────────────────┘
```

### Existing Infrastructure Reused

| Component | Location | Reuse |
|-----------|----------|-------|
| Agent Circle wallets | `apps/api/src/services/circle/wallet-service.ts` (Epic 18) | Signing source for mandate, receipt, dispute |
| Contract Policy Engine | `apps/api/src/services/policy/contract-policy-engine.ts` (Epic 18, Story 18.7) | Wrapped to also emit signed PolicyDecision |
| Transfers table | `apps/api/src/routes/transfers.ts` (Epic 4) | Receipt row links via `transfer_id` |
| Webhook delivery | `apps/api/src/services/webhooks/` (Epic 17) | Receipt state-change notifications |
| Multi-protocol gateway | `apps/api/src/routes/x402-payments.ts` etc. (Epic 17) | Hooks for receipt emission per rail |
| `@sly/sdk` SDK | `packages/sdk/` (Epic 36) | Add new modules; reuse client patterns |
| Compliance/Dispute API | `apps/api/src/routes/disputes.ts` (Epic 14) | Refactored to use new signed primitive |

### Replacing the HMAC JWT — Coexistence Strategy

The existing x402 HMAC JWT is not removed in this epic. It continues to serve the provider's local verification fast path (~1ms). The new EIP-712 receipt is the canonical attestation, produced asynchronously after settlement completes.

Coexistence rules:

1. The `/v1/x402/pay` endpoint continues to return the existing HMAC JWT in `proof.jwt`.
2. The same endpoint now also returns `proof.receipt_id`, the identifier of the receipt being assembled.
3. Provider's local JWT verification remains unchanged.
4. Provider's SDK gains a new optional method `awaitReceipt(receipt_id)` that polls (or subscribes to webhook) for the dual-signed receipt.
5. The receipt is the canonical artifact for audit, dispute, regulatory export, and reputation.
6. The JWT is treated as an internal optimization, not a trust artifact, and is not surfaced in regulator-facing tooling.

This avoids breaking the shipped x402 contract while moving the trust model forward.

---

## Stories

### Phase 1a — Schema Foundation (16 points)

---

### Story 97.1: EIP-712 Schema Registry & Canonical Hashing

**Points:** 3
**Priority:** P0
**Dependencies:** None

**Description:**
Establish the canonical EIP-712 domain separator, schema registry pattern, and canonical hashing utilities used by every signed object in this epic. Single source of truth in `@sly/types`.

**Acceptance Criteria:**
- [ ] `SLY_EIP712_DOMAIN` constant exported from `@sly/types/proof-of-work/domain`
- [ ] `SCHEMA_REGISTRY` enum mapping `sly.mandate.v1`, `sly.receipt.v1`, `sly.policy_decision.v1`, `sly.dispute.v1` to their type definitions
- [ ] `canonicalHash(domain, types, value)` helper returns deterministic `bytes32` hash matching EIP-712 spec
- [ ] Chain ID resolved from environment (`84532` for sandbox, `8453` for production)
- [ ] Domain version pinned to `'1'`; any future change is a new domain not a mutation
- [ ] Unit tests verify same input always produces same hash, and hash matches viem/ethers reference implementations
- [ ] Documentation in `packages/types/README.md`

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.signing`
- **Method(s):** `canonicalHash`, `getDomain`
- **MCP tool needed?** No
- **SDK story:** Story 36.X5

**Files to Create:**
- `packages/types/src/proof-of-work/domain.ts`
- `packages/types/src/proof-of-work/schemas.ts`
- `packages/types/src/proof-of-work/hashing.ts`
- `packages/types/src/proof-of-work/index.ts`

**Files to Modify:**
- `packages/types/src/index.ts` (re-export proof-of-work types)

---

### Story 97.2: Receipts Table + `sly.receipt.v1` Schema

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.1

**Description:**
Database table for receipts plus the typed structure definition. Append-only via trigger; only the assembler service can write, and only specific column transitions are allowed.

**Acceptance Criteria:**
- [ ] Migration creates `receipts` table with full column set per data model section above
- [ ] RLS policy: tenant-scoped read; write restricted to service role
- [ ] Trigger blocks any UPDATE that mutates `receipt_id`, `mandate_hash`, `payee_signature`, `payer_signature`, `payee_signed_at`, `payer_signed_at`, `settlement_tx_hash`, `amount`
- [ ] Allowed UPDATEs: `terminal_state` transitions following the state machine only
- [ ] Indexes on `tenant_id`, `payer_did`, `payee_did`, `mandate_hash`, `terminal_state`, `created_at`
- [ ] FK to `transfers(id)` via `transfer_id` (nullable for non-settlement-bound receipts)
- [ ] Zod schema in `packages/types/src/proof-of-work/receipt.ts` mirrors EIP-712 structure
- [ ] Unit tests: cannot mutate signatures after write, cannot skip state machine transitions

**SDK Exposure:**
- **Needs SDK exposure?** No (data layer)
- **Reason:** Receipt creation happens through assembler service, not direct SDK write

**Files to Create:**
- `apps/api/supabase/migrations/XXX_proof_of_work_receipts.sql`
- `packages/types/src/proof-of-work/receipt.ts`

**Files to Modify:**
- None

---

### Story 97.3: Mandates Table + `sly.mandate.v1` Schema + Mandate API

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.1, Story 97.2

**Description:**
Mandate primitive as a first-class signed object. Replaces the inline `mandate_id` / `mandate_type` columns currently embedded in `transfers.protocol_metadata`. Existing AP2 mandate strings remain readable; new flow writes structured mandate rows.

**Acceptance Criteria:**
- [ ] Migration creates `mandates` table per data model section above
- [ ] RLS: tenant-scoped read/write per tenant; service role bypass
- [ ] `POST /v1/mandates` accepts mandate fields + payer signature, validates signature, stores row
- [ ] `GET /v1/mandates/:id` returns full mandate including signature
- [ ] `GET /v1/mandates` lists with filters: payer_did, payee_did, status, scope, expires_after
- [ ] `POST /v1/mandates/:id/revoke` flips status to `revoked` (requires payer wallet signature on revocation message)
- [ ] Revocation lookup is O(1) on hot path (indexed `mandate_hash`)
- [ ] Backward compatibility: existing `protocol_metadata.mandate_id` strings continue to read; new flow links via `mandate_hash`
- [ ] Integration test: create + retrieve + revoke + cannot consume after revocation

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.mandates`
- **Method(s):** `create()`, `get()`, `list()`, `revoke()`
- **MCP tool needed?** Yes (LLM agents will create mandates)
- **SDK story:** Story 36.X1

**Files to Create:**
- `apps/api/supabase/migrations/XXX_proof_of_work_mandates.sql`
- `apps/api/src/routes/mandates.ts`
- `apps/api/src/services/mandates/mandate-service.ts`
- `apps/api/src/schemas/mandate.schema.ts`
- `packages/types/src/proof-of-work/mandate.ts`

**Files to Modify:**
- `apps/api/src/app.ts` (mount router)

---

### Story 97.4: Policy Decisions Table + `sly.policy_decision.v1` + Logger Refactor

**Points:** 3
**Priority:** P0
**Dependencies:** Story 97.1, Epic 18 (✅)

**Description:**
Wrap the existing Epic 18 contract policy engine so every evaluation produces a signed `PolicyDecision` record. The policy engine itself is unchanged; this is an output layer.

**Acceptance Criteria:**
- [ ] Migration creates `policy_decisions` table
- [ ] `policy_decisions.tenant_id` indexed; `mandate_hash` indexed
- [ ] Service `PolicyDecisionLogger.record(evaluation)` produces signed decision via KMS
- [ ] Sly KMS key provisioned (AWS KMS or equivalent) for signing role `sly-policy-engine-prod`
- [ ] `predicates_evaluated` JSONB captures every Zod rule that fired, with input and result
- [ ] `policy_hash` is the SHA-256 of the policy document at evaluation time (so policy versions are tied to specific JSONB blobs)
- [ ] Existing Epic 18 `contract-policy-engine.ts` is wrapped, not modified, behind a `withDecisionLogging` adapter
- [ ] Integration test: evaluating same input against same policy_version produces same input_hash and same decision

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.policy`
- **Method(s):** `evaluate()` (dry-run, returns decision object without committing)
- **MCP tool needed?** Yes
- **SDK story:** Story 36.X1 (combined)

**Files to Create:**
- `apps/api/supabase/migrations/XXX_proof_of_work_policy_decisions.sql`
- `apps/api/src/services/policy/decision-logger.ts`
- `packages/types/src/proof-of-work/policy-decision.ts`

**Files to Modify:**
- `apps/api/src/services/policy/contract-policy-engine.ts` (wrap with logger adapter, do not change core logic)

---

### Phase 1b — Signing Infrastructure (13 points)

---

### Story 97.5: SDK EIP-712 Signing Helpers (`@sly/sdk` Module)

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.1

**Description:**
Client-side helpers in `@sly/sdk` for producing EIP-712 signatures over any registered schema. Used by partner backends that operate agent wallets locally; also used internally when Sly proxies agent signing through Circle.

**Acceptance Criteria:**
- [ ] New module `@sly/sdk/signing`
- [ ] `signMandate(walletAdapter, mandate)` returns signature + canonical hash
- [ ] `signReceipt(walletAdapter, receipt)` works for both payee and payer roles
- [ ] `signDispute(walletAdapter, dispute)` works for either side
- [ ] `WalletAdapter` interface supports: Circle Programmable Wallet, ZeroDev (future), private key (test only)
- [ ] All signers use the canonical domain from Story 97.1
- [ ] TypeScript types fully generated; no `any`
- [ ] Reference implementation `examples/sign-mandate.ts` in SDK repo
- [ ] Vitest suite covers all three signers with deterministic test vectors

**SDK Exposure:**
- **Needs SDK exposure?** Yes (this story IS the SDK exposure)
- **Module:** `sly.signing`
- **MCP tool needed?** No (signing is local, MCP tools do not expose private keys)
- **SDK story:** Story 36.X5

**Files to Create:**
- `packages/sdk/src/signing/index.ts`
- `packages/sdk/src/signing/wallet-adapter.ts`
- `packages/sdk/src/signing/circle-adapter.ts`
- `packages/sdk/src/signing/private-key-adapter.ts`
- `packages/sdk/examples/sign-mandate.ts`

**Files to Modify:**
- `packages/sdk/src/index.ts` (export signing module)

---

### Story 97.6: Sly Bundle Assembler KMS Signing Key

**Points:** 3
**Priority:** P0
**Dependencies:** Story 97.1

**Description:**
Provision and integrate Sly's own EIP-712 signing key for use in `PolicyDecision` records and `Bundle` envelopes. Hosted in AWS KMS (or equivalent). Distinct keys per environment (sandbox/production). Distinct key IDs for distinct signer roles (`sly-policy-engine-prod`, `sly-bundle-assembler-prod`, `sly-receipt-witness-prod`).

**Acceptance Criteria:**
- [ ] KMS keys provisioned in IaC (Terraform) for sandbox and production
- [ ] Service `SlySigner.sign(role, typedData)` returns signature using the role's KMS key
- [ ] Key rotation procedure documented; current `key_id` always included in signed object as `signerKeyId`
- [ ] Signed objects verifiable using KMS-exposed public key plus the `signerKeyId`
- [ ] No private key material exits KMS
- [ ] Integration test: sign + verify roundtrip in sandbox

**SDK Exposure:**
- **Needs SDK exposure?** No (internal infrastructure)
- **Reason:** KMS access is server-side only

**Files to Create:**
- `apps/api/src/services/signing/sly-signer.ts`
- `apps/api/src/services/signing/kms-client.ts`
- `infra/terraform/kms-signing-keys.tf`

**Files to Modify:**
- `apps/api/src/services/policy/decision-logger.ts` (use SlySigner)

---

### Story 97.7: Mandate Verifier Service

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.3

**Description:**
Service that, given a mandate hash, verifies the mandate is still valid for use: signature correct, not expired, not revoked, total spent under cap, nonce not reused.

**Acceptance Criteria:**
- [ ] Service `MandateVerifier.verify(mandateHash, intendedAmount)` returns `{ valid: bool, reason: string }`
- [ ] Cryptographic verification of the payer signature against payer's wallet public key
- [ ] Expiry check against current time
- [ ] Revocation check against mandates table
- [ ] Cumulative spend check (sum of receipts referencing this mandate plus intended amount ≤ max_amount)
- [ ] Per-call cap check (intended amount ≤ per_call_cap if non-zero)
- [ ] Nonce replay check (mandate consumed exactly once per nonce per receipt)
- [ ] Hot-path performance: < 20ms p95 with cached mandate lookup (Redis)
- [ ] Cache invalidation on revoke

**SDK Exposure:**
- **Needs SDK exposure?** No (internal service)
- **Reason:** Called by protocol adapters during settlement, not by partners directly

**Files to Create:**
- `apps/api/src/services/mandates/mandate-verifier.ts`
- `apps/api/src/services/mandates/mandate-cache.ts`

**Files to Modify:**
- None

---

### Phase 1c — Receipt State Machine (16 points)

---

### Story 97.8: Receipt Assembler — Half-Sign Collection

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.2, Story 97.7

**Description:**
After settlement completes, create the receipt row and request the payee's signature. Payee signs first because they hold the delivery evidence.

**Acceptance Criteria:**
- [ ] Service `ReceiptAssembler.create(transferId, settlementResult)` creates receipt row with `terminal_state=null` and `dual_sig_complete=false`
- [ ] Receipt links to mandate via `mandate_hash` and policy decision via `policy_decision_hash`
- [ ] Payee signature collection: webhook delivered to payee with receipt hash to sign
- [ ] Payee signing endpoint `POST /v1/receipts/:id/payee-sign` accepts signature, verifies against payee wallet pubkey
- [ ] On valid payee signature: update `payee_signature`, `payee_signed_at`, state `payee_signed`
- [ ] On invalid signature: 400 with reason
- [ ] Idempotent: re-submission of same signature is a no-op
- [ ] Integration test covering happy path + invalid signature + replay

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.receipts`
- **Method(s):** `payeeSign()`, `get()`
- **MCP tool needed?** Yes
- **SDK story:** Story 36.X2

**Files to Create:**
- `apps/api/src/services/receipts/receipt-assembler.ts`
- `apps/api/src/routes/receipts.ts`

**Files to Modify:**
- `apps/api/src/app.ts` (mount router)

---

### Story 97.9: Receipt Assembler — Counter-Sign Collection

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.8

**Description:**
Payer counter-signs to acknowledge delivery accepted. This is the moment the receipt becomes fully non-repudiable.

**Acceptance Criteria:**
- [ ] `POST /v1/receipts/:id/counter-sign` accepts payer signature
- [ ] Payer signature verified against payer wallet pubkey
- [ ] On valid signature with `work_descriptor_matched=true`: state transitions to `delivered`, `dual_sig_complete=true`
- [ ] On valid signature with `work_descriptor_matched=false`: triggers automatic dispute via Story 97.12
- [ ] Cannot counter-sign before `payee_signed` state reached
- [ ] Cannot counter-sign after T1 timeout (returns 410 Gone)
- [ ] Receipt state-change webhook delivered to both parties
- [ ] Reputation event emitted (consumed by Epic 93 once that ships)

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.receipts`
- **Method(s):** `counterSign()`
- **MCP tool needed?** Yes
- **SDK story:** Story 36.X2

**Files to Create:**
- None (extends Story 97.8 files)

**Files to Modify:**
- `apps/api/src/services/receipts/receipt-assembler.ts`
- `apps/api/src/routes/receipts.ts`

---

### Story 97.10: Counter-Sign Timeout + Terminal State Worker

**Points:** 3
**Priority:** P0
**Dependencies:** Story 97.9

**Description:**
Background worker that walks receipts in non-terminal states and applies timeout transitions per the receipt_policies table.

**Acceptance Criteria:**
- [ ] Worker `apps/api/src/workers/receipt-terminal-state.ts` runs every 60 seconds
- [ ] Receipts in `payee_signed` past T1 → `auto_accepted` if tenant policy allows auto-accept, else `unconfirmed`
- [ ] Receipts in `created` past T2 → `abandoned`
- [ ] Receipts in `disputed` past T3 → `disputed_unresolved`
- [ ] State transitions emit reputation events
- [ ] Webhook deliveries fire on terminal state reached
- [ ] Worker restarts cleanly without re-processing receipts already in terminal state
- [ ] `receipt_policies` table seeded with default T1/T2/T3 per operation class

**SDK Exposure:**
- **Needs SDK exposure?** No (background worker, internal)
- **Reason:** State transitions visible via Receipt API; worker itself is infrastructure

**Files to Create:**
- `apps/api/src/workers/receipt-terminal-state.ts`
- `apps/api/supabase/migrations/XXX_receipt_policies.sql`

**Files to Modify:**
- None

---

### Story 97.11: Reputation Event Emission

**Points:** 3
**Priority:** P0
**Dependencies:** Story 97.9, Story 97.10

**Description:**
Every receipt terminal-state transition emits a structured event on an internal event bus, with payload defined in `sly.reputation_event.v1`. Epic 93 consumes this; Epic 97 just produces.

**Acceptance Criteria:**
- [ ] Event schema `sly.reputation_event.v1` defined in `packages/types`
- [ ] Events written to `reputation_events` table (append-only)
- [ ] Event includes: receipt_id, terminal_state, payer_did, payee_did, amount_atomic, currency, payer_kya_tier, payee_kya_tier, settled_at, terminal_at
- [ ] Bus delivery via Postgres LISTEN/NOTIFY (cheap, sufficient for v1; Kafka in v2)
- [ ] Consumers can subscribe via channel `reputation_events`
- [ ] Integration test: receipt transitions through state machine, all expected events appear in order

**SDK Exposure:**
- **Needs SDK exposure?** Types only
- **Reason:** Events are internal; downstream Epic 93 consumes via bus, not partner-facing
- **Module:** `@sly/types/proof-of-work/reputation-event`

**Files to Create:**
- `apps/api/supabase/migrations/XXX_reputation_events.sql`
- `apps/api/src/services/events/reputation-emitter.ts`
- `packages/types/src/proof-of-work/reputation-event.ts`

**Files to Modify:**
- `apps/api/src/services/receipts/receipt-assembler.ts` (emit on transition)
- `apps/api/src/workers/receipt-terminal-state.ts` (emit on timeout transition)

---

### Phase 1d — Dispute Primitive (10 points)

---

### Story 97.12: Dispute Submission Flow (Signed Attestation)

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.2, Story 97.5

**Description:**
Replace the existing dispute state tracker (Epic 14) with the new signed-attestation primitive. Existing endpoints maintain backward compatibility via a shim; new flow uses signed `Dispute` objects.

**Acceptance Criteria:**
- [ ] Migration adds new columns to existing `disputes` table per data model
- [ ] `POST /v1/disputes` accepts signed `Dispute` object referencing a receipt_id
- [ ] Verifies disputer is payer or payee of the referenced receipt
- [ ] Verifies signature against disputer's wallet
- [ ] Flips receipt state to `disputed`; preserves prior state in `pre_dispute_state` field
- [ ] Evidence blob (if provided) stored at content-addressed URI; hash committed in `evidence_hash`
- [ ] Dispute webhook delivered to opposing party
- [ ] Backward compat: existing Epic 14 endpoints continue to return data, with new fields added; partners on old format see no breaking change
- [ ] Integration test: file dispute, verify receipt state flips, verify opposing party receives webhook

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.disputes`
- **Method(s):** `file()`, `get()`, `list()`
- **MCP tool needed?** Yes
- **SDK story:** Story 36.X3

**Files to Create:**
- `apps/api/supabase/migrations/XXX_disputes_signed_attestations.sql`
- `apps/api/src/services/disputes/dispute-service.ts`
- `packages/types/src/proof-of-work/dispute.ts`

**Files to Modify:**
- `apps/api/src/routes/disputes.ts` (extend, do not replace)

---

### Story 97.13: Dispute Response & Resolution Flow

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.12

**Description:**
Opposing party responds to a dispute (accepts, rejects, offers refund). Resolution updates receipt to one of `resolved_for_payer`, `resolved_for_payee`, `refunded`, or `disputed_unresolved` if T3 elapses without agreement.

**Acceptance Criteria:**
- [ ] `POST /v1/disputes/:id/respond` accepts signed response from opposing party
- [ ] Response types: `accept` (concede dispute), `reject` (contest), `offer_refund` (partial/full)
- [ ] On `accept`: receipt → `resolved_for_payer` (if disputer was payer) or `resolved_for_payee`
- [ ] On `offer_refund` accepted by disputer: receipt → `refunded`, a separate `RefundAttestation` written
- [ ] On `reject` + no further action by T3: receipt → `disputed_unresolved`
- [ ] Reputation events emitted on each terminal transition
- [ ] All transitions append to `disputes.resolution_events` JSONB array with signature

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.disputes`
- **Method(s):** `respond()`, `resolve()`
- **MCP tool needed?** Yes
- **SDK story:** Story 36.X3

**Files to Create:**
- None (extends Story 97.12)

**Files to Modify:**
- `apps/api/src/services/disputes/dispute-service.ts`
- `apps/api/src/routes/disputes.ts`

---

### Phase 1e — Protocol Adapter Refactor (13 points)

---

### Story 97.14: x402 Facilitator Emits Receipts

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.8, Story 97.4

**Description:**
Refactor `apps/api/src/routes/x402-payments.ts` so every successful x402 payment produces a `Receipt` in `created` state and a `PolicyDecision` record. Existing HMAC JWT continues to ship as `proof.jwt`; new `proof.receipt_id` is added.

**Acceptance Criteria:**
- [ ] `/v1/x402/pay` produces a receipt row before responding
- [ ] Response now includes `proof.receipt_id`
- [ ] Existing `proof.jwt` and `proof.signature` unchanged
- [ ] Policy decision logged via Story 97.4 logger
- [ ] Receipt links to mandate (auto-created for x402 if not explicitly provided — see notes)
- [ ] Provider SDK gains optional `awaitReceipt(receipt_id)` method
- [ ] Existing x402 tests continue to pass with no modification
- [ ] New tests verify receipt row exists and is correctly linked

**Implementation note:**
x402 micropayments often run under an implicit mandate (the session token authorizes spend up to a cap). For these, the assembler auto-generates a session-level mandate signed by the payer at session start, and individual call receipts reference that mandate. The payer SDK signs the session mandate once; per-call receipts inherit.

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.x402` (existing)
- **Method(s):** `awaitReceipt()` on provider SDK
- **MCP tool needed?** No
- **SDK story:** Story 36.X2

**Files to Create:**
- None

**Files to Modify:**
- `apps/api/src/routes/x402-payments.ts`
- `packages/x402-provider-sdk/src/index.ts`
- `packages/x402-client-sdk/src/index.ts`

---

### Story 97.15: AP2 / ACP / UCP Adapters Emit Receipts

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.8, Story 97.14

**Description:**
Same refactor as Story 97.14 applied to AP2, ACP, and UCP protocol flows.

**Acceptance Criteria:**
- [ ] AP2 payment flow produces receipt; mandate is the AP2 mandate already in the protocol
- [ ] ACP checkout completion produces receipt; mandate covers the shared_payment_token scope
- [ ] UCP transaction produces receipt; mandate covers cart_items scope
- [ ] All three rails emit policy_decision records
- [ ] All three return receipt_id in response
- [ ] Backward compatibility: existing protocol responses unchanged except for additive `receipt_id`
- [ ] Integration tests for each protocol verify receipt creation

**SDK Exposure:**
- **Needs SDK exposure?** Types only
- **Reason:** Existing SDK modules per protocol already cover the call shapes; just add `receipt_id` to response types

**Files to Create:**
- None

**Files to Modify:**
- `apps/api/src/routes/ap2-payments.ts`
- `apps/api/src/routes/acp-checkouts.ts`
- `apps/api/src/routes/ucp-transactions.ts`
- `packages/types/src/protocols/*.ts` (add receipt_id to response types)

---

### Story 97.16: MPP Integration Hook (Epic 71 Coordination)

**Points:** 3
**Priority:** P0
**Dependencies:** Story 97.8, Epic 71 (planned)

**Description:**
Coordinate with Epic 71 (MPP Integration) so MPP credential signing emits a receipt. Since Epic 71 is still planned, this story delivers the integration spec rather than the integration itself; the actual hook lands when Epic 71's Phase 1 ships.

**Acceptance Criteria:**
- [ ] Spec document `docs/integrations/mpp-receipt-integration.md` defines the touch point
- [ ] MPP middleware in Epic 71 calls `ReceiptAssembler.create(transferId, mppResult)` post-credential-signing
- [ ] `settlement_rail` field is `mpp_tempo` or `mpp_stripe` depending on payment method
- [ ] Epic 71 Phase 1 stories (Story 71.X — TBD) updated to reference Story 97.16
- [ ] No backward-compat concern (Epic 71 not yet shipped)

**SDK Exposure:**
- **Needs SDK exposure?** No (spec only)
- **Reason:** Integration spec; SDK exposure flows from Epic 71 implementation

**Files to Create:**
- `docs/integrations/mpp-receipt-integration.md`

**Files to Modify:**
- `docs/prd/epics/epic-71-mpp-integration.md` (cross-reference)

---

### Phase 1f — Verification & Surface (8 points)

---

### Story 97.17: Public Verification Endpoint (Off-Chain)

**Points:** 5
**Priority:** P0
**Dependencies:** Story 97.2, Story 97.3, Story 97.4

**Description:**
Single unauthenticated endpoint that, given a receipt_id, runs all checks runnable off-chain and returns a structured verification report. This is the regulator-facing artifact. On-chain checks (Merkle inclusion, anchor tx confirmation) are stubbed as "deferred to Epic 98" but the surface is ready.

**Acceptance Criteria:**
- [ ] `GET /v1/verify/:receipt_id` returns `VerificationReport` JSON
- [ ] No authentication required; rate-limited per IP
- [ ] Report runs the following checks and returns pass/fail per dimension:
  - Cryptographic: payer signature, payee signature, Sly policy decision signature
  - Schema: receipt conforms to declared `sly.receipt.v1`
  - Identity binding: payer DID resolves to payer wallet pubkey; same for payee
  - Authorization chain: mandate_hash exists, mandate valid at signing time, policy_decision references real policy version
  - Settlement coherence: settlement_tx_hash exists on Base, amount matches, payer/payee wallets match
  - Temporal coherence: mandate signed before policy decision before settlement before payee_signed before payer_signed
  - Consensus: dual_sig_complete or terminal_state explains why not
- [ ] Anchor inclusion check returns `deferred_to_epic_98`
- [ ] Report includes `verification_status`: `fully_verified`, `partially_verified`, `verification_failed`, `not_found`
- [ ] Response cached for 5 minutes per receipt_id
- [ ] Documentation page at `/docs/verification` shows curl example

**SDK Exposure:**
- **Needs SDK exposure?** Yes
- **Module:** `sly.verify` (no auth required, unauthenticated client)
- **Method(s):** `verify(receiptId)`
- **MCP tool needed?** Yes (so an auditor agent can verify receipts)
- **SDK story:** Story 36.X4

**Files to Create:**
- `apps/api/src/routes/verify.ts`
- `apps/api/src/services/verification/verifier.ts`
- `packages/types/src/proof-of-work/verification-report.ts`

**Files to Modify:**
- `apps/api/src/app.ts` (mount router; configure unauthenticated path)

---

### Story 97.18: Dashboard Receipts Viewer

**Points:** 3
**Priority:** P0
**Dependencies:** Story 97.2, Story 97.17

**Description:**
Tenant dashboard surface showing the receipts produced for their agents. List view + detail view with verification report inline.

**Acceptance Criteria:**
- [ ] Route `/receipts` lists tenant receipts with filters (agent, counterparty, terminal_state, date range)
- [ ] Route `/receipts/:id` shows full receipt with verification report from Story 97.17
- [ ] Visual indicator of dual_sig status, terminal state, dispute state
- [ ] Link to dispute filing flow if user is a party
- [ ] CSV export of filtered receipt list
- [ ] No new backend endpoints required; consumes existing `sly.receipts` module

**SDK Exposure:**
- **Needs SDK exposure?** No (frontend only)

**Files to Create:**
- `apps/dashboard/src/pages/receipts/index.tsx`
- `apps/dashboard/src/pages/receipts/[id].tsx`
- `apps/dashboard/src/components/receipts/ReceiptDetailCard.tsx`
- `apps/dashboard/src/components/receipts/VerificationReportPanel.tsx`

**Files to Modify:**
- `apps/dashboard/src/app/sidebar.tsx` (add nav entry)

---

### Story 97.19: SDK Module Bundle + Integration Guide

**Points:** 3
**Priority:** P0
**Dependencies:** Stories 97.3, 97.8, 97.9, 97.12, 97.13, 97.17

**Description:**
Polish the SDK story 36.X1–36.X6 deliverables into a coherent module bundle and write a partner-facing integration guide.

**Acceptance Criteria:**
- [ ] `@sly/sdk` exports `mandates`, `receipts`, `disputes`, `verify`, `signing` modules
- [ ] Each module documented in JSDoc; types fully exported
- [ ] Integration guide at `docs/integrations/proof-of-work.md` walks through:
  - Creating a mandate
  - Receiving a receipt notification
  - Counter-signing a receipt
  - Filing a dispute
  - Verifying a receipt as a third party
- [ ] Working sample app `examples/proof-of-work-quickstart` at SDK repo root
- [ ] CHANGELOG entry for `@sly/sdk` new minor version

**SDK Exposure:**
- **Needs SDK exposure?** Yes (this story IS the SDK consolidation)
- **SDK story:** Aggregates Stories 36.X1–36.X6

**Files to Create:**
- `docs/integrations/proof-of-work.md`
- `packages/sdk/examples/proof-of-work-quickstart/`

**Files to Modify:**
- `packages/sdk/src/index.ts`
- `packages/sdk/CHANGELOG.md`
- `packages/sdk/README.md`

---

## Story Summary

| Story | Points | Priority | Phase | Description |
|-------|--------|----------|-------|-------------|
| 97.1 | 3 | P0 | 1a | EIP-712 schema registry + canonical hashing |
| 97.2 | 5 | P0 | 1a | Receipts table + receipt schema |
| 97.3 | 5 | P0 | 1a | Mandates table + mandate schema + API |
| 97.4 | 3 | P0 | 1a | Policy decisions table + signed logger |
| 97.5 | 5 | P0 | 1b | SDK signing helpers (EIP-712) |
| 97.6 | 3 | P0 | 1b | Sly bundle assembler KMS keys |
| 97.7 | 5 | P0 | 1b | Mandate verifier service |
| 97.8 | 5 | P0 | 1c | Receipt assembler — payee half-sign |
| 97.9 | 5 | P0 | 1c | Receipt assembler — payer counter-sign |
| 97.10 | 3 | P0 | 1c | Counter-sign timeout worker |
| 97.11 | 3 | P0 | 1c | Reputation event emission |
| 97.12 | 5 | P0 | 1d | Dispute submission flow |
| 97.13 | 5 | P0 | 1d | Dispute response + resolution |
| 97.14 | 5 | P0 | 1e | x402 adapter emits receipts |
| 97.15 | 5 | P0 | 1e | AP2 / ACP / UCP emit receipts |
| 97.16 | 3 | P0 | 1e | MPP integration spec (Epic 71 coordination) |
| 97.17 | 5 | P0 | 1f | Public verification endpoint (off-chain) |
| 97.18 | 3 | P0 | 1f | Dashboard receipts viewer |
| 97.19 | 3 | P0 | 1f | SDK module bundle + integration guide |
| **Total** | **76** | | | |

---

## Implementation Sequence

```
Sprint 1 (Weeks 1-2): Phase 1a + 1b foundation       ~29 pts
                       Schemas, mandate API, signing infra, mandate verifier
    ↓
Sprint 2 (Weeks 3-4): Phase 1c + 1d state machine    ~26 pts
                       Receipt assembler, dispute primitive
    ↓
Sprint 3 (Weeks 5-6): Phase 1e + 1f integration      ~21 pts
                       Protocol adapters, verification endpoint, SDK polish
```

**Critical path:** 97.1 → 97.2 → 97.3 (data foundation) → 97.5 + 97.7 (signing infra) → 97.8 → 97.9 (state machine) → 97.14 (first protocol adapter) → 97.17 (verification endpoint)

**Parallelizable:**
- Story 97.6 (KMS) can start day 1 (infra setup, no code dependencies)
- Story 97.18 (dashboard) can start after Story 97.8 lands
- Story 97.16 (MPP spec) can be drafted alongside Sprint 1

---

## Success Criteria

1. **Every protocol-settled payment produces a dual-signature-capable receipt.** No exceptions across x402, AP2, ACP, UCP, MPP.
2. **Receipt verification runs without contacting Sly's authenticated APIs.** A third party with only the receipt bundle and Base chain access can verify settlement and signatures.
3. **Policy decisions are replayable.** Given the immutable `policy_hash` and the recorded `input_hash`, replaying the policy engine produces the same decision.
4. **Disputes are first-class signed objects, not state flags.** Every dispute carries a signature from the disputer and a verifiable evidence_hash.
5. **HMAC JWT remains operational throughout.** No breaking change to the existing x402 provider integration.
6. **Reputation events flow on every terminal state transition.** Epic 93 can consume this stream the moment it ships.
7. **Verification endpoint is public and rate-limited but unauthenticated.** A regulator or auditor with the receipt_id alone can run the verification.

---

## Risks and Open Questions

### Risk 1: Circle wallet signing latency on the x402 hot path

Circle Programmable Wallets sign via API. Network round-trip plus Circle's signing latency may be ~100-300ms. This is acceptable for AP2/ACP but pushes x402's ~1.4s warm path closer to 2s.

**Mitigation:** Receipt assembly is asynchronous from the payment response. The payment returns the existing JWT immediately; the receipt is built in the background, with the payee signing on their schedule. Hot path is not blocked. Documented explicitly in story 97.14.

**Open question:** For very latency-sensitive x402 scenarios, should we offer a "deferred receipt" mode where the receipt assembles in batches at the session boundary rather than per-call? Worth a session before locking the design.

### Risk 2: KYA tier values are not yet on-chain attested

The current `agents.kya_tier` column is set by Sly, not attested via ERC-8004. Receipts reference KYA tier in the reputation event, but until ERC-8004 attestation (Epic 63) ships, the tier is "Sly says so."

**Mitigation:** Acceptable for v1. Epic 63 will retrofit ERC-8004 attestation reading. Receipts produced before Epic 63 will still be valid; their KYA tier just won't be independently verifiable until 63 ships.

### Risk 3: Custodial signing via Circle is not self-sovereign

Agent wallets are managed by Circle. An agent "signing" is Sly calling Circle's API. This is fine for fintech pilots but limits the agent autonomy story.

**Mitigation:** Architecture is wallet-adapter-agnostic (Story 97.5). When Epic 96 (ZeroDev) ships, partners can swap their `WalletAdapter` to use self-sovereign smart accounts with no receipt schema change.

### Open question 1: Replace the existing dispute API or extend it?

Epic 14 shipped a dispute state tracker. Two paths:

a) Extend in place. Add new columns and signed-attestation paths to the existing `disputes` table. Existing API surface continues to work, new fields surface incrementally.

b) New table + deprecate old. Cleaner separation. Migration burden for partners on the old API.

Recommendation in this PRD: extend in place (Story 97.12). Lower risk, lower partner friction. Open to challenge.

### Open question 2: Should `PolicyDecision` be EIP-712 or plain JWS?

EIP-712 keeps every signed object in the same domain for future on-chain anchoring. JWS is more conventional for server-side signing. Recommendation in this PRD: EIP-712 for consistency. Sly's KMS key signs over EIP-712 typed data, identical primitive to the parties.

### Open question 3: Where do reputation events durably land?

Story 97.11 writes to `reputation_events` table and emits via Postgres LISTEN/NOTIFY. Sufficient for v1. Long-term, this is a high-volume event stream that wants Kafka or similar. Out of scope here, in scope for Epic 93 or a dedicated event-infra epic.

---

## Testing Strategy

### Unit tests
- Canonical hashing produces identical output for identical input across runs
- EIP-712 signatures round-trip correctly through viem and ethers references
- State machine transitions reject invalid sequences
- Mandate verifier rejects expired, revoked, over-cap, and replayed mandates
- Policy decision logger produces deterministic output for identical inputs

### Integration tests
- End-to-end x402 payment produces full dual-signed receipt
- Receipt webhook delivered to both parties on state transitions
- Counter-sign timeout transitions receipt to `auto_accepted`
- Payee timeout transitions receipt to `abandoned`
- Dispute filed by payer transitions receipt to `disputed`; opposing party receives webhook
- Dispute resolution flow accepts → `resolved_for_payer`
- Verification endpoint returns `fully_verified` for a properly-signed receipt
- Verification endpoint returns appropriate partial-verification result when settlement_tx_hash is missing or invalid
- Backward-compat: existing x402 partner SDK works unchanged

### Adversarial tests
- Submit receipt with valid schema but signature from wrong wallet → rejected
- Submit receipt referencing a mandate that has been revoked → rejected
- Replay a nonce in a new mandate → rejected
- Submit dispute against a receipt the submitter is not a party to → rejected
- Tamper with stored receipt row directly (bypass app layer) → trigger blocks the update

### Load tests
- 1000 concurrent x402 payments produce 1000 distinct receipts within 60 seconds
- Receipt assembler worker keeps queue depth bounded under sustained load
- Verification endpoint p95 latency under 200ms with cache; under 800ms cold

---

## Migration Considerations

### Existing x402 partners

No breaking change. Existing partners using the HMAC JWT continue to work. New `proof.receipt_id` is additive. Partners who opt into the receipt model use the new SDK methods.

### Existing Disputes API consumers

No breaking change. Existing fields preserved. New signed-attestation flow available behind a new method (`sly.disputes.file()` with signature parameter).

### Database migrations

All migrations are additive. No column drops. Triggers added for append-only enforcement on new tables only. Existing `transfers` and `disputes` tables gain new columns; no existing column changes.

### Rollback strategy

If a critical bug is found in the receipt assembler, the feature can be disabled per-tenant via a `receipt_emission_enabled` flag on the tenant row. Disabled tenants continue receiving HMAC JWT only, no receipts assembled. This avoids a full rollback while preserving incident recovery time.

---

## Related Documentation

- [Epic 18: Agent Wallets & Contract Policies](./epic-18-agent-wallets-contract-policies.md) ✅ — Provides signing wallets
- [Epic 17: Multi-Protocol Gateway](./epic-17-multi-protocol.md) ✅ — Existing protocol surface that gains receipt emission
- [Epic 27: Settlement Infrastructure Hardening](./epic-27-settlement.md) ✅ — Settlement tx hash source
- [Epic 36: SDK & Developer Experience](./epic-36-sdk-developer-experience.md) ✅ — SDK home for new modules
- [Epic 93: Reputation Receipts](./epic-93-reputation-receipts.md) 📋 — Downstream consumer
- [Epic 98: On-Chain Anchoring](./epic-98-onchain-anchoring.md) — Adds Merkle + EAS + on-chain anchor
- [Epic 99: Trace (Intent-to-Action Audit) — Design Only](./epic-99-trace.md)
- [Epic 100: Oracle / Verifier Network — Design Only](./epic-100-oracle-verifier-network.md)
- [APoW Release Roadmap](../APOW_RELEASE_ROADMAP.md) — R1–R7 sequencing
- [Identity & Governance Strategy](../IDENTITY_AND_GOVERNANCE_STRATEGY.md) — Companion strategy doc
- [MARKETPLACES_STRATEGY.md](../MARKETPLACES_STRATEGY.md) — Strategic framing for Track A/B

---

## Architecture Delta (One-Page Summary for Claude Code Handoff)

**The single decision that matters most:**

Today, Sly's "proof" of a payment is an HMAC-SHA256 JWT signed by Sly's server-side secret. This is a witness-mode artifact: it says "Sly attests that this happened."

After Epic 97, the canonical proof is an EIP-712 typed `Receipt` signed by both the payer's Circle wallet (secp256k1) and the payee's Circle wallet (secp256k1). The receipt references a `Mandate` (signed by the payer) and a `PolicyDecision` (signed by Sly's KMS key, also EIP-712). Sly's role becomes assembler and policy gate, not signer-of-truth.

The HMAC JWT is preserved as an internal hot-path optimization for x402 provider local verification. It is not the canonical artifact.

**Everything else in this epic flows from that decision:**
- Schemas exist because we need typed structures to sign
- Mandate API exists because the mandate is a separable signed primitive
- Policy decision logger exists because the decision must be replayable
- Dispute primitive exists because receipts must be falsifiable
- Verification endpoint exists because third parties must validate without trusting Sly
- Protocol adapters refactor exists because every payment must emit a receipt

**The line in the sand:**

If a story is added to this epic, the question to ask: does it make the parties more accountable for what they signed, or does it make Sly's attestation more convenient? Only the first type belongs here. The second belongs in observability work.

---

## Implementation Review (2026-05-14)

Per-story review against the [PRD Status Matrix](../PRD_STATUS_MATRIX.md) (v1.28) and the current state of the codebase. Format: dependency check, acceptance-criteria scan, data-model integrity, spec gaps, verdict.

### Story 97.1 — EIP-712 Schema Registry & Canonical Hashing

- **Dependency status:** ✅ None — clean root.
- **Acceptance criteria:** ✅ all testable. Deterministic hash + reference-impl parity is a strong DoD.
- **Data model:** ✅ Domain separator with chain ID 84532/8453 matches Epic 67's environment-isolation rules.
- **Spec gaps:** None.
- **Verdict:** **Ready to implement.**

### Story 97.2 — Receipts Table + `sly.receipt.v1`

- **Dependency status:** ✅ 97.1.
- **Acceptance criteria:** ✅ trigger-enforced append-only is the right pattern.
- **Data model:** ✅ FK to `transfers(id)` aligns with shipped Epic 4 schema. Verify `transfers.id` is `UUID` not `BIGINT` before migration runs.
- **Spec gaps:** None. The state-machine allowed-transitions list is exhaustive.
- **Verdict:** **Ready to implement.**

### Story 97.3 — Mandates Table + `sly.mandate.v1` + API

- **Dependency status:** ✅ 97.1, 97.2.
- **Acceptance criteria:** ✅ O(1) revocation lookup is a real perf requirement — confirm Redis is the cache, not in-memory map (which won't survive horizontal scale).
- **Data model:** ✅ Backward-compat note (`protocol_metadata.mandate_id` continues to read) preserves AP2 partner integrations.
- **Spec gaps:** ⚠️ Replay-protection `nonce` derivation not specified. Recommend: 16 random bytes from `crypto.randomBytes(16)`, scoped to `(payerDid, payeeDid)`. Document in this story or 97.1.
- **Verdict:** **Ready to implement** with the nonce note above logged.

### Story 97.4 — Policy Decisions + Logger Refactor

- **Dependency status:** ✅ 97.1, ✅ Epic 18 (Agent Wallets & Contract Policies — Complete per matrix).
- **Acceptance criteria:** ✅ `policy_hash = SHA-256(policy_document)` is correct primitive; ensures policy versions tie to specific JSONB blobs.
- **Data model:** ✅ `predicates_evaluated` JSONB captures per-rule pass/fail.
- **Spec gaps:** ⚠️ `withDecisionLogging` adapter pattern wraps the existing engine, but the engine's I/O surface isn't standardized. Story 97.4 should explicitly enumerate which existing call sites in `contract-policy-engine.ts` get wrapped; otherwise some paths will skip logging silently.
- **Verdict:** **Ready to implement** with the wrap-site enumeration added during planning.

### Story 97.5 — SDK EIP-712 Signing Helpers

- **Dependency status:** ✅ 97.1.
- **Acceptance criteria:** ✅ adapter pattern (Circle, ZeroDev, private-key) maps cleanly to multi-custody future (Epic 77 + Epic 96).
- **Data model:** ✅ no DB.
- **Spec gaps:** None. Reference example (`examples/sign-mandate.ts`) is a strong DoD signal.
- **Verdict:** **Ready to implement.**

### Story 97.6 — Sly Bundle Assembler KMS Signing Key

- **Dependency status:** ✅ 97.1.
- **Acceptance criteria:** ✅ but the file path `infra/terraform/kms-signing-keys.tf` is **a new top-level directory** — `infra/` does not exist in the repo today (verified). Either pick an existing IaC location or accept the new top-level dir and document it.
- **Data model:** ✅ no DB; KMS keys live external.
- **Spec gaps:** ⚠️ **IaC posture undocumented.** Sly's current Terraform layout is unclear. This story needs a 1-line decision upfront: "where does new IaC live?" — either piggyback on an existing convention or create `infra/` and document it in `docs/architecture/`.
- **Verdict:** **Needs minor revision** — pin the IaC location before story start.

### Story 97.7 — Mandate Verifier Service

- **Dependency status:** ✅ 97.3.
- **Acceptance criteria:** ✅ all 7 checks (sig, expiry, revocation, cumulative spend, per-call cap, nonce, hot-path perf) are exhaustive.
- **Data model:** ✅ cumulative spend calculated from `receipts.amount` JOINed on `mandate_hash`.
- **Spec gaps:** None. Cache invalidation on revoke is correctly called out.
- **Verdict:** **Ready to implement.**

### Story 97.8 — Receipt Assembler (Payee Half-Sign)

- **Dependency status:** ✅ 97.2, 97.7.
- **Acceptance criteria:** ✅ idempotency for resubmission + webhook to payee is well-specified.
- **Data model:** ✅ uses existing webhook infrastructure (Epic 17 ✅).
- **Spec gaps:** ⚠️ **Cross-protocol concern.** The assembler interacts with **all 5 protocol adapters** (x402, AP2, ACP, UCP, MPP) via Stories 97.14–97.16. AP2/ACP/UCP adapters are mature and refactorable; MPP (Epic 71 — 📋 Planned) is not yet shipped. Suggest sequencing 97.8 → 97.14 (x402 first) → 97.15 (AP2/ACP/UCP) → 97.16 (MPP spec only) to derisk.
- **Verdict:** **Ready to implement** with sequencing as above.

### Story 97.9 — Receipt Assembler (Payer Counter-Sign)

- **Dependency status:** ✅ 97.8.
- **Acceptance criteria:** ✅ T1 timeout returning 410 Gone is correct HTTP semantics.
- **Data model:** ✅.
- **Spec gaps:** None. The `work_descriptor_matched=false` auto-dispute path is clean.
- **Verdict:** **Ready to implement.**

### Story 97.10 — Counter-Sign Timeout Worker

- **Dependency status:** ✅ 97.9.
- **Acceptance criteria:** ✅ 60s worker cadence reasonable; `receipt_policies` per operation class is the right granularity.
- **Data model:** ✅ new `receipt_policies` table.
- **Spec gaps:** ⚠️ Per-tenant override of T1/T2/T3 not mentioned — some tenants (esp. high-volume x402 customers) will want tighter timeouts. Recommend: `receipt_policies (operation_class, tenant_id NULLABLE)` with NULL tenant = global default, non-NULL = override.
- **Verdict:** **Ready to implement** with the per-tenant override added.

### Story 97.11 — Reputation Event Emission

- **Dependency status:** ✅ 97.9, 97.10.
- **Acceptance criteria:** ✅ Postgres LISTEN/NOTIFY adequate for v1.
- **Data model:** ✅ append-only `reputation_events` table.
- **Spec gaps:** None.
- **Verdict:** **Ready to implement.**

### Story 97.12 — Dispute Submission Flow

- **Dependency status:** ✅ 97.2, 97.5, ✅ Epic 14 (Compliance & Dispute APIs — Complete).
- **Acceptance criteria:** ✅ backward-compat shim path is correct.
- **Data model:** ✅ extends existing `disputes` table additively.
- **Spec gaps:** ⚠️ Dispute reason codes are an enumerated string list. If a customer ever needs a new code (likely), adding one is a migration. Recommend: `reason_code` as TEXT with CHECK constraint, but expose a separate `dispute_reason_codes` lookup table editable by Sly ops without a schema migration. Adds ~1 pt of scope, saves real pain later.
- **Verdict:** **Ready to implement** with reason-code extensibility addressed.

### Story 97.13 — Dispute Response + Resolution

- **Dependency status:** ✅ 97.12.
- **Acceptance criteria:** ✅ resolution events JSONB array with signatures.
- **Data model:** ✅.
- **Spec gaps:** None.
- **Verdict:** **Ready to implement.**

### Story 97.14 — x402 Facilitator Emits Receipts

- **Dependency status:** ✅ 97.8, 97.4.
- **Acceptance criteria:** ✅ HMAC JWT preserved; `proof.receipt_id` is additive.
- **Data model:** ✅ session-level mandate auto-generated for x402 (clean pattern).
- **Spec gaps:** ⚠️ Hot-path latency risk explicitly called out in Risk 1 of the epic. Async assembly mitigates; document the `awaitReceipt()` semantics clearly so partners don't expect synchronous delivery.
- **Verdict:** **Ready to implement.**

### Story 97.15 — AP2 / ACP / UCP Adapters

- **Dependency status:** ✅ 97.8, 97.14.
- **Acceptance criteria:** ✅ symmetric refactor across three protocol routes.
- **Data model:** ✅ each rail emits receipts with matching `settlement_rail` value.
- **Spec gaps:** None.
- **Verdict:** **Ready to implement.**

### Story 97.16 — MPP Integration Spec (Epic 71 Coordination)

- **Dependency status:** ⚠️ **Epic 71 is 📋 Planned, not shipped.** This story produces a spec doc; the actual integration hook lands when Epic 71 Phase 1 ships.
- **Acceptance criteria:** ✅ spec-only deliverable.
- **Data model:** N/A (spec).
- **Spec gaps:** None for the spec deliverable.
- **Verdict:** **Ready to implement (spec only)** — but cross-reference into Epic 71 must be added so Epic 71's Phase 1 doesn't proceed without consuming this story.
- **Blocker note:** Epic 71's commit decision interacts with this spec. If Epic 71 stalls indefinitely, Story 97.16 is wasted effort.

### Story 97.17 — Public Verification Endpoint (Off-Chain)

- **Dependency status:** ✅ 97.2, 97.3, 97.4.
- **Acceptance criteria:** ✅ seven verification dimensions exhaustive.
- **Data model:** ✅ `VerificationReport` JSON shape sound.
- **Spec gaps:** ⚠️ **Rate limit not specified.** The endpoint is unauthenticated. Sly's global 100 req/min limit will be too loose; recommend a stricter per-IP rule (30 req/min for `/v1/verify/*`) and document explicitly. Epic 98 Story 98.5 already plans the extension.
- **Verdict:** **Ready to implement** with rate-limit decision pinned.

### Story 97.18 — Dashboard Receipts Viewer

- **Dependency status:** ✅ 97.2, 97.17.
- **Acceptance criteria:** ✅ list + detail + verification report.
- **Data model:** N/A (frontend).
- **Spec gaps:** ⚠️ **WRONG PATH.** Story specifies `apps/dashboard/src/...` — that directory **does not exist**. Per `CLAUDE.md`, the active UI is `apps/web/` (Next.js App Router). `payos-ui/` is deprecated. Files must be moved to `apps/web/src/app/dashboard/receipts/*` and `apps/web/src/components/receipts/*`.
- **Verdict:** **Needs revision** — path correction is mandatory before implementation. One-line fix in the story spec.

### Story 97.19 — SDK Module Bundle + Integration Guide

- **Dependency status:** ✅ 97.3, 97.8, 97.9, 97.12, 97.13, 97.17.
- **Acceptance criteria:** ✅ 5-module bundle + integration guide + sample app.
- **Data model:** N/A.
- **Spec gaps:** None.
- **Verdict:** **Ready to implement.**

---

### Roll-Up Verdict Table

| Story | Verdict | Blocker / Revision Needed |
|-------|---------|----------------------------|
| 97.1 | ✅ Ready | — |
| 97.2 | ✅ Ready | — |
| 97.3 | ✅ Ready | Document nonce derivation (16 random bytes) |
| 97.4 | ✅ Ready | Enumerate wrap-sites in `contract-policy-engine.ts` |
| 97.5 | ✅ Ready | — |
| 97.6 | ⚠️ Revise | Pin IaC location (`infra/` is new top-level dir) |
| 97.7 | ✅ Ready | — |
| 97.8 | ✅ Ready | Sequence 97.14 → 97.15 → 97.16 |
| 97.9 | ✅ Ready | — |
| 97.10 | ✅ Ready | Add per-tenant timeout override |
| 97.11 | ✅ Ready | — |
| 97.12 | ✅ Ready | Make reason codes editable without migration |
| 97.13 | ✅ Ready | — |
| 97.14 | ✅ Ready | — |
| 97.15 | ✅ Ready | — |
| 97.16 | ⚠️ Coordinate | Blocked on Epic 71 shipping |
| 97.17 | ✅ Ready | Pin verify-endpoint rate limit (30 req/min) |
| 97.18 | ⚠️ Revise | Path correction: `apps/dashboard/` → `apps/web/` |
| 97.19 | ✅ Ready | — |

**Summary:** 16 of 19 stories Ready to implement. 3 need minor revision before implementation:
- 97.6 (IaC location)
- 97.18 (dashboard path)
- 97.16 (Epic 71 coordination)

None of these are structural — all are one-line spec fixes. The epic is ready to enter the implementation queue with these notes folded back into the story specs.

---

### Cross-Epic Recommendation: Reduce Epic 93 Scope

**Recommendation (flagged for explicit user confirmation before editing Epic 93):** Epic 97 absorbs the receipt primitive that Epic 93 originally owned. Epic 93's current scope (37 pts) overlaps with Stories 97.2 (receipt schema), 97.8 + 97.9 (receipt assembly), 97.17 (verification endpoint).

Proposed Epic 93 narrowing:
- **Keep in Epic 93:** Composite identity score computation, scoring weights, per-task signed attestation that feeds the score (a reputation-feeder layer on top of Epic 97 receipts), Sly Score query API, Sly Score dashboard panel.
- **Move to Epic 97:** Receipt primitive itself, dispute primitive, verification endpoint, state machine.
- **New point estimate:** ~20 pts (was 37).

This narrowing reflects the natural primitive hierarchy: Epic 97 produces the artifact, Epic 93 derives a score from it. Without the narrowing, the two epics partially re-implement the same data structures with subtly different semantics — a real risk.

**Action item:** Confirm with @haxaco. If accepted, edit Epic 93 status header (`Total Points: 20`, `Stories: TBD/X`) and add a cross-reference note.

---

### Cross-Reference Hygiene

The "Related Documentation" section at the bottom of Epic 97 links to `epic-98-on-chain-anchoring.md` (with a hyphen in `on-chain`). The actual file is `epic-98-onchain-anchoring.md` (no hyphen). Suggest fixing in a follow-up edit to keep internal links resolving.
