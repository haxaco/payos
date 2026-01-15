# PayOS Implementation Sequence — Prioritized

**Created:** December 30, 2025  
**Updated:** January 5, 2026  
**Target:** AI Agent Integration & Partner Adoption  
**Total Points:** ~309 points (100 backend SDK + 86 sandbox + 110 on-ramp + 13 UI)  
**Current Focus:** Epic 40 (Sandbox) + Epic 41 (On-Ramp) for customer readiness

---

## Summary

This document defines the **prioritized implementation sequence** for making PayOS AI-agent ready and production-capable. Stories are ordered by dependency and value, not arbitrary timeframes.

**Four Parallel Tracks:**
- **Cursor (Backend):** API, SDK, agent integrations — 100 pts
- **Gemini (Frontend):** Dashboard UI components — 13 pts
- **Sandbox (Integrations):** External service connections — 86 pts
- **On-Ramp (Funding):** Customer funding sources — 89 pts (NEW)

### Key Context

- **API Server:** `http://localhost:4000`
- **Epic 17 (Multi-Protocol):** ✅ 100% Complete — AP2 and ACP APIs are built
- **Epic 27 (Settlement):** ✅ 100% Complete — Story 27.8 moved to Epic 24
- **Epic 36 Stories 36.5/36.6:** Just SDK wrappers for existing AP2/ACP APIs (smaller lift)
- **Epic 40 (Sandbox):** External integrations for E2E validation
- **Epic 41 (On-Ramp):** NEW — Funding sources for non-crypto-native customers

---

## Track Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION TRACKS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURSOR TRACK (Backend/SDK)          SANDBOX TRACK (Integrations)          │
│  ═══════════════════════════          ════════════════════════════          │
│                                                                             │
│  P0: Foundation (29 pts)     ←──────→  40.28: Env Config (2 pts)           │
│      ↓                                      ↓                               │
│  P1: SDK Core (26 pts)       ←──────→  40.1-40.5: Circle Core (18 pts)     │
│      ↓                                      ↓                               │
│  P2: Agent Integrations      ←──────→  40.7-40.10: x402 Bridge (15 pts)    │
│      (14 pts) ◄── YC DEMO                   ↓                               │
│      ↓                                 40.22-40.24: E2E Tests (11 pts)      │
│  P3: Multi-Protocol (15 pts) ←──────→  40.12-40.15: Protocols (18 pts)     │
│      ↓                                      ↓                               │
│  P4: Simulation (14 pts)     ←──────→  40.25-40.27: More E2E (11 pts)      │
│                                             ↓                               │
│                               P1/P2:  Compliance, Streaming (26 pts)        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GEMINI TRACK (Frontend/UI)                                                 │
│  ═══════════════════════════                                                │
│                                                                             │
│  G1: Error Reference Page (2 pts) → After Cursor 30.4                      │
│  G2: Account 360 View (5 pts) → After Cursor 31.2                          │
│  G3: Capabilities Explorer (3 pts) → After Cursor 36.9                     │
│  G4: Simulation Preview Modal (3 pts) → After Cursor 28.2                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Path to YC Demo

