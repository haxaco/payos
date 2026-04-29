/**
 * Epic 72 — Session Token Management
 *
 * Issues, validates, and revokes sess_* session tokens.
 * Tokens are short-lived (1 hour) and individually revocable.
 * Only the SHA-256 hash is stored — the plaintext token is returned once at issuance.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateSessionToken,
  hashApiKey,
  getKeyPrefix,
  verifyApiKey,
} from '../../utils/crypto.js';

const SESSION_TTL_SECONDS = 3600; // 1 hour

export interface CreateSessionInput {
  agentId: string;
  tenantId: string;
  authKeyId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionResult {
  token: string;
  expiresIn: number;
}

export interface ValidatedSession {
  sessionId: string;
  agentId: string;
  tenantId: string;
  authKeyId: string;
}

/**
 * Create a new session token after successful challenge-response.
 */
export async function createSession(
  supabase: SupabaseClient,
  input: CreateSessionInput,
): Promise<SessionResult> {
  const token = generateSessionToken();
  const tokenHash = hashApiKey(token);
  const tokenPrefix = getKeyPrefix(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  const { error } = await (supabase.from('agent_sessions') as any).insert({
    tenant_id: input.tenantId,
    agent_id: input.agentId,
    auth_key_id: input.authKeyId,
    session_token_hash: tokenHash,
    session_token_prefix: tokenPrefix,
    expires_at: expiresAt,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
  });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return { token, expiresIn: SESSION_TTL_SECONDS };
}

/**
 * Validate a session token and return the associated agent context.
 * Returns null if the token is invalid, expired, or revoked.
 */
export async function validateSession(
  supabase: SupabaseClient,
  token: string,
): Promise<ValidatedSession | null> {
  const tokenHash = hashApiKey(token);

  const { data: session, error } = await (supabase
    .from('agent_sessions') as any)
    .select('id, agent_id, tenant_id, auth_key_id, expires_at, revoked_at, session_token_hash')
    .eq('session_token_hash', tokenHash)
    .is('revoked_at', null)
    .single();

  if (error || !session) return null;

  // Check expiry
  if (new Date(session.expires_at) <= new Date()) return null;

  // Update last_used_at (fire-and-forget)
  (supabase.from('agent_sessions') as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', session.id)
    .then(() => {}, () => {});

  return {
    sessionId: session.id,
    agentId: session.agent_id,
    tenantId: session.tenant_id,
    authKeyId: session.auth_key_id,
  };
}

/**
 * Revoke a specific session by its ID.
 */
export async function revokeSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await (supabase.from('agent_sessions') as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Revoke all sessions for an agent (e.g., on key rotation or agent deactivation).
 */
export async function revokeAllAgentSessions(
  supabase: SupabaseClient,
  agentId: string,
): Promise<number> {
  const { data, error } = await (supabase.from('agent_sessions') as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq('agent_id', agentId)
    .is('revoked_at', null)
    .select('id');

  if (error) {
    throw new Error(`Failed to revoke sessions: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Revoke all sessions issued against a specific auth key (e.g., on key rotation).
 */
export async function revokeSessionsByAuthKey(
  supabase: SupabaseClient,
  authKeyId: string,
): Promise<number> {
  const { data, error } = await (supabase.from('agent_sessions') as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq('auth_key_id', authKeyId)
    .is('revoked_at', null)
    .select('id');

  if (error) {
    throw new Error(`Failed to revoke sessions: ${error.message}`);
  }

  return data?.length ?? 0;
}
