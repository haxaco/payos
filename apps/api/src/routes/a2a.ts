/**
 * A2A (Agent-to-Agent) Protocol Routes
 *
 * Google A2A protocol implementation for Sly agents.
 * Provides agent card discovery, JSON-RPC task handling,
 * and management endpoints.
 *
 * @see Epic 57: Google A2A Protocol Integration
 * @see https://google.github.io/A2A/
 */

import { Hono } from 'hono';
import { createClient } from '../db/client.js';
import { generateAgentCard } from '../services/a2a/agent-card.js';
import { A2ATaskService } from '../services/a2a/task-service.js';
import { handleJsonRpc } from '../services/a2a/jsonrpc-handler.js';
import { handleGatewayJsonRpc } from '../services/a2a/gateway-handler.js';
import type { A2AJsonRpcRequest, A2APart } from '../services/a2a/types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Shared Helpers
// =============================================================================

/** Fetch agent + account + wallet and generate an A2A Agent Card. */
async function fetchAgentCard(agentId: string, tenantId?: string) {
  const supabase = createClient();

  let query = supabase
    .from('agents')
    .select('id, name, description, status, kya_tier, permissions, parent_account_id')
    .eq('id', agentId);
  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data: agent, error: agentError } = await query.single();
  if (agentError || !agent) return { error: 'Agent not found' as const, status: 404 as const };
  if (agent.status !== 'active') return { error: 'Agent is not active' as const, status: 404 as const };

  let accountQuery = supabase
    .from('accounts')
    .select('id, name')
    .eq('id', agent.parent_account_id);
  if (tenantId) accountQuery = accountQuery.eq('tenant_id', tenantId);
  const { data: account } = await accountQuery.single();

  let walletQuery = supabase
    .from('wallets')
    .select('id, currency')
    .eq('managed_by_agent_id', agentId)
    .limit(1);
  if (tenantId) walletQuery = walletQuery.eq('tenant_id', tenantId);
  const { data: wallet } = await walletQuery.maybeSingle();

  const card = generateAgentCard(
    agent as any,
    account || { id: agent.parent_account_id, name: 'Unknown' },
    wallet,
  );

  return { card };
}

/** Return a raw A2A Agent Card response with proper headers. */
function agentCardResponse(card: object) {
  return new Response(JSON.stringify(card), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'A2A-Version': '1.0',
    },
  });
}

/** CORS preflight response for GET endpoints. */
function corsPreflightGet() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// =============================================================================
// Public Routes (no auth — discovery must be frictionless)
// =============================================================================

export const a2aPublicRouter = new Hono();

/**
 * GET /a2a/agents/:agentId/card
 * Public per-agent Agent Card (no auth required).
 */
a2aPublicRouter.get('/agents/:agentId/card', async (c) => {
  const agentId = c.req.param('agentId');
  if (!UUID_RE.test(agentId)) return c.json({ error: 'Invalid agent ID format' }, 400);

  const result = await fetchAgentCard(agentId);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return agentCardResponse(result.card);
});

/**
 * OPTIONS /a2a/agents/:agentId/card
 * CORS preflight for agent card discovery.
 */
a2aPublicRouter.options('/agents/:agentId/card', () => corsPreflightGet());

/**
 * GET /a2a/:agentId/.well-known/agent.json
 * Spec-compliant per-agent discovery (Layer 2).
 */
a2aPublicRouter.get('/:agentId/.well-known/agent.json', async (c) => {
  const agentId = c.req.param('agentId');
  if (!UUID_RE.test(agentId)) return c.json({ error: 'Invalid agent ID format' }, 400);

  const result = await fetchAgentCard(agentId);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return agentCardResponse(result.card);
});

/**
 * OPTIONS /a2a/:agentId/.well-known/agent.json
 * CORS preflight for spec-compliant discovery.
 */
a2aPublicRouter.options('/:agentId/.well-known/agent.json', () => corsPreflightGet());

/**
 * POST /a2a
 * Platform gateway JSON-RPC endpoint (Layer 1).
 * Handles agent discovery via find_agent / list_agents skills.
 * No auth required — public front door for the directory.
 */
a2aPublicRouter.post('/', async (c) => {
  const jsonRpc = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'A2A-Version': '1.0',
        'Access-Control-Allow-Origin': '*',
      },
    });

  let rpcRequest: A2AJsonRpcRequest;
  try {
    rpcRequest = await c.req.json();
  } catch {
    return jsonRpc({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
      id: null,
    }, 400);
  }

  if (rpcRequest.jsonrpc !== '2.0' || !rpcRequest.method || !rpcRequest.id) {
    return jsonRpc({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid JSON-RPC request' },
      id: rpcRequest?.id ?? null,
    }, 400);
  }

  const supabase = createClient();
  const rpcResponse = await handleGatewayJsonRpc(rpcRequest, supabase);
  return jsonRpc(rpcResponse as Record<string, unknown>);
});

/**
 * OPTIONS /a2a
 * CORS preflight for platform gateway.
 */
