# PayOS Customer Profile Analysis: Features & Data Shapes

**Last Updated:** January 2026  
**Purpose:** Comprehensive review of features required and expected data shapes per customer category  
**PRD Version:** 1.16+ (Epic 17 Complete, Epic 31 Complete, Epic 36 Complete)

---

## Executive Summary

| Category | Profiles | Key Features | Data Complexity | Protocol Coverage |
|----------|----------|--------------|-----------------|-------------------|
| 1. Procurement AI | 4 | Settlements, Escrow, Batch, Adjustments | High (ERP integration) | Direct, AP2 |
| 2. LATAM Fintechs | 4 | Quotes, Wallets, Multi-protocol | High (B2B + B2C) | Direct, x402, AP2 |
| 3. Global Payroll | 3 | Batch, Compliance, Multi-country | Medium (scheduled) | Direct |
| 4. Remittance | 3 | Real-time, Quotes, Cash pickup | Medium (high volume) | Direct |
| 5. Creator Economy | 3 | Batch, Instant, Aggregation | Medium (thresholds) | Direct, x402 |
| 6. Enterprise | 3 | Urgent, Batch, ERP, FX hedging | High (TMS/ERP) | Direct, AP2 |
| 7. Agentic Commerce | 4 | All protocols, Policies, Agent wallets | High (autonomous) | x402, AP2, ACP |
| 8. E-Commerce | 3 | Checkout, Settlement, Refunds | Medium (marketplace) | ACP, Direct |

---

## PayOS Transaction Scope Clarification

