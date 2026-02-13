/**
 * Circle FX Quote Service
 * 
 * Provides real-time exchange rates for Pix (USD→BRL) and SPEI (USD→MXN).
 * 
 * @see Story 40.6: Circle FX Quote Integration
 * @module services/circle/fx
 */

import { randomUUID } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface FXQuote {
  id: string;
  source_currency: string;
  destination_currency: string;
  rate: number;
  inverse_rate: number;
  fee_percentage: number;
  total_fee: number;
  source_amount?: number;
  destination_amount?: number;
  expires_at: string;
  created_at: string;
  provider: string;
  corridor: string;
}

export interface FXQuoteRequest {
  source_currency: string;
  destination_currency: string;
  source_amount?: number;
  destination_amount?: number;
}

export interface LockedQuote extends FXQuote {
  locked_at: string;
  lock_expires_at: string;
  lock_id: string;
}

// =============================================================================
// Mock FX Rates (Simulating Circle's rates)
// =============================================================================

/**
 * Base rates with realistic spreads
 * Updated: January 2026
 */
const BASE_RATES: Record<string, Record<string, number>> = {
  USD: {
    BRL: 5.85,    // 1 USD = 5.85 BRL
    MXN: 17.35,   // 1 USD = 17.35 MXN
    ARS: 1050,    // 1 USD = 1050 ARS (blue rate, Jan 2026)
    COP: 4200,    // 1 USD = 4200 COP
    PKR: 278.50,  // 1 USD = 278.50 PKR (offline fallback)
    EUR: 0.92,    // 1 USD = 0.92 EUR
    GBP: 0.79,    // 1 USD = 0.79 GBP
  },
  BRL: {
    USD: 0.171,   // 1 BRL = 0.171 USD
    MXN: 2.97,    // 1 BRL = 2.97 MXN
  },
  MXN: {
    USD: 0.0577,  // 1 MXN = 0.0577 USD
    BRL: 0.337,   // 1 MXN = 0.337 BRL
  },
  ARS: {
    USD: 0.000952, // 1 ARS = 0.000952 USD
  },
  COP: {
    USD: 0.000238, // 1 COP = 0.000238 USD
  },
  PKR: {
    USD: 0.00359,  // 1 PKR = 0.00359 USD (offline fallback)
  },
};

/**
 * Corridor-specific fees
 */
const CORRIDOR_FEES: Record<string, number> = {
  'USD-BRL': 0.5,   // 0.5% for USD to BRL (Pix)
  'USD-MXN': 0.5,   // 0.5% for USD to MXN (SPEI)
  'USD-ARS': 1.0,   // 1.0% for USD to ARS (CBU)
  'USD-COP': 1.0,   // 1.0% for USD to COP (PSE)
  'BRL-USD': 0.75,  // 0.75% for BRL to USD
  'MXN-USD': 0.75,  // 0.75% for MXN to USD
  'ARS-USD': 1.0,   // 1.0% for ARS to USD
  'COP-USD': 1.0,   // 1.0% for COP to USD
  'USD-PKR': 0.7,   // 0.7% for USD to PKR (remittance)
  'PKR-USD': 1.0,   // 1.0% for PKR to USD
  'BRL-MXN': 1.0,   // 1.0% for cross-LATAM (via USD)
  'MXN-BRL': 1.0,   // 1.0% for cross-LATAM (via USD)
  'DEFAULT': 0.5,   // Default fee
};

// =============================================================================
// FX Service
// =============================================================================

