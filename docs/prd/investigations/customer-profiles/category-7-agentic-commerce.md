# Category 7: Agentic Commerce Platforms

**Last Updated:** January 2026  
**Profiles:** 4  
**Monthly Volume Range:** $200K - $20M  
**Primary Protocols:** x402, AP2, ACP

---

## Category Overview

Platforms building AI agents that need to make payments. Protocol-native, autonomous transactions, spending controls.

### Category Characteristics

| Attribute | Typical Range |
|-----------|---------------|
| **Transaction Size** | $0.001 - $50,000 |
| **Monthly Volume** | $100K - $20M |
| **Frequency** | 1,000 - 1,000,000 transactions/month |
| **Payment Pattern** | Autonomous, event-driven |
| **Corridors** | Global, LATAM settlement |
| **Key Need** | Protocol support, spending policies, audit |
| **Protocols** | x402, AP2, ACP |

### Why They Need PayOS
- Agents need payment as a "tool" they can call
- Multiple protocols emerging (x402, AP2, ACP)
- Spending policies must be enforced programmatically
- Audit trails required for enterprise adoption
- LATAM settlement is unsolved by competitors

---

## Profile 7.1: Consumer Shopping Agent

**Profile Name:** `agentic_shopping_consumer`

### Description
AI shopping assistant for consumers. Finds deals, compares prices, purchases autonomously within user limits.

### Business Model
- Freemium subscriptions ($0-20/month)
- Affiliate commissions (5-15%)
- Premium features (higher limits, priority)

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $200K - $2M |
| Avg Transaction | $50 - $200 |
| Transactions/Month | 3,000 - 20,000 |
| Success Rate | 70% (30% fail on payment) |
| Autonomous % | 60% fully autonomous |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US domestic | 60% | USD → USD |
| US → Mexico | 25% | USD → MXN |
| US → Brazil | 15% | USD → BRL |

### Pain Points
1. Non-US merchants need local payment methods
2. No x402 support for crypto merchants
3. User wallet management is complex
4. Currency conversion confusing for users
5. Merchant settlement is not their problem (want it abstracted)

### PayOS Integration
```
API Flow:
1. POST /v1/x402/execute (crypto merchant payment)
2. POST /v1/acp/checkout (traditional merchant)
3. GET /v1/wallets/{id}/limits (spending check before purchase)
4. POST /v1/wallets/{id}/authorize (user approval for high-value)
5. Webhooks for purchase confirmation
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | x402 purchase | $0.50 API service payment | Instant, proof returned |
| 2 | ACP checkout | $150 shoes from MX retailer | Checkout completed, settled |
| 3 | Spending limit | $600 purchase, $500 limit | Rejected with clear message |
| 4 | Multi-currency | MXN merchant, USD wallet | Converted, settled in MXN |

### Seed Data Requirements
- 1 partner account
- 5,000 user wallet accounts
- 500 merchant accounts (mix of x402 and ACP)
- 50,000 historical purchases
- Spending limit configurations
- User preference data

### Sample Entities

**Partner Account:**
```json
{
  "name": "ShopBot AI Inc",
  "type": "agentic_shopping_consumer",
  "tier": "growth",
  "monthly_volume_usd": 850000,
  "primary_corridors": ["US-domestic", "US-MX", "US-BR"],
  "integration_type": "multi_protocol",
  "features": ["x402", "acp", "wallets", "spending_limits"]
}
```

**Sample User Wallet:**
```json
{
  "wallet_id": "wal_usr_00001",
  "user_id": "usr_00001",
  "balance_usdc": 250.00,
  "spending_limits": {
    "per_transaction": 200,
    "daily": 500,
    "monthly": 2000
  },
  "auto_approve_under": 50,
  "requires_approval_above": 100,
  "merchant_blacklist": ["merchant_xyz"],
  "preferred_protocols": ["x402", "acp"]
}
```

---

## Profile 7.2: Enterprise Procurement Agent

**Profile Name:** `agentic_procurement_enterprise`

### Description
Internal AI agent for enterprise procurement. Handles routine purchases autonomously within policies.

### Business Model
- Internal tool (cost center)
- Or: SaaS for enterprises ($50K-500K/year)

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $5M - $20M |
| Avg Transaction | $5,000 - $25,000 |
| Transactions/Month | 300 - 1,000 |
| Auto-Approved % | 60% under threshold |
| Approval Required % | 40% above threshold |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| US → Mexico | 55% | USD → MXN |
| US → Brazil | 25% | USD → BRL |
| US → EU | 15% | USD → EUR |
| Other | 5% | Various |

### Pain Points
1. Payment bottleneck slows autonomous procurement
2. Approval workflows not integrated with payment
3. No agent-native payment protocols
4. Audit trail is fragmented
5. Treasury wants real-time visibility

### PayOS Integration
```
API Flow:
1. POST /v1/ap2/mandates (supplier mandates)
2. POST /v1/agents/{id}/payments (agent-initiated payment)
3. POST /v1/workflows/approval (approval routing)
4. GET /v1/agents/{id}/audit (audit trail)
5. GET /v1/treasury/dashboard (real-time visibility)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Auto-approved | $8K within mandate | Executed, no human |
| 2 | Approval required | $35K over threshold | Routed to manager |
| 3 | Policy violation | Non-approved supplier | Blocked, alert sent |
| 4 | Audit query | Last 30 days activity | Complete audit trail |

