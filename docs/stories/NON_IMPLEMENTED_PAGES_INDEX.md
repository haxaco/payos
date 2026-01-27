# Non-Implemented Pages - Story Index

**Created:** 2026-01-02  
**Updated:** 2026-01-03  
**Status:** Ready for Gemini Implementation  
**Total Stories:** 6 (5 New Pages + 1 Bug Fix Batch)

---

## Overview

This document indexes all story documents created for non-implemented pages discovered during UI regression testing. Each story provides comprehensive details for Gemini to implement the frontend UI.

---

## Stories by Priority

### P0 - Bug Fixes (Fix First!)

These bugs are blocking user flows and must be fixed before implementing new pages:

#### **UI Bug Fixes - Batch 1**
- **File:** [`STORY_UI_BUG_FIXES_BATCH_1.md`](./STORY_UI_BUG_FIXES_BATCH_1.md)
- **Effort:** 2-3 days
- **Priority:** P0 (Critical)
- **Description:** 6 bugs discovered during regression testing
- **Bugs Included:**
  1. **Critical:** Agent Detail page crash (`parentAccount.id` undefined)
  2. **High:** X402 Endpoint Detail - missing Revenue/API calls
  3. **High:** Cards List - nested data display issues
  4. **Medium:** Compliance Flags - bad test data, Invalid Date
  5. **Medium:** Refunds - link goes to list, Invalid Date
  6. **Low:** ACP Checkouts - missing padding

---

### P2 - Detail Pages (User Flows)

These detail pages complete the user experience by providing in-depth views of specific entities:

#### 1. **Wallet Detail Page** 
- **File:** [`STORY_WALLET_DETAIL_PAGE.md`](./STORY_WALLET_DETAIL_PAGE.md)
- **Route:** `/dashboard/wallets/[id]`
- **Effort:** 3-5 days
- **Priority:** P2
- **Description:** Detailed view of a wallet including balance, transactions, spending policies, and analytics
- **Key Features:**
  - Balance overview with available/pending/reserved amounts
  - Transaction history with filtering and pagination
  - Spending policy visualization with progress bars
  - Quick actions: Deposit, Withdraw, Freeze
  - Related entities: Owner account, managing agent
- **APIs:** All exist, no backend work needed

#### 2. **Schedule Detail Page**
- **File:** [`STORY_SCHEDULE_DETAIL_PAGE.md`](./STORY_SCHEDULE_DETAIL_PAGE.md)
- **Route:** `/dashboard/schedules/[id]`
- **Effort:** 3-4 days
- **Priority:** P2
- **Description:** Detailed view of a recurring transfer schedule with execution history and upcoming transfers
- **Key Features:**
  - Countdown to next execution
  - Schedule configuration (frequency, timezone, retry settings)
  - Execution history with success/failure tracking
  - Upcoming transfers calendar
  - Analytics: Success rate, total transferred, failure analysis
- **APIs:** All exist, no backend work needed

#### 3. **Refund Detail Page**
- **File:** [`STORY_REFUND_DETAIL_PAGE.md`](./STORY_REFUND_DETAIL_PAGE.md)
- **Route:** `/dashboard/refunds/[id]`
- **Effort:** 2-3 days
- **Priority:** P2
- **Description:** Detailed view of a refund with status tracking and original transaction reference
- **Key Features:**
  - Refund status and timeline
  - Original transaction link (handles NULL gracefully)
  - Refund reason and details
  - Processing information (network, tx hash)
  - Actions: Cancel (if pending), Retry (if failed)
- **APIs:** All exist, no backend work needed

### P2 - Developer Resources

#### 4. **Agentic Payments Developers Page**
- **File:** [`STORY_DEVELOPERS_PAGE.md`](./STORY_DEVELOPERS_PAGE.md)
- **Route:** `/dashboard/agentic-payments/developers`
- **Effort:** 3-4 days
- **Priority:** P2
- **Description:** Centralized developer hub for x402, AP2, and ACP protocol integration
- **Key Features:**
  - Quick start guides for each protocol (x402, AP2, ACP)
  - API key management
  - SDK downloads (JS, Python, Go, Java)
  - Code examples with syntax highlighting
  - API reference table
  - Webhooks configuration
  - Developer tools (API explorer, sandbox, logs)
