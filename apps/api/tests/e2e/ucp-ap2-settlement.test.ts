/**
 * E2E Test: UCP with AP2 Mandate Settlement
 *
 * Tests autonomous agent purchases using AP2 payment mandates through UCP.
 *
 * @see Story 43.13: E2E UCP + AP2
 * @see Epic 43: UCP Integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TEST_TENANT_ID } from '../setup.js';
import {
  executeSettlementWithMandate,
  clearSettlementStore,
  getSettlement,
  listSettlements,
} from '../../src/services/ucp/settlement.js';
import { clearTokenStore } from '../../src/services/ucp/tokens.js';
import { getAP2MandateService } from '../../src/services/ap2/mandate-service.js';

// =============================================================================
// E2E Tests: UCP + AP2 Mandate Settlement
// =============================================================================

describe('UCP E2E: AP2 Mandate Settlement Flow', () => {
  const testTenantId = TEST_TENANT_ID;
  const mandateService = getAP2MandateService();

  beforeEach(() => {
    clearTokenStore();
    clearSettlementStore();
  });

  afterEach(() => {
    clearTokenStore();
    clearSettlementStore();
  });

  describe('Autonomous Agent Purchase Flow', () => {
    it('should complete UCP settlement using AP2 mandate', async () => {
      const mockSupabase = {} as any;

      // Step 1: Create an AP2 mandate (simulating user authorization)
      const mandate = await mandateService.createMandate({
        payer_id: 'user_12345',
        payer_name: 'John Doe',
        payee_id: 'merchant_abc',
        payee_name: 'Example Shop',
        type: 'recurring',
        max_amount: 500,
        currency: 'USD',
        frequency: 'monthly',
        max_occurrences: 12,
      });
      expect(mandate.status).toBe('pending');

      // Step 2: Activate the mandate (user confirms)
      const activatedMandate = await mandateService.activateMandate(mandate.id);
      expect(activatedMandate.status).toBe('active');

      // Step 3: Agent uses mandate for UCP settlement
      const settlement = await executeSettlementWithMandate(
        testTenantId,
        {
          mandate_token: mandate.id,
          amount: 100,
          currency: 'USD',
          corridor: 'pix',
          recipient: {
            type: 'pix',
            pix_key: 'maria@email.com',
            pix_key_type: 'email',
            name: 'Maria Silva',
          },
        },
        mockSupabase
      );

      expect(settlement.status).toBe('pending');
      expect(settlement.corridor).toBe('pix');
      expect(settlement.amount.source).toBe(100);
      expect(settlement.amount.source_currency).toBe('USD');
      expect(settlement.amount.destination_currency).toBe('BRL');
      expect(settlement.recipient.type).toBe('pix');

      // Step 4: Verify settlement is trackable
      const status = await getSettlement(settlement.id, testTenantId);
      expect(status).toBeDefined();
      expect(status!.id).toBe(settlement.id);

      console.log(`
✅ UCP + AP2 Mandate Test Complete
   Mandate ID: ${mandate.id}
   Settlement ID: ${settlement.id}
   Amount: $${settlement.amount.source} USD → R$${settlement.amount.destination} BRL
   Recipient: Maria Silva (maria@email.com)
`);
    });

    it('should complete SPEI settlement using AP2 mandate', async () => {
      const mockSupabase = {} as any;

      // Create and activate mandate (use USDC to test SPEI with USDC)
      const mandate = await mandateService.createMandate({
        payer_id: 'user_67890',
        payer_name: 'Jane Smith',
        payee_id: 'merchant_xyz',
        payee_name: 'MX Store',
        type: 'single',
        max_amount: 1000,
        currency: 'USDC', // Match the settlement currency
      });
      await mandateService.activateMandate(mandate.id);

      // Execute SPEI settlement via mandate
      const settlement = await executeSettlementWithMandate(
        testTenantId,
        {
          mandate_token: mandate.id,
          amount: 250,
          currency: 'USDC',
          corridor: 'spei',
          recipient: {
            type: 'spei',
            clabe: '012345678901234567',
            name: 'Juan Garcia',
            rfc: 'GAJR850101ABC',
          },
        },
        mockSupabase
      );

      expect(settlement.corridor).toBe('spei');
      expect(settlement.amount.destination_currency).toBe('MXN');
      expect(settlement.recipient.type).toBe('spei');
    });
  });

  describe('Mandate Validation', () => {
    it('should reject settlement with inactive mandate', async () => {
      const mockSupabase = {} as any;

      // Create mandate but don't activate it
      const mandate = await mandateService.createMandate({
        payer_id: 'user_test',
        payee_id: 'merchant_test',
        payee_name: 'Test Merchant',
        max_amount: 100,
        currency: 'USD',
      });

      // Attempt settlement with pending mandate
      await expect(
        executeSettlementWithMandate(
          testTenantId,
          {
            mandate_token: mandate.id,
            amount: 50,
            currency: 'USD',
            corridor: 'pix',
            recipient: {
              type: 'pix',
              pix_key: 'test@email.com',
              pix_key_type: 'email',
              name: 'Test User',
            },
          },
          mockSupabase
        )
      ).rejects.toThrow('Mandate invalid');
    });

    it('should reject settlement exceeding mandate limit', async () => {
      const mockSupabase = {} as any;

      // Create mandate with $100 limit
      const mandate = await mandateService.createMandate({
        payer_id: 'user_limit_test',
        payee_id: 'merchant_test',
        payee_name: 'Test Merchant',
        max_amount: 100,
        currency: 'USD',
      });
      await mandateService.activateMandate(mandate.id);

      // Attempt settlement exceeding limit
      await expect(
        executeSettlementWithMandate(
          testTenantId,
          {
            mandate_token: mandate.id,
            amount: 150, // Exceeds $100 limit
            currency: 'USD',
            corridor: 'pix',
            recipient: {
              type: 'pix',
              pix_key: 'test@email.com',
              pix_key_type: 'email',
              name: 'Test User',
            },
          },
          mockSupabase
        )
      ).rejects.toThrow('exceeds mandate limit');
    });

    it('should reject settlement with currency mismatch', async () => {
      const mockSupabase = {} as any;

      // Create USD mandate
      const mandate = await mandateService.createMandate({
        payer_id: 'user_currency_test',
        payee_id: 'merchant_test',
        payee_name: 'Test Merchant',
        max_amount: 100,
        currency: 'USD',
      });
      await mandateService.activateMandate(mandate.id);

      // Attempt settlement with different currency
      await expect(
        executeSettlementWithMandate(
          testTenantId,
          {
            mandate_token: mandate.id,
            amount: 50,
            currency: 'USDC', // Mandate is for USD
            corridor: 'pix',
            recipient: {
              type: 'pix',
              pix_key: 'test@email.com',
              pix_key_type: 'email',
              name: 'Test User',
            },
          },
          mockSupabase
        )
      ).rejects.toThrow('does not match mandate currency');
    });

    it('should reject settlement with revoked mandate', async () => {
      const mockSupabase = {} as any;

      // Create, activate, then revoke mandate
      const mandate = await mandateService.createMandate({
        payer_id: 'user_revoke_test',
        payee_id: 'merchant_test',
        payee_name: 'Test Merchant',
        max_amount: 100,
        currency: 'USD',
      });
      await mandateService.activateMandate(mandate.id);
      await mandateService.revokeMandate(mandate.id);

      // Attempt settlement with revoked mandate
      await expect(
        executeSettlementWithMandate(
          testTenantId,
          {
            mandate_token: mandate.id,
            amount: 50,
            currency: 'USD',
            corridor: 'pix',
            recipient: {
              type: 'pix',
              pix_key: 'test@email.com',
              pix_key_type: 'email',
              name: 'Test User',
            },
          },
          mockSupabase
        )
      ).rejects.toThrow('Mandate invalid');
    });

    it('should reject settlement with non-existent mandate', async () => {
      const mockSupabase = {} as any;

      await expect(
        executeSettlementWithMandate(
          testTenantId,
          {
            mandate_token: 'mandate_does_not_exist',
            amount: 50,
            currency: 'USD',
            corridor: 'pix',
            recipient: {
              type: 'pix',
              pix_key: 'test@email.com',
              pix_key_type: 'email',
              name: 'Test User',
            },
          },
          mockSupabase
        )
      ).rejects.toThrow('Mandate not found');
    });
  });

  describe('Multiple Settlements with Recurring Mandate', () => {
    it('should allow multiple settlements within mandate limits', async () => {
      const mockSupabase = {} as any;

      // Create recurring mandate
      const mandate = await mandateService.createMandate({
        payer_id: 'user_recurring',
        payee_id: 'merchant_sub',
        payee_name: 'Subscription Service',
        type: 'recurring',
        max_amount: 50,
        currency: 'USD',
        frequency: 'weekly',
      });
      await mandateService.activateMandate(mandate.id);

      // First settlement
      const settlement1 = await executeSettlementWithMandate(
        testTenantId,
        {
          mandate_token: mandate.id,
          amount: 25,
          currency: 'USD',
          corridor: 'pix',
          recipient: {
            type: 'pix',
            pix_key: 'service@email.com',
            pix_key_type: 'email',
            name: 'Subscription Service BR',
          },
        },
        mockSupabase
      );
      expect(settlement1.status).toBe('pending');

      // Second settlement (same mandate)
      const settlement2 = await executeSettlementWithMandate(
        testTenantId,
        {
          mandate_token: mandate.id,
          amount: 25,
          currency: 'USD',
          corridor: 'pix',
          recipient: {
            type: 'pix',
            pix_key: 'service@email.com',
            pix_key_type: 'email',
            name: 'Subscription Service BR',
          },
        },
        mockSupabase
      );
      expect(settlement2.status).toBe('pending');

      // Both settlements should exist
      expect(settlement1.id).not.toBe(settlement2.id);

      // Verify in listing
      const { data } = await listSettlements(testTenantId, {});
      expect(data.length).toBeGreaterThanOrEqual(2);
    });
  });
});
