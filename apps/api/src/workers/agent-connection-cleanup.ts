/**
 * Epic 72 — Connection Cleanup Worker
 *
 * Runs every 60s to:
 *   - Delete expired challenges (> 5 min old)
 *   - Delete expired sessions (past expires_at)
 *   - Mark stale connections as disconnected (no heartbeat > 90s)
 *   - Prune in-memory replay buffers
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { agentConnectionBus } from '../services/agent-auth/connection-bus.js';

const CLEANUP_INTERVAL_MS = 60 * 1000;
const CHALLENGE_MAX_AGE_MINUTES = 5;
const STALE_HEARTBEAT_SECONDS = 90;

let intervalId: ReturnType<typeof setInterval> | null = null;

async function runCleanup(supabase: SupabaseClient): Promise<void> {
  const now = new Date();

  // 1. Delete expired challenges (> 5 min old to be safe, even though TTL is 60s)
  const challengeCutoff = new Date(now.getTime() - CHALLENGE_MAX_AGE_MINUTES * 60 * 1000).toISOString();
  await (supabase.from('agent_challenges') as any)
    .delete()
    .lt('expires_at', challengeCutoff);

  // 2. Delete expired sessions
  await (supabase.from('agent_sessions') as any)
    .delete()
    .lt('expires_at', now.toISOString())
    .not('revoked_at', 'is', null); // Only delete already-revoked expired sessions
  // Mark expired but not-yet-revoked sessions as revoked
  await (supabase.from('agent_sessions') as any)
    .update({ revoked_at: now.toISOString() })
    .lt('expires_at', now.toISOString())
    .is('revoked_at', null);

  // 3. Mark stale connections as disconnected (no heartbeat in 90s)
  const staleCutoff = new Date(now.getTime() - STALE_HEARTBEAT_SECONDS * 1000).toISOString();
  await (supabase.from('agent_connections') as any)
    .update({ disconnected_at: now.toISOString() })
    .lt('last_heartbeat_at', staleCutoff)
    .is('disconnected_at', null);

  // 4. Prune in-memory replay buffers
  agentConnectionBus.pruneBuffers();
}

export function startConnectionCleanupWorker(supabase: SupabaseClient): void {
  if (intervalId) return; // Already running

  console.log('[cleanup] Agent connection cleanup worker started (60s interval)');

  intervalId = setInterval(() => {
    runCleanup(supabase).catch((err) => {
      console.error('[cleanup] Agent connection cleanup error:', err);
    });
  }, CLEANUP_INTERVAL_MS);
}

export function stopConnectionCleanupWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[cleanup] Agent connection cleanup worker stopped');
  }
}
