# Story 94.2: `@sly_ai/identity-badge` Package Scaffold

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 5
**Priority:** P0
**Dependencies:** None

---

Set up the new npm package: monorepo workspace under `packages/identity-badge`, dual-entry build (ESM + CJS), three exports (`/react`, `/web-component`, `/ssr`), zero runtime deps for the SSR entry, minimal deps for the others. Publishable under the `@sly_ai/*` scope.

## Acceptance

- [ ] Package builds with the same tooling as `@sly_ai/sdk` (tsup or equivalent)
- [ ] Three export entries are independently importable (tree-shakable)
- [ ] SSR entry has zero runtime dependencies (pure string concatenation)
- [ ] React entry peerDeps on `react@^18 || ^19`
- [ ] `pnpm publish:badge` script added at root (parallel to `publish:sdk`)
- [ ] Smoke test imports each export

## Technical notes

Keep total bundle size < 8kb gzip for the React entry. The badge must NOT pull in a CSS framework — inline styles or scoped CSS only. Use the `@sly_ai/*` scope (not `@sly/*`) since it's published.

## Dependencies

None.
