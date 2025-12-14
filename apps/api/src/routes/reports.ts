import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { 
  logAudit,
  isValidUUID,
  getPaginationParams,
  paginationResponse,
} from '../utils/helpers.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const reports = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createReportSchema = z.object({
  type: z.enum([
    'transactions',
    'streams',
    'accounts',
    'agents',
    'compliance',
    'financial_summary',
  ]),
  format: z.enum(['csv', 'json', 'pdf']).default('csv'),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
  filters: z.record(z.any()).optional(),
});

// ============================================
// REPORT GENERATORS
// ============================================

interface ReportResult {
  data: any[];
  summary: Record<string, any>;
  rowCount: number;
}

async function generateTransactionsReport(
  supabase: any,
  tenantId: string,
  dateRange?: { from: string; to: string },
  filters?: Record<string, any>
): Promise<ReportResult> {
  let query = supabase
    .from('transfers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (dateRange?.from) {
    query = query.gte('created_at', dateRange.from);
  }
  if (dateRange?.to) {
    query = query.lte('created_at', dateRange.to);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch transactions');

  const rows = data || [];
  
  // Calculate summary
  const completed = rows.filter((t: any) => t.status === 'completed');
  const totalAmount = completed.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
  const totalFees = completed.reduce((sum: number, t: any) => sum + parseFloat(t.fee_amount || 0), 0);

  return {
    data: rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      fromAccount: row.from_account_name,
      toAccount: row.to_account_name,
      amount: parseFloat(row.amount),
      currency: row.currency,
      destinationAmount: row.destination_amount ? parseFloat(row.destination_amount) : null,
      destinationCurrency: row.destination_currency,
      fxRate: row.fx_rate ? parseFloat(row.fx_rate) : null,
      fees: parseFloat(row.fee_amount || 0),
      initiatedBy: row.initiated_by_name,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    })),
    summary: {
      totalTransactions: rows.length,
      completedTransactions: completed.length,
      totalAmount,
      totalFees,
      byStatus: {
        completed: rows.filter((t: any) => t.status === 'completed').length,
        pending: rows.filter((t: any) => t.status === 'pending').length,
        processing: rows.filter((t: any) => t.status === 'processing').length,
        failed: rows.filter((t: any) => t.status === 'failed').length,
      },
    },
    rowCount: rows.length,
  };
}

async function generateStreamsReport(
  supabase: any,
  tenantId: string,
  dateRange?: { from: string; to: string },
  filters?: Record<string, any>
): Promise<ReportResult> {
  let query = supabase
    .from('streams')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (dateRange?.from) {
    query = query.gte('created_at', dateRange.from);
  }
  if (dateRange?.to) {
    query = query.lte('created_at', dateRange.to);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch streams');

  const rows = data || [];
  const active = rows.filter((s: any) => s.status === 'active');
  const totalFlowPerMonth = active.reduce((sum: number, s: any) => sum + parseFloat(s.flow_rate_per_month), 0);
  const totalFunded = rows.reduce((sum: number, s: any) => sum + parseFloat(s.funded_amount), 0);
  const totalStreamed = rows.reduce((sum: number, s: any) => sum + parseFloat(s.total_streamed), 0);

  return {
    data: rows.map((row: any) => ({
      id: row.id,
      status: row.status,
      sender: row.sender_account_name,
      receiver: row.receiver_account_name,
      flowRatePerMonth: parseFloat(row.flow_rate_per_month),
      fundedAmount: parseFloat(row.funded_amount),
      totalStreamed: parseFloat(row.total_streamed),
      totalWithdrawn: parseFloat(row.total_withdrawn),
      health: row.health,
      category: row.category,
      managedBy: row.managed_by_name,
      startedAt: row.started_at,
      createdAt: row.created_at,
    })),
    summary: {
      totalStreams: rows.length,
      activeStreams: active.length,
      totalFlowPerMonth,
      totalFunded,
      totalStreamed,
      byStatus: {
        active: active.length,
        paused: rows.filter((s: any) => s.status === 'paused').length,
        cancelled: rows.filter((s: any) => s.status === 'cancelled').length,
      },
      byHealth: {
        healthy: active.filter((s: any) => s.health === 'healthy').length,
        warning: active.filter((s: any) => s.health === 'warning').length,
        critical: active.filter((s: any) => s.health === 'critical').length,
      },
    },
    rowCount: rows.length,
  };
}

async function generateAccountsReport(
  supabase: any,
  tenantId: string,
  _dateRange?: { from: string; to: string },
  filters?: Record<string, any>
): Promise<ReportResult> {
  let query = supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch accounts');

  const rows = data || [];
  const totalBalance = rows.reduce((sum: number, a: any) => sum + parseFloat(a.balance_total || 0), 0);

  return {
    data: rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      email: row.email,
      verificationStatus: row.verification_status,
      verificationTier: row.verification_tier,
      balanceTotal: parseFloat(row.balance_total || 0),
      balanceAvailable: parseFloat(row.balance_available || 0),
      balanceInStreams: parseFloat(row.balance_in_streams || 0),
      createdAt: row.created_at,
    })),
    summary: {
      totalAccounts: rows.length,
      totalBalance,
      byType: {
        person: rows.filter((a: any) => a.type === 'person').length,
        business: rows.filter((a: any) => a.type === 'business').length,
      },
      byVerificationStatus: {
        verified: rows.filter((a: any) => a.verification_status === 'verified').length,
        pending: rows.filter((a: any) => a.verification_status === 'pending').length,
        unverified: rows.filter((a: any) => a.verification_status === 'unverified').length,
      },
    },
    rowCount: rows.length,
  };
}

