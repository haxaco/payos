# Story 95.9: Documentation — Underwriter Integration Guide

**Status:** Planned
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 3
**Priority:** P0
**Dependencies:** Story 95.1, Story 95.2, Story 95.3

---

Public guide for "I want to underwrite AI agents using Sly score." Audience: backend / fintech engineers at potential partner orgs. Covers data model, endpoints, signature verification, webhook handling, audit expectations, and the legal positioning.

## Acceptance

- [ ] Guide published at `docs/guides/integrations/underwriting.md`
- [ ] Includes a sample partner integration in a non-Sly stack (Node or Python)
- [ ] Calls out the regulatory positioning explicitly ("signal provider, not credit bureau")
- [ ] Links to pilot case study (95.4) when available
- [ ] At least one external developer reviews and reports blockers

## Technical notes

Keep the guide vendor-neutral so it reads convincingly to compute, insurance, and fintech partners — pull pilot specifics into linked case studies (95.4) rather than inlining one partner's flow. Mirror the structure of existing `docs/guides/integrations/` pages for consistency. The regulatory framing ("signal provider, not credit bureau") should appear in the first screenful, not buried — it sets reader expectations and protects Sly.

## Dependencies

Story 95.1, Story 95.2, Story 95.3.
