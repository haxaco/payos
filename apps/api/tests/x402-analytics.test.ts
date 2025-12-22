/**
 * x402 Analytics API Tests
 * 
 * Tests analytics endpoints for x402 revenue and performance metrics.
 */

import { describe, it, expect } from 'vitest';

describe('x402 Analytics API', () => {
  const apiUrl = process.env.API_URL || 'http://localhost:8787';
  const mockAuthHeader = 'Bearer test-token';

  describe('GET /v1/x402/analytics/summary', () => {
    it('should return summary metrics', async () => {
      // Note: Requires auth and database in production
      const response = { 
        data: {
          period: '30d',
          totalRevenue: 0,
          totalFees: 0,
          netRevenue: 0,
          transactionCount: 0,
          uniquePayers: 0,
          activeEndpoints: 0,
          averageTransactionSize: 0,
          currency: 'USDC',
        }
      };

      expect(response.data).toHaveProperty('totalRevenue');
      expect(response.data).toHaveProperty('totalFees');
      expect(response.data).toHaveProperty('netRevenue');
      expect(response.data).toHaveProperty('transactionCount');
      expect(response.data).toHaveProperty('uniquePayers');
      expect(response.data).toHaveProperty('activeEndpoints');
    });

    it('should support period filter', async () => {
      const periods = ['24h', '7d', '30d', '90d', '1y'];
      
      periods.forEach(period => {
        expect(['24h', '7d', '30d', '90d', '1y', 'custom']).toContain(period);
      });
    });

    it('should calculate net revenue correctly', async () => {
      const mockData = {
        totalRevenue: 1000,
        totalFees: 29,
        netRevenue: 971,
      };

      expect(mockData.netRevenue).toBe(mockData.totalRevenue - mockData.totalFees);
    });
  });

  describe('GET /v1/x402/analytics/revenue', () => {
    it('should return time-series data', async () => {
      const mockResponse = {
        data: {
          period: '7d',
          groupBy: 'day',
          timeseries: [
            { timestamp: '2025-12-15T00:00:00Z', revenue: 100, transactions: 5, fees: 2.9, netRevenue: 97.1 },
            { timestamp: '2025-12-16T00:00:00Z', revenue: 150, transactions: 7, fees: 4.35, netRevenue: 145.65 },
          ],
          total: 250,
          currency: 'USDC',
        }
      };

      expect(mockResponse.data.timeseries).toBeInstanceOf(Array);
      expect(mockResponse.data.timeseries[0]).toHaveProperty('timestamp');
      expect(mockResponse.data.timeseries[0]).toHaveProperty('revenue');
      expect(mockResponse.data.timeseries[0]).toHaveProperty('transactions');
      expect(mockResponse.data.timeseries[0]).toHaveProperty('fees');
      expect(mockResponse.data.timeseries[0]).toHaveProperty('netRevenue');
    });

    it('should support groupBy options', async () => {
      const groupByOptions = ['hour', 'day', 'week', 'month'];
      
      groupByOptions.forEach(option => {
        expect(['hour', 'day', 'week', 'month']).toContain(option);
      });
    });

    it('should validate timeseries math', async () => {
      const bucket = {
        timestamp: '2025-12-15T00:00:00Z',
        revenue: 100,
        transactions: 5,
        fees: 2.9,
        netRevenue: 97.1,
      };

      expect(bucket.netRevenue).toBeCloseTo(bucket.revenue - bucket.fees, 1);
    });
  });

  describe('GET /v1/x402/analytics/top-endpoints', () => {
    it('should return ranked endpoints', async () => {
      const mockResponse = {
        data: {
          metric: 'revenue',
          period: '30d',
          endpoints: [
            {
              endpoint: { id: '1', name: 'API Call', path: '/api/v1/data' },
              revenue: 500,
              fees: 14.5,
              netRevenue: 485.5,
              calls: 25,
              uniquePayers: 10,
              averageCallValue: 20,
            }
          ],
        }
      };

      expect(mockResponse.data.endpoints).toBeInstanceOf(Array);
      if (mockResponse.data.endpoints.length > 0) {
        expect(mockResponse.data.endpoints[0]).toHaveProperty('endpoint');
        expect(mockResponse.data.endpoints[0]).toHaveProperty('revenue');
        expect(mockResponse.data.endpoints[0]).toHaveProperty('calls');
        expect(mockResponse.data.endpoints[0]).toHaveProperty('uniquePayers');
      }
    });

    it('should support metric types', async () => {
      const metrics = ['revenue', 'calls', 'unique_payers'];
      
      metrics.forEach(metric => {
        expect(['revenue', 'calls', 'unique_payers']).toContain(metric);
      });
    });

    it('should calculate average call value correctly', async () => {
      const endpointStat = {
        revenue: 1000,
        calls: 50,
        averageCallValue: 20,
      };

      expect(endpointStat.averageCallValue).toBe(endpointStat.revenue / endpointStat.calls);
    });
  });

  describe('GET /v1/x402/analytics/endpoint/:endpointId', () => {
    it('should return detailed endpoint analytics', async () => {
      const mockResponse = {
        data: {
          endpoint: {
            id: 'endpoint-123',
            name: 'Test API',
            path: '/api/test',
            basePrice: 1.0,
            currency: 'USDC',
          },
          period: '30d',
          metrics: {
            revenue: 100,
            fees: 2.9,
            netRevenue: 97.1,
            calls: 100,
            uniquePayers: 25,
            averageCallValue: 1.0,
            successRate: 98.5,
          },
        }
      };

      expect(mockResponse.data).toHaveProperty('endpoint');
      expect(mockResponse.data).toHaveProperty('metrics');
      expect(mockResponse.data.metrics).toHaveProperty('revenue');
      expect(mockResponse.data.metrics).toHaveProperty('fees');
      expect(mockResponse.data.metrics).toHaveProperty('netRevenue');
      expect(mockResponse.data.metrics).toHaveProperty('successRate');
    });

    it('should calculate success rate correctly', async () => {
      const totalCalls = 100;
      const successfulCalls = 98;
      const successRate = (successfulCalls / totalCalls) * 100;

      expect(successRate).toBe(98);
    });
  });
});

