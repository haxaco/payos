import { Context, Next } from 'hono';
import { createClient } from '../db/client.js';

/**
 * Security headers middleware
 */
export async function securityHeaders(c: Context, next: Next) {
  await next();

  // Security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove server identification
  c.res.headers.delete('X-Powered-By');
}

/**
 * Log authentication attempts (both success and failure)
 */
export async function logAuthAttempt(
  success: boolean,
  tokenType: string | null,
  tenantId: string | null,
  actorId: string | null,
  ip: string,
  userAgent: string,
  errorReason?: string
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('auth_log').insert({
      success,
      token_type: tokenType,
      tenant_id: tenantId,
      actor_id: actorId,
      ip_address: ip,
      user_agent: userAgent,
      error_reason: errorReason,
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log auth attempt:', error);
  }
}

/**
 * Request ID middleware for tracing
 */
export async function requestId(c: Context, next: Next) {
  const id = c.req.header('X-Request-ID') || crypto.randomUUID();
  c.set('requestId', id);
  c.header('X-Request-ID', id);
  return next();
}

// Add to Hono context types
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeForLog(obj: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password',
    'token',
    'api_key',
    'apiKey',
    'secret',
    'authorization',
    'auth_client_id',
    'auth_client_secret',
  ];

  const sanitized = { ...obj };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Check if request is from allowed IP (for admin endpoints)
 */
export function ipAllowlist(allowedIps: string[]) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';

    if (!allowedIps.includes(ip) && !allowedIps.includes('*')) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return next();
  };
}

/**
 * Validate that agent has required permission
 */
export function requireAgentPermission(
  category: 'transactions' | 'streams' | 'accounts' | 'treasury',
  action: string
) {
  return async (c: Context, next: Next) => {
    const ctx = c.get('ctx');

    // Users (API key holders) have all permissions
    if (ctx.actorType === 'user') {
      return next();
    }

    // For agents, check permissions from database
    const supabase = createClient();
    const { data: agent } = await supabase
      .from('agents')
      .select('permissions')
      .eq('id', ctx.actorId)
      .single();

    if (!agent?.permissions) {
      return c.json({ error: 'Agent permissions not found' }, 403);
    }

    const permissions = agent.permissions as Record<string, Record<string, boolean>>;
    const hasPermission = permissions[category]?.[action] === true;

    if (!hasPermission) {
      return c.json({
        error: 'Permission denied',
        required: `${category}.${action}`,
      }, 403);
    }

    return next();
  };
}

/**
 * Require minimum KYA tier for agent
 */
export function requireKyaTier(minTier: number) {
  return async (c: Context, next: Next) => {
    const ctx = c.get('ctx');

    // Users bypass KYA checks
    if (ctx.actorType === 'user') {
      return next();
    }

    const supabase = createClient();
    const { data: agent } = await supabase
      .from('agents')
      .select('kya_tier, kya_status')
      .eq('id', ctx.actorId)
      .single();

    if (!agent || agent.kya_tier < minTier) {
      return c.json({
        error: 'Insufficient KYA verification tier',
        currentTier: agent?.kya_tier || 0,
        requiredTier: minTier,
      }, 403);
    }

    if (agent.kya_status !== 'verified') {
      return c.json({
        error: 'KYA verification required',
        status: agent.kya_status,
      }, 403);
    }

    return next();
  };
}

