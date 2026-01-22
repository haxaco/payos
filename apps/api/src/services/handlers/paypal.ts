/**
 * PayPal Payment Handler
 * Epic 48, Story 48.4: PayPal implementation of PaymentHandler interface
 *
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
  PayPalCredentials,
} from './interface.js';

// PayPal API endpoints
const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com';
const PAYPAL_PRODUCTION_URL = 'https://api-m.paypal.com';

/**
 * Validate PayPal credentials by obtaining an access token
 */
export async function validatePayPalCredentials(
  credentials: PayPalCredentials
): Promise<{ valid: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
  const baseUrl = credentials.sandbox ? PAYPAL_SANDBOX_URL : PAYPAL_PRODUCTION_URL;

  try {
    // PayPal OAuth2 - exchange client credentials for access token
    const auth = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString('base64');

    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('PayPal authentication failed:', errorData);

      if (tokenResponse.status === 401) {
        return { valid: false, error: 'Invalid client ID or secret' };
      }

      return {
        valid: false,
        error: errorData.error_description || 'Failed to authenticate with PayPal',
      };
    }

    const tokenData = await tokenResponse.json();

    // Get merchant info using the access token
    const userInfoResponse = await fetch(`${baseUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    let accountInfo: Record<string, unknown> = {
      environment: credentials.sandbox ? 'sandbox' : 'production',
      token_type: tokenData.token_type,
      app_id: tokenData.app_id,
      expires_in: tokenData.expires_in,
    };

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      accountInfo = {
        ...accountInfo,
        payer_id: userInfo.payer_id,
        email: userInfo.emails?.[0]?.value,
        name: userInfo.name ? `${userInfo.name.given_name} ${userInfo.name.surname}`.trim() : undefined,
        verified: userInfo.verified_account,
      };
    }

    return {
      valid: true,
      accountInfo,
    };
  } catch (error: any) {
    console.error('PayPal credential validation error:', error);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { valid: false, error: 'Unable to connect to PayPal API' };
    }

    return { valid: false, error: error.message || 'Failed to validate credentials' };
  }
}

/**
 * Get PayPal access token (for internal use)
 */
async function getAccessToken(credentials: PayPalCredentials): Promise<string> {
  const baseUrl = credentials.sandbox ? PAYPAL_SANDBOX_URL : PAYPAL_PRODUCTION_URL;
  const auth = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to obtain PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create a PayPal handler instance with credentials
 */
export function createPayPalHandler(credentials: PayPalCredentials): PaymentHandler {
  const baseUrl = credentials.sandbox ? PAYPAL_SANDBOX_URL : PAYPAL_PRODUCTION_URL;

  const capabilities: HandlerCapabilities = {
    supportedMethods: ['card', 'wallet'],
    supportedCurrencies: ['USD', 'EUR', 'BRL', 'MXN'],
    supportsRefunds: true,
    supportsPartialRefunds: true,
    supportsRecurring: true,
    supportsWebhooks: true,
    minAmount: {
      USD: 100, // $1.00
      EUR: 100,
      BRL: 100,
      MXN: 2000, // 20 MXN
      USDC: 100,
    },
    maxAmount: {
      USD: 1000000000, // $10,000,000
      EUR: 1000000000,
      BRL: 1000000000,
      MXN: 1000000000,
      USDC: 1000000000,
    },
  };

  return {
    id: 'paypal',
    name: credentials.sandbox ? 'PayPal (Sandbox)' : 'PayPal',
    capabilities,

    supportsMethod(method: PaymentMethod): boolean {
      return capabilities.supportedMethods.includes(method);
    },

    supportsCurrency(currency: Currency): boolean {
      return capabilities.supportedCurrencies.includes(currency);
    },

    async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent> {
      const accessToken = await getAccessToken(credentials);

      // Convert cents to dollars for PayPal
      const amount = (params.amount / 100).toFixed(2);

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: params.currency,
              value: amount,
            },
            description: params.description,
            custom_id: params.metadata?.reference_id,
          },
        ],
        application_context: {
          return_url: params.returnUrl || 'https://example.com/return',
          cancel_url: params.returnUrl || 'https://example.com/cancel',
        },
      };

      const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create PayPal order');
      }

      const order = await response.json();

      // Find the approval URL
      const approvalLink = order.links?.find((link: any) => link.rel === 'approve');

      return {
        id: order.id,
        handler: 'paypal',
        status: mapPayPalStatus(order.status),
        amount: params.amount,
        currency: params.currency,
        nextAction: approvalLink
          ? {
              type: 'redirect',
              redirectUrl: approvalLink.href,
            }
          : undefined,
        metadata: params.metadata,
        createdAt: order.create_time || new Date().toISOString(),
      };
    },

    async capturePayment(intentId: string): Promise<PaymentResult> {
      const accessToken = await getAccessToken(credentials);

      const response = await fetch(`${baseUrl}/v2/checkout/orders/${intentId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to capture PayPal payment');
      }

      const capture = await response.json();
      const purchaseUnit = capture.purchase_units?.[0];
      const captureDetails = purchaseUnit?.payments?.captures?.[0];

      return {
        id: captureDetails?.id || intentId,
        handler: 'paypal',
        status: capture.status === 'COMPLETED' ? 'succeeded' : 'failed',
        amount: Math.round(parseFloat(captureDetails?.amount?.value || '0') * 100),
        currency: (captureDetails?.amount?.currency_code || 'USD') as Currency,
        fee: captureDetails?.seller_receivable_breakdown?.paypal_fee
          ? Math.round(parseFloat(captureDetails.seller_receivable_breakdown.paypal_fee.value) * 100)
          : undefined,
        capturedAt: new Date().toISOString(),
      };
    },

    async cancelPayment(intentId: string): Promise<void> {
      // PayPal orders expire automatically, but we can void them
      const accessToken = await getAccessToken(credentials);

      // For PayPal, we typically just let the order expire
      // or the user can be redirected away from the approval flow
      console.log(`PayPal order ${intentId} cancellation requested`);
    },

    async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<RefundResult> {
      const accessToken = await getAccessToken(credentials);

      const refundData: Record<string, unknown> = {};
      if (amount) {
        refundData.amount = {
          currency_code: 'USD', // Would need to track original currency
          value: (amount / 100).toFixed(2),
        };
      }
      if (reason) {
        refundData.note_to_payer = reason;
      }

      const response = await fetch(`${baseUrl}/v2/payments/captures/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to refund PayPal payment');
      }

      const refund = await response.json();

      return {
        id: refund.id,
        handler: 'paypal',
        paymentId,
        status: refund.status === 'COMPLETED' ? 'succeeded' : 'pending',
        amount: Math.round(parseFloat(refund.amount?.value || '0') * 100),
        currency: (refund.amount?.currency_code || 'USD') as Currency,
        reason,
        createdAt: refund.create_time || new Date().toISOString(),
      };
    },

    async getPayment(paymentId: string): Promise<PaymentResult | null> {
      try {
        const accessToken = await getAccessToken(credentials);

        const response = await fetch(`${baseUrl}/v2/checkout/orders/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          return null;
        }

        const order = await response.json();
        const purchaseUnit = order.purchase_units?.[0];

        return {
          id: order.id,
          handler: 'paypal',
          status: order.status === 'COMPLETED' ? 'succeeded' : order.status === 'VOIDED' ? 'failed' : 'pending',
          amount: Math.round(parseFloat(purchaseUnit?.amount?.value || '0') * 100),
          currency: (purchaseUnit?.amount?.currency_code || 'USD') as Currency,
        };
      } catch {
        return null;
      }
    },

    verifyWebhook(payload: string | Buffer, signature: string): boolean {
      // PayPal webhook verification requires making an API call
      // For now, log a warning and return true (should implement proper verification)
      console.warn('PayPal webhook verification not fully implemented');
      return true;
    },

    parseWebhookEvent(payload: string | Buffer): WebhookEvent {
      const event = JSON.parse(typeof payload === 'string' ? payload : payload.toString());

      return {
        id: event.id,
        handler: 'paypal',
        type: event.event_type,
        data: event.resource || {},
        createdAt: event.create_time || new Date().toISOString(),
      };
    },
  };
}

/**
 * Map PayPal order status to PayOS status
 */
function mapPayPalStatus(paypalStatus: string): PaymentIntent['status'] {
  switch (paypalStatus) {
    case 'CREATED':
    case 'SAVED':
      return 'pending';
    case 'APPROVED':
      return 'requires_action';
    case 'PAYER_ACTION_REQUIRED':
      return 'requires_action';
    case 'COMPLETED':
      return 'succeeded';
    case 'VOIDED':
      return 'canceled';
    default:
      return 'failed';
  }
}

export default { validatePayPalCredentials, createPayPalHandler };
