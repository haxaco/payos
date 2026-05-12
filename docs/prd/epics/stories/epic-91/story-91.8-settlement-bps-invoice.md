# Story 91.8: Settlement Bps — Take Rate Calc + Monthly Invoice

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 8
**Priority:** P1
**Dependencies:** Story 91.7 (Stripe customer model), `apps/api/src/services/settlement-batcher.ts`

---

Take a bps cut on x402 facilitator settlements that flow through Sly's facilitator. Per-settlement: compute `fee = settlement_amount * tenant.settlement_bps / 10000`, accumulate into a monthly invoice line item per tenant.

Three pieces:
1. **Settlement hook** — extend `apps/api/src/services/settlement-batcher.ts` to record a `marketplace_fees` row for each settled transaction.
2. **Monthly close** — cron at month-end aggregates `marketplace_fees` by tenant and creates a Stripe invoice item.
3. **Self-hosted distinction** — self-hosted runtimes that don't use Sly's facilitator pay the same bps but accrued from a different source — usage logs from the SDK. Same `marketplace_fees` table, different `source` enum value.

## Acceptance

- [ ] Every settlement that touches Sly's facilitator writes a `marketplace_fees` row with `source = 'sly_facilitator'`
- [ ] Self-hosted SDK calls that report settlements write a `marketplace_fees` row with `source = 'self_hosted_sdk'`
- [ ] Monthly cron creates a Stripe invoice item summing fees for the tenant
- [ ] Invoice lines reference the marketplace + period; auditable to the underlying settlements
- [ ] Bps configurable per tenant (default), per marketplace (override), per KYM tier (default override)
- [ ] Idempotent invoice creation — re-running the cron mid-month doesn't double-bill

## Technical notes

Use Stripe's `invoiceitems.create` to add line items to a recurring monthly invoice rather than creating one-off invoices. Math is in cents; never use floating-point USD for fee calculation. Cross-reference `apps/api/src/services/settlement-batcher.ts` for the existing settlement code path — extension point should be a single hook, not scattered changes. Cron via Vercel Cron (`vercel-plugin:vercel-functions` covers cron config) or the existing `apps/api/src/workers/` pattern, whichever is more idiomatic for this codebase.

## Dependencies

Story 91.7 (Stripe customer model), `apps/api/src/services/settlement-batcher.ts`.
