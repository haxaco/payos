/**
 * Mastercard Agent Pay Client
 * Epic 53, Story 53.4: Mastercard Agent Pay API integration
 *
 * Implements the Mastercard Agent Pay API for AI agent payments.
 * Agent Pay enables registered AI agents to make payments using
 * MDES tokens and DTVCs (Dynamic Token Verification Codes).
 *
 * Key Features:
 * - Agent registration with Mastercard
 * - MDES token management
 * - Payment request submission
 * - DTVC generation for secure transactions
 *
 * Authentication:
 * Mastercard uses OAuth 1.0a with RSA-SHA256 signatures.
 */

import { sha256 } from '@noble/hashes/sha256';
import type {
  MastercardConfig,
  MastercardAgentRegistration,
  MastercardAgenticToken,
  MastercardPaymentRequest,
  CardPaymentIntent,
  CardPaymentResult,
} from '../types.js';
import { WebBotAuthVerifier, bytesToBase64 } from '../web-bot-auth-verifier.js';

// ============================================
// Constants
// ============================================

const MC_SANDBOX_URL = 'https://sandbox.api.mastercard.com/agentpay/v1';
const MC_PRODUCTION_URL = 'https://api.mastercard.com/agentpay/v1';

// ============================================
// OAuth 1.0a Utilities
// ============================================

