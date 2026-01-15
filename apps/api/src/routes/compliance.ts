import { Hono } from 'hono';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../middleware/error.js';
import { logAudit, isValidUUID } from '../utils/helpers.js';
import { getComplianceProvider } from '../services/compliance/index.js';

const compliance = new Hono();

// Note: Auth middleware is applied globally in app.ts for all /v1 routes

// ============================================
// Interfaces
// ============================================

interface ComplianceFlagFilters {
  status?: string;
  risk_level?: string;
  flag_type?: string;
  account_id?: string;
  transfer_id?: string;
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface CreateFlagPayload {
  flag_type: 'transaction' | 'account' | 'pattern';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reason_code: string;
  reasons: string[];
  description?: string;
  account_id?: string;
  transfer_id?: string;
  ai_analysis?: {
    risk_score: number;
    risk_explanation: string;
    pattern_matches?: Array<{ description: string; percentage: number }>;
    suggested_actions?: Array<{ action: string; completed: boolean }>;
    confidence_level?: number;
  };
  due_date?: string;
  assigned_to_user_id?: string;
}

interface UpdateFlagPayload {
  status?: string;
  assigned_to_user_id?: string;
  review_notes?: string;
  resolution_action?: string;
  resolution_notes?: string;
}

// ============================================
// GET /compliance/flags - List all compliance flags
// ============================================
compliance.get('/flags', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Parse filters from query params
  const filters: ComplianceFlagFilters = {
    status: c.req.query('status'),
    risk_level: c.req.query('risk_level'),
    flag_type: c.req.query('flag_type'),
    account_id: c.req.query('account_id'),
    transfer_id: c.req.query('transfer_id'),
    assigned_to: c.req.query('assigned_to'),
    from_date: c.req.query('from_date'),
    to_date: c.req.query('to_date'),
    search: c.req.query('search'),
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  // Build query
  let query = supabase
    .from('compliance_flags')
    .select('*, accounts!account_id(id, name), transfers!transfer_id(id, from_account_name, to_account_name, amount)', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId);

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.risk_level) {
    query = query.eq('risk_level', filters.risk_level);
  }
  if (filters.flag_type) {
    query = query.eq('flag_type', filters.flag_type);
  }
  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }
  if (filters.transfer_id) {
    query = query.eq('transfer_id', filters.transfer_id);
  }
  if (filters.assigned_to) {
    query = query.eq('assigned_to_user_id', filters.assigned_to);
  }
  if (filters.from_date) {
    query = query.gte('created_at', filters.from_date);
  }
  if (filters.to_date) {
    query = query.lte('created_at', filters.to_date);
  }
  if (filters.search) {
    query = query.or(`description.ilike.%${filters.search}%,reason_code.ilike.%${filters.search}%`);
  }

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(filters.offset!, filters.offset! + filters.limit! - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return c.json({
    data,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / filters.limit!),
    },
  });
});

// ============================================
// GET /compliance/flags/:id - Get single compliance flag
// ============================================
compliance.get('/flags/:id', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const id = c.req.param('id');

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid flag ID');
  }

  const { data, error } = await supabase
    .from('compliance_flags')
    .select('*, accounts!account_id(id, name, type, email), transfers!transfer_id(id, from_account_id, from_account_name, to_account_id, to_account_name, amount, currency)')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Compliance flag not found');
  }

  return c.json({ data });
});

