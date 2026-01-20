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

### Definition of Done (DoD)

Every story must meet these criteria before completion:

- [ ] Code reviewed and merged
- [ ] Tests passing (unit + integration where applicable)
- [ ] Documentation updated (if user-facing)
- [ ] **SDK GATE:**
  - [ ] SDK exposure decision documented in story
  - [ ] If SDK exposure needed: Story created/updated in Epic 36
  - [ ] If SDK exposure NOT needed: Reason documented

---

## Epic Files

### Foundation & Infrastructure
- [Epic 17: Multi-Protocol Foundation](./epic-17-multi-protocol.md) ✅ - Multi-protocol payment foundation
- [Epic 18: Agent Wallets & KYA](./epic-18-agent-wallets.md) - Agent wallets and KYA system
- [Epic 27: Settlement System](./epic-27-settlement.md) ✅ - Settlement infrastructure

### x402 & Performance
- [Epic 19: PayOS x402 Services](./epic-19-x402-services.md) 🍾 - PayOS-hosted x402 services
- [Epic 26: x402 Payment Performance Optimization](./epic-26-x402-performance.md) ⚡ ✅ - PHASE 1 & 2 COMPLETE

### Streaming & Registry
- [Epic 20: Streaming Payments & Agent Registry](./epic-20-streaming-payments.md) 🌊 - Streaming payments + Agent Identity

### Developer Experience & SDK
- [Epic 36: SDK & Developer Experience](./epic-36-sdk-developer-experience.md) 🛠️ ✅ - Unified @payos/sdk with x402/AP2/ACP support

### Quality & Operations
- [Epic 21: Code Coverage Improvement](./epic-21-code-coverage.md) 📊 - Improve test coverage to 70%+
- [Epic 22: Seed Data & Final UI Integration](./epic-22-seed-data.md) 🌱 ✅ - COMPLETE
- [Epic 23: Dashboard Performance & API Optimization](./epic-23-dashboard-performance.md) 🚀 ✅ - COMPLETE

### Security & Onboarding
- [Epic 24: Enhanced API Key Security](./epic-24-api-key-security.md) 🔐 - Agent-specific API keys
- ~~[Epic 25: User Onboarding](./epic-25-user-onboarding.md)~~ → **Absorbed into Epic 51**

### AI-Native Architecture
- [Epic 28: Simulation API](./epic-28-simulation.md) 🔮 ✅ - Transaction simulation
- [Epic 29: Workflow Engine](./epic-29-workflow-engine.md) ⚙️ - Multi-step workflows + Agentic Composition
- [Epic 30: Structured Response System](./epic-30-structured-response.md) 📋 ✅ - Machine-readable API responses
- [Epic 31: Context API](./epic-31-context-api.md) 🔍 ✅ - Comprehensive context queries
- [Epic 32: Tool Discovery](./epic-32-tool-discovery.md) 🧭 - Capability catalog for agents
- [Epic 33: Metadata Schema](./epic-33-metadata-schema.md) 🏷️ - Custom field definitions
- [Epic 34: Transaction Decomposition](./epic-34-transaction-decomposition.md) 📦 - Line-item level operations
- [Epic 35: Entity Onboarding API](./epic-35-entity-onboarding.md) 🚀 - Single-call onboarding

### External Integrations (Phase 3.5)
- [Epic 40: External Sandbox Integrations](./epic-40-sandbox-integrations.md) 🔌 ✅ - Circle, x402, Stripe, AP2
- [Epic 41: On-Ramp Integrations](./epic-41-onramp-integrations.md) 💳 - Cards, ACH, LATAM banks
- [Epic 42: Frontend Dashboard Integration](./epic-42-frontend-dashboard.md) 🖥️ ✅ - UI for Epic 40 features

### Protocol Integration ⭐ NEW
- [Epic 43: UCP (Universal Commerce Protocol)](./epic-43-ucp-integration.md) 🌐 ✅ - Google+Shopify's new standard

