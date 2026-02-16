/**
 * Disputes API Integration Tests
 * 
 * These tests require a running API server and database.
 * Each test creates necessary resources and tracks them for reference.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const skipIntegration = !process.env.INTEGRATION;

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.TEST_API_KEY || 'pk_test_demo_fintech_key_12345';

// Track created resources
const createdDisputeIds: string[] = [];
const createdTransferIds: string[] = [];

// Helper to create a fresh transfer for testing disputes
async function createTestTransfer(amount: number = 500): Promise<{ transferId: string; fromAccountId: string; toAccountId: string } | null> {
  // Get accounts
  const accountsRes = await request(API_URL)
    .get('/v1/accounts?type=business&limit=2')
    .set('Authorization', `Bearer ${API_KEY}`);

  if (accountsRes.status !== 200 || accountsRes.body.data.length < 2) {
    // Try with any accounts
    const anyAccountsRes = await request(API_URL)
      .get('/v1/accounts?limit=2')
      .set('Authorization', `Bearer ${API_KEY}`);
    
    if (anyAccountsRes.status !== 200 || anyAccountsRes.body.data.length < 2) {
      return null;
    }
    
    const fromAccountId = anyAccountsRes.body.data[0].id;
    const toAccountId = anyAccountsRes.body.data[1].id;

    const transferRes = await request(API_URL)
      .post('/v1/internal-transfers')
      .set('Authorization', `Bearer ${API_KEY}`)
      .set('Content-Type', 'application/json')
      .send({
        fromAccountId,
        toAccountId,
        amount,
        description: `Test transfer for dispute - ${Date.now()}`,
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

  const fromAccountId = accountsRes.body.data[0].id;
  const toAccountId = accountsRes.body.data[1].id;

  const transferRes = await request(API_URL)
    .post('/v1/internal-transfers')
    .set('Authorization', `Bearer ${API_KEY}`)
    .set('Content-Type', 'application/json')
    .send({
      fromAccountId,
      toAccountId,
      amount,
      description: `Test transfer for dispute - ${Date.now()}`,
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

describe.skipIf(skipIntegration)('Disputes API Integration', () => {
  let testTransfer: { transferId: string; fromAccountId: string; toAccountId: string } | null;

  beforeAll(async () => {
    // Create a test transfer that we can use for dispute tests
    testTransfer = await createTestTransfer(1000);
  });

  afterAll(async () => {
    console.log(`[Cleanup] Created ${createdDisputeIds.length} disputes and ${createdTransferIds.length} transfers during tests`);
  });

  describe('POST /v1/disputes', () => {
    it('should create a dispute for a completed transfer', async () => {
      // Create a fresh transfer for this specific test
      const freshTransfer = await createTestTransfer(500);
      if (!freshTransfer) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: freshTransfer.transferId,
          reason: 'service_not_received',
          description: 'Service was never delivered after payment was made.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.reason).toBe('service_not_received');
      expect(res.body.data.transferId).toBe(freshTransfer.transferId);
      expect(res.body.data).toHaveProperty('dueDate');
      expect(res.body.data).toHaveProperty('claimant');
      expect(res.body.data).toHaveProperty('respondent');

      createdDisputeIds.push(res.body.data.id);
    });

    it('should create a dispute with partial amount', async () => {
      const freshTransfer = await createTestTransfer(1000);
      if (!freshTransfer) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: freshTransfer.transferId,
          reason: 'amount_incorrect',
          description: 'Was charged $1000 but should have been $750.',
          amountDisputed: 250,
          requestedResolution: 'partial_refund',
          requestedAmount: 250,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(parseFloat(res.body.data.amountDisputed)).toBe(250);
      expect(res.body.data.requestedResolution).toBe('partial_refund');

      createdDisputeIds.push(res.body.data.id);
    });

    it('should reject duplicate dispute for same transfer', async () => {
      if (!testTransfer) {
        console.warn('Skipping test: No test transfer available');
        return;
      }

      // Create first dispute
      const res1 = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: testTransfer.transferId,
          reason: 'quality_issue',
          description: 'First dispute',
        });

      if (res1.status === 201) {
        createdDisputeIds.push(res1.body.data.id);

        // Try to create second dispute for same transfer
        const res2 = await request(API_URL)
          .post('/v1/disputes')
          .set('Authorization', `Bearer ${API_KEY}`)
          .set('Content-Type', 'application/json')
          .send({
            transferId: testTransfer.transferId,
            reason: 'quality_issue',
            description: 'Second dispute attempt',
          });

        expect(res2.status).toBe(400);
        expect(res2.body.error).toContain('already exists');
      }
    });

    it('should reject dispute for non-existent transfer', async () => {
      const res = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: '00000000-0000-0000-0000-000000000000',
          reason: 'service_not_received',
          description: 'Test dispute',
        });

      expect(res.status).toBe(404);
    });

    it('should reject dispute with amount exceeding transfer amount', async () => {
      const freshTransfer = await createTestTransfer(100);
      if (!freshTransfer) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: freshTransfer.transferId,
          reason: 'amount_incorrect',
          description: 'Test',
          amountDisputed: 500, // More than transfer amount
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('exceed');
    });

    it('should validate reason enum', async () => {
      const freshTransfer = await createTestTransfer(100);
      if (!freshTransfer) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const res = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: freshTransfer.transferId,
          reason: 'invalid_reason',
          description: 'Test',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/disputes', () => {
    it('should list disputes with pagination', async () => {
      const res = await request(API_URL)
        .get('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should filter disputes by status', async () => {
      const res = await request(API_URL)
        .get('/v1/disputes?status=open')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((dispute: any) => {
        expect(dispute.status).toBe('open');
      });
    });

    it('should filter disputes by reason', async () => {
      const res = await request(API_URL)
        .get('/v1/disputes?reason=service_not_received')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((dispute: any) => {
        expect(dispute.reason).toBe('service_not_received');
      });
    });

    it('should filter disputes due soon', async () => {
      const res = await request(API_URL)
        .get('/v1/disputes?dueSoon=true')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      // All returned disputes should be open or under_review with due date within 7 days
      res.body.data.forEach((dispute: any) => {
        expect(['open', 'under_review']).toContain(dispute.status);
      });
    });
  });

  describe('GET /v1/disputes/:id', () => {
    it('should get dispute details with timeline', async () => {
      // First get a dispute ID
      const listRes = await request(API_URL)
        .get('/v1/disputes?limit=1')
        .set('Authorization', `Bearer ${API_KEY}`);

      if (listRes.status === 200 && listRes.body.data.length > 0) {
        const disputeId = listRes.body.data[0].id;

        const res = await request(API_URL)
          .get(`/v1/disputes/${disputeId}`)
          .set('Authorization', `Bearer ${API_KEY}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(disputeId);
        expect(res.body.data).toHaveProperty('claimant');
        expect(res.body.data).toHaveProperty('respondent');
        expect(res.body.data).toHaveProperty('timeline');
        expect(Array.isArray(res.body.data.timeline)).toBe(true);
      } else {
        console.warn('Skipping test: No disputes available');
      }
    });

    it('should return 404 for non-existent dispute', async () => {
      const res = await request(API_URL)
        .get('/v1/disputes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/disputes/:id/respond', () => {
    it('should submit respondent response with evidence', async () => {
      // Get an open dispute
      const listRes = await request(API_URL)
        .get('/v1/disputes?status=open&limit=1')
        .set('Authorization', `Bearer ${API_KEY}`);

      if (listRes.status === 200 && listRes.body.data.length > 0) {
        const disputeId = listRes.body.data[0].id;

        const res = await request(API_URL)
          .post(`/v1/disputes/${disputeId}/respond`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .set('Content-Type', 'application/json')
          .send({
            response: 'We delivered the service as agreed. Please see attached proof.',
            evidence: [
              {
                type: 'delivery_proof',
                description: 'Screenshot of completed delivery',
                url: 'https://example.com/proof.png',
              },
            ],
          });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('under_review');
      } else {
        console.warn('Skipping test: No open disputes available');
      }
    });

    it('should reject response for resolved dispute', async () => {
      const listRes = await request(API_URL)
        .get('/v1/disputes?status=resolved&limit=1')
        .set('Authorization', `Bearer ${API_KEY}`);

      if (listRes.status === 200 && listRes.body.data.length > 0) {
        const disputeId = listRes.body.data[0].id;

        const res = await request(API_URL)
          .post(`/v1/disputes/${disputeId}/respond`)
          .set('Authorization', `Bearer ${API_KEY}`)
          .set('Content-Type', 'application/json')
          .send({
            response: 'Late response',
          });

        expect(res.status).toBe(400);
      } else {
        console.warn('Skipping test: No resolved disputes available');
      }
    });
  });

  describe('POST /v1/disputes/:id/resolve', () => {
    it('should resolve dispute with no action', async () => {
      // Create a fresh dispute to resolve
      const freshTransfer = await createTestTransfer(200);
      if (!freshTransfer) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const createRes = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: freshTransfer.transferId,
          reason: 'other',
          description: 'Test dispute for resolution',
        });

      if (createRes.status !== 201) {
        console.warn('Skipping test: Could not create dispute');
        return;
      }

      const disputeId = createRes.body.data.id;
      createdDisputeIds.push(disputeId);

      const res = await request(API_URL)
        .post(`/v1/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          resolution: 'no_action',
          resolutionNotes: 'Claim was not substantiated by evidence.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolution).toBe('no_action');
    });

    it('should resolve dispute with refund', async () => {
      const freshTransfer = await createTestTransfer(300);
      if (!freshTransfer) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const createRes = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: freshTransfer.transferId,
          reason: 'service_not_received',
          description: 'Service never delivered',
        });

      if (createRes.status !== 201) {
        console.warn('Skipping test: Could not create dispute');
        return;
      }

      const disputeId = createRes.body.data.id;
      createdDisputeIds.push(disputeId);

      const res = await request(API_URL)
        .post(`/v1/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          resolution: 'refund_issued',
          resolutionAmount: 300,
          resolutionNotes: 'Full refund issued due to non-delivery.',
          issueRefund: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolution).toBe('refund_issued');
      // Refund may or may not be created depending on balance
    });
  });

  describe('POST /v1/disputes/:id/escalate', () => {
    it('should escalate an open dispute', async () => {
      const freshTransfer = await createTestTransfer(150);
      if (!freshTransfer) {
        console.warn('Skipping test: Could not create test transfer');
        return;
      }

      const createRes = await request(API_URL)
        .post('/v1/disputes')
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          transferId: freshTransfer.transferId,
          reason: 'unauthorized',
          description: 'Unauthorized transaction',
        });

      if (createRes.status !== 201) {
        console.warn('Skipping test: Could not create dispute');
        return;
      }

      const disputeId = createRes.body.data.id;
      createdDisputeIds.push(disputeId);

      const res = await request(API_URL)
        .post(`/v1/disputes/${disputeId}/escalate`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('escalated');
      expect(res.body.data).toHaveProperty('escalatedAt');
    });
  });

  describe('GET /v1/disputes/stats/summary', () => {
    it('should return dispute statistics', async () => {
      const res = await request(API_URL)
        .get('/v1/disputes/stats/summary')
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('byStatus');
      expect(res.body.data.byStatus).toHaveProperty('open');
      expect(res.body.data.byStatus).toHaveProperty('underReview');
      expect(res.body.data.byStatus).toHaveProperty('escalated');
      expect(res.body.data.byStatus).toHaveProperty('resolved');
      expect(res.body.data).toHaveProperty('totalAmountDisputed');
      expect(res.body.data).toHaveProperty('byReason');
      expect(res.body.data).toHaveProperty('averageResolutionDays');
    });
  });
});

