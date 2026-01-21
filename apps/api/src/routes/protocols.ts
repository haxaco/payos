/**
 * Protocol Discovery API
 * Epic 49, Story 49.2: Public endpoints for discovering available protocols
 */

import { Hono } from 'hono';
import { getAllProtocols, getProtocol, isValidProtocolId } from '../services/protocol-registry';

const app = new Hono();

/**
 * GET /v1/protocols
 * List all available protocols (public, no auth required)
 */
app.get('/', async (c) => {
  const protocols = getAllProtocols();

  // Set cache headers for performance (1 hour)
  c.header('Cache-Control', 'public, max-age=3600');

  return c.json({
    data: protocols,
  });
});

/**
 * GET /v1/protocols/:id
 * Get single protocol details (public, no auth required)
 */
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  if (!isValidProtocolId(id)) {
    return c.json(
      {
        error: 'Protocol not found',
        details: {
          protocol: id,
          available: ['x402', 'ap2', 'acp', 'ucp'],
        },
      },
      404
    );
  }

  const protocol = getProtocol(id);

  // Set cache headers for performance (1 hour)
  c.header('Cache-Control', 'public, max-age=3600');

  return c.json(protocol);
});

export default app;
