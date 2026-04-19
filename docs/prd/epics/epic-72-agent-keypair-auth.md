# Epic 72: Agent Key-Pair Authentication & Persistent Connection

**Status:** Complete
**Phase:** 4.2 (Agent Security & Infrastructure)
**Priority:** P1
**Total Points:** 62
**Stories:** 15
**Dependencies:** Epic 57 (A2A Protocol), Epic 58 (Task Processor), Epic 61 (Agent Wallet Identity)
**Created:** March 28, 2026

**Doc:** `docs/prd/epics/epic-72-agent-keypair-auth.md`
**Linear Project:** Sly

---

## Overview

Agents currently authenticate via shared-secret bearer tokens (`agent_*`) on every request — stateless, no persistent connection, no liveness tracking. This epic adds Ed25519 public/private key-pair authentication so agents can prove identity via cryptographic challenge-response (private key never sent over the wire), establish a persistent SSE connection to receive real-time events, and expose soft liveness tracking to the platform.

This is **additive** — existing `agent_*` token auth stays. Key-pair auth is an upgrade path.

---

## Strategic Context

**Problem:** Agent bearer tokens are shared secrets sent in every HTTP header. If intercepted, an attacker has permanent full agent access until the token is manually rotated by an API key holder. Agents cannot self-rotate, have no persistent connection to receive events, and no way to signal liveness.

**Solution:** Ed25519 challenge-response authentication produces short-lived session tokens (`sess_*`, 1hr TTL). Same session token opens a persistent SSE channel AND makes API calls. One auth ceremony = full agent identity across all capabilities.

**Why now:** A2A protocol (Epic 57), task processor (Epic 58), and agent wallet identity (Epic 61) are all complete. Agents can transact, discover peers, and manage wallets — but the auth layer and event delivery model haven't kept pace.

---

## Existing vs New: End-to-End Architecture Comparison

### 1. Endpoint Security

| Aspect | **Existing** | **New (with key-pair auth)** |
|--------|-------------|------------------------------|
| **Auth methods** | 4 tiers: API key (`pk_*`), JWT (`eyJ`), agent token (`agent_*`), portal (`portal_*`) | 5 tiers: adds session token (`sess_*`) issued via Ed25519 challenge-response |
| **Agent identity proof** | Shared secret — agent token sent on every request (bearer token over HTTPS) | Cryptographic proof — agent signs a server-issued nonce with Ed25519 private key; private key never leaves the agent |
| **Token exposure risk** | High — bearer token sent in every HTTP header; if intercepted, attacker has full agent access | Low — private key never sent over wire; session token is short-lived (1hr) and revocable |
| **Replay protection** | None — same `agent_*` token reusable indefinitely | Nonce-based — each challenge is single-use, 60s TTL, atomic consume prevents race conditions |
| **Session revocation** | Cannot revoke mid-stream — must revoke entire `agent_*` token (affects all connections) | Per-session revocation — `sess_*` tokens revocable individually; key rotation revokes all sessions |
| **Rate limiting (auth endpoints)** | 20 attempts / 5 min per IP for `/v1/auth/*` | Adds: 10 challenges/min + 5 auth attempts/min per agent ID; lockout after 10 consecutive failures |
| **Key rotation** | Token rotation via `POST /agents/:id/rotate-token` (requires API key holder, not agent itself) | Auth key rotation via signed proof-of-ownership; agent can self-rotate without API key holder |
| **Multi-factor potential** | Single factor (token possession) | Two factors: key possession (private key) + liveness (active connection) |

**What stays the same:** Security headers (CSP, HSTS, X-Frame-Options), CORS config, tenant isolation via `tenant_id` filtering, KYA tier enforcement, agent permissions matrix. All existing auth methods continue working unchanged.

### 2. Transport Layer

