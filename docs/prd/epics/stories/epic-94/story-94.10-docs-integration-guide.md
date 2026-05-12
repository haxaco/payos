# Story 94.10: Documentation — Integration Guide, API Ref, Examples

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 94.3, Story 94.4, Story 94.5, Story 94.7

---

A standalone docs page that an external developer can follow in 5 minutes. Covers React, web component, SSR, theming, examples, and the public profile endpoint.

## Acceptance

- [ ] `docs/guides/integrations/identity-badge.md` published
- [ ] Live demo page in `apps/web` with copy-pasteable snippets per variant
- [ ] README in the `@sly_ai/identity-badge` package mirrors the docs page
- [ ] Storybook (or equivalent) showing all variants × themes
- [ ] One full "from npm install to rendered badge" example reviewed by an external developer

## Technical notes

Treat the guide as a single source of truth — generate the package README from it (or symlink) rather than duplicating prose. Snippets must be exactly what an external developer would paste, including the `@sly_ai/identity-badge` package name and live agent IDs from the demo tenant. Storybook stories double as visual regression coverage and should reuse the same fixtures as the Story 94.9 snapshot tests.

## Dependencies

94.3, 94.4, 94.5, 94.7.
