/**
 * Approval Workflow Service
 * 
 * Story 18.R2: Manages the approval workflow for high-value agent payments.
 * 
 * When a payment exceeds the spending policy's approval threshold,
 * instead of rejecting it outright, we create an approval request
 * that a human can review and approve/reject.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { PolicyContext } from './spending-policy.js';
import { trackOp } from './ops/track-op.js';
import { OpType } from './ops/operation-types.js';
import { createNotification } from './notifications.js';
import { webhookService } from './webhooks.js';

// ============================================
// Types
// ============================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';
export type PaymentProtocol = 'x402' | 'ap2' | 'acp' | 'ucp' | 'mpp';

export interface ApprovalRecipient {
  // x402
  endpoint_id?: string;
  endpoint_path?: string;
  vendor?: string;
  // AP2
  mandate_id?: string;
  merchant?: string;
  // ACP
  checkout_id?: string;
  merchant_id?: string;
  merchant_name?: string;
  // UCP
  corridor?: string;
  settlement_id?: string;
  // MPP
  mppServiceUrl?: string;
  mppSessionId?: string;
  // Common
  name?: string;
  address?: string;
}

export interface PaymentApproval {
  id: string;
  tenantId: string;
  walletId: string;
  agentId?: string;
  
  protocol: PaymentProtocol;
  amount: number;
  currency: string;
  
  recipient: ApprovalRecipient | null;
  paymentContext: Record<string, unknown>;
  
  status: ApprovalStatus;
  expiresAt: string;
  
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
  
  executedTransferId?: string;
  executedAt?: string;
  executionError?: string;
  
  requestedByType?: string;
  requestedById?: string;
  requestedByName?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequest {
  tenantId: string;
  walletId: string;
  agentId?: string;

  protocol: PaymentProtocol;
  amount: number;
  currency: string;

  recipient?: ApprovalRecipient;
  paymentContext: Record<string, unknown>;

  expiresInMinutes?: number; // Default: 24 hours (1440 minutes)

  requestedByType?: string;
  requestedById?: string;
  requestedByName?: string;

  correlationId?: string;
}

export interface ApprovalDecision {
  approvalId: string;
  decision: 'approve' | 'reject';
  decidedBy: string;
  reason?: string;
}

export interface ApprovalListOptions {
  status?: ApprovalStatus | ApprovalStatus[];
  walletId?: string;
  agentId?: string;
  protocol?: PaymentProtocol;
  limit?: number;
  offset?: number;
}

// ============================================
// Approval Workflow Service
// ============================================

export class ApprovalWorkflowService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new approval request for a payment that exceeds thresholds.
   */
  async createApproval(request: CreateApprovalRequest): Promise<PaymentApproval> {
    const expiresInMs = (request.expiresInMinutes || 1440) * 60 * 1000; // Default 24 hours
    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

    const { data, error } = await this.supabase
      .from('agent_payment_approvals')
      .insert({
        id: randomUUID(),
        tenant_id: request.tenantId,
        wallet_id: request.walletId,
        agent_id: request.agentId || null,
        protocol: request.protocol,
        amount: request.amount,
        currency: request.currency,
        recipient: request.recipient || null,
        payment_context: request.paymentContext,
        status: 'pending',
        expires_at: expiresAt,
        requested_by_type: request.requestedByType,
        requested_by_id: request.requestedById,
        requested_by_name: request.requestedByName,
      })
      .select()
      .single();

    if (error) {
      console.error('[ApprovalWorkflow] Failed to create approval:', error);
      throw new Error(`Failed to create approval: ${error.message}`);
    }

    const approval = this.mapFromDb(data);

    trackOp({
      tenantId: request.tenantId,
      operation: OpType.GOVERNANCE_APPROVAL,
      subject: `approval/${approval.id}`,
      correlationId: request.correlationId,
      success: true,
      amountUsd: request.amount,
      currency: request.currency,
      data: { action: 'created', protocol: request.protocol, walletId: request.walletId, agentId: request.agentId },
    });

    // Send webhook notification (fire and forget)
    this.sendApprovalWebhook(approval, 'payment.approval_required').catch(err => {
      console.error('[ApprovalWorkflow] Failed to send webhook:', err);
    });

    // In-app notification (fire-and-forget, tenant-wide).
    const requester = approval.requestedByName || 'An agent';
    const recipientLabel =
      approval.recipient?.merchant_name ||
      approval.recipient?.merchant ||
      approval.recipient?.vendor ||
      approval.recipient?.name;
    const recipientSuffix = recipientLabel ? ` to ${recipientLabel}` : '';
    createNotification({
      tenantId: approval.tenantId,
      type: 'compliance',
      title: 'Approval required',
      message: `${requester} requested approval for a ${approval.amount} ${approval.currency} ${approval.protocol} payment${recipientSuffix}`,
      href: '/dashboard/approvals',
      metadata: { approvalId: approval.id, protocol: approval.protocol, agentId: approval.agentId },
    }).catch(err => console.error('[notifications] approval required notify error:', err));

    return approval;
  }

  /**
   * Get an approval by ID.
   */
  async getApproval(approvalId: string, tenantId: string): Promise<PaymentApproval | null> {
    const { data, error } = await this.supabase
      .from('agent_payment_approvals')
      .select('*')
      .eq('id', approvalId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapFromDb(data);
  }

  /**
   * List approvals with filtering options.
   */
  async listApprovals(
    tenantId: string,
    options: ApprovalListOptions = {}
  ): Promise<{ data: PaymentApproval[]; total: number }> {
    let query = this.supabase
      .from('agent_payment_approvals')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    if (options.walletId) {
      query = query.eq('wallet_id', options.walletId);
    }

    if (options.agentId) {
      query = query.eq('agent_id', options.agentId);
    }

    if (options.protocol) {
      query = query.eq('protocol', options.protocol);
    }

    // Pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ApprovalWorkflow] Failed to list approvals:', error);
      throw new Error(`Failed to list approvals: ${error.message}`);
    }

    return {
      data: (data || []).map(row => this.mapFromDb(row)),
      total: count || 0
    };
  }

  /**
   * Approve or reject an approval request.
   */
  async decide(decision: ApprovalDecision): Promise<PaymentApproval> {
    // First, fetch the approval to verify it exists and is pending
    const { data: existing, error: fetchError } = await this.supabase
      .from('agent_payment_approvals')
      .select('*')
      .eq('id', decision.approvalId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Approval not found');
    }

    if (existing.status !== 'pending') {
      throw new Error(`Approval is not pending (current status: ${existing.status})`);
    }

    // Check if expired
    if (new Date(existing.expires_at) < new Date()) {
      // Mark as expired
      await this.supabase
        .from('agent_payment_approvals')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', decision.approvalId);

      throw new Error('Approval has expired');
    }

    const newStatus = decision.decision === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('agent_payment_approvals')
      .update({
        status: newStatus,
        decided_by: decision.decidedBy,
        decided_at: now,
        decision_reason: decision.reason || null,
        updated_at: now
      })
      .eq('id', decision.approvalId)
      .select()
      .single();

    if (error) {
      console.error('[ApprovalWorkflow] Failed to update approval:', error);
      throw new Error(`Failed to update approval: ${error.message}`);
    }

    const approval = this.mapFromDb(data);

    trackOp({
      tenantId: approval.tenantId,
      operation: OpType.GOVERNANCE_APPROVAL,
      subject: `approval/${approval.id}`,
      success: true,
      amountUsd: approval.amount,
      currency: approval.currency,
      data: {
        action: decision.decision === 'approve' ? 'approved' : 'rejected',
        decidedBy: decision.decidedBy,
        reason: decision.reason,
        protocol: approval.protocol,
        walletId: approval.walletId,
        agentId: approval.agentId,
      },
    });

    // Send webhook notification (decided = approved or rejected)
    this.sendApprovalWebhook(approval, 'payment.approval_decided').catch(err => {
      console.error('[ApprovalWorkflow] Failed to send webhook:', err);
    });

    return approval;
  }

  /**
   * Mark an approval as executed after successful payment.
   */
  async markExecuted(
    approvalId: string,
    transferId: string
  ): Promise<PaymentApproval> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('agent_payment_approvals')
      .update({
        status: 'executed',
        executed_transfer_id: transferId,
        executed_at: now,
        updated_at: now
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) {
      console.error('[ApprovalWorkflow] Failed to mark as executed:', error);
      throw new Error(`Failed to mark approval as executed: ${error.message}`);
    }

    const approval = this.mapFromDb(data);

    // Send webhook notification
    this.sendApprovalWebhook(approval, 'payment.approval_executed').catch(err => {
      console.error('[ApprovalWorkflow] Failed to send webhook:', err);
    });

    return approval;
  }

  /**
   * Mark an approval as failed during execution.
   */
  async markExecutionFailed(
    approvalId: string,
    errorMessage: string
  ): Promise<PaymentApproval> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('agent_payment_approvals')
      .update({
        execution_error: errorMessage,
        updated_at: now
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) {
      console.error('[ApprovalWorkflow] Failed to mark execution error:', error);
      throw new Error(`Failed to update approval: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Expire all pending approvals that have passed their expiration time.
   * Called by a background job.
   */
  async expirePendingApprovals(): Promise<number> {
    const { data, error } = await this.supabase.rpc('expire_pending_approvals');

    if (error) {
      console.error('[ApprovalWorkflow] Failed to expire approvals:', error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Get pending approval count for a wallet.
   */
  async getPendingCount(walletId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_pending_approval_count', {
      p_wallet_id: walletId
    });

    if (error) {
      console.error('[ApprovalWorkflow] Failed to get pending count:', error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Get total amount in pending approvals for a wallet.
   */
  async getPendingAmount(walletId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_pending_approval_amount', {
      p_wallet_id: walletId
    });

    if (error) {
      console.error('[ApprovalWorkflow] Failed to get pending amount:', error);
      return 0;
    }

    return parseFloat(data) || 0;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private mapFromDb(row: any): PaymentApproval {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      walletId: row.wallet_id,
      agentId: row.agent_id || undefined,
      protocol: row.protocol as PaymentProtocol,
      amount: parseFloat(row.amount),
      currency: row.currency,
      recipient: row.recipient,
      paymentContext: row.payment_context,
      status: row.status as ApprovalStatus,
      expiresAt: row.expires_at,
      decidedBy: row.decided_by || undefined,
      decidedAt: row.decided_at || undefined,
      decisionReason: row.decision_reason || undefined,
      executedTransferId: row.executed_transfer_id || undefined,
      executedAt: row.executed_at || undefined,
      executionError: row.execution_error || undefined,
      requestedByType: row.requested_by_type || undefined,
      requestedById: row.requested_by_id || undefined,
      requestedByName: row.requested_by_name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Emit an approval lifecycle webhook through the robust delivery system.
   *
   * Delegates to WebhookService.emitApprovalEvent → queue_webhook_delivery →
   * webhook_deliveries → HMAC-signed delivery with retry/DLQ by the
   * webhook-processor worker (mirrors how transfers emit events). Tenant-scoped
   * (passes the approval's own tenantId) and idempotent (key derived from
   * approval id + event type). Fire-and-forget at the call sites via `.catch()`;
   * this method never throws into the approval critical path.
   *
   * NOTE: signing happens in the delivery worker per subscribed endpoint
   * secret — the old direct-fetch + local HMAC against the non-existent
   * `tenants.webhook_url` columns is removed (it was dead code that silently
   * never fired).
   */
  private async sendApprovalWebhook(
    approval: PaymentApproval,
    eventType:
      | 'payment.approval_required'
      | 'payment.approval_decided'
      | 'payment.approval_executed'
  ): Promise<void> {
    try {
      await webhookService.emitApprovalEvent(approval.tenantId, eventType, {
        id: approval.id,
        walletId: approval.walletId,
        agentId: approval.agentId,
        protocol: approval.protocol,
        amount: approval.amount,
        currency: approval.currency,
        status: approval.status,
        recipient: approval.recipient,
        decidedBy: approval.decidedBy,
        decidedAt: approval.decidedAt,
        decisionReason: approval.decisionReason,
        executedTransferId: approval.executedTransferId,
        expiresAt: approval.expiresAt,
      });
    } catch (err) {
      console.error('[ApprovalWorkflow] Failed to queue approval webhook:', err);
    }
  }
}

// ============================================
// Factory Function
// ============================================

export function createApprovalWorkflowService(supabase: SupabaseClient): ApprovalWorkflowService {
  return new ApprovalWorkflowService(supabase);
}
