# Epic 70: Universal Agent Discovery — Tri-Ecosystem Access

**Status:** Backlog
**Phase:** 5.3 (Agent Economics)
**Priority:** P0
**Total Points:** 47
**Stories:** 13
**Dependencies:** Epic 57 (A2A Protocol), Epic 58 (Task Processor), Epic 36 (SDK & DX)
**Linear Project:** [Epic 70](https://linear.app/sly-ai/project/epic-70-universal-agent-discovery-f4c501652f70)
**Created:** March 16, 2026

## Overview

Sly hosts agents with A2A-compliant Agent Cards, skills, governance, and settlement. Three AI model ecosystems each need to discover and interact with Sly agents — but only one path works today. This epic closes the gap so Gemini, Claude, and ChatGPT can all search for and interact with agents through their native integration patterns.

## Executive Summary

**Problem:** The `queryAgents()` search logic in `gateway-handler.ts:195-284` is only accessible via A2A `message/send`. Claude's MCP server has 65 tools but no agent search. ChatGPT has no integration path at all.

**Solution:** Extract agent search into a shared service, expose it as a public REST endpoint, wire it into the MCP server as a `search_agents` tool, and publish an OpenAPI spec for ChatGPT GPTs/Connectors.

**Why now:** A2A protocol (Epic 57), task processor (Epic 58), and agent skills are all complete. Agent discovery is the bottleneck — agents exist and can transact, but only Gemini can find them.

**Current state:**
- **Gemini:** Native A2A — **already works** (platform card at `/.well-known/agent.json`, `find_agent`/`list_agents` skills)
- **Claude:** MCP server exists (`@sly/mcp-server`, 65 tools) but **lacks agent search** — `a2a_discover_agent` fetches ONE known agent's card, no way to search by skill/tag
- **ChatGPT:** **No integration path** — no public REST search API, no OpenAPI spec for GPTs/Connectors

**Per-agent cards already exist** (public, no auth):
- `GET /a2a/agents/:id/card` and `GET /a2a/:id/.well-known/agent.json`
- A2A endpoint at `POST /a2a/:id`
- Skills populated from `agent_skills` table with pricing

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|---|---|---|---|---|
| `searchAgents()` service | ❌ No | - | - | Internal service extraction |
| `GET /v1/registry/agents` | ✅ Yes | `sly.registry` | P1 | New module needed |
| `GET /v1/registry/agents/:id` | ✅ Yes | `sly.registry` | P1 | Add to new module |
| MCP `search_agents` tool | ❌ No | - | - | MCP server only |
| Capabilities update | ❌ No | - | - | Existing endpoint |
| OpenAPI spec | ❌ No | - | - | Static file |
| Registry browse page | ❌ No | - | - | UI only |

**SDK Stories Required:**
- [ ] Story 70.7: Add `registry` module to `@sly/sdk`

---

## Stories

### Phase 1: Agent Visibility + Public Registry REST API — 18 pts

| Story | Linear | Points | Priority | Labels | Status |
|-------|--------|--------|----------|--------|--------|
| 70.0: Agent Visibility Model (Public vs Private) | [SLY-476](https://linear.app/sly-ai/issue/SLY-476) | 5 | P0 | Engineering | Backlog |
| 70.1: Extract queryAgents into Agent Registry Service | [SLY-464](https://linear.app/sly-ai/issue/SLY-464) | 3 | P0 | Engineering | Backlog |
| 70.2: Public Agent Registry REST Endpoint | [SLY-465](https://linear.app/sly-ai/issue/SLY-465) | 5 | P0 | Engineering, API | Backlog |
| 70.3: Registry Types in @sly/types | [SLY-466](https://linear.app/sly-ai/issue/SLY-466) | 2 | P0 | Engineering, Types | Backlog |
| 70.4: Unit Tests for Registry | [SLY-467](https://linear.app/sly-ai/issue/SLY-467) | 3 | P0 | Engineering, Testing | Backlog |

#### Story Details

**70.0: Agent Visibility Model — Public vs Private (5 pts)**

Formalize agent visibility using the existing `discoverable` column (migration `20260220_agent_discoverable_flag.sql`, defaults to `true`). A **public** agent (`discoverable = true`) is visible cross-tenant in the registry, A2A discovery, and public card endpoints. A **private** agent (`discoverable = false`) is only visible to users/agents within the same tenant.

**Default: `true`** — all agents are public by default. A tenant must explicitly opt an agent into private mode.

Changes:
- `apps/api/src/routes/agents.ts` — add `discoverable` (boolean, optional, default `true`) to `createAgentSchema` and `updateAgentSchema`; include in insert/update data
- `apps/api/src/utils/helpers.ts` — add `discoverable` to `mapAgentFromDb` response
- `apps/api/src/routes/a2a.ts` — `fetchAgentCard()` (line 40-87): when called from public endpoints (no tenantId), return 404 if `agent.discoverable === false`
- `apps/api/src/routes/a2a.ts` — per-agent A2A JSON-RPC endpoint (`POST /a2a/:agentId`): if agent is `discoverable = false` and no same-tenant auth, return 404
- `apps/api/src/services/a2a/onboarding-handler.ts` — support `discoverable` in `register_agent` payload (default `true`)
- `apps/api/src/services/a2a/gateway-handler.ts` — already filters by `discoverable = true` (no change needed)
- Agent list endpoint (`GET /v1/agents`) — already tenant-scoped, returns ALL tenant agents (public + private). `discoverable` field now visible in response.

Key semantics:
- **Public** (`discoverable: true`): appears in registry, A2A discovery, public card endpoints — any external agent can find and interact with it
- **Private** (`discoverable: false`): only visible within the same tenant. Hidden from registry search and A2A discovery. Public card endpoint returns 404. A2A task endpoint requires same-tenant bearer token.

Key files:
- `apps/api/src/routes/agents.ts:103-124` — add `discoverable` to create/update schemas + insert/update data
- `apps/api/src/utils/helpers.ts` — add `discoverable` to `mapAgentFromDb`
- `apps/api/src/routes/a2a.ts:40-87` — guard public card fetch with discoverable check
- `apps/api/src/routes/a2a.ts` (per-agent POST) — guard A2A task endpoint for private agents
- `apps/api/src/services/a2a/onboarding-handler.ts` — support discoverable in register_agent

**70.1: Extract queryAgents into Agent Registry Service (3 pts)**

Refactor `queryAgents()` from `apps/api/src/services/a2a/gateway-handler.ts:195-284` into a new `apps/api/src/services/agent-registry.ts`. Export `searchAgents(supabase, baseUrl, query?, tags?, skill?, limit?, page?)` and `getRegistryAgent(supabase, agentId, baseUrl?)`. Also extract helpers `extractPermissionTags()` and `toRegistryAgent()`.

Update `gateway-handler.ts` to import from the new service. The A2A `find_agent`/`list_agents` skills should delegate to `searchAgents()` and map results back to the existing `AgentSummary` shape.

Add pagination support (limit/offset, max 100 per page).

Key files:
- `apps/api/src/services/agent-registry.ts` — NEW
- `apps/api/src/services/a2a/gateway-handler.ts` — import from new service, remove inlined logic

**70.2: Public Agent Registry REST Endpoint (5 pts)**

Create `apps/api/src/routes/registry.ts` with two endpoints:

- `GET /v1/registry/agents?q=payments&tags=treasury&skill=make_payment&limit=20&page=1` — search with filters
- `GET /v1/registry/agents/:id` — single agent with full details + card URL

Mount as **public route** in `apps/api/src/app.ts` (public routes section, around line 253). No auth required (same reasoning as public A2A agent cards — discoverable agents are meant to be found). Rate limited (100/min per IP, reuse existing `rateLimiter()`).

Returns: agent summary, skills with pricing, `cardUrl`, `a2aEndpoint`, `kyaTier`, tags.

Query params:
- `q` — free-text search across name, description, skills, tags
- `tags` — comma-separated tag filter (OR match)
- `skill` — exact skill ID filter
- `limit` — max results (default 20, max 100)
- `page` — page number (1-based, default 1)

Response shape:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Treasury Agent",
      "description": "Manages wallets and balances",
      "kyaTier": 2,
      "skills": [
        {
          "id": "manage_wallet",
          "name": "Manage Wallet",
          "tags": ["treasury", "wallets"],
          "pricing": { "amount": "0.05", "currency": "USD", "model": "per_call" }
        }
      ],
      "tags": ["treasury", "wallets"],
      "cardUrl": "https://api.getsly.ai/a2a/<id>/.well-known/agent.json",
      "a2aEndpoint": "https://api.getsly.ai/a2a/<id>"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

Key files:
- `apps/api/src/routes/registry.ts` — NEW
- `apps/api/src/app.ts` — mount registry route in public section

**70.3: Registry Types in @sly/types (2 pts)**

Create `packages/types/src/registry.ts` with:
- `RegistryAgent` — agent summary with skills, tags, URLs, KYA tier
- `RegistrySkill` — skill with pricing info
- `RegistrySearchParams` — query/tags/skill/limit/page
- `RegistrySearchResponse` — data array + pagination

Re-export from `packages/types/src/index.ts`.

Key files:
- `packages/types/src/registry.ts` — NEW
- `packages/types/src/index.ts` — add re-export

**70.4: Unit Tests for Registry (3 pts)**

Write tests for the service, routes, and visibility model:

`apps/api/tests/unit/agent-registry-service.test.ts`:
- Text search (matches name, description, skill name, skill tags)
- Tag filter (OR match, case insensitive)
- Skill filter (exact skill ID match)
- Pagination (limit/offset, page bounds)
- Empty results
- Combination filters (query + tags + skill)
- Permission-based tag inference when no registered skills
- **Private agents (`discoverable = false`) excluded from registry results**

`apps/api/tests/unit/registry-routes.test.ts`:
- GET /v1/registry/agents returns paginated results
- Query params (q, tags, skill, limit, page) forwarded correctly
- GET /v1/registry/agents/:id returns single agent
- 404 for non-existent agent ID
- **404 for private agent ID (`discoverable = false`)**
- Rate limiting applied
- **Public agent card fetch works (200), private agent card fetch returns 404 (no auth)**

Key files:
- `apps/api/tests/unit/agent-registry-service.test.ts` — NEW
- `apps/api/tests/unit/registry-routes.test.ts` — NEW

### Phase 2: MCP + Function-Calling Update — 9 pts

| Story | Linear | Points | Priority | Labels | Status |
|-------|--------|--------|----------|--------|--------|
| 70.5: MCP Server search_agents Tool | [SLY-468](https://linear.app/sly-ai/issue/SLY-468) | 3 | P0 | Engineering, MCP | Backlog |
| 70.6: Update Capabilities Endpoint with Discovery Tools | [SLY-469](https://linear.app/sly-ai/issue/SLY-469) | 3 | P1 | Engineering, API | Backlog |
| 70.7: SDK Registry Client | [SLY-470](https://linear.app/sly-ai/issue/SLY-470) | 3 | P1 | Engineering, SDK | Backlog |

#### Story Details

**70.5: MCP Server search_agents Tool (3 pts)**

Add `search_agents` tool to `packages/mcp-server/src/index.ts`.

Tool definition (add to tools array, after `a2a_discover_agent`):
```typescript
{
  name: 'search_agents',
  description: 'Search the Sly agent registry by keyword, tags, or skill. Returns discoverable agents with their skills, pricing, and A2A endpoints. Use this to find agents before sending them tasks via a2a_send_task.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Free-text search (name, description, skills, tags)' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (OR match)' },
      skill: { type: 'string', description: 'Filter by exact skill ID (e.g. "make_payment")' },
      limit: { type: 'number', description: 'Max results per page (default 20, max 100)' },
    },
  },
}
```

Handler: build query string from params, call `GET /v1/registry/agents` via `sly.request()`, return JSON result.

This closes the Claude gap — users can now discover agents before sending tasks.

Key files:
- `packages/mcp-server/src/index.ts` — add tool definition + handler

**70.6: Update Capabilities Endpoint with Discovery Tools (3 pts)**

Add three discovery capabilities to `apps/api/src/routes/capabilities.ts` in the function-calling endpoint (after existing capabilities, ~line 475):

- `sly_search_agents` — search the agent registry by keyword/tags/skill
- `sly_get_agent_details` — get full agent details by ID
- `sly_get_agent_card` — fetch an agent's A2A card by URL

Include in both `?format=openai` and `?format=anthropic` output formats.

Key files:
- `apps/api/src/routes/capabilities.ts` — add 3 capabilities

**70.7: SDK Registry Client (3 pts)**

Create `packages/sdk/src/registry.ts` with `RegistryClient` class following existing SDK patterns (receives `SlyClient` via constructor, uses `this.client.request<T>()` for API calls).

Methods:
- `search(params: RegistrySearchParams): Promise<RegistrySearchResponse>` — calls `GET /v1/registry/agents`
- `getAgent(agentId: string): Promise<RegistryAgent>` — calls `GET /v1/registry/agents/:id`

Add `public readonly registry: RegistryClient` to `Sly` class in `packages/sdk/src/index.ts`.

Key files:
- `packages/sdk/src/registry.ts` — NEW
- `packages/sdk/src/index.ts` — add `registry` property

### Phase 3: OpenAPI Spec — 7 pts

| Story | Linear | Points | Priority | Labels | Status |
|-------|--------|--------|----------|--------|--------|
| 70.8: OpenAPI 3.1 Spec | [SLY-471](https://linear.app/sly-ai/issue/SLY-471) | 5 | P1 | Engineering, Docs | Backlog |
| 70.9: Serve OpenAPI at /openapi.json | [SLY-472](https://linear.app/sly-ai/issue/SLY-472) | 2 | P1 | Engineering | Backlog |

#### Story Details

**70.8: OpenAPI 3.1 Spec (5 pts)**

Create `apps/api/public/openapi.json` — a curated, static OpenAPI 3.1 spec covering the most useful endpoints for ChatGPT GPTs/Connectors and other consumers. Not auto-generated (Hono doesn't use `@hono/zod-openapi`, auto-gen from 90+ routes is impractical).

Cover:
- **Registry:** `GET /v1/registry/agents`, `GET /v1/registry/agents/{id}`
- **Settlement:** `POST /v1/settlements/quote`, `POST /v1/settlements`, `GET /v1/settlements/{id}`
- **Transfers:** `POST /v1/transfers`, `GET /v1/transfers/{id}`
- **Accounts:** `GET /v1/accounts`, `GET /v1/accounts/{id}`
- **Agents:** `GET /v1/agents`, `GET /v1/agents/{id}`

Auth schemes:
- `ApiKeyAuth` — `Authorization: Bearer pk_test_*` or `pk_live_*`
- `AgentTokenAuth` — `Authorization: Bearer agent_*`

Follow existing pattern at `apps/api/public/ucp/openapi.json`.

Key files:
- `apps/api/public/openapi.json` — NEW

**70.9: Serve OpenAPI at /openapi.json (2 pts)**

Add public routes in `apps/api/src/app.ts`:
- `GET /openapi.json` — serves the static OpenAPI spec file
- `GET /docs` — serves Swagger UI loaded from CDN (`swagger-ui-dist` or `unpkg`)

Mount in the public routes section (no auth required).

Key files:
- `apps/api/src/app.ts` — add /openapi.json and /docs routes

### Phase 4: Discovery Dashboard — 5 pts

| Story | Linear | Points | Priority | Labels | Status |
|-------|--------|--------|----------|--------|--------|
| 70.10: Agent Registry Browse Page | [SLY-473](https://linear.app/sly-ai/issue/SLY-473) | 5 | P2 | Engineering, UI | Backlog |

#### Story Details

**70.10: Agent Registry Browse Page (5 pts)**

Create a public registry browse page in the Next.js app:

`apps/web/src/app/registry/page.tsx` — public page (no auth required):
- Search bar with debounced text input
- Tag filter chips (clickable, derived from results)
- Agent cards in a responsive grid showing: name, description, skills with pricing, KYA tier badge, tags
- Pagination controls

`apps/web/src/app/registry/[agentId]/page.tsx` — agent detail page:
- Full agent info with all skills and pricing
- A2A Card URL (linkable)
- A2A Endpoint URL
- "Send Task" link (for authenticated users, links to dashboard)

Data fetching: direct `fetch()` to `GET /v1/registry/agents` (public endpoint, no auth needed). Follow existing patterns from `apps/web/src/app/dashboard/agents/page.tsx` for component structure and styling.

Key files:
- `apps/web/src/app/registry/page.tsx` — NEW
- `apps/web/src/app/registry/[agentId]/page.tsx` — NEW

### Phase 5: Integration Testing + Docs — 8 pts

| Story | Linear | Points | Priority | Labels | Status |
|-------|--------|--------|----------|--------|--------|
| 70.11: End-to-End Integration Tests | [SLY-474](https://linear.app/sly-ai/issue/SLY-474) | 5 | P1 | Engineering, Testing | Backlog |
| 70.12: Integration Guides | [SLY-475](https://linear.app/sly-ai/issue/SLY-475) | 3 | P2 | Docs | Backlog |

#### Story Details

**70.11: End-to-End Integration Tests (5 pts)**

`apps/api/tests/integration/registry.test.ts`:
- Verify REST endpoint returns correct results for text search, tag filter, skill filter
- Verify MCP tool returns consistent results with REST endpoint for same query
- Verify A2A `find_agent` returns consistent results with REST endpoint
- Verify card URLs in registry responses are fetchable and return valid A2A Agent Cards
- Verify OpenAPI spec is valid (parse with a JSON Schema validator)
- Verify pagination across all paths

Key files:
- `apps/api/tests/integration/registry.test.ts` — NEW

**70.12: Integration Guides (3 pts)**

Three guides for connecting each ecosystem:

- `docs/guides/integration/gemini-a2a.md` — register Sly in Gemini Enterprise Agent Hub, configure Agent Card URL, example find_agent + send_task flow
- `docs/guides/integration/claude-mcp.md` — configure MCP server, search_agents → a2a_send_task workflow, Claude Desktop config example
- `docs/guides/integration/chatgpt-gpts.md` — create GPT with OpenAPI spec, configure API key auth, example search → function calling flow

Key files:
- `docs/guides/integration/gemini-a2a.md` — NEW
- `docs/guides/integration/claude-mcp.md` — NEW
- `docs/guides/integration/chatgpt-gpts.md` — NEW

---

## Dependencies

```
70.0 (visibility) ──→ 70.1 (service) ──→ 70.2 (REST endpoint) ──→ 70.5 (MCP tool)
70.3 (types) ───────↗                                          ──→ 70.6 (capabilities)
                                                                ──→ 70.7 (SDK client)
                                                                ──→ 70.8 (OpenAPI spec) ──→ 70.9 (serve)
                                                                ──→ 70.10 (dashboard)

70.0 + 70.1 + 70.2 ──→ 70.4 (unit tests)
70.2 + 70.5 + 70.6 ──→ 70.11 (integration tests)
All stories ──→ 70.12 (docs)
```

### Critical Path

`70.0 → 70.1 → 70.2 → 70.5 → 70.11`

### Parallel Tracks

- **Foundation track:** 70.0 (visibility) + 70.3 (types) in parallel, then 70.1 (service)
- **REST track:** 70.2 (endpoint) → 70.10 (UI)
- **Tests track:** 70.4 (after 70.0 + 70.1 + 70.2)
- **MCP track:** 70.5 (after 70.2)
- **SDK track:** 70.6 (capabilities) + 70.7 (SDK client) — both after 70.2
- **OpenAPI track:** 70.8 → 70.9 (after 70.2)
- **Validation track:** 70.11 (after MCP + REST), 70.12 (after all)

---

## Subsumes Backlog Items

- **SLY-249 (Epic 20.3):** Agent Registry API — replaced by 70.1 + 70.2
- **SLY-252 (Epic 20.4):** Agent Discovery Dashboard — replaced by 70.10

---

## Key Files

| File | Change |
|---|---|
| `apps/api/src/routes/agents.ts:103-124` | Add `discoverable` to create/update schemas (70.0) |
| `apps/api/src/utils/helpers.ts` | Add `discoverable` to `mapAgentFromDb` (70.0) |
| `apps/api/src/routes/a2a.ts:40-87` | Guard public card fetch with discoverable check (70.0) |
| `apps/api/src/routes/a2a.ts` (per-agent POST) | Guard A2A task endpoint for private agents (70.0) |
| `apps/api/src/services/a2a/onboarding-handler.ts` | Support discoverable in register_agent (70.0) |
| `apps/api/src/services/a2a/gateway-handler.ts:195-284` | Extract `queryAgents()` out (70.1) |
| `apps/api/src/services/agent-registry.ts` | NEW — shared search service (70.1) |
| `apps/api/src/routes/registry.ts` | NEW — public REST endpoint (70.2) |
| `apps/api/src/app.ts:253` | Mount registry route (public section) (70.2) |
| `packages/types/src/registry.ts` | NEW — registry types (70.3) |
| `packages/mcp-server/src/index.ts` | Add `search_agents` tool (70.5) |
| `apps/api/src/routes/capabilities.ts` | Add discovery functions (70.6) |
| `packages/sdk/src/registry.ts` | NEW — SDK registry client (70.7) |
| `packages/sdk/src/index.ts` | Add `registry` property to Sly class (70.7) |
| `apps/api/public/openapi.json` | NEW — curated OpenAPI spec (70.8) |
| `apps/web/src/app/registry/page.tsx` | NEW — browse page (70.10) |
| `apps/web/src/app/registry/[agentId]/page.tsx` | NEW — detail page (70.10) |

---

## Security

- Registry endpoints are **public** (no auth) — same policy as A2A Agent Cards. Only agents with `discoverable = true` and `status = 'active'` are returned.
- No tenant-scoped data exposed — registry shows cross-tenant discoverable agents (same as A2A gateway behavior).
- Rate limited at 100 req/min per IP to prevent abuse.
- OpenAPI spec only documents endpoints — auth is still required for all non-registry endpoints.
- No PII in registry responses (no email, no internal account IDs).

## Design Decisions

1. **Public endpoint, no auth** — Discoverable agents are meant to be found. Requiring auth would defeat the purpose and block ChatGPT GPTs which need public endpoints.
2. **Shared service, not duplicated logic** — A single `searchAgents()` function powers A2A, REST, and MCP paths. Consistency guaranteed.
3. **Static OpenAPI spec** — Hono doesn't use `@hono/zod-openapi`, and auto-generating from 90+ routes is impractical. A curated spec covering the most useful endpoints is more maintainable and better for GPT integrations.
4. **Skill-level pricing in results** — Including pricing in search results lets callers compare costs before selecting an agent. Critical for agent marketplaces.
5. **Cross-tenant registry** — Registry uses service-role Supabase client (bypasses RLS) to show agents from all tenants, filtered by `discoverable = true`. This matches A2A gateway behavior.

## Verification

1. **Visibility:** Create a private agent (`discoverable: false`), verify it does NOT appear in registry or A2A discovery, but IS visible in tenant's `GET /v1/agents` list
2. **Card guard:** Verify `/a2a/agents/:id/card` returns 404 for private agents (without auth), 200 for public agents
3. **Gemini path:** `POST /a2a` with `find_agent` → returns only public agents
4. **Claude path:** MCP `search_agents` tool → returns agents via REST → `a2a_send_task` to interact
5. **ChatGPT path:** `GET /v1/registry/agents?q=...` → returns agents → function calling for tasks
6. **Consistency:** All three paths return same agents for same query
7. **Card resolution:** Every `cardUrl` in registry response is fetchable and returns valid A2A card
8. Run `pnpm test` after changes