| Aspect | **Existing** | **New (with persistent connection)** |
|--------|-------------|--------------------------------------|
| **Agent→Sly channel** | Stateless HTTP requests — each call independently authenticated via bearer token | Stateless HTTP (unchanged) + persistent SSE channel authenticated via `sess_*` session token |
| **Sly→Agent channel** | None (pull-only) — agent must poll or use A2A task-scoped SSE streams | Always-on SSE push — agent receives events without polling: tasks, transfers, alerts, config changes |
| **Connection auth** | Per-request: token in `Authorization` header, verified each time | SSE: authenticated once at connection open via `sess_*` token; heartbeat maintains liveness |
| **Per-message verification** | Each request independently verified (hash lookup + constant-time compare) | SSE: no per-message re-auth (session established); HTTP calls still per-request verified |
| **Heartbeat/keepalive** | Only on task-scoped A2A SSE streams (30s, `a2a.ts:780`) | Dedicated 30s heartbeat on agent channel; `last_heartbeat_at` persisted to DB every 150s |
| **Reconnection** | N/A (stateless) | `Last-Event-ID` header support; server replays missed events from 100-event / 5-min buffer |
| **Connection lifetime** | Per-request (milliseconds) | 24-hour max SSE connection; reconnect required after |
| **Event routing** | `TaskEventBus` — in-process, keyed by `task:<taskId>` | Adds `AgentConnectionBus` — in-process, keyed by `agent:<agentId>`; multiplexes task events + system events |
| **Webhook signing** | HMAC-SHA256 outbound webhooks with `t=timestamp,v1=signature` | Unchanged — webhooks still HMAC-signed; SSE channel is complementary, not replacement |
| **TLS** | Reverse proxy terminated (Vercel/Fly.io) — no app-level TLS | Unchanged — TLS at proxy; Ed25519 adds application-layer identity proof on top |

### 3. A2A Session Management

| Aspect | **Existing** | **New (with session tokens)** |
|--------|-------------|-------------------------------|
| **A2A auth model** | Optional — `POST /a2a/:agentId` accepts requests with or without auth; target agent's tenant derived from URL | Unchanged for inbound A2A; session tokens usable for authenticated A2A calls |
| **Task-scoped streaming** | `POST /a2a/:agentId` with `message/stream` — SSE for one task, 5-min max, closes on terminal state | Unchanged — task-scoped streams still work the same way |
| **Agent-scoped streaming** | None — no way to receive ALL events for an agent on one channel | New `GET /v1/agents/:id/connect` — one SSE channel receives task assignments + transfers + alerts |
| **Session state** | Stateless per-request; `contextId` groups multi-turn conversations but carries no auth | `agent_sessions` table tracks authenticated sessions with TTL, revocation, IP tracking |
| **Task event routing** | `TaskEventBus.subscribe(taskId)` — client must know the taskId to subscribe | Adds: `AgentConnectionBus.subscribe(agentId)` — events routed to agent regardless of task |
| **Inbound task delivery** | Agent must either (a) poll `GET /v1/a2a/tasks` or (b) provide a `callback_url` for webhook delivery | New option (c): tasks pushed to agent's persistent SSE channel as `task_assigned` events |
| **Liveness visibility** | None — other agents/users cannot see if an agent is currently online | New: `liveness` field on agent responses + `?connected=true` filter on agent list |
| **Session security** | No sessions — token is permanent until manually rotated | Session tokens expire (1hr), are individually revocable, and tied to a specific auth key |

### 4. Session Scope: One Connection, Full Access

A `sess_*` session token sets the **identical RequestContext** as an `agent_*` bearer token:
```
{ tenantId, actorType: 'agent', actorId, actorName, kyaTier, environment }
```

This means the session token works for **every existing endpoint** without route modifications:

| Capability | How it works with `sess_*` | Multi-target? |
|------------|---------------------------|---------------|
| **A2A tasks to other agents** | `POST /a2a/:targetAgentId` — `callerAgentId` from `ctx.actorId`, target from URL | Yes — no 1:1 limit; agent can talk to N other agents |
| **x402 paid endpoints** | `POST /v1/agents/:id/x402/*` — filtered by `ctx.tenantId` | Yes — agent accesses its own x402 config |
| **Agent-linked wallets** | `GET/POST /v1/agents/:id/wallet/*` — filtered by `ctx.tenantId + actorId` | Yes — agent manages its own wallets |
| **Transfers** | `POST /v1/transfers` — filtered by `ctx.tenantId + environment` | Yes — send to any account within tenant |
| **Streams** | `POST /v1/streams` — ownership check: `managed_by_id === ctx.actorId` | Yes — agent manages its own streams |
| **All other `/v1/*` routes** | Standard `ctx` pattern — no actor-type gate | Yes |

**One authentication = full agent identity:**