a2aPublicRouter.options('/', () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
});

/**
 * POST /a2a/:agentId
 * JSON-RPC 2.0 endpoint for A2A tasks (inbound).
 *
 * Auth: Sly API key or agent token via Authorization header.
 * External bearer token support planned for federation.
 */
a2aPublicRouter.post('/:agentId', async (c) => {
  const agentId = c.req.param('agentId');

  // Helper: return raw JSON-RPC (bypasses response wrapper for A2A interop)
  const jsonRpc = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'A2A-Version': '1.0',
        'Access-Control-Allow-Origin': '*',
      },
    });

  if (!UUID_RE.test(agentId)) {
    return jsonRpc({
      jsonrpc: '2.0',
      error: { code: -32602, message: 'Invalid agent ID format' },
      id: null,
    }, 400);
  }

  // ---- Auth: try Sly API key / agent token ----
  const authHeader = c.req.header('Authorization');
  let tenantId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const supabase = createClient();

    if (token.startsWith('pk_')) {
      // API key auth — look up tenant
      const prefix = token.slice(0, 12);
      const { data: apiKey } = await (supabase.from('api_keys') as any)
        .select('tenant_id')
        .eq('key_prefix', prefix)
        .single();
      if (apiKey) tenantId = apiKey.tenant_id;
    } else if (token.startsWith('agent_')) {
      // Agent token auth
      const prefix = token.slice(0, 12);
      const { data: agentRow } = await (supabase.from('agents') as any)
        .select('tenant_id')
        .eq('auth_token_prefix', prefix)
        .single();
      if (agentRow) tenantId = agentRow.tenant_id;
    }
  }

  // If no Sly auth, check the target agent exists and use its tenant
  if (!tenantId) {
    const supabase = createClient();
    const { data: targetAgent } = await supabase
      .from('agents')
      .select('tenant_id, status')
      .eq('id', agentId)
      .single();

    if (!targetAgent || targetAgent.status !== 'active') {
      return jsonRpc({
        jsonrpc: '2.0',
        error: { code: -32002, message: 'Agent not found or inactive' },
        id: null,
      }, 404);
    }

    tenantId = targetAgent.tenant_id;
  }

  // Parse JSON-RPC request
  let rpcRequest: A2AJsonRpcRequest;
  try {
    rpcRequest = await c.req.json();
  } catch {
    return jsonRpc({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
      id: null,
    }, 400);
  }

  // Validate JSON-RPC envelope
  if (rpcRequest.jsonrpc !== '2.0' || !rpcRequest.method || !rpcRequest.id) {
    return jsonRpc({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid JSON-RPC request' },
      id: rpcRequest?.id ?? null,
    }, 400);
  }

  // Dispatch to JSON-RPC handler
  const taskService = new A2ATaskService(createClient(), tenantId);
  const rpcResponse = await handleJsonRpc(rpcRequest, agentId, taskService);

  return jsonRpc(rpcResponse as Record<string, unknown>);
});

/**
 * OPTIONS /a2a/:agentId
 * CORS preflight for JSON-RPC endpoint.
 */
a2aPublicRouter.options('/:agentId', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
});

// =============================================================================
// Authenticated Management Routes (mounted under /v1/a2a)
// =============================================================================

export const a2aRouter = new Hono();

/**
 * GET /v1/a2a/agents/:agentId/card
 * Per-agent card (authenticated, for dashboard use).
 */
a2aRouter.get('/agents/:agentId/card', async (c) => {
  const ctx = c.get('ctx');
  const agentId = c.req.param('agentId');
  if (!UUID_RE.test(agentId)) return c.json({ error: 'Invalid agent ID format' }, 400);

  const result = await fetchAgentCard(agentId, ctx.tenantId);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json({ data: result.card });
});

/**
 * POST /v1/a2a/discover
 * Discover a remote A2A agent by URL.
 */
