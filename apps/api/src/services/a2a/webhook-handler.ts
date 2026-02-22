/**
 * A2A Webhook Handler (Stories 58.5 + 58.6)
 *
 * Dispatches A2A tasks to external webhook endpoints, manages HMAC signing,
 * retry with exponential backoff, and dead-letter queue.
 *
 * Reuses the HMAC signing pattern from WebhookService but tracks delivery
 * state inline on `a2a_tasks` (one webhook target per task).
 */

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookConfig, WebhookDeliveryStatus } from './types.js';

// Retry delays in seconds: 30s, 2m, 5m, 15m, 1h (faster than general webhooks)
const RETRY_DELAYS = [30, 120, 300, 900, 3600];

const MAX_WEBHOOK_ATTEMPTS = 5;

const MAX_RESPONSE_BODY_LENGTH = 1000;

export interface WebhookDispatchResult {
  success: boolean;
  responseCode?: number;
  responseBody?: string;
  responseTimeMs: number;
  error?: string;
}

export class A2AWebhookHandler {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Dispatch a task to the agent's webhook callback URL.
   * Returns the result of the HTTP call.
   */
  async dispatch(
    task: { id: string; tenant_id: string; agent_id: string; state: string; context_id?: string | null },
    config: WebhookConfig,
    deliveryId: string,
  ): Promise<WebhookDispatchResult> {
    const startTime = Date.now();

    // Build payload
    const payload = await this.buildPayload(task, deliveryId);
    const payloadJson = JSON.stringify(payload);

    // Sign if secret provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Sly-A2A-Webhooks/1.0',
      'X-Sly-Event': 'task.submitted',
      'X-Sly-Delivery': deliveryId,
    };

    if (config.callbackSecret) {
      headers['X-Sly-Signature'] = this.signPayload(payloadJson, config.callbackSecret);
    }

