/**
 * UCP Order Service
 *
 * Manages order lifecycle after checkout completion.
 *
 * Order states:
 * - confirmed: Order created, payment successful
 * - processing: Merchant preparing order
 * - shipped: Order shipped, tracking available
 * - delivered: Order delivered to customer
 * - cancelled: Order cancelled
 * - refunded: Order refunded
 *
 * @see Phase 3: Order Capability
 * @see https://ucp.dev/specification/order/
 */

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UCPOrder,
  UCPLineItem,
  UCPTotal,
  UCPBuyer,
  UCPAddress,
  UCPOrderPayment,
  UCPExpectation,
  UCPFulfillmentEvent,
  UCPAdjustment,
  OrderStatus,
  UCPCheckoutSession,
} from './types.js';

// =============================================================================
// In-Memory Store (for PoC - replace with Supabase in production)
// =============================================================================

interface StoredOrder {
  id: string;
  tenant_id: string;
  checkout_id: string;
  status: OrderStatus;
  currency: string;
  line_items: UCPLineItem[];
  totals: UCPTotal[];
  buyer: UCPBuyer | null;
  shipping_address: UCPAddress | null;
  billing_address: UCPAddress | null;
  payment: UCPOrderPayment;
  expectations: UCPExpectation[];
  events: UCPFulfillmentEvent[];
  adjustments: UCPAdjustment[];
  permalink_url: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const orderStore = new Map<string, StoredOrder>();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate order ID
 */
function generateOrderId(): string {
  const random = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 24);
  return `ord_${random}`;
}

/**
 * Generate expectation ID
 */
function generateExpectationId(): string {
  return `exp_${createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 16)}`;
}

/**
 * Generate event ID
 */
function generateEventId(): string {
  return `evt_${createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 16)}`;
}

/**
 * Generate adjustment ID
 */
function generateAdjustmentId(): string {
  return `adj_${createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 16)}`;
}

/**
 * Convert stored order to API response
 */
function toOrder(stored: StoredOrder): UCPOrder {
  return {
    id: stored.id,
    tenant_id: stored.tenant_id,
    checkout_id: stored.checkout_id,
    status: stored.status,
    currency: stored.currency,
    line_items: stored.line_items,
    totals: stored.totals,
    buyer: stored.buyer,
    shipping_address: stored.shipping_address,
    billing_address: stored.billing_address,
    payment: stored.payment,
    expectations: stored.expectations,
    events: stored.events,
    adjustments: stored.adjustments,
    permalink_url: stored.permalink_url,
    metadata: stored.metadata,
    created_at: stored.created_at.toISOString(),
    updated_at: stored.updated_at.toISOString(),
  };
}

/**
 * Valid order status transitions
 */
const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [], // Terminal state
};

/**
 * Check if order status transition is valid
 */
export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_ORDER_TRANSITIONS[from].includes(to);
}

// =============================================================================
// Order Operations
// =============================================================================

/**
 * Create order from completed checkout
 */
export async function createOrderFromCheckout(
  tenantId: string,
  checkout: UCPCheckoutSession,
  payment: UCPOrderPayment,
  _supabase?: SupabaseClient
): Promise<UCPOrder> {
  const id = generateOrderId();
  const now = new Date();

  // Generate permalink
  const baseUrl = process.env.PAYOS_API_URL || 'https://api.payos.com';
  const permalinkUrl = `${baseUrl}/orders/${id}`;

  const stored: StoredOrder = {
    id,
    tenant_id: tenantId,
    checkout_id: checkout.id,
    status: 'confirmed',
    currency: checkout.currency,
    line_items: checkout.line_items,
    totals: checkout.totals,
    buyer: checkout.buyer || null,
    shipping_address: checkout.shipping_address || null,
    billing_address: checkout.billing_address || null,
    payment,
    expectations: [],
    events: [],
    adjustments: [],
    permalink_url: permalinkUrl,
    metadata: checkout.metadata || {},
    created_at: now,
    updated_at: now,
  };

  orderStore.set(id, stored);

  console.log(`[UCP Order] Created order ${id} from checkout ${checkout.id}`);

  return toOrder(stored);
}

