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

// Helper: detect UUID format to avoid Postgres cast errors on the UUID `id` column
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * Create a new payment mandate (writes to database)
 */
ap2.post('/mandates', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  // Accept both AP2 protocol fields and dashboard-friendly fields
  const account_id = body.account_id || body.payer_id;
  const agent_id = body.agent_id || body.payee_id;
  const mandate_type = body.mandate_type || body.type;
  const authorized_amount = body.authorized_amount ?? body.max_amount;
  const currency = body.currency || 'USDC';
  const mandate_id = body.mandate_id || body.mandateId || `mandate_${randomUUID().slice(0, 12)}`;

  if (!account_id || !agent_id) {
    throw new ValidationError('account_id and agent_id are required');
  }
  if (!authorized_amount || Number(authorized_amount) <= 0) {
    throw new ValidationError('authorized_amount must be a positive number');
  }
  if (!mandate_type || !['intent', 'cart', 'payment'].includes(mandate_type)) {
    throw new ValidationError('mandate_type must be one of: intent, cart, payment');
  }

  // Look up agent name
  const { data: agent } = await supabase
    .from('agents')
    .select('name')
    .eq('id', agent_id)
    .single();

  const { data: mandate, error } = await supabase
    .from('ap2_mandates')
    .insert({
      tenant_id: ctx.tenantId,
      account_id,
      mandate_id,
      mandate_type,
      agent_id,
      agent_name: body.agent_name || agent?.name || 'Unknown Agent',
      authorized_amount: Number(authorized_amount),
      currency,
      status: 'active',
      expires_at: body.expires_at || body.expiresAt || body.valid_until || null,
      mandate_data: body.mandate_data || {},
      metadata: body.metadata || {},
    })
    .select('*')
    .single();

  if (error) {
    throw new ValidationError(`Failed to create mandate: ${error.message}`);
  }

  return c.json({ data: mandate }, 201);
});

/**
 * GET /v1/ap2/mandates/:id
 * Get mandate details (reads from database)
 */
ap2.get('/mandates/:id', async (c) => {
  const id = c.req.param('id');
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Query by UUID id or user-defined mandate_id (avoid UUID cast error)
  const col = UUID_RE.test(id) ? 'id' : 'mandate_id';
  const { data: mandate, error } = await supabase
    .from('ap2_mandates')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq(col, id)
    .single();

  if (error || !mandate) {
    // Fallback to in-memory service for mandates created via API
    const mandateService = getAP2MandateService();
    const inMemMandate = await mandateService.getMandate(id);
    if (!inMemMandate) {
      return c.json({ error: 'Mandate not found' }, 404);
    }
    return c.json({ data: inMemMandate });
  }

  // Fetch executions for this mandate
  const { data: executions } = await supabase
    .from('ap2_mandate_executions')
    .select('*')
    .eq('mandate_id', mandate.id)
    .order('execution_index', { ascending: true });

  return c.json({ data: { ...mandate, executions: executions || [] } });
});

/**
 * PATCH /v1/ap2/mandates/:id
 * Update a mandate (authorized_amount, expires_at, status, metadata)
 */
ap2.patch('/mandates/:id', async (c) => {
  const id = c.req.param('id');
  const ctx = c.get('ctx');
  const supabase = createClient();

  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  // Build update object from allowed fields
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.authorized_amount !== undefined) updates.authorized_amount = Number(body.authorized_amount);
  if (body.status !== undefined) updates.status = body.status;
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
  if (body.metadata !== undefined) updates.metadata = body.metadata;
  if (body.mandate_data !== undefined) updates.mandate_data = body.mandate_data;

  // Look up by UUID id or user-defined mandate_id (avoid UUID cast error)
  const col = UUID_RE.test(id) ? 'id' : 'mandate_id';
  const { data: mandate, error } = await supabase
    .from('ap2_mandates')
    .update(updates)
    .eq(col, id)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error || !mandate) {
    return c.json({ error: error?.message || 'Mandate not found' }, 404);
  }

  return c.json({ data: mandate });
});

/**
 * PATCH /v1/ap2/mandates/:id/cancel
 * Cancel a mandate
 */
