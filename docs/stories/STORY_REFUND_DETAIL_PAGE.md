# Story: Refund Detail Page

**Story ID:** UI-REFUND-DETAIL  
**Priority:** P2  
**Assignee:** Gemini (Frontend)  
**Status:** Todo  
**Epic:** Refund Management UI

---

## User Story

**As a** PayOS user  
**I want to** view detailed information about a specific refund  
**So that** I can track its status, understand the refund reason, and see the original transaction

---

## Background

Refunds are created when transfers need to be reversed:
- **Customer Refunds:** Return payment to customer
- **Dispute Resolutions:** Refund after dispute settlement
- **Error Corrections:** Fix incorrect transfer amounts
- **Cancellations:** Cancel pending/processing transfers

Refunds can be:
- **Full:** Return entire original amount
- **Partial:** Return portion of original amount
- **Manual:** Created by admin/user
- **Automatic:** Created by system (disputes, etc.)

---

## Acceptance Criteria

### Must Have (P0)

1. **Route & Navigation**
   - [ ] Page accessible at `/dashboard/refunds/[id]`
   - [ ] Clicking refund row from `/dashboard/refunds` navigates to detail page
   - [ ] Back button returns to refunds list
   - [ ] Share/copy refund URL functionality

2. **Header Section**
   - [ ] Display refund ID (short format + copy button)
   - [ ] Display status badge (Pending/Completed/Failed)
   - [ ] Display refund type badge (Full/Partial)
   - [ ] Display amount (prominent)
   - [ ] Display currency
   - [ ] Action buttons: Cancel (if pending), Retry (if failed)

3. **Refund Overview**
   - [ ] Refund amount
   - [ ] Original transfer amount
   - [ ] Refund percentage (e.g., "50% of original")
   - [ ] From account (who is refunding)
   - [ ] To account (who receives refund)
   - [ ] Refund reason (category)
   - [ ] Reason details (description)
   - [ ] Current status
   - [ ] Processing timeline

4. **Original Transaction Card**
   - [ ] Link to original transfer (if available)
   - [ ] Original transfer ID
   - [ ] Original transfer date
   - [ ] Original transfer amount
   - [ ] Original transfer description
   - [ ] If no original transfer: Show "N/A" or "Direct Refund"

5. **Timeline Section**
   - [ ] Refund created (date/time, by whom)
   - [ ] Processing started (if applicable)
   - [ ] Completed date/time
   - [ ] Failed date/time (with reason)
   - [ ] Status changes history

6. **Processing Information**
   - [ ] Network/rail used (PIX, SPEI, Wire, etc.)
   - [ ] Transaction hash (if blockchain-based)
   - [ ] Processing time (duration)
   - [ ] Idempotency key (for retry safety)

7. **Failure Information** (if failed)
   - [ ] Failure reason
   - [ ] Error code
   - [ ] Failed timestamp
   - [ ] Retry count
   - [ ] Next retry date (if auto-retry enabled)
   - [ ] Manual retry button

### Should Have (P1)

8. **Related Information**
   - [ ] Associated dispute (if refund created from dispute)
   - [ ] Initiated by (user, agent, system)
   - [ ] Approval required (yes/no)
   - [ ] Approved by (if required)
   - [ ] Approval timestamp

9. **Financial Details**
   - [ ] Refund fees (if any)
   - [ ] FX rate (if currency conversion)
   - [ ] Net amount to recipient
   - [ ] Original fees (reference)

10. **Audit Trail**
    - [ ] All status changes with timestamps
    - [ ] Who performed each action
    - [ ] System events (retries, etc.)
    - [ ] Related webhook deliveries

11. **Actions**
    - [ ] Generate receipt/confirmation
    - [ ] Email refund confirmation
    - [ ] Export refund details (PDF)

### Could Have (P2)

12. **Advanced Features**
    - [ ] Communication thread with customer
    - [ ] Attached documentation (receipts, screenshots)
    - [ ] Internal notes (admin-only)
    - [ ] Related refunds (if multiple partial refunds)
    - [ ] Analytics: avg refund time, common reasons

---

