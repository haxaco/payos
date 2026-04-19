/**
 * Epic 72: Agent Key-Pair Authentication & Persistent Connection
 *
 * This file contains:
 *   PUBLIC routes (no auth required, rate-limited):
 *     POST /v1/agents/:id/challenge      — request a nonce
 *     POST /v1/agents/:id/authenticate   — submit challenge-response, get sess_*
 *
 *   AUTHENTICATED routes (require tenant auth via API key, JWT, or agent token):
 *     POST /v1/agents/:id/auth-keys           — provision Ed25519 key pair
 *     POST /v1/agents/:id/auth-keys/rotate    — rotate key (signed proof-of-ownership)
 *     DELETE /v1/agents/:id/auth-keys         — revoke key + all sessions
 *
 *   AUTHENTICATED routes (Phase 3 — persistent SSE):
 *     GET /v1/agents/:id/connect              — open persistent SSE channel
 *     GET /v1/agents/:id/liveness             — lightweight liveness check
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createClient } from '../db/client.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';
import { isValidUUID } from '../utils/helpers.js';
import {
  generateEd25519KeyPair,
  generateAuthKeyId,
  hashApiKey,
  verifyEd25519Signature,
} from '../utils/crypto.js';
import { createChallenge, verifyChallenge, ChallengeError } from '../services/agent-auth/challenge.js';
import { revokeAllAgentSessions, revokeSessionsByAuthKey } from '../services/agent-auth/session.js';
import { agentConnectionBus, type AgentEvent } from '../services/agent-auth/connection-bus.js';

// ============================================
// PER-AGENT RATE LIMITING (Epic 72, Story 72.8)
// ============================================

interface RateWindow { count: number; resetAt: number }
const agentRateLimits = new Map<string, RateWindow>();

// Clean expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of agentRateLimits) {
    if (v.resetAt < now) agentRateLimits.delete(k);
  }
}, 60_000);

function checkAgentRateLimit(
  agentId: string,
  action: 'challenge' | 'authenticate',
): { allowed: boolean; remaining: number; retryAfter?: number } {
  // Skip in dev/test
  if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMIT === 'true') {
    return { allowed: true, remaining: 999 };
  }

  const maxPerMinute = action === 'challenge' ? 10 : 5;
  const key = `${action}:${agentId}`;
  const now = Date.now();
  const entry = agentRateLimits.get(key);

  if (!entry || entry.resetAt < now) {
    agentRateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }

  if (entry.count >= maxPerMinute) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: maxPerMinute - entry.count };
}

// Track consecutive auth failures per agent for lockout
const authFailures = new Map<string, number>();
const AUTH_LOCKOUT_THRESHOLD = 10;

function recordAuthFailure(agentId: string): number {
  const count = (authFailures.get(agentId) || 0) + 1;
  authFailures.set(agentId, count);
  return count;
}

function clearAuthFailures(agentId: string): void {
  authFailures.delete(agentId);
}

function isLockedOut(agentId: string): boolean {
  return (authFailures.get(agentId) || 0) >= AUTH_LOCKOUT_THRESHOLD;
}

// ============================================
// PUBLIC ROUTES (mounted before auth middleware)
// ============================================

export const agentConnectPublicRouter = new Hono();

/**
 * POST /v1/agents/:id/challenge
 * Request a challenge nonce for Ed25519 auth.
 * Rate limit: 10/min per agent ID.
 */
agentConnectPublicRouter.post('/:id/challenge', async (c) => {
  const id = c.req.param('id');
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }

  // Per-agent rate limit
  const rl = checkAgentRateLimit(id, 'challenge');
  if (!rl.allowed) {
    return c.json({ error: 'Too many challenge requests', retryAfter: rl.retryAfter }, 429);
  }

  const supabase = createClient();

  // Verify agent exists and has an active auth key
  const { data: agent, error } = await (supabase
    .from('agents') as any)
    .select('id, tenant_id, status')
    .eq('id', id)
    .single();

  if (error || !agent) {
    throw new NotFoundError('Agent', id);
  }

  if (agent.status !== 'active') {
    throw new ValidationError('Agent is not active');
  }

  // Check that agent has an active auth key
  const { data: authKey } = await (supabase
    .from('agent_auth_keys') as any)
    .select('id')
    .eq('agent_id', id)
    .eq('status', 'active')
    .single();

  if (!authKey) {
    return c.json({
      error: 'Agent has no active auth key',
      code: 'NO_AUTH_KEY',
      hint: 'POST /v1/agents/:id/auth-keys to provision one',
    }, 400);
  }

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const result = await createChallenge(supabase, id, agent.tenant_id, ip);

  return c.json(result);
});