ap2.patch('/mandates/:id/cancel', async (c) => {
  const id = c.req.param('id');
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Look up by UUID id or user-defined mandate_id (avoid UUID cast error)
  const col = UUID_RE.test(id) ? 'id' : 'mandate_id';
  const { data: mandate, error } = await supabase
    .from('ap2_mandates')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq(col, id)
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'active')
    .select('*')
    .single();

  if (error || !mandate) {
    return c.json({ error: error?.message || 'Mandate not found or not active' }, 404);
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
 * List mandates for current tenant (reads from database)
 */
ap2.get('/mandates', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Parse query params
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const agentId = c.req.query('agent_id');
  const accountId = c.req.query('account_id');
  const search = c.req.query('search');
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('ap2_mandates')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (agentId) {
    query = query.eq('agent_id', agentId);
  }
  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  if (search) {
    query = query.or(`mandate_id.ilike.%${search}%,agent_name.ilike.%${search}%`);
  }

  const { data: mandates, error, count } = await query;

  if (error) {
    console.error('[AP2] List mandates error:', error);
    return c.json({ error: 'Failed to fetch mandates' }, 500);
  }

  const total = count || 0;

  return c.json({
    data: mandates || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /v1/ap2/mandates/:id/execute
 * Execute a payment against a mandate (updates used_amount, creates execution record)
 */
ap2.post('/mandates/:id/execute', async (c) => {
  const id = c.req.param('id');
  const ctx = c.get('ctx');
  const supabase = createClient();

  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  const { amount, currency, description, order_ids } = body;
  if (!amount || Number(amount) <= 0) {
    throw new ValidationError('amount must be a positive number');
  }

  // Look up by UUID id or user-defined mandate_id (avoid UUID cast error)
  const col = UUID_RE.test(id) ? 'id' : 'mandate_id';
  const { data: mandate, error: findError } = await supabase
    .from('ap2_mandates')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq(col, id)
    .single();

  if (findError || !mandate) {
    return c.json({ error: 'Mandate not found' }, 404);
  }

  if (mandate.status !== 'active') {
    return c.json({ error: `Mandate is ${mandate.status}, not active` }, 400);
  }

  const execAmount = Number(amount);
  const currentUsed = Number(mandate.used_amount || 0);
  const remaining = Number(mandate.authorized_amount) - currentUsed;

  if (execAmount > remaining) {
    return c.json({ error: 'Amount exceeds remaining mandate budget' }, 400);
  }

  const newExecIndex = (mandate.execution_count || 0) + 1;

  // Insert execution record — a DB trigger (update_ap2_mandate_usage) automatically
  // updates the mandate's used_amount, execution_count, and remaining_amount
  const { error: execError } = await supabase
    .from('ap2_mandate_executions')
    .insert({
      tenant_id: ctx.tenantId,
      mandate_id: id,
      execution_index: newExecIndex,
      amount: execAmount,
      currency: currency || mandate.currency,
      status: 'completed',
      completed_at: new Date().toISOString(),
      order_ids: Array.isArray(order_ids) && order_ids.length > 0 ? order_ids : null,
    });

  if (execError) {
    console.error('[AP2] Mandate execution insert error:', execError);
    return c.json({ error: 'Failed to execute mandate payment' }, 500);
  }

  const newUsed = currentUsed + execAmount;
  const newRemaining = Number(mandate.authorized_amount) - newUsed;

  // ============================================
  // Wallet deduction (settle funds from agent wallet)
  // ============================================
  let walletDeduction: { walletId: string; previousBalance: number; newBalance: number; transferId?: string } | null = null;

  // Find wallet managed by this agent or owned by the mandate's account
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance, currency, owner_account_id, status')
    .eq('tenant_id', ctx.tenantId)
    .or(`managed_by_agent_id.eq.${mandate.agent_id},owner_account_id.eq.${mandate.account_id}`)
    .eq('status', 'active')
    .order('managed_by_agent_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  if (wallet) {
    const currentBalance = Number(wallet.balance);
    if (currentBalance >= execAmount) {
      const updatedBalance = currentBalance - execAmount;
      const updatedStatus = updatedBalance === 0 ? 'depleted' : 'active';

      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({
          balance: updatedBalance,
          status: updatedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)
        .eq('tenant_id', ctx.tenantId);

      if (walletUpdateError) {
        console.error('[AP2] Wallet deduction error:', walletUpdateError);
      } else {
        // Create transfer record for audit trail
        const { data: transfer } = await supabase
          .from('transfers')
          .insert({
            tenant_id: ctx.tenantId,
            from_account_id: wallet.owner_account_id,
            amount: execAmount,
            currency: currency || mandate.currency,
            type: 'internal',
            status: 'completed',
            description: description || `Mandate execution #${newExecIndex}`,
            protocol_metadata: {
              protocol: 'ap2',
              wallet_id: wallet.id,
              operation: 'mandate_execution',
              mandate_id: mandate.id,
              execution_index: newExecIndex,
            },
          })
          .select('id')
          .single();

        walletDeduction = {
          walletId: wallet.id,
          previousBalance: currentBalance,
          newBalance: updatedBalance,
          transferId: transfer?.id,
        };

        // Update account balance to reflect wallet deduction
        const { data: account } = await supabase
          .from('accounts')
          .select('balance_total, balance_available')
          .eq('id', wallet.owner_account_id)
          .eq('tenant_id', ctx.tenantId)
          .single();

        if (account) {
          const newTotal = Math.max(0, Number(account.balance_total) - execAmount);
          const newAvailable = Math.max(0, Number(account.balance_available) - execAmount);
          await supabase
            .from('accounts')
            .update({
              balance_total: newTotal,
              balance_available: newAvailable,
              updated_at: new Date().toISOString(),
            })
            .eq('id', wallet.owner_account_id)
            .eq('tenant_id', ctx.tenantId);

          // Create ledger entry for audit trail
          await supabase
            .from('ledger_entries')
            .insert({
              tenant_id: ctx.tenantId,
              account_id: wallet.owner_account_id,
              type: 'debit',
              amount: execAmount,
              currency: currency || mandate.currency,
              balance_after: newTotal,
              reference_type: 'mandate_execution',
              reference_id: transfer?.id || mandate.id,
              description: description || `Mandate execution #${newExecIndex}`,
            });
        }
      }
    } else {
      console.warn(`[AP2] Wallet ${wallet.id} has insufficient balance (${currentBalance}) for execution amount (${execAmount})`);
    }
  }

  return c.json({
    data: {
      mandate_id: id,
      execution_index: newExecIndex,
      amount: execAmount,
      currency: currency || mandate.currency,
      status: 'completed',
      used_amount: newUsed,
      remaining_amount: newRemaining,
      description,
      order_ids: order_ids || [],
      wallet_deduction: walletDeduction,
    },
  }, 201);
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
