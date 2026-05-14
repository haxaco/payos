# APoW Release Roadmap

**Status:** Draft v1
**Owner:** Diego Garcia (CEO)
**Last updated:** May 13, 2026

> **Principle:** Each release is gated by a concrete buyer signal. We commit to build only when there is demonstrated demand. Releases without confirmed demand stay in design.

---

## Roadmap at a glance

| # | Release | Timing | Effort | Status | Confirmed buyer today? |
|---|---------|--------|--------|--------|------------------------|
| **R1** | **Witness-Mode PoW** | Live | 0 (shipped) | 🟢 Live | ✅ Invu, Zindigi, Maera Phase 1 |
| **R2** | **Bilateral PoW Foundation** (Epic 97) | ~6 weeks | 76 pts | 🟢 **Commit** | ✅ Same pilots + YC/Series A credibility |
| **R3** | **On-Chain Anchoring** (Epic 98) | ~6 weeks after R2 | ~50 pts | 🟢 **Commit** | ✅ Mastercard Start Path, enterprise prospects |
| **R4** | **Session + Reputation v1** | ~8 weeks after R3 | ~70 pts | 🟡 Demand-gated | ⚠️ Track B amplifiers (Epic 92, 93, 95) when they validate |
| **R5** | **Scope + Alignment** (SVA) | ~12 weeks | ~120 pts | 🟡 Demand-gated | ❌ Hold until first B2B contracting deal |
| **R6** | **Consensus + Arbitration** (CVN + SAP) | ~16 weeks | ~200 pts | 🔴 Hold | ❌ Hold until marketplace volume exists |
| **R7** | **Objective Reputation + Trace** (ORE + Trace) | ~16 weeks | ~150 pts | 🔴 Hold | ❌ Hold until underwriting partner signs |

**Path to full APoW from today: ~666 points after Epic 97, realistic 12–18 months conditional on demand signals.**

---

## R1 — Witness-Mode PoW (Live today)

**What ships:**
- Settlement on Base via x402, AP2, ACP, UCP
- HMAC-SHA256 JWT proofs from Sly facilitator
- Contract Policy Engine from Epic 18 (JSONB+Zod rules)
- Agent KYA tier ladder
- Compliance/Dispute API (state tracking)
- Webhook delivery with tenant HMAC

**What this unlocks:**
- Governance gate on agent payments
- Settlement tx hash as on-chain truth
- Local 1ms JWT verification by providers
- Audit log for compliance teams
- Tenant-scoped dispute tracking

**Honest claim:** "Sly attests every governed transaction."
**Cannot claim:** "Non-repudiable bilateral proof."

**Confirmed buyer:** Invu POS, Zindigi, Maera Phase 1. All three are regulated fintechs that accept Sly as a contractual witness.

**Limitation:** Sly is the witness AND the signer. If Sly disappears, the proof loses its anchor.

---

## R2 — Bilateral PoW Foundation (Epic 97)

**What ships:** Defined in [`epics/epic-97-proof-of-work-foundation.md`](./epics/epic-97-proof-of-work-foundation.md)

- `Mandate`, `PolicyDecision`, `Receipt`, `Dispute` as EIP-712 typed objects
- Bilateral signing via agents' Circle Programmable Wallets
- Receipt state machine with 7 terminal states
- Public off-chain verification endpoint (unauthenticated)
- Protocol adapter refactor for x402, AP2, ACP, UCP, MPP

**What this unlocks:**
- "Non-repudiable, bilateral, replayable" becomes a true claim
- Anyone can verify a receipt without trusting Sly's API
- Policy decisions are replayable against immutable policy versions
- Disputes are signed evidence, not state flags
- Foundation everything else depends on

**Demand signal (already firing):**
- Current pilots' compliance teams ask "how do you prove this?"
- Investor pitches need a defensible "real proof of work" claim
- Maera Phase 2 governance layer requires bilateral attestation

**Buyer:** Same pilots upgrade for free. New enterprise sales motion unlocks. YC/Series A story has a concrete artifact.

**Risk of not shipping:** External proof of work claim remains aspirational. Competitors (Skyfire, Kite, Crossmint) ship comparable primitives and Sly's differentiation collapses.

---

## R3 — On-Chain Anchoring (Epic 98)

