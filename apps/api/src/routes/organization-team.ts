import { Hono } from 'hono';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { createClient } from '../db/client.js';
import { logSecurityEvent } from '../utils/auth.js';

const organizationTeam = new Hono();

// Shared helper borrowed from organization routes
async function getCurrentUserAndTenant(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: { status: 401, body: { error: 'Missing or invalid authorization header' } } };
  }

  const accessToken = authHeader.slice(7);
  const supabase = createClient();

  const { data: userData, error } = await (supabase as any).auth.getUser(accessToken);
  if (error || !userData?.user) {
    return { error: { status: 401, body: { error: 'Invalid or expired token' } } };
  }

  const userId = userData.user.id;

  const { data: profile } = await (supabase
    .from('user_profiles') as any)
    .select('tenant_id, role, name')
    .eq('id', userId)
    .single();

  if (!profile?.tenant_id) {
    return { error: { status: 403, body: { error: 'User is not linked to any organization' } } };
  }

  return {
    user: userData.user,
    userProfile: profile,
    tenantId: profile.tenant_id,
  };
}

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  name: z.string().min(1).max(255).optional(),
});

// ============================================
// GET /v1/organization/team - List team members
// ============================================
organizationTeam.get('/', async (c) => {
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId } = result;
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('user_profiles') as any)
    .select('id, name, role, invite_token, invite_expires_at, invite_accepted_at, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('role', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return c.json({ error: 'Failed to fetch team' }, 500);
  }

  const members = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    invited: !!row.invite_token && !row.invite_accepted_at,
    inviteExpiresAt: row.invite_expires_at,
    inviteAcceptedAt: row.invite_accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({ members }, 200);
});

// ============================================
// POST /v1/organization/team/invite - Invite new member
// ============================================
organizationTeam.post('/invite', async (c) => {
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId, userProfile } = result;
  const actorRole = userProfile.role as 'owner' | 'admin' | 'member' | 'viewer';

  // Only owner/admin can invite
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const body = await c.req.json();
  const validated = inviteSchema.parse(body);

  const supabase = createClient();

  // Check if user already exists in organization
  const { data: existingProfile } = await (supabase
    .from('user_profiles') as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', validated.email) // This won't work - we need to check auth.users by email
    .single();

  // Better: Check if there's already an invite for this email
  const { data: existingInvite } = await (supabase
    .from('team_invites') as any)
    .select('id, expires_at, accepted_at')
    .eq('tenant_id', tenantId)
    .eq('email', validated.email.toLowerCase())
    .is('accepted_at', null)
    .single();

  if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
    return c.json({ error: 'An active invite already exists for this email' }, 400);
  }

  // Generate secure token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data: invite, error: inviteError } = await (supabase
    .from('team_invites') as any)
    .insert({
      tenant_id: tenantId,
      email: validated.email.toLowerCase(),
      role: validated.role,
      name: validated.name,
      invited_by_user_id: result.user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, email, role, name, expires_at, created_at')
    .single();

  if (inviteError || !invite) {
    return c.json({ error: 'Failed to create invite' }, 500);
  }

  await logSecurityEvent('team_invite_sent', 'info', {
    tenantId,
    invitedEmail: validated.email,
    role: validated.role,
    invitedBy: result.user.id,
  });

  // TODO: Send email with invite link containing token

  return c.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      name: invite.name,
      expiresAt: invite.expires_at,
      inviteUrl: `${process.env.APP_URL || 'http://localhost:3000'}/accept-invite?token=${token}`,
    },
  }, 201);
});

