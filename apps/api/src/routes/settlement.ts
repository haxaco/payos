/**
 * Settlement Configuration API Routes
 * 
 * Allows tenants to view and configure their settlement fee structure.
 * Includes multi-protocol settlement routing (Epic 27, Story 27.1).
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { createSettlementService } from '../services/settlement.js';
import { createSettlementRouter, Protocol, SettlementRail } from '../services/settlement-router.js';

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
      throw new Error('Transfer not found');
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

// ============================================
// Settlement Router Endpoints (Epic 27, Story 27.1)
// ============================================

const routeSchema = z.object({
  transferId: z.string().uuid(),
  protocol: z.enum(['x402', 'ap2', 'acp', 'internal', 'cross_border']).optional(),
  amount: z.number().positive(),
  currency: z.string().default('USDC'),
  destinationCurrency: z.string().optional(),
  destinationCountry: z.string().length(2).optional(),
});

const settleSchema = routeSchema.extend({
  maxRetries: z.number().min(0).max(5).default(3),
});

/**
 * POST /v1/settlement/route
 * Get routing decision for a transfer without executing settlement
 */
app.post('/route', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();

    const request = routeSchema.parse(body);
    
    const supabase = createClient();
    const router = createSettlementRouter(supabase);

    const decision = await router.routeTransfer({
      transferId: request.transferId,
      tenantId: ctx.tenantId,
      protocol: (request.protocol || 'internal') as Protocol,
      amount: request.amount,
      currency: request.currency,
      destinationCurrency: request.destinationCurrency,
      destinationCountry: request.destinationCountry,
    });

    return c.json({
      data: {
        transferId: decision.transferId,
        protocol: decision.protocol,
        selectedRail: decision.selectedRail,
        route: {
          rail: decision.route.rail,
          estimatedTime: decision.route.estimatedTime,
          feePercentage: decision.route.feePercentage,
          feeFixed: decision.route.feeFixed,
        },
        alternativeRails: decision.alternativeRails,
        decisionTimeMs: decision.decisionTime,
        metadata: decision.metadata,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
      }, 400);
    }

    console.error('Error in POST /v1/settlement/route:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /v1/settlement/execute
 * Execute settlement for a transfer
 */
app.post('/execute', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();

    const request = settleSchema.parse(body);
    
    const supabase = createClient();
    const router = createSettlementRouter(supabase);

    const result = await router.settleTransfer({
      transferId: request.transferId,
      tenantId: ctx.tenantId,
      protocol: (request.protocol || 'internal') as Protocol,
      amount: request.amount,
      currency: request.currency,
      destinationCurrency: request.destinationCurrency,
      destinationCountry: request.destinationCountry,
      maxRetries: request.maxRetries,
    });

    if (!result.success) {
      return c.json({
        error: 'Settlement failed',
        data: result,
      }, result.error?.retryable ? 503 : 400);
    }

    return c.json({ data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
      }, 400);
    }

    console.error('Error in POST /v1/settlement/execute:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * POST /v1/settlement/batch
 * Execute settlement for multiple transfers
 */
app.post('/batch', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();

    const batchSchema = z.object({
      transfers: z.array(settleSchema).min(1).max(100),
    });

    const { transfers } = batchSchema.parse(body);
    
    const supabase = createClient();
    const router = createSettlementRouter(supabase);

    const results = await router.settleBatch(
      transfers.map(t => ({
        transferId: t.transferId,
        tenantId: ctx.tenantId,
        protocol: (t.protocol || 'internal') as Protocol,
        amount: t.amount,
        currency: t.currency,
        destinationCurrency: t.destinationCurrency,
        destinationCountry: t.destinationCountry,
        maxRetries: t.maxRetries,
      }))
    );

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return c.json({
      data: {
        total: results.length,
        succeeded: succeeded.length,
        failed: failed.length,
        results,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
      }, 400);
    }

    console.error('Error in POST /v1/settlement/batch:', error);
    return c.json({
      error: 'Internal server error',
      message: error.message,
    }, 500);
  }
});

/**
 * GET /v1/settlement/rails
 * Get available settlement rails and their configuration
 */
app.get('/rails', async (c) => {
  const rails = [
    {
      id: 'internal',
      name: 'Internal Ledger',
      description: 'Instant transfers within PayOS',
      estimatedTimeSeconds: 0,
      feePercentage: 0.05,
      feeFixed: 0,
      minAmount: 0.01,
      maxAmount: 1000000,
      currencies: ['USDC', 'USD'],
      countries: ['*'],
      status: 'active',
    },
    {
      id: 'circle_usdc',
      name: 'Circle USDC',
      description: 'Settlement via Circle Programmable Wallets',
      estimatedTimeSeconds: 30,
      feePercentage: 1.0,
      feeFixed: 0.10,
      minAmount: 1,
      maxAmount: 100000,
      currencies: ['USDC'],
      countries: ['US', 'EU', '*'],
      status: 'active',
    },
    {
      id: 'base_chain',
      name: 'Base L2',
      description: 'On-chain settlement via Base Layer 2',
      estimatedTimeSeconds: 60,
      feePercentage: 0.5,
      feeFixed: 0.05,
      minAmount: 0.10,
      maxAmount: 500000,
      currencies: ['USDC', 'ETH'],
      countries: ['*'],
      status: 'active',
    },
    {
      id: 'pix',
      name: 'Pix',
      description: 'Brazilian instant payment system',
      estimatedTimeSeconds: 10,
      feePercentage: 0.7,
      feeFixed: 0,
      minAmount: 1,
      maxAmount: 100000,
      currencies: ['BRL'],
      countries: ['BR'],
      status: 'active',
    },
    {
      id: 'spei',
      name: 'SPEI',
      description: 'Mexican interbank transfer system',
      estimatedTimeSeconds: 300,
      feePercentage: 0.8,
      feeFixed: 1.50,
      minAmount: 10,
      maxAmount: 500000,
      currencies: ['MXN'],
      countries: ['MX'],
      status: 'active',
    },
    {
      id: 'wire',
      name: 'Wire Transfer',
      description: 'International bank wire (fallback)',
      estimatedTimeSeconds: 86400,
      feePercentage: 1.5,
      feeFixed: 25,
      minAmount: 100,
      maxAmount: 10000000,
      currencies: ['USD', 'EUR', 'BRL', 'MXN'],
      countries: ['*'],
      status: 'active',
    },
  ];

  return c.json({ data: rails });
});

export default app;

