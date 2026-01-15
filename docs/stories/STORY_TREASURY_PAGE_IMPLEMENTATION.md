# Story: Treasury Page Implementation

**Story ID:** UI-TREASURY-IMPL  
**Priority:** P1  
**Assignee:** Gemini (Frontend)  
**Status:** Todo  
**Epic:** Treasury Management UI

---

## User Story

**As a** PayOS admin/operator  
**I want to** view real-time treasury data from the API  
**So that** I can manage liquidity, monitor float, and make informed rebalancing decisions

---

## Background

The Treasury page currently displays **hardcoded mock data**. It needs to be rewritten to:
- Fetch real data from the Treasury API
- Display actual balances, inflows, outflows
- Show real treasury accounts and transactions
- Enable alerts monitoring and rebalancing actions

### Current State (Hardcoded)
- Shows static $2.4M total float
- Static corridors list (ARG, COL, MEX, BRA)
- No API integration

### Target State (API-Driven)
- Fetches from `/v1/treasury/dashboard`
- Real account balances from `/v1/treasury/accounts`
- Real transactions from `/v1/treasury/transactions`
- Alerts from `/v1/treasury/alerts`
- Charts from `/v1/treasury/history`

---

## Available Treasury API Endpoints

The backend Treasury API is **fully implemented**. Use these endpoints:

### Dashboard & Analytics
```typescript
GET /v1/treasury/dashboard     // Comprehensive summary
GET /v1/treasury/exposure      // Currency exposure breakdown
GET /v1/treasury/runway        // Float runway analysis
GET /v1/treasury/velocity      // Settlement velocity metrics
GET /v1/treasury/history       // Historical balance data for charts
GET /v1/treasury/partners      // Float allocation by partner
```

### Accounts
```typescript
GET    /v1/treasury/accounts           // List all treasury accounts
POST   /v1/treasury/accounts           // Create treasury account
PATCH  /v1/treasury/accounts/:id       // Update account settings
```

### Transactions
```typescript
GET  /v1/treasury/transactions         // List transactions
POST /v1/treasury/transactions         // Record manual transaction
```

### Alerts
```typescript
GET  /v1/treasury/alerts               // List alerts
POST /v1/treasury/alerts/check         // Trigger alert check
POST /v1/treasury/alerts/:id/acknowledge  // Acknowledge alert
POST /v1/treasury/alerts/:id/resolve      // Resolve alert
```

### Rebalancing
```typescript
GET  /v1/treasury/recommendations         // Get recommendations
POST /v1/treasury/recommendations/generate  // Generate new ones
POST /v1/treasury/recommendations/:id/approve  // Approve
POST /v1/treasury/recommendations/:id/reject   // Reject
```

### Actions
```typescript
POST /v1/treasury/sync      // Sync balances from external rails
POST /v1/treasury/snapshot  // Take manual snapshot
```

---

## Acceptance Criteria

### Must Have (P0)

1. **Remove All Hardcoded Data**
   - [ ] Remove static `corridors` array
   - [ ] Remove hardcoded stats ($2.4M, $1.8M, etc.)
   - [ ] Fetch all data from Treasury API

2. **Dashboard Summary Card**
   - [ ] Fetch from `GET /v1/treasury/dashboard`
   - [ ] Display: Total Float, Inflows (24h), Outflows (24h), Net Flow
   - [ ] Show alerts count
   - [ ] Loading state with skeleton

3. **Treasury Accounts Table**
   - [ ] Fetch from `GET /v1/treasury/accounts`
   - [ ] Display: Rail, Currency, Balance (Total/Available/Pending/Reserved)
   - [ ] Status badge (active, inactive, suspended)
   - [ ] Utilization bar (current vs target balance)
   - [ ] Click to view account details/transactions
   - [ ] Empty state when no accounts

4. **Currency Exposure**
   - [ ] Fetch from `GET /v1/treasury/exposure`
   - [ ] Pie/donut chart showing currency breakdown
   - [ ] List view with amounts and percentages

5. **Active Alerts Section**
   - [ ] Fetch from `GET /v1/treasury/alerts?status=open`
   - [ ] Display severity badges (info, warning, critical)
   - [ ] Alert title and message
   - [ ] Action buttons: Acknowledge, Resolve
   - [ ] Empty state: "No active alerts"

6. **Sync/Refresh Button**
   - [ ] Call `POST /v1/treasury/sync` on click
   - [ ] Show loading spinner during sync
   - [ ] Success/error toast notification

### Should Have (P1)

7. **Balance History Chart**
   - [ ] Fetch from `GET /v1/treasury/history?days=30`
   - [ ] Line chart showing balance over time
   - [ ] Filter by rail, currency
   - [ ] Tooltip with date and exact balance

8. **Float Runway Analysis**
   - [ ] Fetch from `GET /v1/treasury/runway`
   - [ ] Display days of runway per rail/currency
   - [ ] Warning indicators for low runway

