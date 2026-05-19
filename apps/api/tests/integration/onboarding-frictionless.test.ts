import { describe, it, expect } from 'vitest';
import { TEST_API_KEY } from '../setup.js';

// Open-beta hardening — frictionless sandbox onboarding (the "first payment"
// blocker fix).
//
// Run with:
//   INTEGRATION=true pnpm --filter @sly/api test tests/integration/onboarding-frictionless.test.ts
//
// In the TEST environment, an owner-created agent must be usable IMMEDIATELY:
// no separate DSD / declare step, auto-declared at KYA tier 1 ("verified"),
// with an auto-created wallet — and crucially NOT capped to $0 by the parent
// account's verification_tier 0 (routes/agents.ts:398-425). Regressing any of
// these reintroduces the first-payment blocker.
//
// TEST_API_KEY is a pk_test_ key (test env) with tenant_write scope, which is
// sufficient for POST /v1/accounts and POST /v1/agents.
//
// RESPONSE ENVELOPE (verified): responses are wrapped. Account create returns
//   { success, data: { data: <account>, links, ... } }       → body.data.data.id
// Agent create returns
//   { success, data: { data: <agent w/ wallet_id>, credentials, authKey } }
//   → body.data.data.kyaTier / .wallet_id, body.data.credentials.token
//
// CLEANUP: best-effort DELETE of the created agent + account at the end. If
// deletion is unsupported/blocked the data is simply left in the sandbox
// tenant (acceptable — it's sandbox/test).

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Account create double-nests: { data: { data: {...} } }. Agent create wraps
// the agent under data.data with sibling credentials/authKey. Resolve both.
function unwrapAccount(body: any) {
  const d = body?.data ?? body;
  return d?.data ?? d;
}
function unwrapAgentEnvelope(body: any) {
  const env = body?.data ?? body; // { data: <agent>, credentials, authKey }
  return { agent: env?.data ?? env, credentials: env?.credentials, raw: body };
}

describe.skipIf(skipIntegration)('Frictionless sandbox onboarding', () => {
  const jsonHeaders = {
    Authorization: `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  it('owner-created sandbox agent is auto-T1 (verified, uncapped) with an auto-created wallet — no DSD step', async () => {
    let agentId: string | undefined;
    let accountId: string | undefined;
    try {
      // 1. Create a business account (verification_tier 0 by default).
      const acctRes = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ type: 'business', name: `Frictionless ${uniq()}` }),
      });
      expect([200, 201]).toContain(acctRes.status);
      const acct = unwrapAccount(await acctRes.json());
      accountId = acct.id;
      expect(accountId).toBeTruthy();
      // The parent account is unverified tier 0 — the exact condition that
      // used to zero out an agent's effective limits.
      expect(acct.verificationTier).toBe(0);

      // 2. Create an agent under it. NO declare-dsd call. auto_create_wallet
      //    defaults to true in the route schema.
      const agentRes = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name: `Frictionless Agent ${uniq()}`, accountId }),
      });
      expect(agentRes.status).toBe(201);
      const { agent, credentials } = unwrapAgentEnvelope(await agentRes.json());
      agentId = agent.id;

      // --- Sandbox auto-T1: usable immediately, no DSD ---
      expect(agent.kyaTier).toBe(1);
      expect(agent.kyaStatus).toBe('verified');

      // --- NOT capped to $0 by the unverified parent (the blocker fix) ---
      expect(agent.kya?.effectiveLimits?.cappedByParent).toBe(false);
      expect(agent.kya?.effectiveLimits?.perTransaction).toBeGreaterThan(0);
      expect(agent.kya?.effectiveLimits?.daily).toBeGreaterThan(0);
      expect(agent.kya?.effectiveLimits?.monthly).toBeGreaterThan(0);

      // --- Auto-created wallet attached ---
      expect(agent.wallet_id).toBeTruthy();

      // --- A usable agent token is returned exactly once ---
      expect(credentials?.token).toMatch(/^agent_/);
    } finally {
      // Best-effort cleanup (freshly created agent has no streams/usage).
      if (agentId) {
        await fetch(`${BASE_URL}/v1/agents/${agentId}`, {
          method: 'DELETE',
          headers: jsonHeaders,
        }).catch(() => {});
      }
      if (accountId) {
        await fetch(`${BASE_URL}/v1/accounts/${accountId}`, {
          method: 'DELETE',
          headers: jsonHeaders,
        }).catch(() => {});
      }
    }
  });
});
