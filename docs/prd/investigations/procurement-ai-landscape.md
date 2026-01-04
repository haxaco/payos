# Procurement AI Landscape

**Last Updated:** January 2026  
**Source:** Market research, funding announcements, competitive analysis

---

## Executive Summary

The agentic procurement market has raised €31M+ in 2025 across European startups. Every single player stops before payment settlement. This creates a strategic opportunity for PayOS to become the **settlement layer for procurement AI** — completing the workflow that these platforms start.

---

## The Gap: Payment is Missing

```
PROCUREMENT WORKFLOW:

1. DISCOVERY & SOURCING          → Mercanis, Matchory, Nvelop
   Find suppliers, compare options

2. NEGOTIATION                   → Monq
   Negotiate terms, pricing, contracts

3. CONTRACT EXECUTION            → Magentic
   Monitor compliance, enforce terms

4. PURCHASE ORDER                → SAP Ariba, Coupa (legacy)
   Generate PO, get approvals

5. INVOICE MATCHING              → Bill.com, Tipalti (legacy)
   Match invoice to PO, approve

6. PAYMENT & SETTLEMENT          → ??? <-- THE GAP
   Move money, settle in local currency

7. RECONCILIATION                → ERP systems
   Close the loop, update ledgers
```

**No one is building agentic payment and settlement for procurement.**

---

## Key Players

### Monq (Strategic Negotiation)

| Attribute | Details |
|-----------|---------|
| **Funding** | €2.5M pre-seed (November 2025) |
| **Lead Investor** | Outward VC |
| **Other Investors** | Cornerstone VC, Portfolio Ventures, Octopus Ventures, Endurance Ventures, Lakestar Halo |
| **Founded** | April 2025 |
| **HQ** | London, UK |
| **Founders** | Yasin Bostancı (ex-Revolut CEO Office), Duygu Gözeler Porchet (ex-Deutsche Bank, HSBC) |

**Focus:** AI-driven strategic negotiation for high-value contracts ($1M-$100M+)

**Capabilities:**
- Multi-agent AI combining LLM reasoning, contract intelligence, behavioral science
- Simulates counterparty moves
- Recommends negotiation levers
- Can autonomously negotiate deals end-to-end (when authorized)

**Results Claimed:**
- Up to 40% cost savings
- 5x faster deal cycles
- Millions in hidden value unlocked

**Pilot Customers:**
- FTSE-listed manufacturers
- Global healthcare groups
- Ennovi (Singapore automotive tech)

**Revenue Model:** Subscription at launch, exploring value-based pricing (% of savings)

**What They DON'T Do:** Payment, settlement, treasury management

---

### Mercanis (Full Procurement Suite)

| Attribute | Details |
|-----------|---------|
| **Funding** | €17.3M Series A (June 2025) |
| **Lead Investors** | Partech, AVP |
| **Other Investors** | Signals.VC, Capmont Technology, Speedinvest |
| **Angels** | Dr. Ulrich Piepel, Dr. Marcell Vollmer, Mirko Novakovic (Instana), Victor Jacobsson (Klarna) |
| **Founded** | 2020 |
| **HQ** | Berlin, Germany |
| **Founders** | Fabian Heinrich (CEO), Moritz Weiermann |
| **Team Size** | 40+ |

**Focus:** Agentic AI Procurement Suite — sourcing, supplier management, contracts

**Platform Modules:**
- Spend Analytics
- Sourcing & RFx
- Supplier Relationship Management (SRM)
- Contract Management
- Mercu AI Co-Pilot (automation)

**Results Claimed:**
- 40%+ process savings
- 2.5x efficiency increase
- 12x ROI

**Enterprise Customers:**
- BASF-Coatings
- GASAG
- Goldbeck
- Wilson
- Brose

**What They DON'T Do:** Payment execution, settlement, treasury

---

### Magentic (Contract Enforcement)

| Attribute | Details |
|-----------|---------|
| **Funding** | €4.6M (~$5.5M) |
| **HQ** | London, UK |
| **Focus** | AI teammates for supply chain/procurement |

**Capabilities:**
- Autonomous use of existing company software
- Responds to emails automatically
- Processes thousands of files simultaneously
- Contract enforcement and compliance
- Root cause analysis

**Use Case Example (Fortune 500 Manufacturer):**
- 25% of supplier documents had errors/opportunities
- Found payment term issues, missing contract clauses
- Identified missed volume discounts, inflation adjustments
- Completed months of work in days

**Revenue Model:** Pay-per-cure (pay only for value gained)

**What They DON'T Do:** Payment execution

---

