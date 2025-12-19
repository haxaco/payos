# Epic 0: Data Model Strategy

**Date:** December 18, 2025  
**Purpose:** Technical design for leveraging existing data model for UI completion

---

## Overview

Epic 0 requires NO new tables or schema changes for Stories 0.1 & 0.2. Everything needed exists in the current schema:

- ✅ `accounts` - Balances, verification status, account counts
- ✅ `transfers` - Transaction volume, recent activity, monthly trends
- ✅ `streams` - Flow rates, active stream counts, netflow calculations
- ✅ `payment_methods` - Card counts
- ✅ `compliance_flags` - Open flags, risk levels
- ✅ `agents` - Agent counts, types

---

## Story 0.1: Dashboard & Home Page Real Data

### Current UI Needs

**HomePage.tsx** currently shows:
```typescript
// Hardcoded stats
- Active Accounts: 1,234
- Total Volume: $2.4M
- Cards Issued: 89
- Pending Flags: 23

// Hardcoded chart
const volumeData = [
  { month: 'Jul', usArg: 1200, usCol: 840, usMex: 520 },
  // ...
];

// Hardcoded activity
const recentActivity = [
  { time: '14:32', type: 'Transfer', amount: '$4,800', from: 'TechCorp', to: 'Maria G.', status: 'completed' },
  // ...
];
```

**Dashboard.tsx** currently shows:
```typescript
// Similar hardcoded data
- Total volume, account count, transaction count
- Volume chart by month
- Recent transactions list
```

---

### Data Model Solution

#### **1. Account Statistics**

**Query:**
```sql
-- Get account statistics for a tenant
SELECT 
  COUNT(*) as total_accounts,
  COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_accounts,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_accounts_30d,
  COUNT(*) FILTER (WHERE type = 'business') as business_accounts,
  COUNT(*) FILTER (WHERE type = 'person') as person_accounts
FROM accounts 
WHERE tenant_id = $1;
```

**Available Fields:**
- `id`, `tenant_id`, `type`, `name`, `email`
- `verification_tier`, `verification_status`, `verification_type`
- `balance_total`, `balance_available`, `balance_in_streams`
- `created_at`, `updated_at`

**Why This Works:**
- Single query, fast aggregation
- Uses indexed `tenant_id` column
- `FILTER` clause for conditional counts (PostgreSQL feature)

---

#### **2. Card Statistics**

**Query:**
```sql
-- Get card/payment method statistics
SELECT 
  COUNT(*) as total_payment_methods,
  COUNT(*) FILTER (WHERE type = 'card') as cards,
  COUNT(*) FILTER (WHERE type = 'bank_account') as bank_accounts,
  COUNT(*) FILTER (WHERE type = 'crypto_wallet') as wallets,
  COUNT(*) FILTER (WHERE is_verified = true) as verified,
  COUNT(*) FILTER (WHERE is_default = true) as default_methods
FROM payment_methods
WHERE tenant_id = $1;
```

**Available Fields:**
- `type` - 'card', 'bank_account', 'crypto_wallet'
- `is_verified`, `is_default`
- `card_last_four`, `bank_account_last_four`

**Why This Works:**
- Simple aggregation on existing columns
- Type-based filtering for card count

---

#### **3. Compliance Flags**

**Query:**
```sql
-- Get compliance flag statistics
SELECT 
  COUNT(*) as total_flags,
  COUNT(*) FILTER (WHERE status = 'open') as open_flags,
  COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_flags,
  COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_flags,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_flags_7d
FROM compliance_flags
WHERE tenant_id = $1;
```

**Available Fields:**
- `flag_type`, `risk_level`, `status`
- `account_id`, `transfer_id`
- `reason_code`, `reasons`, `description`
- `created_at`

**Why This Works:**
- Direct count of open flags
- Risk level filtering available
- Fast on indexed tenant_id

---

#### **4. Transaction Volume & History**

