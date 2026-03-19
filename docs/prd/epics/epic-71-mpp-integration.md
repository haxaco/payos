# Epic 71: Machine Payments Protocol (MPP) Integration

**Phase:** 3.5 (Protocol Integration)
**Priority:** P0
**Status:** Planned
**Total Points:** 81
**Stories:** 17
**Dependencies:** Epic 17 (Multi-Protocol Gateway), Epic 18 (Agent Wallets)
**Enables:** MPP service directory access, governed streaming sessions, multi-method payment routing

**Doc:** `docs/prd/epics/epic-71-mpp-integration.md`
**Linear Project:** Sly
**SDK Impact:** Yes (see SDK Impact Assessment below)

---

## Strategic Context

MPP (Machine Payments Protocol) launched March 18, 2026. Co-authored by Stripe and Tempo Labs. Submitted to the IETF as an open standard. It standardizes HTTP 402 "Payment Required" for machine-to-machine payments with an extensible framework supporting multiple payment methods and intents.

**Why MPP matters for Sly:**

1. **100+ services in the MPP directory on day one.** OpenAI, Anthropic, Shopify, Dune Analytics, Alchemy, fal.ai, ElevenLabs. Sly agents gain access to an entire paid service economy without per-service onboarding.

2. **Multi-method payment routing is native to the protocol.** A single 402 challenge can advertise Tempo stablecoins, Stripe cards, and Lightning simultaneously. The client picks. This maps directly to Sly's protocol-agnostic positioning.

3. **Sessions enable governed streaming payments.** MPP sessions lock funds in a payment channel and use off-chain vouchers per request. Thousands of micro-payments aggregate into a single settlement. Sly governs the session: max deposit, duration limit, per-voucher cap, counterparty allowlist.

4. **MCP transport binding.** MPP works over both HTTP and MCP (Model Context Protocol). Any MCP-connected model (Claude, ChatGPT) can use MPP natively. This bridges Sly's A2A work (Epic 57) into the payments layer.

5. **MPP has no governance layer.** The spec covers challenges, credentials, receipts, sessions, and payment methods. It does NOT cover KYA, spending policies, approval workflows, kill switches, or audit trails. That gap is Sly.

**Relationship to existing protocols:**

MPP is additive, not a replacement. x402 (Coinbase) and MPP both use HTTP 402 but are independent specs with different ecosystems. ACP (Stripe) is a checkout protocol; MPP's Stripe method is a per-request protocol. They coexist. Sly supports all of them.

| Protocol | Owner | Relationship to MPP |
|---|---|---|
| x402 | Coinbase/Cloudflare | Parallel HTTP 402 spec. Different ecosystem. Sly supports both. |
| ACP | Stripe/OpenAI | Checkout flow (cart-based). MPP Stripe method is per-request. Complementary. |
| AP2 | Google | Mandate-based. MPP could carry AP2 mandates via custom method. Orthogonal. |
| UCP | Google+Shopify | Commerce lifecycle. MPP handles the payment leg. UCP handles discovery/checkout/post-purchase. |

**Updated protocol matrix:**

| # | Protocol | Status in Sly |
|---|---|---|
| 1 | x402 | Built |
| 2 | AP2 | Built |
| 3 | ACP | Built |
| 4 | UCP | Built |
| 5 | A2A | Built |
| 6 | AgentPay | Planned (Epic 53) |
| 7 | VIC | Planned (Epic 53) |
| 8 | L402 | Planned |
| **9** | **MPP** | **This epic** |

---

## Architecture

MPP integration has two surfaces: Sly as a governed MPP **client** (agents pay external services) and Sly as a governed MPP **server** (external agents pay for Sly-governed resources).

