/**
 * Epic 65, Story 65.3: Request Counter Middleware
 *
 * Placed after authMiddleware to have tenant context.
 * Records method, normalized path, status code, actor type, and duration.
 */

import { Context, Next } from 'hono';
import { recordRequest } from '../services/ops/request-counter.js';

export async function requestCounterMiddleware(c: Context, next: Next) {
  const start = performance.now();

  await next();

  // Only count authenticated requests (ctx is set by authMiddleware)
  const ctx = c.get('ctx');
  if (!ctx?.tenantId) return;

  const durationMs = Math.round(performance.now() - start);
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  const statusCode = c.res.status;
  const actorType = ctx.actorType || 'unknown';

  recordRequest(ctx.tenantId, method, path, statusCode, actorType, durationMs);
}
