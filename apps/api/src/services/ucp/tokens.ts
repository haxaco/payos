/**
 * UCP Token Service
 *
 * Handles settlement token acquisition for UCP checkouts.
 *
 * @see Story 43.5: Handler Credential Flow
 */

import { randomUUID, randomBytes, createHash } from 'crypto';
import type {
  UCPToken,
  UCPTokenRequest,
  UCPRecipient,
  UCPPixRecipient,
  UCPSpeiRecipient,
} from './types.js';
import { isCorridorSupported } from './profile.js';

// =============================================================================
// Constants
// =============================================================================

const TOKEN_PREFIX = 'ucp_tok_';
const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// =============================================================================
// Token Storage (In-memory for PoC, would be Redis/DB in production)
// =============================================================================

interface StoredToken {
  token: string;
  settlementId: string;
  tenantId: string;
  corridor: 'pix' | 'spei';
  amount: number;
  currency: string;
  recipient: UCPRecipient;
  quote: {
    fromAmount: number;
    fromCurrency: string;
    toAmount: number;
    toCurrency: string;
    fxRate: number;
    fees: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
}

const tokenStore = new Map<string, StoredToken>();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [token, stored] of tokenStore.entries()) {
    if (stored.expiresAt < now) {
      tokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

// =============================================================================
// Token Generation
// =============================================================================

/**
 * Generate a secure token
 */
function generateToken(): string {
  const bytes = randomBytes(24);
  return TOKEN_PREFIX + bytes.toString('base64url');
}

/**
 * Hash a token for storage lookup (if using DB)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// =============================================================================
// FX Quote (Mock for PoC - would use real FX service)
// =============================================================================

interface FXQuote {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  fxRate: number;
  fees: number;
}

/**
 * Get FX quote for corridor
 * In production, this would call the real FX service
 */
function getQuote(
  amount: number,
  currency: string,
  corridor: 'pix' | 'spei'
): FXQuote {
  // Mock FX rates (would be real-time in production)
  const rates: Record<string, number> = {
    'USD-BRL': 5.95,
    'USDC-BRL': 5.95,
    'USD-MXN': 17.25,
    'USDC-MXN': 17.25,
  };

  const destCurrency = corridor === 'pix' ? 'BRL' : 'MXN';
  const rateKey = `${currency}-${destCurrency}`;
  const fxRate = rates[rateKey] || 1;

  // Calculate fees (1% for PoC)
  const feePercent = 0.01;
  const fees = amount * feePercent;
  const netAmount = amount - fees;

  return {
    fromAmount: amount,
    fromCurrency: currency,
    toAmount: Number((netAmount * fxRate).toFixed(2)),
    toCurrency: destCurrency,
    fxRate,
    fees: Number(fees.toFixed(2)),
  };
}

// =============================================================================
// Token Operations
// =============================================================================

/**
 * Validate recipient data
 */
export function validateRecipient(
  recipient: UCPRecipient,
  corridor: 'pix' | 'spei'
): { valid: boolean; error?: string } {
  if (corridor === 'pix') {
    const pix = recipient as UCPPixRecipient;
    if (pix.type !== 'pix') {
      return { valid: false, error: 'Recipient type must be "pix" for Pix corridor' };
    }
    if (!pix.pix_key || !pix.pix_key_type || !pix.name) {
      return { valid: false, error: 'Pix recipient requires pix_key, pix_key_type, and name' };
    }
    const validKeyTypes = ['cpf', 'cnpj', 'email', 'phone', 'evp'];
    if (!validKeyTypes.includes(pix.pix_key_type)) {
      return { valid: false, error: `Invalid pix_key_type. Must be one of: ${validKeyTypes.join(', ')}` };
    }
  } else if (corridor === 'spei') {
    const spei = recipient as UCPSpeiRecipient;
    if (spei.type !== 'spei') {
      return { valid: false, error: 'Recipient type must be "spei" for SPEI corridor' };
    }
    if (!spei.clabe || !spei.name) {
      return { valid: false, error: 'SPEI recipient requires clabe and name' };
    }
    if (!/^[0-9]{18}$/.test(spei.clabe)) {
      return { valid: false, error: 'CLABE must be exactly 18 digits' };
    }
  }

  return { valid: true };
}

/**
 * Acquire a settlement token
 */
export async function acquireToken(
  tenantId: string,
  request: UCPTokenRequest
): Promise<UCPToken> {
  const { corridor, amount, currency, recipient, metadata } = request;

  // Validate corridor is supported
  const destCurrency = corridor === 'pix' ? 'BRL' : 'MXN';
  if (!isCorridorSupported(currency, destCurrency, corridor)) {
    throw new Error(`Corridor ${currency}->${destCurrency} via ${corridor} is not supported`);
  }

  // Validate amount
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (amount > 100000) {
    throw new Error('Amount exceeds maximum limit of 100,000');
  }

  // Validate recipient
  const recipientValidation = validateRecipient(recipient, corridor);
  if (!recipientValidation.valid) {
    throw new Error(recipientValidation.error);
  }

  // Get FX quote
  const quote = getQuote(amount, currency, corridor);

  // Generate token and settlement ID
  const token = generateToken();
  const settlementId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS);

  // Store token
  const stored: StoredToken = {
    token,
    settlementId,
    tenantId,
    corridor,
    amount,
    currency,
    recipient,
    quote,
    metadata,
    createdAt: now,
    expiresAt,
    used: false,
  };
  tokenStore.set(token, stored);

  return {
    token,
    settlement_id: settlementId,
    quote: {
      from_amount: quote.fromAmount,
      from_currency: quote.fromCurrency,
      to_amount: quote.toAmount,
      to_currency: quote.toCurrency,
      fx_rate: quote.fxRate,
      fees: quote.fees,
    },
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
  };
}

/**
 * Get a stored token by value
 */
export function getToken(token: string): StoredToken | undefined {
  return tokenStore.get(token);
}

/**
 * Validate a token can be used for settlement
 */
export function validateToken(
  token: string,
  tenantId: string
): { valid: boolean; error?: string; stored?: StoredToken } {
  const stored = tokenStore.get(token);

  if (!stored) {
    return { valid: false, error: 'Token not found' };
  }

  if (stored.tenantId !== tenantId) {
    return { valid: false, error: 'Token not found' }; // Don't reveal tenant mismatch
  }

  if (stored.used) {
    return { valid: false, error: 'Token has already been used' };
  }

  if (new Date() > stored.expiresAt) {
    return { valid: false, error: 'Token has expired' };
  }

  return { valid: true, stored };
}

/**
 * Mark a token as used
 */
export function markTokenUsed(token: string): boolean {
  const stored = tokenStore.get(token);
  if (!stored) return false;

  stored.used = true;
  stored.usedAt = new Date();
  tokenStore.set(token, stored);
  return true;
}

/**
 * Get quote for corridor (public function)
 */
export function getSettlementQuote(
  amount: number,
  currency: string,
  corridor: 'pix' | 'spei'
): FXQuote {
  return getQuote(amount, currency, corridor);
}

/**
 * Clear all tokens (for testing)
 */
export function clearTokenStore(): void {
  tokenStore.clear();
}
