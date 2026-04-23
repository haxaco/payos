/**
 * UCP merchants — discoverable merchant catalog.
 * Mount: /v1/ucp/merchants
 *
 * COVERED (2 endpoints):
 *   GET    /             list merchants
 *   GET    /{id}         get merchant detail (capabilities, settlement prefs)
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const MerchantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  logo_url: z.string().url().nullable().optional(),
  website: z.string().url().nullable().optional(),
  category: z.string().nullable().optional(),
  country: z.string().optional(),
  currencies: z.array(z.string()),
  accepted_rails: z.array(z.string()),
  settlement_window: z.enum(['instant', 'T+0', 'T+1', 'T+2']),
  agent_ready: z.boolean(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
}).openapi('UCPMerchant');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });

app.openapi(createRoute({
  method: 'get', path: '/', tags: ['UCP Merchants'], summary: 'List merchants',
  description: 'Discovery. Filter by category, country, or search text. Use for building merchant picker UI in agent-facing clients.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    category: z.string().optional(),
    country: z.string().length(2).optional(),
    agent_ready: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Paginated merchants', content: { 'application/json': { schema: z.object({ data: z.array(MerchantSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/{id}', tags: ['UCP Merchants'], summary: 'Get a merchant',
  description: 'Full merchant detail including accepted rails, settlement prefs, and any custom metadata the merchant published.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Merchant', content: { 'application/json': { schema: z.object({ data: MerchantSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json({ error: 'Not found' }, 404));

export default app;
