/**
 * Live FX Rate Service
 *
 * Fetches real-time exchange rates from exchangerate-api.com (free tier).
 * In-memory cache with 5-minute TTL to stay well within the 1500 req/month free tier.
 * Falls back to hardcoded rates on network failure.
 *
 * @module services/fx/live-rates
 */

// Hardcoded fallback rates (Jan 2026 approximations)
const FALLBACK_RATES: Record<string, number> = {
  PKR: 278.50,
  BRL: 5.85,
  MXN: 17.35,
  ARS: 1050,
  COP: 4200,
  EUR: 0.92,
  GBP: 0.79,
};

interface CachedRates {
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class LiveFXService {
  private cache: CachedRates | null = null;

  /**
   * Get live exchange rate for a currency pair.
   * Fetches from exchangerate-api.com with 5-min caching.
   * Falls back to hardcoded rates on failure.
   */
  async getRate(from: string, to: string): Promise<number> {
    const src = from.toUpperCase();
    const dst = to.toUpperCase();

    // Normalize USDC → USD
    const normSrc = src === 'USDC' ? 'USD' : src;
    const normDst = dst === 'USDC' ? 'USD' : dst;

    if (normSrc === normDst) return 1;

    const rates = await this.fetchRates(normSrc);

    if (rates[normDst]) {
      return rates[normDst];
    }

    // Try inverse
    const inverseRates = await this.fetchRates(normDst);
    if (inverseRates[normSrc]) {
      return 1 / inverseRates[normSrc];
    }

    // Cross via USD
    if (normSrc !== 'USD' && normDst !== 'USD') {
      const srcToUsd = await this.getRate(normSrc, 'USD');
      const usdToDst = await this.getRate('USD', normDst);
      return srcToUsd * usdToDst;
    }

    throw new Error(`No live rate available for ${src} -> ${dst}`);
  }

  /**
   * Fetch rates from API with caching. Returns rates relative to `base`.
   * Currently only caches USD-based rates (primary use case).
   */
  private async fetchRates(base: string): Promise<Record<string, number>> {
    // We only cache USD-based rates (our primary base)
    if (base === 'USD' && this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.rates;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${base}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const rates: Record<string, number> = data.rates || {};

      // Cache USD-based rates
      if (base === 'USD') {
        this.cache = { rates, fetchedAt: Date.now() };
      }

      return rates;
    } catch (err) {
      console.warn(`[LiveFX] Failed to fetch rates for ${base}, using fallback:`, (err as Error).message);
      return this.getFallbackRates(base);
    }
  }

  /**
   * Hardcoded fallback rates when API is unavailable.
   */
  private getFallbackRates(base: string): Record<string, number> {
    if (base === 'USD') {
      return { ...FALLBACK_RATES, USD: 1 };
    }

    // Derive from USD fallbacks
    const baseToUsd = FALLBACK_RATES[base];
    if (!baseToUsd) return {};

    const result: Record<string, number> = { USD: 1 / baseToUsd };
    for (const [currency, usdRate] of Object.entries(FALLBACK_RATES)) {
      if (currency !== base) {
        result[currency] = usdRate / baseToUsd;
      }
    }
    return result;
  }
}

// Singleton
let liveFXService: LiveFXService | null = null;

export function getLiveFXService(): LiveFXService {
  if (!liveFXService) {
    liveFXService = new LiveFXService();
  }
  return liveFXService;
}
