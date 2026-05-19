import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkFaucetDailyCap,
  __resetFaucetCaps,
  FAUCET_DAILY_CAP_USDC,
} from '../../src/services/faucet-cap.js';

describe('checkFaucetDailyCap', () => {
  beforeEach(() => __resetFaucetCaps());

  it('allows requests under the cap and accumulates per tenant', () => {
    expect(checkFaucetDailyCap('t1', 100).allowed).toBe(true);
    const r = checkFaucetDailyCap('t1', 100);
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(200);
  });

  it('blocks the request that would exceed the cap (and does not consume it)', () => {
    expect(checkFaucetDailyCap('t1', FAUCET_DAILY_CAP_USDC).allowed).toBe(true);
    const over = checkFaucetDailyCap('t1', 1);
    expect(over.allowed).toBe(false);
    expect(over.used).toBe(FAUCET_DAILY_CAP_USDC); // unchanged
  });

  it('isolates tenants from each other', () => {
    checkFaucetDailyCap('a', FAUCET_DAILY_CAP_USDC);
    expect(checkFaucetDailyCap('b', 50).allowed).toBe(true);
  });

  it('honours a custom cap argument', () => {
    expect(checkFaucetDailyCap('t1', 10, 5).allowed).toBe(false);
  });
});
