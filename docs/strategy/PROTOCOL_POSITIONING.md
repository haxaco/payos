# PayOS Positioning by Protocol

**Version:** 1.0  
**Date:** January 18, 2026  
**Purpose:** Strategic positioning of PayOS value for each agentic commerce protocol

---

## Executive Summary

PayOS's value proposition differs by protocol based on what each protocol provides vs. what it lacks:

| Protocol | Protocol Owner | PayOS Role | Discovery Control | Transaction Control |
|----------|---------------|------------|-------------------|---------------------|
| **ACP** | OpenAI + Stripe | Checkout endpoint + governance | ❌ Platform controls | ✅ We control |
| **UCP** | Google + Shopify | Payment handler + governance | ❌ Platform controls | ✅ We control |
| **MCP** | Anthropic | **Build & publish MCP server** | ✅ **We control** | ✅ We control |
| **x402** | Coinbase + Cloudflare | **Facilitator** | ✅ **We control** | ✅ We control |

**Key insight:** MCP and x402 are where PayOS has the strongest position—we control both discovery AND transaction. For ACP and UCP, we add significant value but platforms control discovery.

---

## ACP (Agentic Commerce Protocol)

### Protocol Overview

| Attribute | Detail |
|-----------|--------|
| **Owner** | OpenAI + Stripe |
| **Surfaces** | ChatGPT, Microsoft Copilot |
| **Use Case** | Consumer checkout from AI conversation |
| **Payment Rail** | Stripe only (protocol constraint) |
| **Status** | Live (Etsy, Urban Outfitters, more coming) |

### What ACP Does

- Checkout flow from AI conversation to payment
- SharedPaymentToken (SPT) for secure credential passing
- Stripe-native processing
- User confirms purchase within ChatGPT/Copilot interface

### What ACP Lacks

| Gap | Description | PayOS Solution |
|-----|-------------|----------------|
| Multi-protocol | ACP only—doesn't help with Gemini, Claude, APIs | One integration covers all |
| Governance | No spending policies, approval workflows, audit trails | Full governance layer |
| Analytics | Basic Stripe reporting—no cross-surface insights | Unified analytics |
| Discovery help | OpenAI controls who appears in ChatGPT | Technical readiness + application support |
| Implementation support | Merchant must build ACP endpoint | We implement it |

### PayOS Architecture for ACP

```
┌─────────────────────────────────────────────────────────────┐
│                        ChatGPT                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PayOS ACP Endpoint                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Implements ACP protocol correctly                  │   │
│  │ • Applies governance rules                           │   │
│  │ • Logs analytics                                     │   │
│  │ • Creates SharedPaymentToken                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Client's Stripe Account                        │
│              (funds go directly here)                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Points

- **Stripe-only:** ACP is Stripe-native. The SharedPaymentToken (SPT) is a Stripe construct. This is a protocol constraint, not a PayOS choice.
- **Client's credentials:** Merchant provides their Stripe API keys. Funds go directly to their Stripe account. PayOS never touches the money.
- **Discovery:** OpenAI controls who appears in ChatGPT Instant Checkout. PayOS can help with technical readiness but cannot guarantee acceptance.

### PayOS Positioning Statement for ACP

> "We implement ACP so you don't have to, add governance you can't get from Stripe, and give you the other protocols Stripe doesn't support—all while funds still go directly to your Stripe account."

### Value Comparison

| Without PayOS | With PayOS |
|---------------|------------|
| Merchant builds/maintains ACP endpoint | PayOS implements ACP correctly |
| No governance layer | Governance rules before checkout |
| Only works for ChatGPT/Copilot | Same merchant gets UCP/MCP/x402 too |
| Siloed Stripe analytics | Unified analytics across all surfaces |

---

## UCP (Universal Commerce Protocol)

### Protocol Overview

| Attribute | Detail |
|-----------|--------|
| **Owner** | Google + Shopify + Walmart + Target + Etsy |
| **Surfaces** | Gemini, Google AI Mode, future Google surfaces |
| **Use Case** | Full commerce lifecycle |
| **Payment Rail** | Processor-agnostic (not locked to Stripe) |
| **Status** | Launched January 11, 2026 at NRF |

### What UCP Does

- Full commerce lifecycle (discovery → checkout → tracking → returns)
- Payment handler abstraction (merchant chooses processor)
- AP2 mandate system for authorization (Intent, Cart, Payment mandates)
- Multi-transport support (REST, MCP, A2A, Embedded)
- Open spec (anyone can implement)

### What UCP Lacks

| Gap | Description | PayOS Solution |
|-----|-------------|----------------|
| Multi-protocol | UCP only—doesn't help with ChatGPT, Claude, APIs | One integration covers all |
| Governance beyond mandates | AP2 proves authorization, doesn't enforce business rules | Policy enforcement layer |
| Discovery guarantee | Google's algorithm decides who appears | Feed optimization + technical readiness |
| Implementation support | Open spec, but complex to implement correctly | We implement it |

### The AP2 Mandate Gap

AP2 provides cryptographic authorization proofs. But enterprises need MORE:

| AP2 Provides | PayOS Adds |
|--------------|------------|
| Intent Mandate (pre-authorization) | Budget enforcement |
| Cart Mandate (user approval) | Vendor restrictions |
| Payment Mandate (proof of payment) | Category controls |
| Liability framework | Approval workflows |
| | Real-time policy checks |
| | Audit trails |

**Key insight:** Mandates prove what happened. Governance controls what CAN happen.

### PayOS Architecture for UCP

```
┌─────────────────────────────────────────────────────────────┐
│                        Gemini                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 PayOS UCP Payment Handler                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Implements UCP spec correctly                      │   │
│  │ • Verifies AP2 mandates                              │   │
│  │ • Applies governance BEYOND mandates                 │   │
│  │ • Logs analytics                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           Client's Processor (Stripe, Adyen, etc.)         │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Points

