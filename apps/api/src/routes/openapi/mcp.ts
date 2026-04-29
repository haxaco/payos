/**
 * MCP HTTP transport — OpenAPIHono migration scaffold.
 *
 * Status: scaffold with 1 representative endpoint (POST /mcp).
 *
 * MIGRATION STATE
 *   ✓ POST   /mcp                — migrated here (JSON-RPC)
 *   ⬜ GET    /mcp                — TODO (SSE streaming)
 *   ⬜ DELETE /mcp/{session_id}   — TODO
 *
 * The stdio MCP server in packages/mcp-server/ is separate and doesn't need
 * OpenAPI migration (it's not an HTTP surface).
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const MCPRequestSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    method: z.enum(['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read']),
    params: z.record(z.unknown()).optional(),
    id: z.union([z.string(), z.number()]),
  })
  .openapi('MCPRequest');

const MCPResponseSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    result: z.unknown().optional(),
    error: z
      .object({
        code: z.number().int(),
        message: z.string(),
        data: z.unknown().optional(),
      })
      .optional(),
    id: z.union([z.string(), z.number()]),
  })
  .openapi('MCPResponse');

const mcpRequestRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['MCP'],
  summary: 'MCP JSON-RPC request',
  description:
    'Invoke an MCP method (tools/list, tools/call, resources/list, resources/read). Follows the Model Context Protocol JSON-RPC spec.',
  'x-visibility': 'public',
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: MCPRequestSchema } }, required: true },
  },
  responses: {
    200: {
      description: 'JSON-RPC response',
      content: { 'application/json': { schema: MCPResponseSchema } },
    },
  },
});

app.openapi(mcpRequestRoute, async (c): Promise<any> => {
  // TODO(mcp-migration): port from apps/api/src/routes/mcp.ts.
  const body = c.req.valid('json');
  const response: z.infer<typeof MCPResponseSchema> = {
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Not yet migrated — use existing /mcp route' },
    id: body.id,
  };
  return c.json(response, 200);
});

export default app;
