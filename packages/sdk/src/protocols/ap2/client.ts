/**
 * AP2 Client - Google Agent-to-Agent Protocol
 * 
 * Wraps PayOS AP2 API endpoints for mandate-based payments.
 */

import type { PayOSClient } from '../../client';
import type {
  Mandate,
  MandateWithExecutions,
  CreateMandateRequest,
  ExecuteMandateRequest,
  ExecuteMandateResponse,
  ListMandatesOptions,
  ListMandatesResponse,
} from './types';

export class AP2Client {
  private client: PayOSClient;

  constructor(client: PayOSClient) {
    this.client = client;
  }

  /**
   * Create a new AP2 mandate
   * 
   * @example
   * ```typescript
   * const mandate = await payos.ap2.createMandate({
   *   mandate_id: 'mdt_unique_123',
   *   mandate_type: 'payment',
   *   agent_id: 'agent_ai_assistant',
   *   account_id: 'acct_uuid',
   *   authorized_amount: 100.00,
   *   currency: 'USD',
   * });
   * ```
   */
  public async createMandate(request: CreateMandateRequest): Promise<Mandate> {
    const response = await this.client.request<{ data: Mandate }>(
      '/v1/ap2/mandates',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
    return response.data;
  }

  /**
   * List mandates with optional filtering
   * 
   * @example
   * ```typescript
   * const { data, pagination } = await payos.ap2.listMandates({
   *   status: 'active',
   *   agent_id: 'agent_ai_assistant',
   *   limit: 50,
   * });
   * ```
   */
  public async listMandates(options: ListMandatesOptions = {}): Promise<ListMandatesResponse> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.agent_id) params.append('agent_id', options.agent_id);
    if (options.account_id) params.append('account_id', options.account_id);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const path = queryString ? `/v1/ap2/mandates?${queryString}` : '/v1/ap2/mandates';

    return this.client.request<ListMandatesResponse>(path);
  }

  /**
   * Get mandate details with execution history
   * 
   * @example
   * ```typescript
   * const mandate = await payos.ap2.getMandate('mdt_id');
   * console.log(mandate.remaining_amount);
   * console.log(mandate.executions.length);
   * ```
   */
  public async getMandate(mandateId: string): Promise<MandateWithExecutions> {
    const response = await this.client.request<{ data: MandateWithExecutions }>(
      `/v1/ap2/mandates/${mandateId}`
    );
    return response.data;
  }

  /**
   * Execute a payment against a mandate
   * 
   * @example
   * ```typescript
   * const result = await payos.ap2.executeMandate('mdt_id', {
   *   amount: 25.00,
   *   currency: 'USD',
   *   description: 'Monthly subscription',
   * });
   * 
   * console.log(result.transfer_id);
   * console.log(result.mandate.remaining_amount);
   * ```
   */
  public async executeMandate(
    mandateId: string,
    request: ExecuteMandateRequest
  ): Promise<ExecuteMandateResponse> {
    const response = await this.client.request<{ data: ExecuteMandateResponse }>(
      `/v1/ap2/mandates/${mandateId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
    return response.data;
  }

  /**
   * Cancel an active mandate
   * 
   * @example
   * ```typescript
   * const result = await payos.ap2.cancelMandate('mdt_id');
   * console.log(result.status); // 'cancelled'
   * ```
   */
  public async cancelMandate(mandateId: string): Promise<Mandate> {
    const response = await this.client.request<{ data: Mandate }>(
      `/v1/ap2/mandates/${mandateId}/cancel`,
      {
        method: 'PATCH',
      }
    );
    return response.data;
  }

  /**
   * Get AP2 analytics
   * 
   * @example
   * ```typescript
   * const analytics = await payos.ap2.getAnalytics('30d');
   * console.log(analytics.summary.totalRevenue);
   * console.log(analytics.summary.activeMandates);
   * ```
   */
  public async getAnalytics(period: '24h' | '7d' | '30d' | '90d' | '1y' = '30d') {
    const response = await this.client.request<{ data: any }>(
      `/v1/ap2/analytics?period=${period}`
    );
    return response.data;
  }
}

