/**
 * Reconciliation Routes - Epic 27, Story 27.3
 * 
 * API endpoints for reconciliation operations.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { createReconciliationService } from '../services/reconciliation.js';
import { getAdapter, getAllAdapters, getMockTransactions, RailId } from '../services/rail-adapters/index.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';
import { getPaginationParams, paginationResponse } from '../utils/helpers.js';

const app = new Hono();

// Apply auth middleware
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const runReconciliationSchema = z.object({
  rail: z.enum(['circle_usdc', 'base_chain', 'pix', 'spei', 'wire']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  tenantId: z.string().uuid().optional(),
});

const resolveDiscrepancySchema = z.object({
  resolution: z.string().min(1).max(1000),
  notes: z.string().max(5000).optional(),
});

// ============================================
// Reports Endpoints
// ============================================

/**
 * GET /v1/reconciliation/reports
 * List reconciliation reports
 */
app.get('/reports', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();
    const { page, limit } = getPaginationParams(query);
    
    const supabase = createClient();
    const service = createReconciliationService(supabase);
    
    const { data, total } = await service.getReports({
      tenantId: ctx.tenantId,
      rail: query.rail as RailId | undefined,
      status: query.status,
      limit,
      offset: (page - 1) * limit,
    });
    
    return c.json(paginationResponse(data, total, { page, limit }));
  } catch (error: any) {
    console.error('Error listing reconciliation reports:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /v1/reconciliation/reports/:id
 * Get a specific reconciliation report
 */
app.get('/reports/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const reportId = c.req.param('id');
    
    const supabase = createClient();
    
    const { data: report, error } = await supabase
      .from('reconciliation_reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (error || !report) {
      throw new NotFoundError('Reconciliation report', reportId);
    }
    
    // Get discrepancies for this report
    const service = createReconciliationService(supabase);
    const { data: discrepancies } = await service.getDiscrepancies({
      reportId,
      limit: 100,
    });
    
    return c.json({
      data: {
        ...report,
        discrepancies,
      },
    });
  } catch (error: any) {
    console.error('Error getting reconciliation report:', error);
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /v1/reconciliation/run
 * Trigger a reconciliation run
 */
app.post('/run', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    const parsed = runReconciliationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request', parsed.error.flatten());
    }
    
    const supabase = createClient();
    const service = createReconciliationService(supabase);
    
    const result = await service.runReconciliation({
      tenantId: parsed.data.tenantId || ctx.tenantId,
      rail: parsed.data.rail as RailId,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
      reportType: 'manual',
    });
    
    return c.json({
      data: result.report,
      discrepancies: result.discrepancies,
      message: `Reconciliation completed. Found ${result.discrepancies.length} discrepancies.`,
    });
  } catch (error: any) {
    console.error('Error running reconciliation:', error);
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Discrepancies Endpoints
// ============================================

/**
 * GET /v1/reconciliation/discrepancies
 * List discrepancies
 */
app.get('/discrepancies', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();
    const { page, limit } = getPaginationParams(query);
    
    const supabase = createClient();
    const service = createReconciliationService(supabase);
    
    const { data, total } = await service.getDiscrepancies({
      tenantId: ctx.tenantId,
      reportId: query.reportId,
      rail: query.rail as RailId | undefined,
      status: query.status,
      severity: query.severity as any,
      limit,
      offset: (page - 1) * limit,
    });
    
    return c.json(paginationResponse(data, total, { page, limit }));
  } catch (error: any) {
    console.error('Error listing discrepancies:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /v1/reconciliation/discrepancies/:id/resolve
 * Resolve a discrepancy
 */
app.post('/discrepancies/:id/resolve', async (c) => {
  try {
    const ctx = c.get('ctx');
    const discrepancyId = c.req.param('id');
    const body = await c.req.json();
    
    const parsed = resolveDiscrepancySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid request', parsed.error.flatten());
    }
    
    const supabase = createClient();
    const service = createReconciliationService(supabase);
    
    const resolved = await service.resolveDiscrepancy(
      discrepancyId,
      parsed.data.resolution,
      ctx.actorId || ctx.tenantId,
      parsed.data.notes
    );
    
    return c.json({
      data: resolved,
      message: 'Discrepancy resolved successfully',
    });
  } catch (error: any) {
    console.error('Error resolving discrepancy:', error);
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Rails Endpoints
// ============================================

/**
 * GET /v1/reconciliation/rails
 * Get all rail adapters and their status
 */
app.get('/rails', async (c) => {
  try {
    const supabase = createClient();
    const service = createReconciliationService(supabase);
    
    const health = await service.getRailHealth();
    const adapters = getAllAdapters();
    
    const rails = adapters.map(adapter => ({
      id: adapter.railId,
      name: adapter.name,
      isSandbox: adapter.isSandbox,
      healthy: health[adapter.railId]?.healthy ?? false,
      message: health[adapter.railId]?.message,
    }));
    
    return c.json({ data: rails });
  } catch (error: any) {
    console.error('Error getting rails:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /v1/reconciliation/rails/:rail/balance
 * Get balance for a specific rail
 */
app.get('/rails/:rail/balance', async (c) => {
  try {
    const railId = c.req.param('rail') as RailId;
    const currency = c.req.query('currency') || 'USDC';
    
    const adapter = getAdapter(railId);
    const balance = await adapter.getBalance(currency);
    
    return c.json({ data: balance });
  } catch (error: any) {
    console.error('Error getting rail balance:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /v1/reconciliation/rails/:rail/transactions
 * Get transactions from a rail (for debugging/manual reconciliation)
 */
app.get('/rails/:rail/transactions', async (c) => {
  try {
    const railId = c.req.param('rail') as RailId;
    const query = c.req.query();
    
    const adapter = getAdapter(railId);
    
    const startDate = query.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endDate = query.endDate || new Date().toISOString();
    
    const response = await adapter.getTransactions({
      startDate,
      endDate,
      status: query.status as any,
      limit: parseInt(query.limit || '50'),
      cursor: query.cursor,
    });
    
    return c.json({
      data: response.transactions,
      hasMore: response.hasMore,
      nextCursor: response.nextCursor,
    });
  } catch (error: any) {
    console.error('Error getting rail transactions:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Summary Endpoints
// ============================================

/**
 * GET /v1/reconciliation/summary
 * Get settlement summary for tenant
 */
app.get('/summary', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();
    
    const supabase = createClient();
    const service = createReconciliationService(supabase);
    
    const startDate = query.startDate 
      ? new Date(query.startDate) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const endDate = query.endDate 
      ? new Date(query.endDate) 
      : new Date();
    
    const summary = await service.getSettlementSummary(ctx.tenantId, startDate, endDate);
    
    return c.json({
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        ...summary,
      },
    });
  } catch (error: any) {
    console.error('Error getting settlement summary:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /v1/reconciliation/dashboard
 * Get dashboard data (recent reports, open discrepancies, etc.)
 */
app.get('/dashboard', async (c) => {
  try {
    const ctx = c.get('ctx');
    
    const supabase = createClient();
    const service = createReconciliationService(supabase);
    
    // Get recent reports
    const { data: recentReports } = await service.getReports({
      tenantId: ctx.tenantId,
      limit: 5,
    });
    
    // Get open discrepancies
    const { data: openDiscrepancies, total: openCount } = await service.getDiscrepancies({
      tenantId: ctx.tenantId,
      status: 'open',
      limit: 10,
    });
    
    // Get critical discrepancies
    const { data: criticalDiscrepancies } = await service.getDiscrepancies({
      tenantId: ctx.tenantId,
      status: 'open',
      severity: 'critical',
      limit: 5,
    });
    
    // Get rail health
    const railHealth = await service.getRailHealth();
    
    // Get settlement summary (last 24h)
    const summary = await service.getSettlementSummary(
      ctx.tenantId,
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      new Date()
    );
    
    return c.json({
      data: {
        recentReports,
        openDiscrepancies: {
          count: openCount,
          items: openDiscrepancies,
        },
        criticalDiscrepancies,
        railHealth,
        last24hSummary: summary,
      },
    });
  } catch (error: any) {
    console.error('Error getting dashboard:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Debug/Sandbox Endpoints
// ============================================

/**
 * GET /v1/reconciliation/sandbox/transactions
 * Get all mock transactions (sandbox mode only)
 */
app.get('/sandbox/transactions', async (c) => {
  try {
    const transactions = getMockTransactions();
    
    return c.json({
      data: transactions,
      count: transactions.length,
      message: 'Sandbox mock transactions',
    });
  } catch (error: any) {
    console.error('Error getting sandbox transactions:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /v1/reconciliation/sandbox/simulate
 * Simulate a settlement for testing reconciliation
 */
app.post('/sandbox/simulate', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    const railId = (body.rail || 'circle_usdc') as RailId;
    const adapter = getAdapter(railId);
    
    // Submit a mock settlement
    const result = await adapter.submitSettlement({
      transferId: body.transferId || `test_${Date.now()}`,
      tenantId: ctx.tenantId,
      amount: body.amount || 100,
      currency: body.currency || 'USDC',
      destinationCurrency: body.destinationCurrency,
      metadata: {
        simulated: true,
        source: 'sandbox_simulate',
        ...body.metadata,
      },
    });
    
    return c.json({
      data: result,
      message: `Simulated settlement on ${railId}`,
    });
  } catch (error: any) {
    console.error('Error simulating settlement:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;

