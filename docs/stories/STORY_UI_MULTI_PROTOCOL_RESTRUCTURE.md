## Status
**Completed** (2025-12-27)
- Sidebar restructured
- Unified Analytics page created
- Protocol filters added
- x402 migration complete
- Verification confirmed via walkthrough

## Acceptance Criteria

### 1. Sidebar Restructure
- [x] Create "Agentic Payments" parent item
- [x] Add "Overview" and "Analytics" children
- [x] Add nested "x402" section (Endpoints, Integration)
- [x] Add nested "AP2" section (Mandates, Integration)
- [x] Add nested "ACP" section (Checkouts, Integration)
- [x] Migrate existing x402 links to new structure
- [x] Ensure mobile responsiveness

### 2. New Pages
- [x] Create `/dashboard/agentic-payments/page.tsx` (Overview)
- [x] Create `/dashboard/agentic-payments/analytics/page.tsx`
- [x] Implement Protocol Tabs (All / x402 / AP2 / ACP)
- [x] Create placeholder pages for AP2/ACP sections

### 3. Components
- [x] `ProtocolBadge` (supports x402, AP2, ACP variants)
- [x] `ProtocolSelector` (dropdown for forms/tables)
- [x] `CrossProtocolStats` widget (for Overview)
- [x] `ProtocolBreakdown` chart
- [x] `RecentActivityFeed` with protocol icons

### 4. Transfers Page Updates
- [x] Add Protocol Filter dropdown
- [x] Show Protocol Badge in transfer list
- [x] Update Transfer Details to show specific protocol metadata

### 5. Settings
- [x] Add "Agentic Payments" section
- [x] Add visibility toggles for each protocol (x402, AP2, ACP)

### 6. API Client
- [x] Add `agenticPayments` namespace to SDK
- [x] Implement `getSummary` and `getAnalytics` methods


**Story ID:** UI-17.1  
**Epic:** 17 - Multi-Protocol Gateway Infrastructure  
**Points:** 13  
**Priority:** High  
**Assignee:** Gemini  

---

## Summary

Restructure the PayOS dashboard UI to support multiple agentic payment protocols (x402, AP2, ACP) with a unified "Agentic Payments" hub while maintaining protocol-specific functionality.

---

## Background

PayOS is expanding from x402-only to support three agentic payment protocols:

| Protocol | Provider | Use Case | Primary Object |
|----------|----------|----------|----------------|
| **x402** | Coinbase/Cloudflare | HTTP 402 micropayments | Endpoints |
| **AP2** | Google | Agent mandate authorization | Mandates |
| **ACP** | Stripe/OpenAI | Agentic commerce checkout | Checkouts |

The UI needs to:
1. Provide a unified view across all protocols
2. Allow drill-down into protocol-specific features
3. Add protocol filters to existing pages (Transfers)
4. Be configurable per tenant (show/hide protocols)

---

## Acceptance Criteria

### 1. Sidebar Restructure

**Current:**
```
⚡ x402
├── Overview
├── Analytics
├── Endpoints
└── Integration
```

**New:**
```
⚡ Agentic Payments
├── Overview              → /dashboard/agentic-payments
├── Analytics             → /dashboard/agentic-payments/analytics
├── x402                  → /dashboard/agentic-payments/x402
│   ├── Endpoints         → /dashboard/agentic-payments/x402/endpoints
│   └── Integration       → /dashboard/agentic-payments/x402/integration
├── AP2                   → /dashboard/agentic-payments/ap2
│   ├── Mandates          → /dashboard/agentic-payments/ap2/mandates
│   └── Integration       → /dashboard/agentic-payments/ap2/integration
├── ACP                   → /dashboard/agentic-payments/acp
│   ├── Checkouts         → /dashboard/agentic-payments/acp/checkouts
│   └── Integration       → /dashboard/agentic-payments/acp/integration
└── Developers            → /dashboard/agentic-payments/developers
```

**Implementation:**

Update `apps/web/src/components/layout/sidebar.tsx`:

```tsx
const agenticPaymentsNav = [
  { 
    href: '/dashboard/agentic-payments', 
    label: 'Overview', 
    icon: LayoutDashboard 
  },
  { 
    href: '/dashboard/agentic-payments/analytics', 
    label: 'Analytics', 
    icon: BarChart3 
  },
  {
    label: 'x402',
    icon: Zap,
    children: [
      { href: '/dashboard/agentic-payments/x402/endpoints', label: 'Endpoints', icon: Globe },
      { href: '/dashboard/agentic-payments/x402/integration', label: 'Integration', icon: Code },
    ]
  },
  {
    label: 'AP2',
    icon: Bot,
    children: [
      { href: '/dashboard/agentic-payments/ap2/mandates', label: 'Mandates', icon: FileCheck },
      { href: '/dashboard/agentic-payments/ap2/integration', label: 'Integration', icon: Code },
    ]
  },
  {
    label: 'ACP',
    icon: ShoppingCart,
    children: [
      { href: '/dashboard/agentic-payments/acp/checkouts', label: 'Checkouts', icon: CreditCard },
      { href: '/dashboard/agentic-payments/acp/integration', label: 'Integration', icon: Code },
    ]
  },
  { 
    href: '/dashboard/agentic-payments/developers', 
    label: 'Developers', 
    icon: Terminal 
  },
];
```

---

### 2. Cross-Protocol Overview Dashboard

**Route:** `/dashboard/agentic-payments`  
**File:** `apps/web/src/app/dashboard/agentic-payments/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Agentic Payments Overview                               [Settings]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Total Revenue│  │ Transactions │  │ Active       │              │
│  │ $12,450.00   │  │ 45,230       │  │ Integrations │              │
│  │ +12.3% ▲     │  │ +8.5% ▲      │  │ 24           │              │
│  │ All protocols│  │ Last 30 days │  │ Across 3     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  Protocol Breakdown                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ⚡ x402          $8,200  (65.8%)   ████████████░░░░  →      │   │
│  │ 🤖 AP2           $3,100  (24.9%)   ██████░░░░░░░░░░  →      │   │
│  │ 🛒 ACP           $1,150  (9.2%)    ███░░░░░░░░░░░░░  →      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Revenue Trend (30 days)                    Protocol Filter: [All ▾]│
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                          ╱──── x402         │   │
│  │                                    ╱────╱                   │   │
│  │                              ╱────╱                         │   │
│  │          ╱──────────────────╱                               │   │
│  │    ╱────╱                                                   │   │
│  │ ──╱                                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Recent Activity                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ⚡ x402 payment   $0.02   Weather API Premium    2 min ago  │   │
│  │ 🤖 AP2 mandate    $50.00  Hotel Booking Agent   15 min ago  │   │
│  │ 🛒 ACP checkout   $129.99 Electronics Store     1 hour ago  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Components:**

1. **Stats Cards** - Total revenue, transaction count, active integrations
2. **Protocol Breakdown** - Bar chart showing revenue by protocol with click-through
3. **Revenue Trend** - Line chart with protocol overlay/filter
4. **Recent Activity** - Cross-protocol activity feed with protocol badges

**Data Fetching:**

```tsx
// New API endpoint needed: GET /v1/agentic-payments/summary
const { data: summary } = useQuery({
  queryKey: ['agentic-payments', 'summary', period],
  queryFn: () => api.agenticPayments.getSummary({ period }),
});

// Response shape:
interface AgenticPaymentsSummary {
  totalRevenue: number;
  totalTransactions: number;
  activeIntegrations: number;
  byProtocol: {
    x402: { revenue: number; transactions: number; integrations: number };
    ap2: { revenue: number; transactions: number; integrations: number };
    acp: { revenue: number; transactions: number; integrations: number };
  };
  recentActivity: Array<{
    id: string;
    protocol: 'x402' | 'ap2' | 'acp';
    type: string;
    amount: number;
    description: string;
    timestamp: string;
  }>;
}
```

---

### 3. Unified Analytics Page with Protocol Tabs

**Route:** `/dashboard/agentic-payments/analytics`  
**File:** `apps/web/src/app/dashboard/agentic-payments/analytics/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Agentic Payments Analytics                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [All Protocols] [x402] [AP2] [ACP]          Period: [30d ▾] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  <!-- Content changes based on selected tab -->                     │
│                                                                     │
│  When "All Protocols" selected:                                     │
│  - Cross-protocol comparison charts                                 │
│  - Protocol performance table                                       │
│  - Revenue distribution pie chart                                   │
│                                                                     │
│  When specific protocol selected:                                   │
│  - Protocol-specific metrics                                        │
│  - x402: Endpoint performance, API calls, latency                   │
│  - AP2: Mandate utilization, agent activity, budget consumption     │
│  - ACP: Checkout funnel, conversion rate, cart abandonment          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@sly/ui';

