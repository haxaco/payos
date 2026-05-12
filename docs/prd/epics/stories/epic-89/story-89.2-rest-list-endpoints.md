# Story 89.2: REST `GET /v1/marketplaces/:id/endpoints`

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 89.1 (shared gating helper)

---

Catalog of x402, ACP, and UCP endpoints registered to a marketplace. Same KYM gating as `/agents`. Returns endpoint id, protocol, vendor agent, price quote, reputation score, and last-call timestamp.

## Acceptance

- [ ] Lists x402 + ACP + UCP endpoints filtered by marketplace
- [ ] `GET /:id/endpoints/:endpointId` returns full endpoint card with price + reputation
- [ ] Cursor pagination
- [ ] KYM gating identical to 89.1
- [ ] Tested against x402 endpoint fixtures

## Technical notes

Reuses the shared KYM-gating helper introduced in Story 89.1 so all `/v1/marketplaces/:id/*` discovery routes behave identically under the T0/T1+ visibility rules. Aggregates across x402, ACP, and UCP endpoint tables filtered by `marketplace_id`, returning a unified endpoint card with price quote and reputation score. The detail route `/:endpointId` joins the vendor agent card and is the canonical response shape used by both the SDK and the auto-generated MCP server (Story 89.7).

## Dependencies

Story 89.1 (shared gating helper)
