# Story 90.11: Tests — Anonymous RLS, Search Ranking, Permission Gates

**Status:** Planned
**Epic:** [Epic 90 — Marketplace Explorer UI](../../epic-90-marketplace-explorer-ui.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Stories 90.1–90.10

---

Three buckets of tests:

1. **Anonymous-access RLS tests** (integration): hit every public Explorer endpoint with no auth and verify only KYM ≥1 + `visibility=public` marketplaces are returned. Hit the same endpoints with a different tenant's API key and verify the same rule still holds (no over-broad cross-tenant exposure). Negative tests confirm KYM T0 / `visibility=private` rows are never leaked.
2. **Search ranking tests** (unit): pin the weighted score formula and lock it in a snapshot — KYM tier weight × volume weight × recency weight produces a deterministic ranking. Catches accidental reranking regressions when the formula evolves.
3. **Edit-permission gates** (integration): a user with role `viewer` can read the marketplace edit page but cannot save. A user from tenant B cannot load tenant A's marketplace edit page. Tested via Playwright against the dashboard, or via Hono test client against the underlying API.

## Acceptance

- [ ] Anonymous-access tests cover every `GET /v1/marketplaces/*` route
- [ ] Search ranking test snapshot committed; updating the formula requires updating the snapshot
- [ ] Permission gates tested for owner, admin, member, viewer roles
- [ ] CI runs the full suite on every PR touching `apps/web/src/app/(public)/marketplaces/**` or `apps/web/src/app/dashboard/marketplaces/**`
- [ ] No flake on the SSE tests — use deterministic event injection, not wall-clock waits

## Technical notes

Anonymous-access tests are the highest-priority because that's the new threat surface (the listed risk in this epic). Mirror the patterns in `apps/api/tests/integration/` — set `INTEGRATION=true` and run against a real Supabase. Permission gate tests can stay in `apps/web` if Playwright is already wired; otherwise prefer API-level integration tests.

## Dependencies

Stories 90.1–90.10.
