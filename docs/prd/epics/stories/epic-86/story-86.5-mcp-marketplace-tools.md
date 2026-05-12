# Story 86.5: MCP Server — `sly_marketplace_*` Tools

**Status:** Planned
**Linear:** SLY-542
**Epic:** [Epic 86 — Marketplaces as First-Class Entities](../../epic-86-marketplaces-as-entities.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 86.4

---

Add four tools to `@sly_ai/mcp-server` (`packages/mcp-server/src/tools/marketplaces.ts`): `sly_marketplace_create`, `sly_marketplace_get`, `sly_marketplace_list`, `sly_marketplace_update`. Each is a thin wrapper around the SDK calls from Story 86.4. Tool schemas in JSON Schema; descriptions explain the slug + vertical conventions so Claude users can pick the right values.

## Acceptance

- [ ] Four tools registered in MCP server tool list
- [ ] Tool definitions validated by MCP SDK schema check
- [ ] Manual smoke test via Claude Desktop creates and lists a marketplace
- [ ] Tool descriptions reference visibility semantics (`private` default, `public` for Explorer)

## Technical notes

Defer membership tools (`add_agent`, `remove_agent`) to a follow-up — most MCP usage is read-shaped or "make me a marketplace," not membership wiring. Cleaner to keep the tool surface small in v1.

## Dependencies

86.4.
