import { describe, it, expect } from 'vitest';
import { TEST_API_KEY, TEST_AGENT_TOKEN, TEST_ACCOUNTS, TEST_AGENTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Agents API Integration', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  describe('GET /v1/agents', () => {
    it('returns a list of agents', async () => {
      const response = await fetch(`${BASE_URL}/v1/agents`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('filters by status', async () => {
      const response = await fetch(`${BASE_URL}/v1/agents?status=active`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((a: any) => a.status === 'active')).toBe(true);
    });

    it('filters by parent account', async () => {
      const response = await fetch(`${BASE_URL}/v1/agents?parentAccountId=${TEST_ACCOUNTS.techcorp}`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((a: any) => a.parentAccount.id === TEST_ACCOUNTS.techcorp)).toBe(true);
    });
  });

  describe('GET /v1/agents/:id', () => {
    it('returns agent details', async () => {
      const response = await fetch(`${BASE_URL}/v1/agents/${TEST_AGENTS.payroll}`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe(TEST_AGENTS.payroll);
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('kya');
      expect(data.data).toHaveProperty('permissions');
      expect(data.data).toHaveProperty('parentAccount');
    });
  });

  describe('POST /v1/agents', () => {
    it('creates a new agent', async () => {
      const response = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parentAccountId: TEST_ACCOUNTS.techcorp,
          name: `Test Agent ${Date.now()}`,
          description: 'Integration test agent',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toHaveProperty('id');
      expect(data.data.status).toBe('active');
      expect(data.data.kya.tier).toBe(0); // New agents start unverified
      expect(data).toHaveProperty('credentials');
      expect(data.credentials).toHaveProperty('clientId');
    });

    it('requires business account parent', async () => {
      const response = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parentAccountId: TEST_ACCOUNTS.maria, // Person account
          name: 'Invalid Agent',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('business');
    });
  });

  describe('GET /v1/agents/:id/limits', () => {
    it('returns agent limits and usage', async () => {
      const response = await fetch(`${BASE_URL}/v1/agents/${TEST_AGENTS.payroll}/limits`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('agentId');
      expect(data.data).toHaveProperty('limits');
      expect(data.data).toHaveProperty('usage');
      expect(data.data).toHaveProperty('streams');
      expect(data.data.limits).toHaveProperty('perTransaction');
      expect(data.data.limits).toHaveProperty('daily');
      expect(data.data.limits).toHaveProperty('monthly');
    });
  });

  describe('POST /v1/agents/:id/verify', () => {
    it('sets agent KYA tier', async () => {
      // First create a new agent
      const createResponse = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parentAccountId: TEST_ACCOUNTS.acme,
          name: `Verify Test Agent ${Date.now()}`,
        }),
      });
      const createData = await createResponse.json();
      const agentId = createData.data.id;

      // Verify it
      const response = await fetch(`${BASE_URL}/v1/agents/${agentId}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tier: 2 }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.kya.tier).toBe(2);
      expect(data.data.kya.status).toBe('verified');
    });
  });

  describe('POST /v1/agents/:id/suspend', () => {
    it('suspends an active agent', async () => {
      // Create agent to suspend
      const createResponse = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parentAccountId: TEST_ACCOUNTS.techcorp,
          name: `Suspend Test Agent ${Date.now()}`,
        }),
      });
      const createData = await createResponse.json();
      const agentId = createData.data.id;

      const response = await fetch(`${BASE_URL}/v1/agents/${agentId}/suspend`, {
        method: 'POST',
        headers,
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('suspended');
    });
  });

  describe('POST /v1/agents/:id/activate', () => {
    it('activates a suspended agent', async () => {
      // Create and suspend an agent
      const createResponse = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parentAccountId: TEST_ACCOUNTS.techcorp,
          name: `Activate Test Agent ${Date.now()}`,
        }),
      });
      const createData = await createResponse.json();
      const agentId = createData.data.id;

      await fetch(`${BASE_URL}/v1/agents/${agentId}/suspend`, {
        method: 'POST',
        headers,
      });

      const response = await fetch(`${BASE_URL}/v1/agents/${agentId}/activate`, {
        method: 'POST',
        headers,
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('active');
    });
  });
});

describe.skipIf(skipIntegration)('Agent Authentication', () => {
  const agentHeaders = {
    'Authorization': `Bearer ${TEST_AGENT_TOKEN}`,
    'Content-Type': 'application/json',
  };

  it('allows agent token authentication', async () => {
    const response = await fetch(`${BASE_URL}/v1/accounts`, { headers: agentHeaders });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('data');
  });

  it('rejects invalid tokens', async () => {
    const response = await fetch(`${BASE_URL}/v1/accounts`, {
      headers: {
        'Authorization': 'Bearer invalid_token',
      },
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error');
  });

  it('rejects missing authorization', async () => {
    const response = await fetch(`${BASE_URL}/v1/accounts`);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error');
  });
});

