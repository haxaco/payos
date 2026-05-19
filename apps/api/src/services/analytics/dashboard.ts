/**
 * Dashboard Analytics Service
 * Epic 52: Dashboard Redesign - Analytics for agentic payment protocols
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getCircleFXService } from '../circle/fx.js';

/** Extract the total amount from UCP's JSONB totals array */
function extractUcpTotal(totals: unknown): number {
  if (!Array.isArray(totals)) return 0;
  const entry = totals.find((t: any) => t.type === 'total');
  return Number(entry?.amount || 0) / 100;
}

export type ProtocolId = 'x402' | 'ap2' | 'acp' | 'ucp' | 'mpp';
export type TimeRange = '24h' | '7d' | '30d';

export interface ProtocolDistribution {
  protocol: ProtocolId;
  volume_usd: number;
  transaction_count: number;
  percentage: number;
}

export interface ProtocolActivityPoint {
  timestamp: string;
  x402: number;
  ap2: number;
  acp: number;
  ucp: number;
  mpp: number;
}

export interface ProtocolStats {
  protocol: ProtocolId;
  protocol_name: string;
  enabled: boolean;
  primary_metric: {
    label: string;
    value: number | string;
  };
  secondary_metric: {
    label: string;
    value: number | string;
  };
  trend: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
}

export interface RecentActivity {
  id: string;
  protocol: ProtocolId;
  type: string;
  amount: number;
  currency: string;
  description: string;
  agent?: {
    id: string;
    name: string;
  };
  timestamp: string;

  /** 'incoming' = inbound from another tenant; 'outgoing' = initiated by us; undefined = same-tenant. */
  direction?: 'incoming' | 'outgoing';
  /** Source tenant for cross-tenant calls — present when this activity originated outside our tenant. */
  sourceTenant?: {
    id: string;
    name: string;
    slug?: string | null;
    country?: string | null;
  };
  /** KYA tier of the initiating agent (if known). */
  kyaTier?: number | null;
  /** Reputation score of the initiating agent (if known). */
  reputation?: number | null;
  /** Provenance label — `verified_tenant` for in-network calls, `public_internet_no_tenant` for blocked unverified. */
  provenance?: 'verified_tenant' | 'public_internet_no_tenant' | 'external_unverified';
  /** Status — used to render blocked/failed rows distinctly. */
  status?: 'pending' | 'completed' | 'failed' | 'blocked';
}

/**
 * Get protocol distribution by volume or transaction count
 */
