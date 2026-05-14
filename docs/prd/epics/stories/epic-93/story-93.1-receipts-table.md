# Story 93.1: `reputation_receipts` Table Migration

> ## ⚠️ DEPRECATED — Absorbed into Epic 97 (Proof of Work Foundation)
>
> **Status:** 🚫 Deprecated (2026-05-14, Epic 93 scope cut)
> **Replaced by:** [Epic 97 Story 97.2 — Receipts Table + `sly.receipt.v1` Schema](../../epic-97-proof-of-work-foundation.md)
>
> Epic 97 owns the receipt primitive (bilateral EIP-712 signed, tenant-scoped RLS, trigger-enforced append-only, with FK to `transfers`). Epic 93 no longer maintains its own `reputation_receipts` table — the score-feeder layer reads from Epic 97's `receipts` table directly.
>
> See [Epic 93 (revised)](../../epic-93-reputation-receipts.md) for the narrowed score-feeder scope (19 pts, 5 stories).

---

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 3
**Priority:** P0
**Dependencies:** None

---

Create the receipts table that backs the entire epic. RLS by `tenant_id` for tenant-internal queries, but receipts are also readable publicly via the agent profile endpoint (Story 93.6) when the agent has `discovery.public=true`.

```sql
CREATE TABLE reputation_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  counterparty_id UUID,
  counterparty_kind TEXT CHECK (counterparty_kind IN ('agent', 'merchant', 'user', NULL)),
  marketplace_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('a2a_completion', 'x402_settle', 'dispute_resolved')),
  payload JSONB NOT NULL,
  signature TEXT,
  signed_at TIMESTAMPTZ,
  onchain_hash TEXT,
  onchain_rollup_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_receipts_agent_created ON reputation_receipts (agent_id, created_at DESC);
CREATE INDEX idx_receipts_event_type ON reputation_receipts (event_type);
CREATE INDEX idx_receipts_pending_rollup ON reputation_receipts (created_at) WHERE onchain_rollup_id IS NULL;
```

## Acceptance

- [ ] Migration ships with RLS policy: tenant can read its own receipts; public read allowed only when `agents.discovery_public = true`
- [ ] Indexes cover the three hot paths: per-agent timeline, event_type filter, pending-rollup batch
- [ ] `payload` shape validated app-side per `event_type` (see Story 93.2 for shapes)
- [ ] Backfill plan: existing A2A completions and x402 settles do NOT generate retroactive receipts in v1 (documented)

## Technical notes

Keep `onchain_hash` nullable — the rollup is optional and we want receipts usable before the daily job runs. `onchain_rollup_id` lets us batch-update once the merkle root is anchored.

## Dependencies

None — pure schema.
