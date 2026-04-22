/**
 * AP2 routes — OpenAPIHono migration scaffold.
 *
 * Status: scaffold with 1 representative endpoint (POST /mandates).
 *
 * MIGRATION STATE
 *   ✓ POST /mandates                 — migrated here
 *   ⬜ GET  /mandates                 — TODO
 *   ⬜ GET  /mandates/{id}            — TODO
 *   ⬜ PATCH /mandates/{id}           — TODO
 *   ⬜ DELETE /mandates/{id}          — TODO (revoke)
 *   ⬜ POST /mandates/{id}/execute    — TODO
 *   ⬜ POST /mandates/{id}/cancel     — TODO
 *   ⬜ GET  /mandates/{id}/executions — TODO
 *   ... 30+ more — see apps/api/src/routes/ap2.ts
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const MandateScopeSchema = z
  .object({
    max_per_tx: z.string(),
    max_per_day: z.string(),
    max_per_month: z.string(),
    currency: z.string(),
    allowed_merchant_categories: z.array(z.string()).optional(),
    allowed_merchants: z.array(z.string()).optional(),
    blocked_merchants: z.array(z.string()).optional(),
  })
  .openapi('AP2MandateScope');

const CreateMandateSchema = z
  .object({
    account_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    scope: MandateScopeSchema,
    expires_at: z.string().datetime(),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi('CreateAP2MandateInput');

const MandateSchema = z
  .object({
    id: z.string(),
    status: z.enum(['active', 'cancelled', 'revoked', 'expired']),
    mandate_jwt: z.string().describe('Ed25519-signed JWT; verifiable offline'),
    scope: MandateScopeSchema,
    expires_at: z.string().datetime(),
    created_at: z.string().datetime(),
  })
  .openapi('AP2Mandate');

const ErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
}).openapi('Error');

const createMandateRoute = createRoute({
  method: 'post',
  path: '/mandates',
  tags: ['AP2'],
  summary: 'Create an AP2 mandate',
  description:
    'A mandate is a signed authorization that lets an agent spend on behalf of an account within defined scope. The returned mandate_jwt can be presented at any AP2-compliant merchant.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateMandateSchema } }, required: true },
  },
  responses: {
    201: {
      description: 'Mandate created',
      content: { 'application/json': { schema: z.object({ data: MandateSchema }) } },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Account or agent not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

app.openapi(createMandateRoute, async (c): Promise<any> => {
  // TODO(ap2-migration): port from apps/api/src/routes/ap2.ts.
  const errorBody: z.infer<typeof ErrorSchema> = {
    error: 'Not yet migrated — use the plain-Hono AP2 router',
    code: 'NOT_MIGRATED',
  };
  return c.json(errorBody, 400);
});

export default app;
