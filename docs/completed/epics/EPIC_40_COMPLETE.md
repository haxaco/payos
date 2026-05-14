# Epic 40: External Sandbox Integrations & E2E Validation — Complete

**Status:** ✅ Complete
**Completion Date:** January 5, 2026
**Points Delivered:** ~100
**Stories:** 28/28
**PRD Version:** v1.18 (committed); v1.28 (this backfill)

## Summary

Sly's first end-to-end protocol integration epic. Replaced mocked external services with real sandbox APIs from Circle (custodial wallets + Pix/SPEI payouts), Coinbase x402, Stripe, and Google AP2. Established the integration patterns every subsequent protocol epic (UCP, A2A, MPP, scanner) reuses.

## Key Deliverables

- Circle Web3 Services integration for real on-chain USDC balances
- Pix/SPEI payouts via Circle Payments API
- x402.org facilitator integration (real signed JWTs, not mock witness mode)
- Compliance screening service (mock provider — gate; real provider lands in a later epic)
- Multi-currency FX quote engine (USD ↔ BRL ↔ MXN)
- 28 stories across Circle, x402, AP2, ACP scopes

## Source-of-Truth Files

- Epic spec: `docs/prd/epics/epic-40-sandbox-integrations.md`
- Code paths:
  - `apps/api/src/services/wallets/circle-service.ts`
  - `apps/api/src/services/x402/facilitator.ts`
  - `apps/api/src/services/quotes/fx-engine.ts`
- Tests: `apps/api/tests/integration/circle.test.ts`, `x402-facilitator.test.ts`
- Migrations: Schema additions for `external_wallets`, `fx_quotes`

## Linear

- Project: Pre-Linear (closed before Linear was adopted as the canonical tracker)
- Closing commits: see `git log --grep='Epic 40' --grep='Epic-40'`

## Follow-on Work

- Frontend integration for Epic 40's backend capabilities: Epic 42 (✅)
- Cards infrastructure for VDC issuance from Circle: Epic 43 Cards (📋 pending)
- On-Ramp integrations (cards, ACH, LATAM banks): Epic 41 (📋 pending)