The **YC Demo** requires Claude to settle a cross-border payment. Here's the critical path:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CRITICAL PATH TO YC DEMO                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURSOR P0 (Foundation)                                                     │
│  └─> 30.1-30.4: Structured responses, error codes                          │
│  └─> 31.1-31.2: Context API endpoints                                      │
│                     │                                                       │
│                     ▼                                                       │
│  CURSOR P1 (SDK Core)                                                       │
│  └─> 36.1-36.2: Package structure, sandbox facilitator                     │
│  └─> 36.3-36.4: x402 client/provider with env switching                    │
│  └─> 36.7-36.8: PayOS class, facilitator API                               │
│                     │                                                       │
│                     ▼                                                       │
│  SANDBOX P0 (External Connections)                                          │
│  └─> 40.28: Environment configuration                                      │
│  └─> 40.1-40.5: Circle integration (wallets, Pix, SPEI, webhooks)          │
│  └─> 40.7-40.8: Base Sepolia, x402.org facilitator                         │
│  └─> 40.10: x402 → Circle bridge ◄── CRITICAL                              │
│                     │                                                       │
│                     ▼                                                       │
│  CURSOR P2 (Agent Integrations)                                             │
│  └─> 36.9-36.10: Capabilities API, function-calling                        │
│  └─> 36.11: MCP Server ◄── CLAUDE INTEGRATION                              │
│  └─> 36.12: LangChain tools                                                │
│                     │                                                       │
│                     ▼                                                       │
│  SANDBOX E2E (Validation)                                                   │
│  └─> 40.22-40.24: Pix, SPEI, x402→Pix E2E tests                            │
│                     │                                                       │
│                     ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         YC DEMO READY                                │   │
│  │  "Watch Claude settle a cross-border payment via x402 → Pix"        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Points to YC Demo:** ~85 points (Cursor P0-P2 + Sandbox P0)

---

## Cursor Track (Backend/SDK) — 100 pts

### P0: Foundation (Must Have First) — 29 pts

These stories are **blocking** everything else. Without them, the SDK and agent integrations won't work well.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| 1 | 30 | 30.1 | 3 | Error taxonomy — define all error codes |
| 2 | 30 | 30.2 | 5 | Response wrapper `{ data, error, meta, suggestions }` |
| 3 | 30 | 30.3 | 5 | Suggested actions for errors |
| 4 | 30 | 30.4 | 8 | Migrate core routes (transfers, accounts, settlements) |
| 5 | 31 | 31.1 | 5 | Account context endpoint |
| 6 | 31 | 31.2 | 3 | Transfer context endpoint |

**Deliverable:** All APIs return machine-readable errors with suggestions. Context endpoints reduce API calls.

---

### P1: SDK Core (x402 Working) — 26 pts

These stories create the unified SDK with x402 support. This is the **core product**.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| 7 | 36 | 36.1 | 3 | Package structure |
| 8 | 36 | 36.2 | 5 | **Sandbox facilitator** — test without blockchain |
| 9 | 36 | 36.3 | 5 | x402 Client with env switching |
| 10 | 36 | 36.4 | 5 | x402 Provider with env switching |
| 11 | 36 | 36.8 | 3 | Facilitator API endpoints |
| 12 | 36 | 36.7 | 3 | Main PayOS class |
| 13 | 30 | 30.5 | 2 | Retry guidance (`retry_after`) |

**Deliverable:** `@payos/sdk` works locally. x402 payments testable without gas fees or real USDC.

---

### P2: Agent Integrations (Demo Ready) — 14 pts

These stories enable Claude and LangChain to use PayOS. **This is the YC demo.**

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| 14 | 36 | 36.9 | 3 | Capabilities API `/v1/capabilities` |
| 15 | 36 | 36.10 | 3 | Function-calling format |
| 16 | 36 | 36.11 | 5 | **MCP Server** — Claude integration |
| 17 | 36 | 36.12 | 3 | LangChain tools |

**Deliverable:** Claude can make payments via MCP. "Watch Claude settle a cross-border payment."

---

### P3: Multi-Protocol SDK (Full Coverage) — 15 pts

Wrap the existing AP2/ACP APIs (from Epic 17) in the SDK.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| 18 | 36 | 36.5 | 5 | AP2 Support (wrap existing API) |
| 19 | 36 | 36.6 | 5 | ACP Support (wrap existing API) |
| 20 | 36 | 36.14 | 5 | Update sample apps |

**Deliverable:** SDK supports all 3 protocols. Sample apps show complete integration.

---

### P4: Simulation (Dry Run) — 14 pts

Enable agents to preview actions before executing.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| 21 | 28 | 28.1 | 3 | Simulation data model |
| 22 | 28 | 28.2 | 5 | Transfer simulation with FX/fee preview |
| 23 | 28 | 28.3 | 3 | Batch simulation |
| 24 | 28 | 28.4 | 3 | Simulation-to-execution flow |

