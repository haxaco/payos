# Sly Identity & Governance — Platform Strategy

**Status:** Draft v0.1 — May 2026
**Owner:** Diego (haxaco@gmail.com)
**Companion docs:** [`PayOS_PRD_Master.md`](./PayOS_PRD_Master.md), [`MARKETPLACES_STRATEGY.md`](./MARKETPLACES_STRATEGY.md), [`APOW_RELEASE_ROADMAP.md`](./APOW_RELEASE_ROADMAP.md), Working Paper IV (APoW)
**Source:** APoW Roadmap discussions (May 2026), Epic 97 design decisions, gap analysis vs. competitive landscape (Skyfire, Kite, Crossmint).

---

## Why this doc exists

Sly's pitch positions the platform as *"the trust layer for the agentic economy."* That claim is true in spirit and currently half-true in code: KYA tiers are live, agent wallets are live, settlement is live on five protocols. But the connective tissue — what makes those primitives *non-repudiable, replayable, regulator-readable* — has only been documented epic-by-epic. Across twelve epics (18, 62–64, 73, 80, 87, 92–100) the story reads as twelve initiatives instead of one platform thesis.

This document is the source of truth for the platform thesis. It:

1. Defines **four primitives that compose into the trust layer**: Identity (who), Governance (whether), Policy (how), Proof of Work (what happened).
2. Maps every active and design-only epic to one of the four primitives.
3. Specifies how the primitives **compound** — KYA × KYM × ERC-8004 × bilateral receipts × on-chain anchoring is the moat versus existing agentic marketplaces.
4. Sequences the build against the APoW release roadmap (R1 → R7) and the marketplaces platform (Tracks A + B).
5. Explicitly lists what is **demand-gated** vs **committed**, with the buyer signal needed to flip the gate.

It is not a feature list. The feature lists are the per-epic docs. This is the *why these features cohere into a platform*.

---

## Working framing

Throughout this doc:

- **"Identity"** is the *who* — KYA, KYM, agent wallets, proof-of-humanity, ZeroDev kernel binding.
- **"Governance"** is the *whether* — should this action happen, given the identity and the policy?
- **"Policy"** is the *how* — the encoded rules that governance evaluates.
- **"Proof of Work"** is the *what happened* — the signed, replayable record that the action did occur, with what counterparties, under what policy, with what outcome.

These four words are load-bearing. They appear in customer conversations, investor pitches, and the master PRD. When a feature touches more than one, it is treated as a *system* concern; when it touches only one, it lives inside the corresponding primitive's epic stack.

---

## The four-primitive bet

| Primitive | What it is | Status today | Core epics |
|---|---|---|---|
| **Identity** — who | Tiered, portable, on-chain-anchored identity for agents *and* marketplaces. Spans KYA tiers, ERC-8004 NFTs, marketplace KYM tiers, smart-account kernels, proof-of-humanity. | KYA ✅ shipped (Epic 73); KYM 📋 committed (Epic 87); kernel + PoH 📋/🎨 design+discovery | 3, 73, 80, 87, 96 |
| **Governance** — whether | Pre-action gating layer: contract policies, escrow lifecycle, reputation thresholds, scope/capability tokens. The gate between identity and action. | Contract policy engine ✅ shipped (Epic 18); escrow 📋 Pending (Epic 62); reputation bridge 📋 5/7 (Epic 63); score-gated endpoints 📋 (Epic 92) | 18, 62, 63, 64, 82, 92 |
| **Policy** — how | The encoded rules. JSONB+Zod for contract policy today; signed `PolicyDecision` artifact (Epic 97 Story 97.4) going forward. Replayable against immutable policy_hash. | Engine ✅; signed decision artifact 📋 (lands with Epic 97) | 18, 29, 97 |
| **Proof of Work** — what happened | Bilateral signed receipts, on-chain anchoring, trace, oracle/verifier consensus. The non-repudiable record. | R1 (HMAC witness) ✅; R2 (bilateral EIP-712) 📋 committed (Epic 97); R3 (anchor) 📋 committed (Epic 98); R6/R7 🎨 design (Epic 99/100) | 14, 97, 98, 99, 100 |

