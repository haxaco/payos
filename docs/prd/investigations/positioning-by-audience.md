# Positioning by Audience

**Last Updated:** January 2026  
**Source:** Competitive analysis, market research, strategic planning

---

## Executive Summary

PayOS requires different positioning for different audiences. This document provides messaging frameworks for investors, fintech partners, enterprise customers, and specific verticals.

---

## Core Positioning Statement

> **"We don't care which protocol wins. PayOS makes them all work."**

PayOS is the **protocol-agnostic settlement layer** for agentic commerce in LATAM. We enable fintech partners rather than competing with them.

---

## Positioning by Audience

### For Investors

**The Pitch:**

*"The agentic commerce market is fragmenting across three protocols—x402, AP2, ACP—with no clear winner. Big players (Google, Coinbase, Stripe, Visa, Mastercard) are building protocols, not infrastructure.*

*LATAM represents the highest-growth stablecoin adoption market with superior infrastructure (Pix, SPEI) vs US rails.*

*PayOS is the protocol-agnostic settlement layer for agentic commerce in LATAM:*
- *We don't compete with protocols—we make them all work*
- *We don't compete with fintech partners—we enable them*
- *12 months runway before Mastercard Agent Pay launches in region*

*Crossmint raised $23.6M to be the wallet. Skyfire raised $9.5M to be the network. We're raising to be the settlement layer that powers both."*

**Key Messages:**
1. Protocol fragmentation creates infrastructure opportunity
2. LATAM timing advantage (12 months before Mastercard)
3. Partner-enabling model vs competitor-creating
4. Circle CPN integration as technical moat

**Objection Handling:**

| Objection | Response |
|-----------|----------|
| "Crossmint has $23M" | "They compete with their customers. We enable them." |
| "Why LATAM?" | "Superior rails (Pix/SPEI), highest stablecoin growth, 12-month window" |
| "Protocol risk?" | "That's why protocol-agnostic. We don't bet on a winner." |
| "How defensible?" | "Circle CPN integration, regulatory expertise, partner relationships" |

---

### For Fintech Partners

**The Pitch:**

*"Your customers will use AI agents speaking x402, AP2, ACP, Mastercard Agent Pay, or whatever comes next. You shouldn't bet on which wins, and you shouldn't hand your customers to Crossmint.*

*PayOS normalizes all protocols to reliable settlement—stablecoin or local currency—with native Pix and SPEI integration no one else has built.*

*You keep your brand, customer relationship, UX. We handle agentic commerce plumbing."*

**Key Messages:**
1. Keep customer relationships (anti-Crossmint)
2. Protocol-agnostic future-proofing
3. Native LATAM rails ready today
4. White-label, invisible infrastructure

**Value Proposition Table:**

| Partner Concern | PayOS Answer |
|-----------------|--------------|
| "Don't want to lose customers" | True white-label, you own the relationship |
| "Which protocol to support?" | Support all of them through PayOS |
| "Settlement speed" | Pix: <10 sec, SPEI: <30 sec |
| "Integration complexity" | Single API, multiple protocols |
| "Compliance burden" | We handle corridor-specific requirements |

---

### For Enterprise Fintechs

**Hook:** *"Don't bet on a standard—support all of them."*

**The Pitch:**

*"Your compliance team doesn't want to evaluate three different payment protocols. Your engineering team doesn't want to integrate three different APIs. Your treasury team doesn't want to manage three different settlement flows.*

*PayOS abstracts protocol complexity into a single settlement layer. Support x402, AP2, and ACP today—and whatever emerges tomorrow—through one integration.*

*Future-proof your agentic commerce strategy."*

**Key Messages:**
1. Reduce protocol evaluation burden
2. Single integration for all protocols
3. Enterprise compliance features built-in
4. Treasury management included

**Enterprise Features:**
- SOC-2 compliance (via Circle)
- Multi-level approval workflows
- Audit logging and reporting
- Role-based access control
- SSO/OAuth integration

---

### For Growth-Stage Fintechs

**Hook:** *"Go live in Brazil and Mexico in weeks, not months."*

**The Pitch:**

*"You've validated your model. Now you need to scale cross-border.*

*Building Pix integration takes 6-9 months. Building SPEI takes 4-6 months. Managing both takes a dedicated team.*

*PayOS gives you native Pix and SPEI settlement in weeks. Instant settlement, sub-1% fees, zero float required.*

*Focus on your product. We handle the plumbing."*

**Key Messages:**
1. Speed to market in LATAM
2. No float/prefunding requirements
3. Sub-1% fees vs 3-5% traditional
4. Technical resources stay focused on core product

**Time-to-Market Comparison:**

| Approach | Timeline | Cost |
|----------|----------|------|
| Build Pix directly | 6-9 months | $200K+ engineering |
| Build SPEI directly | 4-6 months | $150K+ engineering |
| Via banking partner | 3-6 months | Ongoing fees + float |
| **Via PayOS** | **2-4 weeks** | **Transaction fees only** |

---