**Deliverable:** Agents can "dry run" any payment to see fees/FX before committing.

---

### P5: Polish (Nice to Have) — 8 pts

Additional SDK packages and cleanup.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| 25 | 36 | 36.13 | 3 | Vercel AI SDK / OpenAI packages |
| 26 | 36 | 36.15 | 2 | Deprecate old SDKs |
| 27 | 30 | 30.6 | 3 | Migrate remaining routes |

**Cursor Total: 100 points**

---

## Sandbox Track (External Integrations) — 89 pts

### S-P0: Foundation & Circle Core — 25 pts

Must be done before real E2E testing. Can run in parallel with Cursor P0-P1.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| S1 | 40 | 40.28 | 2 | **Environment configuration system** |
| S2 | 40 | 40.1 | 2 | Circle Sandbox Account Setup |
| S3 | 40 | 40.2 | 3 | Circle USDC Wallets |
| S4 | 40 | 40.3 | 5 | Circle Pix Payout (Brazil) |
| S5 | 40 | 40.4 | 5 | Circle SPEI Payout (Mexico) |
| S6 | 40 | 40.5 | 3 | Circle Webhook Handler |
| S7 | 40 | 40.7 | 2 | Base Sepolia Setup |
| S8 | 40 | 40.8 | 3 | x402.org Facilitator Integration |

**Deliverable:** Circle payouts work in sandbox. x402 payments work on testnet.

---

### S-P0 (Critical): x402 → Circle Bridge — 5 pts

**This is the critical integration** that connects x402 blockchain payments to Circle fiat payouts.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| S9 | 40 | 40.10 | 5 | **x402 → Circle Settlement Bridge** |

**Deliverable:** x402 payment automatically triggers Pix/SPEI settlement.

---

### S-P0: Core E2E Tests — 11 pts

Validates that the critical paths work end-to-end.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| S10 | 40 | 40.22 | 3 | E2E: Direct Pix Settlement |
| S11 | 40 | 40.23 | 3 | E2E: Direct SPEI Settlement |
| S12 | 40 | 40.24 | 5 | **E2E: x402 → Pix** (YC Demo scenario) |

**Deliverable:** YC demo scenario validated with real testnet transactions.

---

### S-P1: Protocols & ACP — 21 pts

Protocol integrations for ACP and AP2.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| S13 | 40 | 40.12 | 3 | Stripe Test Mode Setup |
| S14 | 40 | 40.13 | 5 | ACP SharedPaymentToken Integration |
| S15 | 40 | 40.14 | 5 | AP2 Reference Implementation Setup |
| S16 | 40 | 40.15 | 5 | AP2 VDC Signature Verification |
| S17 | 40 | 40.6 | 3 | Circle FX Quote Integration |

**Deliverable:** All three protocols work with external sandboxes.

---

### S-P1: Extended E2E & Features — 22 pts

Additional E2E scenarios and features.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| S18 | 40 | 40.25 | 3 | E2E: ACP Checkout → Settlement |
| S19 | 40 | 40.26 | 3 | E2E: AP2 Mandate → x402 → Settlement |
| S20 | 40 | 40.27 | 5 | E2E: Batch Settlement (100+ transfers) |
| S21 | 40 | 40.9 | 5 | CDP SDK Integration |
| S22 | 40 | 40.11 | 3 | Wallet Management (BYOW + Create) |
| S23 | 40 | 40.17 | 5 | Multi-Currency (USD↔BRL↔MXN) |

**Deliverable:** Complete protocol coverage and batch testing.

---

### S-P1: Compliance — 8 pts

Basic compliance screening for PoC.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| S24 | 40 | 40.18 | 3 | Elliptic Wallet Screening |
| S25 | 40 | 40.29 | 3 | Integration Test Suite |
| — | 40 | 40.19 | 5 | (P2) ComplyAdvantage Screening |

