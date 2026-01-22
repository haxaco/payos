/**
 * Circle Payment Handler
 * Epic 48, Story 48.4: Circle implementation of PaymentHandler interface
 *
 * Circle provides USDC payment infrastructure.
 * Supports both sandbox and production environments.
 */

import type {
  PaymentHandler,
  PaymentMethod,
  Currency,
  PaymentIntentParams,
  PaymentIntent,
  PaymentResult,
  RefundResult,
  WebhookEvent,
  HandlerCapabilities,
  CircleCredentials,
} from './interface.js';

// Circle API endpoints
const CIRCLE_SANDBOX_URL = 'https://api-sandbox.circle.com';
const CIRCLE_PRODUCTION_URL = 'https://api.circle.com';

/**
 * Validate Circle credentials by making a test API call
 * Supports both Core API keys (Bearer token) and Programmable Wallets API keys (TEST_API_KEY:id:secret format)
 */
export async function validateCircleCredentials(
  credentials: CircleCredentials
): Promise<{ valid: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
  const baseUrl = credentials.sandbox ? CIRCLE_SANDBOX_URL : CIRCLE_PRODUCTION_URL;
  const apiKey = credentials.api_key;

  // Detect if this is a Programmable Wallets API key (format: TEST_API_KEY:id:secret or API_KEY:id:secret)
  const isProgrammableWalletsKey = apiKey.includes(':');

  try {
    if (isProgrammableWalletsKey) {
      // Programmable Wallets API - use /v1/w3s/wallets endpoint
      const response = await fetch(`${baseUrl}/v1/w3s/wallets?pageSize=1`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Circle Programmable Wallets authentication failed:', errorData);

        if (response.status === 401 || response.status === 403) {
          return { valid: false, error: 'Invalid API key' };
        }

        return {
          valid: false,
          error: errorData.message || 'Failed to authenticate with Circle',
        };
      }

      const walletsData = await response.json();

      return {
        valid: true,
        accountInfo: {
          environment: credentials.sandbox ? 'sandbox' : 'production',
          api_type: 'programmable_wallets',
          wallets_count: walletsData.data?.wallets?.length || 0,
        },
      };
    } else {
      // Core API - use /v1/configuration endpoint
      const response = await fetch(`${baseUrl}/v1/configuration`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Circle Core API authentication failed:', errorData);

        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' };
        }

        if (response.status === 403) {
          return { valid: false, error: 'API key lacks required permissions' };
        }

        return {
          valid: false,
          error: errorData.message || 'Failed to authenticate with Circle',
        };
      }

      const configData = await response.json();

      return {
        valid: true,
        accountInfo: {
          environment: credentials.sandbox ? 'sandbox' : 'production',
          api_type: 'core',
          payments_supported: configData.data?.payments?.masterWalletId ? true : false,
          master_wallet_id: configData.data?.payments?.masterWalletId,
        },
      };
    }
  } catch (error: any) {
    console.error('Circle credential validation error:', error);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { valid: false, error: 'Unable to connect to Circle API' };
    }

    return { valid: false, error: error.message || 'Failed to validate credentials' };
  }
}

/**
 * Create a Circle handler instance with credentials
 */
