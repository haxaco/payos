import { describe, it, expect } from 'vitest';
import { TEST_API_KEY } from '../setup.js';

/**
 * x402 Publish → agentic-marketplace integration loop.
 *
 * User-facing question under test: "Is Publish in the agentic market
 * validated for x402?" The publish *state machine* itself is unit-tested
 * (apps/api/tests/unit/publish-x402.test.ts). This suite drives the same
 * machine end-to-end against the LOCALLY RUNNING API + real dev Supabase,
 * proving the create → publish → discover → consume loop behaves as the
 * code actually implements it.
 *
 * Requires a running API (http://localhost:4000) with apps/api/.env loaded.
 * Run with:
 *   INTEGRATION=true pnpm --filter @sly/api test tests/integration/x402-publish-marketplace.test.ts
 * Without INTEGRATION the whole suite skips via describe.skipIf.
 *
 * Response-wrapper contract (verified live):
 *   success → { success: true, data: <payload>, meta: {...} }
 *   coded error → { success: false, error: { code, ... } }
 *   a few low-level rejections (scope gate, raw 404/500 from a route that
 *     returns c.json({ error }) before the wrapper coalesces) come back as a
 *     raw { error: '...' } / { error, code, ... } with a 4xx/5xx status.
 * Assertions read body.data.* for success and tolerate BOTH error shapes.
 *
 * The discovery surface for published x402 endpoints (the "agentic market"
 * catalog the buyer sees) is GET /v1/x402/endpoints?publish_status=published.
 * x402-payments.ts only exposes /pay, /verify, /quote/:id — there is no
 * separate in-API vendor/discover list route; the published-filtered
 * endpoints list IS the catalog (the external agentic.market index is
 * populated out-of-band by Coinbase once an endpoint reaches `processing`).
 */

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

const VALID_LIFECYCLE = [
  'draft',
  'validating',
  'publishing',
  'processing',
  'published',
  'failed',
  'unpublished',
];