// ============================================
// POST /compliance/flags - Create new compliance flag
// ============================================
compliance.post('/flags', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const payload: CreateFlagPayload = await c.req.json();

  // Validation
  if (!payload.flag_type || !payload.risk_level || !payload.reason_code || !payload.reasons) {
    throw new ValidationError('Missing required fields: flag_type, risk_level, reason_code, reasons');
  }

  // Validate references
  if (payload.flag_type === 'transaction' && !payload.transfer_id) {
    throw new ValidationError('transfer_id is required for transaction flags');
  }
  if (payload.flag_type === 'account' && !payload.account_id) {
    throw new ValidationError('account_id is required for account flags');
  }

  // Calculate due date if not provided (default: 7 days for high/critical, 14 days for others)
  let dueDate = payload.due_date;
  if (!dueDate) {
    const days = ['high', 'critical'].includes(payload.risk_level) ? 7 : 14;
    dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  // Insert flag
  const { data, error } = await supabase
    .from('compliance_flags')
    .insert({
      tenant_id: ctx.tenantId,
      flag_type: payload.flag_type,
      risk_level: payload.risk_level,
      reason_code: payload.reason_code,
      reasons: payload.reasons,
      description: payload.description,
      account_id: payload.account_id,
      transfer_id: payload.transfer_id,
      ai_analysis: payload.ai_analysis || {},
      due_date: dueDate,
      assigned_to_user_id: payload.assigned_to_user_id,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;

  // Audit log
  await logAudit({
    tenantId: ctx.tenantId,
    entityType: 'compliance_flag',
    entityId: data.id,
    action: 'created',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName || undefined,
    metadata: {
      flag_type: payload.flag_type,
      risk_level: payload.risk_level,
      reason_code: payload.reason_code,
    },
  });

  return c.json({ data }, 201);
});

// ============================================
// PATCH /compliance/flags/:id - Update compliance flag
// ============================================
compliance.patch('/flags/:id', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const id = c.req.param('id');
  const payload: UpdateFlagPayload = await c.req.json();

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid flag ID');
  }

  // Fetch existing flag
  const { data: existing, error: fetchError } = await supabase
    .from('compliance_flags')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError('Compliance flag not found');
  }

  // Build update object
  const updates: Record<string, any> = {};

  if (payload.status) {
    updates.status = payload.status;
  }
  if (payload.assigned_to_user_id !== undefined) {
    updates.assigned_to_user_id = payload.assigned_to_user_id;
  }
  if (payload.review_notes) {
    updates.review_notes = payload.review_notes;
    updates.reviewed_by_user_id = ctx.userId;
    updates.reviewed_at = new Date().toISOString();
  }
  if (payload.resolution_action) {
    updates.resolution_action = payload.resolution_action;
    updates.resolution_notes = payload.resolution_notes;
    updates.resolved_by_user_id = ctx.userId;
    updates.resolved_at = new Date().toISOString();
    updates.status = 'resolved';
  }

  // Update flag
  const { data, error } = await supabase
    .from('compliance_flags')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) throw error;

  // Audit log
  await logAudit({
    tenantId: ctx.tenantId,
    entityType: 'compliance_flag',
    entityId: id,
    action: 'updated',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName || undefined,
    changes: updates,
  });

  return c.json({ data });
});

// ============================================
// POST /compliance/flags/:id/resolve - Resolve a compliance flag
// ============================================
compliance.post('/flags/:id/resolve', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const id = c.req.param('id');
  const { action, notes } = await c.req.json();

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid flag ID');
  }

  if (!action || !['approved', 'rejected', 'manual_review', 'escalated', 'no_action'].includes(action)) {
    throw new ValidationError('Invalid resolution action');
  }

  // Fetch existing flag
  const { data: existing, error: fetchError } = await supabase
    .from('compliance_flags')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError('Compliance flag not found');
  }

  if (existing.status === 'resolved') {
    throw new ValidationError('Flag is already resolved');
  }

  // Resolve flag
  const { data, error } = await supabase
    .from('compliance_flags')
    .update({
      resolution_action: action,
      resolution_notes: notes,
      resolved_by_user_id: ctx.userId,
      resolved_at: new Date().toISOString(),
      status: action === 'escalated' ? 'escalated' : 'resolved',
      escalated_at: action === 'escalated' ? new Date().toISOString() : existing.escalated_at,
    })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) throw error;

  // Audit log
  await logAudit({
    tenantId: ctx.tenantId,
    entityType: 'compliance_flag',
    entityId: id,
    action: action === 'escalated' ? 'escalated' : 'resolved',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName || undefined,
    metadata: {
      resolution_action: action,
      has_notes: !!notes,
    },
  });

  return c.json({ data });
});

// ============================================
// POST /compliance/flags/:id/assign - Assign flag to user
// ============================================
compliance.post('/flags/:id/assign', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const id = c.req.param('id');
  const { user_id } = await c.req.json();

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid flag ID');
  }

  if (!user_id || !isValidUUID(user_id)) {
    throw new ValidationError('Invalid user ID');
  }

  // Update flag
  const { data, error } = await supabase
    .from('compliance_flags')
    .update({
      assigned_to_user_id: user_id,
      status: 'pending_review',
    })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('Compliance flag not found');
    }
    throw error;
  }

  // Audit log
  await logAudit({
    tenantId: ctx.tenantId,
    entityType: 'compliance_flag',
    entityId: id,
    action: 'assigned',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName || undefined,
    metadata: {
      assigned_to_user_id: user_id,
    },
  });

  return c.json({ data });
});