a2aRouter.post('/discover', async (c) => {
  let body: { url: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (!body.url) {
    return c.json({ error: 'url is required' }, 400);
  }

  try {
    const { A2AClient } = await import('../services/a2a/client.js');
    const client = new A2AClient();
    const card = await client.discover(body.url);
    return c.json({ data: card });
  } catch (error: any) {
    return c.json({ error: `Discovery failed: ${error.message}` }, 502);
  }
});

/**
 * POST /v1/a2a/tasks
 * Send task to a remote or local A2A agent (outbound).
 */
a2aRouter.post('/tasks', async (c) => {
  const ctx = c.get('ctx');
  let raw: Record<string, any>;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Normalize snake_case → camelCase (MCP server sends snake_case)
  const body = {
    agentId: raw.agentId || raw.agent_id,
    remoteUrl: raw.remoteUrl || raw.remote_url,
    message: raw.message as { parts: A2APart[] },
    contextId: raw.contextId || raw.context_id,
    metadata: raw.metadata as Record<string, unknown> | undefined,
  };

  if (!body.message?.parts?.length) {
    return c.json({ error: 'message.parts is required' }, 400);
  }

  const supabase = createClient();
  const taskService = new A2ATaskService(supabase, ctx.tenantId);

  if (body.remoteUrl) {
    // Outbound: send to remote agent
    const { A2AClient } = await import('../services/a2a/client.js');
    const client = new A2AClient();
    try {
      const result = await client.sendMessage(body.remoteUrl, body.message, body.contextId);

      // Store outbound task locally for tracking
      const task = await taskService.createTask(
        body.agentId || ctx.actorId || 'unknown',
        body.message,
        body.contextId,
        'outbound',
        body.remoteUrl,
        result?.result?.id,
      );

      return c.json({ data: task });
    } catch (error: any) {
      return c.json({ error: `Failed to send task: ${error.message}` }, 502);
    }
  }

  // Local: create inbound task
  if (!body.agentId) {
    return c.json({ error: 'agentId is required for local tasks' }, 400);
  }

  const task = await taskService.createTask(
    body.agentId,
    body.message,
    body.contextId,
  );

  return c.json({ data: task });
});

/**
 * GET /v1/a2a/tasks
 * List A2A tasks (inbound + outbound) for the tenant.
 */
a2aRouter.get('/tasks', async (c) => {
  const ctx = c.get('ctx');
  const agentId = c.req.query('agent_id');
  const state = c.req.query('state');
  const direction = c.req.query('direction') as 'inbound' | 'outbound' | undefined;
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  const supabase = createClient();
  const taskService = new A2ATaskService(supabase, ctx.tenantId);

  const result = await taskService.listTasks({
    agentId,
    state: state as any,
    direction,
    page,
    limit,
  });

  return c.json(result);
});

/**
 * GET /v1/a2a/tasks/:taskId
 * Get a specific A2A task with messages and artifacts.
 */
a2aRouter.get('/tasks/:taskId', async (c) => {
  const ctx = c.get('ctx');
  const taskId = c.req.param('taskId');

  if (!UUID_RE.test(taskId)) {
    return c.json({ error: 'Invalid task ID format' }, 400);
  }

  const supabase = createClient();
  const taskService = new A2ATaskService(supabase, ctx.tenantId);

  const task = await taskService.getTask(taskId);

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({ data: task });
});

/**
 * POST /v1/a2a/tasks/:taskId/cancel
 * Cancel an A2A task.
 */
a2aRouter.post('/tasks/:taskId/cancel', async (c) => {
  const ctx = c.get('ctx');
  const taskId = c.req.param('taskId');

  if (!UUID_RE.test(taskId)) {
    return c.json({ error: 'Invalid task ID format' }, 400);
  }

  const supabase = createClient();
  const taskService = new A2ATaskService(supabase, ctx.tenantId);

  const task = await taskService.cancelTask(taskId);

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({ data: task });
});

/**
 * POST /v1/a2a/tasks/:taskId/process
 * Manually trigger processing of a submitted task.
 * Demonstrates the full lifecycle: submitted → working → completed.
 */
a2aRouter.post('/tasks/:taskId/process', async (c) => {
  const ctx = c.get('ctx');
  const taskId = c.req.param('taskId');

  if (!UUID_RE.test(taskId)) {
    return c.json({ error: 'Invalid task ID format' }, 400);
  }

  const supabase = createClient();
  const { A2ATaskProcessor } = await import('../services/a2a/task-processor.js');
  const processor = new A2ATaskProcessor(supabase, ctx.tenantId);

  const result = await processor.processTask(taskId);

  if (!result) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({ data: result });
});

/**
 * POST /v1/a2a/process
 * Process all submitted tasks (batch). Optionally filter by agentId.
 */
a2aRouter.post('/process', async (c) => {
  const ctx = c.get('ctx');
  let body: Record<string, any> = {};
  try { body = await c.req.json(); } catch { /* empty body ok */ }

  const agentId = body.agentId || body.agent_id;
  const paymentThreshold = body.paymentThreshold || body.payment_threshold || 500;

  const supabase = createClient();
  const { A2ATaskProcessor } = await import('../services/a2a/task-processor.js');
  const processor = new A2ATaskProcessor(supabase, ctx.tenantId, {
    agentId,
    paymentThreshold,
  });

  // Find and process all submitted tasks
  const { data: tasks } = await supabase
    .from('a2a_tasks')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('state', 'submitted')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: true })
    .limit(20);

  if (!tasks?.length) {
    return c.json({ data: { processed: 0, message: 'No submitted tasks found' } });
  }

  const results = [];
  for (const row of tasks) {
    if (agentId) {
      const { data: task } = await supabase
        .from('a2a_tasks')
        .select('agent_id')
        .eq('id', row.id)
        .single();
      if (task?.agent_id !== agentId) continue;
    }
    const result = await processor.processTask(row.id);
    if (result) results.push({ id: result.id, state: result.status.state });
  }

  return c.json({ data: { processed: results.length, tasks: results } });
});

export default a2aRouter;
