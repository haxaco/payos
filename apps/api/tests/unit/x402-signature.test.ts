/**
 * x402 EIP-712 signature verification tests (open-beta hardening Step 7).
 *
 * Exercises `validateSignature(authorization, expectedAddress, environment)`
 * from src/routes/x402-payments.ts. We sign with viem using the EXACT
 * EIP-712 domain/types/message the production path recovers against, so a
 * correctly-signed payload recovers to the signer's address.
 *
 * Two fixed anvil test keys give deterministic addresses: KEY_A is the
 * "paying wallet", KEY_B is an unrelated signer for the mismatch case.
 */
import { describe, it, expect } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { validateSignature } from '../../src/routes/x402-payments.js';

// Well-known anvil test keys → deterministic addresses.
const KEY_A =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
const KEY_B =
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;

const accountA = privateKeyToAccount(KEY_A);
const accountB = privateKeyToAccount(KEY_B);

// Must mirror X402_EIP712_DOMAIN / X402_EIP712_TYPES in x402-payments.ts.
const DOMAIN = { name: 'SlyX402Payment', version: '1' } as const;
const TYPES = {
  Payment: [
    { name: 'endpointId', type: 'string' },
    { name: 'requestId', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'currency', type: 'string' },
    { name: 'walletId', type: 'string' },
    { name: 'method', type: 'string' },
    { name: 'path', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const;

const baseAuthorization = {
  endpointId: 'ep_test_123',
  requestId: 'req_abc_456',
  amount: '1.50',
  currency: 'USDC',
  walletId: 'wal_test_789',
  method: 'POST',
  path: '/v1/x402/something',
  timestamp: 1716000000,
};

/**
 * Produce a signature over `auth` using the exact message-shaping the
 * production verifier applies (String() on all string fields, BigInt on
 * timestamp) so a matching signer recovers correctly.
 */
async function signAuth(
  account: typeof accountA,
  auth: typeof baseAuthorization
): Promise<`0x${string}`> {
  return account.signTypedData({
    domain: DOMAIN,
    types: TYPES,
    primaryType: 'Payment',
    message: {
      endpointId: String(auth.endpointId),
      requestId: String(auth.requestId),
      amount: String(auth.amount),
      currency: String(auth.currency),
      walletId: String(auth.walletId),
      method: String(auth.method),
      path: String(auth.path),
      timestamp: BigInt(auth.timestamp),
    },
  });
}

describe('validateSignature (x402 EIP-712 hardening)', () => {
  it('test env → valid even with no signature', async () => {
    const res = await validateSignature(
      { ...baseAuthorization },
      accountA.address,
      'test'
    );
    expect(res).toEqual({ valid: true });
  });

  it('live + expectedAddress null → valid (internal/ledger wallet)', async () => {
    const res = await validateSignature(
      { ...baseAuthorization },
      null,
      'live'
    );
    expect(res).toEqual({ valid: true });
  });

  it('live + non-0x internal address → valid (internal/ledger wallet)', async () => {
    const res = await validateSignature(
      { ...baseAuthorization },
      'internal://wallet/wal_test_789',
      'live'
    );
    expect(res).toEqual({ valid: true });
  });

  it('live + on-chain address + missing signature → invalid (signature_required)', async () => {
    const res = await validateSignature(
      { ...baseAuthorization },
      accountA.address,
      'live'
    );
    expect(res).toEqual({ valid: false, reason: 'signature_required' });
  });

  it('live + on-chain address + valid signature from same key → valid', async () => {
    const signature = await signAuth(accountA, baseAuthorization);
    const res = await validateSignature(
      { ...baseAuthorization, signature },
      accountA.address,
      'live'
    );
    expect(res).toEqual({ valid: true });
  });

  it('live + on-chain address + signature from a different key → invalid (signer_mismatch)', async () => {
    const signature = await signAuth(accountB, baseAuthorization);
    const res = await validateSignature(
      { ...baseAuthorization, signature },
      accountA.address,
      'live'
    );
    expect(res).toEqual({ valid: false, reason: 'signer_mismatch' });
  });

  it('live + on-chain address + garbage signature → invalid (invalid_signature)', async () => {
    const res = await validateSignature(
      { ...baseAuthorization, signature: '0xdeadbeef' },
      accountA.address,
      'live'
    );
    expect(res).toEqual({ valid: false, reason: 'invalid_signature' });
  });
});
