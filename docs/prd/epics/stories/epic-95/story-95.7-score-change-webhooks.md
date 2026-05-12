# Story 95.7: Webhooks — Score-Change Events

**Status:** Planned
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 95.1, Story 95.6; Epic 93 (composite score recomputation)

---

Partners with active credit lines subscribe to `agent.score_changed` webhooks. Event fires when an agent's composite score crosses a configurable threshold (e.g. drops by 50 points, drops below 700). Lets partners reprice or close credit lines based on score deterioration.

## Acceptance

- [ ] Subscription model: partner registers `{agent_id, threshold_kind, threshold_value}` watch
- [ ] Webhook payload includes `{agent_id, score_before, score_after, threshold_crossed, signature}`
- [ ] At-least-once delivery with exponential backoff
- [ ] Delivery attempts logged to `credit_audit_log` (95.6)
- [ ] Idempotency-key in headers so partners can dedupe

## Technical notes

Score changes are computed on each receipt insert (Epic 93) — hook into that pipeline rather than polling. Watch list scales with partner adoption; keep it indexed.

## Dependencies

Story 95.1, Story 95.6; Epic 93 (composite score recomputation).
