# AP2 UI Integration Status

**Date:** December 27, 2025

---

## What Gemini Has Already Done ✅

According to `docs/stories/STORY_UI_MULTI_PROTOCOL_RESTRUCTURE.md`, Gemini has **COMPLETED** the foundational multi-protocol UI restructure:

### ✅ Completed by Gemini

1. **Sidebar Restructure**
   - Created "Agentic Payments" parent item
   - Added "Overview" and "Analytics" children
   - Added nested "x402", "AP2", and "ACP" sections
   - Migrated existing x402 links to new structure

2. **New Pages Created**
   - `/dashboard/agentic-payments` (Overview)
   - `/dashboard/agentic-payments/analytics` (with protocol tabs)
   - Placeholder pages for AP2/ACP sections

3. **Components Created**
   - `ProtocolBadge` (supports x402, AP2, ACP)
   - `ProtocolSelector` dropdown
   - `CrossProtocolStats` widget
   - `ProtocolBreakdown` chart
   - `RecentActivityFeed` with protocol icons

4. **Transfers Page Updates**
   - Added Protocol Filter dropdown
   - Protocol Badge in transfer list
   - Protocol metadata in transfer details

5. **Settings**
   - "Agentic Payments" section added
   - Visibility toggles for each protocol

6. **API Client**
   - Added `agenticPayments` namespace to SDK
   - Implemented `getSummary` and `getAnalytics` methods

---

## What Still Needs to Be Done for AP2 🚧

### High Priority - Mandate Management UI

Gemini created **placeholder pages** for AP2, but the actual mandate management interface needs to be built:

#### 1. AP2 Mandates List Page
**Path:** `/dashboard/agentic-payments/ap2/mandates`

**Requirements:**
```tsx
// Display list of mandates
// - Table with columns: Mandate ID, Agent, Amount, Used, Remaining, Status, Created
// - Filters: Status (active, completed, cancelled, expired), Agent ID, Date range
// - Search by mandate_id
// - Pagination (20 per page)
// - Click row → navigate to detail page
// - "Create Mandate" button → create form
```

**API Calls:**
- `GET /v1/ap2/mandates?limit=20&offset=0&status=active`

**Components Needed:**
- `MandateTable` (new)
- `MandateStatusBadge` (new)
- `MandateFilters` (new)

---

#### 2. AP2 Mandate Detail Page
**Path:** `/dashboard/agentic-payments/ap2/mandates/:id`

**Requirements:**
```tsx
// Display single mandate with:
// - Mandate header (ID, type, agent, status)
// - Utilization progress bar (used/authorized)
// - Mandate details card (account, currency, expires_at, metadata)
// - Action buttons: "Execute Payment", "Cancel Mandate"
// - Execution history table (all payments under this mandate)
```

**API Calls:**
- `GET /v1/ap2/mandates/:id`

**Components Needed:**
- `MandateHeader` (new)
- `MandateUtilizationBar` (new - show used/remaining)
- `MandateDetailsCard` (new)
- `MandateExecutionHistory` (new - table of payments)
- `ExecutePaymentDialog` (new - form to execute payment)

---

#### 3. Create Mandate Form
**Path:** `/dashboard/agentic-payments/ap2/mandates/new`

**Requirements:**
```tsx
// Form with fields:
// - Mandate ID (text input)
// - Mandate Type (dropdown: intent, cart, payment)
// - Agent ID (text input or agent selector)
// - Agent Name (optional text input)
// - Account (account selector dropdown)
// - Authorized Amount (currency input)
// - Currency (dropdown, default USDC)
// - Expires At (date picker, optional)
// - Mandate Data (JSON editor, optional)
// - Submit → creates mandate and redirects to detail page
```

**API Calls:**
- `POST /v1/ap2/mandates`

**Components Needed:**
- `CreateMandateForm` (new)
- Use existing `AccountSelector`, `CurrencySelector`

---

#### 4. Execute Payment Dialog
**Path:** Modal/dialog component

**Requirements:**
```tsx
// Dialog triggered from mandate detail page
// Form with fields:
// - Amount (currency input, max = remaining_amount)
// - Currency (locked to mandate currency)
// - Description (optional text input)
// - Authorization Proof (optional text input)
// - Submit → executes payment, shows success toast, refreshes mandate
```

**API Calls:**
- `POST /v1/ap2/mandates/:id/execute`

**Components Needed:**
- `ExecutePaymentDialog` (new)
- Validation: amount <= remaining_amount

---

#### 5. AP2 Analytics Page
**Path:** `/dashboard/agentic-payments/ap2/analytics`

**Requirements:**
```tsx
// AP2-specific analytics dashboard
// - Summary cards: Total Revenue, Active Mandates, Utilization Rate, Transaction Count
// - Charts: Revenue over time, Mandates by type, Mandates by status
// - Top agents table (ranked by total authorized/used)
// - Period selector (24h, 7d, 30d, 90d, 1y)
```

**API Calls:**
- `GET /v1/ap2/analytics?period=30d`

**Components Needed:**
- `AP2AnalyticsDashboard` (new)
- Reuse existing chart components from x402
- `MandateUtilizationChart` (new - donut chart)
- `TopAgentsTable` (new)

---

#### 6. AP2 Integration Page
**Path:** `/dashboard/agentic-payments/ap2/integration`

