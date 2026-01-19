/**
 * UCP API Routes
 *
 * Authenticated endpoints for UCP settlement operations.
 *
 * @see Story 43.5: Handler Credential Flow
 * @see https://ucp.dev/specification/overview/
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';
import { ucpMiddleware, getUCPContext } from '../middleware/ucp.js';
import {
  acquireToken,
  getSettlementQuote,
  validateRecipient,
  getCorridors,
  executeSettlement,
  executeSettlementWithMandate,
  getSettlement,
  listSettlements,
} from '../services/ucp/index.js';
import type { UCPTokenRequest, UCPSettleRequest, UCPMandateSettleRequest } from '../services/ucp/types.js';

const router = new Hono();

// Apply UCP middleware to all routes
router.use('*', ucpMiddleware());

// =============================================================================
// Schemas
// =============================================================================

const pixRecipientSchema = z.object({
  type: z.literal('pix'),
  pix_key: z.string().min(1).max(77),
  pix_key_type: z.enum(['cpf', 'cnpj', 'email', 'phone', 'evp']),
  name: z.string().min(1).max(200),
  tax_id: z.string().optional(),
});

const speiRecipientSchema = z.object({
  type: z.literal('spei'),
  clabe: z.string().regex(/^[0-9]{18}$/),
  name: z.string().min(1).max(200),
  rfc: z.string().optional(),
});

const recipientSchema = z.discriminatedUnion('type', [pixRecipientSchema, speiRecipientSchema]);

const tokenRequestSchema = z.object({
  corridor: z.enum(['pix', 'spei']),
  amount: z.number().positive().max(100000),
  currency: z.enum(['USD', 'USDC']),
  recipient: recipientSchema,
  metadata: z.record(z.unknown()).optional(),
});

const settleRequestSchema = z.object({
  token: z.string().min(1),
  idempotency_key: z.string().max(64).optional(),
});

const quoteRequestSchema = z.object({
  corridor: z.enum(['pix', 'spei']),
  amount: z.number().positive().max(100000),
  currency: z.enum(['USD', 'USDC']),
});

// Story 43.6: AP2 Mandate Settlement Schema
const mandateSettleRequestSchema = z.object({
  mandate_token: z.string().min(1),
  amount: z.number().positive().max(100000),
  currency: z.enum(['USD', 'USDC']),
  corridor: z.enum(['pix', 'spei']),
  recipient: recipientSchema,
  idempotency_key: z.string().max(64).optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /v1/ucp/tokens
 *
 * Acquire a settlement token for completing a UCP checkout.
 * Token is valid for 15 minutes.
 */
router.post('/tokens', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();

  // Validate request
  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid token request', parsed.error.flatten());
  }

  const request: UCPTokenRequest = {
    corridor: parsed.data.corridor,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    recipient: parsed.data.recipient as any,
    metadata: parsed.data.metadata,
  };

  try {
    const token = await acquireToken(ctx.tenantId, request);

    // Include UCP negotiated info if available
    const ucpCtx = getUCPContext(c);
    const response: any = token;
    if (ucpCtx?.negotiated) {
      response.ucp = {
        version: ucpCtx.negotiated.version,
        capabilities: ucpCtx.negotiated.capabilities,
      };
    }

    return c.json(response, 201);
  } catch (error: any) {
    throw new ValidationError(error.message);
  }
});

/**
 * POST /v1/ucp/settle
 *
 * Complete settlement using a previously acquired token.
 */
router.post('/settle', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const body = await c.req.json();

  // Validate request
  const parsed = settleRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid settlement request', parsed.error.flatten());
  }

  const request: UCPSettleRequest = {
    token: parsed.data.token,
    idempotency_key: parsed.data.idempotency_key,
  };

  try {
    const settlement = await executeSettlement(ctx.tenantId, request, supabase);
    return c.json(settlement);
  } catch (error: any) {
    // Handle specific error cases
    if (error.message.includes('not found')) {
      throw new NotFoundError('Token', parsed.data.token);
    }
    if (error.message.includes('expired')) {
      return c.json(
        {
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Settlement token has expired',
          },
        },
        410
      );
    }
    if (error.message.includes('already been used')) {
      return c.json(
        {
          error: {
            code: 'TOKEN_USED',
            message: 'Settlement token has already been used',
          },
        },
        409
      );
    }
    throw new ValidationError(error.message);
  }
});

/**
 * POST /v1/ucp/settle/mandate
 *
 * Complete settlement using an AP2 payment mandate.
 * Supports autonomous agent purchases via dev.ucp.shopping.ap2_mandate extension.
 *
 * @see Story 43.6: AP2 Mandate Support in Handler
 */
