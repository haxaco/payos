/**
 * Multi-Currency Service
 * 
 * Supports cross-LATAM corridors via USD intermediary:
 * - USD → BRL (direct)
 * - USD → MXN (direct)
 * - BRL → MXN (via USD - two-hop)
 * - MXN → BRL (via USD - two-hop)
 * 
 * @see Story 40.17: Multi-Currency Support
 * @module services/fx/multi-currency
 */

import { getCircleFXService, type FXQuote } from '../circle/fx.js';

// =============================================================================
// Types
// =============================================================================

export type SupportedCurrency = 'USD' | 'USDC' | 'BRL' | 'MXN' | 'ARS' | 'COP' | 'PKR';

export interface ConversionRoute {
  source: SupportedCurrency;
  destination: SupportedCurrency;
  via?: SupportedCurrency;  // Intermediate currency for two-hop
  steps: ConversionStep[];
  total_rate: number;
  total_fee_percentage: number;
  estimated_time: string;
}

export interface ConversionStep {
  from: SupportedCurrency;
  to: SupportedCurrency;
  rate: number;
  fee_percentage: number;
}

export interface MultiCurrencyQuote {
  id: string;
  source_currency: SupportedCurrency;
  destination_currency: SupportedCurrency;
  source_amount: number;
  destination_amount: number;
  route: ConversionRoute;
  quotes: FXQuote[];  // Individual quotes for each step
  total_fee: number;
  expires_at: string;
  created_at: string;
}

export interface BestRateResult {
  direct?: ConversionRoute;
  via_usd?: ConversionRoute;
  best: ConversionRoute;
  savings?: {
    amount: number;
    percentage: number;
    better_route: 'direct' | 'via_usd';
  };
}

// =============================================================================
// Corridor Configuration
// =============================================================================

export const SUPPORTED_CORRIDORS: Array<{
  source: SupportedCurrency;
  destination: SupportedCurrency;
  direct: boolean;
  settlement_rail: string;
  estimated_time: string;
}> = [
  // Direct corridors (USD-based)
  { source: 'USD', destination: 'BRL', direct: true, settlement_rail: 'pix', estimated_time: '2-5 minutes' },
  { source: 'USD', destination: 'MXN', direct: true, settlement_rail: 'spei', estimated_time: '1-3 minutes' },
  { source: 'USDC', destination: 'BRL', direct: true, settlement_rail: 'pix', estimated_time: '2-5 minutes' },
  { source: 'USDC', destination: 'MXN', direct: true, settlement_rail: 'spei', estimated_time: '1-3 minutes' },
  
  // Reverse corridors
  { source: 'BRL', destination: 'USD', direct: true, settlement_rail: 'wire', estimated_time: '1-2 days' },
  { source: 'MXN', destination: 'USD', direct: true, settlement_rail: 'wire', estimated_time: '1-2 days' },
  
  // Cross-LATAM corridors (via USD)
  { source: 'BRL', destination: 'MXN', direct: false, settlement_rail: 'spei', estimated_time: '5-10 minutes' },
  { source: 'MXN', destination: 'BRL', direct: false, settlement_rail: 'pix', estimated_time: '5-10 minutes' },
  
  // Future: Additional LATAM currencies
  { source: 'USD', destination: 'ARS', direct: true, settlement_rail: 'cbu', estimated_time: '1-2 days' },
  { source: 'USD', destination: 'COP', direct: true, settlement_rail: 'pse', estimated_time: '1-2 days' },

  // Pakistan remittance corridors
  { source: 'USD', destination: 'PKR', direct: true, settlement_rail: 'raast', estimated_time: '5-15 minutes' },
  { source: 'USDC', destination: 'PKR', direct: true, settlement_rail: 'raast', estimated_time: '5-15 minutes' },
];

// =============================================================================
// Multi-Currency Service
// =============================================================================

export class MultiCurrencyService {
  private fxService = getCircleFXService();

