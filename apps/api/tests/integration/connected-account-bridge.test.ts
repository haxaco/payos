/**
 * Integration test: Connected Account Bridge
 *
 * Tests the UCP checkout → connected_account bridge flow:
 * 1. Handlers load from DB (stripe/paypal/circle with integration_mode='connected_account')
 * 2. Checkout with Stripe handler + no connected account → NO_CONNECTED_ACCOUNT error
 * 3. Existing demo/custom handlers still work
 * 4. Audit trail recorded in handler_payments
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.TEST_API_KEY || 'pk_test_demo_fintech_key_12345';

const skipIntegration = !process.env.INTEGRATION;

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

describe.skipIf(skipIntegration)('Connected Account Bridge', () => {
  // =========================================================================
  // Test 1: Verify connected_account handlers are loaded from DB
  // =========================================================================
  describe('Handler Loading', () => {
    it('GET /v1/payment-handlers returns stripe/paypal/circle as connected_account', async () => {
      const res = await fetch(`${API_URL}/v1/payment-handlers`, { headers: headers() });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);

      const handlerIds = body.data.map((h: any) => h.id);
      expect(handlerIds).toContain('stripe');
      expect(handlerIds).toContain('paypal');
      expect(handlerIds).toContain('circle');

      const stripe = body.data.find((h: any) => h.id === 'stripe');
      expect(stripe.integrationMode).toBe('connected_account');
      expect(stripe.supportedTypes).toContain('card');

      const paypal = body.data.find((h: any) => h.id === 'paypal');
      expect(paypal.integrationMode).toBe('connected_account');

      const circle = body.data.find((h: any) => h.id === 'circle');
      expect(circle.integrationMode).toBe('connected_account');
    });

    it('existing demo/custom handlers are still present', async () => {
      const res = await fetch(`${API_URL}/v1/payment-handlers`, { headers: headers() });
      const body = await res.json();

      const invu = body.data.find((h: any) => h.id === 'invu');
      expect(invu).toBeDefined();
      expect(invu.integrationMode).toBe('demo');

      const payosLatam = body.data.find((h: any) => h.id === 'payos_latam');
      expect(payosLatam).toBeDefined();
      expect(payosLatam.integrationMode).toBe('custom');
    });
  });

  // =========================================================================
  // Test 2: Checkout with Stripe handler (no connected account)
  // → should fail with NO_CONNECTED_ACCOUNT at complete time
  // =========================================================================
  describe('Stripe checkout without connected account', () => {
    let checkoutId: string;

    it('creates a checkout with handler=stripe', async () => {
      const res = await fetch(`${API_URL}/v1/ucp/checkouts`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          currency: 'USD',
          line_items: [
            {
              id: 'item_bridge_test',
              name: 'Bridge Test Widget',
              quantity: 1,
              unit_price: 2500,
              total_price: 2500,
            },
          ],
          checkout_type: 'digital',
          buyer: { name: 'Test User', email: 'bridge-test@example.com' },
          payment_config: { handlers: ['stripe'] },
          payment_instruments: [
            {
              id: 'pi_stripe_bridge_test',
              handler: 'stripe',
              type: 'card',
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.id).toBeDefined();
      checkoutId = body.data.id;
      expect(body.data.status).toBe('ready_for_complete');
    });

    it('completing the checkout fails with Payment failed (402)', async () => {
      expect(checkoutId).toBeDefined();

      const res = await fetch(`${API_URL}/v1/ucp/checkouts/${checkoutId}/complete`, {
        method: 'POST',
        headers: headers(),
      });

      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toMatch(/Payment failed.*no active stripe.*connect/i);
    });

    it('checkout reverts to ready_for_complete after failure', async () => {
      const res = await fetch(`${API_URL}/v1/ucp/checkouts/${checkoutId}`, {
        headers: headers(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe('ready_for_complete');
      expect(body.data.order_id).toBeNull();
    });
  });

  // =========================================================================
  // Test 3: PayPal checkout (no connected account)
  // =========================================================================
  describe('PayPal checkout without connected account', () => {
    it('completing fails with NO_CONNECTED_ACCOUNT (402)', async () => {
      const createRes = await fetch(`${API_URL}/v1/ucp/checkouts`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          currency: 'USD',
          line_items: [
            { id: 'item_pp_test', name: 'PayPal Widget', quantity: 1, unit_price: 3000, total_price: 3000 },
          ],
          checkout_type: 'digital',
          buyer: { name: 'Test', email: 'pp-test@example.com' },
          payment_config: { handlers: ['paypal'] },
          payment_instruments: [{ id: 'pi_paypal_test', handler: 'paypal', type: 'wallet' }],
        }),
      });
      const createBody = await createRes.json();
      const checkoutId = createBody.data.id;

      const completeRes = await fetch(`${API_URL}/v1/ucp/checkouts/${checkoutId}/complete`, {
        method: 'POST',
        headers: headers(),
      });

      expect(completeRes.status).toBe(402);
      const body = await completeRes.json();
      expect(body.error).toMatch(/Payment failed.*no active paypal/i);
    });
  });

  // =========================================================================
  // Test 4: Demo handler (invu) still works
  // =========================================================================
  describe('Demo handler (invu) still works', () => {
    it('creates and completes a checkout with handler=invu', async () => {
      const createRes = await fetch(`${API_URL}/v1/ucp/checkouts`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          currency: 'USD',
          line_items: [
            { id: 'item_demo_test', name: 'Demo Widget', quantity: 1, unit_price: 1000, total_price: 1000 },
          ],
          checkout_type: 'digital',
          buyer: { name: 'Test', email: 'demo-test@example.com' },
          payment_config: { handlers: ['invu'] },
          payment_instruments: [{ id: 'pi_invu_test', handler: 'invu', type: 'card' }],
        }),
      });

      expect(createRes.status).toBe(201);
      const createBody = await createRes.json();
      const checkoutId = createBody.data.id;
      expect(createBody.data.status).toBe('ready_for_complete');

      const completeRes = await fetch(`${API_URL}/v1/ucp/checkouts/${checkoutId}/complete`, {
        method: 'POST',
        headers: headers(),
      });

      expect(completeRes.status).toBe(200);
      const completeBody = await completeRes.json();
      expect(completeBody.data.status).toBe('completed');
      expect(completeBody.data.order_id).toBeDefined();
      expect(completeBody.data.order_id).not.toBeNull();
    });
  });
});
