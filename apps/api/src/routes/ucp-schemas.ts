/**
 * UCP Schema Routes
 *
 * Serves static JSON schemas for UCP capability definitions.
 *
 * @see Story 43.2: UCP Capability Definitions
 */

import { Hono } from 'hono';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = new Hono();

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to public schemas (relative to dist output)
const getPublicPath = (): string => {
  // In development/test, schemas are in apps/api/public
  // Try multiple paths to find the schemas
  const possiblePaths = [
    join(__dirname, '../../public/ucp'),
    join(__dirname, '../../../public/ucp'),
    join(process.cwd(), 'public/ucp'),
    join(process.cwd(), 'apps/api/public/ucp'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Default to cwd-based path
  return join(process.cwd(), 'public/ucp');
};

/**
 * Serve a JSON schema file
 */
const serveSchema = (c: any, filename: string) => {
  const publicPath = getPublicPath();
  const filePath = join(publicPath, filename);

  try {
    if (!existsSync(filePath)) {
      return c.json({ error: 'Schema not found', path: filename }, 404);
    }

    const content = readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);

    // Set appropriate headers
    c.header('Content-Type', 'application/schema+json');
    c.header('Cache-Control', 'public, max-age=86400'); // 24 hours

    return c.json(json);
  } catch (error: any) {
    console.error(`Failed to serve schema ${filename}:`, error);
    return c.json({ error: 'Failed to load schema', message: error.message }, 500);
  }
};

/**
 * GET /ucp/openapi.json
 * OpenAPI specification for UCP REST binding
 */
router.get('/openapi.json', (c) => serveSchema(c, 'openapi.json'));

/**
 * GET /ucp/schemas/quote.json
 * Quote request schema
 */
router.get('/schemas/quote.json', (c) => serveSchema(c, 'schemas/quote.json'));

/**
 * GET /ucp/schemas/transfer.json
 * Transfer request schema
 */
router.get('/schemas/transfer.json', (c) => serveSchema(c, 'schemas/transfer.json'));

/**
 * GET /ucp/schemas/handler_config.json
 * Handler configuration schema
 */
router.get('/schemas/handler_config.json', (c) => serveSchema(c, 'schemas/handler_config.json'));

/**
 * GET /ucp/schemas/pix_instrument.json
 * Pix payment instrument schema
 */
router.get('/schemas/pix_instrument.json', (c) => serveSchema(c, 'schemas/pix_instrument.json'));

/**
 * GET /ucp/schemas/spei_instrument.json
 * SPEI payment instrument schema
 */
router.get('/schemas/spei_instrument.json', (c) => serveSchema(c, 'schemas/spei_instrument.json'));

/**
 * GET /ucp/schemas/checkout.json
 * Checkout session schema
 */
router.get('/schemas/checkout.json', (c) => serveSchema(c, 'schemas/checkout.json'));

/**
 * GET /ucp/schemas/fulfillment.json
 * Fulfillment extension schema
 */
router.get('/schemas/fulfillment.json', (c) => serveSchema(c, 'schemas/fulfillment.json'));

/**
 * GET /ucp/schemas/order.json
 * Order lifecycle schema
 */
router.get('/schemas/order.json', (c) => serveSchema(c, 'schemas/order.json'));

/**
 * GET /ucp/schemas/status.json
 * Settlement status schema
 */
router.get('/schemas/status.json', (c) => serveSchema(c, 'schemas/status.json'));

/**
 * GET /ucp/schemas/merchant_catalog.json
 * Merchant catalog schema
 */
router.get('/schemas/merchant_catalog.json', (c) => serveSchema(c, 'schemas/merchant_catalog.json'));

/**
 * GET /ucp/schemas
 * List all available schemas
 */
router.get('/schemas', (c) => {
  const baseUrl = process.env.PAYOS_API_URL || 'https://api.payos.com';

  return c.json({
    schemas: [
      {
        name: 'checkout',
        description: 'UCP checkout session schema',
        url: `${baseUrl}/ucp/schemas/checkout.json`,
      },
      {
        name: 'fulfillment',
        description: 'UCP fulfillment extension schema',
        url: `${baseUrl}/ucp/schemas/fulfillment.json`,
      },
      {
        name: 'order',
        description: 'UCP order lifecycle schema',
        url: `${baseUrl}/ucp/schemas/order.json`,
      },
      {
        name: 'quote',
        description: 'Quote request schema',
        url: `${baseUrl}/ucp/schemas/quote.json`,
      },
      {
        name: 'transfer',
        description: 'Transfer request schema',
        url: `${baseUrl}/ucp/schemas/transfer.json`,
      },
      {
        name: 'status',
        description: 'Settlement status schema',
        url: `${baseUrl}/ucp/schemas/status.json`,
      },
      {
        name: 'merchant_catalog',
        description: 'Merchant catalog schema',
        url: `${baseUrl}/ucp/schemas/merchant_catalog.json`,
      },
      {
        name: 'handler_config',
        description: 'Handler configuration schema',
        url: `${baseUrl}/ucp/schemas/handler_config.json`,
      },
      {
        name: 'pix_instrument',
        description: 'Pix payment instrument schema',
        url: `${baseUrl}/ucp/schemas/pix_instrument.json`,
      },
      {
        name: 'spei_instrument',
        description: 'SPEI payment instrument schema',
        url: `${baseUrl}/ucp/schemas/spei_instrument.json`,
      },
    ],
    openapi: `${baseUrl}/ucp/openapi.json`,
  });
});

export default router;
