/**
 * Visa Intelligent Commerce (VIC) Client
 * Epic 53, Story 53.3: Visa VIC API integration
 *
 * Implements the Visa Intelligent Commerce API for agent-based payments.
 * VIC enables AI agents to make payments on behalf of consumers using
 * Visa Token Service (VTS) tokens and cryptograms.
 *
 * Key Features:
 * - Payment instruction creation
 * - VTS token management
 * - Commerce signal submission
 * - Transaction status tracking
 */

import type {
  VisaVICConfig,
  VisaPaymentInstruction,
  VisaCommerceSignal,
  VisaTokenResponse,
  CardPaymentIntent,
  CardPaymentResult,
} from '../types.js';
import { WebBotAuthVerifier } from '../web-bot-auth-verifier.js';

// ============================================
// Constants
// ============================================

const VISA_SANDBOX_URL = 'https://sandbox.api.visa.com/vic/v1';
const VISA_PRODUCTION_URL = 'https://api.visa.com/vic/v1';

// ============================================
// Visa VIC Client
// ============================================

export class VisaVICClient {
  private config: VisaVICConfig;
  private baseUrl: string;
  private verifier: WebBotAuthVerifier;

  constructor(config: VisaVICConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || (config.sandbox ? VISA_SANDBOX_URL : VISA_PRODUCTION_URL);
    this.verifier = new WebBotAuthVerifier({
      network: 'visa',
      keyDirectoryUrl: config.tapKeyDirectory,
    });
  }

  // ============================================
  // Payment Instructions
  // ============================================

  /**
   * Create a payment instruction for an agent to use
   *
   * A payment instruction defines the payment parameters that an agent
   * can use to complete a transaction. The instruction includes amount,
   * merchant details, and any restrictions.
   */
  async createPaymentInstruction(params: {
    merchantRef: string;
    amount: number;
    currency: string;
    merchant: VisaPaymentInstruction['merchant'];
    restrictions?: VisaPaymentInstruction['restrictions'];
    expiresInSeconds?: number;
    metadata?: Record<string, string>;
  }): Promise<VisaPaymentInstruction> {
    const instructionId = this.generateInstructionId();
    const expiresAt = new Date(
      Date.now() + (params.expiresInSeconds || 900) * 1000
    ).toISOString();

    const instruction: VisaPaymentInstruction = {
      instructionId,
      merchantRef: params.merchantRef,
      amount: params.amount,
      currency: params.currency,
      merchant: params.merchant,
      restrictions: params.restrictions,
      expiresAt,
      metadata: params.metadata,
    };

    // In production, this would call the Visa VIC API
    if (!this.config.sandbox) {
      const response = await this.makeRequest('/instructions', 'POST', instruction as unknown as Record<string, unknown>);
      return response as unknown as VisaPaymentInstruction;
    }

    // Sandbox: return the instruction directly
    console.log('[Visa VIC] Created payment instruction:', instructionId);
    return instruction;
  }

  /**
   * Get a payment instruction by ID
   */
  async getPaymentInstruction(instructionId: string): Promise<VisaPaymentInstruction | null> {
    if (!this.config.sandbox) {
      try {
        const response = await this.makeRequest(`/instructions/${instructionId}`, 'GET');
        return response as unknown as VisaPaymentInstruction;
      } catch {
        return null;
      }
    }

    // Sandbox: return mock data
    console.log('[Visa VIC] Get payment instruction:', instructionId);
    return null; // Would be cached/stored in real implementation
  }

  /**
   * Cancel a payment instruction
   */
  async cancelPaymentInstruction(instructionId: string): Promise<void> {
    if (!this.config.sandbox) {
      await this.makeRequest(`/instructions/${instructionId}/cancel`, 'POST');
    }

    console.log('[Visa VIC] Cancelled payment instruction:', instructionId);
  }

  // ============================================
  // Token Management (VTS)
  // ============================================

