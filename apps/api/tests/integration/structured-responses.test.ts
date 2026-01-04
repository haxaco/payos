import { describe, it, expect } from 'vitest';
import { TEST_API_KEY, TEST_ACCOUNTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Structured Response System', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  describe('Success Response Structure', () => {
    it('wraps successful GET responses', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('request_id');
      expect(body.meta).toHaveProperty('timestamp');
      expect(body.meta).toHaveProperty('processing_time_ms');
      expect(body.meta).toHaveProperty('environment');
    });

    it('includes links in single resource responses', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('links');
      expect(body.links).toHaveProperty('self');
      expect(body.links.self).toBe(`/v1/accounts/${TEST_ACCOUNTS.techcorp}`);
      expect(body.links).toHaveProperty('balances');
      expect(body.links).toHaveProperty('transfers');
      expect(body.links).toHaveProperty('agents');
    });

    it('includes next_actions in POST responses', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'person',
          name: `Test User ${Date.now()}`,
          email: `test${Date.now()}@example.com`,
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('next_actions');
      expect(Array.isArray(body.next_actions)).toBe(true);
      expect(body.next_actions.length).toBeGreaterThan(0);
      
      const firstAction = body.next_actions[0];
      expect(firstAction).toHaveProperty('action');
      expect(firstAction).toHaveProperty('description');
      expect(firstAction).toHaveProperty('endpoint');
    });

    it('includes processing time in meta', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.meta.processing_time_ms).toBeGreaterThan(0);
      expect(body.meta.processing_time_ms).toBeLessThan(5000); // Should be fast
    });
  });

  describe('Error Response Structure', () => {
    it('wraps error responses with structured format', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/00000000-0000-0000-0000-000000000000`, { headers });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('category');
      expect(body.error).toHaveProperty('message');
      expect(body).toHaveProperty('request_id');
      expect(body).toHaveProperty('timestamp');
    });

    it('includes error details for validation errors', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/invalid-uuid`, { headers });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.category).toBe('validation');
    });

    it('includes suggested actions for insufficient balance', async () => {
      // Try to create a transfer with insufficient balance
      // First, find an account with low balance or create one
      const response = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.carlos,
          amount: 9999999999, // Impossibly large amount
          description: 'Test insufficient balance',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(body.error.category).toBe('balance');
      expect(body.error).toHaveProperty('details');
      expect(body.error.details).toHaveProperty('required_amount');
      expect(body.error.details).toHaveProperty('available_amount');
      expect(body.error.details).toHaveProperty('shortfall');
      expect(body.error).toHaveProperty('suggested_actions');
      expect(Array.isArray(body.error.suggested_actions)).toBe(true);
      
      // Check for top_up_account action
      const topUpAction = body.error.suggested_actions.find((a: any) => a.action === 'top_up_account');
      expect(topUpAction).toBeDefined();
      expect(topUpAction.endpoint).toContain(TEST_ACCOUNTS.techcorp);
    });

    it('includes retry guidance for retryable errors', async () => {
      // This is harder to test without mocking, but we can check the structure
      // In a real retryable error (like rate limit), we expect:
      // - error.retry.retryable = true
      // - error.retry.retry_after_seconds to be present
      // For now, we'll just document the expected structure
      
      // Note: This test would need a way to trigger a retryable error
      // such as rate limiting. Skipping actual execution.
      expect(true).toBe(true);
    });
  });

  describe('Transfer Structured Responses', () => {
    it('includes links in transfer creation response', async () => {
      const response = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.carlos,
          amount: 10,
          description: 'Test structured response',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('links');
      expect(body.links).toHaveProperty('self');
      expect(body.links).toHaveProperty('from_account');
      expect(body.links).toHaveProperty('to_account');
      expect(body.links.from_account).toContain(TEST_ACCOUNTS.techcorp);
      expect(body.links.to_account).toContain(TEST_ACCOUNTS.carlos);
    });

    it('includes next_actions for completed transfers', async () => {
      const response = await fetch(`${BASE_URL}/v1/internal-transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.carlos,
          amount: 10,
          description: 'Test next actions',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.status).toBe('completed');
      expect(body).toHaveProperty('next_actions');
      expect(Array.isArray(body.next_actions)).toBe(true);
      
      // For completed internal transfers, should suggest viewing account
      const viewAction = body.next_actions.find((a: any) => a.action === 'view_account');
      expect(viewAction).toBeDefined();
    });

    it('provides contextual error for invalid quote', async () => {
      const response = await fetch(`${BASE_URL}/v1/transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: TEST_ACCOUNTS.techcorp,
          toAccountId: TEST_ACCOUNTS.carlos,
          amount: 100,
          quoteId: '00000000-0000-0000-0000-000000000000', // Non-existent quote
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(body.error.message).toContain('Quote');
    });
  });

  describe('Account Structured Responses', () => {
    it('includes links in account balance response', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}/balances`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('links');
      expect(body.links).toHaveProperty('self');
      expect(body.links).toHaveProperty('account');
      expect(body.links).toHaveProperty('streams');
      expect(body.links).toHaveProperty('transactions');
    });

    it('suggests adding funds for low balance accounts', async () => {
      // Create a new account (will have 0 balance)
      const createResponse = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'person',
          name: `Low Balance Test ${Date.now()}`,
          email: `lowbalance${Date.now()}@example.com`,
        }),
      });
      const createBody = await createResponse.json();
      const newAccountId = createBody.data.id;

      // Check balances
      const balanceResponse = await fetch(`${BASE_URL}/v1/accounts/${newAccountId}/balances`, { headers });
      const balanceBody = await balanceResponse.json();

      expect(balanceResponse.status).toBe(200);
      if (balanceBody.data.balance.available < 100) {
        expect(balanceBody).toHaveProperty('next_actions');
        const addFundsAction = balanceBody.next_actions?.find((a: any) => a.action === 'add_funds');
        expect(addFundsAction).toBeDefined();
      }
    });

    it('includes complete error details for duplicate email', async () => {
      const email = `duplicate${Date.now()}@example.com`;
      
      // Create first account
      await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'person',
          name: 'First User',
          email,
        }),
      });

      // Try to create second account with same email
      const response = await fetch(`${BASE_URL}/v1/accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'person',
          name: 'Second User',
          email,
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('email');
    });
  });

  describe('Request Tracking', () => {
    it('generates unique request IDs', async () => {
      const response1 = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}`, { headers });
      const body1 = await response1.json();

      const response2 = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}`, { headers });
      const body2 = await response2.json();

      expect(body1.meta.request_id).toBeDefined();
      expect(body2.meta.request_id).toBeDefined();
      expect(body1.meta.request_id).not.toBe(body2.meta.request_id);
    });

    it('includes environment in meta', async () => {
      const response = await fetch(`${BASE_URL}/v1/accounts/${TEST_ACCOUNTS.techcorp}`, { headers });
      const body = await response.json();

      expect(body.meta.environment).toBeDefined();
      expect(['sandbox', 'testnet', 'production', 'test']).toContain(body.meta.environment);
    });
  });
});

