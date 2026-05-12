# Epic 94: Identity Badge SDK

**Status:** Planned
**Phase:** TBD (Identity-First Demos)
**Priority:** P1
**Dependencies:** Epic 63 (Reputation), Epic 73 (KYA), Epic 89 (Discovery API)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md)
**Created:** May 2026

---

## Summary

Drop-in SDK for any host app (chat platforms, dashboards, B2B portals, MCP tools) to render Sly agent identity inline. One npm install + one component, and any app shows the agent's KYA tier, ERC-8004 NFT, composite score, and verification badges. Identity becomes a portable visual primitive across the AI ecosystem.

## Motivation

Sly identity is real — KYA tier, ERC-8004 NFT, composite score, reputation receipts — but today it's only visible inside Sly's own surfaces (Sly Console, agentbazaar viewer). The story of "identity is portable" is incomplete until that identity is renderable in *other* apps.

Three target host environments:

1. **A2A clients** — when an agent presents itself to another agent via A2A, the receiving agent should see the badge inline
2. **Chat / messaging surfaces** — Slack bots, Discord bots, Claude Desktop, ChatGPT plugins where AI agents post on behalf of users
3. **B2B portals** — vendor management dashboards, procurement tools, CRM where AI agents act as buyers/sellers

This is the "identity travels across apps, not across marketplaces" pitch from the strategy thread.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority |
|---|---|---|---|
| New package `@sly_ai/identity-badge` | ✅ Yes | New | P0 |
| React component | ✅ Yes | `@sly_ai/identity-badge/react` | P0 |
| Vanilla JS web component | ✅ Yes | `@sly_ai/identity-badge` | P1 |
| Server-side rendered HTML snippet | ✅ Yes | `@sly_ai/identity-badge/ssr` | P2 |
| Public agent profile API | ✅ Yes | `sly.agents` (extends Epic 89) | P1 |

## Scope

**In scope (v1):**

1. **`@sly_ai/identity-badge` package** — three exports:
   - `<SlyBadge agentId={...} />` (React component)
   - `<sly-badge agent-id="..."></sly-badge>` (web component)
   - `renderBadge({ agentId })` (SSR-friendly HTML string)

2. **Visual variants**:
   - `compact` — name + KYA tier + score (one-liner, fits in chat)
   - `full` — adds ERC-8004 NFT thumbnail, on-chain link, receipt count
   - `card` — full agent card for agent-card-style discovery surfaces

3. **Public agent profile API** (extends Epic 89's per-marketplace agents endpoint):

   ```
   GET /v1/agents/:agentId/public  # KYA tier, score, NFT, marketplaces[], receipts count
   ```

   - No auth (rate-limited)
   - Cached at the edge

4. **Theming**:
   - Light / dark / auto
   - Compact for messaging contexts
   - Customizable accent color

5. **Demos**:
   - Slack bot example: bot posts a message that includes a Sly badge for the agent
   - MCP server example: MCP tool returns a badge URL for `inline_image` rendering
   - Plain HTML demo page that drops the badge into a static site

6. **Tracking**:
   - Each badge render hits a beacon endpoint so Sly can measure "where is identity rendered" — useful for the directory's network-effect argument

**Out of scope:**

- Native iOS / Android components
- Customizable per-tenant badge designs (single Sly-branded design v1)
- White-label / co-branded badges
- Embeddable Web3 wallet connect for "claim your agent" flows

## Stories

Each story spec lives in its own file at [`./stories/epic-94/`](./stories/epic-94/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: Data Surface — 3 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [94.1](./stories/epic-94/story-94.1-public-profile-endpoint.md) | Public Agent Profile Endpoint | 3 | P0 | Planned |

### Phase 2: Badge Package — 22 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [94.2](./stories/epic-94/story-94.2-package-scaffold.md) | `@sly_ai/identity-badge` Package Scaffold | 5 | P0 | Planned |
| [94.3](./stories/epic-94/story-94.3-react-component-variants.md) | React Component — Compact, Full, Card Variants | 5 | P0 | Planned |
| [94.4](./stories/epic-94/story-94.4-web-component-variant.md) | Web Component Variant | 3 | P1 | Planned |
| [94.5](./stories/epic-94/story-94.5-ssr-html-render.md) | SSR HTML String Render | 3 | P1 | Planned |
| [94.6](./stories/epic-94/story-94.6-theming-light-dark-accent.md) | Theming — Light / Dark / Auto / Accent | 3 | P1 | Planned |
| [94.7](./stories/epic-94/story-94.7-slack-mcp-demos.md) | Slack Bot + MCP Demo Integrations | 5 | P0 | Planned |

### Phase 3: Analytics, Tests, Docs — 9 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [94.8](./stories/epic-94/story-94.8-render-beacon-analytics.md) | Render-Beacon Endpoint + Analytics | 3 | P2 | Planned |
| [94.9](./stories/epic-94/story-94.9-tests-rendering-a11y-beacon.md) | Tests — Rendering, Accessibility, Beacon | 3 | P0 | Planned |
| [94.10](./stories/epic-94/story-94.10-docs-integration-guide.md) | Documentation — Integration Guide, API Ref, Examples | 3 | P0 | Planned |

**Total:** ~36 points across 10 stories.

## Definition of Done

- [ ] `@sly_ai/identity-badge` published to npm
- [ ] Three variants render correctly across React, web component, SSR
- [ ] Public agent profile endpoint live + cached
- [ ] At least 2 demo integrations live (Slack bot + MCP)
- [ ] Beacon analytics shipping data to Sly
- [ ] Documentation published

## References

- A2A Agent Card spec (similar concept — public, signed, identity-first)
- `apps/web` agent inspector (visual reference)
- Epic 89 — discovery API (agent profile endpoint shape)
