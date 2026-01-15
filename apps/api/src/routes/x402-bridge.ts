/**
 * x402 → Fiat Bridge Routes
 * Story 40.10: x402 → Circle Settlement Bridge
 * 
 * Endpoints for settling x402 USDC payments to fiat via Pix/SPEI.
 * This is the critical path: x402 payment → USDC → Circle → Fiat
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { createX402ToCircleBridge, BridgeError } from '../services/bridge/x402-to-circle.js';
import { getWalletAddress, getUsdcBalance } from '../config/blockchain.js';

const app = new Hono();

// Apply auth middleware
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const pixSettlementSchema = z.object({
  x402TransferId: z.string().uuid(),
  amount: z.string().regex(/^\d+\.?\d*$/, 'Invalid amount format'),
  pixKey: z.string().min(1),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'evp']),
  recipientName: z.string().min(1).max(100),
  recipientTaxId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const speiSettlementSchema = z.object({
  x402TransferId: z.string().uuid(),
  amount: z.string().regex(/^\d+\.?\d*$/, 'Invalid amount format'),
  clabe: z.string().length(18),
  recipientName: z.string().min(1).max(100),
  recipientTaxId: z.string().optional(),
  bankName: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const quoteSchema = z.object({
  amount: z.string().regex(/^\d+\.?\d*$/, 'Invalid amount format'),
  currency: z.enum(['BRL', 'MXN']),
});

// ============================================
// Routes
// ============================================

/**
 * GET /v1/x402/bridge/quote
 * Get a quote for USDC → fiat conversion
 */
app.get('/quote', async (c) => {
  try {
    const ctx = c.get('ctx');
    const amount = c.req.query('amount');
    const currency = c.req.query('currency');

    if (!amount || !currency) {
      return c.json({
        error: 'Missing required parameters',
        required: ['amount', 'currency'],
        code: 'MISSING_PARAMS',
      }, 400);
    }

    const parsed = quoteSchema.safeParse({ amount, currency });
    if (!parsed.success) {
      return c.json({
        error: 'Invalid parameters',
        details: parsed.error.errors,
        code: 'VALIDATION_ERROR',
      }, 400);
    }

    const bridge = createX402ToCircleBridge(ctx.tenantId);
    const quote = bridge.getQuote(parsed.data.amount, parsed.data.currency);

    return c.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('Error in GET /v1/x402/bridge/quote:', error);
    return c.json({
      error: 'Failed to generate quote',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});

/**
 * GET /v1/x402/bridge/wallet
 * Get the PayOS USDC wallet address for receiving x402 payments
 */
app.get('/wallet', async (c) => {
  try {
    const address = getWalletAddress();
    const balance = await getUsdcBalance(address);

    return c.json({
      success: true,
      data: {
        address,
        balance: balance,
        currency: 'USDC',
        chain: 'Base Sepolia',
        chainId: 84532,
        note: 'Send x402 USDC payments to this address for fiat settlement',
      },
    });
  } catch (error: any) {
    return c.json({
      error: 'Wallet not configured',
      message: error.message,
      code: 'WALLET_NOT_CONFIGURED',
    }, 500);
  }
});

/**
 * POST /v1/x402/bridge/settle/pix
 * Settle an x402 USDC payment to Brazilian Pix
 * 
 * Flow:
 * 1. Receive x402 transfer ID
 * 2. Look up the transfer amount
 * 3. Calculate BRL amount with FX
 * 4. Create Circle Pix payout
 * 5. Return settlement status
 */
app.post('/settle/pix', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();

    // Validate request
    const parsed = pixSettlementSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.errors,
        code: 'VALIDATION_ERROR',
      }, 400);
    }

    const bridge = createX402ToCircleBridge(ctx.tenantId);

    const settlement = await bridge.settleX402ToPix({
      rail: 'pix',
      x402TransferId: parsed.data.x402TransferId,
      amount: parsed.data.amount,
      pixKey: parsed.data.pixKey,
      pixKeyType: parsed.data.pixKeyType,
      recipientName: parsed.data.recipientName,
      recipientTaxId: parsed.data.recipientTaxId,
      metadata: parsed.data.metadata,
    });

    return c.json({
      success: true,
      message: 'Pix settlement initiated',
      data: settlement,
    }, 201);

  } catch (error) {
    if (error instanceof BridgeError) {
      return c.json({
        error: error.message,
        code: error.code,
        details: error.details,
      }, 400);
    }

    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
        code: 'VALIDATION_ERROR',
      }, 400);
    }

    console.error('Error in POST /v1/x402/bridge/settle/pix:', error);
    return c.json({
      error: 'Settlement failed',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});

