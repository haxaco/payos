/**
 * Tests for AP2 Client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AP2Client } from './client';
import { PayOSClient } from '../../client';
import { PayOSConfig } from '../../config';

describe('AP2Client', () => {
  let ap2Client: AP2Client;
  let payosClient: PayOSClient;
  let config: PayOSConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      environment: 'sandbox',
    };
    payosClient = new PayOSClient(config);
    ap2Client = new AP2Client(payosClient);

    // Mock fetch
    global.fetch = vi.fn();
  });

  describe('createMandate', () => {
    it('should create a new mandate', async () => {
      const mockMandate = {
        id: 'mdt_123',
        mandate_id: 'mdt_unique_123',
        mandate_type: 'payment' as const,
        agent_id: 'agent_test',
        account_id: 'acct_123',
        authorized_amount: 100,
        used_amount: 0,
        remaining_amount: 100,
        currency: 'USD',
        status: 'active' as const,
        execution_count: 0,
        created_at: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockMandate }),
      });

      const result = await ap2Client.createMandate({
        mandate_id: 'mdt_unique_123',
        mandate_type: 'payment',
        agent_id: 'agent_test',
        account_id: 'acct_123',
        authorized_amount: 100,
      });

      expect(result).toEqual(mockMandate);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ap2/mandates'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('listMandates', () => {
    it('should list mandates', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await ap2Client.listMandates();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should filter mandates by status', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await ap2Client.listMandates({ status: 'active' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
    });
  });

  describe('getMandate', () => {
    it('should get mandate details', async () => {
      const mockMandate = {
        id: 'mdt_123',
        mandate_id: 'mdt_unique_123',
        mandate_type: 'payment' as const,
        agent_id: 'agent_test',
        account_id: 'acct_123',
        authorized_amount: 100,
        used_amount: 0,
        remaining_amount: 100,
        currency: 'USD',
        status: 'active' as const,
        execution_count: 0,
        created_at: new Date().toISOString(),
        executions: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockMandate }),
      });

      const result = await ap2Client.getMandate('mdt_123');

      expect(result).toEqual(mockMandate);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ap2/mandates/mdt_123'),
        expect.any(Object)
      );
    });
  });

  describe('executeMandate', () => {
    it('should execute mandate', async () => {
      const mockResponse = {
        execution_id: 'exec_123',
        transfer_id: 'xfer_123',
        mandate: {
          id: 'mdt_123',
          remaining_amount: 75,
          used_amount: 25,
          execution_count: 1,
          status: 'active' as const,
        },
        transfer: {
          id: 'xfer_123',
          amount: 25,
          currency: 'USD',
          status: 'completed',
          created_at: new Date().toISOString(),
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockResponse }),
      });

      const result = await ap2Client.executeMandate('mdt_123', {
        amount: 25,
        currency: 'USD',
      });

      expect(result).toEqual(mockResponse);
      expect(result.mandate.remaining_amount).toBe(75);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ap2/mandates/mdt_123/execute'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('cancelMandate', () => {
    it('should cancel mandate', async () => {
      const mockMandate = {
        id: 'mdt_123',
        mandate_id: 'mdt_unique_123',
        mandate_type: 'payment' as const,
        agent_id: 'agent_test',
        account_id: 'acct_123',
        authorized_amount: 100,
        used_amount: 0,
        remaining_amount: 100,
        currency: 'USD',
        status: 'cancelled' as const,
        execution_count: 0,
        created_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockMandate }),
      });

      const result = await ap2Client.cancelMandate('mdt_123');

      expect(result.status).toBe('cancelled');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ap2/mandates/mdt_123/cancel'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('getAnalytics', () => {
    it('should get analytics', async () => {
      const mockAnalytics = {
        period: '30d',
        summary: {
          totalRevenue: 1000,
          totalFees: 10,
          netRevenue: 990,
          transactionCount: 50,
          activeMandates: 10,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockAnalytics }),
      });

      const result = await ap2Client.getAnalytics('30d');

      expect(result).toEqual(mockAnalytics);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ap2/analytics?period=30d'),
        expect.any(Object)
      );
    });
  });
});

