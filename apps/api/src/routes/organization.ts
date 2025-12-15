import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';

const organization = new Hono();

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  metadata: z.record(z.any()).optional(), // future use
});

function getClientInfo(c: any): { ip: string; userAgent: string } {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  return { ip, userAgent };
}

async function getCurrentUserAndTenant(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: { status: 401, body: { error: 'Missing or invalid authorization header' } } };
  }

  const accessToken = authHeader.slice(7);
  const supabase = createClient();

  // Use Supabase client to get user from access token
  const { data: userData, error } = await (supabase as any).auth.getUser(accessToken);
  if (error || !userData?.user) {
    return { error: { status: 401, body: { error: 'Invalid or expired token' } } };
  }

  const userId = userData.user.id;

  // Look up user profile & tenant
  const { data: profile } = await (supabase
    .from('user_profiles') as any)
    .select('tenant_id, role, name')
    .eq('id', userId)
    .single();

  if (!profile?.tenant_id) {
    return { error: { status: 403, body: { error: 'User is not linked to any organization' } } };
  }

  const { data: tenant, error: tenantError } = await (supabase
    .from('tenants') as any)
    .select('id, name, status, created_at, updated_at')
    .eq('id', profile.tenant_id)
    .single();

  if (tenantError || !tenant) {
    return { error: { status: 404, body: { error: 'Organization not found' } } };
  }

  return {
    user: userData.user,
    userProfile: profile,
    tenant,
  };
}

// ============================================
// GET /v1/organization - Get current organization
// ============================================
organization.get('/', async (c) => {
  const result = await getCurrentUserAndTenant(c);
  if ('error' in result) {
    return c.json(result.error.body, result.error.status);
  }

  const { tenant } = result;

  return c.json(
    {
      organization: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at,
      },
    },
    200
  );
});

// ============================================
// PATCH /v1/organization - Update organization
// (owner/admin only)
// ============================================
organization.patch('/', async (c) => {
  try {
    const result = await getCurrentUserAndTenant(c);
    if ('error' in result) {
      return c.json(result.error.body, result.error.status);
    }

    const { userProfile, tenant } = result;
    const role = userProfile.role as 'owner' | 'admin' | 'member' | 'viewer';

    if (role !== 'owner' && role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const validated = updateOrganizationSchema.parse(body);

    if (!validated.name && !validated.metadata) {
      return c.json({ error: 'No changes provided' }, 400);
    }

    const supabase = createClient();
    const updates: any = {};
    if (validated.name) updates.name = validated.name;
    if (validated.metadata) updates.settings = validated.metadata;

    const { data: updated, error: updateError } = await (supabase
      .from('tenants') as any)
      .update(updates)
      .eq('id', tenant.id)
      .select('id, name, status, created_at, updated_at')
      .single();

    if (updateError || !updated) {
      return c.json({ error: 'Failed to update organization' }, 500);
    }

    return c.json(
      {
        organization: {
          id: updated.id,
          name: updated.name,
          status: updated.status,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        },
      },
      200
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        400
      );
    }
    return c.json({ error: 'Failed to update organization' }, 500);
  }
});

export default organization;


