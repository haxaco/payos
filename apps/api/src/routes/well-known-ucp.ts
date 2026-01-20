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
router.get('/', (c) => {
  const profile = generateUCPProfile();

  // Set cache headers - profiles don't change frequently
  c.header('Cache-Control', 'public, max-age=3600'); // 1 hour
  c.header('Content-Type', 'application/json');

  // Add UCP version header for easy version checking
  c.header('X-UCP-Version', getUCPVersion());

  return c.json(profile);
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
