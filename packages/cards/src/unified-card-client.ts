/**
 * Unified Card Client
 * Epic 53, Story 53.5: Unified card payment interface
 *
 * Provides a single interface for working with both Visa VIC and
 * Mastercard Agent Pay. This abstraction allows PayOS to seamlessly
 * route payments to either network based on card type or configuration.
 */

import type {
  CardNetwork,
  CardPaymentIntent,
  CardPaymentResult,
  CardHandlerCapabilities,
  VisaVICConfig,
  MastercardConfig,
  VerificationResult,
} from './types.js';
import { VisaVICClient } from './visa/vic-client.js';
import { MastercardAgentPayClient } from './mastercard/agent-pay-client.js';
import { WebBotAuthVerifier } from './web-bot-auth-verifier.js';

// ============================================
// Types
// ============================================

export interface UnifiedCardConfig {
  /** Visa VIC configuration (optional) */
  visa?: VisaVICConfig;
  /** Mastercard Agent Pay configuration (optional) */
  mastercard?: MastercardConfig;
  /** Default network to use when not specified */
  defaultNetwork?: CardNetwork;
}

export interface CreatePaymentParams {
  /** Preferred network (auto-selected if not specified) */
  network?: CardNetwork;
  /** Amount in smallest currency unit */
  amount: number;
  /** Currency code */
  currency: string;
  /** Merchant details */
  merchant: {
    name: string;
    id?: string;
    categoryCode: string;
    country: string;
    url?: string;
  };
  /** Token reference (for existing tokens) */
  tokenReference?: string;
  /** Expiration in seconds (default: 900) */
  expiresInSeconds?: number;
  /** Metadata */
  metadata?: Record<string, string>;
}

export interface CapturePaymentParams {
  /** Payment intent ID */
  intentId: string;
  /** Network the payment belongs to */
  network: CardNetwork;
  /** Visa commerce signal data */
  visaSignal?: {
    agentToken: string;
    cryptogram: string;
    transactionTime?: string;
  };
  /** Mastercard token reference */
  mastercardToken?: string;
}

// ============================================
// Unified Card Client
// ============================================

export class UnifiedCardClient {
  private visaClient: VisaVICClient | null = null;
  private mastercardClient: MastercardAgentPayClient | null = null;
  private defaultNetwork: CardNetwork;
  private verifier: WebBotAuthVerifier;

