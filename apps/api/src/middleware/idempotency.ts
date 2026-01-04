import { Context, Next } from 'hono';
import { createHash } from 'crypto';
import { createClient } from '../db/client.js';

/**
 * Idempotency Key Infrastructure (Epic 27, Story 27.6)
 * 
 * Prevents duplicate transactions from partner retries by:
 * 1. Accepting `Idempotency-Key` header on POST/PUT/PATCH requests
 * 2. Storing request fingerprint (hash of body + endpoint) for 24 hours
 * 3. Returning cached response for duplicate requests
 * 4. Detecting request mismatch (same key, different body)
 * 
 * Usage:
 * ```
 * POST /v1/transfers
 * Idempotency-Key: unique-key-123
 * Content-Type: application/json
 * 
 * { "fromAccountId": "...", "amount": 100 }
 * ```
 */

// In-memory cache for recent idempotency checks (reduces DB load)
const recentKeys = new Map<string, {
  response: { status: number; body: any; headers?: Record<string, string> };
  requestHash: string;
  expiresAt: number;
}>();

// Cache cleanup interval (every 5 minutes)
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;
// In-memory cache TTL (5 minutes - just for hot path)
const MEMORY_CACHE_TTL = 5 * 60 * 1000;
// Database TTL (24 hours)
const DB_TTL_HOURS = 24;

// Start cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of recentKeys.entries()) {
    if (value.expiresAt < now) {
      recentKeys.delete(key);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

/**
 * Generate a hash of the request for fingerprinting
 */
function hashRequest(method: string, path: string, body: string): string {
  return createHash('sha256')
    .update(`${method}:${path}:${body}`)
    .digest('hex');
}

/**
 * Get cache key combining tenant and idempotency key
 */
function getCacheKey(tenantId: string, idempotencyKey: string): string {
  return `${tenantId}:${idempotencyKey}`;
}

// Extend Hono context to store idempotency info
declare module 'hono' {
  interface ContextVariableMap {
    idempotencyKey?: string;
    idempotencyRequestHash?: string;
  }
}

/**
 * Idempotency middleware
 * 
 * Apply to routes that should support idempotency (typically write operations).
 * Can be used globally or per-route.
 */
export async function idempotencyMiddleware(c: Context, next: Next) {
  // Only apply to write operations
  const method = c.req.method;
  if (!['POST', 'PUT', 'PATCH'].includes(method)) {
    return next();
  }

  // Get idempotency key from header
  const idempotencyKey = c.req.header('Idempotency-Key') || c.req.header('X-Idempotency-Key');
  
  // No idempotency key - proceed normally
  if (!idempotencyKey) {
    return next();
  }

  // Validate key format (must be non-empty, max 256 chars)
  if (idempotencyKey.length > 256) {
    return c.json({
      error: 'Invalid Idempotency-Key',
      message: 'Idempotency key must be 256 characters or less',
      code: 'IDEMPOTENCY_KEY_TOO_LONG',
    }, 400);
  }

  // Get tenant context (requires auth middleware to run first)
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) {
    // Auth not applied yet - skip idempotency
    return next();
  }

  const tenantId = ctx.tenantId;
  const path = new URL(c.req.url).pathname;
  
  // Clone request to read body without consuming it
  // Note: We use the raw body text for hashing, but route handlers can still read JSON
  let bodyText = '';
  try {
    // Clone the request before reading body
    const clonedReq = c.req.raw.clone();
    bodyText = await clonedReq.text();
  } catch {
    bodyText = '';
  }

  const requestHash = hashRequest(method, path, bodyText);
  const cacheKey = getCacheKey(tenantId, idempotencyKey);

  // Store in context for potential use by route handlers
  c.set('idempotencyKey', idempotencyKey);
  c.set('idempotencyRequestHash', requestHash);

  // 1. Check in-memory cache first (hot path)
  const memoryCached = recentKeys.get(cacheKey);
  if (memoryCached) {
    // Verify request hash matches
    if (memoryCached.requestHash !== requestHash) {
      return c.json({
        error: 'Idempotency key conflict',
        message: 'This idempotency key was used with a different request body. Each idempotency key must be unique per request.',
        code: 'IDEMPOTENCY_KEY_CONFLICT',
      }, 409);
    }
    
    // Return cached response
    const response = memoryCached.response;
    c.header('X-Idempotency-Cached', 'true');
    c.header('X-Idempotency-Key', idempotencyKey);
    return c.json(response.body, response.status as any);
  }

  // 2. Check database
  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from('idempotency_keys')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', idempotencyKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existing && !lookupError) {
    // Verify request hash matches
    if (existing.request_hash !== requestHash) {
      return c.json({
        error: 'Idempotency key conflict',
        message: 'This idempotency key was used with a different request body. Each idempotency key must be unique per request.',
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        details: {
          originalPath: existing.request_path,
          originalMethod: existing.request_method,
          currentPath: path,
          currentMethod: method,
        },
      }, 409);
    }

    // Cache in memory for future hits
    recentKeys.set(cacheKey, {
      response: {
        status: existing.response_status,
        body: existing.response_body,
        headers: existing.response_headers,
      },
      requestHash: existing.request_hash,
      expiresAt: Date.now() + MEMORY_CACHE_TTL,
    });

    // Return cached response
    c.header('X-Idempotency-Cached', 'true');
    c.header('X-Idempotency-Key', idempotencyKey);
    return c.json(existing.response_body, existing.response_status as any);
  }

  // 3. Execute request and capture response
  await next();

  // 4. After route handler, capture and store the response
  // We need to intercept the response to cache it
  // Since Hono doesn't expose response body easily, we'll use a different approach:
  // Store the idempotency data in a header that a response transformer can pick up
  
  // For now, we rely on route handlers to manually call storeIdempotencyResponse
  // or we use response interception at the framework level
  
  // Add header to indicate key was processed
  c.header('X-Idempotency-Key', idempotencyKey);
}