**Query for Volume by Month:**
```sql
-- Get monthly transaction volume (last 6 months)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(amount) as total_volume,
  COUNT(*) as transaction_count,
  AVG(amount) as avg_transaction_amount,
  
  -- Volume by corridor (for chart breakdown)
  SUM(amount) FILTER (WHERE corridor_id LIKE 'US-ARG%') as us_arg_volume,
  SUM(amount) FILTER (WHERE corridor_id LIKE 'US-COL%') as us_col_volume,
  SUM(amount) FILTER (WHERE corridor_id LIKE 'US-MEX%') as us_mex_volume
  
FROM transfers
WHERE tenant_id = $1 
  AND created_at > NOW() - INTERVAL '6 months'
  AND status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

**Query for Recent Activity:**
```sql
-- Get recent transfers with flag status
SELECT 
  t.id,
  t.created_at,
  t.type,
  t.amount,
  t.currency,
  t.status,
  t.from_account_name,
  t.to_account_name,
  t.initiated_by_type,
  t.initiated_by_name,
  
  -- Check if flagged by joining compliance_flags
  CASE 
    WHEN cf.id IS NOT NULL THEN true 
    ELSE false 
  END as is_flagged,
  cf.risk_level,
  cf.reason_code
  
FROM transfers t
LEFT JOIN compliance_flags cf 
  ON cf.transfer_id = t.id 
  AND cf.status = 'open'
WHERE t.tenant_id = $1
ORDER BY t.created_at DESC
LIMIT 10;
```

**Available Fields in Transfers:**
- `id`, `tenant_id`, `type`, `status`
- `from_account_id`, `from_account_name`
- `to_account_id`, `to_account_name`
- `amount`, `currency`, `destination_amount`, `destination_currency`
- `fx_rate`, `corridor_id`
- `fee_amount`, `fee_breakdown`
- `initiated_by_type`, `initiated_by_id`, `initiated_by_name`
- `created_at`, `completed_at`

**Why This Works:**
- `transfers` table has denormalized account names (fast!)
- `corridor_id` allows breakdown by country pairs
- LEFT JOIN with `compliance_flags` shows flag status
- No need for complex subqueries

---

### API Endpoint Design

#### **GET /v1/reports/dashboard/summary**

**Implementation:**
```typescript
// apps/api/src/routes/reports.ts

router.get('/dashboard/summary', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // 1. Account stats
  const { data: accountStats } = await supabase.rpc(
    'get_dashboard_account_stats',
    { p_tenant_id: ctx.tenantId }
  );
  
  // 2. Payment method stats
  const { data: paymentStats } = await supabase
    .from('payment_methods')
    .select('type, is_verified, is_default')
    .eq('tenant_id', ctx.tenantId);
    
  const cardCount = paymentStats?.filter(p => p.type === 'card').length || 0;
  
  // 3. Compliance stats
  const { data: flagStats } = await supabase
    .from('compliance_flags')
    .select('status, risk_level')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'open');
    
  const openFlags = flagStats?.length || 0;
  
  // 4. Volume data
  const { data: volumeData } = await supabase.rpc(
    'get_monthly_volume',
    { p_tenant_id: ctx.tenantId, p_months: 6 }
  );
  
  // 5. Recent activity
  const { data: recentTransfers } = await supabase
    .from('transfers')
    .select(`
      id,
      created_at,
      type,
      amount,
      currency,
      status,
      from_account_name,
      to_account_name,
      initiated_by_name,
      compliance_flags!left (
        id,
        risk_level,
        reason_code
      )
    `)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  return c.json({
    data: {
      accounts: {
        total: accountStats?.total_accounts || 0,
        verified: accountStats?.verified_accounts || 0,
        new_30d: accountStats?.new_accounts_30d || 0,
      },
      cards: {
        total: cardCount,
      },
      compliance: {
        open_flags: openFlags,
        high_risk: flagStats?.filter(f => f.risk_level === 'high').length || 0,
      },
      volume: {
        by_month: volumeData || [],
        total_last_30d: volumeData?.[0]?.total_volume || 0,
      },
      recent_activity: recentTransfers?.map(t => ({
        id: t.id,
        time: t.created_at,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        from: t.from_account_name,
        to: t.to_account_name,
        status: t.status,
        is_flagged: t.compliance_flags?.length > 0,
        risk_level: t.compliance_flags?.[0]?.risk_level,
      })) || [],
    }
  });
});
```

**Database Functions (Optional - for performance):**
```sql
-- apps/api/supabase/migrations/20251218_dashboard_functions.sql

