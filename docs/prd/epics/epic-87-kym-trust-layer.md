# Epic 87: KYM (Know Your Marketplace) Trust Layer

**Status:** Planned
**Phase:** TBD (Marketplaces Platform)
**Priority:** P0
**Dependencies:** Epic 86 (Marketplaces as Entities), Epic 73 (KYC/KYA Tiers — pattern reference)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md)
**Created:** May 2026

---

## Summary

Add a marketplace-level trust layer mirroring KYA. Each marketplace gets a tier (T0–T3) reflecting verification depth and operator accountability. KYM tiers gate cross-marketplace traffic, Explorer visibility, and on-chain registry mint eligibility. The verification flow itself reuses the KYC/KYB pattern from Epic 73 (Persona / Sumsub at scale, partner reliance for enterprise).

## Motivation

Without a marketplace trust layer, the cross-marketplace directory (Epic 90) becomes a spam vector. Anyone can create a marketplace and inject untrusted listings into the agent commerce graph. Worse, federated traffic between marketplaces has no basis for asymmetric trust — a 3-day-old marketplace looks identical to a 2-year-old enterprise marketplace.

KYM solves this with the same logic that makes KYA work for agents:

1. **Operator declares.** At creation, the operator self-attests (T0).
2. **Operator validates.** At T1+, operator goes through KYB-style verification (business identity, signatory, registration docs).
3. **Marketplace earns reputation.** Behavior over time (uptime, dispute rate, settlement success, agent NPS) feeds a marketplace reputation score visible cross-platform.
4. **Tier gates capabilities.** Higher tiers unlock: cross-marketplace traffic, Explorer placement, on-chain registry mint, ability to grant T2 to sub-marketplaces (T3 only).

Symmetric with KYA. Same compliance-as-a-feature framing.

## Direction confirmed with the user

