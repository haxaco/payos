/**
 * Usage API Routes — Epic 65, Story 65.15
 *
 * Provides tenant-scoped usage data for billing, dashboards, and portal embedding.
 *
 * GET /v1/usage/summary     — Aggregated usage summary for a time period
 * GET /v1/usage/operations  — Paginated list of operation events
 * GET /v1/usage/requests    — API request count aggregations
 * GET /v1/usage/costs       — External cost breakdown
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { getPaginationParams, paginationResponse } from '../utils/helpers.js';

const router = new Hono();

// ============================================
// Helpers
// ============================================

function getDateRange(c: any): { start: string; end: string } {
  const now = new Date();
  const startParam = c.req.query('start');
  const endParam = c.req.query('end');

  const end = endParam || now.toISOString();
  const start = startParam || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // default 30 days

  return { start, end };
}

function requireUsageScope(c: any): boolean {
  const ctx = c.get('ctx');
  if (ctx.actorType === 'portal' && !ctx.portalScopes?.includes('usage:read')) {
    return false;
  }
  return true;
}

// ============================================
// GET /summary — Aggregated usage summary
// ============================================
router.get('/summary', async (c) => {
  if (!requireUsageScope(c)) {
    return c.json({ error: 'Insufficient portal token scopes' }, 403);
  }

  const ctx = c.get('ctx');
  const { start, end } = getDateRange(c);
  const supabase = createClient();

  // Aggregated totals from operation_events
  const { data: ops, error: opsError } = await (supabase
    .from('operation_events') as any)
    .select('category, operation, protocol, success, amount_usd, external_cost_usd')
    .eq('tenant_id', ctx.tenantId)
    .gte('time', start)
    .lte('time', end);

  if (opsError) {
    console.error('Usage summary query failed:', opsError);
    return c.json({ error: 'Failed to fetch usage summary' }, 500);
  }

  const events = ops || [];

  // Aggregate in memory
  const byCategory: Record<string, number> = {};
  const byProtocol: Record<string, number> = {};
  let totalCostUsd = 0;

  for (const ev of events) {
    byCategory[ev.category] = (byCategory[ev.category] || 0) + 1;
    if (ev.protocol) {
      byProtocol[ev.protocol] = (byProtocol[ev.protocol] || 0) + 1;
    }
    totalCostUsd += parseFloat(ev.external_cost_usd || '0');
  }

  // Request count from api_request_counts
  const { data: reqData } = await (supabase
    .from('api_request_counts') as any)
    .select('count')
    .eq('tenant_id', ctx.tenantId)
    .gte('minute_bucket', start)
    .lte('minute_bucket', end);

  const totalRequests = (reqData || []).reduce((sum: number, r: any) => sum + (r.count || 0), 0);

  return c.json({
    data: {
      period: { start, end },
      totalRequests,
      totalOperations: events.length,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      byCategory,
      byProtocol,
    },
  });
});

// ============================================
// GET /operations — Paginated operation events
// ============================================
router.get('/operations', async (c) => {
  if (!requireUsageScope(c)) {
    return c.json({ error: 'Insufficient portal token scopes' }, 403);
  }

  const ctx = c.get('ctx');
  const { start, end } = getDateRange(c);
  const { page, limit } = getPaginationParams(c);
  const category = c.req.query('category');
  const operation = c.req.query('operation');
  const protocol = c.req.query('protocol');
  const correlationId = c.req.query('correlation_id');
  const subject = c.req.query('subject');
  const success = c.req.query('success');
  const supabase = createClient();

  let query = (supabase.from('operation_events') as any)
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .gte('time', start)
    .lte('time', end)
    .order('time', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.eq('category', category);
  if (operation) query = query.eq('operation', operation);
  if (protocol) query = query.eq('protocol', protocol);
  if (correlationId) query = query.eq('correlation_id', correlationId);
  if (subject) {
    // Escape LIKE metacharacters to prevent pattern abuse
    const escaped = subject.replace(/[%_\\]/g, '\\$&');
    query = query.ilike('subject', `%${escaped}%`);
  }
  if (success === 'true') query = query.eq('success', true);
  if (success === 'false') query = query.eq('success', false);

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: 'Failed to fetch operations' }, 500);
  }

  return c.json({
    data: data || [],
    pagination: paginationResponse(page, limit, count || 0),
  });
});

// ============================================
// GET /audit-log — Tenant-scoped audit log entries.
//   Used by the dashboard Logs page to render "who did what, when"
//   alongside Operation Events. Filters by tenant. Returns newest-first.
// ============================================
router.get('/audit-log', async (c) => {
  const ctx = c.get('ctx');
  const { start, end } = getDateRange(c);
  const { page, limit } = getPaginationParams(c);
  const entityType = c.req.query('entity_type');
  const action = c.req.query('action');
  const supabase = createClient();

  let query = (supabase.from('audit_log') as any)
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (entityType) query = query.eq('entity_type', entityType);
  if (action) query = query.eq('action', action);

  const { data, error, count } = await query;
  if (error) {
    console.error('Audit log query failed:', error);
    return c.json({ error: 'Failed to fetch audit log' }, 500);
  }

  // Map snake_case to camelCase and project actor into a nested shape that
  // the UI already expects (actor.name / actor.id).
  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actor: {
      id: row.actor_id,
      type: row.actor_type,
      name: row.actor_name,
    },
    changes: row.changes || null,
    metadata: row.metadata || null,
  }));

  return c.json({
    data: mapped,
    pagination: paginationResponse(page, limit, count || 0),
  });
});

// ============================================
// GET /requests — API request count aggregations
// ============================================
router.get('/requests', async (c) => {
  if (!requireUsageScope(c)) {
    return c.json({ error: 'Insufficient portal token scopes' }, 403);
  }

  const ctx = c.get('ctx');
  const { start, end } = getDateRange(c);
  const groupBy = c.req.query('group_by') || 'path_template'; // path_template, method, actor_type, status_code
  const supabase = createClient();

  const { data, error } = await (supabase.from('api_request_counts') as any)
    .select('method, path_template, status_code, actor_type, count, total_duration_ms, minute_bucket')
    .eq('tenant_id', ctx.tenantId)
    .gte('minute_bucket', start)
    .lte('minute_bucket', end)
    .order('minute_bucket', { ascending: false })
    .limit(1000);

  if (error) {
    return c.json({ error: 'Failed to fetch request data' }, 500);
  }

  const rows = data || [];

  // Aggregate by requested dimension
  const aggregated: Record<string, { count: number; avgDurationMs: number }> = {};
  for (const row of rows) {
    const key = row[groupBy] || 'unknown';
    if (!aggregated[key]) {
      aggregated[key] = { count: 0, avgDurationMs: 0 };
    }
    aggregated[key].count += row.count;
    aggregated[key].avgDurationMs += row.total_duration_ms;
  }

  // Convert totalDuration to average
  for (const key in aggregated) {
    if (aggregated[key].count > 0) {
      aggregated[key].avgDurationMs = Math.round(aggregated[key].avgDurationMs / aggregated[key].count);
    }
  }

  return c.json({
    data: {
      period: { start, end },
      groupBy,
      aggregations: aggregated,
    },
  });
});

// ============================================
// GET /costs — External cost breakdown
// ============================================
router.get('/costs', async (c) => {
  if (!requireUsageScope(c)) {
    return c.json({ error: 'Insufficient portal token scopes' }, 403);
  }

  const ctx = c.get('ctx');
  const { start, end } = getDateRange(c);
  const supabase = createClient();

  const { data, error } = await (supabase.from('operation_events') as any)
    .select('category, operation, external_cost_usd, data')
    .eq('tenant_id', ctx.tenantId)
    .gte('time', start)
    .lte('time', end)
    .not('external_cost_usd', 'is', null);

  if (error) {
    return c.json({ error: 'Failed to fetch cost data' }, 500);
  }

  const events = data || [];

  // Aggregate costs by category and costKey
  const byCategory: Record<string, number> = {};
  const byCostKey: Record<string, number> = {};
  let totalCostUsd = 0;

  for (const ev of events) {
    const cost = parseFloat(ev.external_cost_usd || '0');
    totalCostUsd += cost;
    byCategory[ev.category] = (byCategory[ev.category] || 0) + cost;
    const costKey = ev.data?.costKey;
    if (costKey) {
      byCostKey[costKey] = (byCostKey[costKey] || 0) + cost;
    }
  }

  return c.json({
    data: {
      period: { start, end },
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      byCategory,
      byCostKey,
    },
  });
});

export default router;