/**
 * POST /v1/x402/bridge/settle/spei
 * Settle an x402 USDC payment to Mexican SPEI
 */
app.post('/settle/spei', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();

    // Validate request
    const parsed = speiSettlementSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({
        error: 'Validation failed',
        details: parsed.error.errors,
        code: 'VALIDATION_ERROR',
      }, 400);
    }

    const bridge = createX402ToCircleBridge(ctx.tenantId);

    const settlement = await bridge.settleX402ToSpei({
      rail: 'spei',
      x402TransferId: parsed.data.x402TransferId,
      amount: parsed.data.amount,
      clabe: parsed.data.clabe,
      recipientName: parsed.data.recipientName,
      recipientTaxId: parsed.data.recipientTaxId,
      bankName: parsed.data.bankName,
      metadata: parsed.data.metadata,
    });

    return c.json({
      success: true,
      message: 'SPEI settlement initiated',
      data: settlement,
    }, 201);

  } catch (error) {
    if (error instanceof BridgeError) {
      return c.json({
        error: error.message,
        code: error.code,
        details: error.details,
      }, 400);
    }

    console.error('Error in POST /v1/x402/bridge/settle/spei:', error);
    return c.json({
      error: 'Settlement failed',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});

/**
 * GET /v1/x402/bridge/settlement/:id
 * Get settlement status by ID
 */
app.get('/settlement/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const settlementId = c.req.param('id');

    const bridge = createX402ToCircleBridge(ctx.tenantId);
    const settlement = await bridge.getSettlement(settlementId);

    if (!settlement) {
      return c.json({
        error: 'Settlement not found',
        code: 'NOT_FOUND',
      }, 404);
    }

    return c.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error('Error in GET /v1/x402/bridge/settlement/:id:', error);
    return c.json({
      error: 'Failed to fetch settlement',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});

/**
 * GET /v1/x402/bridge/settlement/by-transfer/:transferId
 * Get settlement status by x402 transfer ID
 */
app.get('/settlement/by-transfer/:transferId', async (c) => {
  try {
    const ctx = c.get('ctx');
    const transferId = c.req.param('transferId');

    const bridge = createX402ToCircleBridge(ctx.tenantId);
    const settlement = await bridge.getSettlementByTransfer(transferId);

    if (!settlement) {
      return c.json({
        error: 'Settlement not found for this transfer',
        code: 'NOT_FOUND',
      }, 404);
    }

    return c.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error('Error in GET /v1/x402/bridge/settlement/by-transfer/:transferId:', error);
    return c.json({
      error: 'Failed to fetch settlement',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});

/**
 * GET /v1/x402/bridge/health
 * Health check for bridge services
 */
app.get('/health', async (c) => {
  try {
    const walletAddress = getWalletAddress();
    const balance = await getUsdcBalance(walletAddress);

    return c.json({
      healthy: true,
      services: {
        blockchain: {
          status: 'connected',
          wallet: walletAddress,
          usdcBalance: balance,
        },
        bridge: {
          status: 'ready',
          supportedRails: ['pix', 'spei'],
        },
      },
    });
  } catch (error: any) {
    return c.json({
      healthy: false,
      error: error.message,
    }, 500);
  }
});

export default app;



