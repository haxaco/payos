# AI Platform → Protocol Mapping

**Version:** 1.0  
**Date:** January 18, 2026  
**Purpose:** Which protocols support which AI models/platforms?

---

## Executive Summary

**Does UCP support all AI platforms?** NO. UCP is Google's protocol, primarily for Gemini and Google AI Mode.

**To reach ALL major AI platforms, you need multiple protocols:**

| AI Platform | Primary Protocol | Secondary | Payment Partner |
|-------------|-----------------|-----------|-----------------|
| **ChatGPT** | ACP | - | Stripe |
| **Gemini** | UCP | AP2 | Google Pay |
| **Claude** | MCP + x402 | UCP (via MCP) | x402/wallet |
| **Copilot** | ACP | - | Stripe, PayPal |
| **Perplexity** | Custom + PayPal | - | PayPal |
| **Amazon/Rufus** | Closed | - | Amazon Pay |

---

## Part 1: The Complete AI Platform Landscape

### 1. ChatGPT (OpenAI) - 800M Weekly Users

**Protocol:** ACP (Agentic Commerce Protocol)

```
ChatGPT Commerce Stack:
├── Surface: ChatGPT web/mobile/desktop
├── Protocol: ACP (they co-created it)
├── Payment: Stripe SharedPaymentToken (SPT)
├── Partners: Etsy (live), Shopify (1M+ coming)
└── Feature: Instant Checkout
```

**To be discoverable/purchasable in ChatGPT:**
- Implement ACP
- Use Stripe (easiest) or SPT-compatible PSP
- Apply to Instant Checkout program

**Merchant Status:**
| Partner | Status |
|---------|--------|
| Etsy | ✅ Live |
| Shopify merchants | Coming soon |
| Target | Announced |
| Walmart | Announced |
| Instacart | Announced |
| DoorDash | Announced |

---

### 2. Gemini + Google AI Mode - Growing Fast

**Protocol:** UCP (Universal Commerce Protocol) + AP2

```
Google Commerce Stack:
├── Surfaces: Gemini app, AI Mode in Search
├── Protocol: UCP (they created it)
├── Authorization: AP2 Mandates
├── Payment: Google Pay (default), PayPal (coming)
├── Partners: Shopify, Walmart, Target, Etsy, Wayfair
└── Feature: Direct checkout in AI Mode
```

**To be discoverable/purchasable in Gemini/AI Mode:**
- Implement UCP
- Optionally implement AP2 for enterprise
- Google Merchant Center integration
- Use supported PSP for payment handler

**Merchant Status:**
| Partner | Status |
|---------|--------|
| Shopify | ✅ Co-developed |
| Walmart | ✅ Co-developed |
| Target | ✅ Co-developed |
| Etsy | ✅ Co-developed |
| Wayfair | ✅ Co-developed |
| 20+ endorsers | Committed |

---

### 3. Claude (Anthropic) - MCP Native

**Protocol:** MCP (Model Context Protocol) + x402

```
Claude Commerce Stack:
├── Surfaces: Claude.ai, Claude Code, API
├── Protocol: MCP (they created it)
├── Payment: x402 (for tool monetization)
├── Tool access: MCP Connectors
└── Feature: Computer use, agentic tasks
```

**Key Point:** Claude doesn't have "Instant Checkout" like ChatGPT. It operates via:

1. **MCP Connectors** - Tools that Claude can invoke
2. **x402** - For pay-per-use tool access
3. **Computer Use** - Can navigate checkout flows on websites

**To be accessible to Claude:**
- Build MCP server/connector
- Optionally use x402 for monetization
- Publish to MCP Connector directory

**Important:** UCP is MCP-compatible! A UCP merchant can be accessed by Claude via MCP transport.

```
UCP Transports:
├── REST API
├── MCP ←── Claude can use this
├── A2A (Agent-to-Agent)
└── Embedded
```

---

### 4. Microsoft Copilot - 100M Monthly Users

**Protocol:** ACP (via Stripe/PayPal)

```
Copilot Commerce Stack:
├── Surfaces: Copilot.com, Bing, MSN, Edge
├── Protocol: ACP (Microsoft adopted it)
├── Payment: Stripe SPT, PayPal
├── Partners: Shopify, Etsy, Urban Outfitters
└── Feature: Copilot Checkout
```

**Critically:** Microsoft explicitly adopted ACP from Stripe/OpenAI:
> "Microsoft is adopting open standards like the Agentic Commerce Protocol (ACP) to ensure merchant onboarding is seamless and scalable."

**To be discoverable/purchasable in Copilot:**
- Implement ACP
- Use Stripe or PayPal
- Shopify merchants auto-enrolled (opt-out)

**Merchant Status:**
| Partner | Status |
|---------|--------|
| Etsy | ✅ Live |
| Urban Outfitters | ✅ Live |
| Anthropologie | ✅ Live |
| Ashley Furniture | ✅ Live |
| Shopify merchants | Auto-enrolled |

---

### 5. Perplexity - Niche but Growing