**What ships:**
- Merkle accumulator that batches receipts every ~60s
- Sly Anchor Contract on Base (audited Solidity)
- EAS schema registration for `sly.receipt.v1`, `sly.dispute.v1`, `sly.policy_decision.v1`
- Merkle proof generator
- Verification endpoint extends to include on-chain inclusion check

**What this unlocks:**
- Receipts portable beyond Sly's data layer
- Survives Sly being offline, acquired, or discontinued
- "On-chain proof of work" claim in pitch deck becomes true
- EAS attestations queryable by third parties without Sly involvement
- Foundation for portable agent reputation (R4) and marketplace work (R5+)

**Demand signals (already firing or near-term):**
- Mastercard Start Path return ask: "show us on-chain proof of governed transactions"
- Crypto-native enterprise prospects (Coinbase, Circle partners) treat on-chain anchoring as credibility marker
- Regulator engagement (TBD jurisdictions): can prove transactions on a public chain

**Buyer:** Enterprise compliance teams, crypto-native partners, regulator-engagement deals.

**Risk of not shipping:** "Witness mode but signed" is a half-claim. Cannot credibly say "Sly is the trust layer" when the trust evaporates if Sly does. R2 alone is good but vulnerable to "what if Sly is the single point of failure" objections.

---

## R4 — Session + Reputation v1

**What ships:**
- `sly.session.v1` schema for x402 and MPP high-frequency operations (5,000 micropayments collapse to one session-receipt)
- Reputation scoring engine with sybil weighting and decay
- `Sly Score` as a queryable surface
- Reputation attestations on EAS
- Policy engine reads reputation as an input (feedback loop closes)

**What this unlocks:**
- x402 and MPP economics stop breaking (per-call anchoring was uneconomic)
- Reputation as a first-class queryable artifact
- Epic 93 (Reputation Receipts) finally has data
- Epic 92 (Score-Gated x402 Endpoints) becomes possible
- Foundation for Agent FICO conversation (Epic 95)

**Demand signals to commit:**
1. First marketplace pilot signs LOI requiring reputation-gated access
2. Epic 92 (Score-Gated x402) gets a customer signal
3. Track B amplifiers (Epics 92–95) collectively justify the work
4. AgentBazaar or similar demo gains traction and reputation becomes part of the story

**Buyer:** First marketplace deployment, first Score-Gated x402 customer, first Agent FICO discussion.

**Risk of premature build:** Reputation without volume is empty. Building this before any marketplace exists means the score is computed but no one consumes it.

**Risk of delayed build:** Epic 93 ships as a thin attestation that does not feed a real reputation system. Track B amplifiers ship paper-thin.

---

## R5 — Scope + Alignment (SVA)

**What ships:**
- `sly.scd.v1` — Scope Commitment Document with acceptance_criteria, quality_dimensions, constraints, deliverable_format
- Scope Clarity Score (SCS) NLP module
- Alignment Score (AS) Layer 1 (structural) + Layer 2 (NLP criterion coverage)
- SCS gating that blocks tasks with insufficient scope clarity
- Demand BRQ Specification Quality signal feeds back to Epic 93

**What this unlocks:**
- Quality measurement on agent work outputs, not just settlement
- Most disputes prevented at scope-commit time (paper claims 45%)
- Foundation for high-value B2B agent contracting
- First step toward "objective verification" vs "subjective rating"

**Demand signals to commit:**
1. First B2B agent-to-agent contracting deal with transactions above $10K
2. Marketplace launch with quality-gated supply
3. Customer explicitly asks "how do we know the agent delivered the right thing"
4. Maera Phase 3 or comparable expansion that needs quality verification

**Buyer:** First B2B contracting customer, first marketplace operator that needs quality differentiation.

**Risk of premature build:** SVA's value depends on the scope structure being used in real transactions. Building it before customers ask means the SCD template gets designed in a vacuum and likely needs to be rewritten.

---

## R6 — Consensus + Arbitration (CVN + SAP)

**What ships:**
- Multi-party verifier panels (3 to 15+ verifiers per task value tier)
- Sealed assessment protocol with simultaneous revelation
- Verifier calibration bonus mechanism
- Collusion resistance (pre-assignment, repeat panel, agent-verifier)
- Tier 0 automated mediation
- Tier 1 expanded CVN re-evaluation
- Tier 2 domain expert panels (humans in the loop)
- Tier 3 legal arbitration handoff (JAMS, ICC, LCIA)
- Filing bonds and frivolous dispute deterrence

