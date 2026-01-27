# PayOS Sales Playbook: Challenging Questions & Answers

**Version:** 1.2  
**Date:** January 18, 2026  
**Purpose:** Objection handling for sales conversations

---

## Positioning Principle

PayOS is **ONE platform** with capabilities that customers use in different proportions:

```
                    ┌─────────────────────────────────────────┐
                    │              PayOS                      │
                    │                                         │
                    │   Protocol Orchestration (ALL)          │
                    │   Governance Layer (ALL)                │
                    │   Bidirectional Settlement (ALL)        │
                    │                                         │
                    └─────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │  Merchant-Heavy │    │    Balanced     │    │ Enterprise-Heavy│
    │                 │    │                 │    │                 │
    │ • Receive focus │    │ • Both flows    │    │ • Send focus    │
    │ • Light govern. │    │ • Full govern.  │    │ • Heavy govern. │
    │ • Analytics     │    │ • Analytics +   │    │ • Compliance    │
    │                 │    │   Compliance    │    │                 │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
    
    Examples:           Examples:              Examples:
    • D2C brand         • Marketplace          • F500 procurement
    • SaaS product      • Fintech platform     • AI-native startup
    • Content creator   • B2B2C company        • Autonomous ops
```

**Key message:** Every customer gets the full platform. They use what they need.

---

## Part 1: Universal Questions (Apply to Everyone)

These questions come from ANY customer—merchant, enterprise, or hybrid.

---

### Q1: "Why not just use Stripe?"

**Who asks:** Everyone (Stripe is the default)

**The Challenge:** Stripe is trusted, ubiquitous, and co-created ACP.

**PayOS Answer:**
> "Stripe is excellent—and if ACP is all you need, they're a great choice. But Stripe only covers ACP (ChatGPT, Copilot). They don't support UCP (Gemini), MCP (Claude), or x402 (APIs and micropayments). 
>
> If you're receiving payments, you're missing customers on Gemini and Claude. If you're making payments, your agents can only transact with ACP merchants—not the full ecosystem.
>
> We're not replacing Stripe. Many of our customers use Stripe as a payment processor. We're the orchestration layer that routes to the right protocol, including Stripe when ACP is the answer."

**Key point:** Stripe = one protocol. PayOS = all protocols + governance.

**Technical clarification:** ACP is Stripe-native—the SharedPaymentToken (SPT) is a Stripe construct. For ACP transactions, the client provides their own Stripe credentials. Funds go directly to their Stripe account. PayOS implements the protocol and governance layer.

---

### Q2: "Is AI commerce actually happening, or is this hype?"

**Who asks:** Skeptics, budget holders

**The Challenge:** Prove the market is real.

**PayOS Answer:**
> "The data is clear:
> - Adobe: AI-driven e-commerce traffic up 693% in 2025 holiday season
> - ChatGPT: 800M weekly active users
> - Google: Launched UCP at NRF with Walmart, Target, Shopify as co-developers
> - Microsoft: Launched Copilot Checkout same week
> - Etsy, Urban Outfitters, Ashley Furniture: Live on multiple platforms
>
> This isn't a bet on the future. Google, Microsoft, and OpenAI are all live with checkout features. The infrastructure is being built NOW. The question isn't whether AI commerce will happen—it's whether you'll be ready when your customers or your agents need to transact."

**Key point:** Major players are live. Data confirms adoption.

---

### Q3: "What if one protocol wins? Why pay for multi-protocol?"

**Who asks:** Anyone trying to simplify

**The Challenge:** Bet on the winner, not the layer.

**PayOS Answer:**
> "We've analyzed this deeply. The protocols serve different corporate interests and aren't converging:
>
> - **ACP** is OpenAI + Stripe. Google won't adopt OpenAI's protocol.
> - **UCP** is Google + Shopify. OpenAI won't cede control to Google.
> - **x402** is Coinbase + Cloudflare. Different use case entirely (micropayments, APIs).
> - **Amazon** is building a walled garden and blocking everyone.
>
> Walmart, Shopify, and Etsy already support BOTH UCP and ACP. Stripe endorsed UCP while maintaining ACP. The major players are hedging because they know: fragmentation is structural, not transitional.
>
> Multi-protocol isn't a hedge against uncertainty. It's how the market actually works."

