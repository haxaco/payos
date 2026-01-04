# PayOS PRD Epics

This directory contains individual epic files extracted from the master PRD for easier navigation and tracking.

---

## Templates & Guidelines

### SDK Impact Assessment (Required for Every Epic)

Every epic MUST include an SDK Impact Assessment section near the top:

```markdown
## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/foo` | ✅ Yes | `payos.foo` | P0 | New module needed |
| `GET /v1/bar/:id` | ✅ Yes | `payos.bar` | P1 | Add to existing |
| Internal refactor | ❌ No | - | - | No API changes |
| Admin-only endpoint | ❌ No | - | - | Not for partners |
| New webhook event | ⚠️ Types | Types only | P2 | Add TypeScript types |

**SDK Stories Required:** 
- [ ] Story 36.X: Add `foo` module to @payos/sdk
- [ ] Story 36.Y: Update MCP server with `payos_foo` tool
```

### Story Template (Use for All New Stories)

```markdown
### Story X.Y: [Title]

**Points:** X  
**Priority:** PX  
**Dependencies:** Story X.Z (if any)

**Description:**
[What this story accomplishes]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests written and passing
- [ ] Documentation updated

**SDK Exposure:** ← REQUIRED SECTION
- **Needs SDK exposure?** Yes / No / Types Only
- **If yes:**
  - **Module:** `payos.[module]` (e.g., `payos.settlements`, `payos.x402`)
  - **Method(s):** `create()`, `get()`, `list()`, etc.
  - **MCP tool needed?** Yes / No
  - **LangChain tool needed?** Yes / No
  - **SDK story:** Link to Epic 36 story or "Create new"
- **If no, reason:** Internal-only / Admin-only / Refactor / Already covered

**Files to Create:**
- `path/to/file.ts`

