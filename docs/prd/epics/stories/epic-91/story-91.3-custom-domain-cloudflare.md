# Story 91.3: Custom Domain Support — Cloudflare for SaaS

**Status:** Planned
**Epic:** [Epic 91 — Managed Marketplace Runtime](../../epic-91-managed-marketplace-runtime.md)
**Points:** 13
**Priority:** P1
**Dependencies:** Story 91.1 (hostname resolver reads from `marketplace_domains`), Story 91.2 (provision pipeline calls into custom-domain flow)

---

Let operators bring their own domain. Two paths:
1. **Sly subdomain (default)** — `<slug>.sly.market` set up instantly via a wildcard cert on the `*.sly.market` zone in Cloudflare.
2. **Custom domain** — operator points a CNAME at `cname.sly.market`; Sly auto-issues a TLS cert via Cloudflare for SaaS's Custom Hostnames API.

New table `marketplace_domains`:

```sql
CREATE TABLE marketplace_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id UUID NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  cloudflare_hostname_id TEXT,
  tls_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (tls_status IN ('pending', 'active', 'failed')),
  ssl_validation_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Backend integration:
- `POST /v1/marketplaces/:id/domains` — operator adds custom hostname; we call Cloudflare for SaaS API to register and start cert issuance.
- Cloudflare webhook → `POST /internal/webhooks/cloudflare/custom-hostname` updates `tls_status` to `active` when ACME completes.
- Existing Story 91.1 hostname resolver reads from `marketplace_domains` (not directly from `marketplaces.slug`).

## Acceptance

- [ ] Operator adds CNAME `marketplace.acme.example → cname.sly.market`, cert issues within 5 minutes
- [ ] Pre-cert-active state: hostname accessible via 503 with "TLS provisioning, retry in <X>" message — never serves cleartext
- [ ] Webhook is signature-verified before mutating `tls_status`
- [ ] Removing a domain via DELETE revokes the Cloudflare hostname entry and the cert
- [ ] Custom domains and Sly subdomains coexist on the same marketplace (multiple rows in `marketplace_domains`)
- [ ] Runbook published (Story 91.14) covering the 3 most common failure modes (CNAME wrong, DNSSEC issue, customer's CAA record blocking issuance)

## Technical notes

Cloudflare for SaaS Custom Hostnames API is the path of least resistance — Sly is the SaaS provider, customer's domain is the custom hostname, Cloudflare handles ACME + serves TLS at the edge. Auth to Cloudflare API uses a scoped API token (Custom Hostnames: Edit). Webhook secret stored in env, verified via HMAC. The webhook handler must be idempotent (Cloudflare can replay) — use `cloudflare_hostname_id` as the upsert key. Document the customer-side CNAME setup in the runbook; expect this to be the #1 support ticket source. Cross-reference Epic 67's deploy pattern — this work is orthogonal to Epic 67 (Railway-level) since Cloudflare sits in front of Railway.

## Dependencies

Story 91.1 (hostname resolver reads from `marketplace_domains`), Story 91.2 (provision pipeline calls into custom-domain flow).
