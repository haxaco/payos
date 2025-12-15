import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { createAdminClient } from '../db/admin-client.js';
import { ValidationError } from '../middleware/error.js';
import {
  validatePassword,
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  checkRateLimit,
  logSecurityEvent,
  addRandomDelay,
} from '../utils/auth.js';

const auth = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const signupSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(12).max(128),
  organizationName: z.string().min(1).max(255),
  userName: z.string().min(1).max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(1).max(255),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(255).optional(),
});

function getClientInfo(c: any): { ip: string; userAgent: string } {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  return { ip, userAgent };
}

// ============================================
// POST /v1/auth/signup - Self-service signup
// ============================================
auth.post('/signup', async (c) => {
  try {
    const { ip, userAgent } = getClientInfo(c);

    // Rate limiting: 10 signups per hour per IP
    const rateLimit = await checkRateLimit(`signup:${ip}`, 60 * 60 * 1000, 10);
    if (!rateLimit.allowed) {
      await logSecurityEvent('signup_rate_limited', 'warning', { ip, userAgent });
      return c.json(
        {
          error: 'Too many signup attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        429
      );
    }

    // Validate request body
    const body = await c.req.json();
    const validated = signupSchema.parse(body);

    // Validate password strength
    const passwordValidation = validatePassword(validated.password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Password validation failed',
          details: passwordValidation.errors,
        },
        400
      );
    }

    const supabase = createClient();

    // Get Supabase URL and service role key for admin operations
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return c.json(
        {
          error: 'Server configuration error',
        },
        500
      );
    }

    // Create user in Supabase Auth using REST API
    // We'll handle duplicate email errors generically
    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        email: validated.email,
        password: validated.password,
        email_confirm: true,
        user_metadata: {
          name: validated.userName || validated.email.split('@')[0],
        },
      }),
    });

    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json().catch(() => ({}));
      
      // Generic error for any failure (including duplicate email) to prevent enumeration
      await addRandomDelay();
      await logSecurityEvent('signup_failure', 'info', {
        ip,
        userAgent,
        email: validated.email,
        reason: errorData.msg || 'unknown_error',
      });
      return c.json(
        {
          error: 'Unable to create account. Please check your information and try again.',
        },
        400
      );
    }

    const authData = await createUserResponse.json();

    if (!authData || !authData.id) {
      await logSecurityEvent('signup_failure', 'warning', {
        ip,
        userAgent,
        email: validated.email,
        error: 'user_creation_failed',
      });
      return c.json(
        {
          error: 'Unable to create account. Please try again.',
        },
        500
      );
    }

    const userId = authData.id;

    // Create tenant
    // Note: api_key and api_key_hash are required for backwards compatibility
    // We'll generate a legacy key, but new keys should use the api_keys table
    const legacyApiKey = generateApiKey('test');
    const { data: tenant, error: tenantError } = await (supabase
      .from('tenants') as any)
      .insert({
        name: validated.organizationName,
        status: 'active',
        api_key: legacyApiKey, // Legacy field for backwards compatibility
        api_key_hash: hashApiKey(legacyApiKey),
        api_key_prefix: getKeyPrefix(legacyApiKey),
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      // Rollback: delete auth user via REST API
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      });
      await logSecurityEvent('signup_failure', 'warning', {
        ip,
        userAgent,
        userId,
        error: 'tenant_creation_failed',
      });
      return c.json(
        {
          error: 'Failed to create organization',
        },
        500
      );
    }

    // Create user profile
    const { error: profileError } = await (supabase
      .from('user_profiles') as any)
      .insert({
        id: userId,
        tenant_id: tenant.id,
        role: 'owner',
        name: validated.userName || validated.email.split('@')[0],
      });

    if (profileError) {
      // Rollback: delete tenant and auth user
      await supabase.from('tenants').delete().eq('id', tenant.id);
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      });
      await logSecurityEvent('signup_failure', 'warning', {
        ip,
        userAgent,
        userId,
        tenantId: tenant.id,
        error: 'profile_creation_failed',
      });
      return c.json(
        {
          error: 'Failed to create user profile',
        },
        500
      );
    }

    // Create tenant settings with defaults
    await (supabase.from('tenant_settings') as any).insert({
      tenant_id: tenant.id,
    });

    // Generate API keys
    const testKey = generateApiKey('test');
    const liveKey = generateApiKey('live');

    const { error: keysError } = await (supabase.from('api_keys') as any).insert([
      {
        tenant_id: tenant.id,
        created_by_user_id: userId,
        name: 'Default Test Key',
        environment: 'test',
        key_prefix: getKeyPrefix(testKey),
        key_hash: hashApiKey(testKey),
      },
      {
        tenant_id: tenant.id,
        created_by_user_id: userId,
        name: 'Default Live Key',
        environment: 'live',
        key_prefix: getKeyPrefix(liveKey),
        key_hash: hashApiKey(liveKey),
      },
    ]);

    if (keysError) {
      // Keys are optional, log but don't fail
      console.error('Failed to create API keys:', keysError);
    }

    // Generate session tokens
    // Use the admin API to create a session
    const sessionResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        email: validated.email,
        password: validated.password,
      }),
    });

    let sessionData: { access_token?: string; refresh_token?: string } | null = null;
    if (sessionResponse.ok) {
      sessionData = await sessionResponse.json();
    }

    // Log security event
    await logSecurityEvent('signup_success', 'info', {
      userId,
      tenantId: tenant.id,
      ip,
      userAgent,
    });

    // Return response (keys shown only once)
    return c.json(
      {
        user: {
          id: userId,
          email: validated.email,
          name: validated.userName || validated.email.split('@')[0],
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
        apiKeys: {
          test: {
            key: testKey, // Shown only once
            prefix: getKeyPrefix(testKey),
          },
          live: {
            key: liveKey, // Shown only once
            prefix: getKeyPrefix(liveKey),
          },
        },
        session: {
          accessToken: sessionData?.access_token || null,
          refreshToken: sessionData?.refresh_token || null,
        },
        warning: 'API keys are shown only once. Please save them securely.',
      },
      201
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
    throw error;
  }
});