**Key point:** Fragmentation is permanent. Multi-protocol is reality.

---

### Q4: "You're 3 people. If you built it, why can't we just build this ourselves?"

**Who asks:** Anyone with engineering resources

**The Challenge:** If a 3-person startup can build it, so can they.

**PayOS Answer:**
> "You absolutely can. Any competent engineering team could build multi-protocol support. That's not the question.
>
> The question is: **should your engineers spend 6 months building payment protocol infrastructure, or should they spend 6 months on your actual product?**
>
> We're 3 people because this is ALL we do. We're not distracted by your core product—we're focused entirely on making agentic payments work. When protocols change, we're on it. When new ones emerge, we add them. UCP launched 7 days ago and is already evolving. Someone on your team becomes the 'protocol person' permanently.
>
> You could build it once. But then you own it forever. Every protocol update, every new standard, every security patch—that's your team's problem.
>
> **The real cost isn't the build—it's the forever maintenance.**
>
> If protocol orchestration is your competitive moat, build it. If it's plumbing you need to work so you can do your real business, let us handle it."

**Key point:** You CAN build. The question is whether you SHOULD. Build cost + maintenance + opportunity cost.

---

### Q5: "How do you make money? What's this cost?"

**Who asks:** Everyone (eventually)

**The Challenge:** Understand unit economics.

**PayOS Answer:**
> "We have three revenue streams, and you use what you need:
>
> **1. Transaction fees (0.2-0.5%):** Per-payment fee for protocol handling and settlement. Competitive with payment processors.
>
> **2. Governance (usage-based):** Policy checks, approval routing, compliance verification. Pay for what you use.
>
> **3. Platform fee (optional):** For enterprise customers who want SLAs, dedicated support, and custom integrations.
>
> For most customers, the transaction fee is the primary cost. Compare that to: engineering time to build and maintain 4 protocol integrations, plus the opportunity cost of launching months later."

**Key point:** Transaction-based core. Scale with usage.

---

### Q6: "What about Amazon? They're 40% of e-commerce."

**Who asks:** Anyone who understands the market

**The Challenge:** The elephant in the room.

**PayOS Answer:**
> "Amazon has made their position clear:
> - Blocked 47 external AI agents
> - Sued Perplexity
> - Building their own agents (Rufus, Buy For Me)
> - Scraping others while blocking others from scraping them
>
> You cannot reach Amazon shoppers through any open protocol. They won't allow it. If you're selling ON Amazon, you're already in their ecosystem with their rules.
>
> But that leaves 60% of e-commerce that IS reachable through open protocols. That's the addressable market—and it's where the innovation is happening. Google, Microsoft, OpenAI, Anthropic are all building open ecosystems. Amazon is the exception, not the rule."

**Key point:** Amazon is unreachable by design. The open ecosystem is massive.

---

### Q7: "Which protocol should we prioritize?"

**Who asks:** Anyone trying to start somewhere

**The Challenge:** They want a simple answer.

**PayOS Answer:**
> "It depends on your use case:
>
> **Reaching consumers:** ACP gets you ChatGPT (800M users) + Copilot. UCP gets you Gemini + Google AI Mode. You probably want both.
>
> **Developer/API use cases:** x402 for micropayments and pay-per-call.
>
> **Agent purchasing:** UCP + AP2 for commerce, x402 for SaaS/APIs.
>
> But here's the thing—with PayOS, you don't have to choose upfront. One integration covers all protocols. Launch, see where your transactions actually come from, then optimize. The data will tell you what matters for YOUR business."

**Key point:** Don't prioritize—be everywhere, then optimize with data.

---

### Q8: "How does governance actually work?"

**Who asks:** Anyone hearing "governance" for the first time

**The Challenge:** Make it concrete.

**PayOS Answer:**
> "Governance is the control layer between 'can transact' and 'should transact.'
>
> **For receiving payments:**
> - Which AI surfaces can sell your products?
> - Are there transaction limits or product restrictions?
> - Do certain orders need manual review?
>
> **For making payments:**
> - What can each agent spend?
> - Which vendors/categories are allowed?
> - Who approves above certain thresholds?
> - Where's the audit trail?
>
> Think of it as your business rules, enforced in real-time, across all protocols. Protocols handle the 'how' of transactions. Governance handles the 'whether' and 'under what conditions.'"

