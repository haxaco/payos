# Story 91.13: Tests — Provisioning Idempotency, Custom Domain, Billing

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Stories 91.2, 91.3, 91.7, 91.8

---

Three test suites:

1. **Provisioning idempotency** (integration) — provision the same marketplace 5 times concurrently; assert only one runtime is allocated, one subdomain, one cert. Destroy + reprovision in a tight loop; assert no orphan state.
2. **Custom domain handoff** (integration) — simulate the Cloudflare webhook for a successful cert issuance; assert the hostname becomes routable. Simulate failure; assert `tls_status='failed'` and operator is notified.
3. **Billing accuracy** (integration + unit) — generate 1000 synthetic settlements at known bps; assert the monthly invoice sums match to the cent. Simulate Stripe webhook duplicates; assert idempotent handling.

## Acceptance

- [ ] Provisioning idempotency test runs in CI on every PR touching `apps/api/src/routes/runtime.ts` or related
- [ ] Custom domain test mocks Cloudflare's webhook payload precisely
- [ ] Billing test seeds 1000+ settlements and asserts cent-exact invoice totals
- [ ] No flakes — deterministic event injection, no wall-clock-dependent assertions
- [ ] Coverage of error paths (KYM tier too low, duplicate domain, payment method declined)

## Technical notes

Integration tests follow the `INTEGRATION=true` pattern from `apps/api/tests/integration/`. Mock Stripe via their official `stripe-mock` Docker image rather than fixture files — catches API surface drift. Mock Cloudflare via a custom HTTP responder.

## Dependencies

Stories 91.2, 91.3, 91.7, 91.8.
