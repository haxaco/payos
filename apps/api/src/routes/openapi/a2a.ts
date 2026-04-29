/**
 * A2A (Agent-to-Agent) — task delegation, marketplace, skills, sessions.
 * Mount: /v1/a2a
 * COVERED: 25 authed endpoints — full surface.
 *
 * Public endpoints (agent cards, JSON-RPC) live in openapi/a2a-public.ts
 * mounted at /a2a.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const TaskStatusEnum = z.enum(['pending', 'accepted', 'declined', 'in_progress', 'completed', 'failed', 'disputed', 'cancelled']);

const AgentCardSummary = z.object({
  agent_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  skills: z.array(z.string()),
  pricing_summary: z.object({ min: z.string(), max: z.string() }).nullable().optional(),
  reputation: z.object({ rating: z.number().min(0).max(5), completed_tasks: z.number().int() }).nullable().optional(),
  availability: z.enum(['online', 'offline']),
}).openapi('A2AAgentCardSummary');

const TaskSchema = z.object({
  id: z.string().uuid(),
  from_agent_id: z.string().uuid(),
  to_agent_id: z.string().uuid(),
  skill_id: z.string(),
  payload: z.record(z.unknown()),
  status: TaskStatusEnum,
  deliverable: z.record(z.unknown()).nullable().optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
  payment: z.object({ amount: z.string(), currency: z.string(), method: z.string() }).nullable().optional(),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable().optional(),
}).openapi('A2ATask');

const AgentConfigSchema = z.object({
  agent_id: z.string().uuid(),
  accepts_tasks: z.boolean(),
  skills: z.array(z.string()),
  default_response_window_minutes: z.number().int(),
  webhook_url: z.string().url().nullable().optional(),
}).openapi('A2AAgentConfig');

const SessionSchema = z.object({
  context_id: z.string(),
  agent_id: z.string().uuid(),
  status: z.enum(['open', 'closed', 'expired']),
  task_count: z.number().int(),
  total_value: z.string(),
  currency: z.string(),
  opened_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable().optional(),
}).openapi('A2ASession');

const ToolSchema = z.object({
  id: z.string(),
  agent_id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  input_schema: z.record(z.unknown()),
  output_schema: z.record(z.unknown()).optional(),
  pricing: z.object({ amount: z.string(), currency: z.string() }).optional(),
  created_at: z.string().datetime(),
}).openapi('A2ATool');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const Pagination = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() });
const notMigrated = () => ({ error: 'Not yet migrated — use plain-Hono A2A router', code: 'NOT_MIGRATED' });

// ============================================================================
// Marketplace + discovery
// ============================================================================

app.openapi(createRoute({
  method: 'get', path: '/marketplace', tags: ['A2A'], summary: 'Search the agent marketplace',
  description: 'Find agents offering a skill, ranked by reputation/price/availability.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    skill: z.string().optional(),
    min_rating: z.coerce.number().min(0).max(5).optional(),
    max_price: z.string().optional(),
    availability: z.enum(['online', 'offline', 'any']).default('any'),
    sort: z.enum(['reputation_desc', 'price_asc', 'recency_desc']).default('reputation_desc'),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Matching agents', content: { 'application/json': { schema: z.object({ data: z.array(AgentCardSummary) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/discover', tags: ['A2A'], summary: 'Discovery query',
  description: 'Rich discovery with filters beyond marketplace — required + optional skills, budget, region. Useful for programmatic matching.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    required_skills: z.array(z.string()),
    optional_skills: z.array(z.string()).optional(),
    budget: z.object({ max: z.string(), currency: z.string() }).optional(),
    min_rating: z.number().optional(),
    region: z.string().optional(),
  }) } }, required: true } },
  responses: {
    200: { description: 'Matches', content: { 'application/json': { schema: z.object({ data: z.array(AgentCardSummary), match_score: z.array(z.number()) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], match_score: [] }, 200));

// ============================================================================
// Agent cards + config
// ============================================================================

app.openapi(createRoute({
  method: 'get', path: '/agents/{agentId}/card', tags: ['A2A'], summary: 'Get an agent card',
  description: 'Public card containing identity, skills, pricing, reputation — same shape as `/.well-known/agent.json`.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ agentId: z.string().uuid() }) },
  responses: {
    200: { description: 'Agent card', content: { 'application/json': { schema: AgentCardSummary } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'get', path: '/agents/{agentId}/config', tags: ['A2A'], summary: 'Get agent A2A config',
  description: 'Agent-owner view of A2A settings (accept_tasks toggle, skills, webhook URL, response window).',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ agentId: z.string().uuid() }) },
  responses: {
    200: { description: 'Config', content: { 'application/json': { schema: z.object({ data: AgentConfigSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'put', path: '/agents/{agentId}/config', tags: ['A2A'], summary: 'Update agent A2A config',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ agentId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: AgentConfigSchema.omit({ agent_id: true }).partial() } }, required: true },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: AgentConfigSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

// ============================================================================
// Tasks
// ============================================================================

app.openapi(createRoute({
  method: 'post', path: '/tasks', tags: ['A2A'], summary: 'Send a task',
  description: 'Delegate work to another agent. Payment terms attached. Deliverable returned on completion.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    to_agent_id: z.string().uuid(),
    skill_id: z.string(),
    payload: z.record(z.unknown()),
    payment: z.object({ amount: z.number().positive(), currency: z.string(), method: z.enum(['ucp', 'x402', 'ap2']) }),
    deadline: z.string().datetime().optional(),
  }) } }, required: true } },
  responses: {
    201: { description: 'Task created', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/tasks', tags: ['A2A'], summary: 'List tasks',
  description: 'List tasks visible to the caller — either as sender or target.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    role: z.enum(['sender', 'target']).optional(),
    status: TaskStatusEnum.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Paginated tasks', content: { 'application/json': { schema: z.object({ data: z.array(TaskSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/tasks/dlq', tags: ['A2A'], summary: 'List DLQ tasks',
  description: 'Tasks that were never accepted or failed permanently.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'DLQ entries', content: { 'application/json': { schema: z.object({ data: z.array(TaskSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'get', path: '/tasks/{taskId}', tags: ['A2A'], summary: 'Get a task',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ taskId: z.string().uuid() }) },
  responses: {
    200: { description: 'Task', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'patch', path: '/tasks/{taskId}', tags: ['A2A'], summary: 'Update task',
  description: 'Ad-hoc updates to payload or deadline (sender-only, before acceptance).',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ taskId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({
      payload: z.record(z.unknown()).optional(),
      deadline: z.string().datetime().optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/tasks/{taskId}/respond', tags: ['A2A'], summary: 'Accept or decline task',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ taskId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({
      action: z.enum(['accept', 'decline']),
      reason: z.string().optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Response recorded', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/tasks/{taskId}/claim', tags: ['A2A'], summary: 'Claim a task',
  description: 'Claim an open (multi-recipient) task as this agent. First-come-first-served.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ taskId: z.string().uuid() }) },
  responses: {
    200: { description: 'Claimed', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
    409: { description: 'Already claimed', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/tasks/{taskId}/process', tags: ['A2A'], summary: 'Start processing',
  description: 'Executor marks a claimed task as `in_progress` when work begins.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ taskId: z.string().uuid() }) },
  responses: {
    200: { description: 'Processing', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/tasks/{taskId}/complete', tags: ['A2A'], summary: 'Complete task',
  description: 'Submit the deliverable. Triggers payment settlement and opens rating window.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ taskId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({
      deliverable: z.record(z.unknown()),
      metadata: z.record(z.unknown()).optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Completed', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/tasks/{taskId}/cancel', tags: ['A2A'], summary: 'Cancel task',
  description: 'Sender cancels (before or during work) — may trigger refund depending on contract terms.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ taskId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({ reason: z.string().optional() }) } } },
  },
  responses: {
    200: { description: 'Cancelled', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/tasks/{taskId}/retry', tags: ['A2A'], summary: 'Retry a failed task',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ taskId: z.string().uuid() }) },
  responses: {
    200: { description: 'Requeued', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'post', path: '/tasks/{taskId}/rate', tags: ['A2A'], summary: 'Rate a completed task',
  description: 'Rate the counterparty 1–5. Feeds into reputation + marketplace ranking.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ taskId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional(),
    }) } }, required: true },
  },
  responses: {
    200: { description: 'Rated', content: { 'application/json': { schema: z.object({ data: TaskSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

// ============================================================================
// Streaming + system
// ============================================================================

app.openapi(createRoute({
  method: 'get', path: '/agents/{agentId}/tasks/stream', tags: ['A2A'], summary: 'Stream tasks to an agent',
  description: 'SSE channel — push new tasks to the executing agent in real time. Agent stays connected; Sly pushes task_assigned events.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ agentId: z.string().uuid() }) },
  responses: {
    200: { description: 'SSE stream', content: { 'text/event-stream': { schema: z.string() } } },
  },
}), async (c): Promise<any> => c.text('', 200));

app.openapi(createRoute({
  method: 'post', path: '/process', tags: ['A2A'], summary: 'Batch-process pending tasks',
  description: 'Internal-facing: trigger processing for all pending tasks to an agent. Used by worker loops.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Processed', content: { 'application/json': { schema: z.object({ processed: z.number() }) } } },
  },
}), async (c): Promise<any> => c.json({ processed: 0 }, 200));

app.openapi(createRoute({
  method: 'get', path: '/stats', tags: ['A2A'], summary: 'A2A stats',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Stats', content: { 'application/json': { schema: z.object({
      total_tasks: z.number(), completed: z.number(), disputed: z.number(),
      avg_completion_minutes: z.number(),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ total_tasks: 0, completed: 0, disputed: 0, avg_completion_minutes: 0 }, 200));

// ============================================================================
// Sessions (multi-task contexts)
// ============================================================================

app.openapi(createRoute({
  method: 'get', path: '/sessions', tags: ['A2A'], summary: 'List A2A sessions',
  description: 'A session groups related tasks under a context_id — useful for multi-step delegations or ongoing collaborations between two agents.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    agent_id: z.string().uuid().optional(),
    status: z.enum(['open', 'closed', 'expired']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }) },
  responses: {
    200: { description: 'Paginated sessions', content: { 'application/json': { schema: z.object({ data: z.array(SessionSchema), pagination: Pagination }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }, 200));

app.openapi(createRoute({
  method: 'get', path: '/sessions/{contextId}', tags: ['A2A'], summary: 'Get an A2A session',
  description: 'Includes the full task list within the context.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ contextId: z.string() }) },
  responses: {
    200: { description: 'Session detail', content: { 'application/json': { schema: z.object({
      data: SessionSchema, tasks: z.array(TaskSchema),
    }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

// ============================================================================
// Agent tools (per-agent registered capabilities)
// ============================================================================

app.openapi(createRoute({
  method: 'post', path: '/agents/{agentId}/tools', tags: ['A2A'], summary: 'Register a tool for an agent',
  description:
    'Register a callable tool / skill on the agent. Counterparties discovering this agent can invoke the tool through the A2A task flow.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ agentId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: ToolSchema.omit({ id: true, agent_id: true, created_at: true }) } }, required: true },
  },
  responses: {
    201: { description: 'Tool registered', content: { 'application/json': { schema: z.object({ data: ToolSchema }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/agents/{agentId}/tools', tags: ['A2A'], summary: 'List agent tools',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ agentId: z.string().uuid() }) },
  responses: {
    200: { description: 'Tools', content: { 'application/json': { schema: z.object({ data: z.array(ToolSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'delete', path: '/agents/{agentId}/tools/{toolId}', tags: ['A2A'], summary: 'Unregister a tool',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ agentId: z.string().uuid(), toolId: z.string() }) },
  responses: {
    200: { description: 'Removed', content: { 'application/json': { schema: z.object({ message: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

export default app;
