# Epic 99: Trace — Intent-to-Action Audit 🧬

**Status:** 🎨 **Design Only — Do Not Build. Buyer signal required.**
**Phase:** 5.5 (Trust & Verification Layer)
**Priority:** Demand-gated (P3 until buyer signal fires)
**Estimated Points:** ~150
**Stories:** 0/TBD
**Dependencies:** Epic 97 (PoW Foundation), Epic 98 (On-Chain Anchoring)
**Maps to APoW Roadmap:** R7 (Trace portion)
**Buyer signal required:** Underwriting partner MOU (Agent FICO use case), OR enterprise compliance team explicit ask for intent-to-action audit, OR regulator engagement requiring explainability of agent decisions.
**Created:** May 14, 2026 (drafted alongside Epic 98)

[← Back to Epic List](./README.md)

---

## Executive Summary

Epic 97 produces receipts: *"the agent paid for this thing and got it."*
Epic 98 anchors them on Base: *"the proof survives without Sly."*
Epic 99 produces traces: *"the agent decided to do this thing for this reason, considered these alternatives, used this plan, and here is every step from intent to outcome."*

A trace is a meta-structure that links the agent's original intent (a user prompt, a recurring trigger, a higher-level goal) through plan generation, discovery (which counterparties were considered), selection (why this one was chosen), mandate (Epic 97), settlement (existing rails), delivery (Epic 97), verification (mechanical or oracle-driven), dispute (Epic 97 if it fires), and close. Each step is a typed object with its own signed primitive when ownership matters, or a Sly-signed log entry when it doesn't.

The output: a regulator-readable, replayable record answering *"what did my agent do, why, with what alternatives, and with what outcome?"*

---

## Strategic Context

### Why this is design-only, not committed

The APoW Roadmap explicitly defers R7. Reasons:

- **No buyer today.** Agent FICO (Epic 95) is "Discovery" status. Enterprise compliance teams asking for intent-to-action audits are theoretical until one is in a sales call. Regulators are not yet at the table.
- **Premature build risk.** Trace is the most ambitious release. Highest design risk. Almost certain to be redesigned mid-build if started without a customer in the loop. The step type registry, the plan-replay engine, and the mechanical verifier library each carry redesign-cost > entire epic cost if assumptions are wrong.
- **Compounds on Epic 98 anchoring.** A trace without anchoring is just a database log. A trace anchored on-chain is a public audit primitive. Epic 99 inherits Epic 98's anchoring layer rather than re-deriving it.

### What this epic is NOT

- Not a replacement for the receipt (Epic 97). Receipts remain the per-transaction unit of proof.
- Not a replacement for the audit log. The audit log is per-action; a trace is per-intent and spans many actions/receipts.
- Not a generic event-sourcing framework. The step type registry is closed and versioned.
- Not an LLM observability tool. Tools like Langfuse, Helicone, Phoenix cover prompt → completion. Trace covers intent → action → settlement → outcome, which is a different scope (and a strict superset of LLM observability when the agent uses an LLM as one tool among many).

---

## High-Level Data Model (draft, not committed)

### `sly.trace.v1` — top-level container

A trace anchors an intent through to terminal outcome. It does **not** carry signatures itself; it carries hashes of signed children.

```typescript
// packages/types/src/trace/trace.ts (sketch)

export interface TraceV1 {
  traceId: string;                   // ULID, bytes32 once hashed
  agentDid: string;                  // did:sly:agent:0x...
  tenantId: string;
  originatorDid: string | null;      // who triggered this trace? (user, schedule, another agent)
  intent: IntentStep;                // root of the trace
  steps: TraceStep[];                // ordered list, append-only
  status: 'open' | 'closed_success' | 'closed_failure' | 'closed_partial' | 'closed_abandoned';
  startedAt: number;
  closedAt: number | null;
  schema: 'sly.trace.v1';
}
```

### Step type registry (closed enumeration, versioned)

```typescript
type StepType =
  | 'intent'        // initial goal / prompt / trigger
  | 'plan'          // agent's plan (LLM output or rule-engine output)
  | 'discovery'    // counterparties considered (e.g. /v1/x402/discover results)
  | 'selection'    // which counterparty chosen + reason
  | 'mandate'       // Epic 97 mandate hash
  | 'settlement'    // settlement tx hash + rail
  | 'delivery'      // payee-signed delivery receipt (Epic 97)
  | 'verification'  // mechanical verifier result OR oracle agent attestation
  | 'dispute'       // Epic 97 dispute, if fired
  | 'close'         // terminal step
```

Each step carries: `stepId`, `traceId`, `stepType`, `parentStepId` (DAG, not strictly linear), `payload` (type-specific), `payloadHash` (for anchoring), `signers` (zero or more), `createdAt`.

