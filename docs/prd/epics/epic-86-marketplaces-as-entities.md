# Epic 86: Marketplaces as First-Class Entities

**Status:** Planned
**Phase:** TBD (Marketplaces Platform)
**Priority:** P0
**Dependencies:** Epic 73 (KYC/KYA Tiers), Epic 84 (Cross-Marketplace Publishing — adjacent)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md)
**Created:** May 2026

---

## Summary

Make `marketplace` a first-class platform entity in Sly — a `marketplaces` table with ownership, branding, vertical, slug, and lifecycle — so the rest of the marketplaces platform (KYM, on-chain registry, discovery API, Explorer UI) has a stable structural foundation to build on. Tag agents and x402 endpoints with the marketplace(s) they participate in. Make this visible in the agentbazaar runtime so the "same agent active in multiple marketplaces" story has visible proof.

## Motivation

Today every Sly-hosted agent and x402 endpoint is scoped to a tenant. There is no concept of a *marketplace* — the agentbazaar runtime treats the entire tenant as a single global marketplace. That worked when the marketplace was just a demo, but it blocks every part of the platform-level work in `MARKETPLACES_STRATEGY.md`:

- KYM (Epic 87) needs a row to put a tier on
- The on-chain registry (Epic 88) needs an entity to mint an NFT for
- The discovery API (Epic 89) needs an `:id` to scope queries to
- The Explorer UI (Epic 90) needs a directory to list
- The managed runtime (Epic 91) needs a deployable unit

This epic lands the structural primitive. Subsequent epics extend it; nothing else can ship without it.

## Direction confirmed with the user

Drop the federation framing as the wedge. Lead with portable agentic identity, then the marketplace-as-entity primitive falls into place naturally as the surface where identity is observable. Each marketplace = one tenant context with full protocol mix (A2A + ACP + UCP + x402 + concierge), not stripped down to one protocol per vertical. Most agents live in one marketplace; ~30% span multiple. That's the visible proof of identity portability.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/marketplaces` | ✅ Yes | `sly.marketplaces` | P0 | New module |
| `GET /v1/marketplaces/:id` | ✅ Yes | `sly.marketplaces` | P0 | |
| `PATCH /v1/marketplaces/:id` | ✅ Yes | `sly.marketplaces` | P0 | Update branding/visibility |
| `GET /v1/marketplaces` (list, tenant-scoped) | ✅ Yes | `sly.marketplaces` | P0 | |
| `marketplaces[]` field on agent records | ✅ Types | Types only | P0 | Existing `sly.agents` |
| `marketplaceId` field on x402 endpoint records | ✅ Types | Types only | P0 | Existing `sly.x402` |
| MCP tools (`sly_marketplace_*`) | ✅ Yes | `mcp-server` | P1 | Phase 2 |

**SDK Stories Required:**
- [ ] Story 86.X: Add `marketplaces` module to `@sly_ai/sdk`
- [ ] Story 86.Y: Update `@sly_ai/mcp-server` with `sly_marketplace_create / get / list / update` tools

## Scope

**In scope (v1):**

1. **`marketplaces` table** with the canonical columns:

   ```sql
   CREATE TABLE marketplaces (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     slug TEXT NOT NULL,                   -- url-safe, unique within tenant
     name TEXT NOT NULL,                   -- display name
     vertical TEXT,                        -- 'services' | 'travel' | 'compute' | ...
     description TEXT,
     branding JSONB DEFAULT '{}',          -- logo_url, accent_color, custom_domain
     visibility TEXT NOT NULL DEFAULT 'private', -- 'public' | 'unlisted' | 'private'
     status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'archived'
     environment TEXT NOT NULL,             -- 'test' | 'live'
     metadata JSONB DEFAULT '{}',
     created_by UUID REFERENCES user_profiles(id),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE(tenant_id, slug, environment)
   );
   ```

   - RLS: tenants can read/write their own rows; `visibility='public'` rows readable cross-tenant
   - Slug must be `[a-z0-9-]+`, unique within tenant + environment

2. **Agent ↔ marketplace many-to-many.** Agents can be in multiple marketplaces.

   ```sql
   CREATE TABLE agent_marketplaces (
     agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
     marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
     joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'suspended'
     PRIMARY KEY (agent_id, marketplace_id)
   );
   ```

3. **x402 endpoint scoping.** Add `marketplace_id UUID` column to `x402_endpoints` (nullable for backwards-compat; existing endpoints stay unscoped at first).

4. **A2A task tagging.** Extend task `metadata` schema to optionally include `buyer_marketplace_id`, `seller_marketplace_id`, `cross_marketplace: bool`. No new column; uses existing JSONB metadata.

5. **REST endpoints** under `apps/api/src/routes/marketplaces.ts`:
   - `POST /v1/marketplaces` — create marketplace (tenant-scoped)
   - `GET /v1/marketplaces` — list marketplaces (filter by tenant by default; `?visibility=public` lists public ones cross-tenant)
   - `GET /v1/marketplaces/:id` — get marketplace
   - `PATCH /v1/marketplaces/:id` — update (branding, description, visibility)
   - `POST /v1/marketplaces/:id/agents` — add agent membership
   - `DELETE /v1/marketplaces/:id/agents/:agentId` — remove agent membership
   - `GET /v1/marketplaces/:id/agents` — list agents in marketplace

