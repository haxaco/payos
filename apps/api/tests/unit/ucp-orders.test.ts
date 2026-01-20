/**
 * UCP Order Unit Tests
 *
 * Tests for UCP order management, fulfillment, and adjustments.
 *
 * @see Phase 3: Order Capability
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  // Order Service
  createOrderFromCheckout,
  getOrder,
  getOrderByCheckoutId,
  updateOrderStatus,
  listOrders,
  cancelOrder,
  addExpectation,
  updateExpectation,
  addFulfillmentEvent,
  getFulfillmentEvents,
  addAdjustment,
  getTotalRefunded,
  canRefund,
  isValidOrderTransition,
  clearOrderStore,
  // Checkout Service (for creating test orders)
  createCheckout,
  addPaymentInstrument,
  completeCheckout,
  clearCheckoutStore,
  // Order Webhooks
  registerWebhookEndpoint,
  getWebhookEndpoints,
  deactivateWebhookEndpoint,
  clearWebhookStores,
  // Types
  type UCPOrder,
  type UCPCheckoutSession,
  type OrderStatus,
} from '../../src/services/ucp/index.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const testTenantId = 'test-tenant-orders-123';

const sampleLineItems = [
  {
    id: 'item_1',
    name: 'Test Product',
    quantity: 2,
    unit_price: 1000,
    total_price: 2000,
    currency: 'USD',
  },
];

const sampleBuyer = {
  email: 'test@example.com',
  name: 'Test Buyer',
};

const sampleShippingAddress = {
  line1: '123 Test St',
  city: 'Test City',
  state: 'TS',
  postal_code: '12345',
  country: 'US',
};

/**
 * Helper to create a completed checkout and order
 */
async function createTestOrder(): Promise<{ checkout: UCPCheckoutSession; order: UCPOrder }> {
  const checkout = await createCheckout(testTenantId, {
    currency: 'USD',
    line_items: sampleLineItems,
    totals: [{ type: 'total', amount: 2000, currency: 'USD', label: 'Total' }],
    buyer: sampleBuyer,
    shipping_address: sampleShippingAddress,
  });

  await addPaymentInstrument(testTenantId, checkout.id, {
    id: 'pi_test',
    handler: 'payos',
    type: 'pix',
  });

  const completedCheckout = await completeCheckout(testTenantId, checkout.id);

  // Explicitly create the order from the completed checkout
  const order = await createOrderFromCheckout(testTenantId, completedCheckout, {
    handler: 'payos',
    instrument_id: 'pi_test',
    transaction_id: 'txn_test_123',
    status: 'captured',
    captured_at: new Date().toISOString(),
  });

  return { checkout: completedCheckout, order };
}

// =============================================================================
// Order Status Transitions Tests
// =============================================================================

describe('UCP Order Status Transitions', () => {
  describe('isValidOrderTransition', () => {
    it('should allow confirmed -> processing', () => {
      expect(isValidOrderTransition('confirmed', 'processing')).toBe(true);
    });

    it('should allow confirmed -> cancelled', () => {
      expect(isValidOrderTransition('confirmed', 'cancelled')).toBe(true);
    });

    it('should allow processing -> shipped', () => {
      expect(isValidOrderTransition('processing', 'shipped')).toBe(true);
    });

    it('should allow shipped -> delivered', () => {
      expect(isValidOrderTransition('shipped', 'delivered')).toBe(true);
    });

    it('should allow delivered -> refunded', () => {
      expect(isValidOrderTransition('delivered', 'refunded')).toBe(true);
    });

    it('should not allow backwards transitions', () => {
      expect(isValidOrderTransition('shipped', 'processing')).toBe(false);
      expect(isValidOrderTransition('delivered', 'shipped')).toBe(false);
    });

    it('should not allow transitions from refunded', () => {
      expect(isValidOrderTransition('refunded', 'confirmed')).toBe(false);
      expect(isValidOrderTransition('refunded', 'cancelled')).toBe(false);
    });
  });
});

// =============================================================================
// Order Service Tests
// =============================================================================

