# UI Bug Fixes - Batch 1

## Overview

This document contains 6 UI bug fixes that need to be addressed. Each bug has been identified during regression testing and includes specific reproduction steps, root cause analysis, and implementation guidance.

---

## Bug 1: X402 Endpoint Detail Page - Missing Data Display

### Priority: High
### Status: ✅ Fixed
### File: `apps/web/src/app/dashboard/agentic-payments/x402/endpoints/[id]/page.tsx`

### Problem Description
The X402 Endpoint Detail page does not display Revenue, API Calls, or other metric values, even though these values are correctly shown on the list page (`/dashboard/agentic-payments/x402/endpoints`).

### Reproduction Steps
1. Navigate to http://localhost:3000/dashboard/agentic-payments/x402/endpoints
2. Note the values shown for each endpoint (calls, revenue, etc.)
3. Click on an endpoint to view details
4. Observe that the detail page shows "0" or empty values for metrics

### Root Cause Analysis
The detail page likely has one of these issues:
1. **Double-nested API response**: The `endpointData` is accessed incorrectly (e.g., `data.data` vs `data`)
2. **Analytics data not being fetched**: The analytics endpoint may not be called or parsed correctly
3. **Different field names**: The list page may use different field names than the detail page expects

### Technical Investigation Required
Check these API calls and data flows:
```typescript
// The page should be fetching from these endpoints:
// GET /v1/x402/endpoints/:id - Endpoint details
// GET /v1/x402/analytics/endpoint/:id - Analytics data

// Verify the response structure matches what the UI expects
```

### Implementation Fix
1. Add console logging to see what data is being received
2. Check if analytics data is being fetched (`/v1/x402/analytics/endpoint/:id`)
3. Verify field mappings between API response and UI display:
   - `totalCalls` or `total_calls` → displayed as "API Calls"
   - `totalRevenue` or `total_revenue` → displayed as "Revenue"
   - `successRate` or `success_rate` → displayed as "Success Rate"
4. Handle potential double-nesting in the analytics response

### Expected Behavior
- Revenue should display the total earned (e.g., "$125.50")
- API Calls should show the count (e.g., "1,234")
- Success Rate should show percentage (e.g., "98.5%")
- Recent transactions/calls should be listed

### Test Verification
- [ ] Revenue displays non-zero value matching seed data
- [ ] API Calls count is visible
- [ ] Success rate percentage is shown
- [ ] Values match what's shown on the list page

---

## Bug 2: Compliance Flags - Poor Test Data Display

### Priority: Medium
### Status: ✅ Fixed
### Files: 
- `apps/api/scripts/seed-complete-test-data.ts` (Backend - seed data)
- `apps/web/src/app/dashboard/compliance/page.tsx` (Frontend - display)

### Problem Description
The Compliance Flags page shows 6 flags with:
- "Unknown reason" as the reason text
- "Potential fraudulent activity detected - immediate review required" (generic)
- "Invalid Date" for timestamps
- No risk level differentiation

### Reproduction Steps
1. Navigate to http://localhost:3000/dashboard/compliance
2. Observe flags all show "Unknown reason"
3. Observe "Invalid Date" in date columns
4. Note all flags appear to have same/no risk level

### Root Cause Analysis
1. **Seed data issue**: The compliance flags in the database have:
   - Missing or malformed `reasons` array
   - Timestamps stored incorrectly
   - `risk_level` not set properly
2. **Frontend parsing issue**: 
   - Date parsing fails on the stored format
   - Reason extraction logic may be incorrect

### Backend Fix (Seed Script)
Update `apps/api/scripts/seed-complete-test-data.ts` to create diverse compliance flags:

```typescript
const complianceFlags = [
  {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    entity_type: 'account',
    entity_id: accounts[0].id,
    flag_type: 'aml_alert',
    risk_level: 'critical',
    status: 'open',
    reasons: ['Large cash deposits exceeding $10,000 threshold', 'Multiple deposits just under reporting limit'],
    ai_analysis: { confidence: 0.92, model: 'fraud-detect-v2', factors: ['velocity', 'amount_pattern'] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    entity_type: 'transfer',
    entity_id: transfers[0].id,
    flag_type: 'sanctions_match',
    risk_level: 'high',
    status: 'investigating',
    reasons: ['Recipient name matches OFAC SDN list entry', 'Country of destination is sanctioned'],
    ai_analysis: { confidence: 0.87, model: 'sanctions-v3', match_score: 0.91 },
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    entity_type: 'account',
    entity_id: accounts[1].id,
    flag_type: 'unusual_activity',
    risk_level: 'medium',
    status: 'open',
    reasons: ['Transaction volume 300% above historical average', 'New beneficiary countries detected'],
    ai_analysis: { confidence: 0.78, model: 'anomaly-v1' },
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    entity_type: 'agent',
    entity_id: agents[0].id,
    flag_type: 'policy_violation',
    risk_level: 'low',
    status: 'resolved',
    reasons: ['Agent exceeded daily transaction limit by 5%', 'Auto-resolved after limit increase'],
    ai_analysis: { confidence: 0.95, model: 'policy-v2', auto_resolvable: true },
    created_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    updated_at: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    resolved_at: new Date(Date.now() - 518400000).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    entity_type: 'transfer',
    entity_id: transfers[1]?.id || transfers[0].id,
    flag_type: 'fraud_suspected',
    risk_level: 'critical',
    status: 'escalated',
    reasons: ['Device fingerprint mismatch', 'Login from new location', 'Immediate large transfer attempted'],
    ai_analysis: { confidence: 0.96, model: 'fraud-detect-v2', risk_score: 0.94 },
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    entity_type: 'account',
    entity_id: accounts[2]?.id || accounts[0].id,
    flag_type: 'kyc_expired',
    risk_level: 'medium',
    status: 'pending_review',
    reasons: ['KYC documents expired 30 days ago', 'Account requires re-verification'],
    ai_analysis: { confidence: 1.0, model: 'kyc-expiry-checker' },
    created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    updated_at: new Date().toISOString(),
  },
];
```

### Frontend Fix
In `apps/web/src/app/dashboard/compliance/page.tsx`:

