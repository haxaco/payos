# Epic 79: API Monetization Gateway

## Summary

Ship a thin proxy that turns any REST API into a paid endpoint over x402 (and MPP once Epic 71 lands), plus a CLI + dashboard that ingests an OpenAPI spec and auto-creates paid endpoints. Directly addresses the two gaps identified in the Sponge Gateway competitive audit (April 22, 2026): (1) generic REST→paid gateway, (2) OpenAPI ingest.

## Motivation

Sponge Gateway (YC W26) launched a revamped product on April 22, 2026 with a one-line pitch: *"point at your upstream API, done."* We have every primitive needed — x402 endpoint registration, payment verification, on-chain settlement reconciliation via `X-PAYMENT-RESPONSE` (shipped in commit `b55ad8c`) — but no thin proxy UX that wraps an existing REST service, and no OpenAPI ingest. Today `x402_create_endpoint` requires manual per-route config.

Three concrete segments want this today:
1. **API providers** who have a REST service (weather, LLM, geocoding, data) and want to charge per-request in USDC without writing x402-specific code.
2. **Platform integrators** who have an OpenAPI spec and want every endpoint monetized in one command.
3. **Enterprise internal APIs** that need per-call metering across 100+ endpoints — manual registration doesn't scale.

Without this epic, Sly's x402 offering requires the provider to write code. Sponge's doesn't. That's the positioning gap.

## Scope

Protocol-agnostic gateway with **x402 as the v1 target**. MPP support becomes a downstream extension once Epic 71 Phase 3 (server middleware) lands.

**Out of scope:**
- TCP / GraphQL / gRPC proxying (REST-over-HTTP only)
- Streaming responses (SSE/chunked) — deferred to v2
- Upstream response transformation / schema mapping
- Multi-region edge deployment (single-region v1)

## Prerequisites

- None for Phases 1–4. All primitives already live: `apps/api/src/routes/x402-endpoints.ts`, `x402-payments.ts`, `services/bridge/x402-to-circle.ts`.
- Phase 5 (MPP protocol dispatch) depends on **Epic 71 Phase 3** — server-side MPP middleware.

## Code changes

### 1. Gateway route — `apps/api/src/routes/x402-gateway.ts` (new)

Single dynamic catch-all that proxies incoming agent requests to the configured upstream:

- `ALL /v1/gateway/:gatewayId/*` → match route config → enforce x402 (reuse existing `x402_verify`) → forward to upstream → return response
- Forwards upstream auth (bearer, API key header, custom header) from gateway config — **agent never sees upstream credentials**
- Per-route pricing override resolution: route-level beats gateway default
- Supports the `"upto"` pattern: after upstream responds, compute final price, emit `X-PAYMENT-RESPONSE`, reconcile via existing ledger pipeline

### 2. Schema — two new tables

Migration `YYYYMMDD_api_monetization_gateway.sql`:

```sql
CREATE TABLE x402_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  upstream_base_url TEXT NOT NULL,
  upstream_auth JSONB,         -- { type: 'bearer', token_encrypted } | { type: 'api_key', header, value_encrypted }
  default_pricing JSONB NOT NULL,  -- { base: '0.01', asset: 'USDC', network: 'base-sepolia' }
  protocol TEXT NOT NULL DEFAULT 'x402'
    CHECK (protocol IN ('x402', 'mpp')),  -- mpp gated until Epic 71 ships
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE x402_gateway_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID NOT NULL REFERENCES x402_gateways(id) ON DELETE CASCADE,
  path_pattern TEXT NOT NULL,  -- e.g. /users/:id
  http_method TEXT NOT NULL CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE')),
  pricing JSONB,               -- null = inherit from gateway.default_pricing
  upto_max JSONB,              -- { max: '0.10' } enables "upto" pattern
  free_tag TEXT,               -- e.g. 'healthz' routes always free
  UNIQUE(gateway_id, path_pattern, http_method)
);
```

RLS: both tables filtered on `tenant_id` (standard pattern; `x402_gateway_routes` joins through `x402_gateways`).

### 3. Gateway CRUD — `/v1/gateways` routes