### For Remittance Companies

**Hook:** *"Your agents can initiate cross-border payouts at 1/5 the cost."*

**The Pitch:**

*"Traditional remittance costs 5-7% per transaction. Your margins are squeezed. Your customers deserve better.*

*PayOS enables stablecoin-powered remittance with:*
- *0.35-1.3% total cost*
- *Instant settlement via Pix/SPEI*
- *AI agent initiation (agentic remittance)*
- *Full regulatory compliance*

*Same corridors, 5x better economics."*

**Key Messages:**
1. Dramatic cost reduction (5x better)
2. Instant vs 2-3 day settlement
3. Agentic-ready for future
4. Compliance handled

**Unit Economics Comparison:**

| Cost Component | Traditional | PayOS |
|----------------|-------------|-------|
| FX Spread | 2-4% | 0.35-0.5% |
| Settlement fee | 1-2% | 0.15-0.65% |
| Compliance | 0.5-1% | Included |
| Float cost | 0.5-1% | Zero |
| **Total** | **5-7%** | **0.5-1.3%** |

---

### For Procurement AI Platforms

**Hook:** *"Your agent negotiates. Ours settles."*

**The Pitch:**

*"Your AI negotiates million-dollar contracts. It sources suppliers. It enforces compliance.*

*But when it's time to pay, the workflow breaks. A human has to step in, initiate a wire, wait 2-3 days.*

*PayOS completes the loop. When your agent approves a payment, we settle it—instantly, in the supplier's currency, with full audit trail.*

*Source to pay. Actually to pay."*

**Key Messages:**
1. Complete the agentic workflow
2. Native integration with procurement platforms
3. Multi-currency settlement
4. ERP-ready reconciliation

**Integration Model:**

```
Your Platform                    PayOS
     │                             │
     │ Agent approves payment      │
     │────────────────────────────>│
     │                             │ Validates
     │                             │ Converts FX
     │                             │ Settles via Pix/SPEI
     │                             │
     │ Webhook: payment complete   │
     │<────────────────────────────│
     │                             │
     │ ERP reconciliation data     │
     │<────────────────────────────│
```

---

### For Agent Platform Providers (LangChain, Claude, etc.)

**Hook:** *"Payment tools for your agents."*

**The Pitch:**

*"Your agents can reason, plan, and execute. But they can't move money.*

*PayOS provides MCP-compatible payment tools:*
- *Quote FX rates*
- *Initiate settlements*
- *Check payment status*
- *Manage escrow*

*Add financial agency to your agents with a single integration."*

**Key Messages:**
1. MCP server ready for Claude
2. LangChain tools available
3. OpenAPI for function calling
4. Sandbox for testing

**Tool Capabilities:**

| Tool | Description |
|------|-------------|
| `payos_quote` | Get FX quote for settlement |
| `payos_settle` | Initiate settlement |
| `payos_status` | Check settlement status |
| `payos_escrow_create` | Create milestone escrow |
| `payos_escrow_release` | Release escrow milestone |

---

## Objection Handling Matrix

| Objection | Response |
|-----------|----------|
| "Why not just use Crossmint?" | Crossmint competes with you. We enable you. |
| "Skyfire has agent identity" | We integrate with KYA. And we settle payments. |
| "Gr4vy does orchestration" | They're card-centric. We're stablecoin-native with local rails. |
| "Why do we need another layer?" | Protocols multiply, settlement converges. We handle the complexity. |
| "What about regulatory risk?" | We've mapped Brazil/Mexico requirements. Partners bring accounts, we provide rails. |
| "Is stablecoin adoption real?" | $1B+ processed in Brazil by Rezolve. Pix is 70%+ of digital payments. |
| "What if protocols consolidate?" | Then you'll want the partner who supported them all. |

---

## Competitive Positioning Statements

### vs Crossmint
*"Crossmint wants to own your customer's wallet. PayOS wants to power your settlement. We never compete with partners."*

### vs Skyfire
*"Skyfire does identity. We do settlement. They're single-protocol. We're protocol-agnostic. They have no LATAM rails. We have native Pix and SPEI."*

### vs Gr4vy
*"Gr4vy is adding agentic to card orchestration. PayOS is building settlement for the agentic era. They route to PSPs. We settle in stablecoins and local currency."*

### vs Direct Protocol Integration
*"You could integrate x402, AP2, and ACP separately. Or you could integrate PayOS once and support them all—plus whatever comes next."*

---

## Messaging Do's and Don'ts

### Do:
- Lead with partner-enabling model
- Emphasize protocol-agnostic approach
- Quantify LATAM advantage (12-month window)
- Use specific numbers (sub-1%, <10 seconds)
- Address competitor tensions directly

### Don't:
- Bash competitors too aggressively
- Oversell protocol support before built
- Ignore regulatory complexity
- Promise features not in PRD
- Use jargon without explanation

---

## Sources

- Competitive analysis documentation
- PayOS PRD v1.16 (Master)
- Market research
- Pricing and economics analysis