interface OAuthParams {
  consumerKey: string;
  timestamp: number;
  nonce: string;
  signatureMethod: string;
  version: string;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function buildOAuthBaseString(
  method: string,
  url: string,
  params: OAuthParams,
  bodyHash?: string
): string {
  const paramPairs: [string, string][] = [
    ['oauth_consumer_key', params.consumerKey],
    ['oauth_nonce', params.nonce],
    ['oauth_signature_method', params.signatureMethod],
    ['oauth_timestamp', params.timestamp.toString()],
    ['oauth_version', params.version],
  ];

  if (bodyHash) {
    paramPairs.push(['oauth_body_hash', bodyHash]);
  }

  // Sort parameters alphabetically
  paramPairs.sort((a, b) => a[0].localeCompare(b[0]));

  const paramString = paramPairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  return `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
}

// ============================================
// Mastercard Agent Pay Client
// ============================================

export class MastercardAgentPayClient {
  private config: MastercardConfig;
  private baseUrl: string;
  private verifier: WebBotAuthVerifier;
  private privateKey: CryptoKey | null = null;

  constructor(config: MastercardConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || (config.sandbox ? MC_SANDBOX_URL : MC_PRODUCTION_URL);
    this.verifier = new WebBotAuthVerifier({
      network: 'mastercard',
      keyDirectoryUrl: config.agentKeyDirectory,
    });
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the client (load private key)
   */
  async initialize(): Promise<void> {
    if (this.config.privateKeyPem) {
      this.privateKey = await this.importPrivateKey(this.config.privateKeyPem);
    } else if (this.config.keystorePath) {
      // In a Node.js environment, we'd load the P12 file here
      // For browser/edge runtime, we expect privateKeyPem to be provided
      console.warn('[MC Agent Pay] Keystore loading not supported in this runtime');
    }
  }

  // ============================================
  // Agent Registration
  // ============================================

  /**
   * Register an AI agent with Mastercard
   *
   * Before an agent can make payments, it must be registered with
   * Mastercard's Agent Pay program. This establishes the agent's
   * identity and capabilities.
   */
  async registerAgent(params: {
    /** Internal PayOS agent ID */
    agentId: string;
    /** Agent display name */
    agentName: string;
    /** Agent public key for verification */
    publicKey: string;
    /** Agent capabilities */
    capabilities: string[];
    /** Agent provider (e.g., "openai", "anthropic") */
    provider?: string;
    /** Callback URL for agent events */
    callbackUrl?: string;
  }): Promise<MastercardAgentRegistration> {
    if (!this.config.sandbox) {
      const response = await this.makeRequest('/agents', 'POST', {
        externalAgentId: params.agentId,
        agentName: params.agentName,
        publicKey: params.publicKey,
        capabilities: params.capabilities,
        provider: params.provider,
        callbackUrl: params.callbackUrl,
      });

      return this.mapAgentRegistrationResponse(params.agentId, response);
    }

    // Sandbox: return mock registration
    const mcAgentId = `mc_agent_${this.generateId()}`;
    console.log('[MC Agent Pay] Registered agent:', params.agentId, '->', mcAgentId);

    return {
      agentId: params.agentId,
      mcAgentId,
      publicKey: params.publicKey,
      capabilities: params.capabilities,
      status: 'active',
      registeredAt: new Date().toISOString(),
    };
  }

  /**
   * Get agent registration status
   */
  async getAgentRegistration(agentId: string): Promise<MastercardAgentRegistration | null> {
    if (!this.config.sandbox) {
      try {
        const response = await this.makeRequest(`/agents/${agentId}`, 'GET');
        return this.mapAgentRegistrationResponse(agentId, response);
      } catch {
        return null;
      }
    }

    // Sandbox mock
    console.log('[MC Agent Pay] Get agent registration:', agentId);
    return null; // Would be stored/cached in real implementation
  }

  /**
   * Update agent registration
   */
  async updateAgentRegistration(
    agentId: string,
    updates: {
      capabilities?: string[];
      publicKey?: string;
      callbackUrl?: string;
    }
  ): Promise<MastercardAgentRegistration> {
    if (!this.config.sandbox) {
      const response = await this.makeRequest(`/agents/${agentId}`, 'PATCH', updates);
      return this.mapAgentRegistrationResponse(agentId, response);
    }

    // Sandbox mock
    console.log('[MC Agent Pay] Updated agent registration:', agentId);
    return {
      agentId,
      mcAgentId: `mc_agent_${this.generateId()}`,
      publicKey: updates.publicKey || '',
      capabilities: updates.capabilities || [],
      status: 'active',
      registeredAt: new Date().toISOString(),
    };
  }

  /**
   * Deactivate an agent registration
   */
  async deactivateAgent(agentId: string): Promise<void> {
    if (!this.config.sandbox) {
      await this.makeRequest(`/agents/${agentId}/deactivate`, 'POST');
    }

    console.log('[MC Agent Pay] Deactivated agent:', agentId);
  }

  // ============================================
  // Token Management (MDES)
  // ============================================

  /**
   * Create an MDES token for a card
   *
   * MDES (Mastercard Digital Enablement Service) tokens replace
   * the actual card number for secure digital transactions.
   */
  async createToken(params: {
    /** Mastercard agent ID */
    mcAgentId: string;
    /** Card PAN */
    pan: string;
    /** Card expiry month */
    expiryMonth: string;
    /** Card expiry year */
    expiryYear: string;
    /** CVV */
    cvv: string;
    /** Cardholder name */
    cardholderName?: string;
  }): Promise<MastercardAgenticToken> {
    if (!this.config.sandbox) {
      const response = await this.makeRequest('/tokens', 'POST', {
        agentId: params.mcAgentId,
        pan: params.pan,
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
        cvv: params.cvv,
        cardholderName: params.cardholderName,
      });

      return this.mapTokenResponse(params.mcAgentId, response);
    }

    // Sandbox: return mock token
    const tokenReference = `mdes_${this.generateId()}`;
    console.log('[MC Agent Pay] Created MDES token:', tokenReference);

    return {
      tokenReference,
      mcAgentId: params.mcAgentId,
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Get token details
   */
  async getToken(tokenReference: string): Promise<MastercardAgenticToken | null> {
    if (!this.config.sandbox) {
      try {
        const response = await this.makeRequest(`/tokens/${tokenReference}`, 'GET');
        return this.mapTokenResponse('', response);
      } catch {
        return null;
      }
    }

    // Sandbox mock
    return {
      tokenReference,
      mcAgentId: '',
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Generate a DTVC (Dynamic Token Verification Code)
   *
   * DTVCs are one-time cryptograms used to secure token transactions.
   * They replace the static CVV for digital payments.
   */
  async generateDTVC(tokenReference: string): Promise<string> {
    if (!this.config.sandbox) {
      const response = await this.makeRequest(`/tokens/${tokenReference}/dtvc`, 'POST');
      return response.dtvc as string;
    }

    // Sandbox: generate mock DTVC
    const dtvc = Math.random().toString().substr(2, 3);
    console.log('[MC Agent Pay] Generated DTVC for token:', tokenReference, '->', dtvc);
    return dtvc;
  }

  /**
   * Suspend a token
   */
  async suspendToken(tokenReference: string): Promise<void> {
    if (!this.config.sandbox) {
      await this.makeRequest(`/tokens/${tokenReference}/suspend`, 'POST');
    }

    console.log('[MC Agent Pay] Suspended token:', tokenReference);
  }

  /**
   * Delete a token
   */
  async deleteToken(tokenReference: string): Promise<void> {
    if (!this.config.sandbox) {
      await this.makeRequest(`/tokens/${tokenReference}`, 'DELETE');
    }

    console.log('[MC Agent Pay] Deleted token:', tokenReference);
  }

  // ============================================
  // Payment Requests
  // ============================================

  /**
   * Submit a payment request
   *
   * Payment requests are submitted by agents to initiate a transaction.
   * The request includes the token, DTVC, and merchant details.
   */
  async submitPaymentRequest(request: MastercardPaymentRequest): Promise<CardPaymentResult> {
    // Generate DTVC for the transaction
    const dtvc = await this.generateDTVC(request.tokenReference);

    if (!this.config.sandbox) {
      const response = await this.makeRequest('/payments', 'POST', {
        ...request,
        dtvc,
      });

      return this.mapPaymentResponse(request.requestId, response);
    }

    // Sandbox: simulate successful payment
    console.log('[MC Agent Pay] Submitted payment request:', request.requestId);

    return {
      intentId: request.requestId,
      status: 'succeeded',
      network: 'mastercard',
      amount: request.amount,
      currency: request.currency,
      fee: Math.round(request.amount * 0.029 + 30), // 2.9% + $0.30 simulation
      net: request.amount - Math.round(request.amount * 0.029 + 30),
      authorizationCode: `MC_AUTH_${this.generateId().toUpperCase()}`,
      networkReference: `AGP_${this.generateId()}`,
      settledAt: new Date().toISOString(),
    };
  }

  /**
   * Get payment request status
   */
  async getPaymentStatus(requestId: string): Promise<CardPaymentResult | null> {
    if (!this.config.sandbox) {
      try {
        const response = await this.makeRequest(`/payments/${requestId}`, 'GET');
        return this.mapPaymentResponse(requestId, response);
      } catch {
        return null;
      }
    }

    // Sandbox mock
    return {
      intentId: requestId,
      status: 'pending',
      network: 'mastercard',
      amount: 0,
      currency: 'USD',
    };
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    requestId: string,
    amount?: number,
    reason?: string
  ): Promise<{ refundId: string; status: string; amount: number }> {
    if (!this.config.sandbox) {
      const response = await this.makeRequest(`/payments/${requestId}/refund`, 'POST', {
        amount,
        reason,
      });

      return {
        refundId: response.refundId as string,
        status: response.status as string,
        amount: response.amount as number,
      };
    }

    // Sandbox mock
    console.log('[MC Agent Pay] Refunding payment:', requestId, amount);
    return {
      refundId: `ref_${this.generateId()}`,
      status: 'succeeded',
      amount: amount || 0,
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
      id: string;
      categoryCode: string;
      country: string;
    };
    tokenReference?: string;
    metadata?: Record<string, string>;
  }): Promise<CardPaymentIntent> {
    const requestId = `mc_req_${this.generateId()}`;

    return {
      id: requestId,
      network: 'mastercard',
      status: 'created',
      amount: params.amount,
      currency: params.currency,
      merchant: params.merchant,
      networkData: {
        referenceId: requestId,
        token: params.tokenReference,
      },
      nextAction: params.tokenReference
        ? { type: 'confirm_payment' }
        : { type: 'provide_token' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: params.metadata,
    };
  }

  /**
   * Capture a payment
   */
  async capturePayment(intentId: string, tokenReference: string): Promise<CardPaymentResult> {
    // This would get the intent details from storage in real implementation
    return this.submitPaymentRequest({
      requestId: intentId,
      tokenReference,
      amount: 0, // Would come from stored intent
      currency: 'USD',
      merchant: {
        name: 'Unknown',
        id: 'unknown',
        categoryCode: '0000',
        country: 'US',
      },
    });
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
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = generateNonce();

    // Calculate body hash if body exists
    let bodyHash: string | undefined;
    let bodyString: string | undefined;
    if (body) {
      bodyString = JSON.stringify(body);
      const bodyBytes = new TextEncoder().encode(bodyString);
      bodyHash = bytesToBase64(sha256(bodyBytes));
    }

    // Build OAuth parameters
    const oauthParams: OAuthParams = {
      consumerKey: this.config.consumerKey,
      timestamp,
      nonce,
      signatureMethod: 'RSA-SHA256',
      version: '1.0',
    };

    // Build and sign the base string
    const baseString = buildOAuthBaseString(method, url, oauthParams, bodyHash);
    const signature = await this.signOAuth(baseString);

    // Build Authorization header
    const authHeader = this.buildAuthHeader(oauthParams, signature, bodyHash);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (bodyString) {
      options.body = bodyString;
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mastercard API error: ${response.status} - ${errorBody}`);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  private async signOAuth(baseString: string): Promise<string> {
    if (!this.privateKey) {
      // If no private key, return mock signature for sandbox
      if (this.config.sandbox) {
        return 'mock_signature';
      }
      throw new Error('Private key not initialized');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(baseString);

    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      this.privateKey,
      data
    );

    return bytesToBase64(new Uint8Array(signature));
  }