**Deliverable:** Wallet screening active before settlements.

---

### S-P2: Extended Features — 16 pts

Nice-to-have features for production readiness.

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| S26 | 40 | 40.16 | 5 | Superfluid Streaming Integration |
| S27 | 40 | 40.19 | 5 | ComplyAdvantage Name/Bank Screening |
| S28 | 40 | 40.20 | 5 | EBANX Backup Rails |
| S29 | 40 | 40.21 | 3 | FX Rate Provider Evaluation |

**Deliverable:** Full production readiness with backup rails and streaming.

**Sandbox Total: 89 points**

---

## Gemini Track (Frontend/UI) — 13 pts

UI work runs **in parallel** with Cursor's backend work. Each UI story depends on specific API stories.

| Order | Epic | Story | Points | Depends On | Description |
|-------|------|-------|--------|------------|-------------|
| G1 | 30 | 30.9 | 2 | After 30.4 | **Error Reference Page** — searchable error codes |
| G2 | 31 | 31.6 | 5 | After 31.1-31.2 | **Account 360 View** — full context in one page |
| G3 | 36 | 36.17 | 3 | After 36.9 | **Capabilities Explorer** — interactive API browser |
| G4 | 28 | 28.8 | 3 | After 28.2 | **Simulation Preview Modal** — preview before execute |

**Gemini Total: 13 points**

---

## Parallel Execution Timeline

```
CURSOR (Backend)                 SANDBOX (Integrations)           GEMINI (Frontend)
═══════════════                  ══════════════════════           ═══════════════

P0: FOUNDATION (29 pts)          S-P0: FOUNDATION (25 pts)
├─ 30.1 Error taxonomy           ├─ 40.28 Env config
├─ 30.2 Response wrapper         ├─ 40.1 Circle setup
├─ 30.3 Suggested actions        ├─ 40.2 Circle wallets
├─ 30.4 Migrate core routes ─────┤──────────────────────────────► G1: Error Reference (2 pts)
├─ 31.1 Account context          ├─ 40.3 Circle Pix
└─ 31.2 Transfer context ────────┼─ 40.4 Circle SPEI ────────────► G2: Account 360 View (5 pts)
                                 ├─ 40.5 Circle webhooks
                                 ├─ 40.7 Base Sepolia
                                 └─ 40.8 x402.org

P1: SDK CORE (26 pts)            S-P0: BRIDGE (5 pts)
├─ 36.1 Package structure        └─ 40.10 x402 → Circle ◄── CRITICAL
├─ 36.2 Sandbox facilitator
├─ 36.3 x402 Client              S-P0: E2E TESTS (11 pts)
├─ 36.4 x402 Provider            ├─ 40.22 E2E Pix
├─ 36.8 Facilitator API          ├─ 40.23 E2E SPEI
├─ 36.7 Main PayOS class         └─ 40.24 E2E x402→Pix ◄── YC DEMO VALIDATION
└─ 30.5 Retry guidance

P2: AGENT (14 pts) ◄── YC DEMO   S-P1: PROTOCOLS (21 pts)
├─ 36.9 Capabilities API ────────┼─ 40.12 Stripe setup ──────────► G3: Capabilities (3 pts)
├─ 36.10 Function-calling        ├─ 40.13 ACP SPT
├─ 36.11 MCP Server ◄── CLAUDE   ├─ 40.14 AP2 setup
└─ 36.12 LangChain               ├─ 40.15 AP2 VDC
                                 └─ 40.6 FX quotes

P3: MULTI-PROTOCOL (15 pts)      S-P1: EXTENDED (22 pts)
├─ 36.5 AP2 Support              ├─ 40.25 E2E ACP
├─ 36.6 ACP Support              ├─ 40.26 E2E AP2
└─ 36.14 Update samples          ├─ 40.27 E2E Batch
                                 ├─ 40.9 CDP SDK
                                 ├─ 40.11 Wallet mgmt
                                 └─ 40.17 Multi-currency

P4: SIMULATION (14 pts)          S-P1: COMPLIANCE (8 pts)
├─ 28.1 Simulation model         ├─ 40.18 Elliptic
├─ 28.2 Transfer simulation ─────┼─ 40.29 Test suite ────────────► G4: Simulation Modal (3 pts)
├─ 28.3 Batch simulation
└─ 28.4 Simulation-to-exec       S-P2: EXTENDED (16 pts)
                                 ├─ 40.16 Superfluid
P5: POLISH (8 pts)               ├─ 40.19 ComplyAdvantage
├─ 36.13 Vercel AI SDK           ├─ 40.20 EBANX backup
├─ 36.15 Deprecate old SDKs      └─ 40.21 FX providers
└─ 30.6 Migrate remaining
```

