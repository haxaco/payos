# Story 91.4: Branded Viewer Hosting — Per-Marketplace Assets

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 8
**Priority:** P1
**Dependencies:** Story 91.1, Epic 86 (`branding` field), Epic 90 Story 90.8 (logo upload UX)

---

Same agentbazaar viewer code, different look per marketplace. Branding fields on the `marketplaces` row from Epic 86 (`branding.logoUrl`, `branding.accentColor`, `branding.customCss`, `branding.faviconUrl`) drive the viewer's render. Feature toggles (`features.showcase`, `features.joinPage`, `features.leaderboard`) hide / show sections.

Three pieces:
1. **Server-side render** of the viewer's HTML shell uses the marketplace's branding to set `<title>`, `<link rel="icon">`, CSS custom properties (`--accent`), and a small inline `<style>` block from `branding.customCss` (sanitized).
2. **Logo + favicon** served via Vercel Blob URLs stored at upload time (Epic 90 Story 90.8 handles the upload UX; this story consumes the URLs).
3. **Feature toggles** evaluated server-side; disabled sections never reach the client bundle.

## Acceptance

- [ ] Three different marketplaces in staging render with visibly different branding (logo, color, title)
- [ ] Disabling `features.showcase` hides the `/showcase` route entirely (404 instead of empty page)
- [ ] Custom CSS slot is sanitized (no `<script>`, no `behavior:` IE7 vector, no `@import` to external URLs)
- [ ] Favicon and OG image both reflect the branded logo
- [ ] Default branding (empty `branding` JSONB) falls back to Sly's neutral palette

## Technical notes

Sanitize custom CSS via `DOMPurify` server-side or restrict to a CSS subset (only color + spacing properties). Don't allow `url()` references — they leak the visitor's IP to the customer's server. Inline the sanitized CSS rather than serving as a stylesheet so the cache key is per-marketplace. The viewer is part of the agentbazaar repo — coordinate the changes there with the multi-tenant rewrite from Story 91.1.

## Dependencies

Story 91.1, Epic 86 (`branding` field), Epic 90 Story 90.8 (logo upload UX).
