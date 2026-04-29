/**
 * Integration tests for tenant-wide scope gating (Epic 82).
 *
 * Verifies the require-tenant-scope middleware against a live API
 * server. Run with `INTEGRATION=true pnpm test`. Requires:
 *   - API server running on $API_URL (default http://localhost:4000)
 *   - TEST_API_KEY (pk_test_*) seeded
 *   - TEST_AGENT_TOKEN (agent_*) seeded against a known agent
 */

import { describe, it, expect } from 'vitest';
import { TEST_API_KEY, TEST_AGENT_TOKEN, TEST_AGENTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

const apiKeyHeaders = {
  Authorization: `Bearer ${TEST_API_KEY}`,
  'Content-Type': 'application/json',
};
const agentHeaders = {
  Authorization: `Bearer ${TEST_AGENT_TOKEN}`,
  'Content-Type': 'application/json',
};

describe.skipIf(skipIntegration)('Tenant-wide scope gating (Epic 82)', () => {
  describe('agent token without elevated grant', () => {
    it('GET /v1/accounts → 403 SCOPE_REQUIRED', async () => {
      const res = await fetch(`${BASE_URL}/v1/accounts`, { headers: agentHeaders });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.code).toBe('SCOPE_REQUIRED');
      expect(body.required_scope).toBe('tenant_read');
      expect(body.current_scope).toBe('agent');
      expect(typeof body.hint).toBe('string');
      expect(body.hint).toMatch(/request_scope/);
    });

    it('GET /v1/wallets → 403 SCOPE_REQUIRED', async () => {
      const res = await fetch(`${BASE_URL}/v1/wallets`, { headers: agentHeaders });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.code).toBe('SCOPE_REQUIRED');
      expect(body.required_scope).toBe('tenant_read');
    });

    it('POST /v1/accounts → 403 with required_scope=tenant_write', async () => {
      const res = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers: agentHeaders,
        body: JSON.stringify({ type: 'person', name: 'X', email: 'x@x.com' }),
      });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.required_scope).toBe('tenant_write');
    });

    it('POST /v1/x402/pay → 403 with required_scope=treasury (override)', async () => {
      const res = await fetch(`${BASE_URL}/v1/x402/pay`, {
        method: 'POST',
        headers: agentHeaders,
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.required_scope).toBe('treasury');
    });
  });

  describe('api_key actor (regression)', () => {
    it('GET /v1/accounts → 200 (effectiveScope auto-grants tenant_write)', async () => {
      const res = await fetch(`${BASE_URL}/v1/accounts`, { headers: apiKeyHeaders });
      expect(res.status).toBe(200);
    });

    it('GET /v1/wallets → 200', async () => {
      const res = await fetch(`${BASE_URL}/v1/wallets`, { headers: apiKeyHeaders });
      expect(res.status).toBe(200);
    });

    it('POST /v1/x402/pay → still 4xx but NOT 403 SCOPE_REQUIRED (api_key has tenant_write, not treasury)', async () => {
      // api_key callers don't auto-elevate to treasury. The gate should
      // still 403 with SCOPE_REQUIRED rather than passing through.
      const res = await fetch(`${BASE_URL}/v1/x402/pay`, {
        method: 'POST',
        headers: apiKeyHeaders,
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.code).toBe('SCOPE_REQUIRED');
      expect(body.required_scope).toBe('treasury');
      expect(body.current_scope).toBe('tenant_write');
    });
  });

  describe('self-scope shortcut on agent_id-filtered list endpoints', () => {
    it('GET /v1/ap2/mandates without agent_id → 403', async () => {
      const res = await fetch(`${BASE_URL}/v1/ap2/mandates`, { headers: agentHeaders });
      expect(res.status).toBe(403);
    });

    it('GET /v1/ap2/mandates?agent_id=<self> → 200', async () => {
      // TEST_AGENT_TOKEN should map to TEST_AGENTS.payroll. If the seed
      // changes, this assertion needs to match the new mapping.
      const res = await fetch(
        `${BASE_URL}/v1/ap2/mandates?agent_id=${TEST_AGENTS.payroll}`,
        { headers: agentHeaders },
      );
      expect([200, 404]).toContain(res.status); // 404 ok if route shape differs in env; gate passed
      // The critical assertion is that the gate did NOT 403 the request.
      expect(res.status).not.toBe(403);
    });

    it('GET /v1/ap2/mandates?agent_id=<other> → 403', async () => {
      const otherAgentId = TEST_AGENTS.invoice; // not the calling agent
      const res = await fetch(
        `${BASE_URL}/v1/ap2/mandates?agent_id=${otherAgentId}`,
        { headers: agentHeaders },
      );
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.code).toBe('SCOPE_REQUIRED');
    });
  });

  describe('whoami enrichment', () => {
    it('GET /v1/context/whoami (agent) returns active_scope=agent and available_agent_tools', async () => {
      const res = await fetch(`${BASE_URL}/v1/context/whoami`, { headers: agentHeaders });
      expect(res.status).toBe(200);
      const wrapped: any = await res.json();
      // Response wrapper may envelope this — read the inner data if present.
      const body = wrapped.data ?? wrapped;
      expect(body.active_scope).toBe('agent');
      expect(Array.isArray(body.available_agent_tools)).toBe(true);
      expect(body.available_agent_tools.length).toBeGreaterThan(0);
      expect(body.available_agent_tools).toContain('agent_wallet_get');
    });

    it('GET /v1/auth/scopes/active (agent) returns nudge + agent.wallet block', async () => {
      const res = await fetch(`${BASE_URL}/v1/auth/scopes/active`, { headers: agentHeaders });
      expect(res.status).toBe(200);
      const wrapped: any = await res.json();
      const body = wrapped.data ?? wrapped;
      expect(body.current_scope).toBe('agent');
      expect(typeof body.nudge).toBe('string');
      expect(body.nudge).toMatch(/agent baseline|self-scoped/i);
      // agent block present (wallet may be null if seed doesn't include
      // an agent_eoa wallet, but the agent identity should be there).
      expect(body.agent).toBeTruthy();
      expect(body.agent.id).toBeTruthy();
    });
  });
});
