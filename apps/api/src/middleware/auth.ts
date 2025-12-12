import { Context, Next } from 'hono';
import { createClient } from '../db/client.js';

export interface RequestContext {
  tenantId: string;
  actorType: 'user' | 'agent';
  actorId: string;
  actorName: string;
}

// Extend Hono's context type
declare module 'hono' {
  interface ContextVariableMap {
    ctx: RequestContext;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const supabase = createClient();

  // Partner API key (pk_test_xxx or pk_live_xxx)
  if (token.startsWith('pk_')) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('api_key', token)
      .eq('status', 'active')
      .single();

    if (error || !tenant) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

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
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, tenant_id, status, kya_tier')
      .eq('auth_client_id', token)
      .single();

    if (error || !agent) {
      return c.json({ error: 'Invalid agent token' }, 401);
    }

    if (agent.status !== 'active') {
      return c.json({ error: 'Agent is not active', status: agent.status }, 403);
    }

    c.set('ctx', {
      tenantId: agent.tenant_id,
      actorType: 'agent',
      actorId: agent.id,
      actorName: agent.name,
    });

    return next();
  }

  return c.json({ error: 'Invalid token format' }, 401);
}