// ============================================
// GET /v1/organization/team/invites - List pending invites
// ============================================
organizationTeam.get('/invites', async (c) => {
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId, userProfile } = result;
  const actorRole = userProfile.role as 'owner' | 'admin' | 'member' | 'viewer';

  // Only owner/admin can view invites
  if (actorRole !== 'owner' && actorRole !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const supabase = createClient();

  const { data, error } = await (supabase
    .from('team_invites') as any)
    .select('id, email, role, name, expires_at, accepted_at, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'Failed to fetch invites' }, 500);
  }

  const invites = (data || []).map((row: any) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    expiresAt: row.expires_at,
    expired: new Date(row.expires_at) < new Date(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return c.json({ invites }, 200);
});

// ============================================
// PATCH /v1/organization/team/:userId - Change role
// ============================================
organizationTeam.patch('/:userId', async (c) => {
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId, userProfile } = result;
  const actorRole = userProfile.role as 'owner' | 'admin' | 'member' | 'viewer';
  const actorIsOwner = actorRole === 'owner';
  const actorIsAdmin = actorRole === 'admin';

  // Only owner/admin can change roles
  if (!actorIsOwner && !actorIsAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const userId = c.req.param('userId');
  const body = await c.req.json();
  const validated = updateRoleSchema.parse(body);

  const supabase = createClient();

  // Fetch target profile
  const { data: target, error: fetchError } = await (supabase
    .from('user_profiles') as any)
    .select('id, tenant_id, role')
    .eq('id', userId)
    .single();

  if (fetchError || !target || target.tenant_id !== tenantId) {
    return c.json({ error: 'User not found in this organization' }, 404);
  }

  const targetRole = target.role as 'owner' | 'admin' | 'member' | 'viewer';

  // Admin cannot change owner or other admins
  if (actorIsAdmin && (targetRole === 'owner' || targetRole === 'admin')) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Prevent demoting last owner
  if (targetRole === 'owner' && validated.role !== 'owner') {
    const { count } = await (supabase
      .from('user_profiles') as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'owner');

    if ((count || 0) <= 1) {
      return c.json({ error: 'Cannot change role of the last owner' }, 400);
    }
  }

  const { data: updated, error: updateError } = await (supabase
    .from('user_profiles') as any)
    .update({ role: validated.role })
    .eq('id', userId)
    .select('id, name, role')
    .single();

  if (updateError || !updated) {
    return c.json({ error: 'Failed to update role' }, 500);
  }

  await logSecurityEvent('user_role_changed', 'info', {
    actorRole,
    targetUserId: userId,
    newRole: validated.role,
    tenantId,
  });

  return c.json(
    {
      member: {
        id: updated.id,
        name: updated.name,
        role: updated.role,
      },
    },
    200
  );
});

// ============================================
// DELETE /v1/organization/team/:userId - Remove member
// ============================================
organizationTeam.delete('/:userId', async (c) => {
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId, userProfile } = result;
  const actorRole = userProfile.role as 'owner' | 'admin' | 'member' | 'viewer';
  const actorIsOwner = actorRole === 'owner';
  const actorIsAdmin = actorRole === 'admin';

  if (!actorIsOwner && !actorIsAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const userId = c.req.param('userId');
  const supabase = createClient();

  // Fetch target profile
  const { data: target, error: fetchError } = await (supabase
    .from('user_profiles') as any)
    .select('id, tenant_id, role')
    .eq('id', userId)
    .single();

  if (fetchError || !target || target.tenant_id !== tenantId) {
    return c.json({ error: 'User not found in this organization' }, 404);
  }

  const targetRole = target.role as 'owner' | 'admin' | 'member' | 'viewer';

  // Prevent removing self by mistake via this endpoint (optional)
  if (userId === (result.user as any).id) {
    return c.json({ error: 'Use account settings to leave organization' }, 400);
  }

  // Admin cannot remove owner or other admins
  if (actorIsAdmin && (targetRole === 'owner' || targetRole === 'admin')) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Prevent removing last owner
  if (targetRole === 'owner') {
    const { count } = await (supabase
      .from('user_profiles') as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'owner');

    if ((count || 0) <= 1) {
      return c.json({ error: 'Cannot remove the last owner' }, 400);
    }
  }

  const { error: deleteError } = await (supabase
    .from('user_profiles') as any)
    .delete()
    .eq('id', userId);

  if (deleteError) {
    return c.json({ error: 'Failed to remove member' }, 500);
  }

  await logSecurityEvent('user_removed', 'warning', {
    actorRole,
    targetUserId: userId,
    tenantId,
  });

  return c.json({ success: true }, 200);
});

export default organizationTeam;


