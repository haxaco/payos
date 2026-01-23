/**
 * Card Vaulting Routes
 * Epic 54: Card Vaulting for Agents
 *
 * API endpoints for:
 * - Storing cards for agent use
 * - Network tokenization (VTS, MDES)
 * - Agent card access management
 * - Spending limits and controls
 * - Transaction approvals
 */

import { Hono } from 'hono';
import { createClient } from '../../db/client.js';
import { ApiError, NotFoundError, ValidationError, ForbiddenError } from '../../middleware/error.js';
import type { RequestContext } from '../../middleware/auth.js';

const vault = new Hono<{ Variables: { ctx: RequestContext } }>();

// ============================================
// Card Vaulting
// ============================================

/**
 * POST /v1/cards/vault
 * Store a card for agent use
 */
vault.post('/', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();

  const {
    accountId,
    processorToken,
    processor,
    cardLastFour,
    cardBrand,
    expiryMonth,
    expiryYear,
    cardholderName,
    label,
    billingAddress,
    metadata,
  } = body;

  if (!accountId || !processorToken || !cardLastFour || !cardBrand || !expiryMonth || !expiryYear) {
    throw new ValidationError(
      'Missing required fields: accountId, processorToken, cardLastFour, cardBrand, expiryMonth, expiryYear'
    );
  }

  const supabase = createClient();

  // Verify account belongs to tenant
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (accountError || !account) {
    throw new NotFoundError('Account not found');
  }

  // Create vaulted card
  const { data: card, error } = await supabase
    .from('vaulted_cards')
    .insert({
      tenant_id: ctx.tenantId,
      account_id: accountId,
      processor: processor || 'stripe',
      processor_token: processorToken,
      card_last_four: cardLastFour,
      card_brand: cardBrand,
      card_expiry_month: expiryMonth,
      card_expiry_year: expiryYear,
      cardholder_name: cardholderName,
      label,
      billing_address: billingAddress,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create vaulted card:', error);
    throw new ApiError('Failed to vault card', 500);
  }

  return c.json(card, 201);
});

/**
 * GET /v1/cards/vault
 * List vaulted cards
 */
vault.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const accountId = c.req.query('accountId');
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = supabase
    .from('vaulted_cards')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError('Failed to fetch vaulted cards', 500);
  }

  // Remove sensitive processor tokens from response
  const safeData = (data || []).map((card) => ({
    ...card,
    processor_token: undefined,
  }));

  return c.json({
    data: safeData,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /v1/cards/vault/:id
 * Get a specific vaulted card
 */
vault.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const supabase = createClient();

  const { data: card, error } = await supabase
    .from('vaulted_cards')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId)
    .single();

  if (error || !card) {
    throw new NotFoundError('Vaulted card not found');
  }

  // Remove sensitive data
  return c.json({
    ...card,
    processor_token: undefined,
  });
});

/**
 * PATCH /v1/cards/vault/:id
 * Update a vaulted card
 */
vault.patch('/:id', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const body = await c.req.json();
  const supabase = createClient();

  const { label, status, metadata } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (label !== undefined) updates.label = label;
  if (status !== undefined) updates.status = status;
  if (metadata !== undefined) updates.metadata = metadata;

  const { data: card, error } = await supabase
    .from('vaulted_cards')
    .update(updates)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId)
    .select()
    .single();

  if (error || !card) {
    throw new NotFoundError('Vaulted card not found');
  }

  return c.json({
    ...card,
    processor_token: undefined,
  });
});

/**
 * DELETE /v1/cards/vault/:id
 * Remove a vaulted card
 */
vault.delete('/:id', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const supabase = createClient();

  // First revoke all agent access
  await supabase
    .from('agent_card_access')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('vaulted_card_id', cardId)
    .eq('tenant_id', ctx.tenantId);

  // Delete the card
  const { error } = await supabase
    .from('vaulted_cards')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId);

  if (error) {
    throw new ApiError('Failed to delete vaulted card', 500);
  }

  return c.json({ success: true });
});

