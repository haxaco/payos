# Epic 78: Agentic Credential Vault

## Summary

Let tenants store third-party API keys in Sly and grant scoped access to specific agents, so agents can call services that don't speak x402 (Anthropic, OpenAI, Deepgram, Stripe REST, GitHub, Twilio, nearly every SaaS) under the same governance surface that already covers on-chain x402 spend. The vault is the non-x402 half of the pay-to-call primitive — unified with x402 via a single dispatcher tool so agents "just call a URL" and Sly picks the right rail.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/organization/vault/credentials` | ✅ Yes | `sly.vault` | P0 | New module |
| `GET /v1/organization/vault/credentials/:id` | ✅ Yes | `sly.vault` | P0 | List/get, masked |
| `PATCH /v1/organization/vault/credentials/:id` | ✅ Yes | `sly.vault` | P0 | Rotate ciphertext |
| `POST /v1/organization/vault/credentials/:id/grants` | ✅ Yes | `sly.vault` | P0 | Issue agent grant |
| `POST /v1/agents/:id/vault/:grantId/proxy` | ✅ Yes | `sly.vault` | P0 | Agent proxy call |
| `POST /v1/agents/:id/vault/call` | ✅ Yes | `sly.vault` | P0 | Dispatcher |
| `POST /v1/agents/:id/vault/:grantId/lease` | ✅ Yes | `sly.vault` | P1 | Pseudo + plaintext |
| `GET /v1/organization/vault/audit` | ❌ No | Internal dashboard | - | Tenant-only |

**SDK Stories Required:**
- [ ] Story 78.X: Add `sly.vault` module to `@sly_ai/sdk`
- [ ] Story 78.Y: Add `vault_call_proxy`, `vault_call_lease`, `agent_call_service` MCP tools to `@sly_ai/mcp-server`

## Motivation

x402 is beautiful but covers maybe 10% of the API economy. The rest — Anthropic, OpenAI, Deepgram, Stripe REST, GitHub, Twilio, Postmark, Slack, Gmail — will never put up a 402 challenge. Three customer segments are blocked today:

1. **Crypto-native agents** who want to call Anthropic for reasoning, Deepgram for transcription, OpenAI for embeddings. Today the tenant has to hand the agent a raw `sk-ant-*` in env.
2. **Enterprises** where security/compliance won't allow raw API keys to live on agent infrastructure. They need a governed vault with per-agent audit.
3. **Autonomous agents** running without human oversight. A leaked key in a prompt, stack trace, or log line is a blast radius that dwarfs on-chain spend — one curl can exfiltrate months of spend.

Sly already has the primitives: `credential-vault` encryption service, `connected_accounts` template for tenant-scoped encrypted creds, `agent_signing_keys` pattern for per-agent encrypted blobs, `services/limits.ts` for KYA enforcement, `mpp/stream-handler.ts` for proxy+budget tracking. The vault composes them.

## The three rails + one dispatcher

| Rail | Key location | When used | v1 priority |
|------|-------------|-----------|-------------|
| `proxy` | Sly server, never leaves | Code-registered providers + tenant-configured generic HTTP | **P0** |
| `pseudo_lease` | Sly server (opaque token returned) | Ad-hoc URLs where the agent needs an HTTP client but we'd rather not plumb a provider adapter | **P1** |
| `plaintext_lease` | Released to caller for short TTL | SDKs that won't accept proxied base URLs (e.g. `openai.OpenAI(api_key=key)` doing its own HTTP). Tenant opt-in with prominent warning and audit log | **P1, guarded** |

Dispatcher (MCP tool `agent_call_service`) fires the request, and:
1. If the URL returns a 402, branches into the existing `x402_fetch` path.
2. If it returns 401/403, looks up tenant vault grants matching the URL's host. If one exists, retries via the proxy route.
3. Otherwise returns the unauth error to the caller.

One tool call, right rail picked automatically.

## Plaintext-lease guardrails

