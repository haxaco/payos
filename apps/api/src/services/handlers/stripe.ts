/**
 * Stripe Payment Handler
 * Epic 48, Story 48.4: Stripe implementation of PaymentHandler interface
 */

import Stripe from 'stripe';
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
  StripeCredentials,
} from './interface.js';

/**
 * Validate Stripe credentials by making a test API call
 */
export async function validateStripeCredentials(
  credentials: { api_key: string }
): Promise<{ valid: boolean; error?: string; accountInfo?: Record<string, unknown> }> {
  try {
    const stripe = new Stripe(credentials.api_key);

    // Try to retrieve account info to validate the key
    const account = await stripe.accounts.retrieve();

    return {
      valid: true,
      accountInfo: {
        stripe_account_id: account.id,
        business_name: account.business_profile?.name || account.settings?.dashboard?.display_name,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      },
    };
  } catch (error: any) {
    console.error('Stripe credential validation failed:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      return { valid: false, error: 'Invalid API key' };
    }

    if (error.type === 'StripePermissionError') {
      return { valid: false, error: 'API key lacks required permissions' };
    }

    return { valid: false, error: error.message || 'Failed to validate credentials' };
  }
}

/**
 * Create a Stripe handler instance with credentials
 */
export function createStripeHandler(credentials: StripeCredentials): PaymentHandler {
  const stripe = new Stripe(credentials.api_key);

  const capabilities: HandlerCapabilities = {
    supportedMethods: ['card', 'bank_transfer'],
    supportedCurrencies: ['USD', 'EUR', 'BRL', 'MXN'],
    supportsRefunds: true,
    supportsPartialRefunds: true,
    supportsRecurring: true,
    supportsWebhooks: true,
    minAmount: {
      USD: 50, // $0.50
      EUR: 50,
      BRL: 50,
      MXN: 1000, // 10 MXN
      USDC: 50,
    },
    maxAmount: {
      USD: 99999999, // $999,999.99
      EUR: 99999999,
      BRL: 99999999,
      MXN: 99999999,
      USDC: 99999999,
    },
  };

  return {
    id: 'stripe',
    name: 'Stripe',
    capabilities,

    supportsMethod(method: PaymentMethod): boolean {
      return capabilities.supportedMethods.includes(method);
    },

    supportsCurrency(currency: Currency): boolean {
      return capabilities.supportedCurrencies.includes(currency);
    },

    async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent> {
      const paymentMethodTypes: Stripe.PaymentIntentCreateParams.PaymentMethodType[] = [];

      // Map PayOS payment methods to Stripe payment method types
      if (params.method === 'card') {
        paymentMethodTypes.push('card');
      } else if (params.method === 'bank_transfer') {
        if (params.currency === 'USD') {
          paymentMethodTypes.push('us_bank_account');
        } else if (params.currency === 'BRL') {
          paymentMethodTypes.push('boleto');
        }
      }

      const intent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        payment_method_types: paymentMethodTypes.length > 0 ? paymentMethodTypes : ['card'],
        description: params.description,
        metadata: params.metadata,
        receipt_email: params.customer?.email,
        ...(params.returnUrl && {
          confirm: false,
          return_url: params.returnUrl,
        }),
      });

      return {
        id: intent.id,
        handler: 'stripe',
        status: mapStripeStatus(intent.status),
        amount: intent.amount,
        currency: intent.currency.toUpperCase() as Currency,
        clientSecret: intent.client_secret || undefined,
        nextAction: intent.next_action
          ? {
              type: intent.next_action.type === 'redirect_to_url' ? 'redirect' : 'await_payment',
              redirectUrl: intent.next_action.redirect_to_url?.url,
            }
          : undefined,
        metadata: intent.metadata as Record<string, string>,
        createdAt: new Date(intent.created * 1000).toISOString(),
      };
    },

    async capturePayment(intentId: string, amount?: number): Promise<PaymentResult> {
      const intent = await stripe.paymentIntents.capture(intentId, {
        ...(amount && { amount_to_capture: amount }),
      });

      const charge = intent.latest_charge
        ? await stripe.charges.retrieve(intent.latest_charge as string)
        : null;

      return {
        id: intent.id,
        handler: 'stripe',
        status: intent.status === 'succeeded' ? 'succeeded' : 'failed',
        amount: intent.amount_received || intent.amount,
        currency: intent.currency.toUpperCase() as Currency,
        fee: charge?.balance_transaction
          ? undefined // Would need another API call to get fee
          : undefined,
        metadata: intent.metadata as Record<string, string>,
        capturedAt: new Date().toISOString(),
      };
    },

    async cancelPayment(intentId: string): Promise<void> {
      await stripe.paymentIntents.cancel(intentId);
    },

    async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<RefundResult> {
      const refund = await stripe.refunds.create({
        payment_intent: paymentId,
        ...(amount && { amount }),
        ...(reason && { reason: reason as Stripe.RefundCreateParams.Reason }),
      });

      return {
        id: refund.id,
        handler: 'stripe',
        paymentId,
        status: refund.status === 'succeeded' ? 'succeeded' : refund.status === 'failed' ? 'failed' : 'pending',
        amount: refund.amount,
        currency: refund.currency.toUpperCase() as Currency,
        reason: refund.reason || undefined,
        failureCode: refund.failure_reason || undefined,
        createdAt: new Date(refund.created * 1000).toISOString(),
      };
    },

    async getPayment(paymentId: string): Promise<PaymentResult | null> {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentId);

        return {
          id: intent.id,
          handler: 'stripe',
          status: intent.status === 'succeeded' ? 'succeeded' : intent.status === 'canceled' ? 'failed' : 'pending',
          amount: intent.amount_received || intent.amount,
          currency: intent.currency.toUpperCase() as Currency,
          metadata: intent.metadata as Record<string, string>,
          capturedAt: intent.status === 'succeeded' ? new Date().toISOString() : undefined,
        };
      } catch {
        return null;
      }
    },

    verifyWebhook(payload: string | Buffer, signature: string): boolean {
      if (!credentials.webhook_secret) {
        console.warn('Stripe webhook secret not configured');
        return false;
      }

      try {
        stripe.webhooks.constructEvent(
          payload,
          signature,
          credentials.webhook_secret
        );
        return true;
      } catch {
        return false;
      }
    },

    parseWebhookEvent(payload: string | Buffer): WebhookEvent {
      const event = JSON.parse(typeof payload === 'string' ? payload : payload.toString());

      return {
        id: event.id,
        handler: 'stripe',
        type: event.type,
        data: event.data?.object || {},
        createdAt: new Date(event.created * 1000).toISOString(),
      };
    },
  };
}

/**
 * Map Stripe payment intent status to PayOS status
 */
function mapStripeStatus(
  stripeStatus: Stripe.PaymentIntent.Status
): PaymentIntent['status'] {
  switch (stripeStatus) {
    case 'requires_payment_method':
    case 'requires_confirmation':
      return 'pending';
    case 'requires_action':
      return 'requires_action';
    case 'processing':
      return 'processing';
    case 'succeeded':
      return 'succeeded';
    case 'canceled':
      return 'canceled';
    default:
      return 'failed';
  }
}

export default { validateStripeCredentials, createStripeHandler };
