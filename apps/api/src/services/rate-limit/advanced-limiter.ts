/**
 * Advanced Rate Limiting Service
 * 
 * Provides configurable rate limiting with:
 * - Per-tenant limits
 * - Per-endpoint limits
 * - Sliding window algorithm
 * - Burst handling
 * - Dynamic limit adjustments
 * 
 * @see Story 40.20: Rate Limiting
 */

// =============================================================================
// Types
// =============================================================================

export interface RateLimitTier {
  name: string;
  requests_per_second: number;
  requests_per_minute: number;
  requests_per_hour: number;
  burst_multiplier: number;  // Allow burst up to this * per_second
}

export interface RateLimitConfig {
  tier: RateLimitTier;
  endpoint_overrides?: Record<string, Partial<RateLimitTier>>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: number;
  limit: number;
  retry_after?: number;
}

export interface RateLimitStats {
  tenant_id: string;
  current_rate: number;
  limit: number;
  window_start: number;
  requests_in_window: number;
  blocked_count: number;
}

// =============================================================================
// Default Tiers
// =============================================================================

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'Free',
    requests_per_second: 5,
    requests_per_minute: 100,
    requests_per_hour: 1000,
    burst_multiplier: 2,
  },
  
  starter: {
    name: 'Starter',
    requests_per_second: 20,
    requests_per_minute: 500,
    requests_per_hour: 5000,
    burst_multiplier: 3,
  },
  
  growth: {
    name: 'Growth',
    requests_per_second: 50,
    requests_per_minute: 2000,
    requests_per_hour: 20000,
    burst_multiplier: 4,
  },
  
  enterprise: {
    name: 'Enterprise',
    requests_per_second: 200,
    requests_per_minute: 10000,
    requests_per_hour: 100000,
    burst_multiplier: 5,
  },
  
  unlimited: {
    name: 'Unlimited',
    requests_per_second: 10000,
    requests_per_minute: 600000,
    requests_per_hour: 36000000,
    burst_multiplier: 10,
  },
};

// =============================================================================
// Sliding Window Counter
// =============================================================================

interface WindowEntry {
  count: number;
  timestamp: number;
}

class SlidingWindowCounter {
  private windows: Map<string, WindowEntry[]> = new Map();
  private readonly maxWindowsPerKey = 120;  // Keep last 2 hours of minute-buckets

  /**
   * Increment counter and check limit
   */
  increment(
    key: string,
    windowMs: number,
    limit: number,
    burstLimit: number
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create windows for this key
    let entries = this.windows.get(key) || [];
    
    // Remove expired entries
    entries = entries.filter(e => e.timestamp > windowStart);
    
    // Calculate current count (sliding window)
    const currentCount = entries.reduce((sum, e) => sum + e.count, 0);
    
    // Check burst limit (last second)
    const burstWindowStart = now - 1000;
    const burstCount = entries
      .filter(e => e.timestamp > burstWindowStart)
      .reduce((sum, e) => sum + e.count, 0);
    
    // Check if rate limited
    if (currentCount >= limit || burstCount >= burstLimit) {
      const oldestEntry = entries[0];
      const resetAt = oldestEntry 
        ? oldestEntry.timestamp + windowMs 
        : now + windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        reset_at: resetAt,
        limit,
        retry_after: Math.ceil((resetAt - now) / 1000),
      };
    }
    
    // Add new entry
    const bucketTimestamp = Math.floor(now / 1000) * 1000;  // Round to second
    const existingBucket = entries.find(e => e.timestamp === bucketTimestamp);
    
    if (existingBucket) {
      existingBucket.count++;
    } else {
      entries.push({ count: 1, timestamp: bucketTimestamp });
    }
    
    // Trim old entries
    if (entries.length > this.maxWindowsPerKey) {
      entries = entries.slice(-this.maxWindowsPerKey);
    }
    
    this.windows.set(key, entries);
    
    return {
      allowed: true,
      remaining: Math.max(0, limit - currentCount - 1),
      reset_at: now + windowMs,
      limit,
    };
  }

  /**
   * Get current stats for a key
   */
  getStats(key: string, windowMs: number): {
    count: number;
    rate_per_second: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const entries = this.windows.get(key) || [];
    const validEntries = entries.filter(e => e.timestamp > windowStart);
    const count = validEntries.reduce((sum, e) => sum + e.count, 0);
    
    return {
      count,
      rate_per_second: count / (windowMs / 1000),
    };
  }

  /**
   * Clear all entries for a key
   */
  clear(key: string): void {
    this.windows.delete(key);
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000;  // 2 hours
    
    for (const [key, entries] of this.windows.entries()) {
      const validEntries = entries.filter(e => e.timestamp > now - maxAge);
      if (validEntries.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, validEntries);
      }
    }
  }
}