async function generateAgentsReport(
  supabase: any,
  tenantId: string,
  _dateRange?: { from: string; to: string },
  filters?: Record<string, any>
): Promise<ReportResult> {
  let query = supabase
    .from('agents')
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch agents');

  const rows = data || [];

  return {
    data: rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      parentAccount: row.accounts?.name,
      kyaTier: row.kya_tier,
      kyaStatus: row.kya_status,
      effectiveLimitPerTx: parseFloat(row.effective_limit_per_tx || 0),
      effectiveLimitDaily: parseFloat(row.effective_limit_daily || 0),
      effectiveLimitMonthly: parseFloat(row.effective_limit_monthly || 0),
      activeStreams: row.active_streams_count,
      totalStreamOutflow: parseFloat(row.total_stream_outflow || 0),
      createdAt: row.created_at,
    })),
    summary: {
      totalAgents: rows.length,
      byStatus: {
        active: rows.filter((a: any) => a.status === 'active').length,
        suspended: rows.filter((a: any) => a.status === 'suspended').length,
        paused: rows.filter((a: any) => a.status === 'paused').length,
      },
      byKyaTier: {
        tier0: rows.filter((a: any) => a.kya_tier === 0).length,
        tier1: rows.filter((a: any) => a.kya_tier === 1).length,
        tier2: rows.filter((a: any) => a.kya_tier === 2).length,
        tier3: rows.filter((a: any) => a.kya_tier === 3).length,
      },
    },
    rowCount: rows.length,
  };
}

async function generateFinancialSummaryReport(
  supabase: any,
  tenantId: string,
  dateRange?: { from: string; to: string },
  _filters?: Record<string, any>
): Promise<ReportResult> {
  // Get accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('balance_total, balance_available, balance_in_streams')
    .eq('tenant_id', tenantId);

  // Get transfers
  let transfersQuery = supabase
    .from('transfers')
    .select('amount, fee_amount, status, type')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed');

  if (dateRange?.from) {
    transfersQuery = transfersQuery.gte('created_at', dateRange.from);
  }
  if (dateRange?.to) {
    transfersQuery = transfersQuery.lte('created_at', dateRange.to);
  }

  const { data: transfers } = await transfersQuery;

  // Get streams
  const { data: streams } = await supabase
    .from('streams')
    .select('flow_rate_per_month, funded_amount, total_streamed, total_withdrawn, status')
    .eq('tenant_id', tenantId);

  const accountRows = accounts || [];
  const transferRows = transfers || [];
  const streamRows = streams || [];

  const totalBalance = accountRows.reduce((sum: number, a: any) => sum + parseFloat(a.balance_total || 0), 0);
  const totalAvailable = accountRows.reduce((sum: number, a: any) => sum + parseFloat(a.balance_available || 0), 0);
  const totalInStreams = accountRows.reduce((sum: number, a: any) => sum + parseFloat(a.balance_in_streams || 0), 0);

  const totalTransferVolume = transferRows.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
  const totalFees = transferRows.reduce((sum: number, t: any) => sum + parseFloat(t.fee_amount || 0), 0);

  const activeStreams = streamRows.filter((s: any) => s.status === 'active');
  const totalFlowPerMonth = activeStreams.reduce((sum: number, s: any) => sum + parseFloat(s.flow_rate_per_month), 0);
  const totalStreamed = streamRows.reduce((sum: number, s: any) => sum + parseFloat(s.total_streamed), 0);

  return {
    data: [{
      period: dateRange ? `${dateRange.from} to ${dateRange.to}` : 'All time',
      balances: {
        total: totalBalance,
        available: totalAvailable,
        inStreams: totalInStreams,
      },
      transfers: {
        count: transferRows.length,
        volume: totalTransferVolume,
        fees: totalFees,
      },
      streaming: {
        activeCount: activeStreams.length,
        monthlyOutflow: totalFlowPerMonth,
        totalStreamed,
      },
    }],
    summary: {
      totalBalance,
      totalAvailable,
      totalInStreams,
      transferVolume: totalTransferVolume,
      transferFees: totalFees,
      streamingOutflow: totalFlowPerMonth,
      totalStreamed,
    },
    rowCount: 1,
  };
}

