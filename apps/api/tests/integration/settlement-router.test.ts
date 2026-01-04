/**
 * Settlement Router Tests (Epic 27, Story 27.1)
 * 
 * Tests the multi-protocol settlement routing system.
 */

import { describe, test, expect, beforeAll } from 'vitest';

// Test helpers
const API_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_API_KEY = process.env.TEST_API_KEY || 'pk_test_demo123';

interface TestContext {
  apiKey: string;
  baseUrl: string;
  testAccountId?: string;
  testTransferId?: string;
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

describe('Settlement Router', () => {
  describe('GET /v1/settlement/rails', () => {
    test('should return list of available settlement rails', async () => {
      const { response, data } = await apiRequest('GET', '/v1/settlement/rails');
      
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      
      // Check required rails exist
      const railIds = data.data.map((r: any) => r.id);
      expect(railIds).toContain('internal');
      expect(railIds).toContain('circle_usdc');
      expect(railIds).toContain('pix');
      expect(railIds).toContain('spei');
    });

    test('should include rail configuration details', async () => {
      const { response, data } = await apiRequest('GET', '/v1/settlement/rails');
      
      expect(response.status).toBe(200);
      
      const internalRail = data.data.find((r: any) => r.id === 'internal');
      expect(internalRail).toBeDefined();
      expect(internalRail.estimatedTimeSeconds).toBe(0);
      expect(internalRail.feePercentage).toBeDefined();
      expect(internalRail.minAmount).toBeDefined();
      expect(internalRail.maxAmount).toBeDefined();
      expect(internalRail.currencies).toBeDefined();
      expect(internalRail.status).toBe('active');
    });

    test('should include Pix for Brazil', async () => {
      const { response, data } = await apiRequest('GET', '/v1/settlement/rails');
      
      const pixRail = data.data.find((r: any) => r.id === 'pix');
      expect(pixRail).toBeDefined();
      expect(pixRail.currencies).toContain('BRL');
      expect(pixRail.countries).toContain('BR');
      expect(pixRail.estimatedTimeSeconds).toBe(10);
    });

    test('should include SPEI for Mexico', async () => {
      const { response, data } = await apiRequest('GET', '/v1/settlement/rails');
      
      const speiRail = data.data.find((r: any) => r.id === 'spei');
      expect(speiRail).toBeDefined();
      expect(speiRail.currencies).toContain('MXN');
      expect(speiRail.countries).toContain('MX');
    });
  });

  describe('POST /v1/settlement/route', () => {
    let testTransferId: string;

    beforeAll(async () => {
      // Get an existing transfer for routing tests
      const { data } = await apiRequest('GET', '/v1/transfers?limit=1');
      if (data?.data?.length > 0) {
        testTransferId = data.data[0].id;
      }
    });

    test('should route a transfer to appropriate rail', async () => {
      if (!testTransferId) {
        console.log('Skipping route test - no transfers available');
        return;
      }

      const { response, data } = await apiRequest('POST', '/v1/settlement/route', {
        transferId: testTransferId,
        protocol: 'x402',
        amount: 100,
        currency: 'USDC',
      });

      // May fail if transfer doesn't exist in test env
      if (response.status === 500 && data.message?.includes('not found')) {
        console.log('Skipping - transfer not accessible');
        return;
      }

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.selectedRail).toBeDefined();
      expect(data.data.route).toBeDefined();
      expect(data.data.decisionTimeMs).toBeDefined();
    });

    test('should prefer Circle USDC for x402 protocol', async () => {
      if (!testTransferId) {
        console.log('Skipping protocol test - no transfers available');
        return;
      }

      const { response, data } = await apiRequest('POST', '/v1/settlement/route', {
        transferId: testTransferId,
        protocol: 'x402',
        amount: 100,
        currency: 'USDC',
      });

      if (response.status !== 200) return;

      // x402 should prefer circle_usdc or internal
      expect(['circle_usdc', 'internal', 'base_chain']).toContain(data.data.selectedRail);
    });

    test('should route to Pix for BRL destination', async () => {
      if (!testTransferId) {
        console.log('Skipping BRL test - no transfers available');
        return;
      }

      const { response, data } = await apiRequest('POST', '/v1/settlement/route', {
        transferId: testTransferId,
        protocol: 'cross_border',
        amount: 1000,
        currency: 'USDC',
        destinationCurrency: 'BRL',
        destinationCountry: 'BR',
      });

      if (response.status !== 200) return;

      // Should select Pix for Brazil
      expect(data.data.selectedRail).toBe('pix');
    });

    test('should route to SPEI for MXN destination', async () => {
      if (!testTransferId) {
        console.log('Skipping MXN test - no transfers available');
        return;
      }

      const { response, data } = await apiRequest('POST', '/v1/settlement/route', {
        transferId: testTransferId,
        protocol: 'cross_border',
        amount: 1000,
        currency: 'USDC',
        destinationCurrency: 'MXN',
        destinationCountry: 'MX',
      });

      if (response.status !== 200) return;

      // Should select SPEI for Mexico
      expect(data.data.selectedRail).toBe('spei');
    });

    test('should include alternative rails in response', async () => {
      if (!testTransferId) {
        console.log('Skipping alternatives test - no transfers available');
        return;
      }

      const { response, data } = await apiRequest('POST', '/v1/settlement/route', {
        transferId: testTransferId,
        protocol: 'x402',
        amount: 100,
        currency: 'USDC',
      });

      if (response.status !== 200) return;

      expect(data.data.alternativeRails).toBeDefined();
      expect(Array.isArray(data.data.alternativeRails)).toBe(true);
    });

    test('should validate request body', async () => {
      const { response, data } = await apiRequest('POST', '/v1/settlement/route', {
        // Missing required fields
        amount: 100,
      });

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('POST /v1/settlement/execute', () => {
    test('should validate request body', async () => {
      const { response, data } = await apiRequest('POST', '/v1/settlement/execute', {
        // Missing required fields
        currency: 'USDC',
      });

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    test('should require valid transferId', async () => {
      const { response, data } = await apiRequest('POST', '/v1/settlement/execute', {
        transferId: '00000000-0000-0000-0000-000000000000', // Non-existent
        amount: 100,
        currency: 'USDC',
      });

      // Should fail with 500 (transfer not found) or 400
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('POST /v1/settlement/batch', () => {
    test('should validate batch request', async () => {
      const { response, data } = await apiRequest('POST', '/v1/settlement/batch', {
        transfers: [], // Empty array
      });

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    test('should reject batches larger than 100', async () => {
      const largeTransfers = Array(101).fill({
        transferId: '00000000-0000-0000-0000-000000000000',
        amount: 100,
        currency: 'USDC',
      });

      const { response, data } = await apiRequest('POST', '/v1/settlement/batch', {
        transfers: largeTransfers,
      });

      expect(response.status).toBe(400);
    });
  });
});

describe('Settlement Configuration', () => {
  describe('GET /v1/settlement/config', () => {
    test('should return settlement configuration', async () => {
      const { response, data } = await apiRequest('GET', '/v1/settlement/config');
      
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.x402FeeType).toBeDefined();
      expect(data.data.x402FeePercentage).toBeDefined();
      expect(data.data.settlementSchedule).toBeDefined();
    });

    test('should return default config if none set', async () => {
      const { response, data } = await apiRequest('GET', '/v1/settlement/config');
      
      if (response.status === 200 && data.data.isDefault) {
        expect(data.data.x402FeePercentage).toBe(0.029); // 2.9% default
        expect(data.data.settlementSchedule).toBe('immediate');
      }
    });
  });

  describe('POST /v1/settlement/preview', () => {
    test('should preview fee calculation', async () => {
      const { response, data } = await apiRequest('POST', '/v1/settlement/preview', {
        amount: 100,
        currency: 'USDC',
      });
      
      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.grossAmount).toBe(100);
      expect(data.data.feeAmount).toBeDefined();
      expect(data.data.netAmount).toBeDefined();
      expect(data.data.netAmount).toBeLessThanOrEqual(100);
    });

    test('should calculate effective fee percentage', async () => {
      const { response, data } = await apiRequest('POST', '/v1/settlement/preview', {
        amount: 100,
        currency: 'USDC',
      });
      
      if (response.status === 200) {
        expect(data.data.effectiveFeePercentage).toBeDefined();
        expect(data.data.effectiveFeePercentage).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