    const timeoutMs = config.timeoutMs || 30000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(config.callbackUrl, {
        method: 'POST',
        headers,
        body: payloadJson,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;
      const responseBody = await response.text();

      if (response.ok) {
        return {
          success: true,
          responseCode: response.status,
          responseBody: responseBody.slice(0, MAX_RESPONSE_BODY_LENGTH),
          responseTimeMs,
        };
      }

      return {
        success: false,
        responseCode: response.status,
        responseBody: responseBody.slice(0, MAX_RESPONSE_BODY_LENGTH),
        responseTimeMs,
        error: `HTTP ${response.status}: ${responseBody.slice(0, 200)}`,
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - startTime;
      return {
        success: false,
        responseTimeMs,
        error: err.name === 'AbortError'
          ? `Timeout after ${timeoutMs}ms`
          : err.message || 'Network error',
      };
    }
  }

  /**
   * Record a successful webhook delivery.
   */
  async recordSuccess(
    taskId: string,
    result: WebhookDispatchResult,
  ): Promise<void> {
    await this.supabase
      .from('a2a_tasks')
      .update({
        webhook_status: 'delivered' as WebhookDeliveryStatus,
        webhook_last_response_code: result.responseCode || null,
        webhook_last_response_body: result.responseBody || null,
        webhook_last_response_time_ms: result.responseTimeMs,
        webhook_last_attempt_at: new Date().toISOString(),
        webhook_next_retry_at: null,
      })
      .eq('id', taskId);

    console.log(
      `[A2A Webhook] Delivered task ${taskId.slice(0, 8)} ` +
      `(${result.responseCode}, ${result.responseTimeMs}ms)`,
    );
  }

  /**
   * Record a failed webhook delivery. Schedules retry or moves to DLQ.
   */
  async recordFailure(
    taskId: string,
    tenantId: string,
    result: WebhookDispatchResult,
    currentAttempts: number,
    maxRetries: number = MAX_WEBHOOK_ATTEMPTS,
  ): Promise<void> {
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= maxRetries) {
      // Move to DLQ
      const dlqReason = `Max retries exceeded (${maxRetries}). Last error: ${result.error || result.responseBody || 'unknown'}`;

      await this.supabase
        .from('a2a_tasks')
        .update({
          webhook_status: 'dlq' as WebhookDeliveryStatus,
          webhook_attempts: newAttempts,
          webhook_last_response_code: result.responseCode || null,
          webhook_last_response_body: result.responseBody || null,
          webhook_last_response_time_ms: result.responseTimeMs,
          webhook_last_attempt_at: new Date().toISOString(),
          webhook_next_retry_at: null,
          webhook_dlq_at: new Date().toISOString(),
          webhook_dlq_reason: dlqReason,
          state: 'failed',
          error_details: { message: dlqReason, type: 'webhook_dlq' },
        })
        .eq('id', taskId);

      console.error(
        `[A2A Webhook] Task ${taskId.slice(0, 8)} moved to DLQ after ${newAttempts} attempts`,
      );
    } else {
      // Schedule retry with exponential backoff
      const delaySeconds = RETRY_DELAYS[Math.min(newAttempts - 1, RETRY_DELAYS.length - 1)];
      const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

      await this.supabase
        .from('a2a_tasks')
        .update({
          webhook_status: 'failed' as WebhookDeliveryStatus,
          webhook_attempts: newAttempts,
          webhook_next_retry_at: nextRetryAt,
          webhook_last_response_code: result.responseCode || null,
          webhook_last_response_body: result.responseBody || null,
          webhook_last_response_time_ms: result.responseTimeMs,
          webhook_last_attempt_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      console.warn(
        `[A2A Webhook] Task ${taskId.slice(0, 8)} failed ` +
        `(attempt ${newAttempts}/${maxRetries}). Retry in ${delaySeconds}s. ` +
        `Error: ${(result.error || '').slice(0, 100)}`,
      );
    }
  }

  /**
   * Retry a task from the DLQ. Resets it to `submitted` with cleared webhook fields
   * so the worker re-claims and re-dispatches it on the next poll.
   */
  async retryFromDlq(taskId: string, tenantId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('a2a_tasks')
      .update({
        state: 'submitted',
        webhook_status: null,
        webhook_delivery_id: null,
        webhook_attempts: 0,
        webhook_next_retry_at: null,
        webhook_last_response_code: null,
        webhook_last_response_body: null,
        webhook_last_response_time_ms: null,
        webhook_last_attempt_at: null,
        webhook_dlq_at: null,
        webhook_dlq_reason: null,
        processor_id: null,
        processing_started_at: null,
        processing_completed_at: null,
        processing_duration_ms: null,
        error_details: null,
      })
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .eq('webhook_status', 'dlq')
      .select('id')
      .single();

    if (error || !data) {
      return false;
    }

    console.log(`[A2A Webhook] Task ${taskId.slice(0, 8)} retried from DLQ`);
    return true;
  }

  /**
   * Sign payload with HMAC-SHA256.
   * Format: "t=timestamp,v1=signature" (matches existing WebhookService pattern).
   */
  signPayload(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Build the webhook payload for a task dispatch.
   */
  private async buildPayload(
    task: { id: string; tenant_id: string; agent_id: string; state: string; context_id?: string | null },
    deliveryId: string,
  ): Promise<Record<string, unknown>> {
    // Fetch full task with messages and artifacts
    const { data: messages } = await this.supabase
      .from('a2a_messages')
      .select('id, role, parts, metadata, created_at')
      .eq('task_id', task.id)
      .eq('tenant_id', task.tenant_id)
      .order('created_at', { ascending: true });

    const { data: artifacts } = await this.supabase
      .from('a2a_artifacts')
      .select('id, label, mime_type, parts, metadata, created_at')
      .eq('task_id', task.id)
      .eq('tenant_id', task.tenant_id)
      .order('created_at', { ascending: true });

    return {
      event: 'task.submitted',
      task: {
        id: task.id,
        agentId: task.agent_id,
        contextId: task.context_id || undefined,
        status: task.state,
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
      },
      timestamp: new Date().toISOString(),
      webhookId: deliveryId,
    };
  }
}