/**
 * Get order by ID
 */
export async function getOrder(
  tenantId: string,
  orderId: string,
  _supabase?: SupabaseClient
): Promise<UCPOrder | null> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    return null;
  }

  // Verify tenant
  if (stored.tenant_id !== tenantId) {
    return null;
  }

  return toOrder(stored);
}

/**
 * Get order by checkout ID
 */
export async function getOrderByCheckoutId(
  tenantId: string,
  checkoutId: string,
  _supabase?: SupabaseClient
): Promise<UCPOrder | null> {
  const stored = Array.from(orderStore.values()).find(
    (o) => o.checkout_id === checkoutId && o.tenant_id === tenantId
  );

  if (!stored) {
    return null;
  }

  return toOrder(stored);
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  newStatus: OrderStatus,
  _supabase?: SupabaseClient
): Promise<UCPOrder> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    throw new Error('Order not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Order not found');
  }

  if (!isValidOrderTransition(stored.status, newStatus)) {
    throw new Error(`Invalid status transition from ${stored.status} to ${newStatus}`);
  }

  stored.status = newStatus;
  stored.updated_at = new Date();
  orderStore.set(orderId, stored);

  console.log(`[UCP Order] Order ${orderId} status updated to ${newStatus}`);

  return toOrder(stored);
}

/**
 * List orders for a tenant
 */
export async function listOrders(
  tenantId: string,
  options: {
    status?: OrderStatus;
    limit?: number;
    offset?: number;
  } = {},
  _supabase?: SupabaseClient
): Promise<{ data: UCPOrder[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  let orders = Array.from(orderStore.values()).filter(
    (o) => o.tenant_id === tenantId
  );

  if (status) {
    orders = orders.filter((o) => o.status === status);
  }

  // Sort by created date descending
  orders.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  const total = orders.length;
  const paged = orders.slice(offset, offset + limit);

  return {
    data: paged.map(toOrder),
    total,
  };
}

// =============================================================================
// Fulfillment Operations
// =============================================================================

/**
 * Add fulfillment expectation (delivery promise)
 */
export async function addExpectation(
  tenantId: string,
  orderId: string,
  expectation: Omit<UCPExpectation, 'id'>,
  _supabase?: SupabaseClient
): Promise<UCPOrder> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    throw new Error('Order not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Order not found');
  }

  const newExpectation: UCPExpectation = {
    id: generateExpectationId(),
    ...expectation,
  };

  stored.expectations.push(newExpectation);
  stored.updated_at = new Date();
  orderStore.set(orderId, stored);

  console.log(`[UCP Order] Added expectation ${newExpectation.id} to order ${orderId}`);

  return toOrder(stored);
}

/**
 * Update fulfillment expectation
 */
export async function updateExpectation(
  tenantId: string,
  orderId: string,
  expectationId: string,
  updates: Partial<Omit<UCPExpectation, 'id'>>,
  _supabase?: SupabaseClient
): Promise<UCPOrder> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    throw new Error('Order not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Order not found');
  }

  const expectationIndex = stored.expectations.findIndex((e) => e.id === expectationId);
  if (expectationIndex === -1) {
    throw new Error('Expectation not found');
  }

  stored.expectations[expectationIndex] = {
    ...stored.expectations[expectationIndex],
    ...updates,
  };
  stored.updated_at = new Date();
  orderStore.set(orderId, stored);

  return toOrder(stored);
}

/**
 * Add fulfillment event (shipment tracking - append-only)
 */
export async function addFulfillmentEvent(
  tenantId: string,
  orderId: string,
  event: Omit<UCPFulfillmentEvent, 'id' | 'timestamp'>,
  _supabase?: SupabaseClient
): Promise<UCPOrder> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    throw new Error('Order not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Order not found');
  }

  const newEvent: UCPFulfillmentEvent = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    ...event,
  };

  // Events are append-only
  stored.events.push(newEvent);
  stored.updated_at = new Date();

  // Auto-update order status based on event type
  if (event.type === 'shipped' && stored.status === 'processing') {
    stored.status = 'shipped';
  } else if (event.type === 'delivered' && stored.status === 'shipped') {
    stored.status = 'delivered';
  }

  orderStore.set(orderId, stored);

  console.log(`[UCP Order] Added event ${newEvent.id} (${event.type}) to order ${orderId}`);

  return toOrder(stored);
}