-- Function for account stats
CREATE OR REPLACE FUNCTION get_dashboard_account_stats(p_tenant_id UUID)
RETURNS TABLE(
  total_accounts BIGINT,
  verified_accounts BIGINT,
  new_accounts_30d BIGINT,
  business_accounts BIGINT,
  person_accounts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE verification_status = 'verified'),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
    COUNT(*) FILTER (WHERE type = 'business'),
    COUNT(*) FILTER (WHERE type = 'person')
  FROM accounts 
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function for monthly volume
CREATE OR REPLACE FUNCTION get_monthly_volume(
  p_tenant_id UUID,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE(
  month TIMESTAMP WITH TIME ZONE,
  total_volume NUMERIC,
  transaction_count BIGINT,
  us_arg_volume NUMERIC,
  us_col_volume NUMERIC,
  us_mex_volume NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(amount) as total_volume,
    COUNT(*) as transaction_count,
    SUM(amount) FILTER (WHERE corridor_id LIKE 'US-ARG%') as us_arg_volume,
    SUM(amount) FILTER (WHERE corridor_id LIKE 'US-COL%') as us_col_volume,
    SUM(amount) FILTER (WHERE corridor_id LIKE 'US-MEX%') as us_mex_volume
  FROM transfers
  WHERE tenant_id = p_tenant_id 
    AND created_at > NOW() - INTERVAL '1 month' * p_months
    AND status = 'completed'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Why Use Functions:**
- ✅ Encapsulates complex queries
- ✅ Better performance (query plan caching)
- ✅ Security: SECURITY DEFINER bypasses RLS for internal logic
- ✅ Reusable across multiple endpoints

---

### Frontend Integration

#### **New Hook: `useDashboardSummary`**

```typescript
// payos-ui/src/hooks/api/useDashboard.ts

import { useApi } from './useApi';

export interface DashboardSummary {
  accounts: {
    total: number;
    verified: number;
    new_30d: number;
  };
  cards: {
    total: number;
  };
  compliance: {
    open_flags: number;
    high_risk: number;
  };
  volume: {
    by_month: Array<{
      month: string;
      total_volume: number;
      transaction_count: number;
      us_arg_volume: number;
      us_col_volume: number;
      us_mex_volume: number;
    }>;
    total_last_30d: number;
  };
  recent_activity: Array<{
    id: string;
    time: string;
    type: string;
    amount: number;
    currency: string;
    from: string;
    to: string;
    status: string;
    is_flagged: boolean;
    risk_level?: string;
  }>;
}

export function useDashboardSummary() {
  return useApi<{ data: DashboardSummary }>('/v1/reports/dashboard/summary');
}
```

#### **Updated HomePage.tsx**

```typescript
// payos-ui/src/pages/HomePage.tsx

import { useDashboardSummary } from '../hooks/api/useDashboard';

export function HomePage() {
  const navigate = useNavigate();
  const { data, loading, error } = useDashboardSummary();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return <ErrorMessage message={error.message} />;
  }
  
  const summary = data?.data;
  
  return (
    <div className="p-8 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Active Accounts"
          value={summary?.accounts.total.toLocaleString() || '0'}
          icon={Users}
          onClick={() => navigate('/accounts')}
        />
        <StatCard
          label="Total Volume"
          value={`$${(summary?.volume.total_last_30d / 1000).toFixed(1)}K`}
          icon={DollarSign}
        />
        <StatCard
          label="Cards Issued"
          value={summary?.cards.total.toString() || '0'}
          icon={CreditCard}
          onClick={() => navigate('/cards')}
        />
        <StatCard
          label="Pending Flags"
          value={summary?.compliance.open_flags.toString() || '0'}
          icon={AlertTriangle}
          onClick={() => navigate('/compliance')}
        />
      </div>
      
      {/* Volume Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h3>Payment Volume Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={summary?.volume.by_month || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="us_arg_volume" fill="#3b82f6" name="US → Argentina" />
            <Bar dataKey="us_col_volume" fill="#10b981" name="US → Colombia" />
            <Bar dataKey="us_mex_volume" fill="#f59e0b" name="US → Mexico" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h3>Recent Activity</h3>
        <div className="space-y-2">
          {summary?.recent_activity.map(activity => (
            <div key={activity.id} className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">{activity.time}</span>
                <span className="ml-2">{activity.type}</span>
                <span className="ml-2 text-gray-500">{activity.from} → {activity.to}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">{activity.amount} {activity.currency}</span>
                {activity.status === 'completed' && <span className="text-green-600">✓</span>}
                {activity.status === 'pending' && <span className="text-amber-600">⏳</span>}
                {activity.is_flagged && <span className="text-red-600">🚩</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Key Changes:**
- ❌ Remove `const volumeData = [...]` hardcoded array
- ❌ Remove `const recentActivity = [...]` hardcoded array
- ✅ Use `useDashboardSummary()` hook
- ✅ Render real data from API
- ✅ Add loading/error states

---

## Story 0.2: Treasury Page Real Data

### Current UI Needs

**TreasuryPage.tsx** currently shows:
```typescript
// Hardcoded float balances
- USDC: $2.4M (80% healthy)
- ARS: $840K (60% adequate)
- COP: $45K (20% low) ⚠️
- MXN: $320K (50% adequate)

// Hardcoded projection chart
const floatData = [
  { time: 'Now', usdc: 2400, cop: 450, min: 200 },
  // ...
];

// Hardcoded netflow
- Inflows: +$12,960/mo (3 streams)
- Outflows: -$7,776/mo (18 contractors)
- Net: +$5,184/mo
```

---

### Data Model Solution

#### **1. Aggregate Balances by Currency**

**Query:**
```sql
-- Get treasury summary: aggregate balances across all accounts
SELECT 
  currency,
  SUM(balance_total) as total_balance,
  SUM(balance_available) as available_balance,
  SUM(balance_in_streams) as balance_in_streams,
  COUNT(*) as account_count,
  
  -- Calculate health thresholds
  CASE
    WHEN SUM(balance_available) > 2000000 THEN 'healthy'
    WHEN SUM(balance_available) > 500000 THEN 'adequate'
    WHEN SUM(balance_available) > 100000 THEN 'low'
    ELSE 'critical'
  END as health_status,
  
  -- Percentage utilization (if we set limits)
  ROUND((SUM(balance_in_streams) / NULLIF(SUM(balance_total), 0) * 100)::NUMERIC, 2) as stream_utilization_pct
  
FROM accounts
WHERE tenant_id = $1
GROUP BY currency
ORDER BY total_balance DESC;
```

**Available Fields in Accounts:**
- `balance_total` - Total balance including locked/streamed
- `balance_available` - Available for immediate use
- `balance_in_streams` - Currently locked in active streams
- `balance_buffer` - Buffer for stream runway
- `currency` - USDC, ARS, COP, MXN, etc.

**Why This Works:**
- Single query aggregates all accounts
- Natural grouping by currency
- Health status calculated in database
- Fast aggregation on numeric fields

---

#### **2. Stream Netflow Calculations**

**Query:**
```sql
-- Calculate stream netflow (inflows vs outflows)
WITH tenant_accounts AS (
  SELECT id FROM accounts WHERE tenant_id = $1
),
inflows AS (
  SELECT 
    COUNT(*) as stream_count,
    SUM(flow_rate_per_month) as total_inflow
  FROM streams
  WHERE tenant_id = $1 
    AND status = 'active'
    AND receiver_account_id IN (SELECT id FROM tenant_accounts)
),
outflows AS (
  SELECT 
    COUNT(*) as stream_count,
    SUM(flow_rate_per_month) as total_outflow
  FROM streams
  WHERE tenant_id = $1
    AND status = 'active'
    AND sender_account_id IN (SELECT id FROM tenant_accounts)
)
SELECT 
  COALESCE(i.stream_count, 0) as inflow_stream_count,
  COALESCE(i.total_inflow, 0) as total_inflow_per_month,
  COALESCE(o.stream_count, 0) as outflow_stream_count,
  COALESCE(o.total_outflow, 0) as total_outflow_per_month,
  COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0) as net_flow_per_month,
  
  -- Daily and hourly rates
  (COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0)) / 30 as net_flow_per_day,
  (COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0)) / 30 / 24 as net_flow_per_hour
