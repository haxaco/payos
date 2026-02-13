/**
 * Stripe Card Payment Provider
 * Epic 41, Story 41.5: Stripe Card Payments
 *
 * Handles card payment collection via Stripe SetupIntents and PaymentIntents.
 * Supports Visa, Mastercard, Amex with 3D Secure authentication.
 */

import { randomUUID } from 'crypto';
import type { IFundingProvider, ProviderCapability } from './interface.js';
import type {
  FundingSource,
  CreateFundingSourceParams,
  VerifyFundingSourceParams,
  InitiateFundingParams,
  ProviderSourceResult,
  ProviderVerificationResult,
  ProviderFundingResult,
  ProviderFundingStatus,
  ProviderWebhookEvent,
} from '../types.js';

const STRIPE_API_KEY = () => process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = () => process.env.STRIPE_FUNDING_WEBHOOK_SECRET || '';

export class StripeCardProvider implements IFundingProvider {
  readonly name = 'stripe' as const;
  readonly displayName = 'Stripe Cards';

  readonly capabilities: ProviderCapability[] = [
    {
      sourceType: 'card',
      currencies: ['USD', 'EUR', 'GBP', 'BRL', 'MXN'],
      requiresClientSetup: true,
      requiresVerification: false, // 3DS handled during payment
      settlementTime: 'Instant',
      supportsRefunds: true,
    },
  ];

  isAvailable(): boolean {
    return !!STRIPE_API_KEY();
  }

  async createSource(
    tenantId: string,
    params: CreateFundingSourceParams
  ): Promise<ProviderSourceResult> {
    const apiKey = STRIPE_API_KEY();

    if (!apiKey) {
      // Sandbox mode: return mock setup intent
      return {
        provider_id: `seti_mock_${randomUUID().slice(0, 8)}`,
        status: 'pending',
        client_secret: `seti_mock_secret_${randomUUID().slice(0, 12)}`,
        provider_metadata: { sandbox: true },
      };
    }

    // Real Stripe: create SetupIntent
    const response = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'metadata[tenant_id]': tenantId,
        'metadata[account_id]': params.account_id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe SetupIntent failed: ${error.error?.message || response.statusText}`);
    }

    const setupIntent = await response.json();

    return {
      provider_id: setupIntent.id,
      status: 'pending',
      client_secret: setupIntent.client_secret,
      provider_metadata: {
        setup_intent_id: setupIntent.id,
        payment_method_types: setupIntent.payment_method_types,
      },
    };
  }

  async verifySource(
    _tenantId: string,
    source: FundingSource,
    _params: VerifyFundingSourceParams
  ): Promise<ProviderVerificationResult> {
    const apiKey = STRIPE_API_KEY();

    if (!apiKey) {
      // Sandbox: auto-verify
      return {
        verified: true,
        status: 'active',
        provider_metadata: { sandbox: true },
      };
    }

    // Check SetupIntent status at Stripe
    const response = await fetch(
      `https://api.stripe.com/v1/setup_intents/${source.provider_id}`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) {
      return { verified: false, status: 'failed', failure_reason: 'Could not verify setup intent' };
    }

    const setupIntent = await response.json();

