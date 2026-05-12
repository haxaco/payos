# Story 89.11: Tests — KYM Gating, Card Signature, MCP Tool Integration

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Stories 89.1–89.8

---

End-to-end test pass. Integration tests verify KYM gating across all REST endpoints (T0 = tenant-only, T1+ = cross-tenant, T2+ = MCP-reachable). Signature verification test asserts a tampered Card fails validation. MCP integration test boots the server in a subprocess and asserts each of the four tools returns valid data.

## Acceptance

- [ ] Vitest integration: T0 marketplace returns 404 cross-tenant; T1 returns 200
- [ ] Card signature test: original verifies, tampered fails
- [ ] MCP test: spawn `npx @sly_ai/mcp-server --marketplace=test`, exercise all 4 tools
- [ ] Abuse simulation: 1000 rpm on `/v1/marketplaces/search` from one IP gets rate-limited
- [ ] CI runs full suite on PRs touching `routes/marketplace*.ts` or `mcp-server`

## Technical notes

KYM gating is the cross-cutting invariant for the whole epic — the integration matrix asserts T0/T1/T2 behavior across every discovery route in one suite so regressions surface fast. The MCP integration test spawns `npx @sly_ai/mcp-server --marketplace=test` as a subprocess and exercises all four tools end-to-end, validating that Story 89.7's wiring stays sound. CI is scoped to PRs touching `routes/marketplace*.ts` or `mcp-server` so the abuse-simulation (1000 rpm) and subprocess boot don't slow unrelated PRs.

## Dependencies

Stories 89.1–89.8