9. **Settlement Velocity**
   - [ ] Fetch from `GET /v1/treasury/velocity`
   - [ ] Display avg settlement time, throughput
   - [ ] Compare to targets

10. **Recent Transactions**
    - [ ] Fetch from `GET /v1/treasury/transactions?limit=10`
    - [ ] Display: Date, Type, Amount, Rail, Reference
    - [ ] Type badge (inbound, outbound, rebalance, fee, adjustment)
    - [ ] Link to view all transactions

11. **Rebalancing Recommendations**
    - [ ] Fetch from `GET /v1/treasury/recommendations?status=pending`
    - [ ] Display: Source → Target, Amount, Reason
    - [ ] Approve/Reject buttons with confirmation
    - [ ] Generate new recommendations button

### Could Have (P2)

12. **Advanced Features**
    - [ ] Manual transaction recording modal
    - [ ] Account settings update modal
    - [ ] Take snapshot button
    - [ ] Partner allocation view (`/v1/treasury/partners`)
    - [ ] Forecast visualization

---

## UI/UX Requirements

### Layout (Replace Current)

```
┌─────────────────────────────────────────────────────────────┐
│ Treasury                                    [Sync] [Snapshot]│
│ Manage liquidity and float across rails                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ Total Float│ │  Inflows   │ │ Outflows   │ │   Alerts   ││
│  │ $XXX,XXX   │ │  $XX,XXX   │ │  $XX,XXX   │ │     X      ││
│  │ ↑12% 7d   │ │   (24h)    │ │   (24h)    │ │  Open      ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘│
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Tabs: [Accounts] [Transactions] [Alerts] [Rebalancing]     │
│                                                               │
│  ┌───────────────────────────────────────────────────────────┐
│  │ Treasury Accounts                               [+ Add]  │
│  │ ┌─────────────────────────────────────────────────────┐ │
│  │ │ Rail       │ Currency │ Balance    │ Status │ Util  │ │
│  │ │ base_chain │ USDC     │ $500,000   │ Active │ ████░ │ │
│  │ │ circle_usdc│ USDC     │ $250,000   │ Active │ ███░░ │ │
│  │ │ wire       │ USD      │ $100,000   │ Active │ ██░░░ │ │
│  │ └─────────────────────────────────────────────────────┘ │
│  └───────────────────────────────────────────────────────────┘
│                                                               │
│  ┌───────────────────────┐  ┌───────────────────────────────┐
│  │ Currency Exposure     │  │ Balance History (30d)         │
│  │ [PIE CHART]          │  │ [LINE CHART]                  │
│  │ USDC: 75%            │  │                               │
│  │ USD:  20%            │  │                               │
│  │ EUR:   5%            │  │                               │
│  └───────────────────────┘  └───────────────────────────────┘
│                                                               │
│  ┌───────────────────────────────────────────────────────────┐
│  │ Active Alerts                              [Check Alerts] │
│  │ ┌───────────────────────────────────────────────────────┐│
│  │ │ ⚠️ WARNING: Low balance on wire/USD         [Ack][Res]││
│  │ │ ℹ️ INFO: Rebalance recommended for USDC     [Ack][Res]││
│  │ └───────────────────────────────────────────────────────┘│
│  └───────────────────────────────────────────────────────────┘
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Types (from API)

```typescript
// Dashboard Summary
interface DashboardSummary {
  totalBalance: number;
  inflows24h: number;
  outflows24h: number;
  netFlow24h: number;
  accountsCount: number;
  alertsCount: number;
}

