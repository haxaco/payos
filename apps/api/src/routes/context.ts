/**
 * Context API Routes (Epic 31)
 * 
 * "Tell me everything about X" endpoints that return comprehensive
 * information in a single call, reducing API roundtrips for AI agents
 * and dashboards.
 */

import { Hono } from 'hono';
import { createClient } from '../db/client.js';
import {
  mapAccountFromDb,
  mapAgentFromDb,
  isValidUUID,
} from '../utils/helpers.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const context = new Hono();

// ============================================
// TYPES
// ============================================

interface AccountContext {
  // Core account details
  account: {
    id: string;
    name: string;
    email: string;
    type: 'person' | 'business';
    status: 'active' | 'suspended' | 'closed';
    verification_tier: number;
    verification_status: string;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, unknown>;
  };
  
  // Financial state
  balances: {
    currencies: Array<{
      currency: string;
      available: string;
      pending_incoming: string;
      pending_outgoing: string;
      holds: string;
      total: string;
    }>;
    usd_equivalent: {
      available: string;
      total: string;
    };
  };
  
  // Activity summary (last 30 days)
  activity: {
    period_days: number;
    transfers: {
      count: number;
      volume_usd: string;
      average_size_usd: string;
      success_rate: number;
    };
    recent_transfers: Array<{
      id: string;
      status: string;
      amount: string;
      currency: string;
      direction: 'incoming' | 'outgoing';
      created_at: string;
    }>;
  };
  
  // Agents
  agents: Array<{
    id: string;
    name: string;
    status: string;
    kya_tier: number;
    created_at: string;
  }>;
  
  // Limits and usage
  limits: {
    daily: {
      limit: number;
      used: number;
      remaining: number;
      resets_at: string;
    };
    monthly: {
      limit: number;
      used: number;
      remaining: number;
      resets_at: string;
    };
  };
  
  // Compliance and risk
  compliance: {
    kyb_status: string;
    kyb_tier: number;
    risk_level: 'low' | 'medium' | 'high';
    flags: string[];
  };
  