// =============================================================================
// Rate Limiter Service
// =============================================================================

export class AdvancedRateLimiter {
  private counter: SlidingWindowCounter;
  private tenantConfigs: Map<string, RateLimitConfig>;
  private blockStats: Map<string, number>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.counter = new SlidingWindowCounter();
    this.tenantConfigs = new Map();
    this.blockStats = new Map();
    
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.counter.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check rate limit for a request
   */
  check(
    tenantId: string,
    endpoint?: string,
    method: string = 'GET'
  ): RateLimitResult {
    const config = this.getConfig(tenantId);
    const tier = config.tier;
    
    // Get endpoint-specific overrides
    const endpointKey = endpoint ? `${method}:${endpoint}` : 'default';
    const override = config.endpoint_overrides?.[endpointKey];
    
    // Calculate effective limits
    const effectiveTier = override 
      ? { ...tier, ...override }
      : tier;
    
    // Build rate limit key
    const key = `${tenantId}:${endpointKey}`;
    
    // Check minute-level limit
    const result = this.counter.increment(
      key,
      60000,  // 1 minute window
      effectiveTier.requests_per_minute,
      effectiveTier.requests_per_second * effectiveTier.burst_multiplier
    );
    
    // Track blocked requests
    if (!result.allowed) {
      const blockKey = `blocked:${tenantId}`;
      const currentBlocks = this.blockStats.get(blockKey) || 0;
      this.blockStats.set(blockKey, currentBlocks + 1);
    }
    
    return result;
  }

  /**
   * Get rate limit configuration for a tenant
   */
  getConfig(tenantId: string): RateLimitConfig {
    // Check for tenant-specific config
    const tenantConfig = this.tenantConfigs.get(tenantId);
    if (tenantConfig) {
      return tenantConfig;
    }
    
    // Default to starter tier
    return {
      tier: RATE_LIMIT_TIERS.starter,
    };
  }

  /**
   * Set rate limit configuration for a tenant
   */
  setConfig(tenantId: string, config: RateLimitConfig): void {
    this.tenantConfigs.set(tenantId, config);
  }

  /**
   * Upgrade tenant to a different tier
   */
  setTier(tenantId: string, tierName: string): void {
    const tier = RATE_LIMIT_TIERS[tierName];
    if (!tier) {
      throw new Error(`Unknown tier: ${tierName}`);
    }
    
    const existing = this.tenantConfigs.get(tenantId) || { tier };
    existing.tier = tier;
    this.tenantConfigs.set(tenantId, existing);
  }

  /**
   * Add endpoint-specific override
   */
  setEndpointOverride(
    tenantId: string,
    endpoint: string,
    method: string,
    override: Partial<RateLimitTier>
  ): void {
    const config = this.getConfig(tenantId);
    if (!config.endpoint_overrides) {
      config.endpoint_overrides = {};
    }
    config.endpoint_overrides[`${method}:${endpoint}`] = override;
    this.tenantConfigs.set(tenantId, config);
  }

  /**
   * Get current stats for a tenant
   */
  getStats(tenantId: string): RateLimitStats {
    const config = this.getConfig(tenantId);
    const key = `${tenantId}:default`;
    const stats = this.counter.getStats(key, 60000);
    const blockedCount = this.blockStats.get(`blocked:${tenantId}`) || 0;
    
    return {
      tenant_id: tenantId,
      current_rate: stats.rate_per_second,
      limit: config.tier.requests_per_minute,
      window_start: Date.now() - 60000,
      requests_in_window: stats.count,
      blocked_count: blockedCount,
    };
  }

  /**
   * Reset rate limit for a tenant
   */
  reset(tenantId: string): void {
    // Clear all keys for this tenant
    this.counter.clear(`${tenantId}:default`);
    this.blockStats.delete(`blocked:${tenantId}`);
  }

  /**
   * Get all tiers
   */
  getTiers(): Record<string, RateLimitTier> {
    return { ...RATE_LIMIT_TIERS };
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let rateLimiter: AdvancedRateLimiter | null = null;

export function getAdvancedRateLimiter(): AdvancedRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new AdvancedRateLimiter();
  }
  return rateLimiter;
}



