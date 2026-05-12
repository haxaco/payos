# Story 93.3: Receipt Signing Service

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 93.1, Story 93.2

---

Receipts must be tamper-evident. Implement a signing service that, after a receipt row is inserted, computes a canonical JSON of `{id, agent_id, counterparty_id, event_type, payload, created_at}`, signs it with the Sly platform Ed25519 key, and stores the signature back on the row. External verifiers reproduce the canonical bytes and verify against the published Sly platform public key.

## Acceptance

- [ ] Canonicalization is deterministic (sorted keys, no whitespace, JCS-like) and documented
- [ ] Sly platform public key published at `GET /v1/.well-known/sly-platform-key.json`
- [ ] Signing runs async after receipt insert; rows missing a signature retry on a 60s timer
- [ ] `verifyReceipt(receipt, publicKey)` helper exported from SDK + utils package
- [ ] Key rotation plan: the public-key endpoint returns multiple active keys (`kid` per signature)

## Technical notes

Use the same Ed25519 primitive Sly already uses for session tokens (Epic 72), but a separate dedicated platform key — do NOT reuse the session-signing key. Store the platform key in the same KMS/secret store as other production secrets. The `kid` in each signature lets us rotate without invalidating history.

## Dependencies

93.1, 93.2.