- **Processor-agnostic:** UCP is not locked to Stripe. Merchants can use their existing processor.
- **Open spec:** Anyone can implement UCP payment handler endpoints.
- **Discovery:** Google controls who appears in AI Mode via Merchant Center and algorithms. PayOS helps with feed optimization but cannot guarantee discovery.

### PayOS Positioning Statement for UCP

> "UCP is an open spec—but it's complex. We implement the payment handler correctly, add governance that goes beyond AP2 mandates, and give you the other protocols Google doesn't care about."

### Value Comparison

| Without PayOS | With PayOS |
|---------------|------------|
| Merchant builds/maintains UCP endpoints | PayOS implements UCP correctly |
| AP2 mandates only (no policy enforcement) | Governance layer ON TOP of mandates |
| Only works for Gemini/AI Mode | Same merchant gets ACP/MCP/x402 too |
| Complex spec to implement | Handled for you |

---

## MCP (Model Context Protocol)

### Protocol Overview

| Attribute | Detail |
|-----------|--------|
| **Owner** | Anthropic |
| **Surfaces** | Claude (desktop, API, integrations) |
| **Use Case** | Tool/capability exposure for LLMs |
| **Payment Rail** | Not specified (MCP is tool protocol, not payment protocol) |
| **Status** | Live, open directory |

### What MCP Does

- Standardized way for Claude to interact with external systems
- Tool and capability exposure
- Open spec, open directory (anyone can publish)
- Growing ecosystem of MCP servers

### What MCP Lacks

