/**
 * Epic 72 — Integration Tests: Agent Key-Pair Auth
 *
 * Requires: INTEGRATION=true, running Sly API at localhost:4000,
 * and valid Supabase credentials.
 *
 * Tests the full Ed25519 challenge-response lifecycle:
 *   1. Create agent with auto-generated key pair
 *   2. Challenge-response → session token
 *   3. Session token on authenticated endpoints
 *   4. Replay protection
 *   5. Wrong signature rejection
 *   6. Liveness check
 *   7. Key rotation (signed proof-of-ownership)
 *   8. Session revocation after rotation
 *   9. Re-authenticate with rotated key
 *   10. Key revocation (kill-switch)
 *   11. Fresh key provisioning after revocation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// Configure ed25519 for RFC 8032
ed25519.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed25519.etc.concatBytes(...m));

const API = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.API_KEY || 'pk_test_demo_fintech_key_12345';

async function sign(message: string, privateKeyB64: string): Promise<string> {
  const msgBytes = new TextEncoder().encode(message);
  const keyBytes = Buffer.from(privateKeyB64, 'base64');
  const sig = await ed25519.signAsync(msgBytes, keyBytes);
  return Buffer.from(sig).toString('base64');
}

function unwrap(body: any): any {
  return body?.data ?? body;
}

describe('Epic 72: Agent Key-Pair Auth (Integration)', () => {
  let accountId: string;
  let agentId: string;
  let agentToken: string;
  let privateKey: string;
  let sessToken: string;

  beforeAll(async () => {
    // Find a business account
    const res = await fetch(`${API}/v1/accounts?type=business&limit=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const body = await res.json() as any;
    accountId = unwrap(body)?.[0]?.id;
    if (!accountId) throw new Error('No business account found — run seed:db first');
  });

  it('creates agent with auto-generated Ed25519 keypair', async () => {
    const res = await fetch(`${API}/v1/agents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Epic72-Integration-' + Date.now(),
        description: 'Integration test',
        accountId,
        auto_create_wallet: false,
        generate_keypair: true,
      }),
    });
    expect(res.status).toBe(201);

    const data = unwrap(await res.json());
    expect(data.credentials?.token).toBeTruthy();
    expect(data.authKey?.privateKey).toBeTruthy();
    expect(data.authKey?.publicKey).toBeTruthy();
    expect(data.authKey?.algorithm).toBe('ed25519');
    expect(data.authKey?.keyId).toMatch(/^auth_/);

    agentId = data.data?.id ?? data.id;
    agentToken = data.credentials.token;
    privateKey = data.authKey.privateKey;
  });

  it('issues challenge nonce', async () => {
    const res = await fetch(`${API}/v1/agents/${agentId}/challenge`, { method: 'POST' });
    expect(res.status).toBe(200);

    const data = unwrap(await res.json());
    expect(data.challenge).toMatch(/^challenge_/);
    expect(data.algorithm).toBe('ed25519');
    expect(data.expiresIn).toBe(60);
  });

  it('authenticates via challenge-response → sess_* token', async () => {
    const chalRes = await fetch(`${API}/v1/agents/${agentId}/challenge`, { method: 'POST' });
    const nonce = unwrap(await chalRes.json()).challenge;
    const signature = await sign(nonce, privateKey);

    const res = await fetch(`${API}/v1/agents/${agentId}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, signature }),
    });
    expect(res.status).toBe(200);

    const data = unwrap(await res.json());
    expect(data.sessionToken).toMatch(/^sess_/);
    expect(data.expiresIn).toBe(3600);
    expect(data.agentId).toBe(agentId);

    sessToken = data.sessionToken;
  });

  it('uses sess_* token on authenticated endpoints', async () => {
    const listRes = await fetch(`${API}/v1/agents?limit=1`, {
      headers: { Authorization: `Bearer ${sessToken}` },
    });
    expect(listRes.status).toBe(200);

    const selfRes = await fetch(`${API}/v1/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${sessToken}` },
    });
    expect(selfRes.status).toBe(200);
    const selfData = unwrap(await selfRes.json());
    expect(selfData.id).toBe(agentId);
  });

  it('old agent_* bearer token still works (additive)', async () => {
    const res = await fetch(`${API}/v1/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    expect(res.status).toBe(200);
  });

  it('rejects replay of consumed challenge', async () => {
    // Get + consume a challenge
    const chalRes = await fetch(`${API}/v1/agents/${agentId}/challenge`, { method: 'POST' });
    const nonce = unwrap(await chalRes.json()).challenge;
    const sig = await sign(nonce, privateKey);

    // First use — succeeds
    const r1 = await fetch(`${API}/v1/agents/${agentId}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, signature: sig }),
    });
    expect(r1.status).toBe(200);

    // Replay — should fail
    const r2 = await fetch(`${API}/v1/agents/${agentId}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, signature: sig }),
    });
    expect(r2.status).toBe(401);
  });

  it('rejects wrong signature', async () => {
    const chalRes = await fetch(`${API}/v1/agents/${agentId}/challenge`, { method: 'POST' });
    const nonce = unwrap(await chalRes.json()).challenge;
    const wrongSig = await sign('completely-wrong-message', privateKey);

    const res = await fetch(`${API}/v1/agents/${agentId}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, signature: wrongSig }),
    });
    expect(res.status).toBe(401);
  });

  it('returns liveness status', async () => {
    const res = await fetch(`${API}/v1/agents/${agentId}/liveness`, {
      headers: { Authorization: `Bearer ${sessToken}` },
    });
    expect(res.status).toBe(200);
    const data = unwrap(await res.json());
    expect(typeof data.connected).toBe('boolean');
  });

  it('includes liveness in GET /v1/agents/:id response', async () => {
    const res = await fetch(`${API}/v1/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    expect(res.status).toBe(200);
    const data = unwrap(await res.json());
    expect(data.liveness).toBeDefined();
    expect(typeof data.liveness.connected).toBe('boolean');
  });

  it('rotates key with signed proof-of-ownership', async () => {
    const proof = await sign(`rotate:${agentId}`, privateKey);
    const res = await fetch(`${API}/v1/agents/${agentId}/auth-keys/rotate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof }),
    });
    expect(res.status).toBe(200);

    const data = unwrap(await res.json());
    expect(data.rotated).toBe(true);
    expect(data.previousKeyRevoked).toBe(true);
    expect(data.sessionsRevoked).toBeGreaterThanOrEqual(1);
    expect(data.privateKey).toBeTruthy();

    privateKey = data.privateKey; // Update for subsequent tests
  });

  it('rejects old session after key rotation', async () => {
    const res = await fetch(`${API}/v1/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${sessToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('re-authenticates with rotated key', async () => {
    const chalRes = await fetch(`${API}/v1/agents/${agentId}/challenge`, { method: 'POST' });
    const nonce = unwrap(await chalRes.json()).challenge;
    const sig = await sign(nonce, privateKey);

    const res = await fetch(`${API}/v1/agents/${agentId}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, signature: sig }),
    });
    expect(res.status).toBe(200);

    const data = unwrap(await res.json());
    sessToken = data.sessionToken;

    // Verify new session works
    const verifyRes = await fetch(`${API}/v1/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${sessToken}` },
    });
    expect(verifyRes.status).toBe(200);
  });

  it('revokes key and kills all sessions', async () => {
    const res = await fetch(`${API}/v1/agents/${agentId}/auth-keys`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    expect(res.status).toBe(200);

    const data = unwrap(await res.json());
    expect(data.keysRevoked).toBeGreaterThanOrEqual(1);
    expect(data.sessionsRevoked).toBeGreaterThanOrEqual(1);

    // Session should be dead
    const deadRes = await fetch(`${API}/v1/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${sessToken}` },
    });
    expect(deadRes.status).toBe(401);

    // Challenge should fail (no active key)
    const chalRes = await fetch(`${API}/v1/agents/${agentId}/challenge`, { method: 'POST' });
    expect(chalRes.status).toBe(400);
  });

  it('provisions fresh key after revocation and completes full round-trip', async () => {
    const provRes = await fetch(`${API}/v1/agents/${agentId}/auth-keys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    expect(provRes.status).toBe(200);
    const provData = unwrap(await provRes.json());
    expect(provData.created).toBe(true);
    expect(provData.privateKey).toBeTruthy();

    // Full round-trip
    const chalRes = await fetch(`${API}/v1/agents/${agentId}/challenge`, { method: 'POST' });
    const nonce = unwrap(await chalRes.json()).challenge;
    const sig = await sign(nonce, provData.privateKey);

    const authRes = await fetch(`${API}/v1/agents/${agentId}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, signature: sig }),
    });
    expect(authRes.status).toBe(200);
  });
});
