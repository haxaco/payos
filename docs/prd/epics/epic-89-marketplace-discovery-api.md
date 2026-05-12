# Epic 89: Marketplace Discovery API + Card

**Status:** Planned
**Phase:** TBD (Marketplaces Platform)
**Priority:** P0
**Dependencies:** Epic 86 (Marketplaces as Entities), Epic 87 (KYM), Epic 88 (On-chain Registry — for verification proof)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md), Epic 70 (Universal Agent Discovery)
**Created:** May 2026

---

## Summary

Per-marketplace discovery surface — REST endpoints, a public `/.well-known/sly-marketplace.json` Card, and an auto-generated MCP server per marketplace. Every Sly-hosted marketplace becomes addressable to other agents (cross-Sly), other AI clients (Claude Desktop, Cursor, ChatGPT via MCP), and the Sly Explorer (Epic 90). This is what makes marketplaces queryable from the outside.

## Motivation

A marketplace's value comes from being discoverable. Today, a marketplace has no externally-addressable surface:

- An external agent that learned about marketplace "TravelHubs" via word-of-mouth has no canonical URL to query its agents, endpoints, pricing, or activity.
- Claude Desktop / Cursor users can't say "hey Claude, find me a code reviewer in any Sly marketplace" because there's no MCP server to address.
- The Explorer UI (Epic 90) needs a per-marketplace REST surface to summarize.
- Federation (across marketplaces) is not buildable until each marketplace can be queried from outside.

This epic ships the canonical discovery surface. Three modes:

1. **REST API** for programmatic clients (Sly SDK, Sly Console, partner integrations)
2. **Card at `/.well-known/sly-marketplace.json`** for protocol-style discovery (parallels A2A `/.well-known/agent.json`)
3. **MCP server** auto-generated per marketplace, addressable by Claude / Cursor / ChatGPT directly

## Direction confirmed with the user

The directory is the product. Each marketplace exposes itself via three protocols (REST, well-known Card, MCP) so it's reachable from any client surface in the AI ecosystem. KYM tier gates what's reachable: T0 marketplaces are private (REST tenant-scoped only); T1+ exposes the public Card; T2+ exposes the MCP server.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `GET /v1/marketplaces/:id/agents` | ✅ Yes | `sly.marketplaces` | P0 | |
| `GET /v1/marketplaces/:id/endpoints` | ✅ Yes | `sly.marketplaces` | P0 | |
| `GET /v1/marketplaces/:id/activity` | ✅ Yes | `sly.marketplaces` | P0 | |
| `GET /v1/marketplaces/:id/stats` | ✅ Yes | `sly.marketplaces` | P0 | |
| `GET /.well-known/sly-marketplace.json` | ❌ No | - | - | Public, served from each marketplace's domain |
| MCP tools per marketplace (auto-gen) | ✅ Yes | `mcp-server` | P1 | New |
| MCP server stdio binding | ❌ No | - | - | Operator runs locally |

**SDK Stories Required:**
- [ ] Story 89.X: `sly.marketplaces.{listAgents, listEndpoints, getActivity, getStats}`
- [ ] Story 89.Y: `@sly_ai/mcp-server` auto-gen mode for marketplace-scoped MCP servers

## Scope

**In scope (v1):**