describe('UCP Order Service', () => {
  beforeEach(() => {
    clearOrderStore();
    clearCheckoutStore();
    clearWebhookStores();
  });

  afterEach(() => {
    clearOrderStore();
    clearCheckoutStore();
    clearWebhookStores();
  });

  describe('createOrderFromCheckout', () => {
    it('should create order when checkout completes', async () => {
      const { order } = await createTestOrder();

      expect(order.id).toMatch(/^ord_/);
      expect(order.tenant_id).toBe(testTenantId);
      expect(order.status).toBe('confirmed');
      expect(order.line_items).toHaveLength(1);
      expect(order.buyer?.email).toBe('test@example.com');
      expect(order.permalink_url).toContain('/orders/');
    });

    it('should copy checkout data to order', async () => {
      const { checkout, order } = await createTestOrder();

      expect(order.checkout_id).toBe(checkout.id);
      expect(order.currency).toBe(checkout.currency);
      expect(order.shipping_address).toEqual(checkout.shipping_address);
    });
  });

  describe('getOrder', () => {
    it('should get order by ID', async () => {
      const { order: created } = await createTestOrder();

      const order = await getOrder(testTenantId, created.id);

      expect(order).not.toBeNull();
      expect(order!.id).toBe(created.id);
    });

    it('should return null for non-existent order', async () => {
      const order = await getOrder(testTenantId, 'ord_nonexistent');
      expect(order).toBeNull();
    });

    it('should return null for different tenant', async () => {
      const { order: created } = await createTestOrder();

      const order = await getOrder('different-tenant', created.id);
      expect(order).toBeNull();
    });
  });

  describe('getOrderByCheckoutId', () => {
    it('should get order by checkout ID', async () => {
      const { checkout, order: created } = await createTestOrder();

      const order = await getOrderByCheckoutId(testTenantId, checkout.id);

      expect(order).not.toBeNull();
      expect(order!.id).toBe(created.id);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const { order: created } = await createTestOrder();

      const updated = await updateOrderStatus(testTenantId, created.id, 'processing');

      expect(updated.status).toBe('processing');
    });

    it('should reject invalid status transition', async () => {
      const { order: created } = await createTestOrder();

      await expect(
        updateOrderStatus(testTenantId, created.id, 'delivered')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('listOrders', () => {
    it('should list orders for tenant', async () => {
      await createTestOrder();
      await createTestOrder();

      const result = await listOrders(testTenantId);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      const { order: order1 } = await createTestOrder();
      await createTestOrder();

      await updateOrderStatus(testTenantId, order1.id, 'processing');

      const confirmed = await listOrders(testTenantId, { status: 'confirmed' });
      const processing = await listOrders(testTenantId, { status: 'processing' });

      expect(confirmed.data).toHaveLength(1);
      expect(processing.data).toHaveLength(1);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestOrder();
      }

      const page1 = await listOrders(testTenantId, { limit: 2, offset: 0 });
      const page2 = await listOrders(testTenantId, { limit: 2, offset: 2 });

      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
      expect(page1.total).toBe(5);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order', async () => {
      const { order: created } = await createTestOrder();

      const cancelled = await cancelOrder(testTenantId, created.id, 'Customer requested');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.events).toHaveLength(1);
      expect(cancelled.events[0].type).toBe('cancelled');
    });

    it('should reject cancellation for delivered order', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      await expect(
        cancelOrder(testTenantId, created.id)
      ).rejects.toThrow('Cannot cancel');
    });
  });
});

// =============================================================================
// Fulfillment Tests
// =============================================================================

describe('UCP Order Fulfillment', () => {
  beforeEach(() => {
    clearOrderStore();
    clearCheckoutStore();
  });

  afterEach(() => {
    clearOrderStore();
    clearCheckoutStore();
  });

  describe('addExpectation', () => {
    it('should add fulfillment expectation', async () => {
      const { order: created } = await createTestOrder();

      const updated = await addExpectation(testTenantId, created.id, {
        type: 'delivery',
        description: 'Standard shipping 3-5 business days',
        estimated_date: '2026-01-25',
      });

      expect(updated.expectations).toHaveLength(1);
      expect(updated.expectations[0].id).toMatch(/^exp_/);
      expect(updated.expectations[0].type).toBe('delivery');
    });

    it('should add multiple expectations', async () => {
      const { order: created } = await createTestOrder();

      await addExpectation(testTenantId, created.id, {
        type: 'delivery',
        description: 'Standard shipping',
      });

      const updated = await addExpectation(testTenantId, created.id, {
        type: 'pickup',
        description: 'Ready for pickup at store',
      });

      expect(updated.expectations).toHaveLength(2);
    });
  });

  describe('updateExpectation', () => {
    it('should update expectation', async () => {
      const { order: created } = await createTestOrder();

      const withExpectation = await addExpectation(testTenantId, created.id, {
        type: 'delivery',
        description: 'Standard shipping',
      });

      const expectationId = withExpectation.expectations[0].id;

      const updated = await updateExpectation(testTenantId, created.id, expectationId, {
        tracking_url: 'https://tracking.example.com/123',
      });

      expect(updated.expectations[0].tracking_url).toBe('https://tracking.example.com/123');
    });

    it('should reject update for non-existent expectation', async () => {
      const { order: created } = await createTestOrder();

      await expect(
        updateExpectation(testTenantId, created.id, 'exp_nonexistent', {
          description: 'Updated',
        })
      ).rejects.toThrow('Expectation not found');
    });
  });

  describe('addFulfillmentEvent', () => {
    it('should add fulfillment event', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');

      const updated = await addFulfillmentEvent(testTenantId, created.id, {
        type: 'shipped',
        description: 'Package shipped via UPS',
        tracking_number: '1Z999AA10123456784',
        carrier: 'UPS',
      });

      expect(updated.events).toHaveLength(1);
      expect(updated.events[0].id).toMatch(/^evt_/);
      expect(updated.events[0].type).toBe('shipped');
      expect(updated.events[0].tracking_number).toBe('1Z999AA10123456784');
      expect(updated.events[0].timestamp).toBeDefined();
    });

    it('should auto-update status when shipped event added', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');

      const updated = await addFulfillmentEvent(testTenantId, created.id, {
        type: 'shipped',
        description: 'Package shipped',
      });

      expect(updated.status).toBe('shipped');
    });

    it('should auto-update status when delivered event added', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await addFulfillmentEvent(testTenantId, created.id, {
        type: 'shipped',
        description: 'Package shipped',
      });

      const updated = await addFulfillmentEvent(testTenantId, created.id, {
        type: 'delivered',
        description: 'Package delivered',
      });

      expect(updated.status).toBe('delivered');
    });

    it('should append events (not replace)', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');

      await addFulfillmentEvent(testTenantId, created.id, {
        type: 'shipped',
        description: 'Shipped',
      });

      await addFulfillmentEvent(testTenantId, created.id, {
        type: 'in_transit',
        description: 'In transit',
      });

      const updated = await addFulfillmentEvent(testTenantId, created.id, {
        type: 'delivered',
        description: 'Delivered',
      });

      expect(updated.events).toHaveLength(3);
    });
  });

  describe('getFulfillmentEvents', () => {
    it('should get all fulfillment events', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');

      await addFulfillmentEvent(testTenantId, created.id, {
        type: 'shipped',
        description: 'Shipped',
      });

      await addFulfillmentEvent(testTenantId, created.id, {
        type: 'delivered',
        description: 'Delivered',
      });

      const events = await getFulfillmentEvents(testTenantId, created.id);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('shipped');
      expect(events[1].type).toBe('delivered');
    });
  });
});

