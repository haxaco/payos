/**
 * ACP Client - Agentic Commerce Protocol (Stripe/OpenAI)
 * 
 * Wraps PayOS ACP API endpoints for checkout-based payments.
 */

import type { PayOSClient } from '../../client';
import type {
  Checkout,
  CheckoutWithItems,
  CreateCheckoutRequest,
  CompleteCheckoutRequest,
  CompleteCheckoutResponse,
  ListCheckoutsOptions,
  ListCheckoutsResponse,
} from './types';

export class ACPClient {
  private client: PayOSClient;

  constructor(client: PayOSClient) {
    this.client = client;
  }

  /**
   * Create a new ACP checkout session
   * 
   * @example
   * ```typescript
   * const checkout = await payos.acp.createCheckout({
   *   checkout_id: 'checkout_unique_123',
   *   agent_id: 'agent_shopping_assistant',
   *   account_id: 'acct_uuid',
   *   merchant_id: 'merchant_store',
   *   items: [
   *     {
   *       name: 'Product 1',
   *       quantity: 2,
   *       unit_price: 50.00,
   *       total_price: 100.00,
   *     },
   *   ],
   *   tax_amount: 10.00,
   *   shipping_amount: 5.00,
   * });
   * ```
   */
  public async createCheckout(request: CreateCheckoutRequest): Promise<CheckoutWithItems> {
    const response = await this.client.request<{ data: CheckoutWithItems }>(
      '/v1/acp/checkouts',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
    return response.data;
  }

  /**
   * List checkouts with optional filtering
   * 
   * @example
   * ```typescript
   * const { data, pagination } = await payos.acp.listCheckouts({
   *   status: 'pending',
   *   agent_id: 'agent_shopping_assistant',
   *   limit: 20,
   * });
   * ```
   */
  public async listCheckouts(options: ListCheckoutsOptions = {}): Promise<ListCheckoutsResponse> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.agent_id) params.append('agent_id', options.agent_id);
    if (options.merchant_id) params.append('merchant_id', options.merchant_id);
    if (options.customer_id) params.append('customer_id', options.customer_id);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const path = queryString ? `/v1/acp/checkouts?${queryString}` : '/v1/acp/checkouts';

    return this.client.request<ListCheckoutsResponse>(path);
  }

  /**
   * Get checkout details with items
   * 
   * @example
   * ```typescript
   * const checkout = await payos.acp.getCheckout('checkout_id');
   * console.log(checkout.items);
   * console.log(checkout.total_amount);
   * ```
   */
  public async getCheckout(checkoutId: string): Promise<CheckoutWithItems> {
    const response = await this.client.request<{ data: CheckoutWithItems }>(
      `/v1/acp/checkouts/${checkoutId}`
    );
    return response.data;
  }

  /**
   * Complete a checkout with SharedPaymentToken
   * 
   * @example
   * ```typescript
   * const result = await payos.acp.completeCheckout('checkout_id', {
   *   shared_payment_token: 'spt_...',
   *   payment_method: 'card',
   * });
   * 
   * console.log(result.transfer_id);
   * console.log(result.status); // 'completed'
   * ```
   */
  public async completeCheckout(
    checkoutId: string,
    request: CompleteCheckoutRequest
  ): Promise<CompleteCheckoutResponse> {
    const response = await this.client.request<{ data: CompleteCheckoutResponse }>(
      `/v1/acp/checkouts/${checkoutId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
    return response.data;
  }

  /**
   * Cancel a checkout
   * 
   * @example
   * ```typescript
   * const result = await payos.acp.cancelCheckout('checkout_id');
   * console.log(result.status); // 'cancelled'
   * ```
   */
  public async cancelCheckout(checkoutId: string): Promise<Checkout> {
    const response = await this.client.request<{ data: Checkout }>(
      `/v1/acp/checkouts/${checkoutId}/cancel`,
      {
        method: 'PATCH',
      }
    );
    return response.data;
  }

  /**
   * Get ACP analytics
   * 
   * @example
   * ```typescript
   * const analytics = await payos.acp.getAnalytics('30d');
   * console.log(analytics.summary.totalRevenue);
   * console.log(analytics.summary.averageOrderValue);
   * ```
   */
  public async getAnalytics(period: '24h' | '7d' | '30d' | '90d' | '1y' = '30d') {
    const response = await this.client.request<{ data: any }>(
      `/v1/acp/analytics?period=${period}`
    );
    return response.data;
  }
}