Because this is the highest-risk surface (plaintext material exits Sly's trust boundary), it gets distinct treatment:

- **Per-grant opt-in flag** — `grant.lease_mode = 'none' | 'pseudo' | 'plaintext'`. Default `'none'`. `'plaintext'` is settable only by tenant-owner JWT auth, never by API keys (even same-tenant).
- **Dashboard consent wall** — enabling `plaintext` surfaces a modal:
  > "Agents with this grant will receive the raw API key for up to 60 seconds. Once released, Sly cannot prevent the agent from logging, exfiltrating, or persisting the key. Type the credential label to confirm."
  Typed confirmation gate.
- **Dedicated audit actions** — `grant_leased_plaintext` on issuance, `plaintext_used` on each use. Both include full actor identity, grant_id, TTL, request context (method, host, path), and are never mixed with normal `grant_used` rows.
- **`security_warning` field** in the API response body. Clients ignore at their peril.
- **Optional webhook** — if the tenant has registered a security webhook, plaintext-lease issuance fires `vault.plaintext_leased` in real time.
- **Hardcoded TTL cap** — 300 seconds max, 60-second default. Cannot be raised via env var.
- **Rotation reminder** — `vault_credentials.last_plaintext_leased_at` triggers a dashboard banner on the credential detail page recommending key rotation within 30 days of any plaintext release.

## Prerequisites

None — all three rails build on existing Sly infrastructure. No new routes are required to exist elsewhere before this can start.

## Code changes

### 1. Schema — `apps/api/supabase/migrations/YYYYMMDD_agentic_vault.sql`

Three new tables:

**`vault_credentials`** — tenant-scoped encrypted secrets.
```sql
CREATE TABLE vault_credentials (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  provider                 TEXT NOT NULL,         -- 'anthropic','openai','deepgram','stripe_rest','github_pat','generic'
  label                    TEXT NOT NULL,
  environment              TEXT NOT NULL CHECK (environment IN ('test','live')),
  credentials_encrypted    TEXT NOT NULL,
  credentials_key_id       TEXT NOT NULL DEFAULT 'v1',
  target_config            JSONB,                  -- for provider='generic': { baseUrl, authHeader, authHeaderFormat }
  status                   TEXT NOT NULL CHECK (status IN ('active','inactive','rotating','revoked')),
  last_verified_at         TIMESTAMPTZ,
  last_plaintext_leased_at TIMESTAMPTZ,
  created_by_user_id       UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, label, environment)
);
```

**`vault_credential_grants`** — agent's permission to use a credential.
```sql
CREATE TABLE vault_credential_grants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  credential_id      UUID NOT NULL REFERENCES vault_credentials(id) ON DELETE CASCADE,
  agent_id           UUID NOT NULL REFERENCES agents(id),
  environment        TEXT NOT NULL CHECK (environment IN ('test','live')),
  lease_mode         TEXT NOT NULL DEFAULT 'none' CHECK (lease_mode IN ('none','pseudo','plaintext')),
  allowed_methods    TEXT[],
  allowed_paths      TEXT[],
  monthly_call_cap   INT,
  monthly_usd_cap    NUMERIC,
  expires_at         TIMESTAMPTZ,
  status             TEXT NOT NULL CHECK (status IN ('active','revoked','expired')),
  granted_by_user_id UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at         TIMESTAMPTZ,
  UNIQUE (credential_id, agent_id)
);
```

**`vault_audit`** — structural clone of `connected_accounts_audit`.
```sql
CREATE TABLE vault_audit (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  credential_id    UUID,
  grant_id         UUID,
  agent_id         UUID,
  action           TEXT NOT NULL,        -- credential_created|credential_rotated|credential_revoked|
                                         -- grant_issued|grant_revoked|grant_used|
                                         -- grant_leased_pseudo|grant_leased_plaintext|plaintext_used|
                                         -- grant_denied|budget_exceeded|
                                         -- verification_succeeded|verification_failed
  actor_type       TEXT NOT NULL CHECK (actor_type IN ('user','api_key','system','agent')),
  actor_id         UUID,
  request_summary  JSONB,                -- { method, host, path, status, duration_ms, cost_usd, tokens_in, tokens_out }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vault_audit_tenant_time  ON vault_audit(tenant_id, created_at DESC);
CREATE INDEX idx_vault_audit_cred_time    ON vault_audit(credential_id, created_at DESC);
CREATE INDEX idx_vault_audit_agent_time   ON vault_audit(agent_id, created_at DESC);
```

RLS policies clone `connected_accounts` + `connected_accounts_audit` patterns from `apps/api/supabase/migrations/20260120_connected_accounts.sql`. Environment-coherence is enforced by check constraint + application validation (grant env must equal credential env must equal agent env).

### 2. Services

**`apps/api/src/services/vault/index.ts`** — grant resolution, provider registry dispatch, proxy/lease core logic.

**`apps/api/src/services/vault/providers/`** — per-provider adapter modules, mirroring `services/handlers/` structure:
- `anthropic.ts` — base `https://api.anthropic.com`, auth `x-api-key`, cost via `response.usage` tokens
- `openai.ts` — base `https://api.openai.com`, auth `Authorization: Bearer`, cost via `response.usage`
- `deepgram.ts` — base `https://api.deepgram.com`, auth `Authorization: Token`, cost via response duration
- `stripe-rest.ts`, `github.ts` — lower-priority adapters
- `generic.ts` — reads `vault_credentials.target_config` for base URL + auth header format; no cost estimation

Each adapter exports: `baseUrl`, `authHeader(key)`, `healthCheckPath`, optional `estimateCost(request)`, optional `reconcileCost(response)`.

**`apps/api/src/services/vault/lease-tokens.ts`** — HMAC-signed short-lived tokens for pseudo-lease mode (`(grant_id, issued_at, nonce)` signed with `VAULT_LEASE_SIGNING_KEY`).

### 3. HTTP Routes

**`apps/api/src/routes/organization/vault-credentials.ts`** — tenant-owner surface, mounted at `/v1/organization/vault`:
- `GET    /credentials` — list, masked via `maskCredentials()`
- `POST   /credentials` — add; validates via extended `validateCredentialStructure`
- `GET    /credentials/:id` — single, masked
- `PATCH  /credentials/:id` — rotate ciphertext / flip status
- `DELETE /credentials/:id` — cascade grants
- `POST   /credentials/:id/verify` — provider health check
- `GET    /credentials/:id/grants` — list grants
- `POST   /credentials/:id/grants` — issue grant (tenant-owner only; `lease_mode='plaintext'` requires JWT, not API key)
- `DELETE /grants/:grantId` — revoke
- `GET    /audit?credential_id=&agent_id=&since=` — audit query

**`apps/api/src/routes/agents-vault.ts`** — agent surface, mounted at `/v1/agents/:id/vault` (mirrors `agents-x402.ts` split):
- `GET  /` — grants visible to this agent (provider, label, host, caps, remaining budget). Never returns the credential itself
- `POST /:grantId/proxy` — proxy call: body `{ path, method, headers, body, stream? }`
- `POST /:grantId/lease` — issue lease per `grant.lease_mode`; returns `{ lease_token, expires_at, proxy_base_url, security_warning? }`
- `POST /leased/:lease_token/proxy` — used with pseudo-lease tokens for subsequent calls
- `POST /call` — the dispatcher (HTTP equivalent of the MCP tool)

### 4. MCP Tools

Add to `packages/mcp-server/src/tools.ts` + case handlers in `server-factory.ts`:

Agent-facing:
1. `vault_list_grants({ agentId })` — what this agent can call
2. `vault_call_proxy({ agentId, grantId, path, method?, body?, headers?, stream? })` — primary call path
3. `vault_call_lease({ agentId, grantId, ttlSeconds? })` — mode determined by grant
4. **`agent_call_service({ agentId, url, method?, body?, headers?, maxPrice? })`** — the headline dispatcher

Tenant-facing:
5. `vault_create_credential({ provider, label, credentials, environment, targetConfig? })`
6. `vault_issue_grant({ credentialId, agentId, leaseMode?, monthlyCallCap?, allowedMethods?, allowedPaths?, expiresAt? })`
7. `vault_revoke_grant({ grantId })`

### 5. Dashboard (`apps/web`)

- `dashboard/vault/page.tsx` — credentials list, provider icons, masked values, verify/rotate/revoke actions
- `dashboard/vault/[id]/page.tsx` — credential detail: grants table (agent, caps, usage vs caps, last used, revoke), audit trail, verification history, plaintext-lease-used banner when applicable
- `dashboard/vault/new/page.tsx` — add-credential wizard: provider presets + "generic HTTP API" fallback asking for base URL + auth header format
- `dashboard/agents/[id]/` — new "Vault access" tab listing grants with per-grant spend chart and revoke
- Plaintext-lease warning modal component (typed confirmation gate)

### 6. Governance integration

- **KYA limits**: every proxy call and every lease issuance goes through `limitService.checkTransactionLimit(agentId, estimatedUsd)` before execution. Cost estimate comes from the provider adapter; post-call `recordUsage` reconciles with actual cost parsed from response headers/body.
- **Kill switch**: the existing `apps/api/src/routes/agents.ts:2059` kill-switch handler must cascade-revoke all grants for the agent. Done in Story 78.5.
- **Wallet freeze**: same block-point that applies to x402-sign blocks vault calls.
- **Env coherence**: credential env must equal grant env must equal agent env at both grant-issue time and call time. Mirrors the chainId↔environment check in x402-sign (commit `dab76789`).
- **Audit**: every call writes `vault_audit` with request summary (method, host, path, status, duration, estimated cost, reconciled cost) — never body, never request/response headers.

### 7. Integration with x402

- `agent_call_service` MCP tool is where they meet: unauth → 402 branch (existing `x402_fetch` body) → vault host lookup → error.
- Vault spend audits to `vault_audit`, NOT `transfers`. Dashboard aggregates both when showing "total agent spend."
- Providers that support both x402 and keyed auth: `vault_credentials.target_config.prefer_x402: true` routes the dispatcher to try x402 first even when a grant exists.

## Story breakdown (~27 pts MVP)

| # | Story | Points |
|---|---|---|
| 78.1 | Migration + RLS + triggers for three new tables | 3 |
| 78.2 | Extend `validateCredentialStructure` with anthropic/openai/deepgram/stripe_rest/github/generic cases | 1 |
| 78.3 | Tenant CRUD routes + audit hooks + provider verify endpoint | 5 |
| 78.4 | Provider registry + anthropic/openai/deepgram adapters (first three) | 3 |
| 78.5 | Agent proxy route (non-streaming) + grant resolution + KYA wiring + kill-switch cascade | 5 |
| 78.6 | MCP tools (vault_list_grants, vault_call_proxy, tenant CRUD tools) | 3 |
| 78.7 | `agent_call_service` dispatcher (unauth → 402 → vault host lookup) | 3 |
| 78.8 | Pseudo-lease + plaintext-lease endpoints + consent gate + dedicated audit actions + max-TTL enforcement | 3 |
| 78.9 | Dashboard vault index + new-credential wizard + plaintext-lease warning modal | 2 |

**MVP: ~27 story points.** Ship incrementally — 78.1–78.5 (~17pts) is enough for one keyed provider working end-to-end.

### Phase 2 backlog (~17pts)

- Streaming proxy with per-chunk budget enforcement (reuses `services/mpp/stream-handler.ts` pattern) — 5pts
- Per-grant `monthly_call_cap`/`monthly_usd_cap` runtime enforcement distinct from agent KYA — 3pts
- Credential rotation worker (re-encrypt under new `keyId`) — 3pts
- Richer dashboard: audit view, per-grant spend charts, per-host x402-preferred toggle — 3pts
- Cost-reconciliation hooks per adapter (OpenAI/Anthropic usage tokens, Deepgram duration) — 3pts

### Phase 3 / out of scope

- Provider-side scoped keys (Stripe Restricted Keys, GitHub fine-grained PATs) provisioned by Sly — most providers don't support clean programmatic provisioning.
- Cross-tenant credential sharing / marketplace vault entries.
- In-flight-call abort on revoke (requires streaming + AbortController plumbing).

## Risks

- **Plaintext-lease is the highest-risk surface.** Guardrails documented but customers must still be educated — the modal consent wall is essential, not decorative.
- **Session-key delegation overlap with Epic 77.** Some BYO-wallet infrastructure (lease tokens, short-TTL auth) shares primitives with vault's pseudo-lease. Ship Epic 77 first, reuse in 78.
- **Cost-estimation drift.** Provider response shapes change. Adapter tests + reconciliation keep estimates from silently underbilling; without reconciliation, KYA limits become fictional for high-volume agents.
- **Generic proxy as SSRF vector.** Mitigated by pinning `target_config.baseUrl` at credential-creation time and refusing requests outside the pinned host. Must be enforced, not documented.
- **Agent sees grant label + host but not key.** If the label contains sensitive info ("OPENAI_PROD_CUSTOMER_ACME"), that leaks to the agent. Document best practice: use opaque labels for shared infrastructure.

## Related

- **Epic 77 — BYO Wallet Custody** — similar "Sly doesn't custody everything" story on the on-chain side. Vault's pseudo-lease and Epic 77's session-key delegation share HMAC-token infra; ship 77 first.
- **Epic 79 (future) — Agent-as-Vendor** (`be paid` side): let agents register x402 endpoints that Sly fronts, validating `X-PAYMENT` and crediting the agent's ledger. Completes the "pay and be paid anywhere" thesis.
- **Epic 48 — Connected Accounts** — provides the storage pattern template and encryption service; vault extends rather than replaces.
- **Epic 65 — Operations Observability** — `vault_audit` feeds into the same correlation pipeline; `action='grant_used'` events become `OpType.VAULT_PROXY_CALL` for per-request tracking.

## Critical files to reference during implementation

- `apps/api/src/services/credential-vault/index.ts` — `encryptAndSerialize`, `deserializeAndDecrypt`, `validateCredentialStructure`, `maskCredentials`
- `apps/api/supabase/migrations/20260120_connected_accounts.sql` — credentials + audit table DDL template
- `apps/api/supabase/migrations/20260123_agent_signing_keys.sql` — per-agent encrypted-key precedent
- `apps/api/src/routes/organization/connected-accounts.ts` — tenant CRUD pattern
- `apps/api/src/services/mpp/stream-handler.ts` — proxy + budget-tracking pattern (Phase 2 streaming)
- `apps/api/src/services/limits.ts` — `checkTransactionLimit`, `recordUsage`
- `apps/api/src/routes/agents.ts:2059` — kill-switch handler (must cascade to grants in Story 78.5)
- `apps/api/src/routes/agents.ts:2697` — x402-sign enforcement patterns to mirror
- `packages/mcp-server/src/server-factory.ts` — MCP tool dispatch location
- `docs/prd/epics/epic-77-byo-wallet-custody.md` — epic format template
