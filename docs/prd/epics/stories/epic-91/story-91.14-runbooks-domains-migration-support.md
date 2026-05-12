# Story 91.14: Runbooks — Custom Domains, Migration, Tier Downgrade, Support

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 5
**Priority:** P2
**Dependencies:** Stories 91.1–91.13 — runbooks are written last so they reflect the shipped behavior

---

Four runbooks under `docs/runbooks/`:

1. **`custom-domains.md`** — diagnosing customer DNS issues (CNAME wrong, DNSSEC, CAA records), force-reissuing a cert, removing a stuck domain. Step-by-step with copy-pasteable Cloudflare API commands.
2. **`marketplace-migration.md`** — managed → self-hosted (export config + state) and self-hosted → managed (import + provision). For partners who change their mind.
3. **`tier-downgrade.md`** — graceful KYM tier downgrade procedure when a payment fails or a customer cancels. Includes the auto-pause path from Story 91.10 and the manual reactivation procedure.
4. **`marketplace-support.md`** — support engineer playbook: "marketplace is down" triage, "settlements aren't appearing," "operator can't access their dashboard," common SQL queries with tenant_id filters.

## Acceptance

- [ ] All four runbooks committed under `docs/runbooks/`
- [ ] Each has a "When to use this runbook" header and a clear escalation path
- [ ] Custom-domains runbook covers the 3 most common failure modes Cloudflare for SaaS produces
- [ ] Support runbook cross-links to internal admin tools (admin dashboard, log search queries)
- [ ] PR template updated: provisioning-pipeline changes require a runbook update

## Technical notes

These runbooks must reflect actually-shipped behavior, not planned behavior — write them after Stories 91.1–91.13 are merged and verified in staging. Capture real failure modes from staging dogfooding rather than imagined ones. The custom-domains runbook in particular should be sourced from real support tickets accumulated during the beta. Keep copy-pasteable commands in fenced code blocks with explicit placeholders (`<MARKETPLACE_ID>`, `<HOSTNAME>`) so support engineers can paste-and-fill without parsing prose.

## Dependencies

Stories 91.1–91.13 — runbooks are written last so they reflect the shipped behavior.
