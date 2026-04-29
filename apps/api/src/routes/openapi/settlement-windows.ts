/**
 * Settlement windows — batch cadence config + holiday calendars.
 * Mount: /v1/settlement-windows
 * COVERED: 10 endpoints.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const FrequencyEnum = z.enum(['realtime', 'hourly', '4_per_day', 'daily', 'weekly', 'custom']);

const WindowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  rail: z.string(),
  frequency: FrequencyEnum,
  schedule_utc: z.array(z.string()).optional(),
  cron_expression: z.string().optional(),
  currency: z.string(),
  min_batch_amount_cents: z.number().int(),
  max_batch_size: z.number().int(),
  enabled: z.boolean(),
}).openapi('SettlementWindow');

const QueueItemSchema = z.object({
  transfer_id: z.string().uuid(),
  amount: z.string(),
  currency: z.string(),
  rail: z.string(),
  scheduled_for: z.string().datetime(),
}).openapi('SettlementQueueItem');

const HolidaySchema = z.object({
  date: z.string(),
  rail: z.string(),
  name: z.string(),
  source: z.enum(['system', 'tenant_override']),
}).openapi('RailHoliday');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/', tags: ['Settlement Windows'], summary: 'List windows',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Windows', content: { 'application/json': { schema: z.object({ data: z.array(WindowSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/schedule', tags: ['Settlement Windows'], summary: 'Upcoming schedule',
  description: 'Next N window firings across all configured rails.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ horizon_hours: z.coerce.number().int().positive().max(168).default(24) }) },
  responses: {
    200: { description: 'Schedule', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({ window_id: z.string(), rail: z.string(), fires_at: z.string().datetime() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/queue', tags: ['Settlement Windows'], summary: 'Pending settlement queue',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ rail: z.string().optional() }) },
  responses: {
    200: { description: 'Queued items', content: { 'application/json': { schema: z.object({
      data: z.array(QueueItemSchema), totals: z.object({ count: z.number(), amount: z.string() }),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], totals: { count: 0, amount: '0' } }, 200));

app.openapi(createRoute({
  method: 'post', path: '/queue', tags: ['Settlement Windows'], summary: 'Add transfer to settlement queue',
  description: 'Manually enqueue a transfer for the next matching window. Usually managed automatically.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    transfer_id: z.string().uuid(),
    rail: z.string().optional(),
  }) } }, required: true } },
  responses: {
    201: { description: 'Queued', content: { 'application/json': { schema: z.object({ data: QueueItemSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/emergency', tags: ['Settlement Windows'],
  summary: 'Emergency-flush a rail',
  description: 'Bypass batching and force-settle everything pending on the given rail. Use sparingly — sacrifices batching economics.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    rail: z.string(),
    reason: z.string().max(500),
  }) } }, required: true } },
  responses: {
    202: { description: 'Flush initiated', content: { 'application/json': { schema: z.object({ execution_id: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/holidays', tags: ['Settlement Windows'], summary: 'Rail holiday calendar',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    rail: z.string().optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
  }) },
  responses: {
    200: { description: 'Holidays', content: { 'application/json': { schema: z.object({ data: z.array(HolidaySchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/holidays', tags: ['Settlement Windows'],
  summary: 'Override rail holiday',
  description: 'Add a tenant-specific holiday (e.g. internal company closure) that windows will skip.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: HolidaySchema.omit({ source: true }) } }, required: true } },
  responses: {
    201: { description: 'Added', content: { 'application/json': { schema: z.object({ data: HolidaySchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/holidays/check', tags: ['Settlement Windows'], summary: 'Is a date a rail holiday?',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    rail: z.string(),
    date: z.string().describe('YYYY-MM-DD'),
  }) },
  responses: {
    200: { description: 'Holiday lookup', content: { 'application/json': { schema: z.object({
      is_holiday: z.boolean(), name: z.string().optional(), next_business_day: z.string().optional(),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ is_holiday: false }, 200));

app.openapi(createRoute({
  method: 'get', path: '/executions', tags: ['Settlement Windows'], summary: 'Window execution history',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    window_id: z.string().uuid().optional(),
    since: z.string().datetime().optional(),
  }) },
  responses: {
    200: { description: 'Executions', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({
        id: z.string(), window_id: z.string(), batch_size: z.number(), total_amount: z.string(),
        status: z.string(), executed_at: z.string().datetime(),
      })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/dashboard', tags: ['Settlement Windows'], summary: 'Settlement-windows dashboard',
  description: 'High-level operational view — recent firings, queue depth, upcoming schedule.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Snapshot', content: { 'application/json': { schema: z.object({
      queue_depth: z.number(), pending_amount: z.string(),
      next_fire: z.object({ window_id: z.string(), fires_at: z.string().datetime() }).nullable(),
      last_fire: z.object({ window_id: z.string(), executed_at: z.string().datetime(), batch_size: z.number() }).nullable(),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ queue_depth: 0, pending_amount: '0', next_fire: null, last_fire: null }, 200));

export default app;
