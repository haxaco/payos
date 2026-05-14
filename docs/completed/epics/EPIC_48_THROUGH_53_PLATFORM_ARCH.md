# Epics 48–53: Platform Architecture Cluster — Complete

**Status:** ✅ Complete (all 6)
**Completion Window:** January 22 – January 27, 2026
**Points Delivered:** 21 + 18 + 26 + 52 + 21 + 62 = **200**
**PRD Versions:** v1.21 (created), v1.22 (closed); v1.28 (this backfill)

## Summary

Six coordinated epics that established Sly's platform architecture for multi-protocol scaling. Shipped together as a cluster because they share the connected-accounts/payment-handler abstraction that all later protocol work (UCP, A2A, MPP, scanner) plugs into.

This cluster is the foundation that lets every subsequent protocol epic be additive — protocols don't fight each other for settlement or onboarding flow because the platform now treats them as plug-in handlers behind a uniform interface.

## Per-Epic Roll-up

### Epic 48: Connected Accounts (21 pts, Jan 22, 2026)
- CRUD API for connected accounts (Stripe, PayPal, Circle, etc.)
- Credential vault with AES-256 encryption
- Payment handler abstraction
- Handler registry + validation

### Epic 49: Protocol Discovery (18 pts, Jan 22, 2026)
- Protocol registry service (x402, AP2, ACP, UCP)
- `GET /v1/protocols` discovery endpoint
- Protocol enablement API with prerequisite validation
- Protocol status dashboard widget with toggles

### Epic 50: Settlement Decoupling (26 pts, Jan 22, 2026)
- Settlement trigger engine (schedule, threshold, manual, immediate)
- Settlement rules CRUD API
- Settlement rules dashboard UI
- Refactored existing settlement code to use the rules engine, not hardcoded triggers

### Epic 51: Unified Onboarding (52 pts, Jan 22, 2026; absorbed Epic 25)
- Onboarding state tracking API
- Protocol-specific onboarding flows
- Quick-start templates
- Sandbox-mode toggle
- Full wizard UI with step components

### Epic 52: Dashboard Redesign — Agentic Focus (21 pts, Jan 22, 2026)
- Protocol distribution widget (replaced Circle/ETH/BTC mocks with real x402/AP2/ACP/UCP counts)
- Protocol activity chart with time range + metric toggles
- Protocol quick-stats cards with enable/disable toggles
- Conditional onboarding banner
- Recent protocol activity feed with agent badges
- *Post-merge in flight: marketplace-aware filtering — see epic doc for working-tree changes.*

### Epic 53: Card Network Agentic Commerce (62 pts, Jan 27, 2026)
- Visa VIC integration with TAP (Trusted Agent Protocol)
- Mastercard Agent Pay with DTVC tokens
- Unified Web Bot Auth verification (RFC 9421)
- Settlement router with 5 rails: Visa, Mastercard, USDC, Pix, SPEI
- Dashboard UI for card network management
- SDK modules: `sly.cards.visa`, `sly.cards.mastercard`

## Source-of-Truth Files

- Epic specs: `docs/prd/epics/epic-{48,49,50,51,52,53}-*.md`
- Architecture overview: `docs/architecture/three-layer-architecture.md`
- Key code paths:
  - `apps/api/src/services/connected-accounts/*` (Epic 48)
  - `apps/api/src/services/protocols/registry.ts` (Epic 49)
  - `apps/api/src/services/settlement/rules.ts` (Epic 50)
  - `apps/api/src/services/onboarding/*` (Epic 51)
  - `apps/web/src/app/dashboard/*` (Epic 52)
  - `packages/cards/*` (Epic 53)

## Linear

- Pre-Linear cluster (closed before Linear was canonical)
- Linear was adopted as the project tracker mid-cluster; later projects were created retroactively for some of these

## Follow-on Work

- Frontend dashboard integration: Epic 42 (✅ shipped before this cluster)
- UCP Merchant Gateway: Epic 47 (📋)
- Settlement decoupling extension for batch settlement: Epic 38 (✅)
- Card network expansion: see `packages/cards/` for the Visa/Mastercard abstractions