These four are **symmetric**. Each has the same shape: a typed primitive, a signed artifact, a tiered or graded variant, and a portable on-chain proof. The same architecture that justifies tier-gating an agent's spend (KYA → governance → policy → receipt) generalizes to gating a marketplace's reach (KYM → governance → policy → receipt) and to gating a verifier's panel seat (reputation → governance → policy → receipt).

The combination — **all four primitives, symmetric, on-chain-proven, portable across marketplaces and host apps** — is the platform claim that nobody else has. Skyfire, Kite, and Crossmint each own one or two primitives; none own all four with the symmetry across agents *and* marketplaces.

---

## Dependency graph

```
                           ┌────────────────────────┐
                           │  Identity              │
                           │  (KYA, KYM, kernels)   │
                           │  Epics 73, 87, 96, 80  │
                           └──────────┬─────────────┘
                                      │
                                      │ "this actor is allowed"
                                      ▼
              ┌────────────────────────────────────────────┐
              │           Governance                       │
              │  (policy gate, escrow, reputation)         │
              │  Epics 18, 62, 63, 64, 82, 92             │
              └───────┬─────────────────┬──────────────────┘
                      │                 │
                      │ "this action    │ "this action allowed
                      │  expressed how" │  for this counterparty"
                      ▼                 ▼
       ┌──────────────────────┐  ┌────────────────────────┐
       │       Policy         │  │  External Reputation   │
       │  (signed decisions)  │  │  (ERC-8004, Mnemom,    │
       │  Epics 18, 29, 97    │  │   Vouched, escrow)     │
       └──────────┬───────────┘  │  Epic 63               │
                  │              └────────────────────────┘
                  │
                  ▼
       ┌──────────────────────────────────────────────────┐
       │           Proof of Work                          │
       │                                                  │
       │  R1 — Witness Mode (HMAC, today)                 │
       │  R2 — Bilateral Receipts (Epic 97, committed)    │
       │  R3 — On-Chain Anchoring (Epic 98, committed)    │
       │  R4 — Sessions + Reputation (demand-gated)       │
       │  R5 — Scope + Alignment (SVA, demand-gated)      │
       │  R6 — CVN + SAP (Epic 100, design)              │
       │  R7 — ORE + Trace (Epic 99 + ORE, design)        │
       └──────────────────────────────────────────────────┘
                  │
                  │ feeds back into Governance + Identity
                  ▼
                (closes the loop)
```

The arrows are real. Identity decides who can act → Governance decides whether → Policy expresses how the gate evaluates → Proof of Work records what happened → the record feeds back into identity (reputation) and governance (calibration).

---

## Strategic positioning

### Why "identity that travels" beats "identity that lives in one marketplace"

GPT Store, Hugging Face Spaces, and Salesforce Agentforce all attest agent identity *for their own platform*. Move the agent to another host and the identity does not come with it. Reputation accrued on one platform is illegible on the next. This is acceptable in a centralized-SaaS world; it is a structural failure in an agentic-commerce world where agents are expected to compose, delegate, and act across hosts.

KYA + KYM solves this. The agent's KYA tier and the marketplace's KYM tier are anchored on Base via ERC-8004 (agents) and the MarketplaceRegistry contract (marketplaces, Epic 88). The proof is on-chain; any host that wants to honor it can verify without trusting Sly's API. ZeroDev kernel binding (Epic 96) extends the same identity to smart-account contexts where the agent operates as the smart-account owner — preserving identity portability even when Sly is not in the request path.

### Why bilateral receipts beat HMAC witness mode

Today's R1 claim: *"Sly attests every governed transaction."* True, but the trust model is *"Sly says this happened."* If Sly disappears or is captured, the proof loses its anchor.