- **APIs:** Mostly content-based, minimal API integration

---

## Story Structure

Each story document includes:

### ✅ **User Story**
- As a [role], I want to [action], so that [benefit]

### ✅ **Background**
- Context about the feature
- Use cases
- Related concepts

### ✅ **Acceptance Criteria**
- Must Have (P0) - Core functionality
- Should Have (P1) - Enhanced features
- Could Have (P2) - Future enhancements

### ✅ **UI/UX Requirements**
- ASCII layout mockup
- Design system guidelines
- Responsive design requirements
- Color scheme and typography

### ✅ **API Integration**
- Endpoints to use with examples
- Request/response formats
- Authentication requirements

### ✅ **Data to Display**
- Database tables and columns
- Related entities
- Data transformations

### ✅ **Edge Cases & Error Handling**
- 404, 403, 500 scenarios
- Empty states
- Loading states
- Failure scenarios

### ✅ **Similar Pages for Reference**
- Existing pages to model after
- Reusable components
- Design patterns

### ✅ **Interactions & Actions**
- Primary actions (Edit, Delete, etc.)
- Secondary actions (Export, Share, etc.)
- Confirmation flows

### ✅ **Testing Checklist**
- Functional tests
- Edge case tests
- UI/UX tests

### ✅ **Implementation Notes**
- File structure
- Key dependencies
- State management patterns
- Code snippets

---

## Implementation Order Recommendation

### Phase 0: Bug Fixes (FIRST - 2-3 days)
**CRITICAL: Fix these before implementing new pages!**

0. **Bug Fixes Batch 1** (2-3 days)
   - Bug 4 (Agent Detail crash) - CRITICAL
   - Bug 1 (X402 missing data) - HIGH
   - Bug 3 (Cards nested data) - HIGH
   - Bug 2 (Compliance data) - MEDIUM
   - Bug 5 (Refunds link/date) - MEDIUM
   - Bug 6 (ACP padding) - LOW

### Phase 1: Detail Pages (Week 1-2)
1. **Refund Detail** (Easiest, 2-3 days)
   - Simplest data model
   - Fewer interactions
   - Good starting point

2. **Wallet Detail** (Medium, 3-5 days)
   - More complex with analytics
   - Multiple related entities
   - Spending policy visualization

3. **Schedule Detail** (Medium, 3-4 days)
   - Timeline and calendar views
   - Retry logic visualization
   - Upcoming predictions

### Phase 2: Developer Resources (Week 2-3)
4. **Developers Page** (Content-heavy, 3-4 days)
   - Mostly static content
   - Code examples and syntax highlighting
   - API key management

5. **Treasury Page** (P1 - 2-3 days)
   - Replace hardcoded data with API calls
   - Dashboard with real treasury accounts
   - Alerts and rebalancing UI

**Total Estimated Effort:** 14-20 days (3-4 weeks)

---

## Dependencies & Prerequisites

### ✅ Already Complete
- All API endpoints exist and are functional
- Authentication (JWT) working correctly
- Design system components available (`@sly/ui`)
- Routing structure in place
- Similar pages exist as references

### ⚠️ May Need
- Syntax highlighting library for Developers page (Prism.js or highlight.js)
- Chart library for analytics (Recharts - already used elsewhere)
- QR code library for wallet addresses (optional, P2)

---

## Design Consistency Guidelines

All pages should follow these patterns from existing pages:

### Layout
- **Max width:** `max-w-[1600px] mx-auto` (centered, responsive)
- **Padding:** `p-8` on main container
- **Spacing:** `space-y-6` between sections

### Cards
- **Background:** `bg-white dark:bg-gray-950`
- **Border:** `border border-gray-200 dark:border-gray-800`
- **Radius:** `rounded-xl` or `rounded-2xl`
- **Shadow:** `shadow-sm`

