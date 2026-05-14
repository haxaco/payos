# Story 93.3: Receipt Signing Service

> ## ⚠️ DEPRECATED — Absorbed into Epic 97 (Proof of Work Foundation)
>
> **Status:** 🚫 Deprecated (2026-05-14, Epic 93 scope cut)
> **Replaced by:** [Epic 97 Stories 97.5 (SDK EIP-712 helpers) + 97.6 (Sly KMS signing key)](../../epic-97-proof-of-work-foundation.md)
>
> Epic 97 introduces full bilateral EIP-712 signing: parties sign with their Circle Programmable Wallet secp256k1 keys; Sly signs PolicyDecision records and bundle assembly via a KMS-managed key under the same EIP-712 domain. The original Epic 93 plan to have Sly's platform key sign single-party receipts is obsolete — Epic 97's bilateral model is the correct trust shape.
>
> See [Epic 93 (revised)](../../epic-93-reputation-receipts.md) for the narrowed score-feeder scope (19 pts, 5 stories).

---

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
