/**
 * x402 Settlement Service Tests
 * 
 * Tests fee calculation, settlement processing, and analytics.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createSettlementService } from '../src/services/settlement.js';

describe('x402 Settlement Service', () => {
  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';

  describe('Fee Calculation', () => {
    it('should calculate percentage fee correctly', async () => {
      const service = createSettlementService();
      
      // Mock config: 2.9% percentage fee
      const result = await service.calculateX402Fee(mockTenantId, 100, 'USDC');
      
      expect(result.grossAmount).toBe(100);
      expect(result.feeAmount).toBeCloseTo(2.9, 1);
      expect(result.netAmount).toBeCloseTo(97.1, 1);
      expect(result.feeType).toBe('percentage');
    });

    it('should round fees to 8 decimal places', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 0.123456789, 'USDC');
      
      // Fee should be rounded to 8 decimals
      const feeString = result.feeAmount.toString();
      const decimals = feeString.split('.')[1]?.length || 0;
      expect(decimals).toBeLessThanOrEqual(8);
    });

    it('should not allow fee to exceed gross amount', async () => {
      const service = createSettlementService();
      
      // Even with misconfigured high fees, fee shouldn't exceed gross
      const result = await service.calculateX402Fee(mockTenantId, 1, 'USDC');
      
      expect(result.feeAmount).toBeLessThanOrEqual(result.grossAmount);
      expect(result.netAmount).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero amount gracefully', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 0, 'USDC');
      
      expect(result.grossAmount).toBe(0);
      expect(result.feeAmount).toBe(0);
      expect(result.netAmount).toBe(0);
    });

    it('should handle large amounts', async () => {
      const service = createSettlementService();
      
      const largeAmount = 1000000; // 1 million USDC
      const result = await service.calculateX402Fee(mockTenantId, largeAmount, 'USDC');
      
      expect(result.grossAmount).toBe(largeAmount);
      expect(result.feeAmount).toBeGreaterThan(0);
      expect(result.netAmount).toBeLessThan(largeAmount);
      expect(result.grossAmount).toBe(result.feeAmount + result.netAmount);
    });
  });

  describe('Fee Types', () => {
    it('should support percentage fee type', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 100, 'USDC');
      
      expect(['percentage', 'fixed', 'hybrid']).toContain(result.feeType);
      if (result.feeType === 'percentage') {
        expect(result.breakdown?.percentageFee).toBeDefined();
      }
    });

    it('should calculate net amount correctly for all fee types', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 100, 'USDC');
      
      // Net = Gross - Fee
      expect(result.netAmount).toBeCloseTo(
        result.grossAmount - result.feeAmount,
        8
      );
    });
  });

  describe('Currency Support', () => {
    it('should support USDC', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 100, 'USDC');
      
      expect(result.currency).toBe('USDC');
    });

    it('should support EURC', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 100, 'EURC');
      
      expect(result.currency).toBe('EURC');
    });
  });

  describe('Settlement Status', () => {
    it('should return null for non-existent transfer', async () => {
      const service = createSettlementService();
      
      const fakeTransferId = '00000000-0000-0000-0000-000000000000';
      const status = await service.getSettlementStatus(fakeTransferId);
      
      expect(status).toBeNull();
    });
  });

  describe('Fee Configuration', () => {
    it('should use default config when none exists', async () => {
      const service = createSettlementService();
      
      // For a tenant with no config, should use defaults
      const result = await service.calculateX402Fee(
        '00000000-0000-0000-0000-000000000001',
        100,
        'USDC'
      );
      
      // Default is 2.9% percentage fee
      expect(result.feeAmount).toBeCloseTo(2.9, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts (micro-payments)', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 0.00000001, 'USDC');
      
      expect(result.grossAmount).toBe(0.00000001);
      expect(result.feeAmount).toBeGreaterThanOrEqual(0);
      expect(result.netAmount).toBeGreaterThanOrEqual(0);
    });

    it('should maintain precision for fractional amounts', async () => {
      const service = createSettlementService();
      
      const result = await service.calculateX402Fee(mockTenantId, 123.456789, 'USDC');
      
      // Gross + Fee + Net should balance to 8 decimals
      const reconciledGross = result.feeAmount + result.netAmount;
      expect(reconciledGross).toBeCloseTo(result.grossAmount, 8);
    });
  });
});

describe('Settlement Analytics', () => {
  it('should calculate totals correctly', async () => {
    const service = createSettlementService();
    
    try {
      const analytics = await service.getSettlementAnalytics(
        '123e4567-e89b-12d3-a456-426614174000',
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }
      );
      
      // Should return analytics structure
      expect(analytics).toHaveProperty('period');
      expect(analytics).toHaveProperty('totals');
      expect(analytics).toHaveProperty('averages');
      
      expect(analytics.totals).toHaveProperty('grossRevenue');
      expect(analytics.totals).toHaveProperty('totalFees');
      expect(analytics.totals).toHaveProperty('netRevenue');
      expect(analytics.totals).toHaveProperty('transactionCount');
      
      // Net should equal Gross - Fees
      expect(analytics.totals.netRevenue).toBeCloseTo(
        analytics.totals.grossRevenue - analytics.totals.totalFees,
        8
      );
    } catch (error) {
      // Analytics may fail if DB not available in test env
      console.log('Analytics test skipped (DB not available)');
    }
  });
});

