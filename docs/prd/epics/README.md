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
- [ ] Story 36.X: Add `foo` module to @sly/sdk
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
- [Epic 36: SDK & Developer Experience](./epic-36-sdk-developer-experience.md) 🛠️ ✅ - Unified @sly/sdk with x402/AP2/ACP support

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
- [Epic 48: Connected Accounts](./epic-48-connected-accounts.md) 🔌 ✅ - Payment handler management
- [Epic 49: Protocol Discovery](./epic-49-protocol-discovery.md) 🧭 ✅ - Protocol registry & enablement
- [Epic 50: Settlement Decoupling](./epic-50-settlement-decoupling.md) ⚙️ ✅ - Settlement trigger rules
- [Epic 51: Unified Onboarding](./epic-51-unified-onboarding.md) 🚀 ✅ - Protocol-specific onboarding
- [Epic 52: Dashboard Redesign](./epic-52-dashboard-redesign.md) 📊 ✅ - Agentic protocol focus

### Card Network Integration
- [Epic 53: Card Network Agentic Commerce](./epic-53-card-network-agentic-commerce.md) 💳 ✅ - Visa VIC + Mastercard Agent Pay, unified Web Bot Auth, multi-rail routing

### Brand & Identity
- [Epic 54: Sly Rebranding](./epic-54-sly-rebranding.md) 🎨 ✅ - PayOS → Sly rename across codebase, packages, docs, UI

### Demo & Sales Enablement
- [Epic 55: Demo Scenario Readiness](./epic-55-demo-scenario-readiness.md) 🎯 - Seed data, KPI panels, settlement timeline, demo walkthrough for all 8 scenarios

### Agent Interoperability ⭐ NEW
- [Epic 57: Google A2A Protocol](./epic-57-google-a2a-protocol.md) 🤝 ✅ - Google A2A protocol for agent discovery, communication, and paid task execution
- [Epic 58: A2A Task Processor Worker](./epic-58-a2a-task-processor.md) ⚙️ - Background worker for processing A2A tasks with LLM handlers, tool registry, and payment gating

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
| Epic 52: Dashboard Redesign | Jan 22, 2026 | 21 | Agentic protocol focus |
| Epic 48: Connected Accounts | Jan 22, 2026 | 21 | Payment handler management |
| Epic 49: Protocol Discovery | Jan 22, 2026 | 18 | Protocol registry & enablement |
| Epic 50: Settlement Decoupling | Jan 22, 2026 | 26 | Settlement trigger rules |
| Epic 51: Unified Onboarding | Jan 22, 2026 | 52 | Protocol-specific onboarding |
| Epic 53: Card Networks | Jan 27, 2026 | 62 | Visa VIC + Mastercard Agent Pay |
| Epic 54: Sly Rebranding | Jan 27, 2026 | 34 | PayOS → Sly rename |
| Epic 57: Google A2A | Feb 21, 2026 | 89 | Agent discovery, communication, paid tasks |
| **Total Completed** | | **~820** | |

### Current Focus 🚧

| Epic | Priority | Points | Notes |
|------|----------|--------|-------|
| Epic 58: A2A Task Processor | P0 | 119 | Background worker, LLM handlers, payment gating |
| Epic 55: Demo Readiness | P0 | 89 | Seed data + demo UI for 8 scenarios |
| Epic 29: Workflow Engine | P0 | 52 | Multi-step workflows |
| Epic 41: On-Ramp | P1 | 110 | Non-crypto customers |

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

- **Completed:** ~820 points
- **Current Focus:** ~370 points (58, 55, 29, 41)
- **P0/P1 Planned:** ~36 points
- **P2 Planned:** ~153 points
- **P3 Future:** ~268 points
- **Total Defined:** ~1,647 points

---

## Recent Changes

### February 21, 2026
- **Epic 57: Google A2A Protocol** — COMPLETE ✅ (89 points)
  - Full A2A v0.3 protocol support: Agent Cards, JSON-RPC 2.0, task lifecycle
  - Per-agent discovery at `/a2a/agents/:id/card` (public, no auth)
  - Platform discovery at `/.well-known/agent.json`
  - Payment integration: x402 payment gating + AP2 mandate linking within tasks
  - Outbound A2A client for remote agent communication
  - SDK types + client methods in `@sly/api-client`
  - 4 MCP tools: `a2a_discover_agent`, `a2a_send_task`, `a2a_get_task`, `a2a_list_tasks`
  - Dashboard: A2A tab on agent detail, tasks + sessions pages
  - Integration tests (599 lines)
- **AP2 Mandate Payment Instruments** — Enhancement
  - `funding_source_id` and `settlement_rail` columns on `ap2_mandates`
  - Create/update/execute mandates with bound payment instruments
  - UI: funding source + settlement rail selectors on create page, display on detail page
  - Agent detail page: "Payment Instruments" section showing bound instruments

### February 19, 2026
- **Epic 57: Google A2A Protocol** — NEW (89 points, P0)
  - Google's Agent-to-Agent protocol for agent discovery, communication, and paid task execution
  - 14 stories across 6 phases: Agent Cards, Task DB + JSON-RPC, Payment Integration, Outbound Client, SDK + Frontend, Testing
  - Hybrid auth: Sly API keys for known partners + verified bearer tokens for open federation
  - Reuses existing AP2 mandates, x402 payments, wallet system
  - Adds 4 MCP tools, A2A tab on agent detail page, `sly.a2a` SDK module

