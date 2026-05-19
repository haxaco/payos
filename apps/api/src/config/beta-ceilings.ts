/**
 * Strict per-tenant beta spend ceiling (Open Beta Hardening — Step 4).
 *
 * During the open beta, even a production-approved tenant is capped at a
 * conservative platform-wide aggregate (≈ KYA T1) across ALL of its agents,
 * independent of per-agent KYA tier, to bound blast radius. The ceiling is
 * enforced ONLY in the `live` environment — sandbox/test (and the marketplace
 * simulation) run unthrottled so agent onboarding and testing stay fast.
 *
 * Amounts are USDC. Per-tenant overrides live on the `tenants` table
 * (`beta_ceiling_*`, `beta_ceiling_disabled`); NULL columns fall back to the
 * platform default below. Admins raise these per tenant as trust builds.
 */
export const BETA_CEILING = {
  perTx: 100,
  daily: 500,
  monthly: 2000,
} as const;

export interface BetaCeilingColumns {
  beta_ceiling_per_tx: number | null;
  beta_ceiling_daily: number | null;
  beta_ceiling_monthly: number | null;
  beta_ceiling_disabled: boolean | null;
}

export interface ResolvedBetaCeiling {
  perTx: number;
  daily: number;
  monthly: number;
  disabled: boolean;
  /** 'override' if any column was set on the tenant, else 'platform_default'. */
  source: 'platform_default' | 'override';
}

/**
 * Resolve the effective ceiling for a tenant row. Pure — no I/O. Safe to call
 * with a partial row (missing columns treated as NULL → platform default).
 */
export function resolveBetaCeiling(
  t: Partial<BetaCeilingColumns> | null | undefined
): ResolvedBetaCeiling {
  const perTx = t?.beta_ceiling_per_tx ?? null;
  const daily = t?.beta_ceiling_daily ?? null;
  const monthly = t?.beta_ceiling_monthly ?? null;
  const disabled = t?.beta_ceiling_disabled === true;
  const hasOverride =
    perTx !== null || daily !== null || monthly !== null || disabled;
  return {
    perTx: perTx ?? BETA_CEILING.perTx,
    daily: daily ?? BETA_CEILING.daily,
    monthly: monthly ?? BETA_CEILING.monthly,
    disabled,
    source: hasOverride ? 'override' : 'platform_default',
  };
}
