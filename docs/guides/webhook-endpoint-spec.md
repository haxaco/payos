# Sly Webhook Endpoint Spec

> Standalone reference for implementing a webhook receiver that works with Sly's `endpoint_type=webhook` agent forwarding.
>
> **Source of truth**: All payloads, headers, and behavior documented here are derived from the actual implementation. Source file references are provided for each section.

---

## 1. Overview

Two distinct webhook flows exist:

| Flow | Direction | Purpose |
|------|-----------|---------|
| **Dispatch webhook** | Sly → your endpoint | Sly forwards a task to your webhook when a message arrives |
| **Callback** | Your endpoint → Sly | You POST results back when done processing |

There is also a third flow — **completion webhooks** — where Sly notifies the *caller* (not the agent) when a task reaches a terminal state. This is triggered by the `configuration.callbackUrl` parameter on task submission, not by `endpoint_type=webhook`.

---

## 2. Dispatch Webhook — What Your Endpoint Receives

When a task is submitted to your agent, Sly POSTs the task to your registered `endpoint_url`.

**URL:** Your registered `endpoint_url` (set via `PUT /v1/agents/:id/endpoint`)

**Method:** `POST`

**Headers:**

| Header | Value | Always present? |
|--------|-------|-----------------|
| `Content-Type` | `application/json` | Yes |
| `User-Agent` | `Sly-A2A-Webhooks/1.0` | Yes |
| `X-Sly-Event` | `task.submitted` | Yes |
| `X-Sly-Delivery` | UUID (unique per delivery attempt) | Yes |
| `X-Sly-Signature` | `t=<unix_ts>,v1=<hmac_hex>` | Only if `endpoint_secret` is set |

> Source: `apps/api/src/services/a2a/webhook-handler.ts:49-54`

**Payload:**

```json
{
  "event": "task.submitted",
  "task": {
    "id": "<sly-task-uuid>",
    "agentId": "<your-agent-uuid>",
    "contextId": "<context-uuid-or-undefined>",
    "status": "working",
    "history": [
      {
        "messageId": "<uuid>",
        "role": "user",
        "parts": [
          { "text": "Generate an invoice for order #1234" }
        ],
        "metadata": {}
      }
    ],
    "artifacts": []
  },
  "timestamp": "2026-02-23T12:00:00.000Z",
  "webhookId": "<same-as-X-Sly-Delivery>"
}
```

> Source: `apps/api/src/services/a2a/webhook-handler.ts:250-293` (`buildPayload` method)

**Notes on the payload:**

- `task.history` contains all messages in chronological order. Each message has `messageId`, `role` (`"user"` or `"agent"`), `parts`, and optional `metadata`.
- `task.artifacts` contains any artifacts already attached to the task (usually empty on first dispatch).
- `parts` follow the A2A part format: `{ "text": "..." }` for text, `{ "data": {...}, "metadata": { "mimeType": "..." } }` for structured data, `{ "file": { "uri": "...", "mimeType": "..." } }` for files.
- `contextId` may be `undefined` if the task was submitted without a conversation context.

**Expected response:** Any `2xx` status code. The response body is stored (first 1000 chars) but not parsed.

**Timeout:** 30 seconds by default. Configurable via `processingConfig.timeoutMs` when setting up webhook mode (range: 1000–120000ms).

---

## 3. HMAC Signature Verification

If you registered an `endpoint_secret`, every dispatch webhook and every callback verification uses HMAC-SHA256 signing.

**Signature header format:** `t=<unix_timestamp>,v1=<hex_signature>`

**Signed string:** `{timestamp}.{raw_json_body}`

**Algorithm:** HMAC-SHA256 with your `endpoint_secret` as the key.

> Source: `apps/api/src/services/a2a/webhook-handler.ts:236-245`

### TypeScript Verification

```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const [tPart, vPart] = signature.split(',');
  const timestamp = tPart.slice(2);   // strip "t="
  const providedSig = vPart.slice(3);  // strip "v1="

  // Reject if timestamp is older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSig, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}
```

### Express/Node.js Usage

```typescript
app.post('/webhook', express.text({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-sly-signature'] as string;
  if (sig && !verifySignature(req.body, sig, process.env.ENDPOINT_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  const payload = JSON.parse(req.body);
  // Process the task...
  res.status(200).json({ ok: true });
});
```

> **Important:** You must read the raw body (not parsed JSON) for signature verification, since the signature is computed over the exact bytes sent.

---

## 4. Callback — How to Return Results

After processing the task, POST your results back to Sly.

**URL:** `POST {BASE_URL}/a2a/{agentId}/callback`

> Source: `apps/api/src/routes/a2a.ts:355-515`

**Method:** `POST`

**Headers:**

| Header | Value | Required? |
|--------|-------|-----------|
| `Content-Type` | `application/json` | Yes |
| `X-Sly-Signature` | `t=<ts>,v1=<hmac>` | Only if `endpoint_secret` is set |

