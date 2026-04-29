/**
 * Scheduled transfers — recurring + future-dated transfers.
 * Mount: /v1/scheduled-transfers
 * COVERED: 7 endpoints.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const FrequencyEnum = z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']);
const ScheduleStatusEnum = z.enum(['active', 'paused', 'completed', 'failed', 'cancelled']);

const ScheduleSchema = z.object({
  id: z.string().uuid(),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid().nullable().optional(),
  toPaymentMethodId: z.string().uuid().nullable().optional(),
  amount: z.string(),
  currency: z.string(),
  frequency: FrequencyEnum,
  intervalValue: z.number().int().default(1),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  cronExpression: z.string().nullable().optional(),
  timezone: z.string().default('UTC'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  maxOccurrences: z.number().int().nullable().optional(),
  retryEnabled: z.boolean().default(true),
  maxRetryAttempts: z.number().int().default(3),
  retryWindowDays: z.number().int().default(14),
  status: ScheduleStatusEnum,
  next_execution_at: z.string().datetime().nullable().optional(),
  last_execution_at: z.string().datetime().nullable().optional(),
  executions_completed: z.number().int(),
  created_at: z.string().datetime(),
}).openapi('ScheduledTransfer');

const CreateScheduleSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid().optional(),
  toPaymentMethodId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().default('USDC'),
  frequency: FrequencyEnum,
  intervalValue: z.number().int().positive().default(1),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().default('UTC'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.number().int().positive().optional(),
  retryEnabled: z.boolean().default(true),
  maxRetryAttempts: z.number().int().min(0).max(10).default(3),
  retryWindowDays: z.number().int().min(1).max(60).default(14),
  description: z.string().max(500).optional(),
}).openapi('CreateScheduledTransferInput');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/', tags: ['Scheduled Transfers'], summary: 'List scheduled transfers',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    status: ScheduleStatusEnum.optional(),
    account_id: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Paginated schedules', content: { 'application/json': { schema: z.object({ data: z.array(ScheduleSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'post', path: '/', tags: ['Scheduled Transfers'], summary: 'Create a schedule',
  description: 'Configure a recurring or future-dated transfer. Use `frequency: custom` with a cron expression for arbitrary cadences.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: CreateScheduleSchema } }, required: true } },
  responses: {
    201: { description: 'Schedule created', content: { 'application/json': { schema: z.object({ data: ScheduleSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/{id}', tags: ['Scheduled Transfers'], summary: 'Get a schedule',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Schedule', content: { 'application/json': { schema: z.object({ data: ScheduleSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

for (const [op, action, desc] of [
  ['pause', 'Pause', 'Skips executions until resumed. In-flight executions complete.'],
  ['resume', 'Resume', 'Resume after pause. Next execution lands on the next scheduled time.'],
  ['cancel', 'Cancel', 'Permanently cancels remaining executions. Schedule transitions to `cancelled` (irreversible).'],
] as const) {
  app.openapi(createRoute({
    method: 'post', path: `/{id}/${op}`, tags: ['Scheduled Transfers'],
    summary: `${action} a schedule`, description: desc,
    'x-visibility': 'public', security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: `${action}d`, content: { 'application/json': { schema: z.object({ data: ScheduleSchema }) } } },
      404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
      409: { description: 'Invalid state transition', content: { 'application/json': { schema: ErrorSchema } } },
    },
  }), async (c): Promise<any> => c.json(notMigrated(), 404));
}

app.openapi(createRoute({
  method: 'post', path: '/{id}/execute-now', tags: ['Scheduled Transfers'],
  summary: 'Execute a scheduled transfer now',
  description: 'Bypasses the schedule and triggers a one-off execution immediately. Counts toward `maxOccurrences` if set.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    202: { description: 'Execution queued', content: { 'application/json': { schema: z.object({ transfer_id: z.string().uuid() }) } } },
    409: { description: 'Schedule not active', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

export default app;
