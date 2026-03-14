import { createClient } from '../db/client.js';

/**
 * Check if a tenant has reached their team member limit.
 * Throws a 403-style error if at capacity.
 */
export async function checkTeamMemberLimit(tenantId: string): Promise<void> {
  const supabase = createClient();

  // Get tenant's max_team_members limit
  const { data: tenant, error: tenantError } = await (supabase
    .from('tenants') as any)
    .select('max_team_members')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return; // If we can't find the tenant, don't block (fail open)
  }

  const maxMembers = tenant.max_team_members;
  if (!maxMembers) return; // No limit set

  // Count current team members
  const { count, error: countError } = await (supabase
    .from('user_profiles') as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (countError) {
    return; // Fail open on count errors
  }

  // Also count pending invites
  const { count: inviteCount } = await (supabase
    .from('team_invites') as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  const totalMembers = (count || 0) + (inviteCount || 0);

  if (totalMembers >= maxMembers) {
    const error: any = new Error(
      `Team member limit reached. Your plan allows ${maxMembers} team members. Contact us to increase your limit.`
    );
    error.status = 403;
    error.code = 'TEAM_MEMBER_LIMIT_REACHED';
    error.details = {
      current: totalMembers,
      limit: maxMembers,
    };
    throw error;
  }
}

/**
 * Check if a tenant has reached their agent limit.
 * Throws a 403-style error if at capacity.
 */
export async function checkAgentLimit(tenantId: string): Promise<void> {
  const supabase = createClient();

  // Get tenant's max_agents limit
  const { data: tenant, error: tenantError } = await (supabase
    .from('tenants') as any)
    .select('max_agents')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return; // Fail open
  }

  const maxAgents = tenant.max_agents;
  if (!maxAgents) return; // No limit set

  // Count current agents
  const { count, error: countError } = await (supabase
    .from('agents') as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (countError) {
    return; // Fail open
  }

  if ((count || 0) >= maxAgents) {
    const error: any = new Error(
      `Agent limit reached. Your plan allows ${maxAgents} agents. Contact us to increase your limit.`
    );
    error.status = 403;
    error.code = 'AGENT_LIMIT_REACHED';
    error.details = {
      current: count || 0,
      limit: maxAgents,
    };
    throw error;
  }
}

/**
 * Get current resource usage for a tenant.
 */
export async function getTenantResourceUsage(tenantId: string): Promise<{
  teamMembers: { current: number; limit: number | null };
  agents: { current: number; limit: number | null };
}> {
  const supabase = createClient();

  const [tenantResult, membersResult, agentsResult] = await Promise.all([
    (supabase.from('tenants') as any)
      .select('max_team_members, max_agents')
      .eq('id', tenantId)
      .single(),
    (supabase.from('user_profiles') as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    (supabase.from('agents') as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ]);

  return {
    teamMembers: {
      current: membersResult.count || 0,
      limit: tenantResult.data?.max_team_members || null,
    },
    agents: {
      current: agentsResult.count || 0,
      limit: tenantResult.data?.max_agents || null,
    },
  };
}

/**
 * Update tenant resource limits (platform admin only).
 */
export async function updateTenantLimits(
  tenantId: string,
  limits: { maxTeamMembers?: number; maxAgents?: number }
): Promise<any> {
  const supabase = createClient();

  const update: Record<string, any> = {};
  if (limits.maxTeamMembers !== undefined) {
    update.max_team_members = limits.maxTeamMembers;
  }
  if (limits.maxAgents !== undefined) {
    update.max_agents = limits.maxAgents;
  }

  const { data, error } = await (supabase
    .from('tenants') as any)
    .update(update)
    .eq('id', tenantId)
    .select('id, name, max_team_members, max_agents')
    .single();

  if (error) {
    throw new Error(`Failed to update tenant limits: ${error.message}`);
  }

  return data;
}
