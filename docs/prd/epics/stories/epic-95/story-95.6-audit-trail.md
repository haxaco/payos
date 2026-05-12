# Story 95.6: Audit Trail — Every Score Read Logged

**Status:** Planned
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 95.1, Story 95.2

---

Every call to the score-report endpoint, every credit application transition, and every webhook delivery (95.7) is recorded in an immutable `credit_audit_log` table. Agents can request their own credit-read history (analog to "free annual credit report" mechanic). Critical for trust and for the eventual regulatory conversation.

```sql
CREATE TABLE credit_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  partner_id UUID,
  action TEXT NOT NULL,  -- 'score_read' | 'application_submitted' | 'application_decided' | 'webhook_delivered'
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Acceptance

- [ ] Every score read writes one log row with `partner_id` + redacted partner context
- [ ] Endpoint `GET /v1/agents/:id/credit-history` returns the agent's full read history (agent-token auth required)
- [ ] Logs are append-only — no UPDATE / DELETE allowed via app or RLS
- [ ] Retention policy documented (default: indefinite; configurable)
- [ ] Partner-side logs filterable by date range for compliance review

## Technical notes

This is the table that protects Sly when a regulator (eventually) asks "who read this agent's score and why?" Worth building correctly even pre-pilot.

## Dependencies

Story 95.1, Story 95.2.
