/**
 * UCP Checkout Unit Tests
 *
 * Tests for UCP checkout session management.
 *
 * @see Phase 2: Checkout Capability
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  // Checkout Service
  createCheckout,
  getCheckout,
  updateCheckout,
  completeCheckout,
  cancelCheckout,
  listCheckouts,
  addPaymentInstrument,
  selectPaymentInstrument,
  clearCheckoutStore,
  calculateTotals,
  // Status State Machine
  computeStatus,
  isValidTransition,
  validateTransition,
  computeRequirements,
  getMissingRequirements,
  canComplete,
  canModify,
  canCancel,
  isTerminal,
  // Messages
  createError,
  createWarning,
  createInfo,
  addMessage,
  removeMessagesByCode,
  getErrors,
  getWarnings,
  hasBlockingErrors,
  getMessageSummary,
  // Types
  type UCPCheckoutSession,
  type UCPLineItem,
  type CheckoutStatus,
} from '../../src/services/ucp/index.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const testTenantId = 'test-tenant-checkout-123';

const sampleLineItems: UCPLineItem[] = [
  {
    id: 'item_1',
    name: 'Test Product',
    description: 'A test product',
    quantity: 2,
    unit_price: 1000, // $10.00
    total_price: 2000, // $20.00
    currency: 'USD',
  },
  {
    id: 'item_2',
    name: 'Another Product',
    quantity: 1,
    unit_price: 500, // $5.00
    total_price: 500, // $5.00
    currency: 'USD',
  },
];

const sampleBuyer = {
  email: 'test@example.com',
  name: 'Test Buyer',
  phone: '+1234567890',
};

const sampleShippingAddress = {
  line1: '123 Test St',
  city: 'Test City',
  state: 'TS',
  postal_code: '12345',
  country: 'US',
};

// =============================================================================
// Checkout Status State Machine Tests
// =============================================================================

describe('UCP Checkout Status State Machine', () => {
  describe('isValidTransition', () => {
    it('should allow valid transitions from incomplete', () => {
      expect(isValidTransition('incomplete', 'requires_escalation')).toBe(true);
      expect(isValidTransition('incomplete', 'ready_for_complete')).toBe(true);
      expect(isValidTransition('incomplete', 'canceled')).toBe(true);
    });

    it('should reject invalid transitions from incomplete', () => {
      expect(isValidTransition('incomplete', 'completed')).toBe(false);
      expect(isValidTransition('incomplete', 'complete_in_progress')).toBe(false);
    });

    it('should allow valid transitions from ready_for_complete', () => {
      expect(isValidTransition('ready_for_complete', 'complete_in_progress')).toBe(true);
      expect(isValidTransition('ready_for_complete', 'canceled')).toBe(true);
      expect(isValidTransition('ready_for_complete', 'incomplete')).toBe(true);
    });

    it('should not allow transitions from terminal states', () => {
      expect(isValidTransition('completed', 'incomplete')).toBe(false);
      expect(isValidTransition('completed', 'canceled')).toBe(false);
      expect(isValidTransition('canceled', 'incomplete')).toBe(false);
      expect(isValidTransition('canceled', 'completed')).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should return allowed for valid transitions', () => {
      const result = validateTransition('incomplete', 'ready_for_complete');
      expect(result.allowed).toBe(true);
      expect(result.from).toBe('incomplete');
      expect(result.to).toBe('ready_for_complete');
    });

    it('should return reason for invalid transitions', () => {
      const result = validateTransition('completed', 'incomplete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('completed');
    });
  });

  describe('computeStatus', () => {
    it('should return incomplete when missing line items', () => {
      const status = computeStatus({
        status: 'incomplete',
        line_items: [],
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
        selected_instrument_id: 'pi_123',
        messages: [],
      });
      expect(status).toBe('incomplete');
    });

    it('should return incomplete when missing buyer', () => {
      const status = computeStatus({
        status: 'incomplete',
        line_items: sampleLineItems,
        buyer: null,
        shipping_address: sampleShippingAddress,
        selected_instrument_id: 'pi_123',
        messages: [],
      });
      expect(status).toBe('incomplete');
    });

    it('should return ready_for_complete when all requirements met', () => {
      const status = computeStatus({
        status: 'incomplete',
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
        selected_instrument_id: 'pi_123',
        payment_instruments: [{ id: 'pi_123', handler: 'payos', type: 'pix' }],
        messages: [],
      });
      expect(status).toBe('ready_for_complete');
    });

    it('should return requires_escalation when buyer input needed', () => {
      const status = computeStatus({
        status: 'incomplete',
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
        selected_instrument_id: 'pi_123',
        payment_instruments: [{ id: 'pi_123', handler: 'payos', type: 'pix' }],
        messages: [
          { type: 'error', severity: 'requires_buyer_input', code: 'TEST' },
        ],
      });
      expect(status).toBe('requires_escalation');
    });

    it('should not change terminal states', () => {
      expect(computeStatus({
        status: 'completed',
        line_items: [],
        messages: [],
      })).toBe('completed');

      expect(computeStatus({
        status: 'canceled',
        line_items: [],
        messages: [],
      })).toBe('canceled');
    });
  });

  describe('getMissingRequirements', () => {
    it('should list all missing requirements', () => {
      const missing = getMissingRequirements({
        line_items: [],
        buyer: null,
        shipping_address: null,
        selected_instrument_id: null,
        messages: [],
      });

      expect(missing).toContain('line_items');
      expect(missing).toContain('buyer.email');
      expect(missing).toContain('shipping_address');
      expect(missing).toContain('payment_instrument');
    });

    it('should return empty array when all requirements met', () => {
      const missing = getMissingRequirements({
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
        selected_instrument_id: 'pi_123',
        payment_instruments: [{ id: 'pi_123' }],
        messages: [],
      });

      expect(missing).toHaveLength(0);
    });
  });

  describe('status helpers', () => {
    it('canComplete should return true only for ready_for_complete', () => {
      expect(canComplete('ready_for_complete')).toBe(true);
      expect(canComplete('incomplete')).toBe(false);
      expect(canComplete('completed')).toBe(false);
    });

    it('canModify should return true for modifiable states', () => {
      expect(canModify('incomplete')).toBe(true);
      expect(canModify('requires_escalation')).toBe(true);
      expect(canModify('ready_for_complete')).toBe(true);
      expect(canModify('complete_in_progress')).toBe(false);
      expect(canModify('completed')).toBe(false);
    });

    it('canCancel should return true for cancellable states', () => {
      expect(canCancel('incomplete')).toBe(true);
      expect(canCancel('ready_for_complete')).toBe(true);
      expect(canCancel('complete_in_progress')).toBe(false);
      expect(canCancel('completed')).toBe(false);
    });

    it('isTerminal should identify terminal states', () => {
      expect(isTerminal('completed')).toBe(true);
      expect(isTerminal('canceled')).toBe(true);
      expect(isTerminal('incomplete')).toBe(false);
      expect(isTerminal('ready_for_complete')).toBe(false);
    });
  });
});

// =============================================================================
// Messages System Tests
// =============================================================================

describe('UCP Messages System', () => {
  describe('createError', () => {
    it('should create error message with correct structure', () => {
      const error = createError('MISSING_EMAIL', 'Email is required');

      expect(error.type).toBe('error');
      expect(error.code).toBe('MISSING_EMAIL');
      expect(error.content).toBe('Email is required');
      expect(error.severity).toBe('requires_buyer_input');
      expect(error.path).toBe('$.buyer.email');
      expect(error.id).toBeDefined();
      expect(error.created_at).toBeDefined();
    });

    it('should allow overriding severity and path', () => {
      const error = createError('CHECKOUT_EXPIRED', 'Checkout expired', {
        severity: 'recoverable',
        path: '$.expires_at',
      });

      expect(error.severity).toBe('recoverable');
      expect(error.path).toBe('$.expires_at');
    });
  });

  describe('createWarning', () => {
    it('should create warning message', () => {
      const warning = createWarning('PRICE_MAY_CHANGE', 'Prices may change');

      expect(warning.type).toBe('warning');
      expect(warning.code).toBe('PRICE_MAY_CHANGE');
      expect(warning.severity).toBeUndefined();
    });
  });

  describe('createInfo', () => {
    it('should create info message', () => {
      const info = createInfo('PROMOTION_APPLIED', 'Discount applied!');

      expect(info.type).toBe('info');
      expect(info.code).toBe('PROMOTION_APPLIED');
    });
  });

  describe('message operations', () => {
    it('should add message to array', () => {
      const messages: any[] = [];
      const error = createError('MISSING_EMAIL', 'Email required');
      const updated = addMessage(messages, error);

      expect(updated).toHaveLength(1);
      expect(updated[0].code).toBe('MISSING_EMAIL');
    });

    it('should remove messages by code', () => {
      const messages = [
        createError('MISSING_EMAIL', 'Email required'),
        createError('MISSING_SHIPPING_ADDRESS', 'Address required'),
        createWarning('PRICE_MAY_CHANGE', 'Prices may change'),
      ];

      const filtered = removeMessagesByCode(messages, 'MISSING_EMAIL');

      expect(filtered).toHaveLength(2);
      expect(filtered.every((m) => m.code !== 'MISSING_EMAIL')).toBe(true);
    });

    it('should get errors only', () => {
      const messages = [
        createError('MISSING_EMAIL', 'Email required'),
        createWarning('PRICE_MAY_CHANGE', 'Prices may change'),
        createInfo('PROMOTION_APPLIED', 'Discount applied'),
      ];

      const errors = getErrors(messages);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MISSING_EMAIL');
    });

    it('should detect blocking errors', () => {
      const withBlocking = [
        createError('MISSING_EMAIL', 'Email required'), // requires_buyer_input
      ];
      expect(hasBlockingErrors(withBlocking)).toBe(true);

      const withoutBlocking = [
        createError('CHECKOUT_EXPIRED', 'Expired', { severity: 'recoverable' }),
      ];
      expect(hasBlockingErrors(withoutBlocking)).toBe(false);
    });

    it('should get message summary', () => {
      const messages = [
        createError('MISSING_EMAIL', 'Email required'),
        createError('CHECKOUT_EXPIRED', 'Expired', { severity: 'recoverable' }),
        createWarning('PRICE_MAY_CHANGE', 'Prices may change'),
        createInfo('PROMOTION_APPLIED', 'Discount applied'),
      ];

      const summary = getMessageSummary(messages);

      expect(summary.errors).toBe(2);
      expect(summary.warnings).toBe(1);
      expect(summary.infos).toBe(1);
      expect(summary.blocking).toBe(1);
    });
  });
});

// =============================================================================
// Checkout Service Tests
// =============================================================================

describe('UCP Checkout Service', () => {
  beforeEach(() => {
    clearCheckoutStore();
  });

  afterEach(() => {
    clearCheckoutStore();
  });

  describe('calculateTotals', () => {
    it('should calculate totals from line items', () => {
      const totals = calculateTotals(sampleLineItems);

      expect(totals).toContainEqual({ type: 'subtotal', amount: 2500, label: 'Subtotal' });
      expect(totals).toContainEqual({ type: 'total', amount: 2500, label: 'Total' });
    });

    it('should include tax when specified', () => {
      const totals = calculateTotals(sampleLineItems, { taxRate: 0.08 });

      expect(totals.find((t) => t.type === 'tax')).toBeDefined();
      const taxLine = totals.find((t) => t.type === 'tax')!;
      expect(taxLine.amount).toBe(200); // 8% of 2500
    });

    it('should include shipping and discount', () => {
      const totals = calculateTotals(sampleLineItems, {
        shippingAmount: 500,
        discountAmount: 250,
      });

      expect(totals.find((t) => t.type === 'shipping')?.amount).toBe(500);
      expect(totals.find((t) => t.type === 'discount')?.amount).toBe(-250);
      expect(totals.find((t) => t.type === 'total')?.amount).toBe(2750); // 2500 + 500 - 250
    });
  });

  describe('createCheckout', () => {
    it('should create a checkout session', async () => {
      const checkout = await createCheckout(testTenantId, {
        currency: 'USD',
        line_items: sampleLineItems,
      });

      expect(checkout.id).toMatch(/^chk_/);
      expect(checkout.tenant_id).toBe(testTenantId);
      expect(checkout.currency).toBe('USD');
      expect(checkout.line_items).toHaveLength(2);
      expect(checkout.status).toBe('incomplete');
    });

    it('should create checkout with all optional fields', async () => {
      const checkout = await createCheckout(testTenantId, {
        currency: 'USD',
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
        continue_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: { order_ref: 'ABC123' },
      });

      expect(checkout.buyer?.email).toBe('test@example.com');
      expect(checkout.shipping_address?.city).toBe('Test City');
      expect(checkout.continue_url).toBe('https://example.com/success');
      expect(checkout.metadata.order_ref).toBe('ABC123');
    });

    it('should set expiration time', async () => {
      const checkout = await createCheckout(testTenantId, {
        currency: 'USD',
        expires_in_hours: 24,
      });

      const expiresAt = new Date(checkout.expires_at);
      const now = new Date();
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThan(25);
    });
  });

  describe('getCheckout', () => {
    it('should get checkout by ID', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
        line_items: sampleLineItems,
      });

      const checkout = await getCheckout(testTenantId, created.id);

      expect(checkout).not.toBeNull();
      expect(checkout!.id).toBe(created.id);
    });

    it('should return null for non-existent checkout', async () => {
      const checkout = await getCheckout(testTenantId, 'chk_nonexistent');
      expect(checkout).toBeNull();
    });

    it('should return null for different tenant', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
      });

      const checkout = await getCheckout('different-tenant', created.id);
      expect(checkout).toBeNull();
    });
  });

  describe('updateCheckout', () => {
    it('should update line items', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
      });

      const updated = await updateCheckout(testTenantId, created.id, {
        line_items: sampleLineItems,
      });

      expect(updated.line_items).toHaveLength(2);
      expect(updated.totals.find((t) => t.type === 'total')?.amount).toBe(2500);
    });

    it('should update buyer information', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
      });

      const updated = await updateCheckout(testTenantId, created.id, {
        buyer: sampleBuyer,
      });

      expect(updated.buyer?.email).toBe('test@example.com');
    });

    it('should update shipping address', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
      });

      const updated = await updateCheckout(testTenantId, created.id, {
        shipping_address: sampleShippingAddress,
      });

      expect(updated.shipping_address?.city).toBe('Test City');
    });

    it('should recompute status after update', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
      });

      expect(created.status).toBe('incomplete');

      // Add all required fields
      let updated = await updateCheckout(testTenantId, created.id, {
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
      });

      // Add payment instrument
      updated = await addPaymentInstrument(testTenantId, created.id, {
        id: 'pi_test',
        handler: 'payos',
        type: 'pix',
      });

      expect(updated.status).toBe('ready_for_complete');
    });

    it('should reject update for completed checkout', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
      });

      // Add payment instrument and complete
      await addPaymentInstrument(testTenantId, created.id, {
        id: 'pi_test',
        handler: 'payos',
        type: 'pix',
      });
      await completeCheckout(testTenantId, created.id);

      // Try to update
      await expect(
        updateCheckout(testTenantId, created.id, { buyer: { email: 'new@example.com' } })
      ).rejects.toThrow('Cannot modify checkout');
    });
  });

  describe('completeCheckout', () => {
    it('should complete checkout and create order', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
      });

      await addPaymentInstrument(testTenantId, created.id, {
        id: 'pi_test',
        handler: 'payos',
        type: 'pix',
      });

      const completed = await completeCheckout(testTenantId, created.id);

      expect(completed.status).toBe('completed');
      expect(completed.order_id).toMatch(/^ord_/);
    });

    it('should reject completion for incomplete checkout', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
      });

      await expect(completeCheckout(testTenantId, created.id)).rejects.toThrow(
        'Cannot complete checkout'
      );
    });

    it('should reject completion for checkout with blocking errors', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
      });

      // This won't have a payment instrument, so won't be ready_for_complete
      await expect(completeCheckout(testTenantId, created.id)).rejects.toThrow();
    });
  });

  describe('cancelCheckout', () => {
    it('should cancel checkout', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
      });

      const canceled = await cancelCheckout(testTenantId, created.id);

      expect(canceled.status).toBe('canceled');
    });

    it('should reject cancellation for completed checkout', async () => {
      const created = await createCheckout(testTenantId, {
        currency: 'USD',
        line_items: sampleLineItems,
        buyer: sampleBuyer,
        shipping_address: sampleShippingAddress,
      });

      await addPaymentInstrument(testTenantId, created.id, {
        id: 'pi_test',
        handler: 'payos',
        type: 'pix',
      });
      await completeCheckout(testTenantId, created.id);

      await expect(cancelCheckout(testTenantId, created.id)).rejects.toThrow('Cannot cancel');
    });
  });

  describe('listCheckouts', () => {
    it('should list checkouts for tenant', async () => {
      await createCheckout(testTenantId, { currency: 'USD' });
      await createCheckout(testTenantId, { currency: 'USD' });
      await createCheckout('other-tenant', { currency: 'USD' });

      const result = await listCheckouts(testTenantId);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      await createCheckout(testTenantId, { currency: 'USD' });
      const checkout2 = await createCheckout(testTenantId, { currency: 'USD' });
      await cancelCheckout(testTenantId, checkout2.id);

      const incomplete = await listCheckouts(testTenantId, { status: 'incomplete' });
      const canceled = await listCheckouts(testTenantId, { status: 'canceled' });

      expect(incomplete.data).toHaveLength(1);
      expect(canceled.data).toHaveLength(1);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createCheckout(testTenantId, { currency: 'USD' });
      }

      const page1 = await listCheckouts(testTenantId, { limit: 2, offset: 0 });
      const page2 = await listCheckouts(testTenantId, { limit: 2, offset: 2 });

      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
      expect(page1.total).toBe(5);
    });
  });

  describe('payment instruments', () => {
    it('should add payment instrument', async () => {
      const created = await createCheckout(testTenantId, { currency: 'USD' });

      const updated = await addPaymentInstrument(testTenantId, created.id, {
        id: 'pi_test',
        handler: 'payos',
        type: 'pix',
        last4: '1234',
      });

      expect(updated.payment_instruments).toHaveLength(1);
      expect(updated.payment_instruments[0].id).toBe('pi_test');
      expect(updated.selected_instrument_id).toBe('pi_test'); // Auto-selected
    });

    it('should select payment instrument', async () => {
      const created = await createCheckout(testTenantId, { currency: 'USD' });

      await addPaymentInstrument(testTenantId, created.id, {
        id: 'pi_1',
        handler: 'payos',
        type: 'pix',
      });
      await addPaymentInstrument(testTenantId, created.id, {
        id: 'pi_2',
        handler: 'payos',
        type: 'spei',
      });

      const updated = await selectPaymentInstrument(testTenantId, created.id, 'pi_2');

      expect(updated.selected_instrument_id).toBe('pi_2');
    });

    it('should reject selecting non-existent instrument', async () => {
      const created = await createCheckout(testTenantId, { currency: 'USD' });

      await expect(
        selectPaymentInstrument(testTenantId, created.id, 'pi_nonexistent')
      ).rejects.toThrow('Payment instrument not found');
    });
  });
});
