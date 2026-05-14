# Epic 85: Sly Scanner on the x402 Marketplace — Complete

**Status:** ✅ Complete
**Completion Date:** May 4, 2026
**Points Delivered:** 18
**Stories:** 8/8
**PRD Version:** v1.27; v1.28 (this backfill)
**Related PRs:** #43–#57 (scanner sprint), notably #50 (SDK), #46 (audit trail), #53 (docs + pricing)

## Summary

Published four Sly Scanner endpoints to Coinbase's x402 discovery catalog ([agentic.market](https://agentic.market)) using the existing `publishEndpoint` state machine. Zero new infrastructure: 4 rows in `x402_endpoints` + one publish call per endpoint. Pricing positioned to undercut: $0.05/scan is 50% below the closest comparable; partner channel still 50–86% cheaper.

This is the first major Sly product *visibly listed* in an external agentic marketplace — proof that the publishEndpoint plumbing (Epic 84) works end-to-end and that Sly's own services can ship on the rails Sly built for customers.

## Key Deliverables

- 4 x402 endpoints published to agentic.market:
  - `/x402/scanner/scan` — $0.05 — score a merchant for agentic-commerce readiness
  - `/x402/scanner/tests` — $0.25 — run a synthetic agent shopping test
  - `/x402/scanner/by-domain/:domain` — $0.005 — fetch freshest cached scan
  - `/x402/scanner/prospects` — $0.025 — find agentic-ready prospects in a category
- All settle in USDC on Base via CDP facilitator (`facilitator_mode: 'cdp'`)
- `@sly_ai/scanner` v0.1.0 SDK published to npm (PR #50)
- Scanner dashboard improvements: ledger pagination, scan-modal on ledger row click, audit trail (request_id ↔ scan correlation), ledger-truth credits column
- Scanner JWT proxy via Next.js (server-side flow) — PR #55
- Free-trial credits: 100 credits auto-granted on first scanner key creation — PR #57

## Source-of-Truth Files

- Epic spec: `docs/prd/epics/epic-85-scanner-on-x402-marketplace.md`
- Code paths:
  - `apps/api/src/services/publish-x402.ts` (state machine, pre-existing from Epic 84 — reused)
  - `apps/api/src/routes/x402-endpoints.ts`
  - `apps/scanner/scripts/issue-partner-key.ts`
  - `apps/scanner/src/*` (scanner service, port 4100)
  - `packages/sdk/scanner/*` → `@sly_ai/scanner` npm package
- Backend: `scanner.getsly.ai`

## Linear

- Pre-Linear scanner sprint cluster (PRs visible at [github.com/Sly-devs/sly/pulls?q=is%3Apr+is%3Aclosed+scanner](https://github.com/Sly-devs/sly/pulls?q=is%3Apr+is%3Aclosed+scanner))

## Follow-on Work

- Post-merge polish in flight (working tree, not yet committed): minor `x402-endpoints.ts` route updates + endpoint-detail page additions — tracked inline in the epic doc
- Cross-Marketplace Publishing (Epic 84 — 📋) generalizes the publish flow to multiple catalogs; Bazaar/agentic.market becomes one of many adapters
- x402 Vendor Reliability Observatory (Epic 81 — 📋) will surface reliability scores for Scanner endpoints alongside competitors
- Active maintenance branches: `harden/x402-publish-feature`, `harden/x402-rate-limit-webhooks`, `fix/x402-bazaar-output-schema-coerce`, `fix/x402-publish-poller-domain-lookup`, `fix/x402-proxy-content-encoding`
