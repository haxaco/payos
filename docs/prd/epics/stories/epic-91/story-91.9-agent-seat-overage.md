# Story 91.9: Agent Seat Counting + Overage Billing

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 5
**Priority:** P2
**Dependencies:** Story 91.7, Story 91.8

---

Count active agents per marketplace daily. Free up to N seats per KYM tier (TBD; initial guess: 25 for T1, 100 for T2). Above N, charge a per-seat monthly fee added to the Stripe invoice.

```sql
CREATE TABLE marketplace_seat_usage (
  marketplace_id UUID NOT NULL REFERENCES marketplaces(id),
  measured_at DATE NOT NULL,
  active_agent_count INTEGER NOT NULL,
  free_seats INTEGER NOT NULL,
  billable_seats INTEGER GENERATED ALWAYS AS (GREATEST(0, active_agent_count - free_seats)) STORED,
  PRIMARY KEY (marketplace_id, measured_at)
);
```

Daily cron computes active-agent count per marketplace (an agent is "active" if it had ≥1 transaction in the trailing 30 days). Monthly close averages the daily measurements and bills the max (or 95th percentile — TBD with finance).

## Acceptance

- [ ] Daily cron writes `marketplace_seat_usage` rows for every active marketplace
- [ ] "Active agent" defined as ≥1 transaction in trailing 30 days — documented in code comment
- [ ] Free-seat thresholds configurable per KYM tier (env or DB table)
- [ ] Monthly invoice line item shows `billable_seats × per_seat_price` with a breakdown link
- [ ] Operator dashboard shows current usage + headroom (Story 91.6 surface)

## Technical notes

Don't bill on raw daily counts — operators legitimately spike traffic. 95th percentile across the billing period is the fair number. Coordinate with Story 91.8 to share the monthly Stripe invoice — both stories add line items to the same recurring invoice, don't create separate invoices.

## Dependencies

Story 91.7, Story 91.8.
