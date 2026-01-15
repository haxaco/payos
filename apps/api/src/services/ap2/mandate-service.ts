/**
 * AP2 Mandate Service
 * 
 * Manages payment mandates for agent-to-agent payments.
 * 
 * @see Story 40.14: AP2 Reference Setup
 */

import { randomUUID } from 'crypto';
import type { PaymentMandate, VDC, AP2PaymentRequest, AP2PaymentResponse, AgentCard } from './types.js';

// =============================================================================
// In-Memory Storage (for PoC)
// =============================================================================

const mandates = new Map<string, PaymentMandate>();
const payments = new Map<string, AP2PaymentResponse>();

// =============================================================================
// Mandate Service
// =============================================================================

export class AP2MandateService {
  private readonly agentId: string;

  constructor(agentId: string = 'payos-agent') {
    this.agentId = agentId;
  }

  /**
   * Create a new payment mandate
   */
  async createMandate(params: {
    payer_id: string;
    payer_name?: string;
    payee_id: string;
    payee_name: string;
    payee_account?: string;
    type?: PaymentMandate['type'];
    max_amount?: number;
    currency?: string;
    frequency?: PaymentMandate['frequency'];
    max_occurrences?: number;
    valid_from?: string;
    valid_until?: string;
  }): Promise<PaymentMandate> {
    const id = `mandate_${randomUUID()}`;
    const now = new Date().toISOString();
    
    const mandate: PaymentMandate = {
      id,
      version: '1.0',
      type: params.type || 'single',
      payer: {
        id: params.payer_id,
        name: params.payer_name,
        agent_id: this.agentId,
      },
      payee: {
        id: params.payee_id,
        name: params.payee_name,
        account: params.payee_account,
      },
      max_amount: params.max_amount,
      currency: params.currency || 'USD',
      frequency: params.frequency,
      max_occurrences: params.max_occurrences,
      valid_from: params.valid_from || now,
      valid_until: params.valid_until,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
    
    mandates.set(id, mandate);
    return mandate;
  }

  /**
   * Activate a mandate with VDC
   */
  async activateMandate(mandateId: string, credential?: VDC): Promise<PaymentMandate> {
    const mandate = mandates.get(mandateId);
    if (!mandate) throw new Error('Mandate not found');
    
    if (mandate.status !== 'pending') {
      throw new Error(`Cannot activate mandate in ${mandate.status} status`);
    }
    
    mandate.status = 'active';
    mandate.credential = credential;
    mandate.updated_at = new Date().toISOString();
    
    mandates.set(mandateId, mandate);
    return mandate;
  }

  /**
   * Get mandate by ID
   */
  async getMandate(mandateId: string): Promise<PaymentMandate | null> {
    return mandates.get(mandateId) || null;
  }

  /**
   * List mandates for a payer
   */
  async listMandates(payerId: string): Promise<PaymentMandate[]> {
    const result: PaymentMandate[] = [];
    mandates.forEach(m => {
      if (m.payer.id === payerId) {
        result.push(m);
      }
    });
    return result;
  }

  /**
   * Suspend a mandate
   */
  async suspendMandate(mandateId: string, reason?: string): Promise<PaymentMandate> {
    const mandate = mandates.get(mandateId);
    if (!mandate) throw new Error('Mandate not found');
    
    mandate.status = 'suspended';
    mandate.updated_at = new Date().toISOString();
    
    mandates.set(mandateId, mandate);
    return mandate;
  }

  /**
   * Revoke a mandate
   */
  async revokeMandate(mandateId: string): Promise<PaymentMandate> {
    const mandate = mandates.get(mandateId);
    if (!mandate) throw new Error('Mandate not found');
    
    mandate.status = 'revoked';
    mandate.updated_at = new Date().toISOString();
    
    mandates.set(mandateId, mandate);
    return mandate;
  }

  /**
   * Request payment using a mandate
   */
  async requestPayment(request: AP2PaymentRequest): Promise<AP2PaymentResponse> {
    const mandate = mandates.get(request.mandate_id);
    if (!mandate) throw new Error('Mandate not found');
    
    // Validate mandate status
    if (mandate.status !== 'active') {
      return {
        id: `pay_${randomUUID()}`,
        request_id: request.id,
        status: 'rejected',
        amount: request.amount,
        currency: request.currency,
        error_code: 'MANDATE_NOT_ACTIVE',
        error_message: `Mandate is ${mandate.status}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    
    // Validate amount
    if (mandate.max_amount && request.amount > mandate.max_amount) {
      return {
        id: `pay_${randomUUID()}`,
        request_id: request.id,
        status: 'rejected',
        amount: request.amount,
        currency: request.currency,
        error_code: 'AMOUNT_EXCEEDED',
        error_message: `Amount ${request.amount} exceeds mandate max ${mandate.max_amount}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    
    // Validate currency
    if (request.currency !== mandate.currency) {
      return {
        id: `pay_${randomUUID()}`,
        request_id: request.id,
        status: 'rejected',
        amount: request.amount,
        currency: request.currency,
        error_code: 'CURRENCY_MISMATCH',
        error_message: `Currency ${request.currency} does not match mandate ${mandate.currency}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    
    // Create payment response
    const now = new Date().toISOString();
    const response: AP2PaymentResponse = {
      id: `pay_${randomUUID()}`,
      request_id: request.id,
      status: 'authorized',
      amount: request.amount,
      currency: request.currency,
      authorized_at: now,
      authorized_by: this.agentId,
      created_at: now,
      updated_at: now,
    };
    
    payments.set(response.id, response);
    return response;
  }

  /**
   * Get payment status
   */
  async getPayment(paymentId: string): Promise<AP2PaymentResponse | null> {
    return payments.get(paymentId) || null;
  }

  /**
   * Update payment status (for settlement callback)
   */
  async updatePayment(
    paymentId: string,
    updates: Partial<AP2PaymentResponse>
  ): Promise<AP2PaymentResponse> {
    const payment = payments.get(paymentId);
    if (!payment) throw new Error('Payment not found');
    
    const updated = {
      ...payment,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    payments.set(paymentId, updated);
    return updated;
  }

  /**
   * Generate agent card for discovery
   */
  getAgentCard(): AgentCard {
    return {
      id: this.agentId,
      name: 'PayOS Agent',
      description: 'Universal agentic payment orchestration',
      version: '1.0.0',
      capabilities: {
        payments: {
          currencies: ['USD', 'USDC', 'BRL', 'MXN'],
          rails: ['x402', 'pix', 'spei', 'circle'],
          max_amount: 100000,
          supports_mandates: true,
          supports_x402: true,
        },
        protocols: ['ap2', 'acp', 'x402'],
      },
      endpoints: {
        mandates: '/v1/ap2/mandates',
        payments: '/v1/ap2/payments',
        webhooks: '/webhooks/ap2',
        discovery: '/.well-known/agent-card.json',
      },
      verification: {
        did: 'did:web:payos.dev',
      },
      logo_url: 'https://payos.dev/logo.png',
      website: 'https://payos.dev',
      support_email: 'support@payos.dev',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Validate a mandate is still valid
   */
  validateMandate(mandate: PaymentMandate): { valid: boolean; reason?: string } {
    // Check status
    if (mandate.status !== 'active') {
      return { valid: false, reason: `Mandate is ${mandate.status}` };
    }
    
    // Check expiration
    if (mandate.valid_until) {
      const now = new Date();
      const expires = new Date(mandate.valid_until);
      if (now > expires) {
        return { valid: false, reason: 'Mandate has expired' };
      }
    }
    
    // Check valid_from
    if (mandate.valid_from) {
      const now = new Date();
      const validFrom = new Date(mandate.valid_from);
      if (now < validFrom) {
        return { valid: false, reason: 'Mandate is not yet valid' };
      }
    }
    
    return { valid: true };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let mandateService: AP2MandateService | null = null;

export function getAP2MandateService(): AP2MandateService {
  if (!mandateService) {
    mandateService = new AP2MandateService();
  }
  return mandateService;
}