### Plan-replay engine (sketch)

Given a `plan` step + the discovery + selection steps that followed, the engine should be able to:
1. Re-execute the plan deterministically against the same discovery snapshot.
2. Verify that the selected counterparty was a valid choice given the selection criteria recorded.
3. Compare the achieved outcome against the planned outcome.

This is the hardest piece of the epic. Determinism is fragile when LLMs are in the planner; the spec must account for that (capture full prompt + temperature + seed if available, OR flag the plan step as `replay_status: 'non_deterministic'`).

### Mechanical verifier library

Per content type, a deterministic verifier:
- **Image:** PSNR, SSIM, presence-of-watermark checks
- **Text:** schema match, regex constraints, semantic similarity (cosine over embeddings)
- **Code:** test suite pass/fail, lint clean, build success
- **PDF:** page count, structural validation, content extraction match
- **Audio:** duration, sample rate, transcription similarity

Each verifier is a pure function. Output is a signed `verification` step. When a mechanical verifier is insufficient, the verification step references an oracle agent's signed attestation (sets up Epic 100).

---

## Open Questions (when buyer signal fires)

Six load-bearing questions that gate any implementation:

1. **Storage cost & retention.** A trace can carry hundreds of steps. At 100k traces/day × 50 steps × ~2 KB per step, that's ~10 GB/day in trace storage. Cost is manageable on Supabase, but the question is *how long*. Underwriting use cases (Agent FICO) want 7-year retention; ops contexts want 90 days. Recommendation: tiered retention with hot/cold storage and the customer pays for hot tier > 90 days.

2. **PII surface.** Traces may capture user prompts containing PII. Anchoring step *hashes* on-chain doesn't leak PII, but if a third party gets the off-chain payload, it does. Need a redaction layer at trace-export time AND a separate redacted variant for public verify. Adds engineering scope ~25 pts.

3. **LLM plan determinism.** If the planner is an LLM with non-zero temperature, plan replay is impossible. Options: (a) require deterministic planners for anchored traces, (b) flag non-deterministic plans as un-replayable, (c) capture `n` plan samples and verify *any* of them produced the selected action. Each has trade-offs. Recommendation: (b) — flag, don't block, document the limitation.

4. **Cross-trace links.** Sometimes intent A spawns sub-intent B (recursive delegation). Should traces nest? Recommendation: yes, via `parentTraceId` field. Adds query complexity but matches reality.

5. **Anchoring cadence vs. trace closure.** Epic 98 anchors per ~60s batch. A trace can span hours or days. Anchor each step independently, OR anchor only at trace close, OR both? Recommendation: each step independently (per Epic 98's existing model) plus a trace-close digest that hashes all step hashes for fast top-level verification.

6. **Replay safety.** If plan replay involves *re-executing* paid x402 calls, that costs real money and produces side effects. Replay must operate in a sandbox mode that mocks settlement. Adds infra dependency on a x402 sandbox replay environment.

---

## Why we wrote this stub instead of leaving it blank

A design-only doc serves two purposes for future-Sly:

1. **Anchors product thinking.** When a buyer asks *"can you do intent-to-action audit?"*, the answer isn't *"we'd have to invent that."* It's *"we have the design; here's the scope; here's the buyer signal needed to commit."*
2. **Prevents scope creep into Epic 97/98.** Without this doc, every conversation about Epic 97 risks adding "and also let's capture intent" mid-build. With this doc, that scope has a home and stays out of the committed epics.

---

## When to upgrade this from 🎨 Design Only to 📋 Committed

**Single trigger:** a customer signs an MOU that explicitly references intent-to-action audit OR Agent FICO underwriting. Until that happens, **do not invest engineering capacity here**. The design ages slowly; the build ages fast.

When the trigger fires, the first move is to re-validate every assumption in the Open Questions section against the actual customer's data and audit posture. Expect 25–40% of this stub to need rewriting.

---

## Companion docs

- [`APOW_RELEASE_ROADMAP.md`](../APOW_RELEASE_ROADMAP.md) — R7 buyer-gating decision
- [`IDENTITY_AND_GOVERNANCE_STRATEGY.md`](../IDENTITY_AND_GOVERNANCE_STRATEGY.md) — Trace's role in the four-primitive bet
- [Epic 97: Proof of Work Foundation](./epic-97-proof-of-work-foundation.md) — receipts that traces aggregate
- [Epic 98: On-Chain Anchoring](./epic-98-onchain-anchoring.md) — anchoring layer trace inherits
- [Epic 95: Agent FICO for B2B](./epic-95-agent-fico-for-b2b.md) — primary expected buyer
