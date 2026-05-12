# Story 89.7: `@sly_ai/mcp-server` Marketplace-Scoped Mode

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 8
**Priority:** P1
**Dependencies:** Story 89.6 (Card), Story 89.8 (SDK methods)

---

Extend the existing `@sly_ai/mcp-server` package to accept `--marketplace=<slug>` and bind a marketplace-scoped tool surface. Auto-discovers the marketplace via its Card (89.6) and registers four MCP tools: `list_agents`, `find_seller`, `get_endpoint_quote`, `get_marketplace_stats`. Single binary supports both per-marketplace mode (one MCP server per slug) and switch-via-arg mode (one MCP server, `marketplace` is a tool arg) to avoid the "MCP explosion" risk for operators with many marketplaces.

```jsonc
// claude_desktop_config.json example
{
  "mcpServers": {
    "travel": {
      "command": "npx",
      "args": ["@sly_ai/mcp-server", "--marketplace=travel"]
    }
  }
}
```

## Acceptance

- [ ] `npx @sly_ai/mcp-server --marketplace=<slug>` boots and registers 4 tools
- [ ] Tools delegate to REST endpoints from 89.1–89.4
- [ ] Switch-mode also supported: `--marketplaces=travel,services,research` exposes `marketplace` as a tool argument
- [ ] Card from 89.6 is fetched once on boot, cached for tool descriptions
- [ ] `pnpm publish:mcp` publishes new version to npm
- [ ] Documented Claude Desktop config example works end-to-end

## Technical notes

Builds on the existing `packages/mcp-server` infra used by Epic 70. The dual-mode design comes directly from the "MCP per-marketplace explosion" risk called out in this epic. Tool argument schemas reuse Zod schemas from the SDK (89.8).

## Dependencies

Story 89.6 (Card), Story 89.8 (SDK methods)