- `POST /v1/gateways` — create gateway (tenant-scoped)
- `GET /v1/gateways` — list
- `GET /v1/gateways/:id` — detail (includes route count, 24h revenue)
- `PATCH /v1/gateways/:id` — update name / pricing / status
- `DELETE /v1/gateways/:id` — archive (soft delete)
- `POST /v1/gateways/:id/routes` — add route
- `PATCH /v1/gateways/:id/routes/:routeId` — override pricing
- `DELETE /v1/gateways/:id/routes/:routeId` — remove route

### 4. OpenAPI ingest — `@sly_ai/cli`

New subcommand:
```bash
sly x402 import \
  --spec openapi.yaml \
  --upstream https://api.example.com \
  --default-price 0.01 \
  --upto                 # optional: enable upto pattern on all routes
```

- Parses OpenAPI 3.0/3.1 (use `@readme/openapi-parser` — well-maintained, handles $refs)
- Creates gateway, then iterates `paths × methods`, calling `POST /v1/gateways/:id/routes` per endpoint
- Normalizes path templates (`{id}` → `:id`)
- Idempotent on re-import: updates existing routes by `(path_pattern, http_method)` unique constraint

### 5. Dashboard — gateway management

`apps/web/src/app/gateways/`:

- **List page** — gateways with status chips (active/paused/archived), 24h revenue, route count
- **Detail page** — upstream URL, masked auth config, route table with inline pricing edit, revenue chart, recent requests feed
- **"Import from OpenAPI"** — drop-zone → browser-side parse → preview bulk creation → confirm
- **"Test route"** button — fires a sample x402 challenge for quick validation

### 6. MCP tools — 3 new

Add to `packages/mcp-server/src/tools.ts`:

- `x402_gateway_create` — `{ name, upstream_base_url, upstream_auth, default_pricing }`
- `x402_gateway_import_openapi` — `{ gateway_id, openapi_spec_url_or_content, default_pricing, upto? }`
- `x402_gateway_list_routes` — `{ gateway_id }`

### 7. Surface the "upto" pattern explicitly

Infra already supports variable-price final settlement (commit `b55ad8c`). Update tool descriptions for `x402_fetch` and `x402_build_payment_header` to document the flow, and write `docs/guides/x402-upto.md` with a worked example. This closes a positioning gap with Sponge's "x402 v2 upto" marketing.

### 8. Rate limiting — per-gateway scoping

Extend `apps/api/src/middleware/rate-limit.ts` to scope by `gatewayId` when requests hit `/v1/gateway/:gatewayId/*`. Prevents abuse of paid-through gateways independent of the tenant's general API rate.

## Story breakdown

### Phase 1 — Gateway core (MVP, ~16pt)
- **79.1** — Schema migration + RLS policies. (2pt)
- **79.2** — `ALL /v1/gateway/:gatewayId/*` route handler: match, 402, verify, forward, respond. Reuses `x402_verify`. (5pt)
- **79.3** — Gateway + route CRUD API. (3pt)
- **79.4** — Route matcher (literal + `:param`) with longest-literal-prefix precedence. (3pt)
- **79.5** — Integration tests: wrap mock upstream, assert 402 → pay → 200 → body forwarded + upstream auth hidden. (3pt)

### Phase 2 — OpenAPI ingest (~5pt)
- **79.6** — `sly x402 import --spec` CLI: parse, normalize paths, bulk-create routes. (3pt)
- **79.7** — Idempotent re-import via unique constraint; dry-run `--preview` flag. (2pt)

### Phase 3 — Dashboard (~8pt)
- **79.8** — Gateway list + detail pages, status toggle, revenue chart. (5pt)
- **79.9** — "Import from OpenAPI" drop-zone with browser-side preview + bulk create. (3pt)

### Phase 4 — MCP + `"upto"` surfacing (~3pt)
- **79.10** — 3 new `x402_gateway_*` MCP tools. (2pt)
- **79.11** — `x402_fetch` / `x402_build_payment_header` docs + `docs/guides/x402-upto.md`. (1pt)

### Phase 5 — MPP extension (blocked on Epic 71, ~3pt)
- **79.12** — `gateway.protocol='mpp'` dispatch branch once Epic 71 Phase 3 ships. (3pt)

