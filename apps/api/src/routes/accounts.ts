import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { 
  mapAccountFromDb, 
  mapAgentFromDb, 
  mapStreamFromDb,
  logAudit,
  isValidUUID,
  isValidEmail,
  getPaginationParams,
  paginationResponse,
} from '../utils/helpers.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const accounts = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createAccountSchema = z.object({
  type: z.enum(['person', 'business']),
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

// ============================================
// GET /v1/accounts - List accounts
// ============================================
accounts.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Parse query params
  const query = c.req.query();
  const type = query.type as 'person' | 'business' | undefined;
  const search = query.search;
  const status = query.status;
  const { page, limit } = getPaginationParams(query);
  
  // Build query
  let dbQuery = supabase
    .from('accounts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  // Apply filters
  if (type) {
    dbQuery = dbQuery.eq('type', type);
  }
  if (search) {
    dbQuery = dbQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (status) {
    dbQuery = dbQuery.eq('verification_status', status);
  }
  
  const { data, count, error } = await dbQuery;
  
  if (error) {
    console.error('Error fetching accounts:', error);
    return c.json({ error: 'Failed to fetch accounts' }, 500);
  }
  
  // Get agent counts for each account
  const accountIds = data?.map(a => a.id) || [];
  let agentCounts: Record<string, { count: number; active: number }> = {};
  
  if (accountIds.length > 0) {
    const { data: agentData } = await supabase
      .from('agents')
      .select('parent_account_id, status')
      .in('parent_account_id', accountIds);
    
    if (agentData) {
      for (const agent of agentData) {
        if (!agentCounts[agent.parent_account_id]) {
          agentCounts[agent.parent_account_id] = { count: 0, active: 0 };
        }
        agentCounts[agent.parent_account_id].count++;
        if (agent.status === 'active') {
          agentCounts[agent.parent_account_id].active++;
        }
      }
    }
  }
  
  // Map to response format
  const accounts = (data || []).map(row => {
    const account = mapAccountFromDb(row);
    account.agents = agentCounts[row.id] || { count: 0, active: 0 };
    return account;
  });
  
  return c.json(paginationResponse(accounts, count || 0, { page, limit }));
});

// ============================================
// POST /v1/accounts - Create account
// ============================================
accounts.post('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Parse and validate body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const { type, name, email, metadata } = parsed.data;
  
  // Check for duplicate email if provided
  if (email) {
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('email', email)
      .single();
    
    if (existing) {
      throw new ValidationError('An account with this email already exists');
    }
  }
  
  // Create account
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      tenant_id: ctx.tenantId,
      type,
      name,
      email: email || null,
      verification_type: type === 'person' ? 'kyc' : 'kyb',
      metadata: metadata || {},
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating account:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'account',
    entityId: data.id,
    action: 'created',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    metadata: { type, name },
  });
  
  const account = mapAccountFromDb(data);
  return c.json({ data: account }, 201);
});

// ============================================
// GET /v1/accounts/:id - Get single account
// ============================================
accounts.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !data) {
    throw new NotFoundError('Account', id);
  }
  
  // Get agent counts
  const { data: agentData } = await supabase
    .from('agents')
    .select('status')
    .eq('parent_account_id', id);
  
  const agentCount = agentData?.length || 0;
  const activeAgentCount = agentData?.filter(a => a.status === 'active').length || 0;
  
  const account = mapAccountFromDb(data);
  account.agents = { count: agentCount, active: activeAgentCount };
  
  return c.json({ data: account });
});

// ============================================
// PATCH /v1/accounts/:id - Update account
// ============================================
accounts.patch('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Check account exists
  const { data: existing, error: fetchError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Account', id);
  }
  
  // Parse and validate body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const updates: Record<string, any> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;
  if (parsed.data.metadata !== undefined) updates.metadata = parsed.data.metadata;
  
  if (Object.keys(updates).length === 0) {
    return c.json({ data: mapAccountFromDb(existing) });
  }
  
  // Check for duplicate email if updating
  if (updates.email && updates.email !== existing.email) {
    const { data: duplicate } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('email', updates.email)
      .neq('id', id)
      .single();
    
    if (duplicate) {
      throw new ValidationError('An account with this email already exists');
    }
  }
  
  // Update account
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating account:', error);
    return c.json({ error: 'Failed to update account' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'account',
    entityId: id,
    action: 'updated',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    changes: {
      before: { name: existing.name, email: existing.email },
      after: { name: data.name, email: data.email },
    },
  });
  
  return c.json({ data: mapAccountFromDb(data) });
});