6. **Sly Console UI**: a "Marketplaces" tab in `apps/web` listing the tenant's marketplaces, with create/edit dialogs. Read-only for non-owners (members can view, owners can edit).

7. **agentbazaar runtime read-side support**:
   - Read `marketplaces[]` from `tokens.json` per agent
   - Render the viewer with `?mkt=<slug>` query param filter
   - Header bar shows marketplace name + branding accent
   - Default `/viewer` (no param) keeps current behavior — all marketplaces visible

8. **Backfill script.** Existing tenants get a default marketplace named after the tenant; existing agents are added to it. One-time migration. Idempotent.

**Out of scope (deferred to later epics):**

- KYM tier on marketplaces (Epic 87)
- On-chain MarketplaceRegistry NFT mint (Epic 88)
- Public discovery REST + `/.well-known/sly-marketplace.json` Card (Epic 89)
- Cross-marketplace Explorer UI (Epic 90)
- Managed runtime auto-provisioning + custom domains (Epic 91)
- Cross-marketplace federation scenarios (orthogonal — agentbazaar work, not platform)
- Marketplace governance / moderation tooling

## Stories

Each story spec lives in its own file at [`./stories/epic-86/`](./stories/epic-86/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: Schema Foundation — 8 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [86.1](./stories/epic-86/story-86.1-marketplaces-tables.md) | Migration — `marketplaces` + `agent_marketplaces` Tables | 5 | P0 | Planned |
| [86.2](./stories/epic-86/story-86.2-x402-marketplace-id-column.md) | Migration — `marketplace_id` Column on `x402_endpoints` | 3 | P0 | Planned |

### Phase 2: API + SDK Surface — 16 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [86.3](./stories/epic-86/story-86.3-marketplaces-rest-routes.md) | REST Routes — `/v1/marketplaces/*` | 8 | P0 | Planned |
| [86.4](./stories/epic-86/story-86.4-sdk-marketplaces-module.md) | SDK Module — `@sly_ai/sdk` `marketplaces` | 5 | P0 | Planned |
| [86.5](./stories/epic-86/story-86.5-mcp-marketplace-tools.md) | MCP Server — `sly_marketplace_*` Tools | 3 | P1 | Planned |

### Phase 3: Console + Viewer Integration — 18 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [86.6](./stories/epic-86/story-86.6-console-marketplaces-tab.md) | Sly Console — Marketplaces Tab | 8 | P1 | Planned |
| [86.7](./stories/epic-86/story-86.7-viewer-mkt-filter.md) | Agentbazaar Viewer — `?mkt=` Filter + Branded Header | 5 | P1 | Planned |
| [86.8](./stories/epic-86/story-86.8-runtime-marketplaces-tokens.md) | Agentbazaar Runtime — `marketplaces[]` from `tokens.json` | 5 | P1 | Planned |

### Phase 4: Migration + Quality Gates — 8 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [86.9](./stories/epic-86/story-86.9-default-marketplace-backfill.md) | Backfill Migration — Default Marketplace per Tenant | 3 | P0 | Planned |
| [86.10](./stories/epic-86/story-86.10-rls-multi-marketplace-tests.md) | Tests — RLS Isolation, Multi-Marketplace Visibility, Slug Uniqueness | 5 | P0 | Planned |

**Total:** 50 points across 10 stories.

## Definition of Done

- [ ] `marketplaces` + `agent_marketplaces` tables shipped with RLS policies and migration tested
- [ ] CRUD REST endpoints functional + integration-tested
- [ ] SDK module published; MCP tools exposed
- [ ] Sly Console "Marketplaces" tab functional for tenant owners
- [ ] agentbazaar viewer's `?mkt=` filter works end-to-end against a multi-marketplace tokens.json
- [ ] Same agent observably appears in multiple `?mkt=` viewers (proof of identity portability)
- [ ] Backfill migration safe to run on production tenants without breaking existing single-marketplace behavior
- [ ] All existing scenarios (`a2a_x402_marketplace`, etc.) work unchanged when no marketplace tagging is present
- [ ] Documentation updated: `MARKETPLACES_STRATEGY.md`, SDK README, ONBOARDING

## Risks

- **Backfill on production tenants.** Need careful staging — running the default-marketplace insert on a tenant with hundreds of agents could lock tables. Use chunked migration.
- **Slug collisions** across tenants when we eventually expose subdomain-based viewer URLs (Epic 91). Plan: subdomain is `<tenant-slug>-<marketplace-slug>` until we add cross-tenant slug uniqueness.
- **RLS complexity** when `visibility='public'` allows cross-tenant reads. Test RLS for read-only public access without leaking private tenant data.

## References

- `MARKETPLACES_STRATEGY.md` — vision + phased build
- Epic 73 — pattern for tier-tables and effective-limit checks (KYM will mirror)
- Epic 84 — adjacent work on cross-marketplace publishing of x402 endpoints
- agentbazaar repo — `apps/sim/src/server.ts:handleAgentsMeta` (current ad-hoc agent metadata)