```
                    ┌─── SSE Channel (RECEIVE) ──────────────────────────┐
                    │  GET /v1/agents/:id/connect                        │
                    │  → task_assigned (from Agent B, C, D, ...)         │
                    │  → transfer_completed (any transfer)               │
  Agent A           │  → stream_alert (any managed stream)               │
  authenticates ────┤  → approval_requested, config_changed, ...         │
  once via Ed25519  │                                                    │
  challenge-response├─── API Calls (SEND) using same sess_* token ──────┐
                    │  POST /a2a/:agentB  → send task to Agent B         │
                    │  POST /a2a/:agentC  → send task to Agent C         │
                    │  POST /v1/transfers → initiate transfer             │
                    │  POST /v1/streams   → manage money streams          │
                    │  GET  /v1/agents/:id/wallet → access linked wallet  │
                    │  POST /v1/x402/pay  → use x402 paid endpoints       │
                    └────────────────────────────────────────────────────┘
```

One Ed25519 handshake unlocks everything for the session lifetime (1 hour, renewable). Agent A can interact with any number of other agents through Sly using the same session. The SSE channel delivers responses and events from ALL interactions on the same connection.

### Security Improvement Summary

```
EXISTING GAPS ADDRESSED:
  ✅ No mutual auth challenge     → Ed25519 challenge-response handshake
  ✅ No per-stream auth sessions  → sess_* tokens with TTL + revocation
  ✅ No persistent sessions       → agent_sessions table with lifecycle
  ✅ No liveness tracking         → agent_connections with heartbeat
  ✅ Token replay risk            → Nonce-based, single-use challenges
  ✅ No agent self-rotation       → Signed proof-of-ownership key rotation

GAPS NOT ADDRESSED (out of scope):
  ⬜ In-process event bus         → Still single-instance EventEmitter
  ⬜ Rate limiting disabled       → Still force-disabled in code
  ⬜ No mTLS                      → Still relies on proxy TLS (by design — using Ed25519 instead)
  ⬜ Public discovery unauth'd    → Still public (intentional for A2A spec compliance)
  ⬜ No IP binding for tokens     → Not added (would break mobile/dynamic IP agents)
```

---

## Architecture

```
Agent                          Sly API
  │                              │
  │  POST /:id/challenge         │
  │─────────────────────────────>│  Generate nonce (60s TTL)
  │<─────────────────────────────│  { challenge: "nonce..." }
  │                              │
  │  Sign nonce with private key │
  │                              │
  │  POST /:id/authenticate      │
  │  { challenge, signature }    │
  │─────────────────────────────>│  Verify Ed25519 sig against stored pubkey
  │<─────────────────────────────│  { sessionToken: "sess_..." }
  │                              │
  │  GET /:id/connect            │
  │  Authorization: sess_...     │
  │─────────────────────────────>│  Open SSE stream
  │<═════════════════════════════│  Persistent event channel
  │  event: heartbeat (30s)      │  (tasks, transfers, alerts)
  │  event: task_assigned        │
  │  event: transfer_completed   │
```

---

## Stories

### Phase 1: Foundation — Database & Crypto (13 pts)

| Story | Points | Priority | Labels | Status |
|-------|--------|----------|--------|--------|
| 72.1: Database Migration — Key-Pair Auth Tables | 5 | P0 | Engineering, DB | Backlog |
| 72.2: Ed25519 Crypto Utilities | 3 | P0 | Engineering | Backlog |
| 72.3: Types Package — Auth Key & Session Types | 2 | P0 | Engineering, Types | Backlog |
| 72.4: Challenge-Response Service | 3 | P0 | Engineering | Backlog |

#### Story Details

**72.1: Database Migration — Key-Pair Auth Tables (5 pts)**

Create `apps/api/supabase/migrations/20260324_agent_keypair_auth.sql` with 4 new tables:
- `agent_auth_keys` — Ed25519 public keys per agent (one active at a time). Partial unique index on `(agent_id) WHERE status = 'active'`.
- `agent_challenges` — Short-lived nonces (60s TTL). Index on `(agent_id, nonce) WHERE consumed = false`.
- `agent_sessions` — Session tokens issued after challenge-response (1hr TTL). Index on `session_token_hash WHERE revoked_at IS NULL`.
- `agent_connections` — Liveness tracking. Index on `(tenant_id, agent_id) WHERE disconnected_at IS NULL`.

All tables: RLS enabled, `tenant_id` column, follows patterns from `agent_signing_keys`.

Key files:
- `apps/api/supabase/migrations/20260324_agent_keypair_auth.sql` — NEW

