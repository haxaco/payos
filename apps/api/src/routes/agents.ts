import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { 
  mapAgentFromDb, 
  mapStreamFromDb,
  logAudit,
  isValidUUID,
  getPaginationParams,
  paginationResponse,
} from '../utils/helpers.js';
import { createLimitService } from '../services/limits.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';
import { generateAgentToken } from '@payos/utils';

const agents = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const permissionsSchema = z.object({
  transactions: z.object({
    initiate: z.boolean(),
    approve: z.boolean(),
    view: z.boolean(),
  }).optional(),
  streams: z.object({
    initiate: z.boolean(),
    modify: z.boolean(),
    pause: z.boolean(),
    terminate: z.boolean(),
    view: z.boolean(),
  }).optional(),
  accounts: z.object({
    view: z.boolean(),
    create: z.boolean(),
  }).optional(),
  treasury: z.object({
    view: z.boolean(),
    rebalance: z.boolean(),
  }).optional(),
}).optional();

const createAgentSchema = z.object({
  parentAccountId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  permissions: permissionsSchema,
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  permissions: permissionsSchema,
});

// Default permissions for new agents
const DEFAULT_PERMISSIONS = {
  transactions: { initiate: true, approve: false, view: true },
  streams: { initiate: true, modify: true, pause: true, terminate: true, view: true },
  accounts: { view: true, create: false },
  treasury: { view: false, rebalance: false },
};

// ============================================
// GET /v1/agents - List agents
// ============================================
agents.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Parse query params
  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const search = query.search;
  const status = query.status;
  const kyaTier = query.kyaTier;
  const parentAccountId = query.parentAccountId;
  
  // Build query with parent account join
  let dbQuery = supabase
    .from('agents')
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (
        id, type, name, verification_tier
      )
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (search) {
    dbQuery = dbQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }
  if (kyaTier !== undefined) {
    dbQuery = dbQuery.eq('kya_tier', parseInt(kyaTier));
  }
  if (parentAccountId) {
    dbQuery = dbQuery.eq('parent_account_id', parentAccountId);
  }
  
  const { data, count, error } = await dbQuery;
  
  if (error) {
    console.error('Error fetching agents:', error);
    return c.json({ error: 'Failed to fetch agents' }, 500);
  }
  
  // Map to response format
  const agents = (data || []).map(row => {
    const agent = mapAgentFromDb(row);
    if (row.accounts) {
      agent.parentAccount = {
        id: row.accounts.id,
        type: row.accounts.type,
        name: row.accounts.name,
        verificationTier: row.accounts.verification_tier,
      };
    }
    return agent;
  });
  
  return c.json(paginationResponse(agents, count || 0, { page, limit }));
});

