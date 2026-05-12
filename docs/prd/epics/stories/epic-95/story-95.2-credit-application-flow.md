# Story 95.2: Credit Application Flow

**Status:** Planned
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 95.1

---

```
POST /v1/credit/applications
GET /v1/credit/applications/:id
```

Partner-mediated v1 flow: a partner submits an application on behalf of an underwriting decision they're about to make. Sly returns a recommended credit-line range based on the score + breakdown. Adjudication happens off-Sly. The application record persists for audit (Story 95.6).

## Acceptance

- [ ] POST accepts `{agent_id, partner_id, requested_amount_usdc, currency, purpose}` and returns `{recommended_min, recommended_max, score_report, application_id}`
- [ ] GET returns the application with its lifecycle state (`submitted | partner_approved | partner_denied | expired`)
- [ ] Partner updates lifecycle via a PATCH (their off-Sly adjudication decision flows back for audit)
- [ ] Application TTL = 30 days; expired applications cannot transition
- [ ] All transitions logged to the audit trail (95.6)

## Technical notes

The recommended range is a function of score tier (e.g. score ≥900 → up to $5k; 700–899 → up to $1k; <700 → $0 — pilot-tunable). Document that Sly is the score provider, not the lender. Carefully avoid language that implies Sly extends credit.

## Dependencies

Story 95.1.
