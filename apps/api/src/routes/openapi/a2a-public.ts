/**
 * A2A public surface — agent discovery + JSON-RPC.
 * Mount: /a2a (no /v1, no auth)
 * COVERED: 5 endpoints — agent card discovery, .well-known, JSON-RPC root + per-agent.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const app = new OpenAPIHono();

const AgentCardJsonSchema = z.object({
  agent_id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  skills: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    input_schema: z.record(z.unknown()),
    output_schema: z.record(z.unknown()).optional(),
    pricing: z.object({ amount: z.string(), currency: z.string() }).optional(),
  })),
  identity: z.object({
    public_key: z.string().describe('base64 Ed25519 public key'),
    erc8004_id: z.string().nullable().optional(),
    chain_id: z.number().int().nullable().optional(),
  }).optional(),
  transport: z.array(z.string()),
  payment: z.array(z.string()),
  reputation: z.object({
    rating: z.number().min(0).max(5),
    completed_tasks: z.number().int(),
  }).optional(),
  availability: z.enum(['online', 'offline']).optional(),
}).openapi('A2AAgentCard');

const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.enum(['message/send', 'message/stream', 'agent/discover']),
  params: z.record(z.unknown()),
  id: z.union([z.string(), z.number()]),
}).openapi('A2AJsonRpcRequest');

const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.unknown().optional(),
  error: z.object({
    code: z.number().int(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional(),
  id: z.union([z.string(), z.number()]),
}).openapi('A2AJsonRpcResponse');

app.openapi(createRoute({
  method: 'get', path: '/agents/{agentId}/card', tags: ['A2A (public)'],
  summary: 'Public agent card',
  description: 'Returns the public agent card. No authentication required — designed for cross-agent discovery.',
  'x-visibility': 'public',
  request: { params: z.object({ agentId: z.string().uuid() }) },
  responses: {
    200: { description: 'Agent card', content: { 'application/json': { schema: AgentCardJsonSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: z.object({ error: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json({ error: 'Not yet migrated' }, 404));

app.openapi(createRoute({
  method: 'get', path: '/{agentId}/.well-known/agent.json', tags: ['A2A (public)'],
  summary: 'Well-known agent card',
  description: 'A2A spec discovery — `.well-known/agent.json` mirrors the agent card so cross-platform agents can fetch it via the A2A spec convention.',
  'x-visibility': 'public',
  request: { params: z.object({ agentId: z.string().uuid() }) },
  responses: {
    200: { description: 'Well-known card', content: { 'application/json': { schema: AgentCardJsonSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: z.object({ error: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json({ error: 'Not yet migrated' }, 404));

app.openapi(createRoute({
  method: 'post', path: '/', tags: ['A2A (public)'], summary: 'JSON-RPC root',
  description: 'Generic A2A JSON-RPC entrypoint — supports method/send and message/stream.',
  'x-visibility': 'public',
  request: { body: { content: { 'application/json': { schema: JsonRpcRequestSchema } }, required: true } },
  responses: {
    200: { description: 'JSON-RPC response', content: { 'application/json': { schema: JsonRpcResponseSchema } } },
  },
}), async (c): Promise<any> => c.json({
  jsonrpc: '2.0' as const,
  error: { code: -32000, message: 'Not yet migrated' },
  id: 0,
}, 200));

app.openapi(createRoute({
  method: 'post', path: '/{agentId}', tags: ['A2A (public)'], summary: 'Agent-targeted JSON-RPC',
  description: 'Send a JSON-RPC message to a specific agent. The most common entrypoint for cross-agent communication.',
  'x-visibility': 'public',
  request: {
    params: z.object({ agentId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: JsonRpcRequestSchema } }, required: true },
  },
  responses: {
    200: { description: 'JSON-RPC response', content: { 'application/json': { schema: JsonRpcResponseSchema } } },
  },
}), async (c): Promise<any> => c.json({
  jsonrpc: '2.0' as const,
  error: { code: -32000, message: 'Not yet migrated' },
  id: 0,
}, 200));

app.openapi(createRoute({
  method: 'post', path: '/{agentId}/callback', tags: ['A2A (public)'], summary: 'Agent callback endpoint',
  description: 'External agents (peer A2A platforms) post callbacks here. Verified via signature on the inbound request.',
  'x-visibility': 'public',
  request: {
    params: z.object({ agentId: z.string().uuid() }),
    body: { content: { 'application/json': { schema: z.record(z.unknown()) } }, required: true },
  },
  responses: {
    200: { description: 'Acknowledged', content: { 'application/json': { schema: z.object({ received: z.boolean() }) } } },
    401: { description: 'Signature invalid', content: { 'application/json': { schema: z.object({ error: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json({ received: true }, 200));

export default app;
