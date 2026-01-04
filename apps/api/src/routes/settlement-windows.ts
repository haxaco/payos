/**
 * Settlement Windows API
 * 
 * Story 27.4: Settlement Windows & Cut-off Times
 * 
 * Endpoints for managing settlement window configuration,
 * viewing schedules, and managing the settlement queue.
 * 
 * @module routes/settlement-windows
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { settlementWindowsService, SettlementFrequency } from '../services/settlement-windows.js';

const app = new Hono();

// Apply auth middleware
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const windowConfigSchema = z.object({
  frequency: z.enum(['realtime', 'hourly', '4_per_day', 'daily', 'custom']).optional(),
  scheduledTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  cutoffHour: z.number().min(0).max(23).optional(),
  cutoffMinute: z.number().min(0).max(59).optional(),
  timezone: z.string().optional(),
  minBatchAmount: z.number().min(0).optional(),
  maxBatchSize: z.number().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

const queueTransferSchema = z.object({
  transferId: z.string().uuid(),
  rail: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  priority: z.enum(['normal', 'high', 'urgent']).optional(),
  metadata: z.record(z.any()).optional(),
});

const emergencySettlementSchema = z.object({
  transferId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const holidaySchema = z.object({
  countryCode: z.string().length(2),
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  affectedRails: z.array(z.string()).optional(),
  isFullDay: z.boolean().optional(),
  closedFrom: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  closedUntil: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  year: z.number().optional(),
});

// ============================================
// STATIC ROUTES FIRST (before parameterized routes)
// ============================================

/**
 * GET /v1/settlement-windows
 * List all settlement window configurations
 */
app.get('/', async (c) => {
  try {
    const ctx = c.get('ctx');
    const configs = await settlementWindowsService.getAllWindowConfigs(ctx.tenantId);

    return c.json({ data: configs });
  } catch (error) {
    console.error('[SettlementWindows] List error:', error);
    return c.json({ error: 'Failed to fetch window configurations' }, 500);
  }
});

/**
 * GET /v1/settlement-windows/schedule
 * Get settlement schedule for all rails
 */
app.get('/schedule', async (c) => {
  try {
    const ctx = c.get('ctx');
    
    const rails = ['pix', 'spei', 'wire', 'circle_usdc', 'base_chain'];
    const schedules = await Promise.all(
      rails.map(rail => settlementWindowsService.getNextWindow(ctx.tenantId, rail))
    );

    return c.json({
      data: {
        timestamp: new Date().toISOString(),
        rails: schedules,
      },
    });
  } catch (error) {
    console.error('[SettlementWindows] Schedule error:', error);
    return c.json({ error: 'Failed to fetch schedule' }, 500);
  }
});

/**
 * GET /v1/settlement-windows/queue
 * List queued transfers
 */
app.get('/queue', async (c) => {
  try {
    const ctx = c.get('ctx');
    const rail = c.req.query('rail');
    const status = c.req.query('status') || 'queued';

    const queuedTransfers = await settlementWindowsService.getQueuedTransfers(
      ctx.tenantId,
      rail,
      status
    );

    return c.json({
      data: queuedTransfers,
      pagination: {
        total: queuedTransfers.length,
      },
    });
  } catch (error) {
    console.error('[SettlementWindows] Queue list error:', error);
    return c.json({ error: 'Failed to fetch queue' }, 500);
  }
});

/**
 * POST /v1/settlement-windows/queue
 * Queue a transfer for settlement
 */
app.post('/queue', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    const validated = queueTransferSchema.parse(body);

    const queuedTransfer = await settlementWindowsService.queueTransfer(
      ctx.tenantId,
      validated.transferId,
      validated.rail,
      validated.amount,
      validated.currency,
      validated.priority,
      validated.metadata
    );

    return c.json({
      data: queuedTransfer,
      message: 'Transfer queued for settlement',
    }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[SettlementWindows] Queue error:', error);
    return c.json({ error: 'Failed to queue transfer' }, 500);
  }
});

/**
 * POST /v1/settlement-windows/emergency
 * Process an emergency settlement outside normal windows
 */
app.post('/emergency', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    const validated = emergencySettlementSchema.parse(body);

    const result = await settlementWindowsService.processEmergencySettlement(
      ctx.tenantId,
      validated.transferId,
      validated.reason
    );

    return c.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[SettlementWindows] Emergency settlement error:', error);
    return c.json({ error: 'Failed to process emergency settlement' }, 500);
  }
});

/**
 * GET /v1/settlement-windows/holidays
 * List holidays for a country
 */
app.get('/holidays', async (c) => {
  try {
    const countryCode = c.req.query('country') || 'BR';
    const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());
    
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const holidays = await settlementWindowsService.getHolidays(
      countryCode,
      startDate,
      endDate
    );

    return c.json({
      data: holidays,
      meta: {
        countryCode,
        year,
      },
    });
  } catch (error) {
    console.error('[SettlementWindows] Holidays error:', error);
    return c.json({ error: 'Failed to fetch holidays' }, 500);
  }
});

/**
 * POST /v1/settlement-windows/holidays
 * Add a custom holiday (admin only)
 */
