/**
 * A2A Task Processor
 *
 * Picks up submitted tasks and processes them through the full lifecycle:
 *   submitted → working → completed (or failed)
 *
 * For payment-related tasks, demonstrates the payment-gated flow:
 *   submitted → input-required (payment needed) → working → completed
 *
 * This is a simple rule-based processor. In production, you'd replace
 * the intent parsing with an LLM (Claude, etc.) that has access to
 * Sly's tools (transfers, wallets, streams, etc.).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { A2ATaskService } from './task-service.js';
import { A2APaymentHandler } from './payment-handler.js';
import type { A2ATask } from './types.js';

interface ProcessorConfig {
  /** Poll interval in ms (default: 5000) */
  pollInterval?: number;
  /** Only process tasks for this agent */
  agentId?: string;
  /** Enable payment gating for amounts > threshold */
  paymentThreshold?: number;
}

export class A2ATaskProcessor {
  private supabase: SupabaseClient;
  private tenantId: string;
  private taskService: A2ATaskService;
  private paymentHandler: A2APaymentHandler;
  private config: Required<ProcessorConfig>;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(supabase: SupabaseClient, tenantId: string, config: ProcessorConfig = {}) {
    this.supabase = supabase;
    this.tenantId = tenantId;
    this.taskService = new A2ATaskService(supabase, tenantId);
    this.paymentHandler = new A2APaymentHandler(supabase, tenantId, this.taskService);
    this.config = {
      pollInterval: config.pollInterval ?? 5000,
      agentId: config.agentId ?? '',
      paymentThreshold: config.paymentThreshold ?? 500,
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log(`[A2A Processor] Started (poll: ${this.config.pollInterval}ms, agent: ${this.config.agentId || 'all'})`);
    this.poll();
    this.timer = setInterval(() => this.poll(), this.config.pollInterval);
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[A2A Processor] Stopped');
  }

  private async poll() {
    try {
      // Find submitted tasks
      const { data: tasks } = await this.supabase
        .from('a2a_tasks')
        .select('id, agent_id, state, context_id')
        .eq('tenant_id', this.tenantId)
        .eq('state', 'submitted')
        .eq('direction', 'inbound')
        .order('created_at', { ascending: true })
        .limit(10);

      if (!tasks?.length) return;

      for (const row of tasks) {
        if (this.config.agentId && row.agent_id !== this.config.agentId) continue;
        await this.processTask(row.id);
      }
    } catch (err: any) {
      console.error('[A2A Processor] Poll error:', err.message);
    }
  }

  /**
   * Process a single task through the full lifecycle.
   */
  async processTask(taskId: string): Promise<A2ATask | null> {
    const task = await this.taskService.getTask(taskId);
    if (!task) return null;

    console.log(`[A2A Processor] Processing task ${taskId.slice(0, 8)}... (${task.messages.length} messages)`);

    // Transition to working
    await this.taskService.updateTaskState(taskId, 'working', 'Processing task');

    // Parse intent from messages
    const lastUserMsg = [...task.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      await this.taskService.updateTaskState(taskId, 'failed', 'No user message found');
      return this.taskService.getTask(taskId);
    }

    const text = lastUserMsg.parts
      .filter((p) => p.kind === 'text')
      .map((p) => (p as any).text)
      .join(' ');

    const intent = this.parseIntent(text);
    console.log(`[A2A Processor] Intent: ${intent.action} (amount: ${intent.amount} ${intent.currency})`);

    try {
      switch (intent.action) {
        case 'payment':
          return await this.handlePayment(taskId, intent);
        case 'balance':
          return await this.handleBalance(taskId, intent);
        case 'stream':
          return await this.handleStream(taskId, intent);
        case 'info':
          return await this.handleInfo(taskId, task);
        default:
          return await this.handleGeneric(taskId, text);
      }
    } catch (err: any) {
      console.error(`[A2A Processor] Error processing ${taskId.slice(0, 8)}:`, err.message);
      await this.taskService.updateTaskState(taskId, 'failed', err.message);
      await this.taskService.addMessage(taskId, 'agent', [
        { kind: 'text', text: `Task failed: ${err.message}` },
      ]);
      return this.taskService.getTask(taskId);
    }
  }

  // ─── Intent Parsing ───────────────────────────────────────

  private parseIntent(text: string): {
    action: string;
    amount: number;
    currency: string;
    destination?: string;
    description?: string;
  } {
    const lower = text.toLowerCase();

    // Extract amount
    const amountMatch = text.match(/[\$]?([\d,]+(?:\.\d{1,2})?)\s*(?:USDC|USD|BRL|MXN)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;

    // Extract currency
    const currMatch = text.match(/\b(USDC|USD|BRL|MXN)\b/i);
    const currency = currMatch ? currMatch[1].toUpperCase() : 'USDC';

    // Determine action (more specific intents first)
    if (lower.includes('stream') || lower.includes('per second') || lower.includes('flow rate')) {
      return { action: 'stream', amount, currency };
    }
    if (lower.includes('balance') || lower.includes('wallet') || lower.includes('funds')) {
      return { action: 'balance', amount, currency };
    }
    if (lower.includes('send') || lower.includes('pay') || lower.includes('transfer') || lower.includes('remit')) {
      return { action: 'payment', amount, currency, description: text };
    }
    if (lower.includes('status') || lower.includes('info') || lower.includes('capabilities') || lower.includes('who are you')) {
      return { action: 'info', amount, currency };
    }

    return { action: 'generic', amount, currency, description: text };
  }

  // ─── Action Handlers ──────────────────────────────────────

  private async handlePayment(
    taskId: string,
    intent: { amount: number; currency: string; description?: string },
  ): Promise<A2ATask | null> {
    // If amount exceeds threshold, require payment first
    if (intent.amount > this.config.paymentThreshold) {
      console.log(`[A2A Processor] Payment required: ${intent.amount} ${intent.currency} > threshold ${this.config.paymentThreshold}`);
      await this.paymentHandler.requirePayment(taskId, {
        amount: intent.amount,
        currency: intent.currency,
        description: intent.description,
        x402Endpoint: 'http://localhost:4000/v1/x402/pay',
      });
      return this.taskService.getTask(taskId);
    }

    // Small amount — process directly
    await this.taskService.addMessage(taskId, 'agent', [
      {
        kind: 'text',
        text: `Processing payment of ${intent.amount} ${intent.currency}. Transfer initiated via ${intent.currency === 'BRL' ? 'Pix' : intent.currency === 'MXN' ? 'SPEI' : 'x402'} rail. Estimated settlement: ${intent.currency === 'USDC' ? 'instant' : '< 30 minutes'}.`,
      },
      {
        kind: 'data',
        data: {
          type: 'transfer_initiated',
          amount: intent.amount,
          currency: intent.currency,
          rail: intent.currency === 'BRL' ? 'pix' : intent.currency === 'MXN' ? 'spei' : 'x402',
          estimatedSettlement: intent.currency === 'USDC' ? 'instant' : '< 30 minutes',
          mockTransferId: `txn_${Date.now()}`,
        },
        mimeType: 'application/json',
      },
    ]);

    await this.taskService.updateTaskState(taskId, 'completed', 'Payment processed');

    // Add artifact with transfer receipt
    await this.taskService.addArtifact(taskId, `receipt-${taskId.slice(0, 8)}`, [
      {
        kind: 'data',
        data: {
          receipt: true,
          amount: intent.amount,
          currency: intent.currency,
          status: 'completed',
          processedAt: new Date().toISOString(),
        },
        mimeType: 'application/json',
      },
    ]);

    return this.taskService.getTask(taskId);
  }

  private async handleBalance(taskId: string, intent: { currency: string }): Promise<A2ATask | null> {
    // Look up wallet balance (mock for now)
    const mockBalance = {
      USDC: 12500.00,
      BRL: 62450.75,
      MXN: 185200.50,
      USD: 8750.00,
    };

    const balance = mockBalance[intent.currency as keyof typeof mockBalance] || 0;

    await this.taskService.addMessage(taskId, 'agent', [
      {
        kind: 'text',
        text: `Current wallet balance: ${balance.toLocaleString()} ${intent.currency}. Available for transfers.`,
      },
      {
        kind: 'data',
        data: {
          type: 'balance_check',
          currency: intent.currency,
          balance,
          available: balance,
          timestamp: new Date().toISOString(),
        },
        mimeType: 'application/json',
      },
    ]);

    await this.taskService.updateTaskState(taskId, 'completed', 'Balance checked');
    return this.taskService.getTask(taskId);
  }

  private async handleStream(taskId: string, intent: { amount: number; currency: string }): Promise<A2ATask | null> {
    const flowRate = intent.amount || 0.01;

    await this.taskService.addMessage(taskId, 'agent', [
      {
        kind: 'text',
        text: `Payment stream configured: ${flowRate} ${intent.currency}/second. Stream will begin once funded. Estimated daily flow: ${(flowRate * 86400).toFixed(2)} ${intent.currency}.`,
      },
      {
        kind: 'data',
        data: {
          type: 'stream_configured',
          flowRate,
          currency: intent.currency,
          dailyFlow: flowRate * 86400,
          status: 'configured',
        },
        mimeType: 'application/json',
      },
    ]);

    await this.taskService.updateTaskState(taskId, 'completed', 'Stream configured');
    return this.taskService.getTask(taskId);
  }

  private async handleInfo(taskId: string, task: A2ATask): Promise<A2ATask | null> {
    // Look up the agent
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id, name, description, kya_tier, status, permissions')
      .eq('id', (task as any).agentId || task.id)
      .eq('tenant_id', this.tenantId)
      .single();

    const info = agent
      ? `I am ${agent.name} (KYA Tier ${agent.kya_tier}). ${agent.description || 'Sly payment agent.'} I can process payments, check balances, and manage payment streams.`
      : 'I am a Sly payment agent. I can process payments (x402, Pix, SPEI), check wallet balances, and create payment streams.';

    await this.taskService.addMessage(taskId, 'agent', [
      { kind: 'text', text: info },
    ]);

    await this.taskService.updateTaskState(taskId, 'completed', 'Info provided');
    return this.taskService.getTask(taskId);
  }

  private async handleGeneric(taskId: string, text: string): Promise<A2ATask | null> {
    await this.taskService.addMessage(taskId, 'agent', [
      {
        kind: 'text',
        text: `I received your message. I can help with:\n- **Payments**: "Send 500 USDC to Brazil"\n- **Balance checks**: "Check my USDC balance"\n- **Streams**: "Create a stream at 0.01 USDC/second"\n- **Agent info**: "What are your capabilities?"\n\nPlease let me know what you'd like to do.`,
      },
    ]);

    await this.taskService.updateTaskState(taskId, 'completed', 'Help response sent');
    return this.taskService.getTask(taskId);
  }
}