// ============================================
// POST /v1/auth/login - Email/password login
// ============================================
auth.post('/login', async (c) => {
  try {
    const { ip, userAgent } = getClientInfo(c);

    // Validate request body
    const body = await c.req.json();
    const validated = loginSchema.parse(body);

    // Rate limiting: 5 attempts per 15 minutes per account and IP
    const accountLimit = await checkRateLimit(
      `login:${validated.email}`,
      15 * 60 * 1000,
      5
    );
    if (!accountLimit.allowed) {
      await logSecurityEvent('login_rate_limited', 'warning', {
        ip,
        userAgent,
        email: validated.email,
      });
      return c.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: accountLimit.retryAfter,
        },
        429
      );
    }

    const ipLimit = await checkRateLimit(
      `login:ip:${ip}`,
      15 * 60 * 1000,
      100
    );
    if (!ipLimit.allowed) {
      await logSecurityEvent('login_rate_limited', 'warning', {
        ip,
        userAgent,
        email: validated.email,
      });
      return c.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: ipLimit.retryAfter,
        },
        429
      );
    }

    const supabase = createClient();
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return c.json(
        {
          error: 'Server configuration error',
        },
        500
      );
    }

    // Find user profile & tenant for lockout and context
    let userId: string | null = null;
    try {
      const listUsersResp = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(
          validated.email
        )}`,
        {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
        }
      );
      if (listUsersResp.ok) {
        const listData: any = await listUsersResp.json();
        if (Array.isArray(listData.users) && listData.users.length > 0) {
          userId = listData.users[0].id;
        }
      }
    } catch {
      // Ignore admin lookup errors; we'll still attempt login
    }

    // If we have a userId, check lockout status from user_profiles
    if (userId) {
      const { data: profile } = await (supabase
        .from('user_profiles') as any)
        .select('failed_login_attempts, locked_until, tenant_id, role, name')
        .eq('id', userId)
        .single();

      if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
        await logSecurityEvent('account_locked', 'warning', {
          ip,
          userAgent,
          userId,
        });
        return c.json(
          {
            error: 'Too many login attempts. Your account is temporarily locked.',
          },
          429
        );
      }
    }

    // Attempt to create a session via Supabase Auth (password grant)
    const sessionResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          email: validated.email,
          password: validated.password,
        }),
      }
    );

    if (!sessionResponse.ok) {
      // Login failed: invalid credentials or other error
      if (userId) {
        // Increment failed_login_attempts and possibly lock account
        const { data: profile } = await (supabase
          .from('user_profiles') as any)
          .select('failed_login_attempts')
          .eq('id', userId)
          .single();

        const attempts = (profile?.failed_login_attempts ?? 0) + 1;
        const updates: any = {
          failed_login_attempts: attempts,
          last_failed_login_at: new Date().toISOString(),
          last_failed_login_ip: ip,
        };

        if (attempts >= 5) {
          const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          updates.locked_until = lockedUntil.toISOString();
        }

        await (supabase.from('user_profiles') as any)
          .update(updates)
          .eq('id', userId);

        if (attempts >= 5) {
          await logSecurityEvent('account_locked', 'warning', {
            ip,
            userAgent,
            userId,
          });
        }
      }

      await addRandomDelay();
      await logSecurityEvent('login_failure', 'info', {
        ip,
        userAgent,
        email: validated.email,
      });

      return c.json(
        {
          error: 'Invalid credentials',
        },
        400
      );
    }

    const sessionData: any = await sessionResponse.json();
    const accessToken: string | undefined = sessionData.access_token;
    const refreshToken: string | undefined = sessionData.refresh_token;

    // Look up user profile & tenant info for response
    let userProfile: any = null;
    let tenant: any = null;
    if (userId) {
      const { data: profile } = await (supabase
        .from('user_profiles') as any)
        .select('tenant_id, role, name')
        .eq('id', userId)
        .single();
      userProfile = profile;

      if (profile?.tenant_id) {
        const { data: tenantData } = await (supabase
          .from('tenants') as any)
          .select('id, name, status')
          .eq('id', profile.tenant_id)
          .single();
        tenant = tenantData;
      }
    }

    if (userId) {
      // Reset failed_login_attempts on success
      await (supabase.from('user_profiles') as any)
        .update({
          failed_login_attempts: 0,
          locked_until: null,
        })
        .eq('id', userId);
    }

    await logSecurityEvent('login_success', 'info', {
      ip,
      userAgent,
      userId,
      tenantId: tenant?.id,
    });

    return c.json(
      {
        user: {
          id: userId,
          email: validated.email,
          name: userProfile?.name || validated.email.split('@')[0],
          role: userProfile?.role || 'member',
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
            }
          : null,
        session: {
          accessToken: accessToken || null,
          refreshToken: refreshToken || null,
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
    throw error;
  }
});

// ============================================
// GET /v1/auth/me - Get current user from access token
// ============================================
auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const accessToken = authHeader.slice(7);
    const supabase = createClient();

    // Use Supabase client to get user from access token
    const { data: userData, error } = await (supabase as any).auth.getUser(
      accessToken
    );

    if (error || !userData?.user) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const userId = userData.user.id;

    // Look up user profile & tenant
    const { data: profile } = await (supabase
      .from('user_profiles') as any)
      .select('tenant_id, role, name')
      .eq('id', userId)
      .single();

    let tenant: any = null;
    if (profile?.tenant_id) {
      const { data: tenantData } = await (supabase
        .from('tenants') as any)
        .select('id, name, status')
        .eq('id', profile.tenant_id)
        .single();
      tenant = tenantData;
    }

    return c.json(
      {
        user: {
          id: userId,
          email: userData.user.email,
          name: profile?.name || userData.user.email?.split('@')[0],
          role: profile?.role || 'member',
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
            }
          : null,
      },
      200
    );
  } catch (error) {
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// ============================================
// POST /v1/auth/accept-invite - Accept team invite
// ============================================
auth.post('/accept-invite', async (c) => {
  try {
    const { ip, userAgent } = getClientInfo(c);

    // Rate limiting: 10 attempts per hour per IP
    const rateLimit = await checkRateLimit(`accept-invite:${ip}`, 60 * 60 * 1000, 10);
    if (!rateLimit.allowed) {
      await logSecurityEvent('accept_invite_rate_limited', 'warning', { ip, userAgent });
      return c.json(
        {
          error: 'Too many attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        429
      );
    }

    const body = await c.req.json();
    const validated = acceptInviteSchema.parse(body);

    // Validate password strength
    const passwordValidation = validatePassword(validated.password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'Password validation failed',
          details: passwordValidation.errors,
        },
        400
      );
    }

    const supabase = createClient();

    // Look up invite by token
    const { data: invite, error: inviteError } = await (supabase
      .from('team_invites') as any)
      .select('id, tenant_id, email, role, name, expires_at, accepted_at')
      .eq('token', validated.token)
      .single();

    if (inviteError || !invite) {
      await addRandomDelay();
      return c.json({ error: 'Invalid or expired invite token' }, 400);
    }

    // Check if already accepted
    if (invite.accepted_at) {
      return c.json({ error: 'This invite has already been accepted' }, 400);
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return c.json({ error: 'This invite has expired' }, 400);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return c.json({ error: 'Server configuration error' }, 500);
    }

    // Use admin client to check if user exists
    const adminClient = createAdminClient();
    const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
    
    let userId: string | null = null;
    if (existingUsers && existingUsers.users) {
      const matchingUser = existingUsers.users.find(
        (u: any) => u.email?.toLowerCase() === invite.email.toLowerCase()
      );
      
      if (matchingUser) {
        userId = matchingUser.id;
        
        // Check if user already has a profile (already belongs to an org)
        const { data: existingProfile } = await (supabase
          .from('user_profiles') as any)
          .select('id, tenant_id')
          .eq('id', userId)
          .single();

        if (existingProfile) {
          return c.json(
            { error: 'This email is already associated with an organization' },
            400
          );
        }
      }
    }

    // Create new user if doesn't exist
    if (!userId) {
      const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({
          email: invite.email,
          password: validated.password,
          email_confirm: true,
          user_metadata: {
            name: validated.name || invite.name || invite.email.split('@')[0],
          },
        }),
      });

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json().catch(() => ({}));
        await addRandomDelay();
        await logSecurityEvent('accept_invite_failure', 'warning', {
          ip,
          userAgent,
          email: invite.email,
          reason: errorData.msg || 'user_creation_failed',
        });
        return c.json({ error: 'Failed to create user account' }, 500);
      }

      const authData = await createUserResponse.json();
      if (!authData || !authData.id) {
        return c.json({ error: 'Failed to create user account' }, 500);
      }
      userId = authData.id;
    }

    // Create user profile
    const { error: profileError } = await (supabase
      .from('user_profiles') as any)
      .insert({
        id: userId,
        tenant_id: invite.tenant_id,
        role: invite.role,
        name: validated.name || invite.name || invite.email.split('@')[0],
      });

    if (profileError) {
      await logSecurityEvent('accept_invite_failure', 'critical', {
        ip,
        userAgent,
        userId,
        tenantId: invite.tenant_id,
        error: 'profile_creation_failed',
      });
      return c.json({ error: 'Failed to create user profile' }, 500);
    }

    // Mark invite as accepted
    await (supabase.from('team_invites') as any)
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Generate session
    const sessionResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          email: invite.email,
          password: validated.password,
        }),
      }
    );

    let sessionData: { access_token?: string; refresh_token?: string } | null = null;
    if (sessionResponse.ok) {
      sessionData = await sessionResponse.json();
    }

    // Get tenant info
    const { data: tenant } = await (supabase
      .from('tenants') as any)
      .select('id, name, status')
      .eq('id', invite.tenant_id)
      .single();

    await logSecurityEvent('accept_invite_success', 'info', {
      userId,
      tenantId: invite.tenant_id,
      role: invite.role,
      ip,
      userAgent,
    });

    return c.json(
      {
        user: {
          id: userId,
          email: invite.email,
          name: validated.name || invite.name || invite.email.split('@')[0],
          role: invite.role,
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
            }
          : null,
        session: {
          accessToken: sessionData?.access_token || null,
          refreshToken: sessionData?.refresh_token || null,
        },
      },
      201
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
    throw error;
  }
});

export default auth;

