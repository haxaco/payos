# Story 94.8: Render-Beacon Endpoint + Analytics

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 3
**Priority:** P2
**Dependencies:** Story 94.3, Story 94.4

---

Each badge render fires a lightweight beacon to `POST /v1/badge/beacon` with `{agent_id, variant, theme, host_origin}`. Aggregated daily into a `badge_renders` rollup. Powers the directory network-effect argument ("identity is rendered in 28 distinct apps this week").

## Acceptance

- [ ] Beacon endpoint accepts POSTs, rate-limited per IP
- [ ] Beacon writes go to a single table (`badge_renders`) with a daily rollup
- [ ] No PII in the beacon — only agent_id + variant + a coarse host origin (eTLD+1)
- [ ] Honor `Do Not Track` and a `disableBeacon` option in all three variants
- [ ] Dashboard view in Sly Console showing "where is identity rendered"

## Technical notes

Use `navigator.sendBeacon` in the browser variants when available so it survives page unloads. SSR variant cannot beacon (no JS runtime) — document this honestly.

## Dependencies

94.3, 94.4.
