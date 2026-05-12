# Story 95.1: Score Report Endpoint with Signature

**Status:** Planned
**Linear:** SLY-552
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 5
**Priority:** P0
**Dependencies:** Epic 63 (composite reader); Epic 93 (signing service)

---

```
GET /v1/agents/:id/score-report
```

Returns a structured breakdown of the composite identity score: per-component values (NFT base, KYA tier, age, receipts, dispute history) with weights, a list of risk factors (e.g. "3 disputes in last 30d", "no on-chain mint", "kyaTier=T1"), and an Ed25519 signature over the canonical bytes. Underwriters consume this as a single signed artifact.

## Acceptance

- [ ] Endpoint returns `{score, components[], risk_factors[], generated_at, signature, kid}`
- [ ] Canonicalization deterministic and documented (JCS-like, sorted keys)
- [ ] Signature uses the Sly platform signing key (reuse Epic 93's pattern + public key endpoint)
- [ ] Auth required: partner API key with explicit `credit:read` scope OR agent reading their own report
- [ ] Rate limited per partner key

## Technical notes

Reuse the canonicalization + signing infrastructure from Epic 93 (Story 93.3) — same primitive, distinct payload type. Score components must explicitly cite their source (e.g. "5 receipts in last 30d, weight=0.2") so an underwriter can challenge any factor. Avoid the regulated phrase "credit score" — call it a "score report" or "underwriting signal."

## Dependencies

Epic 63 (composite reader); Epic 93 (signing service).