| Gap | Description | PayOS Solution |
|-----|-------------|----------------|
| Commerce focus | MCP is general-purpose—not commerce-specific | We build commerce tools |
| Payment handling | No built-in payment flow | We add payment layer |
| Multi-protocol | MCP only—doesn't help with ChatGPT, Gemini | One integration covers all |
| Governance | No spending controls (it's a tool protocol) | Full governance layer |

### PayOS Architecture for MCP

```
┌─────────────────────────────────────────────────────────────┐
│                        Claude                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              PayOS MCP Server (Commerce Tools)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tools we build for the merchant:                     │   │
│  │                                                      │   │
│  │ • browse_products(query, filters)                    │   │
│  │ • get_product_details(product_id)                    │   │
│  │ • add_to_cart(product_id, quantity)                  │   │
│  │ • view_cart()                                        │   │
│  │ • checkout(payment_method)                           │   │
│  │ • track_order(order_id)                              │   │
│  │                                                      │   │
│  │ PayOS BUILDS this for the merchant                   │   │
│  │ PayOS PUBLISHES to Anthropic directory               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 PayOS Payment Flow                          │
│        (x402 for micropayments, or traditional rails)      │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Points

- **We control discovery:** Anthropic's MCP directory is open. We can guarantee listing by publishing the MCP server ourselves.
- **We control transaction:** We build the commerce tools, so we handle the payment flow.
- **Commerce layer on tool protocol:** MCP doesn't know about commerce. We add browse/cart/checkout on top.

### PayOS Positioning Statement for MCP

> "MCP is a tool protocol, not a payment protocol. We build the commerce layer on top—giving Claude the ability to browse, cart, and checkout on your behalf, with proper payment handling. We publish to Anthropic's directory, so you're discoverable by Claude users without building anything."

### Value Comparison

| Without PayOS | With PayOS |
|---------------|------------|
| Merchant builds MCP server from scratch | PayOS builds MCP server FOR merchant |
| No standardized commerce tools | Full commerce toolkit |
| Payment handling is DIY | Payment handled via PayOS |
| Merchant submits to directory | PayOS publishes for them |

### Unique Advantage

**MCP is where PayOS has maximum control:**
- ✅ We control discovery (we publish to directory)
- ✅ We control transaction (we build the server)
- ✅ Merchant does nothing—we handle everything

---

## x402 (HTTP 402 Payment Required)

### Protocol Overview

| Attribute | Detail |
|-----------|--------|
| **Owner** | Coinbase + Cloudflare (x402 Foundation) |
| **Surfaces** | Any HTTP client with x402 support, AI agents calling APIs |
| **Use Case** | API monetization, micropayments |
| **Payment Rail** | USDC on Base |
| **Status** | Live, growing adoption |

### What x402 Does

- HTTP-native payment signaling (402 status code)
- Micropayment support ($0.001 - $10)
- Payment JWT for cryptographic proof
- Facilitator model for verification and settlement
- USDC on Base for instant finality

### What x402 Lacks

| Gap | Description | PayOS Solution |
|-----|-------------|----------------|
| Commerce lifecycle | Payment only—no discovery, cart, returns | Integration with other protocols |
| Multi-protocol | x402 only—doesn't help with ChatGPT, Gemini | One integration covers all |
| Fiat support | USDC-native (crypto only) | Fiat bridge capability |
| Enterprise governance | No spending policies, audit trails | Full governance layer |

### PayOS Architecture for x402

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent / Client                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 API Endpoint (with 402)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PayOS adds HTTP 402 support to client's API          │   │
│  │                                                      │   │
│  │ Response: 402 Payment Required                       │   │
│  │ Headers:                                             │   │
│  │   X-Payment-Amount: 0.001                            │   │
│  │   X-Payment-Address: 0x...                           │   │
│  │   X-Payment-Facilitator: payos.io                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   PayOS x402 Facilitator                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Verifies payment JWT                               │   │
│  │ • Applies governance (enterprise spending limits)    │   │
│  │ • Settles via USDC on Base                           │   │
│  │ • Can bridge to fiat if needed                       │   │
│  │ • Full audit trail                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Points

- **We control discovery:** Any API with HTTP 402 is auto-discoverable by x402 clients. We add 402 support.
- **We ARE the facilitator:** We verify payments, settle transactions, provide audit trails.
- **Enterprise governance:** x402 has no spending controls. We add policies for enterprise agents.

### PayOS Positioning Statement for x402

> "We're the facilitator. We add 402 support to your APIs, verify payments, and settle transactions. For enterprises, we add the governance layer that x402 doesn't have—spending policies, audit trails, compliance."

### Value Comparison

| Without PayOS | With PayOS |
|---------------|------------|
| API provider implements 402 themselves | PayOS adds 402 to endpoints |
| Needs to find/build facilitator | PayOS IS the facilitator |
| USDC only settlement | Can bridge to fiat |
| No governance for enterprise agents | Full spending policy enforcement |

### Unique Advantage

**x402 is where PayOS has maximum control:**
- ✅ We control discovery (we add 402 support)
- ✅ We control transaction (we're the facilitator)
- ✅ We add value neither the protocol nor the API provider has (governance)

---

## Comparative Analysis

### PayOS Control Matrix

| Protocol | Discovery | Transaction | Governance | Settlement |
|----------|-----------|-------------|------------|------------|
| **ACP** | ❌ OpenAI controls | ✅ We implement endpoint | ✅ We add | ⚠️ Client's Stripe |
| **UCP** | ❌ Google controls | ✅ We implement handler | ✅ We add | ✅ Client's choice |
| **MCP** | ✅ **We publish** | ✅ **We build server** | ✅ We add | ✅ We handle |
| **x402** | ✅ **We add 402** | ✅ **We're facilitator** | ✅ We add | ✅ We handle |

### Strategic Implication

**Strongest position:** MCP and x402
- We control the full vertical
- No platform dependency
- Can guarantee discovery AND transaction

**Good position:** UCP
- Open spec, we implement
- Processor flexibility
- But Google controls discovery

**Dependent position:** ACP
- Stripe-only constraint
- OpenAI controls discovery
- But 800M users makes it essential

### PayOS Value by Protocol

| Protocol | Primary Value | Secondary Value |
|----------|--------------|-----------------|
| **ACP** | Multi-protocol (escape Stripe lock-in) | Governance + analytics |
| **UCP** | Governance beyond AP2 mandates | Multi-protocol + implementation |
| **MCP** | **Full-stack (we do everything)** | Discovery guarantee |
| **x402** | **Facilitator + governance** | Enterprise spending controls |

---

## Customer Scenario Positioning

### Scenario 1: Merchant wants to sell on ChatGPT

**Protocol:** ACP

**PayOS pitch:**
> "We implement ACP for you, so you're live faster. And when you're ready to also reach Gemini and Claude users, you don't rebuild—same integration, all protocols."

---

### Scenario 2: Shopify merchant auto-enrolled in UCP

**Protocol:** UCP (via Shopify)

**PayOS pitch:**
> "Shopify enrolled you, but do you know which AI surface is converting best? We add the analytics layer Shopify doesn't give you, plus governance controls and access to ChatGPT/Claude that Shopify doesn't cover."

---

### Scenario 3: Merchant wants Claude users to buy

**Protocol:** MCP

**PayOS pitch:**
> "MCP is a tool protocol, not a commerce protocol. We build the commerce tools FOR you—browse, cart, checkout—and handle payments. We publish to Anthropic's directory. You're discoverable by Claude users without building anything."

---

### Scenario 4: API provider wants micropayment monetization

**Protocol:** x402

**PayOS pitch:**
> "We add 402 to your API endpoints and act as the facilitator. Verification, settlement, done. For enterprise customers calling your API, we add spending governance—so their agents can pay you within policy limits."

---

### Scenario 5: Enterprise deploying procurement agents

**Protocols:** UCP + x402 (primarily)

**PayOS pitch:**
> "AP2 mandates prove authorization. We enforce YOUR policies—spending limits per agent, vendor restrictions, approval workflows. Your agents buy via UCP for commerce, x402 for SaaS/APIs. One governance layer across all of it."

---

### Scenario 6: Company wants to reach ALL AI surfaces

**Protocols:** All

**PayOS pitch:**
> "ChatGPT users need ACP. Gemini users need UCP. Claude users need MCP. API calls need x402. That's four different protocols with four different implementations. We give you one integration that covers all of them—plus the governance layer none of them provide."

---

## Appendix: Protocol Comparison Table

| Aspect | ACP | UCP | MCP | x402 |
|--------|-----|-----|-----|------|
| **Protocol Owner** | OpenAI + Stripe | Google + Shopify | Anthropic | Coinbase + Cloudflare |
| **AI Surface** | ChatGPT, Copilot | Gemini, AI Mode | Claude | Any x402 client |
| **User Base** | 800M weekly (ChatGPT) | Growing (Gemini) | Developers, power users | API consumers |
| **Use Case** | Consumer checkout | Full commerce lifecycle | Tool execution | API micropayments |
| **Payment Rail** | Stripe only | Processor-agnostic | Not specified | USDC on Base |
| **Transaction Size** | $10 - $10,000+ | $10 - $10,000+ | Varies | $0.001 - $10 |
| **Open Spec** | No (Stripe SDK) | Yes | Yes | Yes |
| **Discovery Control** | OpenAI (curated) | Google (algorithm) | Open directory | Self-discovery (HTTP) |
| **Authorization** | Stripe tokens | AP2 mandates | N/A | Payment JWT |
| **Governance Built-in** | No | Partial (AP2) | No | No |
| **PayOS Role** | Checkout endpoint | Payment handler | **Build MCP server** | **Facilitator** |
| **PayOS Discovery Control** | ❌ Indirect | ❌ Indirect | ✅ **Direct** | ✅ **Direct** |
| **PayOS Transaction Control** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

*This document should be updated as protocols evolve and PayOS capabilities expand.*
