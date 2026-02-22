import { describe, it, expect, beforeAll } from 'vitest';
import { TEST_API_KEY, TEST_AGENTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('A2A Task Processor (Epic 58)', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // =========================================================================
  // Story 58.1: Agent Processing Configuration
  // =========================================================================

  describe('Agent Processing Configuration (58.1)', () => {
    it('GET /v1/a2a/agents/:agentId/config returns current config', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`,
        { headers },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveProperty('processingMode');
      expect(body.data).toHaveProperty('processingConfig');
      expect(['managed', 'webhook', 'manual']).toContain(body.data.processingMode);
    });

    it('PUT /v1/a2a/agents/:agentId/config — set to manual mode', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            processingMode: 'manual',
            processingConfig: {},
          }),
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.processingMode).toBe('manual');
    });

    it('PUT /v1/a2a/agents/:agentId/config — set to managed mode', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            processingMode: 'managed',
            processingConfig: {
              model: 'claude-sonnet-4-20250514',
              systemPrompt: 'You are a test agent for integration testing.',
              maxTokens: 4096,
              temperature: 0.3,
            },
          }),
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.processingMode).toBe('managed');
      expect(body.data.processingConfig.model).toBe('claude-sonnet-4-20250514');
    });

    it('PUT /v1/a2a/agents/:agentId/config — rejects managed without model', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            processingMode: 'managed',
            processingConfig: { systemPrompt: 'test' },
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    it('PUT /v1/a2a/agents/:agentId/config — rejects webhook without callbackUrl', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            processingMode: 'webhook',
            processingConfig: {},
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    it('PUT /v1/a2a/agents/:agentId/config — rejects invalid processing mode', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            processingMode: 'invalid',
            processingConfig: {},
          }),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // Story 58.3: Task Processing (Manual Trigger)
  // =========================================================================

  describe('Task Processing (58.3)', () => {
    let taskId: string;

    beforeAll(async () => {
      // Ensure agent is in managed mode for processing tests
      await fetch(`${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          processingMode: 'managed',
          processingConfig: {
            model: 'claude-sonnet-4-20250514',
            systemPrompt: 'You are a test payment agent.',
          },
        }),
      });

      // Create a task
      const res = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'Check my USDC balance' }] },
        }),
      });
      const body = await res.json();
      taskId = body.data.id;
    });

    it('POST /v1/a2a/tasks/:taskId/process — processes a submitted task', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${taskId}/process`,
        { method: 'POST', headers },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeTruthy();
      expect(body.data.id).toBe(taskId);
      // Task should have progressed beyond submitted
      expect(['working', 'completed', 'failed']).toContain(body.data.status.state);
    });

    it('GET /v1/a2a/tasks/:taskId — processed task has agent messages', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${taskId}`,
        { headers },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /v1/a2a/process — batch processes submitted tasks', { timeout: 30000 }, async () => {
      // Create a fresh task to process
      const createRes = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'What are your capabilities?' }] },
        }),
      });
      await createRes.json();

      const response = await fetch(`${BASE_URL}/v1/a2a/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveProperty('processed');
    });
  });

  // =========================================================================
  // Story 58.5: External State Update (Webhook Flow)
  // =========================================================================

  describe('External State Update via PATCH (58.5)', () => {
    let taskId: string;

    beforeAll(async () => {
      // Create a task to manipulate
      const res = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'Process this via webhook' }] },
        }),
      });
      const body = await res.json();
      taskId = body.data.id;

      // Manually transition to working state first (simulating worker claim)
      await fetch(`${BASE_URL}/v1/a2a/tasks/${taskId}/process`, {
        method: 'POST',
        headers,
      });
    });

    it('PATCH /v1/a2a/tasks/:taskId — updates state with message', async () => {
      // Get current state first
      const getRes = await fetch(`${BASE_URL}/v1/a2a/tasks/${taskId}`, { headers });
      const getBody = await getRes.json();
      const currentState = getBody.data.status.state;

      // Only patch if we're in a patchable state
      if (['working', 'input-required'].includes(currentState)) {
        const response = await fetch(`${BASE_URL}/v1/a2a/tasks/${taskId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            state: 'completed',
            statusMessage: 'External system completed the task',
            message: {
              role: 'agent',
              parts: [{ text: 'Task completed by external system.' }],
            },
          }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data.status.state).toBe('completed');
      } else {
        // Task already in terminal state (from process), verify we can't patch backward
        const response = await fetch(`${BASE_URL}/v1/a2a/tasks/${taskId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ state: 'working' }),
        });
        expect(response.status).toBe(400);
      }
    });

    it('PATCH /v1/a2a/tasks/:taskId — rejects invalid state transitions', async () => {
      // Create a fresh task for this test
      const createRes = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'Test invalid transition' }] },
        }),
      });
      const createBody = await createRes.json();
      const newTaskId = createBody.data.id;

      // submitted → completed is not valid (must go through working first)
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks/${newTaskId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ state: 'completed' }),
      });

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // Story 58.6: Human-in-the-Loop Escalation
  // =========================================================================

  describe('Human-in-the-Loop Escalation (58.6)', () => {
    let escalatedTaskId: string;

    beforeAll(async () => {
      // Create a task
      const createRes = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'Transfer 50000 USDC (should escalate)' }] },
        }),
      });
      const createBody = await createRes.json();
      escalatedTaskId = createBody.data.id;

      // Process it — this should trigger escalation for large amount
      await fetch(`${BASE_URL}/v1/a2a/tasks/${escalatedTaskId}/process`, {
        method: 'POST',
        headers,
      });
    });

    it('POST /v1/a2a/tasks/:taskId/respond — responds to escalated task', async () => {
      // First get the task to see its state
      const getRes = await fetch(`${BASE_URL}/v1/a2a/tasks/${escalatedTaskId}`, { headers });
      const getBody = await getRes.json();

      // If it's in input-required, test the respond endpoint
      if (getBody.data.status.state === 'input-required') {
        const response = await fetch(
          `${BASE_URL}/v1/a2a/tasks/${escalatedTaskId}/respond`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              parts: [{ text: 'Approved. Please proceed with the transfer.' }],
            }),
          },
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.data.status.state).toBe('working');
      } else {
        // If task went to completed/failed (e.g. threshold not triggered),
        // just verify the respond endpoint rejects it
        const response = await fetch(
          `${BASE_URL}/v1/a2a/tasks/${escalatedTaskId}/respond`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              parts: [{ text: 'Approved.' }],
            }),
          },
        );

        expect(response.status).toBe(400);
      }
    });

    it('POST /v1/a2a/tasks/:taskId/respond — rejects if task not in input-required state', async () => {
      // Create a fresh submitted task (not in input-required)
      const createRes = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'Simple query' }] },
        }),
      });
      const createBody = await createRes.json();

      const response = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${createBody.data.id}/respond`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            parts: [{ text: 'This should be rejected' }],
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    it('POST /v1/a2a/tasks/:taskId/respond — rejects without parts', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${escalatedTaskId}/respond`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // Story 58.9: Dead Letter Queue
  // =========================================================================

  describe('Dead Letter Queue (58.9)', () => {
    it('GET /v1/a2a/tasks/dlq — returns DLQ tasks', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks/dlq`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeTruthy();
      expect(body.pagination).toHaveProperty('total');
    });

    it('POST /v1/a2a/tasks/:taskId/retry — returns 404 for non-DLQ task', async () => {
      // Create a normal task (not in DLQ)
      const createRes = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'Not a DLQ task' }] },
        }),
      });
      const createBody = await createRes.json();

      const response = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${createBody.data.id}/retry`,
        { method: 'POST', headers },
      );

      expect(response.status).toBe(404);
    });
  });

  // =========================================================================
  // Story 58.13: SSE Streaming
  // =========================================================================

  describe('SSE Streaming (58.13)', () => {
    it('POST /a2a/:agentId — message/stream returns SSE stream', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'message/stream',
        params: {
          message: {
            parts: [{ text: 'What are your capabilities?' }],
          },
        },
        id: 'stream-test-1',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });

      expect(response.status).toBe(200);
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('text/event-stream');

      // Read the initial status event from the stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotStatusEvent = false;

      // Read up to 5 chunks or until we find a status event
      for (let i = 0; i < 5; i++) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (buffer.includes('event: status')) {
          gotStatusEvent = true;
          break;
        }
      }

      // Cancel the reader (we don't need the full stream)
      reader.cancel();

      expect(gotStatusEvent).toBe(true);
      expect(buffer).toContain('event: status');
      expect(buffer).toContain('data: ');
    });

    it('POST /a2a/:agentId — message/stream rejects empty parts', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'message/stream',
        params: {
          message: { parts: [] },
        },
        id: 'stream-test-2',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });
  });

  // =========================================================================
  // Story 58.16: Completion Webhooks (Configuration)
  // =========================================================================

  describe('Completion Webhooks (58.16)', () => {
    it('POST /v1/a2a/tasks — accepts callbackUrl', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'Task with callback' }] },
          callbackUrl: 'https://example.com/webhook',
          callbackSecret: 'test-secret-key',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBeTruthy();
      expect(body.data.status.state).toBe('submitted');
    });

    it('POST /a2a/:agentId — message/send with callbackUrl in configuration', async () => {
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            parts: [{ text: 'Task with completion webhook' }],
          },
          configuration: {
            callbackUrl: 'https://example.com/a2a/callback',
            callbackSecret: 'my-secret',
          },
        },
        id: 'callback-test-1',
      };

      const response = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcRequest),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.result).toBeTruthy();
      expect(body.result.id).toBeTruthy();
      expect(body.result.status.state).toBe('submitted');
    });
  });

  // =========================================================================
  // Stats & Sessions
  // =========================================================================

  describe('Stats & Sessions', () => {
    it('GET /v1/a2a/stats — returns task statistics', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/stats`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveProperty('total');
      expect(body.data).toHaveProperty('active');
      expect(body.data).toHaveProperty('completed');
      expect(body.data).toHaveProperty('inbound');
      expect(body.data).toHaveProperty('outbound');
      expect(body.data).toHaveProperty('totalCost');
      expect(typeof body.data.total).toBe('number');
    });

    it('GET /v1/a2a/sessions — returns grouped sessions', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/sessions`, { headers });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeInstanceOf(Array);

      if (body.data.length > 0) {
        const session = body.data[0];
        expect(session).toHaveProperty('contextId');
        expect(session).toHaveProperty('taskCount');
        expect(session).toHaveProperty('agentNames');
        expect(session).toHaveProperty('latestState');
      }
    });
  });

  // =========================================================================
  // Task Lifecycle Integration
  // =========================================================================

  describe('Full Task Lifecycle', () => {
    it('create → process → complete lifecycle', async () => {
      // 1. Create task
      const createRes = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'What services do you offer?' }] },
        }),
      });
      const createBody = await createRes.json();
      expect(createBody.data.status.state).toBe('submitted');
      const taskId = createBody.data.id;

      // 2. Process task
      const processRes = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${taskId}/process`,
        { method: 'POST', headers },
      );
      const processBody = await processRes.json();
      expect(processBody.data).toBeTruthy();

      // 3. Verify task has been processed
      const getRes = await fetch(`${BASE_URL}/v1/a2a/tasks/${taskId}`, { headers });
      const getBody = await getRes.json();
      expect(getBody.data.history.length).toBeGreaterThan(1);
      // Should have at least the original user message + an agent response
      const roles = getBody.data.history.map((m: any) => m.role);
      expect(roles).toContain('user');
      expect(roles).toContain('agent');
    });

    it('create → cancel lifecycle', async () => {
      // 1. Create task
      const createRes = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [{ text: 'This will be cancelled' }] },
        }),
      });
      const createBody = await createRes.json();
      const taskId = createBody.data.id;

      // 2. Cancel task
      const cancelRes = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${taskId}/cancel`,
        { method: 'POST', headers },
      );
      const cancelBody = await cancelRes.json();
      expect(cancelBody.data.status.state).toBe('canceled');

      // 3. Verify task is cancelled
      const getRes = await fetch(`${BASE_URL}/v1/a2a/tasks/${taskId}`, { headers });
      const getBody = await getRes.json();
      expect(getBody.data.status.state).toBe('canceled');
    });

    it('multi-turn conversation maintains context', async () => {
      const contextId = `test-multiturn-${Date.now()}`;

      // Turn 1
      const turn1 = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: { parts: [{ text: 'Hello, what is my balance?' }] },
            contextId,
          },
          id: 'turn-1',
        }),
      });
      const turn1Body = await turn1.json();
      const taskId = turn1Body.result.id;
      expect(turn1Body.result.contextId).toBe(contextId);

      // Turn 2 — should reuse same task
      const turn2 = await fetch(`${BASE_URL}/a2a/${TEST_AGENTS.payroll}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: { parts: [{ text: 'Can you transfer 100 USDC?' }] },
            contextId,
          },
          id: 'turn-2',
        }),
      });
      const turn2Body = await turn2.json();

      expect(turn2Body.result.id).toBe(taskId);
      expect(turn2Body.result.history.length).toBe(2);
    });
  });

  // =========================================================================
  // Edge Cases & Validation
  // =========================================================================

  describe('Edge Cases', () => {
    it('GET /v1/a2a/tasks/:taskId — returns 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks/${fakeId}`, { headers });
      expect(response.status).toBe(404);
    });

    it('GET /v1/a2a/tasks/:taskId — returns 400 for invalid UUID', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks/not-a-uuid`, { headers });
      expect(response.status).toBe(400);
    });

    it('POST /v1/a2a/tasks — rejects without message parts', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentId: TEST_AGENTS.payroll,
          message: { parts: [] },
        }),
      });
      expect(response.status).toBe(400);
    });

    it('POST /v1/a2a/tasks — rejects local task without agentId', async () => {
      const response = await fetch(`${BASE_URL}/v1/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: { parts: [{ text: 'No agent specified' }] },
        }),
      });
      expect(response.status).toBe(400);
    });

    it('POST /v1/a2a/tasks/:taskId/respond — returns 400 for invalid UUID', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/tasks/not-a-uuid/respond`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ parts: [{ text: 'test' }] }),
        },
      );
      expect(response.status).toBe(400);
    });

    it('POST /v1/a2a/tasks/:taskId/respond — returns 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(
        `${BASE_URL}/v1/a2a/tasks/${fakeId}/respond`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ parts: [{ text: 'test' }] }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  // =========================================================================
  // Cleanup: Restore agent config
  // =========================================================================

  describe('Cleanup', () => {
    it('restores agent to manual mode', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/a2a/agents/${TEST_AGENTS.payroll}/config`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            processingMode: 'manual',
            processingConfig: {},
          }),
        },
      );
      expect(response.status).toBe(200);
    });
  });
});
