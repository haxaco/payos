# Story (WIP): Payment & Stream Templates — Backend + Wire-Up

**Status:** WIP / Not started — UI gated behind feature flag
**Linear:** TBD
**Epic:** Standalone (dashboard hardening)
**Points:** 5 (est.)
**Priority:** P3
**Dependencies:** None

---

## Context

`apps/web/src/app/dashboard/settings/templates/page.tsx` shipped as a
**mock-only placeholder**: a hardcoded `mockTemplates` array with
non-functional "Create Template", "Use", "Edit", "Delete", and
"Create New Template" buttons. There is **no templates API, no DB table, and
no api-client surface**. It was discovered during the dashboard
form-validation sweep (alongside the Accounts/Cards/Streams/Webhooks
dead-button class).

To avoid exposing a broken/placeholder feature in the open beta, the entire
Templates surface is now **gated behind a web feature flag** and defaults OFF.

## What was done (this change)

- Added `apps/web/src/lib/feature-flags.ts` — reusable web flag util reading
  `NEXT_PUBLIC_FEATURE_*` (default OFF).
- `settings/layout.tsx` — the **Templates** settings tab is filtered out
  unless `NEXT_PUBLIC_FEATURE_TEMPLATES=true`.
- `settings/templates/page.tsx` — direct navigation renders a clean
  "Templates are coming soon" placeholder when the flag is OFF (no dead
  buttons exposed); the mock UI only renders when the flag is ON.

## Remaining work to make Templates real (DoD)

- [ ] DB: `payment_templates` table (tenant-scoped, RLS) — fields for
      name, type (`stream` | `transfer`), description, payload (flow rate /
      amount / currency / counterparty defaults), usage count.
      Migration follows `apps/api/supabase/migrations/YYYYMMDD_*.sql`.
- [ ] API: CRUD routes (`GET/POST/PATCH/DELETE /v1/templates`,
      `POST /v1/templates/:id/use`) mounted consistently (avoid the
      payment-methods mount/path mismatch class of bug).
- [ ] api-client: `templates` resource (`list/get/create/update/delete/use`).
- [ ] Web: replace `mockTemplates` with live data; wire Create / Use / Edit /
      Delete to the API; surface real errors via `getApiErrorMessage`.
- [ ] Apply the `getApiErrorMessage` toast pattern and the shared create-modal
      pattern (see Accounts/Cards) — do not reintroduce dead buttons.
- [ ] Flip `NEXT_PUBLIC_FEATURE_TEMPLATES=true` only once the above is done
      and tested; then remove the gate.
- [ ] Tests: API integration (CRUD + RLS isolation) and a web smoke of the
      create flow.

## Technical notes

- `type: 'stream'` templates should reuse `CreateStreamInput`; `type:
  'transfer'` should reuse the transfer/payment shape — keep the template
  payload aligned with the existing create inputs so "Use" can hand off
  directly to the existing create endpoints rather than duplicating logic.
- The feature-flag util intentionally uses a static map (Next.js inlines
  `NEXT_PUBLIC_*` at build time — dynamic key lookup won't work).
