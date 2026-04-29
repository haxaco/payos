/**
 * Epic 72 — TaskEventBus → AgentConnectionBus Bridge
 *
 * Subscribes to the global `task:all` channel on the TaskEventBus and routes
 * relevant events to connected agents via the AgentConnectionBus.
 *
 * This keeps the two event buses decoupled — TaskEventBus doesn't know about
 * SSE connections, and AgentConnectionBus doesn't know about A2A tasks.
 */

import { taskEventBus, type TaskStreamEvent } from '../a2a/task-event-bus.js';
import { agentConnectionBus } from './connection-bus.js';
import { createClient } from '../../db/client.js';

let bridgeActive = false;
const listeners: Array<(...args: any[]) => void> = [];

/**
 * Start bridging task events to connected agents.
 * Called once at server startup (after both buses are initialized).
 */
export function startTaskBridge(): void {
  if (bridgeActive) return;
  bridgeActive = true;

  const routeListener = async (event: TaskStreamEvent) => {
    try {
      // Extract the target agent from the event data
      // The task-event-bus enriches events with _agentId when auditCtx is provided
      const agentId = (event.data as any)?._agentId
        || (event.data as any)?.agent_id
        || (event.data as any)?.agentId;

      if (!agentId) return;

      // Only forward if the agent is actually connected (fast in-memory check)
      if (!agentConnectionBus.isConnected(agentId)) return;

      // Map task event types to agent connection event types
      const eventType = mapTaskEventType(event);
      if (!eventType) return;

      agentConnectionBus.emitToAgent(agentId, {
        type: eventType,
        data: {
          taskId: event.taskId,
          eventType: event.type,
          ...event.data,
        },
      });
    } catch {
      // Non-fatal — don't let bridge errors break the task event flow
    }
  };

  taskEventBus.on('task:all', routeListener);
  listeners.push(routeListener);

  // Also listen for task assignments specifically — these often have the
  // target agent in a different field (the assigned agent, not the caller)
  const assignListener = async (event: TaskStreamEvent) => {
    if (event.type !== 'status') return;
    const state = (event.data as any)?.state;
    if (state !== 'submitted' && state !== 'working') return;

    // For submitted/working tasks, look up the assigned agent from DB
    // (the _agentId in the event might be the caller, not the provider)
    try {
      const supabase = createClient();
      const { data: task } = await (supabase.from('a2a_tasks') as any)
        .select('agent_id')
        .eq('id', event.taskId)
        .single();

      if (!task?.agent_id) return;
      if (!agentConnectionBus.isConnected(task.agent_id)) return;

      agentConnectionBus.emitToAgent(task.agent_id, {
        type: 'task_assigned',
        data: {
          taskId: event.taskId,
          state,
          ...event.data,
        },
      });
    } catch {
      // Non-fatal
    }
  };

  taskEventBus.on('task:all', assignListener);
  listeners.push(assignListener);

  console.log('[task-bridge] TaskEventBus → AgentConnectionBus bridge started');
}

function mapTaskEventType(event: TaskStreamEvent): 'task_assigned' | 'transfer_completed' | 'approval_requested' | null {
  switch (event.type) {
    case 'status': {
      const state = (event.data as any)?.state;
      if (state === 'submitted' || state === 'working') return 'task_assigned';
      return null;
    }
    case 'payment':
      return 'transfer_completed';
    case 'acceptance':
      return 'approval_requested';
    default:
      return null;
  }
}

export function stopTaskBridge(): void {
  if (!bridgeActive) return;
  for (const listener of listeners) {
    taskEventBus.removeListener('task:all', listener);
  }
  listeners.length = 0;
  bridgeActive = false;
  console.log('[task-bridge] TaskEventBus → AgentConnectionBus bridge stopped');
}
