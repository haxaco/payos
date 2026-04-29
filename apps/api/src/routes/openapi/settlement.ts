/**
 * Settlement — tenant-level settlement config + execution.
 * Mount: /v1/settlement
 * COVERED: 10 most-used endpoints (rail-specific Pix/SPEI helpers omitted).
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const SettlementConfigSchema = z.object({
  x402_fee_percentage: z.number().min(0).max(1),
  auto_settlement_enabled: z.boolean(),
  settlement_schedule: z.enum(['immediate', 'hourly', 'daily', 'weekly']),
  holdback_percentage: z.number().min(0).max(1),
  reserve_amount: z.string(),
}).openapi('SettlementConfig');

const SettlementStatusSchema = z.object({
  transfer_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  rail: z.string(),
  rail_reference: z.string().nullable().optional(),
  settlement_window_id: z.string().nullable().optional(),
  amount: z.string(),
  fee: z.string(),
  expected_settlement: z.string().datetime().nullable().optional(),
  actual_settlement: z.string().datetime().nullable().optional(),
}).openapi('SettlementStatus');

const RouteRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string(),
  destination_currency: z.string().optional(),
  destination_country: z.string().optional(),
  preferred_rails: z.array(z.string()).optional(),
}).openapi('SettlementRouteRequest');

const RailSchema = z.object({
  rail: z.string(),
  active: z.boolean(),
  supported_currencies: z.array(z.string()),
  min_amount: z.string(),
  max_amount: z.string(),
  typical_settlement: z.string(),
}).openapi('SettlementRail');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/config', tags: ['Settlement'], summary: 'Get settlement config',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Config', content: { 'application/json': { schema: z.object({ data: SettlementConfigSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 200));

app.openapi(createRoute({
  method: 'patch', path: '/config', tags: ['Settlement'], summary: 'Update settlement config',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: SettlementConfigSchema.partial() } }, required: true } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: SettlementConfigSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/preview', tags: ['Settlement'], summary: 'Preview a settlement',
  description: 'Show projected fees, FX, and settlement time for a hypothetical settlement before committing.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: RouteRequestSchema } }, required: true } },
  responses: {
    200: { description: 'Preview', content: { 'application/json': { schema: z.object({
      total_fee: z.string(), net_amount: z.string(), rail: z.string(), expected_settlement: z.string().datetime(),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/analytics', tags: ['Settlement'], summary: 'Settlement analytics',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ period: z.enum(['24h', '7d', '30d', '90d']).default('30d') }) },
  responses: {
    200: { description: 'Stats', content: { 'application/json': { schema: z.object({
      total_volume: z.string(), total_fees: z.string(), settlements_count: z.number(),
      by_rail: z.record(z.object({ count: z.number(), volume: z.string() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 200));

app.openapi(createRoute({
  method: 'get', path: '/status/{transferId}', tags: ['Settlement'], summary: 'Settlement status for a transfer',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ transferId: z.string().uuid() }) },
  responses: {
    200: { description: 'Status', content: { 'application/json': { schema: z.object({ data: SettlementStatusSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/route', tags: ['Settlement'], summary: 'Suggest a settlement route',
  description: 'Propose the optimal rail + path for a settlement. Returns one or more route options ranked by cost / time.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: RouteRequestSchema } }, required: true } },
  responses: {
    200: { description: 'Routes', content: { 'application/json': { schema: z.object({
      routes: z.array(z.object({
        rail: z.string(), fee: z.string(), eta_seconds: z.number().int(), score: z.number(),
      })),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/execute', tags: ['Settlement'], summary: 'Execute a settlement',
  description: 'Force-execute a settlement using the supplied transfer + route. Bypass auto-settlement for cases that need manual control.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    transfer_id: z.string().uuid(),
    rail: z.string(),
    idempotency_key: z.string().optional(),
  }) } }, required: true } },
  responses: {
    201: { description: 'Executed', content: { 'application/json': { schema: z.object({ data: SettlementStatusSchema }) } } },
    409: { description: 'Already settled or invalid state', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/batch', tags: ['Settlement'], summary: 'Batch-settle transfers',
  description: 'Settle many pending transfers in one call. Mostly used by ops + auto-settlement workers.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    transfer_ids: z.array(z.string().uuid()).min(1).max(500),
    rail: z.string().optional(),
  }) } }, required: true } },
  responses: {
    200: { description: 'Batch result', content: { 'application/json': { schema: z.object({
      total: z.number(), succeeded: z.number(), failed: z.number(),
      results: z.array(z.object({ transfer_id: z.string(), status: z.string(), error: z.string().optional() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/rails', tags: ['Settlement'], summary: 'List active settlement rails',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Rails', content: { 'application/json': { schema: z.object({ data: z.array(RailSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

export default app;