FROM inflows i
CROSS JOIN outflows o;
```

**Available Fields in Streams:**
- `flow_rate_per_second` - Rate per second
- `flow_rate_per_month` - Pre-calculated monthly rate
- `sender_account_id`, `receiver_account_id` - Flow direction
- `status` - 'active', 'paused', 'cancelled'
- `total_streamed`, `total_withdrawn` - Historical totals

**Why This Works:**
- Streams table has pre-calculated monthly rates
- CTE separates inflows from outflows clearly
- Single query returns complete netflow picture
- Handles cases where tenant has no streams

---

#### **3. Float Projection (Future Enhancement)**

**Basic Query (Current + Scheduled):**
```sql
-- Project future balances based on scheduled transfers
SELECT 
  currency,
  SUM(balance_available) as current_balance,
  
  -- Scheduled outflows next 48 hours
  COALESCE((
    SELECT SUM(amount)
    FROM transfers
    WHERE from_account_id IN (SELECT id FROM accounts WHERE tenant_id = $1)
      AND status = 'pending'
      AND scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
      AND currency = a.currency
  ), 0) as scheduled_outflows_48h,
  
  -- Projected balance in 48h
  SUM(balance_available) - COALESCE((
    SELECT SUM(amount)
    FROM transfers
    WHERE from_account_id IN (SELECT id FROM accounts WHERE tenant_id = $1)
      AND status = 'pending'
      AND scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
      AND currency = a.currency
  ), 0) as projected_balance_48h
  
