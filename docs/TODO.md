# PayOS Action Items & TODO List

**Last Updated:** January 18, 2026

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

### Week 3: Build & Publish

| # | Task | Purpose | Status |
|---|------|---------|--------|
| 9 | Build demo MCP server | Claude commerce demo | ⬜ TODO |
| 10 | Publish MCP server to Anthropic directory | https://github.com/anthropics/mcp-servers | MCP discovery demo | ⬜ TODO |
| 11 | Build x402 facilitator on Base testnet | x402 demo | ⬜ TODO |
| 12 | Implement UCP payment handler endpoints | UCP demo | ⬜ TODO |
| 13 | Implement ACP checkout endpoint | ACP demo | ⬜ TODO |

---

## 🟡 MEDIUM PRIORITY: Demo & Validation Assets

| # | Task | Purpose | Status |
|---|------|---------|--------|
| 14 | Build unified demo showing transaction across all 4 protocols | Sales demos, investor pitches | ⬜ TODO |
| 15 | Track and report sandbox transaction count | Proof point: "X,000 test transactions" | ⬜ TODO |
| 16 | Create demo video of each protocol flow | Async sales enablement | ⬜ TODO |
| 17 | Recruit 2-3 design partners for reference calls | Customer validation | ⬜ TODO |

---

## 🟢 LOWER PRIORITY: Credibility & Distribution

| # | Task | Purpose | Status |
|---|------|---------|--------|
| 18 | Apply for x402 Foundation official facilitator status | Credibility | ⬜ TODO |
| 19 | Start SOC 2 Type I process (Vanta or Drata) | Enterprise requirement | ⬜ TODO |
| 20 | Get legal opinion on money transmitter status | Regulatory clarity | ⬜ TODO |
| 21 | Build Shopify app for PayOS integration | Merchant distribution | ⬜ TODO |

---

## Protocol Demo Checklist

Once registrations complete, we need to demonstrate:

### ACP Demo (ChatGPT/Copilot)
- [ ] Stripe test account configured
- [ ] ACP checkout endpoint implemented
- [ ] SharedPaymentToken flow working
- [ ] End-to-end purchase simulation

### UCP Demo (Gemini/AI Mode)
- [ ] Google Merchant Center test account
- [ ] UCP payment handler endpoints implemented
- [ ] Product feed configured
- [ ] End-to-end purchase simulation

### MCP Demo (Claude)
- [ ] MCP server built with commerce tools
- [ ] Published to Anthropic directory
- [ ] Claude can discover and use tools
- [ ] End-to-end purchase simulation

### x402 Demo (APIs/Micropayments)
- [ ] Circle sandbox configured
- [ ] Base testnet wallet funded
- [ ] x402 facilitator deployed
- [ ] HTTP 402 flow working
- [ ] End-to-end API payment simulation

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
- **Note:** Required for USDC settlement and x402 flows.

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
- **Note:** UCP is 7 days old—dedicated developer program may not exist yet.

### Anthropic MCP (Claude)
- **URL:** https://github.com/anthropics/mcp-servers
- **What you need:** Nothing—MCP is fully open
- **Note:** Just build and publish. No approval needed.

---

## Weekly Progress Tracking

### Week of [DATE]
- [ ] Completed:
- [ ] In Progress:
- [ ] Blocked:

---

## Notes

- UCP launched January 11, 2026—dedicated developer program may not exist yet
- ACP requires Stripe (protocol constraint)—clients use their own Stripe accounts
- MCP and x402 are fully open—no approval needed, we control listing
- Focus on getting ALL protocols demonstrable in sandbox before sales push

---

*Update this file as tasks are completed. Move completed items to a "Done" section at the bottom.*
