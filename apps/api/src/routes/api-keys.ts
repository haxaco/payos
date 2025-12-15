import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/error.js';
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  maskApiKey,
  checkRateLimit,
  logSecurityEvent,
} from '../utils/auth.js';

const apiKeys = new Hono();

// Helper to get current user and tenant context from JWT
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

function getClientInfo(c: any): { ip: string; userAgent: string } {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  return { ip, userAgent };
}

// ============================================
// Validation Schemas
// ============================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  environment: z.enum(['test', 'live']),
  description: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});

// ============================================
// POST /v1/api-keys - Create new API key
// ============================================
apiKeys.post('/', async (c) => {
  const { ip, userAgent } = getClientInfo(c);
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId, userProfile } = result;
  const userId = result.user.id;

  // Rate limiting: 10 key creations per day per tenant
  const rateLimit = await checkRateLimit(
    `api_key_create:${tenantId}`,
    24 * 60 * 60 * 1000, // 24 hours
    10
  );
  if (!rateLimit.allowed) {
    await logSecurityEvent('api_key_create_rate_limited', 'warning', {
      tenantId,
      userId,
      ip,
      userAgent,
    });
    return c.json(
      {
        error: 'Rate limit exceeded. Maximum 10 API key creations per day.',
        retryAfter: rateLimit.retryAfter,
      },
      429
    );
  }

  const body = await c.req.json();
  const validated = createApiKeySchema.parse(body);

  // Generate API key
  const key = generateApiKey(validated.environment);
  const keyPrefix = getKeyPrefix(key);
  const keyHash = hashApiKey(key);

  const supabase = createClient();

  // Insert into database
  const { data: apiKey, error } = await (supabase
    .from('api_keys') as any)
    .insert({
      tenant_id: tenantId,
      created_by_user_id: userId,
      name: validated.name,
      environment: validated.environment,
      description: validated.description,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      expires_at: validated.expiresAt,
      status: 'active',
    })
    .select('id, name, environment, key_prefix, description, expires_at, created_at')
    .single();

  if (error || !apiKey) {
    await logSecurityEvent('api_key_create_failure', 'critical', {
      tenantId,
      userId,
      ip,
      userAgent,
      error: error?.message || 'insert_failed',
    });
    return c.json({ error: 'Failed to create API key' }, 500);
  }

  await logSecurityEvent('api_key_created', 'info', {
    tenantId,
    userId,
    apiKeyId: apiKey.id,
    environment: validated.environment,
    keyPrefix,
    ip,
    userAgent,
  });

  return c.json(
    {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        environment: apiKey.environment,
        prefix: apiKey.key_prefix,
        key, // Shown ONCE
        description: apiKey.description,
        expiresAt: apiKey.expires_at,
        createdAt: apiKey.created_at,
      },
      warning: 'This key will only be shown once. Please save it securely.',
    },
    201
  );
});

// ============================================
// GET /v1/api-keys - List all API keys
// ============================================
apiKeys.get('/', async (c) => {
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId } = result;
  const supabase = createClient();

  // Optional filter by environment
  const environment = c.req.query('environment');
  let query = (supabase.from('api_keys') as any)
    .select('id, name, environment, key_prefix, description, status, expires_at, last_used_at, created_at, updated_at, created_by_user_id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (environment && (environment === 'test' || environment === 'live')) {
    query = query.eq('environment', environment);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: 'Failed to fetch API keys' }, 500);
  }

  const keys = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    environment: row.environment,
    prefix: row.key_prefix,
    description: row.description,
    status: row.status,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by_user_id,
  }));

  return c.json({ apiKeys: keys }, 200);
});

// ============================================
// GET /v1/api-keys/:id - Get API key details
// ============================================
apiKeys.get('/:id', async (c) => {
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId } = result;
  const keyId = c.req.param('id');
  const supabase = createClient();

  const { data: apiKey, error } = await (supabase
    .from('api_keys') as any)
    .select('id, name, environment, key_prefix, description, status, expires_at, last_used_at, last_used_ip, created_at, updated_at, created_by_user_id')
    .eq('id', keyId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !apiKey) {
    throw new NotFoundError('API key');
  }

  return c.json(
    {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        environment: apiKey.environment,
        prefix: apiKey.key_prefix,
        description: apiKey.description,
        status: apiKey.status,
        expiresAt: apiKey.expires_at,
        lastUsedAt: apiKey.last_used_at,
        lastUsedIp: apiKey.last_used_ip,
        createdAt: apiKey.created_at,
        updatedAt: apiKey.updated_at,
        createdBy: apiKey.created_by_user_id,
      },
    },
    200
  );
});

