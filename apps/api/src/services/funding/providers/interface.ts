/**
 * Funding Provider Interface
 * Epic 41, Story 41.2: Funding Orchestrator Service
 *
 * Defines the contract all funding providers must implement.
 * Each provider (Stripe, Plaid, Belvo, MoonPay, etc.) implements this interface.
 */

import type {
  FundingSourceType,
  FundingProvider as FundingProviderName,
  CreateFundingSourceParams,
  VerifyFundingSourceParams,
  InitiateFundingParams,
  ProviderSourceResult,
  ProviderVerificationResult,
  ProviderFundingResult,
  ProviderFundingStatus,
  ProviderWebhookEvent,
  WidgetParams,
  WidgetResult,
  FundingSource,
} from '../types.js';

/**
 * Provider capability declaration
 */
export interface ProviderCapability {
  sourceType: FundingSourceType;
  currencies: string[];
  /** Whether source requires client-side setup (e.g., Stripe.js, Plaid Link) */
  requiresClientSetup: boolean;
  /** Whether source requires separate verification step */
  requiresVerification: boolean;
  /** Typical settlement time description */
  settlementTime: string;
  /** Whether provider supports refunds */
  supportsRefunds: boolean;
}

/**
 * Core funding provider interface
 */
export interface IFundingProvider {
  /** Provider name identifier */
  readonly name: FundingProviderName;

  /** Provider display name */
  readonly displayName: string;

  /** List of capabilities this provider supports */
  readonly capabilities: ProviderCapability[];

  /** Whether the provider is configured and available */
  isAvailable(): boolean;

  // ============================================
  // Funding Source Management
  // ============================================

  /**
   * Create a new funding source at the provider.
   * For card/bank: returns client_secret for frontend confirmation.
   * For widgets: returns widget_url.
   * For direct deposit: returns wallet address.
   */
  createSource(
    tenantId: string,
    params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult>;

  /**
   * Verify a funding source (micro-deposits, 3DS, etc.)
   */
  verifySource(
    tenantId: string,
    source: FundingSource,
    params: VerifyFundingSourceParams
  ): Promise<ProviderVerificationResult>;

  /**
   * Remove/deactivate a funding source at the provider
   */
  removeSource(
    tenantId: string,
    source: FundingSource
  ): Promise<void>;

  // ============================================
  // Funding Transactions
  // ============================================

  /**
   * Initiate a funding transaction (charge card, debit bank, etc.)
   */
  initiateFunding(
    tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult>;

  /**
   * Check the status of a funding transaction at the provider
   */
  getFundingStatus(
    providerTransactionId: string
  ): Promise<ProviderFundingStatus>;

  // ============================================
  // Webhooks
  // ============================================

  /**
   * Parse and validate an incoming webhook from this provider
   */
  parseWebhook(
    payload: unknown,
    signature: string,
    headers?: Record<string, string>
  ): Promise<ProviderWebhookEvent>;
}

/**
 * Optional widget interface for providers that use embedded widgets
 * (MoonPay, Transak, Belvo Connect, Plaid Link)
 */
export interface IWidgetProvider extends IFundingProvider {
  /**
   * Generate a widget session/URL for client-side integration
   */
  createWidgetSession(
    tenantId: string,
    params: WidgetParams
  ): Promise<WidgetResult>;
}

/**
 * Type guard for widget providers
 */
export function isWidgetProvider(provider: IFundingProvider): provider is IWidgetProvider {
  return 'createWidgetSession' in provider;
}
