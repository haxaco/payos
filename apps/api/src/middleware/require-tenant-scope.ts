/**
 * Epic 82 — group-level scope enforcement for tenant-wide routes.
 *
 * Mounted on each tenant-data router (accounts, wallets, x402, ap2,
 * acp, ucp, mpp, a2a-tasks, etc.) AFTER authMiddleware. Agents calling
 * these endpoints without an active `auth_scope_grants` row are turned
 * away with a structured 403 that points them at `request_scope`.
 *
 * api_key and user-JWT callers pass through automatically — their
 * effective scope (`tenant_write` for owner/admin/api_key, `tenant_read`
 * for member/viewer) is derived from `effectiveScope()` and already
 * covers default mappings.
 *
 * The default policy is purely method-driven:
 *
 *   GET  / HEAD                       → tenant_read
 *   POST / PATCH / PUT / DELETE       → tenant_write
 *
 * Treasury (fund movement) is NEVER inferred from method — it must be
 * declared explicitly via the `overrides` table at mount time. Same
 * with `agent` baseline overrides for the rare endpoints we want to
 * leave open to unscoped agents (e.g. per-agent reputation feedback).
 *
 * Self-scope shortcut: list endpoints that accept an `agent_id` filter
 * (ap2_list_mandates, acp_list_checkouts, ucp_list_*, a2a_list_tasks)
 * may be called by an agent without a grant IF the request narrows
 * to that agent's own id (`agent_id == ctx.actorId`). The middleware
 * verifies the param and lets the request through; the route handler's
 * existing `eq('agent_id', agent_id)` filter does the actual narrowing.
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { createClient } from '../db/client.js';
import {
  requireScope,
  recordScopeUse,
  ScopeRequiredError,
  type Scope,
} from '../services/auth/scopes/index.js';

/** A scope tier the middleware can be told to require. `agent` is the
 *  baseline (no elevation needed); used for overrides that intentionally
 *  leave a path open to unscoped agents. */
export type RequiredScope = Scope | 'agent';

interface MethodMatcher {
  method: string;
  pattern: RegExp;
  scope: RequiredScope;
}

export interface RequireTenantScopeOptions {
  /**
   * Per-method, per-path overrides evaluated in order. The first match
   * wins. Path patterns are matched against the FULL URL pathname
   * (including the `/v1/<group>` prefix). `:param` placeholders match
   * a single path segment. Methods are case-insensitive; use `'*'` to
   * match any method.
   *
   *   { method: 'POST', path: '/v1/wallets/:id/withdraw', scope: 'treasury' }
   */
  overrides?: Array<{
    method: '*' | 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD';
    path: string;
    scope: RequiredScope;
  }>;

  /**
   * If set, list endpoints that pass `<paramName>` (in the query string)
   * equal to `ctx.actorId` are treated as agent-scoped — the scope check
   * is skipped and the handler's existing equality filter on that param
   * provides the narrowing.
   */
  selfScopeShortcut?: { paramName: string };

  /**
   * Static label used in audit rows when the elevated grant is consumed.
   * Defaults to the request path.
   */
  routeLabelPrefix?: string;
}

/**
 * Compile a path pattern like `/v1/wallets/:id/withdraw` into a RegExp
 * anchored to the URL pathname. `:param` segments match `[^/]+`.
 */
function compilePattern(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:[A-Za-z_][A-Za-z0-9_]*/g, '/[^/]+');
  return new RegExp(`^${escaped}$`);
}

const DEFAULT_METHOD_SCOPE: Record<string, RequiredScope> = {
  GET: 'tenant_read',
  HEAD: 'tenant_read',
  OPTIONS: 'tenant_read',
  POST: 'tenant_write',
  PATCH: 'tenant_write',
  PUT: 'tenant_write',
  DELETE: 'tenant_write',
};

export function requireTenantScope(
  options: RequireTenantScopeOptions = {},
): MiddlewareHandler {
  const matchers: MethodMatcher[] = (options.overrides ?? []).map((o) => ({
    method: o.method.toUpperCase(),
    pattern: compilePattern(o.path),
    scope: o.scope,
  }));

  return async (c: Context, next: Next) => {
    const ctx = c.get('ctx');
    if (!ctx) return next();

    const method = c.req.method.toUpperCase();
    const fullPath = new URL(c.req.url).pathname;

    // 1. Resolve required scope: explicit override beats method default.
    let required: RequiredScope = DEFAULT_METHOD_SCOPE[method] ?? 'tenant_write';
    let matchedOverride = false;
    for (const m of matchers) {
      if ((m.method === '*' || m.method === method) && m.pattern.test(fullPath)) {
        required = m.scope;
        matchedOverride = true;
        break;
      }
    }

    // 2. `agent` baseline → no enforcement; pass through.
    if (required === 'agent') return next();

    // 3. Self-scope shortcut for list endpoints (only on read-tier routes
    //    by default — a tenant_write route that accepts `agent_id` should
    //    not auto-elevate; the override map can opt in if needed).
    if (
      options.selfScopeShortcut &&
      ctx.actorType === 'agent' &&
      ctx.actorId &&
      required === 'tenant_read' &&
      !matchedOverride
    ) {
      const param = c.req.query(options.selfScopeShortcut.paramName);
      if (param && param === ctx.actorId) {
        return next();
      }
    }

    // 4. Enforce.
    try {
      requireScope(ctx, required as Scope);
    } catch (err) {
      if (err instanceof ScopeRequiredError) {
        return c.json(
          {
            error: err.message,
            code: err.code,
            required_scope: err.requiredScope,
            current_scope: err.currentScope,
            hint: err.hint,
          },
          err.statusCode,
        );
      }
      throw err;
    }

    // 5. Record use (one_shot grants flip to consumed; standing grants
    //    just bump use_count). Fire-and-forget — failure here must not
    //    drop the request, since the caller already passed the gate.
    if (ctx.elevatedGrantId) {
      const supabase = createClient();
      const label = `${options.routeLabelPrefix ?? ''}${fullPath}`;
      void recordScopeUse(supabase, ctx.tenantId, ctx.elevatedGrantId, ctx, {
        route: label,
      }).catch((err) => {
        console.error('[scopes] recordScopeUse failed:', err);
      });
    }

    return next();
  };
}
