# PayOS Positioning: B2C Merchants vs B2B Enterprise

**Version:** 1.0  
**Date:** January 18, 2026  
**Purpose:** Differentiated positioning for two core customer segments

---

## Executive Summary

PayOS serves two fundamentally different customer types with **inverse payment flows**:

| Aspect | B2C Merchant | B2B Enterprise |
|--------|--------------|----------------|
| **Goal** | Reach consumers via AI surfaces | Enable agents to make purchases |
| **Payment Direction** | RECEIVE payments | MAKE payments |
| **Protocol Role** | Accept from all protocols | Initiate via protocols |
| **Key Concern** | Discovery & conversion | Governance & liability |
| **Primary Value** | Multi-protocol acceptance | Policy enforcement |

---

## Part 1: B2C Merchant Segment

### "I want to sell to customers across ALL AI platforms"

#### The Customer Profile

**Who They Are:**
- E-commerce merchants (Shopify, WooCommerce, custom)
- D2C brands wanting AI surface exposure
- Marketplaces with seller networks
- Retailers expanding beyond web/mobile

**Their Problem:**
```
Today's Reality:
├── ChatGPT users search and buy (ACP)
├── Gemini users search and buy (UCP)
├── Copilot users search and buy (ACP)
├── Claude users can complete tasks (MCP)
├── Perplexity users research and buy (PayPal)
└── Each requires different integration

Without unified solution:
├── Miss 800M ChatGPT users (no ACP)
├── Miss Gemini growth (no UCP)
├── Miss Copilot enterprise (no ACP)
├── Build & maintain 4+ integrations
└── Fragmented analytics
```

#### What They Need

| Need | Description |
|------|-------------|
| **Multi-Protocol Acceptance** | Accept purchases from any AI surface |
| **Unified Checkout** | Single integration for all protocols |
| **Discovery Optimization** | Be found across AI search surfaces |
| **Conversion Analytics** | Understand which AI surfaces convert |
| **Settlement Flexibility** | Get paid in preferred currency/rail |

#### Protocol Requirements

```
B2C Protocol Stack (Inbound):
┌─────────────────────────────────────────────────────────────┐
│                    MERCHANT STOREFRONT                      │
│                                                             │
│  "I want to accept purchases from ANY AI agent"            │
│                                                             │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      PayOS LAYER                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PROTOCOL ACCEPTANCE                     │   │
│  │                                                      │   │
│  │   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────────┐  │   │
│  │   │ ACP │  │ UCP │  │ MCP │  │x402 │  │Perplexity│  │   │
│  │   │     │  │     │  │     │  │     │  │         │  │   │
│  │   │ChatGPT│ │Gemini│ │Claude│ │APIs │  │  PayPal │  │   │
│  │   │Copilot│ │AI Mode│       │     │  │         │  │   │
│  │   └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └────┬────┘  │   │
│  │      │        │        │        │          │       │   │
│  │      └────────┴────────┴────────┴──────────┘       │   │
│  │                        │                           │   │
│  └────────────────────────┼───────────────────────────┘   │
│                           │                               │
│  ┌────────────────────────┼───────────────────────────┐   │
│  │              SETTLEMENT                             │   │
│  │                        ▼                            │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐           │   │
│  │   │   USD   │  │   BRL   │  │   MXN   │           │   │
│  │   │  Wire   │  │   Pix   │  │  SPEI   │           │   │
│  │   └─────────┘  └─────────┘  └─────────┘           │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### PayOS Value Proposition

**Headline:** "One integration. Every AI shopper."

**Supporting Messages:**
1. Accept purchases from ChatGPT, Gemini, Copilot, Claude, and Perplexity
2. Single SDK replaces 5 different protocol integrations
3. Unified analytics across all AI surfaces
4. Settle to any currency or local rail

**Key Differentiators:**

| Competitor | What They Offer | PayOS Advantage |
|------------|----------------|-----------------|
| Stripe | ACP only | + UCP, MCP, x402, Perplexity |
| Shopify | Auto-enrolled in ACP/UCP | + Governance, analytics, LATAM |
| Adyen | Payment processing | + Protocol orchestration |
| dLocal | LATAM payments | + Multi-protocol, AI-native |

#### SDK Example (B2C)

```typescript
// B2C Merchant: Accept from all AI surfaces
import { PayOS } from '@payos/sdk';

