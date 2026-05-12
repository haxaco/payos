# Story 94.4: Web Component Variant

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 94.2, Story 94.3 (shared render core)

---

`<sly-badge agent-id="..." variant="compact"></sly-badge>` — same three variants and theming, no framework needed. Drops into a static HTML page or any non-React host (Vue, Svelte, plain).

## Acceptance

- [ ] Custom element registered as `sly-badge`
- [ ] Attribute observers for `agent-id`, `variant`, `theme`, `accent-color`
- [ ] Shadow DOM scoped styles (no leakage)
- [ ] Works in a plain HTML page with one `<script type="module">` tag
- [ ] Same loading / error / accessibility behavior as the React variant

## Technical notes

The web-component and React variants share an internal render core so visuals stay identical. The web component must NOT bundle React.

## Dependencies

94.2, 94.3 (shared render core).
