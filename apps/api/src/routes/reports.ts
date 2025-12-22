/**
 * Reports API Routes
 * Handles dashboard summaries, treasury reports, and analytics
 */

import { Hono } from 'hono';
import { AppContext } from '../middleware/context.js';
import { createClient } from '../db/client.js';
import { ValidationError } from '../middleware/error.js';

const reports = new Hono<AppContext>();

// ============================================
// GET /v1/reports/dashboard/summary
// Returns dashboard summary statistics
// ============================================
reports.get('/dashboard/summary', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  try {
    // 1. Get account stats
    const { data: accountStats, error: accountError } = await supabase.rpc(
      'get_dashboard_account_stats',
      { p_tenant_id: ctx.tenantId }
    );

    if (accountError) {
      console.error('Error fetching account stats:', accountError);
      return c.json({ error: 'Failed to fetch account statistics' }, 500);
    }

    // 2. Get payment method stats
    const { data: paymentMethods, error: paymentError } = await supabase
      .from('payment_methods')
      .select('type, is_verified')
      .eq('tenant_id', ctx.tenantId);

    if (paymentError) {
      console.error('Error fetching payment methods:', paymentError);
      return c.json({ error: 'Failed to fetch payment methods' }, 500);
    }

    const cardCount = paymentMethods?.filter(p => p.type === 'card').length || 0;
    const verifiedCards = paymentMethods?.filter(p => p.type === 'card' && p.is_verified).length || 0;

    // 3. Get compliance flags
    const { data: complianceFlags, error: flagsError } = await supabase
      .from('compliance_flags')
      .select('status, risk_level')
    .eq('tenant_id', ctx.tenantId)
      .eq('status', 'open');

    if (flagsError) {
      console.error('Error fetching compliance flags:', flagsError);
      return c.json({ error: 'Failed to fetch compliance flags' }, 500);
    }

    const openFlags = complianceFlags?.length || 0;
    const highRiskFlags = complianceFlags?.filter(f => f.risk_level === 'high').length || 0;
    const criticalFlags = complianceFlags?.filter(f => f.risk_level === 'critical').length || 0;

    // 4. Get monthly volume data
    const { data: volumeData, error: volumeError } = await supabase.rpc(
      'get_monthly_volume',
      { p_tenant_id: ctx.tenantId, p_months: 6 }
    );

    if (volumeError) {
      console.error('Error fetching volume data:', volumeError);
      return c.json({ error: 'Failed to fetch volume data' }, 500);
    }

    // Calculate total volume for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: recentVolume, error: recentVolumeError } = await supabase
      .from('transfers')
      .select('amount')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentVolumeError) {
      console.error('Error fetching recent volume:', recentVolumeError);
    }

    const totalLast30d = recentVolume?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // 5. Get recent activity (last 10 transfers)
    const { data: recentTransfers, error: transfersError } = await supabase
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

    if (transfersError) {
      console.error('Error fetching recent transfers:', transfersError);
      return c.json({ error: 'Failed to fetch recent activity' }, 500);
    }

    // Format recent activity
    const recentActivity = (recentTransfers || []).map(t => {
      const flags = Array.isArray(t.compliance_flags) ? t.compliance_flags : 
                    (t.compliance_flags ? [t.compliance_flags] : []);
      
      return {
        id: t.id,
        time: t.created_at,
        type: t.type,
        amount: parseFloat(t.amount),
        currency: t.currency,
        from: t.from_account_name,
        to: t.to_account_name,
        status: t.status,
        is_flagged: flags.length > 0,
        risk_level: flags[0]?.risk_level || null,
        reason_code: flags[0]?.reason_code || null,
      };
    });

    // 6. Get corridor volume data (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { data: corridorData } = await supabase
      .from('transfers')
      .select('corridor_id, amount')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'completed')
      .not('corridor_id', 'is', null)
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Aggregate by corridor
    const corridorMap: Record<string, { volume: number; count: number }> = {};
    
    if (corridorData) {
      for (const transfer of corridorData) {
        if (!transfer.corridor_id) continue;
        
        // Format corridor for display (USD-MXN -> US→MXN)
        const displayCorridor = transfer.corridor_id
          .replace('USD-', 'US→')
          .replace('USDC-', 'USDC→')
          .replace('USDT-', 'USDT→')
          .replace('EUR-', 'EUR→')
          .replace('-', '→');
        
        if (!corridorMap[displayCorridor]) {
          corridorMap[displayCorridor] = { volume: 0, count: 0 };
        }
        
        corridorMap[displayCorridor].volume += parseFloat(transfer.amount || '0');
        corridorMap[displayCorridor].count += 1;
      }
    }

    // Convert to array and sort by volume (top 10)
    const byCorridor = Object.entries(corridorMap)
      .map(([corridor, data]) => ({
        corridor,
        volume: data.volume,
        count: data.count,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Return complete dashboard summary
  return c.json({
    data: {
        accounts: {
          total: accountStats?.[0]?.total_accounts || 0,
          verified: accountStats?.[0]?.verified_accounts || 0,
          new_30d: accountStats?.[0]?.new_accounts_30d || 0,
          business: accountStats?.[0]?.business_accounts || 0,
          person: accountStats?.[0]?.person_accounts || 0,
        },
        cards: {
          total: cardCount,
          verified: verifiedCards,
        },
        compliance: {
          open_flags: openFlags,
          high_risk: highRiskFlags,
          critical: criticalFlags,
        },
        volume: {
          by_month: volumeData || [],
          total_last_30d: totalLast30d,
          by_corridor: byCorridor,
        },
        recent_activity: recentActivity,
    },
  });
  } catch (error) {
    console.error('Unexpected error in dashboard summary:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ============================================
// GET /v1/reports/treasury/summary
// Returns treasury balance and netflow summary
// ============================================
reports.get('/treasury/summary', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  try {
    // 1. Get currency balances
    const { data: currencyBalances, error: balanceError } = await supabase.rpc(
      'get_treasury_currency_summary',
      { p_tenant_id: ctx.tenantId }
    );

    if (balanceError) {
      console.error('Error fetching currency balances:', balanceError);
      return c.json({ error: 'Failed to fetch currency balances' }, 500);
    }

    // 2. Get stream netflow
    const { data: netflow, error: netflowError } = await supabase.rpc(
      'get_stream_netflow',
      { p_tenant_id: ctx.tenantId }
    );

    if (netflowError) {
      console.error('Error fetching stream netflow:', netflowError);
      return c.json({ error: 'Failed to fetch stream netflow' }, 500);
    }

    // 3. Get scheduled transfers for next 48 hours (for projection)
  const now = new Date();
    const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: scheduledTransfers, error: scheduledError } = await supabase
      .from('transfers')
      .select('amount, currency, scheduled_for')
    .eq('tenant_id', ctx.tenantId)
      .eq('status', 'pending')
      .not('scheduled_for', 'is', null)
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', fortyEightHoursLater.toISOString());

    if (scheduledError) {
      console.error('Error fetching scheduled transfers:', scheduledError);
    }

    // Return treasury summary
    return c.json({
      data: {
        currencies: currencyBalances || [],
        netflow: netflow?.[0] || {
          inflow_stream_count: 0,
          total_inflow_per_month: 0,
          outflow_stream_count: 0,
          total_outflow_per_month: 0,
          net_flow_per_month: 0,
          net_flow_per_day: 0,
          net_flow_per_hour: 0,
        },
        scheduled_outflows_48h: scheduledTransfers || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in treasury summary:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ============================================
// GET /v1/reports/summary (Legacy endpoint - for backward compatibility)
// Returns summary report with period filtering
// ============================================
reports.get('/summary', async (c) => {
  const query = c.req.query();
  const period = query.period || 'month';
  const startDate = query.startDate;
  const endDate = query.endDate;

  // Validate custom period requires date range
  if (period === 'custom' && (!startDate || !endDate)) {
    throw new ValidationError('Custom period requires both startDate and endDate parameters');
  }

  // For now, return a simple response (this endpoint is deprecated in favor of dashboard/treasury endpoints)
  return c.json({
    data: {
      period: {
        type: period,
        start: startDate || new Date().toISOString(),
        end: endDate || new Date().toISOString(),
      },
      totals: {
        transfersOut: 0,
        transfersIn: 0,
        refundsIssued: 0,
        feesPaid: 0,
        streamsActive: 0,
        streamsTotalFlowed: 0,
      },
      byCorridor: {},
      byAccountType: {},
    },
  });
});

// ============================================
// GET /v1/reports - List all reports
// ============================================
reports.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Parse pagination params
  const query = c.req.query();
  const limit = Math.min(parseInt(query.limit || '50'), 100);
  const page = Math.max(parseInt(query.page || '1'), 1);
  const offset = (page - 1) * limit;
  
  try {
    // For now, return mock/placeholder data since reports table doesn't exist yet
    // TODO: Implement actual reports table and storage when needed
    const mockReports = [
      {
        id: 'report-001',
        name: 'Monthly Financial Summary',
        type: 'financial_summary',
        format: 'pdf',
        status: 'ready',
        rowCount: 1250,
        summary: {
          totalTransactions: 1250,
          totalAmount: 2450000,
        },
        generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        downloadUrl: '/v1/reports/report-001/download',
      },
      {
        id: 'report-002',
        name: 'Transactions Export',
        type: 'transactions',
        format: 'csv',
        status: 'ready',
        rowCount: 856,
        summary: {
          totalTransactions: 856,
        },
        generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        downloadUrl: '/v1/reports/report-002/download',
      },
    ];
    
    const paginatedReports = mockReports.slice(offset, offset + limit);
    
    return c.json({
      data: paginatedReports,
      pagination: {
        page,
        limit,
        total: mockReports.length,
        totalPages: Math.ceil(mockReports.length / limit),
      },
    });
  } catch (error: any) {
    console.error('Error listing reports:', error);
    return c.json({ error: 'Failed to list reports' }, 500);
  }
});

// ============================================
// POST /v1/reports (Legacy endpoint - for backward compatibility)
// ============================================
reports.post('/', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  // Validate report type
  const validTypes = ['statement', 'transactions', 'streams', 'accounts', 'agents', 'financial_summary'];
  if (!body.type || !validTypes.includes(body.type)) {
    throw new ValidationError(`Invalid report type. Must be one of: ${validTypes.join(', ')}`);
  }

  // For now, return a simple response (this endpoint needs full implementation)
  return c.json({
    data: {
      id: 'report-' + Date.now(),
      type: body.type,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  }, 201);
});

export default reports;