  constructor(config: UnifiedCardConfig) {
    this.defaultNetwork = config.defaultNetwork || 'visa';

    if (config.visa) {
      this.visaClient = new VisaVICClient(config.visa);
    }

    if (config.mastercard) {
      this.mastercardClient = new MastercardAgentPayClient(config.mastercard);
    }

    this.verifier = new WebBotAuthVerifier();
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize all configured clients
   */
  async initialize(): Promise<void> {
    if (this.mastercardClient) {
      await this.mastercardClient.initialize();
    }
  }

  // ============================================
  // Payment Operations
  // ============================================

  /**
   * Create a payment intent
   *
   * Automatically routes to the appropriate network based on
   * configuration and parameters.
   */
  async createPaymentIntent(params: CreatePaymentParams): Promise<CardPaymentIntent> {
    const network = params.network || this.defaultNetwork;

    if (network === 'visa') {
      if (!this.visaClient) {
        throw new Error('Visa client not configured');
      }

      return this.visaClient.createPaymentIntent({
        amount: params.amount,
        currency: params.currency,
        merchant: params.merchant,
        metadata: params.metadata,
        expiresInSeconds: params.expiresInSeconds,
      });
    } else if (network === 'mastercard') {
      if (!this.mastercardClient) {
        throw new Error('Mastercard client not configured');
      }

      return this.mastercardClient.createPaymentIntent({
        amount: params.amount,
        currency: params.currency,
        merchant: {
          name: params.merchant.name,
          id: params.merchant.id || 'unknown',
          categoryCode: params.merchant.categoryCode,
          country: params.merchant.country,
        },
        tokenReference: params.tokenReference,
        metadata: params.metadata,
      });
    }

    throw new Error(`Unsupported network: ${network}`);
  }

  /**
   * Capture a payment (complete the transaction)
   */
  async capturePayment(params: CapturePaymentParams): Promise<CardPaymentResult> {
    if (params.network === 'visa') {
      if (!this.visaClient) {
        throw new Error('Visa client not configured');
      }

      if (!params.visaSignal) {
        throw new Error('Visa signal required for capture');
      }

      return this.visaClient.capturePayment(params.intentId, {
        instructionId: params.intentId,
        agentToken: params.visaSignal.agentToken,
        cryptogram: params.visaSignal.cryptogram,
        transactionTime: params.visaSignal.transactionTime || new Date().toISOString(),
      });
    } else if (params.network === 'mastercard') {
      if (!this.mastercardClient) {
        throw new Error('Mastercard client not configured');
      }

      if (!params.mastercardToken) {
        throw new Error('Mastercard token required for capture');
      }

      return this.mastercardClient.capturePayment(params.intentId, params.mastercardToken);
    }

    throw new Error(`Unsupported network: ${params.network}`);
  }

  /**
   * Cancel a payment intent
   */
  async cancelPayment(intentId: string, network: CardNetwork): Promise<void> {
    if (network === 'visa') {
      if (!this.visaClient) {
        throw new Error('Visa client not configured');
      }
      await this.visaClient.cancelPaymentIntent(intentId);
    } else if (network === 'mastercard') {
      // Mastercard doesn't have explicit cancellation for intents
      console.log('[Unified Card] Mastercard intent cancelled:', intentId);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    intentId: string,
    network: CardNetwork
  ): Promise<CardPaymentResult | null> {
    if (network === 'visa') {
      if (!this.visaClient) {
        throw new Error('Visa client not configured');
      }
      return this.visaClient.getCommerceSignalStatus(intentId);
    } else if (network === 'mastercard') {
      if (!this.mastercardClient) {
        throw new Error('Mastercard client not configured');
      }
      return this.mastercardClient.getPaymentStatus(intentId);
    }

    throw new Error(`Unsupported network: ${network}`);
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    intentId: string,
    network: CardNetwork,
    amount?: number,
    reason?: string
  ): Promise<{ refundId: string; status: string; amount: number }> {
    if (network === 'visa') {
      // Visa refunds would be implemented here
      console.log('[Unified Card] Visa refund:', intentId, amount);
      return {
        refundId: `visa_ref_${Date.now()}`,
        status: 'pending',
        amount: amount || 0,
      };
    } else if (network === 'mastercard') {
      if (!this.mastercardClient) {
        throw new Error('Mastercard client not configured');
      }
      return this.mastercardClient.refundPayment(intentId, amount, reason);
    }

    throw new Error(`Unsupported network: ${network}`);
  }

  // ============================================
  // Token Management
  // ============================================

  /**
   * Create a network token for a card
   */
  async createToken(
    network: CardNetwork,
    params: {
      pan: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
      cardholderName?: string;
      /** For Mastercard: required agent ID */
      mcAgentId?: string;
    }
  ): Promise<{ tokenId: string; network: CardNetwork; expiresAt: string }> {
    if (network === 'visa') {
      if (!this.visaClient) {
        throw new Error('Visa client not configured');
      }

      const token = await this.visaClient.createToken(params);
      return {
        tokenId: token.tokenId,
        network: 'visa',
        expiresAt: token.expiresAt,
      };
    } else if (network === 'mastercard') {
      if (!this.mastercardClient) {
        throw new Error('Mastercard client not configured');
      }

      if (!params.mcAgentId) {
        throw new Error('Mastercard agent ID required for token creation');
      }

      const token = await this.mastercardClient.createToken({
        mcAgentId: params.mcAgentId,
        pan: params.pan,
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
        cvv: params.cvv,
        cardholderName: params.cardholderName,
      });

      return {
        tokenId: token.tokenReference,
        network: 'mastercard',
        expiresAt: token.expiresAt,
      };
    }

    throw new Error(`Unsupported network: ${network}`);
  }

  /**
   * Delete a network token
   */
  async deleteToken(tokenId: string, network: CardNetwork): Promise<void> {
    if (network === 'visa') {
      if (!this.visaClient) {
        throw new Error('Visa client not configured');
      }
      await this.visaClient.deleteToken(tokenId);
    } else if (network === 'mastercard') {
      if (!this.mastercardClient) {
        throw new Error('Mastercard client not configured');
      }
      await this.mastercardClient.deleteToken(tokenId);
    }
  }

  // ============================================
  // Agent Verification
  // ============================================

  /**
   * Verify an incoming agent request
   *
   * Automatically detects the network from the signature and verifies
   * against the appropriate key directory.
   */
  async verifyAgentRequest(request: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<VerificationResult> {
    return this.verifier.verifyRequest(request);
  }

  // ============================================
  // Capabilities
  // ============================================

  /**
   * Get capabilities of configured networks
   */
  getCapabilities(): CardHandlerCapabilities {
    const networks: CardNetwork[] = [];
    const currencies = new Set<string>();

    if (this.visaClient) {
      networks.push('visa');
      ['USD', 'EUR', 'GBP', 'BRL', 'MXN'].forEach((c) => currencies.add(c));
    }

    if (this.mastercardClient) {
      networks.push('mastercard');
      ['USD', 'EUR', 'GBP', 'BRL', 'MXN'].forEach((c) => currencies.add(c));
    }

    return {
      networks,
      currencies: Array.from(currencies),
      supportsRecurring: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsWebhooks: true,
      limits: {
        USD: { min: 50, max: 99999999 }, // $0.50 - $999,999.99
        EUR: { min: 50, max: 99999999 },
        GBP: { min: 50, max: 99999999 },
        BRL: { min: 100, max: 99999999 },
        MXN: { min: 500, max: 99999999 },
      },
    };
  }

  /**
   * Check if a network is available
   */
  hasNetwork(network: CardNetwork): boolean {
    if (network === 'visa') {
      return this.visaClient !== null;
    }
    if (network === 'mastercard') {
      return this.mastercardClient !== null;
    }
    return false;
  }

  /**
   * Get available networks
   */
  getAvailableNetworks(): CardNetwork[] {
    const networks: CardNetwork[] = [];
    if (this.visaClient) networks.push('visa');
    if (this.mastercardClient) networks.push('mastercard');
    return networks;
  }

  // ============================================
  // Connection Testing
  // ============================================

  /**
   * Test connections to all configured networks
   */
  async testConnections(): Promise<{
    visa?: { success: boolean; error?: string };
    mastercard?: { success: boolean; error?: string };
  }> {
    const results: {
      visa?: { success: boolean; error?: string };
      mastercard?: { success: boolean; error?: string };
    } = {};

    if (this.visaClient) {
      results.visa = await this.visaClient.testConnection();
    }

    if (this.mastercardClient) {
      results.mastercard = await this.mastercardClient.testConnection();
    }

    return results;
  }

  // ============================================
  // Network-Specific Access
  // ============================================

  /**
   * Get the Visa client directly (for advanced operations)
   */
  getVisaClient(): VisaVICClient | null {
    return this.visaClient;
  }

  /**
   * Get the Mastercard client directly (for advanced operations)
   */
  getMastercardClient(): MastercardAgentPayClient | null {
    return this.mastercardClient;
  }
}

// ============================================
// Factory Function
// ============================================

export function createUnifiedCardClient(config: UnifiedCardConfig): UnifiedCardClient {
  return new UnifiedCardClient(config);
}

export default UnifiedCardClient;