**Total: ~35pt. MVP = Phase 1 + 79.6 = 19pt (ships Sponge parity on x402).**

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/gateways` | ✅ Yes | `sly.gateways` | P0 | New module |
| `GET /v1/gateways` + `:id` | ✅ Yes | `sly.gateways` | P0 | |
| `POST /v1/gateways/:id/routes` | ✅ Yes | `sly.gateways` | P0 | |
| `ALL /v1/gateway/:id/*` | ❌ No | — | — | Agent-facing proxy, not SDK-user-called |
| `x402_gateway_*` MCP tools | ✅ Yes | MCP server | P0 | Story 79.10 |
| `sly x402 import` CLI | ✅ Yes | `@sly_ai/cli` | P0 | Story 79.6 |

**SDK Stories Required:**
- [ ] Story 36.X: Add `gateways` module to `@sly_ai/sdk` — `create/list/get/update/archive`, `addRoute/updateRoute/removeRoute`, `importOpenApi`
- [ ] Story 36.Y: Update `@sly_ai/mcp-server` with 3 `x402_gateway_*` tools (covered by Story 79.10)
- [ ] Story 36.Z: Ship `sly x402 import` in `@sly_ai/cli` (covered by Story 79.6)

## Risks

- **Upstream credential leakage.** Agents must never see the upstream API key. Enforce in-process-only decryption for outbound forwarding; log sanitized request metadata only (strip `Authorization`, strip configured header names).
- **Abuse via paid-through forwarding.** An agent who's paid ~$0.01 could trigger expensive upstream calls if upstream pricing diverges from gateway pricing. Per-gateway rate limit + burst ceiling + `upto_max` cap.
- **OpenAPI spec variance.** Specs vary widely. Support OpenAPI 3.1 first (cleanest schema), then 3.0. Swagger 2.0 only if customer demand emerges — don't pre-build.
- **Path-pattern collisions.** `/users/:id` vs `/users/me` both match `GET /users/me`. Resolution: longest literal-prefix match wins; log warning + document in error messages at registration time.
- **`"upto"` without reconciliation.** If upstream never emits a settlement signal, gateway falls back to `upto_max` as the final charged amount. Covered by `apps/api/src/services/bridge/x402-to-circle.ts` logic — verify the forwarded-response code path preserves it.
- **Timeout / retry semantics.** Upstream hangs or 5xx — policy: don't retry (agent already paid, upstream response is terminal); refund on 502/503/504 via ledger correction. Design and document before shipping Phase 1.

## Competitive context

Sponge Gateway (YC W26) launched April 22, 2026 with the same pitch and scope (x402 + MPP, no-code wrap). Our advantages, documented in the v1.29 PRD entry, remain:

- **KYA tiers** (Epic 73) — formal agent verification ladder
- **Money streaming** (Epic 20) — per-second continuous payments
- **Multi-protocol breadth** — AP2, UCP, ACP, A2A beyond x402+MPP
- **Multi-tenancy + RLS** — real fintech-partner isolation
- **Published SDK** — `@sly_ai/*` packages on npm
- **Agentic commerce scanner** (Epic 56) — demand intelligence feeds gateway customer pipeline

Full feature-matrix comparison in the v1.29 entry of `docs/prd/PayOS_PRD_Master.md`.

## Related epics

- **Epic 19 (x402 Services)** — endpoint primitive; Epic 79 adds the proxy UX on top
- **Epic 36 (SDK & DX)** — `sly.gateways` module lives here
- **Epic 71 (MPP Integration)** — Phase 5 (story 79.12) depends on 71 Phase 3
- **Epic 77 (BYO Wallet Custody)** — complementary on the payer side; 79 is the receiver side
- **Epic 56 (Demand Scanner)** — scanner detects merchants ripe for gateway onboarding (lead-gen feed)

## References

- Competitive research: local plan file `radiant-dreaming-corbato.md` (April 22, 2026)
- x402 "upto" reference: Coinbase x402 v2 spec
- Ledger reconciliation via `X-PAYMENT-RESPONSE`: commit `b55ad8c`
- Existing x402 endpoint code: `apps/api/src/routes/x402-endpoints.ts`, `apps/api/src/routes/x402-payments.ts`
