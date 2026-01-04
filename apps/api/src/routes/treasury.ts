/**
 * Treasury Routes
 * Story 27.7: Liquidity & Float Management Dashboard
 *
 * API endpoints for treasury management, float monitoring, alerts, and rebalancing.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { TreasuryService } from '../services/treasury.js';
import { ValidationError } from '../middleware/error.js';
import { logAudit } from '../utils/helpers.js';
import { createClient } from '../db/client.js';

const app = new Hono();
app.use('*', authMiddleware);

const treasuryService = new TreasuryService();
const supabase = createClient();

// ============================================
// Schemas
// ============================================

const accountUpdateSchema = z.object({
  minBalanceThreshold: z.number().min(0).optional(),
  targetBalance: z.number().min(0).optional(),
  maxBalance: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const accountCreateSchema = z.object({
  rail: z.string().min(1),
  currency: z.string().min(1),
  externalAccountId: z.string().optional(),
  accountName: z.string().optional(),
  minBalanceThreshold: z.number().min(0).optional(),
  targetBalance: z.number().min(0).optional(),
  maxBalance: z.number().min(0).optional(),
});

const transactionSchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(['inbound', 'outbound', 'rebalance_in', 'rebalance_out', 'fee', 'adjustment']),
  amount: z.number().positive(),
  currency: z.string().min(1),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  externalTxId: z.string().optional(),
  description: z.string().optional(),
});

// ============================================
// Dashboard Routes (Static - must come first)
// ============================================

/**
 * GET /v1/treasury/dashboard
 * Get comprehensive dashboard summary
 */
app.get('/dashboard', async (c) => {
  try {
    const ctx = c.get('ctx');
    const summary = await treasuryService.getDashboardSummary(ctx.tenantId);
    return c.json({ data: summary });
  } catch (error) {
    console.error('[Treasury] Dashboard error:', error);
    return c.json({ error: 'Failed to get dashboard summary' }, 500);
  }
});

/**
 * GET /v1/treasury/exposure
 * Get currency exposure breakdown
 */
app.get('/exposure', async (c) => {
  try {
    const ctx = c.get('ctx');
    const exposure = await treasuryService.getCurrencyExposure(ctx.tenantId);
    return c.json({ data: exposure });
  } catch (error) {
    console.error('[Treasury] Exposure error:', error);
    return c.json({ error: 'Failed to get currency exposure' }, 500);
  }
});

/**
 * GET /v1/treasury/runway
 * Get float runway analysis
 */
app.get('/runway', async (c) => {
  try {
    const ctx = c.get('ctx');
    const runway = await treasuryService.getFloatRunway(ctx.tenantId);
    return c.json({ data: runway });
  } catch (error) {
    console.error('[Treasury] Runway error:', error);
    return c.json({ error: 'Failed to get float runway' }, 500);
  }
});

/**
 * GET /v1/treasury/velocity
 * Get settlement velocity metrics
 */
app.get('/velocity', async (c) => {
  try {
    const ctx = c.get('ctx');
    const velocity = await treasuryService.getSettlementVelocity(ctx.tenantId);
    return c.json({ data: velocity });
  } catch (error) {
    console.error('[Treasury] Velocity error:', error);
    return c.json({ error: 'Failed to get settlement velocity' }, 500);
  }
});

/**
 * GET /v1/treasury/history
 * Get historical balance data for charts
 */
app.get('/history', async (c) => {
  try {
    const ctx = c.get('ctx');
    const rail = c.req.query('rail');
    const currency = c.req.query('currency');
    const days = parseInt(c.req.query('days') || '30');

    const history = await treasuryService.getBalanceHistory(ctx.tenantId, { rail, currency, days });
    return c.json({ data: history });
  } catch (error) {
    console.error('[Treasury] History error:', error);
    return c.json({ error: 'Failed to get balance history' }, 500);
  }
});

