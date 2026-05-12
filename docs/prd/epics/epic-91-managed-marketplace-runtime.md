# Epic 91: Managed Marketplace Runtime

**Status:** Planned
**Phase:** TBD (Marketplaces Platform)
**Priority:** P1
**Dependencies:** Epic 86, 87, 88, 89, 90
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md), agentbazaar repo
**Created:** May 2026

---

## Summary

Productize the agentbazaar runtime so any Sly tenant can spin up their own marketplace from the Sly Console — no DevOps required. Sly handles provisioning, custom domains, branded viewer hosting, settlements dashboard, and on-chain mint. Self-hosted variant remains available for customers who want infrastructure control.

This is the epic that turns "Sly Marketplaces" from "demo we shipped" into "platform feature customers buy."

## Motivation

Today the agentbazaar runtime exists as an open-source repo (haxaco/sly-marketplaces, currently private). To run a marketplace, a customer needs to:

1. Clone the repo
2. Configure `.env` with Sly credentials, AWS Bedrock keys, etc.
3. Run `pnpm dev` on their own infrastructure
4. Deal with deploy, monitoring, custom domain, TLS, scaling

That's fine for hackathon-scale demos. It's not fine for paying customers — operators want to focus on their marketplace's identity (vertical, branding, agents, rules), not on running a Node service.

This epic delivers the "I clicked a button and now I have a marketplace" experience. It's the same productization pattern as Vercel (deploy a Next.js app), Stripe (open a payment account), or Shopify (open a storefront) — applied to agent commerce.

## Direction confirmed with the user

Two delivery modes:

1. **Managed (default):** Sly hosts the runtime. Customer fills in a form in Sly Console, hits "Create Marketplace," gets a working marketplace at a Sly-managed URL within minutes.
2. **Self-hosted:** Customer runs the agentbazaar runtime on their own infra. Sly provides the trust layer (KYA, KYM, settlement, reputation) via SDK; the runtime calls Sly the way Stripe customers' storefronts call Stripe.

