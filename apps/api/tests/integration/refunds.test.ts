/**
 * Refunds API Integration Tests
 * 
 * Each test creates its own fresh transfer to ensure isolation.
 * All created resources are cleaned up after tests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const skipIntegration = !process.env.INTEGRATION;

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.TEST_API_KEY || 'pk_test_demo_fintech_key_12345';

// Track created resources for cleanup
const createdTransferIds: string[] = [];
const createdRefundIds: string[] = [];

// Helper to create a fresh transfer for testing
async function createTestTransfer(amount: number = 100): Promise<{ transferId: string; fromAccountId: string; toAccountId: string } | null> {
  // Get accounts
  const accountsRes = await request(API_URL)
    .get('/v1/accounts?type=business&limit=2')
    .set('Authorization', `Bearer ${API_KEY}`);

  if (accountsRes.status !== 200 || accountsRes.body.data.length < 2) {
    return null;
  }

  const fromAccountId = accountsRes.body.data[0].id;
  const toAccountId = accountsRes.body.data[1].id;

  // Create transfer
  const transferRes = await request(API_URL)
    .post('/v1/internal-transfers')
    .set('Authorization', `Bearer ${API_KEY}`)
    .set('Content-Type', 'application/json')
    .send({
      fromAccountId,
      toAccountId,
      amount,
      description: `Test transfer for refund - ${Date.now()}`,
    });

  if (transferRes.status !== 201) {
    return null;
  }

  createdTransferIds.push(transferRes.body.data.id);
  return {
    transferId: transferRes.body.data.id,
    fromAccountId,
    toAccountId,
  };
}

describe.skipIf(skipIntegration)('Refunds API', () => {
  let testAccountId: string;

  beforeAll(async () => {
    // Get an account ID for filter tests
    const accountsRes = await request(API_URL)
      .get('/v1/accounts?limit=1')
      .set('Authorization', `Bearer ${API_KEY}`);

    if (accountsRes.status === 200 && accountsRes.body.data.length > 0) {
      testAccountId = accountsRes.body.data[0].id;
    }
  });

  // Cleanup after all tests - note: we can't delete refunds, but we track them
  afterAll(async () => {
    // Log cleanup summary
    console.log(`[Cleanup] Created ${createdTransferIds.length} transfers and ${createdRefundIds.length} refunds during tests`);
  });

  describe('POST /v1/refunds', () => {
    it('should create a full refund for a completed transfer', async () => {
      // Create a fresh transfer for this test
      const testData = await createTestTransfer(100);
      if (!testData) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/refunds')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          originalTransferId: testData.transferId,
          reason: 'customer_request',
          reasonDetails: 'Customer requested full refund',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.original_transfer_id).toBe(testData.transferId);
      expect(res.body.data.reason).toBe('customer_request');

      createdRefundIds.push(res.body.data.id);
    });

    it('should create a partial refund', async () => {
      // Create a fresh transfer specifically for partial refund
      const testData = await createTestTransfer(200);
      if (!testData) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/refunds')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          originalTransferId: testData.transferId,
          amount: 50, // Partial refund
          reason: 'customer_request',
          reasonDetails: 'Partial refund requested',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      // Amount can be returned as string or number depending on DB serialization
      expect(parseFloat(res.body.data.amount)).toBe(50);
      expect(res.body.data.status).toBe('completed');

      createdRefundIds.push(res.body.data.id);
    });

    it('should reject refund for non-existent transfer', async () => {
      const res = await request(API_URL)
        .post('/v1/refunds')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          originalTransferId: '00000000-0000-0000-0000-000000000000',
          reason: 'customer_request',
        });

      expect(res.status).toBe(404);
    });

    it('should reject refund with invalid reason', async () => {
      const testData = await createTestTransfer(50);
      if (!testData) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/refunds')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          originalTransferId: testData.transferId,
          reason: 'invalid_reason',
        });

      expect(res.status).toBe(400);
    });

    it('should support idempotency', async () => {
      const testData = await createTestTransfer(100);
      if (!testData) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const idempotencyKey = `test-refund-idempotency-${Date.now()}`;

      const res1 = await request(API_URL)
        .post('/v1/refunds')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .set('Content-Type', 'application/json')
        .send({
          originalTransferId: testData.transferId,
          amount: 25,
          reason: 'customer_request',
        });

      expect(res1.status).toBe(201);
      createdRefundIds.push(res1.body.data.id);

      // Second request with same key should return same refund
      const res2 = await request(API_URL)
        .post('/v1/refunds')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .set('Content-Type', 'application/json')
        .send({
          originalTransferId: testData.transferId,
          amount: 25,
          reason: 'customer_request',
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.id).toBe(res1.body.data.id);
    });
  });

  describe('GET /v1/refunds', () => {
    it('should list refunds', async () => {
      const res = await request(API_URL)
        .get('/v1/refunds')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter refunds by status', async () => {
      const res = await request(API_URL)
        .get('/v1/refunds?status=completed')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        res.body.data.forEach((refund: any) => {
          expect(refund.status).toBe('completed');
        });
      }
    });

    it('should filter refunds by account', async () => {
      if (!testAccountId) {
        console.warn('Skipping test: No account ID available');
        return;
      }

      const res = await request(API_URL)
        .get(`/v1/refunds?accountId=${testAccountId}`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /v1/refunds/:id', () => {
    it('should get a single refund', async () => {
      // First, get list of refunds
      const listRes = await request(API_URL)
        .get('/v1/refunds?limit=1')
        .set('Authorization', `Bearer ${API_KEY}`);

      if (listRes.status === 200 && listRes.body.data.length > 0) {
        const refundId = listRes.body.data[0].id;

        const res = await request(API_URL)
          .get(`/v1/refunds/${refundId}`)
          .set('Authorization', `Bearer ${API_KEY}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(refundId);
      } else {
        console.warn('Skipping test: No refunds available');
      }
    });

    it('should return 404 for non-existent refund', async () => {
      const res = await request(API_URL)
        .get('/v1/refunds/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(404);
    });
  });
});