---

## For Cursor: Exact Execution Order

```bash
# P0: Foundation (29 pts)
1. docs/prd/epics/epic-30-structured-response.md → Story 30.1
2. docs/prd/epics/epic-30-structured-response.md → Story 30.2
3. docs/prd/epics/epic-30-structured-response.md → Story 30.3
4. docs/prd/epics/epic-30-structured-response.md → Story 30.4
5. docs/prd/epics/epic-31-context-api.md → Story 31.1
6. docs/prd/epics/epic-31-context-api.md → Story 31.2

# P1: SDK Core (26 pts)
7. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.1
8. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.2
9. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.3
10. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.4
11. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.8
12. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.7
13. docs/prd/epics/epic-30-structured-response.md → Story 30.5

# P2: Agent Integrations (14 pts) — YC DEMO
14. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.9
15. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.10
16. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.11  ← MCP Server
17. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.12  ← LangChain

# P3: Multi-Protocol SDK (15 pts)
18. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.5
19. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.6
20. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.14

# P4: Simulation (14 pts)
21. docs/prd/epics/epic-28-simulation.md → Story 28.1
22. docs/prd/epics/epic-28-simulation.md → Story 28.2
23. docs/prd/epics/epic-28-simulation.md → Story 28.3
24. docs/prd/epics/epic-28-simulation.md → Story 28.4
```

---

## For Sandbox Track: Exact Execution Order

```bash
# S-P0: Foundation & Circle (25 pts)
S1. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.28  ← START HERE
S2. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.1
S3. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.2
S4. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.3
S5. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.4
S6. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.5
S7. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.7
S8. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.8

# S-P0: Critical Bridge (5 pts)
S9. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.10  ← CRITICAL

# S-P0: E2E Tests (11 pts)
S10. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.22
S11. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.23
S12. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.24  ← YC DEMO VALIDATION

# S-P1: Protocols (21 pts)
S13. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.12
S14. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.13
S15. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.14
S16. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.15
S17. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.6

# S-P1: Extended (22 pts)
S18. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.25
S19. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.26
S20. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.27
S21. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.9
S22. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.11
S23. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.17

# S-P1: Compliance (8 pts)
S24. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.18
S25. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.29

# S-P2: Extended (16 pts) - Nice to Have
S26. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.16
S27. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.19
S28. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.20
S29. docs/prd/epics/epic-40-sandbox-integrations.md → Story 40.21
```

---

## For Gemini: Exact Execution Order

```bash
# After Cursor completes 30.4
G1. docs/prd/epics/epic-30-structured-response.md → Story 30.9 (Error Reference Page)

# After Cursor completes 31.2
G2. docs/prd/epics/epic-31-context-api.md → Story 31.6 (Account 360 View)

# After Cursor completes 36.9
G3. docs/prd/epics/epic-36-sdk-developer-experience.md → Story 36.17 (Capabilities Explorer)

# After Cursor completes 28.2
G4. docs/prd/epics/epic-28-simulation.md → Story 28.8 (Simulation Preview Modal)
```

---

## On-Ramp Track (Epic 41) — 110 pts