// ============================================
// GET /v1/reports/summary - Get period summary (Story 10.6)
// ============================================
reports.get('/summary', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  const query = c.req.query();
  const period = query.period || 'month'; // day, week, month, custom
  const startDate = query.startDate;
  const endDate = query.endDate;
  
  // Calculate date range
  let dateFrom: Date;
  let dateTo: Date = new Date();
  
  switch (period) {
    case 'day':
      dateFrom = new Date();
      dateFrom.setHours(0, 0, 0, 0);
      break;
    case 'week':
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);
      break;
    case 'month':
      dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      break;
    case 'custom':
      if (!startDate || !endDate) {
        throw new ValidationError('Custom period requires startDate and endDate');
      }
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
      break;
    default:
      dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 1);
  }
  
  // Get transfers in period
  const { data: transfers, error: transfersError } = await supabase
    .from('transfers')
    .select('type, status, amount, fee_amount, from_account_id, to_account_id, corridor')
    .eq('tenant_id', ctx.tenantId)
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString());
  
  if (transfersError) {
    console.error('Error fetching transfers:', transfersError);
    return c.json({ error: 'Failed to fetch summary' }, 500);
  }
  
  // Get refunds in period
  const { data: refunds, error: refundsError } = await supabase
    .from('refunds')
    .select('amount, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'completed')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString());
  
  if (refundsError) {
    console.error('Error fetching refunds:', refundsError);
  }
  
  // Get active streams
  const { data: streams, error: streamsError } = await supabase
    .from('streams')
    .select('status, flow_rate_per_month, total_streamed')
    .eq('tenant_id', ctx.tenantId);
  
  if (streamsError) {
    console.error('Error fetching streams:', streamsError);
  }
  
  // Get accounts for type breakdown
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, type')
    .eq('tenant_id', ctx.tenantId);
  
  if (accountsError) {
    console.error('Error fetching accounts:', accountsError);
  }
  
  // Calculate totals
  const transferRows = transfers || [];
  const refundRows = refunds || [];
  const streamRows = streams || [];
  const accountRows = accounts || [];
  
  const completedTransfers = transferRows.filter(t => t.status === 'completed');
  const transfersOut = completedTransfers.filter(t => t.type === 'external' || t.type === 'payout');
  const transfersIn = completedTransfers.filter(t => t.type === 'funding' || t.type === 'deposit');
  
  const totalTransfersOut = transfersOut.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalTransfersIn = transfersIn.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalRefunds = refundRows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const totalFees = completedTransfers.reduce((sum, t) => sum + parseFloat(t.fee_amount || 0), 0);
  
  const activeStreams = streamRows.filter(s => s.status === 'active');
  const totalStreamFlowed = activeStreams.reduce((sum, s) => sum + parseFloat(s.total_streamed), 0);
  
  // Calculate by corridor
  const byCorridor = completedTransfers.reduce((acc: Record<string, { volume: number; count: number }>, t) => {
    const corridor = t.corridor || 'unknown';
    if (!acc[corridor]) {
      acc[corridor] = { volume: 0, count: 0 };
    }
    acc[corridor].volume += parseFloat(t.amount);
    acc[corridor].count += 1;
    return acc;
  }, {});
  
  // Calculate by account type
  const accountTypeMap = accountRows.reduce((acc: Record<string, string>, a) => {
    acc[a.id] = a.type;
    return acc;
  }, {});
  
  const byAccountType = completedTransfers.reduce((acc: Record<string, number>, t) => {
    const accountType = accountTypeMap[t.from_account_id] || 'unknown';
    acc[accountType] = (acc[accountType] || 0) + parseFloat(t.amount);
    return acc;
  }, {});
  
  return c.json({
    data: {
      period: {
        start: dateFrom.toISOString().split('T')[0],
        end: dateTo.toISOString().split('T')[0],
      },
      totals: {
        transfersOut: totalTransfersOut,
        transfersIn: totalTransfersIn,
        refundsIssued: totalRefunds,
        feesPaid: totalFees,
        streamsActive: activeStreams.length,
        streamsTotalFlowed: totalStreamFlowed,
      },
      byCorridor: Object.entries(byCorridor).map(([corridor, data]) => ({
        corridor,
        volume: data.volume,
        count: data.count,
      })),
      byAccountType: Object.entries(byAccountType).map(([type, volume]) => ({
        type,
        volume,
      })),
    },
  });
});

