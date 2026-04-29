/**
 * Epic 82 — sibling-scope guard helper.
 *
 * Many agent-detail and agent-wallet mutations are inherently cross-
 * agent when the calling agent's id != the target agent's id. Rather
 * than copy-paste the requireScope + recordScopeUse + 403 boilerplate
 * into every handler, callers do:
 *
 *   const denied = await guardSiblingScope(c, supabase, targetId, 'tenant_write', 'PATCH /v1/agents/:id');
 *   if (denied) return denied;
 *
 * Behavior:
 *   - Non-agent callers (api_key, user JWT, portal, sess_*) pass through
 *     unchanged — this guard ONLY applies when actorType === 'agent'.
 *   - Same-agent calls (ctx.actorId === targetId) pass through.
 *   - Cross-agent calls require the named scope. If absent, returns a
 *     403 JSON Response shaped like other SCOPE_REQUIRED responses.
 *   - On pass, awaits recordScopeUse synchronously so one_shot
 *     consumption / use_count increments land before the response.
 */

import type { Context } from 'hono';
import type { SupabaseClient } from '../../../db/client.js';
import { requireScope, recordScopeUse, type Scope, ScopeRequiredError } from './index.js';

export async function guardSiblingScope(
  c: Context,
  supabase: SupabaseClient,
  targetAgentId: string,
  required: Scope,
  routeLabel: string,
): Promise<Response | null> {
  const ctx = c.get('ctx');
  if (!ctx) return null;
  if (ctx.actorType !== 'agent') return null;
  if (!ctx.actorId || ctx.actorId === targetAgentId) return null;

  try {
    requireScope(ctx, required);
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

  if (ctx.elevatedGrantId) {
    try {
      await recordScopeUse(supabase, ctx.tenantId, ctx.elevatedGrantId, ctx, {
        route: routeLabel,
      });
    } catch (err) {
      console.error('[scopes] recordScopeUse failed:', err);
    }
  }

  return null;
}