type Protocol = 'all' | 'x402' | 'ap2' | 'acp';

export default function AgenticAnalyticsPage() {
  const [protocol, setProtocol] = useState<Protocol>('all');
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <Tabs value={protocol} onValueChange={(v) => setProtocol(v as Protocol)}>
        <TabsList>
          <TabsTrigger value="all">All Protocols</TabsTrigger>
          <TabsTrigger value="x402">
            <Zap className="w-4 h-4 mr-1" /> x402
          </TabsTrigger>
          <TabsTrigger value="ap2">
            <Bot className="w-4 h-4 mr-1" /> AP2
          </TabsTrigger>
          <TabsTrigger value="acp">
            <ShoppingCart className="w-4 h-4 mr-1" /> ACP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CrossProtocolAnalytics period={period} />
        </TabsContent>
        <TabsContent value="x402">
          <X402Analytics period={period} />
        </TabsContent>
        <TabsContent value="ap2">
          <AP2Analytics period={period} />
        </TabsContent>
        <TabsContent value="acp">
          <ACPAnalytics period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### 4. Protocol Filter on Transfers Page

**File:** `apps/web/src/app/dashboard/transfers/page.tsx`

**Add protocol filter to existing filters:**

```tsx
// Add to filter bar
<Select 
  value={filters.protocol || 'all'} 
  onValueChange={(v) => setFilters({ ...filters, protocol: v === 'all' ? undefined : v })}
>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="All Protocols" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Protocols</SelectItem>
    <SelectItem value="x402">
      <span className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" /> x402
      </span>
    </SelectItem>
    <SelectItem value="ap2">
      <span className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-blue-500" /> AP2
      </span>
    </SelectItem>
    <SelectItem value="acp">
      <span className="flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-green-500" /> ACP
      </span>
    </SelectItem>
  </SelectContent>
</Select>
```

**Add protocol badge to transfer rows:**

Create new component `apps/web/src/components/transfers/protocol-badge.tsx`:

```tsx
import { Zap, Bot, ShoppingCart } from 'lucide-react';
import { Badge } from '@sly/ui';
import { cn } from '@sly/ui';

interface ProtocolBadgeProps {
  protocol?: 'x402' | 'ap2' | 'acp' | null;
  size?: 'sm' | 'md';
}

const protocolConfig = {
  x402: {
    label: 'x402',
    icon: Zap,
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
  ap2: {
    label: 'AP2',
    icon: Bot,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  acp: {
    label: 'ACP',
    icon: ShoppingCart,
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
};

export function ProtocolBadge({ protocol, size = 'sm' }: ProtocolBadgeProps) {
  if (!protocol || !protocolConfig[protocol]) {
    return null;
  }

  const config = protocolConfig[protocol];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1', config.className)}
    >
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );
}
```

**Update TransferRow to show protocol badge:**

```tsx
// In transfer list/table component
<TableRow>
  <TableCell>
    <div className="flex items-center gap-2">
      <span>{transfer.id.slice(0, 8)}...</span>
      {transfer.protocolMetadata?.protocol && (
        <ProtocolBadge protocol={transfer.protocolMetadata.protocol} />
      )}
    </div>
  </TableCell>
  {/* ... rest of columns */}
</TableRow>
```

---

### 5. Protocol Visibility Settings

**File:** `apps/web/src/app/dashboard/settings/page.tsx`

**Add new section to settings page:**

```tsx
// Add to settings page
<Card>
  <CardHeader>
    <CardTitle>Agentic Payments</CardTitle>
    <CardDescription>
      Configure which payment protocols are visible in your dashboard
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>x402 (HTTP 402 Micropayments)</Label>
        <p className="text-sm text-muted-foreground">
          API monetization and pay-per-request
        </p>
      </div>
      <Switch 
        checked={settings.protocols?.x402 !== false}
        onCheckedChange={(checked) => updateProtocolVisibility('x402', checked)}
      />
    </div>
    
    <Separator />
    
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>AP2 (Google Agent Payments)</Label>
        <p className="text-sm text-muted-foreground">
          Mandate-based agent authorization
        </p>
      </div>
      <Switch 
        checked={settings.protocols?.ap2 !== false}
        onCheckedChange={(checked) => updateProtocolVisibility('ap2', checked)}
      />
    </div>
    
    <Separator />
    
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>ACP (Agentic Commerce Protocol)</Label>
        <p className="text-sm text-muted-foreground">
          Checkout sessions and shared payment tokens
        </p>
      </div>
      <Switch 
        checked={settings.protocols?.acp !== false}
        onCheckedChange={(checked) => updateProtocolVisibility('acp', checked)}
      />
    </div>
  </CardContent>
</Card>
```

**Store in tenant settings (database):**

```sql
-- Settings are stored in tenant_settings table
-- Add protocol visibility to existing settings JSONB

UPDATE tenant_settings 
SET settings = settings || '{"protocols": {"x402": true, "ap2": true, "acp": true}}'::jsonb
WHERE tenant_id = '...';
```

**Use settings to filter sidebar:**

```tsx
// In sidebar.tsx
const { data: settings } = useSettings();

const visibleProtocols = {
  x402: settings?.protocols?.x402 !== false,
  ap2: settings?.protocols?.ap2 !== false,
  acp: settings?.protocols?.acp !== false,
};

// Filter nav items based on visibility
const filteredAgenticNav = agenticPaymentsNav.filter(item => {
  if (item.label === 'x402' && !visibleProtocols.x402) return false;
  if (item.label === 'AP2' && !visibleProtocols.ap2) return false;
  if (item.label === 'ACP' && !visibleProtocols.acp) return false;
  return true;
});
```

---

### 6. Route Redirects for Backward Compatibility

**File:** `apps/web/src/app/dashboard/x402/page.tsx`

Redirect old x402 routes to new structure:

```tsx
import { redirect } from 'next/navigation';

export default function X402RedirectPage() {
  redirect('/dashboard/agentic-payments/x402');
}
```

Create redirects for all old routes:
- `/dashboard/x402` → `/dashboard/agentic-payments/x402`
- `/dashboard/x402/analytics` → `/dashboard/agentic-payments/analytics?protocol=x402`
- `/dashboard/x402/endpoints` → `/dashboard/agentic-payments/x402/endpoints`
- `/dashboard/x402/integration` → `/dashboard/agentic-payments/x402/integration`

---

### 7. File Structure

**New files to create:**

```
apps/web/src/app/dashboard/agentic-payments/
├── page.tsx                           # Cross-protocol overview
├── layout.tsx                         # Shared layout
├── analytics/
│   └── page.tsx                       # Unified analytics with tabs
├── developers/
│   └── page.tsx                       # Developer docs hub
├── x402/
│   ├── page.tsx                       # x402 overview (redirect to endpoints)
│   ├── endpoints/
│   │   ├── page.tsx                   # Move from /dashboard/x402/endpoints
│   │   └── [id]/
│   │       └── page.tsx               # Move from /dashboard/x402/endpoints/[id]
│   └── integration/
│       └── page.tsx                   # Move from /dashboard/x402/integration
├── ap2/
│   ├── page.tsx                       # AP2 overview
│   ├── mandates/
│   │   ├── page.tsx                   # AP2 mandates list
│   │   └── [id]/
│   │       └── page.tsx               # Mandate detail
│   └── integration/
│       └── page.tsx                   # AP2 integration guide
└── acp/
    ├── page.tsx                       # ACP overview
    ├── checkouts/
    │   ├── page.tsx                   # ACP checkouts list
    │   └── [id]/
    │       └── page.tsx               # Checkout detail
    └── integration/
        └── page.tsx                   # ACP integration guide

apps/web/src/components/
├── agentic-payments/
│   ├── protocol-badge.tsx             # Protocol badge component
│   ├── protocol-selector.tsx          # Protocol dropdown selector
│   ├── cross-protocol-stats.tsx       # Stats cards for overview
│   ├── protocol-breakdown-chart.tsx   # Bar chart showing protocol distribution
│   └── recent-activity-feed.tsx       # Cross-protocol activity feed
```

---

### 8. API Client Updates

**File:** `packages/api-client/src/index.ts`

Add new methods:

```typescript
// Add to ApiClient class
agenticPayments = {
  getSummary: async (params: { period: string }) => {
    return this.get<AgenticPaymentsSummary>(
      `/agentic-payments/summary?period=${params.period}`
    );
  },
  
  getAnalytics: async (params: { period: string; protocol?: string }) => {
    const query = new URLSearchParams({ period: params.period });
    if (params.protocol) query.set('protocol', params.protocol);
    return this.get<AgenticPaymentsAnalytics>(
      `/agentic-payments/analytics?${query}`
    );
  },
};
```

---

## Migration Steps

### Phase 1: Create New Structure (Keep old routes working)
1. Create `/dashboard/agentic-payments/` directory structure
2. Create new overview page
3. Create unified analytics page
4. Create protocol-specific placeholder pages (AP2, ACP)

### Phase 2: Move Existing x402 Pages
1. Move x402 pages to new structure
2. Add redirects from old routes
3. Update all internal links

### Phase 3: Add Protocol Features
1. Add ProtocolBadge component
2. Add protocol filter to Transfers page
3. Add protocol visibility to Settings

### Phase 4: Update Sidebar
1. Update sidebar navigation
2. Add collapsible protocol sub-sections
3. Integrate with protocol visibility settings

### Phase 5: Cleanup
1. Test all redirects
2. Remove any dead code
3. Update documentation

---

## Design Guidelines

### Protocol Colors
```css
/* x402 - Yellow/Gold (representing value/micropayments) */
--x402-primary: #EAB308;
--x402-bg: rgba(234, 179, 8, 0.1);

/* AP2 - Blue (representing trust/authorization) */
--ap2-primary: #3B82F6;
--ap2-bg: rgba(59, 130, 246, 0.1);

/* ACP - Green (representing commerce/checkout) */
--acp-primary: #22C55E;
--acp-bg: rgba(34, 197, 94, 0.1);
```

### Protocol Icons
```tsx
import { Zap, Bot, ShoppingCart } from 'lucide-react';

// x402: Zap (⚡) - represents speed/micropayments
// AP2: Bot (🤖) - represents agents
// ACP: ShoppingCart (🛒) - represents commerce
```

### Protocol Labels
- **x402**: "x402" or "HTTP 402 Payments"
- **AP2**: "AP2" or "Agent Payment Protocol"
- **ACP**: "ACP" or "Agentic Commerce"

---

## Testing Checklist

- [ ] All old x402 routes redirect correctly
- [ ] Cross-protocol overview shows data from all protocols
- [ ] Analytics tabs switch correctly
- [ ] Protocol filter on Transfers works
- [ ] Protocol badges display correctly
- [ ] Settings toggle shows/hides protocols in sidebar
- [ ] Mobile responsive layout works
- [ ] Dark mode styling correct for all protocols
- [ ] Empty states show for protocols with no data

---

## Dependencies

### Backend APIs Needed (Claude will implement):
- `GET /v1/agentic-payments/summary` - Cross-protocol summary
- `GET /v1/agentic-payments/analytics` - Unified analytics
- Protocol filter on existing `GET /v1/transfers` endpoint (already done via `type` param)

### No Backend Changes Needed For:
- Route restructure (frontend only)
- Protocol badges (uses existing `protocolMetadata` field)
- Settings storage (uses existing tenant_settings)

---

## Out of Scope

- AP2 mandate management UI (separate story)
- ACP checkout UI (separate story)
- Real-time protocol metrics (future enhancement)
- Protocol-specific webhooks configuration (future enhancement)

---

## Notes for Implementation

1. **Start with the sidebar** - This is the most visible change
2. **Use existing x402 analytics components** - Refactor to be protocol-agnostic
3. **The overview page is the "wow" moment** - Make it visually impressive
4. **Protocol badges should be subtle** - Don't overwhelm the transfers list
5. **Settings should default to all protocols visible** - Don't hide features

---

**Story Created:** December 27, 2025  
**Author:** Claude  
**For:** Gemini Implementation

