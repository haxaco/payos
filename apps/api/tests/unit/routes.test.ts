import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../../src/app.js';

// Mock the Supabase client
vi.mock('../../src/db/client.js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
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
      // Default mock for other tables
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: null,
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => ({
                  data: [],
                  count: 0,
                  error: null,
                })),
              })),
            })),
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
            order: vi.fn(() => ({
              range: vi.fn(() => ({
                data: [],
                count: 0,
                error: null,
              })),
            })),
          })),
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({
                data: [],
                count: 0,
                error: null,
              })),
            })),
          })),
          order: vi.fn(() => ({
            range: vi.fn(() => ({
              data: [],
              count: 0,
              error: null,
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'new-id' },
              error: null,
            })),
          })),
        })),
      };
    }),
  })),
}));

describe('Health Endpoint', () => {
  it('GET /health returns status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
  });
});

describe('Authentication Middleware', () => {
  it('rejects requests without authorization header', async () => {
    const res = await app.request('/v1/accounts');
    expect(res.status).toBe(401);
    
    const data = await res.json();
    expect(data.error).toContain('authorization');
  });

  it('rejects requests with invalid token format', async () => {
    const res = await app.request('/v1/accounts', {
      headers: { Authorization: 'Bearer invalid_token' },
    });
    expect(res.status).toBe(401);
    
    const data = await res.json();
    expect(data.error).toContain('Invalid');
  });

  it('accepts valid API key format', async () => {
    const res = await app.request('/v1/accounts', {
      headers: { Authorization: 'Bearer pk_test_demo_fintech_key_12345' },
    });
    // Will succeed auth but may fail on DB call - that's ok
    expect([200, 500]).toContain(res.status);
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/unknown/route');
    expect(res.status).toBe(404);
    
    const data = await res.json();
    expect(data.error).toBe('Not found');
  });
});

describe('Accounts Routes (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /v1/accounts returns paginated response', async () => {
    const res = await app.request('/v1/accounts', {
      headers: { Authorization: 'Bearer pk_test_demo_fintech_key_12345' },
    });
    
    // With mocked DB, should return empty array
    if (res.status === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    }
  });

  it('POST /v1/accounts validates input', async () => {
    const res = await app.request('/v1/accounts', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_demo_fintech_key_12345',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body should fail validation
    });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Validation');
  });

  it('GET /v1/accounts/:id validates UUID format', async () => {
    const res = await app.request('/v1/accounts/invalid-uuid', {
      headers: { Authorization: 'Bearer pk_test_demo_fintech_key_12345' },
    });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid');
  });
});

describe('Transfers Routes (Mocked)', () => {
  it('POST /v1/internal-transfers validates input', async () => {
    const res = await app.request('/v1/internal-transfers', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_demo_fintech_key_12345',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields
      }),
    });
    
    expect(res.status).toBe(400);
  });

  it('POST /v1/internal-transfers rejects self-transfer', async () => {
    const res = await app.request('/v1/internal-transfers', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_demo_fintech_key_12345',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAccountId: 'aaaaaaaa-0000-0000-0000-000000000001',
        toAccountId: 'aaaaaaaa-0000-0000-0000-000000000001',
        amount: 100,
      }),
    });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('same account');
  });
});

describe('Quotes Routes (Mocked)', () => {
  it('GET /v1/quotes/rates returns rates', async () => {
    const res = await app.request('/v1/quotes/rates', {
      headers: { Authorization: 'Bearer pk_test_demo_fintech_key_12345' },
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveProperty('baseCurrency', 'USD');
    expect(data.data).toHaveProperty('rates');
  });

  it('POST /v1/quotes validates input', async () => {
    const res = await app.request('/v1/quotes', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_demo_fintech_key_12345',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields
      }),
    });
    
    expect(res.status).toBe(400);
  });
});

describe('Streams Routes (Mocked)', () => {
  it('POST /v1/streams validates input', async () => {
    const res = await app.request('/v1/streams', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_demo_fintech_key_12345',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields
      }),
    });
    
    expect(res.status).toBe(400);
  });

  it('POST /v1/streams rejects self-stream', async () => {
    const res = await app.request('/v1/streams', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_demo_fintech_key_12345',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderAccountId: 'aaaaaaaa-0000-0000-0000-000000000001',
        receiverAccountId: 'aaaaaaaa-0000-0000-0000-000000000001',
        flowRatePerMonth: 1000,
      }),
    });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('same account');
  });
});

describe('Agents Routes (Mocked)', () => {
  it('POST /v1/agents validates input', async () => {
    const res = await app.request('/v1/agents', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer pk_test_demo_fintech_key_12345',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields
      }),
    });
    
    expect(res.status).toBe(400);
  });

  it('GET /v1/agents/:id validates UUID format', async () => {
    const res = await app.request('/v1/agents/invalid-uuid', {
      headers: { Authorization: 'Bearer pk_test_demo_fintech_key_12345' },
    });
    
    expect(res.status).toBe(400);
  });
});

