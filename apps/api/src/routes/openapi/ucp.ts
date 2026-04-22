/**
 * UCP routes — OpenAPIHono migration scaffold.
 *
 * Status: scaffold with 1 representative endpoint (POST /tokens).
 *
 * MIGRATION STATE
 *   ✓ POST /tokens               — migrated here
 *   ⬜ POST /settle               — TODO
 *   ⬜ GET  /settlements/{id}     — TODO
 *   ⬜ POST /merchants            — TODO
 *   ⬜ GET  /merchants            — TODO
 *   ⬜ POST /checkouts            — TODO (in ucp-checkout.ts — full cart flow)
 *   ⬜ POST /orders               — TODO
 *   ⬜ POST /identity             — TODO
 *   ... 20+ more — see apps/api/src/routes/ucp*.ts for the full surface
 *
 * The live plain-Hono routers in apps/api/src/routes/ucp*.ts continue to serve
 * traffic. When an endpoint is migrated, swap its mount in app.ts to use this
 * file. Until then, this file contributes to the OpenAPI spec but doesn't
 * affect runtime.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

// ============================================================================
// Schemas
// ============================================================================

const UCPItemSchema = z
  .object({
    sku: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.string(),
    currency: z.string(),
  })
  .openapi('UCPItem');

const UCPSettlementPrefsSchema = z
  .object({
    accepted_rails: z.array(z.enum(['usdc', 'ach', 'card', 'wire', 'pix', 'spei'])),
    settlement_window: z.enum(['instant', 'T+0', 'T+1', 'T+2']).default('T+1'),
  })
  .openapi('UCPSettlementPrefs');

const CreateUCPTokenSchema = z
  .object({
    merchant_id: z.string().uuid(),
    items: z.array(UCPItemSchema).min(1),
    settlement_preferences: UCPSettlementPrefsSchema,
    expires_in: z.number().int().positive().max(86400).default(900),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi('CreateUCPTokenInput');

const UCPTokenSchema = z
  .object({
    id: z.string(),
    token: z.string().describe('JWS-signed token to return to the buyer'),
    total: z.string(),
    currency: z.string(),
    expires_at: z.string().datetime(),
    settlement_url: z.string().url(),
    status: z.enum(['pending', 'settled', 'expired', 'cancelled']),
  })
  .openapi('UCPToken');

const ErrorSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
    request_id: z.string().optional(),
  })
  .openapi('Error');

// ============================================================================
// POST /tokens — create a UCP checkout token
// ============================================================================

const createTokenRoute = createRoute({
  method: 'post',
  path: '/tokens',
  tags: ['UCP'],
  summary: 'Create a UCP checkout token',
  description:
    'A merchant creates a UCP token representing an order. The token is returned to the buyer who exchanges it for settlement via their preferred rail.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateUCPTokenSchema } }, required: true },
  },
  responses: {
    201: {
      description: 'Token created',
      content: { 'application/json': { schema: z.object({ data: UCPTokenSchema }) } },
    },
    404: { description: 'Merchant not found', content: { 'application/json': { schema: ErrorSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

app.openapi(createTokenRoute, async (c): Promise<any> => {
  const _ctx = c.get('ctx');
  const _body = c.req.valid('json');

  // TODO(ucp-migration): port the token creation logic from apps/api/src/routes/ucp.ts.
  // For now, return a 400 to signal this path is not yet live.
  const errorBody: z.infer<typeof ErrorSchema> = {
    error: 'Not yet migrated — use the plain-Hono UCP router',
    code: 'NOT_MIGRATED',
  };
  return c.json(errorBody, 400);
});

export default app;