const payos = new PayOS({ 
  apiKey: 'pk_...',
  mode: 'merchant' // Receiving payments
});

// Single endpoint accepts all protocols
app.post('/checkout', async (req, res) => {
  // PayOS auto-detects protocol (ACP, UCP, MCP, x402)
  const payment = await payos.acceptPayment(req);
  
  // payment.protocol = 'acp' | 'ucp' | 'mcp' | 'x402'
  // payment.source = 'chatgpt' | 'gemini' | 'copilot' | 'claude'
  // payment.amount = 89.99
  // payment.currency = 'USD'
  
  // Settlement configured separately
  // Could be Pix, SPEI, wire, etc.
  
  return res.json({ orderId: payment.orderId });
});

// Unified webhooks for all protocols
payos.on('payment.completed', (event) => {
  console.log(`Payment from ${event.source}: $${event.amount}`);
  // Same event structure regardless of protocol
});

// Analytics across surfaces
const analytics = await payos.analytics.get({
  period: 'last_30_days',
  groupBy: 'source' // chatgpt, gemini, copilot, etc.
});
// { chatgpt: { orders: 1240, revenue: 89000 }, gemini: { ... } }
```

#### Pricing Model (B2C)

| Revenue Stream | Rate | Description |
|----------------|------|-------------|
| **Protocol Fee** | 0.3-0.5% | Per-transaction for protocol handling |
| **Settlement Fee** | 0.5-1.0% | For LATAM/cross-border settlement |
| **FX Spread** | 0.5-1.0% | Currency conversion |
| **Analytics** | $99-499/mo | Unified dashboard |

**Example Unit Economics:**
```
$100 order from ChatGPT user to Brazilian merchant:
├── Protocol fee (ACP): $0.40
├── Settlement fee (Pix): $0.80
├── FX spread (USD→BRL): $0.70
└── Total PayOS revenue: $1.90 (1.9%)
```

#### Sales Messaging (B2C)

**Discovery Call Questions:**
1. "Which AI surfaces are your customers using today?"
2. "How are you currently accepting purchases from ChatGPT/Gemini users?"
3. "What percentage of your customers are in LATAM?"
4. "How do you track conversion across different AI platforms?"

**Objection Handling:**

| Objection | Response |
|-----------|----------|
| "We're already on Shopify, they handle this" | "Shopify auto-enrolls you in ACP/UCP, but you don't get unified analytics, governance controls, or LATAM-optimized settlement. We add the control layer." |
| "Why not just use Stripe?" | "Stripe is great for ACP (ChatGPT/Copilot), but doesn't support UCP (Gemini), MCP (Claude), or LATAM settlement. We give you everything in one SDK." |
| "We don't have LATAM customers" | "Yet. AI surfaces are global. When a Brazilian user asks ChatGPT to buy your product, you need Pix settlement to avoid 5% wire fees." |

---

## Part 2: B2B Enterprise Segment

### "I want my agents to make business purchases safely"

#### The Customer Profile

**Who They Are:**
- Enterprises deploying procurement agents
- Companies with AI-powered operations
- Fintechs building agent-based products
- Any business with autonomous spending

**Their Problem:**
```
Today's Reality:
├── AI agents CAN make purchases (technically)
├── But enterprises need:
│   ├── Spending limits
│   ├── Approval workflows
│   ├── Budget allocation
│   ├── Audit trails
│   ├── Liability clarity
│   └── Compliance verification
│
Current solutions:
├── AP2 Mandates: Authorization only
├── Corporate cards: No agent-specific controls
├── Manual approval: Defeats automation purpose
└── Nothing: Massive risk exposure
```

#### What They Need

| Need | Description |
|------|-------------|
| **Agent Governance** | Policies, limits, approvals for each agent |
| **KYA (Know Your Agent)** | Verify agent identity and authorization |
| **Spending Controls** | Per-agent, per-category, per-vendor limits |
| **Approval Workflows** | Manager approval for large purchases |
| **Audit Trails** | Complete record of agent decisions |
| **Liability Clarity** | Know who's responsible when things go wrong |
| **Compliance** | Sanctions, vendor verification, tax |

#### Protocol Requirements

```
B2B Protocol Stack (Outbound):
┌─────────────────────────────────────────────────────────────┐
│                    ENTERPRISE                               │
│                                                             │
│  "I want my agents to make purchases with controls"         │
│                                                             │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      PayOS LAYER                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              GOVERNANCE ENGINE                       │   │
│  │                                                      │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │ Agent Policies                               │   │   │
│  │   │ ├── procurement_agent_1: $500/day, supplies  │   │   │
│  │   │ ├── software_agent: $5000/mo, SaaS only     │   │   │
│  │   │ └── travel_agent: $2000/trip, requires mgr  │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                      │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │ Approval Workflows                           │   │   │
│  │   │ ├── > $500: Manager approval                 │   │   │
│  │   │ ├── > $5000: Finance approval                │   │   │
│  │   │ └── New vendor: Compliance review            │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                      │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │ Compliance Layer                             │   │   │
│  │   │ ├── Vendor sanctions screening               │   │   │
│  │   │ ├── Tax calculation & withholding            │   │   │
│  │   │ └── Audit trail generation                   │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PROTOCOL EXECUTION                      │   │
│  │                                                      │   │
│  │   ┌─────┐  ┌─────┐  ┌─────┐                        │   │
│  │   │ UCP │  │ AP2 │  │x402 │                        │   │
│  │   │     │  │     │  │     │                        │   │
│  │   │Commerce││Mandates│ │APIs │                     │   │
│  │   └──┬──┘  └──┬──┘  └──┬──┘                        │   │
│  │      │        │        │                           │   │
│  │      └────────┴────────┘                           │   │
│  │               │                                    │   │
│  └───────────────┼────────────────────────────────────┘   │
│                  │                                        │
│  ┌───────────────┼────────────────────────────────────┐   │
│  │              FUNDING                                │   │
│  │               ▼                                     │   │
│  │   ┌─────────────┐  ┌─────────────┐                 │   │
│  │   │ Corporate   │  │   USDC      │                 │   │
│  │   │ Treasury    │  │  Treasury   │                 │   │
│  │   └─────────────┘  └─────────────┘                 │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### PayOS Value Proposition

