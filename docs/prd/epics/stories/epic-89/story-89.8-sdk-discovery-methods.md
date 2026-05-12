# Story 89.8: SDK — `marketplaces.{listAgents, listEndpoints, getActivity, getStats}`

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Stories 89.1–89.4

---

Add the four discovery methods to `@sly_ai/sdk` under `sly.marketplaces.*`. Match the REST endpoints from 89.1–89.4 with strict TypeScript types. The MCP server in 89.7 consumes these directly, so types must be authoritative.

```typescript
sly.marketplaces.listAgents(marketplaceId, { kya?: number, skill?: string, limit?: number, cursor?: string })
sly.marketplaces.listEndpoints(marketplaceId, opts)
sly.marketplaces.getActivity(marketplaceId, { since?: string })
sly.marketplaces.getStats(marketplaceId)
```

## Acceptance

- [ ] All four methods shipped, typed, tested
- [ ] Pagination helper for `listAgents` and `listEndpoints` (auto-iterate)
- [ ] Errors surface as typed `SlyApiError` instances
- [ ] SDK README updated; minimal usage example
- [ ] `pnpm publish:sdk` ready (version bumped)

## Technical notes

These four methods are the authoritative TypeScript surface for the discovery REST endpoints — the MCP server in Story 89.7 consumes them directly, so their Zod schemas double as MCP tool argument schemas. Cursor pagination is exposed as an auto-iterating helper for the list methods so callers can `for await` without managing cursors. All errors are normalized through `SlyApiError` so calling code has one error type to handle across the four methods.

## Dependencies

Stories 89.1–89.4
