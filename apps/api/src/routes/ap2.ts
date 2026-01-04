/**
 * AP2 (Agent Payment Protocol) API
 * 
 * Google's mandate-based agent authorization protocol.
 * Enables agents to execute pre-authorized payments within mandate budgets.
 * 
 * @module routes/ap2
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

const createMandateSchema = z.object({
  mandate_id: z.string().min(1).max(255),
  mandate_type: z.enum(['intent', 'cart', 'payment']),
  agent_id: z.string().min(1).max(255),
  agent_name: z.string().min(1).max(255).optional(),
  account_id: z.string().uuid(),
  authorized_amount: z.number().positive(),
  currency: z.string().min(3).max(10).optional().default('USDC'),
  mandate_data: z.record(z.any()).optional(),
  a2a_session_id: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const executeMandateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(10).optional().default('USDC'),
  authorization_proof: z.string().optional(),
  description: z.string().optional(),
  idempotency_key: z.string().optional(),
});

// ============================================
// Routes
// ============================================

/**
 * POST /v1/ap2/mandates
 * Create a new AP2 mandate
 */
app.post('/mandates', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    const validated = createMandateSchema.parse(body);

    const supabase = createClient();

    // Check if mandate_id already exists
    const { data: existing } = await supabase
      .from('ap2_mandates')
      .select('id')
      .eq('mandate_id', validated.mandate_id)
      .single();

    if (existing) {
      return c.json({ error: 'Mandate ID already exists' }, 409);
    }

    // Verify account exists and belongs to tenant
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', validated.account_id)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (accountError || !account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Create mandate
    const { data: mandate, error } = await supabase
      .from('ap2_mandates')
      .insert({
        tenant_id: ctx.tenantId,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      console.error('[AP2] Create mandate error:', error);
      return c.json({ error: 'Failed to create mandate' }, 500);
    }

    return c.json({
      data: {
        id: mandate.id,
        mandate_id: mandate.mandate_id,
        mandate_type: mandate.mandate_type,
        agent_id: mandate.agent_id,
        agent_name: mandate.agent_name,
        account_id: mandate.account_id,
        authorized_amount: parseFloat(mandate.authorized_amount),
        used_amount: parseFloat(mandate.used_amount),
        remaining_amount: parseFloat(mandate.remaining_amount),
        currency: mandate.currency,
        status: mandate.status,
        execution_count: mandate.execution_count,
        expires_at: mandate.expires_at,
        created_at: mandate.created_at,
      },
    }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[AP2] Create mandate error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/ap2/mandates
 * List mandates with filtering
 */
app.get('/mandates', async (c) => {
  try {
    const ctx = c.get('ctx');
    const supabase = createClient();

    // Query params
    const status = c.req.query('status');
    const agent_id = c.req.query('agent_id');
    const account_id = c.req.query('account_id');
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('ap2_mandates')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId);

    if (status) {
      query = query.eq('status', status);
    }
    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }
    if (account_id) {
      query = query.eq('account_id', account_id);
    }

    const { data: mandates, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[AP2] List mandates error:', error);
      return c.json({ error: 'Failed to fetch mandates' }, 500);
    }

    // Format response
    const formattedMandates = mandates?.map(m => ({
      id: m.id,
      mandate_id: m.mandate_id,
      mandate_type: m.mandate_type,
      agent_id: m.agent_id,
      agent_name: m.agent_name,
      account_id: m.account_id,
      authorized_amount: parseFloat(m.authorized_amount),
      used_amount: parseFloat(m.used_amount),
      remaining_amount: parseFloat(m.remaining_amount),
      currency: m.currency,
      status: m.status,
      execution_count: m.execution_count,
      expires_at: m.expires_at,
      created_at: m.created_at,
      updated_at: m.updated_at,
    })) || [];

    return c.json({
      data: formattedMandates,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[AP2] List mandates error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/ap2/mandates/:id
 * Get mandate details with execution history
 */
app.get('/mandates/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();
    const supabase = createClient();

    // Fetch mandate
    const { data: mandate, error: mandateError } = await supabase
      .from('ap2_mandates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (mandateError || !mandate) {
      return c.json({ error: 'Mandate not found' }, 404);
    }

    // Fetch execution history
    const { data: executions } = await supabase
      .from('ap2_mandate_executions')
      .select('*')
      .eq('mandate_id', id)
      .order('created_at', { ascending: false });

    return c.json({
      data: {
        id: mandate.id,
        mandate_id: mandate.mandate_id,
        mandate_type: mandate.mandate_type,
        agent_id: mandate.agent_id,
        agent_name: mandate.agent_name,
        account_id: mandate.account_id,
        authorized_amount: parseFloat(mandate.authorized_amount),
        used_amount: parseFloat(mandate.used_amount),
        remaining_amount: parseFloat(mandate.remaining_amount),
        currency: mandate.currency,
        status: mandate.status,
        execution_count: mandate.execution_count,
        mandate_data: mandate.mandate_data,
        a2a_session_id: mandate.a2a_session_id,
        expires_at: mandate.expires_at,
        metadata: mandate.metadata,
        created_at: mandate.created_at,
        updated_at: mandate.updated_at,
        completed_at: mandate.completed_at,
        cancelled_at: mandate.cancelled_at,
        executions: executions?.map(e => ({
          id: e.id,
          execution_index: e.execution_index,
          amount: parseFloat(e.amount),
          currency: e.currency,
          status: e.status,
          transfer_id: e.transfer_id,
          created_at: e.created_at,
          completed_at: e.completed_at,
        })) || [],
      },
    });
  } catch (error) {
    console.error('[AP2] Get mandate error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /v1/ap2/mandates/:id/execute
 * Execute a payment against a mandate
 */
app.post('/mandates/:id/execute', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = executeMandateSchema.parse(body);

    const supabase = createClient();

    // Fetch and validate mandate
    const { data: mandate, error: mandateError } = await supabase
      .from('ap2_mandates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (mandateError || !mandate) {
      return c.json({ error: 'Mandate not found' }, 404);
    }

    // Check mandate validity
    const { data: isValid } = await supabase
      .rpc('check_ap2_mandate_valid', {
        p_mandate_id: id,
        p_amount: validated.amount,
      });

    if (!isValid) {
      return c.json({ 
        error: 'Mandate invalid or insufficient remaining amount',
        details: {
          status: mandate.status,
          authorized_amount: parseFloat(mandate.authorized_amount),
          used_amount: parseFloat(mandate.used_amount),
          remaining_amount: parseFloat(mandate.remaining_amount),
          requested_amount: validated.amount,
        },
      }, 400);
    }

    // Create transfer
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        tenant_id: ctx.tenantId,
        from_account_id: mandate.account_id,
        to_account_id: mandate.account_id, // TODO: Determine recipient from mandate
        amount: validated.amount,
        currency: validated.currency,
        type: 'ap2',
        status: 'completed', // AP2 transfers are pre-authorized
        description: validated.description || `AP2 mandate execution (${mandate.mandate_type})`,
        idempotency_key: validated.idempotency_key,
        protocol_metadata: {
          protocol: 'ap2',
          mandate_id: mandate.mandate_id,
          mandate_type: mandate.mandate_type,
          agent_id: mandate.agent_id,
          execution_index: mandate.execution_count + 1,
          authorization_proof: validated.authorization_proof,
          a2a_session_id: mandate.a2a_session_id,
        },
        initiated_by_type: ctx.actorType,
        initiated_by_id: ctx.userId || ctx.apiKeyId || ctx.actorId || 'unknown',
        initiated_by_name: ctx.userName || ctx.actorName || null,
      })
      .select()
      .single();

    if (transferError) {
      console.error('[AP2] Transfer creation error:', transferError);
      return c.json({ error: 'Failed to create transfer' }, 500);
    }

    // Record execution
    const { data: execution, error: executionError } = await supabase
      .from('ap2_mandate_executions')
      .insert({
        tenant_id: ctx.tenantId,
        mandate_id: id,
        transfer_id: transfer.id,
        execution_index: mandate.execution_count + 1,
        amount: validated.amount,
        currency: validated.currency,
        authorization_proof: validated.authorization_proof,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (executionError) {
      console.error('[AP2] Execution recording error:', executionError);
      // Transfer was created, but execution logging failed
      // This will be caught by the trigger
    }

    // Fetch updated mandate
    const { data: updatedMandate } = await supabase
      .from('ap2_mandates')
      .select('*')
      .eq('id', id)
      .single();

    return c.json({
      data: {
        execution_id: execution?.id,
        transfer_id: transfer.id,
        mandate: {
          id: updatedMandate?.id,
          remaining_amount: parseFloat(updatedMandate?.remaining_amount || '0'),
          used_amount: parseFloat(updatedMandate?.used_amount || '0'),
          execution_count: updatedMandate?.execution_count || 0,
          status: updatedMandate?.status,
        },
        transfer: {
          id: transfer.id,
          amount: parseFloat(transfer.amount),
          currency: transfer.currency,
          status: transfer.status,
          created_at: transfer.created_at,
        },
      },
    }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[AP2] Execute mandate error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /v1/ap2/mandates/:id/cancel
 * Cancel an active mandate
 */
app.patch('/mandates/:id/cancel', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { id } = c.req.param();
    const supabase = createClient();

    const { data: mandate, error } = await supabase
      .from('ap2_mandates')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'active')
      .select()
      .single();

    if (error || !mandate) {
      return c.json({ error: 'Mandate not found or not cancellable' }, 404);
    }

    return c.json({
      data: {
        id: mandate.id,
        status: mandate.status,
        cancelled_at: mandate.cancelled_at,
      },
    });
  } catch (error) {
    console.error('[AP2] Cancel mandate error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/ap2/analytics
 * AP2-specific analytics
 */
app.get('/analytics', async (c) => {
  try {
    const ctx = c.get('ctx');
    const period = c.req.query('period') || '30d';
    const supabase = createClient();

    // Calculate date range
    const end = new Date();
    const start = new Date();
    switch (period) {
      case '24h': start.setHours(start.getHours() - 24); break;
      case '7d': start.setDate(start.getDate() - 7); break;
      case '30d': start.setDate(start.getDate() - 30); break;
      case '90d': start.setDate(start.getDate() - 90); break;
      case '1y': start.setFullYear(start.getFullYear() - 1); break;
    }

    // Fetch AP2 transfers
    const { data: transfers } = await supabase
      .from('transfers')
      .select('id, amount, fee_amount, created_at, protocol_metadata')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'ap2')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Fetch mandates
    const { data: mandates } = await supabase
      .from('ap2_mandates')
      .select('*')
      .eq('tenant_id', ctx.tenantId);

    const revenue = transfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const fees = transfers?.reduce((sum, t) => sum + parseFloat(t.fee_amount || '0'), 0) || 0;

    const activeMandates = mandates?.filter(m => m.status === 'active').length || 0;
    const totalAuthorized = mandates
      ?.filter(m => m.status === 'active')
      .reduce((sum, m) => sum + parseFloat(m.authorized_amount), 0) || 0;
    const totalUsed = mandates
      ?.filter(m => m.status === 'active')
      .reduce((sum, m) => sum + parseFloat(m.used_amount), 0) || 0;

    return c.json({
      data: {
        period,
        summary: {
          totalRevenue: parseFloat(revenue.toFixed(8)),
          totalFees: parseFloat(fees.toFixed(8)),
          netRevenue: parseFloat((revenue - fees).toFixed(8)),
          transactionCount: transfers?.length || 0,
          activeMandates,
          totalAuthorized: parseFloat(totalAuthorized.toFixed(8)),
          totalUsed: parseFloat(totalUsed.toFixed(8)),
          utilizationRate: totalAuthorized > 0 
            ? parseFloat(((totalUsed / totalAuthorized) * 100).toFixed(2))
            : 0,
        },
        mandatesByType: {
          intent: mandates?.filter(m => m.mandate_type === 'intent').length || 0,
          cart: mandates?.filter(m => m.mandate_type === 'cart').length || 0,
          payment: mandates?.filter(m => m.mandate_type === 'payment').length || 0,
        },
        mandatesByStatus: {
          active: mandates?.filter(m => m.status === 'active').length || 0,
          completed: mandates?.filter(m => m.status === 'completed').length || 0,
          cancelled: mandates?.filter(m => m.status === 'cancelled').length || 0,
          expired: mandates?.filter(m => m.status === 'expired').length || 0,
        },
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('[AP2] Analytics error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