export class CircleFXService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly lockedQuotes: Map<string, LockedQuote> = new Map();

  constructor(options?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = options?.baseUrl || 'https://api-sandbox.circle.com';
    this.apiKey = options?.apiKey || process.env.CIRCLE_API_KEY;
  }

  /**
   * Get current FX rate for a currency pair
   */
  async getQuote(request: FXQuoteRequest): Promise<FXQuote> {
    const { source_currency, destination_currency, source_amount, destination_amount } = request;
    
    // Normalize currency codes
    const src = source_currency.toUpperCase();
    const dst = destination_currency.toUpperCase();
    
    // Get base rate
    let rate = this.getRate(src, dst);
    
    // Add small random variance to simulate real market (±0.1%)
    rate = rate * (1 + (Math.random() - 0.5) * 0.002);
    
    // Get corridor fee
    const corridor = `${src}-${dst}`;
    const feePercentage = CORRIDOR_FEES[corridor] || CORRIDOR_FEES['DEFAULT'];
    
    // Calculate amounts
    let srcAmount = source_amount;
    let dstAmount = destination_amount;
    let totalFee = 0;
    
    if (srcAmount) {
      totalFee = srcAmount * (feePercentage / 100);
      dstAmount = (srcAmount - totalFee) * rate;
    } else if (dstAmount) {
      srcAmount = (dstAmount / rate) / (1 - feePercentage / 100);
      totalFee = srcAmount * (feePercentage / 100);
    }
    
    // Quote expires in 60 seconds
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 1000);
    
    return {
      id: `quote_${randomUUID().slice(0, 8)}`,
      source_currency: src,
      destination_currency: dst,
      rate: parseFloat(rate.toFixed(6)),
      inverse_rate: parseFloat((1 / rate).toFixed(6)),
      fee_percentage: feePercentage,
      total_fee: srcAmount ? parseFloat(totalFee.toFixed(2)) : 0,
      source_amount: srcAmount ? parseFloat(srcAmount.toFixed(2)) : undefined,
      destination_amount: dstAmount ? parseFloat(dstAmount.toFixed(2)) : undefined,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      provider: 'circle_mock',
      corridor,
    };
  }

  /**
   * Lock a quote for execution
   * Returns a locked quote valid for 30 seconds
   */
  async lockQuote(quoteId: string): Promise<LockedQuote> {
    // In production, this would call Circle's API to lock the rate
    // For mock, we regenerate with a fixed rate
    
    const now = new Date();
    const lockExpiresAt = new Date(now.getTime() + 30 * 1000);
    
    // Create a mock locked quote (would normally be based on existing quote)
    const lockedQuote: LockedQuote = {
      id: quoteId,
      source_currency: 'USD',
      destination_currency: 'BRL',
      rate: 5.85,
      inverse_rate: 0.171,
      fee_percentage: 0.5,
      total_fee: 0,
      expires_at: new Date(now.getTime() + 120 * 1000).toISOString(),
      created_at: now.toISOString(),
      provider: 'circle_mock',
      corridor: 'USD-BRL',
      locked_at: now.toISOString(),
      lock_expires_at: lockExpiresAt.toISOString(),
      lock_id: `lock_${randomUUID().slice(0, 8)}`,
    };
    
    this.lockedQuotes.set(lockedQuote.lock_id, lockedQuote);
    
    return lockedQuote;
  }

  /**
   * Get multiple quotes for comparison
   */
  async getQuotes(pairs: Array<{ source: string; destination: string }>): Promise<FXQuote[]> {
    return Promise.all(
      pairs.map(p => this.getQuote({
        source_currency: p.source,
        destination_currency: p.destination,
      }))
    );
  }

  /**
   * Get all supported corridors
   */
  getSupportedCorridors(): Array<{ source: string; destination: string; fee: number }> {
    return Object.entries(CORRIDOR_FEES)
      .filter(([k]) => k !== 'DEFAULT')
      .map(([corridor, fee]) => {
        const [source, destination] = corridor.split('-');
        return { source, destination, fee };
      });
  }

  /**
   * Calculate conversion with fees
   */
  calculateConversion(
    amount: number,
    sourceCurrency: string,
    destinationCurrency: string
  ): { rate: number; fee: number; result: number } {
    const src = sourceCurrency.toUpperCase();
    const dst = destinationCurrency.toUpperCase();
    const rate = this.getRate(src, dst);
    const corridor = `${src}-${dst}`;
    const feePercentage = CORRIDOR_FEES[corridor] || CORRIDOR_FEES['DEFAULT'];
    const fee = amount * (feePercentage / 100);
    const result = (amount - fee) * rate;
    
    return {
      rate: parseFloat(rate.toFixed(6)),
      fee: parseFloat(fee.toFixed(2)),
      result: parseFloat(result.toFixed(2)),
    };
  }

  /**
   * Convert an amount to USD using the current rate (no fees applied).
   * Returns the amount unchanged if already USD/USDC.
   */
  toUSD(amount: number, currency: string): number {
    const src = currency.toUpperCase();
    if (src === 'USD' || src === 'USDC') return amount;
    const rate = this.getRate(src, 'USD');
    return parseFloat((amount * rate).toFixed(2));
  }

  /**
   * Get raw rate for currency pair
   */
  private getRate(source: string, destination: string): number {
    if (source === destination) return 1;
    
    // Direct rate
    if (BASE_RATES[source]?.[destination]) {
      return BASE_RATES[source][destination];
    }
    
    // Inverse rate
    if (BASE_RATES[destination]?.[source]) {
      return 1 / BASE_RATES[destination][source];
    }
    
    // Cross rate via USD
    if (source !== 'USD' && destination !== 'USD') {
      const toUSD = this.getRate(source, 'USD');
      const fromUSD = this.getRate('USD', destination);
      return toUSD * fromUSD;
    }
    
    throw new Error(`No rate available for ${source}→${destination}`);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let fxService: CircleFXService | null = null;

export function getCircleFXService(): CircleFXService {
  if (!fxService) {
    fxService = new CircleFXService();
  }
  return fxService;
}