export function createCircleHandler(credentials: CircleCredentials): PaymentHandler {
  const baseUrl = credentials.sandbox ? CIRCLE_SANDBOX_URL : CIRCLE_PRODUCTION_URL;

  const capabilities: HandlerCapabilities = {
    supportedMethods: ['card', 'bank_transfer', 'usdc'],
    supportedCurrencies: ['USD', 'USDC'],
    supportsRefunds: true,
    supportsPartialRefunds: true,
    supportsRecurring: false,
    supportsWebhooks: true,
    minAmount: {
      USD: 100, // $1.00
      EUR: 100,
      BRL: 100,
      MXN: 100,
      USDC: 100,
    },
    maxAmount: {
      USD: 100000000, // $1,000,000
      EUR: 100000000,
      BRL: 100000000,
      MXN: 100000000,
      USDC: 100000000,
    },
  };

  async function makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${credentials.api_key}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Circle API error: ${response.status}`);
    }

    return data;
  }

  return {
    id: 'circle',
    name: credentials.sandbox ? 'Circle (Sandbox)' : 'Circle',
    capabilities,

    supportsMethod(method: PaymentMethod): boolean {
      return capabilities.supportedMethods.includes(method);
    },

    supportsCurrency(currency: Currency): boolean {
      return capabilities.supportedCurrencies.includes(currency);
    },

    async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent> {
      // Convert cents to dollars
      const amount = (params.amount / 100).toFixed(2);

      // Create a payment intent in Circle
      const response = await makeRequest('/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: params.metadata?.idempotency_key || crypto.randomUUID(),
          amount: {
            amount,
            currency: params.currency === 'USDC' ? 'USD' : params.currency,
          },
          settlementCurrency: params.currency === 'USDC' ? 'USD' : params.currency,
          source: {
            type: 'card',
            id: params.metadata?.card_id,
          },
          description: params.description,
          metadata: params.metadata,
          verification: 'cvv',
        }),
      });

      const payment = response.data;

      return {
        id: payment.id,
        handler: 'circle',
        status: mapCircleStatus(payment.status),
        amount: params.amount,
        currency: params.currency,
        nextAction: payment.requiredAction
          ? {
              type: payment.requiredAction.type === 'three_d_secure_required' ? 'redirect' : 'await_payment',
              redirectUrl: payment.requiredAction.redirectUrl,
            }
          : undefined,
        metadata: params.metadata,
        createdAt: payment.createDate || new Date().toISOString(),
      };
    },

    async capturePayment(intentId: string): Promise<PaymentResult> {
      // Circle payments are auto-captured, so we just fetch the status
      const response = await makeRequest(`/v1/payments/${intentId}`);
      const payment = response.data;

      return {
        id: payment.id,
        handler: 'circle',
        status: payment.status === 'paid' ? 'succeeded' : payment.status === 'failed' ? 'failed' : 'pending',
        amount: Math.round(parseFloat(payment.amount?.amount || '0') * 100),
        currency: (payment.amount?.currency || 'USD') as Currency,
        fee: payment.fees ? Math.round(parseFloat(payment.fees.amount) * 100) : undefined,
        capturedAt: payment.updateDate || new Date().toISOString(),
      };
    },

    async cancelPayment(intentId: string): Promise<void> {
      await makeRequest(`/v1/payments/${intentId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
        }),
      });
    },

    async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<RefundResult> {
      const refundData: Record<string, unknown> = {
        idempotencyKey: crypto.randomUUID(),
      };

      if (amount) {
        refundData.amount = {
          amount: (amount / 100).toFixed(2),
          currency: 'USD',
        };
      }

      if (reason) {
        refundData.reason = reason;
      }

      const response = await makeRequest(`/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify(refundData),
      });

      const refund = response.data;

      return {
        id: refund.id,
        handler: 'circle',
        paymentId,
        status: refund.status === 'complete' ? 'succeeded' : 'pending',
        amount: Math.round(parseFloat(refund.amount?.amount || '0') * 100),
        currency: (refund.amount?.currency || 'USD') as Currency,
        reason,
        createdAt: refund.createDate || new Date().toISOString(),
      };
    },

    async getPayment(paymentId: string): Promise<PaymentResult | null> {
      try {
        const response = await makeRequest(`/v1/payments/${paymentId}`);
        const payment = response.data;

        return {
          id: payment.id,
          handler: 'circle',
          status: payment.status === 'paid' ? 'succeeded' : payment.status === 'failed' ? 'failed' : 'pending',
          amount: Math.round(parseFloat(payment.amount?.amount || '0') * 100),
          currency: (payment.amount?.currency || 'USD') as Currency,
          fee: payment.fees ? Math.round(parseFloat(payment.fees.amount) * 100) : undefined,
        };
      } catch {
        return null;
      }
    },

    verifyWebhook(payload: string | Buffer, signature: string): boolean {
      // Circle webhook verification requires the notification's signature header
      // For now, log a warning and return true (should implement proper verification)
      console.warn('Circle webhook verification not fully implemented');
      return true;
    },

    parseWebhookEvent(payload: string | Buffer): WebhookEvent {
      const event = JSON.parse(typeof payload === 'string' ? payload : payload.toString());

      return {
        id: event.notificationId || crypto.randomUUID(),
        handler: 'circle',
        type: event.notificationType,
        data: event.payload || {},
        createdAt: new Date().toISOString(),
      };
    },
  };
}

/**
 * Map Circle payment status to PayOS status
 */
function mapCircleStatus(circleStatus: string): PaymentIntent['status'] {
  switch (circleStatus) {
    case 'pending':
      return 'pending';
    case 'confirmed':
      return 'processing';
    case 'paid':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'action_required':
      return 'requires_action';
    default:
      return 'pending';
  }
}

export default { validateCircleCredentials, createCircleHandler };
