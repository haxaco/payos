# PayOS FAQ

**For:** External website / Landing page  
**Last Updated:** January 18, 2026

---

## General

### What is PayOS?

PayOS is the infrastructure layer for AI commerce. We connect your business to every major AI shopping platform—ChatGPT, Gemini, Copilot, Claude—through a single integration. Whether you're accepting payments from AI-powered shoppers or enabling your agents to make purchases, PayOS handles the protocols, governance, and settlement.

### What problem does PayOS solve?

AI commerce is fragmenting across multiple protocols:
- **ACP** powers ChatGPT and Copilot
- **UCP** powers Gemini and Google AI Mode
- **MCP** powers Claude
- **x402** powers API micropayments

Each requires different integrations. PayOS gives you one integration that works with all of them—plus the governance and analytics layer that none of them provide.

### Who is PayOS for?

- **Merchants** who want to reach customers shopping via AI platforms
- **Enterprises** deploying AI agents that need to make purchases
- **API providers** who want to monetize with micropayments
- **Platforms** building AI-native commerce experiences

### Is PayOS live?

We're currently in private beta with design partners. [Contact us](#) to join the waitlist.

---

## How It Works

### How does PayOS connect me to AI shopping platforms?

PayOS implements the commerce protocols that AI platforms use:

| AI Platform | Protocol | PayOS Role |
|-------------|----------|------------|
| ChatGPT, Copilot | ACP | We implement your checkout endpoint |
| Gemini, Google AI Mode | UCP | We implement your payment handler |
| Claude | MCP | We build and publish commerce tools for you |
| API clients | x402 | We add payment support and act as facilitator |

You integrate once with PayOS. We handle the protocol complexity.

### Do I need to integrate each protocol separately?

No. That's the point. One PayOS integration gives you access to all protocols. Enable or disable protocols based on your needs.

### Can PayOS help me appear on ChatGPT or Gemini?

**For Claude (MCP) and API monetization (x402):** Yes—we directly control listing. We build and publish your MCP server to Anthropic's directory, and we add payment support to your APIs.

**For ChatGPT (ACP) and Gemini (UCP):** We ensure your technical implementation is correct and help with partner program applications. However, OpenAI and Google control which merchants appear on their platforms.

### Does PayOS replace my payment processor?

No. PayOS works with your existing payment processor:
- For ACP transactions, you provide your Stripe credentials—funds go directly to your Stripe account
- For UCP transactions, you can use Stripe, Adyen, or other processors
- For x402 transactions, settlement is via USDC

PayOS is the orchestration and governance layer, not a payment processor.

---

## For Merchants

### I'm on Shopify. Don't I already have access to these platforms?

Shopify auto-enrolls you in ACP and UCP—but that's just the starting point. Shopify doesn't give you:
- **Visibility:** Which AI surface drove each sale?
- **Analytics:** What's converting better—ChatGPT or Gemini?
- **Control:** Can you customize pricing or availability per surface?
- **Coverage:** Shopify doesn't support MCP (Claude) or x402 (APIs)

PayOS adds the intelligence layer on top of enrollment.

### Which AI platform should I prioritize?

With PayOS, you don't have to choose. One integration covers all platforms. Launch everywhere, then let the data tell you where your customers are.

That said, if you're starting somewhere:
- **ChatGPT** (ACP) has 800M weekly users
- **Gemini** (UCP) is growing fast with Google's distribution
- **Claude** (MCP) reaches developers and power users

### Can I also pay vendors through PayOS?

Yes. PayOS is bidirectional. Accept payments from AI shoppers AND enable your agents to make purchases—same platform, same integration.

---

## For Enterprises

### How is PayOS different from giving agents a corporate card?

Corporate cards are per-card, not per-agent. With PayOS, you get:

| Corporate Card | PayOS |
|----------------|-------|
| Same limit for all users of that card | Different limits per agent |
| Category controls are card-wide | Category controls per agent |
| Basic transaction log | Full audit trail of agent decisions |
| No approval workflows | Configurable approval routing |

