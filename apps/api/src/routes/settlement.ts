/**
 * Settlement Configuration API Routes
 * 
 * Allows tenants to view and configure their settlement fee structure.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { createSettlementService } from '../services/settlement.js';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const updateConfigSchema = z.object({
  x402FeeType: z.enum(['percentage', 'fixed', 'hybrid']).optional(),
  x402FeePercentage: z.number().min(0).max(1).optional(), // 0 to 1 (e.g., 0.029 = 2.9%)
  x402FeeFixed: z.number().min(0).optional(),
  x402FeeCurrency: z.enum(['USDC', 'EURC']).optional(),
  autoSettlementEnabled: z.boolean().optional(),
  settlementSchedule: z.enum(['immediate', 'daily', 'weekly']).optional(),
});

// ============================================
// Routes
// ============================================

/**
 * GET /v1/settlement/config
 * Get current settlement configuration for tenant
 */
app.get('/config', async (c) => {
  try {
    const ctx = c.get('ctx');
    const supabase = createClient();
    const settlementService = createSettlementService(supabase);

    const config = await settlementService.getConfig(ctx.tenantId);

    if (!config) {
      // Return defaults if no config exists
      return c.json({
        data: {
          tenantId: ctx.tenantId,
          x402FeeType: 'percentage',
          x402FeePercentage: 0.029, // 2.9%
          x402FeeFixed: 0,
          x402FeeCurrency: 'USDC',
          autoSettlementEnabled: true,
          settlementSchedule: 'immediate',
          isDefault: true,
        },
      });
    }

    return c.json({
      data: {
        ...config,
        isDefault: false,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /v1/settlement/config:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * PATCH /v1/settlement/config
 * Update settlement configuration for tenant
 */
app.patch('/config', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();

    // Validate request
    const updates = updateConfigSchema.parse(body);

    const supabase = createClient();
    const settlementService = createSettlementService(supabase);

    // Update configuration
    const config = await settlementService.updateConfig(ctx.tenantId, updates);

    return c.json({
      success: true,
      message: 'Settlement configuration updated',
      data: config,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
      }, 400);
    }

    console.error('Error in PATCH /v1/settlement/config:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /v1/settlement/preview
 * Preview fee calculation for a given amount
 */
app.post('/preview', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();

    const { amount, currency } = z.object({
      amount: z.number().positive(),
      currency: z.enum(['USDC', 'EURC']).default('USDC'),
    }).parse(body);

    const supabase = createClient();
    const settlementService = createSettlementService(supabase);

    // Calculate fee
    const feeCalc = await settlementService.calculateX402Fee(
      ctx.tenantId,
      amount,
      currency
    );

    return c.json({
      data: {
        grossAmount: feeCalc.grossAmount,
        feeAmount: feeCalc.feeAmount,
        netAmount: feeCalc.netAmount,
        currency: feeCalc.currency,
        feeType: feeCalc.feeType,
        breakdown: feeCalc.breakdown,
        effectiveFeePercentage: feeCalc.grossAmount > 0
          ? (feeCalc.feeAmount / feeCalc.grossAmount) * 100
          : 0,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
      }, 400);
    }

    console.error('Error in POST /v1/settlement/preview:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /v1/settlement/analytics
 * Get settlement analytics for tenant
 */
app.get('/analytics', async (c) => {
  try {
    const ctx = c.get('ctx');
    const query = c.req.query();

    const supabase = createClient();
    const settlementService = createSettlementService(supabase);

    const analytics = await settlementService.getSettlementAnalytics(ctx.tenantId, {
      startDate: query.startDate,
      endDate: query.endDate,
      type: query.type,
    });

    return c.json({ data: analytics });
  } catch (error: any) {
    console.error('Error in GET /v1/settlement/analytics:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /v1/settlement/status/:transferId
 * Get settlement status for a specific transfer
 */
app.get('/status/:transferId', async (c) => {
  try {
    const ctx = c.get('ctx');
    const transferId = c.req.param('transferId');

    const supabase = createClient();
    const settlementService = createSettlementService(supabase);

    const status = await settlementService.getSettlementStatus(transferId);

    if (!status) {
      return c.json({ error: 'Transfer not found' }, 404);
    }

    return c.json({ data: status });
  } catch (error: any) {
    console.error('Error in GET /v1/settlement/status/:transferId:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

export default app;

