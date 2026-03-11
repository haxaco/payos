import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../src/app.js';

/**
 * Integration tests for the Usage API (Epic 65).
 * These tests verify the usage endpoints return correct structure.
 * Requires INTEGRATION=true and valid Supabase credentials.
 */

const SKIP = !process.env.INTEGRATION;

describe.skipIf(SKIP)('Usage API Integration', () => {
  const API_KEY = process.env.TEST_API_KEY || 'pk_test_demo';

  async function fetchUsage(path: string) {
    const res = await app.request(`/v1/usage${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    return { status: res.status, body: await res.json() };
  }

  describe('GET /v1/usage/summary', () => {
    it('returns usage summary structure', async () => {
      const { status, body } = await fetchUsage('/summary');
      expect(status).toBe(200);
      expect(body.data).toBeDefined();
      expect(body.data.period).toHaveProperty('start');
      expect(body.data.period).toHaveProperty('end');
      expect(typeof body.data.totalRequests).toBe('number');
      expect(typeof body.data.totalOperations).toBe('number');
      expect(typeof body.data.totalCostUsd).toBe('number');
      expect(body.data.byCategory).toBeDefined();
      expect(body.data.byProtocol).toBeDefined();
    });

    it('accepts custom date range', async () => {
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();
      const { status, body } = await fetchUsage(`/summary?start=${start}&end=${end}`);
      expect(status).toBe(200);
      expect(body.data.period.start).toBe(start);
    });
  });

  describe('GET /v1/usage/operations', () => {
    it('returns paginated operations', async () => {
      const { status, body } = await fetchUsage('/operations?limit=5');
      expect(status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.limit).toBe(5);
    });

    it('filters by category', async () => {
      const { status, body } = await fetchUsage('/operations?category=settlement');
      expect(status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /v1/usage/requests', () => {
    it('returns request aggregations', async () => {
      const { status, body } = await fetchUsage('/requests');
      expect(status).toBe(200);
      expect(body.data).toBeDefined();
      expect(body.data.groupBy).toBe('path_template');
      expect(body.data.aggregations).toBeDefined();
    });
  });

  describe('GET /v1/usage/costs', () => {
    it('returns cost breakdown', async () => {
      const { status, body } = await fetchUsage('/costs');
      expect(status).toBe(200);
      expect(body.data).toBeDefined();
      expect(typeof body.data.totalCostUsd).toBe('number');
      expect(body.data.byCategory).toBeDefined();
    });
  });
});
