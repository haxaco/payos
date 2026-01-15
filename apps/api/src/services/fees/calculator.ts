/**
 * Fee Calculation Engine
 * 
 * Calculates fees for all payment types with configurable rules.
 * 
 * @see Story 40.19: Fee Calculation Engine
 */

// =============================================================================
// Types
// =============================================================================

export type PaymentType = 'internal' | 'x402' | 'acp' | 'ap2' | 'pix' | 'spei' | 'wire';
export type FeeType = 'platform' | 'processing' | 'fx' | 'rail' | 'gas' | 'network';

export interface FeeRule {
  type: FeeType;
  name: string;
  calculation: 'percentage' | 'flat' | 'tiered' | 'dynamic';
  value: number;  // Percentage (0.5 = 0.5%) or flat amount
  min?: number;   // Minimum fee
  max?: number;   // Maximum fee
  tiers?: Array<{
    threshold: number;
    rate: number;
  }>;
}

export interface FeeBreakdown {
  type: FeeType;
  name: string;
  amount: number;
  description: string;
  waived?: boolean;
  waiveReason?: string;
}

export interface FeeCalculation {
  subtotal: number;
  total_fees: number;
  net_amount: number;
  breakdown: FeeBreakdown[];
  currency: string;
  waived_fees: number;
}

export interface FeeConfig {
  payment_type: PaymentType;
  rules: FeeRule[];
}

// =============================================================================
// Default Fee Configurations
// =============================================================================

export const DEFAULT_FEE_CONFIGS: Record<PaymentType, FeeRule[]> = {
  internal: [
    // Internal transfers are free
  ],
  
  x402: [
    {
      type: 'platform',
      name: 'Platform Fee',
      calculation: 'percentage',
      value: 0.3,  // 0.3%
      min: 0.01,
    },
    {
      type: 'gas',
      name: 'Gas Fee (Estimated)',
      calculation: 'dynamic',
      value: 0.001,  // Base estimate in ETH, converted to USD
    },
  ],
  
  acp: [
    {
      type: 'platform',
      name: 'Platform Fee',
      calculation: 'percentage',
      value: 0.5,  // 0.5%
      min: 0.10,
    },
    {
      type: 'processing',
      name: 'Processing Fee',
      calculation: 'tiered',
      value: 2.9,  // Default 2.9%
      tiers: [
        { threshold: 0, rate: 2.9 },
        { threshold: 10000, rate: 2.5 },
        { threshold: 100000, rate: 2.2 },
      ],
    },
  ],
  
  ap2: [
    {
      type: 'platform',
      name: 'Platform Fee',
      calculation: 'percentage',
      value: 0.5,
      min: 0.05,
    },
    {
      type: 'processing',
      name: 'Mandate Processing',
      calculation: 'flat',
      value: 0.25,
    },
  ],
  
  pix: [
    {
      type: 'platform',
      name: 'Platform Fee',
      calculation: 'percentage',
      value: 0.5,
      min: 0.50,
    },
    {
      type: 'fx',
      name: 'FX Conversion Fee',
      calculation: 'percentage',
      value: 0.5,
    },
    {
      type: 'rail',
      name: 'Pix Rail Fee',
      calculation: 'flat',
      value: 1.50,  // Fixed Pix fee
    },
  ],
  
  spei: [
    {
      type: 'platform',
      name: 'Platform Fee',
      calculation: 'percentage',
      value: 0.5,
      min: 0.50,
    },
    {
      type: 'fx',
      name: 'FX Conversion Fee',
      calculation: 'percentage',
      value: 0.5,
    },
    {
      type: 'rail',
      name: 'SPEI Rail Fee',
      calculation: 'flat',
      value: 1.00,  // Fixed SPEI fee
    },
  ],
  
  wire: [
    {
      type: 'platform',
      name: 'Platform Fee',
      calculation: 'percentage',
      value: 0.25,
      min: 5.00,
    },
    {
      type: 'rail',
      name: 'Wire Transfer Fee',
      calculation: 'flat',
      value: 25.00,  // Fixed wire fee
    },
  ],
};

// =============================================================================
// Fee Calculator
// =============================================================================

export class FeeCalculator {
  private configs: Record<PaymentType, FeeRule[]>;
  private waivers: Map<string, { reason: string; feeTypes?: FeeType[] }>;

  constructor(customConfigs?: Partial<Record<PaymentType, FeeRule[]>>) {
    this.configs = { ...DEFAULT_FEE_CONFIGS, ...customConfigs };
    this.waivers = new Map();
  }

