# Story 94.5: SSR HTML String Render

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 3
**Priority:** P1
**Dependencies:** Story 94.2

---

`renderBadge({ profile, variant, theme })` returns a complete HTML string with inline styles — no JS execution required on the consumer side. Useful for Slack Block Kit (image rendering), MCP tool output (HTML fragments), email, and static-site builders.

## Acceptance

- [ ] Returns a single self-contained HTML fragment with inline styles
- [ ] No `<script>` tags — pure markup
- [ ] All three variants supported
- [ ] Accepts a pre-fetched `profile` object (no network calls in the function itself)
- [ ] Documented HTML sanitization expectations (output is safe to inline)

## Technical notes

Zero runtime dependencies — pure functions. The accent color and theme tokens are interpolated into the inline styles. Useful as the backbone for an `/og` image endpoint later.

## Dependencies

94.2.
