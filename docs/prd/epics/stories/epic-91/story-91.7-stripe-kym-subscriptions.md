# Story 91.7: Stripe Billing — KYM Tier Subscriptions

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Epic 87 (KYM tier writes go through this billing flow now)

---

Set up Stripe products + subscriptions matching the three pricing surfaces from `MARKETPLACES_STRATEGY.md`. Three Stripe products: `sly_marketplace_kym_t1` (monthly, $X), `sly_marketplace_kym_t2` (monthly, $XX + one-time verification fee), `sly_marketplace_kym_t3` (negotiated, off-Stripe).

Customer flow:
1. Operator triggers tier upgrade from Epic 90 Story 90.9 → Sly Console calls `POST /v1/billing/subscriptions` → server creates Stripe Checkout Session → operator pays.
2. Stripe webhook → `POST /internal/webhooks/stripe/subscription` → updates `marketplaces.subscription_status` and `marketplaces.kym_tier` on success.
3. On payment failure, grace period of 7 days; then auto-downgrade tier to T0 and pause the runtime (Story 91.10 hook).

New tables: `billing_customers` (tenant ↔ Stripe customer ID), `subscriptions` (Stripe subscription state mirror).

## Acceptance

- [ ] Stripe Checkout Session creates and redirects in dashboard
- [ ] Webhook is signature-verified (Stripe's `Stripe-Signature` header)
- [ ] Webhook is idempotent (use `stripe_event_id` as primary key)
- [ ] Successful payment activates the new tier within 10s
- [ ] Payment failure starts the grace period and surfaces a warning banner in dashboard
- [ ] Test mode (`pk_test_*` Stripe keys) works end-to-end before production keys
- [ ] Cancellation reverts to T0 at end of current billing period

## Technical notes

Use Stripe's `mode: 'subscription'` Checkout. Webhook endpoint lives outside the auth-required `/v1/*` namespace — at `/internal/webhooks/stripe/*` — and is the only route that should accept POSTs without an API key (but still requires the Stripe signature). Mirror the webhook idempotency pattern from any existing Stripe integration; if none exists, the canonical pattern is "select-then-insert with `stripe_event_id` unique constraint." Don't hardcode price IDs — store them in `tier_pricing` config table for env-portability.

## Dependencies

Epic 87 (KYM tier writes go through this billing flow now).
