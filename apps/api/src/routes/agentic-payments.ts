/**
 * Agentic Payments API
 * 
 * Cross-protocol analytics and summary endpoints for x402, AP2, and ACP protocols.
 * Provides unified view of all agentic payment activity.
 * 
 * @module routes/agentic-payments
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono();

// Apply auth middleware
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const summaryQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d'),
});

const analyticsQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d'),
  protocol: z.enum(['all', 'x402', 'ap2', 'acp']).default('all'),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate date range based on period
 */
function getPeriodDates(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
}

/**
 * Count active integrations per protocol
 */
async function countActiveIntegrations(
  supabase: any,
  tenantId: string,
  protocol: 'x402' | 'ap2' | 'acp'
): Promise<number> {
  switch (protocol) {
    case 'x402': {
      const { count } = await supabase
        .from('x402_endpoints')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      return count || 0;
    }
    case 'ap2': {
      const { count } = await supabase
        .from('ap2_mandates')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      return count || 0;
    }
    case 'acp': {
      const { count } = await supabase
        .from('acp_checkouts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');
      return count || 0;
    }
  }
}

// ============================================
// Routes
// ============================================

/**
 * GET /v1/agentic-payments/summary
 * Cross-protocol summary for dashboard overview
 */
app.get('/summary', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = summaryQuerySchema.parse({
      period: c.req.query('period') || '30d',
    });

    const { start, end } = getPeriodDates(query.period);
    const supabase = createClient();

    // Fetch all protocol transfers in parallel
    const [x402Result, ap2Result, acpResult] = await Promise.all([
      supabase
        .from('transfers')
        .select('id, amount, fee_amount, from_account_id, created_at, protocol_metadata')
        .eq('tenant_id', ctx.tenantId)
        .eq('type', 'x402')
        .eq('status', 'completed')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      
      supabase
        .from('transfers')
        .select('id, amount, fee_amount, from_account_id, created_at, protocol_metadata')
        .eq('tenant_id', ctx.tenantId)
        .eq('type', 'ap2')
        .eq('status', 'completed')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
      
      supabase
        .from('transfers')
        .select('id, amount, fee_amount, from_account_id, created_at, protocol_metadata')
        .eq('tenant_id', ctx.tenantId)
        .eq('type', 'acp')
        .eq('status', 'completed')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString()),
    ]);

    // Calculate metrics per protocol
    const calculateMetrics = (transfers: any[]) => {
      const revenue = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const fees = transfers.reduce((sum, t) => sum + parseFloat(t.fee_amount || '0'), 0);
      const uniquePayers = new Set(transfers.map(t => t.from_account_id)).size;
      
      return {
        revenue,
        fees,
        transactions: transfers.length,
        uniquePayers,
      };
    };

    const x402Metrics = calculateMetrics(x402Result.data || []);
    const ap2Metrics = calculateMetrics(ap2Result.data || []);
    const acpMetrics = calculateMetrics(acpResult.data || []);

    // Count active integrations
    const [x402Integrations, ap2Integrations, acpIntegrations] = await Promise.all([
      countActiveIntegrations(supabase, ctx.tenantId, 'x402'),
      countActiveIntegrations(supabase, ctx.tenantId, 'ap2'),
      countActiveIntegrations(supabase, ctx.tenantId, 'acp'),
    ]);

    // Fetch recent activity (last 10 transfers across all protocols)
    const { data: recentActivity } = await supabase
      .from('transfers')
      .select('id, type, amount, from_account_id, to_account_id, protocol_metadata, created_at')
      .eq('tenant_id', ctx.tenantId)
      .in('type', ['x402', 'ap2', 'acp'])
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    // Format recent activity with descriptions
    const formattedActivity = (recentActivity || []).map(transfer => {
      const protocol = transfer.protocol_metadata?.protocol || transfer.type;
      let description = 'Payment';

      // Extract protocol-specific descriptions
      if (protocol === 'x402' && transfer.protocol_metadata?.endpoint_path) {
        description = transfer.protocol_metadata.endpoint_path;
      } else if (protocol === 'ap2' && transfer.protocol_metadata?.mandate_type) {
        description = `${transfer.protocol_metadata.mandate_type} mandate`;
      } else if (protocol === 'acp' && transfer.protocol_metadata?.merchant_name) {
        description = transfer.protocol_metadata.merchant_name;
      }

      return {
        id: transfer.id,
        protocol: protocol as 'x402' | 'ap2' | 'acp',
        type: transfer.type,
        amount: parseFloat(transfer.amount),
        description,
        timestamp: transfer.created_at,
      };
    });

    // Calculate totals
    const totalRevenue = x402Metrics.revenue + ap2Metrics.revenue + acpMetrics.revenue;
    const totalFees = x402Metrics.fees + ap2Metrics.fees + acpMetrics.fees;
    const totalTransactions = x402Metrics.transactions + ap2Metrics.transactions + acpMetrics.transactions;
    const totalIntegrations = x402Integrations + ap2Integrations + acpIntegrations;

    return c.json({
      data: {
        period: query.period,
        totalRevenue: parseFloat(totalRevenue.toFixed(8)),
        totalFees: parseFloat(totalFees.toFixed(8)),
        netRevenue: parseFloat((totalRevenue - totalFees).toFixed(8)),
        totalTransactions,
        activeIntegrations: totalIntegrations,
        currency: 'USDC',
        
        byProtocol: {
          x402: {
            revenue: parseFloat(x402Metrics.revenue.toFixed(8)),
            fees: parseFloat(x402Metrics.fees.toFixed(8)),
            transactions: x402Metrics.transactions,
            uniquePayers: x402Metrics.uniquePayers,
            integrations: x402Integrations,
          },
          ap2: {
            revenue: parseFloat(ap2Metrics.revenue.toFixed(8)),
            fees: parseFloat(ap2Metrics.fees.toFixed(8)),
            transactions: ap2Metrics.transactions,
            uniquePayers: ap2Metrics.uniquePayers,
            integrations: ap2Integrations,
          },
          acp: {
            revenue: parseFloat(acpMetrics.revenue.toFixed(8)),
            fees: parseFloat(acpMetrics.fees.toFixed(8)),
            transactions: acpMetrics.transactions,
            uniquePayers: acpMetrics.uniquePayers,
            integrations: acpIntegrations,
          },
        },
        
        recentActivity: formattedActivity,
        
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[AgenticPayments] Summary error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/agentic-payments/analytics
 * Detailed analytics with optional protocol filter
 */
app.get('/analytics', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = analyticsQuerySchema.parse({
      period: c.req.query('period') || '30d',
      protocol: c.req.query('protocol') || 'all',
    });

    const { start, end } = getPeriodDates(query.period);
    const supabase = createClient();

    // Build base query
    let dbQuery = supabase
      .from('transfers')
      .select('id, type, amount, fee_amount, from_account_id, created_at, protocol_metadata')
      .eq('tenant_id', ctx.tenantId)
      .in('type', ['x402', 'ap2', 'acp'])
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Apply protocol filter if not 'all'
    if (query.protocol !== 'all') {
      dbQuery = dbQuery.eq('type', query.protocol);
    }

    const { data: transfers, error } = await dbQuery.order('created_at', { ascending: true });

    if (error) {
      console.error('[AgenticPayments] Analytics query error:', error);
      return c.json({ error: 'Failed to fetch analytics' }, 500);
    }

    // Group by protocol
    const byProtocol = {
      x402: transfers?.filter(t => t.type === 'x402') || [],
      ap2: transfers?.filter(t => t.type === 'ap2') || [],
      acp: transfers?.filter(t => t.type === 'acp') || [],
    };

    // Calculate time series data (group by day)
    const timeSeriesMap = new Map<string, { x402: number; ap2: number; acp: number; total: number }>();
    
    transfers?.forEach(transfer => {
      const date = transfer.created_at.split('T')[0]; // YYYY-MM-DD
      const amount = parseFloat(transfer.amount);
      const protocol = transfer.type as 'x402' | 'ap2' | 'acp';

      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, { x402: 0, ap2: 0, acp: 0, total: 0 });
      }

      const entry = timeSeriesMap.get(date)!;
      entry[protocol] += amount;
      entry.total += amount;
    });

    const timeSeries = Array.from(timeSeriesMap.entries())
      .map(([date, values]) => ({
        date,
        ...values,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate metrics
    const totalRevenue = transfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const totalFees = transfers?.reduce((sum, t) => sum + parseFloat(t.fee_amount || '0'), 0) || 0;
    const uniquePayers = new Set(transfers?.map(t => t.from_account_id)).size;

    // Top endpoints/integrations
    const integrationMetrics = new Map<string, { revenue: number; transactions: number; name: string }>();
    
    transfers?.forEach(transfer => {
      let integrationId = 'unknown';
      let integrationName = 'Unknown';

      if (transfer.protocol_metadata) {
        if (transfer.type === 'x402') {
          integrationId = transfer.protocol_metadata.endpoint_id || 'unknown';
          integrationName = transfer.protocol_metadata.endpoint_path || 'Unknown Endpoint';
        } else if (transfer.type === 'ap2') {
          integrationId = transfer.protocol_metadata.mandate_id || 'unknown';
          integrationName = `Mandate ${transfer.protocol_metadata.mandate_type || 'unknown'}`;
        } else if (transfer.type === 'acp') {
          integrationId = transfer.protocol_metadata.checkout_id || 'unknown';
          integrationName = transfer.protocol_metadata.merchant_name || 'Unknown Merchant';
        }
      }

      if (!integrationMetrics.has(integrationId)) {
        integrationMetrics.set(integrationId, { revenue: 0, transactions: 0, name: integrationName });
      }

      const metrics = integrationMetrics.get(integrationId)!;
      metrics.revenue += parseFloat(transfer.amount);
      metrics.transactions += 1;
    });

    const topIntegrations = Array.from(integrationMetrics.entries())
      .map(([id, metrics]) => ({
        id,
        name: metrics.name,
        revenue: parseFloat(metrics.revenue.toFixed(8)),
        transactions: metrics.transactions,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return c.json({
      data: {
        period: query.period,
        protocol: query.protocol,
        
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(8)),
          totalFees: parseFloat(totalFees.toFixed(8)),
          netRevenue: parseFloat((totalRevenue - totalFees).toFixed(8)),
          totalTransactions: transfers?.length || 0,
          uniquePayers,
          averageTransactionSize: transfers?.length 
            ? parseFloat((totalRevenue / transfers.length).toFixed(8))
            : 0,
        },
        
        byProtocol: {
          x402: {
            transactions: byProtocol.x402.length,
            revenue: parseFloat(
              byProtocol.x402.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(8)
            ),
          },
          ap2: {
            transactions: byProtocol.ap2.length,
            revenue: parseFloat(
              byProtocol.ap2.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(8)
            ),
          },
          acp: {
            transactions: byProtocol.acp.length,
            revenue: parseFloat(
              byProtocol.acp.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(8)
            ),
          },
        },
        
        timeSeries,
        topIntegrations,
        
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[AgenticPayments] Analytics error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