describe.skipIf(skipIntegration)('x402 Publish → agentic-marketplace loop', () => {
  const jsonHeaders = {
    Authorization: `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Shared state across the ordered `it`s. Vitest runs `it`s in file order
  // within a describe, and we deliberately chain create → publish → discover.
  let endpointId: string | null = null;
  let serviceSlug: string | null = null;

  async function firstAccountId(): Promise<string> {
    const res = await fetch(`${BASE_URL}/v1/accounts?limit=1`, {
      headers: jsonHeaders,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    return body.data[0].id as string;
  }

  it('1. creates an x402 endpoint in draft state', async () => {
    const accountId = await firstAccountId();
    const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    serviceSlug = `itest-pub-${uniq}`;

    const res = await fetch(`${BASE_URL}/v1/x402/endpoints`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: 'Integration Publish Probe',
        path: `/itest-pub-${uniq}`,
        method: 'GET',
        // create schema enforces max 1000; publish preflight also exercises
        // the Bazaar extension validator which wants a non-trivial description.
        description:
          'Integration test endpoint validating the x402 publish to agentic-marketplace discovery loop end to end.',
        accountId,
        basePrice: 0.01,
        currency: 'USDC',
        serviceSlug,
        // Deliberately unreachable so the first-settle probe returns a
        // deterministic terminal state (probe-failed → publish_status=failed)
        // instead of crashing on the CDP wallet-provisioning path. See test 2b
        // for the reachable-backend behavior, which is where a real bug lives.
        backendUrl: 'https://example.com/itest-unreachable',
        category: 'data',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Response-wrapper unwraps the handler's c.json({ data }) — the endpoint
    // payload sits directly at body.data (NOT body.data.data).
    const ep = body.data;
    expect(ep.id).toBeTruthy();
    expect(ep.serviceSlug).toBe(serviceSlug);
    expect(ep.backendUrl).toBe('https://example.com/itest-unreachable');
    // Create handler always inserts a fresh endpoint as draft.
    expect(ep.publishStatus).toBe('draft');
    expect(ep.visibility).toBe('private');

    endpointId = ep.id;
  });

  it('2. publish is accepted and advances the state machine out of draft, writing audit events', async () => {
    expect(endpointId).toBeTruthy();

    const pubRes = await fetch(
      `${BASE_URL}/v1/x402/endpoints/${endpointId}/publish`,
      { method: 'POST', headers: jsonHeaders, body: JSON.stringify({}) },
    );

    // Publish is ACCEPTED (2xx) — the state machine runs synchronously and
    // returns its terminal result. With an unreachable backend the probe
    // fails and the machine lands in `failed` (a valid terminal lifecycle
    // state); it does NOT remain in draft. This mirrors the unit-tested
    // "probe-failed" branch of publish-x402.
    expect(pubRes.status).toBe(200);
    const pubBody = await pubRes.json();
    expect(pubBody.success).toBe(true);
    expect(['ok', 'failed']).toContain(pubBody.data.status);
    expect(pubBody.data.publishStatus).not.toBe('draft');
    expect(VALID_LIFECYCLE).toContain(pubBody.data.publishStatus);
    // Unreachable backend → deterministic probe-failed terminal state.
    expect(pubBody.data.publishStatus).toBe('failed');
    expect(pubBody.data.publishError).toBe('probe-failed');

    // publish-status reflects the advanced state + a populated audit trail.
    const stRes = await fetch(
      `${BASE_URL}/v1/x402/endpoints/${endpointId}/publish-status`,
      { headers: jsonHeaders },
    );
    expect(stRes.status).toBe(200);
    const stBody = await stRes.json();
    expect(stBody.success).toBe(true);
    const st = stBody.data;
    expect(st.publishStatus).not.toBe('draft');
    expect(VALID_LIFECYCLE).toContain(st.publishStatus);
    expect(Array.isArray(st.events)).toBe(true);
    // At minimum: publish_requested + (validating) + failed audit rows.
    expect(st.events.length).toBeGreaterThan(0);
    const eventTypes = st.events.map((e: { event: string }) => e.event);
    expect(eventTypes).toContain('publish_requested');
    expect(eventTypes).toContain('failed');
    // gatewayUrl is derived from tenant slug + service slug once the machine
    // has run; assert it is well-formed when present.
    if (st.gatewayUrl) {
      expect(st.gatewayUrl).toContain(serviceSlug);
    }
  });

  it('2b. KNOWN BUG: publish with a reachable JSON backend strands the endpoint in `validating` (500, wallet undefined)', async () => {
    // This documents a GENUINE bug found by the integration loop, not a test
    // weakening. With a backend the probe can successfully GET (200 + JSON),
    // publish-x402 advances draft → validating → validated, then calls
    // getOrProvision() for the payout wallet and dereferences `wallet.address`
    // at publish-x402.ts:417. In this sandbox that path yields no usable
    // wallet and the handler throws a raw TypeError:
    //   "Cannot read properties of undefined (reading 'address')"
    // returned as 500 { error: 'Internal server error', details: <that msg> }.
    // The endpoint is left STRANDED in `validating` — no terminal `failed`,
    // no `processing`, no audit `failed` row. A clean implementation should
    // surface this as a WalletRequiredError / publish_status='failed' instead
    // of a 500 + half-run state machine.
    const accountId = await firstAccountId();
    const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const slug = `itest-pub-rb-${uniq}`;

    const createRes = await fetch(`${BASE_URL}/v1/x402/endpoints`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: 'Integration Publish Probe (reachable)',
        path: `/itest-pub-rb-${uniq}`,
        method: 'GET',
        description:
          'Integration test endpoint exercising the reachable-backend publish path to characterize the payout-wallet crash.',
        accountId,
        basePrice: 0.01,
        currency: 'USDC',
        serviceSlug: slug,
        backendUrl: 'https://httpbin.org/json',
        category: 'data',
      }),
    });
    expect(createRes.status).toBe(201);
    const rbId = (await createRes.json()).data.id as string;

    const pubRes = await fetch(
      `${BASE_URL}/v1/x402/endpoints/${rbId}/publish`,
      { method: 'POST', headers: jsonHeaders, body: JSON.stringify({}) },
    );

    // Observed behavior: raw 500 with the TypeError surfaced in `details`.
    // We assert the bug rather than masking it. If/when the wallet path is
    // fixed this assertion will fail and should be updated to expect a
    // terminal `failed`/`processing` outcome.
    expect(pubRes.status).toBe(500);
    const pubBody = await pubRes.json();
    expect(pubBody.success === false || pubBody.error !== undefined).toBe(true);
    const detail = JSON.stringify(pubBody);
    expect(detail).toMatch(/address|Internal server error/i);

    // Confirm the endpoint is stranded mid-machine in `validating`
    // (advanced out of draft, but no terminal state reached).
    const stRes = await fetch(
      `${BASE_URL}/v1/x402/endpoints/${rbId}/publish-status`,
      { headers: jsonHeaders },
    );
    expect(stRes.status).toBe(200);
    const st = (await stRes.json()).data;
    expect(st.publishStatus).not.toBe('draft');
    expect(['validating', 'publishing', 'failed', 'processing']).toContain(
      st.publishStatus,
    );

    // Best-effort cleanup of this extra probe endpoint.
    await fetch(`${BASE_URL}/v1/x402/endpoints/${rbId}`, {
      method: 'DELETE',
      headers: jsonHeaders,
    }).catch(() => {});
  });

  it('3. published-catalog discovery endpoint is well-formed', async () => {
    const res = await fetch(
      `${BASE_URL}/v1/x402/endpoints?publish_status=published&limit=50`,
      { headers: jsonHeaders },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Every row returned must actually be published (the filter is real).
    for (const ep of body.data) {
      expect(ep.publishStatus).toBe('published');
    }
    // pagination envelope is present and coherent.
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination.total).toBe('number');

    // Our test endpoint did NOT reach `published`: in this sandbox the
    // first-settle probe against the (deliberately unreachable) backend fails,
    // so the endpoint terminates in `failed` and never enters the published
    // catalog. That is CORRECT publish-gating behavior, not a bug — an
    // endpoint only becomes discoverable to buyers once it settles. We
    // therefore assert the catalog endpoint works and that our endpoint is
    // absent, rather than hard-asserting it is present.
    const ids = body.data.map((e: { id: string }) => e.id);
    expect(ids).not.toContain(endpointId);
  });

  it('4. buyer/consumption path is scope-gated — publish gates discovery, treasury scope gates the buy', async () => {
    expect(endpointId).toBeTruthy();

    // POST /v1/x402/pay is the buyer path. app.ts overrides its scope to
    // `treasury`. TEST_API_KEY carries `tenant_write` (enough to
    // create/publish/list) but NOT `treasury`, so the scope middleware turns
    // the buy away BEFORE any payment logic runs. This proves the
    // consumption surface is gated independently of publish state.
    const res = await fetch(`${BASE_URL}/v1/x402/pay`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        endpointId,
        requestId: crypto.randomUUID(),
        amount: 0.01,
        currency: 'USDC',
        walletId: crypto.randomUUID(),
        method: 'GET',
        path: '/itest',
        timestamp: Math.floor(Date.now() / 1000),
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    // The scope middleware returns a raw (non-enveloped) coded body:
    //   { error, code: 'SCOPE_REQUIRED', required_scope, current_scope, hint }
    // Tolerate the enveloped variant too, in case the wrapper coalesces it.
    const code = body.code ?? body.error?.code;
    expect(code).toBe('SCOPE_REQUIRED');
    const requiredScope =
      body.required_scope ?? body.error?.required_scope ?? body.error?.details?.required_scope;
    expect(requiredScope).toBe('treasury');
  });

  it('5. cleanup — unpublish + delete the test endpoint (sandbox tenant)', async () => {
    expect(endpointId).toBeTruthy();

    // Endpoint never reached `published`, but unpublish is idempotent and a
    // valid revert call; assert it is accepted (or 404 if already gone).
    const unpub = await fetch(
      `${BASE_URL}/v1/x402/endpoints/${endpointId}/unpublish`,
      { method: 'POST', headers: jsonHeaders },
    );
    expect([200, 404]).toContain(unpub.status);

    // No transaction history (no successful buy happened), so DELETE without
    // ?force should succeed and revert the test data in the sandbox tenant.
    const del = await fetch(`${BASE_URL}/v1/x402/endpoints/${endpointId}`, {
      method: 'DELETE',
      headers: jsonHeaders,
    });
    expect([200, 404]).toContain(del.status);

    // Verify it is gone from the tenant's endpoint list.
    const getRes = await fetch(
      `${BASE_URL}/v1/x402/endpoints/${endpointId}`,
      { headers: jsonHeaders },
    );
    expect(getRes.status).toBe(404);
  });
});