    if (setupIntent.status === 'succeeded') {
      // Get payment method details
      const pmResponse = await fetch(
        `https://api.stripe.com/v1/payment_methods/${setupIntent.payment_method}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const pm = pmResponse.ok ? await pmResponse.json() : null;

      return {
        verified: true,
        status: 'active',
        provider_metadata: {
          payment_method_id: setupIntent.payment_method,
          card_brand: pm?.card?.brand,
          card_last4: pm?.card?.last4,
          card_exp_month: pm?.card?.exp_month,
          card_exp_year: pm?.card?.exp_year,
        },
      };
    }

    return {
      verified: false,
      status: setupIntent.status === 'canceled' ? 'failed' : 'verifying',
      failure_reason: setupIntent.last_setup_error?.message,
    };
  }

  async removeSource(
    _tenantId: string,
    source: FundingSource
  ): Promise<void> {
    const apiKey = STRIPE_API_KEY();
    if (!apiKey) return; // Sandbox: no-op

    const pmId = (source.provider_metadata as any)?.payment_method_id;
    if (!pmId) return;

    await fetch(`https://api.stripe.com/v1/payment_methods/${pmId}/detach`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
  }

  async initiateFunding(
    tenantId: string,
    source: FundingSource,
    params: InitiateFundingParams
  ): Promise<ProviderFundingResult> {
    const apiKey = STRIPE_API_KEY();
    const pmId = (source.provider_metadata as any)?.payment_method_id;

    if (!apiKey || !pmId) {
      // Sandbox mode
      return {
        provider_transaction_id: `pi_mock_${randomUUID().slice(0, 8)}`,
        status: 'processing',
        provider_fee_cents: Math.round(params.amount_cents * 0.029) + 30,
        estimated_completion: new Date(Date.now() + 60000).toISOString(),
        provider_metadata: { sandbox: true },
      };
    }

    // Real Stripe: create PaymentIntent
    const body = new URLSearchParams({
      amount: String(params.amount_cents),
      currency: params.currency.toLowerCase(),
      payment_method: pmId,
      confirm: 'true',
      'payment_method_types[]': 'card',
      'metadata[tenant_id]': tenantId,
      'metadata[account_id]': source.account_id,
      'metadata[funding_source_id]': source.id,
    });

    if (params.idempotency_key) {
      // Stripe uses header for idempotency
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (params.idempotency_key) {
      headers['Idempotency-Key'] = params.idempotency_key;
    }

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Stripe payment failed: ${error.error?.message || response.statusText}`);
    }

    const pi = await response.json();

    // Handle 3D Secure
    if (pi.status === 'requires_action') {
      return {
        provider_transaction_id: pi.id,
        status: 'pending',
        provider_fee_cents: 0, // Fee determined after completion
        client_secret: pi.client_secret,
        provider_metadata: { requires_action: true, action_type: pi.next_action?.type },
      };
    }

    return {
      provider_transaction_id: pi.id,
      status: pi.status === 'succeeded' ? 'completed' : 'processing',
      provider_fee_cents: Math.round(params.amount_cents * 0.029) + 30,
      estimated_completion: new Date().toISOString(),
      provider_metadata: { payment_intent_id: pi.id, stripe_status: pi.status },
    };
  }

  async getFundingStatus(
    providerTransactionId: string
  ): Promise<ProviderFundingStatus> {
    const apiKey = STRIPE_API_KEY();

    if (!apiKey) {
      return {
        provider_transaction_id: providerTransactionId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
    }

    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${providerTransactionId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (!response.ok) {
      return {
        provider_transaction_id: providerTransactionId,
        status: 'failed',
        failure_reason: 'Could not retrieve payment status',
      };
    }

    const pi = await response.json();
    const statusMap: Record<string, any> = {
      succeeded: 'completed',
      processing: 'processing',
      requires_payment_method: 'failed',
      requires_action: 'pending',
      canceled: 'cancelled',
    };

    return {
      provider_transaction_id: pi.id,
      status: statusMap[pi.status] || 'processing',
      failure_reason: pi.last_payment_error?.message,
      completed_at: pi.status === 'succeeded' ? new Date().toISOString() : undefined,
    };
  }

  async parseWebhook(
    payload: unknown,
    signature: string
  ): Promise<ProviderWebhookEvent> {
    // In production, verify signature with Stripe webhook secret
    const event = payload as any;

    const eventMap: Record<string, { status?: string; sourceStatus?: string }> = {
      'payment_intent.succeeded': { status: 'completed' },
      'payment_intent.payment_failed': { status: 'failed' },
      'setup_intent.succeeded': { sourceStatus: 'active' },
      'setup_intent.setup_failed': { sourceStatus: 'failed' },
      'charge.dispute.created': { status: 'failed' },
    };

    const mapping = eventMap[event.type] || {};

    return {
      event_type: event.type,
      provider_id: event.data?.object?.metadata?.funding_source_id || event.data?.object?.id,
      provider_transaction_id: event.data?.object?.id,
      status: mapping.status as any,
      source_status: mapping.sourceStatus as any,
      metadata: event.data?.object?.metadata,
    };
  }
}

export function createStripeCardProvider(): StripeCardProvider {
  return new StripeCardProvider();
}