If your agent has an `endpoint_secret`, Sly **requires** you to sign callbacks with the same HMAC scheme. Unsigned callbacks will receive a `401` response.

> Source: `apps/api/src/routes/a2a.ts:376-415`

### Minimal Callback (no response message)

```json
{
  "taskId": "<sly-task-uuid-from-dispatch>",
  "state": "completed"
}
```

### Callback with Message and Artifacts

```json
{
  "taskId": "<sly-task-uuid>",
  "state": "completed",
  "statusMessage": "Invoice generated successfully",
  "message": {
    "parts": [
      { "text": "Invoice #INV-1234 generated for $500 USDC." },
      { "data": { "invoiceId": "INV-1234", "amount": 500 }, "metadata": { "mimeType": "application/json" } }
    ]
  },
  "artifacts": [
    {
      "name": "invoice-1234",
      "mediaType": "application/json",
      "parts": [{ "data": { "invoiceId": "INV-1234", "lineItems": [] } }]
    }
  ]
}
```

### Callback with Simple Result (shorthand)

```json
{
  "taskId": "<sly-task-uuid>",
  "state": "completed",
  "result": "Invoice #INV-1234 generated for $500 USDC."
}
```

When `result` is a string, it's stored as a `{ "text": "..." }` part. When it's an object, it's stored as a `{ "data": {...} }` part.

> Source: `apps/api/src/routes/a2a.ts:449-457`

### Accepted Fields

| Field | Aliases | Required? | Description |
|-------|---------|-----------|-------------|
| `taskId` | `task_id` | Yes | The task ID from the dispatch payload |
| `state` | `status` | Yes | Must be `"completed"` or `"failed"` |
| `statusMessage` | — | No | Human-readable status message |
| `message` | — | No | Agent response with `parts` array |
| `result` | — | No | Shorthand for a simple text/data response |
| `artifacts` | — | No | Array of artifacts to attach |

> Source: `apps/api/src/routes/a2a.ts:423-429`

### Success Response

```json
{
  "data": { "taskId": "<uuid>", "state": "completed", "received": true }
}
```

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| `400` | `"Invalid agent ID format"` | Malformed agent UUID in URL |
| `400` | `"taskId is required"` | Missing or invalid `taskId` |
| `400` | `"state must be \"completed\" or \"failed\""` | Invalid state value |
| `401` | `"Missing X-Sly-Signature header"` | Secret is configured but no signature sent |
| `401` | `"Signature timestamp expired"` | Timestamp older than 5 minutes |
| `401` | `"Invalid signature"` | HMAC doesn't match |
| `404` | `"Agent not found"` | Agent ID doesn't exist |
| `404` | `"Task not found for this agent"` | Task doesn't belong to this agent |

---

## 5. Retry & Dead-Letter Queue

Dispatch webhooks are retried on failure with exponential backoff.

**Retry schedule:** 30s → 2min → 5min → 15min → 1hr (5 attempts total)

**After 5 failures:** Task moves to DLQ, state set to `failed`, `webhook_status` set to `dlq`.

**DLQ retry:** `POST /v1/a2a/tasks/:taskId/retry` — resets the task to `submitted` so the worker re-dispatches it.

**Webhook delivery status progression:** `pending` → `delivered` or `failed` → `dlq`

> Source: `apps/api/src/services/a2a/webhook-handler.ts:16-18`

---

## 6. Completion Webhook (Caller Notifications)

This is separate from dispatch webhooks. When a **caller** submits a task with `configuration.callbackUrl`, Sly notifies them when the task reaches a terminal state (`completed`, `failed`, or `canceled`).

**This is NOT the same as agent forwarding.** Agent forwarding pushes tasks *to* the agent. Completion webhooks push results *back to the caller*.

**How to set it up:** Include `callbackUrl` (and optionally `callbackSecret`) in the `configuration` parameter when sending a task:

```json
{
  "jsonrpc": "2.0",
  "method": "message/send",
  "id": "1",
  "params": {
    "message": { "role": "user", "parts": [{ "text": "..." }] },
    "configuration": {
      "callbackUrl": "https://your-server.com/sly-callback",
      "callbackSecret": "your-hmac-secret"
    }
  }
}
```

**Headers sent by Sly:**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `User-Agent` | `Sly-Completion-Webhooks/1.0` |
| `X-Sly-Event` | `task.completed` / `task.failed` / `task.canceled` |
| `X-Sly-Signature` | `t=<ts>,v1=<hmac>` (only if `callbackSecret` was provided) |

> Source: `apps/api/src/services/a2a/completion-webhook.ts:154-169`

**Payload:**

