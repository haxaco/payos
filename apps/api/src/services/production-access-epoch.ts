/**
 * Per-tenant production-access epoch (Open Beta Hardening — cache coherence).
 *
 * The auth middleware caches resolved JWT/agent contexts (incl. the tenant's
 * production-approval state) for ~60s. Without invalidation, an admin
 * suspend/deny would not take effect until the cache TTL expired — a tenant
 * could keep live access for up to a minute after being suspended.
 *
 * This is an in-memory monotonic counter per tenant. Admin transitions bump
 * it; the auth cache stores the epoch it resolved against and treats a cached
 * entry as stale the moment the epoch advances — giving immediate effect on
 * the single-instance beta deploy. (Multi-instance would need a shared store;
 * that is the documented, accepted limitation for the single-instance beta.)
 */

const epochs = new Map<string, number>();

/** Current epoch for a tenant (0 if never bumped). */
export function getProductionEpoch(tenantId: string): number {
  return epochs.get(tenantId) ?? 0;
}

/** Advance the tenant's epoch — call after any production-access mutation. */
export function bumpProductionEpoch(tenantId: string): void {
  epochs.set(tenantId, (epochs.get(tenantId) ?? 0) + 1);
}

/** Test seam. */
export function __resetProductionEpochs(): void {
  epochs.clear();
}
