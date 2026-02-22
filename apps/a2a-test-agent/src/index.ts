/**
 * External A2A Test Agent — "Invoice Bot"
 *
 * A standalone A2A v1.0-compatible agent that lives OUTSIDE Sly.
 * Demonstrates true inter-platform agent-to-agent communication:
 *
 *  1. Serves its own Agent Card at /.well-known/agent.json
 *  2. Accepts JSON-RPC tasks at POST /a2a
 *  3. Discovers Sly agents via their A2A cards
 *  4. Sends tasks to Sly agents
 *  5. Auto-responds to incoming tasks with invoice data
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';

const app = new Hono();
const PORT = 4200;
const SLY_BASE = process.env.SLY_URL || 'http://localhost:4000';
const SLY_API_KEY = process.env.SLY_API_KEY || 'pk_test_demo_fintech_key_12345';

// In-memory task store
interface Task {
  id: string;
  contextId?: string;
  status: { state: string; message?: string; timestamp: string };
  history: Array<{
    messageId: string;
    role: 'user' | 'agent';
    parts: Array<{ text?: string; data?: Record<string, unknown>; metadata?: { mimeType?: string } }>;
  }>;
  artifacts: Array<Record<string, unknown>>;
}

const tasks = new Map<string, Task>();
let taskCounter = 0;

// --- Agent Card (v1.0) ---
const endpointUrl = `http://localhost:${PORT}/a2a`;
const agentCard = {
  id: 'invoice-bot-external',
  name: 'Invoice Bot',
  description: 'External A2A agent that generates and tracks invoices. Not hosted on Sly.',
  url: endpointUrl,
  version: '1.0.0',
  provider: {
    organization: 'ACME Corp',
    url: 'https://acme.example.com',
    contactEmail: 'invoices@acme.example.com',
  },
  capabilities: {
    streaming: false,
    multiTurn: true,
    stateTransition: true,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text', 'data'],
  skills: [
    {
      id: 'create_invoice',
      name: 'Create Invoice',
      description: 'Generate an invoice for goods or services',
      inputModes: ['text', 'data'],
      outputModes: ['text', 'data'],
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Invoice amount' },
          currency: { type: 'string', description: 'Currency (USD, BRL, USDC)' },
          description: { type: 'string', description: 'Line item description' },
          dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
        },
        required: ['amount', 'currency', 'description'],
      },
      tags: ['invoicing', 'billing'],
    },
    {
      id: 'check_invoice_status',
      name: 'Check Invoice Status',
      description: 'Look up the payment status of an invoice',
      inputModes: ['text'],
      outputModes: ['text', 'data'],
      tags: ['invoicing', 'status'],
    },
    {
      id: 'list_invoices',
      name: 'List Invoices',
      description: 'List all invoices for a given client',
      inputModes: ['text'],
      outputModes: ['text', 'data'],
      tags: ['invoicing', 'listing'],
    },
  ],
  supportedInterfaces: [
    {
      protocolBinding: 'jsonrpc/http',
      protocolVersion: '1.0',
      url: endpointUrl,
      contentTypes: ['application/json', 'application/a2a+json'],
    },
  ],
  securitySchemes: {
    bearer: { type: 'http', scheme: 'bearer' },
  },
  security: [{ bearer: [] }],
};

// --- Middleware ---
app.use('*', cors());

// --- Discovery: Agent Card ---
app.get('/.well-known/agent.json', (c) => {
  return c.json(agentCard, 200, {
    'Cache-Control': 'public, max-age=3600',
    'A2A-Version': '1.0',
  });
});

// --- JSON-RPC Endpoint ---
app.post('/a2a', async (c) => {
  const body = await c.req.json();

  if (!body.jsonrpc || body.jsonrpc !== '2.0') {
    return c.json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid JSON-RPC request' },
      id: body.id || null,
    });
  }

  c.header('A2A-Version', '1.0');

  switch (body.method) {
    case 'message/send':
      return c.json(handleMessageSend(body));
    case 'tasks/get':
      return c.json(handleTasksGet(body));
    case 'tasks/cancel':
      return c.json(handleTasksCancel(body));
    default:
      return c.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${body.method}` },
        id: body.id,
      });
  }
});

// --- JSON-RPC Handlers ---

function handleMessageSend(req: any) {
  const params = req.params || {};
  const message = params.message;

  if (!message?.parts?.length) {
    return {
      jsonrpc: '2.0',
      error: { code: -32602, message: 'message.parts is required' },
      id: req.id,
    };
  }

  const taskId = params.id;
  const contextId = params.contextId;

  // Add to existing task
  if (taskId && tasks.has(taskId)) {
    const task = tasks.get(taskId)!;
    task.history.push({
      messageId: crypto.randomUUID(),
      role: message.role || 'user',
      parts: message.parts,
    });
    return { jsonrpc: '2.0', result: task, id: req.id };
  }

  // Find by contextId
  if (contextId) {
    for (const task of tasks.values()) {
      if (task.contextId === contextId && !['completed', 'canceled'].includes(task.status.state)) {
        task.history.push({
          messageId: crypto.randomUUID(),
          role: message.role || 'user',
          parts: message.parts,
        });
        return { jsonrpc: '2.0', result: task, id: req.id };
      }
    }
  }

  // Create new task
  const newId = crypto.randomUUID();
  const task: Task = {
    id: newId,
    contextId: contextId || undefined,
    status: { state: 'submitted', timestamp: new Date().toISOString() },
    history: [
      {
        messageId: crypto.randomUUID(),
        role: message.role || 'user',
        parts: message.parts,
      },
    ],
    artifacts: [],
  };
  tasks.set(newId, task);

  // Auto-respond: parse the message and generate an invoice response
  const text = message.parts[0]?.text || '';
  const autoResponse = generateInvoiceResponse(text);
  if (autoResponse) {
    task.history.push({
      messageId: crypto.randomUUID(),
      role: 'agent',
      parts: [{ text: autoResponse }],
    });
    task.status = { state: 'completed', message: 'Invoice processed', timestamp: new Date().toISOString() };
    task.artifacts.push({
      artifactId: crypto.randomUUID(),
      name: `invoice-${++taskCounter}.json`,
      mediaType: 'application/json',
      parts: [{
        data: {
          invoiceNumber: `INV-ACME-2026-${String(taskCounter).padStart(4, '0')}`,
          amount: extractAmount(text),
          currency: extractCurrency(text),
          status: 'issued',
          issuedAt: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
      }],
    });
  }

  return { jsonrpc: '2.0', result: task, id: req.id };
}

function handleTasksGet(req: any) {
  const taskId = req.params?.id;
  if (!taskId) {
    return { jsonrpc: '2.0', error: { code: -32602, message: 'id is required' }, id: req.id };
  }
  const task = tasks.get(taskId);
  if (!task) {
    return { jsonrpc: '2.0', error: { code: -32001, message: `Task not found: ${taskId}` }, id: req.id };
  }
  return { jsonrpc: '2.0', result: task, id: req.id };
}

function handleTasksCancel(req: any) {
  const taskId = req.params?.id;
  if (!taskId) {
    return { jsonrpc: '2.0', error: { code: -32602, message: 'id is required' }, id: req.id };
  }
  const task = tasks.get(taskId);
  if (!task) {
    return { jsonrpc: '2.0', error: { code: -32001, message: `Task not found: ${taskId}` }, id: req.id };
  }
  task.status = { state: 'canceled', message: 'Canceled by client', timestamp: new Date().toISOString() };
  return { jsonrpc: '2.0', result: task, id: req.id };
}

// --- Auto-response Logic ---

function generateInvoiceResponse(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('invoice') || lower.includes('bill') || lower.includes('payment')) {
    const amount = extractAmount(text);
    const currency = extractCurrency(text);
    return `Invoice generated. ACME Corp Invoice #INV-ACME-2026-${String(taskCounter + 1).padStart(4, '0')} for ${amount} ${currency}. Payment terms: Net 30. Please remit to our USDC wallet: 0xACME...1234 or via Pix: invoices@acme.example.com. This invoice is now tracked in our system.`;
  }
  if (lower.includes('status') || lower.includes('check')) {
    return `All invoices are current. No overdue items. Last payment received: 2026-02-18 for 500 USDC.`;
  }
  return `Invoice Bot received your message. I can help with: creating invoices, checking invoice status, or listing invoices. What would you like to do?`;
}

function extractAmount(text: string): number {
  const match = text.match(/[\$]?([\d,]+(?:\.\d{2})?)\s*(?:USDC|USD|BRL|MXN)/i);
  return match ? parseFloat(match[1].replace(',', '')) : 1000;
}

function extractCurrency(text: string): string {
  const match = text.match(/\b(USDC|USD|BRL|MXN)\b/i);
  return match ? match[1].toUpperCase() : 'USDC';
}

// --- Outbound: Discover + Talk to Sly ---

async function discoverSlyAgent(agentId: string) {
  const url = `${SLY_BASE}/a2a/agents/${agentId}/card`;
  console.log(`[Invoice Bot] Discovering Sly agent at ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Discovery failed: ${res.status}`);
  return await res.json();
}

async function sendTaskToSly(agentId: string, text: string, contextId?: string) {
  const url = `${SLY_BASE}/a2a/${agentId}`;
  console.log(`[Invoice Bot] Sending task to ${url}...`);
  const body: any = {
    jsonrpc: '2.0',
    id: `invoice-bot-${Date.now()}`,
    method: 'message/send',
    params: {
      message: {
        role: 'user',
        parts: [{ text }],
      },
    },
  };
  if (contextId) body.params.contextId = contextId;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'A2A-Version': '1.0',
      Authorization: `Bearer ${SLY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}

// --- CLI Commands (via query params) ---

app.get('/test/discover/:agentId', async (c) => {
  try {
    const card = await discoverSlyAgent(c.req.param('agentId'));
    return c.json({ success: true, card });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/test/send/:agentId', async (c) => {
  try {
    const text = c.req.query('text') || 'Please create an invoice for 500 USDC for consulting services';
    const contextId = c.req.query('contextId');
    const result = await sendTaskToSly(c.req.param('agentId'), text, contextId || undefined);
    return c.json({ success: true, result });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

app.get('/test/tasks', (c) => {
  return c.json({
    success: true,
    tasks: Array.from(tasks.values()).map((t) => ({
      id: t.id,
      contextId: t.contextId,
      state: t.status.state,
      messageCount: t.history.length,
      artifactCount: t.artifacts.length,
    })),
  });
});

// --- Health ---
app.get('/health', (c) => {
  return c.json({ status: 'healthy', agent: 'Invoice Bot', port: PORT, tasks: tasks.size });
});

// --- Start ---
console.log(`
╔══════════════════════════════════════════════════╗
║         Invoice Bot — External A2A Agent         ║
╠══════════════════════════════════════════════════╣
║  Agent: Invoice Bot (ACME Corp)                  ║
║  Port:  ${PORT}                                      ║
║  Card:  http://localhost:${PORT}/.well-known/agent.json ║
║  RPC:   http://localhost:${PORT}/a2a                    ║
╠══════════════════════════════════════════════════╣
║  Test endpoints:                                 ║
║  GET /test/discover/:agentId                     ║
║  GET /test/send/:agentId?text=...                ║
║  GET /test/tasks                                 ║
╚══════════════════════════════════════════════════╝
`);

serve({ fetch: app.fetch, port: PORT });
