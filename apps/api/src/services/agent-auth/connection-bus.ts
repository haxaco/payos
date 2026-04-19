/**
 * Epic 72 — Agent Connection Bus
 *
 * In-process EventEmitter singleton for routing events to connected agents.
 * Follows the TaskEventBus pattern from services/a2a/task-event-bus.ts.
 *
 * Channels: `agent:<agentId>`
 * Events pushed to connected agents: task_assigned, transfer_completed,
 *   approval_requested, stream_alert, key_rotated, config_changed, heartbeat.
 *
 * Includes a per-agent replay buffer (100 events, 5-min window) supporting
 * Last-Event-ID reconnect.
 */

import { EventEmitter } from 'node:events';

export type AgentEventType =
  | 'task_assigned'
  | 'transfer_completed'
  | 'approval_requested'
  | 'stream_alert'
  | 'key_rotated'
  | 'config_changed'
  | 'heartbeat'
  | 'reconnect_required';

export interface AgentEvent {
  id: string;
  type: AgentEventType;
  timestamp: string;
  data: unknown;
}

interface BufferEntry {
  event: AgentEvent;
  expiresAt: number;
}

const BUFFER_MAX_SIZE = 100;
const BUFFER_TTL_MS = 5 * 60 * 1000; // 5 minutes

class AgentConnectionBus extends EventEmitter {
  private connectedAgents = new Map<string, { connectedAt: Date; eventCount: number }>();
  private replayBuffers = new Map<string, BufferEntry[]>();
  private eventCounter = 0;

  constructor() {
    super();
    this.setMaxListeners(1000);
  }

  /**
   * Push an event to a connected agent's channel.
   */
  emitToAgent(agentId: string, event: Omit<AgentEvent, 'id' | 'timestamp'>): boolean {
    const fullEvent: AgentEvent = {
      id: `evt_${++this.eventCounter}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    // Buffer for replay
    this.bufferEvent(agentId, fullEvent);

    return this.emit(`agent:${agentId}`, fullEvent);
  }

  /**
   * Subscribe to all events for a specific agent.
   * Returns an unsubscribe function.
   */
  subscribe(agentId: string, listener: (event: AgentEvent) => void): () => void {
    const channel = `agent:${agentId}`;
    this.on(channel, listener);
    return () => {
      this.removeListener(channel, listener);
    };
  }

  /**
   * Mark an agent as connected (for fast isConnected lookups).
   */
  markConnected(agentId: string): void {
    this.connectedAgents.set(agentId, { connectedAt: new Date(), eventCount: 0 });
  }

  /**
   * Mark an agent as disconnected.
   */
  markDisconnected(agentId: string): void {
    this.connectedAgents.delete(agentId);
  }

  /**
   * Check if an agent currently has an active SSE connection.
   */
  isConnected(agentId: string): boolean {
    return this.connectedAgents.has(agentId);
  }

  /**
   * Get events missed since a given event ID (for Last-Event-ID reconnect).
   */
  getEventsSince(agentId: string, lastEventId: string): AgentEvent[] {
    const buffer = this.replayBuffers.get(agentId);
    if (!buffer) return [];

    const now = Date.now();
    const idx = buffer.findIndex((b) => b.event.id === lastEventId);
    if (idx === -1) return []; // Event not in buffer — too old

    return buffer
      .slice(idx + 1)
      .filter((b) => b.expiresAt > now)
      .map((b) => b.event);
  }

  private bufferEvent(agentId: string, event: AgentEvent): void {
    let buffer = this.replayBuffers.get(agentId);
    if (!buffer) {
      buffer = [];
      this.replayBuffers.set(agentId, buffer);
    }

    // Evict expired entries
    const now = Date.now();
    while (buffer.length > 0 && buffer[0].expiresAt < now) {
      buffer.shift();
    }

    // Evict oldest if at capacity
    if (buffer.length >= BUFFER_MAX_SIZE) {
      buffer.shift();
    }

    buffer.push({ event, expiresAt: now + BUFFER_TTL_MS });
  }

  /**
   * Clean up buffers for agents that have been disconnected for a while.
   * Called by the cleanup worker.
   */
  pruneBuffers(): void {
    const now = Date.now();
    for (const [agentId, buffer] of this.replayBuffers.entries()) {
      // Remove expired entries
      while (buffer.length > 0 && buffer[0].expiresAt < now) {
        buffer.shift();
      }
      // Remove empty buffers for disconnected agents
      if (buffer.length === 0 && !this.connectedAgents.has(agentId)) {
        this.replayBuffers.delete(agentId);
      }
    }
  }
}

// Singleton instance
export const agentConnectionBus = new AgentConnectionBus();