Cards weren't designed for autonomous systems. PayOS was.

### What governance controls does PayOS provide?

- **Spending limits:** Per-transaction, daily, monthly caps per agent
- **Category restrictions:** Which types of purchases each agent can make
- **Vendor controls:** Approved and blocked vendor lists
- **Approval workflows:** Route purchases above threshold for human approval
- **Audit trails:** Complete log of every agent decision and transaction
- **Kill switch:** Instantly disable any agent

### What if we're not ready for fully autonomous purchasing?

Perfect. Most enterprises start with human-in-the-loop: the agent recommends, a human approves. Then you gradually expand autonomy:

1. Auto-approve under $50
2. Auto-approve from trusted vendors
3. Auto-approve within budget
4. Full autonomy for low-risk categories

PayOS gives you the dials to tune this journey at your own pace.

### Who's liable when an agent makes a mistake?

Liability follows the evidence trail. With PayOS, every transaction logs:
- Agent identity
- Policy that permitted the transaction
- Approvals obtained
- Timestamp and context

More importantly, our policy engine prevents most mistakes before they happen. Wrong vendor? Blocked. Over budget? Stopped. Needs approval? Routed.

---

## Technical

### What protocols does PayOS support?

| Protocol | Platforms | Use Case |
|----------|-----------|----------|
| **ACP** | ChatGPT, Copilot | Consumer checkout |
| **UCP** | Gemini, Google AI Mode | Full commerce lifecycle |
| **MCP** | Claude | Tool-based commerce |
| **x402** | API clients | Micropayments |

We add new protocols as they emerge.

### How long does integration take?

- **Basic setup:** Days to weeks, depending on your stack
- **Full governance configuration:** 2-4 weeks
- **Enterprise with custom requirements:** 4-8 weeks

### What's the API like?

RESTful API with webhooks. SDKs available for major languages. Full documentation provided during onboarding.

```javascript
// Example: Accept payment from any AI surface
const payment = await payos.acceptPayment(request);
// payment.protocol = 'acp' | 'ucp' | 'mcp' | 'x402'
// payment.source = 'chatgpt' | 'gemini' | 'copilot' | 'claude'
```

### Do I need a Stripe account?

For ACP (ChatGPT/Copilot) transactions, yes—ACP is Stripe-native. You provide your Stripe credentials, and funds go directly to your account.

For other protocols (UCP, MCP, x402), Stripe is not required.

### Is PayOS secure?

- We never hold your funds—settlement goes directly to your accounts
- SOC 2 Type II certification in progress
- All data encrypted in transit and at rest
- Full audit logging

---

## Pricing

### How does PayOS pricing work?

Three components, use what you need:

| Component | Model | Description |
|-----------|-------|-------------|
| **Transaction fee** | 0.2-0.5% | Per-payment for protocol handling |
| **Governance** | Usage-based | Policy checks, approval routing |
| **Platform fee** | Monthly (optional) | For enterprise SLAs and support |

### Is there a free tier?

Contact us for current pricing and pilot programs.

### How does this compare to building it ourselves?

Building multi-protocol support internally typically requires:
- 6+ months of engineering time
- Ongoing maintenance as protocols evolve
- Specialized expertise in payments AND AI protocols

PayOS costs a fraction of one engineer's salary and you're live in weeks.

---

## Company

### Who's behind PayOS?

PayOS was founded by:
- **Federico Vrljicak** — 15+ years at Mastercard, enterprise payments
- **Simu Mukuna** — Stablecoin infrastructure, B2B payments in Africa
- **Diego Garcia** — AI and startups, Salesforce

All three are Oxford Executive MBA graduates.

### Where is PayOS based?

We're a globally distributed team.

### How do I get started?

[Contact us](#) to join the private beta or schedule a demo.

---

## Still Have Questions?

[Contact us](#) or email hello@payos.io

---

*Last updated: January 2026*
