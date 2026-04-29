/**
 * Settlement rules — programmable triggers for auto-settlement.
 * Mount: /v1/settlement-rules
 * COVERED: 8 endpoints.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const TriggerTypeEnum = z.enum(['balance_threshold', 'time_based', 'event_based', 'manual', 'transaction_count']);
const ActionTypeEnum = z.enum(['settle_to_bank', 'settle_to_account', 'settle_to_wallet', 'hold', 'notify']);

const RuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  wallet_id: z.string().uuid().nullable().optional(),
  trigger_type: TriggerTypeEnum,
  trigger_config: z.record(z.unknown()),
  action_type: ActionTypeEnum,
  action_config: z.record(z.unknown()),
  enabled: z.boolean(),
  priority: z.number().int(),
  created_at: z.string().datetime(),
}).openapi('SettlementRule');

const ExecutionSchema = z.object({
  id: z.string(),
  rule_id: z.string().uuid(),
  status: z.enum(['triggered', 'executed', 'skipped', 'failed']),
  result: z.record(z.unknown()).optional(),
  triggered_at: z.string().datetime(),
}).openapi('RuleExecution');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/', tags: ['Settlement Rules'], summary: 'List rules',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    wallet_id: z.string().uuid().optional(),
    trigger_type: TriggerTypeEnum.optional(),
    enabled_only: z.enum(['true', 'false']).optional(),
  }) },
  responses: {
    200: { description: 'Rules', content: { 'application/json': { schema: z.object({ data: z.array(RuleSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/{id}', tags: ['Settlement Rules'], summary: 'Get a rule',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Rule', content: { 'application/json': { schema: z.object({ data: RuleSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/', tags: ['Settlement Rules'], summary: 'Create a rule',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: RuleSchema.omit({ id: true, created_at: true }) } }, required: true } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: z.object({ data: RuleSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'patch', path: '/{id}', tags: ['Settlement Rules'], summary: 'Update a rule',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: RuleSchema.omit({ id: true, created_at: true }).partial() } }, required: true },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: RuleSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'delete', path: '/{id}', tags: ['Settlement Rules'], summary: 'Delete a rule',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Deleted', content: { 'application/json': { schema: z.object({ message: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'get', path: '/{id}/executions', tags: ['Settlement Rules'], summary: 'Per-rule execution history',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(200).default(50),
    }),
  },
  responses: {
    200: { description: 'Executions', content: { 'application/json': { schema: z.object({ data: z.array(ExecutionSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/executions/all', tags: ['Settlement Rules'], summary: 'Tenant-wide execution log',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    status: z.enum(['triggered', 'executed', 'skipped', 'failed']).optional(),
    since: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Executions', content: { 'application/json': { schema: z.object({ data: z.array(ExecutionSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'post', path: '/manual-withdrawal', tags: ['Settlement Rules'],
  summary: 'Force a manual withdrawal',
  description: 'Bypass all rules and trigger a settlement immediately. Used during incident recovery or month-end close.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    wallet_id: z.string().uuid(),
    reason: z.string().max(500),
  }) } }, required: true } },
  responses: {
    202: { description: 'Withdrawal queued', content: { 'application/json': { schema: z.object({ execution_id: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

export default app;
