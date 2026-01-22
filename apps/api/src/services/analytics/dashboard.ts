/**
 * Dashboard Analytics Service
 * Epic 52: Dashboard Redesign - Analytics for agentic payment protocols
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type ProtocolId = 'x402' | 'ap2' | 'acp' | 'ucp';
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
  }
): Promise<ProtocolDistribution[]> {
  const { timeRange } = options;

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

  // Query x402 payments
  const { data: x402Data } = await supabase
    .from('x402_payments')
    .select('amount')
    .eq('tenant_id', tenantId)
    .gte('created_at', startTime.toISOString());

  // Query AP2 mandate executions
  const { data: ap2Data } = await supabase
    .from('ap2_mandate_executions')
    .select('amount')
    .eq('tenant_id', tenantId)
    .gte('created_at', startTime.toISOString());

  // Query ACP checkouts (completed)
  const { data: acpData } = await supabase
    .from('acp_checkouts')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('created_at', startTime.toISOString());

  // Query UCP checkouts (completed)
  const { data: ucpData } = await supabase
    .from('ucp_checkouts')
    .select('amount')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('created_at', startTime.toISOString());

  // Calculate volumes and counts
  const x402Volume = x402Data?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
  const x402Count = x402Data?.length || 0;

  const ap2Volume = ap2Data?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
  const ap2Count = ap2Data?.length || 0;

  const acpVolume = acpData?.reduce((sum, c) => sum + Number(c.total_amount || 0), 0) || 0;
  const acpCount = acpData?.length || 0;

  const ucpVolume = ucpData?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;
  const ucpCount = ucpData?.length || 0;

  const totalVolume = x402Volume + ap2Volume + acpVolume + ucpVolume;
  const totalCount = x402Count + ap2Count + acpCount + ucpCount;

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
  }
): Promise<ProtocolActivityPoint[]> {
  const { timeRange, metric } = options;

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

  // Query all protocol data
  const [x402Result, ap2Result, acpResult, ucpResult] = await Promise.all([
    supabase
      .from('x402_payments')
      .select('amount, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('ap2_mandate_executions')
      .select('amount, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('acp_checkouts')
      .select('total_amount, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', startTime.toISOString()),
    supabase
      .from('ucp_checkouts')
      .select('amount, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
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

    if (metric === 'volume') {
      activity.push({
        timestamp: bucketStart.toISOString(),
        x402: x402InBucket.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        ap2: ap2InBucket.reduce((sum, e) => sum + Number(e.amount || 0), 0),
        acp: acpInBucket.reduce((sum, c) => sum + Number(c.total_amount || 0), 0),
        ucp: ucpInBucket.reduce((sum, c) => sum + Number(c.amount || 0), 0),
      });
    } else {
      activity.push({
        timestamp: bucketStart.toISOString(),
        x402: x402InBucket.length,
        ap2: ap2InBucket.length,
        acp: acpInBucket.length,
        ucp: ucpInBucket.length,
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
  tenantId: string
): Promise<ProtocolStats[]> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Get protocol enablement status
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  // enabled_protocols is stored as an object: { x402: { enabled_at: '...' }, ... }
  const enabledProtocols = tenant?.settings?.enabled_protocols || {};
  const isProtocolEnabled = (protocol: string): boolean => {
    return !!enabledProtocols[protocol];
  };

  const stats: ProtocolStats[] = [];

  // x402 Stats
  const [x402Endpoints, x402Today, x402Yesterday] = await Promise.all([
    supabase
      .from('x402_endpoints')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    supabase
      .from('x402_payments')
      .select('amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', yesterday.toISOString()),
    supabase
      .from('x402_payments')
      .select('amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', twoDaysAgo.toISOString())
      .lt('created_at', yesterday.toISOString()),
  ]);

  const x402TodayVolume = x402Today.data?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
  const x402YesterdayVolume = x402Yesterday.data?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
  const x402Trend = x402YesterdayVolume > 0
    ? Math.round(((x402TodayVolume - x402YesterdayVolume) / x402YesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'x402',
    protocol_name: 'x402 Micropayments',
    enabled: isProtocolEnabled('x402'),
    primary_metric: {
      label: 'Active Endpoints',
      value: x402Endpoints.data?.length || 0,
    },
    secondary_metric: {
      label: '24h Revenue',
      value: x402TodayVolume,
    },
    trend: {
      value: Math.abs(x402Trend),
      direction: x402Trend > 0 ? 'up' : x402Trend < 0 ? 'down' : 'flat',
    },
  });

  // AP2 Stats
  const [ap2Mandates, ap2Executions] = await Promise.all([
    supabase
      .from('ap2_mandates')
      .select('id, max_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    supabase
      .from('ap2_mandate_executions')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', yesterday.toISOString()),
  ]);

  const authorizedAmount = ap2Mandates.data?.reduce((sum, m) => sum + Number(m.max_amount || 0), 0) || 0;

  stats.push({
    protocol: 'ap2',
    protocol_name: 'AP2 Mandates',
    enabled: isProtocolEnabled('ap2'),
    primary_metric: {
      label: 'Active Mandates',
      value: ap2Mandates.data?.length || 0,
    },
    secondary_metric: {
      label: 'Authorized Amount',
      value: authorizedAmount,
    },
    trend: {
      value: ap2Executions.data?.length || 0,
      direction: 'flat',
    },
  });

  // ACP Stats
  const [acpToday, acpYesterday] = await Promise.all([
    supabase
      .from('acp_checkouts')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', yesterday.toISOString()),
    supabase
      .from('acp_checkouts')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', twoDaysAgo.toISOString())
      .lt('created_at', yesterday.toISOString()),
  ]);

  const acpTodayVolume = acpToday.data?.reduce((sum, c) => sum + Number(c.total_amount || 0), 0) || 0;
  const acpYesterdayVolume = acpYesterday.data?.reduce((sum, c) => sum + Number(c.total_amount || 0), 0) || 0;
  const acpTrend = acpYesterdayVolume > 0
    ? Math.round(((acpTodayVolume - acpYesterdayVolume) / acpYesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'acp',
    protocol_name: 'ACP Commerce',
    enabled: isProtocolEnabled('acp'),
    primary_metric: {
      label: 'Checkouts (24h)',
      value: acpToday.data?.length || 0,
    },
    secondary_metric: {
      label: '24h Volume',
      value: acpTodayVolume,
    },
    trend: {
      value: Math.abs(acpTrend),
      direction: acpTrend > 0 ? 'up' : acpTrend < 0 ? 'down' : 'flat',
    },
  });

  // UCP Stats
  const [ucpToday, ucpYesterday] = await Promise.all([
    supabase
      .from('ucp_checkouts')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', yesterday.toISOString()),
    supabase
      .from('ucp_checkouts')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', twoDaysAgo.toISOString())
      .lt('created_at', yesterday.toISOString()),
  ]);

  const ucpTodayVolume = ucpToday.data?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;
  const ucpYesterdayVolume = ucpYesterday.data?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;
  const ucpTrend = ucpYesterdayVolume > 0
    ? Math.round(((ucpTodayVolume - ucpYesterdayVolume) / ucpYesterdayVolume) * 100)
    : 0;

  stats.push({
    protocol: 'ucp',
    protocol_name: 'UCP Commerce',
    enabled: isProtocolEnabled('ucp'),
    primary_metric: {
      label: 'Checkouts (24h)',
      value: ucpToday.data?.length || 0,
    },
    secondary_metric: {
      label: '24h Volume',
      value: ucpTodayVolume,
    },
    trend: {
      value: Math.abs(ucpTrend),
      direction: ucpTrend > 0 ? 'up' : ucpTrend < 0 ? 'down' : 'flat',
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
  limit: number = 10
): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = [];

  // Query recent x402 payments
  const { data: x402 } = await supabase
    .from('x402_payments')
    .select('id, amount, currency, description, created_at, agent:agents(id, name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  x402?.forEach((p: any) => {
    activities.push({
      id: p.id,
      protocol: 'x402',
      type: 'payment',
      amount: Number(p.amount),
      currency: p.currency || 'USDC',
      description: p.description || 'API payment',
      agent: p.agent ? { id: p.agent.id, name: p.agent.name } : undefined,
      timestamp: p.created_at,
    });
  });

  // Query recent AP2 executions
  const { data: ap2 } = await supabase
    .from('ap2_mandate_executions')
    .select('id, amount, currency, description, created_at, agent:agents(id, name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  ap2?.forEach((e: any) => {
    activities.push({
      id: e.id,
      protocol: 'ap2',
      type: 'mandate_execution',
      amount: Number(e.amount),
      currency: e.currency || 'USDC',
      description: e.description || 'Mandate execution',
      agent: e.agent ? { id: e.agent.id, name: e.agent.name } : undefined,
      timestamp: e.created_at,
    });
  });

  // Query recent ACP checkouts
  const { data: acp } = await supabase
    .from('acp_checkouts')
    .select('id, total_amount, currency, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
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

  // Query recent UCP checkouts
  const { data: ucp } = await supabase
    .from('ucp_checkouts')
    .select('id, amount, currency, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  ucp?.forEach((c: any) => {
    activities.push({
      id: c.id,
      protocol: 'ucp',
      type: 'checkout',
      amount: Number(c.amount),
      currency: c.currency || 'USD',
      description: 'Commerce checkout',
      timestamp: c.created_at,
    });
  });

  // Sort by timestamp and limit
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, limit);
}