**Key point:** Protocols = how. Governance = whether and under what rules.

---

## Part 2: Technical "How Does This Actually Work" Questions

These are the due diligence questions that expose whether you understand the mechanics.

---

### Q21: "How do I actually get my products to appear on ChatGPT/Gemini?"

**Who asks:** Merchants who want to understand the mechanics

**The Challenge:** Discovery vs. transaction are different problems.

**PayOS Answer:**
> "Good question—and it's important to understand: discovery and transaction are two different problems.
>
> **Discovery (appearing on AI surfaces):**
> - **ChatGPT/Copilot (ACP):** Curated by OpenAI/Microsoft. You apply to their partner program. Currently: Etsy (live), Shopify merchants (coming), select retailers.
> - **Gemini/AI Mode (UCP):** Google controls discovery via Merchant Center and their algorithms. Shopify merchants are auto-enrolled.
> - **Claude (MCP):** Open—publish an MCP server, get listed in Anthropic's directory.
> - **x402:** Fully open—any API can add 402 support.
>
> **Transaction (processing payments once discovered):**
> This is where PayOS comes in. Once you're on a surface, PayOS handles the payment flow across all protocols.
>
> **What PayOS can do to help with discovery:**
> - **MCP: YES** — We build and publish MCP servers for you. Direct listing in Anthropic's directory.
> - **x402: YES** — We add 402 support to your APIs. Automatic discovery by any x402 client.
> - **ACP/UCP: INDIRECTLY** — We ensure your technical implementation is correct and help with partner program applications, but platform acceptance is their decision.
>
> **Honest truth:** We can help you implement protocols correctly and optimize conversion. We can guarantee MCP and x402 listings (we control those). We can't guarantee you'll appear on ChatGPT or Gemini—OpenAI and Google control that."

**Key point:** Discovery = platform-controlled (except MCP/x402). Transaction = PayOS-handled. We're honest about what we control.

---

### Q22: "How does PayOS actually insert itself into the payment flow?"

**Who asks:** Technical buyers, architects

**The Challenge:** Where exactly does PayOS sit?

**PayOS Answer:**
> "Depends on the direction:
>
> **For receiving payments (merchant):**
> - PayOS implements protocol endpoints on your behalf (ACP checkout endpoint, UCP payment handler, MCP commerce tools)
> - When a purchase happens, it routes through PayOS
> - We apply governance, normalize the data, route to settlement
> - For ACP specifically: you provide your Stripe credentials, funds go directly to YOUR Stripe account
>
> **For making payments (enterprise):**
> - Your agents use the PayOS SDK to initiate purchases
> - We enforce policies before execution
> - We select the right protocol based on the vendor
> - We execute the transaction and log everything
>
> **For x402 specifically:**
> - We act as the facilitator—verifying payment JWTs and settling transactions
>
> We're in the payment flow either as your protocol endpoint (receiving) or your agent's SDK (sending)."

**Architecture:**
```
RECEIVING:
  AI Surface → Protocol Request → PayOS (endpoint) → Governance → Settlement
                                                                      │
                                                         Client's Stripe/Circle account

SENDING:
  Your Agent → PayOS SDK → Policy Check → Protocol Selection → Vendor
```

**Key point:** We're either your protocol endpoint or your agent's SDK—in the flow, not beside it.

---

### Q23: "What partnerships do you need with Google, OpenAI, etc.?"

**Who asks:** Investors, enterprise buyers assessing platform risk

**The Challenge:** Are you dependent on big tech partnerships?

**PayOS Answer:**
> "Less than you'd think. Here's the reality:
>
> **No partnership required:**
> - **UCP:** Open spec. Anyone can implement a payment handler.
> - **MCP:** Fully open. Anyone can publish servers.
> - **x402:** Open standard. Anyone can be a facilitator.
> - **Settlement (Circle, Stripe):** API access, no partnership needed.
>
> **Partnership helps but not required:**
> - **ACP:** Runs through Stripe. We use their SDK. ACP is Stripe-native—clients provide their own Stripe credentials.
>
> **Platform controls discovery, not protocol access:**
> - Google controls who appears in AI Mode, but can't block UCP payment handlers
> - OpenAI controls who's in ChatGPT Checkout, but ACP flows through Stripe
>
> **What we're pursuing:**
> - x402 Foundation: Official facilitator status (credibility)
> - Shopify: App store listing (distribution)
> - OpenAI Operator Program: ACP validation
> - Coinbase Developer Platform: x402 tooling
>
> **Bottom line:** We can build and operate without any partnerships. Partnerships accelerate distribution, not capability."