**Protocol:** Custom + PayPal Integration

```
Perplexity Commerce Stack:
├── Surfaces: Perplexity web/app
├── Protocol: Custom (no standard)
├── Payment: PayPal (exclusive partner)
├── Feature: "Buy with Pro", "Instant Buy"
└── Merchant access: Shopify integration, Merchant Program
```

**Key Point:** Perplexity does NOT use UCP or ACP. They have:
- Custom integration with PayPal
- Direct Shopify feed access
- Proprietary "Perplexity Merchant Program"

**To be discoverable/purchasable in Perplexity:**
- Be on Shopify (automatic feed access)
- Join Perplexity Merchant Program
- PayPal handles payments

**Note:** Amazon is suing Perplexity over unauthorized site access.

---

### 6. Amazon (Rufus, Buy For Me, Auto Buy)

**Protocol:** Closed/Proprietary

```
Amazon Commerce Stack:
├── Surfaces: Amazon app, Alexa
├── Protocol: NONE (walled garden)
├── Features: Rufus, Buy For Me, Auto Buy
├── External access: BLOCKED
└── Strategy: Build own agents, scrape others
```

**Key Point:** Amazon will NOT adopt external protocols.

- Blocked 47 external AI agents
- Sued Perplexity
- Building own agents (Rufus: $10B projected)
- Scraping others (Buy For Me)

**To be purchasable via Amazon agents:**
- Sell on Amazon directly
- OR be scraped by Buy For Me (no consent needed)
- No protocol integration possible

---

## Part 2: Protocol-to-Platform Matrix

### Which protocol reaches which AI platform?

| Protocol | ChatGPT | Gemini | Claude | Copilot | Perplexity | Amazon |
|----------|---------|--------|--------|---------|------------|--------|
| **UCP** | ❌ | ✅ | ⚠️ Via MCP | ❌ | ❌ | ❌ |
| **ACP** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **x402** | ❌ | ⚠️ Via AP2 | ✅ | ❌ | ❌ | ❌ |
| **AP2** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MCP** | ❌ | ⚠️ Transport | ✅ | ⚠️ Studio | ❌ | ❌ |

**Legend:**
- ✅ = Primary/native support
- ⚠️ = Partial/indirect support
- ❌ = Not supported

---

### What you need for each coverage level

**Level 1: ChatGPT Only**
```
Required: ACP
Payment: Stripe
Reach: 800M weekly users
```

**Level 2: ChatGPT + Copilot**
```
Required: ACP (covers both!)
Payment: Stripe
Reach: 900M+ users
```

**Level 3: Google Surfaces (Gemini + AI Mode)**
```
Required: UCP + optional AP2
Payment: Google Pay compatible PSP
Reach: Growing, massive Google distribution
```

**Level 4: ChatGPT + Copilot + Google**
```
Required: ACP + UCP
Payment: Stripe + Google Pay compatible
Reach: Maximum mainstream coverage
```

**Level 5: Add Claude/Developer Tools**
```
Required: ACP + UCP + MCP + x402
Payment: Multi-rail (Stripe + crypto)
Reach: Full coverage including developer tools
```

**Level 6: Full Coverage (minus Amazon)**
```
Required: ACP + UCP + MCP + x402 + Perplexity Merchant Program
Payment: Stripe + PayPal + crypto
Reach: Every reachable AI surface
```

---

## Part 3: Does UCP "Support All"?

### Short Answer: NO

UCP is Google's protocol. It provides:
- Native access to Gemini
- Native access to Google AI Mode
- MCP transport (so Claude CAN access UCP merchants)
- Interoperability with AP2

But UCP does NOT give you:
- ChatGPT access (needs ACP)
- Copilot access (needs ACP)
- Perplexity access (needs their program)
- Amazon access (impossible)

### The "MCP Transport" Nuance

UCP supports MCP as a transport layer:

```
UCP Implementation Options:
├── REST API (most common)
├── MCP (Claude compatible!)
├── A2A (agent-to-agent)
└── Embedded (in-page)
```

This means:
- A merchant implementing UCP with MCP transport CAN be accessed by Claude
- But Claude doesn't have "Instant Checkout" - it would use Computer Use to complete purchases
- This is NOT the same as native ChatGPT Instant Checkout

### The Stripe "Both Sides" Reality

Stripe works with:
- ACP (co-created with OpenAI)
- UCP (endorsed)
- Copilot (integration announced)

So if you use Stripe, you can potentially reach:
- ChatGPT (via ACP/SPT)
- Copilot (via ACP/SPT)
- Google (via UCP, if you implement it)

But you still need separate protocol implementations.

---

## Part 4: Strategic Recommendations

### If you want to reach ALL major AI models:

**Minimum Viable Coverage:**
```
┌────────────────────────────────────────────────┐
│                    Your App                    │
├────────────────────────────────────────────────┤
│         PayOS SDK (unified interface)          │
├──────────┬─────────────┬───────────┬───────────┤
│   ACP    │    UCP      │    MCP    │   x402    │
│(ChatGPT) │  (Gemini)   │  (Claude) │  (APIs)   │
│(Copilot) │ (AI Mode)   │           │           │
├──────────┴─────────────┴───────────┴───────────┤
│              + Perplexity Merchant             │
│              + PayPal integration              │
└────────────────────────────────────────────────┘
```