### Seed Data Requirements
- 1 enterprise account
- 5 agent accounts (different departments)
- 300 supplier accounts with mandates
- 10,000 historical agent payments
- Approval workflow configurations
- Policy definitions

### Sample Entities

**Partner Account:**
```json
{
  "name": "MegaCorp (Internal Procurement)",
  "type": "agentic_procurement_enterprise",
  "tier": "enterprise",
  "monthly_volume_usd": 12000000,
  "primary_corridors": ["US-MX", "US-BR", "US-EU"],
  "integration_type": "api",
  "features": ["ap2_mandates", "agent_payments", "approval_workflows", "audit"]
}
```

**Sample Agent:**
```json
{
  "agent_id": "agent_procurement_01",
  "name": "ProcureBot-IT",
  "department": "information_technology",
  "spending_policies": {
    "auto_approve_limit": 10000,
    "approval_required_limit": 50000,
    "max_single_transaction": 100000,
    "monthly_budget": 500000
  },
  "approved_suppliers": ["sup_mx_001", "sup_br_001", "sup_de_001"],
  "approved_categories": ["hardware", "software", "services"],
  "status": "active"
}
```

**Sample Mandate:**
```json
{
  "mandate_id": "mnd_00001",
  "agent_id": "agent_procurement_01",
  "supplier_id": "sup_mx_001",
  "type": "ap2_recurring",
  "max_amount_usd": 25000,
  "frequency": "monthly",
  "valid_until": "2026-12-31",
  "auto_execute": true
}
```

---

## Profile 7.3: API Monetization Platform

**Profile Name:** `agentic_api_monetization`

### Description
Marketplace for API monetization via x402 micropayments. Developers monetize APIs, consumers pay per call.

### Business Model
- Marketplace fee (10-20%)
- Enterprise plans
- Premium features

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $500K - $3M |
| Avg Transaction | $0.001 - $0.10 |
| Transactions/Month | 5M - 50M |
| Developer Payouts | $400K - $2.5M |
| Avg Developer Payout | $200 - $800 |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Global (collection) | 100% | USDC |
| Payout US | 40% | USDC → USD |
| Payout LATAM | 35% | USDC → BRL/MXN |
| Payout EU | 15% | USDC → EUR |
| Payout Other | 10% | Various |

### Pain Points
1. LATAM developer payouts expensive (4-5%)
2. Small payouts (<$50) not economical
3. Developers want stablecoin option
4. x402 in, traditional payout out (mismatch)
5. Micro-aggregation needed

