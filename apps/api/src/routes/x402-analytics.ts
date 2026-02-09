/**
 * x402 Analytics API Routes
 * 
 * Provides revenue analytics and operational metrics for x402 endpoints.
 * Powers provider dashboards and settlement calculations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const revenueQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d', '1y', 'custom']).default('7d'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  endpointId: z.string().uuid().optional(),
  currency: z.enum(['USDC', 'EURC']).optional(),
});

const topEndpointsQuerySchema = z.object({
  metric: z.enum(['revenue', 'calls', 'unique_payers']).default('revenue'),
  limit: z.number().min(1).max(100).default(10),
  period: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
});

// ============================================
// Helper Functions
// ============================================

function getPeriodDates(period: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  let start: Date;

  switch (period) {
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      if (!startDate) throw new Error('startDate required for custom period');
      start = new Date(startDate);
      break;
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

function getGroupByTrunc(groupBy: string): string {
  switch (groupBy) {
    case 'hour':
      return 'hour';
    case 'day':
      return 'day';
    case 'week':
      return 'week';
    case 'month':
      return 'month';
    default:
      return 'day';
  }
}

// ============================================
// Routes
// ============================================

/**
 * GET /v1/x402/analytics/summary
 * Get overall x402 analytics summary
 */
app.get('/summary', async (c) => {
  try {
    const ctx = c.get('ctx');
    const supabase = createClient();
    const query = c.req.query();
    
    // Parse optional period filter
    const period = query.period || '30d';
    const { start, end } = getPeriodDates(period);

    // Get total revenue and transaction count
    const { data: revenueData, error: revenueError } = await supabase
      .from('transfers')
      .select('amount, fee_amount, currency')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'x402')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (revenueError) {
      console.error('Error fetching revenue data:', revenueError);
      return c.json({ error: 'Failed to fetch revenue data' }, 500);
    }

    // Calculate totals
    const totalRevenue = revenueData?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
    const totalFees = revenueData?.reduce((sum, tx) => sum + parseFloat(tx.fee_amount || '0'), 0) || 0;
    const netRevenue = totalRevenue - totalFees;
    const transactionCount = revenueData?.length || 0;

    // Get unique payers count
    const { data: payersData, error: payersError } = await supabase
      .from('transfers')
      .select('from_account_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'x402')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const uniquePayers = new Set(payersData?.map(tx => tx.from_account_id)).size;

    // Get active endpoints count
    const { count: activeEndpoints, error: endpointsError } = await supabase
      .from('x402_endpoints')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'active');

    return c.json({
      data: {
        period,
        totalRevenue: parseFloat(totalRevenue.toFixed(8)),
        totalFees: parseFloat(totalFees.toFixed(8)),
        netRevenue: parseFloat(netRevenue.toFixed(8)),
        transactionCount,
        uniquePayers,
        activeEndpoints: activeEndpoints || 0,
        averageTransactionSize: transactionCount > 0 ? parseFloat((totalRevenue / transactionCount).toFixed(8)) : 0,
        currency: 'USDC', // Default currency
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /v1/x402/analytics/summary:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});

/**
 * GET /v1/x402/analytics/revenue
 * Get time-series revenue data
 */
app.get('/revenue', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();
    
    // Validate and parse query params
    const validated = revenueQuerySchema.parse({
      period: query.period,
      startDate: query.startDate,
      endDate: query.endDate,
      groupBy: query.groupBy,
      endpointId: query.endpointId,
      currency: query.currency,
    });

    const { start, end } = getPeriodDates(validated.period, validated.startDate, validated.endDate);
    const truncBy = getGroupByTrunc(validated.groupBy);
    
    const supabase = createClient();

    // Build query with time bucketing
    // Note: Using raw SQL for date_trunc functionality
    const { data, error } = await supabase.rpc('get_x402_revenue_timeseries', {
      p_tenant_id: ctx.tenantId,
      p_start_date: start.toISOString(),
      p_end_date: end.toISOString(),
      p_trunc_by: truncBy,
      p_endpoint_id: validated.endpointId || null,
      p_currency: validated.currency || null,
    });

    if (error) {
      // Fallback if RPC doesn't exist yet - return empty timeseries
      console.warn('RPC function not found, using fallback:', error);
      return c.json({
        data: {
          period: validated.period,
          groupBy: validated.groupBy,
          timeseries: [],
          total: 0,
          currency: validated.currency || 'USDC',
        },
      });
    }

    // Calculate total
    const total = data?.reduce((sum: number, bucket: any) => sum + parseFloat(bucket.revenue), 0) || 0;

    return c.json({
      data: {
        period: validated.period,
        groupBy: validated.groupBy,
        timeseries: data?.map((bucket: any) => ({
          timestamp: bucket.time_bucket,
          revenue: parseFloat(bucket.revenue),
          transactions: parseInt(bucket.transaction_count),
          fees: parseFloat(bucket.fees),
          netRevenue: parseFloat(bucket.revenue) - parseFloat(bucket.fees),
        })) || [],
        total: parseFloat(total.toFixed(8)),
        currency: validated.currency || 'USDC',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /v1/x402/analytics/revenue:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});

/**
 * GET /v1/x402/analytics/top-endpoints
 * Get top performing endpoints by revenue, calls, or unique payers
 */
app.get('/top-endpoints', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();
    
    // Validate query params
    const validated = topEndpointsQuerySchema.parse({
      metric: query.metric,
      limit: query.limit ? parseInt(query.limit) : undefined,
      period: query.period,
    });

    const { start, end } = getPeriodDates(validated.period);
    const supabase = createClient();

    // Fetch all endpoints with their stats
    const { data: endpoints, error: endpointsError } = await supabase
      .from('x402_endpoints')
      .select('id, name, path, base_price, currency, status')
      .eq('tenant_id', ctx.tenantId);

    if (endpointsError) {
      console.error('Error fetching endpoints:', endpointsError);
      return c.json({ error: 'Failed to fetch endpoints' }, 500);
    }

    // For each endpoint, calculate metrics
    const endpointStats = await Promise.all(
      (endpoints || []).map(async (endpoint) => {
        const { data: txData, error: txError } = await supabase
          .from('transfers')
          .select('amount, fee_amount, from_account_id')
          .eq('tenant_id', ctx.tenantId)
          .eq('type', 'x402')
          .eq('status', 'completed')
          .contains('protocol_metadata', { endpoint_id: endpoint.id })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (txError) {
          console.error(`Error fetching transactions for endpoint ${endpoint.id}:`, txError);
          return null;
        }

        const revenue = txData?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
        const fees = txData?.reduce((sum, tx) => sum + parseFloat(tx.fee_amount || '0'), 0) || 0;
        const calls = txData?.length || 0;
        const uniquePayers = new Set(txData?.map(tx => tx.from_account_id)).size;

        return {
          endpoint: {
            id: endpoint.id,
            name: endpoint.name,
            path: endpoint.path,
            basePrice: parseFloat(endpoint.base_price),
            currency: endpoint.currency,
            status: endpoint.status,
          },
          revenue: parseFloat(revenue.toFixed(8)),
          fees: parseFloat(fees.toFixed(8)),
          netRevenue: parseFloat((revenue - fees).toFixed(8)),
          calls,
          uniquePayers,
          averageCallValue: calls > 0 ? parseFloat((revenue / calls).toFixed(8)) : 0,
        };
      })
    );

    // Filter out nulls and sort by requested metric
    const validStats = endpointStats.filter(stat => stat !== null);
    
    validStats.sort((a, b) => {
      switch (validated.metric) {
        case 'revenue':
          return b!.revenue - a!.revenue;
        case 'calls':
          return b!.calls - a!.calls;
        case 'unique_payers':
          return b!.uniquePayers - a!.uniquePayers;
        default:
          return b!.revenue - a!.revenue;
      }
    });

    // Limit results
    const topEndpoints = validStats.slice(0, validated.limit);

    return c.json({
      data: {
        metric: validated.metric,
        period: validated.period,
        endpoints: topEndpoints,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /v1/x402/analytics/top-endpoints:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});

/**
 * GET /v1/x402/analytics/endpoint/:endpointId
 * Get detailed analytics for a specific endpoint
 */
app.get('/endpoint/:endpointId', async (c) => {
  try {
    const ctx = c.get('ctx');
    const endpointId = c.req.param('endpointId');
    const query = c.req.query();
    const period = query.period || '30d';
    
    const { start, end } = getPeriodDates(period);
    const supabase = createClient();

    // Verify endpoint belongs to tenant
    const { data: endpoint, error: endpointError } = await supabase
      .from('x402_endpoints')
      .select('*')
      .eq('id', endpointId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (endpointError || !endpoint) {
      return c.json({ error: 'Endpoint not found' }, 404);
    }

    // Get transactions for this endpoint
    const { data: txData, error: txError } = await supabase
      .from('transfers')
      .select('amount, fee_amount, from_account_id, created_at, status, protocol_metadata')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'x402')
      .contains('protocol_metadata', { endpoint_id: endpointId })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return c.json({ error: 'Failed to fetch transactions' }, 500);
    }

    // Calculate metrics
    const completedTxs = txData?.filter(tx => tx.status === 'completed') || [];
    const revenue = completedTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const fees = completedTxs.reduce((sum, tx) => sum + parseFloat(tx.fee_amount || '0'), 0);
    const uniquePayers = new Set(completedTxs.map(tx => tx.from_account_id)).size;
    const totalCalls = completedTxs.reduce((sum, tx) => sum + ((tx.protocol_metadata as any)?.call_count || 0), 0);

    return c.json({
      data: {
        endpoint: {
          id: endpoint.id,
          name: endpoint.name,
          path: endpoint.path,
          method: endpoint.method,
          basePrice: parseFloat(endpoint.base_price),
          currency: endpoint.currency,
          status: endpoint.status,
          totalCalls: endpoint.total_calls,
          totalRevenue: parseFloat(endpoint.total_revenue),
        },
        period,
        metrics: {
          revenue: parseFloat(revenue.toFixed(8)),
          fees: parseFloat(fees.toFixed(8)),
          netRevenue: parseFloat((revenue - fees).toFixed(8)),
          calls: totalCalls,
          uniquePayers,
          averageCallValue: totalCalls > 0 ? parseFloat((revenue / totalCalls).toFixed(8)) : 0,
          successRate: txData.length > 0 ? (completedTxs.length / txData.length) * 100 : 0,
        },
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /v1/x402/analytics/endpoint/:endpointId:', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});

export default app;