// Treasury Account
interface TreasuryAccount {
  id: string;
  tenantId: string;
  rail: string;            // 'base_chain', 'circle_usdc', 'wire', 'pix', 'spei'
  currency: string;        // 'USDC', 'USD', 'BRL', 'MXN'
  externalAccountId?: string;
  accountName?: string;
  balanceTotal: number;
  balanceAvailable: number;
  balancePending: number;
  balanceReserved: number;
  minBalanceThreshold: number;
  targetBalance: number;
  maxBalance: number;
  status: 'active' | 'inactive' | 'suspended';
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Treasury Transaction
interface TreasuryTransaction {
  id: string;
  accountId: string;
  type: 'inbound' | 'outbound' | 'rebalance_in' | 'rebalance_out' | 'fee' | 'adjustment';
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  externalTxId?: string;
  description?: string;
  createdAt: string;
}

// Treasury Alert
interface TreasuryAlert {
  id: string;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  accountId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}
```

---

## Implementation Notes

### File Structure

```
apps/web/src/app/dashboard/treasury/
├── page.tsx              # Main treasury page (REPLACE CURRENT)
└── components/
    ├── DashboardStats.tsx
    ├── AccountsTable.tsx
    ├── TransactionsTable.tsx
    ├── AlertsList.tsx
    ├── CurrencyExposureChart.tsx
    ├── BalanceHistoryChart.tsx
    ├── RecommendationsList.tsx
    └── AddAccountModal.tsx
```

### State Management

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';

export default function TreasuryPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  // Fetch dashboard summary
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['treasury', 'dashboard'],
    queryFn: () => api!.treasury.getDashboard(),
    enabled: !!api,
  });

  // Fetch accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['treasury', 'accounts'],
    queryFn: () => api!.treasury.getAccounts(),
    enabled: !!api,
  });

  // Fetch alerts
  const { data: alerts } = useQuery({
    queryKey: ['treasury', 'alerts', 'open'],
    queryFn: () => api!.treasury.getAlerts({ status: 'open' }),
    enabled: !!api,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => api!.treasury.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries(['treasury']);
      toast.success('Balances synced successfully');
    },
  });

  // Handle double-nested API responses
  const dashboardData = dashboard?.data?.data || dashboard?.data || dashboard;
  const accountsData = Array.isArray(accounts?.data?.data) 
    ? accounts.data.data 
    : (Array.isArray(accounts?.data) ? accounts.data : []);
  const alertsData = Array.isArray(alerts?.data?.data)
    ? alerts.data.data
    : (Array.isArray(alerts?.data) ? alerts.data : []);

  return (
    // ... component JSX
  );
}
```

### API Client Extension

Add to `apps/web/src/lib/api-client.tsx`:

```typescript
// Treasury API methods
treasury: {
  getDashboard: () => fetchWithAuth('/v1/treasury/dashboard'),
  getExposure: () => fetchWithAuth('/v1/treasury/exposure'),
  getRunway: () => fetchWithAuth('/v1/treasury/runway'),
  getVelocity: () => fetchWithAuth('/v1/treasury/velocity'),
  getHistory: (params?: { rail?: string; currency?: string; days?: number }) => 
    fetchWithAuth('/v1/treasury/history', { params }),
  getPartners: () => fetchWithAuth('/v1/treasury/partners'),
  
  getAccounts: () => fetchWithAuth('/v1/treasury/accounts'),
  createAccount: (data: CreateAccountInput) => 
    fetchWithAuth('/v1/treasury/accounts', { method: 'POST', body: data }),
  updateAccount: (id: string, data: UpdateAccountInput) =>
    fetchWithAuth(`/v1/treasury/accounts/${id}`, { method: 'PATCH', body: data }),
  
  getTransactions: (params?: { accountId?: string; limit?: number; offset?: number }) =>
    fetchWithAuth('/v1/treasury/transactions', { params }),
  createTransaction: (data: CreateTransactionInput) =>
    fetchWithAuth('/v1/treasury/transactions', { method: 'POST', body: data }),
  
  getAlerts: (params?: { status?: string; severity?: string; limit?: number }) =>
    fetchWithAuth('/v1/treasury/alerts', { params }),
  checkAlerts: () => fetchWithAuth('/v1/treasury/alerts/check', { method: 'POST' }),
  acknowledgeAlert: (id: string) =>
    fetchWithAuth(`/v1/treasury/alerts/${id}/acknowledge`, { method: 'POST' }),
  resolveAlert: (id: string) =>
    fetchWithAuth(`/v1/treasury/alerts/${id}/resolve`, { method: 'POST' }),
  
  getRecommendations: (params?: { status?: string; limit?: number }) =>
    fetchWithAuth('/v1/treasury/recommendations', { params }),
  generateRecommendations: () =>
    fetchWithAuth('/v1/treasury/recommendations/generate', { method: 'POST' }),
  approveRecommendation: (id: string) =>
    fetchWithAuth(`/v1/treasury/recommendations/${id}/approve`, { method: 'POST' }),
  rejectRecommendation: (id: string) =>
    fetchWithAuth(`/v1/treasury/recommendations/${id}/reject`, { method: 'POST' }),
  
  sync: () => fetchWithAuth('/v1/treasury/sync', { method: 'POST' }),
  snapshot: () => fetchWithAuth('/v1/treasury/snapshot', { method: 'POST' }),
},
```

---

## Testing Checklist

- [ ] Dashboard stats load from API
- [ ] Accounts table displays real data
- [ ] Transactions list works
- [ ] Alerts display with actions
- [ ] Sync button triggers sync and refreshes data
- [ ] Charts render with historical data
- [ ] Rebalancing recommendations work
- [ ] All error states handled
- [ ] All loading states display skeletons
- [ ] Empty states show appropriate messages
- [ ] Responsive design works

---

## Current Test Data

The seed script creates:
- 3 Treasury Accounts:
  - `base_chain/USDC` - $500,000
  - `circle_usdc/USDC` - $250,000
  - `wire/USD` - $100,000
- Multiple Treasury Transactions per account

---

## Related Stories

- [STORY_TREASURY_DETAIL_PAGE] - Account detail view
- [STORY_TREASURY_ANALYTICS] - Advanced analytics

---

**Story Ready for Implementation:** ✅  
**Estimated Effort:** 3-5 days  
**Dependencies:** API Client extension for treasury methods



