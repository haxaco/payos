import { describe, it, expect } from 'vitest';
import { resolveBetaCeiling, BETA_CEILING } from '../../src/config/beta-ceilings.js';

describe('resolveBetaCeiling', () => {
  it('falls back to the platform default when no overrides are set', () => {
    const r = resolveBetaCeiling(null);
    expect(r.perTx).toBe(BETA_CEILING.perTx);
    expect(r.daily).toBe(BETA_CEILING.daily);
    expect(r.monthly).toBe(BETA_CEILING.monthly);
    expect(r.disabled).toBe(false);
    expect(r.source).toBe('platform_default');
  });

  it('applies per-tenant overrides and reports source=override', () => {
    const r = resolveBetaCeiling({
      beta_ceiling_per_tx: 1000,
      beta_ceiling_daily: null,
      beta_ceiling_monthly: null,
      beta_ceiling_disabled: false,
    });
    expect(r.perTx).toBe(1000);
    expect(r.daily).toBe(BETA_CEILING.daily); // null → default
    expect(r.source).toBe('override');
  });

  it('treats beta_ceiling_disabled=true as an override that lifts the cap', () => {
    const r = resolveBetaCeiling({
      beta_ceiling_per_tx: null,
      beta_ceiling_daily: null,
      beta_ceiling_monthly: null,
      beta_ceiling_disabled: true,
    });
    expect(r.disabled).toBe(true);
    expect(r.source).toBe('override');
  });
});
