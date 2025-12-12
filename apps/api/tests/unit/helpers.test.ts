import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  isValidEmail,
  getPaginationParams,
  paginationResponse,
  mapAccountFromDb,
  mapAgentFromDb,
  mapTransferFromDb,
  mapStreamFromDb,
} from '../../src/utils/helpers.js';

describe('Helper Utilities', () => {
  describe('isValidUUID', () => {
    it('validates correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('aaaaaaaa-0000-0000-0000-000000000001')).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('validates correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@gmail.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('getPaginationParams', () => {
    it('returns defaults for empty query', () => {
      const result = getPaginationParams({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('parses valid page and limit', () => {
      const result = getPaginationParams({ page: '3', limit: '50' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it('clamps page to minimum 1', () => {
      const result = getPaginationParams({ page: '-5', limit: '20' });
      expect(result.page).toBe(1);
    });

    it('clamps limit to maximum 100', () => {
      const result = getPaginationParams({ page: '1', limit: '500' });
      expect(result.limit).toBe(100);
    });

    it('clamps limit to minimum 1', () => {
      const result = getPaginationParams({ page: '1', limit: '-10' });
      expect(result.limit).toBe(1);
    });
  });

  describe('paginationResponse', () => {
    it('creates correct pagination metadata', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = paginationResponse(data, 50, { page: 2, limit: 10 });

      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('handles empty data', () => {
      const result = paginationResponse([], 0, { page: 1, limit: 20 });
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('mapAccountFromDb', () => {
    it('maps database row to Account type', () => {
      const dbRow = {
        id: 'test-id',
        tenant_id: 'tenant-id',
        type: 'business',
        name: 'Test Corp',
        email: 'test@corp.com',
        verification_tier: 2,
        verification_status: 'verified',
        verification_type: 'kyb',
        balance_total: '1000.50',
        balance_available: '800.00',
        balance_in_streams: '200.50',
        balance_buffer: '50.00',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = mapAccountFromDb(dbRow);

      expect(result.id).toBe('test-id');
      expect(result.tenantId).toBe('tenant-id');
      expect(result.type).toBe('business');
      expect(result.name).toBe('Test Corp');
      expect(result.email).toBe('test@corp.com');
      expect(result.verification.tier).toBe(2);
      expect(result.verification.status).toBe('verified');
      expect(result.balance.total).toBe(1000.50);
      expect(result.balance.available).toBe(800);
      expect(result.balance.inStreams.total).toBe(200.50);
    });

    it('handles missing optional fields', () => {
      const dbRow = {
        id: 'test-id',
        tenant_id: 'tenant-id',
        type: 'person',
        name: 'Test Person',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = mapAccountFromDb(dbRow);

      expect(result.email).toBeUndefined();
      expect(result.verification.tier).toBe(0);
      expect(result.balance.total).toBe(0);
    });
  });

  describe('mapTransferFromDb', () => {
    it('maps database row to Transfer type', () => {
      const dbRow = {
        id: 'transfer-id',
        tenant_id: 'tenant-id',
        type: 'internal',
        status: 'completed',
        from_account_id: 'from-id',
        from_account_name: 'Sender',
        to_account_id: 'to-id',
        to_account_name: 'Receiver',
        initiated_by_type: 'user',
        initiated_by_id: 'user-id',
        initiated_by_name: 'Test User',
        amount: '500.00',
        currency: 'USDC',
        fee_amount: '2.50',
        created_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:01:00Z',
      };

      const result = mapTransferFromDb(dbRow);

      expect(result.id).toBe('transfer-id');
      expect(result.type).toBe('internal');
      expect(result.status).toBe('completed');
      expect(result.from.accountId).toBe('from-id');
      expect(result.to.accountName).toBe('Receiver');
      expect(result.amount).toBe(500);
      expect(result.fees).toBe(2.5);
    });
  });

  describe('mapStreamFromDb', () => {
    it('maps database row to Stream type', () => {
      const dbRow = {
        id: 'stream-id',
        tenant_id: 'tenant-id',
        status: 'active',
        sender_account_id: 'sender-id',
        sender_account_name: 'Sender Corp',
        receiver_account_id: 'receiver-id',
        receiver_account_name: 'Receiver Person',
        initiated_by_type: 'agent',
        initiated_by_id: 'agent-id',
        initiated_by_name: 'Payroll Bot',
        managed_by_type: 'agent',
        managed_by_id: 'agent-id',
        managed_by_name: 'Payroll Bot',
        managed_by_can_modify: true,
        managed_by_can_pause: true,
        managed_by_can_terminate: true,
        flow_rate_per_second: '0.001',
        flow_rate_per_month: '2500',
        currency: 'USDC',
        total_streamed: '100.00',
        total_withdrawn: '50.00',
        funded_amount: '1000.00',
        buffer_amount: '100.00',
        runway_seconds: 900000,
        health: 'healthy',
        description: 'Monthly salary',
        category: 'salary',
        started_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = mapStreamFromDb(dbRow);

      expect(result.id).toBe('stream-id');
      expect(result.status).toBe('active');
      expect(result.sender.accountName).toBe('Sender Corp');
      expect(result.receiver.accountId).toBe('receiver-id');
      expect(result.flowRate.perMonth).toBe(2500);
      expect(result.streamed.total).toBe(100);
      expect(result.streamed.available).toBe(50);
      expect(result.health).toBe('healthy');
    });
  });

  describe('mapAgentFromDb', () => {
    it('maps database row to Agent type', () => {
      const dbRow = {
        id: 'agent-id',
        tenant_id: 'tenant-id',
        name: 'Test Agent',
        description: 'A test agent',
        status: 'active',
        parent_account_id: 'parent-id',
        kya_tier: 2,
        kya_status: 'verified',
        kya_verified_at: '2024-01-01T00:00:00Z',
        limit_per_transaction: '5000',
        limit_daily: '50000',
        limit_monthly: '200000',
        effective_limit_per_tx: '5000',
        effective_limit_daily: '50000',
        effective_limit_monthly: '200000',
        effective_limits_capped: false,
        permissions: {
          transactions: { initiate: true, approve: false, view: true },
          streams: { initiate: true, modify: true, pause: true, terminate: true, view: true },
        },
        active_streams_count: 3,
        total_stream_outflow: '7500',
        max_active_streams: 10,
        max_total_outflow: '100000',
        auth_type: 'api_key',
        auth_client_id: 'agent_test_123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = mapAgentFromDb(dbRow);

      expect(result.id).toBe('agent-id');
      expect(result.name).toBe('Test Agent');
      expect(result.status).toBe('active');
      expect(result.kya.tier).toBe(2);
      expect(result.kya.effectiveLimits.perTransaction).toBe(5000);
      expect(result.streamStats.activeStreams).toBe(3);
      expect(result.auth.clientId).toBe('agent_test_123');
    });
  });
});