```json
{
  "event": "task.completed",
  "task": {
    "id": "<task-uuid>",
    "agentId": "<agent-uuid>",
    "contextId": "<context-uuid>",
    "status": {
      "state": "completed",
      "message": "Task completed successfully"
    },
    "history": [
      {
        "messageId": "<uuid>",
        "role": "user",
        "parts": [{ "text": "Generate an invoice" }]
      },
      {
        "messageId": "<uuid>",
        "role": "agent",
        "parts": [{ "text": "Invoice generated." }]
      }
    ],
    "artifacts": [
      {
        "artifactId": "<uuid>",
        "name": "invoice",
        "mediaType": "application/json",
        "parts": [{ "data": { "invoiceId": "INV-1234" } }]
      }
    ],
    "metadata": {}
  },
  "timestamp": "2026-02-23T12:05:00.000Z"
}
```

> Source: `apps/api/src/services/a2a/completion-webhook.ts:71-129`

**Retry behavior:** Same schedule as dispatch webhooks — 30s → 2min → 5min → 15min → 1hr, 5 attempts max.

---

## 7. Endpoint Registration Reference

### Register a webhook endpoint

```bash
curl -X PUT "${BASE_URL}/v1/agents/${AGENT_ID}/endpoint" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_url": "https://your-server.com/sly-webhook",
    "endpoint_type": "webhook",
    "endpoint_secret": "your-hmac-secret"
  }'
```

> Source: `apps/api/src/routes/agents.ts:1874-1944`

**Validation rules:**
- `endpoint_url` must be HTTPS (or `localhost`/`127.0.0.1` for development)
- `endpoint_type` must be `webhook`, `a2a`, or `x402`
- `endpoint_secret` is optional (max 255 chars) but strongly recommended

### Configure webhook processing mode

After registering the endpoint, also set the processing mode to `webhook`:

```bash
curl -X PUT "${BASE_URL}/v1/a2a/agents/${AGENT_ID}/config" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "processingMode": "webhook",
    "processingConfig": {
      "callbackUrl": "https://your-server.com/sly-webhook",
      "callbackSecret": "your-hmac-secret",
      "timeoutMs": 30000
    }
  }'
```

> Source: `apps/api/src/routes/a2a.ts:829-846`

**Validation rules for webhook mode:**
- `callbackUrl` is required and must be a valid URL (HTTPS or localhost)
- `timeoutMs` is optional (default: 30000, range: 1000–120000)

---

## 8. Quick-Start Checklist

Step-by-step to go from zero to a working webhook receiver:

### Step 1: Register the endpoint

```bash
curl -X PUT "${BASE_URL}/v1/agents/${AGENT_ID}/endpoint" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_url": "https://your-server.com/sly-webhook",
    "endpoint_type": "webhook",
    "endpoint_secret": "my-secret-123"
  }'
```

### Step 2: Set processing mode to webhook

```bash
curl -X PUT "${BASE_URL}/v1/a2a/agents/${AGENT_ID}/config" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "processingMode": "webhook",
    "processingConfig": {
      "callbackUrl": "https://your-server.com/sly-webhook",
      "callbackSecret": "my-secret-123"
    }
  }'
```

### Step 3: Implement your receiver

Accept `POST` requests at your endpoint URL. Verify the HMAC signature (if you set a secret), extract the task, and return `200`.

```typescript
app.post('/sly-webhook', express.text({ type: 'application/json' }), (req, res) => {
  // 1. Verify signature
  const sig = req.headers['x-sly-signature'] as string;
  if (sig && !verifySignature(req.body, sig, 'my-secret-123')) {
    return res.status(401).json({ error: 'Bad signature' });
  }

  // 2. Parse payload
  const payload = JSON.parse(req.body);
  const taskId = payload.task.id;
  const messages = payload.task.history;

  // 3. Acknowledge receipt immediately
  res.status(200).json({ received: true });

  // 4. Process asynchronously (don't block the webhook response)
  processTask(taskId, messages).catch(console.error);
});
```

### Step 4: Call back with results

```bash
# Generate signature
TIMESTAMP=$(date +%s)
BODY='{"taskId":"<task-uuid>","state":"completed","message":{"parts":[{"text":"Done!"}]}}'
SIGNATURE=$(echo -n "${TIMESTAMP}.${BODY}" | openssl dgst -sha256 -hmac "my-secret-123" | awk '{print $2}')

curl -X POST "${BASE_URL}/a2a/${AGENT_ID}/callback" \
  -H "Content-Type: application/json" \
  -H "X-Sly-Signature: t=${TIMESTAMP},v1=${SIGNATURE}" \
  -d "${BODY}"
```

### Step 5: Test it

Send a task to your agent and verify the full round-trip:

```bash
curl -X POST "${BASE_URL}/a2a/${AGENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "jsonrpc": "2.0",
    "method": "message/send",
    "id": "test-1",
    "params": {
      "message": {
        "role": "user",
        "parts": [{ "text": "Hello, webhook agent!" }]
      }
    }
  }'
```

Then check the task status:

```bash
curl -s "${BASE_URL}/v1/a2a/tasks?agent_id=${AGENT_ID}&state=completed" \
  -H "Authorization: Bearer ${API_KEY}" | jq .
```
