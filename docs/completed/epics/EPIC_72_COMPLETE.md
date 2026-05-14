# Epic 72: Agent Key-Pair Authentication & Persistent Connection — Complete

**Status:** ✅ Complete
**Completion Date:** April 2026
**Points Delivered:** 62
**Stories:** 15/15
**PRD Version:** v1.24 cluster; v1.28 (this backfill)

## Summary

Replaced bearer-token-only agent authentication with an Ed25519 challenge-response handshake. Agents prove identity by signing a server-issued nonce with a private key that never leaves the agent. Sessions are short-lived (1 hour TTL), individually revocable, and set the same `RequestContext` as `agent_*` tokens — so every endpoint accepts both without route-level changes.

Also added persistent SSE connection (`GET /v1/agents/:id/connect`) so Sly can push events to connected agents in real time — 30s heartbeat, `Last-Event-ID` replay for reconnects.

This is the security foundation that the marketplace simulator and every A2A flow leans on. It's also a prerequisite for Epic 73 (KYC/KYA Tiers) since tier upgrades require provable agent identity.

## Key Deliverables

- Ed25519 keypair auto-generated on agent creation (`generate_keypair: true`)
- Public challenge endpoint: `POST /v1/agents/:id/challenge`
- Public authenticate endpoint: `POST /v1/agents/:id/authenticate` returns `sess_*` token
- Key management: provision (`POST /v1/agents/:id/auth-keys`), rotate (`/rotate`), revoke (`DELETE`)
- Persistent SSE channel: `GET /v1/agents/:id/connect` with 30s heartbeat + Last-Event-ID replay
- `sess_*` tokens work on all endpoints (identical RequestContext to `agent_*`); `sessionBased: true` flag for audit differentiation
- 15 stories across 5 phases

## Source-of-Truth Files

- Epic spec: `docs/prd/epics/epic-72-agent-keypair-auth.md`
- Code paths:
  - `apps/api/src/routes/agent-auth.ts`
  - `apps/api/src/services/auth/ed25519-challenge.ts`
  - `apps/api/src/services/auth/session-tokens.ts`
  - `apps/api/src/routes/agent-connect.ts` (SSE)
  - `apps/api/src/middleware/auth.ts` (sess_* handling)
- Onboarding doc: `docs/guides/onboarding/AGENT_AUTH_GUIDE.md`
- Migrations: `apps/api/supabase/migrations/*agent_auth_keys*.sql`, `*agent_sessions*.sql`

## Linear

- Linear adoption was mid-Epic-72; some early stories pre-Linear, late stories tracked in mid-Q1 Linear cluster

## Follow-on Work

- KYC/KYA Tiers (Epic 73 — ✅) builds tier upgrades on top of Ed25519 identity
- BYO Wallet Custody (Epic 77 — 📋) extends the key-pair model to support tenant-managed wallets
- Scoped Capability Tokens (Epic 82 — 📋) adds short-lived elevation scopes on top of `sess_*` tokens
- Proof of Work Foundation (Epic 97 — 📋) uses Circle Programmable Wallets for EIP-712 signing; the Ed25519 session token authenticates the *request*, while Circle wallet signs the *receipt*
