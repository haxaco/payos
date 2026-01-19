/**
 * UCP Middleware
 *
 * Handles UCP protocol version negotiation and response formatting.
 *
 * @see Story 43.3: UCP Version Negotiation
 * @see https://ucp.dev/specification/overview/
 */

import type { Context, Next } from 'hono';
import {
  parseUCPAgentHeader,
  isVersionSupported,
  getUCPResponseHeaders,
  fetchPlatformProfile,
  negotiateWithPlatform,
} from '../services/ucp/negotiation.js';
import type { UCPAgentHeader, UCPNegotiatedCapabilities } from '../services/ucp/types.js';

// =============================================================================
// Context Types
// =============================================================================

export interface UCPContext {
  agent?: UCPAgentHeader;
  negotiated?: UCPNegotiatedCapabilities;
  versionSupported: boolean;
}

// Extend Hono context
declare module 'hono' {
  interface ContextVariableMap {
    ucp: UCPContext;
  }
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * UCP middleware - parses UCP-Agent header and sets response headers
 *
 * This middleware:
 * 1. Parses the UCP-Agent header if present
 * 2. Validates version compatibility
 * 3. Sets standard UCP response headers
 * 4. Optionally fetches platform profile for full negotiation
 *
 * Use this on UCP-specific routes (e.g., /v1/ucp/*)
 */
export function ucpMiddleware(options: { requireNegotiation?: boolean } = {}) {
  return async (c: Context, next: Next) => {
    // Parse UCP-Agent header
    const ucpAgentHeader = c.req.header('UCP-Agent');
    const agent = parseUCPAgentHeader(ucpAgentHeader);

    // Initialize UCP context
    const ucpCtx: UCPContext = {
      agent: agent || undefined,
      versionSupported: true,
    };

    // Check version if agent header present
    if (agent) {
      ucpCtx.versionSupported = isVersionSupported(agent.version);

      // If version not supported, return error
      if (!ucpCtx.versionSupported) {
        return c.json(
          {
            error: {
              code: 'VERSION_UNSUPPORTED',
              message: `UCP version ${agent.version} is not supported`,
              supported_versions: ['2026-01-11'],
            },
          },
          400
        );
      }

      // If full negotiation required and profile URL available, fetch and negotiate
      if (options.requireNegotiation && agent.profileUrl) {
        const platformProfile = await fetchPlatformProfile(agent.profileUrl);
        if (platformProfile) {
          const negotiated = await negotiateWithPlatform(platformProfile);
          if (negotiated) {
            ucpCtx.negotiated = negotiated;
          }
        }
      }
    }

    // Set UCP context
    c.set('ucp', ucpCtx);

    // Add UCP response headers
    const responseHeaders = getUCPResponseHeaders();
    for (const [key, value] of Object.entries(responseHeaders)) {
      c.header(key, value);
    }

    await next();
  };
}

/**
 * Strict UCP middleware - requires valid UCP-Agent header
 *
 * Use this on endpoints that require a UCP platform to be calling
 */
export function strictUcpMiddleware() {
  return async (c: Context, next: Next) => {
    const ucpAgentHeader = c.req.header('UCP-Agent');

    if (!ucpAgentHeader) {
      return c.json(
        {
          error: {
            code: 'MISSING_UCP_AGENT',
            message: 'UCP-Agent header is required',
            example: 'UCP-Agent: MyAgent/2026-01-11 (https://example.com/.well-known/ucp)',
          },
        },
        400
      );
    }

    const agent = parseUCPAgentHeader(ucpAgentHeader);
    if (!agent) {
      return c.json(
        {
          error: {
            code: 'INVALID_UCP_AGENT',
            message: 'Invalid UCP-Agent header format',
            expected_format: 'AgentName/version (optional_profile_url)',
            example: 'UCP-Agent: MyAgent/2026-01-11 (https://example.com/.well-known/ucp)',
          },
        },
        400
      );
    }

    if (!isVersionSupported(agent.version)) {
      return c.json(
        {
          error: {
            code: 'VERSION_UNSUPPORTED',
            message: `UCP version ${agent.version} is not supported`,
            supported_versions: ['2026-01-11'],
          },
        },
        400
      );
    }

    // Set UCP context
    const ucpCtx: UCPContext = {
      agent,
      versionSupported: true,
    };
    c.set('ucp', ucpCtx);

    // Add UCP response headers
    const responseHeaders = getUCPResponseHeaders();
    for (const [key, value] of Object.entries(responseHeaders)) {
      c.header(key, value);
    }

    await next();
  };
}

/**
 * Helper to get UCP context from request
 */
export function getUCPContext(c: Context): UCPContext | undefined {
  return c.get('ucp');
}

/**
 * Helper to check if request is from a UCP platform
 */
export function isUCPRequest(c: Context): boolean {
  const ucpCtx = c.get('ucp');
  return !!ucpCtx?.agent;
}
