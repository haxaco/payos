/**
 * UCP Version Negotiation Service
 *
 * Handles UCP protocol version negotiation between PayOS and UCP platforms.
 *
 * @see Story 43.3: UCP Version Negotiation
 * @see https://ucp.dev/specification/overview/
 */

import type {
  UCPAgentHeader,
  UCPNegotiatedCapabilities,
  UCPMerchantProfile,
} from './types.js';
import { getCapabilities, getUCPVersion } from './profile.js';

// =============================================================================
// Constants
// =============================================================================

const SUPPORTED_VERSIONS = ['2026-01-11'];
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// =============================================================================
// Profile Cache
// =============================================================================

interface CachedProfile {
  profile: UCPMerchantProfile;
  fetchedAt: number;
}

const profileCache = new Map<string, CachedProfile>();

/**
 * Clear expired profiles from cache
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [url, cached] of profileCache.entries()) {
    if (now - cached.fetchedAt > PROFILE_CACHE_TTL_MS) {
      profileCache.delete(url);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

// =============================================================================
// Header Parsing
// =============================================================================

/**
 * Parse UCP-Agent header
 *
 * Format: "AgentName/version (profile_url)"
 * Example: "GoogleAI/2026-01-11 (https://google.com/.well-known/ucp)"
 */
export function parseUCPAgentHeader(header: string | undefined): UCPAgentHeader | null {
  if (!header) return null;

  // Pattern: Name/version (optional_url)
  const pattern = /^([^/]+)\/([^\s(]+)(?:\s*\(([^)]+)\))?$/;
  const match = header.match(pattern);

  if (!match) return null;

  return {
    name: match[1].trim(),
    version: match[2].trim(),
    profileUrl: match[3]?.trim(),
  };
}

/**
 * Format UCP-Agent header for PayOS
 */
export function formatUCPAgentHeader(profileUrl?: string): string {
  const version = getUCPVersion();
  const baseUrl = process.env.PAYOS_API_URL || 'https://api.payos.com';
  const url = profileUrl || `${baseUrl}/.well-known/ucp`;
  return `PayOS/${version} (${url})`;
}

// =============================================================================
// Version Negotiation
// =============================================================================

/**
 * Check if a UCP version is supported
 */
export function isVersionSupported(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version);
}

/**
 * Get the best matching version between platform and PayOS
 */
export function negotiateVersion(platformVersion: string): string | null {
  // For now, we only support exact version match
  // In the future, we could implement semantic version negotiation
  if (isVersionSupported(platformVersion)) {
    return platformVersion;
  }
  return null;
}

/**
 * Get PayOS capabilities that match platform capabilities
 */
export function negotiateCapabilities(
  platformCapabilities: string[]
): string[] {
  const ourCapabilities = getCapabilities().map((c) => c.name);

  // Return intersection of capabilities
  return ourCapabilities.filter((cap) => platformCapabilities.includes(cap));
}

/**
 * Perform full capability negotiation with a platform
 */
export async function negotiateWithPlatform(
  platformProfile: UCPMerchantProfile
): Promise<UCPNegotiatedCapabilities | null> {
  const platformVersion = platformProfile.ucp.version;

  // Check version compatibility
  const negotiatedVersion = negotiateVersion(platformVersion);
  if (!negotiatedVersion) {
    return null;
  }

  // Get capability intersection
  const platformCapNames = platformProfile.ucp.capabilities.map((c) => c.name);
  const negotiatedCaps = negotiateCapabilities(platformCapNames);

  // Get handler intersection (if platform supports payment handlers)
  const handlers: string[] = [];
  // PayOS's handler is always available
  handlers.push('com.payos.latam_settlement');

  return {
    version: negotiatedVersion,
    capabilities: negotiatedCaps,
    handlers,
  };
}

// =============================================================================
// Profile Fetching
// =============================================================================

/**
 * Fetch a UCP profile from a platform
 */
export async function fetchPlatformProfile(
  profileUrl: string
): Promise<UCPMerchantProfile | null> {
  // Check cache first
  const cached = profileCache.get(profileUrl);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL_MS) {
    return cached.profile;
  }

  try {
    const response = await fetch(profileUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': formatUCPAgentHeader(),
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to fetch UCP profile from ${profileUrl}: ${response.status}`);
      return null;
    }

    const profile = (await response.json()) as UCPMerchantProfile;

    // Validate basic structure
    if (!profile.ucp?.version || !profile.ucp?.capabilities) {
      console.error(`Invalid UCP profile from ${profileUrl}: missing required fields`);
      return null;
    }

    // Cache the profile
    profileCache.set(profileUrl, {
      profile,
      fetchedAt: Date.now(),
    });

    return profile;
  } catch (error: any) {
    console.error(`Error fetching UCP profile from ${profileUrl}:`, error.message);
    return null;
  }
}

/**
 * Get a cached profile or null if not cached
 */
export function getCachedProfile(profileUrl: string): UCPMerchantProfile | null {
  const cached = profileCache.get(profileUrl);
  if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL_MS) {
    return cached.profile;
  }
  return null;
}

/**
 * Clear the profile cache (for testing)
 */
export function clearProfileCache(): void {
  profileCache.clear();
}

// =============================================================================
// Response Headers
// =============================================================================

/**
 * Get standard UCP response headers
 */
export function getUCPResponseHeaders(): Record<string, string> {
  return {
    'X-UCP-Version': getUCPVersion(),
    'UCP-Agent': formatUCPAgentHeader(),
  };
}

/**
 * Add negotiated capabilities to response
 */
export function formatNegotiatedResponse(
  negotiated: UCPNegotiatedCapabilities
): Record<string, unknown> {
  return {
    ucp: {
      version: negotiated.version,
      capabilities: negotiated.capabilities,
    },
  };
}