Symmetry is the point. KYA + KYM + ERC-8004 is the differentiator nobody else in agentic commerce currently has. The verification flow should reuse the KYC/KYB infrastructure from Epic 73 — different documents, same structure.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/marketplaces/:id/verify` | ✅ Yes | `sly.marketplaces` | P0 | Mirror of `/v1/accounts/:id/verify` |
| `GET /v1/marketplaces/:id/limits` | ✅ Yes | `sly.marketplaces` | P0 | Mirror of `/v1/agents/:id/limits` |
| `kymTier` field on marketplace records | ✅ Types | Types only | P0 | Existing `sly.marketplaces` |
| KYM tier limits in policy responses | ✅ Yes | `sly.marketplaces` | P0 | Used by Epic 89 + 90 |
| MCP tools (`sly_marketplace_verify`, `sly_kym_status`) | ✅ Yes | `mcp-server` | P1 | |

**SDK Stories Required:**
- [ ] Story 87.X: Extend `sly.marketplaces` module with `verify`, `getLimits`
- [ ] Story 87.Y: Add `sly_marketplace_verify` MCP tool

## Scope

**In scope (v1):**

1. **KYM tier model.** Mirror Epic 73's structure but for marketplaces:

   | Tier | Name | Verification | Cross-tenant traffic | Explorer placement | On-chain mint |
   |---|---|---|---|---|---|
   | T0 | Registered | Self-attested + email | Internal-tenant only | Hidden | Disabled |
   | T1 | Declared | + operator profile, declared compliance posture | Inbound only (read) | Listed (unverified badge) | Disabled |
   | T2 | Verified | + KYB-equivalent (business reg, UBO, signatory ID, address) + 30-day uptime | Bidirectional | Verified badge, sortable | Enabled |
   | T3 | Trusted | + audited operator, kill-switch authority, BRQ active | Custom; can grant T2 to sub-marketplaces | Featured | Enabled, with attestations |

2. **`marketplace_kym_tiers` table** — read-mostly lookup, mirroring `tier_limits` from Epic 73. Stores per-tier configuration:
   - `cross_tenant_inbound_enabled BOOLEAN`
   - `cross_tenant_outbound_enabled BOOLEAN`
   - `explorer_visibility TEXT` ('hidden' | 'listed' | 'verified' | 'featured')
   - `onchain_mint_enabled BOOLEAN`
   - `max_agents INT` (nullable)
   - `dispute_threshold_pct NUMERIC` (auto-suspend if disputes exceed)

3. **`marketplaces.kym_tier` column** + `kym_status` (`'unverified'` | `'pending'` | `'verified'` | `'rejected'` | `'suspended'`).

4. **REST endpoints**:
   - `POST /v1/marketplaces/:id/verify` — submit verification (mock at first, partner-integrated later)
   - `GET /v1/marketplaces/:id/limits` — current effective KYM limits
   - `POST /admin/v1/marketplaces/:id/verify` — admin-only manual tier elevation (mirrors `/admin/v1/accounts/:id/verify`)

5. **Verification provider integration**:
   - Reuse Persona Starter (Epic 73 pilot) for KYB document verification
   - Sumsub for production-scale (Epic 73 scale)
   - Partner reliance for enterprise (mirrors Zindigi / ACBA pattern)

6. **Effective tier inheritance.** A marketplace's effective KYM tier is bounded by its owning tenant's verification tier:
   ```
   effective_kym = MIN(marketplace.kym_tier, owner_tenant.verification_tier)
   ```
   Mirrors the agent ↔ parent-account inheritance from Epic 73.

7. **Reputation hooks.** A marketplace's reputation score (separate from tier — reputation is dynamic, tier is gating) is derived from:
   - Uptime (last 30 days)
   - Dispute rate (escrow disputes / settled count)
   - Agent satisfaction (1-5 star average from agent off-boarding surveys)
   - Settlement success rate
   - Volume

   Reputation reads via existing `apps/api/src/services/reputation/` infrastructure, with a new `marketplace` source.

8. **Sly Console UI**: KYM verification flow in the Marketplaces tab. Document upload, verification status, badge display.

9. **Audit trail.** All tier transitions logged via existing `logAudit` utility.

**Out of scope (deferred):**

- On-chain MarketplaceRegistry mint (Epic 88) — KYM tier gates whether mint is enabled, but the mint itself is a separate epic
- Marketplace reputation rendering in the Explorer UI (Epic 90)
- Automated tier-suspension on dispute-threshold breach (v2)
- Cross-tier rebate / refund flows
- Insurance integration

## Stories

Each story spec lives in its own file at [`./stories/epic-87/`](./stories/epic-87/). See [`./stories/README.md`](./stories/README.md) for the convention.

### Phase 1: Schema Foundation — 6 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [87.1](./stories/epic-87/story-87.1-kym-tiers-lookup-table.md) | Migration — `marketplace_kym_tiers` Lookup Table | 3 | P0 | Planned |
| [87.2](./stories/epic-87/story-87.2-marketplaces-kym-columns.md) | Migration — `marketplaces` Column Additions | 3 | P0 | Planned |

### Phase 2: Verification API + Provider Integration — 26 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [87.3](./stories/epic-87/story-87.3-verify-endpoint-mock.md) | REST — `POST /v1/marketplaces/:id/verify` (Mock Provider) | 5 | P0 | Planned |
| [87.4](./stories/epic-87/story-87.4-persona-kyb-integration.md) | Persona Starter Integration for KYB Doc Verification | 8 | P1 | Planned |
| [87.5](./stories/epic-87/story-87.5-limits-effective-tier.md) | REST — `GET /v1/marketplaces/:id/limits` + Effective-Tier Computation | 5 | P0 | Planned |
| [87.6](./stories/epic-87/story-87.6-admin-verify-endpoint.md) | Admin Endpoint — `POST /admin/v1/marketplaces/:id/verify` | 5 | P0 | Planned |
| [87.7](./stories/epic-87/story-87.7-cross-tenant-gate-enforcement.md) | KYM Gate Enforcement on Cross-Tenant Queries | 5 | P0 | Planned |

### Phase 3: Reputation, Console, SDK — 21 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [87.8](./stories/epic-87/story-87.8-marketplace-reputation-source.md) | Reputation Source — `marketplace` | 5 | P1 | Planned |
| [87.9](./stories/epic-87/story-87.9-console-kym-verification-flow.md) | Sly Console — KYM Verification Flow | 8 | P1 | Planned |
| [87.10](./stories/epic-87/story-87.10-sdk-verify-getlimits.md) | SDK — `verify`, `getLimits` Methods | 5 | P0 | Planned |
| [87.11](./stories/epic-87/story-87.11-tier-transition-tests.md) | Tests — Tier Transitions, Inheritance, Cross-Tenant RLS | 3 | P0 | Planned |
| [87.12](./stories/epic-87/story-87.12-kym-documentation.md) | Documentation — PRD Master, Dashboard Help, SDK Reference | 3 | P2 | Planned |

**Total:** 58 points across 12 stories.

## Definition of Done

- [ ] `marketplace_kym_tiers` populated with T0–T3 configs
- [ ] Marketplaces table carries `kym_tier`, `kym_status`, `kym_metadata`
- [ ] Verification flow functional end-to-end (mock → Persona Starter)
- [ ] Effective-tier check works: a T2 marketplace under a T1 tenant computes as T1
- [ ] Cross-tenant queries (read agent / endpoint listings from another marketplace) gated by KYM tier
- [ ] Marketplace reputation score visible in API + UI
- [ ] Sly Console verification flow shipped
- [ ] SDK + MCP exposes verify + limits methods
- [ ] Tests cover RLS, tier transitions, inheritance, reputation aggregation
- [ ] Audit trail records every tier change

## Risks

- **Provider integration delay.** Persona Starter onboarding for KYB takes weeks. Mock the flow in v1 (admin-elevation only) so Epic 88+ can build on top; integrate provider later as a follow-up.
- **Tier inflation.** Self-attested T1 with no validation creates a soft trust signal. Mitigate by gating "Featured" Explorer placement at T2+ verified only.
- **Reputation gaming.** Marketplaces could selectively suspend agents to keep dispute rate down. Add monitoring for "abnormal suspension velocity" as a Phase 2 follow-up.

## References

- Epic 73 — KYC/KYA Tier Implementation (pattern reference)
- Epic 63 — External Reputation Bridge (composite score infrastructure)
- `MARKETPLACES_STRATEGY.md` — KYM section