  /**
   * Create a Visa Token Service token for a card
   *
   * This tokenizes a card for use in agent transactions.
   * The token can be used instead of the actual PAN.
   */
  async createToken(params: {
    /** Card PAN (for initial tokenization) */
    pan: string;
    /** Card expiry month */
    expiryMonth: string;
    /** Card expiry year */
    expiryYear: string;
    /** CVV for verification */
    cvv: string;
    /** Cardholder name */
    cardholderName?: string;
    /** Account reference for PayOS */
    accountRef?: string;
  }): Promise<VisaTokenResponse> {
    if (!this.config.sandbox) {
      const response = await this.makeRequest('/tokens', 'POST', {
        pan: params.pan,
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
        cvv: params.cvv,
        cardholderName: params.cardholderName,
        accountRef: params.accountRef,
      });
      return response as unknown as VisaTokenResponse;
    }

    // Sandbox: return mock token
    const tokenId = `vts_${this.generateId()}`;
    console.log('[Visa VIC] Created VTS token:', tokenId);

    return {
      tokenId,
      status: 'active',
      lastFour: params.pan.slice(-4),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      panReference: `ref_${this.generateId()}`,
    };
  }

  /**
   * Get token details
   */
  async getToken(tokenId: string): Promise<VisaTokenResponse | null> {
    if (!this.config.sandbox) {
      try {
        const response = await this.makeRequest(`/tokens/${tokenId}`, 'GET');
        return response as unknown as VisaTokenResponse;
      } catch {
        return null;
      }
    }

    // Sandbox mock
    console.log('[Visa VIC] Get token:', tokenId);
    return {
      tokenId,
      status: 'active',
      lastFour: '4242',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Suspend a token
   */
  async suspendToken(tokenId: string): Promise<void> {
    if (!this.config.sandbox) {
      await this.makeRequest(`/tokens/${tokenId}/suspend`, 'POST');
    }

    console.log('[Visa VIC] Suspended token:', tokenId);
  }

  /**
   * Delete a token
   */
  async deleteToken(tokenId: string): Promise<void> {
    if (!this.config.sandbox) {
      await this.makeRequest(`/tokens/${tokenId}`, 'DELETE');
    }

    console.log('[Visa VIC] Deleted token:', tokenId);
  }

  // ============================================
  // Commerce Signals
  // ============================================

  /**
   * Submit a commerce signal to complete a payment
   *
   * Commerce signals are submitted by agents when they want to
   * complete a transaction. The signal includes the payment instruction,
   * agent token, and cryptogram for security.
   */
  async submitCommerceSignal(signal: VisaCommerceSignal): Promise<CardPaymentResult> {
    if (!this.config.sandbox) {
      const response = await this.makeRequest('/signals', 'POST', signal as unknown as Record<string, unknown>);
      return this.mapCommerceSignalResponse(signal.instructionId, response);
    }

    // Sandbox: simulate successful payment
    console.log('[Visa VIC] Submitted commerce signal for instruction:', signal.instructionId);

    return {
      intentId: signal.instructionId,
      status: 'succeeded',
      network: 'visa',
      amount: 0, // Would come from the instruction
      currency: 'USD',
      fee: 0,
      net: 0,
      authorizationCode: `AUTH_${this.generateId().toUpperCase()}`,
      networkReference: `VIC_${this.generateId()}`,
      settledAt: new Date().toISOString(),
    };
  }

  /**
   * Get commerce signal status
   */
  async getCommerceSignalStatus(instructionId: string): Promise<CardPaymentResult | null> {
    if (!this.config.sandbox) {
      try {
        const response = await this.makeRequest(`/signals/${instructionId}/status`, 'GET');
        return this.mapCommerceSignalResponse(instructionId, response);
      } catch {
        return null;
      }
    }

    // Sandbox mock
    return {
      intentId: instructionId,
      status: 'pending',
      network: 'visa',
      amount: 0,
      currency: 'USD',
    };
  }

  // ============================================
  // Agent Verification
  // ============================================

  /**
   * Verify an incoming agent request using Web Bot Auth
   */
  async verifyAgentRequest(request: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
  }) {
    return this.verifier.verifyRequest(request);
  }

  // ============================================
  // Webhooks
  // ============================================

  /**
   * Verify a webhook signature from Visa
   */
  verifyWebhook(_payload: string, _signature: string): boolean {
    if (!this.config.sharedSecret) {
      console.warn('[Visa VIC] No shared secret configured for webhook verification');
      return false;
    }

    // Visa uses HMAC-SHA256 for webhook signatures
    // In a real implementation, we'd use Web Crypto API for HMAC
    // For now, this is a placeholder
    console.log('[Visa VIC] Verifying webhook signature');

    // Compare the expected signature with the provided one
    // Using constant-time comparison to prevent timing attacks
    // TODO: Implement actual HMAC-SHA256 verification
    return true; // Placeholder - implement actual verification
  }

  /**
   * Parse a webhook event from Visa
   */
  parseWebhookEvent(payload: string): {
    type: string;
    instructionId?: string;
    tokenId?: string;
    status?: string;
    data: Record<string, unknown>;
  } {
    const event = JSON.parse(payload);

    return {
      type: event.eventType || 'unknown',
      instructionId: event.instructionId,
      tokenId: event.tokenId,
      status: event.status,
      data: event,
    };
  }

  // ============================================
  // Payment Intent Interface
  // ============================================

  /**
   * Create a payment intent (unified interface)
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    merchant: {
      name: string;
      categoryCode: string;
      country: string;
      url?: string;
    };
    metadata?: Record<string, string>;
    expiresInSeconds?: number;
  }): Promise<CardPaymentIntent> {
    const instruction = await this.createPaymentInstruction({
      merchantRef: `payos_${this.generateId()}`,
      amount: params.amount,
      currency: params.currency,
      merchant: params.merchant,
      metadata: params.metadata,
      expiresInSeconds: params.expiresInSeconds,
    });

    return {
      id: instruction.instructionId,
      network: 'visa',
      status: 'created',
      amount: params.amount,
      currency: params.currency,
      merchant: params.merchant,
      networkData: {
        referenceId: instruction.instructionId,
      },
      nextAction: {
        type: 'provide_token',
        data: {
          instructionId: instruction.instructionId,
          expiresAt: instruction.expiresAt,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: instruction.expiresAt,
      metadata: params.metadata,
    };
  }

  /**
   * Capture a payment (complete with commerce signal)
   */
  async capturePayment(intentId: string, signal: VisaCommerceSignal): Promise<CardPaymentResult> {
    return this.submitCommerceSignal({
      ...signal,
      instructionId: intentId,
    });
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(intentId: string): Promise<void> {
    await this.cancelPaymentInstruction(intentId);
  }

  // ============================================
  // Private Methods
  // ============================================

  private async makeRequest(
    path: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${this.encodeCredentials()}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Visa API error: ${response.status} - ${errorBody}`);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  private encodeCredentials(): string {
    // Visa uses Basic Auth with API key
    return btoa(`${this.config.apiKey}:`);
  }

  private generateInstructionId(): string {
    return `vic_inst_${this.generateId()}`;
  }

  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapCommerceSignalResponse(
    instructionId: string,
    response: Record<string, unknown>
  ): CardPaymentResult {
    const status = response.status as string;

    return {
      intentId: instructionId,
      status: status === 'approved' ? 'succeeded' : status === 'declined' ? 'failed' : 'pending',
      network: 'visa',
      amount: (response.amount as number) || 0,
      currency: (response.currency as string) || 'USD',
      fee: response.fee as number,
      net: response.net as number,
      authorizationCode: response.authorizationCode as string,
      networkReference: response.networkReference as string,
      settledAt: response.settledAt as string,
      error:
        status === 'declined'
          ? {
              code: (response.declineCode as string) || 'DECLINED',
              message: (response.declineMessage as string) || 'Transaction declined',
              declineReason: response.declineReason as string,
            }
          : undefined,
    };
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Get current configuration (safe - excludes secrets)
   */
  getConfig(): { sandbox: boolean; baseUrl: string } {
    return {
      sandbox: this.config.sandbox,
      baseUrl: this.baseUrl,
    };
  }

  /**
   * Test the connection to Visa API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.config.sandbox) {
        // In sandbox, just verify the API key format
        if (!this.config.apiKey || this.config.apiKey.length < 10) {
          return { success: false, error: 'Invalid API key format' };
        }
        return { success: true };
      }

      // In production, make a test API call
      await this.makeRequest('/health', 'GET');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

// ============================================
// Factory Function
// ============================================

export function createVisaVICClient(config: VisaVICConfig): VisaVICClient {
  return new VisaVICClient(config);
}

export default VisaVICClient;
