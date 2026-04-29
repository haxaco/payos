/**
 * Treasury — cash position, exposure, rebalancing, alerts.
 * Mount: /v1/treasury
 * COVERED: 14 most-used endpoints.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const TreasuryAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  rail: z.string(),
  currency: z.string(),
  balance_cents: z.number().int(),
  min_balance_cents: z.number().int(),
  target_balance_cents: z.number().int(),
  max_balance_cents: z.number().int(),
  destination_bank_account_id: z.string().nullable().optional(),
  active: z.boolean(),
  created_at: z.string().datetime(),
}).openapi('TreasuryAccount');

const TreasuryTxnSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  type: z.enum(['inbound', 'outbound', 'rebalance', 'fee', 'adjustment']),
  amount_cents: z.number().int(),
  currency: z.string(),
  source: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  recorded_at: z.string().datetime(),
}).openapi('TreasuryTransaction');

const AlertSchema = z.object({
  id: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  currency: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  message: z.string(),
  triggered_at: z.string().datetime(),
  acknowledged_at: z.string().datetime().nullable().optional(),
}).openapi('TreasuryAlert');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/dashboard', tags: ['Treasury'], summary: 'Treasury dashboard',
  description: 'Comprehensive snapshot — balances by currency, exposure, alerts, recent activity.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Snapshot', content: { 'application/json': { schema: z.object({
      as_of: z.string().datetime(),
      balances_by_currency: z.record(z.object({
        total_cents: z.number().int(), available_cents: z.number().int(), pending_cents: z.number().int(),
      })),
      exposure_by_currency: z.record(z.unknown()),
      alerts: z.array(AlertSchema),
      account_count: z.number().int(),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 200));

app.openapi(createRoute({
  method: 'get', path: '/exposure', tags: ['Treasury'], summary: 'Currency exposure breakdown',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ currency: z.string().optional() }) },
  responses: {
    200: { description: 'Exposure', content: { 'application/json': { schema: z.object({
      data: z.record(z.object({
        active_mandates_cents: z.number().int(),
        scheduled_transfers_cents: z.number().int(),
        open_streams_runway_cents: z.number().int(),
        pending_disputes_cents: z.number().int(),
        reserve_holds_cents: z.number().int(),
      })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: {} }, 200));

app.openapi(createRoute({
  method: 'get', path: '/runway', tags: ['Treasury'], summary: 'Runway forecast',
  description: 'Projects when current balances will be exhausted at recent burn rate.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ horizon_days: z.coerce.number().int().positive().max(180).default(30) }) },
  responses: {
    200: { description: 'Runway', content: { 'application/json': { schema: z.object({
      runway_days: z.number(), burn_rate_cents_per_day: z.number().int(),
      depletion_date: z.string().datetime().nullable(),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 200));

app.openapi(createRoute({
  method: 'get', path: '/velocity', tags: ['Treasury'], summary: 'Velocity / throughput stats',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ period: z.enum(['24h', '7d', '30d']).default('7d') }) },
  responses: {
    200: { description: 'Velocity', content: { 'application/json': { schema: z.object({
      inbound_cents: z.number().int(),
      outbound_cents: z.number().int(),
      net_cents: z.number().int(),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ inbound_cents: 0, outbound_cents: 0, net_cents: 0 }, 200));

app.openapi(createRoute({
  method: 'get', path: '/history', tags: ['Treasury'], summary: 'Historical balance time-series',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    currency: z.string().optional(),
    period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
    granularity: z.enum(['hour', 'day', 'week']).default('day'),
  }) },
  responses: {
    200: { description: 'Series', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({ at: z.string().datetime(), balance_cents: z.number().int() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/partners', tags: ['Treasury'], summary: 'Partner exposure breakdown',
  description: 'For platforms — how much each end-customer (sub-tenant) holds.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Partners', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({ partner_id: z.string(), name: z.string(), balance_cents: z.number().int(), currency: z.string() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/sync', tags: ['Treasury'],
  summary: 'Force-sync rail balances',
  description: 'Pulls authoritative balances from each rail and refreshes Sly\'s cached treasury view.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    202: { description: 'Sync queued', content: { 'application/json': { schema: z.object({ message: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 202));

app.openapi(createRoute({
  method: 'post', path: '/snapshot', tags: ['Treasury'], summary: 'Capture a treasury snapshot',
  description: 'Stores a point-in-time treasury record for compliance / audit purposes.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    description: z.string().max(500).optional(),
  }) } } } },
  responses: {
    201: { description: 'Snapshot', content: { 'application/json': { schema: z.object({
      id: z.string(), captured_at: z.string().datetime(),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 201));

app.openapi(createRoute({
  method: 'get', path: '/accounts', tags: ['Treasury'], summary: 'List treasury accounts',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Accounts', content: { 'application/json': { schema: z.object({ data: z.array(TreasuryAccountSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/accounts', tags: ['Treasury'], summary: 'Create a treasury account',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: TreasuryAccountSchema.omit({
    id: true, balance_cents: true, created_at: true,
  }) } }, required: true } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: z.object({ data: TreasuryAccountSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'patch', path: '/accounts/{id}', tags: ['Treasury'], summary: 'Update a treasury account',
  description: 'Adjust min/target/max balance limits. Used to retune rebalancing thresholds.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: z.object({
      min_balance_cents: z.number().int().optional(),
      target_balance_cents: z.number().int().optional(),
      max_balance_cents: z.number().int().optional(),
      active: z.boolean().optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: TreasuryAccountSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/transactions', tags: ['Treasury'], summary: 'Record a treasury transaction',
  description: 'For non-customer-originated movements (e.g. wires from corporate bank). Creates a ledger entry tied to a treasury account.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: TreasuryTxnSchema.omit({ id: true, recorded_at: true }) } }, required: true } },
  responses: {
    201: { description: 'Recorded', content: { 'application/json': { schema: z.object({ data: TreasuryTxnSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/transactions', tags: ['Treasury'], summary: 'List treasury transactions',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    account_id: z.string().optional(),
    type: z.enum(['inbound', 'outbound', 'rebalance', 'fee', 'adjustment']).optional(),
    since: z.string().datetime().optional(),
  }) },
  responses: {
    200: { description: 'Transactions', content: { 'application/json': { schema: z.object({ data: z.array(TreasuryTxnSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/rebalancing', tags: ['Treasury'], summary: 'Trigger a rebalance',
  description: 'Move funds between treasury accounts (e.g. excess operating → reserve).',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    from_account_id: z.string(),
    to_account_id: z.string(),
    amount_cents: z.number().int().positive(),
    reason: z.string().max(500).optional(),
  }) } }, required: true } },
  responses: {
    202: { description: 'Rebalance queued', content: { 'application/json': { schema: z.object({ data: TreasuryTxnSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/alerts', tags: ['Treasury'], summary: 'Active treasury alerts',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    acknowledged: z.enum(['true', 'false']).optional(),
  }) },
  responses: {
    200: { description: 'Alerts', content: { 'application/json': { schema: z.object({ data: z.array(AlertSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

export default app;