**Headline:** "Enterprise governance for AI agents that spend."

**Supporting Messages:**
1. Define spending policies per agent, category, and vendor
2. Approval workflows that don't slow down automation
3. Complete audit trails for compliance and liability
4. AP2 mandate integration for cryptographic authorization

**Key Differentiators:**

| Competitor | What They Offer | PayOS Advantage |
|------------|----------------|-----------------|
| AP2 Mandates | Authorization proof | + Governance policies, workflows |
| Brex/Ramp | Corporate cards | + Agent-specific controls, KYA |
| Coupa | Procurement software | + AI-native, real-time |
| Skyfire | Agent wallets | + Enterprise governance, compliance |

#### The AP2 Mandate Gap

AP2 provides cryptographic authorization, but enterprises need MORE:

| AP2 Provides | PayOS Adds |
|--------------|------------|
| Intent Mandate (pre-auth) | Policy enforcement |
| Cart Mandate (approval) | Multi-level workflows |
| Payment Mandate (proof) | Budget allocation |
| Liability framework | Real-time monitoring |
| | Vendor compliance |
| | Cross-agent coordination |
| | Treasury management |

```
AP2 Alone:
├── "Agent CAN spend up to $500" (Intent Mandate)
└── No enforcement until after the fact

AP2 + PayOS:
├── "Agent CAN spend up to $500" (Intent Mandate)
├── PayOS enforces: Is $500 available in budget?
├── PayOS checks: Is vendor approved?
├── PayOS routes: Does this need manager approval?
├── PayOS monitors: Is agent approaching limit?
└── PayOS reports: Full audit trail
```

#### SDK Example (B2B)

