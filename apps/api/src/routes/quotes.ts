import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { ValidationError } from '../middleware/error.js';
import { getExchangeRate, MOCK_FX_RATES } from '@payos/utils';

const quotes = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createQuoteSchema = z.object({
  fromCurrency: z.string().default('USD'),
  toCurrency: z.string(),
  amount: z.number().positive(),
  corridor: z.string().optional(),
});

// ============================================
// FEE CALCULATION
// ============================================

interface FeeBreakdown {
  type: string;
  amount: number;
  description: string;
}

function calculateFees(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  corridor?: string
): { total: number; breakdown: FeeBreakdown[] } {
  const breakdown: FeeBreakdown[] = [];
  
  // Platform fee (0.5%)
  const platformFee = amount * 0.005;
  breakdown.push({
    type: 'platform_fee',
    amount: Math.round(platformFee * 100) / 100,
    description: 'Platform fee (0.5%)',
  });
  
  // Cross-border fee if different currencies
  if (fromCurrency !== toCurrency) {
    const crossBorderFee = amount * 0.002; // 0.2%
    breakdown.push({
      type: 'cross_border_fee',
      amount: Math.round(crossBorderFee * 100) / 100,
      description: 'Cross-border fee (0.2%)',
    });
  }
  
  // Corridor-specific fees
  if (corridor === 'USD_BRL') {
    const corridorFee = 1.50; // Flat fee for Brazil
    breakdown.push({
      type: 'corridor_fee',
      amount: corridorFee,
      description: 'Brazil corridor fee',
    });
  }
  
  const total = breakdown.reduce((sum, fee) => sum + fee.amount, 0);
  
  return {
    total: Math.round(total * 100) / 100,
    breakdown,
  };
}

// ============================================
// POST /v1/quotes - Get a quote
// ============================================
quotes.post('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Parse and validate body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = createQuoteSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const { fromCurrency, toCurrency, amount, corridor } = parsed.data;
  
  // Validate currencies
  const supportedCurrencies = ['USD', 'USDC', 'MXN', 'BRL', 'ARS', 'COP'];
  if (!supportedCurrencies.includes(fromCurrency)) {
    throw new ValidationError(`Unsupported currency: ${fromCurrency}`);
  }
  if (!supportedCurrencies.includes(toCurrency)) {
    throw new ValidationError(`Unsupported currency: ${toCurrency}`);
  }
  
  // Get FX rate
  const effectiveFromCurrency = fromCurrency === 'USDC' ? 'USD' : fromCurrency;
  const effectiveToCurrency = toCurrency === 'USDC' ? 'USD' : toCurrency;
  const fxRate = getExchangeRate(effectiveFromCurrency, effectiveToCurrency);
  
  // Calculate fees
  const fees = calculateFees(amount, fromCurrency, toCurrency, corridor);
  
  // Calculate destination amount
  const netAmount = amount - fees.total;
  const destinationAmount = netAmount * fxRate;
  
  // Create quote record
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      tenant_id: ctx.tenantId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      from_amount: amount,
      to_amount: Math.round(destinationAmount * 100) / 100,
      fx_rate: fxRate,
      fee_amount: fees.total,
      fee_breakdown: fees.breakdown,
      corridor_id: corridor || `${fromCurrency}_${toCurrency}`,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating quote:', error);
    return c.json({ error: 'Failed to create quote' }, 500);
  }
  
  // Estimate settlement time based on corridor
  let estimatedSettlement = '1-2 minutes';
  if (toCurrency === 'BRL') {
    estimatedSettlement = '2-5 minutes (Pix)';
  } else if (toCurrency === 'MXN') {
    estimatedSettlement = '1-3 minutes (SPEI)';
  } else if (fromCurrency === toCurrency || (fromCurrency === 'USDC' && toCurrency === 'USD')) {
    estimatedSettlement = 'Instant';
  }
  
  return c.json({
    data: {
      id: quote.id,
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: Math.round(destinationAmount * 100) / 100,
      fxRate,
      fees: {
        total: fees.total,
        breakdown: fees.breakdown,
      },
      expiresAt: expiresAt.toISOString(),
      estimatedSettlement,
      corridor: corridor || `${fromCurrency}_${toCurrency}`,
    },
  });
});

// ============================================
// GET /v1/quotes/rates - Get current FX rates
// ============================================
quotes.get('/rates', async (c) => {
  // Return current mock rates
  return c.json({
    data: {
      baseCurrency: 'USD',
      rates: {
        MXN: MOCK_FX_RATES.USD_MXN,
        BRL: MOCK_FX_RATES.USD_BRL,
        ARS: MOCK_FX_RATES.USD_ARS,
        COP: MOCK_FX_RATES.USD_COP,
        USD: 1,
        USDC: 1,
      },
      updatedAt: new Date().toISOString(),
      note: 'Rates are mocked for PoC - real rates would come from exchange provider',
    },
  });
});

// ============================================
// GET /v1/quotes/:id - Get quote by ID
// ============================================
quotes.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !quote) {
    return c.json({ error: 'Quote not found' }, 404);
  }
  
  const isExpired = new Date(quote.expires_at) < new Date();
  const isUsed = !!quote.used_at;
  
  return c.json({
    data: {
      id: quote.id,
      fromCurrency: quote.from_currency,
      toCurrency: quote.to_currency,
      fromAmount: parseFloat(quote.from_amount),
      toAmount: parseFloat(quote.to_amount),
      fxRate: parseFloat(quote.fx_rate),
      fees: {
        total: parseFloat(quote.fee_amount),
        breakdown: quote.fee_breakdown,
      },
      expiresAt: quote.expires_at,
      corridor: quote.corridor_id,
      status: isUsed ? 'used' : isExpired ? 'expired' : 'valid',
      usedAt: quote.used_at,
      transferId: quote.transfer_id,
    },
  });
});

export default quotes;
