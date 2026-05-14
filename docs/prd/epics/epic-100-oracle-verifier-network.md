# Epic 100: Oracle / Verifier Network ⚖️

**Status:** 🎨 **Design Only — Do Not Build. Buyer signal required.**
**Phase:** 5.5 (Trust & Verification Layer)
**Priority:** Demand-gated (P3 until buyer signal fires)
**Estimated Points:** ~200
**Stories:** 0/TBD
**Dependencies:** Epic 97 (PoW Foundation), Epic 98 (On-Chain Anchoring), Epic 62 (Escrow Orchestration), Epic 63 (External Reputation Bridge)
**Maps to APoW Roadmap:** R6 (Consensus + Arbitration)
**Buyer signal required:** Marketplace volume exceeds threshold where unilateral acceptance produces >2% fraud rate, OR multiple B2B contracting customers with transaction sizes >$10K, OR Mastercard/Visa explicit ask for multi-party verification as partnership condition, OR regulator requirement for independent verification in agent-mediated commerce.
**Created:** May 14, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Epic 97's receipt state machine has one structural weakness: the payer is the only acceptance gate. If the payer is colluding, lazy, captured, or simply offline, acceptance becomes a single point of failure. The fix is **consensus verification** — for high-value or sensitive work, multiple independent verifier agents inspect the delivery and submit sealed assessments. Reputation, escrow release, and dispute resolution then key off the consensus, not the payer's solo signature.

Epic 100 builds that network: multi-party verifier panels, sealed assessment protocol with simultaneous revelation, calibration bonus, collusion resistance mechanics, and a tiered arbitration ladder (automated → expanded re-evaluation → human expert panel → legal handoff).

This is the **hardest moat in the platform thesis**. A network of verifier agents you cannot replicate quickly without volume, calibration data, and game-theoretic balance. Per the research (APoW Paper IV), this layer suppresses ~94% of fraud and reduces reputation noise by ~61%.

It is also the highest-cost release in the APoW roadmap and the one most likely to fail without a real marketplace producing real volume to verify.

---

## Strategic Context

### Why this is design-only, not committed

- **Chicken-and-egg.** CVN (Consensus Verification Network) requires verifier supply. Verifier supply requires volume. Volume requires trust. Trust requires CVN. The bootstrap path is non-obvious and capital-intensive.
- **No marketplace at scale yet.** Epic 86–91 (Marketplaces) and the agentbazaar runtime are foundational, but volume and fraud rate are unknown. Building CVN before there is any verification market burns capital with no usage.
- **Cost.** ~200 points is the largest single epic in the roadmap. The fixed cost of getting the calibration bonus, sealed-assessment protocol, and panel-assignment algorithms right is high. Building before validation is a category mistake.

### What this epic is NOT

- Not a decentralized prediction market. The verifier network is permissioned (agents must hold KYA Tier ≥ 2 to verify) and the protocol is administered by Sly (not a DAO).
- Not a blockchain consensus layer. Verifier assessments are signed off-chain (EIP-712) and only the aggregated result and panel composition are anchored on-chain via Epic 98.
- Not a replacement for mechanical verification (Epic 99). When a mechanical verifier is sufficient, the oracle network is not invoked. Oracle network handles the subjective/contested cases.
- Not arbitration software. Tier 3 of the arbitration ladder hands off to existing legal forums (JAMS, ICC, LCIA) — Sly does not run arbitration itself.

---

## High-Level Architecture (draft, not committed)

### Panel sizing by transaction value

| Value tier | Panel size | Quorum | Notes |
|------------|-----------|--------|-------|
| <$100 | Skip CVN | n/a | Use mechanical verifier (Epic 99) or payer-only acceptance |
| $100–$1k | 3 | 2 of 3 | Auto-assign from active pool |
| $1k–$10k | 5 | 4 of 5 | Add reputation-weighted assignment |
| $10k–$100k | 9 | 6 of 9 | Pre-assignment collusion check |
| >$100k | 15 | 11 of 15 | Plus domain-expert seat reservation |

### Sealed assessment protocol

1. **Commit phase:** Each verifier submits `keccak256(assessment || nonce)` within window T_commit. Commits are visible; assessments are not.
2. **Reveal phase:** Each verifier submits `(assessment, nonce)` within window T_reveal. The protocol verifies the commit hash matches.
3. **Aggregation:** Sly tallies revealed assessments. Verifiers who fail to reveal are penalized (reputation slash + small fee forfeit). Verifiers who reveal but diverge from consensus by >σ are also penalized (calibration bonus mechanic).

### Calibration bonus

A verifier's reputation grows when they agree with consensus (calibration) and shrinks when they diverge. The bonus is asymmetric — modest reward for agreement, larger penalty for repeated divergence. Designed to incentivize honest assessment over consensus-following.

### Collusion resistance

