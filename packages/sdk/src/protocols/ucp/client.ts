/**
 * UCP Client - Universal Commerce Protocol
 *
 * Wraps PayOS UCP API endpoints for settlement and merchant discovery.
 *
 * @see Story 43.9: UCP Client Module
 * @see https://ucp.dev/specification/overview/
 */

import type { PayOSClient } from '../../client';
import type {
  UCPProfile,
  UCPCorridor,
  UCPQuoteRequest,
  UCPQuote,
  UCPTokenRequest,
  UCPToken,
  UCPSettleRequest,
  UCPSettlement,
  ListSettlementsOptions,
  ListSettlementsResponse,
  UCPHandlerInfo,
  UCPCheckoutRequest,
  UCPCheckout,
  UCPCompleteCheckoutRequest,
  UCPOrder,
} from './types';

// Profile cache for discovered merchants
const profileCache = new Map<string, { profile: UCPProfile; fetchedAt: number }>();
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class UCPClient {
  private client: PayOSClient;

  constructor(client: PayOSClient) {
    this.client = client;
  }

  // ===========================================================================
  // Discovery
  // ===========================================================================

  /**
   * Discover a UCP merchant's capabilities
   *
   * Fetches and caches the merchant's UCP profile from /.well-known/ucp
   *
   * @example
   * ```typescript
   * const merchant = await payos.ucp.discover('https://shop.example.com');
   * console.log(merchant.ucp.version);
   * console.log(merchant.payment?.handlers);
   * ```
   */
  public async discover(merchantUrl: string): Promise<UCPProfile> {
    // Normalize URL
    const baseUrl = merchantUrl.replace(/\/$/, '');
    const profileUrl = `${baseUrl}/.well-known/ucp`;

    // Check cache
    const cached = profileCache.get(profileUrl);
    if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL_MS) {
      return cached.profile;
    }

    // Fetch profile
    const response = await fetch(profileUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PayOS-SDK/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to discover UCP profile: ${response.status} ${response.statusText}`);
    }

    const profile = (await response.json()) as UCPProfile;

    // Validate basic structure
    if (!profile.ucp?.version) {
      throw new Error('Invalid UCP profile: missing ucp.version');
    }

    // Cache the profile
    profileCache.set(profileUrl, {
      profile,
      fetchedAt: Date.now(),
    });

    return profile;
  }

  /**
   * Get PayOS's own UCP profile
   *
   * @example
   * ```typescript
   * const profile = await payos.ucp.getProfile();
   * console.log(profile.payment?.handlers);
   * ```
   */
  public async getProfile(): Promise<UCPProfile> {
    return this.client.request<UCPProfile>('/.well-known/ucp');
  }

  /**
   * Get available settlement corridors
   *
   * @example
   * ```typescript
   * const corridors = await payos.ucp.getCorridors();
   * console.log(corridors.find(c => c.rail === 'pix'));
   * ```
   */
  public async getCorridors(): Promise<UCPCorridor[]> {
    const response = await this.client.request<{ corridors: UCPCorridor[] }>(
      '/v1/ucp/corridors'
    );
    return response.corridors;
  }

  /**
   * Get UCP handler info
   *
   * @example
   * ```typescript
   * const info = await payos.ucp.getHandlerInfo();
   * console.log(info.handler.name); // com.payos.latam_settlement
   * ```
   */
  public async getHandlerInfo(): Promise<UCPHandlerInfo> {
    return this.client.request<UCPHandlerInfo>('/v1/ucp/info');
  }

  // ===========================================================================
  // Quotes
  // ===========================================================================

  /**
   * Get an FX quote for a settlement corridor
   *
   * @example
   * ```typescript
   * const quote = await payos.ucp.getQuote({
   *   corridor: 'pix',
   *   amount: 100,
   *   currency: 'USD',
   * });
   * console.log(`${quote.from_amount} USD = ${quote.to_amount} BRL`);
   * ```
   */
  public async getQuote(request: UCPQuoteRequest): Promise<UCPQuote> {
    return this.client.request<UCPQuote>('/v1/ucp/quote', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ===========================================================================
  // Token Acquisition (Payment Handler flow)
  // ===========================================================================

  /**
   * Acquire a settlement token for completing a UCP checkout
   *
   * Tokens are valid for 15 minutes and lock in the FX rate.
   *
   * @example
   * ```typescript
   * const token = await payos.ucp.acquireToken({
   *   corridor: 'pix',
   *   amount: 100,
   *   currency: 'USD',
   *   recipient: {
   *     type: 'pix',
   *     pix_key: '12345678901',
   *     pix_key_type: 'cpf',
   *     name: 'Maria Silva',
   *   },
   * });
   *
   * console.log(token.token); // ucp_tok_...
   * console.log(token.quote.to_amount); // 595.00 BRL
   * ```
   */
  public async acquireToken(request: UCPTokenRequest): Promise<UCPToken> {
    return this.client.request<UCPToken>('/v1/ucp/tokens', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ===========================================================================
  // Settlement Execution
  // ===========================================================================

  /**
   * Complete settlement using a previously acquired token
   *
   * @example
   * ```typescript
   * const settlement = await payos.ucp.settle({
   *   token: 'ucp_tok_...',
   *   idempotency_key: 'checkout_12345',
   * });
   *
   * console.log(settlement.status); // pending
   * console.log(settlement.id); // Use this to track status
   * ```
   */
  public async settle(request: UCPSettleRequest): Promise<UCPSettlement> {
    return this.client.request<UCPSettlement>('/v1/ucp/settle', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get settlement status by ID
   *
   * @example
   * ```typescript
   * const settlement = await payos.ucp.getSettlement('uuid');
   * if (settlement.status === 'completed') {
   *   console.log(`Completed at ${settlement.completed_at}`);
   * }
   * ```
   */
  public async getSettlement(settlementId: string): Promise<UCPSettlement> {
    return this.client.request<UCPSettlement>(`/v1/ucp/settlements/${settlementId}`);
  }

  /**
   * List settlements with optional filtering
   *
   * @example
   * ```typescript
   * const { data, pagination } = await payos.ucp.listSettlements({
   *   status: 'completed',
   *   corridor: 'pix',
   *   limit: 50,
   * });
   * ```
   */
  public async listSettlements(
    options: ListSettlementsOptions = {}
  ): Promise<ListSettlementsResponse> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.corridor) params.append('corridor', options.corridor);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const path = queryString ? `/v1/ucp/settlements?${queryString}` : '/v1/ucp/settlements';

    return this.client.request<ListSettlementsResponse>(path);
  }

  // ===========================================================================
  // Checkout (Consuming UCP Merchants)
  // ===========================================================================

  /**
   * Create a checkout session with a UCP merchant
   *
   * @example
   * ```typescript
   * const checkout = await payos.ucp.createCheckout('https://shop.example.com', {
   *   line_items: [
   *     { product_id: 'prod_123', quantity: 2 },
   *   ],
   *   buyer: { email: 'buyer@example.com' },
   * });
   *
   * console.log(checkout.totals.total);
   * ```
   */
  public async createCheckout(
    merchantUrl: string,
    request: UCPCheckoutRequest
  ): Promise<UCPCheckout> {
    // Discover merchant to get checkout endpoint
    const profile = await this.discover(merchantUrl);

    if (!profile.checkout?.endpoint) {
      throw new Error('Merchant does not support UCP checkout');
    }

    const response = await fetch(profile.checkout.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayOS-SDK/1.0',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to create checkout: ${response.status} - ${JSON.stringify(error)}`);
    }

    return (await response.json()) as UCPCheckout;
  }

  /**
   * Complete a checkout with PayOS LATAM settlement
   *
   * This is a convenience method that:
   * 1. Acquires a settlement token
   * 2. Completes the checkout with the merchant
   *
   * @example
   * ```typescript
   * const order = await payos.ucp.completeCheckout(
   *   'https://shop.example.com',
   *   checkout.id,
   *   {
   *     corridor: 'pix',
   *     recipient: {
   *       type: 'pix',
   *       pix_key: '12345678901',
   *       pix_key_type: 'cpf',
   *       name: 'Maria Silva',
   *     },
   *   }
   * );
   *
   * console.log(order.id);
   * console.log(order.payment.settlement_id);
   * ```
   */
  public async completeCheckout(
    merchantUrl: string,
    checkoutId: string,
    settlement: {
      corridor: 'pix' | 'spei';
      recipient: UCPTokenRequest['recipient'];
    }
  ): Promise<UCPOrder> {
    // Get checkout details to know the amount
    const profile = await this.discover(merchantUrl);

    if (!profile.checkout?.endpoint) {
      throw new Error('Merchant does not support UCP checkout');
    }

    // Fetch checkout to get amount
    const checkoutResponse = await fetch(`${profile.checkout.endpoint}/${checkoutId}`, {
      headers: {
        'User-Agent': 'PayOS-SDK/1.0',
      },
    });

    if (!checkoutResponse.ok) {
      throw new Error(`Failed to fetch checkout: ${checkoutResponse.status}`);
    }

    const checkout = (await checkoutResponse.json()) as UCPCheckout;

    // Acquire settlement token
    const token = await this.acquireToken({
      corridor: settlement.corridor,
      amount: checkout.totals.total,
      currency: checkout.totals.currency as 'USD' | 'USDC',
      recipient: settlement.recipient,
    });

    // Complete checkout with merchant
    const completeRequest: UCPCompleteCheckoutRequest = {
      payment_handler: 'payos_latam',
      payment_data: {
        token: token.token,
      },
    };

    const completeResponse = await fetch(`${profile.checkout.endpoint}/${checkoutId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayOS-SDK/1.0',
      },
      body: JSON.stringify(completeRequest),
    });

    if (!completeResponse.ok) {
      const error = await completeResponse.json().catch(() => ({}));
      throw new Error(`Failed to complete checkout: ${completeResponse.status} - ${JSON.stringify(error)}`);
    }

    return (await completeResponse.json()) as UCPOrder;
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Clear the profile cache (useful for testing)
   */
  public clearCache(): void {
    profileCache.clear();
  }

  /**
   * Check if PayOS supports a specific corridor
   *
   * @example
   * ```typescript
   * if (await payos.ucp.supportsCorridors('USD', 'BRL', 'pix')) {
   *   // Can settle via Pix
   * }
   * ```
   */
  public async supportsCorridor(
    sourceCurrency: string,
    destinationCurrency: string,
    rail: string
  ): Promise<boolean> {
    const corridors = await this.getCorridors();
    return corridors.some(
      (c) =>
        c.source_currency === sourceCurrency &&
        c.destination_currency === destinationCurrency &&
        c.rail === rail
    );
  }

  /**
   * Create Pix recipient helper
   *
   * @example
   * ```typescript
   * const recipient = payos.ucp.createPixRecipient({
   *   pix_key: '12345678901',
   *   pix_key_type: 'cpf',
   *   name: 'Maria Silva',
   * });
   * ```
   */
  public createPixRecipient(params: {
    pix_key: string;
    pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
    name: string;
    tax_id?: string;
  }): UCPTokenRequest['recipient'] {
    return {
      type: 'pix',
      ...params,
    };
  }

  /**
   * Create SPEI recipient helper
   *
   * @example
   * ```typescript
   * const recipient = payos.ucp.createSpeiRecipient({
   *   clabe: '012345678901234567',
   *   name: 'Juan Garcia',
   * });
   * ```
   */
  public createSpeiRecipient(params: {
    clabe: string;
    name: string;
    rfc?: string;
  }): UCPTokenRequest['recipient'] {
    return {
      type: 'spei',
      ...params,
    };
  }
}
