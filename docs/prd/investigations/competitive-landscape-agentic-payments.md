# Competitive Landscape: Agentic Payments Market

**Last Updated:** January 2026  
**Source:** Market research, web search, PRD v1.16

---

## Executive Summary

The agentic payments market is fragmenting across three major protocols (x402, AP2, ACP) with no clear winner. Big players (Google, Coinbase, Stripe, Visa, Mastercard) are building protocols, not infrastructure. This creates an opportunity for PayOS as a **protocol-agnostic settlement layer** that makes all protocols work.

---

## Direct Competitors

### Crossmint
| Attribute | Details |
|-----------|---------|
| **Funding** | $23.6M Series A (March 2025) |
| **Lead Investors** | Ribbit Capital, Franklin Templeton, Nyca Partners, First Round |
| **Focus** | Multi-protocol wallets, stablecoin infrastructure |
| **Revenue Model** | Subscription + per-transaction fees |
| **Pricing** | Wallets: $0.05/MAW, Minting: $0.01/action, Payments: user-paid convenience fees |
| **Customers** | 40,000+ developers. Enterprise: MoneyGram, Adidas, Red Bull, Microsoft, Mastercard |
| **Fintech Customers** | WireX (treasury wallets), Toku (payroll), Ruvo (Brazil USD/crypto), Kasi Money (remittances) |
| **Protocol Support** | x402 native, AP2 claimed, 15+ blockchains |
| **LATAM Presence** | Minimal (only Ruvo in Brazil) |

**What They Don't Do:**
- No native Pix/SPEI settlement
- Competes with partners by owning end-customer wallet relationship
- No white-label model (Crossmint branding visible)

**Key Tension:** Crossmint wants to BE the wallet. When MoneyGram uses Crossmint, MoneyGram's customers become Crossmint's customers too.

---

### Skyfire
| Attribute | Details |
|-----------|---------|
| **Funding** | $9.5M Seed (October 2024) |
| **Focus** | Agent identity (KYA), payment network |
| **Revenue Model** | 2-3% per transaction, future KYA verification services |
| **Customers** | Mostly partnerships, few paying customers yet |
| **Launch Partners** | Cequence (API security, 8B+ daily interactions), Forter (fraud), DataDome (bot mgmt), Ory (identity), Akamai |
| **Data Partners** | Pricing Culture, Bazaars, Zinc, Linkup |
| **Key Partnership** | Visa (Trusted Agent Protocol) |
| **Protocol Support** | KYA/x402 only |
| **LATAM Presence** | None |

**What They Don't Do:**
- No AP2, no ACP, no Mastercard Agent Pay support
- No settlement infrastructure
- No white-label
- No multi-protocol orchestration
- No local rails integration

**CEO Quote:** "B2B payments are probably the most predictable. A lot of them have very predictable patterns in terms of what's being bought on a monthly basis."

---

### Gr4vy
| Attribute | Details |
|-----------|---------|
| **Funding** | ~$30M raised |
| **Focus** | Traditional payment orchestration adding agentic capabilities |
| **Revenue Model** | SaaS subscription + revenue share on value-added services |
| **Customers** | TUI Group (1,200 travel agencies, 5 airlines), Datalex (exclusive airline partnership for DLX Pay), Retail inMotion |
| **Payment Partners** | EBANX (LATAM access for Shein, Amazon, Shopee, Uber), Boku, Payplug, Mastercard tokenization |
| **Key Development** | Google AP2 collaboration, building MCP integration |
| **Protocol Support** | AP2 (alpha), MCP integration in development |
| **LATAM Presence** | Indirect via EBANX partnership |

**What They Don't Do:**
- Card-centric, not stablecoin-native
- No x402 facilitator
- Merchant-focused, not fintech-focused
- No native local rail integration

---

### Other Players

| Company | Funding | Focus | Gap |
|---------|---------|-------|-----|
| **Kite** | $33M | L1 chain for agent payments | No local rails, chain-only |
| **Natural** | $9.8M | B2B agentic workflows | No LATAM focus, no settlement |

