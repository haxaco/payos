# Sly Action Items & TODO List

**Last Updated:** January 30, 2026

---

## Recent Completions (January 27-30, 2026)

| Task | Completed | Notes |
|------|-----------|-------|
| Epic 54: Sly Rebranding | Jan 27 | PayOS → Sly across codebase |
| Epic 53: Card Network Integration | Jan 27 | Visa VIC + Mastercard Agent Pay |
| Protocol toggles fix | Jan 30 | Dashboard home page now works |
| RLS security fix | Jan 30 | `runs` and `run_logs` tables secured |
| Integration requirements doc | Jan 30 | B2B vs B2C guide created |
| UCP payment handler endpoints | Jan 19 | Epic 43 complete |
| Protocol discovery API | Jan 22 | Epic 49 complete |
| Connected accounts infrastructure | Jan 22 | Epic 48 complete |

---

## 🔴 HIGH PRIORITY: Program Registrations for Protocol Demo Capability

These registrations are needed to demonstrate each protocol end-to-end in sandbox.

### Week 1: Free Signups (No Approval Needed)

| # | Task | URL | Purpose | Status |
|---|------|-----|---------|--------|
| 1 | Create Stripe test account | https://dashboard.stripe.com/register | ACP protocol testing | ⬜ TODO |
| 2 | Register for Circle Sandbox API | https://www.circle.com/en/developers | USDC settlement, x402 | ⬜ TODO |
| 3 | Set up Base testnet wallet | https://base.org/docs | x402 USDC testing | ⬜ TODO |
| 4 | Create Google Merchant Center test account | https://merchants.google.com | UCP product feeds | ⬜ TODO |

### Week 2: Apply to Developer Programs

| # | Task | URL | Purpose | Status |
|---|------|-----|---------|--------|
| 5 | Apply to OpenAI Operator Program | https://platform.openai.com | ACP end-to-end validation | ⬜ TODO |
| 6 | Register for Coinbase Developer Platform (CDP) | https://cdp.coinbase.com | x402 tooling, Base integration | ⬜ TODO |
| 7 | Apply to Shopify Partner Program | https://partners.shopify.com | Merchant distribution, dev stores | ⬜ TODO |
| 8 | Check for Google UCP Developer Program | (May not exist yet—UCP is new) | UCP validation | ⬜ TODO |
| 9 | Register for Visa Developer Portal | https://developer.visa.com | Visa VIC / TAP integration | ⬜ TODO |
| 10 | Register for Mastercard Developer Portal | https://developer.mastercard.com | Mastercard Agent Pay | ⬜ TODO |

### Week 3: Build & Publish

| # | Task | Purpose | Status |
|---|------|---------|--------|
| 11 | Build demo MCP server | Claude commerce demo | ⬜ TODO |
| 12 | Publish MCP server to Anthropic directory | https://github.com/anthropics/mcp-servers | MCP discovery demo | ⬜ TODO |
| 13 | Build x402 facilitator on Base testnet | x402 demo | ⬜ TODO |
| 14 | ~~Implement UCP payment handler endpoints~~ | ~~UCP demo~~ | ✅ DONE (Epic 43) |
| 15 | ~~Implement ACP checkout endpoint~~ | ~~ACP demo~~ | ✅ DONE (Epic 17) |

---

## 🟡 MEDIUM PRIORITY: Demo & Validation Assets

| # | Task | Purpose | Status |
|---|------|---------|--------|
| 16 | Build unified demo showing transaction across all 4 protocols | Sales demos, investor pitches | ⬜ TODO |
| 17 | Track and report sandbox transaction count | Proof point: "X,000 test transactions" | ⬜ TODO |
| 18 | Create demo video of each protocol flow | Async sales enablement | ⬜ TODO |
| 19 | Recruit 2-3 design partners for reference calls | Customer validation | ⬜ TODO |

---

## 🟢 LOWER PRIORITY: Credibility & Distribution

| # | Task | Purpose | Status |
|---|------|---------|--------|
| 20 | Apply for x402 Foundation official facilitator status | Credibility | ⬜ TODO |
| 21 | Start SOC 2 Type I process (Vanta or Drata) | Enterprise requirement | ⬜ TODO |
| 22 | Get legal opinion on money transmitter status | Regulatory clarity | ⬜ TODO |
| 23 | Build Shopify app for Sly integration | Merchant distribution | ⬜ TODO |

---

## Protocol Demo Checklist

Once registrations complete, we need to demonstrate:

### x402 Demo (APIs/Micropayments)
- [ ] Circle sandbox configured
- [ ] Base testnet wallet funded
- [ ] x402 facilitator deployed
- [x] HTTP 402 flow working (Epic 17, 19)
- [ ] End-to-end API payment simulation with real USDC

### AP2 Demo (Agent Mandates)
- [x] Mandate creation API (Epic 17)
- [x] Agent authorization flow (Epic 18)
- [x] Spending limit enforcement
- [ ] End-to-end agent payment simulation

