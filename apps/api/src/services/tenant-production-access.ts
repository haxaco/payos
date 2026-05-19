import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../db/admin-client.js';
import { logAudit } from '../utils/helpers.js';
import { ApiError, ForbiddenError, NotFoundError } from '../middleware/error.js';
import { resolveBetaCeiling } from '../config/beta-ceilings.js';
import { isEmailVerificationRequired, isEmailVerified } from '../utils/auth.js';
import { bumpProductionEpoch } from './production-access-epoch.js';

/**
 * Tenant-level production-access (T1 "Declared") lifecycle.
 *
 * Open beta is sandbox-by-default. A tenant requests live access by submitting
 * a lightweight declaration enriched with the SSO identity we already have;
 * a platform admin then approves/denies (see beta-admin routes). Live API keys
 * and live money movement are gated on `production_access_status`.
 *
 * State machine:
 *   sandbox_only ─declare→ declaration_pending ─approve→ production_approved
 *                     │                                       │
 *                     └─deny→ production_denied               └─suspend→ production_suspended
 *   production_denied ─re-declare→ declaration_pending
 */

export type ProductionAccessStatus =
  | 'sandbox_only'
  | 'declaration_pending'
  | 'production_approved'
  | 'production_denied'
  | 'production_suspended';

/**
 * The single predicate every live-gating call site uses. A tenant may use
 * live keys / move live money only when explicitly production-approved.
 * Provider-agnostic: future T2/T3/Persona states still resolve through here.
 */
export function isProductionApproved(
  status: string | null | undefined
): boolean {
  return status === 'production_approved';
}

/** States from which a tenant may (re-)submit a declaration. */
const DECLARABLE_FROM: ReadonlySet<string> = new Set([
  'sandbox_only',
  'production_denied',
]);

export interface ProductionDeclarationInput {
  intended_use_case: string;
  expected_monthly_volume_usd?: number;
  website_url?: string;
  accepted_terms: boolean;
}

/** Minimal slice of RequestContext this service needs. */
export interface DeclarationActor {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  actorType: 'user' | 'agent' | 'system' | 'api_key' | 'portal';
  actorId?: string | null;
  actorName?: string | null;
}

interface TenantRow {
  id: string;
  name: string;
  production_access_status: string;
  production_declaration: Record<string, unknown> | null;
  production_declared_at: string | null;
  production_reviewed_at: string | null;
  production_review_notes: string | null;
  kya_tier: number | null;
  beta_ceiling_per_tx: number | null;
  beta_ceiling_daily: number | null;
  beta_ceiling_monthly: number | null;
  beta_ceiling_disabled: boolean | null;
}

const TENANT_SELECT =
  'id, name, production_access_status, production_declaration, production_declared_at, ' +
  'production_reviewed_at, production_review_notes, kya_tier, beta_ceiling_per_tx, ' +
  'beta_ceiling_daily, beta_ceiling_monthly, beta_ceiling_disabled';

async function fetchTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantRow> {
  const { data, error } = await (supabase.from('tenants') as any)
    .select(TENANT_SELECT)
    .eq('id', tenantId)
    .single();
  if (error || !data) throw new NotFoundError('Tenant', tenantId);
  return data as TenantRow;
}

/**
 * Best-effort SSO enrichment: pull the verified identity we already hold from
 * Supabase Auth so the declaration form only has to ask for the minimum.
 */
async function ssoIdentity(actor: DeclarationActor) {
  const identity: Record<string, string | null> = {
    email: actor.userEmail ?? null,
    name: actor.userName ?? null,
    provider: null,
    org: null,
    userId: actor.userId ?? null,
  };
  if (!actor.userId) return identity;
  try {
    const admin: any = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(actor.userId);
    const u = data?.user;
    if (u) {
      identity.email = u.email ?? identity.email;
      identity.provider = (u.app_metadata as any)?.provider ?? null;
      identity.org = (u.user_metadata as any)?.organization_name ?? null;
      identity.name =
        (u.user_metadata as any)?.name ??
        (u.user_metadata as any)?.full_name ??
        identity.name;
    }
  } catch {
    // Non-fatal — the declaration still records what ctx already has.
  }
  return identity;
}

