# Story 95.3: Partner SDK + Integration Guide

**Status:** Planned
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 8
**Priority:** P1
**Dependencies:** Story 95.1, Story 95.2, Story 95.7

---

A dedicated `sly.credit` module in the unified SDK (`@sly_ai/sdk`) with `scoreReport.get(agentId)`, `applications.create(...)`, `applications.update(...)`, `webhooks.subscribe(...)`. Plus a polished integration guide aimed at compute / API / fintech engineers who've never touched Sly before.

## Acceptance

- [ ] SDK methods typed against the canonical types
- [ ] Authentication uses partner API keys with `credit:read` / `credit:write` scopes
- [ ] Webhook signature verification helper in SDK
- [ ] Integration guide includes "5-minute" quickstart + full reference
- [ ] At least one external developer (non-pilot) reviews the guide and reports blockers

## Technical notes

The SDK is the partner-facing surface — invest in error messages, retries, and DX. Test the SDK against a sandbox tenant so partners can sign up and try the score-report flow without a pilot agreement.

## Dependencies

Story 95.1, Story 95.2, Story 95.7.