### Nvelop (Enterprise Sourcing)

| Attribute | Details |
|-----------|---------|
| **Funding** | €1.2M |
| **HQ** | Helsinki, Finland |
| **Focus** | Enterprise sourcing via agentic AI |

**What They DON'T Do:** Payment, settlement

---

### Matchory (Supplier Discovery)

| Attribute | Details |
|-----------|---------|
| **Funding** | €6M |
| **HQ** | Germany |
| **Focus** | AI-based supplier data platform |

**What They DON'T Do:** Payment, settlement

---

## Market Size & Validation

### Total Addressable Market
- Global procurement market: $10.4 trillion
- Procurement automation software: $5 billion (2025), growing to $10-15B by 2035 (8% CAGR)
- $100 billion lost annually to slow, manual procurement processes

### European ProcureTech Funding (2025)
| Company | Amount | Focus |
|---------|--------|-------|
| Mercanis | €17.3M | Full suite |
| Matchory | €6M | Supplier data |
| Magentic | €4.6M | Contract enforcement |
| Monq | €2.5M | Negotiation |
| Nvelop | €1.2M | Sourcing |
| **TOTAL** | **~€31M** | **All stop before payment** |

### Industry Analyst Validation
- BCG: AI can streamline manual procurement work by up to 30%, reduce costs 15-45%
- McKinsey: Autonomous category agents achieve 15-30% efficiency improvements
- KPMG: 85% of executives cite data quality as biggest AI challenge in 2025

---

## Alibaba/JPMorgan Validation

**Agentic Pay** (launching December 2025):
- Blockchain-based B2B payment system
- Uses deposit tokens (stablecoin-like)
- JPMorgan tokenization infrastructure
- AI converts chat conversations into enforceable contracts
- Near-instant cross-border USD/EUR settlement

**Key Quote:** "Agentic Pay uses AI to turn chats into contracts, streamlining negotiations and payments."

**Implication:** Major players validating the procurement → payment automation thesis.

---

## PayOS Opportunity

### Integration Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROCUREMENT AI LAYER                             │
│                                                                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐         │
│  │  Monq   │    │Mercanis │    │Magentic │    │  SAP    │         │
│  │(Negot.) │    │(Source) │    │(Comply) │    │ Ariba   │         │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘         │
│       │              │              │              │               │
│       └──────────────┴──────────────┴──────────────┘               │
│                              │                                     │
│                    ┌─────────▼─────────┐                           │
│                    │   PayOS API       │                           │
│                    │                   │                           │
│                    │ • Payment Trigger │                           │
│                    │ • Approval Flow   │                           │
│                    │ • Escrow Logic    │                           │
│                    └─────────┬─────────┘                           │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
                      SETTLEMENT RAILS
                 (Pix, SPEI, USDC, SEPA)
```

### Value Proposition

**For Monq:** *"Your agent negotiates the deal. Ours settles it."*

**For Mercanis:** *"Source to pay, actually to pay — not just to PO."*

**For Enterprises:** *"Complete the agentic procurement loop with instant settlement."*

### Revenue Streams

| Stream | Mechanism | Rate |
|--------|-----------|------|
| Settlement fee | Per transaction | 0.5-1.0% |
| FX conversion | Spread on currency | 0.3-0.5% |
| Escrow services | Milestone payments | 0.5-2.0% |
| Treasury yield | Float management | Share of 6% APY |

---

## Partnership Strategy

### Phase 1: Integration Partnerships
- Approach Monq, Mercanis, Magentic as integration partners
- Build native integrations into their platforms
- Revenue share model

### Phase 2: Joint Go-to-Market
- Co-sell to their enterprise customers
- Combined "Source to Settlement" pitch
- Shared case studies

### Phase 3: Ecosystem Play
- Become default settlement layer for procurement AI
- Add SAP Ariba, Coupa integrations
- ERP connectors (NetSuite, QuickBooks)

---

## Key Contacts to Research

- **Monq:** Yasin Bostancı (CEO), Duygu Gözeler Porchet (Co-founder)
- **Mercanis:** Fabian Heinrich (CEO), Moritz Weiermann (Co-founder)
- **Magentic:** Leadership TBD
- **Ennovi:** Georgie Fu (Sr. Director Category Management) — Monq design partner

---

## Sources

- EU-Startups: Monq funding announcement (November 2025)
- EU-Startups: Mercanis Series A (June 2025)
- Tech.eu, TechFundingNews coverage
- Magentic launch announcement
- Mercanis blog on agentic procurement
- Alibaba/JPMorgan Agentic Pay announcements (CNBC, November 2025)