**Requirements:**
```tsx
// Developer docs and code snippets for AP2
// - API reference (mandate lifecycle)
// - Code examples (create mandate, execute payment)
// - Google AP2 SDK integration guide
// - Webhook events reference
```

**Components Needed:**
- `AP2IntegrationGuide` (new)
- Use existing `CodeBlock`, `ApiReference` components

---

### Medium Priority - Enhanced Features

#### 7. Mandate Templates
**Future Enhancement**

Pre-configured mandate types (e.g., "Travel Assistant", "Shopping Bot") with default settings.

---

#### 8. Mandate Activity Timeline
**Future Enhancement**

Visual timeline of mandate lifecycle events (created → executed 3x → cancelled).

---

#### 9. Agent Management
**Future Enhancement**

Separate agent registry with profiles, trust scores, authorization history.

---

## UI Design Guidelines (Already Provided)

### AP2 Colors
```css
--ap2-primary: #3B82F6; /* Blue */
--ap2-bg: rgba(59, 130, 246, 0.1);
```

### AP2 Icon
```tsx
import { Bot } from 'lucide-react';
// Use Bot (🤖) to represent agents
```

### Protocol Label
- Short: "AP2"
- Long: "Agent Payment Protocol"

---

## Current UI State

### ✅ What Works Now
1. AP2 appears in unified "Agentic Payments" overview
2. AP2 transfers show in transfers list with protocol badge
3. AP2 data appears in cross-protocol analytics
4. AP2 section visible in sidebar (placeholder)

### 🚧 What's Missing
1. Mandate list page (empty placeholder)
2. Mandate detail page (doesn't exist)
3. Create mandate form (doesn't exist)
4. Execute payment dialog (doesn't exist)
5. AP2-specific analytics page (placeholder)

---

## Implementation Priority

### Phase 1: MVP (Core Mandate Management) - 8 Points
1. ✅ Mandates List Page (2 points)
2. ✅ Mandate Detail Page (2 points)
3. ✅ Create Mandate Form (2 points)
4. ✅ Execute Payment Dialog (2 points)

### Phase 2: Analytics & Insights - 3 Points
5. ✅ AP2 Analytics Page (3 points)

### Phase 3: Developer Tools - 2 Points
6. ✅ AP2 Integration Page (2 points)

**Total Estimate:** 13 points (matches Story UI-17.1 estimate)

---

## API Endpoints Available for UI

All backend APIs are ready and tested:

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/ap2/mandates` | POST | Create mandate | ✅ Ready |
| `/v1/ap2/mandates` | GET | List mandates | ✅ Ready |
| `/v1/ap2/mandates/:id` | GET | Get mandate + history | ✅ Ready |
| `/v1/ap2/mandates/:id` | PATCH | Update mandate | ✅ Ready |
| `/v1/ap2/mandates/:id/execute` | POST | Execute payment | ✅ Ready |
| `/v1/ap2/mandates/:id/cancel` | PATCH | Cancel mandate | ✅ Ready |
| `/v1/ap2/mandates/:id` | DELETE | Delete mandate | ✅ Ready |
| `/v1/ap2/analytics` | GET | AP2 analytics | ✅ Ready |

---

## Example API Responses for UI

### List Mandates Response
```json
{
  "data": [
    {
      "id": "uuid",
      "mandate_id": "mandate_travel_bot_001",
      "mandate_type": "cart",
      "agent_id": "agent_travel",
      "agent_name": "AI Travel Assistant",
      "account_id": "uuid",
      "authorized_amount": 1000,
      "used_amount": 350,
      "remaining_amount": 650,
      "execution_count": 2,
      "currency": "USD",
      "status": "active",
      "expires_at": "2026-06-30T23:59:59Z",
      "created_at": "2025-12-27T..."
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

### Mandate Detail Response
```json
{
  "data": {
    "id": "uuid",
    "mandate_id": "mandate_travel_bot_001",
    // ... all mandate fields ...
    "executions": [
      {
        "id": "uuid",
        "execution_index": 2,
        "amount": 250,
        "currency": "USD",
        "status": "completed",
        "transfer_id": "uuid",
        "created_at": "2025-12-27T..."
      },
      // ... more executions
    ]
  }
}
```

---

## Next Steps for Gemini

1. **Implement Phase 1 (MVP):** Build the core mandate management UI
   - Start with Mandates List Page
   - Then Mandate Detail Page
   - Then Create Form and Execute Dialog

2. **Leverage Existing Components:** Reuse as much as possible from x402:
   - Tables, cards, badges
   - Forms, dialogs
   - Charts (adapt for mandate data)

3. **Test Integration:** Verify all CRUD operations work through UI

4. **Phase 2 & 3:** Analytics and integration docs (lower priority)

---

## Questions to Clarify

1. **Agent Selection:** How should agents be selected in create form?
   - Free text input?
   - Dropdown of pre-registered agents?
   - Autocomplete search?

2. **Account Selection:** Should mandates be tied to:
   - A specific account (current implementation)?
   - The tenant generally?
   - An agent's wallet?

3. **Currency:** Should we support multi-currency mandates, or default to USDC only for MVP?

4. **Mandate Templates:** Should we build this in Phase 1 or defer?

---

**Status:** Phase 1 (MVP) ✅ COMPLETE, Phase 2 (Analytics) ✅ COMPLETE, Phase 3 (Docs) ✅ COMPLETE
**Blocker:** None
**Estimated UI Work:** All planned UI work is complete.

