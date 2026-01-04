# Story: Schedule Detail Page

**Story ID:** UI-SCHEDULE-DETAIL  
**Priority:** P2  
**Assignee:** Gemini (Frontend)  
**Status:** Todo  
**Epic:** Transfer Scheduling UI

---

## User Story

**As a** PayOS user  
**I want to** view detailed information about a recurring transfer schedule  
**So that** I can monitor its execution history, upcoming transfers, and manage schedule settings

---

## Background

Transfer schedules enable automated recurring payments:
- **Payroll:** Salary payments every 2 weeks
- **Subscriptions:** Monthly service payments
- **Invoices:** Recurring vendor payments
- **Allowances:** Weekly or monthly transfers

Each schedule can have:
- Custom frequency (daily, weekly, biweekly, monthly, custom)
- Start and end dates
- Maximum occurrence limit
- Retry logic for failed transfers
- Timezone-aware scheduling

---

## Acceptance Criteria

### Must Have (P0)

1. **Route & Navigation**
   - [ ] Page accessible at `/dashboard/schedules/[id]`
   - [ ] Clicking schedule card from `/dashboard/schedules` navigates to detail page
   - [ ] Back button returns to schedules list
   - [ ] Share/copy schedule URL functionality

2. **Header Section**
   - [ ] Display schedule description/name
   - [ ] Display status badge (Active/Paused/Completed/Cancelled)
   - [ ] Display schedule type icon (payroll, subscription, etc.)
   - [ ] Next execution date/time (prominent, countdown)
   - [ ] Action buttons: Edit, Pause/Resume, Cancel, Execute Now

3. **Schedule Overview**
   - [ ] Total amount per transfer
   - [ ] Currency
   - [ ] Frequency (human-readable: "Every 2 weeks", "Monthly on 1st")
   - [ ] From account (link to account detail)
   - [ ] To account or payment method (link)
   - [ ] Started date
   - [ ] End date (if set)
   - [ ] Progress: X of Y transfers completed

4. **Schedule Configuration Card**
   - [ ] Frequency type (daily, weekly, monthly, custom)
   - [ ] Interval value (e.g., every 2 weeks)
   - [ ] Day of week (for weekly schedules)
   - [ ] Day of month (for monthly schedules)
   - [ ] Timezone
   - [ ] Max occurrences (if set)
   - [ ] Next execution timestamp
   - [ ] Last execution timestamp

5. **Retry Settings**
   - [ ] Retry enabled (yes/no)
   - [ ] Max retry attempts
   - [ ] Retry window (days)
   - [ ] Skip if rate changed > X%
   - [ ] Current retry count (if in retry)

6. **Execution History**
   - [ ] Paginated list of past executions
   - [ ] Filter by status (completed, failed, pending, skipped)
   - [ ] Filter by date range
   - [ ] Sort by date
   - [ ] Each execution shows:
     - Execution date/time
     - Attempt number (1st, 2nd retry, etc.)
     - Status badge (completed, failed, skipped)
     - Amount
     - Transfer ID (link to transfer detail)
     - Failure reason (if failed)
     - Duration
   - [ ] Empty state when no executions yet

7. **Upcoming Transfers**
   - [ ] List of next 5 scheduled executions
   - [ ] Show: date, amount, estimated time
   - [ ] Highlight next execution
   - [ ] Show if execution falls on holiday/weekend

### Should Have (P1)

8. **Analytics Section**
   - [ ] Success rate (% of successful executions)
   - [ ] Total amount transferred
   - [ ] Average transfer time
   - [ ] Execution timeline chart (30 days)
   - [ ] Failure analysis (top failure reasons)

9. **Quick Actions**
   - [ ] Skip next execution
   - [ ] Execute now (manual trigger)
   - [ ] Duplicate schedule
   - [ ] Export execution history (CSV/PDF)

10. **Related Information**
    - [ ] Initiated by (user/agent name)
    - [ ] Associated contracts/agreements
    - [ ] Linked payment methods
    - [ ] Webhook notifications (if configured)

11. **Activity Timeline**
    - [ ] Schedule created
    - [ ] Schedule paused/resumed
    - [ ] Schedule modified (what changed)
    - [ ] Failed execution alerts
    - [ ] Retry attempts