export async function getProtocolDistribution(
  supabase: SupabaseClient,
  tenantId: string,
  options: {
    timeRange: TimeRange;
    metric: 'volume' | 'count';
    environment?: 'test' | 'live';
  }
): Promise<ProtocolDistribution[]> {
  const { timeRange, environment } = options;
  const env = environment || 'test';

  // Calculate time boundary
  const now = new Date();
  let startTime: Date;
  switch (timeRange) {
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const fxService = getCircleFXService();

  // Query x402 payments (transfers with type = 'x402' + deferred payment_intents)
  // Volume counts money that actually moved — `cancelled` x402 rows are
  // failed attempts where no settlement occurred, so excluding them.
  const [{ data: x402Transfers }, { data: x402Intents }] = await Promise.all([
    supabase
      .from('transfers')
      .select('amount, currency, status')
      .eq('tenant_id', tenantId)
      .eq('type', 'x402')
      .eq('environment', env)
      .in('status', ['completed', 'pending', 'processing'])
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('payment_intents')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .eq('protocol', 'x402')
      .eq('environment', env)
      .in('status', ['authorized', 'settled', 'completed'])
      .gte('created_at', startTime.toISOString()),
  ]);
  const x402Data = [...(x402Transfers || []), ...(x402Intents || [])];

  // Query AP2 mandate executions
  const { data: ap2Data } = await supabase
    .from('ap2_mandate_executions')
    .select('amount, currency')
    .eq('tenant_id', tenantId)
    .eq('environment', env)
    .gte('created_at', startTime.toISOString());

  // Query ACP checkouts (completed)
  const { data: acpData } = await supabase
    .from('acp_checkouts')
    .select('total_amount, currency')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('environment', env)
    .gte('created_at', startTime.toISOString());

  // Query UCP checkouts (completed) — total is inside JSONB `totals` array
  const { data: ucpData } = await supabase
    .from('ucp_checkout_sessions')
    .select('totals, currency')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('environment', env)
    .gte('created_at', startTime.toISOString());

  // Query MPP transfers
  const { data: mppData } = await supabase
    .from('transfers')
    .select('amount, currency')
    .eq('tenant_id', tenantId)
    .eq('type', 'mpp')
    .eq('environment', env)
    .gte('created_at', startTime.toISOString());

  // Calculate FX-normalized volumes and counts
  const x402Volume = x402Data?.reduce((sum, p) => {
    const amt = Number(p.amount || 0);
    const ccy = (p.currency || 'USDC').toUpperCase();
    return sum + fxService.toUSD(amt, ccy);
  }, 0) || 0;
  const x402Count = x402Data?.length || 0;

  const ap2Volume = ap2Data?.reduce((sum, e) => {
    const amt = Number(e.amount || 0);
    const ccy = (e.currency || 'USDC').toUpperCase();
    return sum + fxService.toUSD(amt, ccy);
  }, 0) || 0;
  const ap2Count = ap2Data?.length || 0;

  const acpVolume = acpData?.reduce((sum, c) => {
    const amt = Number(c.total_amount || 0);
    const ccy = (c.currency || 'USD').toUpperCase();
    return sum + fxService.toUSD(amt, ccy);
  }, 0) || 0;
  const acpCount = acpData?.length || 0;

  const ucpVolume = ucpData?.reduce((sum, c) => {
    const amt = extractUcpTotal(c.totals);
    const ccy = (c.currency || 'USD').toUpperCase();
    return sum + fxService.toUSD(amt, ccy);
  }, 0) || 0;
  const ucpCount = ucpData?.length || 0;

  const mppVolume = mppData?.reduce((sum, p) => {
    const amt = Number(p.amount || 0);
    const ccy = (p.currency || 'USDC').toUpperCase();
    return sum + fxService.toUSD(amt, ccy);
  }, 0) || 0;
  const mppCount = mppData?.length || 0;

  const totalVolume = x402Volume + ap2Volume + acpVolume + ucpVolume + mppVolume;
  const totalCount = x402Count + ap2Count + acpCount + ucpCount + mppCount;

  // Build distribution array
  const distribution: ProtocolDistribution[] = [
    {
      protocol: 'x402',
      volume_usd: x402Volume,
      transaction_count: x402Count,
      percentage: totalVolume > 0 ? Math.round((x402Volume / totalVolume) * 100) : 0,
    },
    {
      protocol: 'ap2',
      volume_usd: ap2Volume,
      transaction_count: ap2Count,
      percentage: totalVolume > 0 ? Math.round((ap2Volume / totalVolume) * 100) : 0,
    },
    {
      protocol: 'acp',
      volume_usd: acpVolume,
      transaction_count: acpCount,
      percentage: totalVolume > 0 ? Math.round((acpVolume / totalVolume) * 100) : 0,
    },
    {
      protocol: 'ucp',
      volume_usd: ucpVolume,
      transaction_count: ucpCount,
      percentage: totalVolume > 0 ? Math.round((ucpVolume / totalVolume) * 100) : 0,
    },
    {
      protocol: 'mpp',
      volume_usd: mppVolume,
      transaction_count: mppCount,
      percentage: totalVolume > 0 ? Math.round((mppVolume / totalVolume) * 100) : 0,
    },
  ];

  // Sort by volume descending
  distribution.sort((a, b) => b.volume_usd - a.volume_usd);

  return distribution;
}

/**
 * Get protocol activity over time
 */
export async function getProtocolActivity(
  supabase: SupabaseClient,
  tenantId: string,
  options: {
    timeRange: TimeRange;
    metric: 'volume' | 'count';
    environment?: 'test' | 'live';
  }
): Promise<ProtocolActivityPoint[]> {
  const { timeRange, metric, environment } = options;
  const env = environment || 'test';

  // Calculate time boundary and interval
  const now = new Date();
  let startTime: Date;
  let intervalHours: number;
  let points: number;

  switch (timeRange) {
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      intervalHours = 1;
      points = 24;
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      intervalHours = 6;
      points = 28;
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      intervalHours = 24;
      points = 30;
      break;
  }

  const fxService = getCircleFXService();

  // Query all protocol data
  const [x402Result, ap2Result, acpResult, ucpResult, mppResult] = await Promise.all([
    supabase
      .from('transfers')
      .select('amount, currency, created_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'x402')
      .eq('environment', env)
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('ap2_mandate_executions')
      .select('amount, currency, created_at')
      .eq('tenant_id', tenantId)
      .eq('environment', env)
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('acp_checkouts')
      .select('total_amount, currency, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('environment', env)
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('ucp_checkout_sessions')
      .select('totals, currency, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('environment', env)
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('transfers')
      .select('amount, currency, created_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'mpp')
      .eq('environment', env)
      .gte('created_at', startTime.toISOString()),
  ]);

  // Build time buckets
  const activity: ProtocolActivityPoint[] = [];

  for (let i = 0; i < points; i++) {
    const bucketStart = new Date(startTime.getTime() + i * intervalHours * 60 * 60 * 1000);
    const bucketEnd = new Date(bucketStart.getTime() + intervalHours * 60 * 60 * 1000);

    const inBucket = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= bucketStart && d < bucketEnd;
    };

    const x402InBucket = x402Result.data?.filter((p) => inBucket(p.created_at)) || [];
    const ap2InBucket = ap2Result.data?.filter((e) => inBucket(e.created_at)) || [];
    const acpInBucket = acpResult.data?.filter((c) => inBucket(c.created_at)) || [];
    const ucpInBucket = ucpResult.data?.filter((c) => inBucket(c.created_at)) || [];
    const mppInBucket = mppResult.data?.filter((p) => inBucket(p.created_at)) || [];

    if (metric === 'volume') {
      activity.push({
        timestamp: bucketStart.toISOString(),
        x402: x402InBucket.reduce((sum, p) => sum + fxService.toUSD(Number(p.amount || 0), (p.currency || 'USDC').toUpperCase()), 0),
        ap2: ap2InBucket.reduce((sum, e) => sum + fxService.toUSD(Number(e.amount || 0), (e.currency || 'USDC').toUpperCase()), 0),
        acp: acpInBucket.reduce((sum, c) => sum + fxService.toUSD(Number(c.total_amount || 0), (c.currency || 'USD').toUpperCase()), 0),
        ucp: ucpInBucket.reduce((sum, c) => sum + fxService.toUSD(extractUcpTotal(c.totals), (c.currency || 'USD').toUpperCase()), 0),
        mpp: mppInBucket.reduce((sum, p) => sum + fxService.toUSD(Number(p.amount || 0), (p.currency || 'USDC').toUpperCase()), 0),
      });
    } else {
      activity.push({
        timestamp: bucketStart.toISOString(),
        x402: x402InBucket.length,
        ap2: ap2InBucket.length,
        acp: acpInBucket.length,
        ucp: ucpInBucket.length,
        mpp: mppInBucket.length,
      });
    }
  }

  return activity;
}

/**
 * Get protocol-specific stats for quick stat cards
 */
export async function getProtocolStats(
  supabase: SupabaseClient,
  tenantId: string,
  environment: 'test' | 'live' = 'test'
): Promise<ProtocolStats[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Get protocol enablement status
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  // enabled_protocols is stored as an object: { x402: { enabled_at: '...' }, ... }
  const enabledProtocols = tenant?.settings?.enabled_protocols || {};
  // Open beta: in sandbox/test every agentic-payments protocol is ON by
  // default (frictionless onboarding — no enable step), matching the
  // protocol-registry sandbox behaviour. The enable gate only applies to
  // live. Otherwise: enabled if explicitly set OR has volume activity.
  const sandbox = environment === 'test';
  const isProtocolEnabled = (protocol: string, volume30d: number = 0): boolean => {
    return sandbox || !!enabledProtocols[protocol] || volume30d > 0;
  };

  const stats: ProtocolStats[] = [];

  const fxService = getCircleFXService();

  // x402 Stats
  const [x402Endpoints, x402Today, x402Yesterday] = await Promise.all([
    supabase
      .from('x402_endpoints')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .eq('environment', environment),
    supabase
      .from('transfers')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .eq('type', 'x402')
      .eq('environment', environment)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('transfers')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .eq('type', 'x402')
      .eq('environment', environment)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const x402TodayVolume = x402Today.data?.reduce((sum, p) => sum + fxService.toUSD(Number(p.amount || 0), (p.currency || 'USDC').toUpperCase()), 0) || 0;
  const x402YesterdayVolume = x402Yesterday.data?.reduce((sum, p) => sum + fxService.toUSD(Number(p.amount || 0), (p.currency || 'USDC').toUpperCase()), 0) || 0;
  const x402Trend = x402YesterdayVolume > 0
    ? Math.round(((x402TodayVolume - x402YesterdayVolume) / x402YesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'x402',
    protocol_name: 'x402 Micropayments',
    enabled: isProtocolEnabled('x402', x402TodayVolume),
    primary_metric: {
      label: 'Active Endpoints',
      value: x402Endpoints.data?.length || 0,
    },
    secondary_metric: {
      label: '30d Revenue',
      value: x402TodayVolume,
    },
    trend: {
      value: Math.abs(x402Trend),
      direction: x402Trend > 0 ? 'up' : x402Trend < 0 ? 'down' : 'flat',
    },
  });

  // AP2 Stats
  const [ap2Mandates, ap2Today, ap2Yesterday] = await Promise.all([
    supabase
      .from('ap2_mandates')
      .select('id, authorized_amount, currency')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .eq('environment', environment),
    supabase
      .from('ap2_mandate_executions')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .eq('environment', environment)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('ap2_mandate_executions')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .eq('environment', environment)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const authorizedAmount = ap2Mandates.data?.reduce((sum, m) => sum + fxService.toUSD(Number(m.authorized_amount || 0), (m.currency || 'USDC').toUpperCase()), 0) || 0;
  const ap2TodayVolume = ap2Today.data?.reduce((sum, e) => sum + fxService.toUSD(Number(e.amount || 0), (e.currency || 'USDC').toUpperCase()), 0) || 0;
  const ap2YesterdayVolume = ap2Yesterday.data?.reduce((sum, e) => sum + fxService.toUSD(Number(e.amount || 0), (e.currency || 'USDC').toUpperCase()), 0) || 0;
  const ap2Trend = ap2YesterdayVolume > 0
    ? Math.round(((ap2TodayVolume - ap2YesterdayVolume) / ap2YesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'ap2',
    protocol_name: 'AP2 Mandates',
    enabled: isProtocolEnabled('ap2', ap2TodayVolume),
    primary_metric: {
      label: 'Active Mandates',
      value: ap2Mandates.data?.length || 0,
    },
    secondary_metric: {
      label: 'Authorized Amount',
      value: authorizedAmount,
    },
    trend: {
      value: Math.abs(ap2Trend),
      direction: ap2Trend > 0 ? 'up' : ap2Trend < 0 ? 'down' : 'flat',
    },
  });

  // ACP Stats
  const [acpToday, acpYesterday] = await Promise.all([
    supabase
      .from('acp_checkouts')
      .select('total_amount, currency')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('environment', environment)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('acp_checkouts')
      .select('total_amount, currency')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('environment', environment)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const acpTodayVolume = acpToday.data?.reduce((sum, c) => sum + fxService.toUSD(Number(c.total_amount || 0), (c.currency || 'USD').toUpperCase()), 0) || 0;
  const acpYesterdayVolume = acpYesterday.data?.reduce((sum, c) => sum + fxService.toUSD(Number(c.total_amount || 0), (c.currency || 'USD').toUpperCase()), 0) || 0;
  const acpTrend = acpYesterdayVolume > 0
    ? Math.round(((acpTodayVolume - acpYesterdayVolume) / acpYesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'acp',
    protocol_name: 'ACP Commerce',
    enabled: isProtocolEnabled('acp', acpTodayVolume),
    primary_metric: {
      label: 'Checkouts (30d)',
      value: acpToday.data?.length || 0,
    },
    secondary_metric: {
      label: '30d Volume',
      value: acpTodayVolume,
    },
    trend: {
      value: Math.abs(acpTrend),
      direction: acpTrend > 0 ? 'up' : acpTrend < 0 ? 'down' : 'flat',
    },
  });

  // UCP Stats — total is inside JSONB `totals` array
  const [ucpToday, ucpYesterday] = await Promise.all([
    supabase
      .from('ucp_checkout_sessions')
      .select('totals, currency')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('environment', environment)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('ucp_checkout_sessions')
      .select('totals, currency')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .eq('environment', environment)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const ucpTodayVolume = ucpToday.data?.reduce((sum, c) => sum + fxService.toUSD(extractUcpTotal(c.totals), (c.currency || 'USD').toUpperCase()), 0) || 0;
  const ucpYesterdayVolume = ucpYesterday.data?.reduce((sum, c) => sum + fxService.toUSD(extractUcpTotal(c.totals), (c.currency || 'USD').toUpperCase()), 0) || 0;
  const ucpTrend = ucpYesterdayVolume > 0
    ? Math.round(((ucpTodayVolume - ucpYesterdayVolume) / ucpYesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'ucp',
    protocol_name: 'UCP Checkouts',
    enabled: isProtocolEnabled('ucp', ucpTodayVolume),
    primary_metric: {
      label: 'Checkouts (30d)',
      value: ucpToday.data?.length || 0,
    },
    secondary_metric: {
      label: '30d Volume',
      value: ucpTodayVolume,
    },
    trend: {
      value: Math.abs(ucpTrend),
      direction: ucpTrend > 0 ? 'up' : ucpTrend < 0 ? 'down' : 'flat',
    },
  });

  // MPP Stats
  const [mppSessions, mppToday, mppYesterday] = await Promise.all([
    supabase
      .from('mpp_sessions')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'active'])
      .eq('environment', environment),
    supabase
      .from('transfers')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .eq('type', 'mpp')
      .eq('environment', environment)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('transfers')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .eq('type', 'mpp')
      .eq('environment', environment)
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const mppTodayVolume = mppToday.data?.reduce((sum, p) => sum + fxService.toUSD(Number(p.amount || 0), (p.currency || 'USDC').toUpperCase()), 0) || 0;
  const mppYesterdayVolume = mppYesterday.data?.reduce((sum, p) => sum + fxService.toUSD(Number(p.amount || 0), (p.currency || 'USDC').toUpperCase()), 0) || 0;
  const mppTrend = mppYesterdayVolume > 0
    ? Math.round(((mppTodayVolume - mppYesterdayVolume) / mppYesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'mpp',
    protocol_name: 'MPP Payments',
    enabled: isProtocolEnabled('mpp', mppTodayVolume),
    primary_metric: {
      label: 'Active Sessions',
      value: mppSessions.data?.length || 0,
    },
    secondary_metric: {
      label: '30d Volume',
      value: mppTodayVolume,
    },
    trend: {
      value: Math.abs(mppTrend),
      direction: mppTrend > 0 ? 'up' : mppTrend < 0 ? 'down' : 'flat',
    },
  });

  return stats;
}

/**
 * Get recent activity across all protocols
 */
export async function getRecentActivity(
  supabase: SupabaseClient,
  tenantId: string,
  limit: number = 10,
  environment: 'test' | 'live' = 'test'
): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = [];

  // Query recent x402 payments (stored as transfers with type = 'x402')
  // Outgoing — caller paid from this tenant.
  const { data: x402Out } = await supabase
    .from('transfers')
    .select('id, amount, currency, description, created_at, status, protocol_metadata, destination_tenant_id, initiated_by_name')
    .eq('tenant_id', tenantId)
    .eq('type', 'x402')
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  x402Out?.forEach((p: any) => {
    activities.push({
      id: p.id,
      protocol: 'x402',
      type: 'payment',
      amount: Number(p.amount),
      currency: p.currency || 'USDC',
      description: p.description || 'x402 API payment',
      timestamp: p.created_at,
      direction: 'outgoing',
      status: p.status || undefined,
      provenance: 'verified_tenant',
    });
  });

  // Incoming — another tenant called one of OUR endpoints. The transfer row
  // lives in the caller's tenant_id; we cross-pivot on destination_tenant_id.
  // Service-role client bypasses RLS so the cross-tenant join is fine.
  const { data: x402In } = await supabase
    .from('transfers')
    .select(`
      id, amount, currency, description, created_at, status, protocol_metadata, tenant_id, initiated_by_name,
      source_tenant:tenants!transfers_tenant_id_fkey(id, name, slug, settings)
    `)
    .eq('destination_tenant_id', tenantId)
    .eq('type', 'x402')
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  x402In?.forEach((p: any) => {
    const meta = (p.protocol_metadata || {}) as any;
    const src = (p.source_tenant || {}) as any;
    // The sentinel tenant marks calls from "public internet, no Sly tenant".
    const isPublicInternet =
      meta.provenance === 'public_internet_no_tenant' ||
      src?.settings?.public_internet === true;
    const isBlocked = p.status === 'failed' || isPublicInternet;
    activities.push({
      id: p.id,
      protocol: 'x402',
      type: 'payment',
      amount: Number(p.amount),
      currency: p.currency || 'USDC',
      description: p.description || 'x402 API payment',
      timestamp: p.created_at,
      direction: 'incoming',
      status: isBlocked ? 'blocked' : (p.status || undefined),
      provenance: isPublicInternet
        ? 'public_internet_no_tenant'
        : src?.id
          ? 'verified_tenant'
          : 'external_unverified',
      sourceTenant: src?.id && !isPublicInternet
        ? {
            id: src.id,
            name: src.name,
            slug: src.slug,
            country: src.settings?.country ?? meta.source_country ?? null,
          }
        : undefined,
      kyaTier: meta.source_kya_tier ?? meta.kya_tier ?? null,
      reputation: meta.source_reputation ?? meta.reputation ?? null,
      agent: p.initiated_by_name ? { id: meta.source_agent_id ?? '', name: p.initiated_by_name } : undefined,
    });
  });

  // Query recent AP2 executions
  const { data: ap2 } = await supabase
    .from('ap2_mandate_executions')
    .select('id, amount, currency, created_at')
    .eq('tenant_id', tenantId)
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  ap2?.forEach((e: any) => {
    activities.push({
      id: e.id,
      protocol: 'ap2',
      type: 'mandate_execution',
      amount: Number(e.amount),
      currency: e.currency || 'USDC',
      description: 'Mandate execution',
      timestamp: e.created_at,
    });
  });

  // Query recent ACP checkouts
  const { data: acp } = await supabase
    .from('acp_checkouts')
    .select('id, total_amount, currency, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  acp?.forEach((c: any) => {
    activities.push({
      id: c.id,
      protocol: 'acp',
      type: 'checkout',
      amount: Number(c.total_amount),
      currency: c.currency || 'USD',
      description: 'Agent checkout',
      timestamp: c.created_at,
    });
  });

  // Recent ACP-typed transfers (Plumex YC demo seeds direct merchant payments
  // here — Spotify, Netflix, Zalando etc. — instead of acp_checkouts).
  const { data: acpTransfers } = await supabase
    .from('transfers')
    .select('id, amount, currency, description, created_at, status, protocol_metadata, initiated_by_name')
    .eq('tenant_id', tenantId)
    .eq('type', 'acp')
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  acpTransfers?.forEach((p: any) => {
    activities.push({
      id: p.id,
      protocol: 'acp',
      type: 'payment',
      amount: Number(p.amount),
      currency: p.currency || 'EURC',
      description: p.description || 'Agent merchant payment',
      timestamp: p.created_at,
      direction: 'outgoing',
      status: p.status === 'failed' ? 'blocked' : (p.status || undefined),
      provenance: 'verified_tenant',
      agent: p.initiated_by_name ? { id: '', name: p.initiated_by_name } : undefined,
    });
  });

  // Recent cross-border transfers (Plumex YC demo seeds these for Marek/Lukáš/Jonas).
  const { data: crossBorder } = await supabase
    .from('transfers')
    .select('id, amount, currency, description, created_at, status, protocol_metadata, initiated_by_name')
    .eq('tenant_id', tenantId)
    .eq('type', 'cross_border')
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  crossBorder?.forEach((p: any) => {
    activities.push({
      id: p.id,
      protocol: 'ucp',
      type: 'cross_border',
      amount: Number(p.amount),
      currency: p.currency || 'EURC',
      description: p.description || 'Cross-border payment',
      timestamp: p.created_at,
      direction: 'outgoing',
      status: p.status || undefined,
      provenance: 'verified_tenant',
      agent: p.initiated_by_name ? { id: '', name: p.initiated_by_name } : undefined,
    });
  });

  // Query recent UCP checkouts — total is inside JSONB `totals` array
  const { data: ucp } = await supabase
    .from('ucp_checkout_sessions')
    .select('id, totals, currency, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  ucp?.forEach((c: any) => {
    activities.push({
      id: c.id,
      protocol: 'ucp',
      type: 'checkout',
      amount: extractUcpTotal(c.totals),
      currency: c.currency || 'USDC',
      description: 'UCP checkout',
      timestamp: c.created_at,
    });
  });

  // Query recent MPP payments
  const { data: mpp } = await supabase
    .from('transfers')
    .select('id, amount, currency, description, created_at')
    .eq('tenant_id', tenantId)
    .eq('type', 'mpp')
    .eq('environment', environment)
    .order('created_at', { ascending: false })
    .limit(limit);

  mpp?.forEach((p: any) => {
    activities.push({
      id: p.id,
      protocol: 'mpp',
      type: 'payment',
      amount: Number(p.amount),
      currency: p.currency || 'USDC',
      description: p.description || 'MPP payment',
      timestamp: p.created_at,
    });
  });

  // Sort by timestamp and limit
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, limit);
}