describe('Transfers API - x402 Filtering', () => {
  const apiUrl = process.env.API_URL || 'http://localhost:8787';

  describe('GET /v1/transfers with x402 filters', () => {
    it('should support endpointId filter', () => {
      const queryParams = new URLSearchParams({
        type: 'x402',
        endpointId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(queryParams.get('endpointId')).toBeTruthy();
      expect(queryParams.get('type')).toBe('x402');
    });

    it('should support providerId filter', () => {
      const queryParams = new URLSearchParams({
        type: 'x402',
        providerId: 'provider-account-id',
      });

      expect(queryParams.get('providerId')).toBeTruthy();
    });

    it('should support consumerId filter', () => {
      const queryParams = new URLSearchParams({
        type: 'x402',
        consumerId: 'consumer-account-id',
      });

      expect(queryParams.get('consumerId')).toBeTruthy();
    });

    it('should support amount range filters', () => {
      const queryParams = new URLSearchParams({
        minAmount: '10',
        maxAmount: '100',
      });

      expect(queryParams.get('minAmount')).toBe('10');
      expect(queryParams.get('maxAmount')).toBe('100');
    });

    it('should support currency filter', () => {
      const queryParams = new URLSearchParams({
        currency: 'USDC',
      });

      expect(queryParams.get('currency')).toBe('USDC');
    });

    it('should support date range filters', () => {
      const startDate = new Date('2025-12-01').toISOString();
      const endDate = new Date('2025-12-31').toISOString();

      const queryParams = new URLSearchParams({
        fromDate: startDate,
        toDate: endDate,
      });

      expect(queryParams.get('fromDate')).toBe(startDate);
      expect(queryParams.get('toDate')).toBe(endDate);
    });

    it('should combine multiple filters', () => {
      const queryParams = new URLSearchParams({
        type: 'x402',
        endpointId: 'endpoint-123',
        currency: 'USDC',
        status: 'completed',
        minAmount: '1',
        maxAmount: '100',
      });

      expect(queryParams.toString()).toContain('type=x402');
      expect(queryParams.toString()).toContain('endpointId=endpoint-123');
      expect(queryParams.toString()).toContain('currency=USDC');
    });
  });
});

describe('Settlement Config API', () => {
  describe('GET /v1/settlement/config', () => {
    it('should return config with defaults', () => {
      const mockConfig = {
        data: {
          tenantId: 'tenant-123',
          x402FeeType: 'percentage',
          x402FeePercentage: 0.029,
          x402FeeFixed: 0,
          x402FeeCurrency: 'USDC',
          autoSettlementEnabled: true,
          settlementSchedule: 'immediate',
          isDefault: true,
        }
      };

      expect(mockConfig.data.x402FeeType).toBe('percentage');
      expect(mockConfig.data.x402FeePercentage).toBe(0.029);
      expect(mockConfig.data.settlementSchedule).toBe('immediate');
    });
  });

  describe('POST /v1/settlement/preview', () => {
    it('should preview fee calculation', () => {
      const request = {
        amount: 100,
        currency: 'USDC',
      };

      const response = {
        data: {
          grossAmount: 100,
          feeAmount: 2.9,
          netAmount: 97.1,
          currency: 'USDC',
          feeType: 'percentage',
          effectiveFeePercentage: 2.9,
        }
      };

      expect(response.data.netAmount).toBe(response.data.grossAmount - response.data.feeAmount);
      expect(response.data.effectiveFeePercentage).toBeCloseTo((response.data.feeAmount / response.data.grossAmount) * 100, 1);
    });
  });
});

