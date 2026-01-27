# ACP UI Integration Status

**Protocol:** ACP (Agentic Commerce Protocol)  
**Date:** December 29, 2025

---

## Overview

This document provides detailed specifications for building the ACP (Agentic Commerce Protocol) UI in PayOS. ACP enables shopping cart checkout flows for agentic commerce with Stripe/OpenAI integration.

**Backend Status:** ✅ COMPLETE - All APIs ready and tested  
**Frontend Status:** ✅ COMPLETE - All phases implemented and verification passed

---

## What Still Needs to Be Done for ACP 🚧

### High Priority - Checkout Management UI

#### 1. ACP Checkouts List Page
**Path:** `/dashboard/agentic-payments/acp/checkouts`
**Status:** ✅ COMPLETE

**Requirements:**
```tsx
// Display list of checkouts
// - Table with columns: Checkout ID, Merchant, Agent, Customer, Items, Total, Status, Created
// - Filters: Status (pending, completed, cancelled, expired), Merchant, Agent, Customer, Date range
// - Search by checkout_id or merchant name
// - Pagination (20 per page)
// - Click row → navigate to detail page
// - "Create Checkout" button → create form
```

**API Calls:**
- `GET /v1/acp/checkouts?limit=20&offset=0&status=pending`

**Components Implemented:**
- `CheckoutsList`
- `CheckoutStatusBadge`
- `CheckoutFilters`

---

#### 2. ACP Checkout Detail Page
**Path:** `/dashboard/agentic-payments/acp/checkouts/:id`
**Status:** ✅ COMPLETE

**Requirements:**
```tsx
// Display single checkout with:
// - Checkout header (ID, merchant, status)
// - Customer info card (customer_id, email)
// - Agent info card (agent_id, agent_name)
// - Order summary card (subtotal, tax, shipping, discount, total)
// - Cart items table (name, description, quantity, unit price, total)
// - Action buttons: "Complete Checkout" (if pending), "Cancel Checkout"
// - Payment details (shared_payment_token, payment_method) if completed
// - Transfer link if completed
```

**API Calls:**
- `GET /v1/acp/checkouts/:id`

**Components Implemented:**
- `CheckoutHeader`
- `CheckoutSummary`
- `CheckoutItems`
- `CheckoutDetails`
- `CompleteCheckoutDialog`

---

#### 3. Create Checkout Form
**Path:** `/dashboard/agentic-payments/acp/checkouts/new`
**Status:** ✅ COMPLETE

**Requirements:**
```tsx
// Multi-step form with sections:
// Step 1: Basic Info (Agent, Customer, Account)
// Step 2: Merchant Info
// Step 3: Cart Items
// Step 4: Totals & Settings
// Submit → creates checkout and redirects to detail page
```

**API Calls:**
- `POST /v1/acp/checkouts`

**Components Implemented:**
- `CreateCheckoutForm`
- `CartItemInput`

---

#### 4. Complete Checkout Dialog
**Path:** Modal/dialog component
**Status:** ✅ COMPLETE

**Requirements:**
```tsx
// Dialog triggered from checkout detail page
// Form with fields:
// - Shared Payment Token (text input, required)
// - Payment Method (text input, optional)
// - Submit → completes checkout, shows success toast, refreshes checkout
```

**API Calls:**
- `POST /v1/acp/checkouts/:id/complete`

**Components Implemented:**
- `CompleteCheckoutDialog`

---

#### 5. ACP Analytics Page
**Path:** `/dashboard/agentic-payments/acp/analytics`
**Status:** ✅ COMPLETE

**Requirements:**
```tsx
// ACP-specific analytics dashboard
// - Summary cards: Total Revenue, Total Checkouts, Avg Order Value, Active Merchants
// - Charts:
//   - Revenue Breakdown (Gross, Net, Fees)
//   - Checkouts by Status (Pending, Completed, Cancelled, Failed)
// - Period selector
```

**API Calls:**
- `GET /v1/acp/analytics?period=30d`

**Components Implemented:**
- `AcpAnalytics`
- `StatCard`
- `Card` (Status and Revenue sections)

---

#### 6. ACP Integration Page
**Path:** `/dashboard/agentic-payments/acp/integration`
**Status:** ✅ COMPLETE

**Requirements:**
```tsx
// Developer docs and code snippets for ACP
// - API reference (checkout lifecycle)
// - Code examples for SDK and API
// - Quick start cards
```