// ============================================
// POST /v1/agents - Create agent
// ============================================
agents.post('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Parse and validate body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const { parentAccountId, name, description, permissions } = parsed.data;
  
  // Verify parent account exists and belongs to tenant
  const { data: parentAccount, error: parentError } = await supabase
    .from('accounts')
    .select('id, type, name, verification_tier')
    .eq('id', parentAccountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (parentError || !parentAccount) {
    throw new NotFoundError('Parent account', parentAccountId);
  }
  
  // Only business accounts can have agents
  if (parentAccount.type !== 'business') {
    throw new ValidationError('Only business accounts can have agents');
  }
  
  // Generate auth credentials
  const authClientId = generateAgentToken();
  
  // Merge permissions with defaults
  const mergedPermissions = {
    ...DEFAULT_PERMISSIONS,
    ...permissions,
    transactions: { ...DEFAULT_PERMISSIONS.transactions, ...permissions?.transactions },
    streams: { ...DEFAULT_PERMISSIONS.streams, ...permissions?.streams },
    accounts: { ...DEFAULT_PERMISSIONS.accounts, ...permissions?.accounts },
    treasury: { ...DEFAULT_PERMISSIONS.treasury, ...permissions?.treasury },
  };
  
  // Create agent
  const { data, error } = await supabase
    .from('agents')
    .insert({
      tenant_id: ctx.tenantId,
      parent_account_id: parentAccountId,
      name,
      description: description || null,
      status: 'active',
      kya_tier: 0, // Start unverified
      kya_status: 'unverified',
      auth_type: 'api_key',
      auth_client_id: authClientId,
      permissions: mergedPermissions,
    })
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (
        id, type, name, verification_tier
      )
    `)
    .single();
  
  if (error) {
    console.error('Error creating agent:', error);
    return c.json({ error: 'Failed to create agent' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'agent',
    entityId: data.id,
    action: 'created',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    metadata: { name, parentAccount: parentAccount.name },
  });
  
  const agent = mapAgentFromDb(data);
  agent.parentAccount = {
    id: parentAccount.id,
    type: parentAccount.type,
    name: parentAccount.name,
    verificationTier: parentAccount.verification_tier,
  };
  
  // Include auth credentials in response (only on creation)
  return c.json({
    data: agent,
    credentials: {
      clientId: authClientId,
      note: 'Save this token - it will not be shown again',
    },
  }, 201);
});

// ============================================
// GET /v1/agents/:id - Get single agent
// ============================================
agents.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  const { data, error } = await supabase
    .from('agents')
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (
        id, type, name, verification_tier
      )
    `)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !data) {
    throw new NotFoundError('Agent', id);
  }
  
  const agent = mapAgentFromDb(data);
  if (data.accounts) {
    agent.parentAccount = {
      id: data.accounts.id,
      type: data.accounts.type,
      name: data.accounts.name,
      verificationTier: data.accounts.verification_tier,
    };
  }
  
  return c.json({ data: agent });
});

// ============================================
// PATCH /v1/agents/:id - Update agent
// ============================================
agents.patch('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  // Check agent exists
  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Agent', id);
  }
  
  // Parse and validate body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const updates: Record<string, any> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.permissions !== undefined) {
    // Merge with existing permissions
    updates.permissions = {
      ...existing.permissions,
      ...parsed.data.permissions,
    };
  }
  
  if (Object.keys(updates).length === 0) {
    const agent = mapAgentFromDb(existing);
    return c.json({ data: agent });
  }
  
  // Update agent
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (
        id, type, name, verification_tier
      )
    `)
    .single();
  
  if (error) {
    console.error('Error updating agent:', error);
    return c.json({ error: 'Failed to update agent' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'agent',
    entityId: id,
    action: 'updated',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    changes: {
      before: { name: existing.name, description: existing.description },
      after: { name: data.name, description: data.description },
    },
  });
  
  const agent = mapAgentFromDb(data);
  if (data.accounts) {
    agent.parentAccount = {
      id: data.accounts.id,
      type: data.accounts.type,
      name: data.accounts.name,
      verificationTier: data.accounts.verification_tier,
    };
  }
  
  return c.json({ data: agent });
});

// ============================================
// DELETE /v1/agents/:id - Delete agent
// ============================================
agents.delete('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  // Check agent exists
  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Agent', id);
  }
  
  // Check for active streams managed by this agent
  const { count: streamCount } = await supabase
    .from('streams')
    .select('*', { count: 'exact', head: true })
    .eq('managed_by_type', 'agent')
    .eq('managed_by_id', id)
    .eq('status', 'active');
  
  if (streamCount && streamCount > 0) {
    throw new ValidationError('Cannot delete agent with active managed streams', {
      activeStreams: streamCount,
      message: 'Transfer stream management or cancel streams before deleting',
    });
  }
  
  // Delete agent
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  
  if (error) {
    console.error('Error deleting agent:', error);
    return c.json({ error: 'Failed to delete agent' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'agent',
    entityId: id,
    action: 'deleted',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    metadata: { name: existing.name },
  });
  
  return c.json({ data: { id, deleted: true } });
});

// ============================================
// POST /v1/agents/:id/suspend - Suspend agent
// ============================================
agents.post('/:id/suspend', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Agent', id);
  }
  
  if (existing.status === 'suspended') {
    throw new ValidationError('Agent is already suspended');
  }
  
  const { data, error } = await supabase
    .from('agents')
    .update({ status: 'suspended' })
    .eq('id', id)
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (
        id, type, name, verification_tier
      )
    `)
    .single();
  
  if (error) {
    console.error('Error suspending agent:', error);
    return c.json({ error: 'Failed to suspend agent' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'agent',
    entityId: id,
    action: 'suspended',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    changes: { before: { status: existing.status }, after: { status: 'suspended' } },
  });
  
  const agent = mapAgentFromDb(data);
  if (data.accounts) {
    agent.parentAccount = {
      id: data.accounts.id,
      type: data.accounts.type,
      name: data.accounts.name,
      verificationTier: data.accounts.verification_tier,
    };
  }
  
  return c.json({ data: agent });
});

