# Story 94.6: Theming — Light / Dark / Auto / Accent

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 94.3, Story 94.4, Story 94.5

---

A small theme system shared across all three variants. `theme="auto"` follows `prefers-color-scheme`. `accentColor` overrides the brand accent. No per-tenant themes in v1 (Sly-branded only).

## Acceptance

- [ ] Light, dark, auto modes render correctly
- [ ] `accentColor` is honored across all variants
- [ ] Auto mode reacts to OS preference changes without remount
- [ ] Tokens documented (CSS custom-property names for advanced overrides)
- [ ] Theming works in web component (via shadow DOM CSS variables) and SSR (inline styles)

## Technical notes

Use CSS custom properties so consumers can override via standard CSS even in shadow DOM. Document the full token set in the README.

## Dependencies

94.3, 94.4, 94.5.
