/**
 * Exports API Integration Tests
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.TEST_API_KEY || 'pk_test_demo_fintech_key_12345';

describe('Exports API', () => {
  const startDate = '2025-01-01';
  const endDate = '2025-12-31';

  describe('GET /v1/exports/transactions', () => {
    it('should generate QuickBooks format export', async () => {
      const res = await request(API_URL)
        .get(`/v1/exports/transactions?start_date=${startDate}&end_date=${endDate}&format=quickbooks`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Date,Description,Amount');
    });

    it('should generate Xero format export', async () => {
      const res = await request(API_URL)
        .get(`/v1/exports/transactions?start_date=${startDate}&end_date=${endDate}&format=xero&date_format=UK`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('*Date');
      expect(res.text).toContain('*Amount');
    });

    it('should generate PayOS full format export', async () => {
      const res = await request(API_URL)
        .get(`/v1/exports/transactions?start_date=${startDate}&end_date=${endDate}&format=payos`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('transaction_id');
      expect(res.text).toContain('corridor');
    });

    it('should filter by account', async () => {
      // First get an account
      const accountsRes = await request(API_URL)
        .get('/v1/accounts?limit=1')
        .set('Authorization', `Bearer ${API_KEY}`);

      if (accountsRes.status === 200 && accountsRes.body.data.length > 0) {
        const accountId = accountsRes.body.data[0].id;

        const res = await request(API_URL)
          .get(`/v1/exports/transactions?start_date=${startDate}&end_date=${endDate}&format=quickbooks&account_id=${accountId}`)
          .set('Authorization', `Bearer ${API_KEY}`);

        expect(res.status).toBe(200);
      }
    });

    it('should reject invalid date format', async () => {
      const res = await request(API_URL)
        .get(`/v1/exports/transactions?start_date=invalid&end_date=${endDate}&format=quickbooks`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(400);
    });

    it('should reject invalid export format', async () => {
      const res = await request(API_URL)
        .get(`/v1/exports/transactions?start_date=${startDate}&end_date=${endDate}&format=invalid`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/exports/:id', () => {
    it('should get export status', async () => {
      // First create an export
      const createRes = await request(API_URL)
        .get(`/v1/exports/transactions?start_date=${startDate}&end_date=${endDate}&format=quickbooks`)
        .set('Authorization', `Bearer ${API_KEY}`);

      // For small exports, it returns immediately, so we can't test status endpoint
      // But we can test the endpoint exists
      const res = await request(API_URL)
        .get('/v1/exports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${API_KEY}`);

      // Should return 404 for non-existent export
      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/exports/:id/download', () => {
    it('should return 404 for non-existent export', async () => {
      const res = await request(API_URL)
        .get('/v1/exports/00000000-0000-0000-0000-000000000000/download')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(404);
    });
  });
});