router.post('/settle/mandate', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const body = await c.req.json();

  // Validate request
  const parsed = mandateSettleRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid mandate settlement request', parsed.error.flatten());
  }

  const request: UCPMandateSettleRequest = {
    mandate_token: parsed.data.mandate_token,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    corridor: parsed.data.corridor,
    recipient: parsed.data.recipient as any,
    idempotency_key: parsed.data.idempotency_key,
  };

  try {
    const settlement = await executeSettlementWithMandate(ctx.tenantId, request, supabase);
    return c.json(settlement);
  } catch (error: any) {
    // Handle specific error cases
    if (error.message.includes('Mandate not found')) {
      return c.json(
        {
          error: {
            code: 'MANDATE_NOT_FOUND',
            message: 'AP2 mandate not found',
          },
        },
        404
      );
    }
    if (error.message.includes('Mandate invalid')) {
      return c.json(
        {
          error: {
            code: 'MANDATE_INVALID',
            message: error.message,
          },
        },
        400
      );
    }
    if (error.message.includes('exceeds mandate limit')) {
      return c.json(
        {
          error: {
            code: 'AMOUNT_EXCEEDED',
            message: error.message,
          },
        },
        400
      );
    }
    if (error.message.includes('does not match mandate currency')) {
      return c.json(
        {
          error: {
            code: 'CURRENCY_MISMATCH',
            message: error.message,
          },
        },
        400
      );
    }
    throw new ValidationError(error.message);
  }
});

/**
 * GET /v1/ucp/settlements/:id
 *
 * Get settlement status by ID.
 */
router.get('/settlements/:id', async (c) => {
  const ctx = c.get('ctx');
  const settlementId = c.req.param('id');

  const settlement = await getSettlement(settlementId, ctx.tenantId);
  if (!settlement) {
    throw new NotFoundError('Settlement', settlementId);
  }

  return c.json(settlement);
});

/**
 * GET /v1/ucp/settlements
 *
 * List settlements for the tenant.
 */
router.get('/settlements', async (c) => {
  const ctx = c.get('ctx');
  const query = c.req.query();

  const status = query.status as string | undefined;
  const corridor = query.corridor as string | undefined;
  const limit = query.limit ? parseInt(query.limit) : 20;
  const offset = query.offset ? parseInt(query.offset) : 0;

  const result = await listSettlements(ctx.tenantId, {
    status,
    corridor,
    limit: Math.min(limit, 100),
    offset,
  });

  return c.json({
    data: result.data,
    pagination: {
      limit,
      offset,
      total: result.total,
    },
  });
});

/**
 * POST /v1/ucp/quote
 *
 * Get an FX quote for a settlement corridor.
 */
router.post('/quote', async (c) => {
  const body = await c.req.json();

  // Validate request
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid quote request', parsed.error.flatten());
  }

  const quote = getSettlementQuote(
    parsed.data.amount,
    parsed.data.currency,
    parsed.data.corridor
  );

  // Add expiration (quotes valid for 30 seconds)
  const expiresAt = new Date(Date.now() + 30 * 1000);

  return c.json({
    from_amount: quote.fromAmount,
    from_currency: quote.fromCurrency,
    to_amount: quote.toAmount,
    to_currency: quote.toCurrency,
    fx_rate: quote.fxRate,
    fees: quote.fees,
    expires_at: expiresAt.toISOString(),
  });
});

/**
 * GET /v1/ucp/corridors
 *
 * List available settlement corridors.
 */
router.get('/corridors', (c) => {
  const corridors = getCorridors();

  return c.json({
    corridors: corridors.map((corridor) => ({
      id: corridor.id,
      name: corridor.name,
      source_currency: corridor.source_currency,
      destination_currency: corridor.destination_currency,
      destination_country: corridor.destination_country,
      rail: corridor.rail,
      estimated_settlement: corridor.estimated_settlement,
    })),
  });
});

/**
 * GET /v1/ucp/info
 *
 * Get UCP handler information.
 */
router.get('/info', (c) => {
  const ucpCtx = getUCPContext(c);

  return c.json({
    handler: {
      id: 'payos_latam',
      name: 'com.payos.latam_settlement',
      version: '2026-01-11',
    },
    supported_corridors: ['pix', 'spei'],
    supported_currencies: ['USD', 'USDC'],
    token_expiry_seconds: 900, // 15 minutes
    ucp: ucpCtx?.agent
      ? {
          agent: ucpCtx.agent.name,
          version: ucpCtx.agent.version,
        }
      : undefined,
  });
});

export default router;