## UI/UX Requirements

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ < Back to Refunds            [Cancel] [Retry] [Export] [⋮] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ↩️  Refund #REF-12345                                       │
│  ✅ Completed  💰 Full Refund                                │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Refund Amount        │  │ Original Amount       │        │
│  │ $500.00             │  │ $500.00              │        │
│  │ 100% of original    │  │                      │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Tabs: [Overview] [Timeline] [Details]                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 Refund Information                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ From:          Business Account (#12345)         [→]   ││
│  │ To:            Customer Account (#67890)         [→]   ││
│  │ Reason:        Customer Request                         ││
│  │ Description:   Product returned, full refund requested  ││
│  │ Status:        Completed                               ││
│  │ Network:       PIX                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  🔗 Original Transaction                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Transfer ID:   #TXN-98765                      [→]     ││
│  │ Date:          Dec 20, 2025                            ││
│  │ Amount:        $500.00 USDC                            ││
│  │ Description:   Payment for Product XYZ                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ⏱️  Processing Timeline                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✅ Dec 28, 10:00 AM  Refund Created                    ││
│  │                      by John Doe (Admin)               ││
│  │                                                         ││
│  │ ⏳ Dec 28, 10:01 AM  Processing Started                ││
│  │                                                         ││
│  │ ✅ Dec 28, 10:15 AM  Completed                         ││
│  │                      Processing time: 14 minutes       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Design System

- **Primary Color:** Orange (#F97316) for refunds
- **Success Color:** Green (#10B981) for completed
- **Warning Color:** Yellow (#F59E0B) for pending
- **Danger Color:** Red (#EF4444) for failed
- **Cards:** White background, subtle shadow, rounded corners
- **Typography:**
  - Page title: 2xl, bold
  - Section headers: lg, semibold
  - Body text: sm, regular
  - Amounts: 3xl, bold
- **Icons:** Lucide React icons throughout
- **Timeline:** Vertical line with checkpoints

### Responsive Design

- **Desktop (>1024px):** 2-column layout for cards
- **Tablet (768-1023px):** 1-column layout
- **Mobile (<768px):** Single column, simplified timeline

---

## API Integration

### Endpoints to Use

1. **Get Refund Details**
   ```typescript
   GET /v1/refunds/{id}
   Response: {
     id, status, amount, currency, reason, reasonDetails,
     fromAccountId, toAccountId, originalTransferId,
     network, txHash, idempotencyKey,
     createdAt, completedAt, failedAt, failureReason, ...
   }
   ```

2. **Get Original Transfer**
   ```typescript
   GET /v1/transfers/{originalTransferId}
   Response: { ...transferDetails }
   ```

3. **Get Refund Timeline**
   ```typescript
   GET /v1/refunds/{id}/timeline
   Response: { data: [...events] }
   ```

4. **Cancel Refund** (if pending)
   ```typescript
   POST /v1/refunds/{id}/cancel
   ```

5. **Retry Refund** (if failed)
   ```typescript
   POST /v1/refunds/{id}/retry
   ```

6. **Get Related Dispute** (if applicable)
   ```typescript
   GET /v1/disputes?refundId={id}
   Response: { data: [...disputes] }
   ```

---

## Data to Display

### From `refunds` table:
- `id`
- `status` (pending, completed, failed)
- `amount`, `currency`
- `reason` (customer_request, dispute, error, cancellation, etc.)
- `reason_details` (text description)
- `from_account_id` (link to account)
- `to_account_id` (link to account)
- `original_transfer_id` (link to transfer, can be NULL)
- `network`, `tx_hash`
- `idempotency_key`
- `created_at`, `completed_at`, `failed_at`
- `failure_reason`

### Related Data:
- Original transfer details (from `transfers` table)
- From account details (from `accounts` table)
- To account details (from `accounts` table)
- Related dispute (from `disputes` table)
- Timeline events (audit log or status history)

---

## Edge Cases & Error Handling

1. **Refund Not Found**
   - Display: "Refund not found" with link back to refunds list
   - Status code: 404

2. **Insufficient Permissions**
   - Display: "You don't have permission to view this refund"
   - Status code: 403

3. **No Original Transfer** (Direct Refund)
   - Show "N/A" or "Direct Refund (no original transfer)"
   - Explain: "This is a manual refund not linked to a specific transfer"

4. **Failed Refund**
   - Display prominent error banner with failure reason
   - Show error code for support reference
   - Offer "Retry" button if retryable
   - Show "Contact Support" if not retryable

5. **Pending Refund**
   - Display info banner: "Refund is being processed"
   - Show estimated completion time
   - Show "Cancel" button if cancellable

6. **Cancelled Refund**
   - Display: "Refund was cancelled on [date]"
   - Show cancellation reason
   - Show who cancelled it

7. **Partial Refund**
   - Clearly show: "Partial Refund (50% of original)"
   - Display both refund amount and original amount
   - Calculate and show percentage

8. **Loading States**
   - Skeleton loaders for all sections
   - Shimmer effect on cards

9. **API Errors**
   - Toast notifications for errors
   - Retry buttons for failed requests

---

## Similar Pages for Reference

- **Transfer Detail Page:** `/dashboard/transfers/[id]`
  - Similar layout and timeline
  - Use same status badges
  
- **Dispute Detail Page:** `/dashboard/disputes/[id]` (if exists)
  - Similar reason/resolution display
  
- **Refunds List:** `/dashboard/refunds`
  - Consistent status badges and filters

---

## Interactions & Actions

### Primary Actions

1. **Cancel Refund** (if status = pending)
   - Confirmation dialog
   - Warning: "This will permanently cancel the refund"
   - Require cancellation reason
   - Updates status to "cancelled"

2. **Retry Refund** (if status = failed)
   - Confirmation dialog
   - Check if retryable (some failures are permanent)
   - Creates new refund attempt
   - Preserves idempotency

3. **View Original Transfer**
   - Click link to navigate to transfer detail
   - Opens in same tab

4. **Generate Receipt**
   - Downloads PDF receipt with refund details
   - Includes company logo, refund ID, amounts, dates

### Secondary Actions

1. **Export Details**
   - Dropdown: PDF, JSON
   - Downloads file with all refund information

2. **Copy Refund ID**
   - Click to copy full refund ID
   - Show toast: "Refund ID copied!"

3. **Email Confirmation**
   - Opens modal to send refund confirmation
   - Fields: recipient email, custom message
   - Sends email with refund details

4. **Contact Support**
   - Opens support modal pre-filled with refund ID
   - For failed refunds that can't be retried

---

## Refund Reasons (Dropdown)

```typescript
const REFUND_REASONS = [
  'customer_request',      // Customer requested refund
  'duplicate',             // Duplicate payment
  'fraudulent',            // Fraudulent transaction
  'wrong_amount',          // Incorrect amount
  'wrong_recipient',       // Wrong recipient
  'product_not_delivered', // Product/service not delivered
  'product_defective',     // Product defective/not as described
  'dispute_resolution',    // Resolved via dispute
  'cancellation',          // Order cancelled
  'other'                  // Other reason (requires details)
];
```

---

## Testing Checklist

### Functional Tests

- [ ] Page loads with valid refund ID
- [ ] All refund data displays correctly
- [ ] Original transfer link works (if available)
- [ ] N/A shown when no original transfer
- [ ] Timeline renders correctly
- [ ] Cancel action works (pending refunds)
- [ ] Retry action works (failed refunds)
- [ ] Export downloads file
- [ ] Generate receipt creates PDF

### Edge Case Tests

- [ ] Invalid refund ID shows 404
- [ ] Failed refund shows error and retry button
- [ ] Pending refund shows progress indicator
- [ ] Cancelled refund shows cancellation info
- [ ] No original transfer shows N/A
- [ ] Partial refund shows percentage
- [ ] API errors show appropriate messages

### UI/UX Tests

- [ ] Page is responsive on all screen sizes
- [ ] All interactive elements have hover states
- [ ] Loading states display during API calls
- [ ] Toasts appear for success/error actions
- [ ] Back button works correctly
- [ ] Deep linking works

---

## Implementation Notes

### File Structure

```
apps/web/src/app/dashboard/refunds/[id]/
├── page.tsx                # Main refund detail page
├── loading.tsx             # Loading state
├── error.tsx               # Error boundary
└── components/
    ├── RefundHeader.tsx
    ├── RefundOverview.tsx
    ├── RefundInfo.tsx
    ├── OriginalTransfer.tsx
    ├── Timeline.tsx
    ├── FailureDetails.tsx
    ├── CancelRefundModal.tsx
    └── RetryRefundModal.tsx
```

### Key Dependencies

```typescript
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, Button, Badge } from '@payos/ui';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
```

### State Management

```typescript
const { id } = useParams();
const api = useApiClient();

// Fetch refund details
const { data: refund, isLoading } = useQuery({
  queryKey: ['refund', id],
  queryFn: () => api.refunds.get(id),
});

// Fetch original transfer (if available)
const { data: originalTransfer } = useQuery({
  queryKey: ['transfer', refund?.originalTransferId],
  queryFn: () => api.transfers.get(refund.originalTransferId),
  enabled: !!refund?.originalTransferId,
});

// Retry mutation
const retryMutation = useMutation({
  mutationFn: () => api.refunds.retry(id),
  onSuccess: () => {
    toast.success('Refund retry initiated');
    queryClient.invalidateQueries(['refund', id]);
  },
});
```

### Percentage Calculation

```typescript
function calculateRefundPercentage(refundAmount: number, originalAmount: number) {
  if (!originalAmount) return 'N/A';
  const percentage = (refundAmount / originalAmount) * 100;
  return `${percentage.toFixed(0)}% of original`;
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

- [STORY_REFUND_LIST_PAGE] - Refunds list (already implemented)
- [STORY_CREATE_REFUND] - Create refund modal
- [STORY_DISPUTE_RESOLUTION] - Link refunds to disputes

---

## Questions & Decisions

### Q: Can users create refunds from this page?
**A:** No. Refunds are created from the transfer detail page or refunds list. This page is view-only.

### Q: Should we show partial refund history for the same transfer?
**A:** Yes (P2). If original transfer has multiple partial refunds, show them in "Related Refunds" section.

### Q: What happens if refund is deleted?
**A:** Refunds should never be deleted, only cancelled. Archive old refunds if needed.

---

**Story Ready for Implementation:** ✅  
**Estimated Effort:** 2-3 days  
**Dependencies:** None (all APIs exist)

