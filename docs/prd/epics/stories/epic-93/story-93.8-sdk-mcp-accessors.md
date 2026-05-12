# Story 93.8: SDK + MCP Receipt Accessors

**Status:** Planned
**Epic:** [Epic 93 — Reputation Receipts](../../epic-93-reputation-receipts.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 93.6

---

Add `sly.agents.receipts.list(agentId, { since, limit, event_type })` and `sly.agents.receipts.get(receiptId)` to the unified SDK. Mirror as an MCP tool `sly_agent_receipts` so Claude (and other MCP clients) can pull receipts during conversations like "check this agent's history before hiring."

## Acceptance

- [ ] SDK methods typed with `ReputationReceipt` from `@sly/types`
- [ ] MCP tool registered with the same input shape; returns trimmed payloads to fit in tool result size limits
- [ ] SDK is publishable: bump version in `packages/sdk/package.json` and `packages/mcp-server/package.json`
- [ ] Examples in `packages/sdk/README.md` and MCP tool description

## Technical notes

SDK calls the public REST endpoint from 93.6 with no special auth — agent token only required if the agent isn't publicly discoverable. The MCP tool should default to a small `limit` (10) to stay within response budgets.

## Dependencies

93.6.
