import { describe, it, expect, beforeEach } from 'vitest';
import {
  getProductionEpoch,
  bumpProductionEpoch,
  __resetProductionEpochs,
} from '../../src/services/production-access-epoch.js';
import { isEmailVerified, isEmailVerificationRequired } from '../../src/utils/auth.js';

describe('production-access epoch (cache invalidation)', () => {
  beforeEach(() => __resetProductionEpochs());

  it('starts at 0 and advances monotonically per tenant', () => {
    expect(getProductionEpoch('t1')).toBe(0);
    bumpProductionEpoch('t1');
    expect(getProductionEpoch('t1')).toBe(1);
    bumpProductionEpoch('t1');
    expect(getProductionEpoch('t1')).toBe(2);
  });

  it('isolates tenants', () => {
    bumpProductionEpoch('a');
    expect(getProductionEpoch('a')).toBe(1);
    expect(getProductionEpoch('b')).toBe(0);
  });

  it('a cached epoch mismatch (the auth cache-hit check) detects a change', () => {
    const cachedEpoch = getProductionEpoch('t1'); // 0, stamped into ctx
    bumpProductionEpoch('t1'); // admin suspend/deny/approve/ceiling change
    expect(cachedEpoch === getProductionEpoch('t1')).toBe(false); // → cache miss
  });
});

describe('isEmailVerified / isEmailVerificationRequired', () => {
  it('treats email_confirmed_at or confirmed_at as verified', () => {
    expect(isEmailVerified({ email_confirmed_at: '2026-01-01T00:00:00Z' })).toBe(true);
    expect(isEmailVerified({ confirmed_at: '2026-01-01T00:00:00Z' })).toBe(true);
  });

  it('treats missing/empty timestamps as NOT verified', () => {
    expect(isEmailVerified({})).toBe(false);
    expect(isEmailVerified(null)).toBe(false);
    expect(isEmailVerified({ email_confirmed_at: null, confirmed_at: '' })).toBe(false);
  });

  it('isEmailVerificationRequired follows the env flag', () => {
    const prev = process.env.REQUIRE_EMAIL_VERIFICATION;
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    expect(isEmailVerificationRequired()).toBe(true);
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    expect(isEmailVerificationRequired()).toBe(false);
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
    expect(isEmailVerificationRequired()).toBe(false);
    if (prev !== undefined) process.env.REQUIRE_EMAIL_VERIFICATION = prev;
  });
});