  // Next actions
  suggested_actions: Array<{
    action: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// ============================================
// GET /v1/context/account/:id
// Everything about an account
// ============================================
context.get('/account/:id', async (c) => {
  const ctx = c.get('ctx');
  const accountId = c.req.param('id');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(accountId)) {
    const error: any = new ValidationError('Invalid account ID format');
    error.details = {
      provided_id: accountId,
      expected_format: 'UUID',
    };
    throw error;
  }
  
  // ============================================
  // 1. GET ACCOUNT DETAILS
  // ============================================
  
  // Debug: First check if account exists at all (helps diagnose tenant mismatch)
  const { data: accountCheck } = await supabase
    .from('accounts')
    .select('id, tenant_id, account_name')
    .eq('id', accountId)
    .single();
  
  if (!accountCheck) {
    console.log('[Context API] Account not found:', { accountId });
    throw new NotFoundError('Account', accountId);
  }
  
  // Check for tenant mismatch (common cause of 404)
  if (accountCheck.tenant_id !== ctx.tenantId) {
    console.log('[Context API] Tenant mismatch:', {
      accountId,
      accountName: accountCheck.account_name,
      accountTenant: accountCheck.tenant_id,
      userTenant: ctx.tenantId,
    });
    const error: any = new NotFoundError('Account', accountId);
    error.details = {
      message: 'Account not accessible (tenant mismatch)',
      account_id: accountId,
    };
    throw error;
  }
  
  // Now fetch full account data
  const { data: accountData, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !accountData) {
    console.log('[Context API] Error fetching account:', {
      accountId,
      tenantId: ctx.tenantId,
      error: accountError?.message,
    });
    throw new NotFoundError('Account', accountId);
  }
  
  console.log('[Context API] Account found:', {
    accountId,
    accountName: accountData.account_name,
    tenantId: ctx.tenantId,
  });
  
  const account = mapAccountFromDb(accountData);
  
  // ============================================
  // 2. GET BALANCES
  // ============================================
  const { data: balancesData } = await supabase
    .from('balances')
    .select('*')
    .eq('account_id', accountId);
  
  const balances = {
    currencies: (balancesData || []).map((bal: any) => ({
      currency: bal.currency,
      available: bal.available.toString(),
      pending_incoming: bal.pending_in?.toString() || '0',
      pending_outgoing: bal.pending_out?.toString() || '0',
      holds: bal.holds?.toString() || '0',
      total: (
        parseFloat(bal.available) +
        parseFloat(bal.pending_in || '0') -
        parseFloat(bal.pending_out || '0')
      ).toString(),
    })),
    usd_equivalent: {
      available: '0', // TODO: Calculate from FX rates
      total: '0',
    },
  };
  
  // ============================================
  // 3. GET ACTIVITY SUMMARY (Last 30 days)
  // ============================================
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get transfers (both sent and received)
  const { data: transfersData } = await supabase
    .from('transfers')
    .select('*')
    .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
  
  const transfers = transfersData || [];
  const successfulTransfers = transfers.filter((t: any) => t.status === 'completed');
  
  // Calculate volume (USD equivalent - for now just sum all amounts)
  const totalVolume = transfers.reduce((sum: number, t: any) => {
    return sum + parseFloat(t.amount || '0');
  }, 0);
  
  const activity = {
    period_days: 30,
    transfers: {
      count: transfers.length,
      volume_usd: totalVolume.toFixed(2),
      average_size_usd: transfers.length > 0 
        ? (totalVolume / transfers.length).toFixed(2)
        : '0.00',
      success_rate: transfers.length > 0
        ? (successfulTransfers.length / transfers.length) * 100
        : 100,
    },
    recent_transfers: transfers.slice(0, 5).map((t: any) => ({
      id: t.id,
      status: t.status,
      amount: t.amount,
      currency: t.currency,
      direction: t.from_account_id === accountId ? 'outgoing' : 'incoming',
      created_at: t.created_at,
    })),
  };
  
  // ============================================
  // 4. GET AGENTS
  // ============================================
  const { data: agentsData } = await supabase
    .from('agents')
    .select('id, name, status, kya_tier, created_at')
    .eq('parent_account_id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  
  const agents = (agentsData || []).map((agent: any) => ({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    kya_tier: agent.kya_tier,
    created_at: agent.created_at,
  }));
  
  // ============================================
  // 5. GET LIMITS (Placeholder - implement with limits service)
  // ============================================
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  
  const limits = {
    daily: {
      limit: 10000,
      used: 0, // TODO: Calculate from today's transfers
      remaining: 10000,
      resets_at: tomorrow.toISOString(),
    },
    monthly: {
      limit: 100000,
      used: 0, // TODO: Calculate from this month's transfers
      remaining: 100000,
      resets_at: nextMonth.toISOString(),
    },
  };
  
  // ============================================
  // 6. COMPLIANCE & RISK
  // ============================================
  const flags: string[] = [];
  
  // Check for suspended status
  if (account.status === 'suspended') {
    flags.push('account_suspended');
  }
  
  // Check for low verification
  if (account.verificationTier < 2) {
    flags.push('low_verification_tier');
  }
  
  // Check for many agents (potential risk)
  if (agents.length > 10) {
    flags.push('high_agent_count');
  }
  
  const compliance = {
    kyb_status: account.verificationStatus,
    kyb_tier: account.verificationTier,
    risk_level: flags.length > 2 ? 'high' : flags.length > 0 ? 'medium' : 'low',
    flags,
  };
  
  // ============================================
  // 7. SUGGESTED ACTIONS
  // ============================================
  const suggested_actions: Array<{action: string; description: string; priority: 'high' | 'medium' | 'low'}> = [];
  
  if (account.verificationTier < 2) {
    suggested_actions.push({
      action: 'complete_kyb',
      description: 'Complete KYB verification to increase limits',
      priority: 'high',
    });
  }
  
  if (balances.currencies.length === 0) {
    suggested_actions.push({
      action: 'add_funds',
      description: 'Add funds to start making transfers',
      priority: 'high',
    });
  }
  
  if (agents.length === 0 && account.type === 'business') {
    suggested_actions.push({
      action: 'create_agent',
      description: 'Create an AI agent to automate operations',
      priority: 'medium',
    });
  }
  
  // ============================================
  // 8. BUILD RESPONSE
  // ============================================
  const accountContext: AccountContext = {
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      type: account.type,
      status: account.status,
      verification_tier: account.verificationTier,
      verification_status: account.verificationStatus,
      created_at: account.createdAt,
      updated_at: account.updatedAt,
      metadata: account.metadata,
    },
    balances,
    activity,
    agents,
    limits,
    compliance,
    suggested_actions,
  };
  
  return c.json({ data: accountContext });
});

// ============================================
// GET /v1/context/transfer/:id
// Everything about a transfer
// ============================================
context.get('/transfer/:id', async (c) => {
  const ctx = c.get('ctx');
  const transferId = c.req.param('id');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(transferId)) {
    const error: any = new ValidationError('Invalid transfer ID format');
    error.details = {
      provided_id: transferId,
      expected_format: 'UUID',
    };
    throw error;
  }
  
  // ============================================
  // 1. GET TRANSFER DETAILS
  // ============================================
  const { data: transferData, error: transferError } = await supabase
    .from('transfers')
    .select(`
      *,
      from_account:accounts!transfers_from_account_id_fkey(id, name, type),
      to_account:accounts!transfers_to_account_id_fkey(id, name, type)
    `)
    .eq('id', transferId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (transferError || !transferData) {
    throw new NotFoundError('Transfer', transferId);
  }
  
  // ============================================
  // 2. BUILD SETTLEMENT DETAILS
  // ============================================
  const settlement = {
    rail: transferData.rail || 'internal',
    fx_rate: transferData.fx_rate?.toString() || null,
    destination_amount: transferData.destination_amount?.toString() || transferData.amount.toString(),
    destination_currency: transferData.destination_currency || transferData.currency,
    fees: {
      platform_fee: transferData.platform_fee?.toString() || '0.00',
      fx_fee: transferData.fx_fee?.toString() || '0.00',
      rail_fee: transferData.rail_fee?.toString() || '0.00',
      total: (
        parseFloat(transferData.platform_fee || '0') +
        parseFloat(transferData.fx_fee || '0') +
        parseFloat(transferData.rail_fee || '0')
      ).toFixed(2),
    },
    estimated_time_seconds: transferData.estimated_settlement_seconds || null,
    actual_time_seconds: transferData.completed_at && transferData.created_at
      ? Math.floor((new Date(transferData.completed_at).getTime() - new Date(transferData.created_at).getTime()) / 1000)
      : null,
  };
  
  // ============================================
  // 3. BUILD TIMELINE
  // ============================================
  const timeline: Array<{event: string; timestamp: string; actor?: string; details?: any}> = [];
  
  // Created event
  timeline.push({
    event: 'created',
    timestamp: transferData.created_at,
    actor: transferData.created_by_type === 'agent' 
      ? `agent_${transferData.created_by_id}`
      : transferData.created_by_type === 'user'
      ? `user_${transferData.created_by_id}`
      : 'system',
  });
  
  // Status-based events
  if (transferData.status === 'pending_approval') {
    timeline.push({
      event: 'pending_approval',
      timestamp: transferData.updated_at,
    });
  }
  
  if (transferData.status === 'approved' || transferData.status === 'processing' || transferData.status === 'completed') {
    timeline.push({
      event: 'approved',
      timestamp: transferData.approved_at || transferData.updated_at,
      actor: transferData.approved_by_id ? `user_${transferData.approved_by_id}` : 'system',
    });
  }
  
  if (transferData.status === 'processing' || transferData.status === 'completed') {
    timeline.push({
      event: 'submitted_to_rail',
      timestamp: transferData.submitted_at || transferData.updated_at,
    });
  }
  
  if (transferData.status === 'completed') {
    timeline.push({
      event: 'settled',
      timestamp: transferData.completed_at,
    });
  }
  
  if (transferData.status === 'failed') {
    timeline.push({
      event: 'failed',
      timestamp: transferData.failed_at || transferData.updated_at,
      details: {
        reason: transferData.failure_reason,
        code: transferData.failure_code,
      },
    });
  }
  
  if (transferData.status === 'cancelled') {
    timeline.push({
      event: 'cancelled',
      timestamp: transferData.cancelled_at || transferData.updated_at,
      actor: transferData.cancelled_by_id ? `user_${transferData.cancelled_by_id}` : 'system',
    });
  }
  
  // ============================================
  // 4. REFUND ELIGIBILITY
  // ============================================
  const { data: refundsData } = await supabase
    .from('refunds')
    .select('amount, status')
    .eq('original_transfer_id', transferId);
  
  const refunds = refundsData || [];
  const totalRefunded = refunds
    .filter((r: any) => r.status === 'completed')
    .reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
  
  const transferAmount = parseFloat(transferData.amount);
  const maxRefundable = transferAmount - totalRefunded;
  
  // Refund window: 30 days from completion
  const refundWindowDays = 30;
  const refundWindowExpiry = transferData.completed_at
    ? new Date(new Date(transferData.completed_at).getTime() + refundWindowDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  const now = new Date();
  const windowExpired = refundWindowExpiry ? new Date(refundWindowExpiry) < now : false;
  
  const canRefund = 
    transferData.status === 'completed' &&
    !windowExpired &&
    maxRefundable > 0;
  
  let refundIneligibilityReason = null;
  if (!canRefund) {
    if (transferData.status !== 'completed') {
      refundIneligibilityReason = 'Transfer must be completed to refund';
    } else if (windowExpired) {
      refundIneligibilityReason = 'Refund window has expired';
    } else if (maxRefundable <= 0) {
      refundIneligibilityReason = 'Transfer has been fully refunded';
    }
  }
  
  const refund_eligibility = {
    can_refund: canRefund,
    reason: refundIneligibilityReason,
    refund_window_expires: refundWindowExpiry,
    already_refunded: totalRefunded.toFixed(2),
    max_refundable: maxRefundable.toFixed(2),
  };
  
  // ============================================
  // 5. RELATED ENTITIES
  // ============================================
  const { data: disputeData } = await supabase
    .from('disputes')
    .select('id, status')
    .eq('transfer_id', transferId)
    .single();
  
  const related = {
    quote_id: transferData.quote_id,
    workflow_id: transferData.workflow_id,
    simulation_id: transferData.simulation_id,
    batch_id: transferData.batch_id,
    refund_ids: refunds.map((r: any) => r.id),
    dispute_id: disputeData?.id || null,
    dispute_status: disputeData?.status || null,
  };
  
  // ============================================
  // 6. AVAILABLE ACTIONS
  // ============================================
  const available_actions: string[] = [];
  
  // Can cancel if pending
  if (transferData.status === 'pending' || transferData.status === 'pending_approval') {
    available_actions.push('cancel');
  }
  
  // Can refund if eligible
  if (canRefund) {
    available_actions.push('refund');
  }
  
  // Can dispute if completed and no existing dispute
  if (transferData.status === 'completed' && !disputeData) {
    const disputeWindowDays = 60;
    const disputeWindowExpiry = new Date(new Date(transferData.completed_at).getTime() + disputeWindowDays * 24 * 60 * 60 * 1000);
    if (disputeWindowExpiry > now) {
      available_actions.push('dispute');
    }
  }
  
  // Can retry if failed
  if (transferData.status === 'failed') {
    available_actions.push('retry');
  }
  
  // Can always download receipt if completed
  if (transferData.status === 'completed') {
    available_actions.push('download_receipt');
  }
  
  // Can view details
  available_actions.push('view_accounts', 'view_timeline');
  
  // ============================================
  // 7. BUILD RESPONSE
  // ============================================
  const transferContext = {
    transfer: {
      id: transferData.id,
      amount: transferData.amount.toString(),
      currency: transferData.currency,
      status: transferData.status,
      type: transferData.type || 'standard',
      description: transferData.description,
      reference: transferData.reference,
      created_at: transferData.created_at,
      updated_at: transferData.updated_at,
      completed_at: transferData.completed_at,
      created_by: {
        type: transferData.created_by_type,
        id: transferData.created_by_id,
      },
    },
    source_account: {
      id: transferData.from_account.id,
      name: transferData.from_account.name,
      type: transferData.from_account.type,
    },
    destination_account: {
      id: transferData.to_account.id,
      name: transferData.to_account.name,
      type: transferData.to_account.type,
    },
    settlement,
    timeline,
    refund_eligibility,
    related,
    available_actions,
  };
  
  return c.json({ data: transferContext });
});

// ============================================
// GET /v1/context/agent/:id
// Everything about an agent
// ============================================
context.get('/agent/:id', async (c) => {
  const ctx = c.get('ctx');
  const agentId = c.req.param('id');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(agentId)) {
    const error: any = new ValidationError('Invalid agent ID format');
    error.details = {
      provided_id: agentId,
      expected_format: 'UUID',
    };
    throw error;
  }
  
  // ============================================
  // 1. GET AGENT DETAILS
  // ============================================
  const { data: agentData, error: agentError } = await supabase
    .from('agents')
    .select(`
      *,
      parent_account:accounts!agents_parent_account_id_fkey(id, name, type)
    `)
    .eq('id', agentId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (agentError || !agentData) {
    throw new NotFoundError('Agent', agentId);
  }
  
  const agent = mapAgentFromDb(agentData);
  
  // ============================================
  // 2. GET WALLET INFO (if exists)
  // ============================================
  const { data: walletData } = await supabase
    .from('balances')
    .select('*')
    .eq('account_id', agentId); // Agents may have their own balance records
  
  const wallet = {
    balances: (walletData || []).reduce((acc: any, bal: any) => {
      acc[bal.currency] = {
        available: bal.available.toString(),
        pending: (parseFloat(bal.pending_in || '0') - parseFloat(bal.pending_out || '0')).toFixed(2),
      };
      return acc;
    }, {}),
    funding_source: agentData.parent_account_id,
  };
  
  // ============================================
  // 3. GET SPENDING LIMITS & USAGE
  // ============================================
  // Calculate today's spending
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: todayTransfers } = await supabase
    .from('transfers')
    .select('amount')
    .eq('created_by_type', 'agent')
    .eq('created_by_id', agentId)
    .gte('created_at', today.toISOString());
  
  const dailyUsed = (todayTransfers || []).reduce((sum: number, t: any) => 
    sum + parseFloat(t.amount || '0'), 0
  );
  
  // Calculate this month's spending
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const { data: monthTransfers } = await supabase
    .from('transfers')
    .select('amount')
    .eq('created_by_type', 'agent')
    .eq('created_by_id', agentId)
    .gte('created_at', monthStart.toISOString());
  
  const monthlyUsed = (monthTransfers || []).reduce((sum: number, t: any) => 
    sum + parseFloat(t.amount || '0'), 0
  );
  
  // Get limits from agent config or defaults
  const dailyLimit = agentData.daily_limit || 10000;
  const monthlyLimit = agentData.monthly_limit || 100000;
  const perTransactionLimit = agentData.per_transaction_limit || 5000;
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  const limits = {
    daily: {
      limit: dailyLimit,
      used: dailyUsed,
      remaining: Math.max(0, dailyLimit - dailyUsed),
      percentage_used: (dailyUsed / dailyLimit) * 100,
      resets_at: tomorrow.toISOString(),
    },
    monthly: {
      limit: monthlyLimit,
      used: monthlyUsed,
      remaining: Math.max(0, monthlyLimit - monthlyUsed),
      percentage_used: (monthlyUsed / monthlyLimit) * 100,
      resets_at: nextMonth.toISOString(),
    },
    per_transaction: {
      limit: perTransactionLimit,
    },
  };
  
  // ============================================
  // 4. GET PERMISSIONS & POLICY
  // ============================================
  const permissions = agentData.permissions || {
    transactions: { initiate: true, approve: false, view: true },
    streams: { initiate: true, modify: true, pause: true, terminate: true, view: true },
    accounts: { view: true, create: false },
    treasury: { view: false, rebalance: false },
  };
  
  const spending_policy = {
    allowed_currencies: agentData.allowed_currencies || ['USD', 'BRL', 'MXN'],
    destination_restriction: agentData.destination_restriction || 'any',
    allowlisted_accounts: agentData.allowlisted_accounts || [],
    approval_required_above: agentData.approval_threshold?.toString() || null,
    blocked_actions: agentData.blocked_actions || [],
  };
  
  // ============================================
  // 5. GET MANAGED STREAMS
  // ============================================
  const { data: streamsData } = await supabase
    .from('streams')
    .select('id, status, flow_rate, currency, created_at')
    .eq('managed_by_type', 'agent')
    .eq('managed_by_id', agentId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  const managed_streams = {
    active_count: (streamsData || []).filter((s: any) => s.status === 'active').length,
    total_count: (streamsData || []).length,
    recent: (streamsData || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      flow_rate: s.flow_rate.toString(),
      currency: s.currency,
      created_at: s.created_at,
    })),
  };
  
  // ============================================
  // 6. GET RECENT TRANSACTIONS (Last 30 days)
  // ============================================
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: recentTransfers } = await supabase
    .from('transfers')
    .select('id, amount, currency, status, created_at, type')
    .eq('created_by_type', 'agent')
    .eq('created_by_id', agentId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  
  const allTransfers = recentTransfers || [];
  const totalAmount = allTransfers.reduce((sum: number, t: any) => 
    sum + parseFloat(t.amount || '0'), 0
  );
  
  const recent_transactions = {
    last_10: allTransfers.map((t: any) => ({
      id: t.id,
      amount: t.amount.toString(),
      currency: t.currency,
      status: t.status,
      type: t.type,
      created_at: t.created_at,
    })),
    last_30_days: {
      count: allTransfers.length,
      total_amount_usd: totalAmount.toFixed(2),
      avg_amount: allTransfers.length > 0 
        ? (totalAmount / allTransfers.length).toFixed(2)
        : '0.00',
    },
  };
  
  // ============================================
  // 7. AVAILABLE ACTIONS
  // ============================================
  const available_actions: string[] = [];
  
  // Can make payment if active and within limits
  if (agent.status === 'active' && limits.daily.remaining > 0) {
    available_actions.push('make_payment');
  }
  
  // Can create stream if has permission
  if (permissions.streams?.initiate) {
    available_actions.push('create_stream');
  }
  
  // Can request limit increase if approaching limit
  if (limits.daily.percentage_used > 80 || limits.monthly.percentage_used > 80) {
    available_actions.push('request_limit_increase');
  }
  
  // Can update policy (if authorized)
  available_actions.push('view_policy');
  
  // Can suspend/activate
  if (agent.status === 'active') {
    available_actions.push('suspend');
  } else if (agent.status === 'suspended') {
    available_actions.push('activate');
  }
  
  // Can rotate token
  available_actions.push('rotate_token');
  
  // Can view details
  available_actions.push('view_streams', 'view_transactions');
  
  // ============================================
  // 8. SUGGESTED ACTIONS
  // ============================================
  const suggested_actions: Array<{action: string; description: string; priority: 'high' | 'medium' | 'low'}> = [];
  
  if (agent.kyaTier < 1) {
    suggested_actions.push({
      action: 'complete_kya',
      description: 'Complete KYA verification to increase trust',
      priority: 'high',
    });
  }
  
  if (limits.daily.percentage_used > 90) {
    suggested_actions.push({
      action: 'request_limit_increase',
      description: 'Daily limit almost reached - request increase',
      priority: 'high',
    });
  }
  
  if (managed_streams.active_count === 0 && permissions.streams?.initiate) {
    suggested_actions.push({
      action: 'create_stream',
      description: 'Set up automated payment streams',
      priority: 'medium',
    });
  }
  
  // ============================================
  // 9. BUILD RESPONSE
  // ============================================
  const agentContext = {
    agent: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      type: agent.type,
      kya_status: agent.kyaStatus,
      kya_tier: agent.kyaTier,
      created_at: agent.createdAt,
      updated_at: agent.updatedAt,
    },
    parent_account: {
      id: agentData.parent_account.id,
      name: agentData.parent_account.name,
      type: agentData.parent_account.type,
    },
    wallet,
    limits,
    permissions,
    spending_policy,
    managed_streams,
    recent_transactions,
    available_actions,
    suggested_actions,
  };
  