R2 (Epic 97) shifts to *"Payer X signed the mandate. Payee Y signed the delivery. Sly verified policy and witnessed."* That sentence is what makes the claim non-repudiable. Anyone can verify a receipt by checking three signatures and one settlement transaction on Base — without trusting Sly's API. R3 (Epic 98) anchors the receipt hashes on-chain, so the proof survives even if Sly disappears.

The competitive risk of *not* shipping R2/R3 is concrete: Skyfire, Kite, and Crossmint are each shipping comparable primitives. Without bilateral non-repudiable proof, Sly's differentiation collapses to "we have more rails." More rails is a feature; non-repudiable proof is a platform.

### Why policy needs to be a signed, replayable artifact

The contract policy engine (Epic 18, Story 18.7) is excellent at gating actions in real time. It is not currently good at *proving, after the fact, that the gate ran correctly*. Today's audit log records the inputs and the decision; it does not produce a signed artifact that ties the decision to the immutable policy document at evaluation time.

Epic 97 Story 97.4 fixes this: every policy evaluation produces a `sly.policy_decision.v1` record signed by Sly's KMS key, carrying `policyHash` (SHA-256 of the policy document at eval time) and `predicates_evaluated` (per-rule pass/fail). The result: a regulator can replay the decision against the immutable policy version and confirm the gate ran as documented. The policy becomes a *first-class artifact*, not a config blob.

### Why the four primitives compound into a moat

Each primitive alone is replicable. KYA is "tiered identity"; multiple vendors offer it. KYM is "marketplace verification"; trust seals exist. Contract policies are commodity middleware. Receipts are JWTs in many systems.

The compound — KYA × KYM × ERC-8004 × bilateral receipts × on-chain anchoring × portable across hosts — is not replicable in a quarter. It requires symmetric design across agents and marketplaces, on-chain identity for both, signed receipts that link to both, and an SDK that lets host apps trust the result without trusting Sly's API. Building all five takes a team-quarter of focused work assuming clean primitives; replicating it requires reverse-engineering five interconnected pieces against a moving target. That gap is the moat.

---

## Implementation sequence

This table overlays the APoW roadmap (R1–R7) with the Marketplaces Platform (Track A / Track B) and the trust-and-verification work (Phase 5.5). It is the single sequencing diagram for the four-primitive thesis.

| Quarter / window | Identity work | Governance work | Policy work | Proof of Work | Buyer signal status |
|---|---|---|---|---|---|
| **Today (May 2026)** | KYA ✅, agent wallets ✅, ERC-8004 ✅ | Policy engine ✅, reputation bridge 📋 5/7 | JSONB+Zod rules ✅ | R1: HMAC witness ✅ | Pilots confirmed (Invu, Zindigi, Maera) |
| **+6 weeks (Q3 2026 start)** | Marketplace as entity (Epic 86) → KYM (Epic 87) → on-chain registry (Epic 88) → Discovery API (Epic 89) → Explorer (Epic 90) | Score-gated x402 (Epic 92) | Signed PolicyDecision (Epic 97.4) | **R2: Bilateral receipts (Epic 97) — committed** | Pilots upgrade free; YC/Series A credibility |
| **+12 weeks** | Managed marketplace runtime (Epic 91) | Reputation receipts (Epic 93, scope-cut) | Receipt-policy timeouts per protocol class (Epic 97) | **R3: On-chain anchoring (Epic 98) — committed** | Mastercard Start Path, crypto-native enterprise |
| **+20 weeks** | Identity Badge SDK (Epic 94) | — | — | R4: Session + Reputation v1 (demand-gated) | First marketplace LOI, Epic 92 customer, AgentBazaar traction |
| **+32 weeks** | ZeroDev kernel integration (Epic 96) | — | SVA: Scope Commitment Document | R5: Scope + Alignment (demand-gated) | First B2B contracting deal >$10K |
| **+48 weeks** | Agent FICO discovery (Epic 95) → ORE | — | — | R6: CVN + SAP (Epic 100, design only) | Marketplace volume threshold, regulator ask |
| **+64 weeks** | — | — | — | R7: ORE + Trace (Epic 99 + ORE, design only) | Underwriting partner MOU, enterprise compliance ask |