// ============================================
// POST /v1/agents/:id/activate - Activate agent
// ============================================
agents.post('/:id/activate', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Agent', id);
  }
  
  if (existing.status === 'active') {
    throw new ValidationError('Agent is already active');
  }
  
  const { data, error } = await supabase
    .from('agents')
    .update({ status: 'active' })
    .eq('id', id)
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (
        id, type, name, verification_tier
      )
    `)
    .single();
  
  if (error) {
    console.error('Error activating agent:', error);
    return c.json({ error: 'Failed to activate agent' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'agent',
    entityId: id,
    action: 'activated',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    changes: { before: { status: existing.status }, after: { status: 'active' } },
  });
  
  const agent = mapAgentFromDb(data);
  if (data.accounts) {
    agent.parentAccount = {
      id: data.accounts.id,
      type: data.accounts.type,
      name: data.accounts.name,
      verificationTier: data.accounts.verification_tier,
    };
  }
  
  return c.json({ data: agent });
});

// ============================================
// GET /v1/agents/:id/streams - Agent's managed streams
// ============================================
agents.get('/:id/streams', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  // Verify agent exists
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (agentError || !agent) {
    throw new NotFoundError('Agent', id);
  }
  
  // Get streams managed by this agent
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('managed_by_type', 'agent')
    .eq('managed_by_id', id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching agent streams:', error);
    return c.json({ error: 'Failed to fetch streams' }, 500);
  }
  
  const streams = (data || []).map(row => mapStreamFromDb(row));
  
  return c.json({ data: streams });
});

// ============================================
// GET /v1/agents/:id/limits - Agent's current limits & usage
// ============================================
agents.get('/:id/limits', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  // Verify agent exists
  const { data: agentExists } = await supabase
    .from('agents')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (!agentExists) {
    throw new NotFoundError('Agent', id);
  }
  
  const limitService = createLimitService(supabase);
  const stats = await limitService.getUsageStats(id);
  
  return c.json({ data: stats });
});

// ============================================
// POST /v1/agents/:id/verify - Mock KYA verification
// ============================================
agents.post('/:id/verify', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }
  
  // Parse body for tier
  let body;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  
  const tier = body.tier ?? 1; // Default to tier 1
  if (tier < 0 || tier > 3) {
    throw new ValidationError('KYA tier must be between 0 and 3');
  }
  
  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !existing) {
    throw new NotFoundError('Agent', id);
  }
  
  // Update KYA status
  const { data, error } = await supabase
    .from('agents')
    .update({
      kya_tier: tier,
      kya_status: tier > 0 ? 'verified' : 'unverified',
      kya_verified_at: tier > 0 ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select(`
      *,
      accounts!agents_parent_account_id_fkey (
        id, type, name, verification_tier
      )
    `)
    .single();
  
  if (error) {
    console.error('Error verifying agent:', error);
    return c.json({ error: 'Failed to verify agent' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'agent',
    entityId: id,
    action: 'kya_verified',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    changes: {
      before: { kya_tier: existing.kya_tier, kya_status: existing.kya_status },
      after: { kya_tier: tier, kya_status: tier > 0 ? 'verified' : 'unverified' },
    },
  });
  
  const agent = mapAgentFromDb(data);
  if (data.accounts) {
    agent.parentAccount = {
      id: data.accounts.id,
      type: data.accounts.type,
      name: data.accounts.name,
      verificationTier: data.accounts.verification_tier,
    };
  }
  
  return c.json({ data: agent });
});

export default agents;