Three pricing surfaces:
- KYM tier subscription (T0 free, T1+ paid)
- Settlement bps on x402 facilitator throughput
- Per-agent registration above N free seats

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/marketplaces/:id/runtime/provision` | ✅ Yes | `sly.marketplaces` | P0 | Triggers async provision |
| `GET /v1/marketplaces/:id/runtime` | ✅ Yes | `sly.marketplaces` | P0 | Status + URL + version |
| `POST /v1/marketplaces/:id/runtime/redeploy` | ✅ Yes | `sly.marketplaces` | P1 | Apply config changes |
| `DELETE /v1/marketplaces/:id/runtime` | ✅ Yes | `sly.marketplaces` | P1 | Tear down |
| Custom domain webhook | ❌ No | - | - | Internal infra |
| Self-hosted SDK examples | ✅ Yes | docs only | P1 | Reference impl |

**SDK Stories Required:**
- [ ] Story 91.X: `sly.marketplaces.runtime.{provision, get, redeploy, destroy}`
- [ ] Story 91.Y: Self-hosted runtime quickstart in `@sly_ai/sdk` README

## Scope

**In scope (v1):**

### Managed runtime infrastructure

1. **Multi-tenant deployment of agentbazaar.** One service, many marketplaces.

   - Single Hono server (extension of `apps/sim/src/server.ts`) where each marketplace is identified by hostname or path
   - Shared infra (DB, viewer assets, scheduler) — per-marketplace config stored in `marketplaces.runtime_config` JSONB
   - Runtime reads its marketplace from the request hostname → looks up config → routes the SSE stream / viewer / showcase to the right marketplace

2. **Provisioning pipeline**:

   ```
   POST /v1/marketplaces/:id/runtime/provision
     ├── Validate KYM tier ≥ T1
     ├── Allocate subdomain or custom domain
     ├── Issue TLS cert (Cloudflare / Let's Encrypt)
     ├── Seed default agent pool (if requested)
     ├── Configure scenario template
     └── Return runtime URL + status
   ```

3. **Custom domains**:
   - Default: `<marketplace-slug>.sly.market` (subdomain, instant)
   - Custom: customer adds CNAME → `marketplace.<customer-domain>` (TLS via ACME)
   - Cloudflare for SaaS pattern; covered in `docs/runbooks/custom-domains.md`

4. **Branded viewer hosting**:
   - Per-marketplace logo, accent color, custom CSS slot
   - Same agentbazaar viewer code, branded via marketplace.branding fields
   - Configurable feature toggles (showcase button on/off, /join page on/off, etc.)

5. **Settlements + KYM dashboard inside Sly Console**:
   - Real-time settlements feed (per marketplace)
   - KYM tier status + on-chain mint badge
   - Volume / agent / dispute metrics

6. **Self-hosted variant**:
   - Open-source `haxaco/sly-marketplaces` repo (currently private — flip back to public when this epic ships)
   - SDK + env-config quickstart
   - Same trust layer (KYA, KYM, settlement) consumed via SDK
   - Customer pays settlement bps + per-agent above N; no managed infra fee

### Pricing + billing

7. **KYM tier subscription billing**:
   - Stripe products per tier
   - Sly Console manages subscription state
   - Tier downgrade on payment failure (with grace period)

8. **Settlement bps**:
   - Take rate on x402 facilitator settlements that touch Sly's facilitator
   - Charged at end-of-month against a billing account
   - Self-hosted gets the same bps but on a different settlement-source rule

9. **Agent seat counting**:
   - Free up to N (TBD; instinct: 25 for T1, 100 for T2)
   - Per-seat overage billed monthly

### Observability + ops

10. **Per-marketplace health**:
    - Uptime monitoring per managed runtime
    - Auto-pause if dispute rate exceeds KYM tier threshold (Epic 87 hook)
    - Cron: weekly stats roll-up to `marketplaces.metadata.weekly_stats`

11. **Operator support runbooks**:
    - Custom domain config troubleshooting
    - Marketplace migration (managed → self-hosted)
    - Tier downgrade flow
    - Force-suspend / restore

**Out of scope (deferred):**

- Marketplace duplication / forking ("clone TravelHubs into my tenant")
- Marketplace marketplace (Sly-hosted "templates" customers can start from)
- Per-marketplace AI/LLM provider configuration (use Sly's defaults v1)
- Multi-region deployment (single region v1)
- Per-marketplace SLA / uptime guarantees (best-effort v1)

## Stories

Each story spec lives in its own file at [`./stories/epic-91/`](./stories/epic-91/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: Multi-Tenant Runtime + Provisioning — 42 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [91.1](./stories/epic-91/story-91.1-multi-tenant-hostname-routing.md) | Multi-Tenant Agentbazaar Deploy — Route by Hostname | 13 | P0 | Planned |
| [91.2](./stories/epic-91/story-91.2-provisioning-pipeline.md) | Provisioning Pipeline — REST + Async Job + Status | 8 | P0 | Planned |
| [91.3](./stories/epic-91/story-91.3-custom-domain-cloudflare.md) | Custom Domain Support — Cloudflare for SaaS | 13 | P1 | Planned |
| [91.4](./stories/epic-91/story-91.4-branded-viewer-hosting.md) | Branded Viewer Hosting — Per-Marketplace Assets | 8 | P1 | Planned |

### Phase 2: Sly Console Surfaces — 10 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [91.5](./stories/epic-91/story-91.5-console-settlements-dashboard.md) | Sly Console — Marketplace Settlements Dashboard | 5 | P1 | Planned |
| [91.6](./stories/epic-91/story-91.6-console-kym-dashboard.md) | Sly Console — KYM Dashboard | 5 | P1 | Planned |

### Phase 3: Billing — 21 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [91.7](./stories/epic-91/story-91.7-stripe-kym-subscriptions.md) | Stripe Billing — KYM Tier Subscriptions | 8 | P0 | Planned |
| [91.8](./stories/epic-91/story-91.8-settlement-bps-invoice.md) | Settlement Bps — Take Rate Calc + Monthly Invoice | 8 | P1 | Planned |
| [91.9](./stories/epic-91/story-91.9-agent-seat-overage.md) | Agent Seat Counting + Overage Billing | 5 | P2 | Planned |

### Phase 4: Observability + Quality + Self-Hosted — 23 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [91.10](./stories/epic-91/story-91.10-health-monitoring-auto-pause.md) | Per-Marketplace Health Monitoring + Auto-Pause | 5 | P1 | Planned |
| [91.11](./stories/epic-91/story-91.11-self-hosted-quickstart.md) | Self-Hosted Quickstart Docs + SDK Examples | 5 | P1 | Planned |
| [91.12](./stories/epic-91/story-91.12-sdk-runtime-module.md) | `@sly_ai/sdk` Runtime Module | 3 | P0 | Planned |
| [91.13](./stories/epic-91/story-91.13-tests-provisioning-domains-billing.md) | Tests — Provisioning Idempotency, Custom Domain, Billing | 5 | P0 | Planned |
| [91.14](./stories/epic-91/story-91.14-runbooks-domains-migration-support.md) | Runbooks — Custom Domains, Migration, Tier Downgrade, Support | 5 | P2 | Planned |

**Total:** ~96 points across 14 stories.

## Definition of Done

- [ ] At least one managed marketplace running on `<slug>.sly.market` with full feature set
- [ ] One custom-domain marketplace running on `marketplace.<partner-domain>`
- [ ] Sly Console: provision flow E2E from form-fill to live URL in < 5 minutes
- [ ] Settlements dashboard accurate against real x402 throughput
- [ ] Stripe subscription billing functional (test mode + live mode)
- [ ] Self-hosted quickstart documented; one external customer running self-hosted in production
- [ ] Per-marketplace auto-pause works on dispute-threshold breach
- [ ] Open-source `haxaco/sly-marketplaces` repo flipped back to public
- [ ] Pricing page on `getsly.ai` documents the three pricing surfaces

## Risks

- **Multi-tenant runtime isolation.** Bug in one marketplace's scenario could affect others. Hard isolation requires per-marketplace processes (more cost) or strong sandboxing (more complexity). v1 ships shared runtime with audit logging; revisit if isolation incidents.
- **Custom domain ops.** TLS issuance, propagation, DNS issues at customer side. Most ops tickets will be about this. Plan for runbook + tier-aware support hours.
- **Pricing model uncertainty.** Bps + tier subscription is a guess. Beta-launch with one or two design partners before public pricing.
- **Open-sourcing the repo.** Once the repo flips back to public, anyone can self-host. Settle on what's open vs. what stays Sly-proprietary (likely: agentbazaar runtime is open, KYM verification + on-chain mint stay platform-side).

## References

- agentbazaar repo (currently private): `haxaco/sly-marketplaces`
- Epic 67 — Production Environment Mode (deployment infra reference)
- Epic 65 — Operations Observability (metrics + cost-to-serve infra)
- `MARKETPLACES_STRATEGY.md` — pricing + delivery modes
- Vercel / Cloudflare for SaaS docs as custom-domain references
