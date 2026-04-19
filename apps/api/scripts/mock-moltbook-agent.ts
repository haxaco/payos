/**
 * Mock Moltbook Agent — External A2A Server
 *
 * A standalone agent server that speaks the open A2A protocol but is NOT
 * registered with Sly. Demonstrates how external (third-party) agents from
 * other marketplaces can transact with Sly agents via the federation path.
 *
 * Endpoints:
 *   GET  /.well-known/agent.json   — Agent Card (discovery)
 *   POST /a2a                       — JSON-RPC message/send (inbound tasks)
 *   POST /a2a/:id/cancel            — JSON-RPC tasks/cancel
 *
 * Run:  pnpm mock:moltbook
 *
 * No persistent state. Each request is handled with random latency
 * (300-1500ms) and a 90% success rate.
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const PORT = parseInt(process.env.MOLTBOOK_PORT || '8890');
const PUBLIC_URL = process.env.MOLTBOOK_URL || `http://localhost:${PORT}`;

// Payout address published in the Agent Card. If MOLTBOOK_PAYOUT_ADDRESS is set
// to a real EVM address (0x + 40 hex chars), Sly can actually settle USDC on-chain
// to this address. Otherwise, a fake demo address is used and Sly will skip
// real transfers (federation settlement stays ledger-only).
const ENV_ADDR = process.env.MOLTBOOK_PAYOUT_ADDRESS;
const isValidEvmAddress = (a: string | undefined): boolean =>
  !!a && /^0x[0-9a-fA-F]{40}$/.test(a);
const PAYOUT_ADDRESS = isValidEvmAddress(ENV_ADDR)
  ? (ENV_ADDR as string)
  : '0xMolt000000FederationDemo000000000000001'; // fake — real on-chain disabled

const app = new Hono();

// CORS so the live viewer can probe the discovery endpoint cross-origin
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, A2A-Version');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  return next();
});

/**
 * Agent Card — A2A v1.0 discovery manifest
 */
app.get('/.well-known/agent.json', (c) =>
  c.json({
    name: 'Moltbook Travel Agent',
    description: 'External A2A agent providing travel research and booking. Lives on Moltbook, not Sly.',
    url: `${PUBLIC_URL}/a2a`,
    version: '1.0.0',
    protocolVersion: '1.0',
    provider: {
      organization: 'Moltbook',
      url: 'https://moltbook.example',
    },
    capabilities: {
      streaming: false,
      stateTransitionHistory: true,
    },
    skills: [
      {
        id: 'research',
        name: 'Travel Research',
        description: 'Research destinations, flights, hotels',
        pricing: {
          amount: 0.05,
          currency: 'USDC',
          payoutAddress: PAYOUT_ADDRESS,
        },
      },
      {
        id: 'access_api',
        name: 'Booking API Access',
        description: 'Direct access to Moltbook booking inventory',
        pricing: {
          amount: 0.02,
          currency: 'USDC',
          payoutAddress: PAYOUT_ADDRESS,
        },
      },
      {
        id: 'create_checkout',
        name: 'Create Checkout',
        description: 'Initialize a checkout session for a booking',
        pricing: {
          amount: 0.03,
          currency: 'USDC',
          payoutAddress: PAYOUT_ADDRESS,
        },
      },
    ],
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
    },
  })
);

/**
 * JSON-RPC entry point — handles message/send and tasks/get
 */
app.post('/a2a', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }

  const { method, params, id } = body;

  if (method === 'message/send') {
    // Simulate work latency 300-1500ms
    const latency = 300 + Math.random() * 1200;
    await new Promise((r) => setTimeout(r, latency));

    const succeeded = Math.random() > 0.1;
    const taskId = `mb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const userMessage = params?.message;
    const skillId = userMessage?.metadata?.skillId || 'research';

    if (!succeeded) {
      return c.json({
        jsonrpc: '2.0',
        id,
        result: {
          id: taskId,
          contextId: params?.contextId || crypto.randomUUID(),
          state: 'failed',
          messages: userMessage ? [userMessage] : [],
          artifacts: [],
          status: { state: 'failed', message: 'Moltbook simulated failure' },
        },
      });
    }

    return c.json({
      jsonrpc: '2.0',
      id,
      result: {
        id: taskId,
        contextId: params?.contextId || crypto.randomUUID(),
        state: 'completed',
        messages: userMessage ? [userMessage, {
          role: 'agent',
          parts: [{ type: 'text', text: `Moltbook delivered ${skillId} (latency ${Math.round(latency)}ms)` }],
        }] : [],
        artifacts: [
          {
            artifactId: `art_${taskId}`,
            name: 'result',
            parts: [
              { type: 'text', text: `External agent (Moltbook) completed ${skillId} for caller` },
            ],
          },
        ],
        status: { state: 'completed' },
      },
    });
  }

  if (method === 'tasks/get') {
    const taskId = params?.id;
    return c.json({
      jsonrpc: '2.0',
      id,
      result: {
        id: taskId,
        state: 'completed',
        messages: [],
        artifacts: [],
        status: { state: 'completed' },
      },
    });
  }

  if (method === 'tasks/cancel') {
    return c.json({ jsonrpc: '2.0', id, result: { canceled: true } });
  }

  return c.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }, 404);
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'moltbook-mock', port: PORT }));

console.log(`[Moltbook Mock] Starting on http://localhost:${PORT}`);
console.log(`[Moltbook Mock] Discovery: http://localhost:${PORT}/.well-known/agent.json`);
console.log(`[Moltbook Mock] A2A endpoint: http://localhost:${PORT}/a2a`);
console.log(`[Moltbook Mock] Payout address: ${PAYOUT_ADDRESS}${isValidEvmAddress(ENV_ADDR) ? ' (REAL — on-chain transfers possible)' : ' (FAKE — simulated only)'}`);
if (!isValidEvmAddress(ENV_ADDR)) {
  console.log(`[Moltbook Mock] To enable real transfers: export MOLTBOOK_PAYOUT_ADDRESS=0x<your-base-sepolia-address>`);
}

serve({ fetch: app.fetch, port: PORT });