### Could Have (P2)

12. **Advanced Features**
    - [ ] Calendar view of executions (past and future)
    - [ ] Smart scheduling suggestions (avoid weekends/holidays)
    - [ ] Budget tracking (total vs. planned spend)
    - [ ] Notification preferences
    - [ ] Approval workflow (for high-value schedules)

---

## UI/UX Requirements

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ < Back to Schedules       [Edit] [Pause] [Cancel] [⋮]      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📅 Monthly Vendor Payment                                   │
│  ✅ Active  🔁 Recurring  💼 Business                        │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Next Execution       │  │ Amount                │        │
│  │ Jan 1, 2026          │  │ $1,500.00            │        │
│  │ in 3 days            │  │ per transfer         │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Tabs: [Overview] [History] [Analytics] [Settings]          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 Schedule Details                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ From:       Business Account (#12345)           [→]    ││
│  │ To:         Vendor Account (#67890)             [→]    ││
│  │ Frequency:  Monthly on the 1st                         ││
│  │ Started:    Jan 1, 2025                                ││
│  │ Timezone:   America/New_York (EST)                     ││
│  │ Progress:   12 of ∞ completed                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  🔄 Retry Configuration                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✅ Retry Enabled                                        ││
│  │ Max Attempts:  3                                        ││
│  │ Retry Window:  14 days                                  ││
│  │ Skip if rate:  >2% change                              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  📜 Recent Executions                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✅ Dec 1  Completed        $1,500.00    #TXN-789       ││
│  │ ✅ Nov 1  Completed        $1,500.00    #TXN-456       ││
│  │ ⚠️  Oct 1  Failed (retry)  $1,500.00    -              ││
│  │ ✅ Oct 2  Completed (2nd)  $1,500.00    #TXN-123       ││
│  └─────────────────────────────────────────────────────────┘│
│                      [View Full History]                     │
│                                                               │
│  🔮 Upcoming Transfers                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ → Jan 1, 2026  $1,500.00  (in 3 days)                  ││
│  │   Feb 1, 2026  $1,500.00  (in 34 days)                 ││
│  │   Mar 1, 2026  $1,500.00  (in 62 days)                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Design System

- **Primary Color:** Purple (#8B5CF6) for schedules
- **Success Color:** Green (#10B981) for completed
- **Warning Color:** Yellow (#F59E0B) for retrying
- **Danger Color:** Red (#EF4444) for failed/cancelled
- **Info Color:** Blue (#3B82F6) for upcoming
- **Cards:** White background, subtle shadow, rounded corners
- **Typography:**
  - Page title: 2xl, bold
  - Section headers: lg, semibold
  - Body text: sm, regular
  - Amounts: 2xl, bold
  - Countdown: xl, semibold
- **Icons:** Lucide React icons throughout
- **Badges:** Colored by status with icons

### Responsive Design

- **Desktop (>1024px):** 2-column layout, side-by-side cards
- **Tablet (768-1023px):** 1-column, stacked cards
- **Mobile (<768px):** Single column, simplified layout, sticky header

---

## API Integration

### Endpoints to Use

1. **Get Schedule Details**
   ```typescript
   GET /v1/transfer-schedules/{id}
   Response: {
     id, description, status, frequency, intervalValue,
     fromAccountId, toAccountId, amount, currency,
     startDate, endDate, maxOccurrences, occurrencesCompleted,
     nextExecution, lastExecution, timezone,
     retryEnabled, maxRetryAttempts, retryWindowDays, ...
   }
   ```

2. **Get Schedule Executions**
   ```typescript
   GET /v1/transfer-schedules/{id}/executions?page=1&limit=50
   Response: { data: [...executions], pagination: {...} }
   ```

3. **Get Upcoming Executions**
   ```typescript
   GET /v1/transfer-schedules/{id}/upcoming?count=5
   Response: { data: [...futureExecutions] }
   ```

4. **Update Schedule**
   ```typescript
   PATCH /v1/transfer-schedules/{id}
   Body: { description, amount, endDate, ... }
   ```

5. **Pause/Resume Schedule**
   ```typescript
   POST /v1/transfer-schedules/{id}/pause
   POST /v1/transfer-schedules/{id}/resume
   ```

6. **Cancel Schedule**
   ```typescript
   POST /v1/transfer-schedules/{id}/cancel
   ```

7. **Execute Now (Manual Trigger)**
   ```typescript
   POST /v1/transfer-schedules/{id}/execute
   ```

---

## Data to Display

### From `transfer_schedules` table:
- `id`, `description`
- `status` (active, paused, completed, cancelled)
- `from_account_id` (link to account)
- `to_account_id` (link to account)
- `to_payment_method_id` (alternative to account)
- `amount`, `currency`
- `frequency` (daily, weekly, biweekly, monthly, custom)
- `interval_value` (e.g., 2 for "every 2 weeks")
- `day_of_week` (for weekly)
- `day_of_month` (for monthly)
- `timezone`
- `start_date`, `end_date`
- `max_occurrences`, `occurrences_completed`
- `next_execution`, `last_execution`
- `retry_enabled`, `max_retry_attempts`, `retry_window_days`
- `initiated_by_type`, `initiated_by_id`, `initiated_by_name`
- `created_at`, `updated_at`

### Related Data:
- From account details (from `accounts` table)
- To account or payment method details
- Execution history (from `transfers` table with `schedule_id`)
- Failure reasons for failed executions

---

## Edge Cases & Error Handling

1. **Schedule Not Found**
   - Display: "Schedule not found" with link back to schedules list
   - Status code: 404

2. **Insufficient Permissions**
   - Display: "You don't have permission to view this schedule"
   - Status code: 403

3. **Cancelled Schedule**
   - Display prominent banner: "This schedule was cancelled on [date]"
   - Show cancellation reason (if provided)
   - Disable edit/pause actions
   - Show historical data only

4. **Completed Schedule**
   - Display info banner: "This schedule completed all [N] occurrences"
   - Show completion date
   - Offer "Create Similar Schedule" action

5. **Paused Schedule**
   - Display warning banner: "Schedule is paused"
   - Show pause reason and timestamp
   - Highlight "Resume" action

6. **Failed Execution in Retry**
   - Display warning: "Last execution failed, retry scheduled for [date]"
   - Show failure reason
   - Show retry attempt count (2 of 3)

7. **No Executions Yet**
   - Empty state: "No executions yet"
   - Message: "First execution scheduled for [date]"
   - Show countdown timer

8. **End Date Approaching**
   - Show info banner: "Schedule ends in X days"
   - Offer to extend end date

9. **Loading States**
   - Skeleton loaders for all sections
   - Shimmer effect on cards

10. **API Errors**
    - Toast notifications for errors
    - Retry buttons for failed requests
    - Graceful degradation

---

## Similar Pages for Reference

- **Account Detail Page:** `/dashboard/accounts/[id]`
  - Similar transaction history pattern
  - Use same card design
  
- **Transfer Detail Page:** `/dashboard/transfers/[id]`
  - Similar status badges
  - Use same timeline design

- **Schedules List:** `/dashboard/schedules`
  - Consistent status badges and filters

---

## Interactions & Actions

### Primary Actions

1. **Edit Schedule**
   - Opens modal/drawer
   - Fields: description, amount, end date, timezone
   - Validation: amount > 0, end date > next execution

2. **Pause Schedule**
   - Confirmation dialog
   - Optional: reason for pausing
   - Updates status to "paused"

3. **Resume Schedule**
   - Confirmation dialog
   - Recalculates next execution
   - Updates status to "active"

4. **Cancel Schedule**
   - Confirmation dialog with warning
   - Require reason (dropdown + text)
   - Irreversible action
   - Updates status to "cancelled"

5. **Execute Now**
   - Confirmation dialog
   - Warning: "This will create an immediate transfer"
   - Option: "Also execute next scheduled transfer as planned"

### Secondary Actions

1. **Skip Next Execution**
   - Confirmation dialog
   - Moves next execution to following interval

2. **Duplicate Schedule**
   - Opens create schedule form
   - Pre-filled with current schedule data
   - User can modify before saving

3. **Export History**
   - Dropdown: CSV, PDF
   - Downloads file with all executions

4. **View Transfer**
   - Clicking execution row navigates to transfer detail
   - Opens in same tab

---

## Testing Checklist

### Functional Tests

- [ ] Page loads with valid schedule ID
- [ ] All schedule data displays correctly
- [ ] Execution history loads and paginates
- [ ] Upcoming transfers calculated correctly
- [ ] Edit schedule updates successfully
- [ ] Pause/resume actions work
- [ ] Cancel action works and is irreversible
- [ ] Execute now creates immediate transfer
- [ ] Skip next updates next execution date
- [ ] Duplicate creates new schedule
- [ ] Export downloads file

### Edge Case Tests

- [ ] Invalid schedule ID shows 404
- [ ] Cancelled schedule shows warning
- [ ] Paused schedule shows resume button
- [ ] Completed schedule shows completion message
- [ ] Failed execution shows retry info
- [ ] No executions shows empty state
- [ ] API errors show appropriate messages

### UI/UX Tests

- [ ] Page is responsive on all screen sizes
- [ ] All interactive elements have hover states
- [ ] Loading states display during API calls
- [ ] Toasts appear for success/error actions
- [ ] Back button works correctly
- [ ] Countdown timer updates in real-time
- [ ] Deep linking works

---

## Implementation Notes

### File Structure

```
apps/web/src/app/dashboard/schedules/[id]/
├── page.tsx                  # Main schedule detail page
├── loading.tsx               # Loading state
├── error.tsx                 # Error boundary
└── components/
    ├── ScheduleHeader.tsx
    ├── ScheduleOverview.tsx
    ├── ScheduleConfig.tsx
    ├── RetrySettings.tsx
    ├── ExecutionHistory.tsx
    ├── UpcomingTransfers.tsx
    ├── AnalyticsSection.tsx
    ├── EditScheduleModal.tsx
    ├── CancelScheduleModal.tsx
    └── ExecuteNowModal.tsx
```

### Key Dependencies

```typescript
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, Button, Badge, Tabs } from '@payos/ui';
import { Calendar, Repeat, Pause, Play, X } from 'lucide-react';
```

### State Management

```typescript
const { id } = useParams();
const api = useApiClient();

// Fetch schedule details
const { data: schedule, isLoading } = useQuery({
  queryKey: ['schedule', id],
  queryFn: () => api.transferSchedules.get(id),
});

// Fetch executions
const { data: executions } = useQuery({
  queryKey: ['schedule', id, 'executions', page],
  queryFn: () => api.transferSchedules.listExecutions(id, { page }),
  enabled: !!schedule,
});

// Fetch upcoming
const { data: upcoming } = useQuery({
  queryKey: ['schedule', id, 'upcoming'],
  queryFn: () => api.transferSchedules.getUpcoming(id, { count: 5 }),
  enabled: !!schedule,
});
```

### Frequency Display Logic

```typescript
function formatFrequency(schedule) {
  switch (schedule.frequency) {
    case 'daily':
      return `Every ${schedule.intervalValue} day(s)`;
    case 'weekly':
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Every ${schedule.intervalValue} week(s) on ${days[schedule.dayOfWeek]}`;
    case 'monthly':
      return `Monthly on the ${schedule.dayOfMonth}${ordinalSuffix(schedule.dayOfMonth)}`;
    case 'custom':
      return 'Custom schedule';
  }
}
```

---

## Success Metrics

- [ ] Page loads in <2 seconds
- [ ] Zero runtime errors in production
- [ ] 100% test coverage for critical paths
- [ ] Accessible (WCAG 2.1 AA compliant)
- [ ] Mobile-responsive

---

## Related Stories

- [STORY_SCHEDULE_LIST_PAGE] - Schedules list (already implemented)
- [STORY_CREATE_SCHEDULE] - Create schedule modal
- [STORY_EDIT_SCHEDULE] - Edit schedule functionality

---

**Story Ready for Implementation:** ✅  
**Estimated Effort:** 3-4 days  
**Dependencies:** None (all APIs exist)