**72.2: Ed25519 Crypto Utilities (3 pts)**

Add to `apps/api/src/utils/crypto.ts`:
- `generateChallengeNonce(agentId)` → `challenge_<first8>_<32bytes_base64url>`
- `generateSessionToken()` → `sess_<32bytes_base64url>`
- `verifyEd25519Signature(message, signature, publicKey)` → boolean

Uses `@noble/ed25519` via `@sly/cards` (same library already used in `web-bot-auth-verifier.ts`).

Key files:
- `apps/api/src/utils/crypto.ts` — MODIFY

**72.3: Types Package — Auth Key & Session Types (2 pts)**

Add to `packages/types/src/index.ts`:
- `AgentAuthKey` — keyId, algorithm, publicKey, status, createdAt
- `AgentLiveness` — connected, connectedAt, lastHeartbeatAt, disconnectedAt, connectionDuration
- `AgentChallenge` — challenge, expiresIn, algorithm
- `AgentSessionToken` — sessionToken, expiresIn, agentId
- Add `liveness?: AgentLiveness` and `authKey?: AgentAuthKey` to existing `Agent` interface

Key files:
- `packages/types/src/index.ts` — MODIFY

**72.4: Challenge-Response Service (3 pts)**

Create two new service files:

`apps/api/src/services/agent-auth/challenge.ts`:
- `createChallenge(agentId, tenantId)` — generate nonce, store in DB with 60s expiry
- `verifyChallenge(agentId, tenantId, nonce, signature)` — atomic `UPDATE ... WHERE consumed = false RETURNING *`, verify Ed25519 sig, issue session token

`apps/api/src/services/agent-auth/session.ts`:
- `createAgentSession(agentId, tenantId, authKeyId)` — 1-hour TTL, store hash only
- `validateAgentSession(token)` — lookup by hash, check expiry, return agent context
- `revokeAgentSession(hash)` — mark revoked

Key files:
- `apps/api/src/services/agent-auth/challenge.ts` — NEW
- `apps/api/src/services/agent-auth/session.ts` — NEW

---

### Phase 2: Authentication Routes & Middleware (16 pts)

| Story | Points | Priority | Labels | Status |
|-------|--------|----------|--------|--------|
| 72.5: Auth Middleware — Session Token Path | 5 | P0 | Engineering, Security | Backlog |
| 72.6: Auth Key Management Routes | 5 | P0 | Engineering, API | Backlog |
| 72.7: Challenge-Response Endpoints | 3 | P0 | Engineering, API | Backlog |
| 72.8: Route Mounting & Rate Limiting | 3 | P0 | Engineering | Backlog |

#### Story Details

**72.5: Auth Middleware — Session Token Path (5 pts)**

Add `sess_` token handler to `apps/api/src/middleware/auth.ts` after the existing `agent_` block (line ~470):
- Detect `sess_` prefix on Authorization bearer token
- Validate via `validateAgentSession()`
- Look up agent, check `status = 'active'`
- Set identical RequestContext as agent token auth (same `tenantId, actorType, actorId, actorName, kyaTier, environment`)
- Add `sessionBased: true` flag to RequestContext for audit differentiation
- Session tokens work for ALL existing `/v1/*` endpoints — no route changes needed

Key files:
- `apps/api/src/middleware/auth.ts` — MODIFY (add after line ~470, extend RequestContext interface)

**72.6: Auth Key Management Routes (5 pts)**

Add to `apps/api/src/routes/agent-connect.ts` (authenticated, require tenant auth):
- `POST /v1/agents/:id/auth-keys` — generate Ed25519 key pair via `generateAgentKeyPair('ed25519')` from `@sly/cards`, store public key in `agent_auth_keys`, return private key ONCE
- `POST /v1/agents/:id/auth-keys/rotate` — prove ownership of current key (sign rotation challenge), old key marked `rotated`, new key `active`, all sessions revoked
- `DELETE /v1/agents/:id/auth-keys` — revoke key + all active sessions

Follows exact pattern of existing signing-key routes at `agents.ts:1587-1698`.

Key files:
- `apps/api/src/routes/agent-connect.ts` — NEW

**72.7: Challenge-Response Endpoints (3 pts)**

