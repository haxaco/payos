/**
 * A2A Completion Webhook Service (Story 58.16)
 *
 * Listens for terminal state events on the TaskEventBus and delivers
 * completion notifications to caller-provided callback URLs.
 *
 * This is distinct from the dispatch webhooks (Stories 58.5/58.6) which push
 * tasks *to* external agents. Completion webhooks push the *result* back
 * to the caller who submitted the task.
 */

import crypto from 'crypto';
import { createClient } from '../../db/client.js';
import { taskEventBus } from './task-event-bus.js';
import type { TaskStreamEvent } from './task-event-bus.js';

const RETRY_DELAYS = [30, 120, 300, 900, 3600]; // seconds
const MAX_ATTEMPTS = 5;
const MAX_RESPONSE_BODY = 1000;
const DELIVERY_TIMEOUT_MS = 30000;

export class CompletionWebhookService {
  private listening = false;

  /**
   * Start listening for terminal state events globally.
   * Called once at app startup.
   */
  start(): void {
    if (this.listening) return;
    this.listening = true;
    taskEventBus.on('task:terminal', (event: TaskStreamEvent) => {
      this.handleTerminalEvent(event).catch((err) => {
        console.error('[Completion Webhook] Error handling terminal event:', err.message);
      });
    });
    console.log('[Completion Webhook] Service started — listening for terminal task events');
  }

  /**
   * Handle a terminal status event — look up callback_url and deliver.
   */
  private async handleTerminalEvent(event: TaskStreamEvent): Promise<void> {
    const taskId = event.taskId;
    const state = event.data.state as string;
    const supabase = createClient();

    // Fetch task's callback_url from DB
    const { data: task, error } = await supabase
      .from('a2a_tasks')
      .select('id, tenant_id, callback_url, callback_secret, callback_status')
      .eq('id', taskId)
      .single();

    if (error || !task) return;
    if (!task.callback_url) return;
    // Don't re-deliver if already delivered
    if (task.callback_status === 'delivered') return;

    // Build and deliver
    const payload = await this.buildPayload(taskId, task.tenant_id, state);
    const payloadJson = JSON.stringify(payload);
    const result = await this.deliver(task.callback_url, payloadJson, task.callback_secret || undefined);

    await this.recordResult(taskId, result.success, result.statusCode, result.error);
  }

