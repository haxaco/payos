# Epic 75 — Marketplace-Sim Cloud Deployment

**Status**: TODO
**Added**: 2026-04-19 during pitch post-mortem
**Priority**: Medium — unblocks remote demos, customer pilots, continuous validation

## Context

The marketplace simulation sidecar (`apps/marketplace-sim/`) currently runs on localhost only. Every demo and every validation round requires the pitcher to have the local stack running. To unblock remote pitches, customer pilots, and nightly validation rounds we need the sim running as a managed service behind the Sly API.

The codebase is already deployment-ready after Epic 75's prep work (commit `354b25d` + security hardening in `2d586c5`):

- Multi-stage Dockerfile (`apps/marketplace-sim/Dockerfile`) — pnpm workspace aware, runs as non-root `node:1000`
- Server binds `127.0.0.1` by default and **refuses to start on `0.0.0.0` without `SIM_SHARED_SECRET`**
- Bearer-token auth on every non-`/health` route when `SIM_SHARED_SECRET` is set
- `.env.example` documents every runtime var; `.gitignore` covers secrets + `tokens.json`
- Sly API client-side wiring (`round-viewer.ts`) already passes `SIM_SHARED_SECRET` + respects `SIM_URL`

## Why NOT Vercel

Vercel is built for short-lived serverless functions (60s default, 300s Fluid). The sim fights that model on four fronts:

1. **Long-running**: scenario runs take 2–10 min per `/run` call
2. **In-memory state**: narration ring buffer, current-run state, schedule — all gone on each cold start
3. **SSE streams**: open for minutes to the live viewer
4. **Parallel LLM fan-out**: wall-clock dominated, not request-dominated

Porting to Vercel durable workflows would be ~1–2 weeks of refactor for zero gain over Railway. **Don't.**

## Why Railway

- Runs long-lived containers (what we need)
- `railway.json` convention already used for `apps/api/`
- Built-in health checks, restart policy, private networking between services
- Our Dockerfile is already compatible

## Plan

### 1. Add `apps/marketplace-sim/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/marketplace-sim/Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Create the Railway service + set env vars

Generate a fresh shared secret, never store it anywhere else:

```bash
openssl rand -hex 32  # copy into SIM_SHARED_SECRET below
```

Railway dashboard (or `railway variables set`):

| Var | Value | Notes |
|---|---|---|
| `SIM_HOST` | `0.0.0.0` | required; the server refuses to start on `0.0.0.0` without `SIM_SHARED_SECRET` |
| `SIM_PORT` | `4500` | Railway also exposes `PORT`; server honors both |
| `SIM_SHARED_SECRET` | 32-byte hex | the **same** value goes on the API service |
| `SIM_TENANT_ID` | `aaaaaaaa-0000-0000-0000-000000000002` | pin sim agents to a demo tenant |
| `SLY_API_URL` | `https://payos-production.up.railway.app` | points at the Sly API service |
| `SLY_PLATFORM_ADMIN_KEY` | copy from API service | allows sim to call `/admin/round/*` |
| `SUPABASE_URL` | same as API | for `scenario_templates` CRUD |
| `SUPABASE_SERVICE_ROLE_KEY` | same as API | |
| `OPENROUTER_API_KEY` | from OpenRouter | for the default `openrouter` processor |
| `ANTHROPIC_API_KEY` | optional | for the `--mode api` processor |
| `BUDGET_USD_CAP` | `5` | per-run LLM cost ceiling |
| `COMPILE_BUDGET_USD_CAP` | `2` | Phase-B compile step ceiling |

### 3. Wire the API → sim

On the **API Railway service**, add:

| Var | Value |
|---|---|
| `SIM_URL` | `https://<sim-service-name>.railway.internal:4500` |
| `SIM_SHARED_SECRET` | **identical** to step 2 |

`railway.internal` is Railway's private service mesh. Do NOT assign a public domain to the sim — the API already proxies every `/admin/round/sim/*` call, so the sim never needs internet exposure.

### 4. Verify

1. `railway deploy` the sim service; watch logs for `[sim-server] listening on http://0.0.0.0:4500` and `[sim-server] auth: shared secret enabled`
2. From the API service, hit `GET /admin/round/sim/health` → expect `{data: {reachable: true, simUrl: '…internal:4500'}}`
3. From the dashboard/live viewer, launch a short `competitive_review_real` round → expect the scenario to run end-to-end with attestations persisted in `a2a_tasks.metadata.attestation`

## Topology

```
[Dashboard app.getsly.ai] ─── HTTPS ──▶ [API Railway service]
                                              │
                                              │ /admin/round/sim/* (proxied, internal network)
                                              ▼
                                   [Sim Railway service]  ◀── no public domain
                                    │
                                    ├── Supabase (service role) — scenario_templates, runs, feedback
                                    ├── OpenRouter / Anthropic — LLM inference
                                    └── Sly API via SLY_API_URL — agent tokens, mandates, ratings
```

All LLM + on-chain writes flow outbound from the sim; nothing inbound from the internet. Correct posture given the sim controls `seed-agent`, `run`, and `attest`.

## Non-goals for v1

- Autoscaling — single replica is fine for demo loads
- Hot reload of scenario templates from external sources
- Cost dashboards — `BUDGET_USD_CAP` is the guardrail; observability comes later

## Follow-on work (Epic 75.x)

- **75.2 Run scheduler**: cron + `POST /schedule` so the sim runs nightly validation rounds without a human click
- **75.3 Cost observability**: surface `runs-store` totals in the dashboard; alert when a tenant's monthly LLM spend exceeds N
- **75.4 Multi-region**: if latency to Anthropic/OpenRouter becomes a concern, pin sim to us-east-1 where those providers live
- **75.5 Cleanup job**: evict `a2a_tasks` + `a2a_messages` older than 30 days for sim-originated tenants to cap DB bloat

## Verification

- Sim container starts clean on Railway, bind to `0.0.0.0`, shared secret enforced
- API reaches sim over private network, auth works, rounds complete end-to-end
- No LLM cost exceeds budget caps across 5 consecutive runs
- Dashboard `/admin/round/sim/status` returns the running scenario while a round is live
