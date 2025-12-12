// ============================================
// CURRENCY UTILITIES
// ============================================

export function formatCurrency(amount: number, currency: string = 'USDC'): string {
  if (currency === 'USDC' || currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // For other currencies
  const currencyMap: Record<string, string> = {
    MXN: 'MXN',
    BRL: 'BRL',
    ARS: 'ARS',
    COP: 'COP',
  };

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyMap[currency] || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

// ============================================
// DATE UTILITIES
// ============================================

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

// ============================================
// STREAM UTILITIES
// ============================================

export function formatRunway(seconds: number): string {
  if (seconds <= 0) return 'Depleted';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

export function calculateFlowRatePerSecond(perMonth: number): number {
  // Assumes 30 days per month
  return perMonth / (30 * 24 * 60 * 60);
}

export function calculateFlowRatePerMonth(perSecond: number): number {
  return perSecond * 30 * 24 * 60 * 60;
}

export function calculateStreamHealth(runwaySeconds: number): 'healthy' | 'warning' | 'critical' {
  const days = runwaySeconds / (24 * 60 * 60);
  if (days > 7) return 'healthy';
  if (days > 1) return 'warning';
  return 'critical';
}

// ============================================
// VALIDATION UTILITIES
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================
// ID GENERATION
// ============================================

export function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateApiKey(prefix: string = 'pk_test'): string {
  const randomPart = Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');
  return `${prefix}_${randomPart}`;
}

export function generateAgentToken(): string {
  const randomPart = Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');
  return `agent_${randomPart}`;
}

// ============================================
// FX RATES (Mock for Phase 1)
// ============================================

export const MOCK_FX_RATES: Record<string, number> = {
  USD_MXN: 17.15,
  USD_BRL: 4.97,
  USD_ARS: 365.0,
  USD_COP: 4150.0,
  MXN_USD: 0.058,
  BRL_USD: 0.201,
  ARS_USD: 0.00274,
  COP_USD: 0.000241,
};

export function getExchangeRate(from: string, to: string): number {
  if (from === to) return 1;
  const key = `${from}_${to}`;
  return MOCK_FX_RATES[key] || 1;
}

export function convertAmount(amount: number, from: string, to: string): number {
  return amount * getExchangeRate(from, to);
}

// ============================================
// KYA TIER LIMITS
// ============================================

export const KYA_TIER_LIMITS: Record<number, { perTransaction: number; daily: number; monthly: number }> = {
  0: { perTransaction: 0, daily: 0, monthly: 0 },
  1: { perTransaction: 1000, daily: 10000, monthly: 50000 },
  2: { perTransaction: 10000, daily: 100000, monthly: 500000 },
  3: { perTransaction: 100000, daily: 1000000, monthly: 5000000 },
};

export const KYC_KYB_TIER_LIMITS: Record<number, { perTransaction: number; daily: number; monthly: number }> = {
  0: { perTransaction: 0, daily: 0, monthly: 0 },
  1: { perTransaction: 5000, daily: 20000, monthly: 100000 },
  2: { perTransaction: 50000, daily: 200000, monthly: 500000 },
  3: { perTransaction: 500000, daily: 2000000, monthly: 10000000 },
};

export function getEffectiveLimits(
  agentTier: number,
  parentTier: number
): { perTransaction: number; daily: number; monthly: number; cappedByParent: boolean } {
  const agentLimits = KYA_TIER_LIMITS[agentTier] || KYA_TIER_LIMITS[0];
  const parentLimits = KYC_KYB_TIER_LIMITS[parentTier] || KYC_KYB_TIER_LIMITS[0];

  const effective = {
    perTransaction: Math.min(agentLimits.perTransaction, parentLimits.perTransaction),
    daily: Math.min(agentLimits.daily, parentLimits.daily),
    monthly: Math.min(agentLimits.monthly, parentLimits.monthly),
    cappedByParent:
      agentLimits.perTransaction > parentLimits.perTransaction ||
      agentLimits.daily > parentLimits.daily ||
      agentLimits.monthly > parentLimits.monthly,
  };

  return effective;
}

