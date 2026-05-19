import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { ForbiddenError } from '../middleware/error.js';
import type { RequestContext } from '../middleware/auth.js';
import {
  declareProduction,
  getProductionStatus,
} from '../services/tenant-production-access.js';

const tenants = new Hono();

const declareSchema = z.object({
  intended_use_case: z.string().min(20).max(1000),
  expected_monthly_volume_usd: z.number().positive().optional(),
  website_url: z.string().url().optional(),
  accepted_terms: z.literal(true),
});

/**
 * POST /v1/tenants/declare-production
 * Owner-only. Submits the lightweight T1 declaration and moves the tenant to
 * `declaration_pending` for manual review. SSO identity is auto-enriched.
 */
tenants.post('/declare-production', async (c) => {
  const ctx = c.get('ctx') as RequestContext;

  // Declaration is a dashboard/owner action — not an API-key or agent action.
  if (ctx.actorType !== 'user' || ctx.userRole !== 'owner') {
    throw new ForbiddenError(
      'Only an organization owner (signed in via the dashboard) can request production access.'
    );
  }

  const input = declareSchema.parse(await c.req.json());
  const supabase = createClient();

  const result = await declareProduction(
    supabase,
    {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
      actorType: ctx.actorType,
      actorId: ctx.actorId ?? ctx.userId ?? null,
      actorName: ctx.actorName ?? ctx.userName ?? null,
    },
    input
  );

  return c.json(
    {
      status: result.status,
      kyaTier: result.kyaTier,
      message:
        'Production access requested. We review declarations manually and will email you once a decision is made.',
    },
    202
  );
});

/**
 * GET /v1/tenants/production-status
 * Current production-access state + the effective beta ceiling, for the
 * dashboard to render the gating banner and live-key CTA.
 */
tenants.get('/production-status', async (c) => {
  const ctx = c.get('ctx') as RequestContext;
  const supabase = createClient();
  const status = await getProductionStatus(supabase, ctx.tenantId);
  return c.json(status);
});

export default tenants;
