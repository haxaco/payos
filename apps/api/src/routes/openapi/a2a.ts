/**
 * A2A routes — OpenAPIHono migration scaffold.
 *
 * Status: scaffold with 1 representative endpoint (GET /marketplace).
 *
 * MIGRATION STATE
 *   ✓ GET  /marketplace              — migrated here
 *   ⬜ GET  /tasks                    — TODO
 *   ⬜ POST /tasks/{id}/respond       — TODO
 *   ⬜ POST /tasks/{id}/complete      — TODO
 *   ⬜ POST /tasks/{id}/rate          — TODO
 *   ⬜ POST /tasks/{id}/dispute       — TODO
 *   ⬜ POST /agents/{id}/skills       — TODO
 *   ... 90+ more — see apps/api/src/routes/a2a.ts
 *
 * A2A is the largest protocol migration. Suggested sub-batches:
 *   1. task lifecycle (send, respond, complete, rate)
 *   2. marketplace + discovery
 *   3. skills registration + pricing
 *   4. agent cards + attestations
 *   5. moderation / dispute resolution
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const A2AAgentCardSummarySchema = z
  .object({
    agent_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    skills: z.array(z.string()),
    pricing_summary: z.object({ min: z.string(), max: z.string() }).optional(),
    reputation: z
      .object({ rating: z.number().min(0).max(5), completed_tasks: z.number().int() })
      .optional(),
    availability: z.enum(['online', 'offline']),
  })
  .openapi('A2AAgentCardSummary');

const MarketplaceSearchSchema = z.object({
  skill: z.string().optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  max_price: z.string().optional(),
  availability: z.enum(['online', 'offline', 'any']).default('any'),
  sort: z.enum(['reputation_desc', 'price_asc', 'recency_desc']).default('reputation_desc'),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const ErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
}).openapi('Error');

const marketplaceSearchRoute = createRoute({
  method: 'get',
  path: '/marketplace',
  tags: ['A2A'],
  summary: 'Search the A2A agent marketplace',
  description:
    'Find agents offering a given skill, ranked by reputation, price, or recency. Public via the non-authed /a2a/marketplace mount; this authed version carries tenant context for personalized ranking.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: { query: MarketplaceSearchSchema },
  responses: {
    200: {
      description: 'Matching agents',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(A2AAgentCardSummarySchema) }),
        },
      },
    },
  },
});

app.openapi(marketplaceSearchRoute, async (c) => {
  // TODO(a2a-migration): port from apps/api/src/routes/a2a.ts.
  const body: { data: z.infer<typeof A2AAgentCardSummarySchema>[] } = { data: [] };
  return c.json(body, 200);
});

export default app;