// ============================================
// Network Tokenization
// ============================================

/**
 * POST /v1/cards/vault/:id/tokenize/visa
 * Create a Visa VTS token for a vaulted card
 */
vault.post('/:id/tokenize/visa', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const supabase = createClient();

  // Get card details
  const { data: card, error: cardError } = await supabase
    .from('vaulted_cards')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId)
    .single();

  if (cardError || !card) {
    throw new NotFoundError('Vaulted card not found');
  }

  if (card.card_brand !== 'visa') {
    throw new ValidationError('Card is not a Visa card');
  }

  if (card.visa_vts_token) {
    return c.json({
      tokenId: card.visa_vts_token,
      expiresAt: card.visa_vts_token_expiry,
      alreadyExists: true,
    });
  }

  // Get Visa credentials
  const { data: account, error } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', 'visa_vic')
    .eq('status', 'active')
    .single();

  if (error || !account) {
    throw new ApiError('Visa VIC not configured', 400);
  }

  // Create VTS token (in production, this would call Visa API)
  // For sandbox, generate a mock token
  const tokenId = `vts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // Update the card with the token
  await supabase
    .from('vaulted_cards')
    .update({
      visa_vts_token: tokenId,
      visa_vts_token_expiry: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  return c.json({
    tokenId,
    expiresAt,
    alreadyExists: false,
  }, 201);
});

/**
 * POST /v1/cards/vault/:id/tokenize/mastercard
 * Create a Mastercard MDES token for a vaulted card
 */
vault.post('/:id/tokenize/mastercard', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const body = await c.req.json();
  const supabase = createClient();

  const { mcAgentId } = body;

  if (!mcAgentId) {
    throw new ValidationError('mcAgentId is required');
  }

  // Get card details
  const { data: card, error: cardError } = await supabase
    .from('vaulted_cards')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId)
    .single();

  if (cardError || !card) {
    throw new NotFoundError('Vaulted card not found');
  }

  if (card.card_brand !== 'mastercard') {
    throw new ValidationError('Card is not a Mastercard');
  }

  if (card.mastercard_mdes_token) {
    return c.json({
      tokenReference: card.mastercard_mdes_token,
      expiresAt: card.mastercard_mdes_token_expiry,
      alreadyExists: true,
    });
  }

  // Verify agent is registered
  const { data: mcAgent, error: agentError } = await supabase
    .from('mastercard_agents')
    .select('mc_agent_id')
    .eq('tenant_id', ctx.tenantId)
    .eq('mc_agent_id', mcAgentId)
    .eq('agent_status', 'active')
    .single();

  if (agentError || !mcAgent) {
    throw new NotFoundError('Mastercard agent not found or not active');
  }

  // Create MDES token (in production, this would call Mastercard API)
  const tokenReference = `mdes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // Update the card with the token
  await supabase
    .from('vaulted_cards')
    .update({
      mastercard_mdes_token: tokenReference,
      mastercard_mdes_token_expiry: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  return c.json({
    tokenReference,
    expiresAt,
    alreadyExists: false,
  }, 201);
});

/**
 * GET /v1/cards/vault/:id/tokens
 * List network tokens for a vaulted card
 */
vault.get('/:id/tokens', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const supabase = createClient();

  const { data: card, error } = await supabase
    .from('vaulted_cards')
    .select('visa_vts_token, visa_vts_token_expiry, mastercard_mdes_token, mastercard_mdes_token_expiry')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId)
    .single();

  if (error || !card) {
    throw new NotFoundError('Vaulted card not found');
  }

  const tokens = [];

  if (card.visa_vts_token) {
    tokens.push({
      network: 'visa',
      tokenId: card.visa_vts_token,
      expiresAt: card.visa_vts_token_expiry,
    });
  }

  if (card.mastercard_mdes_token) {
    tokens.push({
      network: 'mastercard',
      tokenId: card.mastercard_mdes_token,
      expiresAt: card.mastercard_mdes_token_expiry,
    });
  }

  return c.json({ tokens });
});