Four mechanics, layered:
- **Pre-assignment randomness.** Panel composition is committed via VRF before the work is delivered, so colluders can't self-select.
- **Repeat-panel limit.** Same panel composition cannot occur twice within a sliding window N.
- **Agent-verifier separation.** A verifier cannot be assigned to assess a counterparty they have transacted with in the past M days.
- **Stake.** High-value panels require verifiers to lock a bond, slashable on collusion detection.

These mirror the patterns in Epic 63's collusion detection work (`docs/completed/epics/EPIC_63_COLLUSION_DETECTION.md`) which already shipped for the internal a2a-feedback source — proven primitive, scaled to the verifier network.

### Tiered arbitration ladder

| Tier | Mechanism | Latency target | Cost |
|------|-----------|---------------|------|
| 0 | Automated mediation (rule-based) | <1 min | $0 |
| 1 | Expanded CVN re-evaluation (panel size 2×) | 24 hours | Filing bond + verifier fees |
| 2 | Domain expert panel (humans in the loop, Sly curates) | 7 days | Bond + expert hourly rates |
| 3 | Legal arbitration handoff (JAMS, ICC, LCIA) | 30–180 days | External arbitration costs |

Filing bonds at each tier deter frivolous disputes; bonds are refunded on favorable outcome, forfeited on unfavorable.

---

## Open Questions (when buyer signal fires)

Six load-bearing questions:

1. **Verifier supply bootstrap.** How do we get the first 100 verifiers online before there is volume to verify? Options: (a) Sly-paid bootstrap verifiers, (b) tenant-provided verifier agents (existing customer agents earn reputation by verifying), (c) integration with existing verifier-style networks (Witness, UMA, others). Recommendation: (b) — uses existing trust.

2. **Sealed assessment privacy.** Sealed assessments leak the *fact* of disagreement (commit hashes differ even before reveal). Is that acceptable? Trade-off: full ZK-sealed assessments preserve full privacy but add ~50 pts of crypto engineering. Recommendation: start with public-commit / sealed-reveal; revisit if a customer requires stronger privacy.

3. **VRF source.** Chainlink VRF on Base is expensive per draw. Sly-operated VRF reduces cost but loses some decentralization claims. Recommendation: Sly-operated for sandbox + low-value tiers; Chainlink for $10k+.

4. **Verifier stake denomination.** USDC, SLY token (does not exist), reputation only? Recommendation: USDC for now; revisit if a token launch materializes.

5. **Domain expert curation (Tier 2).** Who decides who is a "domain expert" for, say, code review vs. translation vs. medical-record analysis? This is a partnership and onboarding problem disguised as a product problem. Recommendation: per-domain partner sourcing, gated by KYA Tier 3.

6. **Regulator stance.** Does multi-party verification with consensus aggregation qualify as "independent verification" under any specific regulatory framework? This is unknown today. Engagement with regulators is itself a prerequisite for the buyer signal.

---

## When to upgrade this from 🎨 Design Only to 📋 Committed

**Compound trigger:**
- Marketplace volume on Sly-hosted runtime exceeds the threshold where unilateral acceptance produces measurable fraud (e.g., >2% disputed receipts), OR
- A B2B contracting customer signs a deal explicitly requiring multi-party verification, OR
- A payment network (Mastercard, Visa) makes multi-party verification a partnership condition.

Until at least one of these fires, **do not invest engineering capacity here**. The protocol design ages well; the bootstrap mechanics age fast and need volume to validate.

---

## Why this stub exists

Same reasoning as [Epic 99](./epic-99-trace.md): when a customer asks *"how do you handle disputes at scale?"* or *"who verifies that the work was done?"*, the answer is not *"we'd have to invent that."* It is *"we have the design; here's the scope; here's the buyer signal needed to commit."*

Keeping this as design-only also protects Epic 97 and Epic 98 from scope drift. Verification consensus is a frequent question during pitches; without this doc, every conversation risks dragging consensus mechanics into the foundational receipt epic. With this doc, the scope has a clear home.

---

## Companion docs

- [`APOW_RELEASE_ROADMAP.md`](../APOW_RELEASE_ROADMAP.md) — R6 buyer-gating decision
- [`IDENTITY_AND_GOVERNANCE_STRATEGY.md`](../IDENTITY_AND_GOVERNANCE_STRATEGY.md) — verifier network's role in the four-primitive bet
- [Epic 62: Escrow Orchestration](./epic-62-escrow-orchestration.md) — escrow release keys off consensus
- [Epic 63: External Reputation Bridge](./epic-63-external-reputation-bridge.md) — reputation as input + output of CVN
- [`docs/completed/epics/EPIC_63_COLLUSION_DETECTION.md`](../../completed/epics/EPIC_63_COLLUSION_DETECTION.md) — proven collusion-detection primitive to scale
- [Epic 99: Trace](./epic-99-trace.md) — traces aggregate the verification steps CVN produces
