import { Context, Next } from 'hono';
import { createClient } from '../db/client.js';
import { hashApiKey, getKeyPrefix, verifyApiKey } from '../utils/crypto.js';

export interface RequestContext {
  tenantId: string;
  actorType: 'user' | 'agent';
  actorId: string;
  actorName: string;
  kyaTier?: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    ctx: RequestContext;
  }
}

/**
 * Log authentication attempts for security monitoring
 */
async function logAuthAttempt(
  success: boolean,
  tokenType: string | null,
  tenantId: string | null,
  actorId: string | null,
  ip: string,
  userAgent: string,
  errorReason?: string
): Promise<void> {
  // Only log failures in production to avoid noise
  if (success && process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    const supabase = createClient();
    await supabase.from('audit_log').insert({
      tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
      entity_type: 'auth',
      entity_id: actorId || '00000000-0000-0000-0000-000000000000',
      action: success ? 'login_success' : 'login_failure',
      actor_type: tokenType === 'agent' ? 'agent' : 'user',
      actor_id: actorId,
      actor_name: null,
      metadata: {
        ip_address: ip,
        user_agent: userAgent,
        token_type: tokenType,
        error_reason: errorReason,
      },
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log auth attempt:', error);
  }
}

function getClientInfo(c: Context): { ip: string; userAgent: string } {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  return { ip, userAgent };
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const { ip, userAgent } = getClientInfo(c);

  if (!authHeader?.startsWith('Bearer ')) {
    await logAuthAttempt(false, null, null, null, ip, userAgent, 'Missing authorization header');
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  // Validate token format (basic sanity check)
  if (token.length < 10 || token.length > 200) {
    await logAuthAttempt(false, null, null, null, ip, userAgent, 'Invalid token length');
    return c.json({ error: 'Invalid token format' }, 401);
  }

  const supabase = createClient();

  // Partner API key (pk_test_xxx or pk_live_xxx)
  if (token.startsWith('pk_')) {
    const keyPrefix = getKeyPrefix(token);
    const keyHash = hashApiKey(token);

    // First, try the new secure method (prefix + hash)
    let { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, status, api_key_hash')
      .eq('api_key_prefix', keyPrefix)
      .single();

    if (tenant && tenant.api_key_hash) {
      // Verify using secure hash comparison
      if (!verifyApiKey(token, tenant.api_key_hash)) {
        await logAuthAttempt(false, 'api_key', null, null, ip, userAgent, 'Hash mismatch');
        return c.json({ error: 'Invalid API key' }, 401);
      }
    } else {
      // Fallback to legacy plaintext lookup (for backwards compatibility during migration)
      const legacyResult = await supabase
        .from('tenants')
        .select('id, name, status')
        .eq('api_key', token)
        .single();
      
      tenant = legacyResult.data;
      error = legacyResult.error;
    }

    if (error || !tenant) {
      await logAuthAttempt(false, 'api_key', null, null, ip, userAgent, 'Invalid API key');
      return c.json({ error: 'Invalid API key' }, 401);
    }

    if (tenant.status !== 'active') {
      await logAuthAttempt(false, 'api_key', tenant.id, null, ip, userAgent, `Tenant status: ${tenant.status}`);
      return c.json({ error: 'Account is not active', status: tenant.status }, 403);
    }

    await logAuthAttempt(true, 'api_key', tenant.id, 'api_user', ip, userAgent);

    c.set('ctx', {
      tenantId: tenant.id,
      actorType: 'user',
      actorId: 'api_user',
      actorName: 'API User',
    });

    return next();
  }

  // Agent token (agent_xxx)
  if (token.startsWith('agent_')) {
    const tokenPrefix = getKeyPrefix(token);
    const tokenHash = hashApiKey(token);

    // First, try the new secure method (prefix + hash)
    let { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, tenant_id, status, kya_tier, kya_status, auth_token_hash')
      .eq('auth_token_prefix', tokenPrefix)
      .single();

    if (agent && agent.auth_token_hash) {
      // Verify using secure hash comparison
      if (!verifyApiKey(token, agent.auth_token_hash)) {
        await logAuthAttempt(false, 'agent', null, null, ip, userAgent, 'Hash mismatch');
        return c.json({ error: 'Invalid agent token' }, 401);
      }
    } else {
      // Fallback to legacy plaintext lookup (for backwards compatibility during migration)
      const legacyResult = await supabase
        .from('agents')
        .select('id, name, tenant_id, status, kya_tier, kya_status')
        .eq('auth_client_id', token)
        .single();
      
      agent = legacyResult.data;
      error = legacyResult.error;
    }

    if (error || !agent) {
      await logAuthAttempt(false, 'agent', null, null, ip, userAgent, 'Invalid agent token');
      return c.json({ error: 'Invalid agent token' }, 401);
    }

    if (agent.status !== 'active') {
      await logAuthAttempt(false, 'agent', agent.tenant_id, agent.id, ip, userAgent, `Agent status: ${agent.status}`);
      return c.json({ error: 'Agent is not active', status: agent.status }, 403);
    }

    await logAuthAttempt(true, 'agent', agent.tenant_id, agent.id, ip, userAgent);

    c.set('ctx', {
      tenantId: agent.tenant_id,
      actorType: 'agent',
      actorId: agent.id,
      actorName: agent.name,
      kyaTier: agent.kya_tier,
    });

    return next();
  }

  await logAuthAttempt(false, null, null, null, ip, userAgent, 'Unknown token format');
  return c.json({ error: 'Invalid token format' }, 401);
}