```
                        MPP SERVICE DIRECTORY
                    (OpenAI, Anthropic, Shopify, 100+)
                                │
                         402 challenges
                                │
┌───────────────────────────────┼───────────────────────────────┐
│                          SLY GOVERNANCE                       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  MPP Client  │  │ Policy Check │  │   Audit Trail        │ │
│  │  (mppx SDK)  │←→│ KYA + Spend  │  │   CloudEvents        │ │
│  │              │  │ + Approval   │  │   per credential     │ │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘ │
│         │                                                      │
│  ┌──────┴────────────────────────────────────┐                │
│  │         PAYMENT METHOD ROUTER              │                │
│  │  Tempo (stablecoins) ← preferred for A2S   │                │
│  │  Stripe (cards/fiat) ← preferred for A2M   │                │
│  │  Lightning (BTC)     ← if counterparty     │                │
│  │  Custom              ← extensible          │                │
│  └───────────────────────────────────────────┘                │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         MPP SERVER (accept payments for Sly APIs)        │ │
│  │  mppx/hono middleware on Sly API routes                  │ │
│  │  KYA verification of paying agent before access          │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────────┐
                    │           │               │
              Tempo Mainnet  Stripe        Lightning
              (TIP-20 USDC)  (Cards/SPT)   (BTC/LN)
```

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| SDK | Use official `mppx` package (TypeScript) | Maintained by Tempo Labs + Wevm. Hono integration included. No custom provider needed. |
| Primary payment method | Tempo (stablecoins) | Permissionless, sub-second finality, sub-cent fees. No signup required. |
| Stripe method | Enable when access granted | Requires `machine-payments@stripe.com` approval. Cards + SPT + crypto via Stripe. |
| Server framework | `mppx/hono` | Sly API is Hono. Native integration. Zero framework mismatch. |
| Credential storage | Store in `protocol_metadata` on transfers | Consistent with x402, AP2, ACP patterns from Epic 17. |
| Session governance | Sly wraps `mppx` session with policy check per voucher | Off-chain vouchers are CPU-bound signature checks. Sly intercepts before signing. |
| Testnet vs mainnet | Mainnet with pathUSD for testnet-equivalent safety | Tempo mainnet launched March 18. pathUSD is the test stablecoin on mainnet. |

---

## SDK Impact Assessment

| SDK Component | Impact | Notes |
|---|---|---|
| `@sly/sdk` (unified) | New `mpp` namespace | `sdk.mpp.pay()`, `sdk.mpp.session()`, `sdk.mpp.discover()` |
| `@sly/types` | New types | `MppCredential`, `MppChallenge`, `MppReceipt`, `MppSession`, `MppPaymentMethod` |
| MCP Server | New tools | `mpp_pay`, `mpp_session_open`, `mpp_session_close`, `mpp_discover_services` |
| Dashboard | New pages | MPP service browser, session monitor, receipt history |

---

## Phase 1: MPP Client Foundation (P0)
**Goal:** Sly agents can pay any MPP-enabled service, governed by policy.
**Points:** 30 · **Stories:** 6

### Story 71.1: Install mppx and Configure Tempo Payment Method (3 pts, P0)
Install `mppx` TypeScript SDK. Configure Tempo payment method as default. Verify with paid request to MPP service.

### Story 71.2: MPP Governance Middleware (5 pts, P0)
Wrap mppx client fetch with policy intercept. Check KYA, spending limits, counterparty allowlist before credential signing.

### Story 71.3: MPP Data Model (3 pts, P0)
Add `mpp` transfer type, `settlement_network` column, MppMetadata TypeScript types, Zod schemas.

### Story 71.4: MPP Audit Trail (3 pts, P0)
CloudEvents for MPP lifecycle. 10 new OpType entries following Epic 65 patterns.

### Story 71.5: Agent MPP Wallet Provisioning (3 pts, P0)
Add `tempo` to agent_wallets network enum. Generate keypairs, fund, configure mppx client per agent.

### Story 71.6: MPP Transfer Recording and History (3 pts, P0)
Record MPP payments as transfers. Query by service, method, intent, session. Explorer URL support.

---

## Phase 2: MPP Sessions and Streaming (P0)
**Goal:** Agents can open governed streaming sessions with MPP services.
**Points:** 18 · **Stories:** 4

### Story 71.7: Governed MPP Session Manager (5 pts, P0)
Wrap mppx session lifecycle with governance. Per-voucher policy check. Budget warnings. Auto-close on exhaustion.

### Story 71.8: MPP Session API Endpoints (3 pts, P0)
Open/list/detail/close session endpoints for agents and operators.

### Story 71.9: MPP Session Spending Policies (5 pts, P0)
Session-specific policy fields: maxDeposit, concurrent limit, duration, idle timeout, exhaustion action.

### Story 71.10: MPP Streamed Payment Support (5 pts, P1)
Governed SSE connections. Per-token spend tracking. Budget enforcement mid-stream.

---

