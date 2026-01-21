/**
 * Settlement Rules API
 * Epic 50, Story 50.4: CRUD for settlement trigger rules
 */

import { Hono } from 'hono';
import { createClient } from '../db/client';
import {
  getSettlementRules,
  getSettlementRule,
  createSettlementRule,
  updateSettlementRule,
  deleteSettlementRule,
  getRuleExecutions,
  requestManualSettlement,
  TriggerType,
  SettlementRail,
  SettlementPriority,
} from '../services/settlement-triggers';

const app = new Hono();

/**
 * GET /v1/settlement-rules
 * List all settlement rules for the organization
 */
app.get('/', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const triggerType = c.req.query('trigger_type') as TriggerType | undefined;
  const enabledOnly = c.req.query('enabled_only') === 'true';
  const walletId = c.req.query('wallet_id');

  const supabase = createClient();
  const { data, error } = await getSettlementRules(supabase, ctx.tenantId, {
    trigger_type: triggerType,
    enabled_only: enabledOnly,
    wallet_id: walletId || undefined,
  });

  if (error) {
    return c.json({ error }, 500);
  }

  return c.json({ data });
});

/**
 * GET /v1/settlement-rules/:id
 * Get a single settlement rule
 */
app.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const ruleId = c.req.param('id');
  const supabase = createClient();
  const { data, error } = await getSettlementRule(supabase, ctx.tenantId, ruleId);

  if (error) {
    if (error === 'Rule not found') {
      return c.json({ error }, 404);
    }
    return c.json({ error }, 500);
  }

  return c.json(data);
});

/**
 * POST /v1/settlement-rules
 * Create a new settlement rule
 */
app.post('/', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();

  // Validate required fields
  if (!body.name || typeof body.name !== 'string') {
    return c.json({ error: 'name is required' }, 400);
  }

  if (!body.trigger_type || !['schedule', 'threshold', 'manual', 'immediate'].includes(body.trigger_type)) {
    return c.json({
      error: 'Invalid trigger_type',
      details: { valid_types: ['schedule', 'threshold', 'manual', 'immediate'] },
    }, 400);
  }

  if (!body.trigger_config || typeof body.trigger_config !== 'object') {
    return c.json({ error: 'trigger_config is required' }, 400);
  }

  // Validate optional fields
  if (body.settlement_rail && !['auto', 'ach', 'pix', 'spei', 'wire', 'usdc'].includes(body.settlement_rail)) {
    return c.json({
      error: 'Invalid settlement_rail',
      details: { valid_rails: ['auto', 'ach', 'pix', 'spei', 'wire', 'usdc'] },
    }, 400);
  }

  if (body.settlement_priority && !['standard', 'expedited'].includes(body.settlement_priority)) {
    return c.json({
      error: 'Invalid settlement_priority',
      details: { valid_priorities: ['standard', 'expedited'] },
    }, 400);
  }

  const supabase = createClient();
  const { data, error } = await createSettlementRule(supabase, {
    tenant_id: ctx.tenantId,
    wallet_id: body.wallet_id,
    name: body.name,
    description: body.description,
    trigger_type: body.trigger_type as TriggerType,
    trigger_config: body.trigger_config,
    settlement_rail: body.settlement_rail as SettlementRail,
    settlement_priority: body.settlement_priority as SettlementPriority,
    minimum_amount: body.minimum_amount,
    minimum_currency: body.minimum_currency,
    maximum_amount: body.maximum_amount,
    maximum_currency: body.maximum_currency,
    enabled: body.enabled,
    priority: body.priority,
    metadata: body.metadata,
  });

  if (error) {
    if (error.includes('already exists')) {
      return c.json({ error }, 409);
    }
    return c.json({ error }, 400);
  }

  return c.json(data, 201);
});

/**
 * PATCH /v1/settlement-rules/:id
 * Update a settlement rule
 */
app.patch('/:id', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const ruleId = c.req.param('id');
  const body = await c.req.json();

  // Validate optional fields if provided
  if (body.settlement_rail && !['auto', 'ach', 'pix', 'spei', 'wire', 'usdc'].includes(body.settlement_rail)) {
    return c.json({
      error: 'Invalid settlement_rail',
      details: { valid_rails: ['auto', 'ach', 'pix', 'spei', 'wire', 'usdc'] },
    }, 400);
  }

  if (body.settlement_priority && !['standard', 'expedited'].includes(body.settlement_priority)) {
    return c.json({
      error: 'Invalid settlement_priority',
      details: { valid_priorities: ['standard', 'expedited'] },
    }, 400);
  }

  const supabase = createClient();
  const { data, error } = await updateSettlementRule(supabase, ctx.tenantId, ruleId, body);

  if (error) {
    if (error === 'Rule not found') {
      return c.json({ error }, 404);
    }
    return c.json({ error }, 400);
  }

  return c.json(data);
});

/**
 * DELETE /v1/settlement-rules/:id
 * Delete a settlement rule
 */
app.delete('/:id', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const ruleId = c.req.param('id');
  const supabase = createClient();
  const { success, error } = await deleteSettlementRule(supabase, ctx.tenantId, ruleId);

  if (error) {
    return c.json({ error }, 500);
  }

  return c.json({ success });
});

/**
 * GET /v1/settlement-rules/:id/executions
 * Get execution history for a rule
 */
app.get('/:id/executions', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const ruleId = c.req.param('id');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const supabase = createClient();
  const { data, total, error } = await getRuleExecutions(supabase, ctx.tenantId, {
    rule_id: ruleId,
    status: status || undefined,
    limit,
    offset,
  });

  if (error) {
    return c.json({ error }, 500);
  }

  return c.json({
    data,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + data.length < total,
    },
  });
});

/**
 * GET /v1/settlement-rules/executions/all
 * Get all execution history for the organization
 */
app.get('/executions/all', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const supabase = createClient();
  const { data, total, error } = await getRuleExecutions(supabase, ctx.tenantId, {
    status: status || undefined,
    limit,
    offset,
  });

  if (error) {
    return c.json({ error }, 500);
  }

  return c.json({
    data,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + data.length < total,
    },
  });
});

/**
 * POST /v1/settlement-rules/manual-withdrawal
 * Request a manual withdrawal/settlement
 */
app.post('/manual-withdrawal', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();

  // Validate required fields
  if (!body.wallet_id) {
    return c.json({ error: 'wallet_id is required' }, 400);
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return c.json({ error: 'amount must be a positive number' }, 400);
  }

  if (!body.currency || typeof body.currency !== 'string') {
    return c.json({ error: 'currency is required' }, 400);
  }

  const supabase = createClient();
  const result = await requestManualSettlement(
    supabase,
    ctx.tenantId,
    body.wallet_id,
    body.amount,
    body.currency
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    success: true,
    execution_id: result.execution_id,
    settlement_id: result.settlement_id,
    amount: result.amount,
    currency: result.currency,
    rail: result.rail,
  });
});

export default app;
