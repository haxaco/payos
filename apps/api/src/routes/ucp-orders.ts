/**
 * UCP Order Routes
 *
 * REST API for UCP order management.
 *
 * Endpoints:
 * - GET    /v1/ucp/orders           - List orders
 * - GET    /v1/ucp/orders/:id       - Get order
 * - PUT    /v1/ucp/orders/:id/status - Update order status
 * - POST   /v1/ucp/orders/:id/cancel - Cancel order
 * - POST   /v1/ucp/orders/:id/expectations - Add expectation
 * - PUT    /v1/ucp/orders/:id/expectations/:expectationId - Update expectation
 * - POST   /v1/ucp/orders/:id/events - Add fulfillment event
 * - GET    /v1/ucp/orders/:id/events - Get fulfillment events
 * - POST   /v1/ucp/orders/:id/adjustments - Add adjustment (refund/return)
 *
 * @see Phase 3: Order Capability
 * @see https://ucp.dev/specification/order/
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { RequestContext } from '../middleware/auth.js';
import {
  getOrder,
  listOrders,
  updateOrderStatus,
  cancelOrder,
  addExpectation,
  updateExpectation,
  addFulfillmentEvent,
  getFulfillmentEvents,
  addAdjustment,
  type OrderStatus,
} from '../services/ucp/index.js';
import { createClient } from '../db/client.js';

// =============================================================================
// Validation Schemas
// =============================================================================

const OrderStatusSchema = z.enum([
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

const UpdateStatusSchema = z.object({
  status: OrderStatusSchema,
});

const CancelOrderSchema = z.object({
  reason: z.string().optional(),
});

const ExpectationSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  estimated_date: z.string().optional(),
  tracking_url: z.string().url().optional(),
});

const FulfillmentEventSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
});

const AdjustmentSchema = z.object({
  type: z.enum(['refund', 'return', 'credit']),
  amount: z.number().int().positive(),
  reason: z.string().optional(),
});

// =============================================================================
// Router
// =============================================================================

const router = new Hono<{ Variables: { ctx: RequestContext } }>();

/**
 * GET /v1/ucp/orders
 * List orders for the tenant
 */
router.get('/', async (c) => {
  const ctx = c.get('ctx');

  const status = c.req.query('status') as OrderStatus | undefined;
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  try {
    const supabase = createClient();
    const result = await listOrders(ctx.tenantId, { status, limit, offset }, supabase);

    return c.json({
      data: result.data,
      pagination: {
        limit,
        offset,
        total: result.total,
        total_pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error('[UCP Order] List error:', error);
    return c.json({ error: error.message || 'Failed to list orders' }, 500);
  }
});

/**
 * GET /v1/ucp/orders/:id
 * Get order by ID
 */
router.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');

  try {
    const supabase = createClient();
    const order = await getOrder(ctx.tenantId, orderId, supabase);

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json(order);
  } catch (error: any) {
    console.error('[UCP Order] Get error:', error);
    return c.json({ error: error.message || 'Failed to get order' }, 500);
  }
});

/**
 * PUT /v1/ucp/orders/:id/status
 * Update order status
 */
router.put('/:id/status', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');

  // Parse and validate request body
  let body: z.infer<typeof UpdateStatusSchema>;
  try {
    const rawBody = await c.req.json();
    body = UpdateStatusSchema.parse(rawBody);
  } catch (error: any) {
    return c.json({ error: 'Invalid request body', details: error.errors || error.message }, 400);
  }

  try {
    const supabase = createClient();
    const order = await updateOrderStatus(ctx.tenantId, orderId, body.status, supabase);

    return c.json(order);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }
    if (error.message.includes('Invalid status transition')) {
      return c.json({ error: error.message }, 409);
    }
    console.error('[UCP Order] Update status error:', error);
    return c.json({ error: error.message || 'Failed to update order status' }, 500);
  }
});

/**
 * POST /v1/ucp/orders/:id/cancel
 * Cancel order
 */
