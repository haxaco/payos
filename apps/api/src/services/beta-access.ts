import { createClient } from '../db/client.js';
import { randomBytes } from 'crypto';

// ============================================
// Types
// ============================================

export interface BetaCode {
  id: string;
  code: string;
  codeType: 'single_use' | 'multi_use';
  maxUses: number;
  currentUses: number;
  createdBy: string | null;
  partnerName: string | null;
  targetActorType: 'human' | 'agent' | 'both';
  grantedMaxTeamMembers: number;
  grantedMaxAgents: number;
  expiresAt: string | null;
  metadata: Record<string, any>;
  status: 'active' | 'exhausted' | 'revoked' | 'expired';
  createdAt: string;
}

export interface BetaApplication {
  id: string;
  email: string | null;
  agentName: string | null;
  applicantType: 'human' | 'agent';
  organizationName: string | null;
  useCase: string | null;
  referralSource: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  accessCodeId: string | null;
  ipAddress: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export type FunnelEventType =
  | 'application_submitted'
  | 'application_approved'
  | 'application_rejected'
  | 'code_redeemed'
  | 'signup_completed'
  | 'tenant_provisioned'
  | 'first_api_call'
  | 'first_transaction';

// ============================================
// Code Validation & Redemption
// ============================================

/**
 * Validate a beta access code without redeeming it.
 * Returns the code record if valid, or an error message.
 */
export async function validateBetaCode(
  code: string,
  actorType: 'human' | 'agent' = 'human'
): Promise<{ valid: boolean; code?: any; error?: string }> {
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('beta_access_codes') as any)
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid invite code' };
  }

  if (data.status === 'revoked') {
    return { valid: false, error: 'This invite code has been revoked' };
  }

  if (data.status === 'exhausted') {
    return { valid: false, error: 'This invite code has already been used' };
  }

  if (data.status === 'expired' || (data.expires_at && new Date(data.expires_at) < new Date())) {
    return { valid: false, error: 'This invite code has expired' };
  }

  if (data.current_uses >= data.max_uses) {
    return { valid: false, error: 'This invite code has reached its usage limit' };
  }

  // Check actor type compatibility
  if (data.target_actor_type !== 'both' && data.target_actor_type !== actorType) {
    return { valid: false, error: `This invite code is not valid for ${actorType} signup` };
  }

  return { valid: true, code: data };
}

/**
 * Redeem a beta access code (atomic increment).
 * Returns the updated code record or throws on failure.
 */