// ============================================
// Agent Card Access
// ============================================

/**
 * POST /v1/cards/vault/:id/access
 * Grant an agent access to a vaulted card
 */
vault.post('/:id/access', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const body = await c.req.json();
  const supabase = createClient();

  const {
    agentId,
    canBrowse,
    canPurchase,
    perTransactionLimit,
    dailyLimit,
    monthlyLimit,
    allowedMccs,
    blockedMccs,
    requireApprovalAbove,
    autoApproveMerchants,
    validUntil,
  } = body;

  if (!agentId) {
    throw new ValidationError('agentId is required');
  }

  // Verify card exists
  const { data: card, error: cardError } = await supabase
    .from('vaulted_cards')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId)
    .single();

  if (cardError || !card) {
    throw new NotFoundError('Vaulted card not found');
  }

  // Verify agent exists
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new NotFoundError('Agent not found');
  }

  // Check if access already exists
  const { data: existing } = await supabase
    .from('agent_card_access')
    .select('id')
    .eq('agent_id', agentId)
    .eq('vaulted_card_id', cardId)
    .single();

  if (existing) {
    throw new ValidationError('Agent already has access to this card');
  }

  // Create access record
  const { data: access, error } = await supabase
    .from('agent_card_access')
    .insert({
      tenant_id: ctx.tenantId,
      agent_id: agentId,
      vaulted_card_id: cardId,
      can_browse: canBrowse !== false,
      can_purchase: canPurchase !== false,
      per_transaction_limit: perTransactionLimit,
      daily_limit: dailyLimit,
      monthly_limit: monthlyLimit,
      allowed_mccs: allowedMccs,
      blocked_mccs: blockedMccs,
      require_approval_above: requireApprovalAbove,
      auto_approve_merchants: autoApproveMerchants,
      valid_until: validUntil,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create agent card access:', error);
    throw new ApiError('Failed to grant access', 500);
  }

  return c.json(access, 201);
});

/**
 * GET /v1/cards/vault/:id/access
 * List agents with access to a vaulted card
 */
vault.get('/:id/access', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const supabase = createClient();

  const { data: accesses, error } = await supabase
    .from('agent_card_access')
    .select(`
      *,
      agents (
        id,
        name,
        status
      )
    `)
    .eq('tenant_id', ctx.tenantId)
    .eq('vaulted_card_id', cardId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError('Failed to fetch access records', 500);
  }

  return c.json({ data: accesses || [] });
});

/**
 * PATCH /v1/cards/vault/:id/access/:agentId
 * Update agent's access to a card
 */
vault.patch('/:id/access/:agentId', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const supabase = createClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.canBrowse !== undefined) updates.can_browse = body.canBrowse;
  if (body.canPurchase !== undefined) updates.can_purchase = body.canPurchase;
  if (body.perTransactionLimit !== undefined) updates.per_transaction_limit = body.perTransactionLimit;
  if (body.dailyLimit !== undefined) updates.daily_limit = body.dailyLimit;
  if (body.monthlyLimit !== undefined) updates.monthly_limit = body.monthlyLimit;
  if (body.allowedMccs !== undefined) updates.allowed_mccs = body.allowedMccs;
  if (body.blockedMccs !== undefined) updates.blocked_mccs = body.blockedMccs;
  if (body.requireApprovalAbove !== undefined) updates.require_approval_above = body.requireApprovalAbove;
  if (body.autoApproveMerchants !== undefined) updates.auto_approve_merchants = body.autoApproveMerchants;
  if (body.validUntil !== undefined) updates.valid_until = body.validUntil;
  if (body.status !== undefined) updates.status = body.status;

  const { data: access, error } = await supabase
    .from('agent_card_access')
    .update(updates)
    .eq('tenant_id', ctx.tenantId)
    .eq('vaulted_card_id', cardId)
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error || !access) {
    throw new NotFoundError('Agent card access not found');
  }

  return c.json(access);
});