/**
 * GET /v1/treasury/partners
 * Get float allocation by partner (white-label)
 */
app.get('/partners', async (c) => {
  try {
    const ctx = c.get('ctx');
    const allocations = await treasuryService.getFloatAllocationByPartner(ctx.tenantId);
    return c.json({ data: allocations });
  } catch (error) {
    console.error('[Treasury] Partners error:', error);
    return c.json({ error: 'Failed to get partner allocations' }, 500);
  }
});

/**
 * POST /v1/treasury/sync
 * Trigger balance sync from external rails
 */
app.post('/sync', async (c) => {
  try {
    const ctx = c.get('ctx');
    const result = await treasuryService.syncBalances(ctx.tenantId);

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.sync',
      entityType: 'treasury_accounts',
      entityId: null,
      description: `Synced ${result.synced} treasury accounts`,
      metadata: result,
    });

    return c.json({ data: result });
  } catch (error) {
    console.error('[Treasury] Sync error:', error);
    return c.json({ error: 'Failed to sync balances' }, 500);
  }
});

/**
 * POST /v1/treasury/snapshot
 * Take a manual balance snapshot
 */
app.post('/snapshot', async (c) => {
  try {
    const ctx = c.get('ctx');
    const snapshotCount = await treasuryService.takeSnapshot(ctx.tenantId, 'manual');

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.snapshot',
      entityType: 'treasury_balance_history',
      entityId: null,
      description: `Created ${snapshotCount} balance snapshots`,
      metadata: { snapshotCount },
    });

    return c.json({ data: { snapshotCount }, message: `Created ${snapshotCount} snapshots` });
  } catch (error) {
    console.error('[Treasury] Snapshot error:', error);
    return c.json({ error: 'Failed to take snapshot' }, 500);
  }
});

// ============================================
// Account Routes
// ============================================

/**
 * GET /v1/treasury/accounts
 * List all treasury accounts
 */
app.get('/accounts', async (c) => {
  try {
    const ctx = c.get('ctx');
    const accounts = await treasuryService.getAccounts(ctx.tenantId);
    return c.json({ data: accounts });
  } catch (error) {
    console.error('[Treasury] Accounts list error:', error);
    return c.json({ error: 'Failed to list accounts' }, 500);
  }
});

/**
 * POST /v1/treasury/accounts
 * Create a new treasury account
 */
app.post('/accounts', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    const parsed = accountCreateSchema.parse(body);

    const account = await treasuryService.getOrCreateAccount(
      ctx.tenantId,
      parsed.rail,
      parsed.currency,
      {
        externalAccountId: parsed.externalAccountId,
        accountName: parsed.accountName,
        minBalanceThreshold: parsed.minBalanceThreshold,
        targetBalance: parsed.targetBalance,
        maxBalance: parsed.maxBalance,
      }
    );

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.account.created',
      entityType: 'treasury_accounts',
      entityId: account.id,
      description: `Created treasury account for ${parsed.rail}/${parsed.currency}`,
      metadata: { rail: parsed.rail, currency: parsed.currency },
    });

    return c.json({ data: account }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors[0].message);
    }
    console.error('[Treasury] Account create error:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

/**
 * PATCH /v1/treasury/accounts/:id
 * Update treasury account settings
 */
app.patch('/accounts/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const accountId = c.req.param('id');
    const body = await c.req.json();
    const parsed = accountUpdateSchema.parse(body);

    const account = await treasuryService.updateAccount(ctx.tenantId, accountId, parsed);

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.account.updated',
      entityType: 'treasury_accounts',
      entityId: accountId,
      description: `Updated treasury account settings`,
      metadata: parsed,
    });

    return c.json({ data: account });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors[0].message);
    }
    console.error('[Treasury] Account update error:', error);
    return c.json({ error: 'Failed to update account' }, 500);
  }
});

// ============================================
// Alert Routes
// ============================================

