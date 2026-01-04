# PayOS Implementation Sequence — Prioritized

**Created:** December 30, 2025  
**Updated:** December 30, 2025  
**Target:** AI Agent Integration & Partner Adoption  
**Total Points:** ~113 points (100 backend + 13 UI)

---

## Summary

This document defines the **prioritized implementation sequence** for making PayOS AI-agent ready. Stories are ordered by dependency and value, not arbitrary timeframes.

**Two Parallel Tracks:**
- **Cursor (Backend):** API, SDK, agent integrations
- **Gemini (Frontend):** Dashboard UI components

### Key Context

- **API Server:** `http://localhost:4000`
- **Epic 17 (Multi-Protocol):** ✅ 100% Complete — AP2 and ACP APIs are built
- **Epic 27 (Settlement):** ✅ 100% Complete — Story 27.8 moved to Epic 24
- **Epic 36 Stories 36.5/36.6:** Just SDK wrappers for existing AP2/ACP APIs (smaller lift)

---

## Cursor Track (Backend/SDK)

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

**Cursor Total: ~100 points**

---

## Gemini Track (Frontend/UI)

UI work runs **in parallel** with Cursor's backend work. Each UI story depends on specific API stories.

| Order | Epic | Story | Points | Depends On | Description |
|-------|------|-------|--------|------------|-------------|
| G1 | 30 | 30.9 | 2 | After 30.1 | **Error Reference Page** — searchable error codes |
| G2 | 31 | 31.6 | 5 | After 31.1-31.2 | **Account 360 View** — full context in one page |
| G3 | 36 | 36.17 | 3 | After 36.9 | **Capabilities Explorer** — interactive API browser |
| G4 | 28 | 28.8 | 3 | After 28.1-28.2 | **Simulation Preview Modal** — preview before execute |

**Gemini Total: 13 points**

---

## Parallel Execution Timeline

```
CURSOR (Backend)                         GEMINI (Frontend)
═══════════════                          ═══════════════

P0: FOUNDATION (29 pts)
├─ 30.1 Error taxonomy                   
├─ 30.2 Response wrapper                 
├─ 30.3 Suggested actions                
├─ 30.4 Migrate core routes ─────────────► G1: Error Reference Page (2 pts)
├─ 31.1 Account context                  
└─ 31.2 Transfer context ────────────────► G2: Account 360 View (5 pts)
                                         
P1: SDK CORE (26 pts)                    (Gemini continues G1, G2)
├─ 36.1 Package structure                
├─ 36.2 Sandbox facilitator              
├─ 36.3 x402 Client                      
├─ 36.4 x402 Provider                    
├─ 36.8 Facilitator API                  
├─ 36.7 Main PayOS class                 
└─ 30.5 Retry guidance                   
                                         
P2: AGENT INTEGRATIONS (14 pts)          
├─ 36.9 Capabilities API ────────────────► G3: Capabilities Explorer (3 pts)
├─ 36.10 Function-calling format         
├─ 36.11 MCP Server ◄── YC DEMO          
└─ 36.12 LangChain tools                 
                                         
P3: MULTI-PROTOCOL (15 pts)              
├─ 36.5 AP2 Support                      
├─ 36.6 ACP Support                      
└─ 36.14 Update sample apps              
                                         
P4: SIMULATION (14 pts)                  
├─ 28.1 Simulation model                 
├─ 28.2 Transfer simulation ─────────────► G4: Simulation Preview Modal (3 pts)
├─ 28.3 Batch simulation                 
└─ 28.4 Simulation-to-execution          
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

## Environment Configuration

**Local Development:**
```typescript
const ENVIRONMENTS = {
  sandbox: {
    apiUrl: 'http://localhost:4000',
    facilitatorUrl: 'http://localhost:4000/v1/x402/facilitator',
  },
  // testnet and production URLs TBD
};
```

---

## Success Criteria

| Checkpoint | Criteria |
|------------|----------|
| After P0 | All API errors are machine-parseable |
| After P1 | x402 payments work in sandbox without blockchain |
| After P2 | Claude can settle a payment via MCP **(YC Demo)** |
| After P3 | All 3 protocols work in SDK |
| After P4 | Agents can preview any payment before executing |
| After G1-G4 | Dashboard has developer tools for debugging |

---

## Story Summary by Epic

| Epic | Backend Pts | UI Pts | Total |
|------|-------------|--------|-------|
| Epic 28 (Simulation) | 14 | 3 | 17 |
| Epic 30 (Structured Response) | 26 | 2 | 28 |
| Epic 31 (Context API) | 16 | 5 | 21 |
| Epic 36 (SDK) | 63 | 3 | 66 |
| **Total** | **100** | **13** | **113** |

---

## Completed Epics (Reference)

| Epic | Status | Notes |
|------|--------|-------|
| Epic 17 (Multi-Protocol Gateway) | ✅ 100% | AP2/ACP APIs built |
| Epic 27 (Settlement Infrastructure) | ✅ 100% | Story 27.8 → Epic 24 |
| Epic 32 (Tool Discovery) | ✅ Merged | → Epic 36 |
| Epic 35 (Entity Onboarding) | ✅ Merged | → Epic 25 |

---

*Last updated: December 30, 2025*
