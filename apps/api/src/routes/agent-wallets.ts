/**
 * Agent Wallet Policy Routes
 *
 * Epic 18: Agent Wallets & Contract Policies
 *
 * Convenience routes (Story 18.2):
 *   GET    /v1/agents/:agentId/wallet           — get agent's wallet
 *   POST   /v1/agents/:agentId/wallet/freeze     — freeze wallet
 *   POST   /v1/agents/:agentId/wallet/unfreeze   — unfreeze wallet
 *   PUT    /v1/agents/:agentId/wallet/policy      — set contract policy
 *
 * Negotiation guardrails (Story 18.9):
 *   POST   /v1/agents/:agentId/wallet/policy/evaluate — dry-run policy evaluation
 *
 * Exposure & audit (Story 18.8):
 *   GET    /v1/agents/:agentId/wallet/exposures — list counterparty exposures
 *   GET    /v1/agents/:agentId/wallet/policy/evaluations — audit log
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { createContractPolicyEngine } from '../services/contract-policy-engine.js';
import { createCounterpartyExposureService } from '../services/counterparty-exposure.service.js';
import { negotiationEvaluateRequestSchema, contractPolicySchema } from '../schemas/contract-policy.schema.js';
import { invalidatePolicyCache } from '../services/spending-policy.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';
import { isValidUUID, getPaginationParams, paginationResponse, getEnv } from '../utils/helpers.js';
import { cascadeRevokeForAgent } from '../services/auth/scopes/index.js';
import { guardSiblingScope } from '../services/auth/scopes/guard.js';

function mapWalletFromDb(row: any) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    owner_account_id: row.owner_account_id,
    managed_by_agent_id: row.managed_by_agent_id,
    balance: parseFloat(row.balance),
    currency: row.currency,
    spending_policy: row.spending_policy,
    wallet_address: row.wallet_address,
    network: row.network,
    status: row.status,
    name: row.name,
    purpose: row.purpose,
    wallet_type: row.wallet_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const agentWallets = new Hono();

// ============================================
// Helper: find agent's managed wallet
// ============================================

async function getAgentWallet(supabase: any, agentId: string, tenantId: string, environment?: string, requireActive = false) {
  let query = supabase
    .from('wallets')
    .select('*')
    .eq('managed_by_agent_id', agentId)
    .eq('tenant_id', tenantId);

  if (environment) {
    query = query.eq('environment', environment);
  }

  if (requireActive) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data;
}

// ============================================
// GET /agents/:agentId/wallet
// Story 18.2: Get agent's wallet (convenience)
// ============================================

agentWallets.get('/:agentId/wallet', async (c) => {
  const ctx = c.get('ctx');
  const { agentId } = c.req.param();

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const supabase: any = createClient();
  const wallet = await getAgentWallet(supabase, agentId, ctx.tenantId, getEnv(ctx));

  if (!wallet) {
    throw new NotFoundError('Agent does not have a wallet');
  }

  return c.json(mapWalletFromDb(wallet));
});

// ============================================
// POST /agents/:agentId/wallet/freeze
// Story 18.2: Freeze agent's wallet
// ============================================

agentWallets.post('/:agentId/wallet/freeze', async (c) => {
  const ctx = c.get('ctx');
  const { agentId } = c.req.param();

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const supabase: any = createClient();

  // Epic 82 — freezing a sibling agent's wallet requires tenant_write.
  // (Freezing your own wallet is allowed because you're locking down
  // your own movement; freezing a sibling is admin-style action.)
  const denied = await guardSiblingScope(c, supabase, agentId, 'tenant_write', `POST /v1/agents/${agentId}/wallet/freeze`);
  if (denied) return denied;

  const wallet = await getAgentWallet(supabase, agentId, ctx.tenantId, getEnv(ctx));

  if (!wallet) {
    throw new NotFoundError('Agent does not have a wallet');
  }

  if (wallet.status === 'frozen') {
    return c.json(mapWalletFromDb(wallet));
  }

  const { data: updated, error } = await supabase
    .from('wallets')
    .update({ status: 'frozen', updated_at: new Date().toISOString() })
    .eq('id', wallet.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) throw new Error('Failed to freeze wallet');

  // Epic 82 — freezing the wallet pulls every elevated scope this
  // agent holds. A frozen wallet means the agent shouldn't be moving
  // money OR mutating sibling agent state.
  try {
    await cascadeRevokeForAgent(
      supabase,
      ctx.tenantId,
      agentId,
      ctx.userId || ctx.actorId || 'system',
    );
  } catch (err) {
    console.error('[wallet/freeze] scope cascade failed:', err);
  }

  return c.json(mapWalletFromDb(updated));
});

// ============================================
// POST /agents/:agentId/wallet/unfreeze
// Story 18.2: Unfreeze agent's wallet
// ============================================

agentWallets.post('/:agentId/wallet/unfreeze', async (c) => {
  const ctx = c.get('ctx');
  const { agentId } = c.req.param();

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const supabase: any = createClient();

  // Epic 82 — unfreezing a sibling requires tenant_write.
  const denied = await guardSiblingScope(c, supabase, agentId, 'tenant_write', `POST /v1/agents/${agentId}/wallet/unfreeze`);
  if (denied) return denied;

  const wallet = await getAgentWallet(supabase, agentId, ctx.tenantId, getEnv(ctx));

  if (!wallet) {
    throw new NotFoundError('Agent does not have a wallet');
  }

  if (wallet.status === 'active') {
    return c.json(mapWalletFromDb(wallet));
  }

  const { data: updated, error } = await supabase
    .from('wallets')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', wallet.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) throw new Error('Failed to unfreeze wallet');
  return c.json(mapWalletFromDb(updated));
});

// ============================================
// PUT /agents/:agentId/wallet/policy
// Story 18.2: Set contract policy on agent's wallet
// ============================================

const setPolicySchema = z.object({
  dailySpendLimit: z.number().positive().optional(),
  monthlySpendLimit: z.number().positive().optional(),
  requiresApprovalAbove: z.number().positive().optional(),
  approvedVendors: z.array(z.string()).optional(),
  approvedCategories: z.array(z.string()).optional(),
  approvedEndpoints: z.array(z.string()).optional(),
  contractPolicy: contractPolicySchema.optional(),
});

agentWallets.put('/:agentId/wallet/policy', async (c) => {
  const ctx = c.get('ctx');
  const { agentId } = c.req.param();

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const body = await c.req.json();
  const parsed = setPolicySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid policy', parsed.error.format());
  }

  const supabase: any = createClient();

  // Epic 82 — modifying a sibling agent's spending policy requires
  // tenant_write. Setting your own policy stays unrestricted.
  const denied = await guardSiblingScope(c, supabase, agentId, 'tenant_write', `PUT /v1/agents/${agentId}/wallet/policy`);
  if (denied) return denied;

  const wallet = await getAgentWallet(supabase, agentId, ctx.tenantId, getEnv(ctx));

  if (!wallet) {
    throw new NotFoundError('Agent does not have a wallet');
  }

  // Merge with existing policy (keep counters like dailySpent)
  const existingPolicy = wallet.spending_policy || {};
  const mergedPolicy = {
    ...existingPolicy,
    ...parsed.data,
    // Preserve spend counters
    dailySpent: existingPolicy.dailySpent || 0,
    monthlySpent: existingPolicy.monthlySpent || 0,
    dailyResetAt: existingPolicy.dailyResetAt,
    monthlyResetAt: existingPolicy.monthlyResetAt,
  };

  const { data: updated, error } = await supabase
    .from('wallets')
    .update({
      spending_policy: mergedPolicy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) throw new Error('Failed to update policy');

  invalidatePolicyCache(wallet.id);

  return c.json({
    wallet_id: updated.id,
    spending_policy: updated.spending_policy,
  });
});

// ============================================
// POST /agents/:agentId/wallet/policy/evaluate
// Story 18.9: Negotiation guardrails — dry-run policy evaluation
// ============================================

agentWallets.post('/:agentId/wallet/policy/evaluate', async (c) => {
  const ctx = c.get('ctx');
  const { agentId } = c.req.param();

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const body = await c.req.json();
  const parsed = negotiationEvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid request body', parsed.error.format());
  }

  const supabase: any = createClient();

  // Find the agent's wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('managed_by_agent_id', agentId)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .eq('status', 'active')
    .maybeSingle();

  if (!wallet) {
    throw new NotFoundError('Agent does not have an active wallet');
  }

  const engine = createContractPolicyEngine(supabase);
  const result = await engine.evaluate({
    walletId: wallet.id,
    agentId,
    tenantId: ctx.tenantId,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    actionType: parsed.data.action_type,
    contractType: parsed.data.contract_type,
    counterpartyAgentId: parsed.data.counterparty_agent_id,
    counterpartyAddress: parsed.data.counterparty_address,
    protocol: parsed.data.protocol,
    correlationId: c.get('requestId'),
    dryRun: true,
  });

  return c.json({
    decision: result.decision,
    reasons: result.reasons,
    checks: result.checks,
    suggested_counter_offer: result.suggestedCounterOffer
      ? { max_amount: result.suggestedCounterOffer.maxAmount, reason: result.suggestedCounterOffer.reason }
      : null,
    evaluation_ms: result.evaluationMs,
  });
});

// ============================================
// GET /agents/:agentId/wallet/exposures
// Story 18.8: List counterparty exposures for an agent's wallet
// ============================================

agentWallets.get('/:agentId/wallet/exposures', async (c) => {
  const ctx = c.get('ctx');
  const { agentId } = c.req.param();

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const supabase: any = createClient();

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('managed_by_agent_id', agentId)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .eq('status', 'active')
    .maybeSingle();

  if (!wallet) {
    throw new NotFoundError('Agent does not have an active wallet');
  }

  const exposureService = createCounterpartyExposureService(supabase);
  const exposures = await exposureService.listExposures(wallet.id, ctx.tenantId);

  return c.json({
    data: exposures.map((e) => ({
      id: e.id,
      wallet_id: e.walletId,
      counterparty_agent_id: e.counterpartyAgentId,
      counterparty_address: e.counterpartyAddress,
      exposure_24h: e.exposure24h,
      exposure_7d: e.exposure7d,
      exposure_30d: e.exposure30d,
      active_contracts: e.activeContracts,
      active_escrows: e.activeEscrows,
      total_volume: e.totalVolume,
      transaction_count: e.transactionCount,
      currency: e.currency,
    })),
  });
});

// ============================================
// GET /agents/:agentId/wallet/policy/evaluations
// Audit log of policy decisions
// ============================================

agentWallets.get('/:agentId/wallet/policy/evaluations', async (c) => {
  const ctx = c.get('ctx');
  const { agentId } = c.req.param();

  if (!isValidUUID(agentId)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const { page, limit } = getPaginationParams(c);
  const supabase: any = createClient();

  // Find wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('managed_by_agent_id', agentId)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .maybeSingle();

  if (!wallet) {
    throw new NotFoundError('Agent does not have a wallet');
  }

  // Query evaluations
  const countQuery = supabase
    .from('policy_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('wallet_id', wallet.id)
    .eq('tenant_id', ctx.tenantId);

  const dataQuery = supabase
    .from('policy_evaluations')
    .select('*')
    .eq('wallet_id', wallet.id)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
  const total = countResult.count || 0;

  return c.json({
    data: (dataResult.data || []).map((row: any) => ({
      id: row.id,
      action_type: row.action_type,
      amount: parseFloat(row.amount),
      currency: row.currency,
      contract_type: row.contract_type,
      counterparty_agent_id: row.counterparty_agent_id,
      counterparty_address: row.counterparty_address,
      decision: row.decision,
      decision_reasons: row.decision_reasons,
      suggested_counter_offer: row.suggested_counter_offer,
      checks_performed: row.checks_performed,
      evaluation_ms: row.evaluation_ms,
      created_at: row.created_at,
    })),
    pagination: paginationResponse(page, limit, total),
  });
});

// ============================================
// Agent Self-Funding
// ============================================

const requestFundsSchema = z.object({
  amount: z.number().positive().max(100000),
  source_wallet_id: z.string().uuid().optional(),
});

/**
 * POST /v1/agents/:agentId/wallet/request-funds
 *
 * Agent requests USDC from its parent account's wallet.
 * If no source_wallet_id is provided, uses the parent account's primary wallet.
 */