/**
 * GET /v1/treasury/alerts
 * List alerts
 */
app.get('/alerts', async (c) => {
  try {
    const ctx = c.get('ctx');
    const status = c.req.query('status') as 'open' | 'acknowledged' | 'resolved' | undefined;
    const severity = c.req.query('severity') as 'info' | 'warning' | 'critical' | undefined;
    const limit = parseInt(c.req.query('limit') || '100');

    const alerts = await treasuryService.getAlerts(ctx.tenantId, { status, severity, limit });
    return c.json({ data: alerts });
  } catch (error) {
    console.error('[Treasury] Alerts error:', error);
    return c.json({ error: 'Failed to get alerts' }, 500);
  }
});

/**
 * POST /v1/treasury/alerts/check
 * Manually trigger alert check
 */
app.post('/alerts/check', async (c) => {
  try {
    const ctx = c.get('ctx');
    const newAlerts = await treasuryService.checkAndGenerateAlerts(ctx.tenantId);

    return c.json({
      data: newAlerts,
      message: `Generated ${newAlerts.length} new alerts`,
    });
  } catch (error) {
    console.error('[Treasury] Alert check error:', error);
    return c.json({ error: 'Failed to check alerts' }, 500);
  }
});

/**
 * POST /v1/treasury/alerts/:id/acknowledge
 * Acknowledge an alert
 */
app.post('/alerts/:id/acknowledge', async (c) => {
  try {
    const ctx = c.get('ctx');
    const alertId = c.req.param('id');
    const userId = ctx.actorId || ctx.apiKeyId || '';

    const alert = await treasuryService.acknowledgeAlert(ctx.tenantId, alertId, userId);

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.alert.acknowledged',
      entityType: 'treasury_alerts',
      entityId: alertId,
      description: `Acknowledged alert: ${alert.title}`,
      metadata: { alertType: alert.alertType, severity: alert.severity },
    });

    return c.json({ data: alert });
  } catch (error) {
    console.error('[Treasury] Alert acknowledge error:', error);
    return c.json({ error: 'Failed to acknowledge alert' }, 500);
  }
});

/**
 * POST /v1/treasury/alerts/:id/resolve
 * Resolve an alert
 */
app.post('/alerts/:id/resolve', async (c) => {
  try {
    const ctx = c.get('ctx');
    const alertId = c.req.param('id');
    const userId = ctx.actorId || ctx.apiKeyId || '';

    const alert = await treasuryService.resolveAlert(ctx.tenantId, alertId, userId);

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.alert.resolved',
      entityType: 'treasury_alerts',
      entityId: alertId,
      description: `Resolved alert: ${alert.title}`,
      metadata: { alertType: alert.alertType, severity: alert.severity },
    });

    return c.json({ data: alert });
  } catch (error) {
    console.error('[Treasury] Alert resolve error:', error);
    return c.json({ error: 'Failed to resolve alert' }, 500);
  }
});

// ============================================
// Rebalancing Routes
// ============================================

/**
 * GET /v1/treasury/recommendations
 * Get rebalancing recommendations
 */
app.get('/recommendations', async (c) => {
  try {
    const ctx = c.get('ctx');
    const status = c.req.query('status') as 'pending' | 'approved' | 'executed' | 'rejected' | 'expired' | undefined;
    const limit = parseInt(c.req.query('limit') || '50');

    const recommendations = await treasuryService.getRecommendations(ctx.tenantId, { status, limit });
    return c.json({ data: recommendations });
  } catch (error) {
    console.error('[Treasury] Recommendations error:', error);
    return c.json({ error: 'Failed to get recommendations' }, 500);
  }
});

/**
 * POST /v1/treasury/recommendations/generate
 * Generate new rebalancing recommendations
 */
