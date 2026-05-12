# Sly Marketplaces — Platform Strategy

**Status:** Draft v0.1 — May 2026
**Owner:** Diego (haxaco@gmail.com)
**Companion docs:** `docs/prd/PayOS_PRD_Master.md`, Working Paper III (CAI), Epic 73 (KYA), Epic 84 (Cross-Marketplace Publishing)
**Source:** Conversations with ZeroDev (May 2026) plus internal product strategy thread.

---

## Why this doc exists

Sly's identity layer (KYA + ERC-8004 NFTs + Reputation Registry + agent wallets) is the differentiated piece of the platform. The `agentbazaar` runtime — a marketplace builder running on top of Sly — is currently the most visible showcase for that identity layer, but it has only ever been demonstrated as a **single global marketplace**.

Conversations with prospective design partners (notably ZeroDev) keep arriving at the same question: *"if Sly is the trust layer, who runs the marketplaces? Could every Sly tenant run one?"* The natural answer is **yes** — and the platform implications of that answer are large enough that they need first-class structural treatment, not just a demo extension.

This document is the source of truth for that work. It:

1. Defines **marketplaces as first-class platform entities** (parallel to accounts and agents)
2. Introduces **KYM — Know Your Marketplace** — a marketplace trust layer mirroring KYA
3. Specifies the **discovery layer** (per-marketplace + cross-marketplace directory)
4. Describes the **white-label / managed runtime offering** for customers who want to host their own marketplace
5. Sets the structural foundation for later **federation** between marketplaces

It explicitly **does not** propose federation as the wedge. The wedge is portable agentic identity. Federation is a second-order consequence of identity portability + a directory; it is not the product.

---

## Working name convention

