import { describe, it, expect } from 'vitest';
import { isProductionApproved } from '../../src/services/tenant-production-access.js';

describe('isProductionApproved', () => {
  it('is true only for production_approved', () => {
    expect(isProductionApproved('production_approved')).toBe(true);
  });

  it('is false for every other (or missing) state', () => {
    for (const s of [
      'sandbox_only',
      'declaration_pending',
      'production_denied',
      'production_suspended',
      undefined,
      null,
      '',
    ]) {
      expect(isProductionApproved(s as any)).toBe(false);
    }
  });
});