**Key point:** Open protocols = no permission needed. Partnerships are for distribution, not capability.

---

### Q24: "If the protocols are open, what stops a competitor from doing exactly what you're doing?"

**Who asks:** Investors, strategic buyers

**The Challenge:** Defensibility question.

**PayOS Answer:**
> "Nothing, technically. The protocols are open. Anyone can build multi-protocol support.
>
> **Our moat isn't protocol access—it's:**
>
> 1. **Governance layer:** Protocols don't do spending policies, approval workflows, audit trails. We do. Building that is another 6 months on top of protocol integration.
>
> 2. **Time-to-market:** We're building NOW while others are watching. First mover in a fast-moving market matters.
>
> 3. **Accumulated expertise:** Every edge case we solve, every protocol update we handle, every compliance issue we navigate—that's knowledge a new entrant doesn't have.
>
> 4. **Network effects:** The more merchants on PayOS, the more enterprises want it (their agents can transact). The more enterprises, the more merchants see value.
>
> **The real question:** Will Stripe, Adyen, or a big player build this? Maybe. But:
> - Stripe has a horse in the race (ACP)—multi-protocol neutral isn't their interest
> - Adyen is a processor, not a protocol layer
> - Google/OpenAI won't build for competitor protocols
>
> We're building the neutral layer. That's hard for conflicted players to replicate."

**Key point:** Protocols are open. Governance + speed + neutrality = moat.

---

### Q28: "Can we use a payment processor other than Stripe for ACP?"

**Who asks:** Merchants with existing non-Stripe processing

**The Challenge:** They're not on Stripe and don't want to switch.

**PayOS Answer:**
> "Not today. ACP is Stripe-native—it was co-created by OpenAI and Stripe. The SharedPaymentToken (SPT) is a Stripe construct. That's a protocol constraint, not a PayOS choice.
>
> **How it works:**
> - You provide your Stripe credentials to PayOS
> - We implement the ACP protocol endpoints
> - When a ChatGPT/Copilot purchase happens, it processes through YOUR Stripe account
> - Funds go directly to you—PayOS never touches the money
>
> **If you're not on Stripe:**
> - For ACP (ChatGPT/Copilot): You'd need a Stripe account
> - For UCP (Gemini): More flexible—we can route to other processors
> - For x402: Uses USDC/Circle—no traditional processor needed
> - For MCP: Protocol-agnostic on payment method
>
> **Future possibility:** If ACP opens up or competitors emerge, we'd support multiple processors. But for now, ACP = Stripe. That's the protocol reality."

**Key point:** ACP is Stripe-only (protocol constraint). Other protocols are more flexible.

---

### Q29: "Can PayOS help us get listed on AI surfaces, or just handle payments once we're there?"

**Who asks:** Merchants who want the full solution

**The Challenge:** They want discovery AND transaction.

**PayOS Answer:**
> "Both—but with different levels of control:
>
> **Where we GUARANTEE listing (we control these):**
>
> | Surface | How PayOS Helps |
> |---------|-----------------|
> | **MCP (Claude)** | We build your MCP server, publish to Anthropic's directory. You're discoverable by Claude users. |
> | **x402 (APIs)** | We add HTTP 402 to your endpoints. Any x402-enabled agent auto-discovers you. |
>
> **Where we help but can't guarantee (platforms control these):**
>
> | Surface | How PayOS Helps |
> |---------|-----------------|
> | **ACP (ChatGPT)** | We ensure correct technical implementation, help with partner program application. OpenAI decides acceptance. |
> | **UCP (Gemini)** | We implement UCP endpoints correctly, optimize product feeds. Google's algorithm decides discovery. |
>
> **Potential service: "AI Commerce Readiness"**
> 1. Technical implementation across all protocols
> 2. Discovery optimization (feeds, metadata)
> 3. Partner program application support
> 4. Guaranteed listings where we control (MCP, x402)
>
> **Honest positioning:** We guarantee you're technically ready for ALL surfaces. We guarantee listings on MCP and x402. For ACP and UCP, we prepare you—but platform acceptance is their decision."

