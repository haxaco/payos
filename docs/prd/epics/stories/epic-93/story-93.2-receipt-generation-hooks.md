# Story 93.2: Receipt Generation Hooks

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 93.1; Epic 69 (A2A acceptance flow); Epic 14/15 (dispute resolution)

---

Wire three hooks that emit receipts on the events that matter. Each hook is idempotent (event_id → receipt is a 1:1 mapping with a unique constraint) and fires after the underlying state transition commits.

Hook points:
1. **A2A completion** — extend the existing acceptance flow in `apps/api/src/routes/a2a.ts` (or wherever Epic 69 acceptance lives) to insert a receipt with `{task_id, score, comment, satisfaction}` on the final accept transition.
2. **x402 settle** — in `apps/api/src/services/settlement-batcher.ts` (or the x402 settle path), insert a receipt with `{endpoint_id, amount_usdc, tx_hash, counterparty}`.
3. **Dispute resolved** — at the resolve-dispute terminal state, insert a receipt with `{dispute_id, outcome, amount_recovered, fault}`.

## Acceptance

- [ ] All three hooks insert receipts on the happy path
- [ ] Hooks are idempotent: replaying the same triggering event produces zero new receipts (uniqueness via `(event_type, payload->>'<event_id_field>')`)
- [ ] Hooks fail open — receipt write failure logs an error but does NOT roll back the underlying state transition
- [ ] Each hook fills `counterparty_id` and `counterparty_kind` accurately
- [ ] Integration tests cover one path per hook

## Technical notes

Receipt writes should NOT block the user-facing latency of completing a task or settling. Consider firing via the existing job/queue infra (or even a fire-and-forget in v1 — receipts are accumulative, not authoritative-on-the-spot). The signing step (93.3) can be deferred (asynchronous) so it never blocks the hook.

## Dependencies

93.1; Epic 69 (A2A acceptance flow); Epic 14/15 (dispute resolution).