/**
 * POST /v1/agents/:id/authenticate
 * Submit a signed challenge to get a session token.
 * Rate limit: 5/min per agent (enforced at app.ts level).
 */
agentConnectPublicRouter.post('/:id/authenticate', async (c) => {
  const id = c.req.param('id');
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }

  // Per-agent rate limit
  const rl = checkAgentRateLimit(id, 'authenticate');
  if (!rl.allowed) {
    return c.json({ error: 'Too many auth attempts', retryAfter: rl.retryAfter }, 429);
  }

  // Lockout check
  if (isLockedOut(id)) {
    return c.json({
      error: `Agent locked out after ${AUTH_LOCKOUT_THRESHOLD} consecutive auth failures. Rotate the auth key to unlock.`,
      code: 'AUTH_LOCKED_OUT',
    }, 403);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  const { challenge, signature } = body;
  if (!challenge || !signature) {
    throw new ValidationError('Missing required fields: challenge, signature');
  }

  const supabase = createClient();

  // Look up agent to get tenant_id
  const { data: agent, error } = await (supabase
    .from('agents') as any)
    .select('id, tenant_id')
    .eq('id', id)
    .single();

  if (error || !agent) {
    throw new NotFoundError('Agent', id);
  }

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';

  try {
    const result = await verifyChallenge(
      supabase,
      id,
      agent.tenant_id,
      challenge,
      signature,
      ip,
      userAgent,
    );
    clearAuthFailures(id); // Reset on success
    return c.json(result);
  } catch (e) {
    if (e instanceof ChallengeError) {
      const failures = recordAuthFailure(id);
      return c.json({
        error: e.message,
        code: failures >= AUTH_LOCKOUT_THRESHOLD ? 'AUTH_LOCKED_OUT' : 'AUTH_FAILED',
      }, 401);
    }
    throw e;
  }
});

// ============================================
// AUTHENTICATED ROUTES (mounted under /v1/agents after auth middleware)
// ============================================

export const agentConnectAuthRouter = new Hono();

/**
 * POST /v1/agents/:id/auth-keys
 * Provision an Ed25519 key pair for challenge-response auth.
 * Returns the private key ONCE — caller must save it.
 */
agentConnectAuthRouter.post('/:id/auth-keys', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }

  // Agent can only provision their own key
  if (ctx.actorType === 'agent' && ctx.actorId !== id) {
    return c.json({ error: 'Agent can only provision their own auth key' }, 403);
  }

  const supabase = createClient();

  // Verify agent exists and belongs to tenant
  const { data: agent } = await (supabase
    .from('agents') as any)
    .select('id, tenant_id, status')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!agent) throw new NotFoundError('Agent', id);
  if (agent.status !== 'active') throw new ValidationError('Agent is not active');

  // Check for existing active key (idempotent — return existing if present)
  const { data: existing } = await (supabase
    .from('agent_auth_keys') as any)
    .select('key_id, public_key, status, created_at')
    .eq('agent_id', id)
    .eq('status', 'active')
    .single();

  if (existing) {
    return c.json({
      keyId: existing.key_id,
      publicKey: existing.public_key,
      algorithm: 'ed25519' as const,
      created: false,
      warning: 'Key already exists. Private key was only returned at creation time.',
    });
  }

  // Generate new Ed25519 key pair
  const { privateKey, publicKey } = generateEd25519KeyPair();
  const keyId = generateAuthKeyId(id);
  const publicKeyHash = hashApiKey(publicKey);

  const { error: insertErr } = await (supabase.from('agent_auth_keys') as any).insert({
    tenant_id: ctx.tenantId,
    agent_id: id,
    key_id: keyId,
    algorithm: 'ed25519',
    public_key: publicKey,
    public_key_hash: publicKeyHash,
    status: 'active',
  });

  if (insertErr) {
    return c.json({ error: `Failed to store auth key: ${insertErr.message}` }, 500);
  }

  return c.json({
    keyId,
    publicKey,
    privateKey,
    algorithm: 'ed25519' as const,
    created: true,
    warning: 'SAVE THIS PRIVATE KEY NOW — it will never be shown again!',
  });
});