**Key point:** We guarantee MCP/x402 listings. We help with ACP/UCP but can't guarantee platform acceptance.

---

## Part 3: Receiving-Emphasis Questions

These come more often from customers focused on accepting payments (but enterprises ask them too).

---

### Q9: "Shopify auto-enrolls me in ACP and UCP. Why do I need PayOS?"

**Who asks:** Shopify merchants

**The Challenge:** They're already "covered."

**PayOS Answer:**
> "Shopify gets you enrolled—that's table stakes. But enrollment doesn't give you:
>
> - **Visibility:** Which AI surface drove that sale? What's converting better—ChatGPT or Gemini?
> - **Control:** Can you set different pricing or availability per surface? Can you A/B test?
> - **Governance:** What if you want to limit certain products on certain surfaces? Review high-value orders?
>
> Shopify treats AI commerce as a black box. PayOS gives you the same intelligence layer you expect from your web analytics—but for AI surfaces. Plus, we support MCP (Claude) and x402 (APIs), which Shopify doesn't cover.
>
> Enrollment is step one. Optimization is where the value is."

**Key point:** Enrollment ≠ visibility ≠ control.

---

### Q10: "What data do I actually get? AI platforms don't share much."

**Who asks:** Data-driven customers

**The Challenge:** Fear of losing customer insight.

**PayOS Answer:**
> "You're right that platforms limit data sharing. But PayOS sits in the payment flow, so we see:
>
> - Which protocol/surface the transaction came from
> - Transaction value and items
> - Conversion timing
> - Settlement status
>
> We can't tell you what the customer asked ChatGPT. But we can tell you:
> - 'Your ChatGPT conversions are 2x your Gemini conversions'
> - 'Average order value is 30% higher from Copilot'
> - 'Claude tool users have lowest cart abandonment'
>
> That's the insight you need to allocate resources. Unified analytics across surfaces that otherwise give you nothing."

**Key point:** Payment-layer visibility is substantial and actionable.

---

### Q11: "We also pay vendors. Can PayOS handle both directions?"

**Who asks:** Merchants realizing they have outbound needs

**The Challenge:** They assumed PayOS was receive-only.

**PayOS Answer:**
> "Absolutely. PayOS is bidirectional by design.
>
> Most businesses both receive AND send payments:
> - You receive from customers via AI surfaces
> - You pay suppliers, affiliates, creators, vendors
>
> Same platform, same governance layer, same protocols. When your agent needs to reorder inventory from a supplier who accepts UCP, PayOS handles it. Same policies, same audit trail, same dashboard.
>
> You don't need two systems. One platform, both directions."

**Key point:** Bidirectional is the default, not an add-on.

---

## Part 4: Sending-Emphasis Questions

These come more often from enterprises focused on agent purchasing (but merchants ask them too).

---

### Q12: "AP2 mandates already handle authorization. Why do I need governance?"

**Who asks:** Enterprises familiar with AP2

**The Challenge:** AP2 seems complete.

