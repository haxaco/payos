/**
 * Fiat to USDC Conversion Service
 * Epic 41, Story 41.20: Fiat to USDC Conversion
 *
 * When funding arrives in fiat (USD, BRL, MXN), converts to USDC
 * for the account balance. Uses Circle for USD→USDC (1:1) and
 * FX rates for BRL/MXN→USD→USDC.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface ConversionQuote {
  from_currency: string;
  to_currency: string;
  amount_cents: number;
  converted_amount_cents: number;
  exchange_rate: number;
  conversion_fee_cents: number;
  net_amount_cents: number;
  expires_at: string;
  quote_id: string;
}

export interface ConversionResult {
  quote_id: string;
  from_currency: string;
  to_currency: string;
  amount_cents: number;
  converted_amount_cents: number;
  exchange_rate: number;
  conversion_fee_cents: number;
  status: 'completed' | 'failed';
  failure_reason?: string;
}

// ============================================
// Exchange Rates (sandbox defaults)
// ============================================

const SANDBOX_RATES: Record<string, number> = {
  'USD:USDC': 1.0000,
  'USDC:USD': 1.0000,
  'BRL:USD': 0.1923,  // ~5.2 BRL/USD
  'MXN:USD': 0.0588,  // ~17 MXN/USD
  'EUR:USD': 1.0850,
  'GBP:USD': 1.2650,
  'COP:USD': 0.000245, // ~4080 COP/USD
};

const CONVERSION_FEE_RATE = 0.001; // 0.1% conversion fee

// ============================================
// Conversion Service
// ============================================

export class ConversionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get a conversion quote
   */
  async getQuote(
    fromCurrency: string,
    toCurrency: string,
    amountCents: number
  ): Promise<ConversionQuote> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = Math.round(amountCents * rate);
    const conversionFee = Math.round(amountCents * CONVERSION_FEE_RATE);
    const netAmount = convertedAmount - Math.round(conversionFee * rate);

    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      amount_cents: amountCents,
      converted_amount_cents: netAmount,
      exchange_rate: rate,
      conversion_fee_cents: conversionFee,
      net_amount_cents: netAmount,
      expires_at: new Date(Date.now() + 30000).toISOString(), // 30 second TTL
      quote_id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  /**
   * Execute a conversion (after funding is received)
   */
  async executeConversion(
    tenantId: string,
    fromCurrency: string,
    amountCents: number,
    toCurrency: string = 'USDC'
  ): Promise<ConversionResult> {
    const quoteId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = Math.round(amountCents * rate);
      const conversionFee = Math.round(amountCents * CONVERSION_FEE_RATE);
      const netAmount = convertedAmount - Math.round(conversionFee * rate);

      // For USD→USDC, it's essentially 1:1 via Circle
      if (fromCurrency === 'USD' && toCurrency === 'USDC') {
        return {
          quote_id: quoteId,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount_cents: amountCents,
          converted_amount_cents: amountCents - conversionFee, // 1:1 minus fee
          exchange_rate: 1.0,
          conversion_fee_cents: conversionFee,
          status: 'completed',
        };
      }

      // For other currencies, convert via FX rate
      // In production, this would call Circle's FX API
      return {
        quote_id: quoteId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount_cents: amountCents,
        converted_amount_cents: netAmount,
        exchange_rate: rate,
        conversion_fee_cents: conversionFee,
        status: 'completed',
      };
    } catch (error) {
      return {
        quote_id: quoteId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount_cents: amountCents,
        converted_amount_cents: 0,
        exchange_rate: 0,
        conversion_fee_cents: 0,
        status: 'failed',
        failure_reason: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1.0;

    // Try direct rate
    const directKey = `${fromCurrency}:${toCurrency}`;
    if (SANDBOX_RATES[directKey]) return SANDBOX_RATES[directKey];

    // Try via USD intermediate
    if (toCurrency === 'USDC') {
      const toUsd = SANDBOX_RATES[`${fromCurrency}:USD`];
      if (toUsd) return toUsd; // USD:USDC is 1:1
    }

    // Try inverse rate
    const inverseKey = `${toCurrency}:${fromCurrency}`;
    if (SANDBOX_RATES[inverseKey]) return 1 / SANDBOX_RATES[inverseKey];

    // In production, would call an FX rate API
    throw new Error(`No exchange rate available for ${fromCurrency}→${toCurrency}`);
  }

  /**
   * Get all supported conversion pairs
   */
  getSupportedPairs(): Array<{ from: string; to: string; rate: number }> {
    return Object.entries(SANDBOX_RATES).map(([key, rate]) => {
      const [from, to] = key.split(':');
      return { from, to, rate };
    });
  }
}

// ============================================
// Factory
// ============================================

export function createConversionService(supabase: SupabaseClient): ConversionService {
  return new ConversionService(supabase);
}