// ============================================
// GET /v1/audit-logs - Get audit logs (MUST BE BEFORE /:id)
// ============================================
reports.get('/audit-logs', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const entityType = query.entityType;
  const entityId = query.entityId;
  const action = query.action;
  const actorId = query.actorId;
  const fromDate = query.fromDate;
  const toDate = query.toDate;
  
  let dbQuery = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (entityType) {
    dbQuery = dbQuery.eq('entity_type', entityType);
  }
  if (entityId) {
    dbQuery = dbQuery.eq('entity_id', entityId);
  }
  if (action) {
    dbQuery = dbQuery.eq('action', action);
  }
  if (actorId) {
    dbQuery = dbQuery.eq('actor_id', actorId);
  }
  if (fromDate) {
    dbQuery = dbQuery.gte('created_at', fromDate);
  }
  if (toDate) {
    dbQuery = dbQuery.lte('created_at', toDate);
  }
  
  const { data, count, error } = await dbQuery;
  
  if (error) {
    console.error('Error fetching audit logs:', error);
    return c.json({ error: 'Failed to fetch audit logs' }, 500);
  }
  
  const logs = (data || []).map(row => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actor: {
      type: row.actor_type,
      id: row.actor_id,
      name: row.actor_name,
    },
    changes: row.changes,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
  
  return c.json(paginationResponse(logs, count || 0, { page, limit }));
});

// ============================================
// GET /v1/reports - List reports
// ============================================
reports.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const type = query.type;
  const status = query.status;
  
  let dbQuery = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .eq('type', 'report')
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (type) {
    dbQuery = dbQuery.eq('metadata->>reportType', type);
  }
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }
  
  const { data, count, error } = await dbQuery;
  
  if (error) {
    console.error('Error fetching reports:', error);
    return c.json({ error: 'Failed to fetch reports' }, 500);
  }
  
  const reports = (data || []).map(row => ({
    id: row.id,
    name: row.name,
    type: row.metadata?.reportType,
    format: row.format,
    status: row.status,
    rowCount: row.metadata?.rowCount,
    dateRange: row.metadata?.dateRange,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    downloadUrl: row.status === 'ready' ? `/v1/reports/${row.id}/download` : null,
    createdAt: row.created_at,
  }));
  
  return c.json(paginationResponse(reports, count || 0, { page, limit }));
});

