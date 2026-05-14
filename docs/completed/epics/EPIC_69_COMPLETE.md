# Epic 69: A2A Result Acceptance & Quality Feedback — Complete

**Status:** ✅ Complete
**Completion Date:** March 2026
**Points Delivered:** 29
**Stories:** 7/7
**PRD Version:** v1.23; v1.28 (this backfill)
**Linear:** [Epic 69 project](https://linear.app/sly-ai/project/epic-69-a2a-result-acceptance)

## Summary

Added an acceptance gate to the A2A task flow so the caller can review work before payment is finalized. Quality feedback (satisfaction rating + numeric score) is recorded in `a2a_task_feedback`. Partial settlement is supported — provider opts in, caller pays a proportional amount for incomplete work. A review-timeout worker auto-fails unreviewed tasks (full refund to caller).

This epic closed the loop on Epic 58: the worker now does the work, the caller reviews it, the system pays based on the review. Reputation (Epic 63) consumes the feedback table as its "Service Quality" signal.

## Key Deliverables

- Acceptance gate pauses mandate resolution for caller review before settlement
- Quality feedback table: rating + numeric score + free-text
- Partial settlement: proportional payment when work is incomplete (provider must opt in)
- Review timeout worker: auto-fail unreviewed tasks after configurable window → refund
- 7 stories across 3 phases (Core Acceptance 13 pts, Feedback & Partial Settlement 13 pts, Query & Testing 8 pts)
- Linear: SLY-455 through SLY-461

## Source-of-Truth Files

- Epic spec: `docs/prd/epics/epic-69-a2a-result-acceptance.md`
- Code paths:
  - `apps/api/src/services/a2a/acceptance-gate.ts`
  - `apps/api/src/services/a2a/feedback.ts`
  - `apps/api/src/workers/a2a-review-timeout.ts`
  - `apps/api/src/routes/a2a-tasks.ts` (acceptance + feedback endpoints)
- Migrations: `apps/api/supabase/migrations/*a2a_task_feedback*.sql`
- Tests: `apps/api/tests/integration/a2a-acceptance.test.ts`

## Linear

- Project: [Epic 69 — A2A Result Acceptance](https://linear.app/sly-ai/project/epic-69-a2a-result-acceptance)
- Tickets: SLY-455 to SLY-461

## Follow-on Work

- External Reputation Bridge (Epic 63) Story 63.8 ingests `a2a_task_feedback` as "Service Quality" reputation dimension (15% weight)
- Flexible Skill Pricing (Epic 68 — 📋) will eventually reference acceptance-gate state for tiered pricing
- Proof of Work Foundation (Epic 97 — 📋) supersedes the acceptance gate's witness-mode HMAC with bilateral signed receipts; Epic 69's UI flow remains, the underlying proof primitive upgrades
