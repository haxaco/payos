import { describe, it, expect, beforeAll } from 'vitest';
import { TEST_API_KEY, TEST_ACCOUNTS } from '../setup.js';

// Integration tests require the server to be running
// Run with: INTEGRATION=true pnpm test

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Accounts API Integration', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  describe('GET /v1/accounts', () => {
    it('returns a list of accounts', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('filters by type', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts?type=business`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((a: any) => a.type === 'business')).toBe(true);
    });

    it('supports pagination', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts?page=1&limit=2`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
    });

    it('supports search', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts?search=TechCorp`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.some((a: any) => a.name.includes('TechCorp'))).toBe(true);
    });
  });

  describe('GET /v1/accounts/:id', () => {
    it('returns account details', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe(TEST_ACCOUNTS.techcorp);
      expect(data.data.name).toBe('TechCorp Inc');
      expect(data.data).toHaveProperty('balance');
      expect(data.data).toHaveProperty('verification');
    });

    it('returns 404 for non-existent account', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/00000000-0000-0000-0000-000000000000`, { headers });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });

    it('returns 400 for invalid UUID', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/invalid-uuid`, { headers });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /v1/accounts', () => {
    it('creates a new account', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'person',
          name: `Test User ${Date.now()}`,
          email: `test${Date.now()}@example.com`,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toHaveProperty('id');
      expect(data.data.type).toBe('person');
      expect(data.data.balance.total).toBe(0);
    });

    it('validates required fields', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Missing Type',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('validates type enum', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'invalid_type',
          name: 'Invalid Type Test',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/accounts/:id/balances', () => {
    it('returns detailed balance breakdown', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}/balances`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('accountId');
      expect(data.data).toHaveProperty('balance');
      expect(data.data.balance).toHaveProperty('total');
      expect(data.data.balance).toHaveProperty('available');
      expect(data.data.balance).toHaveProperty('inStreams');
      expect(data.data).toHaveProperty('streams');
    });
  });

  describe('GET /v1/accounts/:id/agents', () => {
    it('returns account agents', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}/agents`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /v1/accounts/:id/streams', () => {
    it('returns account streams', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}/streams`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('filters by direction', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}/streams?direction=outgoing`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((s: any) => s.sender.accountId === TEST_ACCOUNTS.techcorp)).toBe(true);
    });
  });
});