### Platform Architecture ⭐ NEW
- [Epic 48: Connected Accounts](./epic-48-connected-accounts.md) 🔌 **P0** - Payment handler management
- [Epic 49: Protocol Discovery](./epic-49-protocol-discovery.md) 🧭 **P0** - Protocol registry & enablement
- [Epic 50: Settlement Decoupling](./epic-50-settlement-decoupling.md) ⚙️ **P0** - Settlement trigger rules
- [Epic 51: Unified Onboarding](./epic-51-unified-onboarding.md) 🚀 **P1** - Protocol-specific onboarding
- [Epic 52: Dashboard Redesign](./epic-52-dashboard-redesign.md) 📊 **P1** - Agentic protocol focus

### Future Considerations (P2/P3)
- [Epic 37: Facilitator-as-a-Service](./epic-37-facilitator-as-a-service.md) 🏭 - x402 facilitator for LATAM ecosystem
- [Epic 38: Payment-Optimized Chains](./epic-38-payment-optimized-chains.md) ⛓️ - Tempo & future chain integration
- [Epic 39: Open Issuance](./epic-39-open-issuance.md) 🪙 - Custom stablecoin support

### Production Hardening (P2/P3)
- [Epic 44: Observability & Monitoring](./epic-44-observability.md) 📊 - Monitoring, alerting, SLAs
- [Epic 45: Webhook Infrastructure](./epic-45-webhook-infrastructure.md) 🔔 - Guaranteed delivery, DLQ
- [Epic 46: Multi-Region & Disaster Recovery](./epic-46-disaster-recovery.md) 🌍 - Scale & resilience

---

## Investigation Documents

Strategic explorations before committing to implementation:

- [UCP Integration](../investigations/ucp-integration.md) 🔴 **URGENT** - New protocol from Google+Shopify (Jan 11, 2026)
- [Chargeback-Free Value Proposition](../investigations/chargeback-free-value-prop.md) - Settlement finality positioning
- [Ground Station Narrative](../investigations/ground-station-narrative.md) - "Starlink for money" marketing

---

## Status Summary

### Completed Epics ✅

| Epic | Completed | Points | Notes |
|------|-----------|--------|-------|
| Epic 17: Multi-Protocol | Dec 28, 2025 | 53 | x402/AP2/ACP foundation |
| Epic 22: Seed Data | Dec 18, 2025 | 15 | |
| Epic 23: Dashboard Perf | Dec 22, 2025 | 18 | |
| Epic 26: x402 Performance | Dec 27, 2025 | 18 | |
| Epic 27: Settlement | Dec 30, 2025 | 34 | |
| Epic 28: Simulation | Jan 4, 2026 | 24 | |
| Epic 30: Structured Response | Jan 1, 2026 | 28 | |
| Epic 31: Context API | Jan 2, 2026 | 21 | |
| Epic 36: SDK & DX | Jan 3, 2026 | 66 | |
| Epic 40: Sandbox | Jan 5, 2026 | ~100 | Circle, Stripe, x402 |
| Epic 42: Frontend | Jan 6, 2026 | 65 | |
| Epic 43: UCP Integration | Jan 19, 2026 | 55 | |
| **Total Completed** | | **~497** | |

### Current Focus 🚧

| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| **Epic 48: Connected Accounts** | **P0** | 21 | Payment handler management |
| **Epic 49: Protocol Discovery** | **P0** | 18 | Protocol registry |
| **Epic 50: Settlement Decoupling** | **P0** | 26 | Settlement rules engine |
| **Epic 51: Unified Onboarding** | **P1** | 52 | Protocol onboarding (absorbed Epic 25) |
| **Epic 52: Dashboard Redesign** | **P1** | 21 | Agentic protocol focus |
| Epic 41: On-Ramp | P1 | 110 | Non-crypto customers |
| Epic 29: Workflow Engine | P0 | 52 | |

### Planned (P0/P1) 📋

| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| Epic 32: Tool Discovery | P0 | 11 | |
| Epic 33: Metadata Schema | P1 | 11 | |
| Epic 34: Transaction Decomp | P1 | 14 | |
| **Subtotal P0/P1** | | **~336** | Including Epic 48-52, 41, 29 |

### Planned (P2) 📋

| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| Epic 19: x402 Services | P2 | 22 | |
| Epic 20: Streaming | P2 | 28 | +10 for agent identity |
| Epic 24: API Key Security | P2 | 28 | |
| Epic 44: Observability | P2 | ~40 | |
| Epic 45: Webhooks | P2 | ~35 | |
| **Subtotal P2** | | **~153** | |

### Future (P3) 🔮

| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| Epic 21: Code Coverage | P3 | 112 | |
| Epic 37: Facilitator | P3 | TBD | Decision pending |
| Epic 38: Payment Chains | P3 | ~49 | Post-scale |
| Epic 39: Open Issuance | P3 | ~47 | Post-PMF |
| Epic 46: DR | P3 | ~60 | |
| **Subtotal P3** | | **~268** | |

### Points Summary

- **Completed:** ~497 points
- **Current Focus:** ~300 points (48, 49, 50, 51, 52, 41, 29)
- **P0/P1 Planned:** ~36 points
- **P2 Planned:** ~153 points
- **P3 Future:** ~268 points
- **Total Defined:** ~1,254 points

---

## Recent Changes (January 2026)

### January 20, 2026
- **Epic 43: UCP Integration** — COMPLETE ✅ (55 points)
- **Epic 48: Connected Accounts** — NEW (21 points, P0)
  - Payment handler management for multi-processor support
- **Epic 49: Protocol Discovery** — NEW (18 points, P0)
  - Protocol registry and enablement API
- **Epic 50: Settlement Decoupling** — NEW (26 points, P0)
  - Settlement trigger rules engine
- **Epic 51: Unified Onboarding** — NEW (24 points, P1)
  - Protocol-specific onboarding flows
- **Epic 52: Dashboard Redesign** — NEW (21 points, P1)
  - Agentic protocol focus, real metrics
- **Architecture Doc** — [Three-Layer Architecture](../../architecture/three-layer-architecture.md)

### January 15, 2026
- **Epic 43: UCP Integration** — Created (55 points, P0)
  - Google+Shopify's Universal Commerce Protocol launched Jan 11
  - PayOS to become UCP Payment Handler for LATAM
- **Epic 44: Observability** — NEW (Placeholder, P2)
- **Epic 45: Webhook Infrastructure** — NEW (Placeholder, P2)
- **Epic 46: Multi-Region & DR** — NEW (Placeholder, P3)
- **UCP Investigation** — Comprehensive analysis at `investigations/ucp-integration.md`

### January 6, 2026
- **Epic 42: Frontend Dashboard** — COMPLETE ✅ (65 points)

### January 5, 2026
- **Epic 40: Sandbox Integrations** — COMPLETE ✅ (~100 points)

---

## Protocol Support Matrix

PayOS supports **FOUR** agentic payment protocols:

| Protocol | Owner | Focus | PayOS Status |
|----------|-------|-------|--------------|
| **x402** | Coinbase | Micropayments | ✅ Full support |
| **AP2** | Google | Agent mandates | ✅ Full support |
| **ACP** | Stripe/OpenAI | E-commerce | ✅ Full support |
| **UCP** | Google+Shopify | Full commerce | 🚧 Epic 43 (P0) |

> **"We don't care which protocol wins. PayOS makes them all work."**

---

## Navigation

- [← Back to Master PRD](../PayOS_PRD_Master.md)
- [View Investigations](../investigations/)

---

## Appendix: SDK Module Reference

| Module | Purpose | Examples |
|--------|---------|----------|
| `payos.x402` | x402 protocol operations | `fetch()`, `createProvider()` |
| `payos.ap2` | AP2 mandate operations | `verifyMandate()`, `executePayment()` |
| `payos.acp` | ACP checkout operations | `createCheckout()`, `completeCheckout()` |
| `payos.ucp` | UCP protocol operations | `discover()`, `settle()` |
| `payos.settlements` | Direct settlement API | `quote()`, `create()`, `get()`, `list()` |
| `payos.compliance` | Compliance checks | `check()`, `screen()` |
| `payos.accounts` | Account management | `create()`, `get()`, `update()` |
| `payos.agents` | Agent management | `create()`, `get()`, `updatePolicy()` |
| `payos.webhooks` | Webhook utilities | `constructEvent()`, `verify()` |

---

*Last updated: January 20, 2026*
