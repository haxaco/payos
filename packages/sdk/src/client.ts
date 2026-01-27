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
import { getEnvironmentConfig, validateEnvironment } from './config';

/**
 * Base API client for Sly
 */
export class SlyClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: SlyConfig) {
    validateEnvironment(config.environment, config.evmPrivateKey);

    this.apiKey = config.apiKey;
    
    // Use custom API URL if provided, otherwise use environment default
    const envConfig = getEnvironmentConfig(config.environment);
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
        message: response.statusText 
      }));
      const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      (error as any).status = response.status;
      (error as any).data = errorData;
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