### ACP Demo (ChatGPT/Copilot)
- [ ] Stripe test account configured
- [x] ACP checkout endpoint implemented (Epic 17)
- [ ] SharedPaymentToken flow working with real Stripe
- [ ] End-to-end purchase simulation

### UCP Demo (Gemini/AI Mode)
- [ ] Google Merchant Center test account
- [x] UCP payment handler endpoints implemented (Epic 43)
- [x] Settlement service with Pix/SPEI (Epic 43)
- [ ] Product feed configured
- [ ] End-to-end purchase simulation

### MCP Demo (Claude)
- [x] MCP server built with commerce tools (@sly/sdk)
- [ ] Published to Anthropic directory
- [ ] Claude can discover and use tools
- [ ] End-to-end purchase simulation

### Card Network Demos (NEW)
- [ ] Visa Developer Portal access
- [x] Visa VIC integration code (Epic 53)
- [ ] Mastercard Developer Portal access
- [x] Mastercard Agent Pay integration code (Epic 53)
- [ ] End-to-end card payment via agent

---

## Registration Details & Notes

### Stripe (ACP)
- **URL:** https://dashboard.stripe.com/register
- **What you need:** Email, business info
- **Test mode:** Immediately available
- **Note:** ACP is Stripe-native. This is required for ACP demos.

### Circle (Settlement)
- **URL:** https://www.circle.com/en/developers
- **What you need:** Email, company info
- **Sandbox:** Immediately available
- **Note:** Required for USDC settlement, Pix/SPEI, and x402 flows.

### Coinbase Developer Platform (x402)
- **URL:** https://cdp.coinbase.com
- **What you need:** Coinbase account, company info
- **Note:** Provides x402 tooling and Base integration support.

### OpenAI Operator Program (ACP)
- **URL:** https://platform.openai.com
- **What you need:** OpenAI account, use case description
- **Note:** May have waitlist. Needed for full ACP validation.

### Shopify Partner Program (Distribution)
- **URL:** https://partners.shopify.com
- **What you need:** Email, business info
- **Benefits:** Development stores, app store listing, merchant access
- **Note:** Important for merchant distribution strategy.

### Google Merchant Center (UCP)
- **URL:** https://merchants.google.com
- **What you need:** Google account, business info
- **Note:** UCP launched Jan 11, 2026—dedicated developer program may exist now.

### Visa Developer Portal (VIC/TAP)
- **URL:** https://developer.visa.com
- **What you need:** Business info, use case description
- **Approval time:** 1-2 weeks for Agent Enabler partner status
- **Note:** Required for Visa Intelligent Commerce (VIC) and TAP integration.

### Mastercard Developer Portal (Agent Pay)
- **URL:** https://developer.mastercard.com
- **What you need:** Business info, P12 certificate generation
- **Approval time:** 1-2 weeks for Agent Pay program
- **Note:** Mastercard Agent Pay already live in LATAM (Dec 2025).

### Anthropic MCP (Claude)
- **URL:** https://github.com/anthropics/mcp-servers
- **What you need:** Nothing—MCP is fully open
- **Note:** Just build and publish. No approval needed.

---

## Weekly Progress Tracking

### Week of January 27-30, 2026
- [x] Completed: Epic 53 (Card Networks), Epic 54 (Rebranding), Protocol toggle fix, RLS security fix
- [ ] In Progress: Demo preparation
- [ ] Blocked: External registrations (Stripe, Circle, Visa, Mastercard)

### Week of January 20-26, 2026
- [x] Completed: Epic 43 (UCP), Epic 48-52 (Platform Architecture)
- [x] Completed: Dashboard redesign with protocol focus

---

## Existing Demo Scripts

These demo scripts already exist and can be run:

| Script | Location | Description |
|--------|----------|-------------|
| UCP Pix Demo | `scripts/demos/ucp-pix-demo.ts` | Full UCP → Pix settlement flow |
| x402 Demo | `apps/sample-consumer/src/x402-demo.ts` | x402 micropayment flow |
| AP2 Demo | `apps/sample-consumer/src/ap2-demo.ts` | AP2 mandate flow |
| ACP Demo | `apps/sample-consumer/src/acp-demo.ts` | ACP checkout flow |
| YC Full Flow | `apps/api/scripts/demo-yc-full-flow.ts` | Investor demo script |

Run with:
```bash
pnpm --filter @sly/api tsx scripts/demos/ucp-pix-demo.ts
```

---

## Notes

- UCP launched January 11, 2026—dedicated developer program may exist now (check Google)
- ACP requires Stripe (protocol constraint)—clients use their own Stripe accounts
- MCP and x402 are fully open—no approval needed, we control listing
- Card networks (Visa VIC, Mastercard Agent Pay) require developer program approval (1-2 weeks)
- Focus on getting ALL protocols demonstrable in sandbox before sales push
- **All 4 protocols + 2 card networks have working code**—just need external credentials

---

## Integration Guide

For detailed B2B vs B2C integration requirements, see:
- [Integration Requirements Guide](./guides/integration/INTEGRATION_REQUIREMENTS.md)

---

*Update this file as tasks are completed.*