FROM accounts a
WHERE tenant_id = $1
GROUP BY currency;
```

**Available Fields in Transfers:**
- `scheduled_for` - When scheduled transfer will execute
- `amount`, `currency` - Transfer details
- `status` - Can filter for 'pending' scheduled transfers

**Why This Works:**
- Uses `scheduled_for` field for future projections
- Subquery calculates pending outflows
- Simple subtraction for projection

**Note:** Full AI-powered projection (with ML predictions) would be part of Epic 8 (AI Insights).

---

### API Endpoint Design

#### **GET /v1/reports/treasury/summary**

```typescript
// apps/api/src/routes/reports.ts

router.get('/treasury/summary', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // 1. Aggregate balances by currency
  const { data: currencyBalances } = await supabase.rpc(
    'get_treasury_currency_summary',
    { p_tenant_id: ctx.tenantId }
  );
  
  // 2. Stream netflow
  const { data: netflow } = await supabase.rpc(
    'get_stream_netflow',
    { p_tenant_id: ctx.tenantId }
  );
  
  // 3. Scheduled transfers (for basic projection)
  const { data: scheduledTransfers } = await supabase
    .from('transfers')
    .select('amount, currency, scheduled_for')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'pending')
    .not('scheduled_for', 'is', null)
    .gte('scheduled_for', new Date().toISOString())
    .lte('scheduled_for', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());
  
  return c.json({
    data: {
      currencies: currencyBalances || [],
      netflow: netflow || {
        inflow_stream_count: 0,
        total_inflow_per_month: 0,
        outflow_stream_count: 0,
        total_outflow_per_month: 0,
        net_flow_per_month: 0,
        net_flow_per_day: 0,
        net_flow_per_hour: 0,
      },
      scheduled_outflows_48h: scheduledTransfers || [],
    }
  });
});
```

#### **Database Functions:**

```sql
-- apps/api/supabase/migrations/20251218_treasury_functions.sql

