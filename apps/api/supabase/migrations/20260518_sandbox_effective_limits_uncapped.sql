-- ============================================================================
-- Migration: sandbox_effective_limits_uncapped (Open Beta Hardening — 6c fix)
--
-- The BEFORE INSERT/UPDATE trigger calculate_agent_effective_limits() caps an
-- agent's effective_limit_* to LEAST(kya_tier_limits, parent account
-- verification_tier_limits). A freshly onboarded sandbox account is
-- verification_tier 0 (whose verification_tier_limits are $0), so an
-- auto-T1 sandbox agent gets effective limits of 0 and CANNOT transact —
-- the exact "first agent payment is blocked in sandbox" bug.
--
-- Fix (matches the open-beta philosophy: frictionless sandbox, real cap in
-- live): when NEW.environment = 'test', the agent's effective limits are its
-- KYA tier limits with NO parent cap. In 'live' the existing
-- MIN(kya, parent verification tier) behaviour is preserved unchanged, so
-- production money movement still respects the parent account's KYC tier
-- (and the separate strict per-tenant beta ceiling in LimitService).
--
-- Only the no-arg trigger function is replaced; the overloaded
-- calculate_agent_effective_limits(p_agent_id uuid) reporting function is
-- left untouched.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_agent_effective_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_parent_tier INTEGER;
  v_parent_type TEXT;
  v_agent_limits RECORD;
  v_parent_limits RECORD;
BEGIN
  SELECT verification_tier, type INTO v_parent_tier, v_parent_type
  FROM public.accounts WHERE id = NEW.parent_account_id;

  -- KYA tier: tenant-specific row preferred, platform NULL-tenant row fallback.
  SELECT per_transaction, daily, monthly INTO v_agent_limits
  FROM public.kya_tier_limits
  WHERE tier = NEW.kya_tier
    AND (tenant_id = NEW.tenant_id OR tenant_id IS NULL)
  ORDER BY (tenant_id IS NULL)
  LIMIT 1;

  -- Verification tier: same pattern, also honoring entity_type when present.
  SELECT per_transaction, daily, monthly INTO v_parent_limits
  FROM public.verification_tier_limits
  WHERE tier = COALESCE(v_parent_tier, 0)
    AND (tenant_id = NEW.tenant_id OR tenant_id IS NULL)
    AND (
      entity_type = v_parent_type
      OR entity_type IS NULL
    )
  ORDER BY
    (tenant_id IS NULL),
    (entity_type IS NULL)
  LIMIT 1;

  NEW.limit_per_transaction := COALESCE(v_agent_limits.per_transaction, 0);
  NEW.limit_daily            := COALESCE(v_agent_limits.daily, 0);
  NEW.limit_monthly          := COALESCE(v_agent_limits.monthly, 0);

  IF NEW.environment = 'test' THEN
    -- Open beta: sandbox is frictionless — the agent's KYA tier limits apply
    -- directly with NO parent-account cap, so a freshly onboarded tenant can
    -- make its first agent payment immediately. The strict per-tenant beta
    -- ceiling (LimitService) is LIVE-only, so sandbox stays unthrottled.
    NEW.effective_limit_per_tx := COALESCE(v_agent_limits.per_transaction, 0);
    NEW.effective_limit_daily   := COALESCE(v_agent_limits.daily, 0);
    NEW.effective_limit_monthly := COALESCE(v_agent_limits.monthly, 0);
    NEW.effective_limits_capped := false;
    RETURN NEW;
  END IF;

  -- LIVE: unchanged — effective = MIN(kya, parent verification tier).
  NEW.effective_limit_per_tx := LEAST(
    COALESCE(v_agent_limits.per_transaction, 0),
    COALESCE(v_parent_limits.per_transaction, 0)
  );
  NEW.effective_limit_daily := LEAST(
    COALESCE(v_agent_limits.daily, 0),
    COALESCE(v_parent_limits.daily, 0)
  );
  NEW.effective_limit_monthly := LEAST(
    COALESCE(v_agent_limits.monthly, 0),
    COALESCE(v_parent_limits.monthly, 0)
  );

  NEW.effective_limits_capped := (
    COALESCE(v_agent_limits.per_transaction, 0) > COALESCE(v_parent_limits.per_transaction, 0) OR
    COALESCE(v_agent_limits.daily, 0) > COALESCE(v_parent_limits.daily, 0) OR
    COALESCE(v_agent_limits.monthly, 0) > COALESCE(v_parent_limits.monthly, 0)
  );

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  RAISE NOTICE '✅ calculate_agent_effective_limits(): sandbox (test env) agents are now uncapped at their KYA tier; live behaviour unchanged';
END $$;
