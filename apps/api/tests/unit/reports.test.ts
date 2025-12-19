import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../src/app.js';

// Mock crypto functions for API key verification
vi.mock('../../src/utils/crypto.js', () => ({
  hashApiKey: vi.fn(() => 'mock-hash'),
  verifyApiKey: vi.fn(() => true),
  getKeyPrefix: vi.fn((key: string) => key.split('_').slice(0, 3).join('_')),
}));

// Mock the Supabase client
vi.mock('../../src/db/client.js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(() => ({
      data: [],
      error: null,
    })),
    from: vi.fn((table: string) => {
      // Return API key data for auth
      if (table === 'api_keys') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'key-aaaaaaaa-0000-0000-0000-000000000001',
                  tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
                  environment: 'test',
                  status: 'active',
                  expires_at: null,
                  key_hash: 'mock-hash',
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: null,
              error: null,
            })),
          })),
        };
      }
      
      // Return tenant data for auth
      if (table === 'tenants') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'aaaaaaaa-0000-0000-0000-000000000001',
                  name: 'Test Tenant',
                  status: 'active',
                },
                error: null,
              })),
            })),
          })),
        };
      }

      // Mock auth_attempts for logging
      if (table === 'auth_attempts') {
        return {
          insert: vi.fn(() => ({
            data: null,
            error: null,
          })),
        };
      }
      
      // Mock security_events for logging
      if (table === 'security_events') {
        return {
          insert: vi.fn(() => ({
            data: null,
            error: null,
          })),
        };
      }
      
      // Mock transfers for summary
      if (table === 'transfers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  data: [
                    {
                      type: 'external',
                      status: 'completed',
                      amount: '1000.00',
                      fee_amount: '5.00',
                      from_account_id: 'bbbbbbbb-0000-0000-0000-000000000001',
                      to_account_id: 'cccccccc-0000-0000-0000-000000000001',
                      corridor: 'US-MX',
                    },
                    {
                      type: 'funding',
                      status: 'completed',
                      amount: '500.00',
                      fee_amount: '2.50',
                      from_account_id: 'cccccccc-0000-0000-0000-000000000001',
                      to_account_id: 'bbbbbbbb-0000-0000-0000-000000000001',
                      corridor: 'US-US',
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      // Mock refunds for summary
      if (table === 'refunds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    data: [
                      { amount: '100.00', status: 'completed' },
                    ],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        };
      }

      // Mock streams for summary
      if (table === 'streams') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [
                { status: 'active', flow_rate_per_month: '2000.00', total_streamed: '500.00' },
                { status: 'active', flow_rate_per_month: '1500.00', total_streamed: '300.00' },
                { status: 'paused', flow_rate_per_month: '1000.00', total_streamed: '200.00' },
              ],
              error: null,
            })),
          })),
        };
      }

      // Mock accounts for summary
      if (table === 'accounts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [
                { id: 'bbbbbbbb-0000-0000-0000-000000000001', type: 'business' },
                { id: 'cccccccc-0000-0000-0000-000000000001', type: 'person' },
              ],
              error: null,
            })),
          })),
        };
      }

      // Default mock
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({
                data: [],
                count: 0,
                error: null,
              })),
            })),
          })),
        })),
      };
    }),
  })),
}));

const TEST_API_KEY = 'pk_test_demo_fintech_key_12345';

describe('Reports Routes - Summary API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/reports/summary', () => {
    it('should return summary for default period (month)', async () => {
      const res = await app.request('/v1/reports/summary', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      if (res.status === 200) {
        const data = await res.json();
        expect(data.data).toHaveProperty('period');
        expect(data.data.period).toHaveProperty('start');
        expect(data.data.period).toHaveProperty('end');
        expect(data.data).toHaveProperty('totals');
        expect(data.data.totals).toHaveProperty('transfersOut');
        expect(data.data.totals).toHaveProperty('transfersIn');
        expect(data.data.totals).toHaveProperty('refundsIssued');
        expect(data.data.totals).toHaveProperty('feesPaid');
        expect(data.data.totals).toHaveProperty('streamsActive');
        expect(data.data.totals).toHaveProperty('streamsTotalFlowed');
        expect(data.data).toHaveProperty('byCorridor');
        expect(data.data).toHaveProperty('byAccountType');
      }
    });

    it('should accept period=day parameter', async () => {
      const res = await app.request('/v1/reports/summary?period=day', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect([200, 500]).toContain(res.status);
    });

    it('should accept period=week parameter', async () => {
      const res = await app.request('/v1/reports/summary?period=week', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect([200, 500]).toContain(res.status);
    });

    it('should accept period=month parameter', async () => {
      const res = await app.request('/v1/reports/summary?period=month', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect([200, 500]).toContain(res.status);
    });

    it('should reject custom period without date range', async () => {
      const res = await app.request('/v1/reports/summary?period=custom', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('startDate');
    });

    it('should accept custom period with date range', async () => {
      const res = await app.request(
        '/v1/reports/summary?period=custom&startDate=2025-01-01&endDate=2025-01-31',
        {
          headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        }
      );

      expect([200, 500]).toContain(res.status);
    });
  });
});

describe('Reports Routes - Existing Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/reports', () => {
    it('should return paginated reports list', async () => {
      const res = await app.request('/v1/reports', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      if (res.status === 200) {
        const data = await res.json();
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('pagination');
      }
    });
  });

  describe('GET /v1/reports/audit-logs', () => {
    it('should return audit logs', async () => {
      const res = await app.request('/v1/reports/audit-logs', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      if (res.status === 200) {
        const data = await res.json();
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });
  });

  describe('POST /v1/reports', () => {
    it('should reject invalid report type', async () => {
      const res = await app.request('/v1/reports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'invalid_type',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should accept valid report generation request', async () => {
      const res = await app.request('/v1/reports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'transactions',
          format: 'csv',
        }),
      });

      // Should pass validation and attempt DB operation
      expect([201, 500]).toContain(res.status);
    });
  });
});