app.post('/holidays', async (c) => {
  try {
    const body = await c.req.json();
    const validated = holidaySchema.parse(body);

    const holiday = await settlementWindowsService.addHoliday({
      countryCode: validated.countryCode,
      holidayDate: validated.holidayDate,
      name: validated.name,
      description: validated.description,
      affectedRails: validated.affectedRails || [],
      isFullDay: validated.isFullDay !== false,
      closedFrom: validated.closedFrom,
      closedUntil: validated.closedUntil,
      year: validated.year,
    });

    return c.json({
      data: holiday,
      message: 'Holiday added successfully',
    }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[SettlementWindows] Add holiday error:', error);
    return c.json({ error: 'Failed to add holiday' }, 500);
  }
});

/**
 * GET /v1/settlement-windows/holidays/check
 * Check if a specific date is a holiday
 */
app.get('/holidays/check', async (c) => {
  try {
    const countryCode = c.req.query('country');
    const dateStr = c.req.query('date');
    const rail = c.req.query('rail');

    if (!countryCode || !dateStr) {
      return c.json({ error: 'country and date query parameters are required' }, 400);
    }

    const date = new Date(dateStr);
    const holiday = await settlementWindowsService.getHoliday(countryCode, date, rail);

    return c.json({
      data: {
        date: dateStr,
        countryCode,
        rail: rail || 'all',
        isHoliday: holiday !== null,
        holiday,
      },
    });
  } catch (error) {
    console.error('[SettlementWindows] Holiday check error:', error);
    return c.json({ error: 'Failed to check holiday' }, 500);
  }
});

/**
 * GET /v1/settlement-windows/executions
 * List recent settlement executions
 */
app.get('/executions', async (c) => {
  try {
    const ctx = c.get('ctx');
    const rail = c.req.query('rail');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const executions = await settlementWindowsService.getExecutions(
      ctx.tenantId,
      rail,
      limit
    );

    return c.json({ data: executions });
  } catch (error) {
    console.error('[SettlementWindows] Executions error:', error);
    return c.json({ error: 'Failed to fetch executions' }, 500);
  }
});

/**
 * GET /v1/settlement-windows/dashboard
 * Get dashboard summary for settlement windows
 */
app.get('/dashboard', async (c) => {
  try {
    const ctx = c.get('ctx');

    // Get all window configurations
    const configs = await settlementWindowsService.getAllWindowConfigs(ctx.tenantId);

    // Get status for each rail
    const rails = ['pix', 'spei', 'wire', 'circle_usdc', 'base_chain'];
    const statuses = await Promise.all(
      rails.map(rail => settlementWindowsService.getNextWindow(ctx.tenantId, rail))
    );

    // Get recent executions
    const executions = await settlementWindowsService.getExecutions(ctx.tenantId, undefined, 10);

    // Calculate totals
    const totalQueued = statuses.reduce((sum, s) => sum + s.queuedCount, 0);
    const totalQueuedAmount = statuses.reduce((sum, s) => sum + s.queuedAmount, 0);
    const openWindows = statuses.filter(s => s.isOpen).length;
    const holidayRails = statuses.filter(s => s.isHoliday);

    return c.json({
      data: {
        summary: {
          totalQueued,
          totalQueuedAmount,
          openWindows,
          closedWindows: rails.length - openWindows,
          holidayRails: holidayRails.map(h => ({ rail: h.rail, holiday: h.holidayName })),
        },
        rails: statuses,
        configurations: configs,
        recentExecutions: executions,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[SettlementWindows] Dashboard error:', error);
    return c.json({ error: 'Failed to fetch dashboard data' }, 500);
  }
});

// ============================================
// PARAMETERIZED ROUTES LAST
// ============================================

/**
 * GET /v1/settlement-windows/:rail
 * Get settlement window configuration for a specific rail
 */
app.get('/:rail', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { rail } = c.req.param();

    const config = await settlementWindowsService.getWindowConfig(ctx.tenantId, rail);

    if (!config) {
      return c.json({ error: `No configuration found for rail: ${rail}` }, 404);
    }

    return c.json({ data: config });
  } catch (error) {
    console.error('[SettlementWindows] Get error:', error);
    return c.json({ error: 'Failed to fetch window configuration' }, 500);
  }
});

/**
 * PUT /v1/settlement-windows/:rail
 * Update settlement window configuration for a rail
 */
app.put('/:rail', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { rail } = c.req.param();
    const body = await c.req.json();
    const validated = windowConfigSchema.parse(body);

    const config = await settlementWindowsService.upsertWindowConfig(
      ctx.tenantId,
      rail,
      validated
    );

    return c.json({
      data: config,
      message: `Settlement window configuration updated for ${rail}`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error('[SettlementWindows] Update error:', error);
    return c.json({ error: 'Failed to update window configuration' }, 500);
  }
});

/**
 * GET /v1/settlement-windows/:rail/status
 * Get current status of a settlement window
 */
app.get('/:rail/status', async (c) => {
  try {
    const ctx = c.get('ctx');
    const { rail } = c.req.param();

    const windowInfo = await settlementWindowsService.getNextWindow(ctx.tenantId, rail);

    return c.json({ data: windowInfo });
  } catch (error) {
    console.error('[SettlementWindows] Status error:', error);
    return c.json({ error: 'Failed to fetch window status' }, 500);
  }
});

export default app;

