/**
 * Agent Webhook Backend
 *
 * Receives task webhooks from the A2A worker and transitions them to working.
 * Real work is done by external Claude Code subagents that read source code
 * and complete tasks via the API.
 */

import { Hono } from 'hono';
import crypto from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function freshClient() {
  return createSupabaseClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const backendRouter = new Hono();

// Secret from environment — never hardcode
const WEBHOOK_SECRET = process.env.AGENT_BACKEND_WEBHOOK_SECRET || '';

/**
 * POST /agent-backend/process
 * Receives webhook from A2A worker. Accepts the task into working state.
 */
backendRouter.post('/process', async (c) => {
  const bodyText = await c.req.text();

  // Mandatory HMAC signature verification
  const signature = c.req.header('X-Sly-Signature');
  if (!signature || !WEBHOOK_SECRET) {
    return c.json({ error: 'Missing signature or webhook secret not configured' }, 403);
  }

  const parts = signature.split(',');
  const tPart = parts.find(p => p.startsWith('t='));
  const vPart = parts.find(p => p.startsWith('v1='));
  if (!tPart || !vPart) {
    return c.json({ error: 'Malformed signature' }, 403);
  }

  const timestamp = tPart.slice(2);

  // Replay protection — reject signatures older than 5 minutes
  const signatureAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (isNaN(signatureAge) || signatureAge > 300 || signatureAge < -60) {
    return c.json({ error: 'Signature expired or clock skew too large' }, 403);
  }

  // Constant-time HMAC comparison
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp}.${bodyText}`).digest('hex');
  const provided = vPart.slice(3);
  if (expected.length !== provided.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    return c.json({ error: 'Invalid signature' }, 403);
  }

  const body = JSON.parse(bodyText);
  const taskId = body?.task?.id;
  const agentId = body?.task?.agentId;

  if (!taskId || !agentId) {
    return c.json({ error: 'Missing task.id or task.agentId' }, 400);
  }

  // Accept task async — transition to working
  processTaskAsync(taskId, agentId).catch((err) => {
    console.error(`[AgentBackend] Error processing task ${taskId.slice(0, 8)}:`, err.message);
  });

  return c.json({ received: true, taskId });
});

async function processTaskAsync(taskId: string, agentId: string): Promise<void> {
  const supabase = freshClient();

  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('name, tenant_id')
    .eq('id', agentId)
    .single();

  if (!agent) {
    console.error(`[AgentBackend] Agent ${agentId} not found. Error: ${agentErr?.message || 'null result'}`);
    return;
  }

  const { A2ATaskService } = await import('../services/a2a/task-service.js');
  const taskService = new A2ATaskService(supabase, agent.tenant_id);

  await taskService.updateTaskState(taskId, 'working', `${agent.name} accepted — processing`);
  console.log(`[AgentBackend] ${agent.name} accepted task ${taskId.slice(0, 8)} → working`);
}

export { backendRouter };
