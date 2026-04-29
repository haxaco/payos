/**
 * Accounts routes — OpenAPIHono spec scaffold.
 *
 * Covers the core CRUD + onboarding helper. This scaffold drives the
 * /v1/accounts section of the OpenAPI spec; live traffic continues to
 * be served by apps/api/src/routes/accounts.ts.
 *
 * COVERED IN SPEC
 *   ✓ POST   /v1/accounts            — create
 *   ✓ GET    /v1/accounts            — list (paginated)
 *   ✓ GET    /v1/accounts/{id}       — get
 *   ✓ PATCH  /v1/accounts/{id}       — update
 *   ✓ DELETE /v1/accounts/{id}       — delete
 *   ✓ POST   /v1/accounts/onboard    — one-call entity onboarding
 *   ⬜ /verify, /upgrade, /suspend, /activate, /balances, /agents,
 *     /streams, /transactions, /transfers, /partner-import — TODO
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

// ============================================================================
// Schemas
// ============================================================================

const AccountSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    environment: z.enum(['test', 'live']),
    type: z.enum(['person', 'business']),
    subtype: z.string().nullable().optional(),
    name: z.string(),
    email: z.string().email().optional(),
    country: z.string().optional(),
    currency: z.string().default('USDC'),
    metadata: z.record(z.unknown()).default({}),
    verificationTier: z.number().int().min(0).max(3),
    verificationStatus: z.enum(['unverified', 'pending', 'verified', 'rejected', 'suspended']),
    verificationType: z.enum(['kyc', 'kyb']),
    balanceTotal: z.number(),
    balanceAvailable: z.number(),
    balanceInStreams: z.number(),
    balanceBuffer: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Account');

const CreateAccountSchema = z
  .object({
    type: z.enum(['person', 'business']),
    name: z.string().min(1).max(255),
    email: z.string().email().optional(),
    country: z.string().length(2).optional().describe('ISO 3166-1 alpha-2 country code'),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi('CreateAccountInput');

const UpdateAccountSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    email: z.string().email().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi('UpdateAccountInput');

const OnboardAccountSchema = z
  .object({
    account_name: z.string().min(1).max(255),
    account_type: z.enum(['person', 'business']),
    agent_name: z.string().min(1).max(255).optional(),
    kya_tier: z.number().int().min(0).max(3).default(0).optional(),
    initial_funding: z.string().optional().describe('Sandbox only — funds the wallet from the faucet'),
  })
  .openapi('OnboardAccountInput');

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
  error: 'Not yet migrated — use the plain-Hono accounts router',
  code: 'NOT_MIGRATED',
});

// ============================================================================
// POST /accounts
// ============================================================================

const createRoute1 = createRoute({
  method: 'post',
  path: '/',
  tags: ['Accounts'],
  summary: 'Create an account',
  description:
    'Creates a person or business account under the authenticated tenant. Accounts start at verification tier 0; use POST /v1/accounts/:id/verify to trigger KYC/KYB.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateAccountSchema } }, required: true },
  },
  responses: {
    201: {
      description: 'Account created',
      content: { 'application/json': { schema: z.object({ data: AccountSchema }) } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
app.openapi(createRoute1, async (c): Promise<any> => c.json(notMigrated(), 400));

// ============================================================================
// GET /accounts
// ============================================================================

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Accounts'],
  summary: 'List accounts',
  description: 'Paginated list. Filter by type (person / business), verification status, or free-text search over name + email.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      type: z.enum(['person', 'business']).optional(),
      status: z.enum(['unverified', 'pending', 'verified', 'rejected', 'suspended']).optional(),
      search: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(200).default(50),
    }),
  },
  responses: {
    200: {
      description: 'Paginated accounts',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(AccountSchema), pagination: PaginationSchema }),
        },
      },
    },
  },
});
app.openapi(listRoute, async (c): Promise<any> =>
  c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200),
);

// ============================================================================
// GET /accounts/{id}
// ============================================================================

const getRoute1 = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Accounts'],
  summary: 'Get an account',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: 'Account',
      content: { 'application/json': { schema: z.object({ data: AccountSchema }) } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
app.openapi(getRoute1, async (c): Promise<any> => c.json(notMigrated(), 404));

// ============================================================================
// PATCH /accounts/{id}
// ============================================================================

const patchRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Accounts'],
  summary: 'Update an account',
  description: 'Partial update. Only provided fields change; omit a field to leave it as-is. Set `email: null` to clear an email.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: UpdateAccountSchema } }, required: true },
  },
  responses: {
    200: {
      description: 'Updated account',
      content: { 'application/json': { schema: z.object({ data: AccountSchema }) } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
app.openapi(patchRoute, async (c): Promise<any> => c.json(notMigrated(), 400));

// ============================================================================
// DELETE /accounts/{id}
// ============================================================================

const deleteRoute1 = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Accounts'],
  summary: 'Delete an account',
  description:
    'Soft-deletes the account. Fails if the account has agents, open streams, or a non-zero balance. Detach / drain those first.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: 'Deleted',
      content: { 'application/json': { schema: z.object({ message: z.string() }) } },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Dependencies exist', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
app.openapi(deleteRoute1, async (c): Promise<any> => c.json(notMigrated(), 404));

// ============================================================================
// POST /accounts/onboard  — wizard helper (account + agent + wallet in one call)
// ============================================================================

const onboardRoute = createRoute({
  method: 'post',
  path: '/onboard',
  tags: ['Accounts'],
  summary: 'One-call entity onboarding',
  description:
    'Creates an account, an optional agent, and a wallet in a single atomic call. Returns all generated credentials. Useful for wizards and scripted setups. Sandbox-funded if `initial_funding` is provided.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: OnboardAccountSchema } }, required: true },
  },
  responses: {
    201: {
      description: 'Onboarded',
      content: {
        'application/json': {
          schema: z.object({
            account: AccountSchema,
            agent: z.object({ id: z.string(), token: z.string().optional() }).optional(),
            wallet: z.object({ id: z.string(), address: z.string().nullable().optional() }).optional(),
          }),
        },
      },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
app.openapi(onboardRoute, async (c): Promise<any> => c.json(notMigrated(), 400));

export default app;
