# Sly PRD — Epic Status Matrix

**Generated:** 2026-05-14 · **Companion to:** [`PayOS_PRD_Master.md`](./PayOS_PRD_Master.md) v1.28
**Update cadence:** Refresh on every master PRD version bump.

This is the single-page truth board for all 97 epics. Status is derived from (in order): completion docs under `docs/completed/`, master PRD version history markers, open PRs / active branches, and epic-doc status headers. When sources disagree, the completion doc wins, then the epic-doc header, then the master PRD.

**Legend:**
- ✅ Done — shipped and validated
- 🚧 In Progress — branch open or active development
- 📋 Pending — scoped, not started
- 🎨 Design Only — drafted, do not build (buyer signal required)
- 🚫 Deprecated — superseded or absorbed

---

## Status Matrix

| Epic | Title | Status | Pts | Phase | Last Activity | Linear | Doc |
|------|-------|--------|----:|-------|---------------|--------|-----|
| 0 | Foundation Cleanup | ✅ | — | 0 | Dec 2025 | — | [doc](../completed/epics/EPIC_0_COMPLETE.md) |
| 1 | Foundation & Multi-Tenancy | ✅ | — | 1 | Dec 2025 | — | (in master PRD) |
| 2 | Account System | ✅ | — | 1 | Dec 2025 | — | (in master PRD) |
| 3 | Agent System & KYA | ✅ | — | 1 | Dec 2025 | — | (in master PRD) |
| 4 | Transfers & Payments | ✅ | — | 1 | Dec 2025 | — | (in master PRD) |
| 5 | Money Streaming | ✅ | — | 1 | Dec 2025 | — | (in master PRD) |
| 6 | Reports & Documents | ✅ | — | 1 | Dec 2025 | — | (in master PRD) |
| 7 | Dashboard UI | ✅ | — | 1 | Dec 2025 | — | (in master PRD) |
| 8 | AI Visibility & Agent Intelligence | ✅ | — | 1.5 | Dec 2025 | — | (in master PRD) |
| 9 | Demo Polish & Missing Features | ✅ | — | 1.5 | Dec 2025 | — | (in master PRD) |
| 10 | PSP Table Stakes | ✅ | — | 2 | Dec 2025 | — | (in master PRD) |
| 11 | Auth & User Management | ✅ | — | 2 | Dec 2025 | — | [story 11.12](../completed/EPIC_11_STORY_11.12_COMPLETE.md) |
| 12 | Client-Side Caching | ✅ | — | 2 | Dec 2025 | — | (in master PRD) |
| 13 | Advanced Auth & Security | ✅ | — | 2 | Dec 2025 | — | (in master PRD) |
| 14 | Compliance & Dispute APIs | ✅ | — | 2 | Dec 2025 | — | [doc](../completed/epics/EPIC_14_COMPLETE.md) |
| 15 | RLS Hardening | ✅ | — | 2 | Dec 2025 | — | [doc](../completed/EPIC_15_FINAL_STATUS.md) |
| 16 | DB Function Security & Perf | ✅ | — | 2 | Dec 2025 | — | [doc](../completed/epics/EPIC_16_COMPLETE.md) |
| 17 | Multi-Protocol Gateway | ✅ | 53 | 3 | Dec 28, 2025 | — | [doc](../completed/epics/EPIC_17_COMPLETE.md) |
| 18 | Agent Wallets & Contract Policies | ✅ | 35 | 5.2 | Mar 14, 2026 | — | [epic](./epics/epic-18-agent-wallets-contract-policies.md) |
| 19 | Sly x402 Services | 📋 | 22 | C | TBD | — | [epic](./epics/epic-19-x402-services.md) |
| 20 | Streaming Payments & Agent Registry | 📋 | 28 | D | TBD | — | [epic](./epics/epic-20-streaming-payments.md) |
| 21 | Code Coverage | 📋 | 112 | Ongoing | TBD | — | [doc](../completed/EPIC_21_CODE_COVERAGE.md) (partial) |
| 22 | Seed Data & Final UI | ✅ | 21 | Post-0 | Dec 18, 2025 | — | [doc](../completed/epics/EPIC_22_COMPLETE.md) |
| 23 | Dashboard Performance | ✅ | 18 | Perf | Dec 22, 2025 | — | [epic](./epics/epic-23-dashboard-performance.md) |
| 24 | Enhanced API Key Security | 📋 | 31 | Security | TBD | — | [epic](./epics/epic-24-api-key-security.md) |
| 25 | User Onboarding | 🚫 | 40 | — | — | — | absorbed → Epic 51 |
| 26 | x402 Performance | ✅ | 12 | Perf | Q1 2026 | — | [epic](./epics/epic-26-x402-performance.md) (Phase 3 deferred) |
| 27 | Settlement Infrastructure | ✅ | 26 | 5 | Dec 30, 2025 | — | [epic](./epics/epic-27-settlement.md) |
| 28 | Simulation Engine | ✅ | 24 | AI-Native | Q1 2026 | — | [epic](./epics/epic-28-simulation.md) |
| 29 | Workflow Engine | 📋 | 52 | 6 | TBD | — | [epic](./epics/epic-29-workflow-engine.md) |
| 30 | Structured Response System | ✅ | 28 | AI-Native | Q1 2026 | — | [epic](./epics/epic-30-structured-response.md) |
| 31 | Context API | 🚧 | 21 | AI-Native | Q1 2026 | — | [epic](./epics/epic-31-context-api.md) |
| 32 | Tool Discovery | 🚫 | — | — | — | — | absorbed → Epic 36 |
| 33 | Metadata Schema | 📋 | 11 | AI-Native | TBD | — | [epic](./epics/epic-33-metadata-schema.md) |
| 34 | Transaction Decomposition | 📋 | 14 | AI-Native | TBD | — | [epic](./epics/epic-34-transaction-decomposition.md) |
| 35 | Entity Onboarding API | 🚫 | — | — | — | — | absorbed → Epic 25 → Epic 51 |
| 36 | @sly/sdk — Unified SDK & DX | ✅ | 66 | 3.5/4 | Q1 2026 | — | [doc](../completed/EPIC_36_COMPLETE.md) |
| 37 | Facilitator-as-a-Service | 📋 | TBD | Future | — | — | [epic](./epics/epic-37-facilitator-as-a-service.md) |
| 38 | Payment-Optimized Chains | ✅ | 63 | Perf | Q1 2026 | — | [epic](./epics/epic-38-payment-optimized-chains.md) |
| 39 | Open Issuance | 📋 | TBD | Future | — | — | [epic](./epics/epic-39-open-issuance.md) |
| 40 | External Sandbox Integrations | ✅ | ~100 | 3.5 | Jan 5, 2026 | — | [epic](./epics/epic-40-sandbox-integrations.md) |
| 41 | On-Ramp Integrations | 📋 | 110 | 3.5 | TBD | — | [epic](./epics/epic-41-onramp-integrations.md) |
| 42 | Frontend Dashboard Integration | ✅ | 65 | 3.5 | Jan 6, 2026 | — | [epic](./epics/epic-42-frontend-dashboard.md) |
| 43 | Cards Infrastructure (VDC) | 📋 | 47 | 3.5 | TBD | — | [epic](./epics/epic-43-cards-infrastructure.md) |
| 43 | UCP Integration *(legacy name)* | ✅ | 55 | 3.5 | Jan 19, 2026 | — | [epic](./epics/epic-43-ucp-integration.md) |
| 44 | Observability & Monitoring | 📋 | ~40 | 5 | — | — | [epic](./epics/epic-44-observability.md) |
| 45 | Webhook Infrastructure | 📋 | ~35 | 5 | — | — | [epic](./epics/epic-45-webhook-infrastructure.md) |
| 46 | Multi-Region & DR | 📋 | ~60 | 6 | — | — | [epic](./epics/epic-46-disaster-recovery.md) |
| 47 | UCP Merchant Gateway | 📋 | 89 | 4 | — | — | [epic](./epics/epic-47-ucp-merchant-gateway.md) |
| 48 | Connected Accounts | ✅ | 21 | 4.0 | Q1 2026 | — | [epic](./epics/epic-48-connected-accounts.md) |
| 49 | Protocol Discovery | ✅ | 18 | 4.0 | Q1 2026 | — | [epic](./epics/epic-49-protocol-discovery.md) |
| 50 | Settlement Decoupling | ✅ | 26 | 4.0 | Q1 2026 | — | [epic](./epics/epic-50-settlement-decoupling.md) |
| 51 | Unified Onboarding | ✅ | 52 | 4.0 | Q1 2026 | — | [epic](./epics/epic-51-unified-onboarding.md) |
| 52 | Dashboard Redesign (Agentic) | ✅ | 21 | 4.0 | Q1 2026 | — | [epic](./epics/epic-52-dashboard-redesign.md) |
| 53 | Card Network Agentic Commerce | 📋 | 62 | 4.5 | TBD | — | [epic](./epics/epic-53-card-network-agentic-commerce.md) |
| 54 | OpenAI Agentic Checkout Spec (ACS) | 📋 | ~55 | 4 | Feb 16, 2026 | — | [epic](./epics/epic-54-agentic-checkout-spec.md) |
| 54 | PayOS → Sly Rebranding *(legacy)* | ✅ | 34 | 5.0 | Jan 27, 2026 | — | [epic](./epics/epic-54-sly-rebranding.md) |
| 55 | Demo Scenario Readiness | 📋 | 89 | 5.1 | TBD | — | [epic](./epics/epic-55-demo-scenario-readiness.md) |
| 56 | Agentic Commerce Demand Scanner | ✅ | 138 | 4 | Q1 2026 | — | [epic](./epics/epic-56-agentic-commerce-demand-scanner.md) |
| 57 | Google A2A Protocol | ✅ | 89 | 5.2 | Feb 21, 2026 | — | [epic](./epics/epic-57-google-a2a-protocol.md) |
| 58 | A2A Task Processor Worker | ✅ | 109/119 | 5.2 | Q1 2026 | — | [doc](../completed/epics/EPIC_58_IMPLEMENTATION_STATUS.md) |
| 59 | User Onboarding & SSO | ✅ | 76 | 3.5 | Q1 2026 | — | [epic](./epics/epic-59-user-onboarding-sso-agent-signup.md) |
| 60 | A2A Agent Onboarding Skills | 🚧 | 28 | 5.2 | Mar 2026 | — | [epic](./epics/epic-60-a2a-agent-onboarding-skills.md) |
| 61 | Agent Wallet Identity | 📋 | TBD | 5.2 | — | — | [epic](./epics/epic-61-agent-wallet-identity.md) |
| 62 | Escrow Orchestration | 📋 | 44 | 5.3 | Mar 2026 | — | [epic](./epics/epic-62-escrow-orchestration.md) |
| 63 | External Reputation Bridge | 📋 (5/7) | 25 | 5.3 | Mar 2026 | — | [epic](./epics/epic-63-external-reputation-bridge.md) · [collusion-detection complete](../completed/epics/EPIC_63_COLLUSION_DETECTION.md) |
| 64 | OpenClaw Governance Skill | 📋 | 10 | 5.4 | Mar 2026 | — | [epic](./epics/epic-64-openclaw-governance-skill.md) |
| 65 | — | — | — | — | — | — | *(number skipped)* |
| 66 | Email Notification System | 🚧 | 35 | — | Mar 2026 | [SLY-66 project](https://linear.app/sly-ai/project/epic-66-email-notification-system-4a8bb5cb1597) | [epic](./epics/epic-66-email-notification-system.md) |
| 67 | Production Environment Mode | 📋 | 88 | — | Mar 2026 | [SLY-67 project](https://linear.app/sly-ai/project/epic-67-production-environment-mode-bf3c3c4baf78) | [epic](./epics/epic-67-production-environment-mode.md) |
| 68 | Flexible Skill Pricing | 📋 | 52 | 5.3 | Mar 2026 | [SLY-68 project](https://linear.app/sly-ai/project/epic-68-flexible-skill-pricing-bc4e63ae1b45) | [epic](./epics/epic-68-flexible-skill-pricing.md) |
| 69 | A2A Result Acceptance | ✅ | 29 | 5.3 | Mar 2026 | [SLY-69 project](https://linear.app/sly-ai/project/epic-69-a2a-result-acceptance) | [epic](./epics/epic-69-a2a-result-acceptance.md) |
| 70 | Universal Agent Discovery | 📋 | 47 | 5.3 | Mar 2026 | [SLY-70 project](https://linear.app/sly-ai/project/epic-70-universal-agent-discovery-f4c501652f70) | [epic](./epics/epic-70-universal-agent-discovery.md) |
| 71 | Machine Payments Protocol (MPP) | ✅ | 81 | 3.5 | Mar 20, 2026 (Linear confirmed) | SLY-477–492 ✅ | [epic](./epics/epic-71-mpp-integration.md) · [doc](../completed/epics/EPIC_71_MPP_COMPLETE.md) |
| 72 | Agent Key-Pair Authentication | ✅ | 62 | 4.2 | April 2026 | — | [epic](./epics/epic-72-agent-keypair-auth.md) |
| 73 | KYC/KYA Tiers | ✅ | 116 | 4.3 | April 2026 | — | [doc](../completed/EPIC_73_COMPLETE.md) |
| 74 | Paperclip Integration | 📋 | ~55 | 5.0 | April 14, 2026 | — | [epic](./epics/epic-74-paperclip-integration.md) |
| 75 | Marketplace-Sim Cloud Deployment | 📋 | TBD | — | April 19, 2026 | — | [epic](./epics/epic-75-marketplace-sim-deployment.md) |
| 76 | X (Twitter) SSO | 📋 | TBD | — | — | — | [epic](./epics/epic-76-x-twitter-sso.md) |
| 77 | BYO Wallet Custody | 📋 | TBD | — | — | — | [epic](./epics/epic-77-byo-wallet-custody.md) |
| 78 | Agentic Credential Vault | 📋 | TBD | — | — | — | [epic](./epics/epic-78-agentic-credential-vault.md) |
| 79 | API Monetization Gateway | 📋 | TBD | — | April 22, 2026 | — | [epic](./epics/epic-79-api-monetization-gateway.md) |
| 80 | AgentKit Proof-of-Humanity | 📋 (deferred) | ~18 | — | — | — | [epic](./epics/epic-80-agentkit-proof-of-humanity.md) |
| 81 | x402 Vendor Reliability Observatory | 📋 | TBD | — | — | — | [epic](./epics/epic-81-x402-vendor-reliability.md) |
| 82 | Scoped Capability Tokens | 📋 | TBD | — | — | — | [epic](./epics/epic-82-scoped-capability-tokens.md) |
| 83 | Wallet Token Swap (DEX Aggregator) | 📋 | TBD | — | April 30, 2026 | — | [epic](./epics/epic-83-token-swap-aggregator.md) |
| 84 | Cross-Marketplace Publishing | 📋 | TBD | — | — | — | [epic](./epics/epic-84-cross-marketplace-publishing.md) |
| 85 | Sly Scanner on x402 Marketplace | ✅ | — | — | May 4, 2026 | — | [epic](./epics/epic-85-scanner-on-x402-marketplace.md) |
| 86 | Marketplaces as First-Class Entities | 📋 | 50 | Marketplaces | May 2026 | — | [epic](./epics/epic-86-marketplaces-as-entities.md) |
| 87 | KYM Trust Layer | 📋 | 58 | Marketplaces | May 2026 | — | [epic](./epics/epic-87-kym-trust-layer.md) |
| 88 | MarketplaceRegistry On-Chain | 🚧 | 57 | Marketplaces | PR #13 open | — | [epic](./epics/epic-88-marketplace-registry-onchain.md) |
| 89 | Marketplace Discovery API + Card | 📋 | 54 | Marketplaces | May 2026 | — | [epic](./epics/epic-89-marketplace-discovery-api.md) |
| 90 | Marketplace Explorer UI | 📋 | 70 | Marketplaces | May 2026 | — | [epic](./epics/epic-90-marketplace-explorer-ui.md) |
| 91 | Managed Marketplace Runtime | 📋 | 96 | Marketplaces | May 2026 | — | [epic](./epics/epic-91-managed-marketplace-runtime.md) |
| 92 | Score-Gated x402 Endpoints | 📋 | 17 | Identity Amplifiers | May 2026 | — | [epic](./epics/epic-92-score-gated-x402-endpoints.md) |
| 93 | Reputation Receipts | 📋 (scope cut pending) | 37→20? | Identity Amplifiers | May 2026 | — | [epic](./epics/epic-93-reputation-receipts.md) |
| 94 | Identity Badge SDK | 📋 | 36 | Identity Amplifiers | May 2026 | — | [epic](./epics/epic-94-identity-badge-sdk.md) |
| 95 | Agent FICO for B2B | 🎨 Discovery | 50 | Identity Amplifiers | May 2026 | — | [epic](./epics/epic-95-agent-fico-for-b2b.md) |
| 96 | ZeroDev Kernel Integration | 🎨 Discovery | 53 | Identity Amplifiers | May 2026 | — | [epic](./epics/epic-96-zerodev-kernel-integration.md) |
| **97** | **Proof of Work Foundation** | 📋 (committed) | **76** | **5.5 Trust & Verification** | **May 13, 2026** | — | [epic](./epics/epic-97-proof-of-work-foundation.md) |
| **98** | **On-Chain Anchoring** | 📋 (committed) | ~50 | **5.5 Trust & Verification** | **2026-05-14 draft** | — | [epic](./epics/epic-98-onchain-anchoring.md) |
| **99** | **Trace (Intent-to-Action Audit)** | 🎨 Design Only | ~150 | **5.5 Trust & Verification** | **2026-05-14 stub** | — | [epic](./epics/epic-99-trace.md) |
| **100** | **Oracle / Verifier Network** | 🎨 Design Only | ~200 | **5.5 Trust & Verification** | **2026-05-14 stub** | — | [epic](./epics/epic-100-oracle-verifier-network.md) |

---

## Roll-up by Status

| Status | Count | Notes |
|--------|------:|-------|
| ✅ Done | 35 | Foundation (0–16) + scattered post-foundation epics |
| 🚧 In Progress | 4 | Epics 31, 60, 66, 88 |
| 📋 Pending — Committed | 4 | Epics 71 (MPP), 97 (PoW), 98 (Anchor), Marketplace Track A/B 86–94 |
| 📋 Pending — Backlog | ~45 | Wide range; many demand-gated or design-phase |
| 🎨 Design Only | 4 | Epics 95, 96, 99, 100 |
| 🚫 Deprecated | 3 | Epics 25, 32, 35 |

---

## Open Work Snapshot (2026-05-14)

**Open PR:**
- **PR #13** — `epic-88-invu-demo` — *"feat(epic-88): buyer-side wallet + B2C agentic checkout"* — Epic 88

**Active branches (local + remote, not in `main`):**
- `harden/x402-rate-limit-webhooks`, `harden/x402-publish-feature` — Epic 79/84/85 follow-ups
- `docs/epic-83-token-swap` — Epic 83
- `fix/x402-bazaar-output-schema-coerce`, `fix/x402-publish-poller-domain-lookup`, `fix/x402-proxy-content-encoding` — Epic 85 maintenance
- `epic-88-invu-demo` — Epic 88 (matches open PR)

**Uncommitted working-tree changes (29 files):** see *Operational Tooling* appendix below and per-epic "Implementation in Flight" sections on Epics 52, 75, 85, 86, 88, 91.

---

## Phase 5.5 — Trust & Verification Layer (NEW)

Introduced in PRD v1.28. Sequences the proof-of-work foundation that makes Sly's "bilateral non-repudiable" claim true.

| Epic | Status | APoW Release | Buyer Signal | Companion |
|------|--------|--------------|--------------|-----------|
| 97 | 📋 Committed | R2 | Pilots (Invu, Zindigi, Maera) + YC/Series A credibility | [APOW_RELEASE_ROADMAP.md](./APOW_RELEASE_ROADMAP.md) |
| 98 | 📋 Committed | R3 | Mastercard Start Path + crypto-native enterprise | (depends on 97) |
| 99 | 🎨 Design | R7 (subset) | Underwriting partner MOU | (depends on 98) |
| 100 | 🎨 Design | R6 | Marketplace volume threshold | (depends on 97/98) |

Detail: [`IDENTITY_AND_GOVERNANCE_STRATEGY.md`](./IDENTITY_AND_GOVERNANCE_STRATEGY.md).

---

## Linear Reconciliation Log (2026-05-14)

### Dry-run summary

50 Linear projects scanned. 5 already marked **Completed** in Linear (Epics 18, 38, 56, 71, 72-Auth). 45 in various non-terminal states.

### Confirmed no-action — PRD ↔ Linear already in sync

| Linear project | Linear state | PRD matrix | Verdict |
|---|---|---|---|
| Epic 18: Agent Wallets & Contract Policies | Completed | ✅ | match |
| Epic 38: HF Microtransactions | Completed | ✅ | match |
| Epic 56: Demand Scanner | Completed | ✅ | match |
| Epic 71: MPP Integration | Completed | 📋 (Planned) | **MATRIX is wrong** — see fix below |
| Epic 72-Auth: Agent Key-Pair Auth | Completed | ✅ | match |

### Real divergences requiring user decision (DO NOT auto-apply)

**1. Epic 71 (MPP) — Linear says Done, matrix said Pending.** All 16 Linear stories (SLY-477 to SLY-492) are `Done`, `completedAt: 2026-03-20`. Linear is correct. The master PRD v1.26 said "Planned" because that was the *introduction* of Epic 71, not its completion. Action: **update the matrix row to ✅ Done**, write a completion doc backfill `EPIC_71_MPP_COMPLETE.md`. No Linear writes needed for Epic 71 — already closed.

**2. Epic 73 (KYC/KYA Tiers) — Matrix says ✅ Done, Linear says Planned with all stories Backlog.** Linear queries SLY-508 through SLY-528 (all 21 stories) show `status: Backlog`, no `completedAt`. Despite `docs/completed/EPIC_73_COMPLETE.md` existing, only a subset (the `tier-limits-multitenant` work — see `EPIC_73_TIER_LIMITS_MULTITENANT.md`) appears to have shipped. The full T1/T2/T3 verification stack (Persona SDK, Circle Compliance Engine, behavioral observation engine, cross-org trust profile endpoint, etc.) is unbuilt per Linear. **Flag for user:** is Epic 73 fully done, partially done, or are the Linear tickets stale? Until resolved, do NOT close Linear tickets.

**3. Epic 69 (A2A Result Acceptance) — Linear project state is Backlog but ALL issues are Done.** SLY-455 through SLY-461 all show `status: Done`, `completedAt: 2026-03-17`. SLY-454 is a duplicate of SLY-455 (same title `[69.1]`); SLY-454 is `Backlog`, SLY-455 is `Done`. Action: **transition the project state to Completed** + mark the duplicate SLY-454 as Canceled (status: Duplicate of SLY-455).

**4. Epic 58 (A2A Task Processor) — Linear project state is In Progress; matrix says ✅ 17/18.** Linear reality: 17 stories Done, 1 Backlog (SLY-153, story 58.4 "LLM Managed Handler"), 3 In Progress (SLY-149 task claim service, SLY-146 processing config, SLY-187 worker lifecycle), plus many Backlog stories outside the original 18 (SLY-230 58.16 webhooks, SLY-236 58.17 audit, SLY-241 58.18 context, SLY-191, 184, 196, 206, 214, 222). The matrix's claim of "17/18 done" reflects the original story count; subsequent stories were added to the project as the worker matured. Several of these (58.17 audit trail, 58.18 context window) are mentioned as *complete* in `EPIC_58_IMPLEMENTATION_STATUS.md`. **Real state appears to be: code shipped, Linear tickets were never closed.** Flag for user before mass-closing.

**5. Epic 65 (Operations Observability) — Linear says Planned, matrix says ✅ Done, no standalone epic doc file.** Likely shipped without ticking off Linear (same pattern as Epic 73). Flag for user.

**6. Epic 35 (Entity Onboarding API) — Linear says Backlog, matrix says 🚫 Deprecated (absorbed into Epic 51/25).** Action: **transition to Canceled** with comment referencing absorption.

**7. Epic 88 (MarketplaceRegistry On-Chain) — Linear says Backlog, matrix says 🚧 In Progress (PR #13 open).** Action: **transition to Started/In Progress.**

### Proposed Linear writes — staged for user approval

**Safe to apply (no ambiguity):**
- Epic 69: project state Backlog → Completed; SLY-454 (duplicate) → Canceled with comment
- Epic 35: project state Backlog → Canceled with comment "Absorbed into Epic 51 per `docs/prd/epics/epic-25-user-onboarding.md` deprecation header"
- Epic 88: project state Backlog → Started

**Needs user decision per bucket:**
- Epic 73: leave alone, or partially close (which Linear tickets correspond to the tier-limits-multitenant work that actually shipped?)
- Epic 58: leave alone, or close all but SLY-153 (the intentionally-deferred 58.4)?
- Epic 65: leave alone, or transition project to Completed (matches matrix but Linear contains zero closing evidence)?

**New projects to create:**
- Epic 97: Proof of Work Foundation (76 pts, 19 stories, P0 — Committed)
- Epic 98: On-Chain Anchoring (~50 pts, 10 stories, P1 — Committed)
- Epic 99: Trace (~150 pts, design only, Backlog)
- Epic 100: Oracle / Verifier Network (~200 pts, design only, Backlog)

Each can be created with `mcp__linear__save_project` (team Sly, state appropriate to commit posture). Stories under 97 and 98 can be created in bulk via `save_issue`; stories for 99/100 are design-only and not yet decomposed.

### Action items surfaced to the user

1. **Update matrix row for Epic 71** — Linear is right, matrix was wrong. (Doc-side fix, no Linear write.)
2. **Backfill `EPIC_71_MPP_COMPLETE.md`** — replace the original Phase D plan that had skipped 71. (Doc-side, no Linear write.)
3. **Approve Linear writes for the safe bucket** (Epic 69, 35, 88) — three quick transitions.
4. **Decide the ambiguous bucket** (Epic 58, 65, 73) — likely needs a per-story walkthrough; recommend deferring to a separate follow-up pass once we resolve which tickets correspond to merged commits.
5. **Approve creation of Linear projects for Epic 97 / 98 / 99 / 100.**

This log is the persistent audit trail. Subsequent Linear writes append below.

---

### Applied writes (2026-05-14)

User approved the "safe bucket" + "create all four new projects" buckets. Ambiguous bucket (Epic 58, 65, 73) deferred to a separate pass.

| # | Action | Target | Old → New | Result |
|---|--------|--------|-----------|--------|
| 1 | Project state | Epic 69 (`72f5e317…`) | Backlog → Completed | ✅ `completedAt: 2026-05-14T19:12:45Z` |
| 2 | Project state + description | Epic 35 (`f6a0b639…`) | Backlog → Canceled (absorbed into Epic 51) | ✅ `canceledAt: 2026-05-14T19:12:48Z` |
| 3 | Project state | Epic 88 (`d64bb19c…`) | Backlog → In Progress (matches open PR #13) | ✅ `startedAt: 2026-05-14T19:12:49Z` |
| 4 | Issue state | SLY-454 (duplicate `[69.1]`) | Backlog → Duplicate, marked `duplicateOf: SLY-455` | ✅ `canceledAt: 2026-05-14T19:12:50Z` |
| 5 | Project created | Epic 97: Proof of Work Foundation (`3632f05c…`) | — → Backlog, P1 Urgent | ✅ [Linear](https://linear.app/sly-ai/project/epic-97-proof-of-work-foundation-38816a331f75) |
| 6 | Project created | Epic 98: On-Chain Anchoring (`0a5e0bf6…`) | — → Backlog, P2 High | ✅ [Linear](https://linear.app/sly-ai/project/epic-98-on-chain-anchoring-f7842b226e67) |
| 7 | Project created | Epic 99: Trace Design (`b196de35…`) | — → Backlog, P4 Low (design only) | ✅ [Linear](https://linear.app/sly-ai/project/epic-99-trace-intent-to-action-audit-design-only-80ecdc5bf942) |
| 8 | Project created | Epic 100: Oracle Network Design (`78ef4a2a…`) | — → Backlog, P4 Low (design only) | ✅ [Linear](https://linear.app/sly-ai/project/epic-100-oracle-verifier-network-design-only-b7332f0697b9) |

### Ambiguous bucket — resolved 2026-05-14 via code walkthrough

Per user request, walked each "ambiguous" epic story-by-story against the code. Findings:

**Epic 58 (A2A Task Processor): 11/14 outstanding stories shipped with code evidence.**
- Closed Done: SLY-146 (58.1), SLY-149 (58.3), SLY-155 (58.5), SLY-184 (58.9), SLY-187 (58.10), SLY-191 (58.11), SLY-196 (58.12), SLY-206 (58.13), SLY-222 (58.15), SLY-230 (58.16), SLY-236 (58.17), SLY-241 (58.18) — 12 stories.
- Moved to new "Deferred: A2A LLM Managed Handler & Cost Controls" project: SLY-153 (58.4 LLM Handler), SLY-214 (58.14 LLM Cost Controls). Both intentionally deferred — regex router proved sufficient.
- Project Epic 58 In Progress → Completed.

**Epic 65 (Operations Observability): all 7 claims shipped with code evidence.**
- 78 OpTypes in `apps/api/src/services/ops/operation-types.ts:12-99` (claim was 48+).
- Portal token auth at `apps/api/src/middleware/auth.ts:648-701`.
- Partition manager registered in boot at `apps/api/src/index.ts:78`.
- Usage API 4 endpoints in `apps/api/src/routes/usage.ts`.
- Project Planned → Completed with full description backfill.

**Epic 73 (KYC/KYA Tiers): 18/21 stories shipped with code evidence; 2 stubs (Persona + Circle) await production credentials.**
- Closed Done: SLY-508, 509, 510, 511, 512, 513, 514, 515, 516, 519, 520, 522, 523, 524, 525, 526, 527, 528 — 18 stories spanning schema, T0/T1 onboarding, KYB, partner reliance, T3 EDD review, and the full agent CAI tier stack (DSD declaration, behavioral observation, T2 verification, cross-org trust profile, T3 kill switch, SDK methods).
- SLY-517 marked Duplicate of SLY-518 (same story 72.10 created twice).
- Moved to new "Provider Wiring: Persona + Circle Compliance" project: SLY-518 (Persona SDK Person — stub at `apps/api/src/services/kyc/persona.ts:50-87`), SLY-521 (Circle Compliance Engine — stub at `apps/api/src/services/compliance/circle-compliance.ts:46-80`). Both architecturally complete; gap is API credentials + production wiring (~1-3 days each once creds in hand).
- Project Epic 73 Planned → Completed with full description backfill.

### Phase II applied writes (2026-05-14)

| # | Action | Target | Result |
|---|--------|--------|--------|
| 9 | New project | `Deferred: A2A LLM Managed Handler & Cost Controls` (`0f2690f6…`) | ✅ Created |
| 10 | New project | `Provider Wiring: Persona + Circle Compliance` (`2ee64563…`) | ✅ Created |
| 11-22 | Issue state → Done | SLY-146, 149, 155, 184, 187, 191, 196, 206, 222, 230, 236, 241 | ✅ 12 closed |
| 23 | Issue project + state | SLY-153 → Deferred project (Backlog retained) | ✅ moved |
| 24 | Issue project + state | SLY-214 → Deferred project (Backlog retained) | ✅ moved |
| 25 | Project state | Epic 58 → Completed | ✅ |
| 26 | Project state + description | Epic 65 → Completed | ✅ |
| 27-44 | Issue state → Done | SLY-508-516, 519, 520, 522-528 | ✅ 18 closed |
| 45 | Issue state | SLY-517 → Duplicate of SLY-518 | ✅ |
| 46 | Issue project | SLY-518 → Provider Wiring project | ✅ moved |
| 47 | Issue project | SLY-521 → Provider Wiring project | ✅ moved |
| 48 | Project state + description | Epic 73 → Completed | ✅ |

**Total Phase II writes:** 40 across 3 epics + 2 new projects. Zero failures. Audit log persisted here.

---

## Operational Tooling Appendix

Working-tree changes outside any epic scope (operational scripts, ad-hoc probes). Not tracked as PRD work; kept here so reviewers don't mis-classify:

- `apps/api/scripts/_add-tina-wallet.mjs`
- `apps/api/scripts/_cleanup-sim-state.mjs`
- `apps/api/scripts/_lift-parent-tier.mjs`
- `apps/api/scripts/_pause-conflicting.mjs`
- `apps/api/scripts/_probe-agents.mjs`, `_probe-auth-users.mjs`, `_probe-cross-tenant.mjs`, `_probe-deliverable.mjs`, `_probe-endpoints.mjs`, `_probe-grants.mjs`, `_probe-grants2.mjs`, `_probe-grants3.mjs`, `_probe-intent-meta.mjs`, `_probe-intent-shape.mjs`, `_probe-intents.mjs`, `_probe-owner.mjs`
- `.tsc-output.txt` (transient TS output, should not commit)

These are operational tools and one-off probes — not tracked stories. The pattern of files prefixed with `_` suggests intentional "don't ship" markers; reviewers should confirm `.gitignore` covers them before any merge.

---

## How to Use This Matrix

- **Adding a new epic:** add a row, default status `📋 Pending`, link the epic doc, leave Linear blank until the project is created.
- **Status change:** update the row when you create a completion doc OR open a PR OR change the epic-doc status header. The matrix and the epic-doc header must agree — if they don't, the next reader can't trust either.
- **Bumping master PRD version:** refresh this matrix in the same change. The "Last Activity" column should reflect the new version's date for any epic whose status moved.