  return c.json({ data: agentContext });
});

// ============================================
// GET /v1/context/batch/:id
// Everything about a batch transfer
// ============================================
context.get('/batch/:id', async (c) => {
  const ctx = c.get('ctx');
  const batchId = c.req.param('id');
  const supabase = createClient();
  
  // Validate UUID
  if (!isValidUUID(batchId)) {
    const error: any = new ValidationError('Invalid batch ID format');
    error.details = {
      provided_id: batchId,
      expected_format: 'UUID',
    };
    throw error;
  }
  
  // ============================================
  // 1. GET BATCH DETAILS
  // ============================================
  const { data: batchData, error: batchError } = await supabase
    .from('batch_transfers')
    .select('*')
    .eq('id', batchId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (batchError || !batchData) {
    throw new NotFoundError('Batch', batchId);
  }
  
  // ============================================
  // 2. GET ALL BATCH ITEMS
  // ============================================
  const { data: itemsData } = await supabase
    .from('transfers')
    .select('id, amount, currency, status, from_account_id, to_account_id, failure_reason, failure_code, created_at, completed_at')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });
  
  const items = itemsData || [];
  
  // ============================================
  // 3. CALCULATE STATUS BREAKDOWN
  // ============================================
  const statusCounts = items.reduce((acc: any, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  
  const status_breakdown = {
    completed: statusCounts.completed || 0,
    failed: statusCounts.failed || 0,
    pending: statusCounts.pending || 0,
    processing: statusCounts.processing || 0,
    cancelled: statusCounts.cancelled || 0,
  };
  
  // ============================================
  // 4. CALCULATE TOTALS
  // ============================================
  const amountsByCurrency: Record<string, number> = {};
  const feesByCurrency: Record<string, number> = {};
  
  items.forEach((item: any) => {
    const currency = item.currency;
    const amount = parseFloat(item.amount || '0');
    
    amountsByCurrency[currency] = (amountsByCurrency[currency] || 0) + amount;
    // Note: fees would come from transfer records if available
  });
  
  const totalItems = items.length;
  const successfulItems = status_breakdown.completed;
  const successRate = totalItems > 0 ? (successfulItems / totalItems) * 100 : 0;
  
  const totals = {
    amount: Object.entries(amountsByCurrency).reduce((acc: any, [currency, amount]) => {
      acc[currency] = amount.toFixed(2);
      return acc;
    }, {}),
    fees: Object.entries(feesByCurrency).reduce((acc: any, [currency, fee]) => {
      acc[currency] = fee.toFixed(2);
      return acc;
    }, {}),
    success_rate: parseFloat(successRate.toFixed(2)),
  };
  
  // ============================================
  // 5. SIMULATION INFO (if available)
  // ============================================
  const simulation = batchData.simulation_id ? {
    was_simulated: true,
    simulation_id: batchData.simulation_id,
    predicted_success: batchData.predicted_success_count,
    predicted_failures: batchData.predicted_failure_count,
    variance: {
      additional_failures: status_breakdown.failed - (batchData.predicted_failure_count || 0),
      fewer_failures: (batchData.predicted_failure_count || 0) - status_breakdown.failed,
    },
  } : {
    was_simulated: false,
    simulation_id: null,
  };
  
  // ============================================
  // 6. APPROVAL INFO (if workflow)
  // ============================================
  const approval = batchData.workflow_id ? {
    required: true,
    status: batchData.approval_status || 'pending',
    approved_by: batchData.approved_by_id,
    approved_at: batchData.approved_at,
    rejected_by: batchData.rejected_by_id,
    rejected_at: batchData.rejected_at,
    rejection_reason: batchData.rejection_reason,
  } : {
    required: false,
    status: null,
  };
  
  // ============================================
  // 7. FAILURE ANALYSIS
  // ============================================
  const failedItems = items.filter((item: any) => item.status === 'failed');
  const failuresByCode: Record<string, number> = {};
  const failuresByReason: Record<string, number> = {};
  
  failedItems.forEach((item: any) => {
    if (item.failure_code) {
      failuresByCode[item.failure_code] = (failuresByCode[item.failure_code] || 0) + 1;
    }
    if (item.failure_reason) {
      failuresByReason[item.failure_reason] = (failuresByReason[item.failure_reason] || 0) + 1;
    }
  });
  
  // Get most common failure
  const mostCommonFailure = Object.entries(failuresByCode)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];
  
  const failure_analysis = {
    total_failures: failedItems.length,
    by_error_code: failuresByCode,
    by_reason: failuresByReason,
    most_common: mostCommonFailure ? {
      code: mostCommonFailure[0],
      count: mostCommonFailure[1],
    } : null,
  };
  
  // ============================================
  // 8. TIMING ANALYSIS
  // ============================================
  const completedItems = items.filter((item: any) => item.completed_at);
  const processingTimes = completedItems.map((item: any) => {
    const created = new Date(item.created_at).getTime();
    const completed = new Date(item.completed_at).getTime();
    return (completed - created) / 1000; // seconds
  });
  
  const avgProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
    : null;
  
  const timing = {
    batch_created_at: batchData.created_at,
    batch_completed_at: batchData.completed_at,
    total_duration_seconds: batchData.completed_at
      ? Math.floor((new Date(batchData.completed_at).getTime() - new Date(batchData.created_at).getTime()) / 1000)
      : null,
    avg_item_processing_seconds: avgProcessingTime ? Math.floor(avgProcessingTime) : null,
  };
  
  // ============================================
  // 9. INDIVIDUAL ITEMS (summary)
  // ============================================
  const itemsSummary = items.map((item: any) => ({
    id: item.id,
    amount: item.amount.toString(),
    currency: item.currency,
    status: item.status,
    from_account_id: item.from_account_id,
    to_account_id: item.to_account_id,
    failure_code: item.failure_code,
    failure_reason: item.failure_reason,
    created_at: item.created_at,
    completed_at: item.completed_at,
  }));
  
  // ============================================
  // 10. AVAILABLE ACTIONS
  // ============================================
  const available_actions: string[] = [];
  
  // Can retry failed items
  if (status_breakdown.failed > 0) {
    available_actions.push('retry_failed');
  }
  
  // Can cancel pending items
  if (status_breakdown.pending > 0 || status_breakdown.processing > 0) {
    available_actions.push('cancel_pending');
  }
  
  // Can export results
  if (batchData.status === 'completed' || batchData.status === 'partial') {
    available_actions.push('export_results');
  }
  
  // Can view simulation (if simulated)
  if (simulation.was_simulated) {
    available_actions.push('view_simulation');
  }
  
  // Always can view details
  available_actions.push('view_items', 'download_report');
  
  // ============================================
  // 11. SUGGESTED ACTIONS
  // ============================================
  const suggested_actions: Array<{action: string; description: string; priority: 'high' | 'medium' | 'low'}> = [];
  
  if (status_breakdown.failed > 0) {
    suggested_actions.push({
      action: 'retry_failed',
      description: `Retry ${status_breakdown.failed} failed transfer${status_breakdown.failed > 1 ? 's' : ''}`,
      priority: 'high',
    });
  }
  
  if (failure_analysis.most_common && failure_analysis.most_common.count > 1) {
    suggested_actions.push({
      action: 'investigate_common_failure',
      description: `${failure_analysis.most_common.count} items failed with ${failure_analysis.most_common.code}`,
      priority: 'high',
    });
  }
  
  if (successRate < 95 && successRate > 0) {
    suggested_actions.push({
      action: 'review_batch_setup',
      description: `Success rate ${successRate.toFixed(1)}% is below 95% - review batch configuration`,
      priority: 'medium',
    });
  }
  
  // ============================================
  // 12. BUILD RESPONSE
  // ============================================
  const batchContext = {
    batch: {
      id: batchData.id,
      name: batchData.name || batchData.description,
      description: batchData.description,
      status: batchData.status,
      created_at: batchData.created_at,
      completed_at: batchData.completed_at,
      initiated_by: {
        type: batchData.created_by_type,
        id: batchData.created_by_id,
      },
      total_items: totalItems,
    },
    status_breakdown,
    totals,
    timing,
    simulation,
    approval,
    failure_analysis,
    items: itemsSummary,
    available_actions,
    suggested_actions,
  };
  
  return c.json({ data: batchContext });
});

export default context;

