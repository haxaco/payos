# Sly Integration Requirements: B2B vs B2C Customers

Guide for understanding how different customer types integrate with Sly.

**Last Updated:** January 27, 2026

---

## Table of Contents

1. [Customer Types Overview](#customer-types-overview)
2. [B2B Integration (Fintech Partners / Merchants)](#b2b-integration-fintech-partners--merchants)
3. [External Registration Requirements by Protocol](#external-registration-requirements-by-protocol)
4. [B2C Integration (End Users / Agents)](#b2c-integration-end-users--agents)
5. [Integration Comparison Table](#integration-comparison-table)
6. [Settlement Layer](#settlement-layer-all-customer-types)
7. [Key Differentiators](#key-differentiators)

---

## Customer Types Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SLY PLATFORM                               │
├─────────────────────────────┬───────────────────────────────────────┤
│         B2B PARTNERS        │           B2C END USERS               │
│      (Fintech/Merchants)    │        (Individuals/Agents)           │
├─────────────────────────────┼───────────────────────────────────────┤
│  • API Key Authentication   │  • JWT Session (Dashboard)            │
│  • Multi-tenant isolation   │  • Agent Token (AI Actors)            │
│  • KYB verification (0-3)   │  • KYC/KYA verification (0-3)         │
│  • White-label capabilities │  • Transaction execution              │
│  • Webhook integrations     │  • Spending limits                    │
└─────────────────────────────┴───────────────────────────────────────┘
```

---

## B2B Integration (Fintech Partners / Merchants)

### What They Are

- **Tenants** in Sly's multi-tenant architecture
- Fintech companies, payment processors, marketplaces
- Issue API keys to their systems
- Create accounts for their end-customers

### Integration Requirements

| Requirement | Details |
|-------------|---------|
| **Authentication** | API Key (`pk_test_*` or `pk_live_*`) |
| **Verification** | KYB Tier 0-3 (business verification) |
| **Setup Time** | 10-15 minutes via onboarding wizard |
| **Technical** | REST API, SDK (@sly/sdk), Webhooks |

### Onboarding Flow

```
1. Sign Up → Create Tenant Account
2. Choose Use Case Template:
   ├── API Monetization (x402 protocol)
   ├── E-Commerce Integration (ACP protocol)
   ├── Agent Commerce (AP2 protocol)
   └── Recurring Payments (UCP protocol)
3. Configure Settings:
   ├── API Keys (test + live)
   ├── Webhook endpoints
   ├── Settlement preferences (Pix/SPEI)
   └── Spending limits
4. KYB Verification → Unlock higher tiers
5. Go Live
```

### Available Protocols for B2B

| Protocol | Use Case | Integration Pattern |
|----------|----------|---------------------|
| **x402** | API monetization, paywalled content | HTTP 402 response with payment link |
| **AP2** | Agent budgets, autonomous spending | Create mandate → agent executes |
| **ACP** | E-commerce checkout (Stripe/OpenAI) | Create checkout → redirect/complete |
| **UCP** | Full commerce lifecycle (Google/Shopify) | Discovery → Cart → Checkout → Order |

### Card Network Integrations

| Network | Use Case | Integration Pattern |
|---------|----------|---------------------|
| **Visa VIC** | Agent card payments via Visa rails | Register agent → Get tokens → Pay merchants |
| **Mastercard Agent Pay** | Agent card payments via MC rails | Register agent → DTVC tokens → Pay merchants |

### B2B SDK Example

```typescript
import { Sly } from '@sly/sdk';

const sly = new Sly({ apiKey: process.env.SLY_API_KEY });

// Create customer account
const account = await sly.accounts.create({
  type: 'individual',
  name: 'John Doe',
  email: 'john@example.com'
});

// Process payment
const transfer = await sly.transfers.create({
  from_account_id: account.id,
  to_account_id: 'merchant_acc_123',
  amount: 99.99,
  currency: 'USDC'
});
```

---

## External Registration Requirements by Protocol

### x402 - No External Registration Required ✅

```
┌────────────────────────────────────────────────────┐
│  x402 Protocol                                     │
├────────────────────────────────────────────────────┤
│  External APIs: None                               │
│  External Keys: None                               │
│  Webhooks: Internal only (your endpoint URL)       │
│  Approval: None                                    │
├────────────────────────────────────────────────────┤
│  Optional: x402.org sandbox for testing            │
│            Coinbase Facilitator (enterprise)       │
└────────────────────────────────────────────────────┘
```

**What B2B needs to do:**
1. Register endpoints via Sly API (`POST /v1/x402/endpoints`)
2. Configure pricing per endpoint
3. Optionally set webhook URL for payment notifications

**No external accounts needed.**

---

### AP2 - No External Registration Required ✅

```
┌────────────────────────────────────────────────────┐
│  AP2 Protocol (Agent Payment Protocol)             │
├────────────────────────────────────────────────────┤
│  External APIs: None                               │
│  External Keys: None                               │
│  Webhooks: None                                    │
│  Approval: None                                    │
├────────────────────────────────────────────────────┤
│  Google spec-compliant but fully internal          │
│  Mandates stored in Sly database                   │
└────────────────────────────────────────────────────┘
```

**What B2B needs to do:**
1. Create agents via Sly API
2. Create mandates with spending limits
3. Issue agent tokens for autonomous operation

**No external accounts needed.**

---

### ACP - Stripe Registration Required ⚠️

```
┌────────────────────────────────────────────────────┐
│  ACP Protocol (Agentic Commerce Protocol)          │
├────────────────────────────────────────────────────┤
│  External APIs: Stripe                             │
│  External Keys: sk_test_* or sk_live_*             │
│  Webhooks: Must configure in Stripe Dashboard      │
│  Approval: Stripe account activation               │
├────────────────────────────────────────────────────┤
│  Stripe handles payment authorization              │
│  Sly handles settlement & fulfillment              │
└────────────────────────────────────────────────────┘
```

**What B2B needs to do:**
1. **Create Stripe account** at stripe.com
2. **Get API keys** from Stripe Dashboard → Developers → API Keys
3. **Configure webhooks** in Stripe Dashboard:
   - Endpoint: `https://api.sly.com/v1/stripe-webhooks`
   - Events: `payment_intent.succeeded`, `payment_intent.failed`
4. **Add Stripe key to Sly** via dashboard or API

**External registration timeline: ~30 minutes**

---

### UCP - No External Registration Required ✅

```
┌────────────────────────────────────────────────────┐
│  UCP Protocol (Universal Commerce Protocol)        │
├────────────────────────────────────────────────────┤
│  External APIs: None (Sly is the payment handler)  │
│  External Keys: None                               │
│  Webhooks: Internal only                           │
│  Approval: None                                    │
├────────────────────────────────────────────────────┤
│  Google + Shopify standard (Jan 2026)              │
│  Full commerce lifecycle protocol                  │
│  Sly acts as UCP Payment Handler                   │
└────────────────────────────────────────────────────┘
```

**What B2B needs to do:**
1. Register as UCP merchant via Sly API
2. Configure checkout sessions
3. Optionally configure settlement to Pix/SPEI

**No external accounts needed** - Sly handles the UCP payment handler role.

---

### Visa VIC - Visa Developer Registration Required ⚠️

```
┌────────────────────────────────────────────────────┐
│  Visa Intelligent Commerce (VIC)                   │
├────────────────────────────────────────────────────┤
│  External APIs: Visa Developer Portal              │
│  External Keys: API Key, Shared Secret, Cert ID    │
│  Webhooks: Visa TAP key directory                  │
│  Approval: Agent Enabler partner registration      │
├────────────────────────────────────────────────────┤
│  Enables AI agents to pay via Visa card rails      │
│  Uses TAP (Trusted Agent Protocol)                 │
│  VTS tokenization for secure payments              │
│  Settlement: T+1, Fees: 2.9% + $0.30               │
└────────────────────────────────────────────────────┘
```

**What B2B needs to do:**
1. **Register at developer.visa.com** as "Agent Enabler" partner
2. **Request VIC Sandbox access**
3. **Get credentials**:
   - `VISA_SANDBOX_API_KEY`
   - `VISA_SANDBOX_SHARED_SECRET`
   - `VISA_SANDBOX_CERTIFICATE_ID`
4. **Configure TAP key directory** for agent verification
5. **Add Visa credentials to Sly** via dashboard

**External registration timeline: 1-2 weeks (partner approval)**

---

### Mastercard Agent Pay - Mastercard Developer Registration Required ⚠️

```
┌────────────────────────────────────────────────────┐
│  Mastercard Agent Pay                              │
├────────────────────────────────────────────────────┤
│  External APIs: Mastercard Developer Portal        │
│  External Keys: Consumer Key, Keystore (P12)       │
│  Webhooks: Agent key directory                     │
│  Approval: Agent Pay program registration          │
├────────────────────────────────────────────────────┤
│  Enables AI agents to pay via Mastercard rails     │
│  MDES token management                             │
│  DTVC (Dynamic Token Verification Code)            │
│  Settlement: T+1, Fees: 2.9% + $0.30               │
│  LATAM partners: Getnet, MagaluPay, Yuno           │
└────────────────────────────────────────────────────┘
```

**What B2B needs to do:**
1. **Register at developer.mastercard.com**
2. **Apply for Agent Pay program**
3. **Get credentials**:
   - `MC_SANDBOX_CONSUMER_KEY`
   - `MC_SANDBOX_KEYSTORE_PATH` (.p12 file)
   - `MC_SANDBOX_KEYSTORE_PASSWORD`
4. **Download Agent Toolkit** (MCP server)
5. **Add Mastercard credentials to Sly** via dashboard

**External registration timeline: 1-2 weeks (program approval)**

---

### Circle - Required for Pix/SPEI Settlement ⚠️

```
┌────────────────────────────────────────────────────┐
│  Circle (Settlement Layer)                         │
├────────────────────────────────────────────────────┤
│  External APIs: Circle API                         │
│  External Keys: Circle API Key                     │
│  Webhooks: Circle webhook configuration            │
│  Approval: Circle business verification (KYB)      │
├────────────────────────────────────────────────────┤
│  Required for USDC → Fiat settlement               │
│  Pix (Brazil): Instant settlement                  │
│  SPEI (Mexico): Same-day settlement                │
│  Works with ANY protocol (x402, AP2, ACP, UCP)     │
└────────────────────────────────────────────────────┘
```

**What B2B needs to do:**
1. **Create Circle account** at circle.com/developers
2. **Complete business verification** (KYB with Circle)
3. **Get API keys** from Circle Developer Dashboard
4. **Configure settlement corridors**:
   - Pix: Add Brazilian bank details / Pix keys
   - SPEI: Add Mexican CLABE accounts
5. **Add Circle key to Sly** via dashboard

**External registration timeline: 1-3 business days (KYB dependent)**

---

## Protocol Selection Guide

```
What do you need?
      │
      ├─► Pay-per-use API access?
      │         └─► x402 (No external registration)
      │
      ├─► AI agents with budgets?
      │         └─► AP2 (No external registration)
      │
      ├─► E-commerce checkout (Stripe ecosystem)?
      │         └─► ACP (Requires Stripe)
      │
      ├─► Full commerce lifecycle (Google/Shopify ecosystem)?
      │         └─► UCP (No external registration)
      │
      ├─► AI agents paying via Visa card rails?
      │         └─► Visa VIC (Requires Visa developer account)
      │
      ├─► AI agents paying via Mastercard rails?
      │         └─► Mastercard Agent Pay (Requires MC developer account)
      │
      └─► Settle to LATAM (Pix/SPEI)?
                └─► Circle (Required for fiat settlement)
```

---

## External Credentials Summary

| Integration | External Service | Required? | Credential Type | Where to Get |
|-------------|-----------------|-----------|-----------------|--------------|
| **x402** | None | ❌ | N/A | N/A |
| **AP2** | None | ❌ | N/A | N/A |
| **ACP** | Stripe | ✅ | `sk_test_*` / `sk_live_*` | stripe.com |
| **UCP** | None | ❌ | N/A | N/A |
| **Visa VIC** | Visa | ✅ | API Key + Cert | developer.visa.com |
| **Mastercard** | Mastercard | ✅ | Consumer Key + P12 | developer.mastercard.com |
| **Settlement** | Circle | ✅* | Circle API Key | circle.com |

*Circle required only for Pix/SPEI fiat settlement

### Integration Complexity by Type

| Integration | External Registration | Timeline | Complexity |
|-------------|----------------------|----------|------------|
| **x402** | None | Instant | Simple |
| **AP2** | None | Instant | Simple |
| **ACP** | Stripe | ~30 min | Moderate |
| **UCP** | None | Instant | Simple |
| **Visa VIC** | Visa Partner | 1-2 weeks | Complex |
| **Mastercard** | MC Partner | 1-2 weeks | Complex |
| **Circle** | KYB Verification | 1-3 days | Moderate |

---

## B2C Integration (End Users / Agents)

### What They Are

- **Accounts** under a B2B tenant
- Individual consumers or AI agents
- Use dashboard (JWT) or agent tokens
- Execute transactions within limits

### Integration Requirements

| Requirement | Details |
|-------------|---------|
| **Authentication** | JWT Session (humans) or Agent Token (`agent_*`) |
| **Verification** | KYC Tier 0-3 (individuals) or KYA Tier 0-3 (AI agents) |
| **Setup Time** | Minutes (created by B2B partner) |
| **Technical** | Dashboard UI or Agent SDK |

### Verification Tiers

```
Tier 0: Unverified     → $100/day limit
Tier 1: Basic (email)  → $1,000/day limit
Tier 2: Enhanced (ID)  → $10,000/day limit
Tier 3: Full (address) → $100,000+/day limit
```

### AI Agent Requirements (KYA Framework)

```
AI Agent Registration
    │
    ├── Agent Name & Description
    ├── Parent Account (human owner)
    ├── Permissions:
    │   ├── canTransact
    │   ├── canManageStreams
    │   ├── canViewAccounts
    │   └── canAccessTreasury
    │
    └── Spending Limits:
        ├── Per-transaction max
        ├── Daily limit
        └── Monthly limit
```

### B2C User Flow (Dashboard)

```
1. Receive invite from B2B partner
2. Create account / Login (JWT auth)
3. Complete KYC verification
4. Fund wallet (USDC)
5. Make payments / manage streams
```

### B2C Agent Flow (Programmatic)

```typescript
// Agent authenticates with token
const headers = {
  'Authorization': `Bearer agent_sk_123abc...`
};

// Agent executes payment within mandate
const response = await fetch('https://api.sly.com/v1/transfers', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    to_account_id: 'merchant_123',
    amount: 50.00,
    currency: 'USDC',
    description: 'Automated purchase'
  })
});
```

---

## Integration Comparison Table

| Aspect | B2B (Partners) | B2C (End Users) | B2C (Agents) |
|--------|----------------|-----------------|--------------|
| **Auth Method** | API Key | JWT Session | Agent Token |
| **Verification** | KYB | KYC | KYA |
| **Creates** | Accounts, Agents | Transactions | Transactions |
| **Access Level** | Full API | Dashboard + API | Limited API |
| **Limits** | Tenant-level | Account-level | Agent-level |
| **Typical User** | Fintech company | Consumer | AI assistant |

---

## Settlement Layer (All Customer Types)

```
                    PAYMENT RAILS
    ┌─────────────────────────────────────────────┐
    │                                             │
    │   Protocols          Card Networks          │
    │   ─────────          ─────────────          │
    │   x402               Visa VIC               │
    │   AP2                Mastercard Agent Pay   │
    │   ACP                                       │
    │   UCP                                       │
    │                                             │
    └──────────────────┬──────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Sly Platform  │
              │    (USDC)      │
              └───────┬────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │  Visa   │  │  Circle │  │   MC    │
    │  T+1    │  │  USDC   │  │   T+1   │
    └─────────┘  └────┬────┘  └─────────┘
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
         ┌─────────┐    ┌─────────┐
         │   Pix   │    │  SPEI   │
         │ Instant │    │Same-day │
         │(Brazil) │    │(Mexico) │
         └─────────┘    └─────────┘
```

**5 Settlement Rails:**
- **Visa** - Card network settlement (T+1)
- **Mastercard** - Card network settlement (T+1)
- **USDC** - Stablecoin (instant on-chain)
- **Pix** - Brazil instant payments
- **SPEI** - Mexico same-day payments

---

## Key Differentiators

| Feature | Description |
|---------|-------------|
| **Multi-tenant** | Complete data isolation between partners |
| **KYA Framework** | First-class AI agent support |
| **4 Protocols** | x402, AP2, ACP, UCP - right tool for every use case |
| **2 Card Networks** | Visa VIC + Mastercard Agent Pay for agent card payments |
| **5 Settlement Rails** | Visa, Mastercard, USDC, Pix, SPEI |
| **LATAM Focus** | Native Pix/SPEI settlement via Circle |
| **Real-time** | Money streaming, instant settlement |

---

## Quick Start by Customer Type

### For B2B Partners:
1. **Sign up** → Get API keys
2. **Choose protocol** → x402 / AP2 / ACP / UCP
3. **Integrate SDK** → `npm install @sly/sdk`
4. **Complete KYB** → Unlock higher limits
5. **Go live** → Process payments

### For B2C End Users:
1. **Get invited** by B2B partner
2. **Create account** → Dashboard access
3. **Verify identity** → KYC tiers
4. **Fund wallet** → Add USDC
5. **Transact** → Payments & streams

### For AI Agents:
1. **Registered** by B2B partner
2. **Assigned limits** → Per-tx, daily, monthly
3. **KYA verification** → Tiers 0-3
4. **Token issued** → `agent_sk_*`
5. **Autonomous operation** → Within limits

---

## Infographic Visual Elements

This document provides the integration requirements for an infographic. Key visual elements to include:

1. **Customer type diagram** (B2B vs B2C split)
2. **Protocol selection flowchart** (which protocol for which use case)
3. **Card network options** (Visa VIC vs Mastercard Agent Pay)
4. **Verification tier ladder** (KYC/KYB/KYA progression)
5. **External registration matrix** (what needs signup where)
6. **Settlement flow** (5 rails: Visa, MC, USDC, Pix, SPEI)

---

## Related Documentation

- [Protocol Comparison](../PROTOCOL_COMPARISON.md) - Detailed protocol comparison
- [UCP Quickstart](../UCP_QUICKSTART.md) - Getting started with UCP
- [SDK Testing Guide](../development/SDK_TESTING_GUIDE.md) - SDK integration testing
- [Onboarding Guide](../onboarding/GEMINI_START_HERE.md) - Developer onboarding

---

**Maintained By:** Sly Team