Epic 41 enables non-crypto-native customers to fund their PayOS accounts. This is critical for customer onboarding. **Sandbox-first development (Parts 1-7), then Production Enablement (Part 8).**

### O-P0: Foundation & Cards (32 pts)

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| O1 | 41 | 41.1 | 3 | Funding Source Data Model |
| O2 | 41 | 41.2 | 5 | Funding Orchestrator Service |
| O3 | 41 | 41.3 | 5 | Funding API Endpoints |
| O4 | 41 | 41.4 | 3 | Stripe Connect Setup |
| O5 | 41 | 41.5 | 5 | Stripe Card Payments |
| O6 | 41 | 41.8 | 3 | Stripe Webhook Handler |
| O7 | 41 | 41.20 | 5 | Fiat to USDC Conversion |
| O8 | 41 | 41.22 | 3 | E2E: Card → Pix |

### O-P1: US Banks & LATAM (40 pts)

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| O9 | 41 | 41.6 | 5 | Stripe ACH Payments |
| O10 | 41 | 41.9 | 5 | Plaid Link Integration |
| O11 | 41 | 41.10 | 3 | Plaid Balance Check |
| O12 | 41 | 41.12 | 3 | Belvo Connect Setup |
| O13 | 41 | 41.13 | 5 | Belvo Widget Integration |
| O14 | 41 | 41.14 | 5 | Pix Collection (Brazil) |
| O15 | 41 | 41.15 | 5 | SPEI Collection (Mexico) |
| O16 | 41 | 41.16 | 3 | Belvo Webhook Handler |
| O17 | 41 | 41.19 | 3 | Direct USDC Deposit |
| O18 | 41 | 41.21 | 3 | Funding Fee Structure |

### O-P2: Extended & Crypto Widgets (17 pts)

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| O19 | 41 | 41.7 | 5 | Stripe SEPA Payments |
| O20 | 41 | 41.11 | 5 | Plaid Identity Verification |
| O21 | 41 | 41.17 | 5 | MoonPay Widget |
| O22 | 41 | 41.18 | 5 | Transak Widget |
| O23 | 41 | 41.23 | 3 | E2E: ACH → SPEI |
| O24 | 41 | 41.24 | 3 | E2E: Pix → Pix |
| O25 | 41 | 41.25 | 5 | E2E: MoonPay → x402 |

### O-P3: Production Enablement (21 pts)

| Order | Epic | Story | Points | Description |
|-------|------|-------|--------|-------------|
| O26 | 41 | 41.26 | 5 | Production Credentials & Key Management |
| O27 | 41 | 41.27 | 5 | Fraud Monitoring & Risk Rules |
| O28 | 41 | 41.28 | 3 | Rate Limiting & Quotas |
| O29 | 41 | 41.29 | 3 | Production Monitoring & Alerting |
| O30 | 41 | 41.30 | 5 | Production E2E Validation |

---

## For On-Ramp Track: Exact Execution Order

```bash
# O-P0: Foundation & Cards (32 pts) — Required for any customer
O1. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.1  ← START HERE
O2. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.2
O3. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.3
O4. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.4
O5. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.5  ← CARD PAYMENTS WORK
O6. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.8
O7. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.20  ← CONVERSION WORKS
O8. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.22  ← CARD→PIX E2E

# O-P1: US Banks & LATAM (40 pts) — For US and LATAM customers
O9. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.6
O10. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.9
O11. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.10
O12. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.12
O13. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.13
O14. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.14  ← PIX COLLECTION
O15. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.15  ← SPEI COLLECTION
O16. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.16
O17. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.19
O18. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.21

# O-P2: Extended (17 pts) — Nice to have
O19. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.7
O20. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.11
O21. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.17
O22. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.18
O23. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.23
O24. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.24
O25. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.25

# O-P3: Production Enablement (21 pts) — After sandbox validated
O26. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.26  ← PROD CREDENTIALS
O27. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.27  ← FRAUD RULES
O28. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.28
O29. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.29  ← MONITORING
O30. docs/prd/epics/epic-41-onramp-integrations.md → Story 41.30  ← PROD E2E VALIDATION
```

