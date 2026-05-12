# Story 96.6: SDK — `walletProvider: 'zerodev'` Option

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 96.1

---

Expose the new provisioning option via the unified SDK so external developers can create kernel-wallet agents without raw API calls.

```typescript
await sly.agents.create({
  name: "my-agent",
  walletProvider: 'zerodev',
  // ...
});
```

## Acceptance

- [ ] `sly.agents.create` accepts `walletProvider: 'cdp' | 'zerodev'`
- [ ] Default remains `'cdp'` to avoid breaking existing callers
- [ ] Response includes `kernel_address` when `walletProvider: 'zerodev'`
- [ ] Types live in `@sly/types` and re-exported by the SDK
- [ ] SDK bump documented in changelog

## Technical notes

This is a thin types + passthrough change in `@sly_ai/sdk` — the heavy lifting lives in the API (Story 96.1). Keep `walletProvider` as a string-literal union (not an enum) so adding future providers (Pimlico, Biconomy) is non-breaking. Ship a minor version bump and call out the new field in the changelog; existing callers that omit `walletProvider` continue to get the `'cdp'` default.

## Dependencies

Story 96.1.