---

## Protocol Owners (Define Playing Field)

These companies build the protocols but NOT the settlement infrastructure:

| Protocol | Owner | Focus | Settlement Method | Status |
|----------|-------|-------|-------------------|--------|
| **x402** | Coinbase/Cloudflare | Micropayments, API monetization | Stablecoin (USDC on Base) | Production |
| **AP2** | Google (60+ partners) | Agent authorization, mandates | Multi-rail (cards, banks, x402) | Production |
| **ACP** | Stripe/OpenAI | Consumer checkout, e-commerce | SharedPaymentToken | Production |
| **Trusted Agent** | Visa | Agent tokenization | Network tokens | Production |
| **Agent Pay** | Mastercard | Agentic commerce tokens | Agentic Tokens | Launching LATAM/Caribbean 2026 |

**Key Insight:** AP2 includes x402 as a crypto payment extension. ACP is the Stripe/OpenAI alternative. All three need a settlement layer for non-US markets.

### Mastercard Agent Pay LATAM Launch Partners (2026)
- Bemobi
- Checkout.com
- Davivienda
- Evertec
- Getnet
- MagaluPay
- Yuno

**Strategic Implication:** 12+ month window before Mastercard Agent Pay becomes mainstream in LATAM.

---

## Competitive Feature Matrix

| Feature | Crossmint | Skyfire | Gr4vy | PayOS |
|---------|-----------|---------|-------|-------|
| x402 Support | ✅ Native | ✅ | ❌ | ✅ |
| AP2 Support | ⚠️ Claimed | ❌ | ⚠️ Alpha | ✅ |
| ACP Support | ❌ | ❌ | ❌ | ✅ |
| Multi-Protocol | ⚠️ Partial | ❌ Single | ⚠️ Partial | ✅ Full |
| Native Pix (Brazil) | ❌ | ❌ | ❌ | ✅ |
| Native SPEI (Mexico) | ❌ | ❌ | ❌ | ✅ |
| White-Label | ❌ | ❌ | ⚠️ Partial | ✅ |
| KYA/Agent Identity | ✅ | ✅ Native | ❌ | ✅ |
| Settlement Layer | ⚠️ Basic | ❌ | ⚠️ Cards | ✅ Full |
| B2B Focus | ⚠️ | ⚠️ | ✅ | ✅ |
| Partner-Enabling | ❌ Competes | ❌ | ⚠️ | ✅ |

---

## Revenue Model Comparison

| Company | Transaction Fee | Subscription | Other |
|---------|-----------------|--------------|-------|
| **Crossmint** | User-paid convenience | $0.05/MAW | Minting $0.01/action |
| **Skyfire** | 2-3% | - | Future KYA fees |
| **Gr4vy** | Revenue share | SaaS | Fraud prevention |
| **PayOS** | 0.15-0.65% | $449-10K/mo | FX spread, yield, compliance |

---

## Strategic Gaps to Exploit

1. **Crossmint competes with partners** — wants end-customer wallet relationship
2. **Skyfire is single-protocol** — no AP2, ACP, Mastercard Agent Pay support
3. **Gr4vy is card-centric** — adding agentic on top of traditional orchestration
4. **No one has LATAM settlement depth** — 12+ month head start before Mastercard
5. **No one positioning for B2B agentic payouts** — focus is consumer shopping

---

## PayOS Positioning

> **"We don't care which protocol wins. PayOS makes them all work."**

From PRD v1.14:
- Multi-protocol: Not betting on one winner (x402 vs AP2 vs ACP)
- Native LATAM settlement: Circle's Pix/SPEI = 12-month head start
- Partner-enabling: White-label infrastructure, don't compete
- Both B2B and agentic: Revenue today, positioned for tomorrow

---

## Sources

- CB Insights Crossmint profile
- Crossmint Series A announcement (July 2025)
- Skyfire seed announcement (October 2024)
- Gr4vy press releases and partnerships
- Mastercard Agent Pay LATAM announcement
- PayOS PRD v1.16 (Master)