/**
 * POST /v1/agents/:id/auth-keys/rotate
 * Rotate the agent's auth key. Requires proof of ownership:
 * the agent must sign a rotation challenge with the current private key.
 *
 * Body: { proof: "<base64 signature of 'rotate:<agentId>'>" }
 */
agentConnectAuthRouter.post('/:id/auth-keys/rotate', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }

  if (ctx.actorType === 'agent' && ctx.actorId !== id) {
    return c.json({ error: 'Agent can only rotate their own auth key' }, 403);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }

  const { proof } = body;
  if (!proof) {
    throw new ValidationError('Missing required field: proof (signature of "rotate:<agentId>")');
  }

  const supabase = createClient();

  // Get current active key
  const { data: currentKey } = await (supabase
    .from('agent_auth_keys') as any)
    .select('id, public_key')
    .eq('agent_id', id)
    .eq('status', 'active')
    .single();

  if (!currentKey) {
    return c.json({ error: 'Agent has no active auth key to rotate' }, 400);
  }

  // Verify proof of ownership
  const message = `rotate:${id}`;
  const valid = await verifyEd25519Signature(message, proof, currentKey.public_key);
  if (!valid) {
    return c.json({ error: 'Invalid rotation proof — signature verification failed' }, 401);
  }

  // Mark old key as rotated
  await (supabase.from('agent_auth_keys') as any)
    .update({ status: 'rotated', rotated_at: new Date().toISOString() })
    .eq('id', currentKey.id);

  // Revoke all sessions issued under the old key
  const revokedCount = await revokeSessionsByAuthKey(supabase, currentKey.id);

  // Generate new key pair
  const { privateKey, publicKey } = generateEd25519KeyPair();
  const keyId = generateAuthKeyId(id);
  const publicKeyHash = hashApiKey(publicKey);

  await (supabase.from('agent_auth_keys') as any).insert({
    tenant_id: ctx.tenantId,
    agent_id: id,
    key_id: keyId,
    algorithm: 'ed25519',
    public_key: publicKey,
    public_key_hash: publicKeyHash,
    status: 'active',
  });

  return c.json({
    keyId,
    publicKey,
    privateKey,
    algorithm: 'ed25519' as const,
    rotated: true,
    previousKeyRevoked: true,
    sessionsRevoked: revokedCount,
    warning: 'SAVE THIS PRIVATE KEY NOW — it will never be shown again!',
  });
});

/**
 * DELETE /v1/agents/:id/auth-keys
 * Revoke the agent's auth key and all active sessions.
 */
agentConnectAuthRouter.delete('/:id/auth-keys', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }

  // Only API key holders or the agent itself can revoke
  if (ctx.actorType === 'agent' && ctx.actorId !== id) {
    return c.json({ error: 'Agent can only revoke their own auth key' }, 403);
  }

  const supabase = createClient();

  // Revoke all auth keys for this agent
  const { data: revoked } = await (supabase
    .from('agent_auth_keys') as any)
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('agent_id', id)
    .eq('status', 'active')
    .select('id');

  // Revoke all sessions
  const sessionsRevoked = await revokeAllAgentSessions(supabase, id);

  return c.json({
    keysRevoked: revoked?.length ?? 0,
    sessionsRevoked,
  });
});

/**
 * GET /v1/agents/:id/liveness
 * Lightweight liveness check for an agent.
 */
