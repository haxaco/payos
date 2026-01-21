/**
 * AP2 (Agent-to-Agent Protocol) Routes
 * 
 * Google's protocol for agentic payments.
 * 
 * @see Story 40.14: AP2 Reference Setup
 * @see Story 18.R3: Multi-Protocol Spending Policy Integration
 */

import { Hono } from 'hono';
import { getAP2MandateService } from '../services/ap2/index.js';
import { ValidationError } from '../middleware/error.js';
import { randomUUID } from 'crypto';
import { createClient } from '../db/client.js';
import { 
  createSpendingPolicyService,
  type PolicyContext 
} from '../services/spending-policy.js';
import { 
  createApprovalWorkflowService 
} from '../services/approval-workflow.js';

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
 * 
 * Story 18.R3: Includes spending policy checks for agent wallets
 */
ap2.post('/payments', async (c) => {
  const ctx = c.get('ctx');
  
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const { mandate_id, amount, currency, description, reference, destination, metadata, wallet_id } = body;
  
  if (!mandate_id || !amount || !currency) {
    throw new ValidationError('mandate_id, amount, and currency are required');
  }

  const supabase = createClient();
  const mandateService = getAP2MandateService();

  // Get mandate to check payer info
  const mandate = await mandateService.getMandate(mandate_id);
  if (!mandate) {
    return c.json({ error: 'Mandate not found' }, 404);
  }

  // ============================================
  // SPENDING POLICY CHECK (Story 18.R3)
  // ============================================
  // If wallet_id is provided or we can resolve agent wallet, check spending policy
  
  let walletId = wallet_id;
  
  // Try to find agent wallet if not provided
  if (!walletId && mandate.payer.agent_id) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('managed_by_agent_id', mandate.payer.agent_id)
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'active')
      .single();
    
    if (wallet) {
      walletId = wallet.id;
    }
  }

  // Check spending policy if we have a wallet
  if (walletId) {
    const spendingPolicyService = createSpendingPolicyService(supabase);
    const approvalWorkflowService = createApprovalWorkflowService(supabase);
    
    const policyContext: PolicyContext = {
      protocol: 'ap2',
      vendor: mandate.payee.name,
      mandateId: mandate_id,
    };

    const policyCheck = await spendingPolicyService.checkPolicy(
      walletId,
      amount,
      policyContext
    );

    if (!policyCheck.allowed) {
      if (policyCheck.requiresApproval) {
        // Create approval request
        const approval = await approvalWorkflowService.createApproval({
          tenantId: ctx.tenantId,
          walletId,
          agentId: mandate.payer.agent_id,
          protocol: 'ap2',
          amount,
          currency,
          recipient: {
            mandate_id,
            merchant: mandate.payee.name,
          },
          paymentContext: {
            mandate_id,
            amount,
            currency,
            description,
            reference,
            destination,
            metadata,
            mandate: {
              id: mandate.id,
              payee: mandate.payee,
              payer: mandate.payer,
            },
          },
          requestedByType: ctx.actorType,
          requestedById: ctx.userId || ctx.apiKeyId || ctx.actorId || 'unknown',
          requestedByName: ctx.userName || ctx.actorName || undefined,
        });

        return c.json({
          status: 'pending_approval',
          message: 'Payment requires approval',
          reason: policyCheck.reason,
          code: 'APPROVAL_REQUIRED',
          approval: {
            id: approval.id,
            expiresAt: approval.expiresAt,
            amount: approval.amount,
            currency: approval.currency,
          }
        }, 202);
      }

      // Hard limit exceeded
      return c.json({
        error: 'Payment blocked by spending policy',
        reason: policyCheck.reason,
        code: 'POLICY_VIOLATION',
        violationType: policyCheck.violationType,
      }, 403);
    }
  }

  // Proceed with mandate payment
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

  // Record spending if payment authorized and we have a wallet
  if (walletId && response.status === 'authorized') {
    const spendingPolicyService = createSpendingPolicyService(supabase);
    await spendingPolicyService.recordSpending(walletId, amount);
  }
  
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

// =============================================================================
// Analytics
// =============================================================================

/**
 * GET /v1/ap2/analytics
 * AP2-specific analytics
 */
ap2.get('/analytics', async (c) => {
  try {
    const ctx = c.get('ctx');
    const period = c.req.query('period') || '30d';
    const supabase = createClient();

    // Calculate date range
    const end = new Date();
    const start = new Date();
    switch (period) {
      case '24h': start.setHours(start.getHours() - 24); break;
      case '7d': start.setDate(start.getDate() - 7); break;
      case '30d': start.setDate(start.getDate() - 30); break;
      case '90d': start.setDate(start.getDate() - 90); break;
      case '1y': start.setFullYear(start.getFullYear() - 1); break;
    }
    
    // Fetch AP2 transfers (these come from mandate payments)
    const { data: transfers } = await supabase
      .from('transfers')
      .select('id, amount, fee_amount, created_at, protocol_metadata')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'ap2')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Fetch AP2 mandates from database (if stored there)
    const { data: mandates } = await supabase
      .from('ap2_mandates')
      .select('*')
      .eq('tenant_id', ctx.tenantId);

    // Calculate revenue and fees
    const revenue = transfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const fees = transfers?.reduce((sum, t) => sum + parseFloat(t.fee_amount || '0'), 0) || 0;

    // Mandate stats (from DB or empty if table doesn't exist)
    const mandateList = mandates || [];
    const activeMandates = mandateList.filter((m: any) => m.status === 'active').length;
    const revokedMandates = mandateList.filter((m: any) => m.status === 'revoked').length;
    const totalAuthorized = mandateList.reduce((sum: number, m: any) => sum + parseFloat(m.authorized_amount || '0'), 0);
    const totalUsed = mandateList.reduce((sum: number, m: any) => sum + parseFloat(m.used_amount || '0'), 0);

    // Unique agents and accounts
    const uniqueAgents = new Set(mandateList.map((m: any) => m.agent_id).filter(Boolean)).size;
    const uniqueAccounts = new Set(mandateList.map((m: any) => m.account_id).filter(Boolean)).size;

    return c.json({
      data: {
        period,
        summary: {
          totalRevenue: parseFloat(revenue.toFixed(8)),
          totalFees: parseFloat(fees.toFixed(8)),
          netRevenue: parseFloat((revenue - fees).toFixed(8)),
          transactionCount: transfers?.length || 0,
          totalMandates: mandateList.length,
          activeMandates,
          revokedMandates,
          totalAuthorized: parseFloat(totalAuthorized.toFixed(8)),
          totalUsed: parseFloat(totalUsed.toFixed(8)),
          utilizationRate: totalAuthorized > 0 ? parseFloat(((totalUsed / totalAuthorized) * 100).toFixed(2)) : 0,
          uniqueAgents,
          uniqueAccounts,
        },
        mandatesByStatus: {
          active: activeMandates,
          revoked: revokedMandates,
          pending: mandateList.filter((m: any) => m.status === 'pending').length,
        },
        paymentsByStatus: {
          completed: transfers?.length || 0,
          pending: 0,
          failed: 0,
          pending_approval: 0,
        },
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('[AP2] Analytics error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default ap2;
