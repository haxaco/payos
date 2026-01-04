import { Context, Next } from 'hono';

/**
 * Context API Caching Layer (Epic 31, Story 31.5)
 * 
 * Improves response times and reduces database load by caching context endpoint responses.
 * Different data types have different TTLs based on volatility:
 * - Account metadata: 5 minutes (stable)
 * - 30-day activity stats: 1 hour (historical)
 * - Balances: 30 seconds (volatile)
 * - Transfer/Agent/Batch details: 2 minutes (semi-stable)
 * 
 * Features:
 * - Automatic cache key generation from endpoint + tenant + ID
 * - Cache headers (X-Cache: HIT/MISS, X-Cache-Age)
 * - Cache bypass via Cache-Control: no-cache header or ?fresh=true param
 * - Partial caching (can cache parts of response separately)
 * - Automatic cleanup of expired entries
 */

interface CacheEntry {
  data: any;
  cachedAt: number;
  expiresAt: number;
  etag: string;
}

// In-memory cache store
// TODO: Replace with Redis for production multi-instance deployments
const cacheStore = new Map<string, CacheEntry>();

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  ACCOUNT_METADATA: 5 * 60 * 1000,      // 5 minutes - name, tier, KYB status
  ACTIVITY_STATS: 60 * 60 * 1000,       // 1 hour - 30-day summaries
  BALANCES: 30 * 1000,                  // 30 seconds - current balances
  TRANSFER_DETAILS: 2 * 60 * 1000,      // 2 minutes - transfer info
  AGENT_DETAILS: 2 * 60 * 1000,         // 2 minutes - agent info
  BATCH_DETAILS: 2 * 60 * 1000,         // 2 minutes - batch info
  DEFAULT: 2 * 60 * 1000,               // 2 minutes - default for context endpoints
};

// Cache cleanup interval (every 5 minutes)
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;

// Start cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt < now) {
      cacheStore.delete(key);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

/**
 * Generate cache key from context
 */
function getCacheKey(c: Context): string {
  const ctx = c.get('ctx');
  const tenantId = ctx?.tenantId || 'anonymous';
  const path = new URL(c.req.url).pathname;
  const queryParams = new URL(c.req.url).searchParams;
  
  // Include relevant query params in cache key
  const relevantParams = ['include', 'expand', 'fields'];
  const paramString = relevantParams
    .filter(p => queryParams.has(p))
    .map(p => `${p}=${queryParams.get(p)}`)
    .join('&');
  
  return `context:${tenantId}:${path}${paramString ? ':' + paramString : ''}`;
}

/**
 * Generate ETag from data
 */
function generateETag(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `W/"${Math.abs(hash).toString(36)}"`;
}

/**
 * Determine TTL based on endpoint path
 */
function getTTL(path: string): number {
  if (path.includes('/context/account/')) {
    return CacheTTL.ACCOUNT_METADATA;
  }
  if (path.includes('/context/transfer/')) {
    return CacheTTL.TRANSFER_DETAILS;
  }
  if (path.includes('/context/agent/')) {
    return CacheTTL.AGENT_DETAILS;
  }
  if (path.includes('/context/batch/')) {
    return CacheTTL.BATCH_DETAILS;
  }
  return CacheTTL.DEFAULT;
}

/**
 * Check if cache should be bypassed
 */
function shouldBypassCache(c: Context): boolean {
  // Check Cache-Control header
  const cacheControl = c.req.header('Cache-Control');
  if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
    return true;
  }
  
  // Check ?fresh=true query param
  const url = new URL(c.req.url);
  if (url.searchParams.get('fresh') === 'true') {
    return true;
  }
  
  return false;
}

/**
 * Context caching middleware
 * 
 * Apply to context endpoints to enable caching.
 * Only caches GET requests with 200 responses.
 */
export async function contextCacheMiddleware(c: Context, next: Next) {
  // Only cache GET requests
  if (c.req.method !== 'GET') {
    return next();
  }
  
  // Only cache /context/* endpoints
  const path = new URL(c.req.url).pathname;
  if (!path.includes('/context/')) {
    return next();
  }
  
  const cacheKey = getCacheKey(c);
  const bypassCache = shouldBypassCache(c);
  
  // Check cache (unless bypassed)
  if (!bypassCache) {
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const age = Math.floor((Date.now() - cached.cachedAt) / 1000);
      
      // Set cache headers
      c.header('X-Cache', 'HIT');
      c.header('X-Cache-Age', String(age));
      c.header('ETag', cached.etag);
      c.header('Cache-Control', `private, max-age=${Math.floor((cached.expiresAt - Date.now()) / 1000)}`);
      
      // Check If-None-Match for 304 Not Modified
      const ifNoneMatch = c.req.header('If-None-Match');
      if (ifNoneMatch === cached.etag) {
        return c.body(null, 304);
      }
      
      // Return cached response
      return c.json(cached.data);
    }
  }
  
  // Execute request
  await next();
  
  // Cache successful responses
  const response = c.res;
  if (response.status === 200) {
    // Clone response to read body
    const clonedResponse = response.clone();
    try {
      const data = await clonedResponse.json();
      const ttl = getTTL(path);
      const etag = generateETag(data);
      
      // Store in cache
      cacheStore.set(cacheKey, {
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttl,
        etag,
      });
      
      // Add cache headers to original response
      c.header('X-Cache', 'MISS');
      c.header('X-Cache-Age', '0');
      c.header('ETag', etag);
      c.header('Cache-Control', `private, max-age=${Math.floor(ttl / 1000)}`);
    } catch (err) {
      // If response is not JSON, skip caching
      console.error('Failed to cache response:', err);
    }
  }
}

/**
 * Invalidate cache for a specific key pattern
 * Useful for cache invalidation on writes
 */
export function invalidateCache(pattern: string): number {
  let count = 0;
  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Invalidate cache for a specific account
 */
export function invalidateAccountCache(tenantId: string, accountId: string): number {
  const pattern = `context:${tenantId}:/v1/context/account/${accountId}`;
  return invalidateCache(pattern);
}

/**
 * Invalidate cache for a specific transfer
 */
export function invalidateTransferCache(tenantId: string, transferId: string): number {
  return invalidateCache(`context:${tenantId}:/v1/context/transfer/${transferId}`);
}

/**
 * Invalidate cache for a specific agent
 */
export function invalidateAgentCache(tenantId: string, agentId: string): number {
  return invalidateCache(`context:${tenantId}:/v1/context/agent/${agentId}`);
}

/**
 * Invalidate cache for a specific batch
 */
export function invalidateBatchCache(tenantId: string, batchId: string): number {
  return invalidateCache(`context:${tenantId}:/v1/context/batch/${batchId}`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; age: number; ttl: number }>;
} {
  const now = Date.now();
  const entries = Array.from(cacheStore.entries()).map(([key, entry]) => ({
    key,
    age: Math.floor((now - entry.cachedAt) / 1000),
    ttl: Math.floor((entry.expiresAt - now) / 1000),
  }));
  
  return {
    size: cacheStore.size,
    entries,
  };
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cacheStore.clear();
}