  /**
   * Calculate fees for a payment
   */
  calculate(
    amount: number,
    paymentType: PaymentType,
    currency: string = 'USD',
    options?: {
      monthlyVolume?: number;
      tenantId?: string;
      promotionCode?: string;
    }
  ): FeeCalculation {
    const rules = this.configs[paymentType] || [];
    const breakdown: FeeBreakdown[] = [];
    let totalFees = 0;
    let waivedFees = 0;

    for (const rule of rules) {
      const feeAmount = this.calculateFee(rule, amount, options?.monthlyVolume);
      const waiver = this.checkWaiver(options?.tenantId, rule.type);
      
      if (waiver) {
        breakdown.push({
          type: rule.type,
          name: rule.name,
          amount: feeAmount,
          description: this.getDescription(rule, feeAmount),
          waived: true,
          waiveReason: waiver.reason,
        });
        waivedFees += feeAmount;
      } else {
        breakdown.push({
          type: rule.type,
          name: rule.name,
          amount: feeAmount,
          description: this.getDescription(rule, feeAmount),
        });
        totalFees += feeAmount;
      }
    }

    return {
      subtotal: amount,
      total_fees: parseFloat(totalFees.toFixed(2)),
      net_amount: parseFloat((amount - totalFees).toFixed(2)),
      breakdown,
      currency,
      waived_fees: parseFloat(waivedFees.toFixed(2)),
    };
  }

  /**
   * Calculate individual fee based on rule
   */
  private calculateFee(
    rule: FeeRule,
    amount: number,
    monthlyVolume?: number
  ): number {
    let fee = 0;

    switch (rule.calculation) {
      case 'percentage':
        fee = amount * (rule.value / 100);
        break;
      
      case 'flat':
        fee = rule.value;
        break;
      
      case 'tiered':
        if (rule.tiers && monthlyVolume !== undefined) {
          // Find applicable tier based on monthly volume
          const tier = [...rule.tiers]
            .reverse()
            .find(t => monthlyVolume >= t.threshold);
          fee = amount * ((tier?.rate || rule.value) / 100);
        } else {
          fee = amount * (rule.value / 100);
        }
        break;
      
      case 'dynamic':
        // Gas estimation - mock for now
        fee = rule.value * 2000;  // Assume $2000/ETH
        break;
    }

    // Apply min/max caps
    if (rule.min !== undefined && fee < rule.min) {
      fee = rule.min;
    }
    if (rule.max !== undefined && fee > rule.max) {
      fee = rule.max;
    }

    return parseFloat(fee.toFixed(2));
  }

  /**
   * Generate fee description
   */
  private getDescription(rule: FeeRule, amount: number): string {
    switch (rule.calculation) {
      case 'percentage':
        return `${rule.value}% of transaction`;
      case 'flat':
        return `Fixed fee: $${rule.value}`;
      case 'tiered':
        return `Volume-based: ${rule.value}%`;
      case 'dynamic':
        return `Estimated: $${amount.toFixed(2)}`;
      default:
        return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Check for fee waivers
   */
  private checkWaiver(
    tenantId?: string,
    feeType?: FeeType
  ): { reason: string } | null {
    if (!tenantId) return null;
    
    const waiver = this.waivers.get(tenantId);
    if (!waiver) return null;
    
    if (waiver.feeTypes && feeType && !waiver.feeTypes.includes(feeType)) {
      return null;
    }
    
    return { reason: waiver.reason };
  }

  /**
   * Add a fee waiver for a tenant
   */
  addWaiver(
    tenantId: string,
    reason: string,
    feeTypes?: FeeType[]
  ): void {
    this.waivers.set(tenantId, { reason, feeTypes });
  }

  /**
   * Remove a fee waiver
   */
  removeWaiver(tenantId: string): void {
    this.waivers.delete(tenantId);
  }

  /**
   * Get fee estimate without recording
   */
  estimate(
    amount: number,
    paymentType: PaymentType,
    currency: string = 'USD'
  ): { min_fee: number; max_fee: number; estimated_fee: number } {
    const calc = this.calculate(amount, paymentType, currency);
    
    return {
      min_fee: Math.max(calc.total_fees * 0.9, 0),
      max_fee: calc.total_fees * 1.1,
      estimated_fee: calc.total_fees,
    };
  }

  /**
   * Get all configured fee rules
   */
  getRules(paymentType: PaymentType): FeeRule[] {
    return this.configs[paymentType] || [];
  }

  /**
   * Update fee configuration
   */
  updateConfig(paymentType: PaymentType, rules: FeeRule[]): void {
    this.configs[paymentType] = rules;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let feeCalculator: FeeCalculator | null = null;

export function getFeeCalculator(): FeeCalculator {
  if (!feeCalculator) {
    feeCalculator = new FeeCalculator();
  }
  return feeCalculator;
}