```typescript
// Fix reason display - handle array of reasons
const getReasonDisplay = (flag: any) => {
  if (Array.isArray(flag.reasons) && flag.reasons.length > 0) {
    return flag.reasons[0]; // Show first reason, or join with ', '
  }
  if (typeof flag.reasons === 'string') {
    return flag.reasons;
  }
  return flag.reason || 'No reason provided';
};

// Fix date display - handle ISO strings
const formatFlagDate = (dateValue: string | Date | null | undefined) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

### Test Verification
- [ ] At least 6 flags with different risk levels (critical, high, medium, low)
- [ ] Different flag types displayed (aml_alert, sanctions_match, fraud_suspected, etc.)
- [ ] Valid dates shown (not "Invalid Date")
- [ ] Reason text is descriptive and specific
- [ ] Different statuses shown (open, investigating, resolved, escalated)

---

## Bug 3: Cards List Page - Nested Data & Missing API

### Priority: High
### Status: ✅ Fixed
### File: `apps/web/src/app/dashboard/cards/page.tsx`

### Problem Description
The Cards List page:
1. Shows nested/malformed data in the display
2. Only fetches from `/v1/card-transactions` - there's no dedicated Cards API
3. Derives card info from transactions, which is unreliable

### Reproduction Steps
1. Navigate to http://localhost:3000/dashboard/cards
2. Observe the data display issues
3. Check Network tab - only card-transactions endpoint is called

### Root Cause Analysis
1. **No dedicated Cards API**: The system stores cards as `payment_methods` with `type: 'card'`
2. **Current approach**: Extracts unique cards from transaction data, which may be incomplete
3. **Data access pattern**: Response double-nesting causing malformed display

### Implementation Options

#### Option A: Use Payment Methods API (Recommended)
If `/v1/payment-methods` exists and returns cards:

```typescript
// Fetch cards from payment methods API
const fetchCards = async () => {
  setLoading(true);
  try {
    const response = await api?.paymentMethods.list({ type: 'card' });
    const cardsData = response?.data?.data || response?.data || [];
    setCards(Array.isArray(cardsData) ? cardsData : []);
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    setCards([]);
  } finally {
    setLoading(false);
  }
};
```

#### Option B: Fix Current Transaction-Based Approach
If no cards API exists, fix the current approach:

```typescript
const fetchCards = async () => {
  setLoading(true);
  try {
    const response = await api?.cardTransactions.list({ limit: 100 });
    
    // Handle double-nesting
    const rawData = (response as any)?.data;
    const transactions = Array.isArray(rawData) 
      ? rawData 
      : (Array.isArray(rawData?.data) ? rawData.data : []);
    
    // Extract unique cards from transactions
    const cardMap = new Map<string, Card>();
    
    for (const tx of transactions) {
      const cardKey = tx.card_last_four || tx.cardLast4;
      if (cardKey && !cardMap.has(cardKey)) {
        cardMap.set(cardKey, {
          id: `card-${cardKey}`,
          last4: cardKey,
          brand: tx.card_brand || tx.cardBrand || 'Unknown',
          expiryMonth: tx.card_expiry_month || tx.expiryMonth,
          expiryYear: tx.card_expiry_year || tx.expiryYear,
          holderName: tx.card_holder_name || tx.cardHolderName || 'Unknown',
          status: 'active',
          createdAt: tx.created_at || tx.createdAt,
          // Aggregate transaction data
          totalSpent: 0,
          transactionCount: 0,
        });
      }
      
      // Aggregate totals
      if (cardKey && cardMap.has(cardKey)) {
        const card = cardMap.get(cardKey)!;
        card.totalSpent += tx.amount || 0;
        card.transactionCount += 1;
      }
    }
    
    setCards(Array.from(cardMap.values()));
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    setCards([]);
  } finally {
    setLoading(false);
  }
};
```

### Display Fix
Ensure the cards table handles the data correctly:

```typescript
{cards.map((card) => (
  <tr key={card.id}>
    <td>{card.brand} •••• {card.last4}</td>
    <td>{card.holderName}</td>
    <td>{card.expiryMonth}/{card.expiryYear}</td>
    <td>{formatCurrency(card.totalSpent)}</td>
    <td>{card.transactionCount} transactions</td>
    <td>
      <span className={`badge ${card.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
        {card.status}
      </span>
    </td>
  </tr>
))}
```

### Test Verification
- [ ] Cards display correctly without nested data artifacts
- [ ] Card brand and last 4 digits shown properly
- [ ] Expiry dates formatted correctly
- [ ] No JavaScript errors in console
- [ ] Empty state shown gracefully if no cards exist

---

## Bug 4: Agent Detail Page - parentAccount.id Undefined

### Priority: Critical
### Status: ✅ Fixed
### File: `apps/web/src/app/dashboard/agents/[id]/page.tsx`

### Problem Description
The Agent Detail page crashes with:
```
TypeError: Cannot read properties of undefined (reading 'id')
at AgentDetailPage (src/app/dashboard/agents/[id]/page.tsx:319:60)
```

The error occurs when trying to access `agent.parentAccount.id`.

### Reproduction Steps
1. Navigate to http://localhost:3000/dashboard/agents
2. Click on any agent to view details
3. Page crashes with the error

### Root Cause Analysis
The `agent` object has `parentAccount` that is either:
1. `undefined` or `null`
2. Missing the `id` property
3. Named differently (e.g., `parent_account_id` instead of nested object)

### Implementation Fix

```typescript
// Add null checks throughout the component

// Option 1: Use optional chaining
<Link
  href={`/dashboard/accounts/${agent?.parentAccount?.id || agent?.parent_account_id || ''}`}
  className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow"
>

// Option 2: Conditional rendering
{(agent?.parentAccount?.id || agent?.parent_account_id) && (
  <Link
    href={`/dashboard/accounts/${agent.parentAccount?.id || agent.parent_account_id}`}
    className="..."
  >
    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Parent Account</div>
    <div className="text-lg font-semibold text-gray-900 dark:text-white">
      {agent.parentAccount?.name || 'View Account'}
    </div>
  </Link>
)}

// Option 3: Early return with loading/error state
if (!agent) {
  return <div>Loading agent details...</div>;
}

// Check API response structure
useEffect(() => {
  const fetchAgent = async () => {
    const response = await api?.agents.get(id);
    // Handle double-nesting
    const agentData = response?.data?.data || response?.data || response;
    
    // Log to debug
    console.log('Agent data:', agentData);
    console.log('parentAccount:', agentData?.parentAccount);
    console.log('parent_account_id:', agentData?.parent_account_id);
    
    setAgent(agentData);
  };
  fetchAgent();
}, [id]);
```

### Additional Null Checks Needed
Review the entire file for similar patterns:
- `agent.wallet?.id`
- `agent.permissions?.map(...)`
- `agent.streams?.filter(...)`
- `agent.limits?.daily`

### Test Verification
- [ ] Agent detail page loads without crashing
- [ ] Parent Account section displays correctly (or is hidden if no parent)
- [ ] All agent information displays properly
- [ ] Links to related entities work correctly

---

## Bug 5: Refunds - Link Goes to List & Invalid Date

### Priority: Medium
### Status: ✅ Fixed
### File: `apps/web/src/app/dashboard/refunds/page.tsx`

### Problem Description
1. The "Original Transfer" link goes to `/dashboard/transfers` (list page) instead of the specific transfer detail page
2. Dates show as "Invalid Date"

### Reproduction Steps
1. Navigate to http://localhost:3000/dashboard/refunds
2. Click on the "Original Transfer" link for any refund
3. Observe it navigates to the transfers list, not the transfer detail
4. Observe "Invalid Date" in date columns

### Root Cause Analysis
1. **Link Issue**: The link is constructed as `/dashboard/transfers` without the transfer ID
2. **Date Issue**: The date value is either:
   - In snake_case (`created_at`) vs camelCase (`createdAt`)
   - Null/undefined
   - In an unexpected format

### Implementation Fix

```typescript
// Fix the Original Transfer link
<Link
  href={`/dashboard/transfers/${refund.originalTransferId || refund.original_transfer_id}`}
  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
>
  {(refund.originalTransferId || refund.original_transfer_id)?.slice(0, 8) || 'N/A'}...
  <ExternalLink className="h-3 w-3" />
</Link>

// If originalTransferId is missing, show disabled state
{(refund.originalTransferId || refund.original_transfer_id) ? (
  <Link
    href={`/dashboard/transfers/${refund.originalTransferId || refund.original_transfer_id}`}
    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
  >
    {(refund.originalTransferId || refund.original_transfer_id).slice(0, 8)}...
    <ExternalLink className="h-3 w-3" />
  </Link>
) : (
  <span className="text-sm text-gray-400">N/A</span>
)}

// Fix date formatting - use the locale helper or safe formatter
const formatRefundDate = (dateValue: string | Date | null | undefined) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return 'N/A';
  return formatDate(date); // Use the app's formatDate helper
};

// In the table
<td>{formatRefundDate(refund.createdAt || refund.created_at)}</td>
<td>{formatRefundDate(refund.processedAt || refund.processed_at)}</td>
```

### Seed Data Fix
Ensure the seed script creates refunds with valid `original_transfer_id`:

```typescript
// In seed-complete-test-data.ts
const refunds = [
  {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    original_transfer_id: transfers[0].id, // Must reference a real transfer
    amount: 50.00,
    currency: 'USDC',
    reason: 'Customer requested refund',
    status: 'completed',
    created_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
  },
  // ... more refunds referencing actual transfer IDs
];
```

### Test Verification
- [ ] "Original Transfer" link navigates to correct transfer detail page
- [ ] Dates display correctly (not "Invalid Date")
- [ ] Refunds without original transfer show "N/A" gracefully
- [ ] All refund data displays properly

---

## Bug 6: ACP Checkouts Page - Missing Padding/Margin

### Priority: Low
### Status: ✅ Fixed
### File: `apps/web/src/app/dashboard/agentic-payments/acp/checkouts/page.tsx`

### Problem Description
The ACP Checkouts page has a `space-y-6` div that is missing proper padding/margin, causing the content to appear cramped against the edges.

### Reproduction Steps
1. Navigate to http://localhost:3000/dashboard/agentic-payments/acp/checkouts
2. Observe the content has no breathing room from the edges

### Root Cause Analysis
The page content is missing the standard page padding that other pages use. This may be because:
1. The `agentic-payments/layout.tsx` was modified to remove padding (to fix x402 layout issue)
2. The page itself doesn't have its own padding

### Implementation Fix

```typescript
// In apps/web/src/app/dashboard/agentic-payments/acp/checkouts/page.tsx

export default function ACPCheckoutsPage() {
  return (
    <div className="p-6 space-y-6">  {/* Add p-6 for padding */}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ACP Checkouts
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your Agentic Commerce Protocol checkout sessions
          </p>
        </div>
        <Link href="/dashboard/agentic-payments/acp/checkouts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Checkout
          </Button>
        </Link>
      </div>
      
      {/* Content */}
      <div className="space-y-6">
        {/* ... rest of content ... */}
      </div>
    </div>
  );
}
```

### Alternative: Update Layout
If many agentic-payments pages need consistent padding, update the layout:

```typescript
// In apps/web/src/app/dashboard/agentic-payments/layout.tsx
export default function AgenticPaymentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      {children}
    </div>
  );
}
```

But be careful this doesn't re-introduce the x402 layout issue. Test both pages.

### Test Verification
- [ ] Page has proper padding on all sides
- [ ] Content is not cramped against edges
- [ ] Consistent spacing with other dashboard pages
- [ ] x402 endpoints page still displays full-width (no regression)

---

## Implementation Priority

1. **Critical** (Fix immediately):
   - Bug 4: Agent Detail Page crash

2. **High** (Fix soon):
   - Bug 1: X402 Endpoint Detail missing data
   - Bug 3: Cards List nested data

3. **Medium** (Fix this sprint):
   - Bug 2: Compliance Flags bad data
   - Bug 5: Refunds link and date issues

4. **Low** (Nice to have):
   - Bug 6: ACP Checkouts padding

---

## Testing Notes

After implementing fixes:
1. Run `pnpm build` in `apps/web` to verify no TypeScript errors
2. Test each page in the browser
3. Check browser console for any JavaScript errors
4. Verify Network tab shows correct API calls
5. Test with and without data to ensure empty states work

---

## Related Files to Check

These files may have similar issues and should be reviewed:
- `apps/web/src/app/dashboard/agentic-payments/ap2/mandates/page.tsx`
- `apps/web/src/app/dashboard/agentic-payments/x402/endpoints/page.tsx`
- `apps/web/src/app/dashboard/streams/[id]/page.tsx`
- Any other detail pages with nested data patterns