  /**
   * Get a multi-currency quote with route optimization
   */
  async getQuote(
    source: SupportedCurrency,
    destination: SupportedCurrency,
    sourceAmount: number
  ): Promise<MultiCurrencyQuote> {
    const normalizedSource = this.normalizeCurrency(source);
    const normalizedDest = this.normalizeCurrency(destination);
    
    // Same currency - no conversion needed
    if (normalizedSource === normalizedDest) {
      return this.createIdentityQuote(source, destination, sourceAmount);
    }
    
    // Get best route
    const bestRate = await this.getBestRate(normalizedSource, normalizedDest, sourceAmount);
    const route = bestRate.best;
    
    // Generate quotes for each step
    const quotes: FXQuote[] = [];
    let currentAmount = sourceAmount;
    
    for (const step of route.steps) {
      const quote = await this.fxService.getQuote({
        source_currency: step.from,
        destination_currency: step.to,
        source_amount: currentAmount,
      });
      quotes.push(quote);
      currentAmount = quote.destination_amount || 0;
    }
    
    const totalFee = quotes.reduce((sum, q) => sum + q.total_fee, 0);
    const finalAmount = quotes[quotes.length - 1]?.destination_amount || 0;
    
    // Use shortest expiration from all quotes
    const expirations = quotes.map(q => new Date(q.expires_at).getTime());
    const expiresAt = new Date(Math.min(...expirations)).toISOString();
    
    return {
      id: `mcq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source_currency: source,
      destination_currency: destination,
      source_amount: sourceAmount,
      destination_amount: parseFloat(finalAmount.toFixed(2)),
      route,
      quotes,
      total_fee: parseFloat(totalFee.toFixed(2)),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Get best conversion rate - compares direct vs via USD
   */
  async getBestRate(
    source: SupportedCurrency,
    destination: SupportedCurrency,
    amount: number
  ): Promise<BestRateResult> {
    const corridor = this.getCorridor(source, destination);
    
    // If direct corridor exists
    if (corridor?.direct) {
      const quote = await this.fxService.getQuote({
        source_currency: source,
        destination_currency: destination,
        source_amount: amount,
      });
      
      const directRoute: ConversionRoute = {
        source,
        destination,
        steps: [{
          from: source,
          to: destination,
          rate: quote.rate,
          fee_percentage: quote.fee_percentage,
        }],
        total_rate: quote.rate,
        total_fee_percentage: quote.fee_percentage,
        estimated_time: corridor.estimated_time,
      };
      
      return {
        direct: directRoute,
        best: directRoute,
      };
    }
    
    // Cross-LATAM: Route via USD
    const leg1 = await this.fxService.getQuote({
      source_currency: source,
      destination_currency: 'USD',
      source_amount: amount,
    });
    
    const leg2 = await this.fxService.getQuote({
      source_currency: 'USD',
      destination_currency: destination,
      source_amount: leg1.destination_amount,
    });
    
    const viaUsdRoute: ConversionRoute = {
      source,
      destination,
      via: 'USD',
      steps: [
        {
          from: source,
          to: 'USD',
          rate: leg1.rate,
          fee_percentage: leg1.fee_percentage,
        },
        {
          from: 'USD',
          to: destination,
          rate: leg2.rate,
          fee_percentage: leg2.fee_percentage,
        },
      ],
      total_rate: leg1.rate * leg2.rate,
      total_fee_percentage: leg1.fee_percentage + leg2.fee_percentage,
      estimated_time: corridor?.estimated_time || '5-10 minutes',
    };
    
    return {
      via_usd: viaUsdRoute,
      best: viaUsdRoute,
    };
  }

  /**
   * Get supported corridors
   */
  getSupportedCorridors(): typeof SUPPORTED_CORRIDORS {
    return SUPPORTED_CORRIDORS;
  }

  /**
   * Check if a corridor is supported
   */
  isCorridorSupported(source: SupportedCurrency, destination: SupportedCurrency): boolean {
    return !!this.getCorridor(source, destination);
  }

  /**
   * Get corridor configuration
   */
  getCorridor(source: SupportedCurrency, destination: SupportedCurrency) {
    const src = this.normalizeCurrency(source);
    const dst = this.normalizeCurrency(destination);
    
    return SUPPORTED_CORRIDORS.find(
      c => this.normalizeCurrency(c.source) === src && 
           this.normalizeCurrency(c.destination) === dst
    );
  }

  /**
   * Simulate a transfer to estimate final amount
   */
  async simulateTransfer(
    source: SupportedCurrency,
    destination: SupportedCurrency,
    sourceAmount: number
  ): Promise<{
    source_amount: number;
    destination_amount: number;
    effective_rate: number;
    total_fees: number;
    route_description: string;
  }> {
    const quote = await this.getQuote(source, destination, sourceAmount);
    
    const routeDesc = quote.route.via
      ? `${source} → USD → ${destination}`
      : `${source} → ${destination}`;
    
    return {
      source_amount: sourceAmount,
      destination_amount: quote.destination_amount,
      effective_rate: parseFloat((quote.destination_amount / sourceAmount).toFixed(6)),
      total_fees: quote.total_fee,
      route_description: routeDesc,
    };
  }

  /**
   * Normalize currency (USDC → USD for FX purposes)
   */
  private normalizeCurrency(currency: SupportedCurrency): SupportedCurrency {
    return currency === 'USDC' ? 'USD' : currency;
  }

  /**
   * Create identity quote (same currency)
   */
  private createIdentityQuote(
    source: SupportedCurrency,
    destination: SupportedCurrency,
    amount: number
  ): MultiCurrencyQuote {
    return {
      id: `mcq_identity_${Date.now()}`,
      source_currency: source,
      destination_currency: destination,
      source_amount: amount,
      destination_amount: amount,
      route: {
        source,
        destination,
        steps: [],
        total_rate: 1,
        total_fee_percentage: 0,
        estimated_time: 'Instant',
      },
      quotes: [],
      total_fee: 0,
      expires_at: new Date(Date.now() + 300000).toISOString(),
      created_at: new Date().toISOString(),
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let multiCurrencyService: MultiCurrencyService | null = null;

export function getMultiCurrencyService(): MultiCurrencyService {
  if (!multiCurrencyService) {
    multiCurrencyService = new MultiCurrencyService();
  }
  return multiCurrencyService;
}