router.post('/:id/cancel', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');

  // Parse optional reason
  let reason: string | undefined;
  try {
    const rawBody = await c.req.json();
    const body = CancelOrderSchema.parse(rawBody);
    reason = body.reason;
  } catch {
    // No body or invalid body - that's OK, reason is optional
  }

  try {
    const supabase = createClient();
    const order = await cancelOrder(ctx.tenantId, orderId, reason, supabase);

    return c.json(order);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }
    if (error.message.includes('Cannot cancel')) {
      return c.json({ error: error.message }, 409);
    }
    console.error('[UCP Order] Cancel error:', error);
    return c.json({ error: error.message || 'Failed to cancel order' }, 500);
  }
});

/**
 * POST /v1/ucp/orders/:id/expectations
 * Add fulfillment expectation
 */
router.post('/:id/expectations', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');

  // Parse and validate request body
  let body: z.infer<typeof ExpectationSchema>;
  try {
    const rawBody = await c.req.json();
    body = ExpectationSchema.parse(rawBody);
  } catch (error: any) {
    return c.json({ error: 'Invalid request body', details: error.errors || error.message }, 400);
  }

  try {
    const supabase = createClient();
    const order = await addExpectation(ctx.tenantId, orderId, body, supabase);

    return c.json(order);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }
    console.error('[UCP Order] Add expectation error:', error);
    return c.json({ error: error.message || 'Failed to add expectation' }, 500);
  }
});

/**
 * PUT /v1/ucp/orders/:id/expectations/:expectationId
 * Update fulfillment expectation
 */
router.put('/:id/expectations/:expectationId', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');
  const expectationId = c.req.param('expectationId');

  // Parse and validate request body
  let body: Partial<z.infer<typeof ExpectationSchema>>;
  try {
    const rawBody = await c.req.json();
    body = ExpectationSchema.partial().parse(rawBody);
  } catch (error: any) {
    return c.json({ error: 'Invalid request body', details: error.errors || error.message }, 400);
  }

  try {
    const supabase = createClient();
    const order = await updateExpectation(ctx.tenantId, orderId, expectationId, body, supabase);

    return c.json(order);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }
    if (error.message === 'Expectation not found') {
      return c.json({ error: 'Expectation not found' }, 404);
    }
    console.error('[UCP Order] Update expectation error:', error);
    return c.json({ error: error.message || 'Failed to update expectation' }, 500);
  }
});

/**
 * POST /v1/ucp/orders/:id/events
 * Add fulfillment event
 */
router.post('/:id/events', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');

  // Parse and validate request body
  let body: z.infer<typeof FulfillmentEventSchema>;
  try {
    const rawBody = await c.req.json();
    body = FulfillmentEventSchema.parse(rawBody);
  } catch (error: any) {
    return c.json({ error: 'Invalid request body', details: error.errors || error.message }, 400);
  }

  try {
    const supabase = createClient();
    const order = await addFulfillmentEvent(ctx.tenantId, orderId, body, supabase);

    return c.json(order);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }
    console.error('[UCP Order] Add event error:', error);
    return c.json({ error: error.message || 'Failed to add fulfillment event' }, 500);
  }
});

/**
 * GET /v1/ucp/orders/:id/events
 * Get fulfillment events
 */
router.get('/:id/events', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');

  try {
    const supabase = createClient();
    const events = await getFulfillmentEvents(ctx.tenantId, orderId, supabase);

    return c.json({ data: events });
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }
    console.error('[UCP Order] Get events error:', error);
    return c.json({ error: error.message || 'Failed to get fulfillment events' }, 500);
  }
});

/**
 * POST /v1/ucp/orders/:id/adjustments
 * Add order adjustment (refund, return, credit)
 */
router.post('/:id/adjustments', async (c) => {
  const ctx = c.get('ctx');
  const orderId = c.req.param('id');

  // Parse and validate request body
  let body: z.infer<typeof AdjustmentSchema>;
  try {
    const rawBody = await c.req.json();
    body = AdjustmentSchema.parse(rawBody);
  } catch (error: any) {
    return c.json({ error: 'Invalid request body', details: error.errors || error.message }, 400);
  }

  try {
    const supabase = createClient();
    const order = await addAdjustment(ctx.tenantId, orderId, body, supabase);

    return c.json(order);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }
    if (error.message.includes('exceeds order total')) {
      return c.json({ error: error.message }, 400);
    }
    console.error('[UCP Order] Add adjustment error:', error);
    return c.json({ error: error.message || 'Failed to add adjustment' }, 500);
  }
});

export default router;