**Components Implemented:**
- `AcpIntegrationPage`
- Integrated copy-to-clipboard functionality

---

### Medium Priority - Enhanced Features

#### 7. Cart Item Images Gallery
**Status:** ⏳ PENDING (Future Enhancement)

Display cart item images in a visual gallery format.

---

#### 8. Shipping Address Management
**Status:** ⏳ PENDING (Future Enhancement)

Visual display and editing of shipping address JSONB field.

---

#### 9. Merchant Management
**Status:** ⏳ PENDING (Future Enhancement)

Separate merchant registry with profiles, webhooks, API keys.

---

## UI Design Guidelines

### ACP Colors
```css
--acp-primary: #22C55E; /* Green - commerce/checkout */
--acp-bg: rgba(34, 197, 94, 0.1);
--acp-border: rgba(34, 197, 94, 0.2);
```

### ACP Icon
```tsx
import { ShoppingBag } from 'lucide-react';
// Use ShoppingBag (🛍️) to represent commerce/checkout
```

### Protocol Labels
- **Short:** "ACP"
- **Long:** "Agentic Commerce Protocol"
- **Description:** "Shopping cart checkouts for AI agents"

### Status Colors
```tsx
const statusColors = {
  pending: 'yellow',     // Warning state
  completed: 'green',    // Success state
  cancelled: 'gray',     // Neutral state
  expired: 'red',        // Error state
  failed: 'red',         // Error state
};
```

---

## Current UI State

### ✅ What Works Now
1. **ACP Checkouts List**: View all checkouts with status badges.
2. **Checkout Details**: View full details, items, and status.
3. **Create Checkout**: Multi-step form for creating new checkouts.
4. **Complete Checkout**: Dialog to programmatically complete checkouts.
5. **Cancel Checkout**: Cancel pending checkouts.
6. **ACP Analytics**: View revenue and status metrics.
7. **Integration Guide**: Documentation and code examples.

### 🚧 What's Missing
1. Advanced search and filtering (basic implementation present).
2. Advanced visual galleries for cart items (future).
3. Detailed shipping address management (future).

---

## Implementation Priority & Progress

### Phase 1: MVP (Core Checkout Management)
1. **Checkouts List Page** - ✅ COMPLETE
2. **Checkout Detail Page** - ✅ COMPLETE
3. **Create Checkout Form** - ✅ COMPLETE
4. **Complete Checkout Dialog** - ✅ COMPLETE

### Phase 2: Analytics & Insights
5. **ACP Analytics Page** - ✅ COMPLETE

### Phase 3: Developer Tools
6. **ACP Integration Page** - ✅ COMPLETE

**Total Progress:** 100% of MVP Scope

---

## API Endpoints Available for UI

All backend APIs are ready and tested:

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/acp/checkouts` | POST | Create checkout | ✅ Ready |
| `/v1/acp/checkouts` | GET | List checkouts | ✅ Ready |
| `/v1/acp/checkouts/:id` | GET | Get checkout + items | ✅ Ready |
| `/v1/acp/checkouts/:id/complete` | POST | Complete checkout | ✅ Ready |
| `/v1/acp/checkouts/:id/cancel` | PATCH | Cancel checkout | ✅ Ready |
| `/v1/acp/analytics` | GET | ACP analytics | ✅ Ready |

---

## Implementation Checklist

### Phase 1: Core Checkout Management
- [x] Add ACP types to `@sly/api-client/types.ts`
- [x] Add `acp` methods to API client
- [x] Create `CheckoutStatusBadge` component
- [x] Create Checkouts List Page
- [x] Create Checkout Detail Page
- [x] Create Create Checkout Form (multi-step)
- [x] Create Complete Checkout Dialog
- [x] Test full checkout flow

### Phase 2: Analytics
- [x] Create ACP Analytics Dashboard
- [x] Add charts (revenue, status breakdown, top merchants)
- [x] Test analytics with real data

### Phase 3: Developer Tools
- [x] Create ACP Integration Guide page
- [x] Add code examples and API reference
- [x] Test documentation clarity

---

## Out of Scope

- Real Stripe/OpenAI SDK integration (backend responsibility)
- Inventory management (external system)
- Real-time stock checking (future enhancement)
- Multi-tenant merchant portals (future product)
- Refund processing UI (future enhancement)

---

**Document Updated:** December 29, 2025  
**Author:** Antigravity  
**For:** Gemini Implementation  
**Backend APIs:** ✅ All Ready  
**Frontend UI:** ✅ MVP Complete