## Phase 3: MPP Server Integration (P1)
**Goal:** Sly-governed APIs can accept MPP payments from any agent.
**Points:** 13 · **Stories:** 3

### Story 71.11: MPP Server Middleware for Hono (5 pts, P1)
Integrate mppx/hono middleware. Payment-gate any Sly API route. Tempo + Stripe methods.

### Story 71.12: MPP Payer KYA Verification (5 pts, P1)
Verify paying agent identity from MPP credential. Trust tiers (0-3) based on KYA status.

### Story 71.13: MPP Receipt Reconciliation (3 pts, P1)
Store and verify receipts. Reconciliation report. Discrepancy alerting.

---

## Phase 4: MPP Dashboard and Discovery (P2)
**Goal:** Operators can monitor MPP activity. Agents can discover services.
**Points:** 12 · **Stories:** 3

### Story 71.14: MPP Dashboard Pages (5 pts, P2)
MPP overview, sessions list, service usage breakdown under Agentic Payments.

### Story 71.15: MPP Service Discovery API (3 pts, P2)
Browse MPP service directory. Query pricing. Integrate with simulation engine.

### Story 71.16: MPP Analytics (4 pts, P2)
MPP in cross-protocol analytics. Method breakdown. Session vs charge. Cost comparison with x402.

---

## Protocol Composition: AP2 × A2A × MPP

MPP doesn't replace AP2 or A2A. The three protocols form a stack.

**AP2 = the budget envelope.** A principal (human or business) grants a mandate: "Agent X can spend up to $200/month on research services." The mandate is the spending authority. It doesn't care how the money moves.

**A2A = the job.** Agent X discovers Agent Y, sends a task, gets a result. The task has a price. No money moves in the A2A layer — it's pure coordination.

**MPP = the settlement rail.** On successful task completion, the mandate executes. Money moves via MPP — Tempo stablecoin, Stripe card, whatever the counterparty accepts. The MPP receipt is proof of payment.

### Composition Flow

```
Principal creates AP2 mandate
  ($200/month, "research" category, approved counterparties)
          │
          ▼
Agent X discovers Agent Y via A2A
          │
          ▼
Agent X sends task (A2A)
  → Sly checks: mandate has budget? category matches? counterparty approved?
          │
          ▼
Agent Y works
  (may incur its own MPP costs calling paid APIs — governed by its own wallet)
          │
          ▼
Agent Y delivers result (A2A artifact)
          │
          ▼
Task accepted → mandate draws down → MPP payment to Agent Y
          │
          ▼
MPP receipt attached to A2A task artifact
  → mandate balance decremented
  → single audit event spans all three protocols
```

The mandate doesn't "complete" on one task. It's a budget that depletes across multiple tasks until exhausted or expired. Each successful A2A task is a draw against it.

### Why This Matters

The governance engine becomes the composition layer. One policy check at task acceptance crosses all three protocols in a single decision:

| Check | Protocol | Question |
|---|---|---|
| Mandate validity | AP2 | Is the mandate active, within budget, not expired? |
| Task authorization | A2A | Is the counterparty agent known, KYA-verified, category-approved? |
| Settlement feasibility | MPP | Can the payment method reach the counterparty? Is the network available? |

One check. Three protocols. One audit event. Nobody else can do this because nobody else supports all three.

### Where Each Protocol's Governance Lives

| Protocol | Built-in governance | Sly adds |
|---|---|---|
| AP2 | Mandates have limits, expiry, categories | Per-counterparty exposure, approval workflows, kill switch |
| A2A | None (pure coordination) | Task acceptance policies, counterparty allowlist, spend caps |
| MPP | None (pure payment) | KYA verification, spending policies, session limits, audit trail |

The gap is widest in MPP and A2A. AP2 has governance baked in via mandates, but Sly extends it with enterprise controls. MPP and A2A have zero governance — that's entirely Sly's value.

---

## Phase 5: Protocol Composition (P1)
**Goal:** AP2 mandates authorize A2A tasks that settle via MPP. One governance check spans all three.
**Points:** 8 · **Stories:** 1

---

### Story 71.17: AP2 Mandate → A2A Task → MPP Settlement Bridge

**Points:** 8
**Priority:** P1
**Effort:** 5 hours