/**
 * DELETE /v1/cards/vault/:id/access/:agentId
 * Revoke agent's access to a card
 */
vault.delete('/:id/access/:agentId', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const agentId = c.req.param('agentId');
  const supabase = createClient();

  const { error } = await supabase
    .from('agent_card_access')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .eq('vaulted_card_id', cardId)
    .eq('agent_id', agentId);

  if (error) {
    throw new ApiError('Failed to revoke access', 500);
  }

  return c.json({ success: true });
});

// ============================================
// Agent Card Access - Agent View
// ============================================

/**
 * GET /v1/agents/:agentId/cards
 * List cards an agent can access
 */
vault.get('/agents/:agentId/cards', async (c) => {
  const ctx = c.get('ctx');
  const agentId = c.req.param('agentId');
  const supabase = createClient();

  const { data: accesses, error } = await supabase
    .from('agent_card_access')
    .select(`
      *,
      vaulted_cards (
        id,
        card_brand,
        card_last_four,
        label,
        status
      )
    `)
    .eq('tenant_id', ctx.tenantId)
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError('Failed to fetch agent cards', 500);
  }

  return c.json({ data: accesses || [] });
});

// ============================================
// Payments
// ============================================

/**
 * POST /v1/cards/vault/:id/pay
 * Make a payment with a vaulted card (agent)
 */
vault.post('/:id/pay', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const body = await c.req.json();
  const supabase = createClient();

  const { agentId, amount, currency, merchantName, merchantDomain, merchantCategoryCode } = body;

  if (!agentId || !amount || !currency) {
    throw new ValidationError('Missing required fields: agentId, amount, currency');
  }

  // Check agent access and limits
  const { data: checkResult, error: checkError } = await supabase.rpc('check_agent_card_purchase', {
    p_agent_id: agentId,
    p_vaulted_card_id: cardId,
    p_amount: amount,
    p_merchant_category_code: merchantCategoryCode,
  });

  if (checkError) {
    throw new ApiError('Failed to check purchase eligibility', 500);
  }

  const result = checkResult?.[0];
  if (!result?.allowed) {
    throw new ForbiddenError(result?.reason || 'Purchase not allowed');
  }

  // Get card for network selection
  const { data: card, error: cardError } = await supabase
    .from('vaulted_cards')
    .select('card_brand, visa_vts_token, mastercard_mdes_token')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', cardId)
    .single();

  if (cardError || !card) {
    throw new NotFoundError('Vaulted card not found');
  }

  const network = card.card_brand === 'mastercard' ? 'mastercard' : 'visa';
  const networkToken = network === 'visa' ? card.visa_vts_token : card.mastercard_mdes_token;

  // Record the transaction
  const { data: transactionId, error: txnError } = await supabase.rpc('record_agent_card_transaction', {
    p_tenant_id: ctx.tenantId,
    p_agent_id: agentId,
    p_vaulted_card_id: cardId,
    p_amount: amount,
    p_currency: currency,
    p_merchant_name: merchantName,
    p_merchant_category_code: merchantCategoryCode,
    p_network: network,
    p_requires_approval: result.requires_approval,
  });

  if (txnError) {
    throw new ApiError('Failed to record transaction', 500);
  }

  // If approval is required, return pending status
  if (result.requires_approval) {
    return c.json({
      transactionId,
      status: 'pending_approval',
      requiresApproval: true,
      message: 'Transaction requires approval before processing',
    }, 202);
  }

  // Process the payment (in production, this would call card networks)
  // For sandbox, simulate success
  await supabase
    .from('vaulted_card_transactions')
    .update({
      status: 'completed',
      network_token_used: networkToken,
      authorization_code: `AUTH_${Date.now().toString(36).toUpperCase()}`,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  return c.json({
    transactionId,
    status: 'completed',
    network,
    authorizationCode: `AUTH_${Date.now().toString(36).toUpperCase()}`,
  }, 201);
});

// ============================================
// Transaction Approvals
// ============================================

/**
 * GET /v1/cards/approvals
 * List pending transaction approvals
 */
vault.get('/approvals', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const { data: approvals, error } = await supabase
    .from('vaulted_card_transactions')
    .select(`
      *,
      agents (
        id,
        name
      ),
      vaulted_cards (
        id,
        card_brand,
        card_last_four,
        label
      )
    `)
    .eq('tenant_id', ctx.tenantId)
    .eq('required_approval', true)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError('Failed to fetch approvals', 500);
  }

  return c.json({ data: approvals || [] });
});

