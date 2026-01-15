/**
 * AP2 (Agent-to-Agent Protocol) Routes
 * 
 * Google's protocol for agentic payments.
 * 
 * @see Story 40.14: AP2 Reference Setup
 */

import { Hono } from 'hono';
import { getAP2MandateService } from '../services/ap2/index.js';
import { ValidationError } from '../middleware/error.js';
import { randomUUID } from 'crypto';

const ap2 = new Hono();

// =============================================================================
// Discovery
// =============================================================================

/**
 * GET /v1/ap2/agent-card
 * Agent discovery endpoint
 */
ap2.get('/agent-card', async (c) => {
  const mandateService = getAP2MandateService();
  const card = mandateService.getAgentCard();
  
  return c.json({ data: card });
});

// =============================================================================
// Mandates
// =============================================================================

/**
 * POST /v1/ap2/mandates
 * Create a new payment mandate
 */
ap2.post('/mandates', async (c) => {
  const ctx = c.get('ctx');
  
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const { 
    payer_id, 
    payer_name,
    payee_id, 
    payee_name, 
    payee_account,
    type,
    max_amount,
    currency,
    frequency,
    max_occurrences,
    valid_from,
    valid_until,
  } = body;
  
  if (!payer_id || !payee_id || !payee_name) {
    throw new ValidationError('payer_id, payee_id, and payee_name are required');
  }
  
  const mandateService = getAP2MandateService();
  
  const mandate = await mandateService.createMandate({
    payer_id,
    payer_name,
    payee_id,
    payee_name,
    payee_account,
    type,
    max_amount,
    currency,
    frequency,
    max_occurrences,
    valid_from,
    valid_until,
  });
  
  return c.json({ data: mandate }, 201);
});

/**
 * GET /v1/ap2/mandates/:id
 * Get mandate details
 */
ap2.get('/mandates/:id', async (c) => {
  const id = c.req.param('id');
  const mandateService = getAP2MandateService();
  
  const mandate = await mandateService.getMandate(id);
  
  if (!mandate) {
    return c.json({ error: 'Mandate not found' }, 404);
  }
  
  return c.json({ data: mandate });
});

/**
 * POST /v1/ap2/mandates/:id/activate
 * Activate a mandate
 */
ap2.post('/mandates/:id/activate', async (c) => {
  const id = c.req.param('id');
  
  let body: { credential?: any } = {};
  try {
    body = await c.req.json();
  } catch {
    // Credential is optional
  }
  
  const mandateService = getAP2MandateService();
  
  try {
    const mandate = await mandateService.activateMandate(id, body.credential);
    return c.json({ data: mandate });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * POST /v1/ap2/mandates/:id/suspend
 * Suspend a mandate
 */
ap2.post('/mandates/:id/suspend', async (c) => {
  const id = c.req.param('id');
  
  let body: { reason?: string } = {};
  try {
    body = await c.req.json();
  } catch {}
  
  const mandateService = getAP2MandateService();
  
  try {
    const mandate = await mandateService.suspendMandate(id, body.reason);
    return c.json({ data: mandate });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * POST /v1/ap2/mandates/:id/revoke
 * Revoke a mandate
 */
ap2.post('/mandates/:id/revoke', async (c) => {
  const id = c.req.param('id');
  const mandateService = getAP2MandateService();
  
  try {
    const mandate = await mandateService.revokeMandate(id);
    return c.json({ data: mandate });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * GET /v1/ap2/mandates
 * List mandates for current user
 */
ap2.get('/mandates', async (c) => {
    const ctx = c.get('ctx');
  const payer_id = c.req.query('payer_id') || ctx.tenantId;
  
  const mandateService = getAP2MandateService();
  const mandates = await mandateService.listMandates(payer_id);
  
  return c.json({ data: mandates });
});

// =============================================================================
// Payments
// =============================================================================

/**
 * POST /v1/ap2/payments
 * Request payment using a mandate
 */
ap2.post('/payments', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const { mandate_id, amount, currency, description, reference, destination, metadata } = body;
  
  if (!mandate_id || !amount || !currency) {
    throw new ValidationError('mandate_id, amount, and currency are required');
  }
  
  const mandateService = getAP2MandateService();
  
  const response = await mandateService.requestPayment({
    id: `req_${randomUUID()}`,
    mandate_id,
    amount,
    currency,
    description,
    reference,
    destination,
    metadata,
  });
  
  return c.json({ data: response }, response.status === 'rejected' ? 400 : 201);
});

/**
 * GET /v1/ap2/payments/:id
 * Get payment status
 */
ap2.get('/payments/:id', async (c) => {
  const id = c.req.param('id');
  const mandateService = getAP2MandateService();
  
  const payment = await mandateService.getPayment(id);
  
  if (!payment) {
    return c.json({ error: 'Payment not found' }, 404);
  }
  
  return c.json({ data: payment });
});

/**
 * POST /v1/ap2/payments/:id/settle
 * Trigger settlement for an authorized payment
 */
ap2.post('/payments/:id/settle', async (c) => {
  const id = c.req.param('id');
  const mandateService = getAP2MandateService();
  
  const payment = await mandateService.getPayment(id);
  
  if (!payment) {
    return c.json({ error: 'Payment not found' }, 404);
  }
  
  if (payment.status !== 'authorized') {
    return c.json({ 
      error: `Cannot settle payment in ${payment.status} status` 
    }, 400);
  }
  
  // Update to processing
  const updated = await mandateService.updatePayment(id, {
    status: 'processing',
  });
  
  // In real implementation, this would trigger actual settlement
  // For PoC, simulate completion after short delay
  setTimeout(async () => {
    await mandateService.updatePayment(id, {
      status: 'completed',
      transfer_id: `txn_${randomUUID()}`,
    });
  }, 1000);

    return c.json({
    data: updated,
    message: 'Settlement initiated',
  });
});

export default ap2;
