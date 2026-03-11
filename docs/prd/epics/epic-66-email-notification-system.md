# Epic 66: Email Notification System

**Status:** In Progress (Tier 1 Done)
**Priority:** P1
**Total Points:** 35
**Linear Project:** [Epic 66](https://linear.app/sly-ai/project/epic-66-email-notification-system-4a8bb5cb1597)

## Overview

Full email notification system for all user-facing events. Uses Resend (from admin@getsly.ai) with a shared HTML layout, fire-and-forget sends, and recipient resolution helpers.

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| Email sending (internal) | No | - | - | Backend-only, no API surface |
| `GET/PATCH /v1/settings/notifications` | Yes | `sly.settings` | P2 | Story 66.7 |
| Unsubscribe endpoint | No | - | - | Token-based, no auth needed |

**SDK Stories Required:**
- [ ] Story 66.7: Add notification preferences to settings API

---

## Current State

10 email types implemented in `apps/api/src/services/email.ts`:

| # | Email | Subject | Trigger | Recipient |
|---|-------|---------|---------|-----------|
| 1 | Team Invite | "{name} invited you to join {org}" | Team invite sent | Invited email |
| 2 | Invite Accepted | "Welcome to {org} on Sly!" | Invite accepted | New member |
| 3 | Welcome | "Welcome to Sly" | Signup | New user |
| 4 | Transfer Completed | "Transfer of {amount} completed" | Internal transfer succeeds | Tenant owner/admins |
| 5 | Transfer Failed | "Transfer of {amount} failed" | Internal transfer fails | Tenant owner/admins |
| 6 | Account Locked | "Your account has been locked" | 5+ failed logins | Locked user |
| 7 | API Key Created | "New API key created" | API key created | Creator |
| 8 | API Key Revoked | "API key revoked" | API key revoked | Revoker |
| 9 | Role Changed | "Your role was changed to {role}" | Role updated | Affected user |
| 10 | Member Removed | "You've been removed from {org}" | Member removed | Removed user |

**Infrastructure:**
- Shared `emailLayout()` and `ctaButton()` helpers for consistent styling
- `sendEmail()` wrapper that handles Resend client + error logging
- `getUserEmail(userId)` — resolves email via Supabase Admin API
- `getNotificationRecipients(tenantId, roles)` — finds owner/admin emails for a tenant
- All sends are fire-and-forget (never block API responses)

---

## Stories

### Tier 1 — Done (5 pts)

| Story | Linear | Points | Status |
|-------|--------|--------|--------|
| 66.1: Tier 1 Email Templates & Wiring | [SLY-405](https://linear.app/sly-ai/issue/SLY-405) | 5 | Done |

### Tier 2 — Ship Soon (14 pts)

| Story | Linear | Points | Status |
|-------|--------|--------|--------|
| 66.2: Scheduled Transfer Emails | [SLY-406](https://linear.app/sly-ai/issue/SLY-406) | 3 | Backlog |
| 66.3: Settlement Completed/Failed Emails | [SLY-407](https://linear.app/sly-ai/issue/SLY-407) | 3 | Backlog |
| 66.4: Stream Health & Termination Emails | [SLY-408](https://linear.app/sly-ai/issue/SLY-408) | 3 | Backlog |
| 66.5: Compliance & Approval Emails | [SLY-409](https://linear.app/sly-ai/issue/SLY-409) | 5 | Backlog |

### Tier 3 & Infrastructure (16 pts)

| Story | Linear | Points | Status |
|-------|--------|--------|--------|
| 66.6: Agent, Wallet & Security Emails | [SLY-410](https://linear.app/sly-ai/issue/SLY-410) | 5 | Backlog |
| 66.7: Notification Preferences Backend | [SLY-411](https://linear.app/sly-ai/issue/SLY-411) | 8 | Backlog |
| 66.8: Unsubscribe Links & Email Footer | [SLY-412](https://linear.app/sly-ai/issue/SLY-412) | 3 | Backlog |

### Dependencies

- 66.8 depends on 66.7 (unsubscribe needs preferences backend)
- 66.2–66.5 are independent of each other
- 66.6 is independent but lower priority

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/services/email.ts` | All email functions + recipient helpers |
| `apps/api/src/routes/auth.ts` | Welcome + account locked wiring |
| `apps/api/src/routes/transfers.ts` | Transfer completed/failed wiring |
| `apps/api/src/routes/api-keys.ts` | API key created/revoked wiring |
| `apps/api/src/routes/organization-team.ts` | Role changed + member removed wiring |

## Design Decisions

1. **Fire-and-forget** — Email sends never block API responses. All wrapped in `.catch()`.
2. **No queue needed yet** — Resend inline is fine for current volume. Revisit at scale.
3. **No preferences yet** — Tier 1 emails always send. Opt-out comes with Story 66.7.
4. **Shared layout** — `emailLayout()` and `ctaButton()` ensure consistent branding across all emails.
5. **Recipient resolution** — `getNotificationRecipients()` queries user_profiles + Supabase Admin API to find owner/admin emails for tenant-wide notifications.
