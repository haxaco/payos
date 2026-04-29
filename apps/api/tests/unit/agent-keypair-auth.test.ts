/**
 * Agent Key-Pair Auth Tests
 * Epic 72: Ed25519 challenge-response authentication
 *
 * Tests crypto utilities, session token generation, and the connection bus.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateEd25519KeyPair,
  generateChallengeNonce,
  generateSessionToken,
  generateAuthKeyId,
  verifyEd25519Signature,
  signEd25519,
  hashApiKey,
} from '../../src/utils/crypto.js';
import { agentConnectionBus } from '../../src/services/agent-auth/connection-bus.js';

describe('Epic 72: Agent Key-Pair Auth', () => {
  describe('Ed25519 Key Pair Generation', () => {
    it('generates a valid Ed25519 key pair', () => {
      const { privateKey, publicKey } = generateEd25519KeyPair();

      expect(privateKey).toBeDefined();
      expect(publicKey).toBeDefined();
      expect(typeof privateKey).toBe('string');
      expect(typeof publicKey).toBe('string');

      // Ed25519 public key: 32 bytes → 44 base64 chars
      const pubBytes = Buffer.from(publicKey, 'base64');
      expect(pubBytes.length).toBe(32);

      // Ed25519 private key: 32 bytes → 44 base64 chars
      const privBytes = Buffer.from(privateKey, 'base64');
      expect(privBytes.length).toBe(32);
    });

    it('generates unique key pairs', () => {
      const kp1 = generateEd25519KeyPair();
      const kp2 = generateEd25519KeyPair();

      expect(kp1.publicKey).not.toBe(kp2.publicKey);
      expect(kp1.privateKey).not.toBe(kp2.privateKey);
    });
  });

  describe('Ed25519 Sign/Verify Round-Trip', () => {
    it('signs and verifies a message', async () => {
      const { privateKey, publicKey } = generateEd25519KeyPair();
      const message = 'challenge_abcdef12_test-nonce-data';

      const signature = await signEd25519(message, privateKey);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      const valid = await verifyEd25519Signature(message, signature, publicKey);
      expect(valid).toBe(true);
    });

    it('rejects a wrong signature', async () => {
      const kp1 = generateEd25519KeyPair();
      const kp2 = generateEd25519KeyPair();
      const message = 'test-message';

      const signature = await signEd25519(message, kp1.privateKey);

      // Verify with the wrong public key
      const valid = await verifyEd25519Signature(message, signature, kp2.publicKey);
      expect(valid).toBe(false);
    });

    it('rejects a tampered message', async () => {
      const { privateKey, publicKey } = generateEd25519KeyPair();
      const signature = await signEd25519('original-message', privateKey);

      const valid = await verifyEd25519Signature('tampered-message', signature, publicKey);
      expect(valid).toBe(false);
    });

    it('rejects invalid signature length', async () => {
      const { publicKey } = generateEd25519KeyPair();
      const badSig = Buffer.from('too-short').toString('base64');

      const valid = await verifyEd25519Signature('test', badSig, publicKey);
      expect(valid).toBe(false);
    });

    it('rejects invalid public key length', async () => {
      const { privateKey } = generateEd25519KeyPair();
      const signature = await signEd25519('test', privateKey);
      const badKey = Buffer.from('too-short').toString('base64');

      const valid = await verifyEd25519Signature('test', signature, badKey);
      expect(valid).toBe(false);
    });
  });

  describe('Challenge Nonce Generation', () => {
    it('generates a nonce with the correct format', () => {
      const agentId = '550e8400-e29b-41d4-a716-446655440000';
      const nonce = generateChallengeNonce(agentId);

      expect(nonce).toMatch(/^challenge_[a-f0-9]{8}_/);
      // Should contain the first 8 hex chars of the UUID (stripped dashes)
      expect(nonce.startsWith('challenge_550e8400_')).toBe(true);
    });

    it('generates unique nonces', () => {
      const agentId = '550e8400-e29b-41d4-a716-446655440000';
      const n1 = generateChallengeNonce(agentId);
      const n2 = generateChallengeNonce(agentId);

      expect(n1).not.toBe(n2);
    });
  });

  describe('Session Token Generation', () => {
    it('generates a token with sess_ prefix', () => {
      const token = generateSessionToken();
      expect(token).toMatch(/^sess_/);
      expect(token.length).toBeGreaterThan(10);
    });

    it('generates unique tokens', () => {
      const t1 = generateSessionToken();
      const t2 = generateSessionToken();
      expect(t1).not.toBe(t2);
    });

    it('token hash is deterministic', () => {
      const token = generateSessionToken();
      const h1 = hashApiKey(token);
      const h2 = hashApiKey(token);
      expect(h1).toBe(h2);
    });

    it('different tokens produce different hashes', () => {
      const t1 = generateSessionToken();
      const t2 = generateSessionToken();
      expect(hashApiKey(t1)).not.toBe(hashApiKey(t2));
    });
  });

  describe('Auth Key ID Generation', () => {
    it('generates an ID with the correct format', () => {
      const keyId = generateAuthKeyId('550e8400-e29b-41d4-a716-446655440000');
      expect(keyId).toMatch(/^auth_[a-f0-9]{8}_[a-f0-9]{8}$/);
    });

    it('includes the agent ID prefix', () => {
      const keyId = generateAuthKeyId('550e8400-e29b-41d4-a716-446655440000');
      expect(keyId.startsWith('auth_550e8400_')).toBe(true);
    });
  });

  describe('AgentConnectionBus', () => {
    beforeEach(() => {
      // Clean up listeners between tests
      agentConnectionBus.removeAllListeners();
    });

    it('emits events to subscribed agents', () => {
      const events: any[] = [];
      const unsubscribe = agentConnectionBus.subscribe('agent-1', (event) => {
        events.push(event);
      });

      agentConnectionBus.emitToAgent('agent-1', {
        type: 'task_assigned',
        data: { taskId: 'task-123' },
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('task_assigned');
      expect(events[0].data).toEqual({ taskId: 'task-123' });
      expect(events[0].id).toMatch(/^evt_/);
      expect(events[0].timestamp).toBeDefined();

      unsubscribe();
    });

    it('does not emit to other agents', () => {
      const events: any[] = [];
      const unsubscribe = agentConnectionBus.subscribe('agent-1', (event) => {
        events.push(event);
      });

      agentConnectionBus.emitToAgent('agent-2', {
        type: 'task_assigned',
        data: {},
      });

      expect(events).toHaveLength(0);
      unsubscribe();
    });

    it('unsubscribe stops event delivery', () => {
      const events: any[] = [];
      const unsubscribe = agentConnectionBus.subscribe('agent-1', (event) => {
        events.push(event);
      });

      agentConnectionBus.emitToAgent('agent-1', { type: 'heartbeat', data: {} });
      expect(events).toHaveLength(1);

      unsubscribe();

      agentConnectionBus.emitToAgent('agent-1', { type: 'heartbeat', data: {} });
      expect(events).toHaveLength(1); // No new events
    });

    it('tracks connected/disconnected state', () => {
      expect(agentConnectionBus.isConnected('agent-x')).toBe(false);

      agentConnectionBus.markConnected('agent-x');
      expect(agentConnectionBus.isConnected('agent-x')).toBe(true);

      agentConnectionBus.markDisconnected('agent-x');
      expect(agentConnectionBus.isConnected('agent-x')).toBe(false);
    });

    it('buffers events for replay (Last-Event-ID support)', () => {
      // Capture emitted event IDs via a subscriber
      const captured: any[] = [];
      const unsub = agentConnectionBus.subscribe('agent-r', (event) => {
        captured.push(event);
      });

      // Emit 3 events
      agentConnectionBus.emitToAgent('agent-r', { type: 'task_assigned', data: { n: 1 } });
      agentConnectionBus.emitToAgent('agent-r', { type: 'task_assigned', data: { n: 2 } });
      agentConnectionBus.emitToAgent('agent-r', { type: 'task_assigned', data: { n: 3 } });
      unsub();

      expect(captured).toHaveLength(3);

      // Get events since the first one (use actual ID, not hardcoded)
      const firstEventId = captured[0].id;
      const missed = agentConnectionBus.getEventsSince('agent-r', firstEventId);
      expect(missed.length).toBe(2);
      expect((missed[0].data as any).n).toBe(2);
      expect((missed[1].data as any).n).toBe(3);
    });

    it('returns empty array for unknown last event ID', () => {
      agentConnectionBus.emitToAgent('agent-r2', { type: 'heartbeat', data: {} });
      const missed = agentConnectionBus.getEventsSince('agent-r2', 'evt_nonexistent');
      expect(missed).toEqual([]);
    });
  });
});
