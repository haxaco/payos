import { describe, it, expect } from 'vitest';
import { TEST_API_KEY, TEST_AGENTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('A2A Protocol Integration', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // =========================================================================
  // Phase 1: Discovery
  // =========================================================================

  describe('Discovery', () => {
    it('GET /.well-known/agent.json returns platform card', async () => {
      const response = await fetch(`${BASE_URL}/.well-known/agent.json`);
      const card = await response.json();

      expect(response.status).toBe(200);
      expect(card.id).toBe('sly-platform');
      expect(card.name).toBe('Sly Payment Platform');
      expect(card.version).toBe('1.0.0');
      expect(card.capabilities).toHaveProperty('streaming');
      expect(card.capabilities).toHaveProperty('multiTurn');
      expect(card.skills).toBeInstanceOf(Array);
      expect(card.skills.length).toBeGreaterThan(0);
      expect(card.interfaces).toBeInstanceOf(Array);
      expect(card.interfaces[0].type).toBe('jsonrpc');
      expect(card.securitySchemes).toHaveProperty('sly_api_key');
      expect(card.securitySchemes).toHaveProperty('bearer');

      // Cache headers
      expect(response.headers.get('cache-control')).toContain('max-age=3600');
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('GET /a2a/agents/:agentId/card returns per-agent card (no auth)', async () => {
      const response = await fetch(`${BASE_URL}/a2a/agents/${TEST_AGENTS.payroll}/card`);
      const card = await response.json();

      expect(response.status).toBe(200);
      expect(card.id).toBe(TEST_AGENTS.payroll);
      expect(card.name).toBeTruthy();
      expect(card.skills).toBeInstanceOf(Array);
      expect(card.interfaces[0].url).toContain(`/a2a/${TEST_AGENTS.payroll}`);
      expect(card.securitySchemes).toHaveProperty('sly_api_key');
    });

    it('GET /a2a/agents/invalid-id/card returns 400', async () => {
      const response = await fetch(`${BASE_URL}/a2a/agents/not-a-uuid/card`);
      expect(response.status).toBe(400);
    });

    it('GET /v1/a2a/agents/:agentId/card returns per-agent card (with auth)', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/card`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(TEST_AGENTS.payroll);
    });

    it('GET /v1/ap2/agent-card returns A2A platform card', async () => {
      const response = await fetch(`${BASE_URL}/v1/ap2/agent-card`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe('sly-platform');
      expect(body.data.capabilities).toHaveProperty('streaming');
    });
  });

  // =========================================================================
  // Phase 2: JSON-RPC Task Lifecycle
  // =========================================================================

  describe('JSON-RPC Task Lifecycle', () => {
    let createdTaskId: string;

    it('POST /a2a/:agentId — tasks/send creates a task', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/send',
        params: {
          message: {
            parts: [{ kind: 'text', text: 'Hello, what services do you offer?' }],
          },
        },
        id: 'test-1',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe('test-1');
      expect(body.result).toBeTruthy();
      expect(body.result.id).toBeTruthy();
      expect(body.result.status.state).toBe('submitted');
      expect(body.result.messages).toHaveLength(1);
      expect(body.result.messages[0].role).toBe('user');

      createdTaskId = body.result.id;
    });

    it('POST /a2a/:agentId — tasks/get retrieves the task', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/get',
        params: { id: createdTaskId },
        id: 'test-2',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result.id).toBe(createdTaskId);
      expect(body.result.status.state).toBe('submitted');
    });

    it('POST /a2a/:agentId — tasks/cancel cancels the task', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/cancel',
        params: { id: createdTaskId },
        id: 'test-3',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result.status.state).toBe('canceled');
    });

    it('POST /a2a/:agentId — unknown method returns -32601', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'unknown/method',
        params: {},
        id: 'test-4',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      expect(body.error.code).toBe(-32601);
    });

    it('POST /a2a/:agentId — invalid JSON-RPC returns -32600', async () => {
      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ method: 'tasks/send' }), // missing jsonrpc and id
      });
      const body = await response.json();

      expect(body.error.code).toBe(-32600);
    });
  });

  // =========================================================================
  // Phase 4: Management API
  // =========================================================================

  describe('Management API', () => {
    it('POST /v1/a2a/tasks — creates a local task', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: {
            parts: [{ kind: 'text', text: 'Process monthly payroll report' }],
          },
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBeTruthy();
      expect(body.data.status.state).toBe('submitted');
    });

    it('GET /v1/a2a/tasks — lists tasks', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeTruthy();
    });

    it('GET /v1/a2a/tasks — filters by agent', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks?agent_id=${TEST_AGENTS.payroll}`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.every((t: any) => t.agentId === TEST_AGENTS.payroll)).toBe(true);
    });

    it('POST /v1/a2a/discover — returns error for invalid URL', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/discover`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: 'http://nonexistent-host.invalid' }),
      });

      expect(response.status).toBe(502);
    });
  });

  // =========================================================================
  // Multi-turn Conversations
  // =========================================================================

  describe('Multi-turn Conversations', () => {
    const contextId = `test-context-${Date.now()}`;
    let taskId: string;

    it('creates a task with contextId', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/send',
        params: {
          message: {
            parts: [{ kind: 'text', text: 'What is the current exchange rate for USD/BRL?' }],
          },
          contextId,
        },
        id: 'multi-1',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      expect(body.result.contextId).toBe(contextId);
      taskId = body.result.id;
    });

    it('adds a follow-up message to the same context', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/send',
        params: {
          message: {
            parts: [{ kind: 'text', text: 'And what about USD/MXN?' }],
          },
          contextId,
        },
        id: 'multi-2',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      // Should reuse the same task
      expect(body.result.id).toBe(taskId);
      expect(body.result.messages.length).toBe(2);
    });
  });
});