/**
 * POST /v1/cards/approvals/:txId/approve
 * Approve a pending transaction
 */
vault.post('/approvals/:txId/approve', async (c) => {
  const ctx = c.get('ctx');
  const txId = c.req.param('txId');
  const body = await c.req.json();
  const supabase = createClient();

  const { notes } = body;

  // Verify user has permission to approve
  if (ctx.actorType !== 'user') {
    throw new ForbiddenError('Only users can approve transactions');
  }

  // Get transaction
  const { data: txn, error: txnError } = await supabase
    .from('vaulted_card_transactions')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', txId)
    .eq('status', 'pending')
    .single();

  if (txnError || !txn) {
    throw new NotFoundError('Pending transaction not found');
  }

  // Update spending
  const { data: access } = await supabase
    .from('agent_card_access')
    .select('id')
    .eq('agent_id', txn.agent_id)
    .eq('vaulted_card_id', txn.vaulted_card_id)
    .single();

  if (access) {
    await supabase
      .from('agent_card_access')
      .update({
        daily_spent: supabase.rpc('add_decimal', { a: 'daily_spent', b: txn.amount }),
        monthly_spent: supabase.rpc('add_decimal', { a: 'monthly_spent', b: txn.amount }),
        total_spent: supabase.rpc('add_decimal', { a: 'total_spent', b: txn.amount }),
        transaction_count: supabase.rpc('increment', { x: 1 }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', access.id);
  }

  // Approve and process
  const { data: updatedTxn, error } = await supabase
    .from('vaulted_card_transactions')
    .update({
      status: 'completed',
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      approval_notes: notes,
      authorization_code: `AUTH_${Date.now().toString(36).toUpperCase()}`,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', txId)
    .select()
    .single();

  if (error) {
    throw new ApiError('Failed to approve transaction', 500);
  }

  return c.json(updatedTxn);
});

/**
 * POST /v1/cards/approvals/:txId/decline
 * Decline a pending transaction
 */
vault.post('/approvals/:txId/decline', async (c) => {
  const ctx = c.get('ctx');
  const txId = c.req.param('txId');
  const body = await c.req.json();
  const supabase = createClient();

  const { reason } = body;

  // Verify user has permission
  if (ctx.actorType !== 'user') {
    throw new ForbiddenError('Only users can decline transactions');
  }

  const { data: updatedTxn, error } = await supabase
    .from('vaulted_card_transactions')
    .update({
      status: 'declined',
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      approval_notes: reason || 'Declined by user',
      decline_reason: reason || 'Declined by user',
      decline_code: 'USER_DECLINED',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', txId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !updatedTxn) {
    throw new NotFoundError('Pending transaction not found');
  }

  return c.json(updatedTxn);
});

// ============================================
// Transaction History
// ============================================

/**
 * GET /v1/cards/vault/:id/transactions
 * Get transactions for a vaulted card
 */
vault.get('/:id/transactions', async (c) => {
  const ctx = c.get('ctx');
  const cardId = c.req.param('id');
  const supabase = createClient();

  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  const { data, count, error } = await supabase
    .from('vaulted_card_transactions')
    .select(`
      *,
      agents (
        id,
        name
      )
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .eq('vaulted_card_id', cardId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiError('Failed to fetch transactions', 500);
  }

  return c.json({
    data: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

export { vault };
export default vault;