/**
 * Wrapper to create idempotent route handlers
 * Use this to wrap route handlers that need idempotency with response caching
 */
export function withIdempotency<T>(
  handler: (c: Context) => Promise<{ status: number; body: T }>
): (c: Context) => Promise<Response> {
  return async (c: Context) => {
    const idempotencyKey = c.get('idempotencyKey');
    const requestHash = c.get('idempotencyRequestHash');
    const ctx = c.get('ctx');

    // Execute handler
    const result = await handler(c);

    // If idempotency key provided and successful, store response
    if (idempotencyKey && requestHash && ctx?.tenantId && result.status >= 200 && result.status < 300) {
      const path = new URL(c.req.url).pathname;
      const method = c.req.method;

      // Store in DB (fire and forget)
      storeIdempotencyResponse(
        ctx.tenantId,
        idempotencyKey,
        requestHash,
        path,
        method,
        result.status,
        result.body
      ).catch((err) => console.error('Failed to store idempotency:', err));
    }

    return c.json(result.body, result.status as any);
  };
}

/**
 * Check if an idempotency key exists (for manual checking in routes)
 */
export async function checkIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
  requestHash: string
): Promise<{ exists: boolean; response?: { status: number; body: any }; conflict?: boolean }> {
  const cacheKey = getCacheKey(tenantId, idempotencyKey);

  // Check memory cache
  const memoryCached = recentKeys.get(cacheKey);
  if (memoryCached) {
    if (memoryCached.requestHash !== requestHash) {
      return { exists: true, conflict: true };
    }
    return { exists: true, response: memoryCached.response };
  }

  // Check database
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', idempotencyKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existing) {
    if (existing.request_hash !== requestHash) {
      return { exists: true, conflict: true };
    }
    return {
      exists: true,
      response: {
        status: existing.response_status,
        body: existing.response_body,
      },
    };
  }

  return { exists: false };
}

/**
 * Store an idempotency response (for manual use in routes)
 */
export async function storeIdempotencyResponse(
  tenantId: string,
  idempotencyKey: string,
  requestHash: string,
  requestPath: string,
  requestMethod: string,
  responseStatus: number,
  responseBody: any
): Promise<void> {
  const supabase = createClient();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + DB_TTL_HOURS);

  await supabase.from('idempotency_keys').upsert({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    request_hash: requestHash,
    request_path: requestPath,
    request_method: requestMethod,
    response_status: responseStatus,
    response_body: responseBody,
    expires_at: expiresAt.toISOString(),
  }, {
    onConflict: 'tenant_id,idempotency_key',
  });

  // Also cache in memory
  const cacheKey = getCacheKey(tenantId, idempotencyKey);
  recentKeys.set(cacheKey, {
    response: { status: responseStatus, body: responseBody },
    requestHash,
    expiresAt: Date.now() + MEMORY_CACHE_TTL,
  });
}

/**
 * Cleanup expired keys from memory (database cleanup is done via SQL function)
 */
export function cleanupMemoryCache(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of recentKeys.entries()) {
    if (value.expiresAt < now) {
      recentKeys.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

/**
 * Get memory cache stats (for monitoring)
 */
export function getMemoryCacheStats(): { size: number; oldestEntry: number | null } {
  let oldestEntry: number | null = null;
  for (const value of recentKeys.values()) {
    if (oldestEntry === null || value.expiresAt < oldestEntry) {
      oldestEntry = value.expiresAt;
    }
  }
  return {
    size: recentKeys.size,
    oldestEntry,
  };
}
