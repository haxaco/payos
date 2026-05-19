/**
 * Per-tenant daily sandbox faucet/test-fund cap (Open Beta Hardening — Step 6e).
 *
 * A beta tenant must not be able to mint unlimited sandbox USDC (via
 * /v1/wallets/:id/test-fund or the agent refill faucet). This is an in-memory
 * counter keyed by tenant + UTC date — acceptable for the single-instance beta
 * deploy (same trade-off as the in-memory rate limiter). It resets at UTC
 * midnight and on process restart; that is intentional and sufficient here.
 */

export const FAUCET_DAILY_CAP_USDC = 50_000;

interface Bucket {
  date: string; // UTC YYYY-MM-DD
  total: number;
}

const buckets = new Map<string, Bucket>();

function utcDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface FaucetCapResult {
  allowed: boolean;
  used: number;
  cap: number;
}

/**
 * Reserve `amount` against the tenant's daily cap. Returns allowed=false (and
 * does NOT consume) when the request would exceed the cap.
 */
export function checkFaucetDailyCap(
  tenantId: string,
  amount: number,
  cap: number = FAUCET_DAILY_CAP_USDC
): FaucetCapResult {
  const today = utcDate();
  const existing = buckets.get(tenantId);
  const used = existing && existing.date === today ? existing.total : 0;

  if (used + amount > cap) {
    return { allowed: false, used, cap };
  }

  buckets.set(tenantId, { date: today, total: used + amount });
  return { allowed: true, used: used + amount, cap };
}

/** Test seam — clears all buckets. */
export function __resetFaucetCaps(): void {
  buckets.clear();
}