### Coverage Matrix by Implementation

| Implementation | ChatGPT | Gemini | Copilot | Claude | Perplexity |
|----------------|---------|--------|---------|--------|------------|
| ACP only | ✅ | ❌ | ✅ | ❌ | ❌ |
| UCP only | ❌ | ✅ | ❌ | ⚠️ MCP | ❌ |
| ACP + UCP | ✅ | ✅ | ✅ | ⚠️ MCP | ❌ |
| ACP + UCP + x402 | ✅ | ✅ | ✅ | ✅ | ❌ |
| All + Perplexity | ✅ | ✅ | ✅ | ✅ | ✅ |

### User Demographics by Platform

| Platform | Primary Demographic | Shopping Behavior |
|----------|--------------------|--------------------|
| ChatGPT | Younger, tech-forward | High intent, conversational |
| Gemini | Google users, Android | Search-driven discovery |
| Copilot | Enterprise, Microsoft users | B2B + consumer |
| Claude | Developers, power users | Tool-driven, API-first |
| Perplexity | Research-oriented | Comparison shoppers |
| Amazon | Mass market | Habitual, one-click |

---

## Part 5: PayOS Multi-Platform Value Proposition

### The Problem We Solve

Without PayOS:
```
To reach all platforms, you need:
├── ACP implementation (for ChatGPT + Copilot)
├── UCP implementation (for Gemini)
├── MCP server (for Claude)
├── x402 facilitator (for API monetization)
├── Perplexity Merchant Program enrollment
├── Stripe integration
├── PayPal integration
├── Google Pay compatibility
└── Separate dashboards for each

= Months of work, continuous maintenance
```

With PayOS:
```
Single SDK:
├── PayOS handles protocol routing
├── PayOS handles payment orchestration
├── PayOS provides unified dashboard
├── PayOS adds governance layer
└── PayOS handles settlement

= One integration, all platforms
```

### PayOS Platform Support

| Platform | How PayOS Enables | Value Add |
|----------|------------------|-----------|
| ChatGPT | ACP implementation in SDK | Governance + LATAM settlement |
| Gemini | UCP implementation in SDK | Governance + compliance |
| Copilot | ACP (same as ChatGPT) | Unified analytics |
| Claude | MCP server + x402 facilitator | Tool monetization |
| Perplexity | PayPal integration | Settlement infrastructure |

### Revenue Opportunities

| Platform | Payment Type | PayOS Revenue |
|----------|-------------|---------------|
| ChatGPT | Stripe SPT | Settlement fee |
| Gemini | Google Pay token | Payment handler fee |
| Copilot | Stripe/PayPal | Settlement fee |
| Claude | x402 USDC | Facilitator fee |
| Perplexity | PayPal | Settlement fee |

---

## Appendix: Protocol Relationship Diagram

```
                    ┌─────────────────────┐
                    │     AI PLATFORMS    │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
  ┌──────────┐          ┌──────────┐          ┌──────────┐
  │ ChatGPT  │          │  Gemini  │          │  Claude  │
  │ Copilot  │          │ AI Mode  │          │   Code   │
  └────┬─────┘          └────┬─────┘          └────┬─────┘
       │                     │                     │
       ▼                     ▼                     ▼
  ┌──────────┐          ┌──────────┐          ┌──────────┐
  │   ACP    │          │   UCP    │◄────────►│   MCP    │
  │  Stripe  │          │  Google  │  (MCP    │Anthropic │
  └────┬─────┘          └────┬─────┘ transport)└────┬─────┘
       │                     │                     │
       │                     ▼                     │
       │               ┌──────────┐                │
       │               │   AP2    │                │
       │               │(mandates)│                │
       │               └────┬─────┘                │
       │                    │                      │
       │                    ▼                      │
       │               ┌──────────┐                │
       │               │ A2A x402 │◄───────────────┘
       │               │extension │                
       │               └────┬─────┘                
       │                    │                      
       └────────────────────┼──────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │    x402      │
                    │  (Coinbase)  │
                    └──────────────┘
```

---

## Key Takeaways

1. **UCP does NOT support all AI platforms** - it's Google's protocol for Gemini/AI Mode

2. **ACP is the most broadly adopted** - ChatGPT AND Copilot use it

3. **MCP is a transport layer** - UCP supports it, so Claude CAN access UCP merchants

4. **x402 is orthogonal** - different use case (micropayments/APIs)

5. **Perplexity is custom** - requires their merchant program + PayPal

6. **Amazon is unreachable** - walled garden, no protocol access

7. **To reach ALL platforms** - you need ACP + UCP + MCP + x402 + Perplexity program

8. **PayOS value** - single integration for all protocols + governance + settlement

---

*This document should be updated as protocol adoption evolves.*