/**
 * Record a T1 production declaration and move the tenant to
 * `declaration_pending`. Owner-only; route enforces the actor check.
 */
export async function declareProduction(
  supabase: SupabaseClient,
  actor: DeclarationActor,
  input: ProductionDeclarationInput
): Promise<{ status: ProductionAccessStatus; kyaTier: number }> {
  const tenant = await fetchTenant(supabase, actor.tenantId);

  // Open beta: production access (the path to real money) requires a verified
  // email when strict verification is enabled. Closes "fake email → live".
  if (isEmailVerificationRequired() && actor.userId) {
    try {
      const admin: any = createAdminClient();
      const { data } = await admin.auth.admin.getUserById(actor.userId);
      if (!isEmailVerified(data?.user)) {
        throw new ApiError(
          'Verify your email address before requesting production access.',
          403,
          undefined,
          { code: 'EMAIL_NOT_VERIFIED' }
        );
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      // If we cannot determine verification state, fail closed in strict mode.
      throw new ApiError(
        'Unable to verify email status. Please try again.',
        403,
        undefined,
        { code: 'EMAIL_VERIFICATION_UNAVAILABLE' }
      );
    }
  }

  if (!DECLARABLE_FROM.has(tenant.production_access_status)) {
    throw new ApiError(
      'Production access has already been requested or granted for this organization.',
      403,
      { currentStatus: tenant.production_access_status },
      {
        code: 'FORBIDDEN',
        suggestion:
          'Check GET /v1/tenants/production-status for the current state.',
      }
    );
  }
  if (!input.accepted_terms) {
    throw new ApiError('You must accept the terms to request production access.', 400, undefined, {
      code: 'VALIDATION_ERROR',
    });
  }

  const declaration = {
    tier: 1,
    version: 1,
    fields: {
      intended_use_case: input.intended_use_case,
      expected_monthly_volume_usd: input.expected_monthly_volume_usd ?? null,
      website_url: input.website_url ?? null,
      accepted_terms: input.accepted_terms,
    },
    identity: await ssoIdentity(actor),
  };

  const { error } = await (supabase.from('tenants') as any)
    .update({
      production_access_status: 'declaration_pending',
      kya_tier: 1,
      production_declaration: declaration,
      production_declared_at: new Date().toISOString(),
    })
    .eq('id', actor.tenantId);

  if (error) {
    throw new Error(`Failed to record production declaration: ${error.message}`);
  }

  await logAudit(supabase, {
    tenantId: actor.tenantId,
    entityType: 'tenant',
    entityId: actor.tenantId,
    action: 'production_declared',
    actorType: actor.actorType,
    actorId: actor.actorId ?? null,
    actorName: actor.actorName ?? null,
    changes: {
      before: { production_access_status: tenant.production_access_status },
      after: { production_access_status: 'declaration_pending', kya_tier: 1 },
    },
    metadata: { declaration_version: 1 },
  });

  return { status: 'declaration_pending', kyaTier: 1 };
}

/**
 * Read-only production-access status + the effective beta ceiling, for the
 * dashboard to render gating state and the live-key CTA.
 */
export async function getProductionStatus(
  supabase: SupabaseClient,
  tenantId: string
) {
  const t = await fetchTenant(supabase, tenantId);
  const ceiling = resolveBetaCeiling(t);
  return {
    status: t.production_access_status as ProductionAccessStatus,
    kyaTier: t.kya_tier ?? 0,
    declaredAt: t.production_declared_at,
    reviewedAt: t.production_reviewed_at,
    reviewNotes: t.production_review_notes,
    declaration: t.production_declaration ?? {},
    ceiling,
  };
}

/** Admin: list tenants awaiting (or in any given) production review state. */
export async function listProductionDeclarations(
  supabase: SupabaseClient,
  status: string,
  page: number,
  limit: number
) {
  const from = (page - 1) * limit;
  const { data, count, error } = await (supabase.from('tenants') as any)
    .select(TENANT_SELECT, { count: 'exact' })
    .eq('production_access_status', status)
    .order('production_declared_at', { ascending: true })
    .range(from, from + limit - 1);
  if (error) throw new Error(`Failed to list declarations: ${error.message}`);
  return {
    data: (data ?? []) as TenantRow[],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  };
}

export interface CeilingOverride {
  perTx?: number | null;
  daily?: number | null;
  monthly?: number | null;
  disabled?: boolean;
}

/**
 * Admin review transition. `target` is the new status; `approve`/`deny`/
 * `suspend` are mapped by the route. Optionally applies a per-tenant ceiling
 * override at the same time.
 */
export async function reviewProductionAccess(
  supabase: SupabaseClient,
  tenantId: string,
  target: 'production_approved' | 'production_denied' | 'production_suspended',
  reviewer: string,
  notes: string | null,
  ceilingOverride?: CeilingOverride
): Promise<{ status: ProductionAccessStatus }> {
  const tenant = await fetchTenant(supabase, tenantId);

  // Guard the few transitions that don't make sense.
  if (target === 'production_suspended' && tenant.production_access_status !== 'production_approved') {
    throw new ForbiddenError('Only an approved tenant can be suspended.');
  }
  if (
    target === 'production_approved' &&
    !['declaration_pending', 'production_suspended'].includes(tenant.production_access_status)
  ) {
    throw new ForbiddenError(
      'Tenant must have a pending declaration (or be suspended) to be approved.'
    );
  }

  const update: Record<string, unknown> = {
    production_access_status: target,
    production_reviewed_at: new Date().toISOString(),
    production_reviewed_by: reviewer,
    production_review_notes: notes,
  };
  if (target === 'production_approved') update.kya_tier = 1;
  if (ceilingOverride) {
    if ('perTx' in ceilingOverride) update.beta_ceiling_per_tx = ceilingOverride.perTx;
    if ('daily' in ceilingOverride) update.beta_ceiling_daily = ceilingOverride.daily;
    if ('monthly' in ceilingOverride) update.beta_ceiling_monthly = ceilingOverride.monthly;
    if ('disabled' in ceilingOverride) update.beta_ceiling_disabled = ceilingOverride.disabled;
  }

  const { error } = await (supabase.from('tenants') as any)
    .update(update)
    .eq('id', tenantId);
  if (error) throw new Error(`Failed to update production access: ${error.message}`);

  // Invalidate any cached auth contexts for this tenant immediately so a
  // suspend/deny takes effect now, not at the ~60s cache TTL.
  bumpProductionEpoch(tenantId);

  await logAudit(supabase, {
    tenantId,
    entityType: 'tenant',
    entityId: tenantId,
    action:
      target === 'production_approved'
        ? 'production_approved'
        : target === 'production_denied'
          ? 'production_denied'
          : 'production_suspended',
    actorType: 'system',
    actorId: null,
    actorName: reviewer,
    changes: {
      before: { production_access_status: tenant.production_access_status },
      after: { production_access_status: target },
    },
    metadata: notes ? { notes } : undefined,
  });

  return { status: target };
}

/** Admin: adjust the per-tenant ceiling without changing access status. */
export async function setBetaCeiling(
  supabase: SupabaseClient,
  tenantId: string,
  reviewer: string,
  override: CeilingOverride
): Promise<void> {
  await fetchTenant(supabase, tenantId);
  const update: Record<string, unknown> = {};
  if ('perTx' in override) update.beta_ceiling_per_tx = override.perTx;
  if ('daily' in override) update.beta_ceiling_daily = override.daily;
  if ('monthly' in override) update.beta_ceiling_monthly = override.monthly;
  if ('disabled' in override) update.beta_ceiling_disabled = override.disabled;
  if (Object.keys(update).length === 0) return;

  const { error } = await (supabase.from('tenants') as any)
    .update(update)
    .eq('id', tenantId);
  if (error) throw new Error(`Failed to set beta ceiling: ${error.message}`);

  // Ceiling overrides are read on the cached path too — force re-resolve.
  bumpProductionEpoch(tenantId);

  await logAudit(supabase, {
    tenantId,
    entityType: 'tenant',
    entityId: tenantId,
    action: 'beta_ceiling_updated',
    actorType: 'system',
    actorId: null,
    actorName: reviewer,
    changes: { after: update },
  });
}