-- Function for currency summary
CREATE OR REPLACE FUNCTION get_treasury_currency_summary(p_tenant_id UUID)
RETURNS TABLE(
  currency TEXT,
  total_balance NUMERIC,
  available_balance NUMERIC,
  balance_in_streams NUMERIC,
  account_count BIGINT,
  health_status TEXT,
  stream_utilization_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.currency,
    SUM(a.balance_total) as total_balance,
    SUM(a.balance_available) as available_balance,
    SUM(a.balance_in_streams) as balance_in_streams,
    COUNT(*) as account_count,
    
    CASE
      WHEN SUM(a.balance_available) > 2000000 THEN 'healthy'
      WHEN SUM(a.balance_available) > 500000 THEN 'adequate'
      WHEN SUM(a.balance_available) > 100000 THEN 'low'
      ELSE 'critical'
    END as health_status,
    
    ROUND((SUM(a.balance_in_streams) / NULLIF(SUM(a.balance_total), 0) * 100)::NUMERIC, 2) as stream_utilization_pct
    
  FROM accounts a
  WHERE a.tenant_id = p_tenant_id
  GROUP BY a.currency
  ORDER BY total_balance DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function for stream netflow
CREATE OR REPLACE FUNCTION get_stream_netflow(p_tenant_id UUID)
RETURNS TABLE(
  inflow_stream_count BIGINT,
  total_inflow_per_month NUMERIC,
  outflow_stream_count BIGINT,
  total_outflow_per_month NUMERIC,
  net_flow_per_month NUMERIC,
  net_flow_per_day NUMERIC,
  net_flow_per_hour NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH tenant_accounts AS (
    SELECT id FROM accounts WHERE tenant_id = p_tenant_id
  ),
  inflows AS (
    SELECT 
      COUNT(*) as stream_count,
      SUM(flow_rate_per_month) as total_inflow
    FROM streams
    WHERE tenant_id = p_tenant_id 
      AND status = 'active'
      AND receiver_account_id IN (SELECT id FROM tenant_accounts)
  ),
  outflows AS (
    SELECT 
      COUNT(*) as stream_count,
      SUM(flow_rate_per_month) as total_outflow
    FROM streams
    WHERE tenant_id = p_tenant_id
      AND status = 'active'
      AND sender_account_id IN (SELECT id FROM tenant_accounts)
  )
  SELECT 
    COALESCE(i.stream_count, 0)::BIGINT,
    COALESCE(i.total_inflow, 0),
    COALESCE(o.stream_count, 0)::BIGINT,
    COALESCE(o.total_outflow, 0),
    COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0),
    (COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0)) / 30,
    (COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0)) / 30 / 24
  FROM inflows i
  CROSS JOIN outflows o;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

### Frontend Integration

#### **New Hook: `useTreasurySummary`**

```typescript
// payos-ui/src/hooks/api/useTreasury.ts

import { useApi } from './useApi';

export interface TreasurySummary {
  currencies: Array<{
    currency: string;
    total_balance: number;
    available_balance: number;
    balance_in_streams: number;
    account_count: number;
    health_status: 'healthy' | 'adequate' | 'low' | 'critical';
    stream_utilization_pct: number;
  }>;
  netflow: {
    inflow_stream_count: number;
    total_inflow_per_month: number;
    outflow_stream_count: number;
    total_outflow_per_month: number;
    net_flow_per_month: number;
    net_flow_per_day: number;
    net_flow_per_hour: number;
  };
  scheduled_outflows_48h: Array<{
    amount: number;
    currency: string;
    scheduled_for: string;
  }>;
}

export function useTreasurySummary() {
  return useApi<{ data: TreasurySummary }>('/v1/reports/treasury/summary');
}
```

#### **Updated TreasuryPage.tsx**