**PayOS Answer:**
> "AP2 is essential—it proves authorization happened. The mandate is cryptographic evidence that a user or policy authorized the transaction. That's critical for liability.
>
> But AP2 doesn't ENFORCE your business rules. An agent can have a valid mandate to spend $500 and still:
> - Buy from a blocked vendor
> - Exceed department budget (which AP2 doesn't know about)
> - Purchase in a restricted category
> - Violate your internal approval thresholds
>
> PayOS adds the enforcement layer:
> - **Before transaction:** Check against YOUR policies
> - **During transaction:** Route approvals if needed
> - **After transaction:** Complete audit trail
>
> Mandates prove what happened. Governance controls what CAN happen."

**Key point:** Authorization ≠ enforcement. You need both.

---

### Q13: "We have corporate cards with spending limits. How is this different?"

**Who asks:** Enterprises with existing controls

**The Challenge:** Brex, Ramp, Amex already have limits.

**PayOS Answer:**
> "Corporate cards are per-CARD, not per-AGENT. Can you:
>
> - Set different limits for your procurement agent vs. your travel agent?
> - Restrict one agent to office supplies and another to software?
> - Require manager approval only when Agent A exceeds $500, but Agent B can go to $2,000?
> - Get an audit trail of agent DECISIONS, not just transactions?
>
> Cards give you: 'This card can spend $5,000/month.'
> PayOS gives you: 'This agent can spend $500/day on office supplies from approved vendors, with manager approval above $200, and full audit logging.'
>
> That's the granularity agents require. Cards weren't designed for autonomous systems."

**Key point:** Per-card limits ≠ per-agent policies.

---

### Q14: "Who's liable when an agent makes a mistake?"

**Who asks:** Legal, compliance, executives

**The Challenge:** The fundamental enterprise concern.

**PayOS Answer:**
> "Liability follows the evidence trail. With PayOS, every transaction logs:
>
> - Agent identity (KYA verified)
> - Policy that permitted the transaction
> - Approvals obtained (if any)
> - Mandate verification (AP2)
> - Timestamp and context
>
> When something goes wrong, you have a complete chain: 'This agent, operating under this policy, with this approval, executed this transaction.' 
>
> More importantly, our policy engine PREVENTS most mistakes:
> - Wrong vendor? Blocked before execution.
> - Over budget? Stopped with notification.
> - Needs approval? Routed and logged.
>
> Liability is clearest when you can prove you had controls AND they were enforced."

**Key point:** Prevention + audit trail = defensible position.

---

### Q15: "What if an agent tries to drain our treasury?"

**Who asks:** Security-conscious enterprises

**The Challenge:** Catastrophic failure scenario.

**PayOS Answer:**
> "Defense in depth. Multiple layers prevent runaway spending:
>
> 1. **Policy limits:** Per-transaction, daily, monthly caps that cannot be exceeded
> 2. **Treasury isolation:** Agents access allocated spending pools, not main treasury
> 3. **Velocity controls:** Abnormal spending patterns trigger automatic holds
> 4. **Approval escalation:** Above-threshold transactions require human approval
> 5. **Kill switch:** Disable any agent instantly from dashboard
>
> The architecture assumes agents will misbehave. Containment is built into every layer. An agent cannot access funds beyond its allocated pool, cannot exceed its policy limits, and gets flagged if behavior deviates from baseline."

**Key point:** Assume failure, design containment.

---

### Q16: "We're not ready for autonomous purchasing yet."

**Who asks:** Cautious enterprises

**The Challenge:** Agents feel too risky.

**PayOS Answer:**
> "That's exactly why you want governance FIRST.
>
> Most enterprises start with human-in-the-loop: agent recommends, human approves. PayOS supports that fully. Then you gradually expand:
>
> - Auto-approve under $50
> - Auto-approve from trusted vendors
> - Auto-approve within budget
> - Full autonomy for low-risk categories
>
> The path to autonomous isn't a leap—it's incremental trust-building. PayOS gives you the dials to tune that journey.
>
> The companies setting up governance NOW will scale faster than those scrambling to add controls AFTER an incident."

**Key point:** Governance enables gradual autonomy.

---

### Q17: "We also sell to consumers. Can we use PayOS for that too?"

**Who asks:** Enterprises realizing they have inbound needs

**The Challenge:** They assumed PayOS was send-only.

**PayOS Answer:**
> "Absolutely. Same platform, both directions.
>
> Your procurement agents buy via UCP/ACP. Your products sell via the same protocols on the same surfaces. Same governance principles apply:
>
> - For sending: spending limits, vendor restrictions, approvals
> - For receiving: surface controls, order review thresholds, analytics
>
> One integration, one dashboard, one policy framework. Different rules for different flows, but unified infrastructure."

**Key point:** Bidirectional is the default, not an add-on.

---

## Part 5: Competitive Questions

These come up when they're comparing options.

---

### Q18: "How do you compare to [Specific Competitor]?"

**Stripe:**
> "Stripe is excellent for ACP—ChatGPT and Copilot. We're not replacing Stripe; many customers use them as a payment processor. In fact, ACP requires Stripe—clients provide their Stripe credentials, and funds go directly to their Stripe account. PayOS adds UCP (Gemini), MCP (Claude), x402 (APIs), plus the governance layer Stripe doesn't offer. If you only need ACP, Stripe is fine. If you need multi-protocol or governance, you need PayOS."

**Adyen:**
> "Adyen is a world-class payment processor. They don't do protocol orchestration or agent governance. We're complementary—Adyen can be a settlement rail behind PayOS for non-ACP transactions."

**Brex/Ramp:**
> "Great for corporate cards. Not designed for agents. Per-card limits aren't per-agent policies. No protocol support, no AI surface integration. Different problem, different solution."

**Skyfire:**
> "Skyfire does agent wallets. We do governance + multi-protocol orchestration. They're focused on giving agents funds. We're focused on controlling what agents do with funds AND connecting them to all commerce protocols. Could be complementary."

**Building internally:**
> "You can build it. The question is whether you should. 6 months to build, forever to maintain, and every protocol update is your problem. We're for companies who'd rather ship their actual product."

---

## Part 6: Closing Questions

---

### Q19: "What's the implementation timeline?"

**PayOS Answer:**
> "For basic protocol support: days to weeks, depending on your stack. Our SDK is designed for fast integration.
>
> For full governance setup: 2-4 weeks, including policy configuration and testing.
>
> For enterprise with custom requirements: 4-8 weeks, including compliance review and system integration.
>
> Compare to building: 6+ months for multi-protocol, plus ongoing maintenance."

---

### Q20: "What do we need to get started?"

**PayOS Answer:**
> "Three things:
>
> 1. **Use case clarity:** Receiving, sending, or both? Which protocols matter first?
> 2. **Policy requirements:** What governance rules do you need? (We can help define these)
> 3. **Technical contact:** Someone who can integrate our SDK
>
> For ACP specifically: You'll need a Stripe account (funds go directly to you).
>
> We can have a sandbox running in your environment within a week."

---

## Part 7: "Prove It" Questions (Pre-Customer Reality)

These are the hardest questions because we don't have full answers yet.

---

### Q25: "Can you show me a live transaction?"

**Who asks:** Anyone doing due diligence

**The Challenge:** We're pre-production.

**Current honest answer:**
> "We're in sandbox—we can show you the integration flow and simulate transactions across protocols. Production deployment is [timeline]. We're in design partnership with [X] companies validating the product before scaling."

**What we're doing about it:**
- [ ] Working demo showing transaction flow across UCP/ACP/x402
- [ ] Sandbox transaction count we can cite
- [ ] Design partner who will validate

---

### Q26: "Who's using this? Can I talk to a customer?"

**Who asks:** Anyone assessing risk

**The Challenge:** No paying customers yet.

**Current honest answer:**
> "We're pre-launch, in design partnership with [X] companies. Happy to connect you with a design partner if helpful. We're focused on getting the multi-protocol orchestration right before scaling."

**What we're doing about it:**
- [ ] 2-3 design partners who will take reference calls
- [ ] Letter of intent or pilot agreement

---

### Q27: "What's your transaction volume?"

**Who asks:** Investors, enterprise procurement

**The Challenge:** Zero production volume.

**Current honest answer:**
> "We're pre-launch—current volume is sandbox testing. But the market is moving: Adobe reported 693% increase in AI commerce traffic, ChatGPT has 800M users. We're building infrastructure for where the volume is going, not where it was."

**What we're doing about it:**
- [ ] Track and report sandbox transaction count
- [ ] Market sizing data to contextualize

---

## Summary: Question → Value Prop Mapping

| Question Theme | Value Prop Confirmed |
|----------------|---------------------|
| Why not Stripe/Shopify? | Multi-protocol orchestration |
| Is this real? | Market validation |
| What if one wins? | Fragmentation is structural |
| Build vs buy? | Should you, not can you—maintenance burden |
| AP2 is enough? | Governance > authorization |
| Corporate cards? | Per-agent vs per-card |
| Liability? | Audit + prevention |
| Data visibility? | Payment-layer analytics |
| Both directions? | Bidirectional by design |
| Security? | Defense in depth |
| How do you insert? | Protocol endpoint or SDK—in the flow |
| What partnerships? | Open protocols—distribution, not permission |
| Defensibility? | Governance + speed + neutrality |
| Help with discovery? | Yes for MCP/x402, indirectly for ACP/UCP |
| Non-Stripe processors? | ACP = Stripe only (protocol constraint) |

---

## Appendix A: Question Quick Reference by Customer Type

| Question | Merchant-Heavy | Balanced | Enterprise-Heavy |
|----------|:-------------:|:--------:|:----------------:|
| Q1: Why not Stripe? | ✓ | ✓ | ✓ |
| Q2: Is this real? | ✓ | ✓ | ✓ |
| Q3: What if one wins? | ✓ | ✓ | ✓ |
| Q4: Build vs buy? | ✓ | ✓ | ✓ |
| Q5: Pricing? | ✓ | ✓ | ✓ |
| Q6: Amazon? | ✓ | ✓ | ✓ |
| Q7: Which protocol? | ✓ | ✓ | ✓ |
| Q8: How does governance work? | ✓ | ✓ | ✓ |
| Q9: Shopify auto-enrolls | ✓ | | |
| Q10: What data? | ✓ | ✓ | |
| Q11: Both directions? | ✓ | ✓ | |
| Q12: AP2 is enough? | | ✓ | ✓ |
| Q13: Corporate cards? | | | ✓ |
| Q14: Liability? | | ✓ | ✓ |
| Q15: Treasury drain? | | | ✓ |
| Q16: Not ready yet? | | | ✓ |
| Q17: Also sell to consumers? | | ✓ | ✓ |
| Q21-24: Technical mechanics | ✓ | ✓ | ✓ |
| Q25-27: Prove it | ✓ | ✓ | ✓ |
| Q28: Non-Stripe for ACP? | ✓ | ✓ | |
| Q29: Help with discovery? | ✓ | ✓ | |

---

## Appendix B: Protocol Discovery vs. Transaction

| Protocol | Discovery Control | Transaction Access | PayOS Discovery Help | PayOS Transaction Role |
|----------|------------------|-------------------|---------------------|----------------------|
| **ACP** | OpenAI/Stripe (curated) | Via Stripe SDK | Indirect (tech readiness) | Checkout endpoint + governance |
| **UCP** | Google (algorithm) | Open spec | Indirect (feed optimization) | Payment handler + governance |
| **MCP** | Anthropic directory (open) | Fully open | **DIRECT** (we publish for you) | MCP server + governance |
| **x402** | Self-discovery (HTTP 402) | Fully open | **DIRECT** (we add 402 support) | Facilitator + governance |

**Key insight:** We control MCP and x402 listings. We help with ACP and UCP but can't guarantee platform acceptance.

---

## Appendix C: What We Actually Need (Partnerships vs. API Access)

| Entity | Required? | What We Need | Status |
|--------|-----------|--------------|--------|
| Circle | Yes | API access for USDC settlement | Available (sign up) |
| Stripe | Yes (for ACP) | API for card processing | Available (sign up) |
| OpenAI | No* | Operator Program for ACP validation | Apply |
| Google | No* | UCP developer resources | Apply when available |
| Anthropic | No | MCP is fully open | Just publish |
| Coinbase | No | CDP for x402 tooling | Apply |
| Shopify | Nice-to-have | Partner program for distribution | Apply |

*Protocol access is open. Programs help with validation and distribution.

**Bottom line:** We can build and launch without special partnerships. Programs accelerate validation and distribution.

---

## Appendix D: ACP Payment Flow (Stripe Requirement)

```
ACP Transaction Flow:

1. User on ChatGPT: "Buy this product"
            │
            ▼
2. ChatGPT calls PayOS ACP endpoint
            │
            ▼
3. PayOS creates checkout using CLIENT'S Stripe credentials
            │
            ▼
4. SharedPaymentToken (SPT) created
            │
            ▼
5. User confirms in ChatGPT
            │
            ▼
6. Payment processed via CLIENT'S Stripe account
            │
            ▼
7. Funds deposited to CLIENT'S Stripe account
            │
            ▼
8. PayOS logs transaction, applies governance, sends webhooks

Key points:
- ACP is Stripe-native (protocol constraint, not PayOS choice)
- Client provides their own Stripe credentials
- Funds go directly to client—PayOS never touches the money
- PayOS adds governance + analytics + multi-protocol
```

---

*Version 1.2 - Updated with ACP/Stripe clarification, discovery capabilities, and expanded technical mechanics.*
