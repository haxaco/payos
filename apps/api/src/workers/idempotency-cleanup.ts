/**
 * Idempotency Key Cleanup Worker (Epic 27, Story 27.6)
 * 
 * Periodically cleans up expired idempotency keys from the database.
 * This runs on a cron schedule or can be triggered manually.
 * 
 * The cleanup happens in two places:
 * 1. Database: SQL function `cleanup_expired_idempotency_keys()` deletes old rows
 * 2. Memory: In-process cache is cleaned periodically by the middleware
 */

import { createClient } from '../db/client.js';

/**
 * Run database cleanup for expired idempotency keys
 * @returns Number of deleted keys
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const supabase = createClient();
  
  try {
    // Call the database function to cleanup expired keys
    const { data, error } = await supabase.rpc('cleanup_expired_idempotency_keys');
    
    if (error) {
      console.error('Idempotency cleanup error:', error);
      return 0;
    }
    
    const deletedCount = data || 0;
    
    if (deletedCount > 0) {
      console.log(`[Idempotency Cleanup] Deleted ${deletedCount} expired keys`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Idempotency cleanup failed:', error);
    return 0;
  }
}

/**
 * Get idempotency key statistics
 */
export async function getIdempotencyStats(): Promise<{
  totalKeys: number;
  expiredKeys: number;
  keysByTenant: Record<string, number>;
}> {
  const supabase = createClient();
  
  try {
    // Get total keys
    const { count: totalKeys } = await supabase
      .from('idempotency_keys')
      .select('*', { count: 'exact', head: true });
    
    // Get expired keys (should be 0 if cleanup is running)
    const { count: expiredKeys } = await supabase
      .from('idempotency_keys')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString());
    
    // Get keys by tenant
    const { data: tenantCounts } = await supabase
      .from('idempotency_keys')
      .select('tenant_id')
      .gt('expires_at', new Date().toISOString());
    
    const keysByTenant: Record<string, number> = {};
    for (const row of tenantCounts || []) {
      keysByTenant[row.tenant_id] = (keysByTenant[row.tenant_id] || 0) + 1;
    }
    
    return {
      totalKeys: totalKeys || 0,
      expiredKeys: expiredKeys || 0,
      keysByTenant,
    };
  } catch (error) {
    console.error('Failed to get idempotency stats:', error);
    return { totalKeys: 0, expiredKeys: 0, keysByTenant: {} };
  }
}

/**
 * Start the cleanup worker on a schedule
 * @param intervalMs Cleanup interval in milliseconds (default: 1 hour)
 * @returns Function to stop the worker
 */
export function startIdempotencyCleanupWorker(intervalMs: number = 60 * 60 * 1000): () => void {
  console.log(`[Idempotency Cleanup Worker] Starting with ${intervalMs / 1000}s interval`);
  
  // Run immediately on start
  cleanupExpiredIdempotencyKeys();
  
  // Then run on schedule
  const interval = setInterval(async () => {
    try {
      await cleanupExpiredIdempotencyKeys();
    } catch (error) {
      console.error('[Idempotency Cleanup Worker] Error:', error);
    }
  }, intervalMs);
  
  // Return stop function
  return () => {
    console.log('[Idempotency Cleanup Worker] Stopping');
    clearInterval(interval);
  };
}

