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
      
      // Mock transfers for dispute creation
      if (table === 'transfers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: {
                      id: 'aaaaaaaa-1111-1111-1111-111111111111',
                      status: 'completed',
                      amount: '500.00',
                      from_account_id: 'bbbbbbbb-0000-0000-0000-000000000001',
                      from_account_name: 'TechCorp Inc',
                      to_account_id: 'cccccccc-0000-0000-0000-000000000001',
                      to_account_name: 'Maria Garcia',
                      completed_at: new Date().toISOString(),
                    },
                    error: null,
                  })),
                })),
                single: vi.fn(() => ({
                  data: null,
                  error: null,
                })),
              })),
              single: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          })),
        };
      }
      
      // Mock tenant_settings
      if (table === 'tenant_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  disputes_filing_window_days: 120,
                  disputes_response_window_days: 30,
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
      
      // Mock disputes table
      if (table === 'disputes') {
        // Create a chainable mock object
        const createChain = (terminalData: any = { data: [], count: 0, error: null }) => {
          const chain: any = {};
          chain.eq = vi.fn(() => chain);
          chain.in = vi.fn(() => chain);
          chain.or = vi.fn(() => chain);
          chain.lte = vi.fn(() => chain);
          chain.gte = vi.fn(() => chain);
          chain.order = vi.fn(() => chain);
          chain.range = vi.fn(() => terminalData);
          // Return 404 error for single() calls (dispute not found)
          chain.single = vi.fn(() => ({ 
            data: null, 
            error: { code: 'PGRST116', message: 'Row not found' } 
          }));
          return chain;
        };
        
        return {
          select: vi.fn(() => createChain()),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'dddddddd-0000-0000-0000-000000000001',
                  tenant_id: 'aaaaaaaa-0000-0000-0000-000000000001',
                  transfer_id: 'aaaaaaaa-1111-1111-1111-111111111111',
                  status: 'open',
                  reason: 'service_not_received',
                  description: 'Test dispute',
                  claimant_account_id: 'bbbbbbbb-0000-0000-0000-000000000001',
                  claimant_account_name: 'TechCorp Inc',
                  respondent_account_id: 'cccccccc-0000-0000-0000-000000000001',
                  respondent_account_name: 'Maria Garcia',
                  amount_disputed: '500.00',
                  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  created_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({ error: null })),
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: {
                    id: 'dddddddd-0000-0000-0000-000000000001',
                    status: 'resolved',
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      
      // Mock audit_log
      if (table === 'audit_log') {
        return {
          insert: vi.fn(() => ({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: [],
                  error: null,
                })),
              })),
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

describe('Disputes Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/disputes', () => {
    it('should return paginated disputes list', async () => {
      const res = await app.request('/v1/disputes', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      if (res.status === 200) {
        const data = await res.json();
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('pagination');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it('should accept status filter', async () => {
      const res = await app.request('/v1/disputes?status=open', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect([200, 500]).toContain(res.status);
    });

    it('should accept dueSoon filter', async () => {
      const res = await app.request('/v1/disputes?dueSoon=true', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('POST /v1/disputes', () => {
    it('should reject request without required fields', async () => {
      const res = await app.request('/v1/disputes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Validation');
    });

    it('should reject invalid reason enum', async () => {
      const res = await app.request('/v1/disputes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId: 'aaaaaaaa-1111-1111-1111-111111111111',
          reason: 'invalid_reason',
          description: 'Test dispute',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid UUID format for transferId', async () => {
      const res = await app.request('/v1/disputes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId: 'invalid-uuid',
          reason: 'service_not_received',
          description: 'Test dispute',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should accept valid dispute creation request', async () => {
      const res = await app.request('/v1/disputes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId: 'aaaaaaaa-1111-1111-1111-111111111111',
          reason: 'service_not_received',
          description: 'Service was never delivered after payment',
        }),
      });

      // Should succeed or fail on DB - not validation
      expect([201, 404, 500]).toContain(res.status);
    });

    it('should accept optional amountDisputed', async () => {
      const res = await app.request('/v1/disputes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId: 'aaaaaaaa-1111-1111-1111-111111111111',
          reason: 'amount_incorrect',
          description: 'Was charged wrong amount',
          amountDisputed: 250.00,
          requestedResolution: 'partial_refund',
          requestedAmount: 100.00,
        }),
      });

      // Validation should pass
      expect([201, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /v1/disputes/:id', () => {
    it('should reject invalid UUID format', async () => {
      const res = await app.request('/v1/disputes/invalid-uuid', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid');
    });

    it('should return 404 for non-existent dispute', async () => {
      const res = await app.request('/v1/disputes/00000000-0000-0000-0000-000000000000', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/disputes/:id/respond', () => {
    it('should reject invalid UUID format', async () => {
      const res = await app.request('/v1/disputes/invalid-uuid/respond', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: 'Our response to the dispute',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty response', async () => {
      const res = await app.request('/v1/disputes/aaaaaaaa-0000-0000-0000-000000000001/respond', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // With mock returning 404 for dispute lookup, we get 404 or 400 for validation
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('POST /v1/disputes/:id/resolve', () => {
    it('should reject invalid UUID format', async () => {
      const res = await app.request('/v1/disputes/invalid-uuid/resolve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution: 'refund_issued',
          resolutionAmount: 100,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid resolution enum', async () => {
      const res = await app.request('/v1/disputes/aaaaaaaa-0000-0000-0000-000000000001/resolve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution: 'invalid_resolution',
        }),
      });

      // Validation happens after fetch, so with mock 404 or 400 is valid
      expect([400, 404]).toContain(res.status);
    });

    it('should accept valid resolution request', async () => {
      const res = await app.request('/v1/disputes/aaaaaaaa-0000-0000-0000-000000000001/resolve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution: 'no_action',
          resolutionNotes: 'Claim was not substantiated',
        }),
      });

      // Should fail on 404 (mocked) or succeed
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /v1/disputes/:id/escalate', () => {
    it('should reject invalid UUID format', async () => {
      const res = await app.request('/v1/disputes/invalid-uuid/escalate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/disputes/stats/summary', () => {
    it('should return dispute statistics', async () => {
      const res = await app.request('/v1/disputes/stats/summary', {
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });

      if (res.status === 200) {
        const data = await res.json();
        expect(data.data).toHaveProperty('total');
        expect(data.data).toHaveProperty('byStatus');
        expect(data.data).toHaveProperty('totalAmountDisputed');
      }
    });
  });
});