---

## Deferred (Not in Scope)

| Epic | Points | Reason |
|------|--------|--------|
| Epic 21 (Code Coverage) | 112 | Do incrementally, doesn't ship features |
| Epic 24 (API Key Security) | 31 | Current auth works. Add with paying customers |
| Epic 25 (Onboarding UX) | 40 | White-glove onboarding for now |
| Epic 29 (Workflow Engine) | 42 | Important but not blocking MVP |
| Epic 19 (PayOS x402 Services) | 22 | "Drink champagne" can wait |

---

## Environment Configuration

**Local Development (Mock):**
```typescript
const ENVIRONMENTS = {
  mock: {
    apiUrl: 'http://localhost:4000',
    facilitatorUrl: 'http://localhost:4000/v1/x402/facilitator',
    circle: 'mock',
    blockchain: 'mock',
  },
};
```

**Sandbox (Real External APIs):**
```typescript
const ENVIRONMENTS = {
  sandbox: {
    apiUrl: 'http://localhost:4000',
    facilitatorUrl: 'https://x402.org/facilitator',
    circle: 'https://api-sandbox.circle.com',
    blockchain: 'https://sepolia.base.org',
  },
};
```

---

## Success Criteria

| Checkpoint | Criteria |
|------------|----------|
| After Cursor P0 | All API errors are machine-parseable |
| After Cursor P1 | x402 payments work in sandbox without blockchain |
| After Sandbox S-P0 | Circle Pix/SPEI work, x402→Circle bridge works |
| After Cursor P2 | Claude can settle a payment via MCP **(YC Demo Ready)** |
| After Sandbox E2E | x402→Pix E2E test passes with real testnet |
| After On-Ramp O-P0 | Partners can fund via card, settle to Pix/SPEI |
| After On-Ramp O-P1 | LATAM partners can fund via Pix/SPEI collection |
| After On-Ramp O-P3 | Production-ready with fraud rules, monitoring, validated E2E |
| After Cursor P3 | All 3 protocols work in SDK |
| After Sandbox S-P1 | All protocols work with external sandboxes |
| After Cursor P4 | Agents can preview any payment before executing |
| After Gemini G1-G4 | Dashboard has developer tools for debugging |

---

## Story Summary by Epic

| Epic | Backend Pts | Sandbox Pts | On-Ramp Pts | UI Pts | Total |
|------|-------------|-------------|-------------|--------|-------|
| Epic 28 (Simulation) | 14 | — | — | 3 | 17 |
| Epic 30 (Structured Response) | 26 | — | — | 2 | 28 |
| Epic 31 (Context API) | 16 | — | — | 5 | 21 |
| Epic 36 (SDK) | 44 | — | — | 3 | 47 |
| Epic 40 (Sandbox) | — | 86 | — | — | 86 |
| Epic 41 (On-Ramp) | — | — | 110 | — | 110 |
| **Total** | **100** | **86** | **110** | **13** | **309** |

---

## Completed Epics (Reference)

| Epic | Status | Notes |
|------|--------|-------|
| Epic 17 (Multi-Protocol Gateway) | ✅ 100% | AP2/ACP APIs built |
| Epic 27 (Settlement Infrastructure) | ✅ 100% | Story 27.8 → Epic 24 |
| Epic 30 (Structured Response) | ✅ 100% | Error taxonomy, response wrapper, suggested actions |
| Epic 31 (Context API) | ✅ 100% | Account/Transfer context endpoints |
| Epic 32 (Tool Discovery) | ✅ Merged | → Epic 36 |
| Epic 35 (Entity Onboarding) | ✅ Merged | → Epic 25 |
| Epic 36 (SDK & Developer Experience) | ✅ 100% | Unified SDK, MCP, LangChain, Vercel AI, sample apps |

---

*Last updated: January 5, 2026*