  private buildAuthHeader(
    params: OAuthParams,
    signature: string,
    bodyHash?: string
  ): string {
    const parts = [
      `oauth_consumer_key="${encodeURIComponent(params.consumerKey)}"`,
      `oauth_nonce="${encodeURIComponent(params.nonce)}"`,
      `oauth_signature="${encodeURIComponent(signature)}"`,
      `oauth_signature_method="${params.signatureMethod}"`,
      `oauth_timestamp="${params.timestamp}"`,
      `oauth_version="${params.version}"`,
    ];

    if (bodyHash) {
      parts.push(`oauth_body_hash="${encodeURIComponent(bodyHash)}"`);
    }

    return `OAuth ${parts.join(', ')}`;
  }

  private async importPrivateKey(pem: string): Promise<CryptoKey> {
    // Remove PEM headers and convert to ArrayBuffer
    const pemContent = pem
      .replace(/-----BEGIN.*?-----/, '')
      .replace(/-----END.*?-----/, '')
      .replace(/\s/g, '');

    const binaryString = atob(pemContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  }

  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapAgentRegistrationResponse(
    agentId: string,
    response: Record<string, unknown>
  ): MastercardAgentRegistration {
    return {
      agentId,
      mcAgentId: response.mcAgentId as string,
      publicKey: response.publicKey as string,
      capabilities: (response.capabilities as string[]) || [],
      status: response.status as MastercardAgentRegistration['status'],
      registeredAt: response.registeredAt as string,
    };
  }

  private mapTokenResponse(
    mcAgentId: string,
    response: Record<string, unknown>
  ): MastercardAgenticToken {
    return {
      tokenReference: response.tokenReference as string,
      mcAgentId: response.agentId as string || mcAgentId,
      dtvc: response.dtvc as string,
      status: response.status as MastercardAgenticToken['status'],
      expiresAt: response.expiresAt as string,
    };
  }

  private mapPaymentResponse(
    requestId: string,
    response: Record<string, unknown>
  ): CardPaymentResult {
    const status = response.status as string;

    return {
      intentId: requestId,
      status: status === 'approved' ? 'succeeded' : status === 'declined' ? 'failed' : 'pending',
      network: 'mastercard',
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
   * Test the connection to Mastercard API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.config.sandbox) {
        // In sandbox, verify credentials format
        if (!this.config.consumerKey || this.config.consumerKey.length < 10) {
          return { success: false, error: 'Invalid consumer key format' };
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

export function createMastercardAgentPayClient(
  config: MastercardConfig
): MastercardAgentPayClient {
  return new MastercardAgentPayClient(config);
}

export default MastercardAgentPayClient;