The umbrella product is **Sly Marketplaces**. Vertical placeholders use descriptive labels — "Services Marketplace", "Travel Marketplace", "Compute Marketplace" — until real partner verticals lock in branding. (Earlier internal docs used `Coral Marketplace`; that name is dropped because it collides with Cohere's Coral product family.)

---

## Vision

### The two-primitive bet

| Primitive | What it is | Status today |
|---|---|---|
| **KYA** — Know Your Agent | Tiered (T0-T3) trust layer for AI agents. Identity, spending limits, reputation, ERC-8004 NFT, KYA framework attestations. | Shipped (Epic 73, Epic 3, Epic 63) |
| **KYM** — Know Your Marketplace | Tiered (T0-T3) trust layer for **marketplaces themselves**. Marketplace identity, KYM-tier verification, on-chain proof, reputation visible cross-platform. | Proposed (this doc → Epic 87) |

These are symmetric. The same logic that justifies tier-gating an agent's spend ("this agent has earned the right to spend $X") justifies tier-gating a marketplace's reach ("this marketplace has earned the right to be discovered by external agents and to receive cross-tenant traffic").

The combination — **KYA + KYM** — is the platform claim that nobody else in the agentic-commerce space currently has. Not GPT Store (operator-attested only). Not Hugging Face (no commerce identity). Not Bittensor (token-staked, not tiered). Not the A2A protocol on its own (no trust layer specified). Sly + ERC-8004 + the discovery layer is genuinely new product space.

### The directory becomes the product

When marketplaces are first-class entities with their own KYM tier and on-chain identity, **the cross-marketplace directory becomes Sly's most valuable product surface**. It is:

- Where AI agents discover where they can trade (identity-first cross-marketplace search)
- Where marketplace operators advertise their KYM tier and reputation
- Where ZeroDev / Coinbase / partner platforms can plug in as syndication targets
- The natural home for the MCP server registry (each marketplace becomes addressable by Claude / Cursor / ChatGPT directly)

The directory is also a defensible network effect: more marketplaces ↔ more agents discoverable ↔ more reason for operators to register ↔ more value to agents.

---

## What we're offering customers

Two delivery modes for "every Sly tenant hosts a marketplace":

### Managed (default)

The customer signs up, fills in:
- Marketplace name, slug, vertical, branding (logo + accent color)
- Custom domain (optional) — `<slug>.sly.market` or `marketplace.<customer-domain>`
- Requested KYM tier (T1+ requires verification flow)
- Allowlists (KYA-tier minimum for participating agents, allowed protocols)
- Settlement preferences (x402 facilitator, AP2 mandates, ACP/UCP catalogs)
- Visibility (public in Explorer, unlisted, or private)

Sly provisions:
- A managed marketplace runtime instance (multi-tenant deploy of the agentbazaar-style runtime)
- The marketplace's `/.well-known/sly-marketplace.json` Card
- REST + MCP discovery endpoints for the marketplace
- A branded viewer UI (Sly-hosted at the configured domain)
- The Settlements + KYM dashboard inside Sly Console
- An on-chain MarketplaceRegistry NFT mint (proof of marketplace identity)

The customer adds agents (via `/join`, API, or BYO), defines skills/endpoints, optionally federates with peer marketplaces.

### Self-hosted

The customer deploys the open-source agentbazaar runtime on their own infrastructure. Sly provides the trust layer (KYA, KYM, settlement notarization, reputation, ERC-8004 minting) via SDK. Sly does not run the marketplace runtime; it runs the trust layer that the runtime calls.

This mode mirrors how Stripe customers run their own storefronts on Shopify/custom while Stripe runs payments — the platform is the trust layer, not the storefront.

### Pricing surfaces

Three independent revenue surfaces:

1. **KYM tier subscription** — T0 free; T1 $X/month; T2 $$X/month + verification fee; T3 enterprise contracted
2. **Settlement bps** — basis points on x402 facilitator throughput (and optionally AP2/ACP/UCP equivalents)
3. **Per-agent registration** — free up to N agents per marketplace; per-seat above

(All numbers placeholder; pricing model to be set with finance.)

---

## Competitive landscape

Grouped by pattern, not vendor:

### Centralized SaaS catalogs
GPT Store, Hugging Face Spaces, Salesforce Agentforce, Cohere Coral, Replit Bounties.
**Strengths:** discovery solved, brand trust borrowed from host.
**Misses:** identity is operator-attested only (not portable), settlement opaque, no on-chain proof, agents can't move between hosts.

### Decentralized networks with native tokens
Bittensor (subnets, TAO), Akash, Render, Olas (autonomous services), Fetch.AI/ASI Alliance, Virtuals Protocol.
**Strengths:** real on-chain reputation, native settlement, no central operator risk.
**Misses:** token complexity is a UX barrier; mostly compute/inference (not commerce); no consumer story.

### Open protocols (no marketplace yet)
A2A Agent Cards (Anthropic + Google), AP2 mandates, MCP server registries (Smithery, mcp.run), Visa VIC, Mastercard Agent Pay, Coinbase x402.
**Strengths:** standards-track; Sly already builds on these.
**Misses:** protocols don't ship marketplaces by themselves. Someone has to be the first to operate one credibly with these standards. That's the wedge.

### Enterprise B2B agent platforms
Sierra AI, Adept, Microsoft Copilot Studio, Salesforce Agentforce.
**Strengths:** real money, real customers, regulated.
**Misses:** closed walled gardens. Agents are bound to one platform. No inter-vendor portability. No on-chain identity.

### Where Sly fits

The white space is an **open trust layer (KYA + KYM + ERC-8004) that any marketplace operator can plug into**, with identity portable across them and settlement universal via x402 (and the other Sly-supported protocols). Nobody currently does this with the symmetry of KYA + KYM and on-chain proof.

---

## Phased build

Six phases. Each phase ships a complete artifact.

### P1 — Marketplaces as first-class entities + tagged runtime

**(Epic 86)** The `marketplaces` table, ownership, branding, slug. Agents tagged with `marketplaces[]`. The agentbazaar runtime filters its viewer by `?mkt=<id>`. Same agent visibly active in multiple marketplace contexts. **This phase alone is the demoable artifact for "agentic identity is portable across marketplaces."**

### P2 — KYM trust layer

**(Epic 87)** KYM tier model (T0-T3) mirroring KYA. Verification flow for T1+ marketplace operators. KYM checks gate cross-marketplace traffic and Explorer visibility.

### P3 — MarketplaceRegistry on-chain

**(Epic 88)** `MarketplaceRegistry` smart contract on Base Sepolia → mainnet. Each marketplace mints an NFT carrying its identity, KYM tier, and discovery URL. Reputation aggregates on-chain.

### P4 — Marketplace Discovery API + Card

**(Epic 89)** Per-marketplace REST: `/v1/marketplaces/:id/{agents,endpoints,activity,stats}`. Public Card at `/.well-known/sly-marketplace.json` with metadata + signature. MCP server auto-generated per marketplace (so Claude / Cursor / ChatGPT can address marketplaces directly).

### P5 — Marketplace Explorer UI

**(Epic 90)** Cross-marketplace directory. Public web view (e.g. `getsly.ai/marketplaces`) listing every KYM-tiered marketplace, filterable by vertical, KYM tier, volume, agent count. Identity-first cross-search ("show me agent #247 across all marketplaces"). Auth-gated management surface inside `apps/web`.

### P6 — Managed Marketplace Runtime

**(Epic 91)** Multi-tenant deployment of the agentbazaar runtime. Customers configure once; Sly provisions the marketplace, viewer, dashboard, on-chain mint. Self-hosted variant via SDK + open-source repo. Federation between marketplaces falls out of the discovery layer for free.

---

## Out of scope (for now)

These are intentionally deferred — most are valuable but compete for engineering time with the structural primitives above.

- **Federated trade as the headline feature.** Federation is a consequence of the directory + KYM, not a separate product. We will not build a "federated trade scenario" in isolation.
- **Cross-marketplace dispute resolution + refund flows.** Real B2B work; comes after KYM T2 customers exist.
- **Marketplace token economy.** No native marketplace token. Settlement is USDC via x402 unless explicitly extended.
- **Operator marketplace governance (DAO-style).** Not on roadmap.
- **Search ranking / SEO across marketplaces.** Phase post-Explorer.
- **Compliance-grade KYM (FATF/AML).** Light KYB-style verification only at T2; fuller compliance is an enterprise concern.

---

## Adjacent work (the 5 alternatives)

During the strategy thread we identified five alternative artifacts that show "the power of agentic identity" *without* requiring federation. They live at the agentbazaar/runtime level (not the platform level), so they are tracked as Epics 92-96 and indexed in `agentbazaar/docs/ROADMAP.md`:

- **Epic 92** — Score-Gated x402 Endpoints (price by composite identity score)
- **Epic 93** — Reputation Receipts (on-chain attestations per task)
- **Epic 94** — Identity Badge SDK (drop-in agent identity for any host app)
- **Epic 95** — Agent FICO for B2B (underwriting + credit lines for AI agents)
- **Epic 96** — ZeroDev Kernel Integration (Sly identity in ZeroDev smart accounts)

Each is independently shippable and amplifies the identity-first product story. They do not block the marketplaces work but should be sequenced to land alongside or shortly after P1-P3.

---

## Source for epic decomposition

Each phase above maps 1:1 to a Sly platform epic in `docs/prd/epics/epic-NN-*.md`. The story-level decomposition (points, dependencies, SDK impact) lives in the epic files. This strategy doc is the *why*; the epics are the *what* and *how*.

When new partner conversations (ZeroDev, Coinbase, others) shift the priority order, the change goes here first, then propagates to the affected epics.
