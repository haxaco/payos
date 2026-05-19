/**
 * Sample-data seeder — the optional "Populate sample data" half of the
 * demo-mode walkthrough. The tour overlay works on any tenant including
 * empty ones; this endpoint lets a user populate their own sandbox with
 * a small, realistic set of artifacts (account, agent + auto-wallet,
 * one x402 endpoint, one ACP checkout) so the dashboard pages don't
 * sit empty while they explore.
 *
 * Sandbox only. Idempotent — repeated calls reuse anything that already
 * exists (matched on stable name/path), so the button is safe to mash.
 */

import type { Context } from 'hono';
import { createClient } from '../../db/client';
import { getEnv } from '../../utils/helpers.js';

export interface SampleSeedResult {
  ok: boolean;
  durationMs: number;
  /** True if every artifact was already present (no creation happened). */
  alreadySeeded: boolean;
  created: {
    accounts: number;
    agents: number;
    x402_endpoints: number;
    acp_checkouts: number;
  };
  references: {
    accountId?: string;
    agentId?: string;
    walletId?: string;
    x402EndpointId?: string;
    acpCheckoutId?: string;
  };
  error?: string;
}

interface CallResult {
  status: number;
  ok: boolean;
  json: any;
}

// Stable names/paths used to detect prior seeding. Pinning these keeps
// the seeder honestly idempotent (a re-click never duplicates rows).
const DEMO_ACCOUNT_NAME = 'Sly Demo Storefront';
const DEMO_AGENT_NAME = 'Demo Shopping Agent';
const DEMO_X402_PATH = '/demo/price';
const DEMO_X402_NAME = 'Demo Price API';
const DEMO_ACP_CHECKOUT_ID = 'sly-demo-checkout-1';