// =============================================================================
// Adjustment Tests
// =============================================================================

describe('UCP Order Adjustments', () => {
  beforeEach(() => {
    clearOrderStore();
    clearCheckoutStore();
  });

  afterEach(() => {
    clearOrderStore();
    clearCheckoutStore();
  });

  describe('addAdjustment', () => {
    it('should add refund adjustment', async () => {
      const { order: created } = await createTestOrder();

      // Move to delivered status
      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      const updated = await addAdjustment(testTenantId, created.id, {
        type: 'refund',
        amount: 500,
        reason: 'Partial refund for damaged item',
      });

      expect(updated.adjustments).toHaveLength(1);
      expect(updated.adjustments[0].id).toMatch(/^adj_/);
      expect(updated.adjustments[0].type).toBe('refund');
      expect(updated.adjustments[0].amount).toBe(500);
    });

    it('should auto-update status for full refund', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      const totalAmount = created.totals.find((t) => t.type === 'total')?.amount || 0;

      const updated = await addAdjustment(testTenantId, created.id, {
        type: 'refund',
        amount: totalAmount,
        reason: 'Full refund',
      });

      expect(updated.status).toBe('refunded');
    });

    it('should reject refund exceeding order total', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      const totalAmount = created.totals.find((t) => t.type === 'total')?.amount || 0;

      await expect(
        addAdjustment(testTenantId, created.id, {
          type: 'refund',
          amount: totalAmount + 100,
        })
      ).rejects.toThrow('exceeds order total');
    });

    it('should reject cumulative refunds exceeding total', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      const totalAmount = created.totals.find((t) => t.type === 'total')?.amount || 0;

      await addAdjustment(testTenantId, created.id, {
        type: 'refund',
        amount: totalAmount - 100,
      });

      await expect(
        addAdjustment(testTenantId, created.id, {
          type: 'refund',
          amount: 200, // This would exceed total
        })
      ).rejects.toThrow('exceeds order total');
    });
  });

  describe('getTotalRefunded', () => {
    it('should calculate total refunded amount', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      await addAdjustment(testTenantId, created.id, {
        type: 'refund',
        amount: 500,
      });

      await addAdjustment(testTenantId, created.id, {
        type: 'refund',
        amount: 300,
      });

      const order = await getOrder(testTenantId, created.id);
      const totalRefunded = getTotalRefunded(order!);

      expect(totalRefunded).toBe(800);
    });

    it('should not include non-refund adjustments', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      await addAdjustment(testTenantId, created.id, {
        type: 'refund',
        amount: 500,
      });

      await addAdjustment(testTenantId, created.id, {
        type: 'credit',
        amount: 100,
      });

      const order = await getOrder(testTenantId, created.id);
      const totalRefunded = getTotalRefunded(order!);

      expect(totalRefunded).toBe(500); // Only refund, not credit
    });
  });

  describe('canRefund', () => {
    it('should return true for delivered order', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      const order = await getOrder(testTenantId, created.id);
      expect(canRefund(order!)).toBe(true);
    });

    it('should return true for cancelled order', async () => {
      const { order: created } = await createTestOrder();

      await cancelOrder(testTenantId, created.id);

      const order = await getOrder(testTenantId, created.id);
      expect(canRefund(order!)).toBe(true);
    });

    it('should return false for confirmed order', async () => {
      const { order } = await createTestOrder();

      expect(canRefund(order)).toBe(false);
    });

    it('should return false when fully refunded', async () => {
      const { order: created } = await createTestOrder();

      await updateOrderStatus(testTenantId, created.id, 'processing');
      await updateOrderStatus(testTenantId, created.id, 'shipped');
      await updateOrderStatus(testTenantId, created.id, 'delivered');

      const totalAmount = created.totals.find((t) => t.type === 'total')?.amount || 0;

      await addAdjustment(testTenantId, created.id, {
        type: 'refund',
        amount: totalAmount,
      });

      const order = await getOrder(testTenantId, created.id);
      expect(canRefund(order!)).toBe(false);
    });
  });
});

