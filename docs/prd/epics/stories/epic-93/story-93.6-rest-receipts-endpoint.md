# Story 93.6: REST — `GET /v1/agents/:id/receipts`

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 93.1

---

Paginated public-readable endpoint for an agent's receipts. Powers the inspector (93.7) and is the canonical export surface for federated reputation pitches.

```
GET /v1/agents/:id/receipts?since=<iso>&limit=50&event_type=a2a_completion
```

## Acceptance

- [ ] No auth required when the agent has `discovery.public = true`; 404 otherwise (do not leak existence)
- [ ] Cursor-based pagination (`since` + `id` tie-break)
- [ ] Response includes signature, signed_at, onchain_hash, onchain_proof per receipt
- [ ] Rate limited (60 req/min per IP) — receipts are public but cheap to forge load against
- [ ] CORS open (`*`) — receipts are meant to be consumed by external apps

## Technical notes

Cache at the edge with a short TTL (30s) keyed on `(agent_id, since, limit)`. The PII risk is low because receipts are already public-by-design, but redact any free-text `comment` fields if the counterparty has a privacy flag set.

## Dependencies

93.1.
