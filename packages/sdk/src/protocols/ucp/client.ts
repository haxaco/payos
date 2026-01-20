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
  // PayOS-hosted types (Phases 2-4)
  PayOSCheckout,
  CreatePayOSCheckoutRequest,
  UpdatePayOSCheckoutRequest,
  PayOSOrder,
  PayOSOrderStatus,
  ListPayOSOrdersOptions,
  ListPayOSOrdersResponse,
  PayOSExpectation,
  PayOSFulfillmentEvent,
  PayOSAdjustment,
  RegisterOAuthClientRequest,
  RegisterOAuthClientResponse,
  UCPLinkedAccount,
  UCPTokenResponse,
  UCPAuthorizationInfo,
  UCPConsentRequest,
  UCPConsentResponse,
  UCPScopeInfo,
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

  // ===========================================================================
  // PayOS-Hosted Checkout Sessions (Phase 2)
  // ===========================================================================

  /**
   * Create a PayOS-hosted checkout session
   *
   * @example
   * ```typescript
   * const checkout = await payos.ucp.checkouts.create({
   *   currency: 'USD',
   *   line_items: [
   *     { id: 'item_1', name: 'Product', quantity: 1, unit_price: 1000, total_price: 1000, currency: 'USD' }
   *   ],
   *   buyer: { email: 'buyer@example.com' },
   * });
   * ```
   */
  public get checkouts() {
    return {
      create: async (request: CreatePayOSCheckoutRequest): Promise<PayOSCheckout> => {
        return this.client.request<PayOSCheckout>('/v1/ucp/checkouts', {
          method: 'POST',
          body: JSON.stringify(request),
        });
      },

      get: async (checkoutId: string): Promise<PayOSCheckout> => {
        return this.client.request<PayOSCheckout>(`/v1/ucp/checkouts/${checkoutId}`);
      },

      update: async (checkoutId: string, request: UpdatePayOSCheckoutRequest): Promise<PayOSCheckout> => {
        return this.client.request<PayOSCheckout>(`/v1/ucp/checkouts/${checkoutId}`, {
          method: 'PUT',
          body: JSON.stringify(request),
        });
      },

      complete: async (checkoutId: string): Promise<PayOSCheckout> => {
        return this.client.request<PayOSCheckout>(`/v1/ucp/checkouts/${checkoutId}/complete`, {
          method: 'POST',
        });
      },

      cancel: async (checkoutId: string): Promise<PayOSCheckout> => {
        return this.client.request<PayOSCheckout>(`/v1/ucp/checkouts/${checkoutId}/cancel`, {
          method: 'POST',
        });
      },

      addPaymentInstrument: async (
        checkoutId: string,
        instrument: { id: string; handler: string; type: string; last4?: string; brand?: string }
      ): Promise<PayOSCheckout> => {
        return this.client.request<PayOSCheckout>(`/v1/ucp/checkouts/${checkoutId}/instruments`, {
          method: 'POST',
          body: JSON.stringify(instrument),
        });
      },
    };
  }

  // ===========================================================================
  // PayOS Orders (Phase 3)
  // ===========================================================================

  /**
   * Manage PayOS orders
   *
   * @example
   * ```typescript
   * const order = await payos.ucp.orders.get('ord_123');
   * const orders = await payos.ucp.orders.list({ status: 'processing' });
   * ```
   */
  public get orders() {
    return {
      get: async (orderId: string): Promise<PayOSOrder> => {
        return this.client.request<PayOSOrder>(`/v1/ucp/orders/${orderId}`);
      },

      list: async (options: ListPayOSOrdersOptions = {}): Promise<ListPayOSOrdersResponse> => {
        const params = new URLSearchParams();
        if (options.status) params.append('status', options.status);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.offset) params.append('offset', options.offset.toString());

        const queryString = params.toString();
        const path = queryString ? `/v1/ucp/orders?${queryString}` : '/v1/ucp/orders';

        return this.client.request<ListPayOSOrdersResponse>(path);
      },

      updateStatus: async (orderId: string, status: PayOSOrderStatus): Promise<PayOSOrder> => {
        return this.client.request<PayOSOrder>(`/v1/ucp/orders/${orderId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
      },

      cancel: async (orderId: string, reason?: string): Promise<PayOSOrder> => {
        return this.client.request<PayOSOrder>(`/v1/ucp/orders/${orderId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      },

      addExpectation: async (
        orderId: string,
        expectation: Omit<PayOSExpectation, 'id'>
      ): Promise<PayOSOrder> => {
        return this.client.request<PayOSOrder>(`/v1/ucp/orders/${orderId}/expectations`, {
          method: 'POST',
          body: JSON.stringify(expectation),
        });
      },

      updateExpectation: async (
        orderId: string,
        expectationId: string,
        updates: Partial<Omit<PayOSExpectation, 'id'>>
      ): Promise<PayOSOrder> => {
        return this.client.request<PayOSOrder>(
          `/v1/ucp/orders/${orderId}/expectations/${expectationId}`,
          {
            method: 'PUT',
            body: JSON.stringify(updates),
          }
        );
      },

      addEvent: async (
        orderId: string,
        event: Omit<PayOSFulfillmentEvent, 'id' | 'timestamp'>
      ): Promise<PayOSOrder> => {
        return this.client.request<PayOSOrder>(`/v1/ucp/orders/${orderId}/events`, {
          method: 'POST',
          body: JSON.stringify(event),
        });
      },

      getEvents: async (orderId: string): Promise<{ data: PayOSFulfillmentEvent[] }> => {
        return this.client.request<{ data: PayOSFulfillmentEvent[] }>(
          `/v1/ucp/orders/${orderId}/events`
        );
      },

      addAdjustment: async (
        orderId: string,
        adjustment: Omit<PayOSAdjustment, 'id' | 'created_at'>
      ): Promise<PayOSOrder> => {
        return this.client.request<PayOSOrder>(`/v1/ucp/orders/${orderId}/adjustments`, {
          method: 'POST',
          body: JSON.stringify(adjustment),
        });
      },
    };
  }

  // ===========================================================================
  // Identity Linking (Phase 4)
  // ===========================================================================

  /**
   * OAuth 2.0 identity linking for AI agents/platforms
   *
   * @example
   * ```typescript
   * // Register an OAuth client
   * const { client, client_secret } = await payos.ucp.identity.registerClient({
   *   name: 'My AI Agent',
   *   redirect_uris: ['https://myagent.com/callback'],
   * });
   *
   * // List linked accounts
   * const accounts = await payos.ucp.identity.listLinkedAccounts({ buyer_id: 'buyer_123' });
   * ```
   */
  public get identity() {
    return {
      /**
       * Register an OAuth client (platform/agent)
       */
      registerClient: async (request: RegisterOAuthClientRequest): Promise<RegisterOAuthClientResponse> => {
        return this.client.request<RegisterOAuthClientResponse>('/v1/ucp/identity/clients', {
          method: 'POST',
          body: JSON.stringify(request),
        });
      },

      /**
       * Get authorization info for consent screen
       */
      getAuthorizationInfo: async (params: {
        response_type: 'code';
        client_id: string;
        redirect_uri: string;
        scope: string;
        state: string;
        code_challenge?: string;
        code_challenge_method?: 'S256' | 'plain';
      }): Promise<UCPAuthorizationInfo> => {
        const searchParams = new URLSearchParams();
        searchParams.append('response_type', params.response_type);
        searchParams.append('client_id', params.client_id);
        searchParams.append('redirect_uri', params.redirect_uri);
        searchParams.append('scope', params.scope);
        searchParams.append('state', params.state);
        if (params.code_challenge) {
          searchParams.append('code_challenge', params.code_challenge);
        }
        if (params.code_challenge_method) {
          searchParams.append('code_challenge_method', params.code_challenge_method);
        }

        return this.client.request<UCPAuthorizationInfo>(
          `/v1/ucp/identity/authorize?${searchParams.toString()}`
        );
      },

      /**
       * Submit consent decision (after user authenticates)
       */
      submitConsent: async (request: UCPConsentRequest): Promise<UCPConsentResponse> => {
        return this.client.request<UCPConsentResponse>('/v1/ucp/identity/authorize/consent', {
          method: 'POST',
          body: JSON.stringify(request),
        });
      },

      /**
       * Exchange authorization code for tokens
       */
      exchangeCode: async (params: {
        client_id: string;
        client_secret?: string;
        code: string;
        redirect_uri: string;
        code_verifier?: string;
      }): Promise<UCPTokenResponse> => {
        return this.client.request<UCPTokenResponse>('/v1/ucp/identity/token', {
          method: 'POST',
          body: JSON.stringify({
            grant_type: 'authorization_code',
            ...params,
          }),
        });
      },

      /**
       * Refresh tokens
       */
      refreshTokens: async (params: {
        client_id: string;
        client_secret?: string;
        refresh_token: string;
      }): Promise<UCPTokenResponse> => {
        return this.client.request<UCPTokenResponse>('/v1/ucp/identity/token', {
          method: 'POST',
          body: JSON.stringify({
            grant_type: 'refresh_token',
            ...params,
          }),
        });
      },

      /**
       * Revoke a token
       */
      revokeToken: async (params: {
        token: string;
        token_type_hint?: 'access_token' | 'refresh_token';
        client_id: string;
        client_secret?: string;
      }): Promise<{ success: boolean }> => {
        return this.client.request<{ success: boolean }>('/v1/ucp/identity/revoke', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },

      /**
       * List linked accounts
       */
      listLinkedAccounts: async (params: {
        buyer_id?: string;
        platform_id?: string;
        limit?: number;
        offset?: number;
      }): Promise<{ data: UCPLinkedAccount[]; pagination?: { limit: number; offset: number; total: number } }> => {
        const searchParams = new URLSearchParams();
        if (params.buyer_id) searchParams.append('buyer_id', params.buyer_id);
        if (params.platform_id) searchParams.append('platform_id', params.platform_id);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        return this.client.request<{ data: UCPLinkedAccount[]; pagination?: { limit: number; offset: number; total: number } }>(
          `/v1/ucp/identity/linked-accounts?${searchParams.toString()}`
        );
      },

      /**
       * Unlink an account
       */
      unlinkAccount: async (accountId: string, buyerId: string): Promise<{ success: boolean }> => {
        return this.client.request<{ success: boolean }>(
          `/v1/ucp/identity/linked-accounts/${accountId}?buyer_id=${buyerId}`,
          { method: 'DELETE' }
        );
      },

      /**
       * Get available scopes
       */
      getScopes: async (): Promise<{ data: UCPScopeInfo[] }> => {
        return this.client.request<{ data: UCPScopeInfo[] }>('/v1/ucp/identity/scopes');
      },
    };
  }
}
