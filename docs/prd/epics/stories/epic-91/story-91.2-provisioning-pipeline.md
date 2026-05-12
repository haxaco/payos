# Story 91.2: Provisioning Pipeline — REST + Async Job + Status

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Story 91.1, Epic 87 (KYM tier check)

---

Ship the four-endpoint runtime API on `apps/api`:

```
POST   /v1/marketplaces/:id/runtime/provision    # kick off provisioning
GET    /v1/marketplaces/:id/runtime              # status, URL, version
POST   /v1/marketplaces/:id/runtime/redeploy     # apply config changes
DELETE /v1/marketplaces/:id/runtime              # tear down
```

`POST /provision` validates KYM tier ≥ T1 (T0 cannot provision a managed runtime; they must stay on self-hosted), then enqueues an async job that:
1. Allocates a subdomain `<slug>.sly.market` (or processes the custom domain from Story 91.3)
2. Issues a TLS cert
3. Seeds the default agent pool (if requested)
4. Configures the scenario template
5. Writes `marketplaces.runtime_status = 'provisioned'` and `marketplaces.runtime_url`

Job runs via Vercel Workflow (or BullMQ if Workflow not yet adopted in this codebase) — durable, retryable, with per-step status. `GET /runtime` returns `{status, url, version, lastDeployedAt, currentStep}` so the dashboard can render a live progress indicator.

## Acceptance

- [ ] Provision is idempotent — re-running on an already-provisioned marketplace is a no-op (returns existing URL)
- [ ] KYM T0 marketplaces get 403 with a clear "upgrade KYM tier" message
- [ ] Async job survives process restarts (durable workflow, not in-memory)
- [ ] Status endpoint returns the current step (e.g., "issuing TLS cert") for progress UI
- [ ] DELETE drains traffic, deprovisions DNS, and revokes TLS cert (no orphan certs)
- [ ] Provision-then-deprovision-then-provision cycle works (no stale state)

## Technical notes

Use Vercel Workflow (`vercel-plugin:workflow`) for the durable async job — step-based execution, automatic retries, crash-safe. Each step (allocate subdomain, issue cert, seed agents, etc.) is an idempotent function so reruns are safe. Mirror the structure of `apps/api/src/workers/scheduled-transfers.ts` for the worker side. Reference Epic 67's Railway deploy pattern — managed runtime instances live on Railway just like the API does, but provisioning here means hostname-route entries in the multi-tenant runtime, not new Railway services.

## Dependencies

Story 91.1, Epic 87 (KYM tier check).
