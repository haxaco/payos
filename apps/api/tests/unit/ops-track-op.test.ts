import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OpType,
  OpCategory,
  getCategoryFromOpType,
  getProtocolFromOpType,
} from '../../src/services/ops/operation-types.js';
import { normalizePath } from '../../src/services/ops/request-counter.js';

describe('Operations Observability', () => {
  describe('OpType enum', () => {
    it('has settlement types', () => {
      expect(OpType.SETTLEMENT_DOMESTIC).toBe('settlement.domestic');
      expect(OpType.SETTLEMENT_CROSS_BORDER).toBe('settlement.cross_border');
      expect(OpType.SETTLEMENT_ASYNC).toBe('settlement.async');
      expect(OpType.SETTLEMENT_BATCH_NET).toBe('settlement.batch_net');
      expect(OpType.SETTLEMENT_CCTP_BRIDGE).toBe('settlement.cctp_bridge');
    });

    it('has UCP types', () => {
      expect(OpType.UCP_CHECKOUT_CREATED).toBe('ucp.checkout_created');
      expect(OpType.UCP_CHECKOUT_COMPLETED).toBe('ucp.checkout_completed');
      expect(OpType.UCP_ORDER_CREATED).toBe('ucp.order_created');
      expect(OpType.UCP_SETTLEMENT_EXECUTED).toBe('ucp.settlement_executed');
    });

    it('has ACP types', () => {
      expect(OpType.ACP_CHECKOUT_CREATED).toBe('acp.checkout_created');
      expect(OpType.ACP_BATCH_INITIATED).toBe('acp.batch_initiated');
    });

    it('has AP2 types', () => {
      expect(OpType.AP2_MANDATE_CREATED).toBe('ap2.mandate_created');
      expect(OpType.AP2_MANDATE_EXECUTED).toBe('ap2.mandate_executed');
    });

    it('has x402 types', () => {
      expect(OpType.X402_PAYMENT_SENT).toBe('x402.payment_sent');
      expect(OpType.X402_ENDPOINT_CREATED).toBe('x402.endpoint_created');
    });

    it('has governance/compliance types', () => {
      expect(OpType.GOVERNANCE_KYA).toBe('governance.kya');
      expect(OpType.COMPLIANCE_SANCTIONS).toBe('compliance.sanctions');
    });

    it('has at least 48 entries', () => {
      const count = Object.keys(OpType).length;
      expect(count).toBeGreaterThanOrEqual(48);
    });
  });

  describe('getCategoryFromOpType', () => {
    it('maps settlement ops to SETTLEMENT', () => {
      expect(getCategoryFromOpType(OpType.SETTLEMENT_DOMESTIC)).toBe(OpCategory.SETTLEMENT);
      expect(getCategoryFromOpType(OpType.SETTLEMENT_ASYNC)).toBe(OpCategory.SETTLEMENT);
      expect(getCategoryFromOpType(OpType.FX_QUOTE)).toBe(OpCategory.SETTLEMENT);
    });

    it('maps UCP ops to UCP', () => {
      expect(getCategoryFromOpType(OpType.UCP_CHECKOUT_CREATED)).toBe(OpCategory.UCP);
    });

    it('maps wallet ops to WALLET', () => {
      expect(getCategoryFromOpType(OpType.WALLET_CREATED)).toBe(OpCategory.WALLET);
    });

    it('maps protocol ops correctly', () => {
      expect(getCategoryFromOpType(OpType.ACP_CHECKOUT_CREATED)).toBe(OpCategory.ACP);
      expect(getCategoryFromOpType(OpType.AP2_MANDATE_CREATED)).toBe(OpCategory.AP2);
      expect(getCategoryFromOpType(OpType.X402_PAYMENT_SENT)).toBe(OpCategory.X402);
      expect(getCategoryFromOpType(OpType.A2A_TASK_SENT)).toBe(OpCategory.A2A);
    });
  });

  describe('getProtocolFromOpType', () => {
    it('maps UCP ops to ucp protocol', () => {
      expect(getProtocolFromOpType(OpType.UCP_CHECKOUT_CREATED)).toBe('ucp');
    });

    it('maps ACP ops to acp protocol', () => {
      expect(getProtocolFromOpType(OpType.ACP_CHECKOUT_CREATED)).toBe('acp');
    });

    it('maps AP2 ops to ap2 protocol', () => {
      expect(getProtocolFromOpType(OpType.AP2_MANDATE_CREATED)).toBe('ap2');
    });

    it('maps x402 ops to x402 protocol', () => {
      expect(getProtocolFromOpType(OpType.X402_PAYMENT_SENT)).toBe('x402');
    });

    it('maps CCTP bridge to cctp protocol', () => {
      expect(getProtocolFromOpType(OpType.SETTLEMENT_CCTP_BRIDGE)).toBe('cctp');
    });

    it('returns null for non-protocol ops', () => {
      expect(getProtocolFromOpType(OpType.SETTLEMENT_DOMESTIC)).toBeNull();
      expect(getProtocolFromOpType(OpType.GOVERNANCE_KYA)).toBeNull();
    });
  });

  describe('normalizePath', () => {
    it('replaces UUIDs with :id', () => {
      expect(normalizePath('/v1/accounts/550e8400-e29b-41d4-a716-446655440000'))
        .toBe('/v1/accounts/:id');
    });

    it('replaces multiple UUIDs', () => {
      expect(normalizePath('/v1/accounts/550e8400-e29b-41d4-a716-446655440000/agents/aaa00000-0000-0000-0000-000000000001'))
        .toBe('/v1/accounts/:id/agents/:id');
    });

    it('replaces numeric IDs', () => {
      expect(normalizePath('/v1/items/12345')).toBe('/v1/items/:id');
    });

    it('leaves non-ID paths unchanged', () => {
      expect(normalizePath('/v1/accounts')).toBe('/v1/accounts');
      expect(normalizePath('/health')).toBe('/health');
    });
  });
});
