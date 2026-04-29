# Agent Authentication Guide

## Overview

Sly supports two authentication methods for AI agents, both active simultaneously:

1. **Bearer Token Auth** (`agent_*`) — shared-secret token sent in every request header. Simple, backwards-compatible, sufficient for getting started.
2. **Ed25519 Key-Pair Auth** (`sess_*`) — challenge-response handshake where the agent's private key never leaves the agent process. Short-lived session tokens, individually revocable, with persistent SSE event delivery. **Recommended for production.**

Both methods produce an identical `RequestContext` and work on all `/v1/*` endpoints. Upgrading from bearer tokens to key-pair auth requires zero route changes.

## Quick Start

### 1. Create an Agent (auto-generates both credentials)

```bash
curl -X POST https://api.getsly.ai/v1/agents \
  -H "Authorization: Bearer pk_test_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "accountId": "YOUR_BUSINESS_ACCOUNT_ID",
    "generate_keypair": true
  }'
```

Response (201):
```json
{
  "data": { "id": "agent-uuid", ... },
  "credentials": {
    "token": "agent_abc123...",
    "warning": "SAVE THIS TOKEN NOW - it will never be shown again!"
  },
  "authKey": {
    "keyId": "auth_abcdef01_12345678",
    "publicKey": "<base64 Ed25519 public key>",
    "privateKey": "<base64 Ed25519 private key>",
    "algorithm": "ed25519",
    "warning": "SAVE THIS PRIVATE KEY NOW — it will never be shown again!"
  }
}
```

Save both the `agent_*` token (for simple use) and the Ed25519 private key (for production auth). Neither will ever be shown again.

### 2a. Simple Auth (bearer token)

```bash
curl -H "Authorization: Bearer agent_abc123..." \
  https://api.getsly.ai/v1/agents
```

Works immediately. The token is sent in every request. If intercepted, the attacker has permanent access until the token is manually rotated.

### 2b. Production Auth (Ed25519 challenge-response)

**Step 1: Request a challenge nonce** (public endpoint, no auth required)

```bash
curl -X POST https://api.getsly.ai/v1/agents/AGENT_ID/challenge
```

```json
{
  "challenge": "challenge_abcdef01_random...",
  "expiresIn": 60,
  "algorithm": "ed25519"
}
```

**Step 2: Sign the challenge with your private key**

```javascript
import * as ed25519 from '@noble/ed25519';

const message = new TextEncoder().encode(challenge);
const privateKey = Buffer.from(PRIVATE_KEY_BASE64, 'base64');
const signature = Buffer.from(
  await ed25519.signAsync(message, privateKey)
).toString('base64');
```

**Step 3: Authenticate** (public endpoint, no auth required)

```bash
curl -X POST https://api.getsly.ai/v1/agents/AGENT_ID/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": "challenge_abcdef01_random...",
    "signature": "<base64 Ed25519 signature>"
  }'
```

```json
{
  "sessionToken": "sess_xyz789...",
  "expiresIn": 3600,
  "agentId": "AGENT_ID"
}
```

**Step 4: Use the session token** (exactly like a bearer token)

```bash
curl -H "Authorization: Bearer sess_xyz789..." \
  https://api.getsly.ai/v1/agents
```

The `sess_*` token works on ALL authenticated endpoints — agents, wallets, transfers, streams, A2A, x402, everything. It expires in 1 hour. Re-authenticate when it expires.

### 3. Persistent SSE Connection (receive events without polling)

```bash
curl -N -H "Authorization: Bearer sess_xyz789..." \
  https://api.getsly.ai/v1/agents/AGENT_ID/connect
```

Events pushed to the agent:
- `task_assigned` — new A2A task received from another agent
- `transfer_completed` — a transfer involving this agent completed
- `approval_requested` — a spend requires manager approval
- `stream_alert` — a managed stream needs attention
- `key_rotated` — auth key was rotated (sessions about to be revoked)
- `heartbeat` — 30-second keepalive

Supports `Last-Event-ID` header for reconnect — missed events are replayed from a 100-event / 5-minute buffer.

Maximum connection duration: 24 hours (server sends `reconnect_required` before closing).

### 4. Key Rotation

Agents can self-rotate their Ed25519 key without needing an API key holder. Sign the message `rotate:<agentId>` with the current private key:

```bash
curl -X POST https://api.getsly.ai/v1/agents/AGENT_ID/auth-keys/rotate \
  -H "Authorization: Bearer pk_test_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "proof": "<base64 signature of rotate:AGENT_ID>" }'
```

This atomically:
1. Marks the old key as `rotated`
2. Revokes ALL active sessions issued under the old key
3. Generates a new Ed25519 key pair
4. Returns the new private key (save it — never shown again)

### 5. Key Revocation (kill-switch)

```bash
curl -X DELETE https://api.getsly.ai/v1/agents/AGENT_ID/auth-keys \
  -H "Authorization: Bearer pk_test_YOUR_API_KEY"
```

Instantly revokes the auth key and all active sessions. The agent cannot authenticate until a new key is provisioned. Unlike freezing a wallet (which blocks spending), key revocation blocks all API access.

### 6. Liveness Check

```bash
curl -H "Authorization: Bearer sess_xyz789..." \
  https://api.getsly.ai/v1/agents/AGENT_ID/liveness
```

```json
{
  "connected": true,
  "connectedAt": "2026-04-14T10:00:00Z",
  "lastHeartbeatAt": "2026-04-14T10:05:30Z",
  "connectionDuration": 330
}
```

Liveness is **soft** — `connected`/`disconnected` is informational. The agent stays `active` even when disconnected. Use `GET /v1/agents?connected=true` to filter for currently-online agents.

## Security Comparison

| Aspect | Bearer Token (`agent_*`) | Key-Pair Auth (`sess_*`) |
|--------|--------------------------|--------------------------|
| Secret exposure | Token sent in every header | Private key never leaves agent |
| If intercepted | Permanent full access | 1-hour session, revocable |
| Replay protection | None | Nonce-based, single-use |
| Session revocation | Must rotate entire token | Per-session, instant |
| Self-rotation | Requires API key holder | Agent signs rotation proof |
| Event delivery | Must poll for tasks | Push via SSE channel |
| Liveness | No signal | Connected/disconnected status |

## Endpoints Reference

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /v1/agents/:id/challenge` | Public | Request challenge nonce (60s TTL) |
| `POST /v1/agents/:id/authenticate` | Public | Submit signed challenge, get `sess_*` |
| `POST /v1/agents/:id/auth-keys` | Tenant | Provision Ed25519 key pair |
| `POST /v1/agents/:id/auth-keys/rotate` | Tenant | Rotate key (signed proof required) |
| `DELETE /v1/agents/:id/auth-keys` | Tenant | Revoke key + all sessions |
| `GET /v1/agents/:id/connect` | `sess_*` | Persistent SSE channel |
| `GET /v1/agents/:id/liveness` | Tenant | Check connection status |
