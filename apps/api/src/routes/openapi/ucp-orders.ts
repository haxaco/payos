/**
 * UCP orders — order tracking + fulfillment events.
 * Mount: /v1/ucp/orders
 *
 * COVERED (9 endpoints):
 *   GET    /                     list orders
 *   GET    /{id}                 get order
 *   PUT    /{id}/status          update status
 *   POST   /{id}/cancel          cancel order
 *   POST   /{id}/expectations    add expectation (shipping / fulfillment plan)
 *   PUT    /{id}/expectations/{expectationId}  update expectation
 *   POST   /{id}/events          record event (shipped, delivered, returned)
 *   GET    /{id}/events          list events
 *   POST   /{id}/adjustments     record adjustment (partial refund, fee change)
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const OrderStatusEnum = z.enum(['pending', 'confirmed', 'fulfilling', 'shipped', 'delivered', 'returned', 'cancelled']);
const EventTypeEnum = z.enum(['shipped', 'in_transit', 'delivered', 'returned', 'held', 'exception']);

const OrderSchema = z.object({
  id: z.string(),
  checkout_id: z.string(),
  status: OrderStatusEnum,
  total: z.string(),
  currency: z.string(),
  customer_reference: z.string().nullable().optional(),
  tracking: z.object({ carrier: z.string(), tracking_number: z.string() }).nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).openapi('UCPOrder');

const ExpectationSchema = z.object({
  id: z.string(),
  type: z.enum(['shipping', 'digital_delivery', 'fulfillment']),
  expected_at: z.string().datetime(),
  description: z.string().optional(),
  status: z.enum(['pending', 'met', 'missed']),
}).openapi('OrderExpectation');

const EventSchema = z.object({
  id: z.string(),
  type: EventTypeEnum,
  description: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  occurred_at: z.string().datetime(),
  created_at: z.string().datetime(),
}).openapi('OrderEvent');

const AdjustmentSchema = z.object({
  id: z.string(),
  type: z.enum(['discount', 'surcharge', 'refund', 'fee_change']),
  amount: z.string(),
  reason: z.string(),
  created_at: z.string().datetime(),
}).openapi('OrderAdjustment');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/', tags: ['UCP Orders'], summary: 'List orders',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    status: OrderStatusEnum.optional(),
    checkout_id: z.string().optional(),
    customer_reference: z.string().optional(),
    since: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Paginated orders', content: { 'application/json': { schema: z.object({ data: z.array(OrderSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/{id}', tags: ['UCP Orders'], summary: 'Get an order',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Order', content: { 'application/json': { schema: z.object({ data: OrderSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'put', path: '/{id}/status', tags: ['UCP Orders'], summary: 'Update order status',
  description: 'Merchant-side status transition. Fires `ucp.order.status_changed` webhook.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: z.object({
      status: OrderStatusEnum,
      tracking: z.object({ carrier: z.string(), tracking_number: z.string() }).optional(),
      notes: z.string().optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: OrderSchema }) } } },
    409: { description: 'Invalid transition', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/{id}/cancel', tags: ['UCP Orders'], summary: 'Cancel an order',
  description: 'If the order is paid, a refund is automatically issued. Triggers `ucp.order.cancelled` webhook.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: z.object({ reason: z.string().max(500).optional() }) } } },
  },
  responses: {
    200: { description: 'Cancelled', content: { 'application/json': { schema: z.object({ data: OrderSchema, refund_id: z.string().optional() }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/{id}/expectations', tags: ['UCP Orders'], summary: 'Add expectation',
  description: 'Declare what the merchant is committing to deliver — shipping ETA, digital delivery window, etc. Used by dispute resolution.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: ExpectationSchema.omit({ id: true, status: true }) } }, required: true },
  },
  responses: {
    201: { description: 'Expectation recorded', content: { 'application/json': { schema: z.object({ data: ExpectationSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'put', path: '/{id}/expectations/{expectationId}', tags: ['UCP Orders'], summary: 'Update expectation',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string(), expectationId: z.string() }),
    body: { content: { 'application/json': { schema: ExpectationSchema.omit({ id: true }).partial() } }, required: true },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: ExpectationSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/{id}/events', tags: ['UCP Orders'], summary: 'Record fulfillment event',
  description: 'Merchant-side timeline entry (shipped / in_transit / delivered / etc.). Triggers webhooks and feeds dispute evidence.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: EventSchema.omit({ id: true, created_at: true }) } }, required: true },
  },
  responses: {
    201: { description: 'Event recorded', content: { 'application/json': { schema: z.object({ data: EventSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/{id}/events', tags: ['UCP Orders'], summary: 'List order events',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Events timeline', content: { 'application/json': { schema: z.object({ data: z.array(EventSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/{id}/adjustments', tags: ['UCP Orders'], summary: 'Record adjustment',
  description: 'Ad-hoc post-checkout change (discount applied, shipping fee adjusted, partial refund). Creates a ledger entry tied to the order.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: AdjustmentSchema.omit({ id: true, created_at: true }) } }, required: true },
  },
  responses: {
    201: { description: 'Adjustment recorded', content: { 'application/json': { schema: z.object({ data: AdjustmentSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

export default app;
