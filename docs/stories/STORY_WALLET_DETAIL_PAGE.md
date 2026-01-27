# Story: Wallet Detail Page

**Story ID:** UI-WALLET-DETAIL  
**Priority:** P2  
**Assignee:** Gemini (Frontend)  
**Status:** Todo  
**Epic:** Wallet Management UI

---

## User Story

**As a** PayOS user  
**I want to** view detailed information about a specific wallet  
**So that** I can monitor its balance, transaction history, spending policies, and manage wallet settings

---

## Background

Wallets are blockchain-based accounts that can hold stablecoins (USDC, EURC) and are used for:
- x402 API micropayments
- Agent-managed spending
- Business operations
- Personal daily spending

Each wallet can be:
- **Internal** (PayOS custodial)
- **Circle** (Circle API custodial)
- **External** (user's own wallet, view-only)

---

## Acceptance Criteria

### Must Have (P0)

1. **Route & Navigation**
   - [ ] Page accessible at `/dashboard/wallets/[id]`
   - [ ] Clicking wallet card from `/dashboard/wallets` navigates to detail page
   - [ ] Back button returns to wallets list
   - [ ] Share/copy wallet URL functionality

2. **Header Section**
   - [ ] Display wallet name
   - [ ] Display wallet type badge (Internal/Circle/External)
   - [ ] Display wallet status badge (Active/Frozen/Depleted)
   - [ ] Display blockchain network (base-mainnet, etc.)
   - [ ] Display wallet address (truncated with copy button)
   - [ ] Action buttons: Edit, Freeze/Unfreeze, Deposit, Withdraw

3. **Balance Overview**
   - [ ] Current balance (large, prominent)
   - [ ] Currency (USDC/EURC)
   - [ ] Available balance
   - [ ] Pending transactions amount
   - [ ] Reserved amount (if any)
   - [ ] Last sync timestamp (for external wallets)

4. **Wallet Information Card**
   - [ ] Owner account (link to account detail)
   - [ ] Managed by agent (if applicable, link to agent detail)
   - [ ] Purpose/description
   - [ ] Created date
   - [ ] Last updated date
   - [ ] Provider (PayOS/Circle/External)
   - [ ] Verification status
   - [ ] KYC/AML status (if applicable)

5. **Transaction History**
   - [ ] Paginated list of wallet transactions
   - [ ] Filter by type (deposit, withdrawal, payment, refund)
   - [ ] Filter by date range
   - [ ] Search by transaction ID or description
   - [ ] Sort by date, amount
   - [ ] Each transaction shows:
     - Date/time
     - Type (with icon)
     - Description
     - Amount (+ green for deposits, - red for withdrawals)
     - Status badge
     - Link to transaction detail
   - [ ] Empty state when no transactions

6. **Spending Policy** (if configured)
   - [ ] Display spending limits:
     - Per transaction limit
     - Daily limit
     - Monthly limit
   - [ ] Current spending used (progress bars)
   - [ ] Reset periods
   - [ ] Edit spending policy button (if permitted)

7. **Analytics Section**
   - [ ] 7-day balance trend chart
   - [ ] 30-day transaction volume
   - [ ] Top transaction types (pie chart)
   - [ ] Average transaction size

### Should Have (P1)

8. **Quick Actions**
   - [ ] Quick deposit modal
   - [ ] Quick withdraw modal
   - [ ] Quick transfer to another wallet
   - [ ] Export transaction history (CSV/PDF)

9. **Related Entities**
   - [ ] List of agents with access to this wallet
   - [ ] List of x402 endpoints using this wallet
   - [ ] List of active streams funded by this wallet

10. **Activity Timeline**
    - [ ] Recent wallet events (created, frozen, unfrozen, policy changed)
    - [ ] System events (sync completed, low balance alert)

### Could Have (P2)

11. **Advanced Features**
    - [ ] QR code for wallet address
    - [ ] Webhook configuration for wallet events
    - [ ] Integration with Circle API (for Circle wallets)
    - [ ] Blockchain explorer link
    - [ ] Gas fee history (for external wallets)

---

## UI/UX Requirements

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ < Back to Wallets         [Edit] [Freeze] [Deposit] [⋮]    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  💼 Business Operations Wallet                               │
│  🏷️ Internal  ✅ Active  🔗 base-mainnet                    │
│  Address: 0x1234...5678 [📋]                                 │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Current Balance      │  │ Available            │        │
│  │ $5,000.00 USDC      │  │ $4,800.00           │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Tabs: [Overview] [Transactions] [Analytics] [Settings]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 Wallet Information                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Owner:      Business Account (#12345)            [→]   ││
│  │ Managed By: Payment Agent                        [→]   ││
│  │ Purpose:    Business payments and collections          ││
│  │ Created:    Dec 15, 2025                               ││
│  │ Provider:   PayOS                                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  💳 Spending Policy                                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Per Transaction: $1,000 / $2,000  [████████░░] 50%    ││
│  │ Daily Limit:     $5,000 / $10,000 [██████░░░░] 50%    ││
│  │ Monthly Limit:   $50K / $100K     [████░░░░░░] 40%    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  📜 Recent Transactions                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⬇️  Dec 29  Deposit from Circle        +$1,000.00     ││
│  │ ⬆️  Dec 28  x402 API Payment            -$0.05         ││
│  │ ⬆️  Dec 27  Transfer to Vendor          -$500.00       ││
│  └─────────────────────────────────────────────────────────┘│
│                         [View All Transactions]              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Design System

- **Primary Color:** Blue (#3B82F6) for balances, charts
- **Success Color:** Green (#10B981) for deposits, positive values
- **Danger Color:** Red (#EF4444) for withdrawals, warnings
- **Cards:** White background, subtle shadow, rounded corners
- **Typography:** 
  - Page title: 2xl, bold
  - Section headers: lg, semibold
  - Body text: sm, regular
  - Balances: 3xl-4xl, bold
- **Icons:** Lucide React icons throughout
- **Charts:** Recharts library for visualizations

### Responsive Design

- **Desktop (>1024px):** 2-column layout for cards, full-width charts
- **Tablet (768-1023px):** 1-column layout, stacked cards
- **Mobile (<768px):** Single column, simplified charts, sticky header

---

## API Integration

### Endpoints to Use

1. **Get Wallet Details**
   ```typescript
   GET /v1/wallets/{id}
   Response: {
     id, name, balance, currency, status, walletType, 
     ownerAccountId, managedByAgentId, purpose, 
     walletAddress, network, provider, spendingPolicy, ...
   }
   ```

2. **Get Wallet Transactions**
   ```typescript
   GET /v1/wallets/{id}/transactions?page=1&limit=50
   Response: { data: [...transactions], pagination: {...} }
   ```

3. **Get Wallet Analytics**
   ```typescript
   GET /v1/wallets/{id}/analytics?period=30d
   Response: { balanceHistory, transactionVolume, ... }
   ```

4. **Update Wallet**
   ```typescript
   PATCH /v1/wallets/{id}
   Body: { name, purpose, spendingPolicy, ... }
   ```

5. **Freeze/Unfreeze Wallet**
   ```typescript
   POST /v1/wallets/{id}/freeze
   POST /v1/wallets/{id}/unfreeze
   ```

---

## Data to Display

### From `wallets` table:
- `id`, `name`, `purpose`
- `balance` (balance field or balance_total)
- `currency` (USDC, EURC)
- `wallet_address`, `network`
- `wallet_type` (internal, circle_custodial, external)
- `status` (active, frozen, depleted)
- `owner_account_id` (link to account)
- `managed_by_agent_id` (link to agent)
- `spending_policy` (JSON with limits)
- `provider`, `provider_wallet_id`
- `verification_status`, `kyc_status`, `aml_cleared`
- `created_at`, `updated_at`, `last_synced_at`

### Related Data:
- Owner account details (from `accounts` table)
- Managing agent details (from `agents` table)
- Transaction history (from appropriate transaction tables)
- x402 endpoints using this wallet (from `x402_endpoints` table)

---

## Edge Cases & Error Handling

1. **Wallet Not Found**
   - Display: "Wallet not found" with link back to wallets list
   - Status code: 404

2. **Insufficient Permissions**
   - Display: "You don't have permission to view this wallet"
   - Status code: 403

3. **External Wallet Sync Failure**
   - Show warning banner: "Last sync failed X minutes ago"
   - Display last known balance with timestamp
   - Offer "Retry Sync" button

4. **Frozen Wallet**
   - Display prominent warning banner
   - Show frozen reason and timestamp
   - Offer "Request Unfreeze" action (if permitted)

5. **Depleted Wallet**
   - Display info banner: "Balance is $0"
   - Highlight "Deposit" action

6. **No Transactions**
   - Empty state with illustration
   - Message: "No transactions yet"
   - CTA: "Make your first deposit"

7. **Loading States**
   - Skeleton loaders for all data sections
   - Shimmer effect on cards

8. **API Errors**
   - Toast notifications for errors
   - Retry buttons for failed requests
   - Graceful degradation (show cached data if available)

---

## Similar Pages for Reference

- **Account Detail Page:** `/dashboard/accounts/[id]`
  - Similar layout with balance overview and transaction history
  - Use same card design patterns
  
- **Agent Detail Page:** `/dashboard/agents/[id]`
  - Similar header with status badges
  - Use same tab navigation pattern

- **Cards Page:** `/dashboard/cards`
  - Similar transaction list design
  - Use same filter/search patterns

---

## Interactions & Actions

### Primary Actions

1. **Edit Wallet**
   - Opens modal/drawer
   - Fields: name, purpose
   - Validation: name required, max 100 chars

2. **Freeze/Unfreeze**
   - Confirmation dialog
   - Show warning about impact
   - Require reason for freezing

3. **Deposit**
   - Opens deposit modal
   - Fields: amount, source
   - Validation: amount > 0, within limits

4. **Withdraw**
   - Opens withdrawal modal
   - Fields: amount, destination
   - Validation: amount ≤ available balance

5. **Copy Address**
   - Click to copy wallet address
   - Show toast: "Address copied!"

### Secondary Actions

1. **Export Transactions**
   - Dropdown: CSV, PDF, JSON
   - Opens modal to select date range
   - Downloads file

2. **View on Explorer**
   - Opens blockchain explorer in new tab
   - Link: `https://basescan.org/address/{address}`

3. **Configure Webhook**
   - Opens webhook config modal
   - Fields: URL, events to listen for

---

## Testing Checklist

### Functional Tests

- [ ] Page loads with valid wallet ID
- [ ] All wallet data displays correctly
- [ ] Transaction list loads and paginates
- [ ] Charts render with correct data
- [ ] Edit wallet updates successfully
- [ ] Freeze/unfreeze actions work
- [ ] Deposit/withdraw modals open and function
- [ ] Copy address copies to clipboard
- [ ] Export transactions downloads file
- [ ] Links to related entities navigate correctly

### Edge Case Tests

- [ ] Invalid wallet ID shows 404
- [ ] Frozen wallet shows warning
- [ ] External wallet sync failure handled
- [ ] Empty transaction list shows empty state
- [ ] API errors show appropriate messages

### UI/UX Tests

- [ ] Page is responsive on mobile, tablet, desktop
- [ ] All interactive elements have hover states
- [ ] Loading states display during API calls
- [ ] Toasts appear for success/error actions
- [ ] Back button works correctly
- [ ] Deep linking works (can share wallet URL)

---

## Implementation Notes

### File Structure

```
apps/web/src/app/dashboard/wallets/[id]/
├── page.tsx              # Main wallet detail page
├── loading.tsx           # Loading state
├── error.tsx             # Error boundary
└── components/
    ├── WalletHeader.tsx
    ├── BalanceOverview.tsx
    ├── WalletInfo.tsx
    ├── SpendingPolicy.tsx
    ├── TransactionList.tsx
    ├── AnalyticsCharts.tsx
    ├── EditWalletModal.tsx
    ├── DepositModal.tsx
    └── WithdrawModal.tsx
```

### Key Dependencies

```typescript
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, Button, Badge, Tabs } from '@sly/ui';
import { Wallet, TrendingUp, Copy, Edit, Freeze } from 'lucide-react';
```

### State Management

```typescript
const { id } = useParams();
const api = useApiClient();

// Fetch wallet details
const { data: wallet, isLoading } = useQuery({
  queryKey: ['wallet', id],
  queryFn: () => api.wallets.get(id),
});

// Fetch transactions
const { data: transactions } = useQuery({
  queryKey: ['wallet', id, 'transactions', page],
  queryFn: () => api.wallets.listTransactions(id, { page }),
  enabled: !!wallet,
});
```

---

## Success Metrics

- [ ] Page loads in <2 seconds
- [ ] Zero runtime errors in production
- [ ] 100% test coverage for critical paths
- [ ] Accessible (WCAG 2.1 AA compliant)
- [ ] Mobile-responsive (works on 320px width)

---

## Related Stories

- [STORY_WALLET_LIST_PAGE] - Wallet list page (already implemented)
- [STORY_DEPOSIT_MODAL] - Deposit functionality
- [STORY_WITHDRAW_MODAL] - Withdrawal functionality
- [STORY_WALLET_ANALYTICS] - Analytics dashboard

---

## Questions & Decisions

### Q: Should we show blockchain transaction history?
**A:** Yes, for external wallets. For internal wallets, show PayOS transaction history.

### Q: Can users delete wallets?
**A:** No. Wallets can only be frozen/archived. Add "Archive" action in future if needed.

### Q: Should we support multiple currencies in one wallet?
**A:** Not in v1. Each wallet holds a single currency (USDC or EURC).

---

## Screenshots / Mockups

*To be added by designer*

---

**Story Ready for Implementation:** ✅  
**Estimated Effort:** 3-5 days  
**Dependencies:** None (all APIs exist)



