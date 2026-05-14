# Epic 59: User Onboarding, SSO & Agent Self-Registration — Complete

**Status:** ✅ Complete
**Completion Date:** March 11, 2026
**Points Delivered:** 76 (originally scoped 69, expanded during build)
**Stories:** 16/16
**PRD Version:** v1.23 (committed); v1.28 (this backfill)

## Summary

Sly's user onboarding finally became production-quality. Pre-Epic-59, web signup created a Supabase auth user but never provisioned a tenant — users hit a dead-end after sign-up. Team invites had no UI flow. SSO was missing. Agents had no way to self-register without a human in the loop.

Epic 59 fixed all four. After this epic, a new fintech can sign up via Google or GitHub SSO, invite teammates, and have agents register themselves via an open `POST /v1/auth/agent-signup` endpoint — no manual intervention.

## Key Deliverables

- Fixed broken web signup (Supabase auth user + tenant provisioning now atomic)
- Team invite UI (accept-invite page + team management dashboard)
- Google + GitHub SSO via Supabase OAuth
- Agent self-registration endpoint
- 16 stories across 4 incremental phases

## Source-of-Truth Files

- Epic spec: `docs/prd/epics/epic-59-user-onboarding-sso-agent-signup.md`
- Code paths:
  - `apps/api/src/routes/auth.ts` (signup, agent-signup)
  - `apps/api/src/routes/team-invites.ts`
  - `apps/web/src/app/auth/*` (login, signup, callback)
  - `apps/web/src/app/team/*`
- Tests: `apps/api/tests/integration/auth-signup.test.ts`

## Linear

- Project: closed during the Epic 59 sprint (pre-Epic-66 era)

## Follow-on Work

- Production Environment Mode (separates sandbox/production): Epic 67 (📋 — drives a re-architecting of the signup flow per environment)
- API Key Security enhancements: Epic 24 (📋)
- X (Twitter) SSO as third provider: Epic 76 (📋)
- Email Notification System (welcome emails, etc.): Epic 66 (🚧)
