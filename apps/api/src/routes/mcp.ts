/**
 * Remote MCP Endpoint
 *
 * Exposes the Sly MCP server over Streamable HTTP transport,
 * enabling remote MCP clients (e.g., Intercom Fin) to connect.
 *
 * Auth: Bearer token (API key) validated per-request.
 * Transport: Stateless Streamable HTTP (JSON responses, no SSE sessions).
 */

import { Hono } from 'hono';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { Sly } from '@sly_ai/sdk';
import { createMcpServer } from '@sly_ai/mcp-server/server-factory';
import { createClient } from '../db/client.js';
import { verifyApiKey, getKeyPrefix } from '../utils/crypto.js';

const mcpRouter = new Hono();

/**
 * Validate a bearer token (any of the 3 agent-relevant flavors) and
 * resolve it to the calling tenant. Returns tenant_id on success,
 * null on failure.
 *
 * Supported prefixes:
 *   pk_*    — tenant API key (api_keys table)
 *   agent_* — long-lived agent token (agents.auth_token_hash) — Epic 65
 *   sess_*  — Ed25519 session token (agent_sessions) — Epic 72
 *
 * Earlier versions of this validator only matched pk_*, which made
 * agent-bound MCP clients hit a misleading "Invalid API key" 401 even
 * though the standard authMiddleware on /v1 happily accepts all three.
 * Bringing parity here so agent-token auth works on the remote MCP
 * endpoint too.
 */
async function validateBearerToken(token: string): Promise<string | null> {
  const supabase: any = createClient();

  if (token.startsWith('pk_')) {
    const prefix = getKeyPrefix(token);
    const { data: apiKey } = await (supabase.from('api_keys') as any)
      .select('id, tenant_id, key_hash, status')
      .eq('key_prefix', prefix)
      .single();

    if (!apiKey?.key_hash) return null;
    if (!verifyApiKey(token, apiKey.key_hash)) return null;
    if (apiKey.status && apiKey.status !== 'active' && apiKey.status !== 'grace_period') return null;

    return apiKey.tenant_id;
  }

  if (token.startsWith('agent_')) {
    const prefix = getKeyPrefix(token);
    const { data: agent } = await (supabase.from('agents') as any)
      .select('tenant_id, status, auth_token_hash')
      .eq('auth_token_prefix', prefix)
      .single();

    if (!agent?.auth_token_hash) return null;
    if (!verifyApiKey(token, agent.auth_token_hash)) return null;
    if (agent.status !== 'active') return null;

    return agent.tenant_id;
  }

  if (token.startsWith('sess_')) {
    const { validateSession } = await import('../services/agent-auth/session.js');
    const session = await validateSession(supabase, token);
    if (!session) return null;
    return session.tenantId;
  }

  return null;
}

/**
 * POST /mcp — Streamable HTTP MCP endpoint
 * GET /mcp — SSE stream (if client requests it)
 * DELETE /mcp — Session termination
 *
 * All methods require Bearer token authentication.
 */
mcpRouter.all('/', async (c) => {
  // Extract bearer token
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  const token = authHeader.slice(7);

  // Validate API key
  const tenantId = await validateBearerToken(token);
  if (!tenantId) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Determine loopback URL for SDK calls
  const port = process.env.API_PORT || process.env.PORT || '4000';
  const apiUrl = `http://localhost:${port}`;

  // Create Sly SDK instance with the validated key pointing at loopback
  const sly = new Sly({
    apiKey: token,
    environment: 'sandbox',
    apiUrl,
  });

  // Create MCP server with all tools
  const server = createMcpServer(sly as any, apiUrl, token);

  // Create stateless Streamable HTTP transport (no session management)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Connect server to transport
  await server.connect(transport);

  try {
    // Delegate to the transport — it handles POST/GET/DELETE
    return await transport.handleRequest(c.req.raw);
  } finally {
    // Clean up transport after request completes
    await transport.close();
    await server.close();
  }
});

/**
 * OPTIONS /mcp — CORS preflight
 */
mcpRouter.options('/', () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
      'Access-Control-Max-Age': '86400',
    },
  });
});

export default mcpRouter;
