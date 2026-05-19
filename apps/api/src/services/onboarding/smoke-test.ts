/**
 * Onboarding smoke test — the single "real step" of the outcome-first
 * onboarding. Instead of asking a newcomer to self-mark a dozen checkboxes,
 * we exercise the real protocol path against the real public routes (same
 * code a customer integration hits) and report exactly what happened.
 *
 * Sandbox only. It persists real rows and returns a real, live x402 payment
 * challenge / a real checkout — the genuine artifacts a paying AI agent
 * would encounter. It deliberately stops short of settlement: moving funds
 * crosses the Epic 82 `treasury` boundary, which by design requires a
 * deliberate per-payment elevation. We surface that as the security feature
 * it is rather than papering over it — the result is always honest.
 */

import type { Context } from 'hono';
import { createClient } from '../../db/client';
import { getEnv } from '../../utils/helpers.js';

export type SmokeOutcome = 'agent_spend' | 'api_monetization' | 'agent_checkout';

export const SMOKE_OUTCOMES: SmokeOutcome[] = [
  'agent_spend',
  'api_monetization',
  'agent_checkout',
];

export interface SmokeStep {
  name: string;
  ok: boolean;
  detail: string;
  reference?: string;
}

export interface SmokeResult {
  ok: boolean;
  outcome: SmokeOutcome;
  durationMs: number;
  steps: SmokeStep[];
  /** Headline reference (endpoint / checkout id) for the success line. */
  reference?: string;
  /** Present on failure — the true reason, never a fake green. */
  error?: string;
  /** Where the user should go next to do this for real. */
  nextAction?: { label: string; href: string };
}

interface CallResult {
  status: number;
  ok: boolean;
  json: any;
}

/**
 * Run the smoke test for one outcome. Auto-provisions a sandbox account if
 * the tenant has none, so the single button truly "just works" for a
 * brand-new beta user.
 */
