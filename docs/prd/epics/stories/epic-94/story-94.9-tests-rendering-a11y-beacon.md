# Story 94.9: Tests — Rendering, Accessibility, Beacon

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 94.3, Story 94.4, Story 94.5, Story 94.8

---

Coverage for the surfaces that ship to third parties.

## Acceptance

- [ ] Snapshot tests for all three variants × three themes
- [ ] Accessibility tests (axe-core or equivalent) pass on each variant
- [ ] Web-component test mounts in jsdom and renders
- [ ] SSR test asserts the returned HTML matches a snapshot
- [ ] Beacon test verifies POST shape + DNT bypass

## Technical notes

Use Vitest + jsdom for both the React and web-component tests so the harness matches the rest of the monorepo. Axe-core integration runs against the rendered DOM for the React + web-component variants; the SSR snapshot needs an additional pass that parses the HTML string into a jsdom document before axe runs. The beacon test should stub `navigator.sendBeacon` and assert payload shape + that DNT (`navigator.doNotTrack === '1'`) suppresses the call.

## Dependencies

94.3, 94.4, 94.5, 94.8.