export async function redeemBetaCode(
  code: string,
  tenantId?: string
): Promise<{ code: any; grantedMaxTeamMembers: number; grantedMaxAgents: number }> {
  const supabase = createClient();

  // Atomic update: increment current_uses only if under max_uses
  const { data, error } = await (supabase
    .from('beta_access_codes') as any)
    .update({
      current_uses: (supabase as any).rpc ? undefined : undefined, // handled below
      updated_at: new Date().toISOString(),
    })
    .eq('code', code)
    .select('*')
    .single();

  // Use RPC for atomic increment since Supabase JS doesn't support SQL expressions
  // Fallback: read-then-write with optimistic check
  const { data: codeRecord, error: fetchError } = await (supabase
    .from('beta_access_codes') as any)
    .select('*')
    .eq('code', code)
    .single();

  if (fetchError || !codeRecord) {
    throw new Error('Invalid invite code');
  }

  if (codeRecord.current_uses >= codeRecord.max_uses) {
    throw new Error('Invite code has reached its usage limit');
  }

  const newUses = codeRecord.current_uses + 1;
  const newStatus = newUses >= codeRecord.max_uses ? 'exhausted' : codeRecord.status;

  const { data: updated, error: updateError } = await (supabase
    .from('beta_access_codes') as any)
    .update({
      current_uses: newUses,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('code', code)
    .eq('current_uses', codeRecord.current_uses) // Optimistic concurrency
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new Error('Failed to redeem invite code. Please try again.');
  }

  // Link tenant to the code if provided
  if (tenantId) {
    await (supabase
      .from('tenants') as any)
      .update({
        beta_access_code_id: updated.id,
        onboarded_via: updated.partner_name ? 'partner_code' : 'beta_code',
        max_team_members: updated.granted_max_team_members,
        max_agents: updated.granted_max_agents,
      })
      .eq('id', tenantId);
  }

  // Track funnel event
  await trackFunnelEvent('code_redeemed', {
    accessCodeId: updated.id,
    tenantId,
    actorType: updated.target_actor_type === 'agent' ? 'agent' : 'human',
    metadata: { partnerName: updated.partner_name },
  });

  return {
    code: updated,
    grantedMaxTeamMembers: updated.granted_max_team_members,
    grantedMaxAgents: updated.granted_max_agents,
  };
}

// ============================================
// Code Management (Platform Admin)
// ============================================

/**
 * Generate a beta access code with optional partner prefix.
 */
export async function createBetaCode(opts: {
  codeType?: 'single_use' | 'multi_use';
  maxUses?: number;
  createdBy: string;
  partnerName?: string;
  targetActorType?: 'human' | 'agent' | 'both';
  grantedMaxTeamMembers?: number;
  grantedMaxAgents?: number;
  expiresAt?: string;
  metadata?: Record<string, any>;
}): Promise<any> {
  const supabase = createClient();

  const suffix = randomBytes(6).toString('base64url');
  const prefix = opts.partnerName
    ? `beta_${opts.partnerName.toLowerCase().replace(/[^a-z0-9]/g, '')}_`
    : 'beta_';
  const code = `${prefix}${suffix}`;

  const { data, error } = await (supabase
    .from('beta_access_codes') as any)
    .insert({
      code,
      code_type: opts.codeType || 'single_use',
      max_uses: opts.maxUses || 1,
      created_by: opts.createdBy,
      partner_name: opts.partnerName || null,
      target_actor_type: opts.targetActorType || 'both',
      granted_max_team_members: opts.grantedMaxTeamMembers ?? 5,
      granted_max_agents: opts.grantedMaxAgents ?? 10,
      expires_at: opts.expiresAt || null,
      metadata: opts.metadata || {},
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create beta code: ${error.message}`);
  }

  return data;
}

/**
 * Revoke a beta access code.
 */
export async function revokeBetaCode(codeId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await (supabase
    .from('beta_access_codes') as any)
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', codeId);

  if (error) {
    throw new Error(`Failed to revoke code: ${error.message}`);
  }
}

/**
 * List all beta access codes with optional filters.
 */
export async function listBetaCodes(filters?: {
  status?: string;
  partnerName?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;

  let query = (supabase
    .from('beta_access_codes') as any)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.partnerName) {
    query = query.eq('partner_name', filters.partnerName);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list codes: ${error.message}`);
  }

  return { data: data || [], total: count || 0 };
}

// ============================================
// Applications
// ============================================

/**
 * Submit a beta application.
 */
export async function submitApplication(appData: {
  email?: string;
  agentName?: string;
  applicantType?: 'human' | 'agent';
  organizationName?: string;
  useCase?: string;
  referralSource?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}): Promise<any> {
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('beta_applications') as any)
    .insert({
      email: appData.email || null,
      agent_name: appData.agentName || null,
      applicant_type: appData.applicantType || 'human',
      organization_name: appData.organizationName || null,
      use_case: appData.useCase || null,
      referral_source: appData.referralSource || null,
      ip_address: appData.ipAddress || null,
      metadata: appData.metadata || {},
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to submit application: ${error.message}`);
  }

  // Track funnel event
  await trackFunnelEvent('application_submitted', {
    applicationId: data.id,
    actorType: appData.applicantType || 'human',
    metadata: { email: appData.email, organizationName: appData.organizationName },
  });

  return data;
}

/**
 * Approve a beta application and generate an invite code for the applicant.
 */
export async function approveApplication(
  applicationId: string,
  adminIdentifier: string
): Promise<{ application: any; code: any }> {
  const supabase = createClient();

  // Fetch application
  const { data: app, error: fetchError } = await (supabase
    .from('beta_applications') as any)
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) {
    throw new Error('Application not found');
  }

  if (app.status !== 'pending') {
    throw new Error(`Application is already ${app.status}`);
  }

  // Create single-use code for this applicant
  const code = await createBetaCode({
    codeType: 'single_use',
    maxUses: 1,
    createdBy: adminIdentifier,
    targetActorType: app.applicant_type === 'agent' ? 'agent' : 'human',
  });

  // Update application
  const { data: updated, error: updateError } = await (supabase
    .from('beta_applications') as any)
    .update({
      status: 'approved',
      reviewed_by: adminIdentifier,
      reviewed_at: new Date().toISOString(),
      access_code_id: code.id,
    })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(`Failed to approve application: ${updateError.message}`);
  }

  // Track funnel event
  await trackFunnelEvent('application_approved', {
    applicationId,
    accessCodeId: code.id,
    actorType: app.applicant_type,
  });

  return { application: updated, code };
}

/**
 * Reject a beta application.
 */
export async function rejectApplication(
  applicationId: string,
  adminIdentifier: string,
  notes?: string
): Promise<any> {
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('beta_applications') as any)
    .update({
      status: 'rejected',
      reviewed_by: adminIdentifier,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to reject application: ${error.message}`);
  }

  // Track funnel event
  await trackFunnelEvent('application_rejected', {
    applicationId,
    actorType: data.applicant_type,
  });

  return data;
}