export async function runSampleSeed(c: Context): Promise<SampleSeedResult> {
  const start = Date.now();
  const ctx = c.get('ctx');
  const env = getEnv(ctx);

  const created = { accounts: 0, agents: 0, x402_endpoints: 0, acp_checkouts: 0 };
  const references: SampleSeedResult['references'] = {};

  const finish = (extra: Partial<SampleSeedResult> = {}): SampleSeedResult => ({
    ok: true,
    durationMs: Date.now() - start,
    alreadySeeded:
      created.accounts === 0 &&
      created.agents === 0 &&
      created.x402_endpoints === 0 &&
      created.acp_checkouts === 0,
    created,
    references,
    ...extra,
  });

  if (env !== 'test') {
    return {
      ...finish(),
      ok: false,
      error: 'Sample seeding is disabled in production. Switch to Sandbox first.',
    };
  }

  // Self-fetch origin honoring X-Forwarded-Proto (same hardening as the
  // smoke-test — Railway terminates TLS at the edge, c.req.url's scheme
  // is the upstream HTTP, so unfixed self-fetches 301 across protocols
  // and Node drops Authorization on the redirect).
  const reqUrl = new URL(c.req.url);
  const proto =
    c.req.header('x-forwarded-proto') || reqUrl.protocol.replace(':', '');
  const host =
    c.req.header('x-forwarded-host') || c.req.header('host') || reqUrl.host;
  const origin = `${proto}://${host}`;
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

  // The response-wrapper middleware double-nests successful payloads as
  // `{success, data: { data: {...} } }` for routes that already wrapped
  // their own response, and surfaces errors as `{success:false, error:
  // {code,message,...}}`. Robust extractors for both shapes.
  const pickId = (j: any): string | undefined =>
    j?.data?.data?.id || j?.data?.id || j?.id;
  const errText = (r: CallResult): string => {
    const e = r.json?.error;
    if (e && typeof e === 'object' && e.message) return e.message as string;
    if (typeof e === 'string') return e;
    if (typeof r.json?.message === 'string') return r.json.message;
    return `HTTP ${r.status}`;
  };

  try {
    const supabase = createClient();

    // ── 1. account ────────────────────────────────────────────────────────
    {
      const { data } = await supabase
        .from('accounts')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('environment', env)
        .eq('name', DEMO_ACCOUNT_NAME)
        .limit(1);
      references.accountId = data?.[0]?.id;
    }
    if (!references.accountId) {
      const r = await call('POST', '/v1/accounts', {
        type: 'business',
        name: DEMO_ACCOUNT_NAME,
        metadata: { sly_demo_seed: true },
      });
      references.accountId = pickId(r.json);
      if (!references.accountId) {
        return {
          ...finish(),
          ok: false,
          error: `Could not create demo account: ${errText(r)}`,
        };
      }
      created.accounts += 1;
    }

    // ── 2. agent (auto-creates a wallet in sandbox) ───────────────────────
    // Prefer the named demo agent; otherwise reuse ANY active agent the
    // tenant already has (avoids the per-tenant `max_agents` quota when a
    // mature sandbox tenant runs the seeder — the demo experience only
    // needs *an* agent to point ACP checkouts at, not strictly a new one).
    {
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('environment', env)
        .eq('name', DEMO_AGENT_NAME)
        .limit(1);
      if (data?.[0]) references.agentId = data[0].id;
    }
    if (!references.agentId) {
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('environment', env)
        .order('created_at', { ascending: true })
        .limit(1);
      if (data?.[0]) references.agentId = data[0].id;
    }
    if (!references.agentId) {
      const r = await call('POST', '/v1/agents', {
        accountId: references.accountId,
        name: DEMO_AGENT_NAME,
        description:
          'Sample agent created by the demo-mode walkthrough. Safe to delete.',
        auto_create_wallet: true,
        generate_keypair: true,
      });
      references.agentId = pickId(r.json);
      if (!references.agentId) {
        // Agent creation failed (e.g. quota, validation). Don't abort the
        // whole seed — the x402 endpoint + ACP checkout steps below are
        // independent of agent creation and still useful. Just surface
        // the reason and continue.
        return {
          ...finish(),
          ok: false,
          error: `Could not create demo agent: ${errText(r)}`,
        };
      }
      created.agents += 1;
    }
    // Resolve wallet via the canonical link (no wallet_id column on agents).
    if (references.agentId && !references.walletId) {
      const { data: walletRow } = await supabase
        .from('wallets')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('environment', env)
        .eq('managed_by_agent_id', references.agentId)
        .limit(1);
      references.walletId = walletRow?.[0]?.id;
    }

    // ── 3. one x402 endpoint ──────────────────────────────────────────────
    {
      const { data } = await supabase
        .from('x402_endpoints')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('environment', env)
        .eq('path', DEMO_X402_PATH)
        .limit(1);
      references.x402EndpointId = data?.[0]?.id;
    }
    if (!references.x402EndpointId) {
      const r = await call('POST', '/v1/x402/endpoints', {
        name: DEMO_X402_NAME,
        path: DEMO_X402_PATH,
        method: 'GET',
        description:
          'Sample priced endpoint created by the demo-mode walkthrough. Safe to delete.',
        accountId: references.accountId,
        basePrice: 0.05,
        currency: 'USDC',
      });
      references.x402EndpointId = pickId(r.json);
      if (!references.x402EndpointId) {
        return {
          ...finish(),
          ok: false,
          error: `Could not create demo x402 endpoint: ${errText(r)}`,
        };
      }
      created.x402_endpoints += 1;
    }

    // ── 4. one ACP checkout (open state) ──────────────────────────────────
    {
      const { data } = await supabase
        .from('acp_checkouts')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('environment', env)
        .eq('checkout_id', DEMO_ACP_CHECKOUT_ID)
        .limit(1);
      references.acpCheckoutId = data?.[0]?.id;
    }
    if (!references.acpCheckoutId) {
      const r = await call('POST', '/v1/acp/checkouts', {
        checkout_id: DEMO_ACP_CHECKOUT_ID,
        agent_id: references.agentId ?? 'sly-demo-agent',
        agent_name: DEMO_AGENT_NAME,
        account_id: references.accountId,
        merchant_id: 'sly-demo-merchant',
        merchant_name: 'Sly Demo Store',
        items: [
          {
            name: 'Demo Subscription — 1 month',
            quantity: 1,
            unit_price: 5,
            total_price: 5,
            currency: 'USDC',
          },
        ],
        currency: 'USDC',
        metadata: { sly_demo_seed: true },
      });
      const id =
        pickId(r.json) ||
        r.json?.data?.data?.checkout_id ||
        r.json?.data?.checkout_id;
      if (id) {
        references.acpCheckoutId = id;
        created.acp_checkouts += 1;
      }
      // ACP checkout creation is best-effort — if it fails (e.g.
      // duplicate-id race, missing handler), the rest of the seed is
      // still useful and we surface the partial outcome honestly.
    }

    return finish();
  } catch (e: any) {
    return {
      ...finish(),
      ok: false,
      error: `Unexpected error seeding sample data: ${e?.message || String(e)}`,
    };
  }
}
