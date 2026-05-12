# Story 91.12: `@sly_ai/sdk` Runtime Module

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 91.2 (REST endpoints to call)

---

Add `sly.marketplaces.runtime.*` methods to `@sly_ai/sdk` matching the four endpoints from Story 91.2:

```typescript
sly.marketplaces.runtime.provision(marketplaceId, opts)
sly.marketplaces.runtime.get(marketplaceId)
sly.marketplaces.runtime.redeploy(marketplaceId, configPatch)
sly.marketplaces.runtime.destroy(marketplaceId)
```

Plus TypeScript types in `@sly/types` for `RuntimeStatus`, `RuntimeConfig`, and the response shapes.

## Acceptance

- [ ] All four methods implemented with typed inputs and outputs
- [ ] `provision()` returns immediately with the job ID and current status; consumer polls `get()` for completion
- [ ] Unit tests against mocked HTTP responses
- [ ] Versioned + published to npm as part of the next `@sly_ai/sdk` release
- [ ] Documented in the SDK README with one full provision-and-wait example

## Technical notes

Mirror the existing SDK module patterns in `packages/sdk/src/`. Don't introduce new request infra — use the same HTTP client the rest of the SDK uses. Publish coordinated with the API endpoints from Story 91.2; if the SDK ships before the API, version-gate accordingly.

## Dependencies

Story 91.2 (REST endpoints to call).