  /**
   * Build completion payload with full task data.
   */
  private async buildPayload(
    taskId: string,
    tenantId: string,
    state: string,
  ): Promise<Record<string, unknown>> {
    const supabase = createClient();

    // Fetch task row
    const { data: taskRow } = await supabase
      .from('a2a_tasks')
      .select('id, agent_id, context_id, state, status_message, metadata')
      .eq('id', taskId)
      .single();

    // Fetch messages
    const { data: messages } = await supabase
      .from('a2a_messages')
      .select('id, role, parts, metadata, created_at')
      .eq('task_id', taskId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    // Fetch artifacts
    const { data: artifacts } = await supabase
      .from('a2a_artifacts')
      .select('id, label, mime_type, parts, metadata, created_at')
      .eq('task_id', taskId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    const eventName = `task.${state}`;

    return {
      event: eventName,
      task: {
        id: taskId,
        agentId: taskRow?.agent_id,
        contextId: taskRow?.context_id || undefined,
        status: {
          state: taskRow?.state || state,
          message: taskRow?.status_message || undefined,
        },
        history: (messages || []).map((m: any) => ({
          messageId: m.id,
          role: m.role,
          parts: m.parts,
          metadata: m.metadata || undefined,
        })),
        artifacts: (artifacts || []).map((a: any) => ({
          artifactId: a.id,
          name: a.label || undefined,
          mediaType: a.mime_type,
          parts: a.parts,
          metadata: a.metadata || undefined,
        })),
        metadata: taskRow?.metadata || undefined,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sign payload with HMAC-SHA256 (same format as A2AWebhookHandler).
   */
  private signPayload(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Deliver the webhook. Returns success/failure.
   */
  private async deliver(
    url: string,
    payload: string,
    secret?: string,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Sly-Completion-Webhooks/1.0',
    };

    // Parse event from payload for the header
    try {
      const parsed = JSON.parse(payload);
      headers['X-Sly-Event'] = parsed.event || 'task.completed';
    } catch {
      headers['X-Sly-Event'] = 'task.completed';
    }

    if (secret) {
      headers['X-Sly-Signature'] = this.signPayload(payload, secret);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      const body = await response.text();
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${body.slice(0, 200)}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'AbortError'
          ? `Timeout after ${DELIVERY_TIMEOUT_MS}ms`
          : err.message || 'Network error',
      };
    }
  }

  /**
   * Record delivery result and schedule retry if needed.
   */
  private async recordResult(
    taskId: string,
    success: boolean,
    statusCode?: number,
    error?: string,
  ): Promise<void> {
    const supabase = createClient();

    if (success) {
      await supabase
        .from('a2a_tasks')
        .update({
          callback_status: 'delivered',
          callback_attempts: supabase.rpc ? 1 : 1, // At least 1
          callback_last_attempt_at: new Date().toISOString(),
          callback_last_response_code: statusCode || null,
          callback_next_retry_at: null,
        })
        .eq('id', taskId);

      console.log(
        `[Completion Webhook] Delivered for task ${taskId.slice(0, 8)} (${statusCode})`,
      );
      return;
    }

    // Failure — get current attempts and schedule retry
    const { data: task } = await supabase
      .from('a2a_tasks')
      .select('callback_attempts')
      .eq('id', taskId)
      .single();

    const currentAttempts = (task as any)?.callback_attempts || 0;
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      // Max retries reached — mark as permanently failed
      await supabase
        .from('a2a_tasks')
        .update({
          callback_status: 'failed',
          callback_attempts: newAttempts,
          callback_last_attempt_at: new Date().toISOString(),
          callback_last_response_code: statusCode || null,
          callback_next_retry_at: null,
        })
        .eq('id', taskId);

      console.error(
        `[Completion Webhook] Task ${taskId.slice(0, 8)} callback failed permanently after ${newAttempts} attempts`,
      );
    } else {
      // Schedule retry with exponential backoff
      const delaySeconds = RETRY_DELAYS[Math.min(newAttempts - 1, RETRY_DELAYS.length - 1)];
      const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

      await supabase
        .from('a2a_tasks')
        .update({
          callback_status: 'failed',
          callback_attempts: newAttempts,
          callback_last_attempt_at: new Date().toISOString(),
          callback_last_response_code: statusCode || null,
          callback_next_retry_at: nextRetryAt,
        })
        .eq('id', taskId);

      console.warn(
        `[Completion Webhook] Task ${taskId.slice(0, 8)} callback failed ` +
        `(attempt ${newAttempts}/${MAX_ATTEMPTS}). Retry in ${delaySeconds}s. ` +
        `Error: ${(error || '').slice(0, 100)}`,
      );
    }
  }

  /**
   * Retry delivery for a specific task. Called by the worker's retry poll.
   */
  async retryDelivery(task: {
    id: string;
    tenant_id: string;
    callback_url: string;
    callback_secret: string | null;
    callback_attempts: number;
  }): Promise<void> {
    const payload = await this.buildPayload(task.id, task.tenant_id, 'completed');

    // Re-fetch actual state
    const supabase = createClient();
    const { data: taskRow } = await supabase
      .from('a2a_tasks')
      .select('state')
      .eq('id', task.id)
      .single();

    if (taskRow?.state) {
      (payload as any).event = `task.${taskRow.state}`;
      (payload as any).task.status.state = taskRow.state;
    }

    const payloadJson = JSON.stringify(payload);
    const result = await this.deliver(task.callback_url, payloadJson, task.callback_secret || undefined);
    await this.recordResult(task.id, result.success, result.statusCode, result.error);
  }
}

export const completionWebhooks = new CompletionWebhookService();
completionWebhooks.start();