/**
 * List beta applications with optional filters.
 */
export async function listApplications(filters?: {
  status?: string;
  applicantType?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: any[]; total: number }> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;

  let query = (supabase
    .from('beta_applications') as any)
    .select('*, beta_access_codes(code, partner_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.applicantType) {
    query = query.eq('applicant_type', filters.applicantType);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list applications: ${error.message}`);
  }

  return { data: data || [], total: count || 0 };
}

// ============================================
// Funnel Tracking
// ============================================

/**
 * Track a beta funnel event (fire-and-forget safe).
 */
export async function trackFunnelEvent(
  eventType: FunnelEventType,
  opts: {
    accessCodeId?: string;
    applicationId?: string;
    tenantId?: string;
    agentId?: string;
    actorType?: 'human' | 'agent';
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    const supabase = createClient();

    await (supabase
      .from('beta_funnel_events') as any)
      .insert({
        access_code_id: opts.accessCodeId || null,
        application_id: opts.applicationId || null,
        tenant_id: opts.tenantId || null,
        agent_id: opts.agentId || null,
        event_type: eventType,
        actor_type: opts.actorType || null,
        metadata: opts.metadata || {},
      });
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error('[beta-funnel] Failed to track event:', eventType, err);
  }
}

/**
 * Get funnel statistics grouped by partner.
 */
export async function getFunnelStats(): Promise<any> {
  const supabase = createClient();

  const { data: events, error } = await (supabase
    .from('beta_funnel_events') as any)
    .select('event_type, actor_type, access_code_id, beta_access_codes(partner_name)');

  if (error) {
    throw new Error(`Failed to get funnel stats: ${error.message}`);
  }

  // Aggregate counts by event type and partner
  const stats: Record<string, Record<string, number>> = {};
  const eventTypes: FunnelEventType[] = [
    'application_submitted', 'application_approved', 'application_rejected',
    'code_redeemed', 'signup_completed', 'tenant_provisioned',
    'first_api_call', 'first_transaction',
  ];

  // Initialize
  stats['_all'] = {};
  for (const et of eventTypes) {
    stats['_all'][et] = 0;
  }

  for (const event of events || []) {
    const partner = event.beta_access_codes?.partner_name || '_organic';
    if (!stats[partner]) {
      stats[partner] = {};
      for (const et of eventTypes) {
        stats[partner][et] = 0;
      }
    }
    stats[partner][event.event_type] = (stats[partner][event.event_type] || 0) + 1;
    stats['_all'][event.event_type] = (stats['_all'][event.event_type] || 0) + 1;
  }

  return {
    total: stats['_all'],
    byPartner: Object.fromEntries(
      Object.entries(stats).filter(([k]) => k !== '_all')
    ),
  };
}

// ============================================
// First-event tracking (with in-memory cache)
// ============================================

const firstEventCache = new Set<string>();

/**
 * Track a "first" event for a tenant (idempotent, cached in memory).
 * Returns true if this was the first time.
 */
export async function trackFirstEvent(
  tenantId: string,
  eventType: 'first_api_call' | 'first_transaction',
  metadata?: Record<string, any>
): Promise<boolean> {
  const cacheKey = `${tenantId}:${eventType}`;

  if (firstEventCache.has(cacheKey)) {
    return false;
  }

  // Check if event already exists in DB
  const supabase = createClient();
  const { data: existing } = await (supabase
    .from('beta_funnel_events') as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_type', eventType)
    .limit(1)
    .single();

  if (existing) {
    firstEventCache.add(cacheKey);
    return false;
  }

  // Insert the event
  await trackFunnelEvent(eventType, {
    tenantId,
    metadata,
  });

  firstEventCache.add(cacheKey);
  return true;
}