**Files to Modify:**
- `path/to/existing.ts`
```

### Definition of Done (DoD)

Every story must meet these criteria before completion:

- [ ] Code reviewed and merged
- [ ] Tests passing (unit + integration where applicable)
- [ ] Documentation updated (if user-facing)
- [ ] **SDK GATE:**
  - [ ] SDK exposure decision documented in story
  - [ ] If SDK exposure needed: Story created/updated in Epic 36
  - [ ] If SDK exposure NOT needed: Reason documented

### Quick Reference: When to Expose in SDK

| Change Type | SDK Exposure? | Action |
|-------------|---------------|--------|
| New public API endpoint | ✅ Yes | Add to appropriate `payos.*` module |
| New webhook event type | ⚠️ Types | Add TypeScript types, document in SDK |
| New query parameters | ✅ Yes | Update SDK method signatures |
| Internal refactor | ❌ No | No SDK changes needed |
| Admin-only endpoint | ❌ No | Not for partner SDK |
| Performance optimization | ❌ No | Transparent to SDK users |
| New protocol support | ✅ Yes | Add new `payos.[protocol]` module |
| Database schema change | ❓ Depends | Only if it affects API response shape |

---

## Epic Files

### Foundation & Infrastructure
- [Epic 17: Multi-Protocol Foundation](./epic-17-multi-protocol.md) - Multi-protocol payment foundation
- [Epic 18: Agent Wallets & KYA](./epic-18-agent-wallets.md) - Agent wallets and KYA system
- [Epic 27: Settlement System](./epic-27-settlement.md) - Settlement infrastructure

### x402 & Performance
- [Epic 19: PayOS x402 Services](./epic-19-x402-services.md) 🍾 - PayOS-hosted x402 services
- [Epic 26: x402 Payment Performance Optimization](./epic-26-x402-performance.md) ⚡ - ✅ PHASE 1 & 2 COMPLETE

### Streaming & Registry
- [Epic 20: Streaming Payments & Agent Registry](./epic-20-streaming-payments.md) 🌊 - Streaming payments + **Agent Identity (NEW)**

### Developer Experience & SDK
- [Epic 36: SDK & Developer Experience](./epic-36-sdk-developer-experience.md) 🛠️ - **Unified @payos/sdk with x402/AP2/ACP support**

### Quality & Operations
- [Epic 21: Code Coverage Improvement](./epic-21-code-coverage.md) 📊 - Improve test coverage to 70%+
- [Epic 22: Seed Data & Final UI Integration](./epic-22-seed-data.md) 🌱 - ✅ COMPLETE
- [Epic 23: Dashboard Performance & API Optimization](./epic-23-dashboard-performance.md) 🚀 - ✅ COMPLETE

### Security & Onboarding
- [Epic 24: Enhanced API Key Security](./epic-24-api-key-security.md) 🔐 - Agent-specific API keys
- [Epic 25: User Onboarding & API Improvements](./epic-25-user-onboarding.md) 🚀 - Improve onboarding UX

### AI-Native Architecture
- [Epic 28: Simulation API](./epic-28-simulation.md) 🔮 - Transaction simulation
- [Epic 29: Workflow Engine](./epic-29-workflow-engine.md) ⚙️ - Configurable multi-step workflows + **Agentic Composition (NEW)**
- [Epic 30: Structured Response System](./epic-30-structured-response.md) 📋 - Machine-readable API responses
- [Epic 31: Context API](./epic-31-context-api.md) 🔍 - Comprehensive context queries
- [Epic 32: Tool Discovery](./epic-32-tool-discovery.md) 🧭 - Capability catalog for agents
- [Epic 33: Metadata Schema](./epic-33-metadata-schema.md) 🏷️ - Custom field definitions
- [Epic 34: Transaction Decomposition](./epic-34-transaction-decomposition.md) 📦 - Line-item level operations
- [Epic 35: Entity Onboarding API](./epic-35-entity-onboarding.md) 🚀 - Single-call onboarding

### Future Considerations (P2/P3) ⭐ NEW
- [Epic 37: Facilitator-as-a-Service](./epic-37-facilitator-as-a-service.md) 🏭 - x402 facilitator for LATAM ecosystem
- [Epic 38: Payment-Optimized Chains](./epic-38-payment-optimized-chains.md) ⛓️ - Tempo & future chain integration
- [Epic 39: Open Issuance](./epic-39-open-issuance.md) 🪙 - Custom stablecoin support

---

## Investigation Documents ⭐ NEW

These documents explore strategic options before committing to implementation:

- [Chargeback-Free Value Proposition](../investigations/chargeback-free-value-prop.md) - How to position settlement finality
- [Ground Station Narrative](../investigations/ground-station-narrative.md) - Strategic positioning framework

---

## Status Summary

### Completed Epics ✅
| Epic | Completed | Points |
|------|-----------|--------|
| Epic 22: Seed Data & Final UI | Dec 18, 2025 | 15 |
| Epic 23: Dashboard Performance | Dec 22, 2025 | 18 |
| Epic 26: x402 Performance (Phase 1 & 2) | Dec 27, 2025 | 18 |
| **Total Completed** | | **51** |

### In Progress 🚧
| Epic | Status | Points |
|------|--------|--------|
| - | - | - |

### Planned (P0/P1) 📋
| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| Epic 36: SDK & Developer Experience | P0 | 66 | YC Demo Critical |
| Epic 29: Workflow Engine | P0 | 52 | +10 for agentic composition |
| Epic 30: Structured Response | P0 | 26 | |
| Epic 31: Context API | P0 | 16 | |
| Epic 32: Tool Discovery | P0 | 11 | |
| Epic 25: User Onboarding | P0 | 29 | |
| Epic 33: Metadata Schema | P1 | 11 | |
| Epic 34: Transaction Decomposition | P1 | 14 | |
| Epic 35: Entity Onboarding | P1 | 14 | |
| **Subtotal P0/P1** | | **239** | |

### Planned (P2) 📋
| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| Epic 19: PayOS x402 Services | P2 | 22 | |
| Epic 20: Streaming Payments | P2 | 28 | +10 for agent identity |
| Epic 24: API Key Security | P2 | 28 | |
| **Subtotal P2** | | **78** | |

### Future Consideration (P3) 🔮
| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| Epic 37: Facilitator-as-a-Service | P3 | TBD | Decision pending |
| Epic 38: Payment-Optimized Chains | P3 | ~49 | Post-scale |
| Epic 39: Open Issuance | P3 | ~47 | Post-PMF |
| Epic 21: Code Coverage | P3 | 112 | |
| **Subtotal P3** | | ~208 | |

### Points Summary
- **Completed:** 51 points
- **P0/P1 Planned:** 239 points
- **P2 Planned:** 78 points
- **P3 Future:** ~208 points
- **Total:** ~576 points

---

## Recent Changes (January 2025)

### New Epics Added
- **Epic 37: Facilitator-as-a-Service** — Should PayOS be an x402 facilitator for the ecosystem?
- **Epic 38: Payment-Optimized Chains** — Tempo and payment-specific blockchain integration
- **Epic 39: Open Issuance** — Custom partner stablecoin support

### Epic Updates
- **Epic 20:** Added Stories 20.6 (Agent Identity Standards) and 20.7 (Cross-Platform Reputation) — P2
- **Epic 29:** Added Stories 29.12 (Agent-Driven Workflow) and 29.13 (External Step Type) — P2

### New Investigation Documents
- **Chargeback-Free Value Prop** — Discussion on positioning settlement finality
- **Ground Station Narrative** — Strategic positioning framework for marketing

---

## Navigation

- [← Back to Master PRD](../PayOS_PRD_Master.md)
- [View Full PRD v1.14](../PayOS_PRD_v1_14.md)
- [View Investigations](../investigations/)

---

## Appendix: SDK Module Reference

When deciding where to expose a feature in the SDK, use this reference:

| Module | Purpose | Examples |
|--------|---------|----------|
| `payos.x402` | x402 protocol operations | `fetch()`, `createProvider()` |
| `payos.ap2` | AP2 mandate operations | `verifyMandate()`, `executePayment()` |
| `payos.acp` | ACP checkout operations | `createCheckout()`, `completeCheckout()` |
| `payos.settlements` | Direct settlement API | `quote()`, `create()`, `get()`, `list()` |
| `payos.compliance` | Compliance checks | `check()`, `screen()` |
| `payos.accounts` | Account management | `create()`, `get()`, `update()` |
| `payos.agents` | Agent management | `create()`, `get()`, `updatePolicy()` |
| `payos.webhooks` | Webhook utilities | `constructEvent()`, `verify()` |

---

*Last updated: January 1, 2026*