```typescript
// B2B Enterprise: Control agent spending
import { PayOS } from '@payos/sdk';

const payos = new PayOS({ 
  apiKey: 'pk_...',
  mode: 'enterprise' // Making payments
});

// Register agents with policies
const procurementAgent = await payos.agents.register({
  id: 'procurement_agent_1',
  name: 'Office Supplies Buyer',
  owner: 'operations@company.com',
  policy: {
    limits: {
      perTransaction: 500,
      daily: 2000,
      monthly: 15000
    },
    allowedCategories: ['office_supplies', 'equipment'],
    allowedVendors: ['staples', 'amazon_business', 'uline'],
    requiresApproval: {
      above: 500,
      approvers: ['manager@company.com']
    },
    blockedVendors: ['competitors_list'],
    compliance: {
      sanctionsScreening: true,
      taxWithholding: true
    }
  }
});

// Agent makes a purchase request
const purchaseRequest = await payos.purchase.request({
  agentId: 'procurement_agent_1',
  vendor: {
    name: 'Staples',
    protocol: 'ucp', // or 'acp', 'x402'
    merchantId: 'staples_ucp_123'
  },
  items: [
    { sku: 'printer_paper', quantity: 50, unitPrice: 8.99 },
    { sku: 'ink_cartridge', quantity: 10, unitPrice: 29.99 }
  ],
  justification: 'Monthly office supply replenishment',
  urgency: 'standard'
});

// PayOS returns decision
if (purchaseRequest.status === 'approved') {
  // Auto-approved within policy
  const order = await payos.purchase.execute(purchaseRequest.id);
} else if (purchaseRequest.status === 'pending_approval') {
  // Needs manager approval
  // Manager gets Slack/email notification
  // Can approve via PayOS dashboard or API
} else if (purchaseRequest.status === 'rejected') {
  // Policy violation
  console.log(purchaseRequest.reason);
  // "Exceeds daily limit" or "Vendor not approved"
}

// Audit trail
const auditLog = await payos.audit.get({
  agentId: 'procurement_agent_1',
  period: 'last_30_days'
});
// Full history of requests, approvals, rejections, purchases

// Budget monitoring
const budget = await payos.budget.status({
  agentId: 'procurement_agent_1'
});
// { daily: { used: 450, limit: 2000 }, monthly: { used: 8500, limit: 15000 } }

// Real-time alerts
payos.on('budget.threshold', (event) => {
  if (event.percentage > 80) {
    notifyFinance(`${event.agentId} is at ${event.percentage}% of ${event.period} budget`);
  }
});
```

#### Governance Features Deep Dive

**1. Agent Policy Engine**

```typescript
// Define complex policies
const policy = {
  // Spending limits
  limits: {
    perTransaction: 1000,
    daily: 5000,
    weekly: 15000,
    monthly: 50000,
    quarterly: 150000
  },
  
  // Category restrictions
  categories: {
    allowed: ['software', 'cloud_services', 'office_supplies'],
    blocked: ['travel', 'entertainment'],
    requiresApproval: ['hardware', 'consulting']
  },
  
  // Vendor controls
  vendors: {
    approved: ['aws', 'gcp', 'azure', 'slack', 'notion'],
    blocked: ['competitor_1', 'competitor_2'],
    requiresCompliance: ['new_vendors']
  },
  
  // Approval matrix
  approvals: {
    rules: [
      { condition: 'amount > 500', approvers: ['manager'] },
      { condition: 'amount > 5000', approvers: ['manager', 'finance'] },
      { condition: 'category == hardware', approvers: ['it_director'] },
      { condition: 'vendor.isNew', approvers: ['compliance'] }
    ],
    timeout: '24h',
    escalation: 'finance_director'
  },
  
  // Time restrictions
  schedule: {
    allowedHours: { start: '06:00', end: '22:00', timezone: 'America/New_York' },
    blockedDays: ['saturday', 'sunday'],
    exceptions: ['urgent_flagged']
  }
};
```

**2. KYA (Know Your Agent) Verification**