**Description:**
Connect the three protocol layers so that a successful A2A task triggers MPP settlement against an AP2 mandate. Sly's governance engine evaluates all three protocols in a single policy check at task acceptance, and executes a single settlement flow on task completion.

**Task acceptance flow (pre-work):**
```typescript
// apps/api/src/providers/composition/task-mandate-bridge.ts
export async function evaluateTaskWithMandate(
  agentId: string,
  taskRequest: A2ATaskRequest,
  mandateId: string,
): Promise<CompositionDecision> {
  // 1. AP2: Validate mandate (active, budget remaining, not expired)
  const mandate = await getMandateStatus(mandateId)
  if (!mandate.active || mandate.remainingBudget < taskRequest.price) {
    return { allowed: false, reason: 'mandate_insufficient', protocol: 'ap2' }
  }

  // 2. A2A: Validate counterparty (KYA, allowlist, category)
  const counterparty = await resolveA2AAgent(taskRequest.counterpartyAgentUrl)
  if (!isCounterpartyApproved(agentId, counterparty, mandate.categories)) {
    return { allowed: false, reason: 'counterparty_rejected', protocol: 'a2a' }
  }

  // 3. MPP: Validate settlement path (can we pay this agent?)
  const paymentPath = await resolveMppPaymentPath(counterparty)
  if (!paymentPath.reachable) {
    return { allowed: false, reason: 'no_settlement_path', protocol: 'mpp' }
  }

  return {
    allowed: true,
    mandate,
    counterparty,
    paymentPath,
    auditRef: generateCompositionAuditRef(),
  }
}
```

**Task completion flow (settlement):**
```typescript
// apps/api/src/providers/composition/task-settlement.ts
export async function settleCompletedTask(
  taskId: string,
  decision: CompositionDecision,
): Promise<SettlementResult> {
  // 1. Execute MPP payment to counterparty agent
  const mppResult = await governedMppFetch(
    decision.mandate.agentId,
    decision.paymentPath.endpoint,
    { amount: decision.task.price }
  )

  // 2. Draw down AP2 mandate balance
  await decrementMandate(decision.mandate.id, decision.task.price)

  // 3. Attach MPP receipt to A2A task artifact
  await attachReceiptToTask(taskId, mppResult.receipt)

  // 4. Single composition audit event
  await emitCompositionEvent({
    type: 'composition.task_settled',
    mandateId: decision.mandate.id,
    taskId,
    counterparty: decision.counterparty.agentUrl,
    amount: decision.task.price,
    method: mppResult.method,
    receiptRef: mppResult.receipt.reference,
    protocols: ['ap2', 'a2a', 'mpp'],
  })

  return { taskId, receipt: mppResult.receipt, mandateRemaining: decision.mandate.remainingBudget }
}
```

**New types:**
```typescript
interface CompositionDecision {
  allowed: boolean;
  reason?: string;
  protocol?: 'ap2' | 'a2a' | 'mpp';
  mandate?: MandateStatus;
  counterparty?: A2AAgentInfo;
  paymentPath?: MppPaymentPath;
  auditRef?: string;
}

interface CompositionAuditEvent {
  type: 'composition.task_settled' | 'composition.task_rejected';
  mandateId: string;
  taskId: string;
  counterparty: string;
  amount: string;
  method?: MppPaymentMethod;
  receiptRef?: string;
  protocols: ('ap2' | 'a2a' | 'mpp')[];
}
```

**API Endpoints:**
```
POST /v1/agents/:id/tasks/:taskId/settle    — Settle completed A2A task via MPP against mandate
GET  /v1/agents/:id/mandates/:mid/tasks     — List A2A tasks settled against a mandate
GET  /v1/composition/audit                   — Cross-protocol audit trail
```

