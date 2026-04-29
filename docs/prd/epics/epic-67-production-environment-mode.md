# Epic 67: Production Environment Mode — Separate Deployments

**Status:** Planned
**Priority:** P0
**Total Points:** 88
**Linear Project:** [Epic 67](https://linear.app/sly-ai/project/epic-67-production-environment-mode-bf3c3c4baf78)

## Overview

The sandbox/production toggle in the dashboard header is non-functional. The platform has three disconnected environment concepts — a cosmetic header toggle (`useState` in `header.tsx`), API key environment prefixes (`pk_test_*` / `pk_live_*` stored but only checked in one place), and onboarding `sandbox_mode` (purely informational boolean in `tenants.settings`). None of these actually isolate data or route to different blockchain networks.

This epic makes production mode real via **separate deployments** — two Railway instances of the same codebase with different environment variables, sharing a single Supabase project with an `environment` column for defense-in-depth tagging.

## Executive Summary

**Problem:** No data isolation between sandbox and production. A `pk_test_*` key and a `pk_live_*` key see identical data. The blockchain config (`getCurrentChain()`) is a global server setting, not per-request. Tenants cannot safely test in sandbox then go live.

**Root Causes Identified:**
1. **Service role key bypasses ALL RLS** — `apps/api/src/db/client.ts` uses `SUPABASE_SERVICE_ROLE_KEY`, so RLS policies don't actually protect anything
2. **Single EVM private key** per server — sandbox and production would share a hot wallet
3. **Global blockchain routing** — `getCurrentChain()` in `blockchain.ts:96-98` reads `PAYOS_ENVIRONMENT` env var (not per-request)
4. **Single Circle API key** per instance — can't serve both sandbox and live Circle from one process
5. **Rate limiting force-disabled** — `true ||` at `rate-limit.ts:42`

**Solution:** Separate deployments (two Railway services, same codebase, different env vars). Same Supabase project with `environment` column for defense-in-depth tagging.

**Why Not Column + RLS?** The original plan (v1.24) proposed column + RLS isolation on a single server. Architecture review revealed this is unsafe for real money because the service role key bypasses all RLS, and blockchain/Circle/EVM credentials are inherently per-process globals. Separate deployments eliminate these risks entirely.

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `GET /v1/context/whoami` (env fields) | ⚠️ Types | Types only | P0 | Add environment fields to WhoAmI type |
| `POST /v1/organization/production/activate` | ❌ No | - | - | Admin-only, not for partners |
| Environment on entities | ⚠️ Types | Types only | P1 | Add optional `environment` to interfaces |

**SDK Stories Required:**
- [ ] Update `@sly/types` with `Environment` type (part of Story 67.3)

---

## Architecture

### Separate Deployments Approach

```
Sandbox Instance                    Production Instance
├── PAYOS_ENVIRONMENT=sandbox       ├── PAYOS_ENVIRONMENT=production
├── EVM_PRIVATE_KEY=<testnet>       ├── EVM_PRIVATE_KEY=<mainnet>
├── CIRCLE_API_KEY=test_*           ├── CIRCLE_API_KEY=live_*
├── RPC: Base Sepolia               ├── RPC: Base Mainnet
├── api-sandbox.getsly.ai           ├── api.getsly.ai
└── Same Supabase project ──────────┘  (environment column for tagging)
```

**Key principles:**
- Each instance gets its own EVM private key, Circle API key, and blockchain RPC URL
- The `environment` column on core tables provides defense-in-depth tagging (not primary isolation)
- The sandbox server rejects `pk_live_*` API keys; the production server rejects `pk_test_*`
- The UI toggle switches the API base URL (not an `X-Environment` header)

### Environment Mapping

| Auth Method | Sandbox Instance | Production Instance |
|-------------|-----------------|---------------------|
| API Key `pk_test_*` | ✅ Accepted | ❌ Rejected |
| API Key `pk_live_*` | ❌ Rejected | ✅ Accepted |
| JWT Session | ✅ (environment from server config) | ✅ (environment from server config) |
| Agent Token | ✅ (sandbox agents only) | ✅ (production agents only) |

### Blockchain Routing

No per-request routing needed — each instance has its own chain config:

| Instance | Network | Chain ID | RPC |
|----------|---------|----------|-----|
| Sandbox | Base Sepolia (testnet) | 84532 | Alchemy/Infura testnet |
| Production | Base Mainnet | 8453 | Alchemy/Infura mainnet |

---

## Stories

### Phase 1: Foundation — 24 pts

| Story | Linear | Points | Priority | Labels | Status | Action |
|-------|--------|--------|----------|--------|--------|--------|
| 67.1: Environment column migration (defense-in-depth tagging) | [SLY-413](https://linear.app/sly-ai/issue/SLY-413) | 5 | P0 | Infrastructure | Backlog | UPDATE |
| 67.2: Server environment validation middleware | [SLY-416](https://linear.app/sly-ai/issue/SLY-416) | 3 | P0 | Security | Backlog | UPDATE |
| 67.3: Extend RequestContext with environment + whoami + types | [SLY-433](https://linear.app/sly-ai/issue/SLY-433) | 3 | P0 | API | Backlog | MERGE (SLY-415 + SLY-417 + SLY-418) |
| 67.4: Health check environment reporting | [SLY-434](https://linear.app/sly-ai/issue/SLY-434) | 2 | P1 | Infrastructure | Backlog | NEW |
| 67.5: Environment column auto-stamping in route handlers | [SLY-435](https://linear.app/sly-ai/issue/SLY-435) | 8 | P0 | API | Backlog | MERGE (SLY-420 + SLY-421 + SLY-422) |
| 67.6: Workers environment scoping | [SLY-423](https://linear.app/sly-ai/issue/SLY-423) | 3 | P1 | Infrastructure | Backlog | UPDATE |

#### Story Details

**67.1: Environment column migration**
Add `environment TEXT NOT NULL DEFAULT 'sandbox'` to 7 core tables (accounts, transfers, wallets, agents, streams, ledger_entries, quotes). Create composite indexes `(tenant_id, environment)`. All existing data stays as `sandbox`.

**67.2: Server environment validation middleware**
New middleware reads `PAYOS_ENVIRONMENT` from server config (not per-request). Rejects API keys that don't match the server's environment (e.g., `pk_live_*` on sandbox server returns 403). Sets `ctx.environment` from server config.

**67.3: Extend RequestContext + whoami + types**
Add `environment` field to `RequestContext` interface. Update `GET /v1/context/whoami` to include `environment`, `instance_type`, and `chain_id`. Add `Environment` type to `@sly/types`.

**67.4: Health check environment reporting**
Update `GET /health` and `GET /ready` to include `environment`, `chain_id`, and instance metadata. Monitoring can distinguish sandbox vs production instances.

**67.5: Environment column auto-stamping in route handlers**
Single pass across all route handlers (accounts, transfers, wallets, agents, streams, etc.) to:
- Add `.eq('environment', ctx.environment)` to all read queries
- Set `environment: ctx.environment` on all write operations
- Cover core CRUD, protocol routes (x402, AP2, ACP, UCP), and secondary routes

**67.6: Workers environment scoping**
Update scheduled transfers worker and any other background workers to read `PAYOS_ENVIRONMENT` from server config and scope all queries to that environment.

### Phase 2: Production Guardrails — 16 pts

| Story | Linear | Points | Priority | Labels | Status | Action |
|-------|--------|--------|----------|--------|--------|--------|
| 67.7: Block sandbox-only features on production | [SLY-430](https://linear.app/sly-ai/issue/SLY-430) | 5 | P0 | Security | Backlog | UPDATE |
| 67.8: Fix & enable rate limiting | [SLY-436](https://linear.app/sly-ai/issue/SLY-436) | 5 | P0 | Security | Backlog | NEW |
| 67.9: Production activation gate | [SLY-429](https://linear.app/sly-ai/issue/SLY-429) | 6 | P1 | API | Backlog | UPDATE |

#### Story Details

**67.7: Block sandbox-only features on production**
Check `getEnvironment() === 'production'` and block: `wallet_test_fund`, mock scheduled transfers, seed data endpoints. Return 403 with clear error message.

**67.8: Fix & enable rate limiting**
Remove `true ||` override at `rate-limit.ts:42`. Set environment-aware limits: 100 req/min production, 1000 req/min sandbox. Fix any issues exposed by re-enabling rate limiting.

**67.9: Production activation gate**
Add `POST /v1/organization/production/activate` and `GET /v1/organization/production/status`. Gate activation on: KYC tier >= 1 on at least one account, onboarding complete, at least one `pk_live_*` API key created. Store activation state in `tenants.settings`.

### Phase 3: Infrastructure / DevOps — 16 pts

| Story | Linear | Points | Priority | Labels | Status | Action |
|-------|--------|--------|----------|--------|--------|--------|
| 67.10: Railway dual deployment config | [SLY-437](https://linear.app/sly-ai/issue/SLY-437) | 5 | P0 | DevOps | Backlog | NEW |
| 67.11: Vercel dashboard env config | [SLY-438](https://linear.app/sly-ai/issue/SLY-438) | 3 | P1 | DevOps | Backlog | NEW |
| 67.12: CORS config for dual deployments | [SLY-439](https://linear.app/sly-ai/issue/SLY-439) | 3 | P0 | DevOps | Backlog | NEW |
| 67.13: EVM wallet + secrets documentation | [SLY-440](https://linear.app/sly-ai/issue/SLY-440) | 2 | P1 | Docs | Backlog | NEW |
| 67.14: CI/CD pipeline for dual deployments | [SLY-441](https://linear.app/sly-ai/issue/SLY-441) | 3 | P1 | DevOps | Backlog | NEW |

#### Story Details

**67.10: Railway dual deployment config**
Set up two Railway services from the same repo: `sly-api-sandbox` and `sly-api-production`. Each gets its own env vars (PAYOS_ENVIRONMENT, EVM_PRIVATE_KEY, CIRCLE_API_KEY, RPC URLs). Custom domains: `api-sandbox.getsly.ai` and `api.getsly.ai`.

**67.11: Vercel dashboard env config**
Configure the Next.js dashboard (`apps/web`) to support environment switching. Add `NEXT_PUBLIC_API_URL_SANDBOX` and `NEXT_PUBLIC_API_URL_PRODUCTION` env vars. The environment toggle switches which API URL the client uses.

**67.12: CORS config for dual deployments**
Update CORS middleware in `apps/api/src/app.ts` to accept requests from the dashboard domain. Each Railway instance allows the Vercel dashboard origin. Production instance has stricter CORS policy.

**67.13: EVM wallet + secrets documentation**
Document the secrets management strategy: separate EVM wallets for sandbox/production, key rotation procedures, Railway secret management. Include a checklist for production launch.

**67.14: CI/CD pipeline for dual deployments**
Ensure both Railway services deploy from the same branch (main). Add deployment checks: health endpoint verification post-deploy, environment label validation, rollback procedures.

### Phase 4: UI Integration — 18 pts

| Story | Linear | Points | Priority | Labels | Status | Action |
|-------|--------|--------|----------|--------|--------|--------|
| 67.15: Environment context provider + API client URL switching | [SLY-425](https://linear.app/sly-ai/issue/SLY-425) | 8 | P0 | UI | Backlog | UPDATE |
| 67.16: Functional header toggle | [SLY-426](https://linear.app/sly-ai/issue/SLY-426) | 5 | P0 | UI | Backlog | UPDATE |
| 67.17: Environment badges on data views | [SLY-427](https://linear.app/sly-ai/issue/SLY-427) | 3 | P2 | UI | Backlog | KEEP |
| 67.18: API keys page environment awareness | [SLY-428](https://linear.app/sly-ai/issue/SLY-428) | 2 | P1 | UI | Backlog | UPDATE |

#### Story Details

**67.15: Environment context provider + API client URL switching**
Create `EnvironmentProvider` that manages current environment state (persisted to localStorage). Update the API client to switch base URL between sandbox and production API endpoints. Handle auth token differences between environments (user may need to re-authenticate).

**67.16: Functional header toggle**
Wire the existing cosmetic toggle to the `EnvironmentProvider`. Add confirmation dialog when switching to production ("You are switching to production mode. Real money will be used."). Show lock icon on production. Persist selection.

**67.17: Environment badges on data views**
Add subtle environment badges to accounts, transfers, agents, and other entity views. Useful when viewing data that was created in a different environment context.

**67.18: API keys page environment awareness**
Label API keys with their environment (sandbox/production). Group or filter by environment. Show which keys work with which API instance.

### Phase 5: Migration & Rollout — 14 pts

| Story | Linear | Points | Priority | Labels | Status | Action |
|-------|--------|--------|----------|--------|--------|--------|
| 67.19: Migration verification script | [SLY-431](https://linear.app/sly-ai/issue/SLY-431) | 5 | P0 | Infrastructure | Backlog | KEEP |
| 67.20: Seed script updates | [SLY-432](https://linear.app/sly-ai/issue/SLY-432) | 3 | P2 | Infrastructure | Backlog | KEEP |
| 67.21: RLS policies (defense-in-depth) | [SLY-414](https://linear.app/sly-ai/issue/SLY-414) | 3 | P2 | Security | Backlog | UPDATE |
| 67.22: Production launch runbook | [SLY-442](https://linear.app/sly-ai/issue/SLY-442) | 3 | P1 | Docs | Backlog | NEW |

#### Story Details

**67.19: Migration verification script**
Script that verifies: environment column exists on all 7 tables, all existing data has `environment='sandbox'`, both instances respond on health endpoints with correct environment labels, API key/environment mismatch rejection works.

**67.20: Seed script updates**
Update seed script to set `environment: 'sandbox'` on all seeded data. Ensure seed only runs on the sandbox instance.

**67.21: RLS policies (defense-in-depth)**
Add RLS policies that filter by `environment` column. These are defense-in-depth only — the service role key bypasses RLS, so primary isolation comes from separate deployments. Still worth having for any future use of anon/authenticated roles.

**67.22: Production launch runbook**
Step-by-step checklist for going live: Railway setup, DNS configuration, secrets provisioning, database migration, smoke tests, monitoring verification, rollback plan.

---

## Dependencies

```
67.1 (schema) ──→ 67.5 (route stamping)
              ──→ 67.6 (workers)
              ──→ 67.19 (verification)
              ──→ 67.20 (seed)
              ──→ 67.21 (RLS)

67.2 (validation middleware) ──→ 67.5 (route stamping)
                             ──→ 67.7 (sandbox blocks)
                             ──→ 67.8 (rate limiting)

67.3 (RequestContext) ──→ 67.2 (validation middleware)
                      ──→ 67.4 (health check)

67.10 (Railway) ──→ 67.11 (Vercel)
               ──→ 67.12 (CORS)
               ──→ 67.14 (CI/CD)

67.15 (UI provider) ──→ 67.16 (header toggle)
                    ──→ 67.17 (badges)
                    ──→ 67.18 (API keys page)

67.9 (activation gate) ── independent after 67.2

67.13 (docs) ── independent
67.22 (runbook) ── after 67.10
```

### Critical Path

`67.1 + 67.3 → 67.2 → 67.5 → 67.7` (Schema + Context → Validation → Route stamping → Guardrails)

### Parallel Tracks

- **Schema track:** 67.1 → 67.19, 67.20, 67.21
- **Middleware track:** 67.3 → 67.2 → 67.5 → 67.7, 67.8
- **Infra track:** 67.10 → 67.11, 67.12, 67.14 → 67.22
- **UI track:** 67.15 → 67.16, 67.17, 67.18
- **Workers:** 67.6 (after 67.1)
- **Activation:** 67.9 (after 67.2)

---

## Linear Issue Disposition

| Original Issue | Action | Reason |
|---|---|---|
| SLY-413 (67.1 schema) | UPDATE | Reduce to 5 pts, update description for defense-in-depth role |
| SLY-414 (67.2 RLS) | UPDATE → 67.21 | Renumber, demote to P2, reduce to 3 pts |
| SLY-415 (67.3 RequestContext) | MERGE into new 67.3 | Combined with SLY-417 + SLY-418 |
| SLY-416 (67.4 middleware) | UPDATE → 67.2 | Simplify to server validation |
| SLY-417 (67.5 whoami) | MERGE into 67.3 | Combined with SLY-415 |
| SLY-418 (67.6 types) | MERGE into 67.3 | Types shipped as part of RequestContext story |
| SLY-419 (67.7 blockchain) | ARCHIVE | Not needed — each instance has its own chain |
| SLY-420 (67.8 core routes) | MERGE into 67.5 | One pass across all routes |
| SLY-421 (67.9 secondary routes) | MERGE into 67.5 | One pass |
| SLY-422 (67.10 protocol routes) | MERGE into 67.5 | One pass |
| SLY-423 (67.11 workers) | UPDATE → 67.6 | Simpler (read server env) |
| SLY-424 (67.12 guards) | ARCHIVE | Cross-env guards not needed with separate servers |
| SLY-425 (67.13 UI provider) | UPDATE → 67.15 | Switch API base URL, not header |
| SLY-426 (67.14 toggle) | UPDATE → 67.16 | Add confirmation + lock |
| SLY-427 (67.15 badges) | KEEP → 67.17 | Unchanged |
| SLY-428 (67.16 API keys) | UPDATE → 67.18 | Simplify |
| SLY-429 (67.17 activation) | UPDATE → 67.9 | Reduce scope |
| SLY-430 (67.18 guardrails) | UPDATE → 67.7 | Simplify check |
| SLY-431 (67.19 verification) | KEEP | Add dual-instance health check |
| SLY-432 (67.20 seed) | KEEP | Unchanged |

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/supabase/migrations/20260316_environment_column.sql` | Schema migration |
| `apps/api/supabase/migrations/20260316_environment_rls.sql` | Defense-in-depth RLS policies |
| `apps/api/src/middleware/auth.ts` | RequestContext (lines 7-24) |
| `apps/api/src/middleware/environment.ts` | New server environment validation middleware |
| `apps/api/src/middleware/rate-limit.ts` | Fix `true ||` override (line 42) |
| `apps/api/src/config/environment.ts` | Server environment config |
| `apps/api/src/routes/context.ts` | Whoami endpoint |
| `apps/api/src/services/production-activation.ts` | Activation logic |
| `apps/web/src/providers/environment-provider.tsx` | UI context provider |
| `apps/web/src/components/layout/header.tsx` | Current cosmetic toggle |
| `apps/web/src/lib/api-client.tsx` | API client URL switching |
| `packages/types/src/index.ts` | Shared types |

## Design Decisions

1. **Separate deployments over column + RLS** — Service role key bypasses all RLS. Separate processes with different EVM keys, Circle keys, and RPC URLs provide real isolation. Column + RLS is defense-in-depth only.
2. **Same Supabase project** — Both instances share one database. The `environment` column tags data but primary isolation is at the deployment level. This avoids schema sync issues between two databases.
3. **Default to sandbox** — All existing data becomes sandbox. No breaking changes.
4. **UI switches API base URL** — Dashboard users toggle between `api-sandbox.getsly.ai` and `api.getsly.ai`. No `X-Environment` header needed.
5. **API key/env mismatch rejection** — Sandbox server rejects `pk_live_*`, production rejects `pk_test_*`. Hard boundary, not soft.
6. **Production requires activation** — Prevents accidental mainnet usage. Gate on KYC + onboarding + live API key.
7. **Fix rate limiting first** — The `true ||` override must be removed before production launch.
8. **test-fund blocked in production** — No free money on mainnet.
