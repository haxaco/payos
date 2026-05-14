# Epic 71: Machine Payments Protocol (MPP) Integration — Complete

**Status:** ✅ Complete
**Completion Date:** March 20, 2026 (per Linear)
**Points Delivered:** 81 (originally scoped, all stories Done in Linear)
**Stories:** 16/16
**PRD Version:** v1.26 (introduced); v1.28 (this backfill)
**Linear:** [Epic 71 project](https://linear.app/sly-ai/project/epic-71-mpp-integration-7bbb1da7de72) — **all stories SLY-477 → SLY-492 closed**

> **Backfill note:** PRD master v1.28 status matrix originally listed Epic 71 as "📋 Pending" because v1.26 introduced it as Planned. Linear reconciliation on 2026-05-14 surfaced that all 16 stories actually closed Mar 20, 2026. The matrix has since been corrected.

## Summary

Sly integrated the Machine Payments Protocol (MPP) — an IETF-track protocol co-authored by Stripe and Tempo Labs that standardizes HTTP 402 for machine-to-machine payments. After this epic, Sly agents gained access to the MPP service directory (100+ paid services at launch including OpenAI, Anthropic, Shopify) under the same governance umbrella that already covered x402, AP2, ACP, UCP. Tempo mainnet went live simultaneously; Tempo became the primary payment method (permissionless), with Stripe method conditional on access approval.

The strategic value: MPP filled the governance gap in the M2M payment space. The MPP spec has no KYA, no spending policies, no kill switch. Sly wrapped the official `mppx` SDK with its policy engine, audit trail, and tier limits — turning a payment protocol into a governed payment platform.

## Key Deliverables (4 Phases, 16 Stories)

### Phase 1: Client Foundation (30 pts)
- 71.1 — `mppx` TypeScript SDK installed + Tempo as default payment method
- 71.2 — MPP Governance Middleware (policy intercept before credential signing)
- 71.3 — MPP data model (`protocol_metadata`, `settlement_network` column, MppMetadata Zod schemas)
- 71.4 — Audit trail via CloudEvents (new OpType registry: `mpp.challenge.received`, `mpp.policy.checked`, etc.)
- 71.5 — Agent MPP wallet provisioning (Tempo network added to enum, EVM keypair generation)
- 71.6 — MPP transfer recording + history APIs

### Phase 2: Sessions and Streaming (18 pts)
- 71.7 — Governed MPP Session Manager (open/close/voucher lifecycle with KYA + policy checks)
- 71.8 — Session API endpoints (`POST /v1/agents/:id/mpp/sessions` etc.)
- 71.9 — Session spending policies (max deposit, concurrent sessions, idle timeout, etc.)
- 71.10 — Streamed payment support over SSE (per-token charging with budget kill)

### Phase 3: Server Integration (13 pts)
- 71.11 — MPP server middleware for Hono (`Mppx.create(...)` on any Sly endpoint)
- 71.12 — Payer KYA verification (4-tier access ladder for inbound MPP payments)
- 71.13 — MPP receipt reconciliation (server-issued + client-received both stored)

### Phase 4: Dashboard and Discovery (12 pts)
- 71.14 — MPP dashboard pages under Agentic Payments
- 71.15 — MPP service discovery API (`GET /v1/mpp/services`, `/v1/mpp/services/:domain/pricing`)
- 71.16 — MPP analytics (cross-protocol unified analytics extension)

## Source-of-Truth Files

- Epic spec: `docs/prd/epics/epic-71-mpp-integration.md`
- Code paths:
  - `apps/api/src/services/mpp/*` (governance middleware, session manager, receipt reconciliation)
  - `apps/api/src/routes/mpp-sessions.ts`, `mpp-services.ts`
  - `apps/api/src/workers/mpp-session-manager.ts`
  - `apps/web/src/app/dashboard/agentic-payments/mpp/*`
  - `packages/types/src/protocols/mpp.ts`
- Migrations: `apps/api/supabase/migrations/*mpp*.sql`
- Tests: `apps/api/tests/integration/mpp-*.test.ts`

## Linear

- Project: [Epic 71: MPP Integration](https://linear.app/sly-ai/project/epic-71-mpp-integration-7bbb1da7de72) — **state: Completed**
- Tickets: SLY-477 through SLY-492, all `Done`

## Follow-on Work

- Epic 97 Story 97.16 — coordinates with Epic 71 so MPP credential signing also emits a bilateral signed receipt. The integration *spec* lands as part of Epic 97; the actual *hook* is a follow-up commit on the Sly side that imports the MPP middleware.
- Cross-Marketplace Publishing (Epic 84 — 📋) will eventually publish Sly endpoints to the MPP service directory as a fanout target.
- Cross-protocol analytics (Story 71.16) shipped a unified analytics view; future expansion to per-customer billing is on the roadmap.