// ============================================
// GET /compliance/stats - Get compliance statistics
// ============================================
compliance.get('/stats', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from('compliance_flags')
    .select('status')
    .eq('tenant_id', ctx.tenantId);

  // Get counts by risk level
  const { data: riskCounts } = await supabase
    .from('compliance_flags')
    .select('risk_level')
    .eq('tenant_id', ctx.tenantId)
    .neq('status', 'resolved');

  // Get due soon (next 7 days)
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: dueSoon } = await supabase
    .from('compliance_flags')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .neq('status', 'resolved')
    .lte('due_date', sevenDaysFromNow);

  // Calculate stats
  const stats = {
    total: statusCounts?.length || 0,
    by_status: {
      open: statusCounts?.filter(f => f.status === 'open').length || 0,
      pending_review: statusCounts?.filter(f => f.status === 'pending_review').length || 0,
      under_investigation: statusCounts?.filter(f => f.status === 'under_investigation').length || 0,
      escalated: statusCounts?.filter(f => f.status === 'escalated').length || 0,
      resolved: statusCounts?.filter(f => f.status === 'resolved').length || 0,
      dismissed: statusCounts?.filter(f => f.status === 'dismissed').length || 0,
    },
    by_risk_level: {
      low: riskCounts?.filter(f => f.risk_level === 'low').length || 0,
      medium: riskCounts?.filter(f => f.risk_level === 'medium').length || 0,
      high: riskCounts?.filter(f => f.risk_level === 'high').length || 0,
      critical: riskCounts?.filter(f => f.risk_level === 'critical').length || 0,
    },
    due_soon: dueSoon?.length || 0,
  };

  return c.json({ data: stats });
});

// ============================================
// SCREENING ENDPOINTS (Story 40.18)
// ============================================

/**
 * POST /compliance/screen/wallet - Screen a cryptocurrency wallet
 */
compliance.post('/screen/wallet', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const { address, chain, context } = await c.req.json();

  if (!address || !chain) {
    throw new ValidationError('Missing required fields: address, chain');
  }

  // Perform screening
  const provider = getComplianceProvider();
  const result = await provider.screenWallet({ address, chain, context });

  // Store screening result
  const { error } = await supabase
    .from('compliance_screenings')
    .insert({
      tenant_id: ctx.tenantId,
      type: 'wallet',
      subject: { address, chain },
      result: result.result,
      risk_level: result.result.risk_level,
      provider: result.result.provider,
      context,
    });

  if (error) {
    console.error('[Compliance] Failed to store screening:', error);
    // Don't fail the request, just log
  }

  // Auto-create compliance flag if high risk
  if (result.result.risk_level === 'HIGH' || result.result.risk_level === 'SEVERE') {
    await supabase
      .from('compliance_flags')
      .insert({
        tenant_id: ctx.tenantId,
        flag_type: 'transaction',
        risk_level: result.result.risk_level.toLowerCase(),
        reason_code: 'WALLET_SCREENING_ALERT',
        reasons: result.result.flags,
        description: `Wallet ${address.slice(0, 10)}... flagged with risk level ${result.result.risk_level}`,
        ai_analysis: {
          risk_score: result.result.risk_score,
          risk_explanation: `Wallet screening returned ${result.result.risk_level} risk`,
          categories: result.result.categories,
        },
        status: 'open',
      });
  }

  // Audit log
  await logAudit({
    tenantId: ctx.tenantId,
    entityType: 'compliance_screening',
    entityId: result.id,
    action: 'wallet_screened',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    metadata: {
      address: address.slice(0, 10) + '...',
      chain,
      risk_level: result.result.risk_level,
    },
  });

  return c.json({ data: result });
});

/**
 * POST /compliance/screen/entity - Screen an entity (person/company)
 */