Add public routes to `apps/api/src/routes/agent-connect.ts` (rate-limited, no bearer auth):
- `POST /v1/agents/:id/challenge` — request a nonce. Returns `{ challenge, expiresIn: 60, algorithm: 'ed25519' }`. Rate limit: 10/min per agent.
- `POST /v1/agents/:id/authenticate` — submit `{ challenge, signature }`. Returns `{ sessionToken, expiresIn: 3600, agentId }`. Rate limit: 5/min per agent. Lockout after 10 consecutive failures.

Key files:
- `apps/api/src/routes/agent-connect.ts` — MODIFY (add public routes)

**72.8: Route Mounting & Rate Limiting (3 pts)**

Mount routes in `apps/api/src/app.ts`:
- Public routes (challenge/authenticate) mounted before auth middleware
- Authenticated routes (auth-keys, connect, liveness) mounted under `/v1/agents`
- Add per-agent rate limiters for challenge/authenticate endpoints

Key files:
- `apps/api/src/app.ts` — MODIFY

---

### Phase 3: Persistent Connection & Liveness (20 pts)

| Story | Points | Priority | Labels | Status |
|-------|--------|----------|--------|--------|
| 72.9: Agent Connection Bus | 5 | P0 | Engineering | Backlog |
| 72.10: Persistent SSE Connection Endpoint | 8 | P0 | Engineering, API | Backlog |
| 72.11: Liveness Tracking & Agent Status | 5 | P1 | Engineering, API | Backlog |
| 72.12: Connection Cleanup Worker | 2 | P1 | Engineering | Backlog |

#### Story Details

**72.9: Agent Connection Bus (5 pts)**

Create `apps/api/src/services/agent-auth/connection-bus.ts` — EventEmitter singleton following `TaskEventBus` pattern (`apps/api/src/services/a2a/task-event-bus.ts`):
- Per-agent channels: `agent:<agentId>`
- `emitToAgent(agentId, event)` — push event to connected agent
- `subscribe(agentId, listener)` — returns unsubscribe function
- In-memory `connectedAgents` map for fast `isConnected()` lookups
- Replay buffer: last 100 events per agent, 5-min window (supports `Last-Event-ID` reconnect)

Event types: `task_assigned`, `transfer_completed`, `approval_requested`, `stream_alert`, `key_rotated`, `config_changed`, `heartbeat`

Key files:
- `apps/api/src/services/agent-auth/connection-bus.ts` — NEW
- `apps/api/src/services/a2a/task-event-bus.ts` — REFERENCE (pattern to follow)

**72.10: Persistent SSE Connection Endpoint (8 pts)**

Add `GET /v1/agents/:id/connect` to `apps/api/src/routes/agent-connect.ts`:
- Requires `sess_*` token auth
- Validate `ctx.actorId === id` (agent can only connect as itself)
- Insert `agent_connections` record in DB
- Open SSE via `streamSSE()` from `hono/streaming` (same pattern as `a2a.ts:736`)
- Subscribe to `agentConnectionBus` for `agent:<id>` events
- Subscribe to `taskEventBus` for tasks targeting this agent (bridge events into connection bus)
- 30s heartbeat; update `last_heartbeat_at` in DB every 5th beat (150s)
- On `stream.onAbort()`: set `disconnected_at`, unsubscribe, clean up
- 24-hour max connection (send `reconnect_required` event, then close)
- `Last-Event-ID` header support: replay missed events from buffer on reconnect
- Set headers: `X-Accel-Buffering: no`, `Cache-Control: no-cache`

Key files:
- `apps/api/src/routes/agent-connect.ts` — MODIFY
- `apps/api/src/routes/a2a.ts:736-810` — REFERENCE (SSE streaming pattern with heartbeat)

**72.11: Liveness Tracking & Agent Status (5 pts)**

Modify `apps/api/src/routes/agents.ts`:
- `GET /v1/agents/:id` — add `liveness` field (left-join on `agent_connections WHERE disconnected_at IS NULL`)
- `GET /v1/agents` — add `?connected=true` query filter
- New: `GET /v1/agents/:id/liveness` — dedicated lightweight liveness check

Liveness is **soft** — `connected`/`disconnected` is informational, separate from agent `status`. Agent stays `active` even when disconnected.

Key files:
- `apps/api/src/routes/agents.ts` — MODIFY

**72.12: Connection Cleanup Worker (2 pts)**

Create `apps/api/src/workers/agent-connection-cleanup.ts`:
- Runs every 60s
- Delete expired challenges (> 5 min old)
- Delete expired sessions (past `expires_at`)
- Mark stale connections as disconnected (no heartbeat > 90s)

