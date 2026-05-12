# Epic 95: Agent FICO for B2B (Underwriting & Credit Lines)

**Status:** Discovery
**Phase:** TBD (Identity-First Demos / Future)
**Priority:** P2
**Dependencies:** Epic 63 (Reputation), Epic 73 (KYA), Epic 93 (Receipts), Epic 65 (Observability)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md)
**Created:** May 2026

---

## Summary

Productize Sly's composite identity score as the "FICO for AI agents" — used by real-world underwriters (compute providers, API gateways, fintechs, insurers) to extend credit, set rates, and manage agent risk. An AI agent applies for a $1k compute credit line; the lender checks the Sly score; approves at a rate calibrated to the score. Identity becomes the substrate for genuinely new economic territory.

## Motivation

Real businesses are starting to underwrite AI agents:

- Compute providers asking "do I extend pay-later terms to this agent?"
- API gateways setting per-agent rate limits dynamically
- Insurance companies thinking about agent-action insurance
- Fintechs sketching "agent merchant credit"

None of them have a credible signal today. Internal vendor scores are duplicative work. KYA tier alone is too coarse. Sly's composite score (Epic 63) — KYA + ERC-8004 + receipts + age + activity — is the most defensible signal that exists. Productizing it as an underwriting input is a real revenue surface.

This is the longest-shot epic in the platform plan but also the most distinctive — it's where Sly stops looking like "infrastructure for agentic commerce" and starts looking like "Equifax for AI agents."

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority |
|---|---|---|---|
| `POST /v1/credit/applications` | ✅ Yes | `sly.credit` (new) | P0 |
| `GET /v1/agents/:id/score-report` | ✅ Yes | `sly.credit` | P0 |
| Bulk score-report API for partners | ✅ Yes | `sly.credit` | P1 |

## Scope

**In scope (v1 — discovery + minimum viable product):**

1. **Score Report endpoint**: `GET /v1/agents/:id/score-report`
   - Returns composite score breakdown (NFT base, KYA tier, age, receipts, dispute history)
   - Includes risk factors ("3 disputes in last 30d", "no on-chain mint", "kyaTier=T1")
   - Signed by Sly platform key for tamper-evidence

2. **Credit Application flow** (admin-mediated v1):
   - `POST /v1/credit/applications` — partner submits an application on behalf of an underwriting decision
   - Sly returns a recommended credit-line range based on score
   - Adjudication happens off-Sly (partner decides)
   - Used as a pricing input by the partner

3. **Partner SDK / docs**: a clear integration guide for compute / API providers / fintechs that want to consume the score

4. **Pilot integrations**:
   - One compute provider (Akash / Modal) extending pay-later terms based on score
   - One insurance partner (TBD) sketching premium calculation

5. **Audit trail**: every score read against an agent is logged so the agent can request their own credit history.

6. **Score-change webhooks**: partners subscribe to events when an underwritten agent's score crosses a threshold.

**Out of scope (deferred):**

- Sly issues credit directly (we're the score, not the lender)
- Agent-to-agent credit (peer lending — separate product)
- Insurance products (we're a signal provider, not the insurer)
- Per-jurisdiction compliance (this gets regulatory fast — one jurisdiction at a time)

## Stories

Each story spec lives in its own file at [`./stories/epic-95/`](./stories/epic-95/). See [`./stories/README.md`](./stories/README.md) for the convention.

> **Discovery-phase caveat.** This epic depends on landing 1–2 pilot partners. Stories 95.4 and 95.5 in particular are scoped speculatively — pilot conversations will reshape the integration surface. Treat the point estimates as planning placeholders, not commitments. Block on partner conversation before significant build on Phase 2.

### Phase 1: Score Report Surface — 18 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [95.1](./stories/epic-95/story-95.1-score-report-endpoint.md) | Score Report Endpoint with Signature | 5 | P0 | Planned |
| [95.2](./stories/epic-95/story-95.2-credit-application-flow.md) | Credit Application Flow | 5 | P0 | Planned |
| [95.6](./stories/epic-95/story-95.6-audit-trail.md) | Audit Trail — Every Score Read Logged | 5 | P0 | Planned |
| [95.7](./stories/epic-95/story-95.7-score-change-webhooks.md) | Webhooks — Score-Change Events | 3 | P1 | Planned |

### Phase 2: Partner Pilots — 24 points

> **Pilot dependency warning.** Stories 95.3–95.5 cannot proceed without a signed pilot agreement. The scope below is the best guess pre-pilot; expect significant churn after the first pilot kickoff. If pilot conversations stall, descope this phase and ship Phase 1 + Phase 3 only.

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [95.3](./stories/epic-95/story-95.3-partner-sdk-integration-guide.md) | Partner SDK + Integration Guide | 8 | P1 | Planned |
| [95.4](./stories/epic-95/story-95.4-pilot-compute-provider.md) | Pilot Integration — Compute Provider | 8 | P2 | Discovery |
| [95.5](./stories/epic-95/story-95.5-pilot-insurance-fintech.md) | Pilot Integration — Insurance / Fintech | 8 | P2 | Discovery |

### Phase 3: Validation & Docs — 8 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [95.8](./stories/epic-95/story-95.8-tests-integration-coverage.md) | Tests + Integration Coverage | 5 | P0 | Planned |
| [95.9](./stories/epic-95/story-95.9-underwriter-integration-guide.md) | Documentation — Underwriter Integration Guide | 3 | P0 | Planned |

**Total:** ~50 points across 9 stories.

## Definition of Done

- [ ] Score Report endpoint live and signed
- [ ] At least one external partner consuming the score for live underwriting decisions
- [ ] Audit trail working
- [ ] Documentation published; partner integration guide reviewed by at least one external developer

## Risks

- **Regulatory exposure.** "Credit score" is a regulated term in most jurisdictions. Partner with legal early. Position as "underwriting signal" not "credit score" until cleared.
- **Pilot partner dependency.** This epic depends entirely on finding 1–2 willing pilot partners. Block on partner conversation before significant build.
- **Score gaming becomes high-stakes.** When credit is on the line, agents will try to game the score. Increases the importance of Epic 93 (receipts on-chain, hard to forge).

## References

- Epic 63 — External Reputation Bridge
- Epic 73 — KYA Tiers
- Equifax / Experian / FICO scoring methodology (analog)
- Open Banking / data-portability frameworks (regulatory precedent)