agentWallets.post('/:agentId/wallet/request-funds', async (c) => {
  const ctx = c.get('ctx') as any;
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const parsed = requestFundsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase: any = createClient();
    const env = getEnv(ctx);

    // Get agent and its wallet
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, parent_account_id, tenant_id, wallet_id')
      .eq('id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (agentError || !agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // Get agent's wallet
    const agentWalletId = agent.wallet_id;
    if (!agentWalletId) {
      return c.json({ error: 'Agent has no wallet. Create one first.' }, 400);
    }

    const { data: agentWallet, error: agentWalletError } = await supabase
      .from('wallets')
      .select('id, balance, currency, status')
      .eq('id', agentWalletId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (agentWalletError || !agentWallet) {
      return c.json({ error: 'Agent wallet not found' }, 404);
    }

    if (agentWallet.status !== 'active') {
      return c.json({ error: `Agent wallet is ${agentWallet.status}` }, 400);
    }

    // Find source wallet
    let sourceWalletId = parsed.data.source_wallet_id;

    if (!sourceWalletId && agent.parent_account_id) {
      // Find parent account's primary wallet
      const { data: parentWallets } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('owner_account_id', agent.parent_account_id)
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'active')
        .order('balance', { ascending: false })
        .limit(1);

      if (parentWallets && parentWallets.length > 0) {
        sourceWalletId = parentWallets[0].id;
      }
    }

    if (!sourceWalletId) {
      return c.json({ error: 'No source wallet available. Provide source_wallet_id or ensure parent account has a funded wallet.' }, 400);
    }

    // Get source wallet and check balance
    const { data: sourceWallet, error: sourceError } = await supabase
      .from('wallets')
      .select('id, balance, currency, status')
      .eq('id', sourceWalletId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (sourceError || !sourceWallet) {
      return c.json({ error: 'Source wallet not found' }, 404);
    }

    const sourceBalance = parseFloat(sourceWallet.balance);
    if (sourceBalance < parsed.data.amount) {
      return c.json({
        error: `Insufficient balance in source wallet. Available: ${sourceBalance} ${sourceWallet.currency}, requested: ${parsed.data.amount}`,
      }, 400);
    }

    // Transfer: debit source, credit agent wallet
    const newSourceBalance = sourceBalance - parsed.data.amount;
    const newAgentBalance = parseFloat(agentWallet.balance) + parsed.data.amount;

    const { error: debitError } = await supabase
      .from('wallets')
      .update({ balance: newSourceBalance, updated_at: new Date().toISOString() })
      .eq('id', sourceWalletId)
      .eq('tenant_id', ctx.tenantId);

    if (debitError) {
      return c.json({ error: 'Failed to debit source wallet' }, 500);
    }

    const { error: creditError } = await supabase
      .from('wallets')
      .update({ balance: newAgentBalance, updated_at: new Date().toISOString() })
      .eq('id', agentWalletId)
      .eq('tenant_id', ctx.tenantId);

    if (creditError) {
      // Rollback debit
      await supabase.from('wallets').update({ balance: sourceBalance }).eq('id', sourceWalletId);
      return c.json({ error: 'Failed to credit agent wallet' }, 500);
    }

    // Create transfer record
    const { data: transfer } = await supabase
      .from('transfers')
      .insert({
        tenant_id: ctx.tenantId,
        sender_account_id: agent.parent_account_id,
        receiver_account_id: agent.parent_account_id,
        amount: parsed.data.amount,
        currency: agentWallet.currency || 'USDC',
        type: 'internal',
        status: 'completed',
        description: `Agent ${agent.name} self-funded from wallet ${sourceWalletId}`,
        metadata: {
          source: 'agent_request_funds',
          agent_id: agentId,
          source_wallet_id: sourceWalletId,
          destination_wallet_id: agentWalletId,
        },
      })
      .select('id')
      .single();

    console.log(`[Agent Fund] Agent ${agent.name} (${agentId}) funded ${parsed.data.amount} USDC from wallet ${sourceWalletId}`);

    return c.json({
      transfer_id: transfer?.id,
      amount: parsed.data.amount,
      currency: agentWallet.currency || 'USDC',
      source_wallet_id: sourceWalletId,
      destination_wallet_id: agentWalletId,
      new_balance: newAgentBalance,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default agentWallets;
