import type {
  SlyConfig,
  SettlementQuoteRequest,
  SettlementQuote,
  CreateSettlementRequest,
  Settlement,
  ComplianceCheckRequest,
  ComplianceCheckResponse,
  CapabilitiesResponse,
} from './types';
import { getEnvironmentConfig, inferEnvironmentFromKey } from './config';

/**
 * Base API client for Sly
 *
 * Note: EVM key validation is intentionally NOT done here.
 * The base client only makes REST API calls (Bearer token auth).
 * Protocol-specific clients (x402, etc.) that need EVM signing
 * validate the key themselves.
 */
export class SlyClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: SlyConfig) {
    this.apiKey = config.apiKey;

    // Resolve environment: explicit > inferred from key > default to sandbox
    const environment = config.environment
      ?? inferEnvironmentFromKey(config.apiKey)
      ?? 'sandbox';

    // Use custom API URL if provided, otherwise use environment default
    const envConfig = getEnvironmentConfig(environment);
    this.apiUrl = config.apiUrl || envConfig.apiUrl;
  }

  /**
   * Make an authenticated API request
   */
  public async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({
        message: response.statusText,
      }));
      // Story 51.2: API returns `{ error: { code, message, suggestion, details } }`.
      // Legacy routes return `{ error: "string" }`. Handle both.
      const errField = errorData.error;
      const message =
        (typeof errField === 'string' ? errField : errField?.message) ||
        errorData.message ||
        `HTTP ${response.status}`;
      const error = new Error(message);
      (error as any).status = response.status;
      (error as any).data = errorData;
      (error as any).code =
        (errField && typeof errField === 'object' ? errField.code : undefined) ||
        errorData.code;
      (error as any).details =
        (errField && typeof errField === 'object' ? errField.details : undefined) ||
        errorData.details;
      throw error;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get a settlement quote
   */
  async getSettlementQuote(
    request: SettlementQuoteRequest
  ): Promise<SettlementQuote> {
    return this.request<SettlementQuote>('/v1/settlements/quote', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Create a settlement
   */
  async createSettlement(
    request: CreateSettlementRequest
  ): Promise<Settlement> {
    return this.request<Settlement>('/v1/settlements', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get settlement status
   */
  async getSettlement(settlementId: string): Promise<Settlement> {
    return this.request<Settlement>(`/v1/settlements/${settlementId}`);
  }

  /**
   * Check compliance for a recipient
   */
  async checkCompliance(
    request: ComplianceCheckRequest
  ): Promise<ComplianceCheckResponse> {
    return this.request<ComplianceCheckResponse>('/v1/compliance/check', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get API capabilities
   */
  async getCapabilities(): Promise<CapabilitiesResponse> {
    return this.request<CapabilitiesResponse>('/v1/capabilities');
  }
}

// Backward compatibility alias
export { SlyClient as PayOSClient };