// ============================================
// POST /v1/reports - Generate report
// ============================================
reports.post('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const { type, format, dateRange, filters } = parsed.data;
  
  // Generate report data
  let result: ReportResult;
  
  switch (type) {
    case 'transactions':
      result = await generateTransactionsReport(supabase, ctx.tenantId, dateRange, filters);
      break;
    case 'streams':
      result = await generateStreamsReport(supabase, ctx.tenantId, dateRange, filters);
      break;
    case 'accounts':
      result = await generateAccountsReport(supabase, ctx.tenantId, dateRange, filters);
      break;
    case 'agents':
      result = await generateAgentsReport(supabase, ctx.tenantId, dateRange, filters);
      break;
    case 'financial_summary':
      result = await generateFinancialSummaryReport(supabase, ctx.tenantId, dateRange, filters);
      break;
    default:
      throw new ValidationError(`Unknown report type: ${type}`);
  }
  
  // Create document record
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const reportName = `${type}_report_${now.toISOString().split('T')[0]}`;
  
  const { data: doc, error: createError } = await supabase
    .from('documents')
    .insert({
      tenant_id: ctx.tenantId,
      type: 'report',
      name: reportName,
      format,
      status: 'ready',
      generated_at: now.toISOString(),
      generated_by_type: ctx.actorType,
      generated_by_id: ctx.actorId,
      generated_by_name: ctx.actorName,
      expires_at: expiresAt.toISOString(),
      content: result.data,
      metadata: {
        reportType: type,
        dateRange,
        filters,
        rowCount: result.rowCount,
        summary: result.summary,
      },
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating report:', createError);
    return c.json({ error: 'Failed to create report' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'report',
    entityId: doc.id,
    action: 'generated',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    metadata: { type, format, rowCount: result.rowCount },
  });
  
  return c.json({
    data: {
      id: doc.id,
      name: doc.name,
      type,
      format,
      status: doc.status,
      rowCount: result.rowCount,
      summary: result.summary,
      dateRange,
      generatedAt: doc.generated_at,
      expiresAt: doc.expires_at,
      downloadUrl: `/v1/reports/${doc.id}/download`,
    },
  }, 201);
});

// ============================================
// GET /v1/reports/:id - Get report details
// ============================================
reports.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid report ID format');
  }
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('type', 'report')
    .single();
  
  if (error || !data) {
    throw new NotFoundError('Report', id);
  }
  
  return c.json({
    data: {
      id: data.id,
      name: data.name,
      type: data.metadata?.reportType,
      format: data.format,
      status: data.status,
      rowCount: data.metadata?.rowCount,
      summary: data.metadata?.summary,
      dateRange: data.metadata?.dateRange,
      generatedAt: data.generated_at,
      generatedBy: data.generated_by_name,
      expiresAt: data.expires_at,
      downloadUrl: data.status === 'ready' ? `/v1/reports/${data.id}/download` : null,
    },
  });
});

// ============================================
// GET /v1/reports/:id/download - Download report
// ============================================
reports.get('/:id/download', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid report ID format');
  }
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('type', 'report')
    .single();
  
  if (error || !data) {
    throw new NotFoundError('Report', id);
  }
  
  if (data.status !== 'ready') {
    throw new ValidationError('Report is not ready for download');
  }
  
  // Check expiration
  if (new Date(data.expires_at) < new Date()) {
    throw new ValidationError('Report has expired');
  }
  
  const format = data.format;
  const content = data.content;
  
  if (format === 'json') {
    return c.json({
      report: {
        id: data.id,
        name: data.name,
        type: data.metadata?.reportType,
        generatedAt: data.generated_at,
        dateRange: data.metadata?.dateRange,
        summary: data.metadata?.summary,
      },
      data: content,
    });
  }
  
  if (format === 'csv') {
    // Convert to CSV
    const rows = Array.isArray(content) ? content : [];
    if (rows.length === 0) {
      return c.text('');
    }
    
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((row: any) => 
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        }).join(',')
      ),
    ];
    
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="${data.name}.csv"`);
    return c.text(csvLines.join('\n'));
  }
  
  // PDF not implemented - return JSON as fallback
  return c.json({
    report: {
      id: data.id,
      name: data.name,
      type: data.metadata?.reportType,
      generatedAt: data.generated_at,
    },
    data: content,
    note: 'PDF generation not implemented in PoC - returning JSON',
  });
});

// ============================================
// DELETE /v1/reports/:id - Delete report
// ============================================
reports.delete('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid report ID format');
  }
  
  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('id, name')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('type', 'report')
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Report', id);
  }
  
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting report:', error);
    return c.json({ error: 'Failed to delete report' }, 500);
  }
  
  return c.json({ data: { id, deleted: true } });
});

export default reports;
