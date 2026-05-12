# Story 88.5: REST `POST /v1/marketplaces/:id/onchain/mint`

**Status:** Planned
**Epic:** [Epic 88 — MarketplaceRegistry On-Chain](../../epic-88-marketplace-registry-onchain.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Story 88.3

---

Authenticated endpoint that enqueues a mint via the write service. Idempotent: re-calling for an already-minted marketplace returns the existing record. Returns `202 Accepted` with a job ID; clients poll the GET endpoint for completion.

```typescript
// apps/api/src/routes/marketplace-onchain.ts
app.post('/v1/marketplaces/:id/onchain/mint', async (c) => {
  const ctx = c.get('ctx');
  const marketplace = await loadMarketplace(c.req.param('id'), ctx.tenantId);
  if (marketplace.kymTier < 2) throw new ForbiddenError('KYM T2+ required');
  const job = await registry.mint(marketplace.id);
  return c.json({ jobId: job.id, status: 'queued' }, 202);
});
```

## Acceptance

- [ ] KYM T2+ enforced at handler boundary (defence in depth with service)
- [ ] Tenant must own the marketplace (RLS-style filter)
- [ ] Idempotent: returns existing tokenId on re-call
- [ ] Returns `202` with jobId for new mints, `200` with tokenId for already-minted
- [ ] Integration test covers tenant isolation

## Technical notes

The handler is a thin wrapper around the write service from 88.3 — it enforces KYM T2+ and tenant ownership at the HTTP boundary as defence in depth, then delegates to `registry.mint()` which does the same checks. Async by design: mints return `202 Accepted` with a `jobId` so the client can poll the GET endpoint without holding the connection open during gas/RPC retries. Idempotency comes from the service layer recognizing an already-minted marketplace and returning `200` with the existing tokenId instead of re-broadcasting.

## Dependencies

Story 88.3
