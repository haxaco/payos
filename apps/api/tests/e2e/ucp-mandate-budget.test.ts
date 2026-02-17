/**
 * E2E Test: UCP Checkout Mandate Budget Enforcement
 *
 * Tests that mandate budget is enforced as a blocking check during
 * UCP checkout completion. If the mandate doesn't have enough
 * remaining budget, the checkout must fail BEFORE payment processing.
 *
 * Scenarios:
 * 1. Checkout with insufficient mandate budget → blocked
 * 2. Checkout with sufficient mandate budget → succeeds
 * 3. Checkout without mandate → succeeds (no regression)
 * 4. Checkout failure reverts status to ready_for_complete
 * 5. Sequential checkouts that exhaust mandate budget
 *
 * Requires: INTEGRATION=true, running API server, Supabase connection
 */

import { describe, it, expect } from 'vitest';
import { TEST_API_KEY } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

// =============================================================================
// Integration Tests (require running API + Supabase)
// =============================================================================

describe.skipIf(skipIntegration)('UCP Mandate Budget Enforcement (Integration)', () => {
  const headers = {
    Authorization: `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const sampleBuyer = {
    name: 'Test Agent',
    email: 'agent@test.com',
  };

  // Cache account/agent IDs across tests
  let cachedAccountId: string;
  let cachedAgentId: string;

  /**
   * Helper: resolve a valid account_id and agent_id from the tenant
   */
  async function getTestIds() {
    if (cachedAccountId && cachedAgentId) {
      return { accountId: cachedAccountId, agentId: cachedAgentId };
    }

    const [accountsRes, agentsRes] = await Promise.all([
      fetch(`${BASE_URL}/v1/accounts?limit=1`, { headers }),
      fetch(`${BASE_URL}/v1/agents?limit=1`, { headers }),
    ]);

    const accountsData = await accountsRes.json();
    const agentsData = await agentsRes.json();

    cachedAccountId = accountsData.data?.[0]?.id;
    cachedAgentId = agentsData.data?.[0]?.id;

    expect(cachedAccountId).toBeDefined();
    expect(cachedAgentId).toBeDefined();

    return { accountId: cachedAccountId, agentId: cachedAgentId };
  }

  /**
   * Helper: create an AP2 mandate with a given budget
   */
  async function createMandate(budget: number, suffix: string) {
    const { accountId, agentId } = await getTestIds();

    const res = await fetch(`${BASE_URL}/v1/ap2/mandates`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mandate_id: `test_budget_${suffix}_${Date.now()}`,
        mandate_type: 'payment',
        agent_id: agentId,
        account_id: accountId,
        authorized_amount: budget,
        currency: 'USD',
        description: `Test mandate with $${budget} budget`,
      }),
    });

    const body = await res.json();
    expect(res.status).toBe(201);
    return { mandate: body.data, accountId, agentId };
  }

  /**
   * Helper: create a UCP checkout with optional mandate_id
   */
  async function createCheckout(totalCents: number, mandateId?: string, agentId?: string) {
    const body: any = {
      currency: 'USD',
      checkout_type: 'digital',
      line_items: [
        {
          id: `item_${Date.now()}`,
          name: 'Test Item',
          quantity: 1,
          unit_price: totalCents,
          total_price: totalCents,
        },
      ],
      buyer: sampleBuyer,
      payment_instruments: [
        { id: 'pi_test_usdc', handler: 'sly', type: 'usdc' },
      ],
      metadata: {
        ...(mandateId ? { mandate_id: mandateId } : {}),
      },
      ...(agentId ? { agent_id: agentId } : {}),
    };

    const res = await fetch(`${BASE_URL}/v1/ucp/checkouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    expect(res.status).toBe(201);
    // Response is wrapped: { success: true, data: { id, status, ... } }
    return data.data;
  }

  /**
   * Helper: complete a UCP checkout, returns { httpStatus, body }
   */
  async function completeCheckout(checkoutId: string) {
    const res = await fetch(`${BASE_URL}/v1/ucp/checkouts/${checkoutId}/complete`, {
      method: 'POST',
      headers,
    });
    return { httpStatus: res.status, body: await res.json() };
  }

  /**
   * Helper: get checkout by ID
   */
  async function getCheckout(checkoutId: string) {
    const res = await fetch(`${BASE_URL}/v1/ucp/checkouts/${checkoutId}`, { headers });
    const data = await res.json();
    // Response is wrapped: { success: true, data: { id, status, ... } }
    return data.data;
  }

  it('should block checkout when mandate budget is insufficient', async () => {
    // Create mandate with $10 budget
    const { mandate, agentId } = await createMandate(10, 'insufficient');

    // Create checkout for $15.00 (1500 cents) — exceeds $10 mandate
    const checkout = await createCheckout(1500, mandate.mandate_id, agentId);
    expect(checkout.status).toBe('ready_for_complete');

    // Attempt to complete → should fail
    const result = await completeCheckout(checkout.id);

    expect(result.httpStatus).toBe(500);
    expect(JSON.stringify(result.body)).toContain('Mandate budget exceeded');

    // Verify checkout reverted to ready_for_complete (retryable)
    const updated = await getCheckout(checkout.id);
    expect(updated.status).toBe('ready_for_complete');
  });

  it('should allow checkout when mandate budget is sufficient', async () => {
    // Create mandate with $50 budget
    const { mandate, agentId } = await createMandate(50, 'sufficient');

    // Create checkout for $15.00 — within $50 mandate
    const checkout = await createCheckout(1500, mandate.mandate_id, agentId);

    // Complete → should succeed
    const result = await completeCheckout(checkout.id);

    expect(result.httpStatus).toBe(200);
    // Success response: { success: true, data: { status, order_id, ... } }
    const completed = result.body.data || result.body;
    expect(completed.status).toBe('completed');
    expect(completed.order_id).toBeDefined();
  });

  it('should allow checkout without mandate (no regression)', async () => {
    // Create checkout with NO mandate_id
    const checkout = await createCheckout(1500);

    // Complete → should succeed normally
    const result = await completeCheckout(checkout.id);

    expect(result.httpStatus).toBe(200);
    const completed = result.body.data || result.body;
    expect(completed.status).toBe('completed');
  });

  it('should block second checkout when mandate budget is exhausted', async () => {
    // Create mandate with $20 budget
    const { mandate, agentId } = await createMandate(20, 'exhaust');

    // First checkout: $15 → should succeed (remaining: $5)
    const checkout1 = await createCheckout(1500, mandate.mandate_id, agentId);
    const result1 = await completeCheckout(checkout1.id);
    expect(result1.httpStatus).toBe(200);

    // Second checkout: $15 → should fail ($5 remaining < $15 required)
    const checkout2 = await createCheckout(1500, mandate.mandate_id, agentId);
    const result2 = await completeCheckout(checkout2.id);

    expect(result2.httpStatus).toBe(500);
    expect(JSON.stringify(result2.body)).toContain('Mandate budget exceeded');

    // Verify second checkout reverted to ready_for_complete
    const updated = await getCheckout(checkout2.id);
    expect(updated.status).toBe('ready_for_complete');
  });

  it('should include actionable guidance in budget error message', async () => {
    // Create mandate with $5 budget
    const { mandate, agentId } = await createMandate(5, 'guidance');

    // Create checkout for $15.00
    const checkout = await createCheckout(1500, mandate.mandate_id, agentId);

    // Complete → should fail with helpful message
    const result = await completeCheckout(checkout.id);

    expect(result.httpStatus).toBe(500);

    const errorStr = JSON.stringify(result.body);
    // Should mention remaining amount
    expect(errorStr).toContain('$5.00 remaining');
    // Should mention required amount
    expect(errorStr).toContain('$15.00 required');
    // Should suggest fix
    expect(errorStr).toMatch(/Increase the mandate|create a new mandate/i);
  });
});
