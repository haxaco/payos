# Epic 74: Paperclip Integration — Sly as the Economic Rail

**Status:** Planned
**Phase:** 5.0 (Platform Integrations)
**Priority:** P1
**Total Points:** 55 (estimated)
**Stories:** 11
**Dependencies:** Epic 72 (Agent Key-Pair Auth — completed)
**Created:** April 14, 2026

**Doc:** `docs/prd/epics/epic-74-paperclip-integration.md`
**Demo repo:** `~/Dev/sly-integrations/paperclip-demo/`
**RFC:** `~/Dev/sly-integrations/paperclip-demo/ONBOARDING_RFC.md`
**Demo flow:** `~/Dev/sly-integrations/paperclip-demo/DEMO_FLOW.md`

---

## Overview

[Paperclip](https://paperclip.ing) (44k GitHub stars, MIT) is an open-source orchestration platform for autonomous AI companies. Agents are modeled as employees with roles, org charts, budgets, and approval flows — but it has zero payment/wallet/identity primitives. Sly fills that gap exactly: every Paperclip employee becomes a Sly agent with a verified identity, an on-chain EOA, a spending policy translated from their Paperclip budget, and a cryptographic kill-switch.

This epic covers the Sly server-side changes needed to make platform onboarding frictionless (not just for Paperclip — for any agent orchestration platform), plus the demo/adapter work to prove it end-to-end.

---

## Strategic Context

**Problem:** Integrating an agent-orchestration platform with Sly today requires discovering undocumented constraints (e.g., `auto_create_wallet` silently fails without `accountId`), writing a custom shim, and manually wiring escalation/approval round-trips. There's no way to tag agents by their source platform, no bulk create, no one-time spend approval token, and no inbound event webhook.

**Solution:** Six server-side changes that make Sly platform-integration-ready, plus a published adapter package and optional OAuth flow. The changes are platform-agnostic — Paperclip is the first customer, not the only one.

**Why now:** Epic 72 (Ed25519 key-pair auth) just shipped. Agents can now authenticate via challenge-response with short-lived sessions. The auth layer is production-ready; the onboarding and governance layer hasn't caught up.

---

## Stories

### Phase 1: Sly Server-Side Foundation (30 pts)

| # | Story | Points | Priority | Status |
|---|-------|--------|----------|--------|
| 74.1 | Default business account bootstrap | 3 | P0 | Planned |
| 74.2 | Platform tagging on API keys and agents | 5 | P0 | Planned |
| 74.3 | Bulk agent create endpoint | 8 | P1 | Planned |
| 74.4 | One-time spend approval token | 8 | P1 | Planned |
| 74.5 | Inbound platform event webhook | 8 | P1 | Planned |
| 74.6 | Platform-scoped KYA defaults | 3 | P2 | Planned |

### Phase 2: Demo & Adapter (25 pts)

| # | Story | Points | Priority | Status |
|---|-------|--------|----------|--------|
| 74.7 | Harden demo against live Paperclip instance | 5 | P0 | Planned |
| 74.8 | Build mock x402 endpoint for Act 3 | 3 | P1 | Planned |
| 74.9 | Publish @sly_ai/paperclip-adapter (Tier 1) | 8 | P0 | Planned |
| 74.10 | Build "Connect Sly" OAuth page (Tier 2) | 5 | P2 | Planned |
| 74.11 | Record 90-second GIF + 8-minute video | 3 | P1 | Planned |

---

## Story Details

### 74.1: Default Business Account Bootstrap (3 pts)

When `POST /v1/agents` is called with `auto_create_wallet: true` and no `accountId`, fall back to a default "Agents" business account auto-provisioned on tenant creation.

**Problem:** `auto_create_wallet` silently skips wallet creation without `accountId` (`agents.ts:392`). Every integrator discovers this the hard way.

**Fix:** One migration (add `default_agent_account_id` to tenants), one branch in the create handler.

**Files:** `apps/api/src/routes/agents.ts`, `apps/api/supabase/migrations/`

### 74.2: Platform Tagging on API Keys and Agents (5 pts)

Add nullable `platform` column to `api_keys` and `agents`. Set via OAuth flow or `POST /v1/platforms/register`. Every agent created with a platform-tagged key inherits the tag. Propagate to audit log and dashboard analytics.

**Files:** `apps/api/src/middleware/auth.ts`, `apps/api/supabase/migrations/`

**Depends on:** 74.1

### 74.3: Bulk Agent Create Endpoint (8 pts)

`POST /v1/agents:batch` accepting up to 100 agent specs, each with optional `evm_key: true` and `policy: {...}`. Cuts 60 round-trips to 1 for platforms onboarding many agents at once.

**Files:** `apps/api/src/routes/agents.ts`

**Depends on:** 74.1

### 74.4: One-Time Spend Approval Token (8 pts)

`POST /v1/agents/:id/wallet/policy/approve-spend` accepting the original evaluation id, returning a single-use `spend_<uuid>` token. Consumable by `x402-sign` or `x402/pay` to bypass `requiresApprovalAbove` for one specific spend. Closes the escalation round-trip loop.

**Files:** `apps/api/src/routes/agent-wallets.ts`, `apps/api/src/services/contract-policy-engine.ts`, new migration

### 74.5: Inbound Platform Event Webhook (8 pts)

`POST /v1/platforms/:platform/events` accepting typed payloads (`employee.hired`, `employee.fired`, `budget.exceeded`). Maps events to agent lifecycle actions (create, freeze, archive). HMAC-SHA256 signing with per-platform shared secret.

**Files:** new route `apps/api/src/routes/platform-events.ts`, new migration

**Depends on:** 74.2

### 74.6: Platform-Scoped KYA Defaults (3 pts)

Policy config keyed on the `platform` field from 74.2. Default tier, auto-upgrade rules, max tier caps.

**Files:** new config table, modify `apps/api/src/routes/agents.ts` (create/verify handlers)

**Depends on:** 74.2

### 74.7: Harden Demo Against Live Paperclip Instance (5 pts)

Pin `HttpPaperclipClient` endpoint shapes against a real local Paperclip instance (`npx paperclipai onboard`). Verify employee CRUD, approval flow, audit endpoints. Update `paperclip-client.ts` with correct paths. Record gaps in `GAPS.md`.

**Repo:** `~/Dev/sly-integrations/paperclip-demo/`

### 74.8: Build Mock x402 Endpoint for Act 3 (3 pts)

Scaffold a tiny local x402 server in the demo repo so `pnpm run run` exercises the full `evaluate → sign → pay → receipt` loop without any external dependency.

**Repo:** `~/Dev/sly-integrations/paperclip-demo/`

### 74.9: Publish @sly_ai/paperclip-adapter (Tier 1) (8 pts)

Extract `adapter.ts` + `sly-client.ts` from the demo repo into a publishable npm package. Include CLI (`npx sly-paperclip init`).

**Depends on:** 74.1, 74.2, 74.7

### 74.10: Build "Connect Sly" OAuth Page (Tier 2) (5 pts)

Hosted page at `app.sly.ai/connect?platform=paperclip&redirect=…` that auto-creates tenant + default business account + scoped API key, redirects back. Only build if BD asks for it.

**Depends on:** 74.9

### 74.11: Record 90-Second GIF + 8-Minute Video (3 pts)

Using the demo flow from `DEMO_FLOW.md`: record the 90-second GIF (Acts 2, 4, 5) and the full 8-minute version (all 6 acts). Produce the BD artifact `out/run-<timestamp>.md`.

**Depends on:** 74.7, 74.8

---

## Dependency Graph

```
74.1 (default account) ──┬──> 74.2 (platform tagging) ──┬──> 74.6 (KYA defaults)
                         │                               │
                         ├──> 74.3 (bulk create)         ├──> 74.5 (event webhook)
                         │                               │
                         └───────────────────────────────>├──> 74.9 (publish adapter)
                                                         │         │
74.7 (harden demo) ─────────────────────────────────────>┘         │
       │                                                           ▼
       └──> 74.11 (record GIF/video)                         74.10 (OAuth page)
       │
74.8 (mock x402) ──> 74.11

74.4 (approval token) — independent, unblocked
```

---

## Demo Artifacts (already built)

The following exist in `~/Dev/sly-integrations/paperclip-demo/`:

- `src/sly-client.ts` — typed HTTP client over Sly public API
- `src/paperclip-client.ts` — HTTP client + MockPaperclipClient
- `src/adapter.ts` — PaperclipSlyAdapter shim (onHire, onSpend, onFreeze)
- `src/scenarios/` — hire, x402-pay, escalate, freeze scenarios
- `src/run.ts` — top-level driver producing unified timeline artifact
- `ONBOARDING_RFC.md` — design doc for the three onboarding tiers
- `DEMO_FLOW.md` — 6-act demo narrative with fallback modes
- `README.md` — prereqs, env vars, known rough edges

All typecheck clean. Sly repo untouched — demo only speaks to the public HTTP surface.

---

## Open Questions

1. **Scoped API keys** — does the existing `api_keys` table support scoping a key to a single business account?
2. **Webhook signing** — HMAC-SHA256 with per-platform shared secret issued at OAuth time?
3. **Platform agent IDs** — unique per (platform, tenant) or globally?
4. **Backfill** — `npx sly-paperclip backfill` for existing Paperclip employees?
5. **Rate limits on bulk create** — 100 agents per call, 10 calls per minute?
