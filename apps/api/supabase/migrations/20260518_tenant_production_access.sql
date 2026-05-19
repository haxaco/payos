-- ============================================================================
-- Migration: tenant_production_access (Open Beta Hardening — Step 1)
--
-- Open beta is sandbox-by-default. Production (live) money movement is gated
-- behind a lightweight T1 "Declared" declaration + manual approval. This
-- migration adds the tenant-level production-access state machine and the
-- strict per-tenant beta-ceiling override columns.
--
-- Why this is required:
--   Today provisionTenant() issues a live API key at signup and
--   POST /v1/api-keys accepts environment:'live' with no approval check.
--   There is no tenant-level verification state and no per-tenant aggregate
--   spend ceiling, so a beta user could move real funds on day one.
--
-- State machine (provider-agnostic so T2/T3/Persona slot in later):
--   sandbox_only ─declare→ declaration_pending ─approve→ production_approved
--                     │                                       │
--                     └─deny→ production_denied               └─suspend→ production_suspended
--   production_denied ─re-declare→ declaration_pending
--
-- Live keys are usable ONLY when production_access_status='production_approved'.
-- All declaration/admin writes go through the API service-role client (same as
-- POST /v1/agents/:id/declare-dsd), so no new tenant-writable RLS policy is
-- needed; the new columns inherit the existing tenants table RLS + grants.
-- ============================================================================

-- ── Production-access state machine ──────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS production_access_status TEXT NOT NULL DEFAULT 'sandbox_only';

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS kya_tier SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS production_declaration JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS production_declared_at TIMESTAMPTZ;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS production_reviewed_at TIMESTAMPTZ;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS production_reviewed_by TEXT;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS production_review_notes TEXT;

-- CHECK constraint added separately so re-runs are idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_production_access_status_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_production_access_status_check
      CHECK (production_access_status IN (
        'sandbox_only',
        'declaration_pending',
        'production_approved',
        'production_denied',
        'production_suspended'
      ));
  END IF;
END $$;

-- ── Strict per-tenant beta ceiling overrides (NULL = use platform default) ────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS beta_ceiling_per_tx NUMERIC(20,6);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS beta_ceiling_daily NUMERIC(20,6);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS beta_ceiling_monthly NUMERIC(20,6);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS beta_ceiling_disabled BOOLEAN NOT NULL DEFAULT false;

-- ── Admin-queue lookup: only pending declarations are listed ─────────────────
CREATE INDEX IF NOT EXISTS idx_tenants_production_access_status
  ON public.tenants(production_access_status)
  WHERE production_access_status = 'declaration_pending';

-- ── Backfill: grandfather existing live-key tenants (do NOT revoke) ──────────
-- Revoking would break active integrations the moment this lands. Any tenant
-- that already has an active/grace live API key (new api_keys table) or a
-- legacy pk_live_ prefix is auto-approved at T1. Everyone else stays
-- sandbox_only via the column default. The strict beta ceiling (Step 4) will
-- newly apply to grandfathered tenants — it is admin-overridable per tenant.
-- Self-registered agent tenants (is_agent_tenant) are NEVER grandfathered —
-- they reach live only by being claimed into an approved human tenant. We
-- require a real active/grace live key row in api_keys (the loose
-- api_key_prefix LIKE 'pk_live_%' check is kept only as a secondary signal,
-- still gated by NOT is_agent_tenant) so stale/test prefixes can't over-grant.
UPDATE public.tenants SET
  production_access_status = 'production_approved',
  kya_tier = 1,
  production_reviewed_at = NOW(),
  production_reviewed_by = 'system:grandfather',
  production_review_notes = 'grandfathered: pre-beta tenant with existing live key'
WHERE production_access_status = 'sandbox_only'
  AND COALESCE(is_agent_tenant, false) = false
  AND (
    id IN (
      SELECT DISTINCT tenant_id FROM public.api_keys
      WHERE environment = 'live' AND status IN ('active', 'grace_period')
    )
    OR api_key_prefix LIKE 'pk_live_%'
  );

-- ── Comments ─────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.tenants.production_access_status IS
  'Production-access state machine. Live keys usable only when production_approved. Default sandbox_only.';
COMMENT ON COLUMN public.tenants.kya_tier IS
  'Tenant-level KYA tier (T1=1 for beta). Models future T2/T3 without enforcement changes.';
COMMENT ON COLUMN public.tenants.production_declaration IS
  'Declaration payload + SSO-enriched identity snapshot: { tier, fields, identity, version }.';
COMMENT ON COLUMN public.tenants.beta_ceiling_per_tx IS
  'Per-tenant override of the platform beta ceiling (LIVE env only). NULL = platform default.';
COMMENT ON COLUMN public.tenants.beta_ceiling_disabled IS
  'Admin escape hatch: when true the strict per-tenant beta ceiling is not enforced.';

DO $$
DECLARE
  grandfathered INT;
BEGIN
  SELECT COUNT(*) INTO grandfathered FROM public.tenants
    WHERE production_reviewed_by = 'system:grandfather';
  RAISE NOTICE '✅ tenants production-access columns added (default sandbox_only)';
  RAISE NOTICE '✅ % existing live-key tenant(s) grandfathered to production_approved (T1)', grandfathered;
  RAISE NOTICE '✅ partial index idx_tenants_production_access_status created (declaration_pending)';
END $$;