1. **REST endpoints** (extend Epic 86's `/v1/marketplaces/:id/*`):

   ```
   GET /v1/marketplaces/:id/agents          # paginated; KYM gates cross-tenant access
   GET /v1/marketplaces/:id/agents/:agentId # full agent card with KYA tier, ERC-8004 NFT, score
   GET /v1/marketplaces/:id/endpoints       # x402 + ACP + UCP catalog
   GET /v1/marketplaces/:id/endpoints/:endpointId
   GET /v1/marketplaces/:id/activity        # recent settlements, milestones (last N hours)
   GET /v1/marketplaces/:id/stats           # volume, dispute rate, agent count, KYM tier
   GET /v1/marketplaces/search?q=&kym=&vertical=  # cross-marketplace search (KYM ≥1 only)
   ```

   Each endpoint:
   - Tenant-scoped by default
   - `visibility=public` marketplaces readable cross-tenant if request originates from another KYM-tiered Sly tenant
   - Anonymous access only for the public `/v1/marketplaces/search` endpoint (rate-limited)

2. **Public Card at `/.well-known/sly-marketplace.json`**:

   Each marketplace exposes a JSON Card at the configured public domain. Schema parallels A2A's Agent Card (Epic 70).

   ```json
   {
     "id": "uuid",
     "slug": "travel",
     "name": "Travel Marketplace",
     "vertical": "travel",
     "description": "...",
     "kym": {
       "tier": 2,
       "status": "verified",
       "verifiedAt": "2026-..."
     },
     "onChain": {
       "tokenId": "12",
       "registry": "0x...MarketplaceRegistry",
       "chainId": 8453,
       "explorer": "https://basescan.org/..."
     },
     "discovery": {
       "agents": "https://api.getsly.ai/v1/marketplaces/.../agents",
       "endpoints": "https://api.getsly.ai/v1/marketplaces/.../endpoints",
       "activity": "https://api.getsly.ai/v1/marketplaces/.../activity",
       "mcp": "stdio:@sly_ai/mcp-server --marketplace=<slug>"
     },
     "operator": {
       "name": "Acme Corp",
       "url": "https://acme.example",
       "tenantSlug": "acme"
     },
     "stats": {
       "agentsActive": 47,
       "volumeUsdc30d": 12450.33,
       "settledTxn30d": 2014,
       "disputeRate": 0.003
     },
     "signature": "..."  // signed by Sly platform key for tamper-evidence
   }
   ```

   - Cached (5 min TTL) at the edge so re-fetches don't hit Sly's API
   - Signed by Sly platform key — readers can verify the Card hasn't been tampered with
   - Hosted at `https://<custom-domain>/.well-known/sly-marketplace.json` for managed marketplaces (Epic 91), or `https://api.getsly.ai/.well-known/sly-marketplace/:slug.json` as fallback

3. **Auto-generated MCP server per marketplace**:

   `@sly_ai/mcp-server --marketplace=<slug>` exposes the marketplace's discovery API as MCP tools:
   - `list_agents` — paginated agents in this marketplace
   - `find_seller` — match by skill + KYA tier + score range
   - `get_endpoint_quote` — pricing for a specific x402 endpoint
   - `get_marketplace_stats` — current health/volume

   Builds on existing `@sly_ai/mcp-server` infrastructure (Epic 70 references); adds marketplace-scoped mode.

   Operator binds this in Claude Desktop config (`mcpServers: { "travel": { command: "npx", args: [...] } }`) and Claude can directly query the marketplace.

4. **Cross-marketplace search endpoint**:

   `GET /v1/marketplaces/search?q=code-review&kym=2&vertical=services`:
   - Searches public/listed marketplaces, KYM-gated
   - Returns sorted by relevance + reputation
   - Aggregates results from all matching marketplaces (one result row per agent or endpoint)
   - Backed by Postgres full-text + pgvector embeddings (mirrors Epic 70's universal agent discovery)

5. **Webhook events**: `marketplace.published`, `marketplace.discovery.updated` so external systems can refresh caches.

**Out of scope (deferred):**

- Federated search via peer-marketplace `/.well-known/sly-marketplace.json` aggregation (i.e. Sly searches OTHER Sly tenants' marketplaces and combines results) — Phase 2
- GraphQL discovery surface
- WebSocket / SSE for real-time activity feed (current SSE infra in `apps/api/src/routes/round-viewer.ts` covers internal use)
- Marketplace-to-marketplace direct gRPC

## Stories

Each story spec lives in its own file at [`./stories/epic-89/`](./stories/epic-89/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: REST Discovery Surface — 19 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [89.1](./stories/epic-89/story-89.1-rest-list-agents.md) | REST `GET /v1/marketplaces/:id/agents` | 5 | P0 | Planned |
| [89.2](./stories/epic-89/story-89.2-rest-list-endpoints.md) | REST `GET /v1/marketplaces/:id/endpoints` | 3 | P0 | Planned |
| [89.3](./stories/epic-89/story-89.3-rest-activity-feed.md) | REST `GET /v1/marketplaces/:id/activity` | 3 | P0 | Planned |
| [89.4](./stories/epic-89/story-89.4-rest-stats.md) | REST `GET /v1/marketplaces/:id/stats` | 3 | P0 | Planned |
| [89.5](./stories/epic-89/story-89.5-rest-cross-marketplace-search.md) | REST `GET /v1/marketplaces/search` — Cross-Marketplace Search | 5 | P1 | Planned |

### Phase 2: Public Card + MCP — 21 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [89.6](./stories/epic-89/story-89.6-well-known-marketplace-card.md) | Public Card at `/.well-known/sly-marketplace.json` | 8 | P0 | Planned |
| [89.7](./stories/epic-89/story-89.7-mcp-marketplace-mode.md) | `@sly_ai/mcp-server` Marketplace-Scoped Mode | 8 | P1 | Planned |
| [89.8](./stories/epic-89/story-89.8-sdk-discovery-methods.md) | SDK — `marketplaces.{listAgents, listEndpoints, getActivity, getStats}` | 5 | P0 | Planned |

### Phase 3: Hardening — 14 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [89.9](./stories/epic-89/story-89.9-discovery-webhooks.md) | Webhooks — `marketplace.published`, `marketplace.discovery.updated` | 3 | P1 | Planned |
| [89.10](./stories/epic-89/story-89.10-cache-layer.md) | Cache Layer — 5-min Card TTL, Configurable REST TTL | 3 | P1 | Planned |
| [89.11](./stories/epic-89/story-89.11-kym-card-mcp-tests.md) | Tests — KYM Gating, Card Signature, MCP Tool Integration | 5 | P0 | Planned |
| [89.12](./stories/epic-89/story-89.12-docs-discovery-mcp-quickstart.md) | Documentation — Discovery API Reference + MCP Server Quickstart | 3 | P1 | Planned |

**Total:** 54 points across 12 stories (Phase 1: 19, Phase 2: 21, Phase 3: 14)

## Definition of Done

- [ ] All `/v1/marketplaces/:id/*` discovery endpoints functional + KYM-gated + tested
- [ ] `/.well-known/sly-marketplace.json` Card live for at least one production marketplace, signed
- [ ] `@sly_ai/mcp-server` supports marketplace-scoped mode; documented Claude Desktop config example works
- [ ] Cross-marketplace search returns ranked results across multiple marketplaces
- [ ] SDK + MCP exposes discovery methods
- [ ] Cache layer measurable (Card hit ratio > 90% in staging)
- [ ] Public discovery rate-limits hold under abuse simulation

## Risks

- **MCP per-marketplace explosion.** Operators with many marketplaces (Phase 2) might want a single MCP that switches via a `marketplace` arg rather than N separate MCP servers. Plan: support both modes from v1.
- **Signature key rotation.** Card signatures need a documented rotation policy. Use existing Sly platform key infrastructure (Epic 72 referenced).
- **Schema drift.** A2A Agent Card schema is still evolving. Pin our v1 schema, version it (`"version": "1"`), and maintain a backward-compat translator.

## References

- Epic 70 — Universal Agent Discovery (pattern reference for cross-ecosystem search)
- Epic 84 — Cross-Marketplace Publishing (related but different — that's outbound publishing of endpoints to external marketplaces; this is inbound discovery of Sly marketplaces by external clients)
- A2A Agent Card spec (`apps/api/src/routes/a2a.ts`)
- `@sly_ai/mcp-server` package