// ============================================
// DELETE /v1/api-keys/:id - Revoke API key
// ============================================
apiKeys.delete('/:id', async (c) => {
  const { ip, userAgent } = getClientInfo(c);
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId, userProfile } = result;
  const userId = result.user.id;
  const keyId = c.req.param('id');
  const supabase = createClient();

  // Fetch the key to check ownership
  const { data: apiKey, error: fetchError } = await (supabase
    .from('api_keys') as any)
    .select('id, created_by_user_id, name, environment, key_prefix')
    .eq('id', keyId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !apiKey) {
    throw new NotFoundError('API key');
  }

  // Permission check: Only admins/owners can revoke others' keys
  const actorRole = userProfile.role as 'owner' | 'admin' | 'member' | 'viewer';
  const isOwnKey = apiKey.created_by_user_id === userId;
  const canRevokeOthers = actorRole === 'owner' || actorRole === 'admin';

  if (!isOwnKey && !canRevokeOthers) {
    await logSecurityEvent('api_key_revoke_unauthorized', 'warning', {
      tenantId,
      userId,
      apiKeyId: keyId,
      actorRole,
      ip,
      userAgent,
    });
    throw new ForbiddenError('You can only revoke your own API keys');
  }

  // Revoke the key (soft delete by setting status to 'revoked')
  const { error: revokeError } = await (supabase
    .from('api_keys') as any)
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by_user_id: userId,
    })
    .eq('id', keyId);

  if (revokeError) {
    await logSecurityEvent('api_key_revoke_failure', 'critical', {
      tenantId,
      userId,
      apiKeyId: keyId,
      ip,
      userAgent,
      error: revokeError.message,
    });
    return c.json({ error: 'Failed to revoke API key' }, 500);
  }

  await logSecurityEvent('api_key_revoked', 'info', {
    tenantId,
    userId,
    apiKeyId: keyId,
    keyPrefix: apiKey.key_prefix,
    environment: apiKey.environment,
    ip,
    userAgent,
  });

  return c.json({ success: true }, 200);
});

// ============================================
// POST /v1/api-keys/:id/rotate - Rotate API key
// ============================================
apiKeys.post('/:id/rotate', async (c) => {
  const { ip, userAgent } = getClientInfo(c);
  const result: any = await getCurrentUserAndTenant(c);
  if (result.error) {
    return c.json(result.error.body, result.error.status as any);
  }

  const { tenantId, userProfile } = result;
  const userId = result.user.id;
  const keyId = c.req.param('id');
  const supabase = createClient();

  // Fetch the key to check ownership
  const { data: oldKey, error: fetchError } = await (supabase
    .from('api_keys') as any)
    .select('id, created_by_user_id, name, environment, description, key_prefix')
    .eq('id', keyId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (fetchError || !oldKey) {
    throw new NotFoundError('API key');
  }

  // Permission check: Only admins/owners can rotate others' keys
  const actorRole = userProfile.role as 'owner' | 'admin' | 'member' | 'viewer';
  const isOwnKey = oldKey.created_by_user_id === userId;
  const canRotateOthers = actorRole === 'owner' || actorRole === 'admin';

  if (!isOwnKey && !canRotateOthers) {
    await logSecurityEvent('api_key_rotate_unauthorized', 'warning', {
      tenantId,
      userId,
      apiKeyId: keyId,
      actorRole,
      ip,
      userAgent,
    });
    throw new ForbiddenError('You can only rotate your own API keys');
  }

  // Generate new API key
  const newKey = generateApiKey(oldKey.environment);
  const newKeyPrefix = getKeyPrefix(newKey);
  const newKeyHash = hashApiKey(newKey);

  // Create new key
  const { data: newApiKey, error: createError } = await (supabase
    .from('api_keys') as any)
    .insert({
      tenant_id: tenantId,
      created_by_user_id: userId,
      name: `${oldKey.name} (Rotated)`,
      environment: oldKey.environment,
      description: oldKey.description,
      key_prefix: newKeyPrefix,
      key_hash: newKeyHash,
      status: 'active',
    })
    .select('id, name, environment, key_prefix, description, created_at')
    .single();

  if (createError || !newApiKey) {
    await logSecurityEvent('api_key_rotate_failure', 'critical', {
      tenantId,
      userId,
      oldKeyId: keyId,
      ip,
      userAgent,
      error: createError?.message || 'create_new_key_failed',
    });
    return c.json({ error: 'Failed to rotate API key' }, 500);
  }

  // Schedule old key for revocation (24h grace period)
  const graceEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const { error: scheduleError } = await (supabase
    .from('api_keys') as any)
    .update({
      status: 'grace_period',
      grace_period_ends_at: graceEnd.toISOString(),
    })
    .eq('id', keyId);

  if (scheduleError) {
    console.error('Failed to schedule old key for revocation:', scheduleError);
    // Don't fail the request, but log it
  }

  await logSecurityEvent('api_key_rotated', 'info', {
    tenantId,
    userId,
    oldKeyId: keyId,
    oldKeyPrefix: oldKey.key_prefix,
    newKeyId: newApiKey.id,
    newKeyPrefix: newKeyPrefix,
    environment: oldKey.environment,
    gracePeriodEnds: graceEnd.toISOString(),
    ip,
    userAgent,
  });

  return c.json(
    {
      newApiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        environment: newApiKey.environment,
        prefix: newApiKey.key_prefix,
        key: newKey, // Shown ONCE
        description: newApiKey.description,
        createdAt: newApiKey.created_at,
      },
      oldApiKey: {
        id: keyId,
        prefix: oldKey.key_prefix,
        gracePeriodEnds: graceEnd.toISOString(),
      },
      warning: 'The new key will only be shown once. The old key will remain valid for 24 hours.',
    },
    201
  );
});

export default apiKeys;