```typescript
// Verify agent identity and authorization
const kyaResult = await payos.kya.verify({
  agent: {
    id: 'external_agent_123',
    provider: 'openai', // or 'anthropic', 'google', etc.
    signingKey: 'pk_agent_...'
  },
  requiredClaims: [
    'organization_id',
    'authorized_scopes',
    'human_owner'
  ]
});

// kyaResult:
// {
//   verified: true,
//   organization: 'Acme Corp',
//   owner: 'john@acme.com',
//   scopes: ['procurement:read', 'procurement:write'],
//   riskScore: 'low',
//   mandateValid: true
// }
```

**3. Simulation Mode**

```typescript
// Preview what would happen without executing
const simulation = await payos.purchase.simulate({
  agentId: 'procurement_agent_1',
  vendor: 'new_vendor_xyz',
  amount: 2500,
  category: 'consulting'
});

// simulation:
// {
//   wouldSucceed: false,
//   blockers: [
//     { type: 'vendor_not_approved', resolution: 'Add to approved list or request compliance review' },
//     { type: 'category_requires_approval', approvers: ['manager', 'finance'] },
//     { type: 'exceeds_daily_remaining', current: 4200, limit: 5000, requested: 2500 }
//   ],
//   estimatedApprovalTime: '4-8 hours',
//   alternativeVendors: ['approved_consulting_firm_1', 'approved_consulting_firm_2']
// }
```

#### Pricing Model (B2B)

| Revenue Stream | Rate | Description |
|----------------|------|-------------|
| **Platform Fee** | $5K-50K/mo | Based on agent count and volume |
| **Transaction Fee** | 0.2-0.5% | Per-purchase fee |
| **Compliance Check** | $0.10-0.50 | Per-vendor sanctions/AML check |
| **Governance API** | Usage-based | Policy checks, approvals |
| **Audit Storage** | $500-2K/mo | Compliance-grade retention |

**Example Enterprise Pricing:**
```
Mid-size company:
├── 10 AI agents
├── $500K monthly spend through agents
├── 2,000 transactions/month
├── 500 compliance checks/month

Pricing:
├── Platform fee: $15,000/mo
├── Transaction fees: $1,500/mo (0.3%)
├── Compliance checks: $100/mo
├── Audit storage: $1,000/mo
└── Total: $17,600/mo (3.5% of spend)
```

#### Sales Messaging (B2B)

**Discovery Call Questions:**
1. "How are you currently controlling what your AI agents can purchase?"
2. "What happens if an agent makes an unauthorized purchase today?"
3. "How do you audit agent spending for compliance?"
4. "Who's liable when an agent makes a mistake?"
5. "How do you prevent agents from exceeding budgets?"

**Objection Handling:**

| Objection | Response |
|-----------|----------|
| "AP2 mandates are enough" | "Mandates prove authorization happened, but don't enforce policies. What if an agent stays within mandate but exceeds your actual budget? PayOS enforces your business rules in real-time." |
| "We use corporate cards" | "Corporate cards weren't designed for agents. You can't set per-agent limits, category restrictions, or approval workflows. Plus, you lose audit trails when agents use shared cards." |
| "We're not ready for agent purchasing" | "Your competitors are deploying procurement agents now. The question isn't if, but when. Starting with PayOS governance means you can move fast safely." |
| "We'll build this ourselves" | "You could, but it's 6-12 months of engineering. We have production governance today, with AP2 integration, compliance checks, and audit trails built in." |

---

## Part 3: Side-by-Side Comparison

### Feature Matrix

| Feature | B2C Merchant | B2B Enterprise |
|---------|--------------|----------------|
| **Payment Direction** | Receive | Send |
| **Protocol Role** | Accept (inbound) | Initiate (outbound) |
| **Primary Protocols** | ACP, UCP, MCP | UCP, AP2, x402 |
| **Governance Need** | Low (analytics) | High (policies) |
| **Approval Workflows** | No | Yes |
| **Compliance Focus** | Settlement | Vendor verification |
| **Key Metric** | Conversion rate | Policy compliance |
| **Settlement** | To merchant | From treasury |
| **Liability Concern** | Chargebacks | Agent errors |

### Messaging Matrix

