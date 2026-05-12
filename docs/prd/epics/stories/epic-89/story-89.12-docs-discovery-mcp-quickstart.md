# Story 89.12: Documentation — Discovery API Reference + MCP Server Quickstart

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Stories 89.6, 89.7

---

Ship `docs/guides/marketplaces/discovery-api.md` and `docs/guides/marketplaces/mcp-quickstart.md`. The first covers REST endpoints, KYM gating rules, the Card schema with a signed example, and pagination conventions. The second walks an operator through binding the MCP server in Claude Desktop and running their first `find_seller` query.

## Acceptance

- [ ] `discovery-api.md` covers all 5 REST endpoints + Card schema
- [ ] `mcp-quickstart.md` includes working `claude_desktop_config.json` snippet
- [ ] Signed Card example included with verification snippet
- [ ] Linked from `MARKETPLACES_STRATEGY.md` and the SDK README
- [ ] Reviewed by docs owner

## Technical notes

The discovery-api reference is the partner-facing entry point — KYM gating rules and pagination conventions are surfaced front-and-center because they're the two questions integrators hit first. The MCP quickstart pairs a working `claude_desktop_config.json` snippet with a literal `find_seller` walkthrough, validating Story 89.7's dual-mode binding in a copy-pasteable form. Both guides link back from `MARKETPLACES_STRATEGY.md` and the SDK README so they're reachable from the discovery surfaces themselves.

## Dependencies

Stories 89.6, 89.7