compliance.post('/screen/entity', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const { name, type, country, date_of_birth, context } = await c.req.json();

  if (!name || !type) {
    throw new ValidationError('Missing required fields: name, type');
  }

  if (!['individual', 'company'].includes(type)) {
    throw new ValidationError('type must be "individual" or "company"');
  }

  // Perform screening
  const provider = getComplianceProvider();
  const result = await provider.screenEntity({ name, type, country, date_of_birth, context });

  // Store screening result
  const { error } = await supabase
    .from('compliance_screenings')
    .insert({
      tenant_id: ctx.tenantId,
      type: 'entity',
      subject: { name, type, country },
      result: result.result,
      risk_level: result.result.risk_level,
      provider: result.result.provider,
      context,
    });

  if (error) {
    console.error('[Compliance] Failed to store screening:', error);
  }

  // Auto-create compliance flag if matches found
  if (result.result.matches.length > 0 || result.result.pep_status) {
    await supabase
      .from('compliance_flags')
      .insert({
        tenant_id: ctx.tenantId,
        flag_type: 'account',
        risk_level: result.result.risk_level.toLowerCase(),
        reason_code: result.result.matches.length > 0 ? 'SANCTIONS_MATCH' : 'PEP_IDENTIFIED',
        reasons: result.result.matches.map(m => `${m.list}: ${m.matched_name} (${m.match_score}%)`),
        description: `Entity "${name}" flagged: ${result.result.matches.length} sanctions matches, PEP: ${result.result.pep_status}`,
        ai_analysis: {
          risk_score: result.result.matches.length > 0 ? 95 : 60,
          risk_explanation: result.result.matches.length > 0 
            ? `Found ${result.result.matches.length} sanctions list matches`
            : 'Identified as Politically Exposed Person',
          matches: result.result.matches,
        },
        status: 'open',
      });
  }

  // Audit log
  await logAudit({
    tenantId: ctx.tenantId,
    entityType: 'compliance_screening',
    entityId: result.id,
    action: 'entity_screened',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    metadata: {
      name: name.slice(0, 20),
      type,
      risk_level: result.result.risk_level,
      matches_found: result.result.matches.length,
    },
  });

  return c.json({ data: result });
});

/**
 * POST /compliance/screen/bank - Screen a bank account
 */
compliance.post('/screen/bank', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const { account_type, account_id, country, context } = await c.req.json();

  if (!account_type || !account_id || !country) {
    throw new ValidationError('Missing required fields: account_type, account_id, country');
  }

  if (!['pix', 'spei', 'wire', 'ach'].includes(account_type)) {
    throw new ValidationError('account_type must be one of: pix, spei, wire, ach');
  }

  // Perform screening
  const provider = getComplianceProvider();
  const result = await provider.screenBankAccount({ account_type, account_id, country, context });

  // Store screening result
  const { error } = await supabase
    .from('compliance_screenings')
    .insert({
      tenant_id: ctx.tenantId,
      type: 'bank',
      subject: { account_type, account_id: account_id.slice(-4).padStart(account_id.length, '*'), country },
      result: result.result,
      risk_level: result.result.risk_level,
      provider: result.result.provider,
      context,
    });

  if (error) {
    console.error('[Compliance] Failed to store screening:', error);
  }

  // Auto-create compliance flag if blocked or suspicious
  if (result.result.account_status === 'blocked' || result.result.account_status === 'suspicious') {
    await supabase
      .from('compliance_flags')
      .insert({
        tenant_id: ctx.tenantId,
        flag_type: 'account',
        risk_level: result.result.risk_level.toLowerCase(),
        reason_code: 'BANK_ACCOUNT_ALERT',
        reasons: result.result.flags,
        description: `Bank account ${account_id.slice(-4)} flagged as ${result.result.account_status}`,
        ai_analysis: {
          risk_score: result.result.account_status === 'blocked' ? 95 : 70,
          risk_explanation: `Bank account status: ${result.result.account_status}`,
        },
        status: 'open',
      });
  }

  // Audit log
  await logAudit({
    tenantId: ctx.tenantId,
    entityType: 'compliance_screening',
    entityId: result.id,
    action: 'bank_screened',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    metadata: {
      account_type,
      country,
      risk_level: result.result.risk_level,
      status: result.result.account_status,
    },
  });

  return c.json({ data: result });
});

/**
 * GET /compliance/screenings - List screening history
 */
compliance.get('/screenings', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const type = c.req.query('type');
  const risk_level = c.req.query('risk_level');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = supabase
    .from('compliance_screenings')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq('type', type);
  if (risk_level) query = query.eq('risk_level', risk_level);

  const { data, error, count } = await query;

  if (error) throw error;

  return c.json({
    data,
    pagination: {
      limit,
      offset,
      total: count || 0,
    },
  });
});

/**
 * GET /compliance/screenings/:id - Get a specific screening result
 */
compliance.get('/screenings/:id', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const id = c.req.param('id');

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid screening ID');
  }

  const { data, error } = await supabase
    .from('compliance_screenings')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Screening not found');
  }

  return c.json({ data });
});

export { compliance };

