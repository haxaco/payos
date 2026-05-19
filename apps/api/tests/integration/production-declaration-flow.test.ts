import { describe, it, expect } from 'vitest';
import { TEST_API_KEY } from '../setup.js';

// Open-beta hardening — production declaration gating.
//
// Requires a running API + dev DB with the 20260518_tenant_production_access
// migration applied. Run with:
//   INTEGRATION=true pnpm --filter @sly/api test tests/integration/production-declaration-flow.test.ts
//
// TEST_API_KEY is a pk_test_ key acting as an API-key actor. The whole point of
// the declaration gate is that declaring production is an OWNER-via-dashboard
// action only — an API-key (or agent) actor must be rejected with 403.
//
// NOTE / KNOWN LIMITATION: we cannot mint a real Supabase owner-JWT session in
// this harness, so we only assert the *gate* (API-key actor → 403). The full
// owner approve path (declare → declaration_pending → admin approve) is out of
// scope here and is covered by service-level unit tests.
//
// IMPORTANT (real finding): the API wraps every response via
// response-wrapper.ts. Success → { success, data, meta }; error →
// { success:false, error:{ code, ... } }. We assert against that ACTUAL
// envelope. (The pre-existing production-gating.test.ts asserts the *unwrapped*
// shape `body.status` / `body.code` and consequently fails against the live
// API — see the run report.)

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Production declaration flow (open-beta gating)', () => {
  const jsonHeaders = {
    Authorization: `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  it('GET /v1/tenants/production-status returns a defined status + ceiling', async () => {
    const res = await fetch(`${BASE_URL}/v1/tenants/production-status`, {
      headers: jsonHeaders,
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    // Response is wrapped: { success, data: {...}, meta }.
    expect(body.success).toBe(true);
    const data = body.data;

    // The demo tenant may be sandbox_only OR (as in dev, where it was
    // grandfathered with a pre-beta live key) production_approved. Both are
    // valid open-beta states; what matters is the field is well-formed.
    expect([
      'sandbox_only',
      'declaration_pending',
      'production_approved',
      'production_denied',
      'production_suspended',
    ]).toContain(data.status);

    // The dashboard relies on `ceiling` to render the gating banner / CTA.
    expect(data.ceiling).toBeDefined();
    expect(typeof data.ceiling.perTx).toBe('number');
    expect(typeof data.ceiling.daily).toBe('number');
    expect(typeof data.ceiling.monthly).toBe('number');
    expect(typeof data.kyaTier).toBe('number');
  });

  it('POST /v1/tenants/declare-production from an API-key actor is forbidden (owner-JWT only)', async () => {
    const res = await fetch(`${BASE_URL}/v1/tenants/declare-production`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        // intended_use_case has a min length of 20 in the route schema; this
        // body is otherwise valid so we are unambiguously asserting the ACTOR
        // gate, not a validation rejection.
        intended_use_case: 'x'.repeat(40),
        accepted_terms: true,
      }),
    });

    // Route checks actorType === 'user' && userRole === 'owner' BEFORE parsing
    // the body, so an API-key actor is rejected with a ForbiddenError.
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('FORBIDDEN');
    // The message should make clear this is an owner/dashboard-only action.
    expect(String(body.error?.message ?? '').toLowerCase()).toContain('owner');
  });
});
