/**
 * A2A Client (Outbound)
 *
 * Client for sending messages to remote A2A v1.0 agents.
 * Handles discovery, message sending, polling, and payment flows.
 *
 * @see Epic 57: Google A2A Protocol Integration
 */

import type {
  A2AAgentCard,
  A2AJsonRpcRequest,
  A2AJsonRpcResponse,
  A2APart,
} from './types.js';

interface SendMessageInput {
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

export class A2AClient {
  private defaultTimeout = 10000; // 10s

  /**
   * Discover a remote agent by fetching its Agent Card.
   */
  async discover(url: string): Promise<A2AAgentCard> {
    const wellKnownUrl = (url.endsWith('/agent.json') || url.endsWith('/card'))
      ? url
      : `${url.replace(/\/$/, '')}/.well-known/agent.json`;

    const response = await fetch(wellKnownUrl, {
      headers: {
        'Accept': 'application/json, application/a2a+json',
        'A2A-Version': '1.0',
      },
      signal: AbortSignal.timeout(this.defaultTimeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to discover agent at ${wellKnownUrl}: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Send a message to a remote A2A agent (v1.0: message/send).
   */
  async sendMessage(
    remoteUrl: string,
    message: SendMessageInput,
    contextId?: string,
    auth?: string,
  ): Promise<A2AJsonRpcResponse> {
    const rpcRequest: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'message/send',
      params: {
        message,
        ...(contextId ? { contextId } : {}),
      },
      id: crypto.randomUUID(),
    };

    return this.sendRpc(remoteUrl, rpcRequest, auth);
  }

  /**
   * Get a task from a remote A2A agent.
   */
  async getTask(
    remoteUrl: string,
    taskId: string,
    auth?: string,
  ): Promise<A2AJsonRpcResponse> {
    const rpcRequest: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'tasks/get',
      params: { id: taskId },
      id: crypto.randomUUID(),
    };

    return this.sendRpc(remoteUrl, rpcRequest, auth);
  }

  /**
   * Cancel a task on a remote A2A agent.
   */
  async cancelTask(
    remoteUrl: string,
    taskId: string,
    auth?: string,
  ): Promise<A2AJsonRpcResponse> {
    const rpcRequest: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'tasks/cancel',
      params: { id: taskId },
      id: crypto.randomUUID(),
    };

    return this.sendRpc(remoteUrl, rpcRequest, auth);
  }

  /**
   * Send a JSON-RPC request to a remote A2A endpoint.
   */
  private async sendRpc(
    url: string,
    request: A2AJsonRpcRequest,
    auth?: string,
  ): Promise<A2AJsonRpcResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'A2A-Version': '1.0',
    };

    if (auth) {
      headers['Authorization'] = `Bearer ${auth}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.defaultTimeout),
    });

    if (!response.ok) {
      throw new Error(`A2A RPC failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