**Three buckets of commitment:**

- **Hard commit** (build now): R2 + R3 + Marketplaces Track A foundation (Epics 86–90).
- **Soft commit** (build when one signal fires): R4, Marketplaces Track B (Epics 92, 93, 94, 96), Epic 95.
- **Design only** (do not build, revisit when signal fires): R5, R6 (Epic 100), R7 (Epic 99).

---

## Identity dimensions worth tracking

Five questions worth answering for every customer conversation. Each maps to a Sly product surface:

| Question | Sly surface | Owning epic |
|---|---|---|
| Who is the agent? | KYA tier, ERC-8004 NFT | Epic 73, Epic 3 |
| Who runs the marketplace? | KYM tier, MarketplaceRegistry | Epic 87, Epic 88 |
| Is there a human behind this agent? | Proof-of-humanity (World ID dual-auth) | Epic 80 (deferred) |
| Where else does the agent operate? | Cross-marketplace directory, kernel binding | Epic 86, Epic 90, Epic 96 |
| What has the agent proven? | Reputation, receipts, on-chain proofs | Epic 63, Epic 93, Epic 97, Epic 98 |

When a sales conversation reveals that the customer cares about a different combination of these five, the answer is rarely "we need to build something new." Far more often it is "here is which of these we have shipped, here is which is coming next per the APoW roadmap, and here is how the demand signal you just gave us moves the gate." This doc + the APoW roadmap + the status matrix together carry that conversation.

---

## Governance surface

Three load-bearing governance components, in dependency order:

### 1. Contract Policy Engine (Epic 18)

JSONB + Zod rules evaluated before any agent action. Today the engine is fast (<5ms p99) and well-tested but not introspectable post-hoc — there is no signed record of "the engine ran rule X, it returned Y, against this exact rule version." Epic 97 Story 97.4 fixes this by wrapping the engine with a `PolicyDecisionLogger` that produces signed records.

### 2. Escrow Orchestration (Epic 62)

Wraps AgentEscrowProtocol on Base with enterprise governance: pre-escrow authorization, lifecycle monitoring, release governance, kill switch, and settlement to local rails (Pix/SPEI). The release gate consumes reputation (Epic 63) and policy decisions (Epic 18, Epic 97).

### 3. External Reputation Bridge (Epic 63)

Read-only aggregation of ERC-8004, Mnemom, Vouched/MCP-I, and on-chain escrow history into a unified 0–1000 trust score. **5/7 stories complete**; collusion detection (the hardest piece) [is shipped](../completed/epics/EPIC_63_COLLUSION_DETECTION.md) on the internal a2a-feedback source — v1 + v2 ring coefficient + live flagging + red-team audit. The remaining work (Stories 63.3 — Mnemom, 63.4 — Vouched) is blocked on external SDKs.

The bridge feeds back into the policy engine: a contract policy can reference reputation tiers in its predicates (`if counterparty_reputation < 600 then require-tier-3-approval`). This closes the loop between governance and proof-of-work — reputation derived from receipts becomes input to the next governance decision.

---

## Policy as a first-class artifact

Until Epic 97 Story 97.4 ships, policies are JSONB blobs in `contract_policies` with a numeric version. The version increments on edit; the historical content is not signed. A regulator asking *"prove the policy ran as documented on March 14 at 14:32 UTC"* can read the audit log and *believe* the engine, but cannot verify the policy document the engine ran against has not been mutated.

After Epic 97 Story 97.4:

1. Every policy version's content is hashed (`SHA-256 → policy_hash`).
2. Every evaluation produces a signed `PolicyDecision` record carrying `policy_hash` + per-rule pass/fail + the decision + a Sly KMS signature.
3. The decision record is anchored on-chain via Epic 98.
4. A third-party verifier can compute `SHA-256(historical_policy_document)`, match against `policy_hash`, replay the evaluation, and confirm the engine returned the same decision.

This is what "policy as a first-class artifact" means. The policy is no longer a config blob; it is part of the trust surface.

