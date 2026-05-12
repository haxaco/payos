# Story 94.7: Slack Bot + MCP Demo Integrations

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 94.1, Story 94.5

---

Two reference integrations that prove "identity travels":

1. **Slack bot** — a small Bolt.js app that posts a message containing a Sly badge when an agent acts. Hosted demo lives in `examples/badge-slack-bot/`.
2. **MCP server example** — extends our existing `@sly_ai/mcp-server` so a tool result can include a badge HTML fragment for inline rendering in Claude Desktop.

## Acceptance

- [ ] Slack bot example posts a message with a badge image / link unfurl
- [ ] MCP tool returns a badge SSR HTML string in a tool result
- [ ] Both demos have READMEs with screenshots and one-command run instructions
- [ ] Demos use the public profile endpoint with no auth

## Technical notes

Slack badge rendering via either (a) a static `/og` image endpoint we generate from the SSR variant, or (b) a Slack Block Kit JSON layout that mirrors the compact variant. (b) is the more useful demo because it's interactive — pick (b) if Slack Block Kit can render it cleanly.

## Dependencies

94.1, 94.5.