| Element | B2C Merchant | B2B Enterprise |
|---------|--------------|----------------|
| **Headline** | "One integration. Every AI shopper." | "Enterprise governance for AI agents that spend." |
| **Subhead** | "Accept purchases from ChatGPT, Gemini, Copilot, and more" | "Spending policies, approval workflows, and audit trails for autonomous purchasing" |
| **Primary Pain** | Fragmented protocol landscape | Lack of control over agent spending |
| **Primary Value** | Unified acceptance | Policy enforcement |
| **Secondary Value** | LATAM settlement | Liability clarity |
| **Trust Signal** | "Used by X merchants" | "SOC 2 Type II, enterprise security" |

### Pricing Comparison

| Element | B2C Merchant | B2B Enterprise |
|---------|--------------|----------------|
| **Model** | Transaction-based | Platform + usage |
| **Entry Point** | Free tier + 0.5% | $5K/mo platform |
| **Scaling** | Volume discounts | Agent count tiers |
| **Premium Feature** | Analytics dashboard | Compliance suite |

---

## Part 4: Go-to-Market Strategy

### B2C Merchant GTM

**Target Segments:**
1. Shopify Plus merchants (>$1M GMV)
2. D2C brands with LATAM customers
3. Marketplaces wanting AI surface exposure

**Channels:**
- Shopify App Store
- Partner with payment processors (Stripe, Adyen)
- Developer marketing (docs, tutorials)
- NRF and e-commerce conferences

**Sales Motion:**
- Self-serve for SMB (<$1M GMV)
- Inside sales for mid-market
- Account executives for enterprise

### B2B Enterprise GTM

**Target Segments:**
1. F500 with AI/automation initiatives
2. Tech companies with internal agent deployments
3. Fintechs building agent-powered products

**Channels:**
- Direct enterprise sales
- Partner with AI agent platforms (LangChain, CrewAI)
- Integration with procurement systems (Coupa, SAP Ariba)
- Security/compliance conferences (RSA, Gartner)

**Sales Motion:**
- Account executives only
- Security review process
- Proof of concept required
- 3-6 month sales cycle

---

## Part 5: Product Roadmap Implications

### Shared Infrastructure

| Component | B2C | B2B | Priority |
|-----------|-----|-----|----------|
| Protocol SDK | ✅ | ✅ | P0 |
| Settlement Engine | ✅ | ✅ | P0 |
| Webhook System | ✅ | ✅ | P0 |
| Dashboard | ✅ | ✅ | P1 |

### B2C-Specific Features

| Feature | Priority | Points |
|---------|----------|--------|
| Multi-protocol acceptance | P0 | 40 |
| Unified analytics | P1 | 25 |
| Conversion optimization | P2 | 20 |
| Discovery optimization | P2 | 30 |

### B2B-Specific Features

| Feature | Priority | Points |
|---------|----------|--------|
| Policy engine | P0 | 55 |
| Approval workflows | P0 | 35 |
| KYA verification | P1 | 25 |
| Simulation mode | P1 | 20 |
| Audit trail system | P0 | 30 |
| Budget management | P1 | 25 |
| Compliance checks | P1 | 35 |

---

## Appendix: Competitive Landscape by Segment

### B2C Competitors

| Competitor | Strength | Weakness | PayOS Advantage |
|------------|----------|----------|-----------------|
| Stripe | ACP native | No UCP, limited LATAM | Multi-protocol + LATAM |
| Adyen | Enterprise payments | No protocol orchestration | AI-native |
| dLocal | LATAM specialist | No AI protocol support | Protocol + settlement |
| Shopify | Auto-enrollment | No analytics, governance | Control layer |

### B2B Competitors

| Competitor | Strength | Weakness | PayOS Advantage |
|------------|----------|----------|-----------------|
| AP2/Google | Mandate system | No policy enforcement | Governance layer |
| Brex/Ramp | Corporate cards | Not agent-aware | Agent-specific controls |
| Coupa | Procurement | Not AI-native | Real-time, agent-first |
| Skyfire | Agent wallets | Limited governance | Enterprise-grade policies |

---

*This positioning document should be reviewed quarterly as the market evolves.*
