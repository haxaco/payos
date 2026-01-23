/**
 * Card Networks Module
 *
 * Provides SDK integration for Visa VIC and Mastercard Agent Pay
 * for accepting payments from AI agents.
 */

import { PayOSClient } from '../client';
import type {
  VerifyAgentSignatureRequest,
  VerifyAgentSignatureResult,
  CardNetworksResponse,
  CardAnalyticsResponse,
  VerificationStats,
  CreateVisaInstructionRequest,
  VisaPaymentInstruction,
  PaginatedResponse,
  CreateVisaTokenRequest,
  VisaToken,
  RegisterMastercardAgentRequest,
  MastercardAgentRegistration,
  CreateMastercardTokenRequest,
  MastercardToken,
  CardTransaction,
  NetworkTestResult,
  ConfigureVisaRequest,
  ConfigureMastercardRequest,
  ConfigureResult,
} from './types';

export * from './types';

/**
 * Visa-specific operations
 */
export class VisaClient {
  constructor(private client: PayOSClient) {}

  /**
   * Create a Visa VIC payment instruction
   */
  async createInstruction(
    params: CreateVisaInstructionRequest
  ): Promise<VisaPaymentInstruction> {
    return this.client.request<VisaPaymentInstruction>('/v1/cards/visa/instructions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a specific Visa payment instruction
   */
  async getInstruction(instructionId: string): Promise<VisaPaymentInstruction> {
    return this.client.request<VisaPaymentInstruction>(
      `/v1/cards/visa/instructions/${instructionId}`
    );
  }

  /**
   * List Visa payment instructions
   */
  async listInstructions(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<VisaPaymentInstruction>> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const query = params.toString();
    return this.client.request<PaginatedResponse<VisaPaymentInstruction>>(
      `/v1/cards/visa/instructions${query ? `?${query}` : ''}`
    );
  }

  /**
   * Provision a VTS token for an instruction
   */
  async createToken(params: CreateVisaTokenRequest): Promise<VisaToken> {
    return this.client.request<VisaToken>('/v1/cards/visa/tokens', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a specific Visa token
   */
  async getToken(tokenId: string): Promise<VisaToken> {
    return this.client.request<VisaToken>(`/v1/cards/visa/tokens/${tokenId}`);
  }

  /**
   * List Visa tokens
   */
  async listTokens(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<VisaToken>> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const query = params.toString();
    return this.client.request<PaginatedResponse<VisaToken>>(
      `/v1/cards/visa/tokens${query ? `?${query}` : ''}`
    );
  }

  /**
   * Suspend a Visa token
   */
  async suspendToken(tokenId: string): Promise<{ success: boolean; message: string }> {
    return this.client.request<{ success: boolean; message: string }>(
      `/v1/cards/visa/tokens/${tokenId}`,
      { method: 'DELETE' }
    );
  }
}

/**
 * Mastercard-specific operations
 */
export class MastercardClient {
  constructor(private client: PayOSClient) {}

  /**
   * Register an agent with Mastercard Agent Pay
   */
  async registerAgent(
    params: RegisterMastercardAgentRequest
  ): Promise<MastercardAgentRegistration> {
    return this.client.request<MastercardAgentRegistration>('/v1/cards/mastercard/agents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a specific Mastercard agent registration
   */
  async getAgent(agentId: string): Promise<MastercardAgentRegistration> {
    return this.client.request<MastercardAgentRegistration>(
      `/v1/cards/mastercard/agents/${agentId}`
    );
  }

  /**
   * List registered Mastercard agents
   */
  async listAgents(): Promise<{ data: MastercardAgentRegistration[] }> {
    return this.client.request<{ data: MastercardAgentRegistration[] }>(
      '/v1/cards/mastercard/agents'
    );
  }

  /**
   * Create a Mastercard agentic token with DTVC
   */
  async createToken(params: CreateMastercardTokenRequest): Promise<MastercardToken> {
    return this.client.request<MastercardToken>('/v1/cards/mastercard/tokens', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a Mastercard token, optionally refreshing the DTVC
   */
  async getToken(tokenReference: string, options?: { refresh?: boolean }): Promise<MastercardToken> {
    const query = options?.refresh ? '?refresh=true' : '';
    return this.client.request<MastercardToken>(
      `/v1/cards/mastercard/tokens/${tokenReference}${query}`
    );
  }

  /**
   * List Mastercard tokens
   */
  async listTokens(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<MastercardToken>> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const query = params.toString();
    return this.client.request<PaginatedResponse<MastercardToken>>(
      `/v1/cards/mastercard/tokens${query ? `?${query}` : ''}`
    );
  }

  /**
   * Revoke a Mastercard token
   */
  async revokeToken(tokenReference: string): Promise<{ success: boolean; message: string }> {
    return this.client.request<{ success: boolean; message: string }>(
      `/v1/cards/mastercard/tokens/${tokenReference}`,
      { method: 'DELETE' }
    );
  }
}

/**
 * Cards Module - Main client for card network operations
 *
 * Provides unified access to:
 * - Web Bot Auth signature verification
 * - Network configuration and status
 * - Visa VIC payment instructions and tokens
 * - Mastercard Agent Pay registration and tokens
 * - Analytics and transactions
 */
export class CardsClient {
  /** Visa-specific operations */
  public readonly visa: VisaClient;
  /** Mastercard-specific operations */
  public readonly mastercard: MastercardClient;

  constructor(private client: PayOSClient) {
    this.visa = new VisaClient(client);
    this.mastercard = new MastercardClient(client);
  }

  /**
   * Verify an AI agent's Web Bot Auth signature
   *
   * @example
   * ```typescript
   * const result = await payos.cards.verifyAgentSignature({
   *   method: 'POST',
   *   path: '/checkout',
   *   headers: req.headers,
   *   signatureInput: req.headers['signature-input'],
   *   signature: req.headers['signature'],
   * });
   *
   * if (result.valid) {
   *   console.log(`Verified ${result.network} agent from ${result.agentProvider}`);
   * }
   * ```
   */
  async verifyAgentSignature(
    params: VerifyAgentSignatureRequest
  ): Promise<VerifyAgentSignatureResult> {
    return this.client.request<VerifyAgentSignatureResult>('/v1/cards/verify', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get configured card networks and their status
   *
   * @example
   * ```typescript
   * const { networks, capabilities } = await payos.cards.getNetworks();
   *
   * if (networks.visa.configured) {
   *   console.log(`Visa: ${networks.visa.status}`);
   * }
   * ```
   */
  async getNetworks(): Promise<CardNetworksResponse> {
    return this.client.request<CardNetworksResponse>('/v1/cards/networks');
  }

  /**
   * Test connection to a card network
   */
  async testNetwork(network: 'visa' | 'mastercard'): Promise<NetworkTestResult> {
    return this.client.request<NetworkTestResult>(`/v1/cards/networks/${network}/test`, {
      method: 'POST',
    });
  }

  /**
   * Configure Visa VIC credentials
   */
  async configureVisa(params: ConfigureVisaRequest): Promise<ConfigureResult> {
    return this.client.request<ConfigureResult>('/v1/cards/networks/visa/configure', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Configure Mastercard Agent Pay credentials
   */
  async configureMastercard(params: ConfigureMastercardRequest): Promise<ConfigureResult> {
    return this.client.request<ConfigureResult>('/v1/cards/networks/mastercard/configure', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Disconnect a card network
   */
  async disconnectNetwork(network: 'visa' | 'mastercard'): Promise<{ success: boolean; message: string }> {
    return this.client.request<{ success: boolean; message: string }>(
      `/v1/cards/networks/${network}/disconnect`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get comprehensive card network analytics
   *
   * @param days - Number of days to analyze (default: 30)
   *
   * @example
   * ```typescript
   * const analytics = await payos.cards.getAnalytics(30);
   *
   * console.log(`Success rate: ${analytics.verifications.successRate}%`);
   * console.log(`Total volume: $${analytics.transactions.volume}`);
   * ```
   */
  async getAnalytics(days = 30): Promise<CardAnalyticsResponse> {
    return this.client.request<CardAnalyticsResponse>(`/v1/cards/analytics?days=${days}`);
  }

  /**
   * Get verification statistics
   *
   * @param days - Number of days to analyze (default: 30)
   */
  async getVerificationStats(days = 30): Promise<VerificationStats> {
    return this.client.request<VerificationStats>(`/v1/cards/verifications/stats?days=${days}`);
  }

  /**
   * List card network transactions
   */
  async listTransactions(options?: {
    network?: 'visa' | 'mastercard';
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<CardTransaction>> {
    const params = new URLSearchParams();
    if (options?.network) params.set('network', options.network);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const query = params.toString();
    return this.client.request<PaginatedResponse<CardTransaction>>(
      `/v1/cards/transactions${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a specific transaction
   */
  async getTransaction(transactionId: string): Promise<CardTransaction> {
    return this.client.request<CardTransaction>(`/v1/cards/transactions/${transactionId}`);
  }
}
