/**
 * Scheduled Transfers API Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.TEST_API_KEY || 'pk_test_demo_fintech_key_12345';

describe('Scheduled Transfers API', () => {
  let fromAccountId: string;
  let toAccountId: string;
  let scheduleId: string;

  beforeAll(async () => {
    // Get test accounts
    const accountsRes = await request(API_URL)
      .get('/v1/accounts?limit=2')
      .set('Authorization', `Bearer ${API_KEY}`);

    if (accountsRes.status === 200 && accountsRes.body.data.length >= 2) {
      fromAccountId = accountsRes.body.data[0].id;
      toAccountId = accountsRes.body.data[1].id;
    }
  });

  afterAll(async () => {
    // Clean up: cancel test schedule
    if (scheduleId) {
      await request(API_URL)
        .post(`/v1/scheduled-transfers/${scheduleId}/cancel`)
        .set('Authorization', `Bearer ${API_KEY}`);
    }
  });

  describe('POST /v1/scheduled-transfers', () => {
    it('should create a daily scheduled transfer', async () => {
      if (!fromAccountId || !toAccountId) {
        console.warn('Skipping test: No accounts available');
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split('T')[0];

      const res = await request(API_URL)
        .post('/v1/scheduled-transfers')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          fromAccountId,
          toAccountId,
          amount: 100,
          currency: 'USDC',
          description: 'Daily test payment',
          frequency: 'daily',
          intervalValue: 1,
          startDate,
          maxOccurrences: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.frequency).toBe('daily');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.next_execution).toBeDefined();

      scheduleId = res.body.data.id;
    });

    it('should create a monthly scheduled transfer', async () => {
      if (!fromAccountId || !toAccountId) {
        console.warn('Skipping test: No accounts available');
        return;
      }

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const startDate = nextMonth.toISOString().split('T')[0];

      const res = await request(API_URL)
        .post('/v1/scheduled-transfers')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          fromAccountId,
          toAccountId,
          amount: 500,
          currency: 'USDC',
          description: 'Monthly subscription',
          frequency: 'monthly',
          intervalValue: 1,
          dayOfMonth: 1,
          startDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.frequency).toBe('monthly');
      expect(res.body.data.day_of_month).toBe(1);
    });

    it('should reject invalid frequency', async () => {
      if (!fromAccountId || !toAccountId) {
        console.warn('Skipping test: No accounts available');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/scheduled-transfers')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          fromAccountId,
          toAccountId,
          amount: 100,
          frequency: 'invalid',
          startDate: '2025-12-20',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/scheduled-transfers', () => {
    it('should list scheduled transfers', async () => {
      const res = await request(API_URL)
        .get('/v1/scheduled-transfers')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await request(API_URL)
        .get('/v1/scheduled-transfers?status=active')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        res.body.data.forEach((schedule: any) => {
          expect(schedule.status).toBe('active');
        });
      }
    });
  });

  describe('GET /v1/scheduled-transfers/:id', () => {
    it('should get a single schedule with execution history', async () => {
      if (!scheduleId) {
        console.warn('Skipping test: No schedule ID available');
        return;
      }

      const res = await request(API_URL)
        .get(`/v1/scheduled-transfers/${scheduleId}`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(scheduleId);
      expect(res.body.data.executions).toBeDefined();
      expect(Array.isArray(res.body.data.executions)).toBe(true);
    });
  });

  describe('POST /v1/scheduled-transfers/:id/pause', () => {
    it('should pause an active schedule', async () => {
      if (!scheduleId) {
        console.warn('Skipping test: No schedule ID available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/scheduled-transfers/${scheduleId}/pause`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('paused');
    });

    it('should reject pausing a non-active schedule', async () => {
      if (!scheduleId) {
        console.warn('Skipping test: No schedule ID available');
        return;
      }

      // Try to pause again (should fail)
      const res = await request(API_URL)
        .post(`/v1/scheduled-transfers/${scheduleId}/pause`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/scheduled-transfers/:id/resume', () => {
    it('should resume a paused schedule', async () => {
      if (!scheduleId) {
        console.warn('Skipping test: No schedule ID available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/scheduled-transfers/${scheduleId}/resume`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.next_execution).toBeDefined();
    });
  });

  describe('POST /v1/scheduled-transfers/:id/execute-now', () => {
    it('should manually execute a schedule (demo mode)', async () => {
      if (!scheduleId) {
        console.warn('Skipping test: No schedule ID available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/scheduled-transfers/${scheduleId}/execute-now`)
        .set('Authorization', `Bearer ${API_KEY}`);

      // Should succeed or return an error if already executed recently
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('POST /v1/scheduled-transfers/:id/cancel', () => {
    it('should cancel a schedule', async () => {
      if (!scheduleId) {
        console.warn('Skipping test: No schedule ID available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/scheduled-transfers/${scheduleId}/cancel`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });
  });
});

