/**
 * A2A Task Event Bus (Story 58.13)
 *
 * In-process EventEmitter singleton for task lifecycle events.
 * Events are keyed by `task:<taskId>` so SSE handlers can subscribe
 * to a specific task's lifecycle without receiving unrelated traffic.
 */

import { EventEmitter } from 'events';

export type TaskStreamEventType = 'status' | 'message' | 'artifact' | 'error';

export interface TaskStreamEvent {
  type: TaskStreamEventType;
  taskId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const TERMINAL_STATES = new Set(['completed', 'failed', 'canceled']);

class TaskEventBus extends EventEmitter {
  emitTask(taskId: string, event: TaskStreamEvent): boolean {
    const result = super.emit(`task:${taskId}`, event);
    // Also emit on global channel for completion webhooks (Story 58.16)
    if (event.type === 'status' && TERMINAL_STATES.has(event.data.state as string)) {
      super.emit('task:terminal', event);
    }
    return result;
  }

  subscribe(taskId: string, listener: (event: TaskStreamEvent) => void): () => void {
    const channel = `task:${taskId}`;
    super.on(channel, listener);
    return () => {
      super.removeListener(channel, listener);
    };
  }
}

export const taskEventBus = new TaskEventBus();