### PayOS Integration
```
API Flow:
1. POST /v1/x402/endpoints (API registration)
2. POST /v1/x402/verify (payment verification)
3. GET /v1/x402/earnings/{dev_id} (earnings tracking)
4. POST /v1/settlements/aggregate (threshold payout)
5. POST /v1/settlements/stablecoin (USDC payout)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | API call payment | $0.005 x402 payment | Collected, attributed to developer |
| 2 | Threshold payout | Balance hits $100 | Payout triggered |
| 3 | USDC preference | Developer wants USDC | Direct USDC transfer |
| 4 | LATAM fiat payout | $450 earnings to Brazil | Pix in <1 hour |

### Seed Data Requirements
- 1 partner account
- 5,000 developer accounts
- 1,000 API consumer accounts
- 10M historical x402 transactions
- Earnings and payout records
- Threshold configurations

### Sample Entities

**Partner Account:**
```json
{
  "name": "APIMarket Inc",
  "type": "agentic_api_monetization",
  "tier": "growth",
  "monthly_volume_usd": 1200000,
  "primary_corridors": ["global-USDC"],
  "integration_type": "x402_native",
  "features": ["x402_endpoints", "earnings_tracking", "aggregation", "stablecoin_payouts"]
}
```

**Sample Developer:**
```json
{
  "developer_id": "dev_br_00001",
  "name": "João Developer",
  "country": "BR",
  "apis_published": 3,
  "monthly_calls": 150000,
  "monthly_earnings_usdc": 425.00,
  "payout_threshold_usdc": 100,
  "payout_preference": "fiat",
  "payment_method": "pix",
  "pix_key": "joao.dev@email.com"
}
```

**Sample x402 Endpoint:**
```json
{
  "endpoint_id": "ep_00001",
  "developer_id": "dev_br_00001",
  "name": "Translation API",
  "price_usdc": 0.005,
  "calls_today": 12500,
  "earnings_today_usdc": 62.50,
  "status": "active"
}
```

---

## Profile 7.4: Multi-Agent Orchestration Platform

**Profile Name:** `agentic_orchestration_platform`

### Description
Platform for building and deploying multi-agent systems. Agents need payment capabilities as tools.

### Business Model
- Platform SaaS ($1K-50K/month)
- Usage-based pricing
- Enterprise licenses

### Transaction Profile
| Metric | Value |
|--------|-------|
| Monthly Volume | $1M - $10M |
| Avg Transaction | $10 - $5,000 |
| Transactions/Month | 10,000 - 100,000 |
| Agent Types | Shopping, procurement, research, operations |
| Protocols Used | x402, AP2, ACP (all three) |

### Corridors & Currencies
| Corridor | % Volume | Currency Pair |
|----------|----------|---------------|
| Global (stablecoin) | 50% | USDC |
| US → LATAM | 30% | USD → Various |
| EU → LATAM | 20% | EUR → Various |

### Pain Points
1. Agents need payment as a tool
2. Multiple protocols needed (different use cases)
3. Spending policies per agent
4. Audit across agent actions
5. Human-in-the-loop for high value

### PayOS Integration
```
API Flow:
1. GET /v1/capabilities (tool discovery for agents)
2. POST /v1/agents (agent registration)
3. POST /v1/agents/{id}/tools/payment (add payment tool)
4. POST /v1/agents/{id}/policies (spending policies)
5. GET /v1/agents/{id}/transactions (transaction history)
```

### Test Scenarios

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Tool discovery | Agent queries capabilities | Full capability catalog |
| 2 | Agent payment | Agent calls payment tool | Executed per policy |
| 3 | Policy enforcement | Over-limit attempt | Rejected, logged |
| 4 | Multi-agent budget | 3 agents, shared $10K budget | Tracked across agents |

### Seed Data Requirements
- 1 partner account
- 100 agent accounts (various types)
- Policy configurations
- 100,000 historical agent transactions
- Multi-agent scenarios
- Tool usage logs

### Sample Entities

**Partner Account:**
```json
{
  "name": "AgentFlow Platform",
  "type": "agentic_orchestration_platform",
  "tier": "enterprise",
  "monthly_volume_usd": 5000000,
  "primary_corridors": ["global-USDC", "US-LATAM", "EU-LATAM"],
  "integration_type": "multi_protocol",
  "features": ["tool_discovery", "agent_registration", "policies", "multi_agent"]
}
```

**Sample Agent:**
```json
{
  "agent_id": "agent_research_01",
  "platform_customer_id": "cust_00001",
  "name": "ResearchBot",
  "type": "research_agent",
  "capabilities": ["web_search", "document_analysis", "payment"],
  "payment_tools": ["x402", "acp"],
  "spending_policy": {
    "per_transaction_limit": 50,
    "daily_limit": 200,
    "monthly_limit": 1000,
    "auto_approve_under": 10,
    "requires_human_above": 25
  },
  "status": "active"
}
```

**Sample Capability Discovery Response:**
```json
{
  "capabilities": {
    "protocols": ["x402", "ap2", "acp"],
    "corridors": ["US-MX", "US-BR", "US-CO", "global-USDC"],
    "features": {
      "instant_settlement": true,
      "escrow": true,
      "recurring": true,
      "micropayments": true
    },
    "limits": {
      "min_transaction_usd": 0.001,
      "max_transaction_usd": 100000
    }
  }
}
```

---

## Category Summary

| Profile | Name | Volume | Tx Size | Key Protocols |
|---------|------|--------|---------|---------------|
| 7.1 | `agentic_shopping_consumer` | $200K-2M | $50-200 | x402, ACP |
| 7.2 | `agentic_procurement_enterprise` | $5-20M | $5K-25K | AP2, x402 |
| 7.3 | `agentic_api_monetization` | $500K-3M | $0.001-0.10 | x402 |
| 7.4 | `agentic_orchestration_platform` | $1-10M | $10-5K | x402, AP2, ACP |

---

## Integration Priority

For PayOS development, prioritize these features for Category 7:

1. **x402 Protocol** — Critical for 7.1, 7.3, 7.4
2. **AP2 Mandates** — Critical for 7.2
3. **ACP Checkout** — Important for 7.1, 7.4
4. **Agent Wallets** — Critical for all
5. **Spending Policies** — Critical for all
6. **Tool Discovery API** — Important for 7.4
7. **Micropayment Aggregation** — Critical for 7.3
8. **Audit Trail** — Critical for 7.2

---

## Protocol Selection Guide

| Use Case | Recommended Protocol | Why |
|----------|---------------------|-----|
| API micropayments | x402 | Native crypto, instant, sub-cent |
| Consumer shopping | ACP | Traditional checkout flow |
| Recurring supplier | AP2 | Mandate-based, enterprise |
| Agent autonomy | x402 + policies | Programmable spending |
| High-value B2B | AP2 | Approval workflows |
| Cross-border retail | ACP | Merchant-friendly |
