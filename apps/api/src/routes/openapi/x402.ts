/**
 * x402 routes — migrated to @hono/zod-openapi for auto-generated OpenAPI spec.
 *
 * This is the PoC for the six-protocol migration. Each route below is declared
 * with a typed request/response schema via createRoute() and tagged with
 * `x-visibility: 'public'` so the generator emits it in the public spec.
 *
 * The existing plain-Hono routers (x402-endpoints.ts, x402-payments.ts, etc.)
 * still serve production traffic from app.ts during incremental migration.
 * When a subsystem is ready to flip, swap the import in app.ts from the old
 * router to this OpenAPIHono version.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createClient } from '../../db/client.js';
import { authMiddleware } from '../../middleware/auth.js';
import { getEnv } from '../../utils/helpers.js';
import { trackOp } from '../../services/ops/track-op.js';
import { OpType } from '../../services/ops/operation-types.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

// ============================================================================
// Row types (hand-written since no Supabase-generated types file exists)
// ============================================================================

interface AccountRow {
  id: string;
}

interface X402EndpointRow {
  id: string;
  tenant_id: string;
  account_id: string;
  name: string;
  path: string;
  method: string;
  description: string | null;
  base_price: string;
  currency: string;
  volume_discounts: Array<{ threshold: number; priceMultiplier: number }> | null;
  payment_address: string;
  asset_address: string | null;
  network: string;
  total_calls: number;
  total_revenue: string;
  status: string;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Shared schemas (hoisted from inline z.object calls in the old router)
// ============================================================================

const VolumeDiscountSchema = z
  .object({
    threshold: z.number().int().positive(),
    priceMultiplier: z.number().positive().max(1),
  })
  .openapi('X402VolumeDiscount');

const X402EndpointSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    accountId: z.string().uuid(),
    name: z.string(),
    path: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY']),
    description: z.string().nullable().optional(),
    basePrice: z.number(),
    currency: z.enum(['USDC', 'EURC']),
    volumeDiscounts: z.array(VolumeDiscountSchema).default([]),
    paymentAddress: z.string(),
    assetAddress: z.string().nullable().optional(),
    network: z.string(),
    totalCalls: z.number().int(),
    totalRevenue: z.number(),
    status: z.enum(['active', 'paused', 'disabled']),
    webhookUrl: z.string().url().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('X402Endpoint');

const CreateEndpointSchema = z
  .object({
    name: z.string().min(1).max(255),
    path: z.string().min(1).max(500).regex(/^\//),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY']),
    description: z.string().max(1000).optional(),
    accountId: z.string().uuid(),
    basePrice: z.number().positive().min(0.0001).max(999999),
    currency: z.enum(['USDC', 'EURC']).default('USDC'),
    volumeDiscounts: z.array(VolumeDiscountSchema).optional(),
    webhookUrl: z.string().url().optional(),
    network: z.string().default('base-mainnet'),
  })
  .openapi('CreateX402EndpointInput');

const UpdateEndpointSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    basePrice: z.number().positive().min(0.0001).max(999999).optional(),
    volumeDiscounts: z.array(VolumeDiscountSchema).optional(),
    status: z.enum(['active', 'paused', 'disabled']).optional(),
    webhookUrl: z.string().url().optional(),
  })
  .openapi('UpdateX402EndpointInput');

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

// ============================================================================
// Helpers
// ============================================================================

type EndpointResponse = z.infer<typeof X402EndpointSchema>;

function mapEndpoint(row: X402EndpointRow): EndpointResponse {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    name: row.name,
    path: row.path,
    method: row.method as EndpointResponse['method'],
    description: row.description,
    basePrice: parseFloat(row.base_price),
    currency: row.currency as EndpointResponse['currency'],
    volumeDiscounts: row.volume_discounts ?? [],
    paymentAddress: row.payment_address,
    assetAddress: row.asset_address,
    network: row.network,
    totalCalls: row.total_calls,
    totalRevenue: parseFloat(row.total_revenue),
    status: row.status as EndpointResponse['status'],
    webhookUrl: row.webhook_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Routes
// ============================================================================

const createEndpointRoute = createRoute({
  method: 'post',
  path: '/endpoints',
  tags: ['x402'],
  summary: 'Register an x402 endpoint',
  description:
    'Register an API endpoint that will accept x402 micropayments. Returns a payment address and asset details to advertise in 402 responses.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateEndpointSchema } }, required: true },
  },
  responses: {
    201: {
      description: 'Endpoint registered',
      content: { 'application/json': { schema: z.object({ data: X402EndpointSchema }) } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Account not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Duplicate path+method', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

app.openapi(createEndpointRoute, async (c): Promise<any> => {
  const ctx = c.get('ctx');
  const body = c.req.valid('json');
  const supabase = createClient();

  const accountResult = await supabase
    .from('accounts')
    .select('id')
    .eq('id', body.accountId)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .single();
  const account = accountResult.data as AccountRow | null;

  if (!account) {
    return c.json({ error: 'Account not found or does not belong to your tenant' }, 404);
  }

  const existingResult = await supabase
    .from('x402_endpoints')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .eq('path', body.path)
    .eq('method', body.method)
    .single();
  const existing = existingResult.data as { id: string } | null;

  if (existing) {
    return c.json(
      {
        error: 'Endpoint with this path and method already exists',
        details: { path: body.path, method: body.method },
      },
      409
    );
  }

  const paymentAddress = `internal://payos/${ctx.tenantId}/${account.id}`;

  const createResult = await supabase
    .from('x402_endpoints')
    // cast is required because Supabase client type inference loses the row type
    // without a generated types file; we insert a plain object and let the DB
    // apply its defaults
    .insert({
      tenant_id: ctx.tenantId,
      environment: getEnv(ctx),
      account_id: body.accountId,
      name: body.name,
      path: body.path,
      method: body.method,
      description: body.description,
      base_price: body.basePrice,
      currency: body.currency,
      volume_discounts: body.volumeDiscounts ?? null,
      payment_address: paymentAddress,
      network: body.network,
      webhook_url: body.webhookUrl,
      status: 'active',
    } as never)
    .select()
    .single();
  const endpoint = createResult.data as X402EndpointRow | null;

  if (!endpoint) {
    return c.json({ error: 'Failed to create endpoint', details: createResult.error?.message }, 400);
  }

  trackOp({
    tenantId: ctx.tenantId,
    operation: OpType.X402_ENDPOINT_CREATED,
    subject: `x402-endpoint/${endpoint.id}`,
    actorType: ctx.actorType,
    actorId: ctx.actorId || ctx.userId || ctx.apiKeyId,
    correlationId: (c.get('requestId' as never) as string | undefined),
    success: true,
  });

  return c.json({ data: mapEndpoint(endpoint) }, 201);
});

const listEndpointsRoute = createRoute({
  method: 'get',
  path: '/endpoints',
  tags: ['x402'],
  summary: 'List x402 endpoints',
  description: 'List all x402 endpoints registered by your tenant.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      status: z.enum(['active', 'paused', 'disabled']).optional(),
      account_id: z.string().uuid().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(200).default(50),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of endpoints',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(X402EndpointSchema), pagination: PaginationSchema }),
        },
      },
    },
  },
});

app.openapi(listEndpointsRoute, async (c) => {
  const ctx = c.get('ctx');
  const { status, account_id, page, limit } = c.req.valid('query');
  const supabase = createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('x402_endpoints')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (account_id) query = query.eq('account_id', account_id);

  const result = await query.range(offset, offset + limit - 1);
  const rows = (result.data ?? []) as X402EndpointRow[];

  return c.json({
    data: rows.map(mapEndpoint),
    pagination: {
      page,
      limit,
      total: result.count ?? 0,
      totalPages: Math.ceil((result.count ?? 0) / limit),
    },
  });
});

const getEndpointRoute = createRoute({
  method: 'get',
  path: '/endpoints/{id}',
  tags: ['x402'],
  summary: 'Get x402 endpoint',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: 'Endpoint detail',
      content: { 'application/json': { schema: z.object({ data: X402EndpointSchema }) } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

app.openapi(getEndpointRoute, async (c): Promise<any> => {
  const ctx = c.get('ctx');
  const { id } = c.req.valid('param');
  const supabase = createClient();

  const result = await supabase
    .from('x402_endpoints')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .single();
  const endpoint = result.data as X402EndpointRow | null;

  if (!endpoint) return c.json({ error: 'Endpoint not found' }, 404);

  return c.json({ data: mapEndpoint(endpoint) });
});

const updateEndpointRoute = createRoute({
  method: 'patch',
  path: '/endpoints/{id}',
  tags: ['x402'],
  summary: 'Update x402 endpoint',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: UpdateEndpointSchema } }, required: true },
  },
  responses: {
    200: {
      description: 'Updated endpoint',
      content: { 'application/json': { schema: z.object({ data: X402EndpointSchema }) } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

app.openapi(updateEndpointRoute, async (c): Promise<any> => {
  const ctx = c.get('ctx');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createClient();

  const existingResult = await supabase
    .from('x402_endpoints')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .single();
  const existing = existingResult.data as { id: string } | null;

  if (!existing) return c.json({ error: 'Endpoint not found' }, 404);

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.description !== undefined) updatePayload.description = body.description;
  if (body.basePrice !== undefined) updatePayload.base_price = body.basePrice;
  if (body.volumeDiscounts !== undefined) updatePayload.volume_discounts = body.volumeDiscounts;
  if (body.status !== undefined) updatePayload.status = body.status;
  if (body.webhookUrl !== undefined) updatePayload.webhook_url = body.webhookUrl;

  const updateResult = await supabase
    .from('x402_endpoints')
    .update(updatePayload as never)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .select()
    .single();
  const updated = updateResult.data as X402EndpointRow | null;

  if (!updated) return c.json({ error: 'Failed to update endpoint' }, 400);

  trackOp({
    tenantId: ctx.tenantId,
    operation: OpType.X402_ENDPOINT_UPDATED,
    subject: `x402-endpoint/${id}`,
    actorType: ctx.actorType,
    actorId: ctx.actorId || ctx.userId || ctx.apiKeyId,
    correlationId: (c.get('requestId' as never) as string | undefined),
    success: true,
  });

  return c.json({ data: mapEndpoint(updated) });
});

const deleteEndpointRoute = createRoute({
  method: 'delete',
  path: '/endpoints/{id}',
  tags: ['x402'],
  summary: 'Delete x402 endpoint',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({ force: z.enum(['true', 'false']).optional() }),
  },
  responses: {
    200: {
      description: 'Deleted',
      content: { 'application/json': { schema: z.object({ message: z.string() }) } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: {
      description: 'Endpoint has transaction history; add ?force=true to confirm',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

app.openapi(deleteEndpointRoute, async (c): Promise<any> => {
  const ctx = c.get('ctx');
  const { id } = c.req.valid('param');
  const { force } = c.req.valid('query');
  const supabase = createClient();

  const existingResult = await supabase
    .from('x402_endpoints')
    .select('id, total_calls')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx))
    .single();
  const existing = existingResult.data as { id: string; total_calls: number } | null;

  if (!existing) return c.json({ error: 'Endpoint not found' }, 404);

  if (existing.total_calls > 0 && force !== 'true') {
    return c.json(
      {
        error: 'Endpoint has transaction history',
        details: { totalCalls: existing.total_calls, hint: 'Add ?force=true to delete anyway' },
      },
      409
    );
  }

  await supabase
    .from('x402_endpoints')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .eq('environment', getEnv(ctx));

  return c.json({ message: 'Endpoint deleted successfully' });
});

export default app;
