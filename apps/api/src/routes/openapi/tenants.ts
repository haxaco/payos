/**
 * Tenants — OpenAPIHono spec scaffold.
 *
 * Open Beta Hardening: production-access declaration + status.
 * COVERED: declare-production, production-status (2 endpoints)
 *
 * Notes
 *   - These routes are NOT migrated to OpenAPIHono at runtime; the live
 *     handlers stay in routes/tenants.ts (plain Hono). This file exists
 *     ONLY so the generated OpenAPI spec advertises the endpoints with
 *     accurate request/response schemas. The handler bodies below return
 *     a sentinel `NOT_MIGRATED` payload that never executes in prod —
 *     buildOpenAPIApp() is build-time only via apps/api/scripts/generate-openapi.ts.
 *   - Visibility `'public'` matches authentication/api-keys — these belong
 *     in the published portal at docs.getsly.ai/api-reference.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

// ============================================================================
// Schemas
// ============================================================================

const ProductionAccessStatusEnum = z
  .enum([
    'sandbox_only',
    'declaration_pending',
    'production_approved',
    'production_denied',
    'production_suspended',
  ])
  .openapi('ProductionAccessStatus');

const BetaCeilingSchema = z
  .object({
    perTx: z.number().describe('Largest single transaction allowed (USDC).'),
    daily: z.number().describe('Tenant-wide daily aggregate cap (UTC day, USDC).'),
    monthly: z.number().describe('Tenant-wide monthly aggregate cap (calendar month, USDC).'),
    disabled: z.boolean().describe('When true, the ceiling is not enforced (admin escape hatch).'),
    source: z.enum(['platform_default', 'override']),
  })
  .openapi('BetaCeiling');

const DeclarationIdentitySchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    provider: z.string().optional().describe('SSO provider (e.g. google, github).'),
    organization_name: z.string().optional(),
  })
  .openapi('DeclarationIdentity');

const ProductionDeclarationSchema = z
  .object({
    intended_use_case: z.string().min(20).max(1000)
      .describe('Free-form description of the integration. The denser the description, the faster the review.'),
    expected_monthly_volume_usd: z.number().positive().optional()
      .describe('Best-effort monthly volume estimate. Influences the initial beta ceiling.'),
    website_url: z.string().url().optional()
      .describe('Public-facing site or repo. Speeds up identity verification.'),
    accepted_terms: z.literal(true)
      .describe('Acceptance of the live-money-movement terms. Must be true.'),
  })
  .openapi('ProductionDeclarationInput');

const ProductionStatusSchema = z
  .object({
    status: ProductionAccessStatusEnum,
    kyaTier: z.number().int().min(0).max(3)
      .describe('Tenant KYA tier — 0 sandbox, 1 declared, 2 verified, 3 trusted.'),
    declaredAt: z.string().datetime().nullable(),
    reviewedAt: z.string().datetime().nullable(),
    reviewNotes: z.string().nullable()
      .describe('Admin-set note attached on approve/deny. Useful context for re-declaration after a denial.'),
    declaration: z.object({
      intended_use_case: z.string().optional(),
      expected_monthly_volume_usd: z.number().optional(),
      website_url: z.string().optional(),
      identity: DeclarationIdentitySchema.optional(),
    }).passthrough()
      .describe('Declaration payload as last submitted, including SSO identity auto-attached server-side.'),
    ceiling: BetaCeilingSchema,
  })
  .openapi('ProductionStatus');

const DeclareResponseSchema = z
  .object({
    status: ProductionAccessStatusEnum,
    kyaTier: z.number().int(),
    message: z.string(),
  })
  .openapi('DeclareProductionResponse');

const ErrorSchema = z
  .object({
    error: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  })
  .openapi('Error');

const notMigrated = () => ({
  error: 'Not yet migrated — use the plain-Hono tenants router',
  code: 'NOT_MIGRATED',
});

// ============================================================================
// Routes
// ============================================================================

app.openapi(
  createRoute({
    method: 'post',
    path: '/declare-production',
    tags: ['Tenants'],
    summary: 'Submit a production-access declaration',
    description:
      "Owner-JWT only. Moves the tenant from `sandbox_only` (or `production_denied`) to `declaration_pending` " +
      "for manual Sly admin review. SSO identity (verified email, name, provider, organization) is " +
      "auto-attached server-side — you don't re-enter it. See [Production access](/get-started/production-access) " +
      "for the full lifecycle.",
    'x-visibility': 'public',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { 'application/json': { schema: ProductionDeclarationSchema } },
        required: true,
      },
    },
    responses: {
      202: {
        description:
          'Declaration accepted; tenant is now `declaration_pending`. Approval emails + in-app notifications fire on the admin decision.',
        content: { 'application/json': { schema: DeclareResponseSchema } },
      },
      400: {
        description: 'Body fails schema validation (use case too short, terms not accepted, invalid URL).',
        content: { 'application/json': { schema: ErrorSchema } },
      },
      403: {
        description:
          'Caller is not an owner-JWT (e.g. API key, agent token, member/viewer role), or the tenant is in a state that does not permit a new declaration (already pending, approved, or suspended).',
        content: { 'application/json': { schema: ErrorSchema } },
      },
    },
  }),
  async (c): Promise<any> => c.json(notMigrated(), 400)
);

app.openapi(
  createRoute({
    method: 'get',
    path: '/production-status',
    tags: ['Tenants'],
    summary: 'Get the current production-access state',
    description:
      'Returns the tenant production-access status, the most recently submitted declaration, review timestamps, ' +
      'admin notes, and the effective beta-spend ceiling. Used by the dashboard Production Access page to render ' +
      'the gating banner and live-key CTA. Callable by any authenticated tenant context (owner JWT, member JWT, tenant API key).',
    'x-visibility': 'public',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Current production-access state.',
        content: { 'application/json': { schema: ProductionStatusSchema } },
      },
    },
  }),
  async (c): Promise<any> => c.json(notMigrated(), 400)
);

export default app;
