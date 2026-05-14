# Story 93.2: Receipt Generation Hooks

> ## ⚠️ DEPRECATED — Absorbed into Epic 97 (Proof of Work Foundation)
>
> **Status:** 🚫 Deprecated (2026-05-14, Epic 93 scope cut)
> **Replaced by:** [Epic 97 Stories 97.8 (half-sign) + 97.9 (counter-sign) + 97.14 (x402 adapter) + 97.15 (AP2/ACP/UCP adapters) + 97.16 (MPP adapter)](../../epic-97-proof-of-work-foundation.md)
>
> Epic 97's receipt assembler emits a bilateral EIP-712 signed receipt at every terminal-state transition across all five protocol rails. Epic 93's original "hooks" approach (subscribe to A2A acceptance + x402 settle + dispute resolution) is superseded by Epic 97's first-class assembler service.
>
> See [Epic 93 (revised)](../../epic-93-reputation-receipts.md) for the narrowed score-feeder scope (19 pts, 5 stories).

---

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
