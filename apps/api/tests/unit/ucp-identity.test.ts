/**
 * UCP Identity Linking Unit Tests
 *
 * Tests for OAuth 2.0 identity linking flow.
 *
 * @see Phase 4: Identity Linking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// =============================================================================
// Mock Supabase Client
// =============================================================================

// In-memory stores for mock database
const mockStores = {
  ucp_oauth_clients: new Map<string, any>(),
  ucp_authorization_codes: new Map<string, any>(),
  ucp_linked_accounts: new Map<string, any>(),
};

// Helper to create chainable mock query builder
function createMockQueryBuilder(tableName: string) {
  const store = mockStores[tableName as keyof typeof mockStores] || new Map();

  // Create a new builder instance with fresh state
  function createBuilder() {
    let filters: Array<{ column: string; op: string; value: any }> = [];
    let orderColumn: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;
    let pendingUpdates: any = null;

    const applyFilters = (data: any[]): any[] => {
      return data.filter(item => {
        return filters.every(f => {
          if (f.op === 'eq') return item[f.column] === f.value;
          if (f.op === 'neq') return item[f.column] !== f.value;
          if (f.op === 'in') return f.value.includes(item[f.column]);
          return true;
        });
      });
    };

    const getResults = () => {
      let result = applyFilters(Array.from(store.values()));
      if (orderColumn) {
        result.sort((a, b) => {
          const aVal = a[orderColumn!];
          const bVal = b[orderColumn!];
          return orderAsc ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
        });
      }
      if (rangeStart !== null && rangeEnd !== null) {
        result = result.slice(rangeStart, rangeEnd + 1);
      } else if (limitCount) {
        result = result.slice(0, limitCount);
      }
      return result;
    };

    const builder: any = {
      select: () => builder,
      insert: (data: any | any[]) => {
        const items = Array.isArray(data) ? data : [data];
        const inserted: any[] = [];
        for (const item of items) {
          const id = item.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const record = { ...item, id, created_at: new Date().toISOString() };
          store.set(id, record);
          inserted.push(record);
        }
        // Return chainable builder for insert().select().single()
        const insertBuilder: any = {
          select: () => insertBuilder,
          single: async () => ({ data: inserted[0], error: null }),
          then: async (resolve: any) => resolve({ data: inserted, error: null }),
        };
        return insertBuilder;
      },
      update: (updates: any) => {
        pendingUpdates = updates;
        return builder;
      },
      delete: () => builder,
      eq: (column: string, value: any) => {
        filters.push({ column, op: 'eq', value });
        // If we have pending updates, this is update().eq() chain
        if (pendingUpdates !== null) {
          return builder;
        }
        return builder;
      },
      neq: (column: string, value: any) => {
        filters.push({ column, op: 'neq', value });
        return builder;
      },
      in: (column: string, values: any[]) => {
        filters.push({ column, op: 'in', value: values });
        return builder;
      },
      order: (column: string, opts?: { ascending?: boolean }) => {
        orderColumn = column;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      limit: (count: number) => {
        limitCount = count;
        return builder;
      },
      range: (start: number, end: number) => {
        rangeStart = start;
        rangeEnd = end;
        return builder;
      },
      single: async () => {
        // Execute pending updates if any
        if (pendingUpdates !== null) {
          const filtered = applyFilters(Array.from(store.values()));
          for (const item of filtered) {
            const updated = { ...item, ...pendingUpdates, updated_at: new Date().toISOString() };
            store.set(item.id, updated);
          }
          return { data: filtered.length > 0 ? { ...filtered[0], ...pendingUpdates } : null, error: null };
        }

        const filtered = getResults();
        if (filtered.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
        }
        return { data: filtered[0], error: null };
      },
      then: async (resolve: (result: { data: any[] | null; error: null }) => void) => {
        // Execute pending updates if any
        if (pendingUpdates !== null) {
          const filtered = applyFilters(Array.from(store.values()));
          for (const item of filtered) {
            const updated = { ...item, ...pendingUpdates, updated_at: new Date().toISOString() };
            store.set(item.id, updated);
          }
          resolve({ data: null, error: null });
          return;
        }
        // Execute delete
        if (filters.length > 0 && pendingUpdates === null) {
          // Check if this is a delete operation (we track via method call)
        }
        resolve({ data: getResults(), error: null });
      },
    };

    return builder;
  }

  return createBuilder();
}

const mockSupabaseClient = {
  from: (tableName: string) => createMockQueryBuilder(tableName),
};

vi.mock('../../src/db/client.js', () => ({
  getClient: () => mockSupabaseClient,
  createClient: () => mockSupabaseClient,
}));
import {
  // Client management
  registerClient,
  getClient,
  verifyClientCredentials,
  validateRedirectUri,
  // Authorization
  createAuthorizationCode,
  exchangeAuthorizationCode,
  // Tokens
  refreshTokens,
  revokeToken,
  validateAccessToken,
  // Linked accounts
  createLinkedAccount,
  getLinkedAccount,
  listLinkedAccountsByBuyer,
  listLinkedAccountsByPlatform,
  unlinkAccount,
  // Scopes
  hasScope,
  hasAllScopes,
  hasAnyScope,
  getAllScopes,
  // Utilities
  clearIdentityStores,
  createOAuthError,
  // Types
  type UCPIdentityScope,
  type UCPOAuthClient,
  type UCPLinkedAccount,
} from '../../src/services/ucp/index.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const testTenantId = 'test-tenant-identity-123';
const testBuyerId = 'buyer-123';
const testBuyerEmail = 'buyer@example.com';

async function createTestClient(
  type: 'public' | 'confidential' = 'public'
): Promise<{ client: UCPOAuthClient; client_secret?: string }> {
  return registerClient(testTenantId, {
    name: 'Test App',
    redirect_uris: ['https://app.example.com/callback', 'https://app.example.com/callback2'],
    allowed_scopes: ['profile.read', 'orders.read', 'checkout.create'],
    client_type: type,
    logo_url: 'https://app.example.com/logo.png',
  });
}

// =============================================================================
// Test Setup
// =============================================================================

// Helper to clear mock stores
function clearMockStores() {
  mockStores.ucp_oauth_clients.clear();
  mockStores.ucp_authorization_codes.clear();
  mockStores.ucp_linked_accounts.clear();
}

describe('UCP Identity Linking', () => {
  beforeEach(() => {
    clearMockStores();
  });

  afterEach(() => {
    clearMockStores();
  });

  // ===========================================================================
  // OAuth Client Tests
  // ===========================================================================

  describe('OAuth Client Management', () => {
    describe('registerClient', () => {
      it('should register a public client', async () => {
        const { client, client_secret } = await createTestClient('public');

        expect(client.client_id).toMatch(/^ucp_client_/);
        expect(client.name).toBe('Test App');
        expect(client.client_type).toBe('public');
        expect(client.redirect_uris).toHaveLength(2);
        expect(client.allowed_scopes).toContain('profile.read');
        expect(client.is_active).toBe(true);
        expect(client_secret).toBeUndefined();
      });

      it('should register a confidential client with secret', async () => {
        const { client, client_secret } = await createTestClient('confidential');

        expect(client.client_id).toMatch(/^ucp_client_/);
        expect(client.client_type).toBe('confidential');
        expect(client_secret).toMatch(/^ucp_secret_/);
      });
    });

    describe('getClient', () => {
      it('should get client by client_id', async () => {
        const { client } = await createTestClient();
        const found = await getClient(client.client_id);

        expect(found).not.toBeNull();
        expect(found?.name).toBe('Test App');
      });

      it('should return null for non-existent client', async () => {
        const found = await getClient('non-existent');
        expect(found).toBeNull();
      });
    });

    describe('verifyClientCredentials', () => {
      it('should verify public client without secret', async () => {
        const { client } = await createTestClient('public');
        const verified = await verifyClientCredentials(client.client_id);

        expect(verified).not.toBeNull();
        expect(verified?.client_id).toBe(client.client_id);
      });

      it('should verify confidential client with correct secret', async () => {
        const { client, client_secret } = await createTestClient('confidential');
        const verified = await verifyClientCredentials(client.client_id, client_secret);

        expect(verified).not.toBeNull();
        expect(verified?.client_id).toBe(client.client_id);
      });

      it('should reject confidential client with wrong secret', async () => {
        const { client } = await createTestClient('confidential');
        const verified = await verifyClientCredentials(client.client_id, 'wrong-secret');

        expect(verified).toBeNull();
      });

      it('should reject confidential client without secret', async () => {
        const { client } = await createTestClient('confidential');
        const verified = await verifyClientCredentials(client.client_id);

        expect(verified).toBeNull();
      });
    });

    describe('validateRedirectUri', () => {
      it('should accept registered redirect URI', async () => {
        const { client } = await createTestClient();
        const valid = validateRedirectUri(client, 'https://app.example.com/callback');

        expect(valid).toBe(true);
      });

      it('should reject unregistered redirect URI', async () => {
        const { client } = await createTestClient();
        const valid = validateRedirectUri(client, 'https://evil.example.com/callback');

        expect(valid).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Authorization Code Tests
  // ===========================================================================

  describe('Authorization Code Flow', () => {
    describe('createAuthorizationCode', () => {
      it('should create authorization code', async () => {
        const { client } = await createTestClient();

        const authCode = await createAuthorizationCode(testTenantId, {
          client_id: client.client_id,
          buyer_id: testBuyerId,
          redirect_uri: 'https://app.example.com/callback',
          scopes: ['profile.read', 'orders.read'],
          state: 'random-state-123',
        });

        expect(authCode.code).toMatch(/^authz_/);
        expect(authCode.client_id).toBe(client.client_id);
        expect(authCode.buyer_id).toBe(testBuyerId);
        expect(authCode.scopes).toHaveLength(2);
        expect(authCode.state).toBe('random-state-123');
        expect(authCode.used).toBe(false);
      });

      it('should create authorization code with PKCE', async () => {
        const { client } = await createTestClient();

        const authCode = await createAuthorizationCode(testTenantId, {
          client_id: client.client_id,
          buyer_id: testBuyerId,
          redirect_uri: 'https://app.example.com/callback',
          scopes: ['profile.read'],
          state: 'random-state-123',
          code_challenge: 'challenge-hash',
          code_challenge_method: 'S256',
        });

        expect(authCode.code_challenge).toBe('challenge-hash');
        expect(authCode.code_challenge_method).toBe('S256');
      });
    });

    describe('exchangeAuthorizationCode', () => {
      it('should exchange code for tokens', async () => {
        const { client } = await createTestClient();
        const authCode = await createAuthorizationCode(testTenantId, {
          client_id: client.client_id,
          buyer_id: testBuyerId,
          redirect_uri: 'https://app.example.com/callback',
          scopes: ['profile.read', 'orders.read'],
          state: 'random-state-123',
        });

        const tokens = await exchangeAuthorizationCode(authCode.code, {
          client_id: client.client_id,
          redirect_uri: 'https://app.example.com/callback',
        });

        expect(tokens.access_token).toBeDefined();
        expect(tokens.refresh_token).toBeDefined();
        expect(tokens.token_type).toBe('Bearer');
        expect(tokens.expires_in).toBe(3600);
        expect(tokens.scope).toBe('profile.read orders.read');
      });

      it('should reject already used code', async () => {
        const { client } = await createTestClient();
        const authCode = await createAuthorizationCode(testTenantId, {
          client_id: client.client_id,
          buyer_id: testBuyerId,
          redirect_uri: 'https://app.example.com/callback',
          scopes: ['profile.read'],
          state: 'random-state-123',
        });

        // First exchange
        await exchangeAuthorizationCode(authCode.code, {
          client_id: client.client_id,
          redirect_uri: 'https://app.example.com/callback',
        });

        // Second exchange should fail
        await expect(
          exchangeAuthorizationCode(authCode.code, {
            client_id: client.client_id,
            redirect_uri: 'https://app.example.com/callback',
          })
        ).rejects.toMatchObject({
          error: 'invalid_grant',
        });
      });

      it('should reject mismatched redirect_uri', async () => {
        const { client } = await createTestClient();
        const authCode = await createAuthorizationCode(testTenantId, {
          client_id: client.client_id,
          buyer_id: testBuyerId,
          redirect_uri: 'https://app.example.com/callback',
          scopes: ['profile.read'],
          state: 'random-state-123',
        });

        await expect(
          exchangeAuthorizationCode(authCode.code, {
            client_id: client.client_id,
            redirect_uri: 'https://app.example.com/callback2',
          })
        ).rejects.toMatchObject({
          error: 'invalid_grant',
        });
      });

      it('should reject non-existent code', async () => {
        const { client } = await createTestClient();

        await expect(
          exchangeAuthorizationCode('non-existent-code', {
            client_id: client.client_id,
            redirect_uri: 'https://app.example.com/callback',
          })
        ).rejects.toMatchObject({
          error: 'invalid_grant',
        });
      });
    });
  });

  // ===========================================================================
  // Token Management Tests
  // ===========================================================================

  describe('Token Management', () => {
    describe('validateAccessToken', () => {
      it('should validate valid access token', async () => {
        const result = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-123',
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        const validated = await validateAccessToken(result._access_token);

        expect(validated).not.toBeNull();
        expect(validated?.buyer_id).toBe(testBuyerId);
      });

      it('should reject invalid access token', async () => {
        const validated = await validateAccessToken('invalid-token');
        expect(validated).toBeNull();
      });
    });

    describe('refreshTokens', () => {
      it('should refresh tokens', async () => {
        const { client } = await createTestClient();
        const linked = await createLinkedAccount(testTenantId, {
          platform_id: client.client_id,
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read', 'orders.read'],
        });

        const newTokens = await refreshTokens(linked._refresh_token, client.client_id);

        expect(newTokens.access_token).toBeDefined();
        expect(newTokens.refresh_token).toBeDefined();
        expect(newTokens.access_token).not.toBe(linked._access_token);
        expect(newTokens.refresh_token).not.toBe(linked._refresh_token);
      });

      it('should reject invalid refresh token', async () => {
        const { client } = await createTestClient();

        await expect(
          refreshTokens('invalid-refresh-token', client.client_id)
        ).rejects.toMatchObject({
          error: 'invalid_grant',
        });
      });

      it('should reject refresh token from different client', async () => {
        const { client: client1 } = await createTestClient();
        const { client: client2 } = await registerClient(testTenantId, {
          name: 'Other App',
          redirect_uris: ['https://other.example.com/callback'],
        });

        const linked = await createLinkedAccount(testTenantId, {
          platform_id: client1.client_id,
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        await expect(
          refreshTokens(linked._refresh_token, client2.client_id)
        ).rejects.toMatchObject({
          error: 'invalid_grant',
        });
      });
    });

    describe('revokeToken', () => {
      it('should revoke access token', async () => {
        const linked = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-123',
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        await revokeToken(linked._access_token, 'access_token');

        // Token should no longer be valid
        const validated = await validateAccessToken(linked._access_token);
        expect(validated).toBeNull();
      });

      it('should revoke refresh token', async () => {
        const { client } = await createTestClient();
        const linked = await createLinkedAccount(testTenantId, {
          platform_id: client.client_id,
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        await revokeToken(linked._refresh_token, 'refresh_token');

        // Refresh should no longer work
        await expect(
          refreshTokens(linked._refresh_token, client.client_id)
        ).rejects.toMatchObject({
          error: 'invalid_grant',
        });
      });
    });
  });

  // ===========================================================================
  // Linked Account Tests
  // ===========================================================================

  describe('Linked Account Management', () => {
    describe('createLinkedAccount', () => {
      it('should create linked account with tokens', async () => {
        const result = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-123',
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          buyer_email: testBuyerEmail,
          scopes: ['profile.read', 'orders.read'],
        });

        expect(result.id).toMatch(/^link_/);
        expect(result.platform_id).toBe('platform-123');
        expect(result.buyer_id).toBe(testBuyerId);
        expect(result.scopes).toHaveLength(2);
        expect(result.is_active).toBe(true);
        expect(result._access_token).toMatch(/^ucp_at_/);
        expect(result._refresh_token).toMatch(/^ucp_rt_/);
      });
    });

    describe('getLinkedAccount', () => {
      it('should get linked account by ID', async () => {
        const created = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-123',
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        const found = await getLinkedAccount(created.id, testTenantId);

        expect(found).not.toBeNull();
        expect(found?.buyer_id).toBe(testBuyerId);
      });

      it('should return null for different tenant', async () => {
        const created = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-123',
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        const found = await getLinkedAccount(created.id, 'other-tenant');
        expect(found).toBeNull();
      });
    });

    describe('listLinkedAccountsByBuyer', () => {
      it('should list accounts for a buyer', async () => {
        await createLinkedAccount(testTenantId, {
          platform_id: 'platform-1',
          platform_name: 'Platform 1',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        await createLinkedAccount(testTenantId, {
          platform_id: 'platform-2',
          platform_name: 'Platform 2',
          buyer_id: testBuyerId,
          scopes: ['orders.read'],
        });

        const accounts = await listLinkedAccountsByBuyer(testTenantId, testBuyerId);

        expect(accounts).toHaveLength(2);
      });

      it('should not include inactive accounts', async () => {
        const linked = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-1',
          platform_name: 'Platform 1',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        // Revoke to deactivate
        await revokeToken(linked._access_token);

        const accounts = await listLinkedAccountsByBuyer(testTenantId, testBuyerId);
        expect(accounts).toHaveLength(0);
      });
    });

    describe('listLinkedAccountsByPlatform', () => {
      it('should list accounts for a platform', async () => {
        await createLinkedAccount(testTenantId, {
          platform_id: 'platform-x',
          platform_name: 'Platform X',
          buyer_id: 'buyer-1',
          scopes: ['profile.read'],
        });

        await createLinkedAccount(testTenantId, {
          platform_id: 'platform-x',
          platform_name: 'Platform X',
          buyer_id: 'buyer-2',
          scopes: ['profile.read'],
        });

        await createLinkedAccount(testTenantId, {
          platform_id: 'other-platform',
          platform_name: 'Other',
          buyer_id: 'buyer-3',
          scopes: ['profile.read'],
        });

        const { data, total } = await listLinkedAccountsByPlatform(testTenantId, 'platform-x');

        expect(data).toHaveLength(2);
        expect(total).toBe(2);
      });

      it('should support pagination', async () => {
        for (let i = 0; i < 5; i++) {
          await createLinkedAccount(testTenantId, {
            platform_id: 'platform-y',
            platform_name: 'Platform Y',
            buyer_id: `buyer-${i}`,
            scopes: ['profile.read'],
          });
        }

        const { data, total } = await listLinkedAccountsByPlatform(
          testTenantId,
          'platform-y',
          { limit: 2, offset: 0 }
        );

        expect(data).toHaveLength(2);
        expect(total).toBe(5);
      });
    });

    describe('unlinkAccount', () => {
      it('should unlink account', async () => {
        const linked = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-123',
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        await unlinkAccount(linked.id, testTenantId, testBuyerId);

        // Should no longer be active
        const accounts = await listLinkedAccountsByBuyer(testTenantId, testBuyerId);
        expect(accounts).toHaveLength(0);

        // Token should no longer work
        const validated = await validateAccessToken(linked._access_token);
        expect(validated).toBeNull();
      });

      it('should reject unlink for wrong buyer', async () => {
        const linked = await createLinkedAccount(testTenantId, {
          platform_id: 'platform-123',
          platform_name: 'Test Platform',
          buyer_id: testBuyerId,
          scopes: ['profile.read'],
        });

        await expect(
          unlinkAccount(linked.id, testTenantId, 'other-buyer')
        ).rejects.toThrow('Linked account not found');
      });
    });
  });

  // ===========================================================================
  // Scope Tests
  // ===========================================================================

  describe('Scope Validation', () => {
    let linkedAccount: UCPLinkedAccount;

    beforeEach(async () => {
      const result = await createLinkedAccount(testTenantId, {
        platform_id: 'platform-123',
        platform_name: 'Test Platform',
        buyer_id: testBuyerId,
        scopes: ['profile.read', 'orders.read', 'checkout.create'],
      });
      linkedAccount = result;
    });

    describe('hasScope', () => {
      it('should return true for granted scope', () => {
        expect(hasScope(linkedAccount, 'profile.read')).toBe(true);
      });

      it('should return false for non-granted scope', () => {
        expect(hasScope(linkedAccount, 'profile.write')).toBe(false);
      });
    });

    describe('hasAllScopes', () => {
      it('should return true when all scopes are granted', () => {
        expect(hasAllScopes(linkedAccount, ['profile.read', 'orders.read'])).toBe(true);
      });

      it('should return false when any scope is missing', () => {
        expect(hasAllScopes(linkedAccount, ['profile.read', 'profile.write'])).toBe(false);
      });
    });

    describe('hasAnyScope', () => {
      it('should return true when any scope is granted', () => {
        expect(hasAnyScope(linkedAccount, ['profile.write', 'orders.read'])).toBe(true);
      });

      it('should return false when no scope is granted', () => {
        expect(hasAnyScope(linkedAccount, ['profile.write', 'addresses.read'])).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Utility Tests
  // ===========================================================================

  describe('Utilities', () => {
    describe('getAllScopes', () => {
      it('should return all available scopes', () => {
        const scopes = getAllScopes();

        expect(scopes).toContain('profile.read');
        expect(scopes).toContain('profile.write');
        expect(scopes).toContain('checkout.create');
        expect(scopes).toContain('checkout.complete');
        expect(scopes.length).toBeGreaterThan(0);
      });
    });

    describe('createOAuthError', () => {
      it('should create OAuth error object', () => {
        const error = createOAuthError('invalid_grant', 'Token expired');

        expect(error.error).toBe('invalid_grant');
        expect(error.error_description).toBe('Token expired');
      });
    });
  });
});
