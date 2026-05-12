# Story 94.1: Public Agent Profile Endpoint

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Epic 89 (discovery API); Epic 63 (composite score); Epic 93 (receipts_count)

---

```
GET /v1/agents/:id/public
```

Returns the minimum identity payload a badge needs: `name`, `kya_tier`, `composite_score`, `erc8004_nft` (`{contract, token_id, image_url}`), `marketplaces[]` (Epic 89 — list of registered marketplace IDs), `receipts_count`, `created_at`. No auth, edge-cached, rate-limited. 404 (not 403) when the agent is not publicly discoverable, to avoid leaking existence.

## Acceptance

- [ ] Endpoint returns the documented shape with all fields populated
- [ ] No auth path: anonymous reads work
- [ ] Edge cache TTL = 60s, varies on agent_id only
- [ ] Rate limit 60 req/min per IP per agent
- [ ] 404 when `agents.discovery_public = false` (no existence leak)
- [ ] Response shape typed as `PublicAgentProfile` in `@sly/types`

## Technical notes

Should be the cheapest endpoint in the API — denormalize aggregates (`receipts_count`, latest `composite_score`) into a materialized view or a fast cached field rather than computing per-request. Extends the Epic 89 discovery API shape; share the underlying view if possible.

## Dependencies

Epic 89 (discovery API); Epic 63 (composite score); Epic 93 (receipts_count).
