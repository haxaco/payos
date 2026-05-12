# Story 95.4: Pilot Integration — Compute Provider

**Status:** Discovery
**Epic:** [Epic 95 — Agent FICO for B2B](../../epic-95-agent-fico-for-b2b.md)
**Points:** 8
**Priority:** P2
**Dependencies:** Story 95.1, Story 95.2, Story 95.3, Story 95.6, Story 95.7. Pilot partner conversation must precede start of work.

---

Land + ship a working pilot with one compute provider (Akash, Modal, Replicate, or equivalent) where the partner extends pay-later compute terms to AI agents based on Sly score. Sly's commitment: score report endpoint + webhook integration + co-marketing. Partner's commitment: real underwriting decisions on real agents.

## Acceptance

- [ ] Signed pilot agreement covering scope, data-handling, exit terms
- [ ] Partner consumes the score report on at least 50 agents in production
- [ ] At least one credit extension granted based on Sly score
- [ ] Joint case study / blog post drafted
- [ ] Post-mortem doc on what partner asked for that v1 didn't have

## Technical notes

Expect the partner to ask for fields we don't have (e.g. "spend velocity," "category preference"). Capture asks in the post-mortem and feed into future epics rather than scope-creeping this one.

## Dependencies

Story 95.1, Story 95.2, Story 95.3, Story 95.6, Story 95.7. Pilot partner conversation must precede start of work.
