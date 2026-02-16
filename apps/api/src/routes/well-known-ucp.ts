/**
 * UCP Well-Known Endpoint
 *
 * Public discovery endpoint for UCP protocol.
 * Returns PayOS's UCP profile for capability negotiation.
 *
 * This endpoint enables:
 * - Discovery by Google AI agents (Gemini, Search AI Mode)
 * - Capability negotiation with platforms
 * - Webhook signature verification via signing_keys
 *
 * @see Story 43.1: UCP Profile Endpoint
 * @see https://ucp.dev/specification/overview/
 */

import { Hono } from 'hono';
import {
  generateUCPProfile,
  getUCPVersion,
  initializeSigningKey,
} from '../services/ucp/index.js';

// Initialize signing key on module load
// This ensures keys are ready when the first request comes in
initializeSigningKey();

const router = new Hono();

/**
 * OPTIONS /.well-known/ucp
 *
 * CORS preflight for discovery endpoint.
 */
router.options('/', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, UCP-Agent',
      'Access-Control-Max-Age': '86400',
    },
  });
});

/**
 * GET /.well-known/ucp
 *
 * Returns the UCP profile for PayOS discovery.
 * This endpoint is PUBLIC (no authentication required).
 *
 * Response includes:
 * - UCP version and capabilities
 * - Service definitions (REST, MCP endpoints)
 * - Payment handler specification
 * - Signing keys for webhook verification
 *
 * Cache-Control: 1 hour (profiles change infrequently)
 */
router.get('/', async (c) => {
  const profile = await generateUCPProfile();

  // Return raw profile without response wrapper — UCP spec requires
  // the profile at the root level (ucp.version must be top-level).
  // Using new Response() bypasses the responseWrapperMiddleware.
  return new Response(JSON.stringify(profile), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'X-UCP-Version': getUCPVersion(),
      'Access-Control-Allow-Origin': '*',
    },
  });
});

/**
 * GET /.well-known/ucp/version
 *
 * Quick version check endpoint.
 * Returns just the UCP version PayOS supports.
 */
router.get('/version', (c) => {
  c.header('Cache-Control', 'public, max-age=3600');

  return c.json({
    ucp_version: getUCPVersion(),
    payos_version: '1.0.0',
  });
});

export default router;
