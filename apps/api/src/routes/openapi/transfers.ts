/**
 * Transfers routes — OpenAPIHono spec scaffold.
 *
 * COVERED IN SPEC
 *   ✓ POST  /v1/transfers                      — create transfer
 *   ✓ GET   /v1/transfers                      — list (paginated + filters)
 *   ✓ GET   /v1/transfers/{id}                 — get
 *   ✓ POST  /v1/transfers/{id}/cancel          — cancel a pending transfer
 *   ⬜ /:id/record-settlement, /batch — TODO
 *
 * Live traffic served by apps/api/src/routes/transfers.ts.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

// ============================================================================
// Schemas
// ============================================================================

const TransferStatusEnum = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

const TransferTypeEnum = z.enum([
  'cross_border',
  'internal',
  'stream_start',
  'stream_withdraw',
  'stream_cancel',
  'wrap',
  'unwrap',
  'x402',
]);

const TransferSchema = z
  .object({
    id: z.string().uuid(),
    type: TransferTypeEnum,
    status: TransferStatusEnum,
    amount: z.string(),
    currency: z.string(),
    from_account_id: z.string().uuid().nullable().optional(),
    to_account_id: z.string().uuid().nullable().optional(),
    from_wallet_id: z.string().uuid().nullable().optional(),
    to_wallet_id: z.string().uuid().nullable().optional(),
    description: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    quote_id: z.string().uuid().nullable().optional(),
    destination_currency: z.string().nullable().optional(),
    initiated_by_type: z.enum(['user', 'api_key', 'agent', 'portal', 'system']).nullable().optional(),
    initiated_by_id: z.string().nullable().optional(),
    protocol: z.string().nullable().optional(),
    protocol_metadata: z.record(z.unknown()).nullable().optional(),
    failure_reason: z.string().nullable().optional(),
    completed_at: z.string().datetime().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi('Transfer');

const CreateTransferSchema = z
  .object({
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    amount: z.number().positive(),
    destinationCurrency: z.string().optional(),
    quoteId: z.string().uuid().optional().describe('Required for cross-currency transfers; lock FX rate via POST /v1/quotes first'),
    description: z.string().max(500).optional(),
  })
  .openapi('CreateTransferInput');

const ErrorSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
    request_id: z.string().optional(),
  })
  .openapi('Error');

const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

const notMigrated = (): z.infer<typeof ErrorSchema> => ({
  error: 'Not yet migrated — use the plain-Hono transfers router',
  code: 'NOT_MIGRATED',
});

// ============================================================================
// POST /transfers
// ============================================================================

const createTransferRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Transfers'],
  summary: 'Create a transfer',
  description:
    'Move funds between accounts. Same-currency transfers settle instantly; cross-currency transfers require a prior `quote_id` from POST /v1/quotes. Always send an `Idempotency-Key` header to safely retry.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      'idempotency-key': z.string().optional().describe('Prevents duplicate transfers on retry; cached for 24h'),
    }),
    body: { content: { 'application/json': { schema: CreateTransferSchema } }, required: true },
  },
  responses: {
    201: {
      description: 'Transfer created (may still be pending settlement)',
      content: { 'application/json': { schema: z.object({ data: TransferSchema }) } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    402: { description: 'Insufficient balance or quote required', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'KYA tier, wallet policy, or approval threshold blocked', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Idempotency key reused with different parameters', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
app.openapi(createTransferRoute, async (c): Promise<any> => c.json(notMigrated(), 400));

// ============================================================================
// GET /transfers
// ============================================================================

const listTransfersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Transfers'],
  summary: 'List transfers',
  description: 'Paginated, richly filterable.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      status: TransferStatusEnum.optional(),
      type: TransferTypeEnum.optional(),
      fromDate: z.string().datetime().optional(),
      toDate: z.string().datetime().optional(),
      walletId: z.string().uuid().optional(),
      endpointId: z.string().uuid().optional().describe('x402-specific filter'),
      providerId: z.string().uuid().optional().describe('x402: endpoint owner account'),
      consumerId: z.string().uuid().optional().describe('x402: payer account'),
      currency: z.string().optional(),
      minAmount: z.coerce.number().optional(),
      maxAmount: z.coerce.number().optional(),
      initiated_by_id: z.string().optional(),
      initiated_by_type: z.enum(['user', 'api_key', 'agent', 'portal', 'system']).optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(200).default(50),
    }),
  },
  responses: {
    200: {
      description: 'Paginated transfers',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(TransferSchema), pagination: PaginationSchema }),
        },
      },
    },
  },
});
app.openapi(listTransfersRoute, async (c): Promise<any> =>
  c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200),
);

// ============================================================================
// GET /transfers/{id}
// ============================================================================

const getTransferRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Transfers'],
  summary: 'Get a transfer',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: 'Transfer detail',
      content: { 'application/json': { schema: z.object({ data: TransferSchema }) } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
app.openapi(getTransferRoute, async (c): Promise<any> => c.json(notMigrated(), 404));

// ============================================================================
// POST /transfers/{id}/cancel
// ============================================================================

const cancelTransferRoute = createRoute({
  method: 'post',
  path: '/{id}/cancel',
  tags: ['Transfers'],
  summary: 'Cancel a pending transfer',
  description:
    "Cancels a transfer that hasn't yet been submitted to the settlement rail. Once a transfer is in `processing` or `completed`, cancellation fails — use [/v1/refunds](#tag/Refunds) instead.",
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: 'Cancelled',
      content: { 'application/json': { schema: z.object({ data: TransferSchema }) } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: {
      description: 'Invalid state transition — transfer already processing or completed',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});
app.openapi(cancelTransferRoute, async (c): Promise<any> => c.json(notMigrated(), 404));

export default app;
