/**
 * A2A JSON-RPC 2.0 Handler
 *
 * Dispatches JSON-RPC methods to the A2A task service.
 * Implements the A2A protocol's task lifecycle methods.
 *
 * @see Epic 57: Google A2A Protocol Integration
 * @see https://google.github.io/A2A/
 */

import type { A2AJsonRpcRequest, A2AJsonRpcResponse, A2APart } from './types.js';
import { JSON_RPC_ERRORS } from './types.js';
import type { A2ATaskService } from './task-service.js';

/**
 * Handle a JSON-RPC 2.0 request for the A2A protocol.
 */
export async function handleJsonRpc(
  request: A2AJsonRpcRequest,
  agentId: string,
  taskService: A2ATaskService,
): Promise<A2AJsonRpcResponse> {
  try {
    switch (request.method) {
      case 'tasks/send':
        return await handleTasksSend(request, agentId, taskService);
      case 'tasks/get':
        return await handleTasksGet(request, taskService);
      case 'tasks/cancel':
        return await handleTasksCancel(request, taskService);
      default:
        return {
          jsonrpc: '2.0',
          error: {
            code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            message: `Method not found: ${request.method}`,
          },
          id: request.id,
        };
    }
  } catch (error: any) {
    return {
      jsonrpc: '2.0',
      error: {
        code: JSON_RPC_ERRORS.INTERNAL_ERROR,
        message: error.message || 'Internal error',
      },
      id: request.id,
    };
  }
}

/**
 * tasks/send — Create a new task or add a message to an existing task.
 *
 * If contextId is provided and matches an existing task, adds a message
 * to that task (multi-turn). Otherwise creates a new task.
 */
async function handleTasksSend(
  request: A2AJsonRpcRequest,
  agentId: string,
  taskService: A2ATaskService,
): Promise<A2AJsonRpcResponse> {
  const params = request.params || {};

  // Validate message
  const message = params.message as { role?: string; parts?: A2APart[]; metadata?: Record<string, unknown> } | undefined;
  if (!message?.parts?.length) {
    return {
      jsonrpc: '2.0',
      error: {
        code: JSON_RPC_ERRORS.INVALID_PARAMS,
        message: 'message.parts is required and must not be empty',
      },
      id: request.id,
    };
  }

  const role = (message.role === 'agent' ? 'agent' : 'user') as 'user' | 'agent';
  const contextId = params.contextId as string | undefined;
  const taskId = params.id as string | undefined;

  // If taskId provided, add message to existing task
  if (taskId) {
    const existingTask = await taskService.getTask(taskId as string);
    if (!existingTask) {
      return {
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.TASK_NOT_FOUND,
          message: `Task not found: ${taskId}`,
        },
        id: request.id,
      };
    }

    await taskService.addMessage(taskId as string, role, message.parts, message.metadata);

    // If task was completed/failed/canceled, reset to working for new input
    if (['completed', 'failed', 'canceled'].includes(existingTask.status.state)) {
      // Don't allow re-opening completed tasks
      return {
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.INVALID_PARAMS,
          message: `Cannot send to task in state: ${existingTask.status.state}`,
        },
        id: request.id,
      };
    }

    // Transition back to working if input-required
    if (existingTask.status.state === 'input-required') {
      await taskService.updateTaskState(taskId as string, 'working', 'Processing new input');
    }

    const updatedTask = await taskService.getTask(taskId as string);
    return {
      jsonrpc: '2.0',
      result: updatedTask,
      id: request.id,
    };
  }

  // If contextId matches an existing task, add message (multi-turn)
  if (contextId) {
    const existingTask = await taskService.findTaskByContext(agentId, contextId);
    if (existingTask && !['completed', 'failed', 'canceled', 'rejected'].includes(existingTask.status.state)) {
      await taskService.addMessage(existingTask.id, role, message.parts, message.metadata);

      if (existingTask.status.state === 'input-required') {
        await taskService.updateTaskState(existingTask.id, 'working', 'Processing new input');
      }

      const updatedTask = await taskService.getTask(existingTask.id);
      return {
        jsonrpc: '2.0',
        result: updatedTask,
        id: request.id,
      };
    }
  }

  // Create new task
  const task = await taskService.createTask(agentId, { role, parts: message.parts, metadata: message.metadata }, contextId);

  return {
    jsonrpc: '2.0',
    result: task,
    id: request.id,
  };
}

/**
 * tasks/get — Get a task by ID.
 */
async function handleTasksGet(
  request: A2AJsonRpcRequest,
  taskService: A2ATaskService,
): Promise<A2AJsonRpcResponse> {
  const params = request.params || {};
  const taskId = params.id as string;

  if (!taskId) {
    return {
      jsonrpc: '2.0',
      error: {
        code: JSON_RPC_ERRORS.INVALID_PARAMS,
        message: 'id is required',
      },
      id: request.id,
    };
  }

  const historyLength = params.historyLength as number | undefined;
  const task = await taskService.getTask(taskId, historyLength);

  if (!task) {
    return {
      jsonrpc: '2.0',
      error: {
        code: JSON_RPC_ERRORS.TASK_NOT_FOUND,
        message: `Task not found: ${taskId}`,
      },
      id: request.id,
    };
  }

  return {
    jsonrpc: '2.0',
    result: task,
    id: request.id,
  };
}

/**
 * tasks/cancel — Cancel a task.
 */
async function handleTasksCancel(
  request: A2AJsonRpcRequest,
  taskService: A2ATaskService,
): Promise<A2AJsonRpcResponse> {
  const params = request.params || {};
  const taskId = params.id as string;

  if (!taskId) {
    return {
      jsonrpc: '2.0',
      error: {
        code: JSON_RPC_ERRORS.INVALID_PARAMS,
        message: 'id is required',
      },
      id: request.id,
    };
  }

  const task = await taskService.cancelTask(taskId);

  if (!task) {
    return {
      jsonrpc: '2.0',
      error: {
        code: JSON_RPC_ERRORS.TASK_NOT_FOUND,
        message: `Task not found: ${taskId}`,
      },
      id: request.id,
    };
  }

  return {
    jsonrpc: '2.0',
    result: task,
    id: request.id,
  };
}