### Typography
- **Page Title:** `text-3xl font-bold`
- **Section Header:** `text-lg font-semibold`
- **Body:** `text-sm text-gray-600 dark:text-gray-400`
- **Amounts:** `text-2xl-4xl font-bold`

### Status Badges
- Use consistent color scheme:
  - **Success:** Green (#10B981)
  - **Warning:** Yellow (#F59E0B)
  - **Error:** Red (#EF4444)
  - **Info:** Blue (#3B82F6)
  - **Neutral:** Gray (#6B7280)

### Loading States
- Use `<CardListSkeleton>` or `<TableSkeleton>` components
- Shimmer effect on placeholders
- Graceful degradation

### Error States
- Toast notifications for actions
- Inline error messages for forms
- Empty states with illustrations and CTAs
- 404/403 pages with back navigation

---

## Related Documentation

- **Testing:** [`docs/testing/UI_REGRESSION_TEST_PLAN.md`](../testing/UI_REGRESSION_TEST_PLAN.md)
- **Fixes Applied:** [`docs/debugging/ALL_FIXES_APPLIED_SUMMARY.md`](../debugging/ALL_FIXES_APPLIED_SUMMARY.md)
- **Component Library:** `packages/ui/src/components/`
- **API Client:** `apps/web/src/lib/api-client.tsx`
- **Existing Pages:** `apps/web/src/app/dashboard/`

---

## Success Criteria

Each implemented page must:

- [ ] Load in <2 seconds
- [ ] Have zero runtime errors
- [ ] Be fully responsive (320px - 1920px)
- [ ] Support dark mode
- [ ] Be accessible (WCAG 2.1 AA)
- [ ] Have proper loading states
- [ ] Handle all edge cases gracefully
- [ ] Have working back navigation
- [ ] Support deep linking (shareable URLs)
- [ ] Display correct data from APIs

---

## Questions & Support

**For Gemini:**
- Review existing similar pages first (e.g., Account Detail, Agent Detail)
- Reuse existing components from `@sly/ui` package
- Follow TypeScript patterns from other pages
- Test with real API data using JWT authentication
- Ask questions if API response format is unclear

**For Review:**
- Check against story acceptance criteria
- Verify all edge cases handled
- Test on mobile, tablet, desktop
- Verify dark mode works
- Check accessibility with screen reader

---

## Story Status Tracking

### Bug Fixes (P0 - Fix First!)

| Story | Status | Priority | File | Notes |
|-------|--------|----------|------|-------|
| **Bug Fixes Batch 1** | ⏳ Todo | P0 | [`STORY_UI_BUG_FIXES_BATCH_1.md`](./STORY_UI_BUG_FIXES_BATCH_1.md) | 6 bugs discovered during regression |

### Bug Fix Details:

| Bug # | Page | Issue | Priority |
|-------|------|-------|----------|
| Bug 1 | X402 Endpoint Detail | Missing Revenue/API Calls display | High |
| Bug 2 | Compliance Flags | Bad test data, Invalid Date | Medium |
| Bug 3 | Cards List | Nested data, no Cards API | High |
| Bug 4 | Agent Detail | `parentAccount.id` undefined crash | **Critical** |
| Bug 5 | Refunds | Link to list not detail, Invalid Date | Medium |
| Bug 6 | ACP Checkouts | Missing padding/margin | Low |

### New Page Implementation

| Story | Status | Assignee | Start Date | Completion Date | Notes |
|-------|--------|----------|------------|-----------------|-------|
| Wallet Detail | ⏳ Todo | Gemini | - | - | Ready for implementation |
| Schedule Detail | ⏳ Todo | Gemini | - | - | Ready for implementation |
| Refund Detail | ⏳ Todo | Gemini | - | - | Ready for implementation |
| Developers Page | ⏳ Todo | Gemini | - | - | Ready for implementation |
| Treasury Page | ⏳ Todo | Gemini | - | - | **P1** - Currently hardcoded |

---

**All stories are complete and ready for Gemini to implement!** 🚀

Each story has been written with maximum detail to enable autonomous implementation without requiring additional clarification.

