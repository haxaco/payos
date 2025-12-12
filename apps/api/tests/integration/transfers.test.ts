import { describe, it, expect } from 'vitest';
import { TEST_API_KEY, TEST_ACCOUNTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Transfers API Integration', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  describe('GET /v1/transfers', () => {
    it('returns a list of transfers', async () => {
      const response = await fetch(`${BASE_URL}/v1/transfers`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('filters by status', async () => {
      const response = await fetch(`${BASE_URL}/v1/transfers?status=completed`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((t: any) => t.status === 'completed')).toBe(true);
    });
  });

  describe('POST /v1/internal-transfers', () => {
    it('creates an internal transfer', async () => {
      const response = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.carlos,
          amount: 10,
          description: 'Integration test transfer',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.status).toBe('completed');
      expect(data.data.type).toBe('internal');
      expect(data.data.amount).toBe(10);
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('processingTimeMs');
    });

    it('validates required fields', async () => {
      const response = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          // missing toAccountId and amount
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('prevents self-transfer', async () => {
      const response = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.techcorp,
          amount: 100,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('same account');
    });

    it('supports idempotency key', async () => {
      const idempotencyKey = `test-${Date.now()}`;
      
      // First request
      const response1 = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers: { ...headers, 'X-Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.maria,
          amount: 5,
          description: 'Idempotency test',
        }),
      });
      const data1 = await response1.json();

      // Second request with same key
      const response2 = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers: { ...headers, 'X-Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.maria,
          amount: 5,
          description: 'Idempotency test',
        }),
      });
      const data2 = await response2.json();

      expect(data1.data.id).toBe(data2.data.id);
    });
  });

  describe('GET /v1/quotes/rates', () => {
    it('returns current FX rates', async () => {
      const response = await fetch(`${BASE_URL}/v1/quotes/rates`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('baseCurrency', 'USD');
      expect(data.data).toHaveProperty('rates');
      expect(data.data.rates).toHaveProperty('MXN');
      expect(data.data.rates).toHaveProperty('BRL');
    });
  });

  describe('POST /v1/quotes', () => {
    it('creates an FX quote', async () => {
      const response = await fetch(`${BASE_URL}/v1/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromCurrency: 'USD',
          toCurrency: 'MXN',
          amount: 1000,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('fxRate');
      expect(data.data).toHaveProperty('fees');
      expect(data.data).toHaveProperty('toAmount');
      expect(data.data).toHaveProperty('expiresAt');
      expect(data.data.toAmount).toBeGreaterThan(1000); // MXN should be > USD
    });
  });
});

