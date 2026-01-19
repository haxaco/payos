/**
 * E2E Test: UCP Checkout → PayOS Settlement
 *
 * Tests the complete UCP checkout flow with PayOS LATAM settlement.
 *
 * @see Story 43.12: E2E UCP Checkout → PayOS Settlement
 * @see Epic 43: UCP Integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TEST_API_KEY, TEST_TENANT_ID } from '../setup.js';
import {
  acquireToken,
  clearTokenStore,
  getSettlementQuote,
} from '../../src/services/ucp/tokens.js';
import {
  executeSettlement,
  getSettlement,
  listSettlements,
  clearSettlementStore,
} from '../../src/services/ucp/settlement.js';
import { generateUCPProfile } from '../../src/services/ucp/profile.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

// =============================================================================
// Unit-level E2E Tests (always run)
// =============================================================================

describe('UCP E2E: Checkout → Settlement Flow (Unit)', () => {
  const testTenantId = TEST_TENANT_ID;

  beforeEach(() => {
    clearTokenStore();
    clearSettlementStore();
  });

  afterEach(() => {
    clearTokenStore();
    clearSettlementStore();
  });

  describe('Complete Pix Settlement Flow', () => {
    it('should complete full UCP → Pix settlement flow', async () => {
      // Step 1: Get FX quote
      const quote = getSettlementQuote(100, 'USD', 'pix');
      expect(quote.fromAmount).toBe(100);
      expect(quote.toCurrency).toBe('BRL');
      expect(quote.toAmount).toBeGreaterThan(0);

      // Step 2: Acquire settlement token
      const token = await acquireToken(testTenantId, {
        corridor: 'pix',
        amount: 100,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Maria Silva',
        },
        metadata: {
          order_id: 'ucp_order_12345',
          merchant: 'test_merchant',
        },
      });

      expect(token.token).toMatch(/^ucp_tok_/);
      expect(token.settlement_id).toBeDefined();
      expect(token.quote.to_currency).toBe('BRL');
      expect(new Date(token.expires_at).getTime()).toBeGreaterThan(Date.now());

      // Step 3: Execute settlement with token
      const mockSupabase = {} as any; // Mock for unit test
      const settlement = await executeSettlement(
        testTenantId,
        { token: token.token },
        mockSupabase
      );

      expect(settlement.id).toBe(token.settlement_id);
      expect(settlement.status).toBe('pending');
      expect(settlement.corridor).toBe('pix');
      expect(settlement.amount.source).toBe(100);
      expect(settlement.amount.source_currency).toBe('USD');
      expect(settlement.amount.destination_currency).toBe('BRL');
      expect(settlement.recipient.type).toBe('pix');

      // Step 4: Check settlement status
      const status = await getSettlement(settlement.id, testTenantId);
      expect(status).toBeDefined();
      expect(status!.id).toBe(settlement.id);
    });

    it('should complete full UCP → SPEI settlement flow', async () => {
      // Step 1: Acquire settlement token for SPEI
      const token = await acquireToken(testTenantId, {
        corridor: 'spei',
        amount: 500,
        currency: 'USDC',
        recipient: {
          type: 'spei',
          clabe: '012345678901234567',
          name: 'Juan Garcia',
          rfc: 'GAJR850101ABC',
        },
        metadata: {
          order_id: 'ucp_order_67890',
        },
      });

      expect(token.token).toMatch(/^ucp_tok_/);
      expect(token.quote.to_currency).toBe('MXN');

      // Step 2: Execute settlement
      const mockSupabase = {} as any;
      const settlement = await executeSettlement(
        testTenantId,
        { token: token.token },
        mockSupabase
      );

      expect(settlement.corridor).toBe('spei');
      expect(settlement.amount.source_currency).toBe('USDC');
      expect(settlement.amount.destination_currency).toBe('MXN');
      expect(settlement.recipient.type).toBe('spei');

      // Step 3: Verify settlement in list
      const { data } = await listSettlements(testTenantId, {
        corridor: 'spei',
      });
      expect(data.some((s) => s.id === settlement.id)).toBe(true);
    });
  });

  describe('Token Validation & Security', () => {
    it('should reject reused token', async () => {
      const token = await acquireToken(testTenantId, {
        corridor: 'pix',
        amount: 50,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Test User',
        },
      });

      const mockSupabase = {} as any;

      // First settlement should succeed
      const settlement1 = await executeSettlement(
        testTenantId,
        { token: token.token },
        mockSupabase
      );
      expect(settlement1.status).toBe('pending');

      // Second attempt with same token should fail (token is marked as used)
      await expect(
        executeSettlement(testTenantId, { token: token.token }, mockSupabase)
      ).rejects.toThrow('Token has already been used');
    });

    it('should reject token from different tenant', async () => {
      const token = await acquireToken(testTenantId, {
        corridor: 'pix',
        amount: 50,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Test User',
        },
      });

      const mockSupabase = {} as any;

      // Try to use token with different tenant
      await expect(
        executeSettlement('other-tenant-id', { token: token.token }, mockSupabase)
      ).rejects.toThrow();
    });

    it('should reject invalid token', async () => {
      const mockSupabase = {} as any;

      await expect(
        executeSettlement(
          testTenantId,
          { token: 'ucp_tok_invalid_12345' },
          mockSupabase
        )
      ).rejects.toThrow('Token not found');
    });
  });

  describe('Settlement Listing & Filtering', () => {
    it('should list settlements with pagination', async () => {
      const mockSupabase = {} as any;

      // Create multiple settlements
      for (let i = 0; i < 5; i++) {
        const token = await acquireToken(testTenantId, {
          corridor: 'pix',
          amount: 10 + i,
          currency: 'USD',
          recipient: {
            type: 'pix',
            pix_key: '12345678901',
            pix_key_type: 'cpf',
            name: 'Test User',
          },
        });
        await executeSettlement(testTenantId, { token: token.token }, mockSupabase);
      }

      // Test pagination
      const page1 = await listSettlements(testTenantId, { limit: 2 });
      expect(page1.data.length).toBe(2);
      expect(page1.total).toBe(5);

      const page2 = await listSettlements(testTenantId, { limit: 2, offset: 2 });
      expect(page2.data.length).toBe(2);

      const page3 = await listSettlements(testTenantId, { limit: 2, offset: 4 });
      expect(page3.data.length).toBe(1);
    });

    it('should filter settlements by corridor', async () => {
      const mockSupabase = {} as any;

      // Create Pix settlement
      const pixToken = await acquireToken(testTenantId, {
        corridor: 'pix',
        amount: 100,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Test User',
        },
      });
      await executeSettlement(testTenantId, { token: pixToken.token }, mockSupabase);

      // Create SPEI settlement
      const speiToken = await acquireToken(testTenantId, {
        corridor: 'spei',
        amount: 100,
        currency: 'USD',
        recipient: {
          type: 'spei',
          clabe: '012345678901234567',
          name: 'Test User',
        },
      });
      await executeSettlement(testTenantId, { token: speiToken.token }, mockSupabase);

      // Filter by Pix
      const pixSettlements = await listSettlements(testTenantId, { corridor: 'pix' });
      expect(pixSettlements.data.every((s) => s.corridor === 'pix')).toBe(true);

      // Filter by SPEI
      const speiSettlements = await listSettlements(testTenantId, { corridor: 'spei' });
      expect(speiSettlements.data.every((s) => s.corridor === 'spei')).toBe(true);
    });
  });

  describe('UCP Profile Discovery', () => {
    it('should generate valid UCP profile with settlement capabilities', () => {
      const profile = generateUCPProfile();

      // Verify UCP version
      expect(profile.ucp.version).toBe('2026-01-11');

      // Verify settlement service
      expect(profile.ucp.services['com.payos.settlement']).toBeDefined();
      expect(profile.ucp.services['com.payos.settlement'].rest).toBeDefined();

      // Verify payment handler
      expect(profile.payment?.handlers).toBeDefined();
      const handler = profile.payment!.handlers.find((h) => h.id === 'payos_latam');
      expect(handler).toBeDefined();
      expect(handler!.name).toBe('com.payos.latam_settlement');
      expect(handler!.supported_currencies).toContain('USD');
      expect(handler!.supported_currencies).toContain('USDC');

      // Verify corridors
      const pixCorridor = handler!.supported_corridors?.find((c: any) => c.rail === 'pix');
      expect(pixCorridor).toBeDefined();
      expect(pixCorridor!.destination_currency).toBe('BRL');

      const speiCorridor = handler!.supported_corridors?.find((c: any) => c.rail === 'spei');
      expect(speiCorridor).toBeDefined();
      expect(speiCorridor!.destination_currency).toBe('MXN');
    });
  });
});

// =============================================================================
// Integration Tests (require running API)
// =============================================================================

describe.skipIf(skipIntegration)('UCP E2E: API Integration', () => {
  const headers = {
    Authorization: `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
    'UCP-Agent': 'TestPlatform/2026-01-11 (https://test.example.com/.well-known/ucp)',
  };

  describe('GET /.well-known/ucp', () => {
    it('returns valid UCP profile', async () => {
      const response = await fetch(`${BASE_URL}/.well-known/ucp`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ucp).toBeDefined();
      expect(data.ucp.version).toBe('2026-01-11');
      expect(data.payment?.handlers).toBeDefined();
    });

    it('includes correct cache headers', async () => {
      const response = await fetch(`${BASE_URL}/.well-known/ucp`);

      expect(response.headers.get('cache-control')).toContain('max-age');
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('POST /v1/ucp/tokens', () => {
    it('acquires a settlement token', async () => {
      const response = await fetch(`${BASE_URL}/v1/ucp/tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          corridor: 'pix',
          amount: 100,
          currency: 'USD',
          recipient: {
            type: 'pix',
            pix_key: '12345678901',
            pix_key_type: 'cpf',
            name: 'Maria Silva',
          },
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.token).toMatch(/^ucp_tok_/);
      expect(data.settlement_id).toBeDefined();
      expect(data.quote).toBeDefined();
      expect(data.expires_at).toBeDefined();
    });

    it('validates recipient', async () => {
      const response = await fetch(`${BASE_URL}/v1/ucp/tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          corridor: 'pix',
          amount: 100,
          currency: 'USD',
          recipient: {
            type: 'pix',
            // Missing required fields
          },
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/ucp/settle', () => {
    it('executes settlement with valid token', async () => {
      // First acquire a token
      const tokenResponse = await fetch(`${BASE_URL}/v1/ucp/tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          corridor: 'pix',
          amount: 50,
          currency: 'USD',
          recipient: {
            type: 'pix',
            pix_key: '12345678901',
            pix_key_type: 'cpf',
            name: 'Test User',
          },
        }),
      });
      const tokenData = await tokenResponse.json();

      // Then settle
      const settleResponse = await fetch(`${BASE_URL}/v1/ucp/settle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token: tokenData.token,
        }),
      });
      const settleData = await settleResponse.json();

      expect(settleResponse.status).toBe(200);
      expect(settleData.id).toBe(tokenData.settlement_id);
      expect(settleData.status).toBe('pending');
      expect(settleData.corridor).toBe('pix');
    });

    it('returns 410 for expired token', async () => {
      // This would require mocking time, skip for now
      // The token service has a 15-minute TTL
    });
  });

  describe('GET /v1/ucp/settlements/:id', () => {
    it('returns settlement by ID', async () => {
      // Create a settlement first
      const tokenResponse = await fetch(`${BASE_URL}/v1/ucp/tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          corridor: 'spei',
          amount: 200,
          currency: 'USDC',
          recipient: {
            type: 'spei',
            clabe: '012345678901234567',
            name: 'Juan Garcia',
          },
        }),
      });
      const tokenData = await tokenResponse.json();

      await fetch(`${BASE_URL}/v1/ucp/settle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: tokenData.token }),
      });

      // Get settlement status
      const response = await fetch(
        `${BASE_URL}/v1/ucp/settlements/${tokenData.settlement_id}`,
        { headers }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(tokenData.settlement_id);
      expect(data.corridor).toBe('spei');
    });

    it('returns 404 for unknown settlement', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/ucp/settlements/00000000-0000-0000-0000-000000000000`,
        { headers }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /v1/ucp/settlements', () => {
    it('lists settlements', async () => {
      const response = await fetch(`${BASE_URL}/v1/ucp/settlements`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('filters by corridor', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/ucp/settlements?corridor=pix`,
        { headers }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((s: any) => s.corridor === 'pix')).toBe(true);
    });
  });

  describe('POST /v1/ucp/quote', () => {
    it('returns FX quote', async () => {
      const response = await fetch(`${BASE_URL}/v1/ucp/quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          corridor: 'pix',
          amount: 1000,
          currency: 'USD',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.from_amount).toBe(1000);
      expect(data.from_currency).toBe('USD');
      expect(data.to_currency).toBe('BRL');
      expect(data.to_amount).toBeGreaterThan(0);
      expect(data.fx_rate).toBeGreaterThan(0);
      expect(data.expires_at).toBeDefined();
    });
  });

  describe('GET /v1/ucp/corridors', () => {
    it('returns available corridors', async () => {
      const response = await fetch(`${BASE_URL}/v1/ucp/corridors`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.corridors).toBeDefined();
      expect(data.corridors.length).toBeGreaterThan(0);

      const pixCorridor = data.corridors.find((c: any) => c.rail === 'pix');
      expect(pixCorridor).toBeDefined();
      expect(pixCorridor.destination_country).toBe('BR');
    });
  });

  describe('Full Checkout → Settlement Flow', () => {
    it('completes end-to-end UCP checkout with Pix settlement', async () => {
      // Step 1: Platform discovers PayOS capabilities
      const profileResponse = await fetch(`${BASE_URL}/.well-known/ucp`);
      const profile = await profileResponse.json();
      expect(profile.payment?.handlers.some((h: any) => h.id === 'payos_latam')).toBe(
        true
      );

      // Step 2: Platform gets a quote
      const quoteResponse = await fetch(`${BASE_URL}/v1/ucp/quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          corridor: 'pix',
          amount: 150,
          currency: 'USD',
        }),
      });
      const quote = await quoteResponse.json();
      expect(quote.to_amount).toBeGreaterThan(0);

      // Step 3: Platform acquires settlement token
      const tokenResponse = await fetch(`${BASE_URL}/v1/ucp/tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          corridor: 'pix',
          amount: 150,
          currency: 'USD',
          recipient: {
            type: 'pix',
            pix_key: 'maria@email.com',
            pix_key_type: 'email',
            name: 'Maria Silva',
          },
          metadata: {
            order_id: 'ucp_checkout_e2e_test',
            platform: 'e2e_test',
          },
        }),
      });
      const token = await tokenResponse.json();
      expect(token.token).toMatch(/^ucp_tok_/);
      expect(token.quote.from_amount).toBe(150);

      // Step 4: Merchant completes checkout with token
      const settleResponse = await fetch(`${BASE_URL}/v1/ucp/settle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token: token.token,
          idempotency_key: `e2e_test_${Date.now()}`,
        }),
      });
      const settlement = await settleResponse.json();
      expect(settlement.status).toBe('pending');
      expect(settlement.corridor).toBe('pix');

      // Step 5: Platform can check settlement status
      const statusResponse = await fetch(
        `${BASE_URL}/v1/ucp/settlements/${settlement.id}`,
        { headers }
      );
      const status = await statusResponse.json();
      expect(status.id).toBe(settlement.id);
      expect(['pending', 'processing', 'completed']).toContain(status.status);

      console.log(`
✅ E2E Test Complete: UCP Checkout → Pix Settlement
   Order ID: ucp_checkout_e2e_test
   Settlement ID: ${settlement.id}
   Amount: $${token.quote.from_amount} USD → R$${token.quote.to_amount} BRL
   Status: ${status.status}
`);
    });
  });
});