// =============================================================================
// Webhook Tests
// =============================================================================

describe('UCP Order Webhooks', () => {
  beforeEach(() => {
    clearWebhookStores();
  });

  afterEach(() => {
    clearWebhookStores();
  });

  describe('registerWebhookEndpoint', () => {
    it('should register webhook endpoint', () => {
      const endpoint = registerWebhookEndpoint(testTenantId, {
        url: 'https://example.com/webhooks',
        events: ['order.created', 'order.shipped'],
        active: true,
      });

      expect(endpoint.id).toMatch(/^whep_/);
      expect(endpoint.url).toBe('https://example.com/webhooks');
      expect(endpoint.events).toContain('order.created');
    });
  });

  describe('getWebhookEndpoints', () => {
    it('should get active endpoints', () => {
      registerWebhookEndpoint(testTenantId, {
        url: 'https://example.com/webhooks1',
        events: ['order.created'],
        active: true,
      });

      registerWebhookEndpoint(testTenantId, {
        url: 'https://example.com/webhooks2',
        events: ['order.shipped'],
        active: false,
      });

      const endpoints = getWebhookEndpoints(testTenantId);

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].url).toBe('https://example.com/webhooks1');
    });
  });

  describe('deactivateWebhookEndpoint', () => {
    it('should deactivate endpoint', () => {
      const endpoint = registerWebhookEndpoint(testTenantId, {
        url: 'https://example.com/webhooks',
        events: ['order.created'],
        active: true,
      });

      deactivateWebhookEndpoint(endpoint.id);

      const endpoints = getWebhookEndpoints(testTenantId);
      expect(endpoints).toHaveLength(0);
    });
  });
});