app.post('/recommendations/generate', async (c) => {
  try {
    const ctx = c.get('ctx');
    const recommendations = await treasuryService.generateRebalanceRecommendations(ctx.tenantId);

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.recommendations.generated',
      entityType: 'treasury_rebalance_recommendations',
      entityId: null,
      description: `Generated ${recommendations.length} rebalancing recommendations`,
      metadata: { count: recommendations.length },
    });

    return c.json({
      data: recommendations,
      message: `Generated ${recommendations.length} recommendations`,
    });
  } catch (error) {
    console.error('[Treasury] Generate recommendations error:', error);
    return c.json({ error: 'Failed to generate recommendations' }, 500);
  }
});

/**
 * POST /v1/treasury/recommendations/:id/approve
 * Approve a rebalancing recommendation
 */
app.post('/recommendations/:id/approve', async (c) => {
  try {
    const ctx = c.get('ctx');
    const recommendationId = c.req.param('id');

    const recommendation = await treasuryService.approveRecommendation(ctx.tenantId, recommendationId);

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.recommendation.approved',
      entityType: 'treasury_rebalance_recommendations',
      entityId: recommendationId,
      description: `Approved rebalancing: ${recommendation.recommendedAmount} ${recommendation.sourceCurrency} from ${recommendation.sourceRail} to ${recommendation.targetRail}`,
      metadata: { recommendation },
    });

    return c.json({ data: recommendation });
  } catch (error) {
    console.error('[Treasury] Approve recommendation error:', error);
    return c.json({ error: 'Failed to approve recommendation' }, 500);
  }
});

/**
 * POST /v1/treasury/recommendations/:id/reject
 * Reject a rebalancing recommendation
 */
app.post('/recommendations/:id/reject', async (c) => {
  try {
    const ctx = c.get('ctx');
    const recommendationId = c.req.param('id');

    const recommendation = await treasuryService.rejectRecommendation(ctx.tenantId, recommendationId);

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.recommendation.rejected',
      entityType: 'treasury_rebalance_recommendations',
      entityId: recommendationId,
      description: `Rejected rebalancing recommendation`,
      metadata: { recommendationId },
    });

    return c.json({ data: recommendation });
  } catch (error) {
    console.error('[Treasury] Reject recommendation error:', error);
    return c.json({ error: 'Failed to reject recommendation' }, 500);
  }
});

// ============================================
// Transaction Routes
// ============================================

/**
 * GET /v1/treasury/transactions
 * List treasury transactions
 */
app.get('/transactions', async (c) => {
  try {
    const ctx = c.get('ctx');
    const accountId = c.req.query('accountId');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const transactions = await treasuryService.getTransactions(ctx.tenantId, { accountId, limit, offset });
    return c.json({ data: transactions });
  } catch (error) {
    console.error('[Treasury] Transactions error:', error);
    return c.json({ error: 'Failed to get transactions' }, 500);
  }
});

/**
 * POST /v1/treasury/transactions
 * Record a manual treasury transaction
 */
app.post('/transactions', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    const parsed = transactionSchema.parse(body);

    const transaction = await treasuryService.recordTransaction(ctx.tenantId, parsed.accountId, {
      type: parsed.type,
      amount: parsed.amount,
      currency: parsed.currency,
      referenceType: parsed.referenceType,
      referenceId: parsed.referenceId,
      externalTxId: parsed.externalTxId,
      description: parsed.description,
    });

    await logAudit(supabase, {
      tenantId: ctx.tenantId,
      actorType: ctx.actorType,
      actorId: ctx.actorId || null,
      actorName: ctx.actorName || 'Unknown',
      action: 'treasury.transaction.created',
      entityType: 'treasury_transactions',
      entityId: transaction.id,
      description: `Recorded ${parsed.type} transaction: ${parsed.amount} ${parsed.currency}`,
      metadata: parsed,
    });

    return c.json({ data: transaction }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors[0].message);
    }
    console.error('[Treasury] Transaction create error:', error);
    return c.json({ error: 'Failed to create transaction' }, 500);
  }
});

export default app;

