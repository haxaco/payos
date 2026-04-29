/**
 * Epic 82, Story 82.4 — Agent-side scope routes.
 *
 * Mounted at `/v1/auth/scopes`. These endpoints are called BY the
 * authenticated agent (via agent_* or sess_* tokens):
 *
 *   POST /v1/auth/scopes/request
 *     Submit a request for an elevated scope grant. Writes a
 *     'scope_requested' audit row; does NOT issue a grant. The actual
 *     approval flows through Epic 83 (pending_approvals queue) or
 *     direct dashboard issuance (Story 82.5).
 *
 *   GET /v1/auth/scopes/active
 *     Returns the active scope context for the caller — which scope
 *     they currently hold (`agent` baseline or one of the elevated
 *     tiers) and the grant id that authorizes it. Useful for agents
 *     to self-check before attempting a privileged operation.
 *
 *   GET /v1/auth/scopes/:requestId
 *     Fetch the status of a previously-submitted scope request. The
 *     audit row may have been resolved into a grant (look up the
 *     paired `scope_granted`/`scope_denied` row) or still pending.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { ValidationError } from '../middleware/error.js';
import {
  type Scope,
  type ScopeLifecycle,
  requestScope,
} from '../services/auth/scopes/index.js';

const router = new Hono();

const SCOPES: Scope[] = ['tenant_read', 'tenant_write', 'treasury'];
const LIFECYCLES: ScopeLifecycle[] = ['one_shot', 'standing'];

const requestSchema = z.object({
  scope: z.enum(['tenant_read', 'tenant_write', 'treasury']),
  lifecycle: z.enum(['one_shot', 'standing']),
  purpose: z.string().min(8).max(500),
  intent: z
    .object({
      mcp_tool: z.string().optional(),
      route: z.string().optional(),
      target_agent_id: z.string().optional(),
      target_account_id: z.string().optional(),
      // free-form, sanitized of PII at the calling layer
      args: z.record(z.unknown()).optional(),
    })
    .partial()
    .optional(),
  duration_minutes: z.number().int().positive().max(60).optional(),
});

// ============================================
// POST /v1/auth/scopes/request
// ============================================
router.post('/request', async (c) => {
  const ctx = c.get('ctx');
  if (ctx.actorType !== 'agent' || !ctx.actorId) {
    return c.json(
      { error: 'Only agent-bound callers (agent_* or sess_* tokens) may request scope elevation.' },
      403,
    );
  }

  const body = await c.req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid scope request', parsed.error.flatten());
  }

  const supabase = createClient();
  try {
    const { requestId } = await requestScope({
      supabase,
      ctx,
      scope: parsed.data.scope,
      lifecycle: parsed.data.lifecycle,
      purpose: parsed.data.purpose,
      intentPayload: parsed.data.intent,
      durationMinutes: parsed.data.duration_minutes,
    });
    return c.json(
      {
        request_id: requestId,
        status: 'pending',
        message:
          'Scope request submitted. A tenant owner must approve it via the dashboard before the elevation takes effect.',
      },
      202,
    );
  } catch (err: any) {
    return c.json({ error: err?.message ?? 'Failed to submit scope request' }, 400);
  }
});

// ============================================
// GET /v1/auth/scopes/active
// ============================================
router.get('/active', async (c) => {
  const ctx = c.get('ctx');
  if (ctx.actorType !== 'agent' || !ctx.actorId) {
    return c.json(
      { error: 'Only agent-bound callers may inspect scope state.' },
      403,
    );
  }

  // The auth middleware has already populated ctx.elevatedScope by
  // looking up the highest-tier active grant. Mirror it back so the
  // caller can self-check before trying a privileged op.
  const supabase: any = createClient();
  const [{ data: grants }, { data: agentRow }, { data: walletRow }] = await Promise.all([
    (supabase.from('auth_scope_grants') as any)
      .select('id, scope, lifecycle, status, purpose, granted_at, expires_at, last_used_at, use_count, parent_session_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('agent_id', ctx.actorId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('granted_at', { ascending: false }),
    (supabase.from('agents') as any)
      .select('id, name, kya_tier, status')
      .eq('id', ctx.actorId)
      .single(),
    (supabase.from('wallets') as any)
      .select('id, wallet_address, balance, wallet_type, status')
      .eq('managed_by_agent_id', ctx.actorId)
      .eq('wallet_type', 'agent_eoa')
      .eq('environment', ctx.environment)
      .maybeSingle(),
  ]);

  // Filter for grants that apply to THIS call (un-anchored or matching session).
  const applicable = ((grants ?? []) as any[]).filter((g) => {
    if (!g.parent_session_id) return true;
    return ctx.sessionId && g.parent_session_id === ctx.sessionId;
  });

  const currentScope = ctx.elevatedScope ?? 'agent';
  const nudge = currentScope === 'agent'
    ? 'You are operating at the agent baseline. Tenant-wide list endpoints will 403 — prefer self-scoped tools (whoami, agent_wallet_get, get_agent_transactions) or call request_scope first.'
    : `You currently hold scope '${currentScope}'. Use it sparingly; one_shot grants are consumed on first use.`;

  return c.json({
    current_scope: currentScope,
    elevated_grant_id: ctx.elevatedGrantId ?? null,
    session_id: ctx.sessionId ?? null,
    agent: agentRow ? {
      id: (agentRow as any).id,
      name: (agentRow as any).name,
      kya_tier: (agentRow as any).kya_tier,
      status: (agentRow as any).status,
      wallet: walletRow ? {
        id: (walletRow as any).id,
        address: (walletRow as any).wallet_address,
        balance: Number((walletRow as any).balance ?? 0),
        type: (walletRow as any).wallet_type,
        status: (walletRow as any).status,
      } : null,
    } : null,
    nudge,
    grants: applicable.map((g) => ({
      id: g.id,
      scope: g.scope,
      lifecycle: g.lifecycle,
      status: g.status,
      purpose: g.purpose,
      granted_at: g.granted_at,
      expires_at: g.expires_at,
      last_used_at: g.last_used_at,
      use_count: g.use_count,
      session_anchored: g.parent_session_id !== null,
    })),
  });
});

// ============================================
// GET /v1/auth/scopes/:requestId
// ============================================
router.get('/:requestId', async (c) => {
  const ctx = c.get('ctx');
  if (ctx.actorType !== 'agent' || !ctx.actorId) {
    return c.json(
      { error: 'Only agent-bound callers may inspect scope requests.' },
      403,
    );
  }
  const requestId = c.req.param('requestId');
  if (!requestId) {
    throw new ValidationError('Missing request id');
  }

  const supabase = createClient();

  // The 'scope_requested' audit row IS the request. Its decision (if
  // any) is a sibling row referencing the same context.
  const { data: requestedRow, error: requestedErr } = await ((supabase as any).from('auth_scope_audit'))
    .select('id, tenant_id, agent_id, scope, action, request_summary, created_at, grant_id')
    .eq('id', requestId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (requestedErr || !requestedRow) {
    return c.json({ error: 'Scope request not found' }, 404);
  }
  if (requestedRow.agent_id !== ctx.actorId) {
    return c.json({ error: 'Scope request does not belong to caller' }, 403);
  }
  if (requestedRow.action !== 'scope_requested') {
    return c.json({ error: 'Provided id does not reference a scope request' }, 400);
  }

  // If a grant_id is set, the request was approved → fetch the grant.
  // Otherwise look for a 'scope_denied' decision row.
  if (requestedRow.grant_id) {
    const { data: grant } = await ((supabase as any).from('auth_scope_grants'))
      .select('id, scope, lifecycle, status, purpose, granted_at, expires_at, last_used_at, use_count')
      .eq('id', requestedRow.grant_id)
      .single();
    return c.json({
      request_id: requestId,
      status: grant?.status === 'active' ? 'approved' : (grant?.status ?? 'unknown'),
      requested_at: requestedRow.created_at,
      grant: grant ?? null,
    });
  }

  // Look for a paired denial — same agent, same scope, same parent
  // session, after the request, action='scope_denied'.
  const { data: denial } = await ((supabase as any).from('auth_scope_audit'))
    .select('id, action, created_at, request_summary')
    .eq('tenant_id', ctx.tenantId)
    .eq('agent_id', ctx.actorId)
    .eq('action', 'scope_denied')
    .gt('created_at', requestedRow.created_at)
    .order('created_at', { ascending: true })
    .limit(1);

  if (denial && denial.length > 0) {
    return c.json({
      request_id: requestId,
      status: 'denied',
      requested_at: requestedRow.created_at,
      denied_at: denial[0].created_at,
      denial_reason: denial[0].request_summary?.reason ?? null,
    });
  }

  return c.json({
    request_id: requestId,
    status: 'pending',
    requested_at: requestedRow.created_at,
    requested: {
      scope: requestedRow.scope,
      ...requestedRow.request_summary,
    },
  });
});

export default router;