### February 6, 2026
- **Epic 55: Demo Scenario Readiness** — NEW (89 points, P0)
  - Comprehensive dashboard validation against all 8 demo scenarios
  - 20 screens validated: 1 good to go, 18 need seed data, 1 partially ready
  - 12 stories: seed data (40 pts), UI components (34 pts), polish (15 pts)
  - Key deliverables: scenario-specific seed script, KPI panels, settlement timeline, policy check viz, demo mode navigation

### January 30, 2026
- **Story 36.10: Function-Calling Format** — COMPLETE ✅
  - `GET /v1/capabilities/function-calling` endpoint implemented
  - OpenAI function format (`?format=openai`)
  - Anthropic tool format (`?format=anthropic`)
  - Protocol-specific capabilities at `/v1/capabilities/protocols`
  - LLM-optimized descriptions for all 8 core operations
- **Docs:** Updated TODO.md with recent completions and demo checklist progress

### January 27, 2026
- **Epic 54: Sly Rebranding** — COMPLETE ✅ (34 points)
  - Renamed PayOS to Sly across entire codebase
  - Updated all packages (@payos/* → @sly/*)
  - Updated UI branding, logos, and documentation
  - Support for SLY_ environment variable prefix
- **Epic 53: Card Network Agentic Commerce** — COMPLETE ✅ (62 points)
  - Visa VIC integration with TAP (Trusted Agent Protocol)
  - Mastercard Agent Pay with DTVC tokens
  - Unified Web Bot Auth verification (RFC 9421)
  - Settlement router with 5 rails: Visa, MC, USDC, Pix, SPEI
  - Dashboard UI for card network management
  - SDK modules: `sly.cards.visa`, `sly.cards.mastercard`
- **Security:** Enabled RLS on `runs` and `run_logs` tables
- **Fix:** Protocol toggles now work correctly on dashboard home page

### January 22, 2026
- **Epic 52: Dashboard Redesign** — COMPLETE ✅ (21 points)
  - Protocol distribution widget (x402/AP2/ACP/UCP, not Circle/ETH/BTC)
  - Protocol activity chart with time range and metric toggles
  - Protocol quick stats cards with enable/disable toggles
  - Conditional onboarding banner
  - Recent protocol activity feed with agent badges
- **Epic 48: Connected Accounts** — COMPLETE ✅ (21 points)
  - CRUD API for connected accounts
  - Credential vault with AES-256 encryption
  - Payment handler abstraction (Stripe, PayPal, Circle)
  - Handler registry and validation
- **Epic 49: Protocol Discovery** — COMPLETE ✅ (18 points)
  - Protocol registry service (x402, AP2, ACP, UCP)
  - Protocol discovery API (`GET /v1/protocols`)
  - Protocol enablement API with prerequisite validation
  - Protocol status dashboard widget with toggles
- **Epic 50: Settlement Decoupling** — COMPLETE ✅ (26 points)
  - Settlement trigger engine (schedule, threshold, manual, immediate)
  - Settlement rules CRUD API
  - Settlement rules dashboard UI
- **Epic 51: Unified Onboarding** — COMPLETE ✅ (52 points)
  - Onboarding state tracking API
  - Protocol-specific onboarding flows
  - Quick start templates
  - Sandbox mode toggle
  - Full wizard UI with step components

### January 21, 2026
- **Epic 53: Card Network Agentic Commerce** — NEW (62 points, P1)
  - **Both Visa VIC AND Mastercard Agent Pay** support
  - Unified Web Bot Auth verification (RFC 9421) for both networks
  - 11 stories covering full integration of both card networks
  - Settlement router evaluates 5 rails: Visa, Mastercard, USDC, Pix, SPEI
  - LATAM optimization (Mastercard already live Dec 2025)
  - MCP tools and Dashboard UI for card network management

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

Sly supports **FIVE** agentic payment and communication protocols:

| Protocol | Owner | Focus | Sly Status |
|----------|-------|-------|------------|
| **x402** | Coinbase | Micropayments | ✅ Full support |
| **AP2** | Google | Agent mandates | ✅ Full support |
| **ACP** | Stripe/OpenAI | E-commerce | ✅ Full support |
| **UCP** | Google+Shopify | Full commerce | ✅ Epic 43 |
| **A2A** | Google | Agent communication | ✅ Epic 57 |

**Card Network Support:**

| Network | Protocol | Sly Status |
|---------|----------|------------|
| **Visa** | VIC / TAP | ✅ Epic 53 |
| **Mastercard** | Agent Pay | ✅ Epic 53 |

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
| `payos.cards` | Card network operations | `verify()`, `createInstruction()`, `complete()` |
| `payos.cards.visa` | Visa VIC operations | `createInstruction()`, `getCredentials()` |
| `payos.cards.mastercard` | Mastercard Agent Pay | `registerAgent()`, `createToken()`, `getDTVC()` |
| `payos.a2a` | A2A protocol operations | `discover()`, `sendTask()`, `getTask()`, `getAgentCard()` |

---

*Last updated: February 21, 2026*
