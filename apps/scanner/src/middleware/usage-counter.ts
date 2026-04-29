import type { Context, Next } from 'hono';
import { recordRequest, flushUsage } from '../services/usage.js';
import { waitUntil } from '../utils/wait-until.js';

/**
 * Placed after authMiddleware so ctx is populated.
 *
 * Records the request into the in-memory buffer, then hands the flush off to
 * Vercel's waitUntil() so the function instance stays alive long enough for
 * the Supabase upsert to complete. Without waitUntil, serverless teardown
 * would kill the in-flight flush promise and scanner_usage_events would
 * never receive rows.
 */
export async function usageCounterMiddleware(c: Context, next: Next) {
  const start = performance.now();
  await next();

  const ctx = c.get('ctx');
  if (!ctx?.tenantId) return;

  const durationMs = Math.round(performance.now() - start);
  const creditsConsumed = Number(c.get('creditsCharged' as never) ?? 0);

  recordRequest({
    tenantId: ctx.tenantId,
    scannerKeyId: ctx.scannerKeyId ?? null,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    statusCode: c.res.status,
    actorType: ctx.actorType ?? 'unknown',
    durationMs,
    creditsConsumed,
  });

  waitUntil(
    flushUsage().catch((err) => {
      console.error('[scanner-usage] flush failed:', err);
    }),
  );
}

declare module 'hono' {
  interface ContextVariableMap {
    creditsCharged: number;
  }
}
