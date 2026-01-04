/**
 * Tests for ACP Client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ACPClient } from './client';
import { PayOSClient } from '../../client';
import { PayOSConfig } from '../../config';

describe('ACPClient', () => {
  let acpClient: ACPClient;
  let payosClient: PayOSClient;
  let config: PayOSConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      environment: 'sandbox',
    };
    payosClient = new PayOSClient(config);
    acpClient = new ACPClient(payosClient);

    // Mock fetch
    global.fetch = vi.fn();
  });

  describe('createCheckout', () => {
    it('should create a new checkout', async () => {
      const mockCheckout = {
        id: 'co_123',
        checkout_id: 'checkout_unique_123',
        agent_id: 'agent_test',
        merchant_id: 'merchant_test',
        account_id: 'acct_123',
        total_amount: 115,
        subtotal: 100,
        tax_amount: 10,
        shipping_amount: 5,
        discount_amount: 0,
        currency: 'USD',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        items: [
          {
            id: 'item_1',
            name: 'Product 1',
            quantity: 2,
            unit_price: 50,
            total_price: 100,
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockCheckout }),
      });

      const result = await acpClient.createCheckout({
        checkout_id: 'checkout_unique_123',
        agent_id: 'agent_test',
        account_id: 'acct_123',
        merchant_id: 'merchant_test',
        items: [
          {
            name: 'Product 1',
            quantity: 2,
            unit_price: 50,
            total_price: 100,
          },
        ],
        tax_amount: 10,
        shipping_amount: 5,
      });

      expect(result).toEqual(mockCheckout);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/acp/checkouts'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('listCheckouts', () => {
    it('should list checkouts', async () => {
      const mockResponse = {
        data: [],
        pagination: { total: 0, limit: 20, offset: 0 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await acpClient.listCheckouts();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should filter checkouts by status', async () => {
      const mockResponse = {
        data: [],
        pagination: { total: 0, limit: 20, offset: 0 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await acpClient.listCheckouts({ status: 'pending' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      );
    });
  });

  describe('getCheckout', () => {
    it('should get checkout details', async () => {
      const mockCheckout = {
        id: 'co_123',
        checkout_id: 'checkout_unique_123',
        agent_id: 'agent_test',
        merchant_id: 'merchant_test',
        account_id: 'acct_123',
        total_amount: 115,
        subtotal: 100,
        tax_amount: 10,
        shipping_amount: 5,
        discount_amount: 0,
        currency: 'USD',
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        items: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockCheckout }),
      });

      const result = await acpClient.getCheckout('co_123');

      expect(result).toEqual(mockCheckout);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/acp/checkouts/co_123'),
        expect.any(Object)
      );
    });
  });

  describe('completeCheckout', () => {
    it('should complete checkout', async () => {
      const mockResponse = {
        checkout_id: 'co_123',
        transfer_id: 'xfer_123',
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        total_amount: 115,
        currency: 'USD',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockResponse }),
      });

      const result = await acpClient.completeCheckout('co_123', {
        shared_payment_token: 'spt_test_123',
        payment_method: 'card',
      });

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe('completed');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/acp/checkouts/co_123/complete'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('cancelCheckout', () => {
    it('should cancel checkout', async () => {
      const mockCheckout = {
        id: 'co_123',
        checkout_id: 'checkout_unique_123',
        agent_id: 'agent_test',
        merchant_id: 'merchant_test',
        total_amount: 115,
        currency: 'USD',
        status: 'cancelled' as const,
        created_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockCheckout }),
      });

      const result = await acpClient.cancelCheckout('co_123');

      expect(result.status).toBe('cancelled');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/acp/checkouts/co_123/cancel'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('getAnalytics', () => {
    it('should get analytics', async () => {
      const mockAnalytics = {
        period: '30d',
        summary: {
          totalRevenue: 5000,
          totalFees: 50,
          netRevenue: 4950,
          transactionCount: 100,
          averageOrderValue: 50,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockAnalytics }),
      });

      const result = await acpClient.getAnalytics('30d');

      expect(result).toEqual(mockAnalytics);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/acp/analytics?period=30d'),
        expect.any(Object)
      );
    });
  });
});

