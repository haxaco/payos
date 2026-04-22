/**
 * ACP routes — OpenAPIHono migration scaffold.
 *
 * Status: scaffold with 1 representative endpoint (POST /checkouts).
 *
 * MIGRATION STATE
 *   ✓ POST /checkouts            — migrated here
 *   ⬜ GET  /checkouts            — TODO
 *   ⬜ GET  /checkouts/{id}       — TODO
 *   ⬜ PATCH /checkouts/{id}      — TODO
 *   ⬜ POST /checkouts/{id}/complete  — TODO
 *   ⬜ POST /checkouts/{id}/cancel    — TODO
 *   ⬜ POST /checkouts/batch      — TODO
 *   ⬜ POST /checkouts/{id}/refund    — TODO
 *   ... 26+ more — see apps/api/src/routes/acp.ts for the full surface
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const ACPItemSchema = z
  .object({
    sku: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.string(),
    currency: z.string(),
  })
  .openapi('ACPItem');

const ACPAddressSchema = z
  .object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    postal_code: z.string(),
    country: z.string().length(2),
  })
  .openapi('ACPAddress');

const CreateACPCheckoutSchema = z
  .object({
    merchant_id: z.string(),
    items: z.array(ACPItemSchema).min(1),
    shipping_address: ACPAddressSchema.optional(),
    payment_method: z.enum(['card', 'bank', 'stablecoin']).default('card'),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi('CreateACPCheckoutInput');

const ACPCheckoutSchema = z
  .object({
    id: z.string(),
    status: z.enum(['created', 'pending_payment', 'paid', 'fulfilled', 'failed', 'expired', 'cancelled']),
    total: z.string(),
    currency: z.string(),
    client_secret: z.string().optional(),
    expires_at: z.string().datetime(),
  })
  .openapi('ACPCheckout');

const ErrorSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  })
  .openapi('Error');

const createCheckoutRoute = createRoute({
  method: 'post',
  path: '/checkouts',
  tags: ['ACP'],
  summary: 'Create an ACP checkout session',
  description:
    'Opens an Agentic Commerce Protocol checkout session. The returned client_secret is used to complete payment with the chosen payment method.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateACPCheckoutSchema } }, required: true },
  },
  responses: {
    201: {
      description: 'Checkout created',
      content: { 'application/json': { schema: z.object({ data: ACPCheckoutSchema }) } },
    },
    404: { description: 'Merchant not found', content: { 'application/json': { schema: ErrorSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

app.openapi(createCheckoutRoute, async (c): Promise<any> => {
  // TODO(acp-migration): port from apps/api/src/routes/acp.ts.
  const errorBody: z.infer<typeof ErrorSchema> = {
    error: 'Not yet migrated — use the plain-Hono ACP router',
    code: 'NOT_MIGRATED',
  };
  return c.json(errorBody, 400);
});

export default app;