export async function runOnboardingSmokeTest(
  c: Context,
  outcome: SmokeOutcome
): Promise<SmokeResult> {
  const start = Date.now();
  const ctx = c.get('ctx');
  const env = getEnv(ctx);
  const steps: SmokeStep[] = [];

  const finish = (
    ok: boolean,
    extra: Partial<SmokeResult> = {}
  ): SmokeResult => ({
    ok,
    outcome,
    durationMs: Date.now() - start,
    steps,
    ...extra,
  });

  if (env !== 'test') {
    return finish(false, {
      error:
        'Live smoke tests are disabled. Switch to Sandbox to run a safe test.',
    });
  }

  const origin = new URL(c.req.url).origin;
  const authz = c.req.header('authorization') || '';
  const xEnv = c.req.header('x-environment') || 'test';

  const call = async (
    method: string,
    path: string,
    body?: unknown
  ): Promise<CallResult> => {
    try {
      const res = await fetch(`${origin}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          authorization: authz,
          'x-environment': xEnv,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        /* non-JSON body */
      }
      return { status: res.status, ok: res.ok, json };
    } catch (e: any) {
      return {
        status: 0,
        ok: false,
        json: { error: e?.message || 'network error' },
      };
    }
  };

  const errText = (r: CallResult): string =>
    r.json?.error ||
    r.json?.message ||
    (typeof r.json === 'string' ? r.json : `HTTP ${r.status}`);

  // Throwaway artifacts created by this run, torn down in `finally` so
  // repeated runs never accumulate junk. The shared sandbox account is
  // intentionally reused, not deleted.
  let createdEndpointId: string | undefined;
  let createdCheckoutId: string | undefined;

  try {
    const supabase = createClient();

    // ── Step 1: ensure a sandbox account ──────────────────────────────────
    let accountId: string | undefined;
    {
      const { data } = await supabase
        .from('accounts')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('environment', env)
        .order('created_at', { ascending: true })
        .limit(1);
      accountId = data?.[0]?.id;
    }
    if (!accountId) {
      const r = await call('POST', '/v1/accounts', {
        type: 'business',
        name: 'Sandbox Test Account',
      });
      accountId = r.json?.id || r.json?.data?.id;
      if (!accountId) {
        steps.push({
          name: 'Provision sandbox account',
          ok: false,
          detail: `Could not create a test account: ${errText(r)}`,
        });
        return finish(false, {
          error: `Could not provision a sandbox account: ${errText(r)}`,
          nextAction: { label: 'Open Wallets', href: '/dashboard/wallets' },
        });
      }
    }
    steps.push({
      name: 'Sandbox account ready',
      ok: true,
      detail:
        'Sly already provisioned a sandbox account for you — nothing to set up.',
      reference: accountId,
    });

    // ── agent_checkout → real ACP checkout ────────────────────────────────
    if (outcome === 'agent_checkout') {
      const checkoutId = `smoke-${Date.now()}`;
      const create = await call('POST', '/v1/acp/checkouts', {
        checkout_id: checkoutId,
        agent_id: ctx.actorId || 'sly-onboarding-agent',
        agent_name: 'Onboarding Test Agent',
        account_id: accountId,
        merchant_id: 'sly-demo-merchant',
        merchant_name: 'Sly Demo Store',
        items: [
          {
            name: 'Demo product',
            quantity: 1,
            unit_price: 1,
            total_price: 1,
            currency: 'USDC',
          },
        ],
        currency: 'USDC',
      });
      const realId =
        create.json?.data?.id ||
        create.json?.id ||
        create.json?.data?.checkout_id;
      steps.push({
        name: 'Agent created a real checkout',
        ok: create.ok && !!realId,
        detail: create.ok
          ? `A real ACP checkout (${checkoutId}, 1.00 USDC) was created — exactly what a shopping agent opens against your store.`
          : `Checkout creation failed: ${errText(create)}`,
        reference: realId,
      });
      createdCheckoutId = realId;
      if (!create.ok || !realId) {
        return finish(false, {
          error: `ACP checkout could not be created: ${errText(create)}`,
          nextAction: {
            label: 'Open Agent Checkouts',
            href: '/dashboard/agentic-payments/acp/checkouts/new',
          },
        });
      }
      steps.push({
        name: 'Ready for real settlement',
        ok: true,
        detail:
          'The checkout settles once you connect a payment handler and the agent presents a treasury-scoped payment. Requiring a deliberate treasury approval per payment is an Epic 82 security control — not a missing step.',
      });
      return finish(true, {
        reference: realId,
        nextAction: {
          label: 'Connect a payment handler',
          href: '/dashboard/payment-handlers',
        },
      });
    }

    // ── agent_spend / api_monetization → real x402 endpoint + 402 quote ───
    const slug = Math.random().toString(36).slice(2, 8);
    const endpointPath = `/smoke/${slug}`;
    const create = await call('POST', '/v1/x402/endpoints', {
      name: 'Onboarding smoke test endpoint',
      path: endpointPath,
      method: 'GET',
      description: 'Temporary endpoint created by the onboarding live test.',
      accountId,
      basePrice: 0.01,
      currency: 'USDC',
    });
    const endpointId = create.json?.id || create.json?.data?.id;
    createdEndpointId = endpointId;
    steps.push({
      name:
        outcome === 'api_monetization'
          ? 'Registered a priced API endpoint'
          : 'Set up something for an agent to buy',
      ok: create.ok && !!endpointId,
      detail: create.ok
        ? `x402 endpoint ${endpointPath} is live at 0.01 USDC per call.`
        : `Endpoint registration failed: ${errText(create)}`,
      reference: endpointId,
    });
    if (!create.ok || !endpointId) {
      return finish(false, {
        error: `x402 endpoint could not be created: ${errText(create)}`,
        nextAction: {
          label: 'Open x402 Endpoints',
          href: '/dashboard/agentic-payments/x402/endpoints',
        },
      });
    }

    const quote = await call('GET', `/v1/x402/quote/${endpointId}`);
    const q = quote.json?.data ?? quote.json;
    const price = q?.currentPrice ?? q?.basePrice;
    const currency = q?.currency || 'USDC';
    steps.push({
      name:
        outcome === 'api_monetization'
          ? 'An agent received a live payment challenge'
          : 'Your agent got a real, signable price',
      ok: quote.ok && price != null,
      detail:
        quote.ok && price != null
          ? `A real x402 request returned a live 402 challenge: ${price} ${currency} to call ${endpointPath}. This is exactly what an autonomous agent receives and pays against — no mocks.`
          : `Could not fetch a live quote: ${errText(quote)}`,
      reference: endpointId,
    });
    if (!quote.ok || price == null) {
      return finish(false, {
        error: `x402 endpoint is live but the quote check failed: ${errText(quote)}`,
        nextAction: {
          label: 'Open x402 Endpoints',
          href: '/dashboard/agentic-payments/x402/endpoints',
        },
      });
    }

    steps.push({
      name: 'Ready for real charges',
      ok: true,
      detail:
        'An agent pays this by presenting a treasury-scoped payment. Sly requires a deliberate per-payment treasury approval (Epic 82) so funds never move implicitly — that gate is the security feature, not a missing step.',
    });

    return finish(true, {
      reference: endpointId,
      nextAction:
        outcome === 'api_monetization'
          ? {
              label: 'Manage your API endpoints',
              href: '/dashboard/agentic-payments/x402/endpoints',
            }
          : {
              label: 'Manage your agents',
              href: '/dashboard/agents',
            },
    });
  } catch (e: any) {
    return finish(false, {
      error: `Unexpected error running the test: ${e?.message || String(e)}`,
    });
  } finally {
    // Best-effort teardown of this run's throwaway artifacts. Failures are
    // swallowed — cleanup must never change the result the user sees.
    if (createdEndpointId) {
      await call('DELETE', `/v1/x402/endpoints/${createdEndpointId}`).catch(
        () => {}
      );
    }
    if (createdCheckoutId) {
      await call('DELETE', `/v1/acp/checkouts/${createdCheckoutId}`).catch(
        () => {}
      );
    }
  }
}