// ============================================
// DELETE /v1/accounts/:id - Delete account
// ============================================
accounts.delete('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Check account exists
  const { data: existing, error: fetchError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Account', id);
  }
  
  // Check for non-zero balance
  const balance = parseFloat(existing.balance_total) || 0;
  if (balance > 0) {
    throw new ValidationError('Cannot delete account with non-zero balance', {
      balance,
      message: 'Transfer all funds before deleting',
    });
  }
  
  // Check for active streams
  const { count: streamCount } = await supabase
    .from('streams')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .or(`sender_account_id.eq.${id},receiver_account_id.eq.${id}`);
  
  if (streamCount && streamCount > 0) {
    throw new ValidationError('Cannot delete account with active streams', {
      activeStreams: streamCount,
      message: 'Cancel all streams before deleting',
    });
  }
  
  // Check for agents
  const { count: agentCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('parent_account_id', id);
  
  if (agentCount && agentCount > 0) {
    throw new ValidationError('Cannot delete account with registered agents', {
      agentCount,
      message: 'Delete all agents before deleting account',
    });
  }
  
  // Delete account (cascades to ledger_entries)
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  
  if (error) {
    console.error('Error deleting account:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'account',
    entityId: id,
    action: 'deleted',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    metadata: { name: existing.name, type: existing.type },
  });
  
  return c.json({ data: { id, deleted: true } });
});

// ============================================
// GET /v1/accounts/:id/balances - Balance breakdown
// ============================================
accounts.get('/:id/balances', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, balance_total, balance_available, balance_in_streams, balance_buffer')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !data) {
    throw new NotFoundError('Account', id);
  }
  
  // Get stream counts
  const { data: streams } = await supabase
    .from('streams')
    .select('id, status, flow_rate_per_month, sender_account_id, receiver_account_id')
    .eq('status', 'active')
    .or(`sender_account_id.eq.${id},receiver_account_id.eq.${id}`);
  
  const outgoingStreams = streams?.filter(s => s.sender_account_id === id) || [];
  const incomingStreams = streams?.filter(s => s.receiver_account_id === id) || [];
  
  const outflowPerMonth = outgoingStreams.reduce((sum, s) => sum + parseFloat(s.flow_rate_per_month), 0);
  const inflowPerMonth = incomingStreams.reduce((sum, s) => sum + parseFloat(s.flow_rate_per_month), 0);
  
  return c.json({
    data: {
      accountId: data.id,
      accountName: data.name,
      balance: {
        total: parseFloat(data.balance_total) || 0,
        available: parseFloat(data.balance_available) || 0,
        inStreams: {
          total: parseFloat(data.balance_in_streams) || 0,
          buffer: parseFloat(data.balance_buffer) || 0,
          streaming: (parseFloat(data.balance_in_streams) || 0) - (parseFloat(data.balance_buffer) || 0),
        },
        currency: 'USDC',
      },
      streams: {
        outgoing: {
          count: outgoingStreams.length,
          totalFlowPerMonth: outflowPerMonth,
        },
        incoming: {
          count: incomingStreams.length,
          totalFlowPerMonth: inflowPerMonth,
        },
        netFlowPerMonth: inflowPerMonth - outflowPerMonth,
      },
    },
  });
});

// ============================================
// GET /v1/accounts/:id/agents - Account's agents
// ============================================
accounts.get('/:id/agents', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Verify account exists and belongs to tenant
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name, type, verification_tier')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account', id);
  }
  
  // Get agents
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('parent_account_id', id)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching agents:', error);
    return c.json({ error: 'Failed to fetch agents' }, 500);
  }
  
  const agents = (data || []).map(row => {
    const agent = mapAgentFromDb(row);
    agent.parentAccount = {
      id: account.id,
      type: account.type,
      name: account.name,
      verificationTier: account.verification_tier,
    };
    return agent;
  });
  
  return c.json({ data: agents });
});

// ============================================
// GET /v1/accounts/:id/streams - Account's streams
// ============================================
accounts.get('/:id/streams', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Verify account exists
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account', id);
  }
  
  // Parse query params
  const query = c.req.query();
  const status = query.status;
  const direction = query.direction as 'incoming' | 'outgoing' | undefined;
  
  // Get streams where account is sender or receiver
  let dbQuery = supabase
    .from('streams')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  
  if (direction === 'outgoing') {
    dbQuery = dbQuery.eq('sender_account_id', id);
  } else if (direction === 'incoming') {
    dbQuery = dbQuery.eq('receiver_account_id', id);
  } else {
    dbQuery = dbQuery.or(`sender_account_id.eq.${id},receiver_account_id.eq.${id}`);
  }
  
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }
  
  const { data, error } = await dbQuery;
  
  if (error) {
    console.error('Error fetching streams:', error);
    return c.json({ error: 'Failed to fetch streams' }, 500);
  }
  
  const streams = (data || []).map(row => mapStreamFromDb(row));
  
  return c.json({ data: streams });
});

// ============================================
// GET /v1/accounts/:id/transactions - Account's transfers
// ============================================
accounts.get('/:id/transactions', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Verify account exists
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account', id);
  }
  
  // Parse query params
  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const status = query.status;
  const type = query.type;
  
  // Get transfers
  let dbQuery = supabase
    .from('transfers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .or(`from_account_id.eq.${id},to_account_id.eq.${id}`)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }
  if (type) {
    dbQuery = dbQuery.eq('type', type);
  }
  
  const { data, count, error } = await dbQuery;
  
  if (error) {
    console.error('Error fetching transactions:', error);
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
  
  // Import transfer mapper
  const { mapTransferFromDb } = await import('../utils/helpers.js');
  const transfers = (data || []).map(row => mapTransferFromDb(row));
  
  return c.json(paginationResponse(transfers, count || 0, { page, limit }));
});

export default accounts;