**Open question for partner conversations:** should the policy document itself be signed by the tenant, not just hashed by Sly? Today: hashed by Sly only. Future: tenant signs the policy version with the tenant root wallet, Sly counter-signs each evaluation. Adds ~12 pts of scope. Defer until a customer asks.

---

## Proof-of-work release ladder

Lifted from `APOW_RELEASE_ROADMAP.md`, normalized to this doc's primitive vocabulary:

| Release | Identity uses | Governance uses | Policy uses | Proof of Work output |
|---|---|---|---|---|
| **R1** (today) | KYA tier at action time | Contract policy gate | JSONB+Zod, unsigned | HMAC JWT, Sly-attested |
| **R2** (Epic 97, committed) | KYA tier + payer DID, payee DID | Same gate; gate now emits signed PolicyDecision | JSONB+Zod, signed PolicyDecision artifact | Bilateral EIP-712 receipts |
| **R3** (Epic 98, committed) | + Identity proof anchored | + Decision anchored | + Policy hash anchored | + On-chain Merkle anchor + EAS |
| **R4** (demand-gated) | + Reputation as input | + Reputation thresholds in policy | + Reputation predicates | + Session aggregation |
| **R5** (demand-gated) | + Scope Commitment Document | + Acceptance criteria gate | + Scope Clarity Score | + Alignment score |
| **R6** (Epic 100, design) | + Verifier KYA | + Multi-party verification gate | + Calibration bonus rules | + Consensus assessments |
| **R7** (Epic 99, design) | + Originator identity per trace | + Replay-based gate | + Trace step type registry | + Trace + ORE |

Each row strictly extends the previous one. No row replaces; everything composes.

---

## Out of scope (for now)

These are intentionally deferred. Most are valuable but compete for engineering time with the structural primitives above.

- **A Sly native token.** No token economy. Settlement is USDC via x402 (and other Sly-supported rails). Verifier stakes (Epic 100) are USDC-denominated. We do not own a token launch motion.
- **Sly-operated Layer 2 or appchain.** Anchoring goes to Base. No Sly-operated chain.
- **Compliance-grade KYM (FATF/AML).** Light KYB-style verification only at T2. Fuller compliance is an enterprise concern handled per-customer.
- **Generic ZK proofs.** Sealed assessment (Epic 100) starts as public-commit / sealed-reveal. ZK adds ~50 pts and is parked until a customer requires stronger privacy.
- **Multi-chain anchoring.** Today Base only. Anchoring contract is portable Solidity but cross-chain bridges are parked until a buyer needs it.
- **DAO governance for Sly itself.** No DAO. Sly is a corporation with KMS-managed keys.

---

## Adjacent work flagged for review

Two pieces of recent investigation that may affect this strategy and don't have an epic yet:

- **`docs/investigations/agentforce-org-probe.md`** (added 2026-05-14, +228 lines) — Salesforce Agentforce organization probe. May inform Epic 96 (smart-account integrations) or open a separate epic for Agentforce-style identity bridges. **Flagged as future epic candidate.**
- **`apps/api/scripts/_probe-grants*.mjs`** — Live probing of an external grants API surface. Not an epic; operational tooling. If a pattern emerges, may inform Epic 63 (reputation bridge).

---

## Source for epic decomposition

Each entry in the implementation sequence above maps 1:1 to an epic in `docs/prd/epics/epic-NN-*.md`. The story-level decomposition (points, dependencies, SDK impact) lives in the epic files. This strategy doc is the *why*; the epics are the *what* and *how*. The PRD master version history (currently v1.28) is the *when*.

When partner conversations or customer signals shift the sequencing, the change goes here first, then propagates to:

1. `APOW_RELEASE_ROADMAP.md` (release gate adjusted)
2. `PRD_STATUS_MATRIX.md` (status flipped if a gate fires)
3. The affected epic file's status header
4. A new master PRD version history entry summarizing the shift

This four-step propagation is the rule of record for keeping the platform thesis legible across docs.
