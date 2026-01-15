# Epic 42: Frontend Dashboard Integration

**Status:** Planning  
**Phase:** 3.5 (External Integrations)  
**Priority:** P0  
**Estimated Points:** 65  
**Stories:** 0/19  
**Dependencies:** Epic 40 (Complete), Epic 41 (On-Ramp - parallel)  
**Created:** January 5, 2026

[← Back to Epic List](./README.md)

---

## Overview

Integrate Epic 40 backend capabilities into existing dashboard UI. This epic **enhances existing pages** rather than creating new ones, connecting the frontend to real Circle, blockchain, and protocol data.

**Goal:** Transform the dashboard from mock/internal data to real sandbox data from Circle Web3 Services, x402.org, and compliance screening.

**Key Deliverables:**
- Real blockchain balances on wallet cards
- FX quote preview with fee breakdown in transfer form
- Settlement timeline for Pix/SPEI payouts
- Compliance screening interface
- AP2 mandate actions (activate, suspend, revoke)

---

## Architecture: Epic 40 to UI Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EPIC 40 BACKEND (Complete)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  /v1/wallets/:id/balance   │  Real blockchain balance from Circle Web3     │
│  /v1/wallets/:id/verify    │  BYOW EIP-191 signature verification          │
│  /v1/quotes/fx             │  Live FX rates with fee breakdown             │
│  /v1/quotes/fx/corridors   │  Supported currency pairs                     │
│  /v1/settlement/pix|spei   │  Circle Pix/SPEI payout tracking              │
│  /v1/compliance/screen/*   │  Wallet, entity, bank screening               │
│  /v1/ap2/mandates/:id/*    │  Activate, suspend, revoke mandates           │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXISTING UI PAGES (Enhanced)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Dashboard Home     │  Real balances, protocol distribution                │
│  Wallets Page       │  Dual balance (ledger + on-chain), BYOW verify       │
│  Transfers Page     │  FX preview, corridor selector                       │
│  Transfer Detail    │  Settlement tab with timeline                        │
│  Compliance Page    │  Screen tab, contextual screening                    │
│  AP2 Mandates       │  Action buttons, VDC visualization                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Wallet Balance Display
**Decision:** Show BOTH ledger balance AND on-chain balance

```
┌─────────────────────────────────┐
│  Treasury Wallet          [●]   │  ← Sync indicator
│                                 │
│  Available (Ledger)             │
│  $12,450.00 USDC               │
│                                 │
│  On-Chain (Base Sepolia)        │
│  $12,448.32 USDC  $0.02 ETH    │
│  ↗ basescan.org/...             │
└─────────────────────────────────┘
```

**Rationale:** Users need to see both the internal PayOS ledger balance (available for instant transfers) and the actual on-chain balance (for withdrawals, external verification).

### FX Quotes
**Decision:** Both dedicated FX Calculator page AND inline in transfer form

**Rationale:** Power users want a dedicated tool to explore rates; all users need inline preview when creating transfers.

### Settlement Tracking
**Decision:** New "Settlement" tab within existing transfer detail page

**Rationale:** Settlement is directly related to a transfer; a separate section would create navigation friction.

### Compliance Screening
**Decision:** Both Compliance page tab AND contextual buttons on cards

**Rationale:** Compliance team needs dedicated interface; operational users need quick screening from context.

### Mandate Actions
**Decision:** Both list-level dropdown AND detail page actions

**Rationale:** Quick actions for common operations; full controls with confirmations for detail view.

---

## Stories

### Part 1: Wallet Enhancements (13 points)

#### Story 42.1: Dual Balance Display
**Points:** 3  
**Priority:** P0  
**File:** `apps/web/src/app/dashboard/wallets/page.tsx`

**Description:**
Show both ledger and blockchain balances on wallet cards.

**API:** `GET /v1/wallets/:id/balance`

**Acceptance Criteria:**
- [ ] Each wallet card shows "Available (Ledger)" balance from `wallet.balance`
- [ ] Each wallet card shows "On-Chain" balance from `/v1/wallets/:id/balance` API
- [ ] On-chain section shows both USDC and ETH (native token)
- [ ] Sync indicator: green dot (synced <1min), yellow (1-5min), red (>5min stale)
- [ ] Block explorer link for wallet address
- [ ] Loading skeleton while fetching on-chain balance

---

#### Story 42.2: BYOW Signature Verification Flow
**Points:** 5  
**Priority:** P0  
**File:** `apps/web/src/app/dashboard/wallets/page.tsx`

**Description:**
Complete the "Link External Wallet" flow with EIP-191 signature verification.

**APIs:**
- `POST /v1/wallets/external` (existing - creates unverified wallet)
- `POST /v1/wallets/:id/verify` (Epic 40 - EIP-191 verification)

**Flow:**
1. User links wallet (existing) → wallet created as `verified: false`
2. Show "Verify Ownership" button on unverified wallets
3. Click → Fetch challenge message from backend
4. User signs with MetaMask (via wagmi)
5. Submit signature → Backend verifies → `verified: true`

**Acceptance Criteria:**
- [ ] Unverified wallets show yellow "Unverified" badge
- [ ] "Verify Ownership" button visible on unverified wallets
- [ ] Challenge message displayed before signing
- [ ] MetaMask popup triggered via wagmi `useSignMessage`
- [ ] Success: badge changes to green "Verified"
- [ ] Error handling for rejected signature, wrong wallet

**Dependencies:** Add `wagmi`, `viem` to `apps/web/package.json`

---

#### Story 42.3: Wallet Detail On-Chain Section
**Points:** 3  
**Priority:** P1  
**File:** `apps/web/src/app/dashboard/wallets/[id]/page.tsx`

**Description:**
Add on-chain details section to wallet detail page.

**Acceptance Criteria:**
- [ ] New "On-Chain" section showing blockchain network
- [ ] Contract address for Circle-managed wallets
- [ ] Last 5 on-chain transactions (from blockchain, not internal ledger)
- [ ] Deep links to block explorer for each transaction
- [ ] "Refresh" button to re-fetch on-chain data

---

#### Story 42.4: Circle Wallet Creation
**Points:** 2  
**Priority:** P1  
**File:** `apps/web/src/app/dashboard/wallets/page.tsx`

**Description:**
Enable the "Circle Wallet (Coming Soon)" button in create modal.

**API:** `POST /v1/wallets` with `{ type: 'circle_custodial', blockchain: 'base' }`

**Acceptance Criteria:**
- [ ] Remove "Coming Soon" styling from Circle Wallet option
- [ ] Loading state during Circle API call (can take 3-5 seconds)
- [ ] Success: Show new wallet with address
- [ ] Show sandbox faucet link: "Fund with test USDC →"

---

### Part 2: Transfer Flow with FX (18 points)

#### Story 42.5: FX Calculator Page
**Points:** 5  
**Priority:** P0  
**New File:** `apps/web/src/app/dashboard/fx/page.tsx`

**Description:**
Dedicated page for FX rate exploration and quote locking.

**APIs:**
- `GET /v1/quotes/fx/corridors` - List supported pairs
- `POST /v1/quotes/fx` - Get quote
- `POST /v1/quotes/fx/lock` - Lock quote

**Acceptance Criteria:**
- [ ] Currency pair selector (source and destination)
- [ ] Amount input with debounced quote fetch (500ms)
- [ ] Live rate display with "Expires in X:XX" countdown
- [ ] Fee breakdown table (platform fee, FX spread, rail fee)
- [ ] "Lock Rate" button to lock quote for 5 minutes
- [ ] "Create Transfer" button to navigate to transfer form with quote
- [ ] Add "FX Calculator" link to sidebar under Transfers

---

#### Story 42.6: Inline FX Preview in Transfer Form
**Points:** 5  
**Priority:** P0  
**File:** `apps/web/src/components/modals/new-payment-modal.tsx`

**Description:**
Live FX quote preview as user fills transfer form.

**Trigger:** When `sourceCurrency !== destinationCurrency`

**Acceptance Criteria:**
- [ ] FX preview section appears when currencies differ
- [ ] Debounced API call on amount change (500ms delay)
- [ ] Shows: exchange rate, fees, destination amount
- [ ] "Rate expires" countdown timer
- [ ] "View full breakdown →" link to FX Calculator
- [ ] Loading state while fetching quote
- [ ] Error state if quote fails

---

#### Story 42.7: Currency Corridor Selector
**Points:** 3  
**Priority:** P1  
**File:** `apps/web/src/components/modals/new-payment-modal.tsx`

**Description:**
Replace simple currency dropdown with corridor-aware selector.

**API:** `GET /v1/quotes/fx/corridors`

**Acceptance Criteria:**
- [ ] Dropdown shows supported corridors with settlement times
- [ ] Direct corridors (USD→BRL) shown first
- [ ] Cross-LATAM corridors show "via USD" indicator
- [ ] Estimated settlement time per corridor (e.g., "Pix: 2-5 min")

---

#### Story 42.8: Settlement Tab on Transfer Detail
**Points:** 5  
**Priority:** P0  
**File:** `apps/web/src/app/dashboard/transfers/[id]/page.tsx`

**Description:**
New "Settlement" tab showing payout status and timeline.

**API:** `GET /v1/settlements/:id` (via transfer's `settlement_id`)

**Acceptance Criteria:**
- [ ] New tab: [Details] [Settlement] [Activity]
- [ ] Timeline showing settlement stages:
  - Payment Received
  - Compliance Check
  - FX Conversion (with rate)
  - Pix/SPEI Processing (with Circle ID)
  - Settlement Complete
- [ ] On-chain transaction hash with BaseScan link
- [ ] Circle payout tracking reference
- [ ] Graceful handling when settlement not yet created

---

### Part 3: AP2 Mandate Actions (8 points)

#### Story 42.9: Mandate List Actions
**Points:** 3  
**Priority:** P0  
**File:** `apps/web/src/app/dashboard/agentic-payments/ap2/mandates/page.tsx`

**Description:**
Add action dropdown to each mandate row.

**APIs:**
- `POST /v1/ap2/mandates/:id/activate`
- `POST /v1/ap2/mandates/:id/suspend`
- `POST /v1/ap2/mandates/:id/revoke`

**Acceptance Criteria:**
- [ ] Dropdown menu on each row (three-dot icon)
- [ ] Actions based on current status:
  - `pending` → "Activate"
  - `active` → "Suspend", "Revoke"
  - `suspended` → "Activate", "Revoke"
  - `revoked` → No actions (disabled)
- [ ] Optimistic UI update after action
- [ ] Toast notification on success/error

---

#### Story 42.10: Mandate Detail Actions & VDC
**Points:** 5  
**Priority:** P1  
**File:** `apps/web/src/app/dashboard/agentic-payments/ap2/mandates/[id]/page.tsx`

**Description:**
Full action controls + VDC visualization on detail page.

**Acceptance Criteria:**
- [ ] Action bar with full-width buttons: Activate/Suspend/Revoke
- [ ] Confirmation dialog for destructive actions (revoke)
- [ ] VDC Card showing:
  - Issuer (agent name)
  - Subject (payer account)
  - Authorized amount and currency
  - Remaining balance
  - Frequency constraints
  - Expiration date
- [ ] Signature verification status: "✓ Verified" badge
- [ ] Collapsible "View Raw VDC" section with JSON

---

### Part 4: Compliance Screening (10 points)

#### Story 42.11: Screening Tab on Compliance Page
**Points:** 5  
**Priority:** P0  
**File:** `apps/web/src/app/dashboard/compliance/page.tsx`

**Description:**
Add "Screen" tab for manual compliance checks.

**APIs:**
- `POST /v1/compliance/screen/wallet`
- `POST /v1/compliance/screen/entity`
- `POST /v1/compliance/screen/bank`

**Acceptance Criteria:**
- [ ] Tab navigation: [Flags] [Screen] [History]
- [ ] Screen type selector: Wallet | Entity | Bank Account
- [ ] Form fields per type:
  - Wallet: address, chain, context
  - Entity: name, type, country, DOB (optional)
  - Bank: account_type, account_id, country
- [ ] "Run Screening" button
- [ ] Result display: risk level badge, score, flags, provider
- [ ] Auto-create flag button for HIGH/SEVERE results

---

#### Story 42.12: Contextual Screen Buttons
**Points:** 3  
**Priority:** P1  
**Files:** Multiple (wallet cards, account cards, transfer rows)

**Description:**
Add "Screen" button to cards and rows for quick compliance checks.

**Acceptance Criteria:**
- [ ] Wallet card: "Screen" button → pre-fills wallet address
- [ ] Account card: "Screen" button → pre-fills entity name, type
- [ ] Transfer row: "Screen" icon → screen destination
- [ ] Opens modal with pre-filled data
- [ ] Shows result inline or links to Compliance page

---

#### Story 42.13: Screening History Tab
**Points:** 2  
**Priority:** P2  
**File:** `apps/web/src/app/dashboard/compliance/page.tsx`

**Description:**
Add "History" tab showing past screenings.

**API:** `GET /v1/compliance/screenings`

**Acceptance Criteria:**
- [ ] List of past screenings with: type, subject, result, date
- [ ] Filter by screening type
- [ ] Filter by risk level
- [ ] Pagination
- [ ] Click to view full screening details

---

### Part 5: Dashboard Home Updates (8 points)

#### Story 42.14: Real Balance Aggregation
**Points:** 3  
**Priority:** P0  
**File:** `apps/web/src/app/dashboard/page.tsx`

**Description:**
Replace mock volume with real aggregated balances.

**Acceptance Criteria:**
- [ ] "Volume" card shows actual transfer volume (sum from API)
- [ ] "Balance" card shows total USDC across all wallets
- [ ] Loading states while fetching
- [ ] Fallback to 0 if no data

**Data Sources:**
- Wallets: `GET /v1/wallets` → sum balances
- Volume: `GET /v1/transfers` with date range → sum amounts

---

#### Story 42.15: Protocol Distribution Widget
**Points:** 3  
**Priority:** P1  
**File:** `apps/web/src/app/dashboard/page.tsx`

**Description:**
Replace mock corridor chart with protocol distribution.

**Acceptance Criteria:**
- [ ] Pie/donut chart showing transfers by protocol
- [ ] Protocols: x402 (purple), ACP (blue), AP2 (green), internal (gray)
- [ ] Clickable segments → filter transfers page
- [ ] Legend with counts and percentages
- [ ] "View All Transfers →" link

---

#### Story 42.16: Rate Limit Indicator
**Points:** 2  
**Priority:** P1  
**New File:** `apps/web/src/components/rate-limit-indicator.tsx`

**Description:**
Display API rate limit usage in header.

**Source:** Parse `X-RateLimit-*` headers from API responses

**Acceptance Criteria:**
- [ ] Progress bar in header: "API: 450/500"
- [ ] Color coding: green (<50%), yellow (50-80%), red (>80%)
- [ ] Tooltip showing reset time
- [ ] Store rate limit info in React context
- [ ] Update on each API response

---

### Part 6: Real-Time Updates (8 points)

#### Story 42.17: Transfer Status Polling
**Points:** 3  
**Priority:** P1  
**File:** `apps/web/src/app/dashboard/transfers/[id]/page.tsx`

**Description:**
Poll for status updates on processing transfers.

**Acceptance Criteria:**
- [ ] If `status === 'processing'`, poll every 5 seconds
- [ ] Stop polling when `status === 'completed' | 'failed'`
- [ ] Show "Last updated: X seconds ago" timestamp
- [ ] Manual refresh button
- [ ] Use React Query's `refetchInterval` option

---

#### Story 42.18: Toast Notifications
**Points:** 3  
**Priority:** P1  
**File:** `apps/web/src/lib/api-client.tsx`

**Description:**
Toast notifications for key events.

**Events:**
- Transfer completed → "Transfer to [name] completed ✓"
- Transfer failed → "Transfer to [name] failed"
- Compliance flag created → "New compliance flag: [risk level]"
- Quote expired → "FX quote expired, refresh for new rate"

**Acceptance Criteria:**
- [ ] Success toasts (green) for completed actions
- [ ] Error toasts (red) for failures
- [ ] Warning toasts (yellow) for expirations
- [ ] Actionable toasts with "View" button where applicable
- [ ] Use sonner library (already installed)

---

#### Story 42.19: WebSocket Foundation
**Points:** 2  
**Priority:** P2  
**New File:** `apps/web/src/lib/websocket.tsx`

**Description:**
WebSocket connection infrastructure for future real-time updates.

**Note:** Backend WebSocket endpoint may need separate story. This creates client-side foundation.

**Acceptance Criteria:**
- [ ] WebSocket connection hook: `useWebSocket()`
- [ ] Auto-reconnect on disconnect
- [ ] Event subscription system
- [ ] Fallback to polling if WebSocket unavailable
- [ ] Connection status indicator

---

## Story Summary

| Story | Points | Priority | Location | Epic 40 API |
|-------|--------|----------|----------|-------------|
| **Part 1: Wallets** | **13** | | | |
| 42.1 | 3 | P0 | Wallets page | `/v1/wallets/:id/balance` |
| 42.2 | 5 | P0 | Wallets page | `/v1/wallets/:id/verify` |
| 42.3 | 3 | P1 | Wallet detail | `/v1/wallets/:id/balance` |
| 42.4 | 2 | P1 | Wallets page | `POST /v1/wallets` |
| **Part 2: Transfers** | **18** | | | |
| 42.5 | 5 | P0 | **New:** FX page | `/v1/quotes/fx/*` |
| 42.6 | 5 | P0 | Transfer modal | `/v1/quotes/fx` |
| 42.7 | 3 | P1 | Transfer modal | `/v1/quotes/fx/corridors` |
| 42.8 | 5 | P0 | Transfer detail | `/v1/settlements/:id` |
| **Part 3: AP2** | **8** | | | |
| 42.9 | 3 | P0 | Mandates list | `/v1/ap2/mandates/:id/*` |
| 42.10 | 5 | P1 | Mandate detail | `/v1/ap2/mandates/:id/*` |
| **Part 4: Compliance** | **10** | | | |
| 42.11 | 5 | P0 | Compliance page | `/v1/compliance/screen/*` |
| 42.12 | 3 | P1 | Multiple pages | `/v1/compliance/screen/*` |
| 42.13 | 2 | P2 | Compliance page | `/v1/compliance/screenings` |
| **Part 5: Dashboard** | **8** | | | |
| 42.14 | 3 | P0 | Dashboard home | `/v1/wallets` |
| 42.15 | 3 | P1 | Dashboard home | `/v1/transfers` |
| 42.16 | 2 | P1 | Header | Rate limit headers |
| **Part 6: Real-Time** | **8** | | | |
| 42.17 | 3 | P1 | Transfer detail | Polling |
| 42.18 | 3 | P1 | Global | Toast events |
| 42.19 | 2 | P2 | Global | WebSocket |
| **TOTAL** | **65** | | **19 stories** | |

---

## Priority Summary

| Priority | Stories | Points | Focus |
|----------|---------|--------|-------|
| **P0** | 8 | 32 | Core: balances, FX, settlement, screening |
| **P1** | 8 | 25 | Enhanced: VDC, protocol stats, real-time |
| **P2** | 3 | 8 | Polish: history, WebSocket foundation |
| **Total** | **19** | **65** | |

---

## Success Criteria

| Checkpoint | Criteria |
|------------|----------|
| After P0 | Dashboard shows real balances, transfers have FX preview, settlement timeline works |
| After P1 | Full mandate management, compliance screening, protocol distribution |
| After P2 | Screening history, WebSocket foundation ready |

---

## Files Changed Summary

| File | Stories | Type |
|------|---------|------|
| `apps/web/src/app/dashboard/wallets/page.tsx` | 42.1, 42.2, 42.4 | Modify |
| `apps/web/src/app/dashboard/wallets/[id]/page.tsx` | 42.3 | Modify |
| `apps/web/src/app/dashboard/fx/page.tsx` | 42.5 | **New** |
| `apps/web/src/components/modals/new-payment-modal.tsx` | 42.6, 42.7 | Modify |
| `apps/web/src/app/dashboard/transfers/[id]/page.tsx` | 42.8, 42.17 | Modify |
| `apps/web/src/app/dashboard/agentic-payments/ap2/mandates/page.tsx` | 42.9 | Modify |
| `apps/web/src/app/dashboard/agentic-payments/ap2/mandates/[id]/page.tsx` | 42.10 | Modify |
| `apps/web/src/app/dashboard/compliance/page.tsx` | 42.11, 42.13 | Modify |
| `apps/web/src/app/dashboard/page.tsx` | 42.14, 42.15 | Modify |
| `apps/web/src/components/rate-limit-indicator.tsx` | 42.16 | **New** |
| `apps/web/src/lib/api-client.tsx` | 42.18 | Modify |
| `apps/web/src/lib/websocket.tsx` | 42.19 | **New** |

**Summary:** 9 existing files modified, 3 new files created

---

## What's NOT in Epic 42 (Handled Elsewhere)

| Feature | Epic | Notes |
|---------|------|-------|
| On-ramp (cards, ACH, SEPA) | Epic 41 | Separate funding flow |
| Streaming payments | Epic 20 | Superfluid integration |
| Agent wallets | Epic 18 | Spending policies |
| Simulation engine | Epic 28 | AI-native infrastructure |
| Demo mode toggle | Future | Not critical for sandbox |

---

## Dependencies

- **Epic 40** (Complete) - All backend APIs working
- **wagmi + viem** - For BYOW signature verification (Story 42.2)
- **sonner** - Already installed for toasts

---

## Related Documentation

- [Epic 40: External Sandbox Integrations](./epic-40-sandbox-integrations.md) - Backend APIs
- [Epic 41: On-Ramp Integrations](./epic-41-onramp-integrations.md) - Funding flows
- [PRD Master](../PayOS_PRD_Master.md) - Epic dashboard

---

*Created: January 5, 2026*  
*Status: Planning*