```typescript
// payos-ui/src/pages/TreasuryPage.tsx

import { useTreasurySummary } from '../hooks/api/useTreasury';

export function TreasuryPage({ onNavigate }: TreasuryPageProps) {
  const { data, loading, error } = useTreasurySummary();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;
  
  const treasury = data?.data;
  
  const healthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-600';
      case 'adequate': return 'bg-green-600';
      case 'low': return 'bg-red-600';
      case 'critical': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };
  
  return (
    <div className="p-8 space-y-6">
      <h1>Treasury</h1>
      
      {/* Float Cards */}
      <div className="grid grid-cols-4 gap-4">
        {treasury?.currencies.map(curr => (
          <div key={curr.currency} className="bg-white rounded-lg p-5">
            <div className="text-sm text-gray-600">{curr.currency}</div>
            <div className="text-2xl font-bold">
              ${(curr.available_balance / 1000).toFixed(1)}K
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full ${healthColor(curr.health_status)} rounded-full`}
                style={{ width: `${Math.min(curr.stream_utilization_pct, 100)}%` }}
              />
            </div>
            <div className="text-xs text-green-600 font-semibold capitalize">
              {curr.health_status}
            </div>
          </div>
        ))}
      </div>
      
      {/* Money Streams Netflow */}
      <div className="bg-white rounded-xl p-6">
        <h3>Money Streams Netflow</h3>
        <div className="flex items-center justify-center gap-8 py-6">
          {/* Inflows */}
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-2">
              <ArrowDownLeft className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">Inflows</p>
            <p className="text-lg font-semibold text-green-600">
              +${(treasury?.netflow.total_inflow_per_month || 0).toLocaleString()}/mo
            </p>
            <p className="text-xs text-gray-500">
              {treasury?.netflow.inflow_stream_count} active streams
            </p>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300" />
          
          {/* Treasury */}
          <div className="text-center">
            <div className="w-20 h-20 bg-violet-100 rounded-2xl flex items-center justify-center mb-2 ring-4 ring-violet-200">
              <Wallet className="w-10 h-10 text-violet-600" />
            </div>
            <p className="text-sm text-gray-500">Treasury</p>
            <p className="text-xl font-semibold">
              ${((treasury?.currencies.reduce((sum, c) => sum + c.total_balance, 0) || 0) / 1000000).toFixed(1)}M
            </p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600">Streaming</span>
            </div>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-300" />
          
          {/* Outflows */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-2">
              <ArrowUpRight className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Outflows</p>
            <p className="text-lg font-semibold text-blue-600">
              -${(treasury?.netflow.total_outflow_per_month || 0).toLocaleString()}/mo
            </p>
            <p className="text-xs text-gray-500">
              {treasury?.netflow.outflow_stream_count} active streams
            </p>
          </div>
        </div>
        
        {/* Net Summary */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Net Flow</p>
              <p className="text-lg font-semibold text-green-800">
                {treasury?.netflow.net_flow_per_month >= 0 ? '+' : '-'}$
                {Math.abs(treasury?.netflow.net_flow_per_month || 0).toLocaleString()}/month
              </p>
              <p className="text-xs text-green-600">
                ≈ ${(treasury?.netflow.net_flow_per_day || 0).toFixed(2)}/day • 
                ${(treasury?.netflow.net_flow_per_hour || 0).toFixed(2)}/hour
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {treasury?.netflow.net_flow_per_month >= 0 ? 'Positive flow' : 'Negative flow'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key Changes:**
- ❌ Remove all hardcoded data arrays
- ✅ Use `useTreasurySummary()` hook
- ✅ Render real currency balances
- ✅ Calculate health status from real data
- ✅ Show real stream netflow
- ✅ All calculations based on database aggregations

---

## Summary: Why This Approach Works

### ✅ **No Schema Changes Needed**
- Leverages existing `accounts`, `transfers`, `streams`, `compliance_flags` tables
- All data already being collected
- Just needs aggregation queries

### ✅ **Performance Optimized**
- Database functions cache query plans
- Simple aggregations on indexed columns
- Minimal JOINs (mostly GROUP BY operations)
- Can add materialized views later if needed

### ✅ **Clean API Design**
- RESTful endpoints (`/v1/reports/...`)
- Reusable across UI and external integrations
- Clear data contracts with TypeScript types

### ✅ **Maintainable**
- SQL functions in migration files (version controlled)
- Frontend hooks follow existing patterns
- Easy to test and extend

---

## Migration Plan

### Step 1: Create Database Functions
```bash
# Create migration file
supabase migration new dashboard_treasury_functions

# Add both get_dashboard_account_stats, get_monthly_volume,
# get_treasury_currency_summary, get_stream_netflow functions
```

### Step 2: Create API Endpoints
```bash
# Add to apps/api/src/routes/reports.ts
# - GET /v1/reports/dashboard/summary
# - GET /v1/reports/treasury/summary
```

### Step 3: Create Frontend Hooks
```bash
# Create apps/payos-ui/src/hooks/api/useDashboard.ts
# Create apps/payos-ui/src/hooks/api/useTreasury.ts
```

### Step 4: Update UI Pages
```bash
# Update payos-ui/src/pages/HomePage.tsx
# Update payos-ui/src/pages/Dashboard.tsx
# Update payos-ui/src/pages/TreasuryPage.tsx
```

### Step 5: Test
```bash
# Run integration tests
# Verify aggregations match expected values
# Check performance with larger datasets
```

---

**Estimated Time:**
- Database functions: 2 hours
- API endpoints: 3 hours
- Frontend hooks: 1 hour
- UI updates: 2 hours
- Testing: 2 hours
- **Total: ~10 hours (1-2 days)**

---

**Result:** Fully functional Dashboard and Treasury pages with real-time data! 🎉


