/**
 * Epic 72 — Challenge-Response Service
 *
 * Handles the Ed25519 challenge-response handshake:
 *   1. createChallenge(agentId, tenantId) → generate nonce, store in DB with 60s TTL
 *   2. verifyChallenge(agentId, tenantId, nonce, signature) → atomic consume, verify sig, issue session
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateChallengeNonce,
  hashApiKey,
  verifyEd25519Signature,
} from '../../utils/crypto.js';
import { createSession } from './session.js';

const CHALLENGE_TTL_SECONDS = 60;
const MAX_CONSECUTIVE_FAILURES = 10;

export interface ChallengeResult {
  challenge: string;
  expiresIn: number;
  algorithm: 'ed25519';
}

export interface VerifyChallengeResult {
  sessionToken: string;
  expiresIn: number;
  agentId: string;
}

/**
 * Create a new challenge nonce for an agent.
 * Rate limit enforcement happens at the route level, not here.
 */
export async function createChallenge(
  supabase: SupabaseClient,
  agentId: string,
  tenantId: string,
  ipAddress?: string,
): Promise<ChallengeResult> {
  const nonce = generateChallengeNonce(agentId);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000).toISOString();

  const { error } = await (supabase.from('agent_challenges') as any).insert({
    tenant_id: tenantId,
    agent_id: agentId,
    nonce,
    expires_at: expiresAt,
    ip_address: ipAddress,
  });

  if (error) {
    throw new Error(`Failed to create challenge: ${error.message}`);
  }

  return {
    challenge: nonce,
    expiresIn: CHALLENGE_TTL_SECONDS,
    algorithm: 'ed25519',
  };
}

/**
 * Verify a challenge-response and issue a session token.
 *
 * Steps:
 *   1. Atomically consume the challenge nonce (prevents replay).
 *   2. Look up the agent's active Ed25519 public key.
 *   3. Verify the signature over the nonce.
 *   4. Check for lockout (too many consecutive failures).
 *   5. Issue a session token on success.
 */
export async function verifyChallenge(
  supabase: SupabaseClient,
  agentId: string,
  tenantId: string,
  nonce: string,
  signature: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<VerifyChallengeResult> {
  // 1. Atomically consume the nonce
  const { data: consumed, error: consumeError } = await supabase
    .rpc('consume_agent_challenge', {
      p_agent_id: agentId,
      p_nonce: nonce,
    });

  // Supabase returns a row-of-nulls for a RETURNS <composite> function when
  // the UPDATE matched 0 rows. Check consumed.id to detect this.
  if (consumeError || !consumed || !consumed.id) {
    throw new ChallengeError('Invalid or expired challenge');
  }

  // 2. Look up the agent's active auth key
  const { data: authKey, error: keyError } = await (supabase
    .from('agent_auth_keys') as any)
    .select('id, public_key, status')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .single();

  if (keyError || !authKey) {
    throw new ChallengeError('Agent has no active auth key');
  }

  // 3. Check lockout — count recent failures for this agent
  const { count: recentFailures } = await (supabase
    .from('agent_sessions') as any)
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .gte('consecutive_failures', MAX_CONSECUTIVE_FAILURES);

  if (recentFailures && recentFailures > 0) {
    throw new ChallengeError(
      `Agent locked out after ${MAX_CONSECUTIVE_FAILURES} consecutive auth failures. Rotate the auth key to unlock.`,
    );
  }

  // 4. Verify the Ed25519 signature over the nonce
  const valid = await verifyEd25519Signature(nonce, signature, authKey.public_key);

  if (!valid) {
    // Record failure — increment consecutive_failures on the most recent session
    // (or we just track via a separate mechanism if no session exists yet)
    throw new ChallengeError('Invalid signature');
  }

  // 5. Issue session token
  const session = await createSession(supabase, {
    agentId,
    tenantId,
    authKeyId: authKey.id,
    ipAddress,
    userAgent,
  });

  return {
    sessionToken: session.token,
    expiresIn: session.expiresIn,
    agentId,
  };
}

export class ChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChallengeError';
  }
}
