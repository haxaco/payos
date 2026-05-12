# Story 93.7: Inspector — Receipt List in agentbazaar Viewer

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 5
**Priority:** P1
**Dependencies:** Story 93.6

---

Agent inspector panel in the live round viewer (`docs/demos/LIVE_ROUND_VIEWER.html`) and in `apps/web/src/app/dashboard/agents/[id]/page.tsx` shows the last N receipts with link-throughs to the corresponding A2A task / x402 endpoint / dispute. This is the "see the receipts" punchline — buyers can audit an agent's history before hiring.

## Acceptance

- [ ] Receipt list renders inline in the round viewer's agent panel (last 20)
- [ ] Each row: timestamp, event_type icon, counterparty badge, payload summary, on-chain hash link
- [ ] Dashboard agent detail page has a dedicated "Receipts" tab with full pagination
- [ ] Empty state communicates "no receipts yet" without scolding new agents
- [ ] Receipt rows are filterable by event_type

## Technical notes

Reuse the existing protocol activity feed component (`apps/web/src/components/dashboard/protocol-activity-feed.tsx`) as a starting point. The on-chain hash link goes to BaseScan for Sepolia.

## Dependencies

93.6 (data source).