agentConnectAuthRouter.get('/:id/liveness', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }

  const supabase = createClient();

  const { data: connection } = await (supabase
    .from('agent_connections') as any)
    .select('connected_at, last_heartbeat_at, disconnected_at')
    .eq('agent_id', id)
    .eq('tenant_id', ctx.tenantId)
    .is('disconnected_at', null)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection) {
    return c.json({
      connected: false,
      lastHeartbeatAt: null,
    });
  }

  const connectedAt = new Date(connection.connected_at);
  const now = new Date();

  return c.json({
    connected: true,
    connectedAt: connection.connected_at,
    lastHeartbeatAt: connection.last_heartbeat_at,
    connectionDuration: Math.floor((now.getTime() - connectedAt.getTime()) / 1000),
  });
});

// ============================================
// PERSISTENT SSE CONNECTION (Phase 3)
// ============================================

const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const DB_HEARTBEAT_INTERVAL_MS = 150 * 1000; // Persist to DB every 5th heartbeat
const MAX_CONNECTION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * GET /v1/agents/:id/connect
 * Open a persistent SSE channel for receiving agent events.
 * Requires sess_* token auth (or API key / agent token).
 * Agent receives: task_assigned, transfer_completed, approval_requested,
 *   stream_alert, key_rotated, config_changed, heartbeat, reconnect_required.
 */
agentConnectAuthRouter.get('/:id/connect', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid agent ID format');
  }

  // Agent can only connect as itself
  if (ctx.actorType === 'agent' && ctx.actorId !== id) {
    return c.json({ error: 'Agent can only connect as itself' }, 403);
  }

  const supabase = createClient();
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  const lastEventId = c.req.header('last-event-id') || null;

  // Insert connection record
  const { data: connRecord, error: connErr } = await (supabase
    .from('agent_connections') as any)
    .insert({
      tenant_id: ctx.tenantId,
      agent_id: id,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select('id')
    .single();

  if (connErr) {
    return c.json({ error: `Failed to open connection: ${connErr.message}` }, 500);
  }

  const connectionId = connRecord.id;

  // Mark as connected in-memory
  agentConnectionBus.markConnected(id);

  // Set SSE headers
  c.header('X-Accel-Buffering', 'no');
  c.header('Cache-Control', 'no-cache');

  return streamSSE(c, async (stream) => {
    let isActive = true;

    function cleanup() {
      isActive = false;
      unsubscribe();
      clearInterval(heartbeatId);
      clearInterval(dbHeartbeatId);
      clearTimeout(maxLifetimeId);
      agentConnectionBus.markDisconnected(id);

      // Mark disconnected in DB (fire-and-forget)
      (supabase.from('agent_connections') as any)
        .update({ disconnected_at: new Date().toISOString() })
        .eq('id', connectionId)
        .then(() => {}, () => {});
    }

    stream.onAbort(() => cleanup());

    // Subscribe to agent events
    const unsubscribe = agentConnectionBus.subscribe(id, async (event: AgentEvent) => {
      if (!isActive) return;
      try {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
          id: event.id,
        });
      } catch {
        cleanup();
      }
    });

    // Replay missed events on reconnect
    if (lastEventId) {
      const missed = agentConnectionBus.getEventsSince(id, lastEventId);
      for (const event of missed) {
        if (!isActive) break;
        try {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
            id: event.id,
          });
        } catch {
          cleanup();
          return;
        }
      }
    }

    // Heartbeat: keep the connection alive (30s)
    const heartbeatId = setInterval(async () => {
      if (!isActive) { clearInterval(heartbeatId); return; }
      try {
        await stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      } catch {
        cleanup();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // DB heartbeat: persist liveness (every 150s)
    const dbHeartbeatId = setInterval(async () => {
      if (!isActive) { clearInterval(dbHeartbeatId); return; }
      (supabase.from('agent_connections') as any)
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', connectionId)
        .then(() => {}, () => {});
    }, DB_HEARTBEAT_INTERVAL_MS);

    // Max connection lifetime: 24 hours
    const maxLifetimeId = setTimeout(async () => {
      if (!isActive) return;
      try {
        await stream.writeSSE({
          event: 'reconnect_required',
          data: JSON.stringify({
            reason: 'max_connection_duration_reached',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // ignore
      }
      cleanup();
    }, MAX_CONNECTION_DURATION_MS);

    // Keep the stream alive until cleanup is called
    // We use a polling loop since Hono's streamSSE expects the callback to
    // complete when the stream is done. We wait until isActive goes false.
    while (isActive) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });
});