**Acceptance Criteria:**
- [ ] A2A task acceptance checks AP2 mandate validity, A2A counterparty approval, and MPP settlement path in one call
- [ ] Successful A2A task triggers MPP payment and AP2 mandate drawdown
- [ ] MPP receipt attached to A2A task artifact as proof of settlement
- [ ] Single `composition.task_settled` CloudEvent spans all three protocols
- [ ] Mandate balance accurately reflects all task settlements
- [ ] Rejection at any protocol layer returns structured error identifying which protocol blocked it
- [ ] Tasks queryable by mandate (which tasks drew from this budget?)
- [ ] Mandate queryable by tasks (what's my spend breakdown by counterparty agent?)

**Dependencies:**
- Story 71.2 (Governance Middleware) — MPP payment execution
- Story 71.4 (Audit Trail) — CloudEvents infrastructure
- Story 71.11 (Server Middleware) — counterparty agent accepts MPP
- Epic 57 (A2A) — task lifecycle
- Epic 18 (Agent Wallets) — mandate management

**Files:**
- New: `apps/api/src/providers/composition/task-mandate-bridge.ts`
- New: `apps/api/src/providers/composition/task-settlement.ts`
- New: `apps/api/src/routes/composition.ts`
- Modify: `apps/api/src/providers/a2a/task-processor.ts` (hook settlement on task complete)
- Modify: `apps/api/src/services/observability.ts` (add `composition.*` OpTypes)

---

## Story Summary

| Story | Name | Phase | Pts | Priority | Linear |
|---|---|---|---|---|---|
| 71.1 | Install mppx + Tempo Method | 1 | 3 | P0 | SLY-477 |
| 71.2 | Governance Middleware | 1 | 5 | P0 | SLY-478 |
| 71.3 | Data Model | 1 | 3 | P0 | SLY-479 |
| 71.4 | Audit Trail | 1 | 3 | P0 | SLY-480 |
| 71.5 | Wallet Provisioning | 1 | 3 | P0 | SLY-481 |
| 71.6 | Transfer Recording | 1 | 3 | P0 | SLY-482 |
| 71.7 | Session Manager | 2 | 5 | P0 | SLY-483 |
| 71.8 | Session API | 2 | 3 | P0 | SLY-484 |
| 71.9 | Session Policies | 2 | 5 | P0 | SLY-485 |
| 71.10 | Streamed Payment (SSE) | 2 | 5 | P1 | SLY-486 |
| 71.11 | Server Middleware | 3 | 5 | P1 | SLY-487 |
| 71.12 | Payer KYA | 3 | 5 | P1 | SLY-488 |
| 71.13 | Receipt Reconciliation | 3 | 3 | P1 | SLY-489 |
| 71.14 | Dashboard Pages | 4 | 5 | P2 | SLY-490 |
| 71.15 | Service Discovery | 4 | 3 | P2 | SLY-491 |
| 71.16 | Analytics | 4 | 4 | P2 | SLY-492 |
| 71.17 | AP2 × A2A × MPP Bridge | 5 | 8 | P1 | SLY-TBD |
| **Total** | | | **81** | | |

---

## Implementation Sequence

```
Week 1: Phase 1 (Foundation)                          30 pts
         71.1 + 71.3 (parallel) → 71.2 → 71.4 + 71.5 + 71.6

Week 2: Phase 2 (Sessions)                            18 pts
         71.7 → 71.8 + 71.9 (parallel) → 71.10

Week 3: Phase 3 (Server) + Phase 4 (Dashboard)        25 pts
         71.11 → 71.12 + 71.13 (parallel)
         71.14 + 71.15 + 71.16 (parallel)

Week 4: Phase 5 (Protocol Composition)                 8 pts
         71.17 (requires 71.2 + 71.4 + 71.11 + Epic 57 + Epic 18)
```

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Stripe MPP access delayed | Medium | Low | Tempo method is permissionless. Stripe is additive. |
| mppx SDK breaking changes (day-one software) | Medium | Medium | Pin version. Follow Tempo Labs changelog. Report issues via GitHub. |
| Tempo mainnet instability (just launched) | Low | High | Testnet fallback. pathUSD on mainnet for test-equivalent safety. |
| Session channel disputes | Low | Medium | Start with trusted services from directory only. Add dispute handling in Phase 5. |
| MPP spec changes (IETF draft) | Medium | Low | Core flow (402/credential/receipt) is stable. Extension points may evolve. |
| Overlap with x402 creates confusion | Low | Medium | Clear documentation: x402 = Coinbase ecosystem, MPP = Stripe+Tempo ecosystem. Both supported. |

---

## Relationship to Hackathon

This epic is the production-grade MPP integration. The hackathon (March 19) will use a subset of Stories 71.1, 71.2, 71.4, and 71.5 in a time-boxed, demo-focused implementation. The hackathon implementation informs but does not replace this epic. Production stories include proper error handling, persistence, testing, and dashboard integration that the hackathon will skip.
