import { describe, it, expect } from 'vitest';
import { TEST_API_KEY, TEST_ACCOUNTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Streams API Integration', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  let testStreamId: string;

  describe('GET /v1/streams', () => {
    it('returns a list of streams', async () => {
      const response = await fetch(`${BASE_URL}/v1/streams`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('filters by status', async () => {
      const response = await fetch(`${BASE_URL}/v1/streams?status=active`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((s: any) => s.status === 'active')).toBe(true);
    });

    it('filters by health', async () => {
      const response = await fetch(`${BASE_URL}/v1/streams?health=healthy`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((s: any) => s.health === 'healthy')).toBe(true);
    });
  });

  describe('POST /v1/streams', () => {
    it('creates a new stream', async () => {
      const response = await fetch(`${BASE_URL}/v1/streams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          senderAccountId: TEST_ACCOUNTS.techcorp,
          receiverAccountId: TEST_ACCOUNTS.ana,
          flowRatePerMonth: 500,
          description: 'Integration test stream',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toHaveProperty('id');
      expect(data.data.status).toBe('active');
      expect(data.data.flowRate.perMonth).toBe(500);
      expect(data.data).toHaveProperty('funding');
      expect(data.data).toHaveProperty('health');

      testStreamId = data.data.id;
    });

    it('validates required fields', async () => {
      const response = await fetch(`${BASE_URL}/v1/streams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          senderAccountId: TEST_ACCOUNTS.techcorp,
          // missing receiverAccountId and flowRatePerMonth
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('prevents self-stream', async () => {
      const response = await fetch(`${BASE_URL}/v1/streams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          senderAccountId: TEST_ACCOUNTS.techcorp,
          receiverAccountId: TEST_ACCOUNTS.techcorp,
          flowRatePerMonth: 100,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('same account');
    });
  });

  describe('GET /v1/streams/:id', () => {
    it('returns stream details with real-time balance', async () => {
      // Get any active stream
      const listResponse = await fetch(`${BASE_URL}/v1/streams?status=active&limit=1`, { headers });
      const listData = await listResponse.json();
      const streamId = listData.data[0]?.id;

      if (!streamId) {
        console.log('No active streams to test');
        return;
      }

      const response = await fetch(`${BASE_URL}/v1/streams/${streamId}`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('streamed');
      expect(data.data.streamed).toHaveProperty('total');
      expect(data.data.streamed).toHaveProperty('withdrawn');
      expect(data.data.streamed).toHaveProperty('available');
      expect(data.data).toHaveProperty('funding');
      expect(data.data.funding).toHaveProperty('runway');
    });
  });

  describe('POST /v1/streams/:id/pause', () => {
    it('pauses an active stream', async () => {
      // Create a stream to pause
      const createResponse = await fetch(`${BASE_URL}/v1/streams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          senderAccountId: TEST_ACCOUNTS.acme,
          receiverAccountId: TEST_ACCOUNTS.pedro,
          flowRatePerMonth: 200,
          description: 'Stream to pause',
        }),
      });
      const createData = await createResponse.json();
      const streamId = createData.data.id;

      const response = await fetch(`${BASE_URL}/v1/streams/${streamId}/pause`, {
        method: 'POST',
        headers,
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('paused');
      expect(data.data.pausedAt).toBeTruthy();
    });
  });

  describe('POST /v1/streams/:id/resume', () => {
    it('resumes a paused stream', async () => {
      // Create and pause a stream
      const createResponse = await fetch(`${BASE_URL}/v1/streams`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          senderAccountId: TEST_ACCOUNTS.acme,
          receiverAccountId: TEST_ACCOUNTS.sofia,
          flowRatePerMonth: 300,
          description: 'Stream to resume',
        }),
      });
      const createData = await createResponse.json();
      const streamId = createData.data.id;

      await fetch(`${BASE_URL}/v1/streams/${streamId}/pause`, {
        method: 'POST',
        headers,
      });

      const response = await fetch(`${BASE_URL}/v1/streams/${streamId}/resume`, {
        method: 'POST',
        headers,
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('active');
      expect(data.data.pausedAt).toBeFalsy();
    });
  });

  describe('GET /v1/streams/:id/events', () => {
    it('returns stream event history', async () => {
      // Get any stream
      const listResponse = await fetch(`${BASE_URL}/v1/streams?limit=1`, { headers });
      const listData = await listResponse.json();
      const streamId = listData.data[0]?.id;

      if (!streamId) {
        console.log('No streams to test');
        return;
      }

      const response = await fetch(`${BASE_URL}/v1/streams/${streamId}/events`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      if (data.data.length > 0) {
        expect(data.data[0]).toHaveProperty('type');
        expect(data.data[0]).toHaveProperty('actor');
        expect(data.data[0]).toHaveProperty('createdAt');
      }
    });
  });
});

