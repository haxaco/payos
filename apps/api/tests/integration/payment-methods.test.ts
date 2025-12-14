/**
 * Payment Methods API Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.TEST_API_KEY || 'pk_test_demo_fintech_key_12345';

describe('Payment Methods API', () => {
  let accountId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    // Get a test account
    const accountsRes = await request(API_URL)
      .get('/v1/accounts?limit=1')
      .set('Authorization', `Bearer ${API_KEY}`);

    if (accountsRes.status === 200 && accountsRes.body.data.length > 0) {
      accountId = accountsRes.body.data[0].id;
    }
  });

  afterAll(async () => {
    // Clean up: delete test payment method
    if (paymentMethodId) {
      await request(API_URL)
        .delete(`/v1/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${API_KEY}`);
    }
  });

  describe('POST /v1/accounts/:accountId/payment-methods', () => {
    it('should create a bank account payment method', async () => {
      if (!accountId) {
        console.warn('Skipping test: No account available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/accounts/${accountId}/payment-methods`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          type: 'bank_account',
          label: 'Primary Bank Account',
          bankAccountLastFour: '1234',
          bankName: 'Test Bank',
          bankCountry: 'US',
          bankCurrency: 'USD',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.type).toBe('bank_account');
      expect(res.body.data.bank_account_last_four).toBe('1234');
      expect(res.body.data.is_default).toBe(true);

      paymentMethodId = res.body.data.id;
    });

    it('should create a wallet payment method', async () => {
      if (!accountId) {
        console.warn('Skipping test: No account available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/accounts/${accountId}/payment-methods`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          type: 'wallet',
          label: 'Base Wallet',
          walletNetwork: 'base',
          walletAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('wallet');
      expect(res.body.data.wallet_network).toBe('base');
      expect(res.body.data.wallet_address).toBeDefined();
    });

    it('should reject invalid payment method type', async () => {
      if (!accountId) {
        console.warn('Skipping test: No account available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/accounts/${accountId}/payment-methods`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          type: 'invalid_type',
        });

      expect(res.status).toBe(400);
    });

    it('should reject bank account without required fields', async () => {
      if (!accountId) {
        console.warn('Skipping test: No account available');
        return;
      }

      const res = await request(API_URL)
        .post(`/v1/accounts/${accountId}/payment-methods`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          type: 'bank_account',
          // Missing bankAccountLastFour and bankName
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/accounts/:accountId/payment-methods', () => {
    it('should list payment methods for an account', async () => {
      if (!accountId) {
        console.warn('Skipping test: No account available');
        return;
      }

      const res = await request(API_URL)
        .get(`/v1/accounts/${accountId}/payment-methods`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /v1/payment-methods/:id', () => {
    it('should get a single payment method', async () => {
      if (!paymentMethodId) {
        console.warn('Skipping test: No payment method ID available');
        return;
      }

      const res = await request(API_URL)
        .get(`/v1/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(paymentMethodId);
    });
  });

  describe('PATCH /v1/payment-methods/:id', () => {
    it('should update payment method label', async () => {
      if (!paymentMethodId) {
        console.warn('Skipping test: No payment method ID available');
        return;
      }

      const res = await request(API_URL)
        .patch(`/v1/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          label: 'Updated Label',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.label).toBe('Updated Label');
    });

    it('should set payment method as default', async () => {
      if (!paymentMethodId) {
        console.warn('Skipping test: No payment method ID available');
        return;
      }

      const res = await request(API_URL)
        .patch(`/v1/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          isDefault: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.is_default).toBe(true);
    });
  });

  describe('DELETE /v1/payment-methods/:id', () => {
    it('should delete a payment method', async () => {
      // Create a new payment method to delete
      if (!accountId) {
        console.warn('Skipping test: No account available');
        return;
      }

      const createRes = await request(API_URL)
        .post(`/v1/accounts/${accountId}/payment-methods`)
        .set('Authorization', `Bearer ${API_KEY}`)
        .set('Content-Type', 'application/json')
        .send({
          type: 'wallet',
          walletNetwork: 'polygon',
          walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        });

      if (createRes.status === 201) {
        const methodId = createRes.body.data.id;

        const deleteRes = await request(API_URL)
          .delete(`/v1/payment-methods/${methodId}`)
          .set('Authorization', `Bearer ${API_KEY}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.data.deleted).toBe(true);
      }
    });
  });
});