Mount in `apps/api/src/index.ts` with graceful shutdown on SIGTERM/SIGINT.

Key files:
- `apps/api/src/workers/agent-connection-cleanup.ts` — NEW
- `apps/api/src/index.ts` — MODIFY (start/stop worker)

---

### Phase 4: Integration & Testing (13 pts)

| Story | Points | Priority | Labels | Status |
|-------|--------|----------|--------|--------|
| 72.13: Auto-Generate Key Pair at Agent Creation | 3 | P1 | Engineering | Backlog |
| 72.14: Unit Tests — Challenge-Response & Session | 5 | P0 | Engineering, Testing | Backlog |
| 72.15: Integration Tests — Full Auth Flow | 5 | P1 | Engineering, Testing | Backlog |

#### Story Details

**72.13: Auto-Generate Key Pair at Agent Creation (3 pts)**

Modify `apps/api/src/routes/agents.ts` (POST handler, ~line 316):
- Add `generate_keypair` field to create schema (optional boolean, default `true`)
- Auto-generate Ed25519 key pair during agent creation
- Store public key in `agent_auth_keys`
- Return private key in response alongside existing `credentials.token`:
  ```json
  {
    "credentials": { "token": "agent_...", "warning": "..." },
    "authKey": {
      "keyId": "auth_<first8>_<hex>",
      "publicKey": "<base64>",
      "privateKey": "<base64>",
      "algorithm": "ed25519",
      "warning": "SAVE THIS PRIVATE KEY NOW - it will never be shown again!"
    }
  }
  ```

Key files:
- `apps/api/src/routes/agents.ts` — MODIFY (~line 316, create handler + response)

**72.14: Unit Tests — Challenge-Response & Session (5 pts)**

Create `apps/api/tests/unit/agent-keypair-auth.test.ts`:
- Ed25519 sign/verify round-trip
- Challenge nonce generation format validation
- Session token generation and hash verification
- Challenge replay prevention (consumed flag)
- Challenge expiry enforcement
- Session TTL enforcement
- Key rotation invalidates sessions
- Wrong signature rejection (constant-time)

Key files:
- `apps/api/tests/unit/agent-keypair-auth.test.ts` — NEW

**72.15: Integration Tests — Full Auth Flow (5 pts)**

Create `apps/api/tests/integration/agent-connect.test.ts`:
- Full flow: create agent → get auth key → POST challenge → sign nonce → POST authenticate → GET connect SSE → receive heartbeat → disconnect → verify liveness status
- Multi-agent: Agent A sends A2A task to Agent B using `sess_*` token; Agent B receives `task_assigned` on SSE channel
- Key rotation: rotate key → verify old sessions revoked → new challenge-response works
- Error cases: expired challenge, invalid signature, revoked session, inactive agent

Key files:
- `apps/api/tests/integration/agent-connect.test.ts` — NEW

---

## Files Summary

### New Files (8)
| File | Purpose |
|------|---------|
| `apps/api/supabase/migrations/20260324_agent_keypair_auth.sql` | DB schema (4 tables + RLS) |
| `apps/api/src/services/agent-auth/challenge.ts` | Challenge-response logic |
| `apps/api/src/services/agent-auth/session.ts` | Session token management |
| `apps/api/src/services/agent-auth/connection-bus.ts` | Agent event bus singleton |
| `apps/api/src/routes/agent-connect.ts` | All new routes (challenge, auth, connect, keys) |
| `apps/api/src/workers/agent-connection-cleanup.ts` | Stale challenge/session/connection cleanup |
| `apps/api/tests/unit/agent-keypair-auth.test.ts` | Unit tests |
| `apps/api/tests/integration/agent-connect.test.ts` | Integration tests |

### Modified Files (6)
| File | Change |
|------|--------|
| `apps/api/src/utils/crypto.ts` | Add nonce gen, session token gen, Ed25519 verify |
| `apps/api/src/middleware/auth.ts` | Add `sess_` token auth path (~line 470) |
| `apps/api/src/routes/agents.ts` | Auto key-pair at creation, liveness in GET |
| `apps/api/src/app.ts` | Mount public + authenticated routes |
| `apps/api/src/index.ts` | Start/stop cleanup worker |
| `packages/types/src/index.ts` | New type interfaces, extend Agent |
