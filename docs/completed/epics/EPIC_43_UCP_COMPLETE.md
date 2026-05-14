# Epic 43 (UCP variant): Universal Commerce Protocol Integration — Complete

**Status:** ✅ Complete
**Completion Date:** January 19, 2026
**Points Delivered:** 55
**Stories:** 14/14
**PRD Version:** v1.20 (committed); v1.28 (this backfill)

> **Note on duplicate Epic 43:** Two epic docs share number 43. *This doc covers the UCP integration (`epic-43-ucp-integration.md`), shipped Jan 19, 2026.* The other Epic 43 (`epic-43-cards-infrastructure.md`) is a separate, still-pending epic for virtual debit cards.

## Summary

Sly became a UCP (Universal Commerce Protocol) Payment Handler — `com.sly.latam_settlement` — registered with the Google + Shopify-led ecosystem. UCP orchestrates AP2, MCP, and A2A protocols rather than replacing them, and Sly's value-add is LATAM settlement (Pix/SPEI) integrated as a settlement option for any UCP-supporting merchant.

Strategic win: UCP validated Sly's multi-protocol strategy. Not supporting UCP risked irrelevance once Google+Shopify endorsements crossed 20+ (Visa, Mastercard, Walmart, Target, etc.).

## Key Deliverables

- UCP Profile endpoint (`GET /v1/ucp/profile`) advertising Sly's capabilities
- UCP capability negotiation flow
- Payment handler spec implementation
- UCP SDK client (`@sly/sdk` `sly.ucp` module)
- Discovery + settle endpoints
- Integration tests against the UCP reference implementation

## Source-of-Truth Files

- Epic spec: `docs/prd/epics/epic-43-ucp-integration.md`
- Code paths:
  - `apps/api/src/routes/ucp-*.ts`
  - `apps/api/src/services/ucp/*`
- Tests: `apps/api/tests/integration/ucp.test.ts`
- Investigation: `docs/prd/investigations/ucp-integration.md`

## Linear

- Project: Pre-Linear (closed before Linear was adopted)

## Follow-on Work

- UCP Merchant Gateway (productize for merchants, not just handlers): Epic 47 (📋 Backlog)
- Cross-marketplace publishing (publish UCP endpoints to multiple catalogs): Epic 84 (📋)
