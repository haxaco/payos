# Story 94.3: React Component — Compact, Full, Card Variants

**Status:** Planned
**Epic:** [Epic 94 — Identity Badge SDK](../../epic-94-identity-badge-sdk.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 94.1, Story 94.2

---

`<SlyBadge agentId={...} variant="compact|full|card" theme="auto|light|dark" />` — fetches the public profile (94.1), renders an identity card. Compact = one-line (name + tier pill + score). Full = adds NFT thumb + on-chain link + receipts count. Card = the full agent-card discovery surface.

```tsx
<SlyBadge agentId="agent_..." variant="compact" />
<SlyBadge agentId="agent_..." variant="full" accentColor="#5B5BD6" />
```

## Acceptance

- [ ] All three variants render against a live profile endpoint
- [ ] Loading state is a skeleton (no layout shift on hydrate)
- [ ] Error state degrades gracefully — bad agent_id renders a static "unverified" pill instead of throwing
- [ ] Click on the badge opens the public agent profile page (configurable `linkBehavior`)
- [ ] All three variants are accessible (proper roles, labels, focus ring)
- [ ] Snapshot tests pinned for each variant

## Technical notes

Use the native `fetch` only — no axios or SWR dep. Allow callers to pass a `profile` prop directly to skip the fetch (useful in SSR / Next.js where the parent already has the data). React 19 compatibility: avoid `useEffect` data fetching where possible; document an SSR-first usage path.

## Dependencies

94.1, 94.2.
