/**
 * UCP checkouts — hosted checkout session API.
 * Mount: /v1/ucp/checkouts
 *
 * COVERED (13 endpoints):
 *   POST   /              create checkout
 *   GET    /              list checkouts
 *   GET    /stats         aggregate stats
 *   POST   /batch         batch create
 *   POST   /batch-complete  batch complete
 *   GET    /{id}          get checkout
 *   PUT    /{id}          replace checkout (full update)
 *   POST   /{id}/complete   complete payment
 *   POST   /{id}/cancel     cancel session
 *   PATCH  /{id}/edit       partial edit
 *   DELETE /{id}          delete
 *   POST   /{id}/instruments  add payment instrument
 *   PUT    /{id}/instruments/{instrumentId}  replace instrument
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const CheckoutStatusEnum = z.enum(['created', 'pending_payment', 'paid', 'fulfilled', 'failed', 'expired', 'cancelled']);
const CheckoutStyleEnum = z.enum(['modal', 'redirect', 'embedded']);

const CheckoutItemSchema = z.object({
  sku: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.string(),
  currency: z.string(),
}).openapi('UCPCheckoutItem');

const CheckoutSchema = z.object({
  id: z.string(),
  merchant_id: z.string().uuid(),
  status: CheckoutStatusEnum,
  items: z.array(CheckoutItemSchema),
  total: z.string(),
  currency: z.string(),
  style: CheckoutStyleEnum,
  session_url: z.string().url().nullable().optional(),
  success_url: z.string().url().nullable().optional(),
  cancel_url: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
}).openapi('UCPCheckout');

const CreateCheckoutSchema = z.object({
  merchant_id: z.string().uuid(),
  items: z.array(CheckoutItemSchema).min(1),
  currency: z.string().default('USD'),
  style: CheckoutStyleEnum.default('modal'),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  expires_in: z.number().int().positive().max(86400).default(900),
  metadata: z.record(z.unknown()).optional(),
}).openapi('CreateUCPCheckoutInput');

const PaymentInstrumentSchema = z.object({
  id: z.string(),
  type: z.enum(['card', 'bank', 'wallet', 'stablecoin']),
  processor: z.string().optional(),
  processor_token: z.string().optional(),
  last_four: z.string().optional(),
}).openapi('PaymentInstrument');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
const notMigrated = () => ({ error: 'Not yet migrated — use plain-Hono UCP checkout router', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'post', path: '/', tags: ['UCP Checkouts'], summary: 'Create a checkout',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: CreateCheckoutSchema } }, required: true } },
  responses: {
    201: { description: 'Checkout created', content: { 'application/json': { schema: z.object({ data: CheckoutSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/', tags: ['UCP Checkouts'], summary: 'List checkouts',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    status: CheckoutStatusEnum.optional(),
    merchant_id: z.string().uuid().optional(),
    since: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Paginated checkouts', content: { 'application/json': { schema: z.object({ data: z.array(CheckoutSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/stats', tags: ['UCP Checkouts'], summary: 'Checkout analytics',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ period: z.enum(['24h', '7d', '30d']).default('7d') }) },
  responses: {
    200: { description: 'Stats', content: { 'application/json': { schema: z.object({
      total_sessions: z.number(), total_volume: z.string(), completion_rate: z.number(),
      by_status: z.record(z.number()),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ total_sessions: 0, total_volume: '0', completion_rate: 0, by_status: {} }, 200));

app.openapi(createRoute({
  method: 'post', path: '/batch', tags: ['UCP Checkouts'],
  summary: 'Batch-create checkouts',
  description: 'Create many checkouts in one request — useful for bulk commerce (campaign rollouts, marketplace listings).',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    checkouts: z.array(CreateCheckoutSchema).min(1).max(100),
    idempotency_key: z.string().optional(),
  }) } }, required: true } },
  responses: {
    201: { description: 'Batch created', content: { 'application/json': { schema: z.object({
      batch_id: z.string(), total: z.number(), created: z.number(), failed: z.number(),
      checkouts: z.array(CheckoutSchema),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/batch-complete', tags: ['UCP Checkouts'],
  summary: 'Batch-complete checkouts',
  description: 'Complete payments for many checkouts at once — e.g. when a platform settles an end-of-day batch.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    checkout_ids: z.array(z.string()).min(1).max(100),
    payment_method_id: z.string().optional(),
  }) } }, required: true } },
  responses: {
    200: { description: 'Batch results', content: { 'application/json': { schema: z.object({
      total: z.number(), completed: z.number(), failed: z.number(),
      results: z.array(z.object({ checkout_id: z.string(), status: z.string(), error: z.string().optional() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/{id}', tags: ['UCP Checkouts'], summary: 'Get a checkout',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Checkout', content: { 'application/json': { schema: z.object({ data: CheckoutSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'put', path: '/{id}', tags: ['UCP Checkouts'],
  summary: 'Replace a checkout',
  description: 'Full update — only allowed while status is `created` or `pending_payment`. Use PATCH /{id}/edit for partial changes.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: CreateCheckoutSchema } }, required: true } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: CheckoutSchema }) } } },
    409: { description: 'Status does not allow update', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/{id}/complete', tags: ['UCP Checkouts'], summary: 'Complete a checkout',
  description: 'Execute payment. For card checkouts, pass `payment_method_id` from your Stripe/Adyen integration. For stablecoin checkouts, pass `from_wallet_id`.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: z.object({
      payment_method_id: z.string().optional(),
      from_wallet_id: z.string().uuid().optional(),
      idempotency_key: z.string().optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Paid', content: { 'application/json': { schema: z.object({ data: CheckoutSchema, transfer_id: z.string() }) } } },
    402: { description: 'Payment rejected by rail', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Invalid state', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/{id}/cancel', tags: ['UCP Checkouts'], summary: 'Cancel a checkout',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Cancelled', content: { 'application/json': { schema: z.object({ data: CheckoutSchema }) } } },
    409: { description: 'Already paid or cancelled', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'patch', path: '/{id}/edit', tags: ['UCP Checkouts'], summary: 'Partial edit',
  description: 'Modify subset of fields (items, metadata, expires_at). Allowed before payment completion.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: z.object({
      items: z.array(CheckoutItemSchema).optional(),
      metadata: z.record(z.unknown()).optional(),
      expires_at: z.string().datetime().optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: CheckoutSchema }) } } },
    409: { description: 'Invalid state', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['UCP Checkouts'], summary: 'Delete a checkout',
  description: 'Only allowed before payment — soft delete with audit trail.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Deleted', content: { 'application/json': { schema: z.object({ message: z.string() }) } } },
    409: { description: 'Cannot delete paid checkout', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/{id}/instruments', tags: ['UCP Checkouts'],
  summary: 'Add payment instrument',
  description: 'Attach a payment method (card token, bank reference, wallet) to this checkout.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: PaymentInstrumentSchema.omit({ id: true }) } }, required: true },
  },
  responses: {
    201: { description: 'Instrument added', content: { 'application/json': { schema: z.object({ data: PaymentInstrumentSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'put', path: '/{id}/instruments/{instrumentId}', tags: ['UCP Checkouts'],
  summary: 'Replace payment instrument',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string(), instrumentId: z.string() }),
    body: { content: { 'application/json': { schema: PaymentInstrumentSchema.omit({ id: true }) } }, required: true },
  },
  responses: {
    200: { description: 'Replaced', content: { 'application/json': { schema: z.object({ data: PaymentInstrumentSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

export default app;
