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
      expect(card.url).toBeTruthy();
      expect(card.capabilities).toHaveProperty('streaming');
      expect(card.capabilities).toHaveProperty('multiTurn');
      expect(card.capabilities).toHaveProperty('stateTransition');
      expect(card.defaultInputModes).toContain('text');
      expect(card.defaultOutputModes).toContain('text');
      expect(card.skills).toBeInstanceOf(Array);
      expect(card.skills.length).toBeGreaterThan(0);
      expect(card.supportedInterfaces).toBeInstanceOf(Array);
      expect(card.supportedInterfaces[0].protocolBinding).toBe('jsonrpc/http');
      expect(card.supportedInterfaces[0].protocolVersion).toBe('1.0');
      expect(card.securitySchemes).toHaveProperty('sly_api_key');
      expect(card.securitySchemes).toHaveProperty('bearer');

      // Cache headers
      expect(response.headers.get('cache-control')).toContain('max-age=3600');
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('a2a-version')).toBe('1.0');
    });

    it('GET /a2a/agents/:agentId/card returns per-agent card (no auth)', async () => {
      const response = await fetch(`${BASE_URL}/a2a/agents/${TEST_AGENTS.payroll}/card`);
      const card = await response.json();

      expect(response.status).toBe(200);
      expect(card.id).toBe(TEST_AGENTS.payroll);
      expect(card.name).toBeTruthy();
      expect(card.url).toBeTruthy();
      expect(card.skills).toBeInstanceOf(Array);
      expect(card.supportedInterfaces[0].url).toContain(`/a2a/${TEST_AGENTS.payroll}`);
      expect(card.securitySchemes).toHaveProperty('sly_api_key');
      expect(response.headers.get('a2a-version')).toBe('1.0');
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
  // Phase 2: JSON-RPC Task Lifecycle (v1.0)
  // =========================================================================

  describe('JSON-RPC Task Lifecycle', () => {
    let createdTaskId: string;

    it('POST /a2a/:agentId — message/send creates a task', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            parts: [{ text: 'Hello, what services do you offer?' }],
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
      expect(body.result.history).toHaveLength(1);
      expect(body.result.history[0].role).toBe('user');
      expect(body.result.history[0].messageId).toBeTruthy();
      expect(response.headers.get('a2a-version')).toBe('1.0');

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

    it('POST /a2a/:agentId — tasks/list returns tasks', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'tasks/list',
        params: {},
        id: 'test-list-1',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result.data).toBeInstanceOf(Array);
      expect(body.result.pagination).toBeTruthy();
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
        body: JSON.stringify({ method: 'message/send' }), // missing jsonrpc and id
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
            parts: [{ text: 'Process monthly payroll report' }],
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
  // Layered Discovery Architecture
  // =========================================================================

  describe('Layered Discovery', () => {
    it('platform card includes discovery skills (find_agent, list_agents)', async () => {
      const response = await fetch(`${BASE_URL}/.well-known/agent.json`);
      const card = await response.json();

      const skillIds = card.skills.map((s: any) => s.id);
      expect(skillIds).toContain('find_agent');
      expect(skillIds).toContain('list_agents');
      expect(skillIds).toContain('make_payment');
      expect(skillIds).toContain('create_mandate');
      expect(skillIds).toContain('manage_wallet');
    });

    it('platform card includes agent-directory extension', async () => {
      const response = await fetch(`${BASE_URL}/.well-known/agent.json`);
      const card = await response.json();

      const dirExt = card.extensions?.find((e: any) => e.uri === 'urn:a2a:ext:agent-directory');
      expect(dirExt).toBeTruthy();
      expect(dirExt.data.directoryEndpoint).toContain('/a2a');
    });

    it('GET /a2a/:agentId/.well-known/agent.json returns per-agent card (Layer 2)', async () => {
      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}/.well-known/agent.json`);
      const card = await response.json();

      expect(response.status).toBe(200);
      expect(card.id).toBe(TEST_AGENTS.payroll);
      expect(card.name).toBeTruthy();
      expect(card.url).toContain(`/a2a/${TEST_AGENTS.payroll}`);
      expect(card.skills).toBeInstanceOf(Array);
      expect(response.headers.get('a2a-version')).toBe('1.0');
      expect(response.headers.get('cache-control')).toContain('max-age=300');
    });

    it('GET /a2a/:agentId/.well-known/agent.json matches /a2a/agents/:agentId/card', async () => {
      const [wellKnownRes, cardRes] = await Promise.all([
        fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}/.well-known/agent.json`),
        fetch(`${BASE_URL}/a2a/agents/${TEST_AGENTS.payroll}/card`),
      ]);

      const wellKnownCard = await wellKnownRes.json();
      const legacyCard = await cardRes.json();

      expect(wellKnownCard.id).toBe(legacyCard.id);
      expect(wellKnownCard.name).toBe(legacyCard.name);
      expect(wellKnownCard.url).toBe(legacyCard.url);
      expect(wellKnownCard.skills.length).toBe(legacyCard.skills.length);
    });

    it('GET /a2a/not-a-uuid/.well-known/agent.json returns 400', async () => {
      const response = await fetch(`${BASE_URL}/a2a/not-a-uuid/.well-known/agent.json`);
      expect(response.status).toBe(400);
    });

    it('OPTIONS /a2a/:agentId/.well-known/agent.json returns CORS preflight', async () => {
      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}/.well-known/agent.json`, {
        method: 'OPTIONS',
        headers: { 'Origin': 'http://localhost:3000' },
      });
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-methods')).toBeTruthy();
    });
  });

  // =========================================================================
  // Platform Gateway (Layer 1)
  // =========================================================================

  describe('Platform Gateway', () => {
    it('POST /a2a — list_agents returns discoverable agents', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              parts: [{ data: { skill: 'list_agents' } }],
            },
          },
          id: 'gw-list-1',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe('gw-list-1');
      expect(body.result).toBeTruthy();
      expect(body.result.status.state).toBe('completed');
      expect(body.result.artifacts).toHaveLength(1);

      const artifact = body.result.artifacts[0];
      expect(artifact.parts[0].data.skill).toBe('list_agents');
      expect(artifact.parts[0].data.agents).toBeInstanceOf(Array);
      expect(artifact.parts[0].data.count).toBeGreaterThanOrEqual(0);

      // Each agent summary should have expected shape
      if (artifact.parts[0].data.agents.length > 0) {
        const agent = artifact.parts[0].data.agents[0];
        expect(agent.id).toBeTruthy();
        expect(agent.name).toBeTruthy();
        expect(agent.cardUrl).toContain('/.well-known/agent.json');
        expect(agent.skills).toBeInstanceOf(Array);
      }
    });

    it('POST /a2a — find_agent with query filters results', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              parts: [{ data: { skill: 'find_agent', query: 'payroll' } }],
            },
          },
          id: 'gw-find-1',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result.status.state).toBe('completed');
      expect(body.result.artifacts[0].parts[0].data.skill).toBe('find_agent');
      expect(body.result.artifacts[0].parts[0].data.agents).toBeInstanceOf(Array);
    });

    it('POST /a2a — find_agent with tags filters by skill tags', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              parts: [{ data: { skill: 'find_agent', tags: ['payments'] } }],
            },
          },
          id: 'gw-find-tags-1',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result.status.state).toBe('completed');
      expect(body.result.artifacts[0].parts[0].data.agents).toBeInstanceOf(Array);
    });

    it('POST /a2a — text query triggers find_agent', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              parts: [{ text: 'I need an agent for SPEI payments' }],
            },
          },
          id: 'gw-text-1',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result.status.state).toBe('completed');
      expect(body.result.artifacts[0].parts[0].data.skill).toBe('find_agent');
    });

    it('POST /a2a — unrecognizable message returns capabilities fallback', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              parts: [{ data: { something: 'unrelated' } }],
            },
          },
          id: 'gw-fallback-1',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result.status.state).toBe('completed');
      expect(body.result.artifacts[0].parts[0].data.availableSkills).toBeInstanceOf(Array);
      expect(body.result.artifacts[0].parts[0].data.platformCardUrl).toContain('/.well-known/agent.json');
    });

    it('POST /a2a — unknown method returns -32601', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/get',
          params: { id: 'some-id' },
          id: 'gw-bad-method',
        }),
      });
      const body = await response.json();

      expect(body.error.code).toBe(-32601);
    });

    it('POST /a2a — invalid JSON-RPC returns -32600', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'message/send' }), // missing jsonrpc and id
      });
      const body = await response.json();

      expect(body.error.code).toBe(-32600);
    });

    it('POST /a2a — malformed JSON returns -32700', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      const body = await response.json();

      expect(body.error.code).toBe(-32700);
    });

    it('OPTIONS /a2a returns CORS preflight', async () => {
      const response = await fetch(`${BASE_URL}/a2a`, { method: 'OPTIONS' });
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    });
  });

  // =========================================================================
  // URL Normalization Fix (discover with /card suffix)
  // =========================================================================

  describe('URL Normalization', () => {
    it('POST /v1/a2a/discover — /card URL works (self-discovery)', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/discover`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: `${BASE_URL}/a2a/agents/${TEST_AGENTS.payroll}/card` }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(TEST_AGENTS.payroll);
      expect(body.data.skills).toBeInstanceOf(Array);
    });

    it('POST /v1/a2a/discover — .well-known URL works (self-discovery)', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/discover`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: `${BASE_URL}/a2a/${TEST_AGENTS.payroll}/.well-known/agent.json` }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(TEST_AGENTS.payroll);
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
        method: 'message/send',
        params: {
          message: {
            parts: [{ text: 'What is the current exchange rate for USD/BRL?' }],
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
        method: 'message/send',
        params: {
          message: {
            parts: [{ text: 'And what about USD/MXN?' }],
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
      expect(body.result.history.length).toBe(2);
    });
  });
});