### What PayOS Does vs. Doesn't Do

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PayOS Transaction Scope                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ CORE SCOPE (Process + Record)                                           │
│  ├── Settlement (Outbound)                                                   │
│  │   └── Partner Balance → USDC → Pix/SPEI → External Recipient             │
│  ├── Agent Payments                                                          │
│  │   └── Agent Wallet → x402/AP2/ACP → Service/Merchant                     │
│  ├── Protocol Receiving                                                      │
│  │   └── External Agent → x402/AP2/ACP → Partner Balance                    │
│  └── Internal Movements                                                      │
│      ├── Parent → Sub-account                                                │
│      ├── Account → Agent Wallet                                              │
│      ├── Agent → Agent                                                       │
│      └── Partner → Partner (B2B, both in PayOS)                             │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ IN SCOPE (Record Only — Unified Treasury View)                          │
│  └── External Deposit Recording                                              │
│      ├── Partner records deposits from Stripe, EBANX, banks                 │
│      ├── PayOS maintains unified balance & transaction history              │
│      └── Enables: "Single pane of glass" for partner treasury               │
│                                                                              │
│      Example: Partner collects via Stripe, records in PayOS:                │
│      POST /v1/accounts/{id}/deposits                                        │
│      { source: "stripe", amount: "30000.00", external_ref: "pi_abc" }       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ❌ OUT OF SCOPE (Collection Processing)                                    │
│  ├── Card acquiring (Stripe, Adyen do this)                                 │
│  ├── Pix/SPEI collection processing (EBANX, dLocal do this)                 │
│  ├── Consumer KYC/fraud detection (Partner's PSP does this)                 │
│  ├── Merchant acquiring licenses                                             │
│  └── Chargeback handling                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Key Distinction

| Aspect | Collection Processing (OUT) | Deposit Recording (IN) |
|--------|----------------------------|------------------------|
| **Who processes payment** | PayOS would need to | Stripe, EBANX, bank |
| **PayOS role** | Would be a PSP | Ledger of record |
| **Fraud/chargeback risk** | PayOS bears it | Partner/PSP bears it |
| **Licensing required** | Merchant acquiring | None additional |
| **What PayOS stores** | N/A | Balance, transaction history |

### Transaction Pattern Reference

| Pattern | Payer | Payee | Processor | PayOS Role |
|---------|-------|-------|-----------|------------|
| Settlement | Partner | External (Brazil/Mexico) | PayOS | ✅ Process |
| Agent x402 payment | Agent | x402 endpoint | PayOS | ✅ Process |
| Agent AP2 execution | Agent | Mandate holder | PayOS | ✅ Process |
| Protocol receiving | External agent | Partner | PayOS | ✅ Process |
| Internal transfer | PayOS account | PayOS account | PayOS | ✅ Process |
| External deposit | Consumer | Partner (via Stripe) | Stripe | ✅ Record only |
| Card checkout | Consumer | Merchant | Stripe/EBANX | ❌ Out of scope |
| Pix QR collection | Consumer | Merchant | EBANX/dLocal | ❌ Out of scope |

---

## Recently Completed Epics (Gap Resolution)

### Epic 17: Multi-Protocol Gateway ✅ COMPLETE (53 points)
**Impact on Gaps:**
- ✅ **x402 Protocol** — Full implementation with endpoints, verification, SDK
- ✅ **AP2 Mandates** — Complete mandate system with CRUD APIs, execution tracking
- ✅ **ACP Checkout** — Full checkout system with cart management, multi-item support
- ✅ **Protocol Analytics** — Cross-protocol dashboards with unified metrics

### Epic 31: Context API ✅ COMPLETE (21 points)
**Impact on Gaps:**
- ✅ **Account Context** — `GET /v1/context/account/{id}` with comprehensive data
- ✅ **Transfer Context** — `GET /v1/context/transfer/{id}` with timeline, refund eligibility
- ✅ **Agent Context** — `GET /v1/context/agent/{id}` with wallet, limits, policies
- ✅ **Batch Context** — `GET /v1/context/batch/{id}` with failure analysis
- ✅ **Account 360 UI** — Full context viewer in dashboard

### Epic 36: SDK & Developer Experience ✅ COMPLETE (66 points)
**Impact on Gaps:**
- ✅ **Tool Discovery API** — `GET /v1/capabilities` with full machine-readable specs
- ✅ **Function-Calling Format** — `/v1/capabilities/function-calling` for OpenAI/Anthropic
- ✅ **MCP Server** — `@payos/mcp-server` for Claude integration
- ✅ **LangChain Tools** — `payos-langchain` package for Python agents
- ✅ **Unified SDK** — `@payos/sdk` with x402, AP2, ACP support
- ✅ **Sandbox Facilitator** — Mock x402 facilitator for local development

---

## Gap Status Update

### ✅ RESOLVED Gaps (via Epic 17, 31, 36)

| Gap | Original Category | Resolved By | Status |
|-----|------------------|-------------|--------|
| x402 Protocol Detail | 7 | Epic 17 | ✅ Complete |
| AP2 Mandates | 1, 6, 7 | Epic 17 | ✅ Complete |
| ACP Checkout | 7, 8 | Epic 17 | ✅ Complete |
| Tool Discovery API | 7 | Epic 36 | ✅ Complete |
| Agent Context | 7 | Epic 31 | ✅ Complete |
| Account/Transfer Context | All | Epic 31 | ✅ Complete |
| MCP Server for Agents | 7 | Epic 36 | ✅ Complete |
| Batch Context | 1, 3, 5, 6 | Epic 31 | ✅ Complete |

### ⚠️ REMAINING Gaps (Prioritized)

| Gap | Affected Categories | Priority | Suggested Resolution |
|-----|--------------------|---------|--------------------|
| **Agent Wallets & Spending Policies** | 2, 7 | **P1 — HIGH** | Epic 18 already planned |
| **Adjustments API** — credits/debits | 1 | **P2 — MEDIUM** | Add to Epic 27 or Epic 35 |
| **Threshold Aggregation** — micro payouts | 5, 7 | **P2 — MEDIUM** | Add to Epic 27 Settlement |
| **External Deposit Recording** | 2, 4, 8 | **P2 — MEDIUM** | Unified treasury view |
| **FX Hedging/Locking** — forward rates | 6 | **P2 — MEDIUM** | Evaluate FX forward product |
| **Cash Pickup Network** — OXXO, Elektra | 4 | **P3 — LOW** | Partnership decision |
| **Split Payments** — multi-recipient | 8 | **P3 — LOW** | Add to existing escrow |
| **Collection Processing** — Pix/card intake | 4, 8 | **P4 — LOWEST** | Out of scope unless partner demands |
| **Subscription Billing** — recurring | 8 | **P4 — LOWEST** | Evaluate after deposit recording |
| **Virtual Card Funding** | 3 | **P4 — LOWEST** | Partnership exploration |
| **White-label UI Components** | 2 | **P4 — LOWEST** | Customer-driven |

---

## Scope Boundaries by Gap Type

### ✅ Clearly IN SCOPE

| Gap | Why In Scope | Resolution Path |
|-----|--------------|-----------------|
| Agent Wallets & Policies | Core agentic infrastructure | Epic 18 |
| Adjustments API | Extends settlement capability | Epic 27/35 |
| Threshold Aggregation | Settlement optimization | Epic 27 |
| External Deposit Recording | Unified ledger (record, don't process) | New stories |
| FX Hedging | Settlement enhancement | Evaluate scope |
| Split Payments | Escrow extension | Epic enhancement |

### ⚠️ GRAY AREA (Evaluate on Demand)

| Gap | Consideration | Decision Criteria |
|-----|---------------|-------------------|
| Cash Pickup Network | Partnership vs. build | Partner demand + economics |
| White-label UI | Product expansion | Customer willingness to pay |

### ❌ OUT OF SCOPE (Unless Strategic Shift)

| Gap | Why Out of Scope | Alternative |
|-----|------------------|-------------|
| Collection Processing | PSP business, requires acquiring license | Partners use Stripe/EBANX, record deposits in PayOS |
| Subscription Billing | Requires collection processing | Partners use Stripe Billing, record in PayOS |
| Virtual Card Funding | Card issuing is separate business | Partnership with Marqeta/Lithic |

---

# Category-by-Category Analysis (Updated)

---

## Category 1: Procurement & Supply Chain AI

### Features Required (Updated Status)

| Feature | 1.1 Negotiation | 1.2 Sourcing | 1.3 Compliance | 1.4 Analytics | Status |
|---------|-----------------|--------------|----------------|---------------|--------|
| Settlement API | ✅ Critical | ✅ Critical | ✅ Critical | ❌ Read-only | ✅ Available |
| Batch Processing | ⚠️ Nice-to-have | ✅ Critical | ⚠️ Nice-to-have | ❌ | ✅ Available |
| Escrow/Milestones | ✅ Critical | ⚠️ Nice-to-have | ❌ | ❌ | ⚠️ Partial |
| Adjustments API | ❌ | ❌ | ✅ Critical | ❌ | ❌ **GAP (P2)** |
| Simulation Engine | ✅ Important | ✅ Critical | ✅ Important | ❌ | 📋 Epic 28 |
| Analytics API | ⚠️ Nice-to-have | ✅ Important | ⚠️ Nice-to-have | ✅ Critical | ✅ Available |
| Context API | ✅ Important | ✅ Important | ✅ Important | ✅ Critical | ✅ Epic 31 |
| AP2 Mandates | ⚠️ Future | ⚠️ Future | ❌ | ❌ | ✅ Epic 17 |
| Webhooks | ✅ Critical | ✅ Critical | ✅ Important | ✅ Critical | ✅ Available |

### Remaining Gaps for Category 1
1. **Adjustments API (P2)** — Need credit/debit endpoint for 1.3 Compliance AI
2. **Simulation Engine** — Planned in Epic 28, not yet complete

---

## Category 2: LATAM Fintechs

### Features Required (Updated Status)

| Feature | 2.1 Neobank | 2.2 Wallet | 2.3 Exchange | 2.4 Lending | Status |
|---------|-------------|------------|--------------|-------------|--------|
| Settlement API | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Quote API | ✅ Critical | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ✅ Available |
| Real-time Tracking | ✅ Critical | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ✅ Available |
| Multi-currency Wallets | ⚠️ Nice-to-have | ✅ Critical | ✅ Important | ❌ | ⚠️ Partial |
| x402 Protocol | ⚠️ Future | ⚠️ Future | ✅ Critical | ❌ | ✅ Epic 17 |
| AP2 Mandates | ❌ | ❌ | ✅ Critical | ⚠️ Nice-to-have | ✅ Epic 17 |
| Agent Wallets | ❌ | ❌ | ✅ Important | ❌ | 📋 Epic 18 |
| Batch Disbursement | ❌ | ❌ | ⚠️ Nice-to-have | ✅ Critical | ✅ Available |
| Deposit Recording | ✅ Important | ✅ Important | ⚠️ Nice-to-have | ✅ Critical | ❌ **GAP (P2)** |
| White-label UI | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ❌ | ❌ **GAP (P4)** |
| Context API | ✅ Important | ✅ Important | ✅ Important | ✅ Important | ✅ Epic 31 |

### Remaining Gaps for Category 2
1. **Deposit Recording (P2)** — Partners need unified view of external collections
2. **Agent Wallets (P1)** — Planned in Epic 18
3. **White-label UI (P4)** — Customer-driven, low priority

---

## Category 3: Global Payroll & HR

### Features Required (Updated Status)

| Feature | 3.1 EOR | 3.2 Contractor | 3.3 Benefits | Status |
|---------|---------|----------------|--------------|--------|
| Settlement API | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Batch Processing | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Multi-country Support | ✅ Critical | ✅ Critical | ✅ Important | ✅ Available |
| Employee Onboarding | ✅ Critical | ✅ Critical | ⚠️ Nice-to-have | 📋 Epic 35 |
| Instant Payout | ⚠️ Nice-to-have | ✅ Critical | ✅ Critical | ✅ Available |
| Stablecoin Option | ❌ | ✅ Important | ❌ | ✅ Available |
| Compliance Reporting | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ⚠️ Partial |
| Context API | ✅ Important | ✅ Important | ✅ Important | ✅ Epic 31 |

### Remaining Gaps for Category 3
1. **Entity Onboarding API** — Planned in Epic 35
2. **Compliance Reporting** — Country-specific reports not fully scoped

---

## Category 4: Remittance & Money Transfer

### Features Required (Updated Status)

| Feature | 4.1 Consumer App | 4.2 Corridor Specialist | 4.3 Digital-First | Status |
|---------|------------------|------------------------|-------------------|--------|
| Settlement API | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Quote API | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Real-time Tracking | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Deposit Recording | ✅ Important | ✅ Important | ✅ Important | ❌ **GAP (P2)** |
| Cash Pickup | ✅ Important | ✅ Critical | ⚠️ Nice-to-have | ❌ **GAP (P3)** |
| Wholesale/B2B Pricing | ❌ | ✅ Critical | ❌ | ⚠️ Partial |
| Stablecoin Option | ❌ | ❌ | ✅ Important | ✅ Available |
| Compliance Flow | ⚠️ Nice-to-have | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Partial |
| Context API | ✅ Important | ✅ Important | ✅ Important | ✅ Epic 31 |

### Remaining Gaps for Category 4
1. **Deposit Recording (P2)** — Track funds collected via partner's methods
2. **Cash Pickup Network (P3)** — OXXO, Elektra partnerships (low priority)
3. **High-value Compliance Flow** — EDD requirements not fully documented

**Note:** Collection processing (card intake) is OUT OF SCOPE — partners use existing PSPs.

---

## Category 5: Creator & Gig Economy

### Features Required (Updated Status)

| Feature | 5.1 Streaming | 5.2 Freelance | 5.3 Gig | Status |
|---------|---------------|---------------|---------|--------|
| Settlement API | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Batch Processing | ✅ Critical | ⚠️ Nice-to-have | ✅ Critical | ✅ Available |
| Instant Payout | ⚠️ Nice-to-have | ✅ Critical | ✅ Critical | ✅ Available |
| Threshold Aggregation | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ❌ **GAP (P2)** |
| Escrow/Milestones | ❌ | ✅ Critical | ❌ | ⚠️ Partial |
| Stablecoin Option | ✅ Important | ✅ Important | ❌ | ✅ Available |
| Tip Processing | ❌ | ❌ | ✅ Important | ⚠️ Via batch |
| Context API | ✅ Important | ✅ Important | ✅ Important | ✅ Epic 31 |

### Remaining Gaps for Category 5
1. **Threshold Aggregation (P2)** — Rules for combining micro-earnings before payout
2. **Tip Processing** — Can be handled via batch settlement (low priority)

---

## Category 6: Enterprise & Logistics

### Features Required (Updated Status)

| Feature | 6.1 Freight | 6.2 Manufacturing | 6.3 Retail | Status |
|---------|-------------|-------------------|------------|--------|
| Settlement API | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Batch Processing | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Urgent/Priority | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ✅ Available |
| Escrow/Milestones | ⚠️ Nice-to-have | ✅ Critical | ❌ | ⚠️ Partial |
| FX Hedging | ⚠️ Nice-to-have | ✅ Important | ⚠️ Nice-to-have | ❌ **GAP (P2)** |
| ERP Integration | ✅ Critical | ✅ Critical | ✅ Important | ⚠️ Partial |
| AP2 Mandates | ⚠️ Future | ⚠️ Future | ✅ Important | ✅ Epic 17 |
| Context API | ✅ Critical | ✅ Critical | ✅ Important | ✅ Epic 31 |

### Remaining Gaps for Category 6
1. **FX Hedging/Locking (P2)** — Forward rate locking not available
2. **ERP Integration** — SAP/Oracle connectors (customer-driven)

---

## Category 7: Agentic Commerce Platforms

### Features Required (Updated Status)

| Feature | 7.1 Shopping | 7.2 Procurement | 7.3 API Market | 7.4 Orchestration | Status |
|---------|--------------|-----------------|----------------|-------------------|--------|
| x402 Protocol | ✅ Critical | ⚠️ Nice-to-have | ✅ Critical | ✅ Critical | ✅ Epic 17 |
| AP2 Mandates | ❌ | ✅ Critical | ❌ | ✅ Important | ✅ Epic 17 |
| ACP Checkout | ✅ Important | ❌ | ❌ | ✅ Important | ✅ Epic 17 |
| Agent Wallets | ✅ Critical | ✅ Critical | ❌ | ✅ Critical | 📋 **Epic 18 (P1)** |
| Spending Policies | ✅ Critical | ✅ Critical | ❌ | ✅ Critical | 📋 **Epic 18 (P1)** |
| Tool Discovery | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ❌ | ✅ Critical | ✅ Epic 36 |
| Micropayment Aggregation | ⚠️ Nice-to-have | ❌ | ✅ Critical | ⚠️ Nice-to-have | ❌ **GAP (P2)** |
| Audit Trail | ⚠️ Nice-to-have | ✅ Critical | ⚠️ Nice-to-have | ✅ Critical | ✅ Epic 31 |
| MCP Server | ✅ Important | ✅ Important | ⚠️ Nice-to-have | ✅ Critical | ✅ Epic 36 |
| Context API | ✅ Important | ✅ Important | ⚠️ Nice-to-have | ✅ Critical | ✅ Epic 31 |

### Remaining Gaps for Category 7
1. **Agent Wallets & Spending Policies (P1)** — Epic 18 planned
2. **Micropayment Aggregation (P2)** — Same as threshold aggregation

---

## Category 8: Cross-Border E-Commerce

### Features Required (Updated Status)

| Feature | 8.1 Marketplace | 8.2 D2C Brand | 8.3 Dropshipping | Status |
|---------|-----------------|---------------|------------------|--------|
| ACP Checkout | ✅ Critical | ⚠️ Nice-to-have | ❌ | ✅ Epic 17 |
| Deposit Recording | ⚠️ Nice-to-have | ✅ Critical | ❌ | ❌ **GAP (P2)** |
| Settlement API | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Available |
| Batch Processing | ✅ Critical | ⚠️ Nice-to-have | ⚠️ Nice-to-have | ✅ Available |
| Escrow | ⚠️ Nice-to-have | ❌ | ✅ Critical | ⚠️ Partial |
| Split Payments | ⚠️ Nice-to-have | ❌ | ✅ Critical | ❌ **GAP (P3)** |
| Refunds | ✅ Critical | ✅ Important | ⚠️ Nice-to-have | ✅ Available |
| Subscriptions | ❌ | ✅ Important | ❌ | ❌ **GAP (P4)** |
| Context API | ✅ Important | ✅ Important | ✅ Important | ✅ Epic 31 |

### Remaining Gaps for Category 8
1. **Deposit Recording (P2)** — D2C brands need unified view of Pix/card collections
2. **Split Payments (P3)** — Multi-recipient splits for dropshipping
3. **Subscriptions (P4)** — Out of scope (partner uses Stripe Billing, records in PayOS)

**Note:** Pix/SPEI collection processing is OUT OF SCOPE — partners use EBANX/dLocal and record deposits in PayOS.

---

# Cross-Category Feature Matrix (Updated)

## PayOS Features by Category

| Feature | Cat 1 | Cat 2 | Cat 3 | Cat 4 | Cat 5 | Cat 6 | Cat 7 | Cat 8 | Epic Status |
|---------|-------|-------|-------|-------|-------|-------|-------|-------|-------------|
| **Settlement API** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Available |
| **Batch Processing** | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ❌ | ✅ | ✅ Available |
| **Quote API** | ⚠️ | ✅ | ⚠️ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ✅ Available |
| **Real-time Tracking** | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ Available |
| **Context API** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Epic 31 |
| **x402 Protocol** | ❌ | ✅ | ❌ | ❌ | ⚠️ | ❌ | ✅ | ❌ | ✅ Epic 17 |
| **AP2 Mandates** | ⚠️ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ✅ Epic 17 |
| **ACP Checkout** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Epic 17 |
| **Tool Discovery** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ Epic 36 |
| **MCP Server** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ Epic 36 |
| **Agent Wallets** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 📋 Epic 18 |
| **Spending Policies** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 📋 Epic 18 |
| **Deposit Recording** | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ **GAP (P2)** |
| **Refunds** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ Available |
| **Webhooks** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Available |

**Legend:** ✅ Available/Complete | 📋 Planned Epic | ⚠️ Partial/Nice-to-have | ❌ Not needed or GAP

---

# Summary: Remaining Gaps & Priority

## P1 — HIGH Priority

| Gap | Categories | Business Impact | Resolution |
|-----|-----------|-----------------|------------|
| **Agent Wallets & Spending Policies** | 2, 7 | Can't serve agentic commerce fully | **Epic 18 planned** |

## P2 — MEDIUM Priority

| Gap | Categories | Business Impact | Resolution |
|-----|-----------|-----------------|------------|
| **External Deposit Recording** | 2, 4, 8 | Partners can't see unified treasury | Add deposit recording API |
| **Adjustments API** | 1 | Procurement compliance AI can't execute credits | Add to Epic 27 or 35 |
| **Threshold Aggregation** | 5, 7 | Creator payouts require manual batching | Add to Epic 27 |
| **FX Hedging** | 6 | Enterprise manufacturing can't lock rates | Evaluate product scope |

## P3 — LOW Priority

| Gap | Categories | Resolution |
|-----|-----------|------------|
| Cash Pickup Network | 4 | Partnership decision |
| Split Payments | 8 | Escrow enhancement |

## P4 — LOWEST Priority (Out of Scope Unless Demanded)

| Gap | Categories | Notes |
|-----|-----------|-------|
| Collection Processing | 4, 8 | Partners use Stripe/EBANX — record deposits in PayOS |
| Subscription Billing | 8 | Partners use Stripe Billing — record in PayOS |
| Virtual Card Funding | 3 | Partnership exploration |
| White-label UI | 2 | Customer-driven |

---

## Recommended Next Steps

### Immediate (Current Sprint)
1. 📋 **Start Epic 18 (Agent Wallets)** — Unblocks Category 7 agentic commerce

### Near-term (Next 2-4 Sprints)
2. 📋 **Add Deposit Recording API** — `POST /v1/accounts/{id}/deposits` + unified balance view
3. 📋 **Add Adjustments API** to Epic 27 or Epic 35
4. 📋 **Add Threshold Aggregation** to Epic 27

### Medium-term (Evaluate)
5. FX Hedging product scope decision
6. Cash pickup partnership exploration

### Backlog (Only if Partner Demands)
7. Collection processing (would require strategic shift)
8. Subscription billing (depends on collection processing)

---

## Data Shape Completeness (Updated)

| Category | Entity Shapes | Request Shapes | Response Shapes | Webhook Shapes | Grade |
|----------|---------------|----------------|-----------------|----------------|-------|
| 1. Procurement AI | ✅ | ✅ | ✅ | ✅ | A |
| 2. LATAM Fintechs | ✅ | ✅ | ✅ | ✅ | A |
| 3. Global Payroll | ✅ | ✅ | ✅ | ✅ | A- |
| 4. Remittance | ✅ | ✅ | ✅ | ✅ | A- |
| 5. Creator Economy | ✅ | ✅ | ✅ | ⚠️ | B+ |
| 6. Enterprise | ✅ | ✅ | ✅ | ⚠️ | B+ |
| 7. Agentic Commerce | ✅ | ✅ | ✅ | ✅ | A |
| 8. E-Commerce | ✅ | ✅ | ✅ | ⚠️ | B+ |

**Improvement:** Context API (Epic 31) significantly improved response shapes across all categories.

---

*Last Updated: January 3, 2026*
*Based on PRD v1.16+ with Epic 17, 31, 36 complete*
