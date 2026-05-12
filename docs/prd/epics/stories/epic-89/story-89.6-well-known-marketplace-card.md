# Story 89.6: Public Card at `/.well-known/sly-marketplace.json`

**Status:** Planned
**Epic:** [Epic 89 — Marketplace Discovery API + Card](../../epic-89-marketplace-discovery-api.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Epic 88 (on-chain block), Epic 72 (platform key signing)

---

Per-marketplace JSON Card served at the marketplace's public domain (or fallback at `https://api.getsly.ai/.well-known/sly-marketplace/:slug.json`). Schema parallels A2A's Agent Card (Epic 70). Signed by the Sly platform key for tamper-evidence; cached at the edge with a 5-minute TTL.

```typescript
// apps/api/src/routes/well-known-marketplace.ts
app.get('/.well-known/sly-marketplace/:slug.json', async (c) => {
  const marketplace = await loadPublicMarketplace(c.req.param('slug'));
  if (marketplace.kymTier < 1) return c.json({ error: 'not_published' }, 404);
  const card = await buildMarketplaceCard(marketplace);
  card.signature = await signWithPlatformKey(canonicalize(card));
  return c.json(card, 200, { 'Cache-Control': 'public, max-age=300' });
});
```

Card schema (matches the spec block earlier in this doc) includes: identity, KYM block, on-chain block (tokenId, registry address, explorer URL — populated from Epic 88), discovery URLs (agents/endpoints/activity/mcp), operator info, 30-day stats, signature.

## Acceptance

- [ ] Route serves valid JSON Card for any T1+ marketplace by slug
- [ ] T0 marketplaces return 404 (private)
- [ ] Card signed with Sly platform Ed25519 key (Epic 72 infra)
- [ ] On-chain block populated when Epic 88 mint exists, null otherwise
- [ ] `Cache-Control: public, max-age=300`; CDN-friendly
- [ ] Schema versioned (`"version": "1"`)
- [ ] Custom-domain hosting works for Epic 91 managed marketplaces; api.getsly.ai fallback works always

## Technical notes

Signing key rotation policy follows existing Epic 72 infra. Canonicalize JSON before signing (RFC 8785) so signatures verify deterministically.

## Dependencies

Epic 88 (on-chain block), Epic 72 (platform key signing)