/**
 * Get fulfillment events for an order
 */
export async function getFulfillmentEvents(
  tenantId: string,
  orderId: string,
  _supabase?: SupabaseClient
): Promise<UCPFulfillmentEvent[]> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    throw new Error('Order not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Order not found');
  }

  return stored.events;
}

// =============================================================================
// Adjustment Operations
// =============================================================================

/**
 * Add order adjustment (refund, return, credit)
 */
export async function addAdjustment(
  tenantId: string,
  orderId: string,
  adjustment: Omit<UCPAdjustment, 'id' | 'created_at'>,
  _supabase?: SupabaseClient
): Promise<UCPOrder> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    throw new Error('Order not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Order not found');
  }

  // Validate adjustment amount
  const totalAmount = stored.totals.find((t) => t.type === 'total')?.amount || 0;
  const existingRefunds = stored.adjustments
    .filter((a) => a.type === 'refund')
    .reduce((sum, a) => sum + a.amount, 0);

  if (adjustment.type === 'refund' && adjustment.amount + existingRefunds > totalAmount) {
    throw new Error('Refund amount exceeds order total');
  }

  const newAdjustment: UCPAdjustment = {
    id: generateAdjustmentId(),
    created_at: new Date().toISOString(),
    ...adjustment,
  };

  stored.adjustments.push(newAdjustment);
  stored.updated_at = new Date();

  // Auto-update order status for full refund
  if (adjustment.type === 'refund') {
    const totalRefunded = existingRefunds + adjustment.amount;
    if (totalRefunded >= totalAmount) {
      stored.status = 'refunded';
    }
  }

  orderStore.set(orderId, stored);

  console.log(`[UCP Order] Added adjustment ${newAdjustment.id} (${adjustment.type}) to order ${orderId}`);

  return toOrder(stored);
}

/**
 * Get total refunded amount for an order
 */
export function getTotalRefunded(order: UCPOrder): number {
  return order.adjustments
    .filter((a) => a.type === 'refund')
    .reduce((sum, a) => sum + a.amount, 0);
}

/**
 * Check if order can be refunded
 */
export function canRefund(order: UCPOrder): boolean {
  const totalAmount = order.totals.find((t) => t.type === 'total')?.amount || 0;
  const totalRefunded = getTotalRefunded(order);
  return totalRefunded < totalAmount && ['delivered', 'cancelled'].includes(order.status);
}

// =============================================================================
// Cancel Operations
// =============================================================================

/**
 * Cancel an order
 */
export async function cancelOrder(
  tenantId: string,
  orderId: string,
  reason?: string,
  _supabase?: SupabaseClient
): Promise<UCPOrder> {
  const stored = orderStore.get(orderId);

  if (!stored) {
    throw new Error('Order not found');
  }

  if (stored.tenant_id !== tenantId) {
    throw new Error('Order not found');
  }

  if (!['confirmed', 'processing', 'shipped'].includes(stored.status)) {
    throw new Error(`Cannot cancel order in ${stored.status} status`);
  }

  stored.status = 'cancelled';
  stored.updated_at = new Date();

  // Add cancellation event
  const cancelEvent: UCPFulfillmentEvent = {
    id: generateEventId(),
    type: 'cancelled',
    timestamp: new Date().toISOString(),
    description: reason || 'Order cancelled',
  };
  stored.events.push(cancelEvent);

  orderStore.set(orderId, stored);

  console.log(`[UCP Order] Order ${orderId} cancelled`);

  return toOrder(stored);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Clear order store (for testing)
 */
export function clearOrderStore(): void {
  orderStore.clear();
}

/**
 * Get order count (for testing)
 */
export function getOrderCount(): number {
  return orderStore.size;
}
