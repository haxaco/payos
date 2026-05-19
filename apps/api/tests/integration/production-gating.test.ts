import { describe, it, expect } from 'vitest';
import { TEST_API_KEY } from '../setup.js';

// Open beta hardening — production gating end-to-end.
// Requires a running API + DB with the 20260518_tenant_production_access
// migration applied. Run with: INTEGRATION=true pnpm test
//
// IMPORTANT: the API wraps every response via response-wrapper middleware:
//   success → { success: true, data: <payload>, meta: {...} }
//   error   → { success: false, error: { code, ... } }
// Assertions read body.data.* / body.error.code accordingly.
//
// TEST_API_KEY's tenant state is DB-dependent: a fresh sandbox tenant is
// `sandbox_only`, but a grandfathered pre-beta tenant is backfilled to
// `production_approved`. Assertions tolerate any valid state rather than
// assuming one. The api-keys creation endpoint requires a JWT user session
// (not an API-key actor), so the Step-3a live-key gate is unreachable from
// this fixture — see the note on that test below.

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Production gating', () => {
  const jsonHeaders = {
    Authorization: `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  async function getProductionStatus(): Promise<{
    status: string;
    ceiling: unknown;
  }> {
    const res = await fetch(`${BASE_URL}/v1/tenants/production-status`, {
      headers: jsonHeaders,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    return body.data;
  }

  it('exposes a well-formed production-status (envelope-aware)', async () => {
    const data = await getProductionStatus();
    expect([
      'sandbox_only',
      'declaration_pending',
      'production_approved',
      'production_denied',
      'production_suspended',
    ]).toContain(data.status);
    expect(data.ceiling).toBeDefined();
  });

  // NOTE: POST /v1/api-keys authenticates via supabase.auth.getUser() — it
  // requires a JWT *user session*, NOT a pk_* API-key actor. The Step-3a
  // live-key production gate therefore sits BEHIND a user-session auth wall
  // and is unreachable from an API-key fixture. The original version of this
  // test wrongly expected a 403 production-gate rejection here; the real
  // behavior for an API-key actor is a 401 at the auth layer (you cannot mint
  // any key — live or test — without a real owner session). That auth wall is
  // itself a meaningful guarantee, so we assert it. The live-key gate proper
  // is covered at the unit level and via the declared-flow path.
  it('rejects API-key actors from the key-creation endpoint (JWT-session only)', async () => {
    for (const environment of ['live', 'test'] as const) {
      const res = await fetch(`${BASE_URL}/v1/api-keys`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name: `prod-gating-${environment}-probe`, environment }),
      });
      expect(res.status).toBe(401);
    }
  });

  it('rejects declare-production from a non-owner (API key) actor', async () => {
    const res = await fetch(`${BASE_URL}/v1/tenants/declare-production`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        intended_use_case: 'x'.repeat(25),
        accepted_terms: true,
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBeDefined();
  });
});