**What this unlocks:**
- Marketplace can handle high-value transactions without breaking on disputes
- Fraud-resistant acceptance (paper claims 94% fraud suppression)
- Reputation noise reduction (paper claims 61%)
- Foundation for regulated B2B contracting at scale
- The hardest moat: a network of verifier agents you cannot replicate quickly

**Demand signals to commit:**
1. Marketplace volume exceeds threshold where unilateral acceptance produces >2% fraud rate
2. Multiple B2B contracting customers with transaction sizes >$10K
3. Mastercard or Visa explicitly asks for multi-party verification as condition of partnership
4. Regulator requirement for independent verification in agent-mediated commerce

**Buyer:** Marketplace at scale, regulated B2B contracting market, payment networks requiring third-party verification.

**Risk of premature build:** CVN without verifiers is a panel of zero. Verifier supply itself is a chicken-and-egg problem. Building the machinery before there is any verification market burns capital with no usage.

---

## R7 — Objective Reputation Feed + Trace

**What ships:**
- ORE (Objective Reputation Entry) schema feeding Epic 93's composite score
- Reputation Floor Guarantee (subjective ratings cannot pull below objective floor)
- ORF integration with BRQ via alpha-weighted mixing
- `sly.trace.v1` meta-structure for intent-to-action audit
- Step type registry (intent, plan, discovery, selection, mandate, settlement, delivery, verification, dispute, close)
- Plan-replay engine
- Mechanical verifier library (image, text, code, audio, pdf)
- Verification oracle protocol with named verifier agents

**What this unlocks:**
- Underwriteable agent reputation (Agent FICO becomes credible)
- Full intent-to-action audit ("what did my agent do, why, with what outcome")
- Trace-level forensics for any agent decision
- Oracle protocol that any partner can implement

**Demand signals to commit:**
1. Underwriting partner (financial institution) signs MOU for Agent FICO use case
2. Enterprise compliance team explicitly asks for intent-to-action audit
3. Regulator engagement requires explainability of agent decisions, not just transactions
4. ZeroDev or comparable smart-account partner wants to use Sly traces as a primitive

**Buyer:** Agent FICO underwriting customer, enterprise compliance for autonomous workflows, financial services using agents for high-stakes decisions.

**Risk of premature build:** Most ambitious release. Highest cost. No clear buyer today. Almost certain to be redesigned mid-build if started without a customer in the loop.

---

## What to commit to today

**Hard commit (build now, both have confirmed buyers):**
- R2 — Bilateral PoW Foundation (Epic 97) — 76 pts, ~6 weeks
- R3 — On-Chain Anchoring (Epic 98) — ~50 pts, ~6 weeks after R2

Total commit: 126 pts, ~12 weeks elapsed. Lands end of Q3 2026.

**Soft commit (build only if a demand signal fires in next 8 weeks):**
- R4 — Session + Reputation v1 — wait for marketplace or Epic 92/95 customer signal

**Design only, do not build:**
- R5, R6, R7 — design documents and architecture, no implementation, no engineering capacity allocated. Revisit when buyer signal exists.

---

## What to communicate externally

**Today's defensible claim (R1 live):**
> "Sly is the governance layer for the agentic economy. Every governed transaction produces a verifiable settlement record, a policy decision log, and a cryptographic proof."

**After R2 ships (~6 weeks):**
> "Sly produces bilateral, non-repudiable, replayable proof of work for every governed transaction. Both parties sign; anyone can verify."

**After R3 ships (~12 weeks):**
> "Sly anchors proof of work on Base. Receipts are publicly verifiable, portable across platforms, and survive any single point of failure."

**Aspirational vision (full APoW per Paper IV, not a near-term claim):**
> "The full Agentic Economy framework — scope commitment, alignment scoring, consensus verification, structured arbitration, objective reputation — is Sly's research roadmap. Sly Layer 0 ships now; layers 1–5 follow as the marketplace ecosystem matures."

---

## Decision required

The roadmap above assumes R2 and R3 are hard commits and everything else is buyer-gated. Two open questions:

1. **Is the paper (APoW Paper IV) published, internal, or both?** If published externally as Sly's framework, the marketing must explicitly frame it as a phased roadmap, not a current product claim.
2. **Does the AgentBazaar hackathon (May 5-7) or related demo create a near-term marketplace signal that would trigger R4?** If yes, R4 may move from demand-gated to soft commit by Q4 2026.

Both decisions affect sequencing, not the architecture.
