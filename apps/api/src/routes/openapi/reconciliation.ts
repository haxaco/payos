/**
 * Reconciliation — match Sly ledger ↔ rail settlement files.
 * Mount: /v1/reconciliation
 * COVERED: 10 endpoints.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const ReconReportSchema = z.object({
  id: z.string(),
  rail: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  period: z.object({ from: z.string(), to: z.string() }),
  totals: z.object({
    ledger_entries: z.number().int(),
    rail_entries: z.number().int(),
    matched: z.number().int(),
    unmatched_ledger: z.number().int(),
    unmatched_rail: z.number().int(),
    discrepancies: z.number().int(),
  }),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable().optional(),
}).openapi('ReconciliationReport');

const DiscrepancySchema = z.object({
  id: z.string(),
  report_id: z.string(),
  type: z.enum(['ledger_only', 'rail_only', 'amount_mismatch', 'timing_mismatch', 'duplicate']),
  ledger_entry_id: z.string().nullable().optional(),
  rail_entry_id: z.string().nullable().optional(),
  delta_cents: z.number().int().nullable().optional(),
  resolution: z.enum(['adjusted', 'written_off', 'chasing', 'no_action']).nullable().optional(),
  resolution_note: z.string().nullable().optional(),
  resolved_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
}).openapi('ReconciliationDiscrepancy');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/reports', tags: ['Reconciliation'], summary: 'List reconciliation reports',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    rail: z.string().optional(),
    status: z.enum(['running', 'completed', 'failed']).optional(),
    since: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Reports', content: { 'application/json': { schema: z.object({ data: z.array(ReconReportSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/reports/{id}', tags: ['Reconciliation'], summary: 'Report detail',
  description: 'Includes per-discrepancy breakdown.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Report', content: { 'application/json': { schema: z.object({
      data: ReconReportSchema, discrepancies: z.array(DiscrepancySchema),
    }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/run', tags: ['Reconciliation'], summary: 'Run a reconciliation',
  description: 'Trigger a recon for a specific rail + date range. Runs async; subscribe to `reconciliation.completed` for completion.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    rail: z.string(),
    date_from: z.string(),
    date_to: z.string(),
  }) } }, required: true } },
  responses: {
    202: { description: 'Reconciliation started', content: { 'application/json': { schema: z.object({ data: ReconReportSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/discrepancies', tags: ['Reconciliation'], summary: 'List discrepancies',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    report_id: z.string().optional(),
    type: z.enum(['ledger_only', 'rail_only', 'amount_mismatch', 'timing_mismatch', 'duplicate']).optional(),
    unresolved_only: z.enum(['true', 'false']).optional(),
  }) },
  responses: {
    200: { description: 'Discrepancies', content: { 'application/json': { schema: z.object({ data: z.array(DiscrepancySchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/discrepancies/{id}/resolve', tags: ['Reconciliation'], summary: 'Resolve a discrepancy',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: z.object({
      resolution: z.enum(['adjusted', 'written_off', 'chasing', 'no_action']),
      note: z.string().max(1000).optional(),
      adjustment_entry_id: z.string().optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Resolved', content: { 'application/json': { schema: z.object({ data: DiscrepancySchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'get', path: '/rails', tags: ['Reconciliation'], summary: 'List supported rails',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Rails', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({ rail: z.string(), supports_reconciliation: z.boolean(), file_cadence: z.string() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/rails/{rail}/balance', tags: ['Reconciliation'], summary: 'Rail-side balance snapshot',
  description: 'Authoritative balance per the rail provider. Compare to your Sly-side wallet balance for spot-check sanity.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ rail: z.string() }) },
  responses: {
    200: { description: 'Balance', content: { 'application/json': { schema: z.object({
      rail: z.string(), balance: z.string(), currency: z.string(), as_of: z.string().datetime(),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'get', path: '/rails/{rail}/transactions', tags: ['Reconciliation'], summary: 'Rail-side transaction list',
  description: 'Raw transactions as reported by the rail. Useful for matching against Sly ledger entries when investigating discrepancies.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ rail: z.string() }),
    query: z.object({ since: z.string().optional(), until: z.string().optional() }),
  },
  responses: {
    200: { description: 'Rail transactions', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({
        id: z.string(), rail_reference: z.string(), amount: z.string(),
        currency: z.string(), at: z.string().datetime(),
      })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/summary', tags: ['Reconciliation'], summary: 'Reconciliation summary',
  description: 'Discrepancy counts + delta totals across all recent recons. Health overview.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({ period: z.enum(['24h', '7d', '30d']).default('7d') }) },
  responses: {
    200: { description: 'Summary', content: { 'application/json': { schema: z.object({
      total_discrepancies: z.number(),
      total_delta_cents: z.number().int(),
      by_type: z.record(z.number()),
      unresolved: z.number(),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ total_discrepancies: 0, total_delta_cents: 0, by_type: {}, unresolved: 0 }, 200));

app.openapi(createRoute({
  method: 'get', path: '/dashboard', tags: ['Reconciliation'], summary: 'Reconciliation dashboard',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Snapshot', content: { 'application/json': { schema: z.object({
      last_run: z.object({ at: z.string().datetime(), rail: z.string() }).nullable(),
      open_discrepancies: z.number(), recently_resolved: z.number(),
      stale_count: z.number().describe("Discrepancies older than 3 days still unresolved"),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ last_run: null, open_discrepancies: 0, recently_resolved: 0, stale_count: 0 }, 200));

export default app;
