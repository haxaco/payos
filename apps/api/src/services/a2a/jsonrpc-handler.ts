/**
 * A2A JSON-RPC 2.0 Handler
 *
 * Dispatches JSON-RPC methods to the A2A task service.
 * Implements the A2A v1.0 protocol's task lifecycle methods.
 *
 * @see Epic 57: Google A2A Protocol Integration
 * @see https://google.github.io/A2A/
 */

import type { A2AJsonRpcRequest, A2AJsonRpcResponse, A2APart, A2ADataPart, A2AConfiguration } from './types.js';
import { JSON_RPC_ERRORS } from './types.js';
import type { A2ATaskService } from './task-service.js';
import { A2APaymentHandler } from './payment-handler.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Handle a JSON-RPC 2.0 request for the A2A protocol.
 */
export async function handleJsonRpc(
  request: A2AJsonRpcRequest,
  agentId: string,
  taskService: A2ATaskService,
  supabase?: SupabaseClient,
  tenantId?: string,
): Promise<A2AJsonRpcResponse> {
  try {
    switch (request.method) {
      case 'message/send':
        return await handleMessageSend(request, agentId, taskService, supabase, tenantId);
      case 'tasks/get':
        return await handleTasksGet(request, taskService);
      case 'tasks/cancel':
        return await handleTasksCancel(request, taskService);
      case 'tasks/list':
        return await handleTasksList(request, agentId, taskService);
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
 * Extract a payment proof DataPart from message parts, if present.
 */
function extractPaymentProof(parts: A2APart[]): { type: 'x402' | 'ap2' | 'wallet'; transferId?: string; mandateId?: string; paymentToken?: string } | null {
  for (const part of parts) {
    if ('data' in part) {
      const dataPart = part as A2ADataPart;
      const d = dataPart.data;
      if (d && d.type === 'payment_proof') {
        const paymentType = (d.paymentType as string) || 'wallet';
        return {
          type: paymentType as 'x402' | 'ap2' | 'wallet',
          transferId: d.transferId as string | undefined,
          mandateId: d.mandateId as string | undefined,
          paymentToken: d.paymentToken as string | undefined,
        };
      }
    }
  }
  return null;
}

/**
 * message/send — Create a new task or add a message to an existing task.
 *
 * If contextId is provided and matches an existing task, adds a message
 * to that task (multi-turn). Otherwise creates a new task.
 *
 * When an input-required task receives a follow-up with a payment_proof DataPart,
 * the payment is verified and the task is re-submitted for processing.
 */
async function handleMessageSend(
  request: A2AJsonRpcRequest,
  agentId: string,
  taskService: A2ATaskService,
  supabase?: SupabaseClient,
  tenantId?: string,
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
  const configuration = params.configuration as A2AConfiguration | undefined;

  // If taskId provided, add message to existing task
  if (taskId) {
    const existingTask = await taskService.getTask(taskId as string, configuration?.historyLength);
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

    // Transition back if input-required — check for payment proof first
    if (existingTask.status.state === 'input-required') {
      const proof = extractPaymentProof(message.parts);
      if (proof && supabase && tenantId) {
        // Payment proof submitted — verify it
        const paymentHandler = new A2APaymentHandler(supabase, tenantId, taskService);
        const result = await paymentHandler.processPayment(taskId as string, proof);
        if (!result.verified) {
          // Payment verification failed — stay input-required, add error
          await taskService.addMessage(taskId as string, 'agent', [
            { text: `Payment verification failed: ${result.error || 'Unknown error'}. Please try again.` },
          ]);
          const errorTask = await taskService.getTask(taskId as string, configuration?.historyLength);
          return { jsonrpc: '2.0', result: errorTask, id: request.id };
        }
        // Payment verified — processPayment already linked the transfer and transitioned to 'working'
        // Now transition to 'submitted' so the worker re-processes with the linked transfer
        await taskService.updateTaskState(taskId as string, 'submitted', 'Payment verified, re-processing');
      } else {
        // Regular follow-up message — transition to submitted for worker re-processing
        await taskService.updateTaskState(taskId as string, 'submitted', 'Processing new input');
      }
    }

    const updatedTask = await taskService.getTask(taskId as string, configuration?.historyLength);
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
        const proof = extractPaymentProof(message.parts);
        if (proof && supabase && tenantId) {
          const paymentHandler = new A2APaymentHandler(supabase, tenantId, taskService);
          const result = await paymentHandler.processPayment(existingTask.id, proof);
          if (!result.verified) {
            await taskService.addMessage(existingTask.id, 'agent', [
              { text: `Payment verification failed: ${result.error || 'Unknown error'}. Please try again.` },
            ]);
            const errorTask = await taskService.getTask(existingTask.id, configuration?.historyLength);
            return { jsonrpc: '2.0', result: errorTask, id: request.id };
          }
          await taskService.updateTaskState(existingTask.id, 'submitted', 'Payment verified, re-processing');
        } else {
          await taskService.updateTaskState(existingTask.id, 'submitted', 'Processing new input');
        }
      }

      const updatedTask = await taskService.getTask(existingTask.id, configuration?.historyLength);
      return {
        jsonrpc: '2.0',
        result: updatedTask,
        id: request.id,
      };
    }
  }

  // Create new task
  const callbackUrl = configuration?.callbackUrl;
  const callbackSecret = configuration?.callbackSecret;
  const task = await taskService.createTask(
    agentId,
    { role, parts: message.parts, metadata: message.metadata },
    contextId,
    'inbound',
    undefined,
    undefined,
    callbackUrl,
    callbackSecret,
  );

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

/**
 * tasks/list — List tasks for an agent.
 */
async function handleTasksList(
  request: A2AJsonRpcRequest,
  agentId: string,
  taskService: A2ATaskService,
): Promise<A2AJsonRpcResponse> {
  const params = request.params || {};
  const page = (params.page as number) || 1;
  const limit = (params.limit as number) || 20;
  const state = params.state as string | undefined;

  const result = await taskService.listTasks({
    agentId,
    state: state as any,
    page,
    limit,
  });

  return {
    jsonrpc: '2.0',
    result,
    id: request.id,
  };
}
