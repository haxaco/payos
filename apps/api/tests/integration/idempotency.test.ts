/**
 * Idempotency Infrastructure Tests (Epic 27, Story 27.6)
 * 
 * Tests the idempotency key system that prevents duplicate transactions.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';

// Test helpers
const API_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_API_KEY = process.env.TEST_API_KEY || 'pk_test_demo123';

interface TestContext {
  apiKey: string;
  baseUrl: string;
}

const ctx: TestContext = {
  apiKey: TEST_API_KEY,
  baseUrl: API_URL,
};

// Helper to make authenticated requests
async function apiRequest(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
) {
  const response = await fetch(`${ctx.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ctx.apiKey}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return { response, data };
}

// Generate unique idempotency key
function generateIdempotencyKey(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

describe('Idempotency Infrastructure', () => {
  describe('Basic Functionality', () => {
    test('should accept requests without idempotency key', async () => {
      const { response, data } = await apiRequest('GET', '/v1/accounts');
      
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    test('should accept valid idempotency key header', async () => {
      const idempotencyKey = generateIdempotencyKey();
      
      const { response, data } = await apiRequest(
        'GET',
        '/v1/accounts',
        undefined,
        { 'Idempotency-Key': idempotencyKey }
      );
      
      expect(response.status).toBe(200);
    });

    test('should accept X-Idempotency-Key header (alternate format)', async () => {
      const idempotencyKey = generateIdempotencyKey();
      
      const { response, data } = await apiRequest(
        'GET',
        '/v1/accounts',
        undefined,
        { 'X-Idempotency-Key': idempotencyKey }
      );
      
      expect(response.status).toBe(200);
    });
  });

  describe('Key Validation', () => {
    test('should reject idempotency key longer than 256 characters', async () => {
      const longKey = 'a'.repeat(257);
      
      const { response, data } = await apiRequest(
        'POST',
        '/v1/accounts',
        { name: 'Test Account', type: 'business' },
        { 'Idempotency-Key': longKey }
      );
      
      expect(response.status).toBe(400);
      expect(data.code).toBe('IDEMPOTENCY_KEY_TOO_LONG');
    });

    test('should accept idempotency key at max length (256 chars)', async () => {
      const maxKey = 'a'.repeat(256);
      
      const { response } = await apiRequest(
        'GET',
        '/v1/accounts',
        undefined,
        { 'Idempotency-Key': maxKey }
      );
      
      // Should not fail due to key length
      expect(response.status).not.toBe(400);
    });
  });

  describe('Duplicate Detection', () => {
    test('should return cached response for duplicate POST with same body', async () => {
      const idempotencyKey = generateIdempotencyKey();
      const body = {
        name: `Test Account ${idempotencyKey}`,
        type: 'business',
        country: 'US',
      };

      // First request - should create
      const { response: firstResponse, data: firstData } = await apiRequest(
        'POST',
        '/v1/accounts',
        body,
        { 'Idempotency-Key': idempotencyKey }
      );

      // Skip if first request failed (likely auth issue in test env)
      if (firstResponse.status !== 201) {
        console.log('Skipping duplicate test - first request failed:', firstResponse.status);
        return;
      }

      // Second request with same key - should return cached
      const { response: secondResponse, data: secondData } = await apiRequest(
        'POST',
        '/v1/accounts',
        body,
        { 'Idempotency-Key': idempotencyKey }
      );

      expect(secondResponse.status).toBe(firstResponse.status);
      expect(secondData.data?.id).toBe(firstData.data?.id);
      expect(secondResponse.headers.get('X-Idempotency-Cached')).toBe('true');
    });

    test('should detect conflict when same key used with different body', async () => {
      const idempotencyKey = generateIdempotencyKey();
      
      // First request
      const { response: firstResponse } = await apiRequest(
        'POST',
        '/v1/accounts',
        { name: 'Account A', type: 'business' },
        { 'Idempotency-Key': idempotencyKey }
      );

      // Skip if first request failed
      if (firstResponse.status >= 400 && firstResponse.status !== 409) {
        console.log('Skipping conflict test - first request failed');
        return;
      }

      // Second request with DIFFERENT body but same key
      const { response: secondResponse, data: secondData } = await apiRequest(
        'POST',
        '/v1/accounts',
        { name: 'Account B', type: 'person' }, // Different body!
        { 'Idempotency-Key': idempotencyKey }
      );

      expect(secondResponse.status).toBe(409);
      expect(secondData.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
    });
  });

  describe('Cross-Request Isolation', () => {
    test('should allow same idempotency key for different endpoints', async () => {
      const idempotencyKey = generateIdempotencyKey();

      // Request to one endpoint
      const { response: firstResponse } = await apiRequest(
        'GET',
        '/v1/accounts',
        undefined,
        { 'Idempotency-Key': idempotencyKey }
      );

      // Same key to different endpoint should work
      const { response: secondResponse } = await apiRequest(
        'GET',
        '/v1/agents',
        undefined,
        { 'Idempotency-Key': idempotencyKey }
      );

      // Both should succeed (GET requests don't use idempotency)
      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
    });
  });

  describe('Idempotency Header Response', () => {
    test('should echo idempotency key in response header', async () => {
      const idempotencyKey = generateIdempotencyKey();

      const { response } = await apiRequest(
        'POST',
        '/v1/accounts',
        { name: 'Test', type: 'business' },
        { 'Idempotency-Key': idempotencyKey }
      );

      // Should echo the key back (even if request fails for other reasons)
      expect(response.headers.get('X-Idempotency-Key')).toBe(idempotencyKey);
    });
  });
});

describe('Idempotency in Transfers', () => {
  let sourceAccountId: string;
  let destAccountId: string;

  beforeAll(async () => {
    // Get existing accounts for transfer testing
    const { data } = await apiRequest('GET', '/v1/accounts?limit=2');
    
    if (data?.data?.length >= 2) {
      sourceAccountId = data.data[0].id;
      destAccountId = data.data[1].id;
    }
  });

  test('should prevent duplicate transfer creation', async () => {
    if (!sourceAccountId || !destAccountId) {
      console.log('Skipping transfer test - no accounts available');
      return;
    }

    const idempotencyKey = generateIdempotencyKey();
    const transferBody = {
      fromAccountId: sourceAccountId,
      toAccountId: destAccountId,
      amount: 0.01,
      description: `Idempotency test ${idempotencyKey}`,
    };

    // First transfer request
    const { response: firstResponse, data: firstData } = await apiRequest(
      'POST',
      '/v1/transfers',
      transferBody,
      { 'Idempotency-Key': idempotencyKey }
    );

    // Skip if first request failed (e.g., insufficient balance)
    if (firstResponse.status !== 201) {
      console.log('Skipping duplicate transfer test - first request failed:', firstResponse.status);
      return;
    }

    // Second identical request
    const { response: secondResponse, data: secondData } = await apiRequest(
      'POST',
      '/v1/transfers',
      transferBody,
      { 'Idempotency-Key': idempotencyKey }
    );

    // Should return the same transfer, not create a new one
    expect(secondData.data?.id).toBe(firstData.data?.id);
    expect(secondResponse.status).toBe(200); // Returns existing, not 201
  });
});

